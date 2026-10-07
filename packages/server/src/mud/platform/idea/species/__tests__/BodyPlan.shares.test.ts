/**
 * Tissue shares — the field, its range, and the law `partArea` keeps.
 *
 * ⭐⭐⭐ **A tissue states a SHARE of the whole body, not kilograms, so
 * one plan serves every size of animal.** `quadruped` is named by sheep,
 * cattle, dogs, cats and horses; `avian` by a 20 g canary and a 2 kg hen.
 * Absolute masses made that a lie — a bullock claimed the same 28 kg
 * torso as a ewe, and `avian`'s canary-sized 4 g of torso bone is why
 * nothing else could reuse it.
 *
 * ⚠ The whole-row invariant (shares sum to 1) is `lint:anatomy`'s, over
 * shipped content. This file is its twin inside the suite plus the
 * per-field checks the setter owns, because a gate nobody runs locally
 * and a test nobody reads in CI fail in opposite directions.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import BodyPlan from '../../species/BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

const MUSCLE = '/stuff/idea/material/tissue/muscle';
const BONE = '/stuff/idea/material/tissue/bone';

function plan(): BodyPlan {
  const p = makeStuff(() => new BodyPlan());
  p.setName('test-shares');
  return p;
}

describe('TissueComposition.share — the per-field contract', () => {
  it('⭐ accepts a share in (0, 1]', () => {
    const p = plan();
    expect(() =>
      p.setBodyParts([
        { key: 'body.torso', parent: null, tissues: [{ tissuePath: MUSCLE, share: 0.6 }] },
        { key: 'body.head', parent: 'body.torso', tissues: [{ tissuePath: BONE, share: 0.4 }] },
      ]),
    ).not.toThrow();
  });

  it('⚠⚠ refuses a tissue that still authors `mass`, BY NAME', () => {
    const p = plan();
    expect(() =>
      p.setBodyParts([
        {
          key: 'body.torso',
          parent: null,
          // The dead key. A row left on kilograms would otherwise read as
          // a share of 12 — silently enormous — so the error names it.
          tissues: [{ tissuePath: MUSCLE, mass: 12 } as never],
        },
      ]),
    ).toThrow(/authors 'mass'/);
  });

  it('⚠ refuses a share outside (0, 1]', () => {
    const p = plan();
    for (const bad of [0, -0.5, 1.5, 10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        p.setBodyParts([
          {
            key: 'body.torso',
            parent: null,
            tissues: [{ tissuePath: MUSCLE, share: bad }],
          },
        ]),
      ).toThrow(/is not a finite number in \(0, 1\]/);
    }
  });
});

describe('partArea — Meeh\'s law over shares', () => {
  it('⭐ keeps its ORDERING, which is what the depth ladder reads', () => {
    const p = plan();
    p.setBodyParts([
      { key: 'body.torso', parent: null, tissues: [{ tissuePath: MUSCLE, share: 0.5 }] },
      { key: 'body.torso.liver', parent: 'body.torso', governs: ['clearance'], tissues: [{ tissuePath: MUSCLE, share: 0.3 }] },
      { key: 'body.torso.heart', parent: 'body.torso', governs: ['heartRate'], tissues: [{ tissuePath: MUSCLE, share: 0.2 }] },
    ]);
    // A bigger organ presents more cross-section, which is WHY a blow
    // meets it first — so the order is the whole point, not the value.
    expect(p.partArea('body.torso')).toBeGreaterThan(p.partArea('body.torso.liver'));
    expect(p.partArea('body.torso.liver')).toBeGreaterThan(p.partArea('body.torso.heart'));
  });

  it('⭐⭐ is SCALE-FREE — the same topology answers for a canary and an ox', () => {
    // The point of the whole change: two plans with identical proportions
    // and wildly different animals behind them give the same areas,
    // because the plan no longer carries a size at all.
    const canary = plan();
    const ox = plan();
    for (const p of [canary, ox]) {
      p.setBodyParts([
        { key: 'body.torso', parent: null, tissues: [{ tissuePath: MUSCLE, share: 0.7 }] },
        { key: 'body.head', parent: 'body.torso', tissues: [{ tissuePath: BONE, share: 0.3 }] },
      ]);
    }
    expect(ox.partArea('body.torso')).toBeCloseTo(canary.partArea('body.torso'), 12);
    expect(ox.getPartSurfaceFraction('body.head')).toBeCloseTo(
      canary.getPartSurfaceFraction('body.head'),
      12,
    );
  });

  it('answers 0 for an unknown part and for one with no tissues', () => {
    const p = plan();
    p.setBodyParts([{ key: 'body.torso', parent: null, tissues: [] }]);
    expect(p.partArea('body.torso')).toBe(0);
    expect(p.partArea('body.nonesuch')).toBe(0);
  });
});
