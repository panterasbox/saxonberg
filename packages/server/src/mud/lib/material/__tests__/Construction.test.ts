import { describe, it, expect } from 'vitest';
import {
  Construction,
  ARMOR_FORMS,
  WEAPON_DELIVERY_FORMS,
  CONSTRUCTION_FORMS,
} from '../Construction';
import { MECHANICAL_CHANNELS } from '../Channel';

describe('Construction', () => {
  it('constructs every known form; of() throws on junk', () => {
    for (const form of CONSTRUCTION_FORMS) {
      expect(Construction.of(form).getForm()).toBe(form);
    }
    expect(() => Construction.of('adamantium')).toThrow(RangeError);
    expect(() => Construction.of('')).toThrow(RangeError);
  });

  it('isForm / isArmorForm / isDeliveryForm narrow correctly', () => {
    expect(Construction.isForm('plate')).toBe(true);
    expect(Construction.isForm('bladed')).toBe(true);
    expect(Construction.isForm('nonsense')).toBe(false);
    expect(Construction.isArmorForm('plate')).toBe(true);
    expect(Construction.isArmorForm('bladed')).toBe(false);
    expect(Construction.isDeliveryForm('bladed')).toBe(true);
    expect(Construction.isDeliveryForm('plate')).toBe(false);
  });

  it('classifies domain', () => {
    expect(Construction.of('plate').getDomain()).toBe('armor');
    expect(Construction.of('plate').isArmor()).toBe(true);
    expect(Construction.of('bladed').getDomain()).toBe('weapon-delivery');
    expect(Construction.of('bladed').isWeapon()).toBe(true);
  });

  it('armor grid is complete — every ArmorForm × MechanicalChannel resolves', () => {
    for (const form of ARMOR_FORMS) {
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
