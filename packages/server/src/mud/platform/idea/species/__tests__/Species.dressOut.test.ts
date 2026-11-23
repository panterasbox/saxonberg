/**
 * ⭐⭐ `Species.dressOut` — the one yield arithmetic (organism-biology D5).
 *
 * What comes off a carcass derives from its body: each line CLAIMS
 * materials, and its mass is their share of the body over the parts still
 * on it × the live weight × the finish (condition) — or no finish at all
 * for a line that is the size the animal IS (a hide, the bones). A cut
 * comes off in as many pieces as parts carry it, or as many portions as its
 * mass makes; a coat is kept at any weight. These pin the law, not a species.
 *
 * ⚠ The butcher's skill and the floor of one piece belong where the band is
 * read (the hand), not here (the animal).
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Species from '../Species';
import type { DressLine } from '../Species';
import BodyPlan from '../BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { setFlatParts } from '../../../../lib/species/__tests__/flat-body';

const LOIN = '/stuff/idea/material/tissue/muscles/loin';
const SHANK = '/stuff/idea/material/tissue/muscles/shank';
const BONE = '/stuff/idea/material/tissue/bone';

afterEach(() => StuffApi.clearAll());

function species(): Species {
  const plan = makeStuffAtPath(() => new BodyPlan(), '/stuff/idea/species/BodyPlan/_test-dress');
  setFlatParts(plan, [
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: LOIN, share: 0.4 }, { tissuePath: BONE, share: 0.2 }] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [{ tissuePath: SHANK, share: 0.2 }] },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [{ tissuePath: SHANK, share: 0.2 }] },
  ]);
  const s = makeStuff(() => new Species());
  s._bodyPlanPath = '/stuff/idea/species/BodyPlan/_test-dress';
  return s;
}

const line = (over: Partial<DressLine>): DressLine => ({
  row: '/x/row',
  claims: [],
  parts: 1,
  portionKg: null,
  conditioned: true,
  ...over,
});

describe('Species.dressOut — the derived law', () => {
  it('⭐ mass = the claim\'s share × live weight × finish', () => {
    const s = species();
    const [loin] = s.dressOut({ liveKg: 100, fleshPct: 120, lines: [line({ claims: [LOIN] })], body: s.bodyFor()! });
    // finish clamps to 1 for a fat beast: 0.4 × 100.
    expect(loin!.kgEach).toBeCloseTo(40, 6);
  });

  it('⭐ a hide and a skeleton are the size the animal IS: condition does not scale them', () => {
    const s = species();
    const thin = s.dressOut({ liveKg: 100, fleshPct: 20, lines: [line({ claims: [BONE], conditioned: false })], body: s.bodyFor()! });
    expect(thin[0]!.kgEach).toBeCloseTo(20, 6);
    const thinLoin = s.dressOut({ liveKg: 100, fleshPct: 20, lines: [line({ claims: [LOIN] })], body: s.bodyFor()! });
    expect(thinLoin[0]!.kgEach).toBeLessThan(40);
  });

  it('⭐ a cut comes off each part carrying it, or in portions when it is heavier', () => {
    const s = species();
    const [shank] = s.dressOut({ liveKg: 100, fleshPct: 120, lines: [line({ claims: [SHANK], parts: 2 })], body: s.bodyFor()! });
    expect(shank!.units).toBe(2);
    const [portioned] = s.dressOut({ liveKg: 100, fleshPct: 120, lines: [line({ claims: [SHANK], parts: 2, portionKg: 5 })], body: s.bodyFor()! });
    expect(portioned!.units).toBe(8);
  });

  it('⭐ a part no longer on the body takes its share with it', () => {
    const s = species();
    const present = (k: string): boolean => k !== 'body.leg.right';
    const [shank] = s.dressOut({ liveKg: 100, fleshPct: 120, lines: [line({ claims: [SHANK] })], body: s.bodyFor()!, present });
    expect(shank!.kgEach).toBeCloseTo(20, 6);
  });

  it('nothing claimed, nothing comes off — and a coat is kept at any weight', () => {
    const s = species();
    expect(s.dressOut({ liveKg: 100, lines: [line({ claims: ['/no/such'] })], body: s.bodyFor()! })).toEqual([]);
    const [down] = s.dressOut({ liveKg: 1, lines: [line({ claims: [], coatKg: 0.0007, conditioned: false })], body: s.bodyFor()! });
    expect(down!.kgEach).toBe(0.001);
  });
});
