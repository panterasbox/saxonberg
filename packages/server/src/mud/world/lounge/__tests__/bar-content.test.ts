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
  new URL("../../../../../../content/saxonberg-lounge/content/world/lounge/", import.meta.url)
);
// Brands live in the five corpo packs (each corpo's own marks) plus the
// generic-objects pack for the one independent brand (crowsfoot-gin, `owner: ""`).
const CONTENT = fileURLToPath(new URL("../../../../../../content/", import.meta.url));
const BRAND_DIRS = [
  ...["aevex", "goodkin", "hollis", "veshko", "vionne"].map(
    (k) => `${CONTENT}corpo-${k}/content/stuff/idea/corpo/Brand/`,
  ),
  `${CONTENT}generic-objects/content/stuff/idea/corpo/Brand/`,
];

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

function loadLounge(file: string): Seed {
  return YAML.parse(readFileSync(`${LOUNGE_DIR}${file}`, "utf8")) as Seed;
}

function brandKeys(): Set<string> {
  return new Set(
    BRAND_DIRS.flatMap((dir) =>
      readdirSync(dir)
        .filter((f) => f.endsWith(".yaml"))
        .map((f) => {
          const seed = YAML.parse(readFileSync(`${dir}${f}`, "utf8")) as Seed;
          return String(seed.data?.key ?? "");
        }),
    ),
  );
}

describe("Dave's Bar — the rail is bought, never populated (libations D14)", () => {
  const populates = (): string[] =>
    ((loadLounge("location/bar.yaml").data?.populates ?? []) as (string | { template: string })[]).map(
      (p) => (typeof p === "string" ? p : p.template),
    );

  it("no bottle rides `populates` — the keeper's restocks beat stocks the rail by buying", () => {
    for (const t of populates()) expect(t, t).not.toMatch(/bottle|keg|crate/);
    for (const f of ["gin-bottle", "vermouth-bottle", "rum-bottle", "lime-bottle"]) {
      expect(existsSync(`${LOUNGE_DIR}thing/${f}.yaml`), f).toBe(false);
    }
  });

  it("the bar bundle's stations are present: the glass rack (the pool), the basin + water tap (wash), the ice bin, the tap", () => {
    const t = populates();
    for (const fixture of ["glass-rack", "basin", "water-tap", "ice-bin", "tap", "back-bar", "well"]) {
      expect(t, fixture).toContain(`/trade/hospitality/thing/${fixture}`);
    }
  });

  it("the house tablet is the lounge's own row, signed in as the bar's business, on the back-bar", () => {
    const entry = (loadLounge("location/bar.yaml").data?.populates as { template?: string; onto?: string }[]).find(
      (p) => typeof p === "object" && p.template === "/world/lounge/thing/house-tablet",
    );
    expect(entry?.onto).toBe("/trade/hospitality/thing/back-bar");
    const tablet = loadLounge("thing/house-tablet.yaml");
    expect(tablet.class).toBe("/platform/thing/Tablet");
    expect(tablet.data?.pairing).toBe("staff");
    expect(tablet.data?.principal).toBe("/world/lounge/idea/business");
  });

  it("the par manifest names the distributor on every bought line and glassware on the rest", () => {
    const lines = loadLounge("idea/business.yaml").data?.parLines as
      | { category: string; unit: string; level: number; supplier?: string }[]
      | undefined;
    expect(lines?.length).toBeGreaterThanOrEqual(35);
    for (const l of lines ?? []) {
      expect(["L", "count", "kg"], l.category).toContain(l.unit);
      expect(l.level, l.category).toBeGreaterThan(0);
      if (l.supplier) expect(l.supplier).toBe("/trade/distilling/idea/business");
    }
    expect(lines?.find((l) => l.category === "coupe")?.level).toBe(12);
    expect(lines?.find((l) => l.category === "ice")?.unit).toBe("kg");
  });

  it("Mara runs the restocks brain, and its config names only the bar's own fixtures", () => {
    const behaviors = loadLounge("agent/mara.yaml").data?.behaviors as
      | { brain: string; config?: Record<string, string> }[]
      | undefined;
    const restocks = behaviors?.find((b) => b.brain === "/lib/behavior/restocks");
    expect(restocks?.config).toEqual({
      shelf: "/trade/hospitality/thing/back-bar",
      rack: "/trade/hospitality/thing/glass-rack",
      bin: "/trade/hospitality/thing/ice-bin",
    });
  });

  it("the menu offers every one of the 24 libation lines, each priced", () => {
    const menu = loadLounge("thing/bar-menu.yaml").data ?? {};
    const offered = menu.offeredRecipes as string[];
    const prices = menu.prices as Record<string, number>;
    expect(offered.length).toBeGreaterThanOrEqual(24);
    for (const id of offered) expect(prices[id], id).toBeGreaterThan(0);
    for (const id of ["martini", "mojito", "gin-tonic", "pint", "glass-of-red", "mixer", "coffee"]) {
      expect(offered).toContain(id);
    }
  });
});

describe("Dave's Bar — the sports booth", () => {
  it("the bar opens east into the booth, which declares its own way back", () => {
    const exits = loadLounge("location/bar.yaml").data?.exits as Record<string, Record<string, unknown>>;
    expect(exits.east?.destination).toBe("/world/lounge/location/booth");
    expect(exits.east?.bidirectional).toBe(false);
    const back = loadLounge("location/booth.yaml").data?.exits as Record<string, Record<string, unknown>>;
    expect(back.west?.destination).toBe("/world/lounge/location/bar");
  });

  it("the TV is a Screen paired to the booth's remote; both populate the booth", () => {
    const booth = loadLounge("location/booth.yaml").data?.populates as string[];
    expect(booth).toEqual(["/world/lounge/thing/tv", "/world/lounge/thing/remote"]);
    const tv = loadLounge("thing/tv.yaml");
    expect(tv.class).toBe("/platform/thing/Screen");
    expect(tv.data?.pairing).toBe("remote");
    expect(tv.data?.remote).toBe("/world/lounge/thing/remote");
    expect(loadLounge("thing/remote.yaml").class).toBe("/platform/thing/Remote");
  });
});

describe("Dave's Bar — the player path to the keeper seat", () => {
  it("Dave's dialogue offers work only to somebody holding no position here, and appoints AS Dave", () => {
    const behaviors = loadLounge("agent/dave.yaml").data?.behaviors as { brain: string; config: { nodes: Record<string, { choices?: { line: string; guard?: unknown[]; to?: string; effects?: { verb: string; command?: string }[] }[] }> } }[];
    const tree = behaviors.find((b) => b.brain === "/lib/behavior/tree-dialogue")!.config;
    const ask = tree.nodes.neutral!.choices!.find((c) => c.line === "Looking for work?");
    expect(ask?.guard).toEqual([{ fact: "position:/world/lounge/idea/business", op: "eq", value: false }]);
    const take = tree.nodes[ask!.to!]!.choices!.find((c) => c.effects?.some((e) => e.verb === "dispatch"));
    const dispatch = take!.effects!.find((e) => e.verb === "dispatch")!;
    expect(dispatch.command).toBe("appoint $player to keeper at /world/lounge/idea/business");
  });
});

describe("Dave's Bar — the office", () => {
  it("the bar declares a concealed, one-way north exit into the office", () => {
    const exits = loadLounge("location/bar.yaml").data?.exits as
      | Record<string, Record<string, unknown>>
      | undefined;
    expect(exits?.north?.destination).toBe("/world/lounge/location/office");
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
    expect(existsSync(`${LOUNGE_DIR}location/office.yaml`)).toBe(true);
    const exits = loadLounge("location/office.yaml").data?.exits as
      | Record<string, Record<string, unknown>>
      | undefined;
    expect(exits?.south?.destination).toBe("/world/lounge/location/bar");
    // Visible (not hidden) — you can always find the way out.
    expect(exits?.south?.hidden).toBeUndefined();
  });
});

describe("Dave's Bar — neon adornments", () => {
  // The branded, light-emitting wall fixtures the bar declares.
  const SIGNS = ["thing/neon-veshko.yaml", "thing/neon-aevex.yaml"];

  it("the bar declares both neon signs as adornments", () => {
    const adornments = loadLounge("location/bar.yaml").data?.adornments as
      | { template: string }[]
      | undefined;
    const templates = (adornments ?? []).map((a) => a.template);
    expect(templates).toContain("/world/lounge/thing/neon-veshko");
    expect(templates).toContain("/world/lounge/thing/neon-aevex");
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
