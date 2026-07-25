/**
 * AccountabilityEvent.deriveBlame — the pure replay reader over the unified
 * harm ledger. Culpability is *derived* from the append-only rows, never
 * stamped: the earliest terminal row (`death` or `harm`) is authoritative.
 *
 * The `death` cases are ported verbatim from the former
 * `CombatAttributionEvent.test.ts` — they PIN the byte-identical combat
 * migration: every combat verdict must be unchanged. The `harm` cases
 * exercise the new terms-free rule (`!consented && sentient`).
 */

import { describe, it, expect } from 'vitest';
import AccountabilityEvent from '../AccountabilityEvent';
import type { AccountabilityFields } from '../AccountabilityEvent';

/** Build a row from partial fields (defaults are a lethal, non-consented,
 * sentient death — the crime baseline). */
function row(
  fields: Partial<AccountabilityFields> & { realAt: number },
): AccountabilityEvent {
  const ev = new AccountabilityEvent();
  ev.kind = fields.kind ?? 'death';
  ev.sessionId = fields.sessionId ?? 's1';
  ev.initiator = fields.initiator ?? '/obj/Avatar/attacker';
  ev.opponent = fields.opponent ?? '/obj/Avatar/attacker';
  ev.victim = fields.victim ?? '/obj/Avatar/victim';
  ev.killer = fields.killer ?? '/obj/Avatar/attacker';
  ev.lethality = fields.lethality ?? 'lethal';
  ev.stopCondition = fields.stopCondition ?? 'death';
  ev.consented = fields.consented ?? false;
  ev.sentient = fields.sentient ?? true;
  ev.realAt = fields.realAt;
  return ev;
}

describe('AccountabilityEvent.deriveBlame — combat rows (byte-identical)', () => {
  it('returns null when there is no terminal row', () => {
    const rows = [
      row({ kind: 'opened', realAt: 1 }),
      row({ kind: 'violated', realAt: 2 }),
    ];
    expect(AccountabilityEvent.deriveBlame(rows)).toBeNull();
  });

  it('returns null on an empty ledger', () => {
    expect(AccountabilityEvent.deriveBlame([])).toBeNull();
  });

  it('attributes the death to the killer named on the death row', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({ kind: 'opened', realAt: 1 }),
      row({ kind: 'death', killer: '/obj/Avatar/duelist', realAt: 2 }),
    ]);
    expect(v).not.toBeNull();
    expect(v!.killer).toBe('/obj/Avatar/duelist');
    expect(v!.victim).toBe('/obj/Avatar/victim');
  });

  it('flags a crime: a sentient killed under non-consented lethal terms', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({
        kind: 'death',
        lethality: 'lethal',
        consented: false,
        sentient: true,
        realAt: 5,
      }),
    ]);
    expect(v!.crime).toBe(true);
  });

  it('is not a crime when the victim consented to lethal terms (a duel)', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({
        kind: 'death',
        lethality: 'lethal',
        consented: true,
        sentient: true,
        realAt: 5,
      }),
    ]);
    expect(v!.crime).toBe(false);
  });

  it('is not a crime when the victim was non-sentient (the cull)', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({
        kind: 'death',
        lethality: 'lethal',
        consented: false,
        sentient: false,
        realAt: 5,
      }),
    ]);
    expect(v!.crime).toBe(false);
  });

  it('is not a crime under non-lethal terms even if non-consented', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({
        kind: 'death',
        lethality: 'non-lethal',
        consented: false,
        sentient: true,
        realAt: 5,
      }),
    ]);
    expect(v!.crime).toBe(false);
  });

  it('uses the EARLIEST death row when several exist (the authoritative one)', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({
        kind: 'death',
        killer: '/obj/Avatar/second',
        consented: true,
        realAt: 20,
      }),
      row({
        kind: 'death',
        killer: '/obj/Avatar/first',
        consented: false,
        realAt: 10,
      }),
    ]);
    expect(v!.killer).toBe('/obj/Avatar/first');
    expect(v!.crime).toBe(true); // the first, non-consented death governs
  });
});

describe('AccountabilityEvent.deriveBlame — harm rows (the trap producer)', () => {
  it('flags a crime: a non-consenting sentient harmed (no lethal-terms concept)', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({
        kind: 'harm',
        lethality: 'non-lethal',
        consented: false,
        sentient: true,
        killer: '/obj/Avatar/trapper',
        realAt: 3,
      }),
    ]);
    expect(v!.crime).toBe(true);
    expect(v!.killer).toBe('/obj/Avatar/trapper');
  });

  it('is not a crime when the harmed party is a beast', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({ kind: 'harm', consented: false, sentient: false, realAt: 3 }),
    ]);
    expect(v!.crime).toBe(false);
  });

  it('is not a crime when the sentient consented to the harm', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({ kind: 'harm', consented: true, sentient: true, realAt: 3 }),
    ]);
    expect(v!.crime).toBe(false);
  });

  it('an earlier harm row governs over a later death row', () => {
    const v = AccountabilityEvent.deriveBlame([
      row({
        kind: 'death',
        killer: '/obj/Avatar/finisher',
        consented: true,
        realAt: 20,
      }),
      row({
        kind: 'harm',
        killer: '/obj/Avatar/trapper',
        consented: false,
        sentient: true,
        realAt: 10,
      }),
    ]);
    expect(v!.killer).toBe('/obj/Avatar/trapper');
    expect(v!.crime).toBe(true);
  });
});

describe("deriveBlame — command responsibility (the formation facts)", () => {
  function deathRow(overrides: Partial<AccountabilityEvent>): AccountabilityEvent {
    const ev = new AccountabilityEvent();
    ev.kind = "death";
    ev.sessionId = "s-cmd";
    ev.initiator = "/obj/Avatar/master";
    ev.opponent = "/obj/Avatar/apprentice";
    ev.victim = "/obj/Avatar/victim";
    ev.killer = "/obj/Avatar/apprentice";
    ev.lethality = "lethal";
    ev.stopCondition = "death";
    ev.consented = false;
    ev.sentient = true;
    ev.realAt = 1000;
    Object.assign(ev, overrides);
    return ev;
  }

  it("an unlawful DIRECTED kill: the striker holds the deed, the commander the responsibility", () => {
    const v = AccountabilityEvent.deriveBlame([
      deathRow({
        formationPath: "/lib/combat/CombatFormation/master-apprentice",
        killerRole: "apprentice",
        directedBy: "/obj/Avatar/master",
      }),
    ]);
    expect(v).not.toBeNull();
    expect(v!.crime).toBe(true);
    expect(v!.killer).toBe("/obj/Avatar/apprentice"); // the deed
    expect(v!.commandResponsible).toBe("/obj/Avatar/master"); // the blame
  });

  it("an undirected kill carries no command responsibility", () => {
    const v = AccountabilityEvent.deriveBlame([deathRow({})]);
    expect(v!.crime).toBe(true);
    expect(v!.commandResponsible).toBe("");
  });

  it("a LAWFUL directed kill carries no command responsibility (no crime, no commander)", () => {
    const v = AccountabilityEvent.deriveBlame([
      deathRow({ consented: true, directedBy: "/obj/Avatar/master" }),
    ]);
    expect(v!.crime).toBe(false);
    expect(v!.commandResponsible).toBe("");
  });
});
