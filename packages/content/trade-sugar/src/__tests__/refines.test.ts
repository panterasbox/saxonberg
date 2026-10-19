/**
 * The refiner does the next thing a boiler would, one verb per beat
 * (sugar D19) — and never `boil`.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { brain } from '../behavior/refines';
import type Copper from '../thing/Copper';

const copper = {} as Copper;
const base = {
  copper,
  onFire: false,
  archLit: false,
  archFuelled: false,
  liquor: 'empty' as const,
  limed: 0,
  skimmed: false,
  block: true,
  lime: true,
  fuel: true,
};

describe('refines — one act per beat', () => {
  it('walks the batch in order', () => {
    const steps: string[] = [];
    let f: Parameters<typeof brain.next>[0] = { ...base };
    const apply: Record<string, (x: typeof f) => typeof f> = {
      pour: (x) => ({ ...x, liquor: 'water' }),
      put: (x) => ({ ...x, liquor: 'liquor' }),
      temper: (x) => ({ ...x, limed: 1 }),
      skim: (x) => ({ ...x, skimmed: true }),
      stoke: (x) => ({ ...x, archFuelled: true }),
      light: (x) => ({ ...x, archLit: true }),
      heat: (x) => ({ ...x, onFire: true }),
    };
    for (let i = 0; i < 10; i++) {
      const verb = brain.next(f);
      if (verb === null) break;
      steps.push(verb);
      f = apply[verb.split(' ')[0]!]!(f);
    }
    expect(steps).toEqual([
      'pour butt into copper --amount 30L',
      'put block in copper',
      'temper copper with lime',
      'skim copper into pail',
      'stoke arch with coal',
      'light arch',
      'heat copper',
    ]);
    expect(steps.some((s) => s.startsWith('boil'))).toBe(false);
  });

  it('takes the copper off at the strike, and leaves a spoilt pan be', () => {
    expect(brain.next({ ...base, liquor: 'struck', onFire: true })).toBe('get copper');
    expect(brain.next({ ...base, liquor: 'struck', onFire: false })).toBeNull();
    expect(brain.next({ ...base, liquor: 'spoilt', onFire: true })).toBeNull();
  });

  it('waits for what it has not got', () => {
    expect(brain.next({ ...base, liquor: 'water', block: false })).toBeNull();
    expect(brain.next({ ...base, liquor: 'liquor', lime: false })).toBeNull();
    expect(brain.next({ ...base, copper: null })).toBeNull();
  });
});
