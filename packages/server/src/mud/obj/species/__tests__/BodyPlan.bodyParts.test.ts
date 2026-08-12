/**
 * BodyPlan.bodyParts — the typed anatomical structure (the model layer)
 * and its setter validation: unique keys, valid parent edges, a tissues
 * array per part.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import BodyPlan, { BodyPart } from '../BodyPlan';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

const VALID: BodyPart[] = [
  {
    key: 'body.torso',
    parent: null,
    tissues: [{ tissuePath: '/obj/material/tissue/bone', mass: 8 }],
  },
  {
    key: 'body.arm.left',
    parent: 'body.torso',
    severable: true,
    tissues: [{ tissuePath: '/obj/material/tissue/muscle', mass: 3 }],
  },
  {
    key: 'body.torso.heart',
    parent: 'body.torso',
    governsVital: 'heartRate',
    tissues: [{ tissuePath: '/obj/material/tissue/muscle', mass: 0.3 }],
  },
];

describe('BodyPlan.bodyParts', () => {
  afterEach(() => StuffApi.clearAll());

  it('accepts a valid part tree and round-trips it', () => {
    const plan = makeStuff(() => new BodyPlan());
    plan.setBodyParts(VALID);
    expect(plan.getBodyParts().map((p) => p.key)).toEqual([
      'body.torso',
      'body.arm.left',
      'body.torso.heart',
    ]);
  });

  it('rejects a duplicate key', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      plan.setBodyParts([
        { key: 'body.torso', parent: null, tissues: [] },
        { key: 'body.torso', parent: null, tissues: [] },
      ]),
    ).toThrow(/duplicate key/);
  });

  it('rejects a parent edge that names no known part', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      plan.setBodyParts([
        { key: 'body.arm.left', parent: 'body.torso', tissues: [] },
      ]),
    ).toThrow(/is not a known part/);
  });

  it('rejects a part missing its tissues array', () => {
    const plan = makeStuff(() => new BodyPlan());
    expect(() =>
      plan.setBodyParts([
        { key: 'body.torso', parent: null } as unknown as BodyPart,
      ]),
    ).toThrow(/missing 'tissues'/);
  });
});

describe('BodyPlan — slot↔part relations (C)', () => {
  afterEach(() => StuffApi.clearAll());

  it('queries slots by the part they attach at / cover', () => {
    const plan = makeStuff(() => new BodyPlan());
    plan.setBodyParts(VALID);
    plan.setSlots([
      { name: 'grip', accepts: 'WieldableMixin', bodyPart: 'body.arm.left' },
      { name: 'shirt', accepts: 'WearableMixin', covers: ['body.torso'] },
      // Non-anatomical affordance — neither bodyPart nor covers.
      { name: 'saddle', accepts: 'SlottableMixin' },
    ]);
    expect(plan.getSlotsAt('body.arm.left').map((s) => s.name)).toEqual(['grip']);
    expect(plan.getSlotsCovering('body.torso').map((s) => s.name)).toEqual([
      'shirt',
    ]);
    expect(plan.getSlotsAt('body.torso')).toHaveLength(0);
  });

  it('rejects a slot bodyPart / covers that names no known part', () => {
    const plan = makeStuff(() => new BodyPlan());
    plan.setBodyParts(VALID);
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
    plan.setBodyParts(VALID); // body.arm.left present → ok
    expect(plan.getSlotsAt('body.arm.left')).toHaveLength(1);
    // Re-set parts WITHOUT body.arm.left → the existing slot ref dangles.
    expect(() =>
      plan.setBodyParts([{ key: 'body.torso', parent: null, tissues: [] }]),
    ).toThrow(/is not a known part/);
  });
});
