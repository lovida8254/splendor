import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL || "http://localhost:3001";
mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByText("SPLENDOR").first().waitFor({ timeout: 15000 });
await page.getByRole("button", { name: /게임 시작/ }).click();
await page.getByText("공급처").first().waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
// hover a middle card to trigger the lift
const cards = page.locator("[data-fly-card^='board-2']");
if (await cards.count()) {
  await cards.nth(1).hover();
  await page.waitForTimeout(250);
}
await page.screenshot({ path: "screenshots/hover.png" });
await ctx.close();
await browser.close();
console.log("hover screenshot saved");
