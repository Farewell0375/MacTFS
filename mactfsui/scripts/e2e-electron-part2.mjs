// FE-034 补充回归：目录已被既有 Workspace 映射（含用户真实挂起更改），
// 因此跳过创建/取消映射，只验证 目录对比、签出→Diff→撤销（仅 ai-smoke 文件）、操作日志。
import { _electron as electron } from "playwright-core"
import { mkdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SHOT_DIR = path.join(ROOT, ".e2e-shots")
mkdirSync(SHOT_DIR, { recursive: true })

const TEST_TREE_CHAIN = ["北京排水集团人力系统", "5SRC", "MicroFront", "subapp_pm", "mactfs"]
const SMOKE_FILE = "ai-smoke-20260606051038.txt"

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

  // 进入工作台并导航到测试目录
  await win.getByRole("button", { name: "连接 TFS" }).waitFor({ timeout: 90000 })
  await win.getByRole("button", { name: "连接 TFS" }).click()
  await win.getByText("选择 Collection").waitFor({ timeout: 120000 })
  await win.locator("ul button", { hasText: "PKUSEHR" }).first().click()
  await win.getByRole("button", { name: "进入工作台" }).click()
  await win.getByText("源码目录").waitFor({ timeout: 120000 })
  const tree = win.locator("aside").first()
  for (const name of TEST_TREE_CHAIN) {
    const node = tree.getByText(name, { exact: true }).first()
    await node.waitFor({ timeout: 120000 })
    await node.click()
    await win.waitForTimeout(2500)
  }
  record("0 进入工作台并导航到测试目录", true)

  // A. 目录对比（目录已映射 → 菜单应可用；忽略仅本地/仅服务器项保持默认）
  await tree.getByText("mactfs", { exact: true }).first().click({ button: "right" })
  const compareItem = win.getByRole("menuitem", { name: "目录对比", exact: true })
  await compareItem.waitFor({ timeout: 10000 })
  await compareItem.click()
  await win.locator("[data-slot=dialog-title]", { hasText: "目录对比" }).waitFor()
  await shot(win, "12-compare-options")
  // 新交互：先确认选项再执行
  const startButton = win.getByRole("button", { name: /开始对比|执行对比|对比/ }).first()
  if ((await startButton.count()) > 0) {
    await startButton.click()
  }
  await win.waitForTimeout(10000)
  const compareText = await win.locator("[data-slot=dialog-content]").innerText()
  record("A 目录对比弹窗", !compareText.includes("目录对比失败"), compareText.slice(0, 100).replace(/\n/g, " "))
  await shot(win, "12-compare")
  await win.keyboard.press("Escape")
  await win.locator("[data-slot=dialog-content]").waitFor({ state: "detached", timeout: 10000 }).catch(() => {})
  await win.waitForTimeout(800)

  // B. 签出 ai-smoke 文件 → 挂起更改出现 → 与最新版本比较 → 撤销（只动这一个文件）
  const fileRow = win.locator("section table tbody tr").filter({ hasText: SMOKE_FILE }).first()
  await fileRow.click({ button: "right" })
  const checkoutItem = win.getByRole("menuitem", { name: "签出编辑", exact: true })
  await checkoutItem.waitFor({ timeout: 10000 })
  await checkoutItem.click()
  await win.waitForTimeout(15000)
  const pendingPanel = await win.locator("aside").nth(1).innerText()
  const hasPending = pendingPanel.includes(SMOKE_FILE)
  record("B1 签出文件产生挂起更改", hasPending, "")
  await shot(win, "13-pending")

  if (hasPending) {
    const row = win.locator("aside").nth(1).getByText(SMOKE_FILE).first()
    await row.click({ button: "right" })
    const diffItem = win.getByRole("menuitem", { name: "与最新版本比较", exact: true })
    if ((await diffItem.count()) > 0) {
      await diffItem.click()
      await win.waitForTimeout(8000)
      const diffText = await win.locator("[data-slot=dialog-content]").innerText()
      record("B2 本地 vs latest Diff（Monaco）", diffText.includes("差异") || diffText.includes("一致"), diffText.slice(0, 80).replace(/\n/g, " "))
      await shot(win, "14-diff")
      await win.keyboard.press("Escape")
      await win.locator("[data-slot=dialog-content]").waitFor({ state: "detached", timeout: 10000 }).catch(() => {})
      await win.waitForTimeout(800)
    }
    // 仅撤销 ai-smoke 这一个文件，避免影响用户已有挂起更改
    await row.click({ button: "right" })
    await win.getByRole("menuitem", { name: "撤销更改", exact: true }).click()
    await win.waitForTimeout(12000)
    const afterUndo = await win.locator("aside").nth(1).innerText()
    record("B3 撤销该文件挂起更改", !afterUndo.includes(SMOKE_FILE), "")
    await shot(win, "15-undone")
  }

  // C. 操作日志面板有真实记录
  const consoleText = await win.locator("footer").innerText()
  record("C 操作日志记录", /checkout|undo|connect|serverTree|folderDiff|compare/i.test(consoleText), consoleText.split("\n").slice(0, 5).join(" | "))
  await shot(win, "16-console")
} catch (error) {
  record("EXCEPTION", false, String(error).slice(0, 300))
  try {
    const win = await app.firstWindow()
    await shot(win, "98-exception")
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
