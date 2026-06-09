async page => {
  const result = {
    pendingBefore: false,
    commentFilled: false,
    checkinClicked: false,
    successMessage: "",
    pendingAfterZero: false,
    bodySample: "",
  }

  let bodyText = await page.locator("body").innerText()
  result.pendingBefore = bodyText.includes("Included 1") && bodyText.includes("pendingEdit / 编辑")

  const comment = page.getByPlaceholder("Comment")
  await comment.fill("AI UI retest checkin 2026-06-08 17:42")
  result.commentFilled = true
  await page.waitForTimeout(500)

  const checkinButton = page.getByRole("button", { name: "Checkin" }).last()
  if (await checkinButton.isEnabled().catch(() => false)) {
    await checkinButton.click()
    await page.waitForTimeout(3500)
    result.checkinClicked = true
  }

  bodyText = await page.locator("body").innerText()
  result.successMessage = bodyText
    .split("\n")
    .find((line) => line.includes("Checkin 成功")) || ""
  result.pendingAfterZero = bodyText.includes("0 项") && bodyText.includes("暂无 Included Changes")
  result.bodySample = bodyText
    .split("\n")
    .filter((line) => /Pending Changes|Included|stage4-e2e|pendingEdit|编辑|Checkin|changeset|暂无/.test(line))
    .slice(0, 80)
    .join("\n")

  await page.screenshot({ path: "output/playwright/mactfs-retest/checkin-flow-final.png", fullPage: true })
  await page.evaluate((data) => {
    document.body.setAttribute("data-mactfs-checkin-flow", JSON.stringify(data))
  }, result)
  console.log(JSON.stringify(result, null, 2))
}
