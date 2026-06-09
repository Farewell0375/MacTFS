async page => {
  const target = "stage4-e2e-20260608124119.txt"
  const result = {
    selected: false,
    getLatestClicked: false,
    getLatestMessage: "",
    checkoutClicked: false,
    checkoutMessage: "",
    pendingVisible: false,
    checkinVisible: false,
    bodySample: "",
  }

  const targetRow = page.getByRole("button", { name: new RegExp(target) }).first()
  await targetRow.click()
  await page.waitForTimeout(800)
  result.selected = (await page.locator("body").innerText()).includes(`已选中：$/北京排水集团人力系统/5SRC/MicroFront/subapp_pm/mactfs/${target}`)

  const bottomGetLatest = page.getByRole("button", { name: "Get Latest" }).last()
  if (await bottomGetLatest.isEnabled().catch(() => false)) {
    await bottomGetLatest.click()
    await page.waitForTimeout(2500)
    result.getLatestClicked = true
  }

  let bodyText = await page.locator("body").innerText()
  result.getLatestMessage = bodyText
    .split("\n")
    .find((line) => line.includes("Get Latest 完成")) || ""

  await targetRow.click()
  await page.waitForTimeout(500)
  const checkout = page.getByRole("button", { name: "Checkout" }).last()
  if (await checkout.isEnabled().catch(() => false)) {
    await checkout.click()
    await page.waitForTimeout(2500)
    result.checkoutClicked = true
  }

  bodyText = await page.locator("body").innerText()
  result.checkoutMessage = bodyText
    .split("\n")
    .find((line) => line.includes("Checkout 完成")) || ""
  result.pendingVisible = bodyText.includes("stage4-e2e-20260608124119.txt") && bodyText.includes("编辑")
  result.checkinVisible = bodyText.includes("Checkin") && bodyText.includes("Included")
  result.bodySample = bodyText
    .split("\n")
    .filter((line) => /Get Latest|Checkout|Pending Changes|Included|stage4-e2e|编辑|Checkin/.test(line))
    .slice(0, 60)
    .join("\n")

  await page.screenshot({ path: "output/playwright/mactfs-retest/file-flow-after-checkout.png", fullPage: true })
  await page.evaluate((data) => {
    document.body.setAttribute("data-mactfs-file-flow", JSON.stringify(data))
  }, result)
  console.log(JSON.stringify(result, null, 2))
}
