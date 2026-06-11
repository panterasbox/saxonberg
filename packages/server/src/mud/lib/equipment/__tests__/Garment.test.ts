/**
 * Garment — the first concrete equippable. Verifies it's a Wearable
 * Thing: carries per-body-plan slot claims and exposes the wearable
 * surface, with Thing's description/containable base intact.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Garment from '../Garment';
import Thing from '../../stuff/Thing';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

const BIPED = '/lib/body-plans/biped';

afterEach(() => StuffApi.clearAll());

describe('Garment', () => {
  it('is a Thing (described, carriable) that is Wearable', () => {
    const g = makeStuff(() => new Garment());
    expect(g).toBeInstanceOf(Thing);
    // Wearable surface present.
    expect(typeof g.getSlotClaims).toBe('function');
    expect(typeof g.getSlotClaim).toBe('function');
    // Visible surface (from Thing) present.
    g.setShortDescription('a crisp white coat');
    expect(g.getShortDescription()).toBe('a crisp white coat');
  });

  it('claims the body-plan slots it is authored with', () => {
    const g = makeStuff(() => new Garment());
    g.setSlotClaims({ [BIPED]: ['torso'] });
    expect(g.getSlotClaim(BIPED)).toEqual(['torso']);
    // Unknown body plan → no claim.
    expect(g.getSlotClaim('/lib/body-plans/quadruped')).toEqual([]);
  });
});
