/**
 * QuantityMarshaller seed coverage — every unit any field marshaller
 * references (`QuantityMarshaller.pathFor('<unit>')` anywhere in src)
 * must have a seed row at
 * `seeds/lib/persistence/QuantityMarshaller/<slug>.yaml`, or cloning any
 * template whose class marshals that unit fails at hydrate time with
 * `Template not found` — IN LIVE PLAY ONLY, because unit tests install
 * marshallers by hand (`installV1QuantityMarshallers`) and so cannot see
 * the gap. This is exactly how the fire build's materials (`MJ/kg`,
 * `J/kg`) and electricity's (`A`, `Ω`) were un-clonable in a running
 * server while 6,000 tests stayed green — caught by the magic build's
 * browser drive. The roster test makes the gap impossible to reintroduce.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const SRC_ROOT = join(dirname(__filename), "../../../..");
const SEEDS_DIR = join(SRC_ROOT, "mud/seeds/lib/persistence/QuantityMarshaller");

/** Mirror of QuantityMarshaller's `encodeUnit` (kept in lockstep by this test). */
function encodeUnit(unit: string): string {
  return unit
    .replace(/\//g, "-per-")
    .replace(/[()]/g, "")
    .replace(/·/g, "-")
    .replace(/³/g, "3")
    .replace(/²/g, "2")
    .replace(/%/g, "pct");
}

describe("QuantityMarshaller seed coverage", () => {
  it("every pathFor(unit) in src has a seeded marshaller row", () => {
    // grep the tree for pathFor literals (the same sweep a reviewer runs).
    // BOTH quote styles: quoting is mixed by area in this codebase (see
    // CLAUDE.md § Code Style), so a single-quote-only sweep silently skips
    // every double-quoted call site — which is the exact blind spot this
    // test exists to close. `ParcelRecord.area` was the first one.
    // The grep pattern carries no quote character at all — matching the
    // bare call is enough, and the regex below decides which quote style
    // it used. Keeps the shell string free of nested-escaping hazards.
    const out = execSync(
      `grep -rh "QuantityMarshaller.pathFor(" --include='*.ts' ${SRC_ROOT}/mud 2>/dev/null || true`,
      { encoding: "utf-8" },
    );
    const units = new Set<string>();
    for (const m of out.matchAll(/pathFor\((['"])(.+?)\1\)/g)) {
      if (!m[2]!.includes("<")) units.add(m[2]!); // skip doc-comment examples
    }
    expect(units.size).toBeGreaterThan(10); // the sweep found the call sites

    const seeded = new Set(
      readdirSync(SEEDS_DIR)
        .filter((f) => f.endsWith(".yaml"))
        .map((f) => f.slice(0, -5)),
    );
    const missing = [...units]
      .map((u) => ({ unit: u, slug: encodeUnit(u) }))
      .filter(({ slug }) => !seeded.has(slug));
    expect(missing, JSON.stringify(missing)).toEqual([]);
  });

  it("every seeded row round-trips its declared unit through the slug", () => {
    for (const f of readdirSync(SEEDS_DIR)) {
      if (!f.endsWith(".yaml")) continue;
      const body = readFileSync(join(SEEDS_DIR, f), "utf-8");
      const m = body.match(/unit:\s*"?([^"\n]+)"?/);
      expect(m, `${f} declares no unit`).toBeTruthy();
      expect(encodeUnit(m![1]!.trim()), `${f} slug mismatch`).toBe(
        f.slice(0, -5),
      );
    }
  });
});
