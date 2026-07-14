/**
 * CombatAttributionEvent.deriveBlame — the pure replay reader over the
 * blame ledger. Culpability is *derived* from the append-only rows, never
 * stamped: the earliest `death` row is authoritative, and a death is a
 * crime only when a sentient person was killed under lethal terms they
 * did not consent to.
 */

import { describe, it, expect } from "vitest";
import CombatAttributionEvent from "../CombatAttributionEvent";
import type { CombatAttributionFields } from "../CombatAttributionEvent";

/** Build a row from partial fields (defaults are a lawful non-lethal fight). */
function row(fields: Partial<CombatAttributionFields> & { realAt: number }): CombatAttributionEvent {
  const ev = new CombatAttributionEvent();
  ev.kind = fields.kind ?? "death";
  ev.sessionId = fields.sessionId ?? "s1";
  ev.initiator = fields.initiator ?? "/obj/Avatar/attacker";
  ev.opponent = fields.opponent ?? "/obj/Avatar/attacker";
  ev.victim = fields.victim ?? "/obj/Avatar/victim";
  ev.killer = fields.killer ?? "/obj/Avatar/attacker";
  ev.lethality = fields.lethality ?? "lethal";
  ev.stopCondition = fields.stopCondition ?? "death";
  ev.consented = fields.consented ?? false;
  ev.sentient = fields.sentient ?? true;
  ev.realAt = fields.realAt;
  return ev;
}

describe("CombatAttributionEvent.deriveBlame", () => {
  it("returns null when there is no death row", () => {
    const rows = [
      row({ kind: "opened", realAt: 1 }),
      row({ kind: "violated", realAt: 2 }),
    ];
    expect(CombatAttributionEvent.deriveBlame(rows)).toBeNull();
  });

  it("returns null on an empty ledger", () => {
    expect(CombatAttributionEvent.deriveBlame([])).toBeNull();
  });

  it("attributes the death to the killer named on the death row", () => {
    const v = CombatAttributionEvent.deriveBlame([
      row({ kind: "opened", realAt: 1 }),
      row({ kind: "death", killer: "/obj/Avatar/duelist", realAt: 2 }),
    ]);
    expect(v).not.toBeNull();
    expect(v!.killer).toBe("/obj/Avatar/duelist");
    expect(v!.victim).toBe("/obj/Avatar/victim");
  });

  it("flags a crime: a sentient killed under non-consented lethal terms", () => {
    const v = CombatAttributionEvent.deriveBlame([
      row({ kind: "death", lethality: "lethal", consented: false, sentient: true, realAt: 5 }),
    ]);
    expect(v!.crime).toBe(true);
  });

  it("is not a crime when the victim consented to lethal terms (a duel)", () => {
    const v = CombatAttributionEvent.deriveBlame([
      row({ kind: "death", lethality: "lethal", consented: true, sentient: true, realAt: 5 }),
    ]);
    expect(v!.crime).toBe(false);
  });

  it("is not a crime when the victim was non-sentient (the cull)", () => {
    const v = CombatAttributionEvent.deriveBlame([
      row({ kind: "death", lethality: "lethal", consented: false, sentient: false, realAt: 5 }),
    ]);
    expect(v!.crime).toBe(false);
  });

  it("uses the EARLIEST death row when several exist (the authoritative one)", () => {
    const v = CombatAttributionEvent.deriveBlame([
      row({ kind: "death", killer: "/obj/Avatar/second", consented: true, realAt: 20 }),
      row({ kind: "death", killer: "/obj/Avatar/first", consented: false, realAt: 10 }),
    ]);
    expect(v!.killer).toBe("/obj/Avatar/first");
    expect(v!.crime).toBe(true); // the first, non-consented death governs
  });
});
