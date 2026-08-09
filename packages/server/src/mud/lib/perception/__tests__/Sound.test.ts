import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Sound, SOUND_SOURCE_CAP } from '../Sound';
import { Quantity } from '../../quantity';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

describe('Sound value object', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });

  it('Sound.SILENT is the canonical zero', () => {
    expect(Sound.SILENT.amplitude.rawValue()).toBe(0);
    expect(Sound.SILENT.character).toBe('');
    expect(Sound.SILENT.sources).toEqual([]);
  });

  it('Sound.of constructs with amplitude and character', () => {
    const s = Sound.of(60, 'voices');
    expect(s.amplitude.rawValue()).toBe(60);
    expect(s.character).toBe('voices');
  });

  it('dB arithmetic: two 60 dB sources sum to ~63 dB, not 120', () => {
    const a = Sound.of(60, 'a');
    const b = Sound.of(60, 'b');
    const sum = a.add(b);
    expect(sum.amplitude.rawValue()).toBeCloseTo(63.0103, 2);
  });

  it('Sound.of(0) folds to SILENT', () => {
    expect(Sound.of(0, '')).toBe(Sound.SILENT);
  });

  it('attenuate(0.5) drops linear amplitude by half → ~3 dB drop', () => {
    const s = Sound.of(80, 'whistle');
    const dimmed = s.attenuate(0.5);
    expect(dimmed.amplitude.rawValue()).toBeCloseTo(80 - 10 * Math.log10(2), 2);
  });

  it('attenuate(0) returns SILENT', () => {
    const s = Sound.of(100, 'x');
    expect(s.attenuate(0)).toBe(Sound.SILENT);
  });

  it('source cap respected on merge', () => {
    let s: Sound = Sound.SILENT;
    for (let i = 0; i < SOUND_SOURCE_CAP + 2; i++) {
      s = s.add(
        Sound.of(50 + i * 10, `c-${i}`, {
          stuffId: `s-${i}`,
          amplitude: 50 + i * 10,
          character: `c-${i}`,
        }),
      );
    }
    expect(s.sources.length).toBeLessThanOrEqual(SOUND_SOURCE_CAP);
    // Loudest survives.
    expect(s.sources[0]!.stuffId).toBe(`s-${SOUND_SOURCE_CAP + 1}`);
  });

  it('Sound.from rehydrates a plain-object shape', () => {
    const s = Sound.from({
      amplitude: Quantity.of(70, 'dB'),
      character: 'humming',
      sources: [{ stuffId: 'r-1', amplitude: 70, character: 'humming' }],
    });
    expect(s.amplitude.rawValue()).toBe(70);
    expect(s.character).toBe('humming');
  });
});
