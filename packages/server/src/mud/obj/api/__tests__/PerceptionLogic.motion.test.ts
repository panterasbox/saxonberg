/**
 * Motion-degrades — the observer-side of the care↔speed axis (Phase 3).
 * `PerceptionApi.motionExposure(mode)` returns the concealment bands a move
 * strips from a hiding mover; `HidingMixin.degradeHide` applies it. These
 * two calls, in this order, are exactly what `Mobile.traverse` runs after a
 * move — so the tests simulate a crossing faithfully without standing up a
 * two-room graph (the end-to-end traverse is the Phase 7 demonstrator).
 *
 * The proof: a `sneak` holds concealment, a `walk` degrades it (a
 * mid-perception onlooker who couldn't see the hider now can), a `run`
 * clears hiding outright. Deterministic — no RNG.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { PerceptionApi } from '../../../api/perception';
import { HidingMixin } from '../../../lib/concealment/Hiding';
import { ConcealableMixin } from '../../../lib/concealment/Concealable';
import { BeliefStoreMixin } from '../../../lib/belief/BeliefStore';
import { Idea } from '../../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

class Hider extends HidingMixin(ConcealableMixin(Idea)) {}
class Seeker extends BeliefStoreMixin(Idea) {}

let counter = 0;
function makeHider(level: 'subtle' | 'hidden' | 'deep' | 'buried'): Hider {
  const h = makeStuffAtPath(() => new Hider(), `/obj/test/mover-${counter++}`);
  h.enterHide(level);
  return h;
}
/** Mirror the exact Mobile.traverse post-move call. */
function crossAtMode(h: Hider, mode: string): void {
  h.degradeHide(PerceptionApi.motionExposure(mode));
}

describe('motionExposure — the per-mode band strip', () => {
  it('sneak holds, walk degrades one, run clears (a large count)', () => {
    expect(PerceptionApi.motionExposure('sneak')).toBe(0);
    expect(PerceptionApi.motionExposure('walk')).toBe(1);
    expect(PerceptionApi.motionExposure('run')).toBeGreaterThanOrEqual(4);
    // Any non-care↔speed mode degrades like a walk.
    expect(PerceptionApi.motionExposure('climb')).toBe(1);
  });
});

describe('a hiding mover crossing a room', () => {
  it('sneaking holds the concealment band', () => {
    const h = makeHider('deep');
    crossAtMode(h, 'sneak');
    expect(h.isHiding()).toBe(true);
    expect(h.getConcealment()).toBe('deep');
  });

  it('walking degrades a band — a mid-perception onlooker now sees them', () => {
    const h = makeHider('hidden'); // requirement 4
    const watcher = makeSeeker();
    // Before: a mid onlooker (attention 3) can't pierce `hidden` (req 4).
    expect(PerceptionApi.perceives(watcher, h, 3)).toBe(false);
    crossAtMode(h, 'walk'); // hidden → subtle (req 2)
    expect(h.isHiding()).toBe(true);
    expect(h.getConcealment()).toBe('subtle');
    // After: the same onlooker now pierces `subtle`.
    expect(PerceptionApi.perceives(watcher, h, 3)).toBe(true);
  });

  it('running clears hiding outright (you can\'t sprint unseen)', () => {
    const h = makeHider('buried'); // the deepest band
    crossAtMode(h, 'run');
    expect(h.isHiding()).toBe(false);
    expect(h.getConcealment()).toBe('obvious'); // fully present again
  });

  it('a walk that drops past the floor breaks hiding', () => {
    const h = makeHider('subtle'); // one band above obvious
    crossAtMode(h, 'walk'); // subtle → obvious → breakHide
    expect(h.isHiding()).toBe(false);
  });
});

function makeSeeker(): Seeker {
  return makeStuff(() => new Seeker());
}
