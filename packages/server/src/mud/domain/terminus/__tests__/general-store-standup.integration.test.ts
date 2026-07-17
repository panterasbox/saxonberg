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

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { StuffApi } from "../../../api/stuff";
import { AppSettings } from "../../../lib/config/AppSettings";
import PersistentHydrator from "../../../lib/persistence/PersistentHydrator";
import Stock from "../../../lib/retail/Stock";
import { installStore, type Doc } from "../../lounge/__tests__/lounge-fixtures";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

const PH = PersistentHydrator.templatePath;
const STORE_DIR = fileURLToPath(
  new URL("../../../seeds/domain/terminus/general-store/", import.meta.url),
);
const COUNTER = "/domain/terminus/general-store/counter";
const TORCH = "/domain/terminus/general-store/goods/torch";

function seedDoc(rel: string): Doc {
  const parsed = YAML.parse(
    readFileSync(`${STORE_DIR}${rel}.yaml`, "utf-8"),
  ) as Record<string, unknown>;
  return {
    path: `/domain/terminus/general-store/${rel}`,
    class: parsed.class as string,
    hydratorClass: (parsed.hydratorClass as string) ?? PH,
    data: (parsed.data as Record<string, unknown>) ?? {},
  };
}

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
});
