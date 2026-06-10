import { describe, it, expect, beforeEach } from 'vitest';
import { SoundSourceMixin } from '../SoundSource';
import Thing from '../../stuff/Thing';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Quantity } from '../../quantity';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Whistle extends SoundSourceMixin(Thing) {}

describe('SoundSourceMixin', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });

  it('defaults to zero dB + empty character', () => {
    const s = makeStuff(() => new Whistle());
    expect(s.getEmittedAmplitude().rawValue()).toBe(0);
    expect(s.getCharacter()).toBe('');
    expect(MixinApi.isSoundSource(s)).toBe(true);
  });

  it('round-trips dB via numeric setter', () => {
    const s = makeStuff(() => new Whistle());
    s.setEmittedAmplitude(85);
    expect(s.getEmittedAmplitude().rawValue()).toBe(85);
  });

  it('round-trips Quantity setter', () => {
    const s = makeStuff(() => new Whistle());
    s.setEmittedAmplitude(Quantity.of(95, 'dB'));
    expect(s.getEmittedAmplitude().rawValue()).toBe(95);
  });

  it('rejects unit mismatch', () => {
    const s = makeStuff(() => new Whistle());
    expect(() => s.setEmittedAmplitude(Quantity.of(1, 'kg') as never)).toThrow();
  });

  it('rejects non-finite values', () => {
    const s = makeStuff(() => new Whistle());
    expect(() => s.setEmittedAmplitude(Number.NaN)).toThrow();
  });

  it('round-trips character', () => {
    const s = makeStuff(() => new Whistle());
    s.setCharacter('shrill whistle');
    expect(s.getCharacter()).toBe('shrill whistle');
  });
});
