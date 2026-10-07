/**
 * General-store standup — an integration test over the REAL counter seed +
 * good templates (loaded from disk, through the actual clone pipeline). Proves
 * the boot-stock path: materializing the Stock counter fires
 * `onCreate → reset`, which clones each authored line to its par off the
 * real good templates. The arrival-walk-in-miniature: a fresh clone of the
 * store counter is stocked and priced, ready to `buy`.
 *
 * Scoped to the counter + goods (the NPC cast needs the species tree — the
 * terminus-standup test stubs it — so it isn't materialized here).
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ModuleApi } from "@saxonberg/server/mud/api/module";
import { Construction } from "@saxonberg/server/mud/lib/material/Construction";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { AppSettings } from "@saxonberg/server/mud/lib/config/AppSettings";
import TemplateApplier from "@saxonberg/server/mud/platform/idea/TemplateApplier";
import Stock from "@saxonberg/content-trade-shopkeeping/src/thing/Stock";
import PlantPot from "@saxonberg/server/mud/platform/thing/PlantPot";
import Seed from "@saxonberg/server/mud/platform/thing/Seed";
import type { Bulkable } from "@saxonberg/server/mud/lib/bulk/Bulkable";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Switchable } from "@saxonberg/server/mud/lib/boundary/Switchable";
import type { Burner } from "@saxonberg/server/mud/lib/fire/Burner";
import type { LightSource } from "@saxonberg/server/mud/lib/perception/LightSource";
import { installStore, type Doc } from "@saxonberg/server/mud/lib/persistence/__tests__/backend-store";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";

const PH = TemplateApplier.templatePath;
const STORE_DIR = fileURLToPath(
  new URL("../../../terminus/content/world/terminus/general-store/", import.meta.url),
);
const OBJ_DIR = fileURLToPath(new URL("../../../generic-objects/content/stuff/", import.meta.url));
// The growing cluster (pots, seeds, plants) is the produce trade's (libations drain).
const PRODUCE_DIR = fileURLToPath(new URL("../../../trade-farming/content/trade/farming/", import.meta.url));
// The upkeep kit — the residence pack's, stocked cross-pack.
const RESIDENCE_DIR = fileURLToPath(new URL("../../../residence/content/system/residence/", import.meta.url));
const ARCANA_DIR = fileURLToPath(new URL("../../../arcana/content/system/arcana/", import.meta.url));
const ARCANA_SRC = fileURLToPath(new URL("../../../arcana/src", import.meta.url));
// The haulage line (logistics W5/W6): the rigs are the transport
// system's rows and its `HaulageRig` class, stocked cross-pack.
const TRANSPORT_DIR = fileURLToPath(new URL("../../../transport/content/system/transport/", import.meta.url));
const TRANSPORT_SRC = fileURLToPath(new URL("../../../transport/src", import.meta.url));
// The homebrew kit's trade rows (fermentation D15).
const WINE_DIR = fileURLToPath(new URL("../../../trade-winemaking/content/trade/winemaking/", import.meta.url));
const BREW_DIR = fileURLToPath(new URL("../../../trade-brewing/content/trade/brewing/", import.meta.url));
const DIST_DIR = fileURLToPath(new URL("../../../trade-distilling/content/trade/distilling/", import.meta.url));
// The small still's CLASS ships in the distilling pack's src/ — the
// menu.test precedent: register the pack source so the clone resolves.
const DIST_SRC = fileURLToPath(new URL("../../../trade-distilling/src", import.meta.url));
// The tackle line (fishing B6): the fishing pack's rows and its Rod /
// Trap / Bait classes, stocked cross-pack.
const FISHING_DIR = fileURLToPath(new URL("../../../trade-fishing/content/trade/fishing/", import.meta.url));
const FISHING_SRC = fileURLToPath(new URL("../../../trade-fishing/src", import.meta.url));
const APICULTURE_DIR = fileURLToPath(new URL("../../../trade-apiculture/content/trade/apiculture/", import.meta.url));
const APICULTURE_SRC = fileURLToPath(new URL("../../../trade-apiculture/src", import.meta.url));
// ⭐ The four packs the reachability sweep's shelf lines reach into. Each
// was already a dependency; what was missing was a line on the counter.
const COOKING_SRC = fileURLToPath(new URL("../../../trade-cooking/src", import.meta.url));
const HAULAGE_SRC = fileURLToPath(new URL("../../../trade-haulage/src", import.meta.url));
const TEXTILES_SRC = fileURLToPath(new URL("../../../trade-textiles/src", import.meta.url));
const DYEING_SRC = fileURLToPath(new URL("../../../trade-dyeing/src", import.meta.url));
/** The commons' fabric-construction rows — `woven`, `knit`, `felted`. */
const FABRIC_DIR = fileURLToPath(
  new URL("../../../base-library/content/stuff/idea/fabric/", import.meta.url),
);
const COUNTER = "/world/terminus/general-store/counter";
const TORCH = "/world/terminus/general-store/thing/torch";

/**
 * The gardening line (husbandry phase 1) — stocked straight from ordinary
 * `/obj/` templates rather than store-local `thing/` copies, because
 * `itemTemplatePath` takes any path and duplicating them would mean two
 * pots (and two seeds growing the same plant) drifting apart.
 */
const GARDEN_LINES = [
  "/trade/farming/thing/pot/small",
  "/trade/farming/thing/pot/large",
  "/stuff/thing/vessel/soil-sack",
  "/trade/farming/thing/seed/snake-plant",
  // The produce packets (farming A5) — the ten grown families' seeds.
  "/trade/farming/thing/seed/lime",
  "/trade/farming/thing/seed/lemon",
  "/trade/farming/thing/seed/orange",
  "/trade/farming/thing/seed/grapefruit",
  "/trade/farming/thing/seed/cherry",
  "/trade/farming/thing/seed/olive",
  "/trade/farming/thing/seed/mint",
  "/trade/farming/thing/seed/cranberry",
  "/trade/farming/thing/seed/grape",
  "/trade/farming/thing/seed/juniper",
  // ⭐ An orange you can EAT (nutrition-and-fitness D25) — the years
  // clock needs something a person can buy that is not bread, and the
  // distributor gets the farm's citrus by consignment, not by par.
  "/trade/farming/thing/orange",
  // ⭐ The fibre and dye packets (textiles B1) — the chain's left edge
  // on the same counter as the pots and the soil, because the
  // suburban-garden path already starts here.
  "/trade/farming/thing/seed/flax",
  "/trade/farming/thing/seed/weld",
  "/trade/farming/thing/seed/woad",
  "/trade/farming/thing/seed/madder",
] as const;

/**
 * The furnishings line (residences D7/D11) — same rule as the gardening
 * line: the store stocks the GENERIC `/stuff/thing/fixture/` rows rather
 * than store-local copies, so there is one bed in the world and the shop
 * sells it.
 */
/**
 * ⭐⭐ The beekeeper's line (apiculture D18) — and it is HERE rather than
 * in the valley on purpose. A general store's job IS importing, which is
 * what a `Stock` counter is for; putting a par faucet on Quist's farm
 * would have made one NPC the farmer, the landowner, the pollination
 * beneficiary, the honey buyer AND the woodenware seller, in the build
 * whose thesis is that a beekeeper is a SECOND PARTY on land they do not
 * own.
 *
 * ⚠ The nucleus is the one line in the trade that MINTS LIFE, at par 1:
 * a new beekeeping district really does start by importing a colony, and
 * after the first one splits and swarms supply themselves.
 */
const APIARY_LINES = [
  "/trade/apiculture/thing/hive",
  "/trade/apiculture/thing/thick-hive",
  "/trade/apiculture/thing/super",
  "/trade/apiculture/thing/frame",
  "/trade/apiculture/thing/smoker",
  "/trade/apiculture/thing/extractor",
  "/trade/apiculture/thing/honey-jar",
  "/stuff/thing/clothes/bee-veil",
  "/stuff/thing/clothes/work-gloves",
  "/trade/apiculture/thing/nuc",
] as const;

const FURNISH_LINES = [
  "/system/residence/thing/householders-kit",
  "/stuff/thing/fixture/bed",
  "/stuff/thing/fixture/wardrobe",
  "/stuff/thing/fixture/table",
  "/stuff/thing/fixture/armchair",
  "/stuff/thing/fixture/sconce-lamp",
] as const;

/**
 * The homebrew line (fermentation D15/P13) — the kit rows live with the
 * trades they miniaturize; the carboy and culture jar in the commons.
 */
const HOMEBREW_LINES = [
  "/stuff/thing/vessel/carboy",
  "/stuff/thing/vessel/culture-jar",
  "/trade/winemaking/thing/small-press",
  "/trade/brewing/thing/small-mash-tun",
  "/trade/distilling/thing/small-still",
] as const;

/**
 * The mana line (TPA reform W5) — arcana's, stocked cross-pack exactly
 * as the pots and the upkeep kit are. A cell is what makes a
 * mana-powered device usable by somebody with no gift at all.
 */
const MANA_LINES = [
  "/system/arcana/thing/mana-cell",
  "/system/arcana/thing/mana-lamp",
] as const;

// ⭐⭐ The haulage line (logistics W5/W6). The handcart is the FIRST
// RUNG: the encumbrance build's shipped class, placed nowhere and sold
// nowhere until this build put it on a shelf inside a starting stipend.
const HAULAGE_LINES = [
  "/stuff/thing/gear/handcart",
  "/system/transport/thing/sledge",
  "/system/transport/thing/dray",
  "/system/transport/thing/wagon",
] as const;

// ⭐ The tackle line (fishing B6): inputs, which is what a general store
// sells — what comes out of the river is consigned at the market.
const TACKLE_LINES = [
  "/trade/fishing/thing/rod",
  "/trade/fishing/thing/worm",
  "/trade/fishing/thing/pot",
  "/trade/fishing/thing/net",
  "/trade/fishing/thing/fish-bowl",
  "/trade/fishing/thing/fish-food",
  "/trade/fishing/thing/float-rod",
  "/trade/fishing/thing/leger-rod",
  "/trade/fishing/thing/spoon",
  "/trade/fishing/thing/keepnet",
] as const;

// ⭐ The armour + arms line (injury build W-A5 / W-C1 / W-C2) and the
// corrosion flask (Stage D) — commons `/stuff/thing/` rows stocked
// cross-pack like the pots. The armour is a `Garment` ladder (padded →
// plate), the launchers a bow and a musket, and the ammunition
// (arrow, musket-ball) the one STACKABLE good the store sells — a
// quantity, not a chattel-stamped instance.
const ARMS_LINES = [
  "/stuff/thing/armor/padded-gambeson",
  "/stuff/thing/armor/hide-jerkin",
  "/stuff/thing/armor/mail-hauberk",
  "/stuff/thing/armor/breastplate",
  "/stuff/thing/armor/leather-boots",
  "/stuff/thing/arms/hunting-bow",
  "/stuff/thing/arms/arrow",
  "/stuff/thing/arms/flintlock-musket",
  "/stuff/thing/arms/musket-ball",
  "/stuff/thing/items/flask-of-vitriol",
] as const;

/**
 * ⭐ Where a shipped row lives, by the prefix of its template path —
 * longest prefix wins, the commons is the fallback. A table rather than
 * the seven-deep nested ternary it replaced: the haulage line would have
 * made it eight, and adding a stock line should be adding a row.
 */
// ⭐⭐ The four packs the REACHABILITY SWEEP's lines reach into. Each was
// already a dependency of this pack; what was missing was a shelf line,
// so these roots had never needed naming here.
const COOKING_TOOLS_DIR = fileURLToPath(
  new URL("../../../trade-cooking/content/trade/cooking/", import.meta.url),
);
const HAULAGE_DIR = fileURLToPath(
  new URL("../../../trade-haulage/content/trade/haulage/", import.meta.url),
);
const TEXTILES_DIR = fileURLToPath(
  new URL("../../../trade-textiles/content/trade/textiles/", import.meta.url),
);
const DYEING_DIR = fileURLToPath(
  new URL("../../../trade-dyeing/content/trade/dyeing/", import.meta.url),
);

const ROW_HOMES: { prefix: string; dir: () => string }[] = [
  { prefix: "/trade/cooking/", dir: () => COOKING_TOOLS_DIR },
  { prefix: "/trade/haulage/", dir: () => HAULAGE_DIR },
  { prefix: "/trade/textiles/", dir: () => TEXTILES_DIR },
  { prefix: "/trade/dyeing/", dir: () => DYEING_DIR },
  { prefix: "/trade/farming/", dir: () => PRODUCE_DIR },
  { prefix: "/system/arcana/", dir: () => ARCANA_DIR },
  { prefix: "/system/residence/", dir: () => RESIDENCE_DIR },
  { prefix: "/system/transport/", dir: () => TRANSPORT_DIR },
  { prefix: "/trade/winemaking/", dir: () => WINE_DIR },
  { prefix: "/trade/brewing/", dir: () => BREW_DIR },
  { prefix: "/trade/distilling/", dir: () => DIST_DIR },
  { prefix: "/trade/fishing/", dir: () => FISHING_DIR },
  { prefix: "/trade/apiculture/", dir: () => APICULTURE_DIR },
  { prefix: "/stuff/", dir: () => OBJ_DIR },
];

/**
 * ⚠⚠ A row may state `extends:` and NO `class:` — the reachability
 * sweep's tin saucer does, because the commons' saucer was the documented
 * exemplar and this shop's was a near-duplicate of it. Reading
 * `parsed.class` alone on such a row yields `undefined` and the clone
 * fails with *"Template not found"*, which is the loud version of the
 * failure `pack-roots.effectiveDoc` exists for: a reader that selects on
 * `raw.class` goes BLIND on a class-less child, and fifteen lint gates
 * had to be fixed the same way. Fold the parent in.
 */
function foldParent(
  parsed: Record<string, unknown>,
  resolve: (path: string) => Record<string, unknown>,
): { class: string; data: Record<string, unknown> } {
  const data = (parsed.data as Record<string, unknown>) ?? {};
  const parent = parsed.extends as string | undefined;
  if (typeof parsed.class === "string") {
    return { class: parsed.class, data };
  }
  if (!parent) throw new Error("row states neither class: nor extends:");
  const up = foldParent(resolve(parent), resolve);
  return { class: up.class, data: { ...up.data, ...data } };
}

function seedDoc(rel: string): Doc {
  const parsed = YAML.parse(
    readFileSync(`${STORE_DIR}${rel}.yaml`, "utf-8"),
  ) as Record<string, unknown>;
  const folded = foldParent(parsed, rowFile);
  return {
    path: `/world/terminus/general-store/${rel}`,
    class: folded.class,
    data: folded.data,
  };
}

/** The raw YAML of a shipped row, by template path. */
function rowFile(path: string): Record<string, unknown> {
  if (path.startsWith("/world/terminus/general-store/")) {
    const rel = path.slice("/world/terminus/general-store/".length);
    return YAML.parse(readFileSync(`${STORE_DIR}${rel}.yaml`, "utf-8")) as Record<
      string,
      unknown
    >;
  }
  const home = ROW_HOMES.find((h) => path.startsWith(h.prefix));
  if (!home) throw new Error(`rowFile: no pack owns '${path}'`);
  return YAML.parse(
    readFileSync(`${home.dir()}${path.slice(home.prefix.length)}.yaml`, "utf-8"),
  ) as Record<string, unknown>;
}

/** Load a shipped row by template path, from whichever pack owns it. */
function objDoc(path: string): Doc {
  const folded = foldParent(rowFile(path), rowFile);
  return { path, class: folded.class, data: folded.data };
}

// The counter stocks every line to par on standup, each a real clone
// through the actual pipeline — the gardening, furnishings, produce-seed
// and haulage lines pushed that well past the default 5s budget.
vi.setConfig({ testTimeout: 30_000 });

describe("general-store standup (real seeds)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    const goods = readdirSync(`${STORE_DIR}thing/`)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => seedDoc(`thing/${f.replace(/\.yaml$/, "")}`));
    /**
     * ⭐⭐ **DERIVED from the counter, not enumerated beside it.**
     *
     * This list used to be eight hand-written groups (`GARDEN_LINES`,
     * `HAULAGE_LINES`, `APIARY_LINES`…), and the reachability sweep added
     * nineteen lines to the counter that belonged to none of them — so
     * the standup went red with *"Template not found"* on a row the
     * counter plainly names. ⚠ That is the enumeration-rots shape the
     * lint family removed enumeration for: the counter already states its
     * roster, and a second copy of it beside the test can only drift. The
     * groups stay (they also carry rows this test reads directly), and
     * anything the counter stocks is added whether a group knew about it
     * or not.
     */
    const counterRow = YAML.parse(
      readFileSync(`${STORE_DIR}counter.yaml`, "utf-8"),
    ) as { data?: { stockLines?: { itemTemplatePath: string }[] } };
    const stocked = (counterRow.data?.stockLines ?? [])
      .map((l) => l.itemTemplatePath)
      .filter((path) => !path.startsWith("/world/terminus/general-store/"));
    const enumerated = [
      ...GARDEN_LINES,
      ...FURNISH_LINES,
      ...HOMEBREW_LINES,
      ...MANA_LINES,
      ...HAULAGE_LINES,
      ...TACKLE_LINES,
      ...ARMS_LINES,
      ...APIARY_LINES,
    ];
    const shelfPaths = [...new Set([...enumerated, ...stocked])];
    installStore([
      { path: PH, class: PH, data: {} },
      seedDoc("counter"),
      ...goods,
      ...shelfPaths.map(objDoc),
    ]);
    ModuleApi.registerPackSource(DIST_SRC, "/trade/distilling");
    ModuleApi.registerPackSource(FISHING_SRC, "/trade/fishing");
    ModuleApi.registerPackSource(APICULTURE_SRC, "/trade/apiculture");
    ModuleApi.registerPackSource(ARCANA_SRC, "/system/arcana");
    ModuleApi.registerPackSource(TRANSPORT_SRC, "/system/transport");
    ModuleApi.registerPackSource(COOKING_SRC, "/trade/cooking");
    ModuleApi.registerPackSource(HAULAGE_SRC, "/trade/haulage");
    ModuleApi.registerPackSource(TEXTILES_SRC, "/trade/textiles");
    ModuleApi.registerPackSource(DYEING_SRC, "/trade/dyeing");
    // ⚠⚠ The FABRIC forms — ⭐ **read from the ROWS now, not written out
    // here.** `woven` / `knit` / `felted` are registered at boot by
    // `FabricCatalogue` from `base-library`'s rows, and this harness
    // stands rows up without it, so the moment the shelf started stocking
    // CLOTH (apiculture's veil and gloves, which are ordinary clothing by
    // design) every standup assertion died on `unknown form 'woven'`.
    // The armour line never caught it because `plate` and `padded` are
    // kernel forms.
    //
    // ⚠ The first fix registered `woven` ALONE, with a comment naming all
    // three — and the reachability sweep's shelf lines added a knit
    // hoodie, so the standup died again on `unknown form 'knit'`. One
    // hand-written form out of three, beside a comment that knew there
    // were three. Reading the rows is what makes that unrepeatable: a
    // fourth form is a row and this harness picks it up.
    for (const f of readdirSync(FABRIC_DIR).filter((n) => n.endsWith('.yaml'))) {
      const row = YAML.parse(readFileSync(`${FABRIC_DIR}${f}`, 'utf-8')) as {
        data?: Record<string, number | string>;
      };
      const d = row.data ?? {};
      Construction.registerFabric({
        key: String(d.key),
        layerBand: Number(d.layerBand ?? 0),
        loft: Number(d.loft ?? 0),
        weaveDensity: Number(d.weaveDensity ?? 0),
        drape: Number(d.drape ?? 0),
      });
    }
    installV1QuantityMarshallers();
    await AppSettings.warm();
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("the counter self-stocks each line to par on standup, priced", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);
    expect(counter).toBeInstanceOf(Stock);

    // onCreate → reset cloned each line to par off the real templates.
    expect(counter.onHand(TORCH)).toBe(4); // authored par
    expect(counter.priceFor(TORCH)).toBe(2); // authored price
    // A torch is on the shelf and resolvable by keyword (ready to buy).
    const torch = counter.resolveBuy("torch");
    expect(torch).not.toBeNull();
    expect(torch!.getTemplatePath()).toBe(TORCH);
  });

  it("every stocked good is discrete + chattel-stampable (ammunition excepted)", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);
    const shelf = counter.offeredItems();
    expect(shelf.length).toBeGreaterThan(0);
    for (const good of shelf) {
      // ⭐ Ammunition is the one stackable good — a quantity you buy by the
      // sheaf, not a chattel-stamped instance (see general-store-content
      // .test.ts). Everything else stays discrete + stampable.
      if (MixinApi.isStackable(good)) continue;
      expect(
        MixinApi.isChattel(good),
        `${good.getTemplatePath()} (${good.constructor.name}) is not chattel`,
      ).toBe(true); // stampable
    }
  });

  it("the goods are real — the torch lights, the skin holds fluid, the knife is a weapon", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);

    // ⭐ The torch is a real FUELLED light: dark off the shelf, lights
    // when you light it, dark again when doused (VisionModality reads
    // this flux live). Since the envelope build it is a `Lamp` — a
    // small furnace with a light on it — rather than a `Switchable`,
    // so it also carries fuel and eventually runs out. The burning-down
    // half needs a clock and lives in `Lamp.test.ts`; what matters here
    // is that the thing on the shelf is the thing the player buys.
    const torch = counter.resolveBuy("torch") as unknown as Stuff &
      Burner &
      LightSource;
    expect(torch.isLit()).toBe(false); // out on the shelf
    expect(torch.getEmittedFlux().rawValue()).toBe(0);
    expect(torch.fuelRemaining()).toBeGreaterThan(0); // and full
    torch.ignite();
    expect(torch.isLit()).toBe(true);
    expect(torch.getEmittedFlux().rawValue()).toBeGreaterThan(0); // it lights
    torch.douse();
    expect(torch.getEmittedFlux().rawValue()).toBe(0); // and goes dark

    // The waterskin is a real fluid container; the knife a real wielded weapon.
    expect(MixinApi.isBulkable(counter.resolveBuy("waterskin")!)).toBe(true);
    expect(MixinApi.isWieldable(counter.resolveBuy("knife")!)).toBe(true);
  });

  it("the gardening line stocks to par and is priced against the ladder", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);
    for (const rel of GARDEN_LINES) {
      const path = rel;
      expect(counter.onHand(path), `${path} on hand`).toBeGreaterThan(0);
      expect(counter.priceFor(path), `${path} priced`).toBeGreaterThan(0);
    }
    // The large pot is the first purchase a player has a REASON to make, so
    // it must stay affordable against the 20-credit arrival stipend while
    // costing more than the small pot it replaces.
    const small = counter.priceFor("/trade/farming/thing/pot/small")!;
    const large = counter.priceFor("/trade/farming/thing/pot/large")!;
    expect(large).toBeGreaterThan(small);
    expect(large).toBeLessThan(20);
  });

  it("the furnishings line stocks to par, priced at the TOP of the ladder", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);
    for (const path of FURNISH_LINES) {
      expect(counter.onHand(path), `${path} on hand`).toBeGreaterThan(0);
      expect(counter.priceFor(path), `${path} priced`).toBeGreaterThan(0);
    }
    // A home is the first thing worth saving for: the bed is the dearest
    // thing in the shop, and dearer than the sewing machine that used to be.
    const bed = counter.priceFor("/stuff/thing/fixture/bed")!;
    const machine = counter.priceFor(
      "/world/terminus/general-store/thing/sewing-machine",
    )!;
    expect(bed).toBeGreaterThan(machine);
    for (const path of FURNISH_LINES) {
      if (path === "/stuff/thing/fixture/bed") continue;
      expect(counter.priceFor(path)!, `${path} under the bed`).toBeLessThan(bed);
    }
  });

  it("the sconce is a real light you can hang — Adornment ⊕ switchable flux", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);
    const sconce = counter.resolveBuy("sconce") as unknown as Stuff &
      Switchable &
      LightSource;
    expect(sconce).not.toBeNull();
    // The whole point: it goes on a WALL (fixtures), not on the floor.
    expect(MixinApi.isAdornment(sconce)).toBe(true);
    expect(sconce.getEmittedFlux().rawValue()).toBe(0); // unlit off the shelf
    sconce.switchOn();
    expect(sconce.getEmittedFlux().rawValue()).toBeGreaterThan(0);
  });

  it("the bed is the rest surface the bedroom archetype wants", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);
    const bed = counter.resolveBuy("bed")! as unknown as Stuff;
    expect(MixinApi.isSlotted(bed)).toBe(true);
    if (!MixinApi.isSlotted(bed)) return;
    expect(bed.getSlotNames()).toContain("lie:1");
  });

  it("the gardening goods are real — pots hold soil, the sack pours, the seed names a plant", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);

    // A pot is a Slotted host with a plant slot AND a bulk interior for
    // soil — a garden bed at N = 1.
    const pot = counter.resolveBuy("large pot") as unknown as PlantPot;
    expect(MixinApi.isSlotted(pot)).toBe(true);
    expect(MixinApi.isBulkable(pot)).toBe(true);
    expect(pot.getSlotNames()).toContain("plant");
    expect(pot.getSoilVolume()).toBe(0); // ships empty; you pour soil in
    expect(pot.hasSoil()).toBe(false);

    // The sack ships FULL of potting soil, so `pour` needs no new verb.
    const sack = counter.resolveBuy("sack") as unknown as Stuff & Bulkable;
    expect(MixinApi.isBulkable(sack)).toBe(true);
    expect(sack.getBulkAmount("interior").rawValue()).toBeGreaterThan(0);
    expect(sack.getBulkMaterialPath("interior")).toBe(
      "/stuff/idea/material/bulk/potting-soil",
    );

    // The seed names the plant it grows into (and is discrete, per above).
    const seed = counter.resolveBuy("snake plant seed") as unknown as Seed;
    expect(seed.getGrowsIntoPath()).toBe("/trade/farming/thing/plant/snake-plant");
  });
});
