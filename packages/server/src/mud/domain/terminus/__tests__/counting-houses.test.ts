/**
 * The Goodkin branch (the Counting-Houses re-home). Two halves:
 *   - the authored seeds are well-formed: the room exit chain walks, the branch
 *     Business + BankCounter + Terms are shaped right, and Halloran's enrollment
 *     tree passes the dialogue schema;
 *   - the new-player money arc works end to end at the Goodkin counter: the
 *     opening float capitalizes the branch (conserved), open → deposit →
 *     withdraw (bounded, exact change), and the Circle enrollment raises the
 *     quota.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { DialogueTreeSchema } from "../../../lib/npc/tree";
// Registers the `bank-circle` dialogue effect so the officer tree validates.
import { Currency, BankingApi, Money } from "../../../api/banking";
import Coin from "../../../obj/Coin";
import BankCounter from "../../../obj/BankCounter";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Idea } from "../../../lib/stuff/Idea";
import { ContainerMixin } from "../../../lib/spatial/Container";
import { ContainableMixin } from "../../../lib/spatial/Containable";
import { PropertiedMixin } from "../../../lib/stuff/Propertied";
import type { Stuff } from "../../../lib/stuff/Stuff";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../lib/banking/__tests__/banking-test-harness";

const SEEDS = fileURLToPath(new URL("../../../seeds", import.meta.url));
function seedData(rel: string): Record<string, unknown> {
  const parsed = YAML.parse(readFileSync(`${SEEDS}/${rel}`, "utf-8")) as {
    data?: Record<string, unknown>;
  };
  return parsed.data ?? {};
}

const CH = "domain/terminus/counting-houses";
const COUNTER_PATH = "/domain/terminus/counting-houses/bank-counter";
const ALICE = "/obj/Avatar/alice";

// Mirrors a real avatar closely enough for the money arc: Propertied (so the
// Circle membership can ride a `<corpoKey>.circle` saved prop, as on a real
// Creature/Avatar) + a container so it can hold coin.
class TestAvatar extends ContainerMixin(ContainableMixin(PropertiedMixin(Idea))) {
  static _mixinName = "TestAvatar";
}

describe("Goodkin seeds — the authored branch is well-formed", () => {
  it("the room exit chain walks crossing → avenue → hall ↔ parlor", () => {
    const crossing = seedData(
      "domain/eternal/university-avenue/crossing.yaml",
    ) as { exits: Record<string, { destination: string }> };
    expect(crossing.exits.west?.destination).toBe(
      "/domain/terminus/counting-houses/avenue-block",
    );
    const avenue = seedData(`${CH}/avenue-block.yaml`) as {
      exits: Record<string, { destination: string }>;
    };
    expect(avenue.exits.east?.destination).toBe(
      "/domain/eternal/university-avenue/crossing",
    );
    expect(avenue.exits.west?.destination).toBe(
      "/domain/terminus/counting-houses/banking-hall",
    );
    const hall = seedData(`${CH}/banking-hall.yaml`) as {
      exits: Record<string, { destination: string }>;
    };
    expect(hall.exits.east?.destination).toBe(
      "/domain/terminus/counting-houses/avenue-block",
    );
    expect(hall.exits.north?.destination).toBe(
      "/domain/terminus/counting-houses/circle-parlor",
    );
    const parlor = seedData(`${CH}/circle-parlor.yaml`) as {
      exits: Record<string, { destination: string }>;
    };
    expect(parlor.exits.south?.destination).toBe(
      "/domain/terminus/counting-houses/banking-hall",
    );
  });

  it("the branch Business has teller + officer positions over the counter", () => {
    const biz = seedData(`${CH}/business.yaml`) as {
      positions: { key: string }[];
      operatingLocations: string[];
    };
    expect(biz.positions.map((p) => p.key).sort()).toEqual([
      "officer",
      "teller",
    ]);
    expect(biz.operatingLocations).toContain(COUNTER_PATH);
  });

  it("the counter carries the Goodkin affiliation + a nearly-free schedule", () => {
    const counter = seedData(`${CH}/bank-counter.yaml`) as {
      corpoKey: string;
      terms: Record<string, number>;
    };
    expect(counter.corpoKey).toBe("goodkin");
    // Core loop free; the one live fee is the light cross-corpo wire.
    expect(counter.terms.transactionFee).toBe(0);
    expect(counter.terms.openingFee).toBe(0);
    expect(counter.terms.crossCorpoFee).toBeGreaterThan(0);
  });

  it("Halloran's enrollment tree passes the dialogue schema", () => {
    const officer = seedData(`${CH}/npc/officer.yaml`) as {
      behaviors: { brain: string; config?: unknown }[];
    };
    const dlg = officer.behaviors.find((b) =>
      b.brain.endsWith("/tree-dialogue"),
    );
    expect(dlg).toBeTruthy();
    expect(DialogueTreeSchema.validate(dlg!.config)).toEqual([]);
  });
});

describe("Goodkin — the new-player money arc", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      return makeStuffAtPath(() => {
    const coin = new Coin();
    coin.currency = "zorkmid";
    coin.denomination = 1;
    return coin;
  }, path);
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  function makeCounter(): InstanceType<typeof BankCounter> {
    return makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, COUNTER_PATH);
  }
  function avatar(path: string): TestAvatar {
    return makeStuffAtPath(() => new TestAvatar(), path);
  }
  async function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
    return withRootContext(null, "goodkin.test", () => {
      ExecutionContextApi.tagActingAuthor(owner);
      return fn();
    });
  }

  it("the opening float capitalizes the branch on first open, conserved (1:1)", async () => {
    // The float is lazy: the first customer to open an account triggers it
    // (the counter is guaranteed live then). Drive that real path.
    vi.spyOn(AppApi, "setting").mockImplementation((k: string) =>
      k === AppSettingKeys.bankingOpeningFloat ? "500" : "",
    );
    const counter = makeCounter();
    const alice = avatar(ALICE);
    await asOwner(alice, () => BankingApi.openAccount("goodkin", "goodkin"));
    // Coin in the till, backed by the branch's own operating balance.
    expect(counter.getTillLiquidity().minor).toBe(500);
    const branch = await BankingApi.ensureVenueAccount(COUNTER_PATH, "goodkin", "goodkin");
    expect(BankingApi.balanceOf(branch).minor).toBe(500);
    expect(BankingApi.reconcile().balanced).toBe(true);
    // Idempotent — a second customer's open doesn't re-seed the float.
    const bob = avatar("/obj/Avatar/bob");
    await asOwner(bob, () => BankingApi.openAccount("goodkin", "goodkin"));
    expect(counter.getTillLiquidity().minor).toBe(500);
  });

  it("open → deposit → withdraw works at the counter (bounded, exact change)", async () => {
    const counter = makeCounter();
    const alice = avatar(ALICE);
    // Arrive with the onboarding 20 (four 5-credit crowns).
    const cash = (await asOwner(alice, () =>
      BankingApi.issueCash(alice as never, Money.of(20, Currency.compact())),
    )) as Stuff;
    const acct = await asOwner(alice, async () => {
      const id = await BankingApi.openAccount("goodkin", "goodkin");
      await BankingApi.deposit(counter, cash as never);
      return id;
    });
    expect(BankingApi.balanceOf(acct).minor).toBe(20);
    expect(counter.getTillLiquidity().minor).toBe(20);
    // Withdraw it back as physical coin (till makes exact change).
    await asOwner(alice, () => BankingApi.withdraw(counter, Money.of(20, Currency.compact())));
    expect(BankingApi.balanceOf(acct).minor).toBe(0);
    expect(counter.getTillLiquidity().minor).toBe(0);
    expect(await BankingApi.corpoKeyOf(acct)).toBe("goodkin");
  });

  it("the Circle enrollment raises the withdrawal quota", async () => {
    vi.spyOn(AppApi, "setting").mockImplementation((k: string) =>
      k === AppSettingKeys.bankingWithdrawalDailyCap
        ? "10"
        : k === AppSettingKeys.bankingWithdrawalDailyCapCircle
          ? "1000"
          : "",
    );
    const counter = makeCounter();
    const alice = avatar(ALICE);
    const cash = (await asOwner(alice, () =>
      BankingApi.issueCash(alice as never, Money.of(100, Currency.compact())),
    )) as Stuff;
    const acct = await asOwner(alice, async () => {
      const id = await BankingApi.openAccount("goodkin", "goodkin");
      await BankingApi.deposit(counter, cash as never);
      return id;
    });
    // Over the stranger cap (10) → refused.
    await expect(
      asOwner(alice, () => BankingApi.withdraw(counter, Money.of(25, Currency.compact()))),
    ).rejects.toThrow(/limit/);
    // Halloran enrols Alice into the Circle → the raised cap applies.
    expect(await BankingApi.enrollCircle(ALICE, "goodkin")).toBe(true);
    await asOwner(alice, () => BankingApi.withdraw(counter, Money.of(25, Currency.compact())));
    expect(BankingApi.balanceOf(acct).minor).toBe(75);
  });
});
