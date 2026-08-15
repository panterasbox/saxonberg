/**
 * Ad-hoc probe — NOT a test. Opens the reaction palette and reports the
 * geometry of the palette box against its children, so a clipping bug is
 * measured rather than guessed at.
 */

import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByText("Look around as a guest", { exact: true }).click();
await page.waitForSelector('input[placeholder*="command"]', { timeout: 30000 });
await page.waitForTimeout(3000);

await page.locator('input[placeholder*="command"]').first().fill("say probe");
await page.getByRole("button", { name: /^Send$/ }).first().click();
await page.waitForTimeout(1500);

await page.locator('[data-testid="terminal"] > div').last().hover();
await page.locator(".reaction-add button").last().click();
await page.waitForTimeout(400);

const geom = await page.evaluate(() => {
  const wrap = document.querySelector(".reaction-add");
  const palette = wrap?.querySelector("div");
  if (!palette) return { error: "no palette" };
  const pb = palette.getBoundingClientRect();
  const kids = [...palette.children].map((c) => {
    const r = c.getBoundingClientRect();
    return {
      text: c.textContent.trim(),
      left: Math.round(r.left),
      right: Math.round(r.right),
      overflowsRight: r.right > pb.right + 0.5,
    };
  });
  const cs = getComputedStyle(palette);
  return {
    palette: {
      left: Math.round(pb.left),
      right: Math.round(pb.right),
      width: Math.round(pb.width),
      position: cs.position,
      overflow: cs.overflow,
      whiteSpace: cs.whiteSpace,
    },
    wrap: (() => {
      const w = wrap.getBoundingClientRect();
      const wcs = getComputedStyle(wrap);
      return {
        width: Math.round(w.width),
        overflow: wcs.overflow,
        clip: wcs.clip,
        clipPath: wcs.clipPath,
        position: wcs.position,
      };
    })(),
    kids,
  };
});

console.log(JSON.stringify(geom, null, 2));
await browser.close();
