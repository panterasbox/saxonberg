/**
 * Condition type system — the closed TraumaType + TRAUMA_BEHAVIOR table
 * skeleton (no-op exemplar, no live behavior), and the Kind-A Condition
 * Idea template. Shapes only; zero authored content.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Condition, {
  TRAUMA_BEHAVIOR,
  NOOP_BEHAVIOR,
  type TraumaType,
  type Trauma,
} from '../Condition';
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

  it('every entry carries the full strategy surface', () => {
    // The harm build fills the table with live behavior; the roster stays
    // total and closed (the NOOP exemplar is the fallback shape).
    for (const t of ALL_TRAUMA) {
      const b = TRAUMA_BEHAVIOR[t];
      expect(typeof b.onset).toBe('function');
      expect(typeof b.tick).toBe('function');
      expect(typeof b.resolve).toBe('function');
      expect(typeof b.reopen).toBe('function');
      expect(typeof b.describe).toBe('function');
    }
  });

  it('the laceration describe phrases by dressed / bleeding / clotted', () => {
    const t: Trauma = {
      kind: 'trauma',
      type: 'laceration',
      site: 'body.leg.left',
      severity: 0.6,
      bleeding: true,
    };
    expect(TRAUMA_BEHAVIOR.laceration.describe(t)).toBe(
      'a bleeding laceration on body.leg.left',
    );
    t.bleeding = false;
    t.dressed = true;
    expect(TRAUMA_BEHAVIOR.laceration.describe(t)).toContain('dressed');
  });

  it('the NOOP exemplar tolerates onset/tick/resolve/reopen calls', () => {
    const t: Trauma = {
      kind: 'trauma',
      type: 'fracture',
      site: 'body.arm.left',
      severity: 0.5,
    };
    const host = {} as never;
    expect(() => {
      NOOP_BEHAVIOR.onset(host, t);
      NOOP_BEHAVIOR.tick(host, t, 1);
      NOOP_BEHAVIOR.resolve(host, t);
      NOOP_BEHAVIOR.reopen(host, t);
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
