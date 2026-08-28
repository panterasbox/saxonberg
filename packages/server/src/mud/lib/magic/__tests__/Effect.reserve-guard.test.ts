/**
 * The coupling guard on `adjust-reserve` (capability packs D5): a
 * positive delta on `mana` is a mana generator and is refused at
 * AUTHORING — `MagicEffects.validate` throws, so the catalogue drops
 * the row. `charge` is different: a positive delta on it is the shipped
 * `transfer` working's honest leg, guarded at EXECUTION (`transferCharge`
 * debits the actor + the coupling loss), so it stays authorable.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MagicEffects, MANA_RESERVE_KEY } from '../Effect';
import { MANA_RESERVE_KEY as CASTER_MANA } from '../Caster';
import { Charge } from '../Charge';

describe('adjust-reserve — the coupled reserves are not fillable by fiat', () => {
  it('the keys are the substrate\'s', () => {
    expect(MANA_RESERVE_KEY).toBe(CASTER_MANA);
  });

  it('a positive delta on mana is refused at authoring', () => {
    expect(() => MagicEffects.validate({ kind: 'adjust-reserve', reserveKey: 'mana', delta: 10 })).toThrow(
      /mana generator — arcane-science forbids it; feed satiation instead/,
    );
  });

  it("a positive delta on charge stays AUTHORABLE — it is the shipped `transfer` working's leg, guarded at execution by transferCharge", () => {
    expect(MagicEffects.validate({ kind: 'adjust-reserve', reserveKey: Charge.RESERVE_KEY, delta: 20 }).kind).toBe('adjust-reserve');
  });

  it('a draw (negative delta) and any other reserve are untouched', () => {
    expect(MagicEffects.validate({ kind: 'adjust-reserve', reserveKey: 'mana', delta: -5 })).toEqual({
      kind: 'adjust-reserve', reserveKey: 'mana', delta: -5,
    });
    expect(MagicEffects.validate({ kind: 'adjust-reserve', reserveKey: 'endurance', delta: 5 }).kind).toBe('adjust-reserve');
  });
});
