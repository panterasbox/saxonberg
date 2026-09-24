/**
 * Content-integrity tests for the general-store seeds (pure YAML reads, the
 * bar-content / cast-content discipline — no clone pipeline). Catches a
 * typo'd stock path, a mispriced or fungible staple, a dangling exit, or a
 * broken Business wiring here, not silently at buy/traverse time.
 *
 * The load-bearing invariant: every ownable staple is a discrete
 * `/lib/stuff/Thing` (never Stackable) — chattel is stamped per-instance, so
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
// The supplied lines (economic bootstrap D14): the coffee sack is the
// cooking trade's row, bought at the cash-and-carry on terms and shelved
// by the keeper — stocked cross-pack like everything else that is not the
// store's own.
const COOKING_DIR = fileURLToPath(
  new URL("../../../trade-cooking/content/trade/cooking/", import.meta.url),
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
// The haulage line (logistics W5/W6): the rigs are the transport
// system's rows, stocked cross-pack like the farming pots.
const TRANSPORT_DIR = fileURLToPath(
  new URL("../../../transport/content/system/transport/", import.meta.url),
);
const FISHING_DIR = fileURLToPath(
  new URL("../../../trade-fishing/content/trade/fishing/", import.meta.url),
);

/**
 * ⭐ Where a stocked good's row lives, by the prefix of its template
 * path — longest prefix wins, and the commons is the fallback.
 *
 * This was an eight-deep nested ternary, doubled (one chain to pick the
 * directory, a second identical one to strip the prefix). The haulage
 * line would have made it nine, so it is a table: one row per pack, the
 * prefix written once, and adding a line to the counter is adding a row
 * here rather than threading two more branches through both chains.
 */
const GOOD_HOMES: { prefix: string; dir: () => string }[] = [
  { prefix: "/world/terminus/general-store/", dir: () => STORE_DIR },
  { prefix: "/trade/farming/", dir: () => PRODUCE_DIR },
  { prefix: "/trade/cooking/", dir: () => COOKING_DIR },
  { prefix: "/system/residence/", dir: () => RESIDENCE_DIR },
  { prefix: "/trade/winemaking/", dir: () => WINE_DIR },
  { prefix: "/trade/brewing/", dir: () => BREW_DIR },
  { prefix: "/trade/distilling/", dir: () => DIST_DIR },
  { prefix: "/system/arcana/", dir: () => ARCANA_DIR },
  { prefix: "/system/transport/", dir: () => TRANSPORT_DIR },
  { prefix: "/trade/fishing/", dir: () => FISHING_DIR },
  // The commons — the generic-objects pack, and the fallback.
  { prefix: "/stuff/", dir: () => OBJ_DIR },
];

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

    expect(load(STORE_DIR, "counter.yaml").class).toBe("/trade/shopkeeping/thing/Stock");
    expect(load(STORE_DIR, "consignment-shelf.yaml").class).toBe(
      "/trade/shopkeeping/thing/ConsignmentShelf",
    );
    expect(load(STORE_DIR, "business.yaml").class).toBe(
      "/platform/idea/Business",
    );
    // Both are named people (Pemby, Odell Marrow), so both sit on the
    // Cast rung — one live instance per row, enforced by the throw at the
    // second clone rather than by the 39-row accident that used to hold.
    expect(load(STORE_DIR, "agent/clerk.yaml").class).toBe(
      "/platform/agent/Cast",
    );
    expect(load(STORE_DIR, "agent/keeper.yaml").class).toBe(
      "/platform/agent/Cast",
    );
  });

  // The real, discrete item classes the store sells — each extends `Thing`
  // (chattel-stampable) and none composes StackableMixin. A stray Stackable
  // class would fail the allowlist; the runtime `!isStackable` proof lives in
  // the standup integration test (which clones the goods for real).
  const DISCRETE_ITEM_CLASSES = new Set([
    "/platform/thing/Thing",
    // A `Provision` is the food class — discrete, `Crafted` (so it carries a
    // maker's mark and a grade), and no more Stackable than a bare `Thing`. The
    // ration pack is one: perishable matter belongs on the class that says
    // so, not on the generic `Thing` that happened to be carrying the gauge.
    "/platform/thing/Provision",
    // ⭐ Still shipped, and now narrowed to what it is FOR: a light that
    // burns nothing (the glowcap jar and its fixture, which are a
    // fungus). The lantern and the torch moved to `Lamp`.
    "/platform/thing/equipment/PortableLight",
    // ⭐ A light that burns fuel — `FurnaceMixin` over a `LightSource`,
    // so it has a reserve, a burn rate and a burnout edge for free.
    "/platform/thing/Lamp",
    "/platform/thing/equipment/Weapon",
    // ⭐ The injury build's armour + arms line (W-A5 / W-C1). A `Garment`
    // is the covering class (padded gambeson → steel breastplate, one
    // class differing by row data and material); a `Launcher` is the bow
    // and the musket (a `Weapon` that fires a projectile). Both discrete,
    // neither Stackable — you own a breastplate, you do not carry it as a
    // quantity. The AMMUNITION they fire is the one exception, below.
    "/platform/thing/equipment/Garment",
    "/platform/thing/equipment/Launcher",
    "/platform/thing/Receptacle",
    // A `Feeder` is a `Receptacle` that an animal eats from — the same
    // Bulkable/Container/Thing stack with one marker mixin on top, and no
    // more Stackable than the waterskin beside it on the shelf. The store
    // sells a tin saucer so somebody can put water down for the cat.
    "/platform/thing/Feeder",
    // The crafting goods: the sewing kit and the sewing MACHINE are both
    // `MendingTool` — one class, because they afford identically and
    // differ only in `rate`/`control`, which is row data. The whetstone
    // carries the Audible rasp AND its own carried-only `sharpen`, and
    // lives in the smithing pack so the kernel never names a trade's
    // view. The ingot a Meltable Thing — all discrete, none Stackable.
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
    // discrete, neither Stackable.
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
    // ⭐⭐ The haulage line (logistics W5/W6). A `Handcart` is the
    // encumbrance build's shipped class — placed nowhere and sold
    // nowhere until this build put it on a shelf, which is what makes
    // the labor market's first rung reachable on a stipend. The other
    // three are one `HaulageRig` class differing only in row data
    // (capacity, tare, what pulls it), the way the furnishings line is
    // one `Chair`. All discrete, none Stackable — a cart is a thing you
    // own, not a quantity you carry.
    "/platform/thing/equipment/Handcart",
    "/system/transport/thing/HaulageRig",
    "/platform/thing/Chair",
    "/platform/thing/Surface",
    "/platform/thing/Chest",
    "/generic-objects/thing/SconceLamp",
    // The householder's kit — a `ToolItem` subclass in the residence
    // pack, because the verb it confers is a static on a class and a
    // row cannot carry one.
    "/system/residence/thing/HouseholdersKit",
    // ⭐ The SUPPLIED lines (economic bootstrap D14) — the first goods on
    // this counter that come from somewhere: a crate of the farm's limes
    // and a sack of the pantry's coffee, bought at the cash-and-carry on
    // terms by the keeper's `stocks` beat, never cloned by the reset
    // sweep. A `Crate` is a discrete container of produce; the coffee
    // sack is a `Bottle` (a bulk vessel — the cooking trade's sack shape).
    "/platform/thing/Crate",
    "/platform/thing/Bottle",
    // The tackle line (fishing B6): a rod and a pot/net are
    // `ToolItem` subclasses in the fishing pack (the instrument affords
    // the verb), a worm a bare Detailed Thing, the bowl a `Feeder` and
    // the fish food a `Provision` — all discrete, none Stackable.
    "/trade/fishing/thing/Rod",
    "/trade/fishing/thing/Trap",
    "/trade/fishing/thing/Bait",
  ]);

  // ⭐ Ammunition is the ONE stackable good the store sells, and rightly:
  // a Projectile is `StackableMixin(Thing)` (the Coin shape — one row, one
  // quantity), because you buy arrows and musket-balls by the sheaf, not
  // one chattel-stamped stick at a time. The injury build (W-C2) put them
  // on the shelf. Every OTHER good stays discrete; this is the exception,
  // named so a second stackable staple can't sneak in unnoticed.
  const AMMUNITION_CLASSES = new Set(["/platform/thing/equipment/Projectile"]);

  /**
   * ⭐ The supplied lines (economic bootstrap D11/D14): each names the
   * distributor's business as its supplier, is priced `stocking` off an
   * authored base, and the keeper who buys them holds the `purchases`
   * seat with the `stocks` beat over this counter. The cash-and-carry it
   * buys at takes goods on terms. Five links, one test — a line with no
   * supplier is cloned from nothing, a keeper with no seat has no card,
   * a counter that says consignment owes nobody.
   */
  it("the supplied lines are bought on terms by a seated keeper, never cloned", () => {
    const counter = load(STORE_DIR, "counter.yaml");
    const lines = counter.data?.stockLines as { itemTemplatePath: string; par: number; supplier?: string; pricing?: string }[];
    const prices = counter.data?.prices as Record<string, number>;
    const supplied = lines.filter((l) => l.supplier);
    expect(supplied.length).toBeGreaterThanOrEqual(2);
    const DISTRIBUTOR = "/world/terminus/counting-houses/distributor/idea/business";
    for (const line of supplied) {
      expect(line.supplier).toBe(DISTRIBUTOR);
      expect(line.pricing).toBe("stocking");
      expect(prices[line.itemTemplatePath], `${line.itemTemplatePath} has no base`).toBeGreaterThan(0);
    }
    // The supplier's counter takes goods on terms (rung 0).
    const cashAndCarry = load(
      fileURLToPath(new URL("../../content/world/terminus/counting-houses/distributor/thing/", import.meta.url)),
      "counter.yaml",
    );
    expect(cashAndCarry.data?.purchasing).toBe("terms");
    // The keeper: a `purchases` seat on the roster, and the beat over THIS counter.
    const business = load(STORE_DIR, "business.yaml");
    const positions = business.data?.positions as { key: string; purchases?: boolean }[];
    expect(positions.find((p) => p.key === "keeper")?.purchases).toBe(true);
    const slots = business.data?.rosterSlots as { positionKey: string; assignee: string }[];
    expect(slots.find((r) => r.positionKey === "keeper")?.assignee).toBe(
      "/world/terminus/general-store/agent/keeper",
    );
    const keeper = load(STORE_DIR, "agent/keeper.yaml");
    const beat = (keeper.data?.behaviors as { brain: string; config?: { counter?: string } }[]).find(
      (b) => b.brain === "/trade/shopkeeping/behavior/stocks",
    );
    expect(beat?.config?.counter).toBe("/world/terminus/general-store/counter");
  });

  it("every priced/stocked good is a real item — discrete, or stackable ammo", () => {
    const counter = load(STORE_DIR, "counter.yaml");
    const lines = counter.data?.stockLines as { itemTemplatePath: string; par: number }[];
    const prices = counter.data?.prices as Record<string, number>;
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      // A stock line's `itemTemplatePath` takes ANY path: the store-local
      // staples live under `thing/` because they are store-specific, while
      // the gardening line points straight at the commons' templates
      // (duplicating those would mean two pots, and two seeds growing the
      // same plant, drifting apart). Resolve whichever home owns it.
      const home = GOOD_HOMES.find((h) =>
        line.itemTemplatePath.startsWith(h.prefix),
      );
      expect(home, `${line.itemTemplatePath}: no pack owns this prefix`).toBeDefined();
      const dir = home!.dir();
      const rel = line.itemTemplatePath.slice(home!.prefix.length);
      expect(existsSync(`${dir}${rel}.yaml`), line.itemTemplatePath).toBe(true);
      const good = load(dir, `${rel}.yaml`);
      // A real item class (backed by a shipped system, not a prop):
      // discrete chattel, or the one stackable exception, ammunition.
      const cls = good.class ?? "";
      expect(
        DISCRETE_ITEM_CLASSES.has(cls) || AMMUNITION_CLASSES.has(cls),
        `${line.itemTemplatePath} class ${cls}`,
      ).toBe(true);
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
    expect(rations.class).toBe("/platform/thing/Provision");
    expect(String(rations.data?._materialPath)).toMatch(/^\/stuff\/idea\/material\/food\//);
    // ⭐ The lights actually emit, start unlit, and BURN FUEL. Since the
    // envelope build they are `Lamp` — a small furnace with a light on
    // it — rather than `PortableLight`, which is a switch and burned
    // forever. A light with no fuel reserve here is a light that never
    // goes out, which is the defect the class change exists to fix.
    for (const f of ["torch", "lantern"]) {
      const light = load(STORE_DIR, `thing/${f}.yaml`);
      expect(light.class).toBe("/platform/thing/Lamp");
      expect(Number(light.data?.emittedIntensity)).toBeGreaterThan(0);
      // ⚠ `FurnaceMixin.lit` defaults TRUE — a row that forgets this
      // ships alight on a shop shelf with its fuel draining.
      expect(light.data?.lit).toBe(false);
      const fuel = (light.data?.reserves as Record<string, { currentValue?: number }> | undefined)?.fuel;
      expect(Number(fuel?.currentValue)).toBeGreaterThan(0);
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

  it("the Business operates the counter AND its room, and rosters the clerk", () => {
    const biz = load(STORE_DIR, "business.yaml");
    // ⚠⚠ BOTH, and the ROOM is the load-bearing half: a supplier is
    // found by the ROOM its counter stands in (`restocks` →
    // `counterRoomOf`), so a house listing only the fixture is
    // unfindable as a supplier and every par line naming it is skipped
    // silently. The tailor's cloth order was lost exactly that way.
    expect(biz.data?.operatingLocations).toEqual([
      "/world/terminus/general-store/counter",
      "/world/terminus/general-store/shop-floor",
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

  it("no shelf good uses an off-allowlist (Stackable-risking) class", () => {
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
