/**
 * Condition type system — the closed TraumaType + TRAUMA_BEHAVIOR table
 * skeleton (no-op exemplar, no live behavior), and the Kind-A Condition
 * Idea template. Shapes only; zero authored content.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  TRAUMA_BEHAVIOR,
  NOOP_BEHAVIOR,
  type TraumaType,
  type Trauma,
} from '../ActiveCondition';
import Condition from '../Condition';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

const ALL_TRAUMA: TraumaType[] = [
  'laceration',
  'fracture',
  'contusion',
  'avulsion',
  'burn',
];

describe('TRAUMA_BEHAVIOR table', () => {
  it('has an entry for every TraumaType', () => {
    for (const t of ALL_TRAUMA) {
      expect(TRAUMA_BEHAVIOR[t]).toBeDefined();
    }
  });

  it('v1 ships the no-op exemplar for every type (no live behavior)', () => {
    for (const t of ALL_TRAUMA) {
      expect(TRAUMA_BEHAVIOR[t]).toBe(NOOP_BEHAVIOR);
    }
  });

  it('describe emits plain (type, site) prose', () => {
    const t: Trauma = {
      kind: 'trauma',
      type: 'laceration',
      site: 'body.leg.left',
      severity: 0.6,
    };
    expect(TRAUMA_BEHAVIOR.laceration.describe(t)).toBe(
      'laceration of body.leg.left',
    );
  });

  it('no-op onset/tick/resolve do nothing and do not throw', () => {
    const t: Trauma = {
      kind: 'trauma',
      type: 'fracture',
      site: 'body.arm.left',
      severity: 0.5,
    };
    const host = {} as never;
    expect(() => {
      NOOP_BEHAVIOR.onset(host, t);
      NOOP_BEHAVIOR.tick(host, t);
      NOOP_BEHAVIOR.resolve(host, t);
    }).not.toThrow();
  });
});

describe('Condition Idea template (Kind A)', () => {
  afterEach(() => StuffApi.clearAll());

  it('compiles + round-trips its authored fields', () => {
    const cond = makeStuff(() => new Condition());
    cond.setName('influenza');
    cond.setObservableSigns(['flushed', 'feverish']);
    expect(cond.getName()).toBe('influenza');
    expect(cond.getObservableSigns()).toEqual(['flushed', 'feverish']);
  });
});
