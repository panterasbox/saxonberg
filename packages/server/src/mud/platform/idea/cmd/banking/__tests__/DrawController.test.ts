/**
 * DrawController — the proprietor's take-home through the verb path: a
 * `draw` leg business → proprietor's primary; a non-proprietor is refused
 * by the structural participant gate (the business resolves from the
 * actor, no parameter to spoof); short funds refused; reconcile green.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import DrawController from "../DrawController";
import BusinessEntity from "../../../Business";
import { Currency, BankingApi, Money } from "../../../../../api/banking";
import { MessageApi } from "../../../../../api/message";
import { ExecutionContextApi } from "../../../../../api/execution-context";
import { Idea } from "../../../../../lib/stuff/Idea";
import type { CommandContext } from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../../lib/security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../../lib/banking/__tests__/banking-test-harness";

const BUSINESS = "/world/test/business";
const DAVE = "/world/test/npc/dave";
const MARA = "/world/test/npc/mara";

class Person extends Idea {
  static _mixinName = "Person";
}

function muteScenes(): void {
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
}

function ctx(giver: Stuff): CommandContext & { note: ReturnType<typeof vi.fn> } {
  return {
    commandGiver: giver,
    note: vi.fn(),
  } as unknown as CommandContext & { note: ReturnType<typeof vi.fn> };
}

async function asGiver<T>(giver: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "draw-verb.test", () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return fn();
  });
}

describe("DrawController", () => {
  let biz: BusinessEntity;
  let dave: Person;
  let mara: Person;
  let bizAcct: string;
  let daveAcct: string;

  beforeEach(async () => {
    installBankingHarness();
    muteScenes();
    biz = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
    biz.proprietorPath = DAVE;
    biz.banksAt = BankingApi.defaultCustodianBank();
    dave = makeStuffAtPath(() => new Person(), DAVE);
    mara = makeStuffAtPath(() => new Person(), MARA);
    bizAcct = await BankingApi.ensureVenueAccount(
      biz.getAccountPath(),
      BankingApi.defaultCustodianBank(),
      "", Currency.compact());
    daveAcct = await BankingApi.ensureVenueAccount(
      DAVE,
      BankingApi.defaultCustodianBank(),
      "", Currency.compact());
    await BankingApi.mint(bizAcct, Money.of(200, Currency.compact()));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  function draw(): DrawController {
    return makeStuff(() => new DrawController());
  }

  it("a proprietor draws: a draw leg, business debited, primary credited", async () => {
    const c = ctx(dave);
    await asGiver(dave, () => draw().execute({ amount: 80 } as never, c));
    expect(c.note).not.toHaveBeenCalled();
    expect(BankingApi.balanceOf(bizAcct).minor).toBe(120);
    expect(BankingApi.balanceOf(daveAcct).minor).toBe(80);
    const rows = await BankingApi.entriesFor(daveAcct);
    const leg = rows.find((r) => r.kind === "draw");
    expect(leg?.category).toBe("draw");
    expect(BankingApi.reconcile(Currency.compact()).balanced).toBe(true);
  });

  it("a non-proprietor is refused by the participant gate", async () => {
    const c = ctx(mara);
    await asGiver(mara, () => draw().execute({ amount: 10 } as never, c));
    expect(c.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "not-proprietor" }),
    );
    expect(BankingApi.balanceOf(bizAcct).minor).toBe(200);
  });

  it("short funds refused (solvency-checked, unlike the wage)", async () => {
    const c = ctx(dave);
    await asGiver(dave, () => draw().execute({ amount: 500 } as never, c));
    expect(c.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "draw-refused" }),
    );
    expect(BankingApi.balanceOf(bizAcct).minor).toBe(200);
    expect(BankingApi.balanceOf(daveAcct).minor).toBe(0);
  });
});
