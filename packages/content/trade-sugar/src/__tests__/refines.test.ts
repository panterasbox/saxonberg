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
      'stoke coal into arch',
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
    // ⭐ An estate spills a spoilt pan and starts again (config `spoilt: spill`).
    const estate = brain.words({ kettle: 'kettle', spoilt: 'spill' });
    expect(brain.next({ ...base, liquor: 'spoilt', onFire: true }, estate)).toBe('get kettle');
    expect(brain.next({ ...base, liquor: 'spoilt', onFire: false }, estate)).toBe('spill kettle');
    // ⭐ A train kettle is LADLED where it stands — a full one won't budge.
    const train = brain.words({ kettle: 'kettle', mould: 'hogshead', spoilt: 'spill', ladle: true });
    expect(brain.next({ ...base, liquor: 'struck', onFire: true, coneReady: true }, train)).toBe('pour kettle into hogshead');
    expect(brain.next({ ...base, liquor: 'spoilt', onFire: true }, train)).toBe('spill kettle');
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
    expect(brain.next(ready, w)).toBe('stoke bagasse into train');
    expect(brain.next({ ...island, liquor: 'struck' as const, onFire: true }, w)).toBe('get kettle');
    expect(brain.next({ ...island, liquor: 'struck' as const, coneReady: true }, w)).toBe('pour kettle into hogshead');
    expect(brain.next({ ...island, setBlock: true }, w)).toBe('get block from hogshead');
    expect(brain.next({ ...base, block: true }, w)).toBe('go south\nput block in counter\ngo north');
  });

  it('⭐ with a cistern, an EMPTY pan is charged one batch — and a working pan is never topped up', () => {
    const w = brain.words({
      kettle: 'kettle', fire: 'train', mould: 'hogshead', source: 'juice', finish: 'block',
      cistern: 'cistern', batch: 40,
    });
    const island = { ...base, block: false, juice: true };
    expect(brain.next(island, w)).toBe('pour cistern into kettle --amount 40L');
    // Juice standing in the cistern does not reach a pan already working.
    const boiling = { ...island, liquor: 'liquor' as const, limed: 1, skimmed: true, fireFuelled: true, fireLit: true, onFire: true };
    expect(brain.next(boiling, w)).toBeNull();
  });

  it('⭐ a floor of several hogsheads: the boiler names the one it means', () => {
    const w = brain.words({ kettle: 'kettle', fire: 'train', mould: 'hogshead', source: 'juice', finish: 'block', ladle: true });
    const island = { ...base, block: false, refs: { ready: '#h2', mould: '#h3', pot: '#p3', set: '#h1' } };
    expect(brain.next({ ...island, liquor: 'struck' as const, onFire: true, coneReady: true }, w)).toBe('pour kettle into #h2');
    expect(brain.next({ ...island, liquor: 'struck' as const, onFire: true }, w)).toBe('put #h3 on #p3');
    expect(brain.next({ ...island, setBlock: true }, w)).toBe('get block from #h1');
  });

  it('⭐ an under-charged train is stoked up to its charge in one go, not a log a beat', () => {
    const w = brain.words({ kettle: 'kettle', fire: 'train', source: 'juice', finish: 'block', charge: 14 });
    const ready = { ...base, block: false, liquor: 'liquor' as const, limed: 1, skimmed: true, fuel: 'log', stokes: 3 };
    expect(brain.next(ready, w)).toBe('stoke log into train\nstoke log into train\nstoke log into train');
  });

  it('⭐ a pan thick on the fire is WATCHED — the thread tested, at critical, until it strikes', () => {
    const w = brain.words({ kettle: 'kettle', fire: 'train', source: 'juice', finish: 'block', ladle: true });
    // A hogshead already readied on its pot (`coneReady`), so this is only
    // the watch and the fire.
    const boiling = { ...base, block: false, liquor: 'liquor' as const, limed: 1, skimmed: true, fireFuelled: true, fireLit: true, onFire: true, coneReady: true };
    expect(brain.next(boiling, w)).toBeNull();
    expect(brain.next({ ...boiling, thick: true }, w)).toBe('analyze boil kettle');
    expect(brain.watching({ ...boiling, thick: true })).toBe(true);
    // ⭐ A thick pan on a low bed is fed AND tested in one beat: stoking
    // instead of watching missed the strike; watching instead of stoking
    // starved the fire and the strike never came (both found live).
    expect(brain.next({ ...boiling, thick: true, fireFuelled: false, fuel: 'log', stokes: 2 }, w)).toBe(
      'stoke log into train\nstoke log into train\nanalyze boil kettle',
    );
    expect(brain.watching(boiling)).toBe(false);
  });

  it('⭐ thick on the fire she readies a hogshead on its pot, so the strike is only ladled', () => {
    const w = brain.words({ kettle: 'kettle', fire: 'train', mould: 'hogshead', source: 'juice', finish: 'block', ladle: true });
    const thick = {
      ...base, block: false, liquor: 'liquor' as const, limed: 1, skimmed: true,
      fireFuelled: true, fireLit: true, onFire: true, thick: true,
      coneReady: false, coneAndPot: true, refs: { mould: '#h1', pot: '#p1' },
    };
    expect(brain.next(thick, w)).toBe('put #h1 on #p1\nanalyze boil kettle');
    expect(brain.next({ ...thick, coneReady: true, refs: { ready: '#h1' } }, w)).toBe('analyze boil kettle');
  });

  it('out of lime, it buys the import at its own counter', () => {
    expect(
      brain.next({ ...base, liquor: 'liquor', lime: false, counterLime: true }),
    ).toBe('go south\nwallet use house\nbuy quicklime\ngo north');
  });
});
