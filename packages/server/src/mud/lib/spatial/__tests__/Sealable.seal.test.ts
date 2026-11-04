/**
 * ⭐ The broken seal (paper D11): opening a sealed thing breaks the seal,
 * closing it never mends it, a gummed flap does not take gum twice, a wax
 * seal wants wax in hand — and a look says whether the seal is whole.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Holder from '../../stuff/Holder';
import Material from '../../material/Material';
import { SealableMixin } from '../Sealable';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class Envelope extends SealableMixin(Good) {
  static _mixinName = 'SealTestEnvelope';
}

afterEach(() => StuffApi.clearAll());

describe('⭐ a seal', () => {
  it('must be closed to seal; opening breaks it; closing never mends it', () => {
    const e = makeStuff(() => new Envelope());
    e.setOpen(true);
    expect(e.sealWith('gum')).toMatchObject({ ok: false, reason: 'open' });
    e.close();
    expect(e.sealWith('gum').ok).toBe(true);
    expect(e.getSeal()).toBe('gum');
    expect(e.isSealBroken()).toBe(false);
    e.open();
    expect(e.isSealBroken()).toBe(true);
    e.close();
    expect(e.isSealBroken()).toBe(true);
  });

  it('a gummed flap will not take gum twice; wax over it is a new seal', () => {
    const e = makeStuff(() => new Envelope());
    e.sealWith('gum');
    e.open();
    e.close();
    expect(e.sealWith('gum')).toMatchObject({ ok: false, reason: 'seal-broken' });
    expect(e.sealWith('wax').ok).toBe(true);
    expect(e.isSealBroken()).toBe(false);
  });

  it('wax wants wax in hand', () => {
    const e = makeStuff(() => new Envelope());
    const hands = makeStuff(() => new Holder());
    expect(e.sealWith('wax', hands).ok).toBe(false);
    const wax = makeStuffAtPath(() => {
      const m = new Material();
      m.setTags(['wax']);
      return m;
    }, '/stuff/idea/material/_seal/wax');
    const candle = makeStuff(() => {
      const g = new Good();
      g.setMaterial(wax);
      return g;
    });
    ContainmentApi.move(candle, hands);
    expect(e.sealWith('wax', hands).ok).toBe(true);
  });

  it('an unsealed thing reads nothing new — a door is not "unsealed"', () => {
    const e = makeStuff(() => new Envelope());
    e.open();
    expect(e.isSealBroken()).toBe(false);
    expect(e.getSeal()).toBe('');
  });

  it('a look says the seal is broken', () => {
    const e = makeStuff(() => new Envelope());
    e.setLongDescription('An envelope.');
    e.sealWith('wax');
    expect(e.getMarkupLong(e as never, {})).toMatch(/sealed with wax/);
    e.open();
    expect(e.getMarkupLong(e as never, {})).toMatch(/wax seal has been broken/);
  });
});
