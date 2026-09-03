/**
 * Content-integrity tests for the general-store seeds (pure YAML reads, the
 * bar-content / cast-content discipline — no clone pipeline). Catches a
 * typo'd stock path, a mispriced or fungible staple, a dangling exit, or a
 * broken Business wiring here, not silently at buy/traverse time.
 *
 * The load-bearing invariant: every ownable staple is a discrete
 * `/lib/stuff/Thing` (never Globbable) — chattel is stamped per-instance, so
 * a fungible stack would fall through the buy/consign loops.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";

const STORE_DIR = fileURLToPath(
  new URL("../../../terminus/content/world/terminus/general-store/", import.meta.url),
);
// The object clusters are the generic-objects pack's rows (content-packs wave 3).
const OBJ_DIR = fileURLToPath(
  new URL("../../../generic-objects/content/stuff/", import.meta.url),
);
// The homebrew kit lines (fermentation D15) live with the trades they
// miniaturize; the carboy + culture jar ride OBJ_DIR (the commons).
const WINE_DIR = fileURLToPath(
  new URL("../../../trade-winemaking/content/trade/winemaking/", import.meta.url),
);
const BREW_DIR = fileURLToPath(
  new URL("../../../trade-brewing/content/trade/brewing/", import.meta.url),
);
const DIST_DIR = fileURLToPath(
  new URL("../../../trade-distilling/content/trade/distilling/", import.meta.url),
);
// The growing cluster (pots, seeds, plants) is the produce trade's (libations drain).
const PRODUCE_DIR = fileURLToPath(
  new URL("../../../trade-farming/content/trade/farming/", import.meta.url),
);
// The upkeep kit is the residence pack's (residences D18) — the store
// stocks it cross-pack, the same way it stocks the farming pots.
const RESIDENCE_DIR = fileURLToPath(
  new URL("../../../residence/content/system/residence/", import.meta.url),
);
// The mana line (TPA reform W5): the cell and the lamp are arcana's —
// the store stocks them cross-pack, the same way it stocks the farming
// pots and the residence kit.
const ARCANA_DIR = fileURLToPath(
  new URL("../../../arcana/content/system/arcana/", import.meta.url),
);
const CH_DIR = fileURLToPath(
  new URL("../../../terminus/content/world/terminus/counting-houses/", import.meta.url),
);
// The title claims are this pack's (residences D18).
const MANIFEST = fileURLToPath(
  new URL("../../pack.yaml", import.meta.url),
);

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

function load(dir: string, file: string): Seed {
  return YAML.parse(readFileSync(`${dir}${file}`, "utf8")) as Seed;
}

describe("general-store content integrity", () => {
  it("the zone, room, fixtures, business, and cast are wired", () => {
    const zone = load(
      fileURLToPath(new URL("../../../terminus/content/world/terminus/", import.meta.url)),
      "general-store.yaml",
    );
    expect(zone.class).toBe("/platform/idea/location/CartesianZone");

    const room = load(STORE_DIR, "shop-floor.yaml");
    expect(room.class).toBe("/platform/location/SingletonCartesianLocation");
    expect(room.data?.props).toEqual([
      "/world/terminus/general-store/counter",
      "/world/terminus/general-store/consignment-shelf",
    ]);
    // The troupe is declared, not derived: the NPCs ride `cast:`.
    expect(room.data?.cast).toEqual([
      "/world/terminus/general-store/agent/clerk",
      "/world/terminus/general-store/agent/keeper",
    ]);

    expect(load(STORE_DIR, "counter.yaml").class).toBe("/platform/thing/Stock");
    expect(load(STORE_DIR, "consignment-shelf.yaml").class).toBe(
      "/platform/thing/ConsignmentShelf",
    );
    expect(load(STORE_DIR, "business.yaml").class).toBe(
      "/platform/idea/Business",
    );
    expect(load(STORE_DIR, "agent/clerk.yaml").class).toBe("/platform/agent/NPC");
    expect(load(STORE_DIR, "agent/keeper.yaml").class).toBe("/platform/agent/NPC");
  });

  // The real, discrete item classes the store sells — each extends `Thing`
  // (chattel-stampable) and none composes GlobbableMixin. A stray Globbable
  // class would fail the allowlist; the runtime `!isGlobbable` proof lives in
  // the standup integration test (which clones the goods for real).
  const DISCRETE_ITEM_CLASSES = new Set([
    "/platform/thing/Prop",
    "/platform/thing/equipment/PortableLight",
    "/platform/thing/equipment/Weapon",
    "/platform/thing/Receptacle",
    // The crafting goods: the sewing kit and the sewing MACHINE are both
    // `MendingTool` — one class, because they afford identically and
    // differ only in `rate`/`control`, which is row data. The whetstone
    // carries the Audible rasp AND its own carried-only `sharpen`, and
    // lives in the smithing pack so the kernel never names a trade's
    // view. The ingot a Meltable Thing — all discrete, none Globbable.
    "/platform/thing/ToolItem",
    "/platform/thing/MendingTool",
    "/trade/smithing/thing/Whetstone",
    "/platform/thing/Ingot",
    // The gardening line (husbandry phase 1): a pot is a Slotted fixture
    // with a bulk interior for soil, a seed a discrete Thing naming the
    // plant it grows into. Both stocked from ordinary `/obj/` templates.
    "/platform/thing/PlantPot",
    "/platform/thing/Seed",
    // The mana line (TPA reform W5): a cell is a Charged + Slottable
    // shell — a wand that fits a bay instead of a hand — and the lamp is
    // the domestic half of the mana-powered device category. Both
    // discrete, neither Globbable.
    "/system/arcana/thing/ManaCell",
    "/system/arcana/thing/ManaLamp",
    // The homebrew line (fermentation D15): the carboy and culture jar
    // are Vat-family vessels (the transform rides the vessel), the
    // small still the distilling pack's furnace-tool — all discrete.
    "/platform/thing/Vat",
    "/trade/distilling/thing/Still",
    // The furnishings line (residences D7/D11), likewise stocked from the
    // shared `/stuff/thing/fixture/` rows: `Chair` is the reusable
    // posture-bearing class (a bed and an armchair differ only in their
    // authored slot and rest quality), `Surface` the table, `Chest` the
    // wardrobe, and `SconceLamp` the one class the line needed — a light
    // that goes on a WALL rather than in a pocket.
    "/platform/thing/Chair",
    "/platform/thing/Surface",
    "/platform/thing/Chest",
    "/generic-objects/thing/SconceLamp",
    // The householder's kit — a `ToolItem` subclass in the residence
    // pack, because the verb it confers is a static on a class and a
    // row cannot carry one.
    "/system/residence/thing/HouseholdersKit",
  ]);

  it("every priced/stocked good is a real, discrete item (never Globbable)", () => {
    const counter = load(STORE_DIR, "counter.yaml");
    const lines = counter.data?.stockLines as { itemTemplatePath: string; par: number }[];
    const prices = counter.data?.prices as Record<string, number>;
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      // A stock line's `itemTemplatePath` takes ANY path: the store-local
      // staples live under `thing/` because they are store-specific, while
      // the gardening line points straight at shared `/obj/` templates
      // (duplicating those would mean two pots, and two seeds growing the
      // same plant, drifting apart). Resolve either home.
      const local = line.itemTemplatePath.startsWith(
        "/world/terminus/general-store/",
      );
      const produce = line.itemTemplatePath.startsWith("/trade/farming/");
      const residence = line.itemTemplatePath.startsWith("/system/residence/");
      // The homebrew line (fermentation D15): the kit rows live with
      // the trades they miniaturize; carboy + jar in the commons.
      const wine = line.itemTemplatePath.startsWith("/trade/winemaking/");
      const brew = line.itemTemplatePath.startsWith("/trade/brewing/");
      const dist = line.itemTemplatePath.startsWith("/trade/distilling/");
      const arcana = line.itemTemplatePath.startsWith("/system/arcana/");
      const dir = local
        ? STORE_DIR
        : produce
          ? PRODUCE_DIR
          : residence
            ? RESIDENCE_DIR
            : wine
              ? WINE_DIR
              : brew
                ? BREW_DIR
                : dist
                  ? DIST_DIR
                  : arcana
                    ? ARCANA_DIR
                    : OBJ_DIR;
      const rel = local
        ? line.itemTemplatePath.replace("/world/terminus/general-store/", "")
        : produce
          ? line.itemTemplatePath.replace("/trade/farming/", "")
          : residence
            ? line.itemTemplatePath.replace("/system/residence/", "")
            : wine
              ? line.itemTemplatePath.replace("/trade/winemaking/", "")
              : brew
                ? line.itemTemplatePath.replace("/trade/brewing/", "")
                : dist
                  ? line.itemTemplatePath.replace("/trade/distilling/", "")
                  : arcana
                    ? line.itemTemplatePath.replace("/system/arcana/", "")
                    : line.itemTemplatePath.replace("/stuff/", "");
      expect(existsSync(`${dir}${rel}.yaml`), line.itemTemplatePath).toBe(true);
      const good = load(dir, `${rel}.yaml`);
      // A real, discrete item class (backed by a shipped system, not a prop).
      expect(DISCRETE_ITEM_CLASSES.has(good.class ?? "")).toBe(true);
      // Priced, coinage-clean (a positive integer minor amount).
      const price = prices[line.itemTemplatePath];
      expect(Number.isInteger(price)).toBe(true);
      expect(price).toBeGreaterThan(0);
      expect(line.par).toBeGreaterThan(0);
    }
  });

  it("the goods are backed by real systems (not decorative props)", () => {
    // The rations are genuinely edible — their material is a food material.
    const rations = load(STORE_DIR, "thing/rations.yaml");
    expect(rations.class).toBe("/platform/thing/Prop");
    expect(String(rations.data?._materialPath)).toMatch(/^\/stuff\/idea\/material\/food\//);
    // The lights actually emit (authored flux + warmth), start unlit.
    for (const f of ["torch", "lantern"]) {
      const light = load(STORE_DIR, `thing/${f}.yaml`);
      expect(light.class).toBe("/platform/thing/equipment/PortableLight");
      expect(Number(light.data?.emittedIntensity)).toBeGreaterThan(0);
      expect(light.data?.on).toBe(false);
    }
    // The waterskin is a real fluid holder (a capacity to fill).
    const skin = load(STORE_DIR, "thing/waterskin.yaml");
    expect(skin.class).toBe("/platform/thing/Receptacle");
    expect(Number(skin.data?.interiorCapacity)).toBeGreaterThan(0);
    // The knife is a real bladed weapon (delivers an edge, wieldable).
    const knife = load(STORE_DIR, "thing/clasp-knife.yaml");
    expect(knife.class).toBe("/platform/thing/equipment/Weapon");
    expect(knife.data?.constructionForm).toBe("bladed");
  });

  it("the Business operates the counter and rosters the clerk", () => {
    const biz = load(STORE_DIR, "business.yaml");
    expect(biz.data?.operatingLocations).toEqual([
      "/world/terminus/general-store/counter",
    ]);
    // The keeper owns the shop — an `entity` appointing authority. (This
    // read `proprietorPath` until the shipped Businesses were ported off
    // the legacy spelling.)
    expect(biz.data?.appointingAuthority).toEqual({
      kind: "entity",
      path: "/world/terminus/general-store/agent/keeper",
    });
    const roster = biz.data?.rosterSlots as { positionKey: string; assignee: string }[];
    expect(roster[0]?.assignee).toBe("/world/terminus/general-store/agent/clerk");
    // The counter's businessPath points back at the Business.
    expect(load(STORE_DIR, "counter.yaml").data?.businessPath).toBe(
      "/world/terminus/general-store/business",
    );
  });

  it("the store is reciprocally exit-wired to the avenue block", () => {
    const room = load(STORE_DIR, "shop-floor.yaml");
    const exits = room.data?.exits as Record<string, { destination: string }>;
    expect(exits.south?.destination).toBe(
      "/world/terminus/counting-houses/avenue-block",
    );
    const avenue = load(CH_DIR, "avenue-block.yaml");
    const aExits = avenue.data?.exits as Record<string, { destination: string }>;
    expect(aExits.north?.destination).toBe(
      "/world/terminus/general-store/shop-floor",
    );
  });

  it("the store parcel is titled to the terminus municipality", () => {
    const manifest = YAML.parse(readFileSync(MANIFEST, "utf8")) as {
      requires: { title: { extent: string; holder?: { group?: string } }[] };
    };
    const row = manifest.requires.title.find(
      (p) => p.extent === "/world/terminus/general-store",
    );
    expect(row?.holder).toEqual({ group: "terminus" });
  });

  it("no shelf good uses an off-allowlist (Globbable-risking) class", () => {
    const goods = readdirSync(`${STORE_DIR}thing/`).filter((f) =>
      f.endsWith(".yaml"),
    );
    expect(goods.length).toBeGreaterThan(0);
    for (const f of goods) {
      const good = load(STORE_DIR, `thing/${f}`);
      expect(DISCRETE_ITEM_CLASSES.has(good.class ?? "")).toBe(true);
    }
  });
});
