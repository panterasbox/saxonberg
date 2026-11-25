/**
 * BodyPlan.bodyParts — the typed anatomical structure (the model layer)
 * and its setter validation: unique keys, valid parent edges, a tissues
 * array per part.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import BodyPlan, { BodyPart } from '../BodyPlan';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { setFlatParts } from '../../../../lib/species/__tests__/flat-body';

const VALID: BodyPart[] = [
  {
    key: 'body.torso',
    parent: null,
    tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', share: 0.707965 }],
  },
  {
    key: 'body.arm.left',
    parent: 'body.torso',
    severable: true,
    tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', share: 0.265487 }],
  },
  {
    key: 'body.torso.heart',
    parent: 'body.torso',
    governs: ['heartRate'],
    tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', share: 0.026549 }],
  },
];

describe('BodyPlan.bodyParts', () => {
  afterEach(() => StuffApi.clearAll());

  it('accepts a valid part tree and round-trips it', () => {
    const plan = makeStuff(() => new BodyPlan());
    setFlatParts(plan, VALID);
    expect(plan.getBody().getParts().map((p) => p.key)).toEqual([
      'body.torso',
      'body.arm.left',
      'body.torso.heart',
    ]);
  });

  it('rejects a duplicate key', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      setFlatParts(plan, [
        { key: 'body.torso', parent: null, tissues: [] },
        { key: 'body.torso', parent: null, tissues: [] },
      ]),
    ).toThrow(/two parts expand to the key 'body.torso'/);
  });

  it('rejects a parent edge that names no known part', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      setFlatParts(plan, [
        { key: 'body.arm.left', parent: 'body.torso', tissues: [] },
      ]),
    ).toThrow(/which this body does not have/);
  });

  it('⭐ W1: a part with no tissues is a weightless part, not an error', () => {
    // A tree's sapwood carries a gland and no mass of its own (D2); a
    // module part's tissues default to none.
    const plan = makeStuff(() => new BodyPlan());
    setFlatParts(plan, [{ key: 'body.torso', parent: null } as unknown as BodyPart]);
    expect(plan.getBody().getPart('body.torso')?.tissues).toEqual([]);
  });
});

describe('BodyPlan — slot↔part relations (C)', () => {
  afterEach(() => StuffApi.clearAll());

  it('queries slots by the part they attach at / cover', () => {
    const plan = makeStuff(() => new BodyPlan());
    setFlatParts(plan, VALID);
    plan.setSlots([
      { name: 'grip', accepts: 'WieldableMixin', bodyPart: 'body.arm.left' },
      { name: 'shirt', accepts: 'WearableMixin', covers: ['body.torso'] },
      // Non-anatomical affordance — neither bodyPart nor covers.
      { name: 'saddle', accepts: 'SlottableMixin' },
    ]);
    expect(plan.getBody().getSlotsAt('body.arm.left').map((s) => s.name)).toEqual(['grip']);
    expect(plan.getBody().getSlotsCovering('body.torso').map((s) => s.name)).toEqual([
      'shirt',
    ]);
    expect(plan.getBody().getSlotsAt('body.torso')).toHaveLength(0);
  });

  it('rejects a slot bodyPart / covers that names no known part', () => {
    const plan = makeStuff(() => new BodyPlan());
    setFlatParts(plan, VALID);
    expect(() =>
      plan.setSlots([
        { name: 'x', accepts: 'WearableMixin', bodyPart: 'body.tail' },
      ]),
    ).toThrow(/is not a known part/);
    expect(() =>
      plan.setSlots([
        { name: 'x', accepts: 'WearableMixin', covers: ['body.wing'] },
      ]),
    ).toThrow(/covers unknown part/);
  });

  it('catches a dangling reference regardless of set order', () => {
    const plan = makeStuff(() => new BodyPlan());
    // Slots first (no parts yet → lenient), then parts validate them.
    plan.setSlots([
      { name: 'grip', accepts: 'WieldableMixin', bodyPart: 'body.arm.left' },
    ]);
    setFlatParts(plan, VALID); // body.arm.left present → ok
    expect(plan.getBody().getSlotsAt('body.arm.left')).toHaveLength(1);
    // Re-set parts WITHOUT body.arm.left → the existing slot ref dangles.
    expect(() =>
      setFlatParts(plan, [{ key: 'body.torso', parent: null, tissues: [] }]),
    ).toThrow(/is not a known part/);
  });
});
