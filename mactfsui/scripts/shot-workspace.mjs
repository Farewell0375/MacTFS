// 快速视觉确认：进入工作台后截图亮色 / 暗色画布卡片布局，不做任何写操作。
import { _electron as electron } from "playwright-core"
import { mkdirSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SHOT_DIR = path.join(ROOT, ".e2e-shots")
mkdirSync(SHOT_DIR, { recursive: true })

const app = await electron.launch({
  args: ["electron/main.cjs"],
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: "development" },
})

try {
  const win = await app.firstWindow()
  win.setDefaultTimeout(90000)
  await win.getByRole("button", { name: "连接 TFS" }).waitFor({ timeout: 90000 })
  await win.screenshot({ path: path.join(SHOT_DIR, "20-connect-v2.png") })
  await win.getByRole("button", { name: "连接 TFS" }).click()
  await win.getByText("选择 Collection").waitFor({ timeout: 120000 })
  await win.screenshot({ path: path.join(SHOT_DIR, "21-collections-v2.png") })
  await win.locator("ul button", { hasText: "PKUSEHR" }).first().click()
  await win.getByRole("button", { name: "进入工作台" }).click()
  await win.getByText("源码目录").waitFor({ timeout: 120000 })
  await win.waitForTimeout(6000)
  await win.screenshot({ path: path.join(SHOT_DIR, "22-workspace-cards.png") })
  // 验证表头 sticky：滚动文件列表后表头应仍可见
  await win.evaluate(() => {
    const container = document.querySelector('[data-slot="table-container"]')
    if (container) {
      container.scrollTop = 400
    }
  })
  await win.waitForTimeout(600)
  await win.screenshot({ path: path.join(SHOT_DIR, "24-sticky-header.png") })
  const themeButton = win.getByRole("button", { name: /主题：/ })
  await themeButton.click()
  await win.waitForTimeout(400)
  await themeButton.click()
  await win.waitForTimeout(800)
  await win.screenshot({ path: path.join(SHOT_DIR, "23-workspace-cards-dark.png") })
  await themeButton.click()
  await win.waitForTimeout(400)
  console.log("screenshots done")
} finally {
  await app.close().catch(() => {})
}
