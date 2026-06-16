// 临时 E2E 驱动：按《TFS-AI测试流程》用 playwright-core 驱动真实 Electron 应用，
// 连接真实 TFS，只在指定测试目录内做写操作，并截图留证。
import { _electron as electron } from "playwright-core"
import { mkdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SHOT_DIR = path.join(ROOT, ".e2e-shots")
mkdirSync(SHOT_DIR, { recursive: true })

const TEST_SERVER_DIR = "$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs"
const TEST_TREE_CHAIN = ["北京排水集团人力系统", "5SRC", "MicroFront", "subapp_pm", "mactfs"]
// 注意：/Users/fenghp/Desktop/DEV/mactfs-ai-workspace 已被旧测试 Workspace
// mactfs-ai-subapp-pm-mactfs 占用（TFS 不允许嵌套映射），UI 测试改用旁路独立目录。
const LOCAL_PARENT = "/Users/fenghp/Desktop/DEV/mactfs-ui-e2e"

const results = []
/** 记录一步结果并打印。 */
function record(step, ok, detail = "") {
  results.push({ step, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"} | ${step}${detail ? " | " + detail : ""}`)
}

/** 截图保存。 */
async function shot(win, name) {
  await win.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) })
}

const app = await electron.launch({
  args: ["electron/main.cjs"],
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: "development" },
})

try {
  const win = await app.firstWindow()
  win.setDefaultTimeout(90000)

  // 1. 服务检测 → 连接页（Electron 会自动拉起本地服务，最长等 60s+）
  await win.getByRole("button", { name: "连接 TFS" }).waitFor({ timeout: 90000 })
  const serverUri = await win.locator("#serverUri").inputValue()
  record("1 服务就绪并进入连接页", true, `回填 serverUri=${serverUri}`)
  await shot(win, "01-connect")

  // 2. 连接真实 TFS → Collection 列表
  await win.getByRole("button", { name: "连接 TFS" }).click()
  await win.getByText("选择 Collection").waitFor({ timeout: 120000 })
  const collections = await win.locator("ul button span.font-medium").allInnerTexts()
  record("2 连接成功并加载 Collection", collections.includes("PKUSEHR"), collections.join(","))
  await shot(win, "02-collections")

  // 3. 选择 PKUSEHR → 确保 Workspace → 进入工作台
  await win.locator("ul button", { hasText: "PKUSEHR" }).first().click()
  await win.getByRole("button", { name: "进入工作台" }).click()
  await win.getByText("源码目录").waitFor({ timeout: 120000 })
  const topbar = await win.locator("header").innerText()
  record("3 进入工作台（固定上下文）", topbar.includes("PKUSEHR"), topbar.replace(/\n/g, " "))
  await shot(win, "03-workspace")

  // 3.5 明暗主题三态切换（FE-033 回归）：跟随系统 → 亮 → 暗 → 跟随系统
  const themeButton = win.getByRole("button", { name: /主题：/ })
  await themeButton.click()
  await win.waitForTimeout(400)
  await themeButton.click()
  await win.waitForTimeout(600)
  const darkApplied = await win.evaluate(() => document.documentElement.classList.contains("dark"))
  record("3.5 主题切换到暗色", darkApplied, "")
  await shot(win, "03b-dark-workspace")
  await themeButton.click()
  await win.waitForTimeout(600)

  // 4. 逐级展开目录树到指定测试目录（懒加载真实数据）
  const tree = win.locator("aside").first()
  for (const name of TEST_TREE_CHAIN) {
    const node = tree.getByText(name, { exact: true }).first()
    await node.waitFor({ timeout: 120000 })
    await node.click()
    await win.waitForTimeout(2500)
  }
  const pathBar = await win.locator("section").first().innerText()
  record("4 树导航到测试目录", pathBar.includes(TEST_SERVER_DIR), "")
  await shot(win, "04-test-folder")

  // 5. 目录历史弹窗
  await tree.getByText("mactfs", { exact: true }).first().click({ button: "right" })
  await win.getByRole("menuitem", { name: "查看历史", exact: true }).click()
  await win.locator("[data-slot=dialog-title]", { hasText: "历史记录" }).waitFor()
  await win.waitForTimeout(5000)
  const historyText = await win.locator("[data-slot=dialog-content]").innerText()
  const historyOk = /Changeset/.test(historyText) && !historyText.includes("历史加载失败")
  record("5 目录历史弹窗", historyOk, historyText.slice(0, 120).replace(/\n/g, " "))
  await shot(win, "05-history")
  await win.keyboard.press("Escape")
  await win.waitForTimeout(500)

  // 6. 文件查看（服务器 latest，未映射状态）
  const fileRow = win.locator("section table tbody tr").filter({ hasText: ".txt" }).first()
  await fileRow.click({ button: "right" })
  await win.getByRole("menuitem", { name: "查看文件", exact: true }).click()
  await win.locator("[data-slot=dialog-title]", { hasText: "查看文件" }).waitFor()
  await win.waitForTimeout(4000)
  const viewText = await win.locator("[data-slot=dialog-content]").innerText()
  record("6 文件查看（服务器 latest）", viewText.includes("服务器 latest"), viewText.slice(0, 100).replace(/\n/g, " "))
  await shot(win, "06-view-file")
  await win.keyboard.press("Escape")
  await win.waitForTimeout(500)

  // 7. Mapping 弹窗：父目录 → 后端预校验 → 创建（勾选立即 Get Latest）
  await tree.getByText("mactfs", { exact: true }).first().click({ button: "right" })
  await win.getByRole("menuitem", { name: "映射到本地", exact: true }).click()
  await win.locator("#parentPath").fill(LOCAL_PARENT)
  await win.waitForTimeout(2500)
  const mapDialog = await win.locator("[data-slot=dialog-content]").innerText()
  const precheckOk = mapDialog.includes(`${LOCAL_PARENT}/mactfs`)
  record("7a Mapping 预校验（最终路径由后端生成）", precheckOk, "")
  await shot(win, "07-mapping-precheck")
  await win.getByRole("button", { name: "创建映射" }).click()
  // 立即 Get Latest，真实下载可能较慢
  await win.locator("[data-slot=dialog-content]").waitFor({ state: "detached", timeout: 180000 }).catch(() => {})
  await win.waitForTimeout(3000)
  const afterMap = await win.locator("section").first().innerText()
  const mapError = await win.locator("[data-slot=dialog-content]").count()
  if (mapError > 0) {
    const errText = await win.locator("[data-slot=dialog-content]").innerText()
    record("7b 创建 Mapping + Get Latest", false, errText.slice(0, 160).replace(/\n/g, " "))
    await shot(win, "07b-mapping-error")
    await win.keyboard.press("Escape")
  } else {
    record("7b 创建 Mapping + Get Latest", afterMap.includes(LOCAL_PARENT), afterMap.split("\n").slice(0, 3).join(" "))
    await shot(win, "07b-mapped")
  }

  // 8. 目录对比弹窗（真实对比）
  await win.keyboard.press("Escape")
  await win.locator("[data-slot=dialog-content]").waitFor({ state: "detached", timeout: 10000 }).catch(() => {})
  await win.waitForTimeout(800)
  await tree.getByText("mactfs", { exact: true }).first().click({ button: "right" })
  const compareItem = win.getByRole("menuitem", { name: "目录对比", exact: true })
  const compareEnabled = (await compareItem.getAttribute("aria-disabled")) !== "true"
  if (compareEnabled) {
    await compareItem.click()
    await win.locator("[data-slot=dialog-title]", { hasText: "目录对比" }).waitFor()
    await win.waitForTimeout(8000)
    const compareText = await win.locator("[data-slot=dialog-content]").innerText()
    record("8 目录对比弹窗", !compareText.includes("目录对比失败"), compareText.slice(0, 120).replace(/\n/g, " "))
    await shot(win, "08-compare")
    await win.keyboard.press("Escape")
    await win.waitForTimeout(500)
  } else {
    await win.keyboard.press("Escape")
    record("8 目录对比弹窗", false, "目录未映射，菜单置灰")
  }

  // 9. 签出一个文件 → 右侧出现 pending → Diff → 撤销（不做 checkin，避免污染服务端）
  const fileRow2 = win.locator("section table tbody tr").filter({ hasText: ".txt" }).first()
  if ((await fileRow2.count()) > 0) {
    await fileRow2.click({ button: "right" })
    const checkoutItem = win.getByRole("menuitem", { name: "签出编辑", exact: true })
    const checkoutEnabled = (await checkoutItem.getAttribute("aria-disabled")) !== "true"
    if (checkoutEnabled) {
      await checkoutItem.click()
      await win.waitForTimeout(15000)
      const pendingPanel = await win.locator("aside").nth(1).innerText()
      const hasPending = pendingPanel.includes("签出编辑") || pendingPanel.includes("Included")
      record("9a 签出文件产生挂起更改", hasPending, pendingPanel.slice(0, 120).replace(/\n/g, " "))
      await shot(win, "09a-pending")

      // 与最新版本比较（刚签出未改 → 应一致）
      const pendingRow = win.locator("aside").nth(1).locator("[data-slot=checkbox]").first()
      if (hasPending && (await pendingRow.count()) > 0) {
        const row = win.locator("aside").nth(1).getByText(".txt").first()
        await row.click({ button: "right" })
        const diffItem = win.getByRole("menuitem", { name: "与最新版本比较", exact: true })
        if ((await diffItem.count()) > 0) {
          await diffItem.click()
          await win.waitForTimeout(6000)
          const diffText = await win.locator("[data-slot=dialog-content]").innerText()
          record("9b 本地 vs latest Diff", diffText.includes("一致") || diffText.includes("差异"), diffText.slice(0, 100).replace(/\n/g, " "))
          await shot(win, "09b-diff")
          await win.keyboard.press("Escape")
          await win.waitForTimeout(500)
        }
        // 撤销
        await row.click({ button: "right" })
        await win.getByRole("menuitem", { name: "撤销更改", exact: true }).click()
        await win.waitForTimeout(10000)
        const afterUndo = await win.locator("aside").nth(1).innerText()
        record("9c 撤销挂起更改", afterUndo.includes("当前没有挂起更改"), "")
        await shot(win, "09c-undone")
      }
    } else {
      await win.keyboard.press("Escape")
      record("9a 签出文件产生挂起更改", false, "签出菜单置灰（可能未映射）")
    }
  }

  // 10. 取消映射（清理现场，不跳转浏览位置）
  await tree.getByText("mactfs", { exact: true }).first().click({ button: "right" })
  const unmapItem = win.getByRole("menuitem", { name: "取消映射", exact: true })
  if ((await unmapItem.count()) > 0) {
    await unmapItem.click()
    await win.waitForTimeout(8000)
    const afterUnmap = await win.locator("section").first().innerText()
    record("10 取消映射并停留当前位置", afterUnmap.includes("未映射到本地") && afterUnmap.includes(TEST_SERVER_DIR), "")
    await shot(win, "10-unmapped")
  } else {
    await win.keyboard.press("Escape")
    record("10 取消映射", false, "菜单中没有取消映射（mapping 未创建成功）")
  }

  // 11. 操作日志面板
  const consoleText = await win.locator("footer").innerText()
  record("11 操作日志记录", /getLatest|checkout|undo|connect|serverTree/i.test(consoleText), consoleText.split("\n").slice(0, 6).join(" | "))
  await shot(win, "11-console")
} catch (error) {
  record("EXCEPTION", false, String(error).slice(0, 300))
  try {
    const win = await app.firstWindow()
    await shot(win, "99-exception")
  } catch {}
} finally {
  await app.close().catch(() => {})
}

console.log("\n==== RESULT SUMMARY ====")
for (const item of results) {
  console.log(`${item.ok ? "✅" : "❌"} ${item.step}${item.detail ? " — " + item.detail : ""}`)
}
const failed = results.filter((item) => !item.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed > 0 ? 1 : 0)
