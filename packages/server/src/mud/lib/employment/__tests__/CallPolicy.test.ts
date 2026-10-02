/**
 * The call — ⭐⭐ **who comes over**, and the one property worth protecting:
 * **no leg anywhere reads insertion, authored or identity order.**
 *
 * The defect this retires sorted candidates by identity path. Every player
 * Avatar's path begins `/platform/` and every NPC's `/world/`, so the
 * player won every tie forever — and between two NPCs, one of them served
 * every order of the bar's life while the other stood there. Both are
 * *stable* wrong answers, which is the kind that survives a year because
 * nothing ever looks arbitrary.
 */
/**
 * ⚠ Paths are synthetic (`/test/**`). A kernel test proves the KERNEL, so it
 * must not name shipped content — a test of real rows lives beside them
 * (`src/mud/world/**`). `lint:test-content` enforces it, and caught these
 * four on their first run.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { OrganizationMixin } from '../Organization';
import { EngagedMixin } from '../../activity/Engaged';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { CALL_POLICIES } from '../CallPolicy';

class House extends OrganizationMixin(Idea) {
  static _mixinName = 'House';
}
/** A candidate who can be engaged and can know somebody. */
class Hand extends BeliefStoreMixin(EngagedMixin(Idea)) {
  static _mixinName = 'Hand';
}
class Patron extends Idea {
  static _mixinName = 'Patron';
}

let house: House;
let patron: Stuff;

function hand(path: string): Stuff {
  return makeStuffAtPath(() => new Hand(), path) as unknown as Stuff;
}

beforeEach(() => {
  StuffApi.clearAll();
  house = makeStuff(() => new House()) as House;
  patron = makeStuff(() => new Patron()) as unknown as Stuff;
});

describe('the vocabulary', () => {
  it('⭐ is closed, and every member has a shipped consumer', () => {
    // `regulars` is the bar; `rota` is the Hearthworks kitchen, the yards
    // and the bakery. A third policy with no house behind it would be a
    // word that cannot be wrong.
    expect([...CALL_POLICIES]).toEqual(['regulars', 'rota']);
  });

  it('refuses a policy that is not one, loudly', () => {
    expect(() => house.setCall('whoever')).toThrow(/not a call policy/);
    expect(() => house.setCall('round-robin')).toThrow();
  });

  it("accepts '' — a chart that calls nobody needs no rule", () => {
    house.setCall('');
    expect(house.getCall()).toBe('');
  });
});

describe('a house with no rule', () => {
  it('⚠⚠ DECLINES rather than quietly serving the first member', () => {
    const a = hand('/test/agent/a');
    const b = hand('/test/agent/b');
    const verdict = house.callFor({ patron, candidates: [a, b] });
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toBe('no-call-policy');
    // A fallback to `candidates[0]` would make the whole mechanism
    // optional, which is how the identity-path sort survived this long.
  });

  it('and answers `nobody` for an empty set, which is a different thing', () => {
    house.setCall('rota');
    const verdict = house.callFor({ patron, candidates: [] });
    expect(verdict.ok === false && verdict.reason).toBe('nobody');
  });
});

describe('rota — the least recently called', () => {
  beforeEach(() => house.setCall('rota'));

  it('⭐⭐ shares the work: 30 calls over three hands and nobody is starved', () => {
    const hands = [
      hand('/test/agent/zelda'),
      hand('/test/agent/mara'),
      // ⚠ A player's identity path. Under the retired sort this one won
      // every single call.
      hand('/platform/agent/Avatar/p1'),
    ];
    const count = new Map<Stuff, number>();
    for (let i = 0; i < 30; i++) {
      const v = house.callFor({ patron, candidates: hands });
      expect(v.ok).toBe(true);
      if (v.ok) count.set(v.chosen, (count.get(v.chosen) ?? 0) + 1);
    }
    expect(count.size).toBe(3);
    for (const h of hands) expect(count.get(h)).toBe(10);
  });

  it('⭐ a new hire gets the NEXT order, not the last one', () => {
    const veteran = hand('/test/agent/veteran');
    house.callFor({ patron, candidates: [veteran] });
    const newHire = hand('/test/agent/new-hire');
    // Never-called sorts first: being new is not a penalty.
    const v = house.callFor({ patron, candidates: [veteran, newHire] });
    expect(v.ok && v.chosen).toBe(newHire);
  });

  it('⚠ ignores regard entirely — a floor has no regulars', () => {
    const fond = hand('/test/agent/fond');
    const other = hand('/test/agent/other');
    (fond as unknown as { regardFor(s: Stuff): number }).regardFor = () => 100;
    (fond as unknown as { recognizes(s: Stuff): boolean }).recognizes = () =>
      true;
    const seen = new Set<Stuff>();
    for (let i = 0; i < 4; i++) {
      const v = house.callFor({ patron, candidates: [fond, other] });
      if (v.ok) seen.add(v.chosen);
    }
    expect(seen.size).toBe(2);
  });
});

describe('regulars — your regular gets you', () => {
  beforeEach(() => house.setCall('regulars'));

  function knows(who: Stuff, recognized: boolean, regard: number): void {
    (who as unknown as { recognizes(s: Stuff): boolean }).recognizes = () =>
      recognized;
    (who as unknown as { regardFor(s: Stuff): number }).regardFor = () =>
      regard;
  }

  it('⭐⭐ picks the candidate who knows the patron best, every time', () => {
    const regular = hand('/test/agent/regular');
    const stranger = hand('/test/agent/stranger');
    knows(regular, true, 40);
    knows(stranger, true, 5);
    for (let i = 0; i < 6; i++) {
      const v = house.callFor({ patron, candidates: [regular, stranger] });
      expect(v.ok && v.chosen).toBe(regular);
    }
    // ⭐ This is the property that makes a patron able to PREDICT who comes
    // over, which is the whole reason the relational leg exists.
  });

  it('⚠ being fond of a STRANGER is not a thing — only candidates who recognize you count', () => {
    const fondButBlind = hand('/test/agent/blind');
    const plain = hand('/test/agent/plain');
    // High regard, but does not recognize this patron: it must not win the
    // regular leg, or a barkeep would greet somebody they have never met
    // as an old friend.
    knows(fondButBlind, false, 90);
    knows(plain, true, 1);
    const v = house.callFor({ patron, candidates: [fondButBlind, plain] });
    expect(v.ok && v.chosen).toBe(plain);
  });

  it('falls through to rotation when nobody knows the patron', () => {
    const a = hand('/test/agent/a');
    const b = hand('/test/agent/b');
    knows(a, false, 0);
    knows(b, false, 0);
    const seen = new Set<Stuff>();
    for (let i = 0; i < 4; i++) {
      const v = house.callFor({ patron, candidates: [a, b] });
      if (v.ok) seen.add(v.chosen);
    }
    expect(seen.size).toBe(2);
  });

  it('⭐ and when two know you equally well, the FREEST one comes', () => {
    const busy = hand('/test/agent/busy');
    const idle = hand('/test/agent/idle');
    knows(busy, true, 10);
    knows(idle, true, 10);
    (busy as unknown as { getEngagements(): unknown[] }).getEngagements =
      () => [{}];
    (idle as unknown as { getEngagements(): unknown[] }).getEngagements =
      () => [];
    for (let i = 0; i < 4; i++) {
      const v = house.callFor({ patron, candidates: [busy, idle] });
      expect(v.ok && v.chosen).toBe(idle);
    }
  });
});

describe('the invariant', () => {
  it('⚠⚠ a single candidate is called without consulting anything', () => {
    house.setCall('regulars');
    const only = hand('/test/agent/only');
    const v = house.callFor({ patron, candidates: [only] });
    expect(v.ok && v.chosen).toBe(only);
  });

  it('⭐⭐⭐ and NO leg reads identity order — the player does not win by sorting', () => {
    house.setCall('rota');
    // `/platform/…` sorts before `/world/…` in every locale. Under the
    // retired `[...able].sort(byIdentityPath)[0]`, the player was served
    // 30 times out of 30.
    const player = hand('/platform/agent/Avatar/aaa');
    const npc = hand('/test/zzz/agent/npc');
    let playerCalls = 0;
    for (let i = 0; i < 10; i++) {
      const v = house.callFor({ patron, candidates: [player, npc] });
      if (v.ok && v.chosen === player) playerCalls++;
    }
    expect(playerCalls).toBe(5);
  });
});
