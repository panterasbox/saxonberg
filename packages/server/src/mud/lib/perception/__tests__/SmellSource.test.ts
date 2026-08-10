import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { SmellSourceMixin } from '../SmellSource';
import Thing from '../../stuff/Thing';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Quantity } from '../../quantity';

class StinkBomb extends SmellSourceMixin(Thing) {}

describe('SmellSourceMixin', () => {
  it('defaults to zero concentration + empty identity', () => {
    const s = makeStuff(() => new StinkBomb());
    expect(s.getEmittedConcentration().rawValue()).toBe(0);
    expect(s.getOdorIdentity()).toBe('');
    expect(MixinApi.isSmellSource(s)).toBe(true);
  });

  it('round-trips ppm via numeric setter', () => {
    const s = makeStuff(() => new StinkBomb());
    s.setEmittedConcentration(50);
    expect(s.getEmittedConcentration().rawValue()).toBe(50);
  });

  it('round-trips ppm via Quantity setter', () => {
    const s = makeStuff(() => new StinkBomb());
    s.setEmittedConcentration(Quantity.of(75, 'ppm'));
    expect(s.getEmittedConcentration().rawValue()).toBe(75);
  });

  it('rejects negative ppm', () => {
    const s = makeStuff(() => new StinkBomb());
    expect(() => s.setEmittedConcentration(-1)).toThrow();
  });

  it('rejects unit mismatch on Quantity setter', () => {
    const s = makeStuff(() => new StinkBomb());
    expect(() => s.setEmittedConcentration(Quantity.of(1, 'kg') as never)).toThrow();
  });

  it('round-trips identity', () => {
    const s = makeStuff(() => new StinkBomb());
    s.setOdorIdentity('rotten eggs');
    expect(s.getOdorIdentity()).toBe('rotten eggs');
  });

  it('rejects non-string identity', () => {
    const s = makeStuff(() => new StinkBomb());
    expect(() => s.setOdorIdentity(42 as never)).toThrow();
  });
});
