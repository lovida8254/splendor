/* Playwright Fold-viewport check: loads the app, starts a game, asserts no
   horizontal overflow and key elements visible at each viewport, screenshots. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "fold-cover-280", width: 280, height: 653 }, // worst-case narrow cover
  { name: "fold-cover-344", width: 344, height: 882 }, // Z Fold cover (CSS)
  { name: "phone-360", width: 360, height: 800 }, // common Android (Galaxy S/A)
  { name: "phone-390", width: 390, height: 844 }, // iPhone 12/13/14
  { name: "phone-412", width: 412, height: 915 }, // Pixel / large Android
  { name: "phone-430", width: 430, height: 932 }, // iPhone Pro Max
  { name: "fold-open-768", width: 768, height: 1024 }, // unfolded inner (compact)
  { name: "fold-open-884", width: 884, height: 1104 }, // unfolded inner (Z Fold5)
  { name: "desktop-1280", width: 1280, height: 800 },
];

let failures = 0;

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.width < 768,
    hasTouch: vp.width < 768,
  });
  const page = await ctx.newPage();
  const errors = [];
  const BENIGN = [
    "Extra attributes from the server", // dev-only hydration notice (clean in prod build)
    "Download the React DevTools",
    "was preloaded using link preload", // font preload timing
  ];
  const keep = (t) => !BENIGN.some((b) => t.includes(b));
  page.on("console", (m) => m.type() === "error" && keep(m.text()) && errors.push(m.text()));
  page.on("pageerror", (e) => keep(String(e)) && errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Setup screen present?
  await page.getByText("SPLENDOR").first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${OUT}/${vp.name}-setup.png` });

  // Start a game (human vs AI default).
  await page.getByRole("button", { name: /게임 시작/ }).click();

  // Board present?
  await page.getByText("공급처").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    return {
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      innerW: window.innerWidth,
      hasBank: !!Array.from(document.querySelectorAll("*")).find((e) => e.textContent === "공급처"),
    };
  });

  const overflow = metrics.scrollW - metrics.clientW;
  const okOverflow = overflow <= 2;
  await page.screenshot({ path: `${OUT}/${vp.name}-game.png`, fullPage: true });

  const status = okOverflow && errors.length === 0 ? "OK " : "FAIL";
  if (!okOverflow || errors.length) failures++;
  console.log(
    `[${status}] ${vp.name} (${vp.width}x${vp.height}) overflow=${overflow}px ` +
      `bank=${metrics.hasBank} errors=${errors.length}` +
      (errors.length ? ` -> ${errors.slice(0, 2).join(" | ")}` : ""),
  );

  await ctx.close();
}
await browser.close();

console.log(failures === 0 ? "\nALL VIEWPORTS PASSED" : `\n${failures} VIEWPORT(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
