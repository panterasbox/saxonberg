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
  new URL("../../../seeds/domain/terminus/general-store/", import.meta.url),
);
const CH_DIR = fileURLToPath(
  new URL("../../../seeds/domain/terminus/counting-houses/", import.meta.url),
);
const PARCELS = fileURLToPath(
  new URL("../../../config/parcels.yaml", import.meta.url),
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
      fileURLToPath(new URL("../../../seeds/domain/terminus/", import.meta.url)),
      "general-store.yaml",
    );
    expect(zone.class).toBe("/lib/location/CartesianZone");

    const room = load(STORE_DIR, "shop-floor.yaml");
    expect(room.class).toBe("/lib/location/CartesianLocation");
    expect(room.data?.populates).toEqual([
      "/domain/terminus/general-store/counter",
      "/domain/terminus/general-store/consignment-shelf",
      "/domain/terminus/general-store/npc/clerk",
      "/domain/terminus/general-store/npc/keeper",
    ]);

    expect(load(STORE_DIR, "counter.yaml").class).toBe("/lib/retail/Stock");
    expect(load(STORE_DIR, "consignment-shelf.yaml").class).toBe(
      "/lib/retail/ConsignmentShelf",
    );
    expect(load(STORE_DIR, "business.yaml").class).toBe(
      "/lib/employment/Business",
    );
    expect(load(STORE_DIR, "npc/clerk.yaml").class).toBe("/lib/npc/NPC");
    expect(load(STORE_DIR, "npc/keeper.yaml").class).toBe("/lib/npc/NPC");
  });

  // The real, discrete item classes the store sells — each extends `Thing`
  // (chattel-stampable) and none composes GlobbableMixin. A stray Globbable
  // class would fail the allowlist; the runtime `!isGlobbable` proof lives in
  // the standup integration test (which clones the goods for real).
  const DISCRETE_ITEM_CLASSES = new Set([
    "/lib/stuff/Thing",
    "/lib/equipment/PortableLight",
    "/lib/equipment/Weapon",
    "/obj/Receptacle",
  ]);

  it("every priced/stocked good is a real, discrete item (never Globbable)", () => {
    const counter = load(STORE_DIR, "counter.yaml");
    const lines = counter.data?.stockLines as { itemTemplatePath: string; par: number }[];
    const prices = counter.data?.prices as Record<string, number>;
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      const rel = line.itemTemplatePath.replace(
        "/domain/terminus/general-store/",
        "",
      );
      expect(existsSync(`${STORE_DIR}${rel}.yaml`)).toBe(true);
      const good = load(STORE_DIR, `${rel}.yaml`);
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
    expect(rations.class).toBe("/lib/stuff/Thing");
    expect(String(rations.data?._materialPath)).toMatch(/^\/lib\/material\/food\//);
    // The lights actually emit (authored flux + warmth), start unlit.
    for (const f of ["torch", "lantern"]) {
      const light = load(STORE_DIR, `goods/${f}.yaml`);
      expect(light.class).toBe("/lib/equipment/PortableLight");
      expect(Number(light.data?.emittedIntensity)).toBeGreaterThan(0);
      expect(light.data?.on).toBe(false);
    }
    // The waterskin is a real fluid holder (a capacity to fill).
    const skin = load(STORE_DIR, "goods/waterskin.yaml");
    expect(skin.class).toBe("/obj/Receptacle");
    expect(Number(skin.data?.interiorCapacity)).toBeGreaterThan(0);
    // The knife is a real bladed weapon (delivers an edge, wieldable).
    const knife = load(STORE_DIR, "goods/clasp-knife.yaml");
    expect(knife.class).toBe("/lib/equipment/Weapon");
    expect(knife.data?.constructionForm).toBe("bladed");
  });

  it("the Business operates the counter and rosters the clerk", () => {
    const biz = load(STORE_DIR, "business.yaml");
    expect(biz.data?.operatingLocations).toEqual([
      "/domain/terminus/general-store/counter",
    ]);
    expect(biz.data?.proprietorPath).toBe(
      "/domain/terminus/general-store/npc/keeper",
    );
    const roster = biz.data?.rosterSlots as { positionKey: string; assignee: string }[];
    expect(roster[0]?.assignee).toBe("/domain/terminus/general-store/npc/clerk");
    // The counter's businessPath points back at the Business.
    expect(load(STORE_DIR, "counter.yaml").data?.businessPath).toBe(
      "/domain/terminus/general-store/business",
    );
  });

  it("the store is reciprocally exit-wired to the avenue block", () => {
    const room = load(STORE_DIR, "shop-floor.yaml");
    const exits = room.data?.exits as Record<string, { destination: string }>;
    expect(exits.south?.destination).toBe(
      "/domain/terminus/counting-houses/avenue-block",
    );
    const avenue = load(CH_DIR, "avenue-block.yaml");
    const aExits = avenue.data?.exits as Record<string, { destination: string }>;
    expect(aExits.north?.destination).toBe(
      "/domain/terminus/general-store/shop-floor",
    );
  });

  it("the store parcel is titled to the terminus municipality", () => {
    const parcels = YAML.parse(readFileSync(PARCELS, "utf8")) as {
      parcels: { extent: string; owner: { kind: string; name?: string } }[];
    };
    const row = parcels.parcels.find(
      (p) => p.extent === "/domain/terminus/general-store",
    );
    expect(row?.owner).toEqual({ kind: "group", name: "terminus" });
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
