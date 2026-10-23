/**
 * LyeStrength — a lye's alkali, kg per litre, in four bands and the
 * egg's words (potash D5). ⭐ Never a number in the words.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LyeStrength } from '../LyeStrength';
import { AppApi } from '../../../api/app';
import Material from '../../material/Material';
import { makeStuff } from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';

describe('LyeStrength', () => {
  beforeEach(() => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ four bands off the default dials, each a grade', () => {
    expect(new LyeStrength(0).band()).toBe('water');
    expect(new LyeStrength(0.02).band()).toBe('weak');
    expect(new LyeStrength(0.045).band()).toBe('soap-strength');
    expect(new LyeStrength(0.07).band()).toBe('strong');
    expect(new LyeStrength(0.02).gradeBand()).toBe('fair');
    expect(new LyeStrength(0.07).gradeBand()).toBe('exceptional');
  });

  it('the dials retune the bands', () => {
    vi.restoreAllMocks();
    vi.spyOn(AppApi, 'setting').mockImplementation((k: string) => (k === 'potash.lye.strongFromKgPerL' ? '0.04' : ''));
    expect(new LyeStrength(0.045).band()).toBe('strong');
  });

  it('⭐ the words carry no number at any band or competence', () => {
    for (const k of [0, 0.01, 0.02, 0.045, 0.09]) {
      for (const b of ['untrained', 'novice', 'competent', 'expert'] as const) {
        expect(new LyeStrength(k).eggWords(b)).not.toMatch(/\d/);
        expect(new LyeStrength(k).glassWords(b)).not.toMatch(/\d/);
      }
    }
  });

  it('only a lye-tagged liquor is a lye', () => {
    const lye = makeStuff(() => new Material());
    lye.setTags(['liquid', 'lye']);
    const water = makeStuff(() => new Material());
    water.setTags(['liquid', 'water']);
    expect(new LyeStrength(0.05).isLye(lye)).toBe(true);
    expect(new LyeStrength(0.05).isLye(water)).toBe(false);
    expect(new LyeStrength(0.05).isLye(null)).toBe(false);
  });
});
