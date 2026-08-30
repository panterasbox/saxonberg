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
  new URL("../../../../../../content/world-seed/content/world/terminus/general-store/", import.meta.url),
);
// The object clusters are the generic-objects pack's rows (content-packs wave 3).
const OBJ_DIR = fileURLToPath(
  new URL("../../../../../../content/generic-objects/content/stuff/", import.meta.url),
);
// The growing cluster (pots, seeds, plants) is the produce trade's (libations drain).
const PRODUCE_DIR = fileURLToPath(
  new URL("../../../../../../content/trade-farming/content/trade/farming/", import.meta.url),
);
const CH_DIR = fileURLToPath(
  new URL("../../../../../../content/world-seed/content/world/terminus/counting-houses/", import.meta.url),
);
// The title claims are world-seed's (content-packs wave 3).
const MANIFEST = fileURLToPath(
  new URL("../../../../../../content/world-seed/pack.yaml", import.meta.url),
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
      fileURLToPath(new URL("../../../../../../content/world-seed/content/world/terminus/", import.meta.url)),
      "general-store.yaml",
    );
    expect(zone.class).toBe("/platform/idea/location/CartesianZone");

    const room = load(STORE_DIR, "shop-floor.yaml");
    expect(room.class).toBe("/platform/location/Room");
    expect(room.data?.populates).toEqual([
      "/world/terminus/general-store/counter",
      "/world/terminus/general-store/consignment-shelf",
      "/world/terminus/general-store/npc/clerk",
      "/world/terminus/general-store/npc/keeper",
    ]);

    expect(load(STORE_DIR, "counter.yaml").class).toBe("/platform/thing/Stock");
    expect(load(STORE_DIR, "consignment-shelf.yaml").class).toBe(
      "/platform/thing/ConsignmentShelf",
    );
    expect(load(STORE_DIR, "business.yaml").class).toBe(
      "/platform/idea/Business",
    );
    expect(load(STORE_DIR, "npc/clerk.yaml").class).toBe("/platform/agent/NPC");
    expect(load(STORE_DIR, "npc/keeper.yaml").class).toBe("/platform/agent/NPC");
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
    // The crafting goods: the sewing kit + the sewing MACHINE (the
    // capability table's data-only variant) are plain ToolItems; the
    // whetstone keeps its class for the Audible rasp (behavior, not
    // affordances); the ingot a Meltable Thing — all discrete, none
    // Globbable.
    "/platform/thing/ToolItem",
    "/platform/thing/Whetstone",
    "/platform/thing/Ingot",
    // The gardening line (husbandry phase 1): a pot is a Slotted fixture
    // with a bulk interior for soil, a seed a discrete Thing naming the
    // plant it grows into. Both stocked from ordinary `/obj/` templates.
    "/platform/thing/PlantPot",
    "/platform/thing/Seed",
  ]);

  it("every priced/stocked good is a real, discrete item (never Globbable)", () => {
    const counter = load(STORE_DIR, "counter.yaml");
    const lines = counter.data?.stockLines as { itemTemplatePath: string; par: number }[];
    const prices = counter.data?.prices as Record<string, number>;
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      // A stock line's `itemTemplatePath` takes ANY path: the store-local
      // staples live under `goods/` because they are store-specific, while
      // the gardening line points straight at shared `/obj/` templates
      // (duplicating those would mean two pots, and two seeds growing the
      // same plant, drifting apart). Resolve either home.
      const local = line.itemTemplatePath.startsWith(
        "/world/terminus/general-store/",
      );
      const produce = line.itemTemplatePath.startsWith("/trade/farming/");
      const dir = local ? STORE_DIR : produce ? PRODUCE_DIR : OBJ_DIR;
      const rel = local
        ? line.itemTemplatePath.replace("/world/terminus/general-store/", "")
        : produce
          ? line.itemTemplatePath.replace("/trade/farming/", "")
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
    const rations = load(STORE_DIR, "goods/rations.yaml");
    expect(rations.class).toBe("/platform/thing/Prop");
    expect(String(rations.data?._materialPath)).toMatch(/^\/stuff\/idea\/material\/food\//);
    // The lights actually emit (authored flux + warmth), start unlit.
    for (const f of ["torch", "lantern"]) {
      const light = load(STORE_DIR, `goods/${f}.yaml`);
      expect(light.class).toBe("/platform/thing/equipment/PortableLight");
      expect(Number(light.data?.emittedIntensity)).toBeGreaterThan(0);
      expect(light.data?.on).toBe(false);
    }
    // The waterskin is a real fluid holder (a capacity to fill).
    const skin = load(STORE_DIR, "goods/waterskin.yaml");
    expect(skin.class).toBe("/platform/thing/Receptacle");
    expect(Number(skin.data?.interiorCapacity)).toBeGreaterThan(0);
    // The knife is a real bladed weapon (delivers an edge, wieldable).
    const knife = load(STORE_DIR, "goods/clasp-knife.yaml");
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
      path: "/world/terminus/general-store/npc/keeper",
    });
    const roster = biz.data?.rosterSlots as { positionKey: string; assignee: string }[];
    expect(roster[0]?.assignee).toBe("/world/terminus/general-store/npc/clerk");
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
    const goods = readdirSync(`${STORE_DIR}goods/`).filter((f) =>
      f.endsWith(".yaml"),
    );
    expect(goods.length).toBeGreaterThan(0);
    for (const f of goods) {
      const good = load(STORE_DIR, `goods/${f}`);
      expect(DISCRETE_ITEM_CLASSES.has(good.class ?? "")).toBe(true);
    }
  });
});
