/**
 * BodyPlan.bodyParts — the typed anatomical structure (the model layer)
 * and its setter validation: unique keys, valid parent edges, a tissues
 * array per part.
 */

import { describe, it, expect, afterEach } from 'vitest';
import BodyPlan, { BodyPart } from '../BodyPlan';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

const VALID: BodyPart[] = [
  {
    key: 'body.torso',
    parent: null,
    tissues: [{ tissuePath: '/lib/material/tissue/bone', mass: 8 }],
  },
  {
    key: 'body.arm.left',
    parent: 'body.torso',
    severable: true,
    tissues: [{ tissuePath: '/lib/material/tissue/muscle', mass: 3 }],
  },
  {
    key: 'body.torso.heart',
    parent: 'body.torso',
    governsVital: 'heartRate',
    tissues: [{ tissuePath: '/lib/material/tissue/muscle', mass: 0.3 }],
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
