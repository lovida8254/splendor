import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 700, height: 950 } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3001/", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.getByRole("button", { name: /게임 시작/ }).click();
await p.getByText("공급처").first().waitFor({ timeout: 15000 });
await p.waitForTimeout(400);
// in-game help button is icon-only (book) in the turn bar
await p.locator("button:has(svg.lucide-book-open)").first().click();
await p.getByText("매 턴").first().waitFor({ timeout: 5000 });
await p.screenshot({ path: "screenshots/howto-ingame.png" });
console.log("ingame howto ok, errors=" + errs.length);
await b.close();
