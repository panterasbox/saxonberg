/**
 * ⭐⭐ **The retired hatch reason, guarded gone.**
 *
 * The honest-chrome build hatched the connection popover's *round trip*
 * row with a reason that said nothing measured it and a ping/pong would
 * have to be built. That was inaccurate: `websocketClient.sendPing()`
 * and `backend/inbound/ping.ts` both already existed and had done since
 * the inbound refactor. What was missing was a caller and a handler.
 *
 * ⚠ **A wrong reason is worse than a missing one.** The whole point of
 * classifying a hatch is to tell the next builder where to look, so a
 * reason pointing at work already done spends somebody's afternoon
 * writing a second copy of a protocol. That is the specific decay the
 * three-category hatch table exists to prevent, and it happened anyway
 * — which is why this is a guard and not a code review note.
 *
 * ⚠ The string is checked by GREP over the source rather than by
 * rendering the popover, because the failure being defended against is
 * not "the row shows the wrong reason" — the row is measured now and
 * has no reason at all. It is **the claim surviving somewhere else**: a
 * copy in a sibling component, a doc comment reproducing it, a
 * commented-out block. Prose about the correction is fine and expected;
 * `ConnectionChip`'s own comment paraphrases the old reason
 * deliberately, and this test is the reason it must.
 *
 * The scan includes `__tests__` — a test asserting the old string would
 * be the loudest way for it to come back.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "../../..");

/** Every `.ts` / `.tsx` under `src`, tests included. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("the retired round-trip hatch reason", () => {
  it("⭐ appears nowhere in the client source", () => {
    const offenders = walk(srcDir).filter((file) =>
      // The operative half of the old string. Matching the fragment
      // rather than the full reason catches a partial paste too.
      /needs a ping\/pong/.test(readFileSync(file, "utf8")),
    );
    expect(offenders.map((f) => f.slice(srcDir.length + 1))).toEqual([]);
  });

  /*
   * ⚠ And the corrected claim is not merely absent but REPLACED. A
   * deletion that left the row hatched with no reason at all would pass
   * the grep above while being a worse surface than the wrong reason
   * was — the guard has to know what the row became, not only what it
   * stopped being.
   */
  it("⚠ and the row it described now reads from a measurement", () => {
    const chip = readFileSync(
      join(srcDir, "components", "frame", "ConnectionChip.tsx"),
      "utf8",
    );
    // The row is fed by the shared reading, not an inline literal.
    expect(chip).toMatch(/roundTripFigure\(roundTripMs\)/);
    // And exactly ONE hatch survives in the popover — frames behind,
    // whose reason names something genuinely missing. Counting rather
    // than pattern-matching across rows: two `unwired` states here
    // would mean round trip quietly re-hatched under a new reason.
    const hatches = chip.match(/state: "unwired"/g) ?? [];
    expect(hatches).toHaveLength(1);
    expect(chip).toMatch(/state: "unwired",\s*\n\s*reason: "[^"]*sequence number/);
  });
});
