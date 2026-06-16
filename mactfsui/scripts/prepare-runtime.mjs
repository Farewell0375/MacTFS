import { existsSync, rmSync, cpSync, mkdtempSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, "..", "..")

// 服务端 JVM 固定 x64：TFS 的 JNI 原生库只含 i386/x86_64（无 arm64），arm64 JVM 无法加载。
// 因此 universal 包内只随附 x64 JRE，在 Apple Silicon 上经 Rosetta 2 运行服务端。
//
// JDK 体积大且是第三方二进制，不入库（见 .gitignore）。本地缺失时从 Azul 官方按需下载，
// 校验 sha256 后解压到仓库根目录，再继续复制流程。
const JDK_DIR_NAME = "zulu8.94.0.17-ca-jdk8.0.492-macosx_x64"
const JDK_URL = `https://cdn.azul.com/zulu/bin/${JDK_DIR_NAME}.tar.gz`
const JDK_SHA256 =
  "5114b269b88e3d89b0d6b2c28af0c96b5489f340fbaded8fa17613b2adca180c"

const source = join(projectRoot, JDK_DIR_NAME, "Contents", "Home")
const dest = resolve(here, "..", "runtime", "jdk-x64")

function ensureJdkPresent() {
  if (existsSync(join(source, "bin", "java"))) {
    return
  }

  console.log("[prepare-runtime] 未找到本地 x64 JDK，开始从 Azul 下载…")
  console.log("[prepare-runtime] URL:", JDK_URL)

  const workDir = mkdtempSync(join(tmpdir(), "mactfs-jdk-"))
  const archive = join(workDir, "zulu.tar.gz")
  try {
    execFileSync(
      "curl",
      ["-fsSL", "--retry", "3", "--max-time", "600", "-o", archive, JDK_URL],
      { stdio: "inherit" },
    )

    const actualSha = execFileSync("shasum", ["-a", "256", archive])
      .toString()
      .trim()
      .split(/\s+/)[0]
    if (actualSha !== JDK_SHA256) {
      throw new Error(
        `JDK sha256 校验失败：期望 ${JDK_SHA256}，实际 ${actualSha}`,
      )
    }
    console.log("[prepare-runtime] sha256 校验通过，解压到", projectRoot)

    execFileSync("tar", ["xzf", archive, "-C", projectRoot], {
      stdio: "inherit",
    })
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }

  if (!existsSync(join(source, "bin", "java"))) {
    console.error("[prepare-runtime] 下载解压后仍未找到 x64 JDK：", source)
    process.exit(1)
  }
}

ensureJdkPresent()

console.log("[prepare-runtime] 复制 x64 JDK ->", dest)
rmSync(dest, { recursive: true, force: true })
cpSync(source, dest, { recursive: true })

// 运行服务用不到的部分，复制后删除以缩小打包体积（仍保留 bin/java + jre + lib）。
const drop = ["src.zip", "demo", "sample", "man", "include"]
for (const name of drop) {
  rmSync(join(dest, name), { recursive: true, force: true })
}

if (!existsSync(join(dest, "bin", "java"))) {
  console.error("[prepare-runtime] 精简后 bin/java 缺失，终止。")
  process.exit(1)
}

console.log("[prepare-runtime] x64 JRE 准备完成：", dest)
