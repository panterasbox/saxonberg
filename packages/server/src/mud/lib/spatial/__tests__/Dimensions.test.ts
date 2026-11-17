/**
 * Dimensions — the tape measure (size and carrying D1, D4, D8): the sorted
 * box, the cross-section a thing passes an opening by, the rotations it
 * may be turned through to fit, and the sofa that will not turn.
 */
import { describe, it, expect } from 'vitest';
import { Dimensions } from '../Dimensions';

describe('Dimensions', () => {
  it('refuses a non-positive side (P3)', () => {
    expect(() => new Dimensions(0, 1, 1)).toThrow(/width/);
    expect(() => new Dimensions(1, -1, 1)).toThrow(/depth/);
    expect(() => new Dimensions(1, 1, Number.NaN)).toThrow(/height/);
  });

  it('sorts its sides and names them', () => {
    const d = new Dimensions(0.3, 2, 0.1);
    expect(d.sorted()).toEqual([2, 0.3, 0.1]);
    expect(d.longest()).toBe(2);
    expect(d.hangingWidthM()).toBe(0.3);
    expect(d.shortest()).toBe(0.1);
    expect(d.boxVolume()).toBeCloseTo(0.06);
  });

  it('passes an opening by its two smaller sides — a pole goes in endwise', () => {
    const pole = new Dimensions(0.04, 0.04, 2.5);
    expect(pole.crossSection()).toEqual({ width: 0.04, height: 0.04 });
    expect(pole.fitsThrough({ width: 0.1, height: 0.1 })).toBe(true);
    // A ship model's hull will not pass a bottle's neck.
    const model = new Dimensions(0.08, 0.1, 0.3);
    expect(model.fitsThrough({ width: 0.03, height: 0.03 })).toBe(false);
  });

  it('turns either way in an opening', () => {
    const board = new Dimensions(0.5, 0.02, 1.2);
    expect(board.fitsThrough({ width: 0.03, height: 0.6 })).toBe(true);
    expect(board.fitsThrough({ width: 0.6, height: 0.03 })).toBe(true);
  });

  it('offers six rotations and fits a box turned the right way', () => {
    const plank = new Dimensions(0.2, 2.0, 0.03);
    expect(plank.rotations()).toHaveLength(6);
    const chest = new Dimensions(2.1, 0.5, 0.5);
    const allSides = { width: true, depth: true, height: true };
    const stood = plank.orientationWithin(chest, allSides);
    expect(stood).not.toBeNull();
    expect(stood!.width).toBeCloseTo(2.0);
  });

  it('open sides do not count — a broom stands in a bucket', () => {
    const broom = new Dimensions(0.04, 0.04, 1.4);
    const bucket = new Dimensions(0.27, 0.27, 0.3);
    expect(broom.fitsWithin(bucket, { width: true, depth: true, height: true })).toBe(false);
    const stands = broom.orientationWithin(bucket, { width: true, depth: true, height: false });
    expect(stands).not.toBeNull();
    // What stands out of the top fills only to the brim.
    expect(stands!.clippedTo(bucket)).toBeCloseTo(0.04 * 0.04 * 0.3);
  });

  it('the sofa: it goes through the door but will not turn on the stair', () => {
    const sofa = new Dimensions(0.85, 0.9, 2.3);
    expect(sofa.fitsThrough({ width: 1, height: 2 })).toBe(true);
    const turn = 2.2;
    expect(sofa.longest() > turn).toBe(true);
  });
});
