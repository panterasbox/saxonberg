/**
 * ⭐ The W6 class seams the gear rows stand on (size and carrying W6):
 *  - a pack has a flap — it starts OPEN (nothing that never shut behaves
 *    differently) and a shut one is a holder like any other;
 *  - a cart closes only under a tarpaulin lying in it (a sheet of textile —
 *    `Haulable.coverFor`), and its bed is a seat (`Postured`);
 *  - a shield may be slung on the back without its claim taking the back.
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms, material, thing } from '../../../../lib/spatial/__tests__/size-fixture';
import { makeBody } from '../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import Pack from '../Pack';
import Handcart from '../Handcart';
import Shield from '../Shield';
import Good from '../../Good';

describe('carrying gear — the W6 seams', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => StuffApi.clearAll());

  it('a pack starts open, and shuts', () => {
    const p = makeStuff(() => new Pack());
    expect(MixinApi.isSealable(p)).toBe(true);
    expect(p.isOpen()).toBe(true);
    p.setOpen(false);
    expect(p.isOpen()).toBe(false);
  });

  it('a cart closes only under a tarpaulin lying in it', () => {
    const cart = makeStuff(() => new Handcart());
    expect(cart.isOpen()).toBe(true);
    expect(MixinApi.isPostured(cart)).toBe(true);
    expect(cart.canClose(cart).ok).toBe(false);
    // A shirt is cloth but not a sheet: it covers nothing.
    const linen = material('/stuff/idea/material/_test/linen', 1500);
    linen.setTags(['textile']);
    const shirt = thing(() => new Good(), { material: linen, kg: 0.3, shape: 'flexible' });
    ContainmentApi.move(shirt, cart);
    expect(cart.coverFor()).toBe(null);
    const tarp = thing(() => new Good(), { material: linen, kg: 4, shape: 'sheet' });
    ContainmentApi.move(tarp, cart);
    expect(cart.coverFor()).toBe(tarp);
    expect(cart.canClose(cart).ok).toBe(true);
  });

  it('a shield fits the back without claiming it', () => {
    const { me, plan } = makeBody();
    const shield = makeStuff(() => new Shield());
    shield.setSlotClaims({ [plan]: ['hand:left'] });
    expect(shield.fitsSlot(me, 'back')).toBe(true);
    expect(shield.getSlotClaim(plan)).toEqual(['hand:left']);
    expect(shield.fitsSlot(me, 'waist')).toBe(false);
  });
});
