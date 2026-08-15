/**
 * Ad-hoc screenshot drive — NOT a test.
 *
 * Walks a guest through the reaction surface and writes a PNG per step,
 * so the build can be looked at rather than described.
 *
 *   node e2e/shots.mjs            # desktop 1440x900
 *   node e2e/shots.mjs mobile     # iPhone 13, touch
 */

import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "fs";

const OUT = "/tmp/saxonberg-shots";
const MOBILE = process.argv[2] === "mobile";
mkdirSync(OUT, { recursive: true });

const P = MOBILE ? "m-" : "";
let n = 0;
const shot = async (page, name) => {
  const file = `${OUT}/${P}${String(++n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file });
  console.log("→", file);
  return file;
};

const browser = await chromium.launch();
const context = await browser.newContext(
  MOBILE ? { ...devices["iPhone 13"] } : { viewport: { width: 1440, height: 900 } },
);
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console error]", m.text());
});

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

// ── In as a guest. The button reads "Look around as a guest".
await page.getByText("Look around as a guest", { exact: true }).click();
await page.waitForSelector('input[placeholder*="command"]', { timeout: 30000 });
await page.waitForTimeout(3000);
await shot(page, "in-world");

/** Type into the global command bar and send. */
async function run(cmd, waitMs = 1500) {
  await page.locator('input[placeholder*="command"]').first().fill(cmd);
  await page.getByRole("button", { name: /^Send$/ }).first().click();
  await page.waitForTimeout(waitMs);
}

// ── An act to react to.
await run("say the picker draws from the server's catalogue");
await shot(page, "said");

// ── Hover the row so the hidden `＋` reveals, then open it.
const row = page.locator('[data-testid="terminal"] > div').last();
await row.hover();
await page.waitForTimeout(300);
await shot(page, "hover-reveals-plus");

// `force` because the ＋ is hover-revealed and Playwright's
// actionability check races the reveal; the reveal itself is verified
// by the screenshot above.
await page.locator(".reaction-add button").last().click({ force: true });
await page.waitForTimeout(400);
await shot(page, "quick-row");

// ── The full, slot-aware palette. Scope to the palette so `all` cannot
//    match the inspection pane's own more/less toggle.
await page
  .locator(".reaction-add")
  .last()
  .getByRole("button", { name: "all", exact: true })
  .click({ force: true });
await page.waitForTimeout(600);
await shot(page, "full-palette");

// ── A slot-bearing emote reveals its declared slots.
const wave = page.locator('[data-emote="wave"]').first();
if (await wave.count()) {
  await wave.click();
  await page.waitForTimeout(400);
  await shot(page, "slots-and-command");
}

// ── Send it, and watch the chip land on the frame.
const send = page.getByRole("button", { name: /send/i }).last();
await send.click();
await page.waitForTimeout(2000);
await shot(page, "chip-landed");

const tail = await page
  .locator('[data-testid="terminal"] > div')
  .allTextContents();
console.log("\nlast lines:");
for (const t of tail.slice(-4)) console.log("  ", t.replace(/\s+/g, " ").slice(0, 100));

await browser.close();
console.log("\ndone —", OUT);
