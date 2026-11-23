/**
 * Body — the expansion (organism-biology D1, S2): modules + instances →
 * the flat part list, keys absolute, shares summing to 1.
 */
import { describe, it, expect } from 'vitest';
import { Body } from '../Body';
import { BodyModule } from '../BodyModule';

const BONE = '/m/bone';
const FLESH = '/m/flesh';

const MODULES: Record<string, BodyModule> = {
  '/bm/torso': new BodyModule('/bm/torso', {
    parts: [
      { key: '', tissues: [{ tissue: FLESH, weight: 0.5 }, { tissue: BONE, weight: 0.1 }] },
      { key: 'heart', parent: '', governs: ['heartRate'], tissues: [{ tissue: FLESH, weight: 0.02 }] },
      { key: 'spine.upper', tissues: [{ tissue: BONE, weight: 0.01 }] },
      { key: 'spine.lower', parent: 'spine.upper', tissues: [{ tissue: BONE, weight: 0.01 }] },
    ],
  }),
  '/bm/leg': new BodyModule('/bm/leg', {
    parts: [{ key: '', severable: true, serves: ['locomotion'], tissues: [{ tissue: BONE, weight: 0.03 }, { tissue: FLESH, weight: 0.06 }] }],
  }),
};
const resolve = (p: string): BodyModule => {
  const m = MODULES[p];
  if (!m) throw new Error(`no module ${p}`);
  return m;
};

describe('Body — the expansion is the constructor', () => {
  const body = new Body(
    {
      modules: [
        { module: '/bm/torso', as: ['body.torso'] },
        { module: '/bm/leg', as: ['body.leg.left', 'body.leg.right'], at: 'body.torso', innervatedBy: ['body.torso.spine.lower'] },
      ],
    },
    resolve,
  );

  it('⭐ keys are absolute: the root takes `as`, inner parts hang under it', () => {
    expect(body.getParts().map((p) => p.key)).toEqual([
      'body.torso', 'body.torso.heart', 'body.torso.spine.upper', 'body.torso.spine.lower',
      'body.leg.left', 'body.leg.right',
    ]);
    expect(body.getPart('body.torso.spine.lower')?.parent).toBe('body.torso.spine.upper');
    expect(body.getPart('body.leg.left')?.parent).toBe('body.torso');
  });

  it('⭐ shares sum to 1 by construction, and equal the authored weights when those already sum to 1', () => {
    const total = body.getParts().reduce((a, p) => a + p.tissues.reduce((b, t) => b + t.share, 0), 0);
    expect(total).toBeCloseTo(1, 12);
    // torso 0.64 + legs 2 × 0.09 = 0.82 → each weight / 0.82
    expect(body.getPart('body.torso')!.tissues[0]!.share).toBeCloseTo(0.5 / 0.82, 12);
  });

  it('an instance\'s supply is its root\'s; a conduit makes the spine interior', () => {
    expect(body.getPart('body.leg.right')?.innervatedBy).toEqual(['body.torso.spine.lower']);
    expect(body.isInterior('body.torso.spine.lower')).toBe(true);
    expect(body.isInterior('body.torso.heart')).toBe(true);
    expect(body.isInterior('body.leg.left')).toBe(false);
  });

  it('a delta adds an instance and scales one; the sum stays 1', () => {
    const grown = new Body(
      { modules: [{ module: '/bm/torso', as: ['body.torso'] }, { module: '/bm/leg', as: ['body.leg.left'], at: 'body.torso' }] },
      resolve,
      [{ add: [{ module: '/bm/leg', as: ['body.leg.right'], at: 'body.torso' }], scale: { 'body.leg.left': 2 } }],
    );
    const total = grown.getParts().reduce((a, p) => a + p.tissues.reduce((b, t) => b + t.share, 0), 0);
    expect(total).toBeCloseTo(1, 12);
    const left = grown.getPart('body.leg.left')!.tissues.reduce((a, t) => a + t.share, 0);
    const right = grown.getPart('body.leg.right')!.tissues.reduce((a, t) => a + t.share, 0);
    expect(left / right).toBeCloseTo(2, 12);
  });

  it('⛔ refuses two instances on one key and an instance hung from nothing', () => {
    expect(() => new Body({ modules: [{ module: '/bm/leg', as: ['body.x', 'body.x'] }] }, resolve)).toThrow(/two parts/);
    expect(() => new Body({ modules: [{ module: '/bm/leg', as: ['body.x'], at: 'body.none' }] }, resolve)).toThrow(/does not have/);
  });

  it('⛔ a module with no root, or a parent it does not declare, throws at parse', () => {
    expect(() => new BodyModule('/x', { parts: [{ key: 'a', tissues: [] }] })).toThrow(/no root/);
    expect(() => new BodyModule('/x', { parts: [{ key: '', tissues: [] }, { key: 'a', parent: 'b', tissues: [] }] })).toThrow(/parent 'b'/);
  });
});
