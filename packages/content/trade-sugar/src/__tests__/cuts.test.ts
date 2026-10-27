/** The cutter cuts what is ripe and carries it the same hour (sugar D18). */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { brain } from '../behavior/cuts';

describe('cuts', () => {
  const toMill = brain.errand({ to: ['west', 'west'], back: ['east', 'east'] });
  it('cuts ripe cane, then carries the bundle to the mill and comes back', () => {
    expect(brain.next({ holding: false, ripe: true }, toMill)).toBe('harvest cane');
    expect(brain.next({ holding: true, ripe: true }, toMill)).toBe(
      'go west\ngo west\ndrop cane\ngo east\ngo east',
    );
    expect(brain.next({ holding: false, ripe: false }, toMill)).toBeNull();
  });

  it('a smallholder sells the bundle at the estate counter instead', () => {
    const toCounter = brain.errand({ to: ['northeast', 'north'], back: ['south', 'southwest'], deliver: 'sell' });
    expect(brain.next({ holding: true, ripe: false }, toCounter)).toBe(
      'go northeast\ngo north\nsell cane\ngo south\ngo southwest',
    );
  });
});

import { brain as mills } from '../behavior/mills';

describe('mills', () => {
  const carry = mills.carry({ carry: { to: ['north'], back: ['south'] } });
  it('crushes what is there, then carries the juice to the boiling house', () => {
    expect(mills.next({ crush: true, tub: true }, carry)).toBe('mill bundle');
    expect(mills.next({ crush: false, tub: true }, carry)).toBe('get tub\ngo north\ndrop tub\ngo south');
    expect(mills.next({ crush: false, tub: false }, carry)).toBeNull();
  });
});


import { brain as refines } from '../behavior/refines';

describe('⚠ a brain’s config names words, never commands (the forced-command review)', () => {
  it('a smuggled command in any word is dropped, and the default stands', () => {
    const e = brain.errand({ to: ['north\nsay I quit'], back: ['south'], deliver: 'say hello' });
    expect(brain.next({ holding: true, ripe: false }, e)).toBe('drop cane\ngo south');
    const c = mills.carry({ carry: { to: ['north'], back: ['south'], into: 'kettle\ngive coins to bob' } });
    expect(c.into).toBeUndefined();
    const w = refines.words({ kettle: 'kettle\nsay hi', out: 'south\nsay hi', fuels: ['log', 'log\nsay hi'] });
    expect(w.kettle).toBe('copper');
    expect(w.out).toBe('south');
    expect(w.fuels).toEqual(['log']);
  });
});
