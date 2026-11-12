import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Construction,
  COVERING_FORMS,
  WEAPON_DELIVERY_FORMS,
  CONSTRUCTION_FORMS,
} from '../Construction';
import { MECHANICAL_CHANNELS } from '../Channel';
import { rememberFabric, forgetFabrics, fabricPath } from './fabrics';

describe('Construction', () => {
  it('constructs every known form; of() throws on junk', () => {
    for (const form of CONSTRUCTION_FORMS) {
      expect(Construction.of(form).getForm()).toBe(form);
    }
    expect(() => Construction.of('adamantium')).toThrow(RangeError);
    expect(() => Construction.of('')).toThrow(RangeError);
  });

  it('isForm / isCoveringForm / isDeliveryForm narrow correctly', () => {
    expect(Construction.isForm('plate')).toBe(true);
    expect(Construction.isForm('bladed')).toBe(true);
    expect(Construction.isForm('nonsense')).toBe(false);
    expect(Construction.isCoveringForm('plate')).toBe(true);
    expect(Construction.isCoveringForm('bladed')).toBe(false);
    expect(Construction.isDeliveryForm('bladed')).toBe(true);
    expect(Construction.isDeliveryForm('plate')).toBe(false);
  });

  it('classifies domain', () => {
    expect(Construction.of('plate').getDomain()).toBe('covering');
    expect(Construction.of('plate').isCovering()).toBe(true);
    expect(Construction.of('bladed').getDomain()).toBe('weapon-delivery');
    expect(Construction.of('bladed').isWeapon()).toBe(true);
  });

  it('covering grid is complete — every kernel CoveringForm × MechanicalChannel resolves', () => {
    for (const form of COVERING_FORMS) {
      const c = Construction.of(form);
      for (const ch of MECHANICAL_CHANNELS) {
        expect(typeof c.responseFor(ch)).toBe('string');
      }
    }
  });

  it('shock is not a construction shape — responseFor(shock) throws', () => {
    // Construction stays honestly mechanical; a shock resolves by circuit
    // (MaterialApi), never through the covering-shape grid.
    expect(() => Construction.of('plate').responseFor('shock')).toThrow(
      RangeError,
    );
    expect(Construction.of('bladed').deliveryFor('shock')).toBe('none');
  });

  it('delivery grid is complete — every DeliveryForm × MechanicalChannel resolves', () => {
    for (const form of WEAPON_DELIVERY_FORMS) {
      const c = Construction.of(form);
      for (const ch of MECHANICAL_CHANNELS) {
        expect(typeof c.deliveryFor(ch)).toBe('string');
      }
    }
  });

  it('transcribes the taxonomy grid verbatim (armor resist profile)', () => {
    const plate = Construction.of('plate');
    expect(plate.responseFor('edge')).toBe('deflect');
    expect(plate.responseFor('point')).toBe('resist');
    expect(plate.responseFor('blunt')).toBe('transmit');

    const mail = Construction.of('mail');
    expect(mail.responseFor('edge')).toBe('resist');
    expect(mail.responseFor('point')).toBe('fail');
    expect(mail.responseFor('blunt')).toBe('transmit');

    const padded = Construction.of('padded');
    expect(padded.responseFor('edge')).toBe('poor');
    expect(padded.responseFor('point')).toBe('poor');
    expect(padded.responseFor('blunt')).toBe('absorb');

    const hide = Construction.of('hide');
    expect(hide.responseFor('edge')).toBe('moderate');
    expect(hide.responseFor('point')).toBe('poor');
    expect(hide.responseFor('blunt')).toBe('moderate');
  });

  it('transcribes the delivery grid verbatim', () => {
    const bladed = Construction.of('bladed');
    expect(bladed.deliveryFor('edge')).toBe('primary');
    expect(bladed.deliveryFor('point')).toBe('secondary');
    expect(bladed.deliveryFor('blunt')).toBe('none');
    expect(bladed.primaryChannel()).toBe('edge');
    expect(bladed.deliveredChannels()).toEqual(['edge', 'point']);

    const pointed = Construction.of('pointed');
    expect(pointed.primaryChannel()).toBe('point');
    expect(pointed.deliveredChannels()).toEqual(['point', 'edge']);

    const hafted = Construction.of('hafted');
    expect(hafted.deliveryFor('blunt')).toBe('primary');
    expect(hafted.deliveryFor('edge')).toBe('none');
    expect(hafted.primaryChannel()).toBe('blunt');
    expect(hafted.deliveredChannels()).toEqual(['blunt']);
    expect(hafted.deliversPrimary()).toBe(true);
    expect(hafted.deliversAny()).toBe(true);

    // The waster: sword-shaped, no edge presented — blunt is all it has.
    const blunted = Construction.of('blunted');
    expect(blunted.deliveryFor('blunt')).toBe('primary');
    expect(blunted.deliveryFor('edge')).toBe('none');
    expect(blunted.deliveryFor('point')).toBe('none');
    expect(blunted.primaryChannel()).toBe('blunt');
    expect(blunted.deliveredChannels()).toEqual(['blunt']);
  });

  it('domain-guards responseFor / deliveryFor / getLayerDepth', () => {
    const plate = Construction.of('plate');
    const bladed = Construction.of('bladed');
    expect(() => plate.deliveryFor('edge')).toThrow(RangeError);
    expect(() => bladed.responseFor('edge')).toThrow(RangeError);
    expect(() => bladed.getLayerDepth()).toThrow(RangeError);
    // Armor delivers nothing; weapon primaryChannel-less on armor is null.
    expect(plate.deliveredChannels()).toEqual([]);
    expect(plate.primaryChannel()).toBeNull();
  });

  it('orders armor layer depth padded < hide < mail < plate', () => {
    const depths = (['padded', 'hide', 'mail', 'plate'] as const).map((f) =>
      Construction.of(f).getLayerDepth(),
    );
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i]!).toBeGreaterThan(depths[i - 1]!);
    }
  });

  it('equals compares by form word', () => {
    expect(Construction.of('plate').equals(Construction.of('plate'))).toBe(
      true,
    );
    expect(Construction.of('plate').equals(Construction.of('mail'))).toBe(
      false,
    );
  });

  it('no shipped form does nothing (the does-nothing lint invariant)', () => {
    for (const form of CONSTRUCTION_FORMS) {
      expect(Construction.of(form).doesNothing()).toBe(false);
    }
  });

  it('the inert predicates flag a deliberately-inert profile', () => {
    // An all-fail armor profile and an all-none delivery profile do nothing.
    expect(
      Construction.resistProfileHasEffect(['fail', 'fail', 'fail']),
    ).toBe(false);
    expect(
      Construction.resistProfileHasEffect(['fail', 'deflect', 'fail']),
    ).toBe(true);
    expect(
      Construction.deliveryProfileHasEffect(['none', 'none', 'none']),
    ).toBe(false);
    expect(
      Construction.deliveryProfileHasEffect(['none', 'primary', 'none']),
    ).toBe(true);
  });
});

/**
 * The second source — the textile half of the covering vocabulary.
 *
 * ⚠ Four constraints hold at once and each has its own test here:
 * `getLayerDepth()` stays TOTAL across both sources (three hot paths
 * call it unconditionally); `Construction.ts` stays import-pure;
 * a pack adds a form with no kernel edit; and content NEVER authors a
 * resist profile.
 */
describe('Construction — the fabric registry (the second covering source)', () => {
  beforeEach(() => forgetFabrics());
  afterEach(() => forgetFabrics());

  const woven = {
    key: 'woven',
    layerBand: 0,
    loft: 0.1,
    weaveDensity: 0.75,
    drape: 0.6,
  };

  it('a registered fabric joins the vocabulary with no kernel edit', () => {
    expect(Construction.isForm(fabricPath('woven'))).toBe(false);
    rememberFabric(woven);
    expect(Construction.isForm(fabricPath('woven'))).toBe(true);
    expect(Construction.isCoveringForm(fabricPath('woven'))).toBe(true);
    expect(Construction.isFabricForm(fabricPath('woven'))).toBe(true);
    expect(Construction.of(fabricPath('woven')).getDomain()).toBe('covering');
    expect(Construction.of(fabricPath('woven')).isCovering()).toBe(true);
    expect(Construction.of(fabricPath('woven')).isWeapon()).toBe(false);
  });

  it('⭐ responseFor on a fabric is POOR everywhere, and is not authored', () => {
    // "A linen shirt is armor that does not work" — as one line of
    // kernel data. Adding `lace` changes nothing about combat.
    rememberFabric(woven);
    rememberFabric({ ...woven, key: 'lace', weaveDensity: 0.1 });
    for (const key of [fabricPath('woven'), fabricPath('lace')]) {
      const c = Construction.of(key);
      for (const ch of MECHANICAL_CHANNELS) {
        expect(c.responseFor(ch)).toBe('poor');
      }
      // Still honestly mechanical: shock resolves by circuit, not here.
      expect(() => c.responseFor('shock')).toThrow(RangeError);
      // `poor` is not inert — a shirt attenuates a little.
      expect(c.doesNothing()).toBe(false);
    }
  });

  it('⚠ the depth ladder stays TOTAL over kernel ∪ registered forms', () => {
    rememberFabric(woven);
    rememberFabric({ ...woven, key: 'felted', layerBand: 1 });
    const depths = new Map<string, number>();
    for (const form of [...COVERING_FORMS, fabricPath('woven'), fabricPath('felted')]) {
      // Unconditional — this is exactly how the three hot paths call it.
      depths.set(form, Construction.of(form).getLayerDepth());
    }
    expect(depths.get('padded')).toBe(0);
    expect(depths.get('quilted')).toBe(1);
    expect(depths.get('hide')).toBe(2);
    expect(depths.get('mail')).toBe(3);
    expect(depths.get('plate')).toBe(4);
    expect(depths.get(fabricPath('woven'))).toBe(0);
    expect(depths.get(fabricPath('felted'))).toBe(1);
    for (const d of depths.values()) expect(Number.isInteger(d)).toBe(true);
  });

  it('an out-of-range or malformed document is refused AT INSTALL (the parse)', () => {
    // The totality guard has to fire at install, loudly — not at the
    // moment somebody swings.
    expect(() => rememberFabric({ ...woven, layerBand: 5 })).toThrow(/layerBand 5/);
    expect(() => rememberFabric({ ...woven, layerBand: -1 })).toThrow(/layerBand -1/);
    expect(() => rememberFabric({ ...woven, layerBand: 1.5 })).toThrow(/layerBand 1.5/);
    expect(() => rememberFabric({ ...woven, loft: 2 })).toThrow(/loft 2/);
    expect(() => rememberFabric({ ...woven, key: 'Woven' })).toThrow(/kebab/);
  });

  it('⭐ a fabric can never shadow a kernel form: a fabric is a PATH, a kernel form a word', () => {
    rememberFabric(woven);
    expect(Construction.isFabricForm('plate')).toBe(false);
    expect(Construction.of('plate').getFabric()).toBeNull();
    // A sentence carries the leaf, never the path.
    expect(Construction.of(fabricPath('woven')).getWord()).toBe('woven');
    expect(Construction.of('plate').getWord()).toBe('plate');
  });

  it('a fabric read cold is an engine defect, thrown by path (load-on-use W2)', () => {
    expect(Construction.isForm(fabricPath('woven'))).toBe(false);
    expect(() => Construction.of(fabricPath('woven'))).toThrow(/unknown form/);
  });

  it('survives forget + re-remember (the go-live)', () => {
    rememberFabric(woven);
    expect(Construction.isForm(fabricPath('woven'))).toBe(true);
    forgetFabrics();
    expect(Construction.isForm(fabricPath('woven'))).toBe(false);
    rememberFabric(woven);
    expect(Construction.of(fabricPath('woven')).getFabric()?.weaveDensity).toBe(0.75);
  });

  it('every kernel covering form still has a real effect', () => {
    for (const form of COVERING_FORMS) {
      expect(Construction.of(form).doesNothing()).toBe(false);
    }
  });
});
