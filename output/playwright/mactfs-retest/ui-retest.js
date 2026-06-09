async page => {
  const token = '5P5VxCVaR_EXK5s6WdPW69Gny6ccq28e7fN5Gu8nuX4'
  const serverPath = "$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs"
  const result = {
    url: "",
    connected: false,
    hasMissingCollection: false,
    pkusehrVisible: false,
    targetVisible: false,
    mappedVisible: false,
    getLatestVisible: false,
    checkoutVisible: false,
    pendingText: "",
    errors: [],
    steps: [],
  }

  await page.addInitScript((initToken) => {
    window.mactfs = {
      getToken: async () => initToken,
      getServiceStatus: async () => ({
        running: true,
        message: "服务可用",
        url: "http://127.0.0.1:38765",
        tokenFile: "/Users/fenghp/.mactfs/server-token",
      }),
    }
  }, token)

  await page.goto("http://localhost:5173")
  await page.waitForLoadState("networkidle")
  result.url = page.url()
  result.steps.push("loaded")

  const connect = page.getByRole("button", { name: "连接" })
  if (await connect.isVisible().catch(() => false)) {
    await connect.click()
    await page.waitForTimeout(2500)
    result.steps.push("connected-click")
  }

  result.connected = await page.getByText("macTFS 已连接").isVisible().catch(() => false)
  result.pkusehrVisible = await page.getByRole("button", { name: "PKUSEHR" }).isVisible().catch(() => false)
  result.hasMissingCollection = await page.getByText("Missing required field: collection").isVisible().catch(() => false)

  const pkusehr = page.getByRole("button", { name: "PKUSEHR" })
  if (await pkusehr.isVisible().catch(() => false)) {
    await pkusehr.click()
    await page.waitForTimeout(2500)
    result.steps.push("pkusehr-click")
  }

  const pathSegments = [
    "北京排水集团人力系统",
    "5SRC",
    "MicroFront",
    "subapp_pm",
    "mactfs",
  ]

  for (const segment of pathSegments) {
    const locator = page.getByRole("button", { name: new RegExp(`^${segment}(\\s|$)`) }).first()
    if (await locator.isVisible().catch(() => false)) {
      await locator.dblclick().catch(async () => locator.click())
      await page.waitForTimeout(1800)
      result.steps.push(`click:${segment}`)
    }
  }

  const bodyText = await page.locator("body").innerText()
  result.targetVisible = bodyText.includes(serverPath)
  result.mappedVisible =
    bodyText.includes("/Users/fenghp/Desktop/DEV/mactfs-ai-workspace") &&
    bodyText.includes("已映射")
  result.hasMissingCollection = bodyText.includes("Missing required field: collection")
  result.getLatestVisible = bodyText.includes("Get Latest")
  result.checkoutVisible = bodyText.includes("Checkout")
  result.pendingText = bodyText
    .split("\n")
    .filter((line) => /Pending Changes|Included Changes|Excluded Changes|pendingEdit|Missing required/.test(line))
    .slice(0, 20)
    .join("\n")

  await page.screenshot({ path: "output/playwright/mactfs-retest/ui-retest-final.png", fullPage: true })
  await page.evaluate((data) => {
    document.body.setAttribute("data-mactfs-retest", JSON.stringify(data))
  }, result)
  console.log(JSON.stringify(result, null, 2))
}
