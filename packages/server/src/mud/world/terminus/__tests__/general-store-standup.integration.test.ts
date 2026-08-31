/**
 * General-store standup — an integration test over the REAL counter seed +
 * good templates (loaded from disk, through the actual clone pipeline). Proves
 * the boot-stock path: materializing the Stock counter fires
 * `postRegister → reset`, which clones each authored line to its par off the
 * real good templates. The arrival-walk-in-miniature: a fresh clone of the
 * store counter is stocked and priced, ready to `buy`.
 *
 * Scoped to the counter + goods (the NPC cast needs the species tree — the
 * terminus-standup test stubs it — so it isn't materialized here).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { AppSettings } from "../../../lib/config/AppSettings";
import PersistentHydrator from "../../../platform/idea/persistence/PersistentHydrator";
import Stock from "../../../platform/thing/Stock";
import PlantPot from "../../../platform/thing/PlantPot";
import Seed from "../../../platform/thing/Seed";
import type { Bulkable } from "../../../lib/bulk/Bulkable";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Switchable } from "../../../lib/boundary/Switchable";
import type { LightSource } from "../../../lib/perception/LightSource";
import { installStore, type Doc } from "../../lounge/__tests__/lounge-fixtures";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const PH = PersistentHydrator.templatePath;
const STORE_DIR = fileURLToPath(
  new URL("../../../../../../content/world-seed/content/world/terminus/general-store/", import.meta.url),
);
const OBJ_DIR = fileURLToPath(new URL("../../../../../../content/generic-objects/content/stuff/", import.meta.url));
// The growing cluster (pots, seeds, plants) is the produce trade's (libations drain).
const PRODUCE_DIR = fileURLToPath(new URL("../../../../../../content/trade-farming/content/trade/farming/", import.meta.url));
const COUNTER = "/world/terminus/general-store/counter";
const TORCH = "/world/terminus/general-store/goods/torch";

/**
 * The gardening line (husbandry phase 1) — stocked straight from ordinary
 * `/obj/` templates rather than store-local `goods/` copies, because
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
] as const;

function seedDoc(rel: string): Doc {
  const parsed = YAML.parse(
    readFileSync(`${STORE_DIR}${rel}.yaml`, "utf-8"),
  ) as Record<string, unknown>;
  return {
    path: `/world/terminus/general-store/${rel}`,
    class: parsed.class as string,
    hydratorClass: (parsed.hydratorClass as string) ?? PH,
    data: (parsed.data as Record<string, unknown>) ?? {},
  };
}

/** Load a shipped row by template path — generic-objects' `/stuff/…` or the produce trade's `/trade/farming/…`. */
function objDoc(path: string): Doc {
  const file = path.startsWith("/trade/farming/")
    ? `${PRODUCE_DIR}${path.replace("/trade/farming/", "")}.yaml`
    : `${OBJ_DIR}${path.replace("/stuff/", "")}.yaml`;
  const parsed = YAML.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
  return {
    path,
    class: parsed.class as string,
    hydratorClass: (parsed.hydratorClass as string) ?? PH,
    data: (parsed.data as Record<string, unknown>) ?? {},
  };
}

// The counter stocks twenty-four lines to par on standup, each a real
// clone through the actual pipeline — the gardening + produce-seed lines
// pushed that past the default 5s budget.
vi.setConfig({ testTimeout: 30_000 });

describe("general-store standup (real seeds)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    const goods = readdirSync(`${STORE_DIR}goods/`)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => seedDoc(`goods/${f.replace(/\.yaml$/, "")}`));
    installStore([
      { path: PH, class: PH, data: {} },
      seedDoc("counter"),
      ...goods,
      ...GARDEN_LINES.map(objDoc),
    ]);
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

    // postRegister → reset cloned each line to par off the real templates.
    expect(counter.onHand(TORCH)).toBe(4); // authored par
    expect(counter.priceFor(TORCH)).toBe(2); // authored price
    // A torch is on the shelf and resolvable by keyword (ready to buy).
    const torch = counter.resolveBuy("torch");
    expect(torch).not.toBeNull();
    expect(torch!.getTemplatePath()).toBe(TORCH);
  });

  it("every stocked good is discrete + chattel-stampable (never Globbable)", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);
    const shelf = counter.offeredItems();
    expect(shelf.length).toBeGreaterThan(0);
    for (const good of shelf) {
      expect(MixinApi.isGlobbable(good)).toBe(false); // discrete
      expect(MixinApi.isChattel(good)).toBe(true); // stampable
    }
  });

  it("the goods are real — the torch lights, the skin holds fluid, the knife is a weapon", async () => {
    const counter = await StuffApi.singleton<Stock>(COUNTER);

    // The torch is a real switchable light: dark off the shelf, lights when
    // switched on, dark again when off (VisionModality reads this flux).
    const torch = counter.resolveBuy("torch") as unknown as Stuff &
      Switchable &
      LightSource;
    expect(torch.getEmittedFlux().rawValue()).toBe(0); // unlit off the shelf
    torch.switchOn();
    expect(torch.getEmittedFlux().rawValue()).toBeGreaterThan(0); // it lights
    torch.switchOff();
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
