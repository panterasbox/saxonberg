/**
 * `pay <it>` at something that keeps your bills (harbors A2, P13): a
 * `Payable` recipient is paid what IT says you owe — each bill settled to
 * the venue it names through `EmploymentApi.settleSale` as the payer, in
 * order — and the first bill that cannot be paid stops the rest. The payer
 * is told what was paid and what was not; a sum typed at it is refused.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import PayController from "../PayController";
import { PayableMixin, type Bill } from "../../../../../lib/banking/Payable";
import { Idea } from "../../../../../lib/stuff/Idea";
import { MixinApi } from "../../../../../api/mixin";
import { MessageApi } from "../../../../../api/message";
import { EmploymentApi } from "../../../../../api/employment";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import { CommandApi, type CommandContext } from "../../../../../api/command";
import type { MqlOneResult } from "../../../../../api/mql";
import type { Stuff } from "../../../../../lib/stuff/Stuff";
import { makeStuff, makeStuffAtPath } from "../../../../../lib/security/__tests__/test-setup";

/** A desk that keeps two bills for whoever pays at it. */
class TestOffice extends PayableMixin(Idea) {
  public bills: Bill[] = [];
  public paid: Bill[] = [];
  public override async billsFor(_payer: Stuff): Promise<Bill[]> {
    return this.bills.filter((b) => !this.paid.includes(b));
  }
  public override async onPaid(bill: Bill, _payer: Stuff): Promise<void> {
    this.paid.push(bill);
  }
}

const DUES: Bill = { to: "/test/port/office", amountMinor: 8, reason: "in harbor dues for the Hesper", key: "dues" };
const CHARTER: Bill = { to: "/test/line/desk", amountMinor: 12, reason: "for the Hesper's charter", key: "charter" };

let office: TestOffice;
let giver: Stuff;
let told: string[];
let ctx: CommandContext;

function context(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: office as never,
    commandText: "pay office",
    executionId: "test",
    commandId: "test",
    verb: "pay",
    command: CommandDefinition.fromYaml("verbs: [pay]\ncontroller: NoopController\ndescription: stub\n", "<test>"),
  });
}

async function pay(amount?: string): Promise<void> {
  const recipient = { stuff: office, raw: "office" } as unknown as MqlOneResult;
  ctx = context();
  await makeStuff(() => new PayController()).execute(
    { recipient, ...(amount !== undefined ? { amount } : {}) } as never,
    ctx
  );
}

beforeEach(() => {
  office = makeStuffAtPath(() => new TestOffice(), "/test/port/office");
  office.bills = [DUES, CHARTER];
  giver = makeStuffAtPath(() => new TestOffice(), "/test/payer") as unknown as Stuff;
  told = [];
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => {
      told.push(m.toString());
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pay at a Payable (harbors P13)", () => {
  it("is a Payable — the mixin is registered", () => {
    expect(MixinApi.isPayable(office as unknown as Stuff)).toBe(true);
  });

  it("⭐ settles every bill, each to its own venue, in order", async () => {
    const settle = vi
      .spyOn(EmploymentApi, "settleSale")
      .mockResolvedValue({ tail: "(paid)", receipt: {} } as never);
    await pay();
    expect(settle.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      ["/test/port/office", 8],
      ["/test/line/desk", 12],
    ]);
    expect(office.paid).toEqual([DUES, CHARTER]);
    expect(told.join("\n")).toMatch(/in harbor dues for the Hesper .*for the Hesper's charter.*Nothing more is owed/s);
  });

  it("⭐ stops at the first bill that fails — nothing after it is tried, nothing of it is marked paid", async () => {
    const settle = vi.spyOn(EmploymentApi, "settleSale").mockResolvedValue(null);
    await pay();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(office.paid).toEqual([]);
    expect(told.join("\n")).toMatch(/cannot cover .*in harbor dues.*still owed: .*harbor dues.*charter/s);
  });

  it("⭐ a later bill failing keeps what was paid and says what is still owed", async () => {
    vi.spyOn(EmploymentApi, "settleSale")
      .mockResolvedValueOnce({ tail: "(8)", receipt: {} } as never)
      .mockResolvedValueOnce(null);
    await pay();
    expect(office.paid).toEqual([DUES]);
    const said = told.join("\n");
    expect(said).toMatch(/You pay .*in harbor dues/);
    expect(said).toMatch(/cannot cover .*charter; still owed: .*charter/);
  });

  it("nothing owed is said; a sum typed at it is refused", async () => {
    const settle = vi.spyOn(EmploymentApi, "settleSale");
    await pay("25");
    expect(told.join("\n")).toMatch(/takes what is owed, not a sum you name/);
    office.bills = [];
    await pay();
    expect(told.join("\n")).toMatch(/You owe nothing at/);
    expect(settle).not.toHaveBeenCalled();
  });
});
