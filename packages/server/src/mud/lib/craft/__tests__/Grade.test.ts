import { describe, it, expect } from 'vitest';
import { Grade, GRADE_BANDS } from '../Grade';

describe('Grade', () => {
  it('orders the five bands ascending', () => {
    expect([...GRADE_BANDS]).toEqual([
      'poor',
      'fair',
      'fine',
      'exceptional',
      'masterful',
    ]);
    expect(Grade.of('poor').getOrdinal()).toBe(0);
    expect(Grade.of('masterful').getOrdinal()).toBe(4);
    expect(Grade.of('fine').compareTo(Grade.of('fair'))).toBeGreaterThan(0);
    expect(Grade.of('fair').compareTo(Grade.of('fine'))).toBeLessThan(0);
    expect(Grade.of('fine').compareTo(Grade.of('fine'))).toBe(0);
  });

  it('validates bands and rejects unknown ones', () => {
    expect(Grade.isBand('fine')).toBe(true);
    expect(Grade.isBand('legendary')).toBe(false);
    expect(() => Grade.of('legendary')).toThrow();
  });

  it('clamps fromOrdinal into range', () => {
    expect(Grade.fromOrdinal(-3).getBand()).toBe('poor');
    expect(Grade.fromOrdinal(99).getBand()).toBe('masterful');
    expect(Grade.fromOrdinal(2).getBand()).toBe('fine');
  });

  it('renders a band word, never a number', () => {
    const word = Grade.of('exceptional').renderBandWord();
    expect(word).toBe('exceptional');
    expect(word).not.toMatch(/[0-9]/);
  });

  it('min / max pick the right grade', () => {
    expect(Grade.of('poor').min(Grade.of('fine')).getBand()).toBe('poor');
    expect(Grade.of('poor').max(Grade.of('fine')).getBand()).toBe('fine');
  });

  it('derives output grade as the weakest link (min) at fixed control', () => {
    const grades = [Grade.of('fine'), Grade.of('fair'), Grade.of('masterful')];
    expect(Grade.deriveAtFixedControl(grades).getBand()).toBe('fair');
  });

  it('falls back to fair with no input grades', () => {
    expect(Grade.deriveAtFixedControl([]).getBand()).toBe('fair');
  });

  it('ignores the (deferred) control parameter in v1', () => {
    const grades = [Grade.of('poor'), Grade.of('masterful')];
    expect(Grade.deriveAtFixedControl(grades, 0.9).getBand()).toBe('poor');
  });
});
