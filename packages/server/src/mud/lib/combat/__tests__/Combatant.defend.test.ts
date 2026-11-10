/**
 * `defend [<target>]` is one act the FIGHTER decides
 * (`CombatantMixin.defend`, controller-liquidity W7c): nobody named covers
 * up; named, a poised coup is stayed first, else the fighter interposes.
 * The engine's three seams are scripted here — what is pinned is the
 * order and the reasons, not the fight.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CombatantMixin } from '../Combatant';
import type { GambitEligibility } from '../../../api/combat';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Fighter extends CombatantMixin(Idea) {
  public gambit: GambitEligibility = { ok: true };
  public coup = false;
  public ally: { ok: boolean; reason?: string } = { ok: true };
  public override queueGambit(_key: string): GambitEligibility {
    return this.gambit;
  }
  public override intervene(_target: Stuff): boolean {
    return this.coup;
  }
  public override defendAlly(_ally: Stuff): { ok: boolean; reason?: string } {
    return this.ally;
  }
}

describe('Combatant.defend — one act, the fighter decides', () => {
  beforeEach(() => StuffApi.clearAll());

  it('nobody named: covers up, or says why not', () => {
    const f = makeStuff(() => new Fighter());
    expect(f.defend(null)).toEqual({ ok: true, facts: { kind: 'cover' } });
    f.gambit = { ok: false, reason: 'not-in-combat' };
    expect(f.defend(null)).toEqual({ ok: false, reason: 'not-in-combat' });
    f.gambit = { ok: false, reason: 'downed' };
    expect(f.defend(null)).toEqual({ ok: false, reason: 'cannot-cover', facts: { why: 'downed' } });
  });

  it('a poised coup is stayed before anyone is interposed for', () => {
    const f = makeStuff(() => new Fighter());
    const t = makeStuff(() => new Fighter());
    f.coup = true;
    expect(f.defend(t)).toEqual({ ok: true, facts: { kind: 'stayed', target: t } });
    f.coup = false;
    expect(f.defend(t)).toEqual({ ok: true, facts: { kind: 'interposed', target: t } });
    f.ally = { ok: false, reason: 'ally-not-pressed' };
    expect(f.defend(t)).toEqual({ ok: false, reason: 'ally-not-pressed' });
    f.ally = { ok: false, reason: 'not-engageable' };
    expect(f.defend(t)).toEqual({ ok: false, reason: 'cannot-interpose', facts: { why: 'not-engageable' } });
  });
});
