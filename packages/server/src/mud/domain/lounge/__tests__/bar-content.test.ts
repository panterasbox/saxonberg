/**
 * Content-integrity tests for the Dave's Bar fixtures authored in the
 * content pass: the corpo marks on the back-bar bottles and the wiring
 * of Dave's office. Pure YAML reads (no clone pipeline) — the same
 * cheap save-gate-parity discipline as cast-content.test: a typo'd
 * `_brandKey` or a dangling office exit is caught here, not silently at
 * render/traverse time.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";

const LOUNGE_DIR = fileURLToPath(
  new URL("../../../seeds/domain/lounge/", import.meta.url)
);
const BRAND_DIR = fileURLToPath(
  new URL("../../../seeds/lib/corpo/Brand/", import.meta.url)
);

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

function loadLounge(file: string): Seed {
  return YAML.parse(readFileSync(`${LOUNGE_DIR}${file}`, "utf8")) as Seed;
}

function brandKeys(): Set<string> {
  return new Set(
    readdirSync(BRAND_DIR)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => {
        const seed = YAML.parse(readFileSync(`${BRAND_DIR}${f}`, "utf8")) as Seed;
        return String(seed.data?.key ?? "");
      })
  );
}

describe("Dave's Bar — corpo shelf", () => {
  // The three spirit bottles carry a mark; lime juice stays unbranded.
  const BRANDED_BOTTLES = [
    "gin-bottle.yaml",
    "rum-bottle.yaml",
    "vermouth-bottle.yaml",
  ];

  it("every branded bottle's _brandKey resolves to a real Brand seed", () => {
    const keys = brandKeys();
    for (const file of BRANDED_BOTTLES) {
      const brand = loadLounge(file).data?._brandKey;
      expect(typeof brand, file).toBe("string");
      expect(keys, `${file}: ${String(brand)}`).toContain(String(brand));
    }
  });

  it("the lime bottle is intentionally unbranded (juice, not a labelled spirit)", () => {
    expect(loadLounge("lime-bottle.yaml").data?._brandKey).toBeUndefined();
  });
});

describe("Dave's Bar — the office", () => {
  it("the bar declares a concealed, one-way north exit into the office", () => {
    const exits = loadLounge("bar.yaml").data?.exits as
      | Record<string, Record<string, unknown>>
      | undefined;
    expect(exits?.north?.destination).toBe("/domain/lounge/office");
    // Phase 3: `hidden: true` was raised to an authored concealment band
    // (the vocabulary that subsumed the flag) + a hint, so the office is
    // discoverable via `search`.
    expect(exits?.north?.concealment).toBe("hidden");
    expect(typeof exits?.north?.hint).toBe("string");
    // One-way declared so it never auto-installs a colliding inverse on
    // the bar (the office wires its own south).
    expect(exits?.north?.bidirectional).toBe(false);
  });

  it("the office exists and wires a plain south exit back to the bar", () => {
    expect(existsSync(`${LOUNGE_DIR}office.yaml`)).toBe(true);
    const exits = loadLounge("office.yaml").data?.exits as
      | Record<string, Record<string, unknown>>
      | undefined;
    expect(exits?.south?.destination).toBe("/domain/lounge/bar");
    // Visible (not hidden) — you can always find the way out.
    expect(exits?.south?.hidden).toBeUndefined();
  });
});

describe("Dave's Bar — neon adornments", () => {
  // The branded, light-emitting wall fixtures the bar declares.
  const SIGNS = ["neon-veshko.yaml", "neon-aevex.yaml"];

  it("the bar declares both neon signs as adornments", () => {
    const adornments = loadLounge("bar.yaml").data?.adornments as
      | { template: string }[]
      | undefined;
    const templates = (adornments ?? []).map((a) => a.template);
    expect(templates).toContain("/domain/lounge/neon-veshko");
    expect(templates).toContain("/domain/lounge/neon-aevex");
  });

  it("every neon sign carries a real brand mark and emits light", () => {
    const keys = brandKeys();
    for (const file of SIGNS) {
      const data = loadLounge(file).data ?? {};
      expect(keys, `${file}: ${String(data._brandKey)}`).toContain(
        String(data._brandKey)
      );
      // A sign that doesn't emit wouldn't light the room.
      expect(Number(data.emittedIntensity), file).toBeGreaterThan(0);
    }
  });
});
