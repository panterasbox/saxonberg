/**
 * The Tier C write path (wizard-axis D11): `treasury set` admits the
 * Minister of Finance's keys, `reserve set` the Governor's (and the
 * `reserve.*` Schedule rows); each refuses the other's with `wrong-seat`
 * naming who does set it, and a set lands in the officer's chronicle as a
 * deed. The verb-level seat validators are tested on their own.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import TreasuryController from "../TreasuryController";
import ReserveController from "../ReserveController";
import { AppApi } from "../../../../../api/app";
import { MixinApi } from "../../../../../api/mixin";
import { MessageApi } from "../../../../../api/message";
import { makeStuff } from "../../../../../lib/security/__tests__/test-setup";
import type { CommandContext } from "../../../../../api/command";

let values: Record<string, string>;
let deeds: Array<{ text?: string; tags?: string[] }>;
let note: ReturnType<typeof vi.fn>;
let ctx: CommandContext;

beforeEach(() => {
  values = { "banking.salesTaxRate": "0.08", "banking.withdrawalDailyCap": "500" };
  deeds = [];
  vi.spyOn(AppApi, "setting").mockImplementation((k: string) => values[k] ?? "");
  vi.spyOn(AppApi, "setSetting").mockImplementation(async (k: string, v: string) => {
    values[k] = v;
  });
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
  const officer = {
    recordDeed: async (f: { text?: string; tags?: string[] }) => {
      deeds.push(f);
    },
  };
  vi.spyOn(MixinApi, "isPersona").mockReturnValue(true);
  note = vi.fn();
  ctx = { commandGiver: officer, note } as unknown as CommandContext;
});
afterEach(() => vi.restoreAllMocks());

const reasons = () => note.mock.calls.map((c) => (c[0] as { reason?: string }).reason);

describe("treasury set — the Minister of Finance's dials", () => {
  it("sets a fiscal key and records the deed", async () => {
    const ctrl = makeStuff(() => new TreasuryController());
    await ctrl.execute({ subcommand: "set", row: "banking.salesTaxRate", value: "0.1" } as never, ctx);
    expect(values["banking.salesTaxRate"]).toBe("0.1");
    expect(note).not.toHaveBeenCalled();
    expect(deeds).toHaveLength(1);
    expect(deeds[0]!.text).toBe("As Minister of Finance, set `banking.salesTaxRate` to 0.1; it was 0.08.");
    expect(deeds[0]!.tags).toEqual(["governance", "tier-c", "banking.salesTaxRate"]);
  });

  it("refuses the Governor's key with wrong-seat, naming the Governor and reserve set", async () => {
    const ctrl = makeStuff(() => new TreasuryController());
    await ctrl.execute({ subcommand: "set", row: "banking.withdrawalDailyCap", value: "600" } as never, ctx);
    expect(values["banking.withdrawalDailyCap"]).toBe("500");
    expect(reasons()).toContain("wrong-seat");
    expect(JSON.stringify(note.mock.calls)).toContain("Governor of the Central Bank");
    expect(JSON.stringify(note.mock.calls)).toContain("reserve set");
    expect(deeds).toHaveLength(0);
  });

  it("refuses a Tier B key, naming the Prime Minister's config", async () => {
    const ctrl = makeStuff(() => new TreasuryController());
    await ctrl.execute({ subcommand: "set", row: "defaultStartLocation", value: "/x" } as never, ctx);
    expect(reasons()).toContain("wrong-seat");
    expect(JSON.stringify(note.mock.calls)).toContain("Prime Minister");
  });
});

describe("reserve set — the Governor's dials", () => {
  it("sets a capital control and records the deed", async () => {
    const ctrl = makeStuff(() => new ReserveController());
    await ctrl.execute({ subcommand: "set", row: "banking.withdrawalDailyCap", value: "600" } as never, ctx);
    expect(values["banking.withdrawalDailyCap"]).toBe("600");
    expect(deeds[0]!.text).toContain("As Governor of the Central Bank");
  });

  it("still writes the reserve.* Schedule rows", async () => {
    const ctrl = makeStuff(() => new ReserveController());
    await ctrl.execute({ subcommand: "set", row: "reserve.defaultHorizonGameDays", value: "30" } as never, ctx);
    expect(note).not.toHaveBeenCalled();
    expect(values["reserve.defaultHorizonGameDays"]).toBe("30");
  });

  it("refuses the fisc's key with wrong-seat, naming the Minister and treasury set", async () => {
    const ctrl = makeStuff(() => new ReserveController());
    await ctrl.execute({ subcommand: "set", row: "banking.salesTaxRate", value: "0.2" } as never, ctx);
    expect(values["banking.salesTaxRate"]).toBe("0.08");
    expect(reasons()).toContain("wrong-seat");
    expect(JSON.stringify(note.mock.calls)).toContain("treasury set");
  });
});
