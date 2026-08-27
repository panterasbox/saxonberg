/**
 * The hider's derived level + per-observer resolution (Phase 2). Asserts:
 *   - `hideLevelFor` is deterministic and monotone in competence (and in
 *     stillness — a low posture crosses a band threshold);
 *   - a hiding actor resolves **per observer** through the shipped gate — a
 *     high-perception observer perceives them, a low one does not (same
 *     scene);
 *   - attacking / unhiding (breakHide) reveals them to everyone;
 *   - an active `search` that beats the level reveals them in the moment
 *     (`resolveSearch` found list) but does NOT stick (no durable discovery
 *     while hiding) — re-hiding is a fresh contest.
 *
 * Observer perception is modeled via the explicit `attention` argument (a
 * high- vs low-perception onlooker), so no DB / band warming is needed —
 * capacity rides the cold floor band and the viewer isn't a Sensor, so
 * effective perception is exactly the attention passed.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { PerceptionApi } from '../../../../api/perception';
import type { CompetenceBandName } from '../../../../lib/advancement/CompetenceBand';
import { ConcealmentLevels } from '../../../../lib/concealment/ConcealmentLevel';
import { HidingMixin } from '../../../../lib/concealment/Hiding';
import { ConcealableMixin } from '../../../../lib/concealment/Concealable';
import { PosedMixin } from '../../../../lib/character/Posed';
import { BeliefStoreMixin } from '../../../../lib/belief/BeliefStore';
import { Idea } from '../../../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';

// A hider that can also take a posture (for the stillness term).
class Hider extends HidingMixin(ConcealableMixin(PosedMixin(Idea))) {}
// A viewer that holds a belief store (discovery realm) but isn't a
// Sensor/Perception, so light conditions are a clean 0.
class Seeker extends BeliefStoreMixin(Idea) {}

let counter = 0;
function makeHider(): Hider {
  return makeStuffAtPath(() => new Hider(), `/obj/test/hider-${counter++}`);
}
function makeSeeker(): Seeker {
  return makeStuff(() => new Seeker());
}

describe('hideLevelFor — deterministic derivation', () => {
  it('is monotone non-decreasing in stealth competence', () => {
    const h = makeHider();
    const bands: CompetenceBandName[] = [
      'untrained',
      'novice',
      'competent',
      'proficient',
      'expert',
    ];
    const ranks = bands.map((b) =>
      ConcealmentLevels.rankOf(PerceptionApi.hideLevelFor(h, b)),
    );
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
    }
    // Concrete anchors (the seeded dials): competent → hidden, expert → deep.
    expect(PerceptionApi.hideLevelFor(h, 'competent')).toBe('hidden');
    expect(PerceptionApi.hideLevelFor(h, 'expert')).toBe('deep');
  });

  it('a low, still posture raises the level (crosses a band threshold)', () => {
    const standing = makeHider();
    const still = makeHider();
    still.setPosture('sit');
    // proficient standing → score 6 → hidden; sitting → +1 = 7 → deep.
    expect(PerceptionApi.hideLevelFor(standing, 'proficient')).toBe('hidden');
    expect(PerceptionApi.hideLevelFor(still, 'proficient')).toBe('deep');
  });

  it('is repeatable (no RNG)', () => {
    const h = makeHider();
    for (let i = 0; i < 10; i++) {
      expect(PerceptionApi.hideLevelFor(h, 'competent')).toBe('hidden');
    }
  });
});

describe('a hiding actor resolves per-observer', () => {
  it('a high-perception observer perceives, a low one does not', () => {
    const hider = makeHider();
    hider.enterHide('hidden'); // requirement 4
    const watcher = makeSeeker();
    expect(PerceptionApi.perceives(watcher, hider, 4)).toBe(true); // sharp
    expect(PerceptionApi.perceives(watcher, hider, 3)).toBe(false); // dull
  });

  it('is perceived by everyone once it unhides (attacking/reveal breaks it)', () => {
    const hider = makeHider();
    hider.enterHide('deep');
    const watcher = makeSeeker();
    expect(PerceptionApi.perceives(watcher, hider, 0)).toBe(false);
    hider.breakHide(); // the "attacking reveals you" / unhide path
    expect(PerceptionApi.perceives(watcher, hider, 0)).toBe(true);
  });
});

describe('search reveals a hider in the moment but does not stick', () => {
  it('resolveSearch that beats the level finds the hider, non-sticky', () => {
    const hider = makeHider();
    hider.enterHide('hidden'); // req 4; broad search bonus = 4 → beats it
    const searcher = makeSeeker();

    const found = PerceptionApi.resolveSearch(searcher, [hider], 'broad');
    expect(found).toContain(hider);

    // Non-sticky: no durable discovery recorded while hiding, so a passive
    // dull glance still fails afterward (re-hide is a fresh contest).
    expect(PerceptionApi.hasDiscovered(searcher, hider)).toBe(false);
    expect(PerceptionApi.perceives(searcher, hider, 3)).toBe(false);
  });
});
