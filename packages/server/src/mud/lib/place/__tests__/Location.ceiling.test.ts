/**
 * ⭐ A ceiling is a ceiling only where there is one (size and carrying D7):
 * a roofed place answers its cube's height; a place open to the sky has no
 * ceiling at all.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { place } from '../../spatial/__tests__/size-fixture';

describe('Location.getCeilingHeight', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a roofed room answers its extent', () => {
    expect(place(2, 'roof', 'walled').getCeilingHeight()?.rawValue()).toBe(2);
    expect(place(3, 'ceiling', 'walled').getCeilingHeight()?.rawValue()).toBe(3);
  });

  it('open to the sky, there is no ceiling', () => {
    expect(place(3, 'open', 'walled').getCeilingHeight()).toBeNull();
    expect(place(3, 'open', 'none').getCeilingHeight()).toBeNull();
  });

  it('a place is a container on the same rule: its cube, its faces', () => {
    const hall = place(3, 'ceiling', 'walled');
    expect(hall.bounds()).toMatchObject({ closed: { width: true, depth: true, height: true }, mouth: null });
    expect(hall.bounds()!.interior.boxVolume()).toBeCloseTo(27);
    const barn = place(3, 'roof', 'walled', 1);
    expect(barn.bounds()!.closed).toEqual({ width: true, depth: false, height: true });
  });
});
