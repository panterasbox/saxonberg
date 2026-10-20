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
  fireLit: false,
  fireFuelled: false,
  liquor: 'empty' as const,
  limed: 0,
  skimmed: false,
  block: true,
  lime: true,
  fuel: 'coal',
  juice: false,
  setBlock: false,
  counterLime: false,
  coneReady: false,
  coneAndPot: true,
  setLoaf: false,
  loaf: false,
  nips: true,
  piece: false,
  quern: true,
  sack: false,
  counterBlock: false,
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
      stoke: (x) => ({ ...x, fireFuelled: true }),
      light: (x) => ({ ...x, fireLit: true }),
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
    expect(brain.next({ ...base, liquor: 'struck', onFire: false })).toBe('put cone on pot');
    expect(brain.next({ ...base, liquor: 'struck', coneReady: true })).toBe('pour copper into cone');
    expect(brain.next({ ...base, liquor: 'struck', coneAndPot: false })).toBeNull();
    expect(brain.next({ ...base, liquor: 'spoilt', onFire: true })).toBeNull();
  });

  it('waits for what it has not got', () => {
    expect(brain.next({ ...base, liquor: 'water', block: false })).toBeNull();
    expect(brain.next({ ...base, liquor: 'liquor', lime: false })).toBeNull();
    expect(brain.next({ ...base, copper: null })).toBeNull();
  });

  it('⭐ finishes what it makes: loaf out, nipped, a piece milled, the sack to the counter', () => {
    const idle = { ...base, liquor: 'liquor' as const, limed: 1, skimmed: true, fireFuelled: true, fireLit: true, onFire: true };
    expect(brain.next({ ...idle, setLoaf: true })).toBe('get loaf from cone');
    expect(brain.next({ ...idle, loaf: true })).toBe('cut loaf with nips');
    expect(brain.next({ ...idle, piece: true })).toBe('mill piece');
    expect(brain.next({ ...idle, sack: true })).toBe('go south\nput sack in counter\ngo north');
  });

  it('⭐⭐ island sugar first; with none on the floor it buys the import at its own counter', () => {
    expect(brain.next({ ...base, liquor: 'water', block: true })).toBe('put block in copper');
    expect(brain.next({ ...base, liquor: 'water', block: false, counterBlock: true })).toBe(
      'go south\nwallet use house\nbuy block\ngo north',
    );
    expect(brain.next({ ...base, liquor: 'water', block: false, counterBlock: false })).toBeNull();
  });

  it('⭐⭐ the estate runs the same brain with its own words: juice, kettle, train, hogshead, block to the counter', () => {
    const w = brain.words({
      kettle: 'kettle', fire: 'train', mould: 'hogshead', fuels: ['bagasse', 'log'],
      source: 'juice', finish: 'block', out: 'south', back: 'north',
    });
    const island = { ...base, block: false };
    expect(brain.next({ ...island, juice: true }, w)).toBe('pour tub into kettle');
    expect(brain.next({ ...island, juice: false }, w)).toBeNull();
    const ready = { ...island, liquor: 'liquor' as const, limed: 1, skimmed: true, fuel: 'bagasse' };
    expect(brain.next(ready, w)).toBe('stoke train with bagasse');
    expect(brain.next({ ...island, liquor: 'struck' as const, onFire: true }, w)).toBe('get kettle');
    expect(brain.next({ ...island, liquor: 'struck' as const, coneReady: true }, w)).toBe('pour kettle into hogshead');
    expect(brain.next({ ...island, setBlock: true }, w)).toBe('get block from hogshead');
    expect(brain.next({ ...base, block: true }, w)).toBe('go south\nput block in counter\ngo north');
  });

  it('out of lime, it buys the import at its own counter', () => {
    expect(
      brain.next({ ...base, liquor: 'liquor', lime: false, counterLime: true }),
    ).toBe('go south\nwallet use house\nbuy quicklime\ngo north');
  });
});
