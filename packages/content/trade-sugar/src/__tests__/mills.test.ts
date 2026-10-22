/**
 * The miller's errand (sugar D18): crush, carry the juice up, and — with
 * `into` — pour it there and bring the SAME tub back, so the crush always
 * has an empty tub to run into (the drive found `no-glass` at every
 * bundle once the yard's tubs had all gone up full).
 */

import { describe, it, expect } from 'vitest';
import { brain } from '../behavior/mills';

describe('mills', () => {
  it('crushes first', () => {
    expect(brain.next({ crush: true, tub: true }, { to: ['north'], back: ['south'] })).toBe('mill bundle');
  });

  it('⭐ with `into`, the tub is emptied up there and comes home', () => {
    expect(brain.next({ crush: false, tub: true }, brain.carry({ carry: { to: ['north'], back: ['south'], into: 'kettle' } })))
      .toBe(['get tub', 'go north', 'pour tub into kettle', 'go south', 'drop tub'].join('\n'));
  });

  it('without it, the tub is left where it was carried', () => {
    expect(brain.next({ crush: false, tub: true }, brain.carry({ carry: { to: ['north'], back: ['south'] } })))
      .toBe(['get tub', 'go north', 'drop tub', 'go south'].join('\n'));
  });

  it('nothing to do is nothing', () => {
    expect(brain.next({ crush: false, tub: false }, { to: ['north'], back: ['south'] })).toBeNull();
  });
});
