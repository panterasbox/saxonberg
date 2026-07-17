/**
 * Detection resolution (Phase 2) — the concealment gate on
 * `PerceptionApi`. Asserts:
 *   - backcompat: a non-concealable / `obvious` target is always perceived;
 *   - the level ladder: attention meets each band's requirement (subtle 2,
 *     hidden 4, deep 7, buried 11 — the seeded-literal dial fallbacks);
 *   - determinism: same inputs → same result, more attention finds
 *     monotonically more, and repeating past the ceiling never flips (the
 *     anti-slots proof — no RNG);
 *   - discovery short-circuit: a found target is perceived regardless of
 *     attention.
 *
 * Capacity rides the cold `awareness` band (floor rank 0 → 0) since the
 * band snapshot is never warmed here, and the viewer is not a
 * Sensor/Perception so light conditions are 0 — so effective perception is
 * exactly `attention`, and the ladder is a clean function of it.
 */

import { describe, it, expect } from 'vitest';
import { PerceptionApi } from '../../../api/perception';
import type { ConcealmentLevel } from '../../../lib/concealment/ConcealmentLevel';
import { ConcealableMixin } from '../../../lib/concealment/Concealable';
import { BeliefStoreMixin } from '../../../lib/belief/BeliefStore';
import { Idea } from '../../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

// A viewer that keeps a belief store (for the discovery realm), but is not
// a Sensor/Perception — so the light-conditions term is a clean 0.
class Seeker extends BeliefStoreMixin(Idea) {}

// A concealable perceivable (a hidden cache / secret door stand-in).
class Cache extends ConcealableMixin(Idea) {}

let counter = 0;
function makeCache(level: ConcealmentLevel): Cache {
  const c = makeStuffAtPath(() => new Cache(), `/obj/test/cache-${counter++}`);
  c.setConcealment(level);
  return c;
}

function makeSeeker(): Seeker {
  return makeStuff(() => new Seeker());
}

describe('PerceptionApi detection gate — backcompat', () => {
  it('a non-concealable target is always perceived', () => {
    const viewer = makeSeeker();
    const plain = makeStuffAtPath(() => new Idea(), `/obj/test/plain-${counter++}`);
    expect(PerceptionApi.perceives(viewer, plain)).toBe(true);
    expect(PerceptionApi.perceives(viewer, plain, 0)).toBe(true);
  });

  it('an obvious concealable target is always perceived', () => {
    const viewer = makeSeeker();
    const c = makeCache('obvious');
    expect(PerceptionApi.perceives(viewer, c, 0)).toBe(true);
  });
});

describe('PerceptionApi detection gate — the level ladder', () => {
  const cases: Array<{ level: ConcealmentLevel; req: number }> = [
    { level: 'subtle', req: 2 },
    { level: 'hidden', req: 4 },
    { level: 'deep', req: 7 },
    { level: 'buried', req: 11 },
  ];

  for (const { level, req } of cases) {
    it(`${level}: attention >= ${req} perceives, below fails`, () => {
      const viewer = makeSeeker();
      const c = makeCache(level);
      expect(PerceptionApi.effectivePerception(viewer, c, req)).toBe(req);
      expect(PerceptionApi.perceives(viewer, c, req)).toBe(true);
      expect(PerceptionApi.perceives(viewer, c, req - 1)).toBe(false);
      // A passive glance (default baseline 0) never pierces a concealed band.
      expect(PerceptionApi.perceives(viewer, c)).toBe(false);
    });
  }
});

describe('PerceptionApi detection gate — determinism (poker, not slots)', () => {
  it('same inputs yield the same result, repeatedly', () => {
    const viewer = makeSeeker();
    const c = makeCache('hidden'); // req 4
    for (let i = 0; i < 20; i++) {
      expect(PerceptionApi.perceives(viewer, c, 3)).toBe(false);
      expect(PerceptionApi.perceives(viewer, c, 4)).toBe(true);
    }
  });

  it('more attention finds monotonically more (never flips true→false)', () => {
    const viewer = makeSeeker();
    const c = makeCache('deep'); // req 7
    let everSeen = false;
    for (let attention = 0; attention <= 12; attention++) {
      const seen = PerceptionApi.perceives(viewer, c, attention);
      if (everSeen) expect(seen).toBe(true); // monotone: once true, stays true
      if (seen) everSeen = true;
    }
    expect(everSeen).toBe(true);
  });

  it('repeating past the ceiling never flips the outcome', () => {
    const viewer = makeSeeker();
    const c = makeCache('buried'); // req 11
    // Well above the ceiling — always true, every call.
    for (let i = 0; i < 10; i++) {
      expect(PerceptionApi.perceives(viewer, c, 100)).toBe(true);
    }
    // Well below — always false, every call.
    for (let i = 0; i < 10; i++) {
      expect(PerceptionApi.perceives(viewer, c, 0)).toBe(false);
    }
  });
});

describe('PerceptionApi detection gate — discovery short-circuit', () => {
  it('a discovered target is perceived regardless of attention', () => {
    const viewer = makeSeeker();
    const c = makeCache('buried'); // req 11 — unreachable passively
    expect(PerceptionApi.perceives(viewer, c, 0)).toBe(false);
    expect(PerceptionApi.hasDiscovered(viewer, c)).toBe(false);

    PerceptionApi.recordDiscovery(viewer, c);

    expect(PerceptionApi.hasDiscovered(viewer, c)).toBe(true);
    expect(PerceptionApi.perceives(viewer, c, 0)).toBe(true);
    expect(PerceptionApi.perceives(viewer, c)).toBe(true);
  });

  it('recordDiscovery is idempotent (still perceived after a repeat)', () => {
    const viewer = makeSeeker();
    const c = makeCache('hidden');
    PerceptionApi.recordDiscovery(viewer, c);
    PerceptionApi.recordDiscovery(viewer, c);
    expect(PerceptionApi.hasDiscovered(viewer, c)).toBe(true);
    expect(PerceptionApi.perceives(viewer, c, 0)).toBe(true);
  });
});

describe('PerceptionApi.hintsFor', () => {
  it('surfaces a nearly-perceived concealed thing, not a far one', () => {
    const viewer = makeSeeker();
    const subtle = makeCache('subtle'); // req 2, gap 2 at attention 0
    const buried = makeCache('buried'); // req 11, gap 11 — too far
    const obvious = makeCache('obvious'); // not concealed — never a hint
    const hints = PerceptionApi.hintsFor(viewer, [subtle, buried, obvious]);
    const ids = hints.map((h) => h.stuffId);
    expect(ids).toContain(subtle.stuffId);
    expect(ids).not.toContain(buried.stuffId);
    expect(ids).not.toContain(obvious.stuffId);
  });

  it('a discovered thing is not a hint (it is already found)', () => {
    const viewer = makeSeeker();
    const subtle = makeCache('subtle');
    PerceptionApi.recordDiscovery(viewer, subtle);
    expect(PerceptionApi.hintsFor(viewer, [subtle])).toHaveLength(0);
  });
});
