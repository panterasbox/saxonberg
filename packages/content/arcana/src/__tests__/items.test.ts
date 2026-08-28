/**
 * The arcana pack's own suite (capability packs D5, D9): the three new
 * item classes compose, and `Potion`'s presets hold — a catalog potion
 * is three lines because the glassware is the class's — while a row's
 * `data:` still overrides any of them through the ordinary hydrator.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { makeStuff, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ModuleApi } from '@saxonberg/server/mud/api/module';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import Ring from '../thing/Ring';
import Amulet from '../thing/Amulet';
import Potion from '../thing/Potion';
import Wand from '../thing/Wand';

let seq = 0;

describe('arcana — the worn hosts', () => {
  it('Ring and Amulet are Wand\'s composition with Wearable for Wieldable', () => {
    for (const Cls of [Ring, Amulet]) {
      const item = makeStuff(() => new Cls());
      stampTemplatePathForTest(item, `/obj/test/worn-${seq++}`);
      expect(MixinApi.isCharged(item)).toBe(true);
      expect(MixinApi.isBlessable(item)).toBe(true);
      expect(MixinApi.isIdentifiable(item)).toBe(true);
      expect(MixinApi.isWearable(item)).toBe(true);
      expect(MixinApi.isWieldable(item)).toBe(false);
      expect(typeof item.onSlotOccupied).toBe('function');
    }
    const wand = makeStuff(() => new Wand());
    stampTemplatePathForTest(wand, `/obj/test/wand-${seq++}`);
    expect(MixinApi.isWieldable(wand)).toBe(true);
    expect(MixinApi.isWearable(wand)).toBe(false);
  });

  it('the pack\'s classes are stamped with their /arcana module ids (the loader reaches the pack src/)', () => {
    expect(ModuleApi.lookup(Ring)).toBe('/arcana/thing/Ring');
    expect(ModuleApi.lookup(Wand)).toBe('/arcana/thing/Wand');
    expect(StuffApi.resolveClassFile('/arcana/thing/Ring').origin).toMatchObject({ root: '/arcana' });
  });
});

describe('arcana — Potion, the preset Receptacle', () => {
  beforeEach(() => installV1QuantityMarshallers());

  it('a bare Potion is glass, 0.25 L of interior bulk, with the potion keywords', () => {
    const p = makeStuff(() => new Potion());
    stampTemplatePathForTest(p, `/obj/test/potion-${seq++}`);
    expect(p._materialPath).toBe('/stuff/idea/material/glass/glass');
    expect(p.interiorBulk).toBe(true);
    expect(p.getInteriorCapacity()?.rawValue()).toBeCloseTo(0.25);
    expect(p.getKeywords()).toEqual(expect.arrayContaining(['flask', 'vial', 'potion', 'draught']));
    expect(p.getPrimaryKeyword()).toBe('potion');
  });

  it('a row overrides a preset through the ordinary setters', () => {
    const p = makeStuff(() => new Potion());
    stampTemplatePathForTest(p, `/obj/test/potion-${seq++}`);
    p.setKeywords(['phial']);
    p.setPrimaryKeyword('phial');
    expect(p.getPrimaryKeyword()).toBe('phial');
  });
});
