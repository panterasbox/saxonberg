/**
 * Banking controllers — the verb wiring end-to-end (open / balance /
 * deposit / withdraw), driving the controllers as the dispatcher would:
 * the bank counter sits in the room (resolved by the room scan), the actor
 * is the context-tagged author. Proves the MVC triples thread input →
 * BankingApi → scene with the actor derived from context (never the wire).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BankController from "../BankController";
import BankCounter from "../../../../lib/banking/BankCounter";
import Coin from "../../../Coin";
import { BankingApi } from "../../../../api/banking";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../lib/message/Sensor";
import { Idea } from "../../../../lib/stuff/Idea";
import Location from "../../../../lib/stuff/Location";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { CommandApi, type CommandContext } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { ContainmentApi } from "../../../../api/containment";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { Quantity } from "../../../../lib/quantity";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../lib/banking/__tests__/banking-test-harness";

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))
) {
  static _mixinName = "TestGiver";
}

const BANK_PATH = "/domain/test/goodkin-bank";
const ALICE = "/obj/Avatar/alice";

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    "<test>"
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  verb: string
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: verb,
    executionId: "test",
    commandId: "test",
    verb,
    command: stubCommand(verb),
  });
}

async function asGiver<T>(giver: TestGiver, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "banking.test", () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return fn();
  });
}

describe("Banking controllers — verb wiring", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installBankingHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  it("open → balance → deposit → withdraw threads through the verbs", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), ALICE);
    ContainmentApi.move(giver, loc);
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK_PATH);
    ContainmentApi.move(bank, loc);
    const coins = makeStuffAtPath(() => new Coin(), "/obj/Coin");
    coins.setMass(Quantity.of(0.01, "kg"));
    coins.setQuantity(100);
    ContainmentApi.move(coins, giver);

    const runBank = (m: Record<string, unknown>, verb: string) =>
      asGiver(giver, () =>
        makeStuff(() => new BankController()).execute(
          m as never,
          makeContext(giver, loc, verb)
        )
      );

    // open
    await runBank({ subcommand: "open" }, "bank");
    const accountId = await asGiver(giver, () => BankingApi.myAccountAt(BANK_PATH));
    expect(accountId).not.toBeNull();

    // balance — bare `bank` (no subcommand)
    await runBank({}, "bank");

    // deposit the coin stack
    await runBank(
      { subcommand: "deposit", coins: { stuff: coins, raw: "coins" } as MqlOneResult },
      "bank"
    );
    expect(BankingApi.balanceOf(accountId!).minor).toBe(100);
    expect(bank.getTillLiquidity().minor).toBe(100);

    // withdraw the whole stack back
    await runBank({ subcommand: "withdraw", amount: "100" }, "bank");
    expect(BankingApi.balanceOf(accountId!).minor).toBe(0);
    expect(bank.getTillLiquidity().minor).toBe(0);
  });

  it("statement lists activity, honors a count arg, and guards a missing account", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), ALICE);
    ContainmentApi.move(giver, loc);
    const bank = makeStuffAtPath(() => {
      const b = new BankCounter();
      b.setCorpoKey("goodkin");
      return b;
    }, BANK_PATH);
    ContainmentApi.move(bank, loc);
    const coins = makeStuffAtPath(() => new Coin(), "/obj/Coin");
    coins.setMass(Quantity.of(0.01, "kg"));
    coins.setQuantity(100);
    ContainmentApi.move(coins, giver);

    const runBank = (m: Record<string, unknown>, verb: string) =>
      asGiver(giver, () =>
        makeStuff(() => new BankController()).execute(
          m as never,
          makeContext(giver, loc, verb)
        )
      );

    // No account yet → statement declines with a no-account note.
    const noAcctCtx = makeContext(giver, loc, "bank");
    await asGiver(giver, () =>
      makeStuff(() => new BankController()).execute(
        { subcommand: "statement" } as never,
        noAcctCtx
      )
    );
    expect(noAcctCtx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: "controller-rejected", reason: "no-account" })
    );

    // Open + a deposit + a withdrawal → real ledger activity.
    await runBank({ subcommand: "open" }, "bank");
    await runBank(
      { subcommand: "deposit", coins: { stuff: coins, raw: "coins" } as MqlOneResult },
      "bank"
    );
    await runBank({ subcommand: "withdraw", amount: "30" }, "bank");

    // Statement over the activity — happy path, no rejection note. The
    // `count` arg is accepted (parsed, clamped) the same way.
    const stmtCtx = makeContext(giver, loc, "bank");
    await asGiver(giver, () =>
      makeStuff(() => new BankController()).execute(
        { subcommand: "statement" } as never,
        stmtCtx
      )
    );
    const countCtx = makeContext(giver, loc, "bank");
    await asGiver(giver, () =>
      makeStuff(() => new BankController()).execute(
        { subcommand: "statement", count: "1" } as never,
        countCtx
      )
    );
    for (const ctx of [stmtCtx, countCtx]) {
      expect(
        ctx.getNotes().some((n) => n.kind === "controller-rejected")
      ).toBe(false);
    }
  });

  it("declines with a note when there's no bank in the room", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuffAtPath(() => new TestGiver(), ALICE);
    ContainmentApi.move(giver, loc);

    const ctx = makeContext(giver, loc, "bank");
    await asGiver(giver, () =>
      makeStuff(() => new BankController()).execute({} as never, ctx)
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({ kind: "controller-rejected", reason: "no-bank-here" })
    );
  });
});
