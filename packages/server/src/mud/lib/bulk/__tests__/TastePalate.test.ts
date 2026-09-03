/**
 * ⭐ **The palate** (AC11) — what a dish tastes like is DERIVED from what
 * went into it and projected through the taster's own `cooking`
 * competence. The same bowl reads differently to two people, and nothing
 * anywhere authors a per-dish flavour string.
 *
 *   untrained / novice   the dominant basic tastes
 *   competent            …and the ingredients, by name
 *   proficient / expert  …and the grade of the making
 *
 * ⚠ Never a gate: every band tastes the food. The better palate reads
 * more off it, which is the whole difference between a skill you have and
 * a door you are allowed through.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../stuff/Thing';
import Material from '../../material/Material';
import { BulkableMixin, type BulkPayload } from '../Bulkable';
import { GradedMixin } from '../../craft/Graded';
import { AdvancementMixin } from '../../advancement/Advancement';
import type { DisciplineBand } from '../../advancement/Advancement';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { Idea } from '../../stuff/Idea';
import { Stuff } from '../../stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A served dish: graded, bulk-bearing, and carrying a derived blend. */
class TestDish extends GradedMixin(BulkableMixin(Thing)) {
  static _mixinName = 'TestDishPalate';
}

/**
 * A taster whose `cooking` band is whatever the test says. ⚠ The real
 * read is the SYNC digest cache (`competenceDigestCached`); overriding it
 * here is the observation seam, not a second implementation — the
 * production path fills the same cache from the transcript ledger.
 */
class TestTaster extends AdvancementMixin(Idea) {
  static _mixinName = 'TestTasterPalate';
  private band: string | null = null;
  setCookingBand(band: string | null): void {
    this.band = band;
  }
  override competenceDigestCached(): DisciplineBand[] | undefined {
    if (this.band === null) return undefined;
    return [{ discipline: 'cooking', band: this.band as never }];
  }
}

const COOKED = '/stuff/idea/material/_test/palate-cooked';

const STEW: BulkPayload = {
  name: 'hearty stew',
  appearance: 'a thick brown stew',
  nutrients: ['carb', 'protein'],
  nutrientAmounts: { carb: 34000, protein: 26000 },
  toxicity: [],
  edible: true,
  parts: ['root vegetable', 'stew meat'],
  tastes: ['sweet', 'umami'],
};

function dish(payload: BulkPayload | null, band = 'fine'): TestDish {
  const d = makeStuff(() => new TestDish());
  (d as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (d as unknown as { interiorMaterial: string }).interiorMaterial = COOKED;
  d.setInteriorCapacity(Quantity.of(1, 'L'));
  d.setInteriorAmount(Quantity.of(0.4, 'L'));
  d.setGradeBand(band);
  if (payload) d.getBulk('interior').setPayload(payload);
  return d;
}

function taster(band: string | null): TestTaster {
  const t = makeStuff(() => new TestTaster());
  t.setCookingBand(band);
  return t;
}

/** What `taste <dish>` renders — the taste-channel augmenter fold. */
function tasteOf(host: Stuff, viewer: Stuff): string {
  return MixinApi.getAllMarkupAugmenters(
    (host as unknown as { constructor: never }).constructor,
  ).reduce((text, fn) => fn(text, host, viewer, { filter: ['taste'] }), '');
}

/** What `look <dish>` renders — the same fold on the vision channel. */
function lookOf(host: Stuff, viewer: Stuff): string {
  return MixinApi.getAllMarkupAugmenters(
    (host as unknown as { constructor: never }).constructor,
  ).reduce((text, fn) => fn(text, host, viewer, { filter: ['vision'] }), '');
}

describe('the palate reads the dish (AC11)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('cooked fare');
      m.setEdibility(true);
      return m;
    }, COOKED);
  });
  afterEach(() => StuffApi.clearAll());

  it('a NOVICE gets the dominant tastes and nothing else', () => {
    const text = tasteOf(dish(STEW), taster('novice'));
    expect(text).toContain('sweet');
    expect(text).toContain('umami');
    expect(text).not.toContain('stew meat');
    expect(text).not.toContain('fine');
  });

  it('⭐ COMPETENT picks out the ingredients — the same dish, a better palate', () => {
    const text = tasteOf(dish(STEW), taster('competent'));
    expect(text).toContain('sweet');
    expect(text).toContain('root vegetable');
    expect(text).toContain('stew meat');
    expect(text).not.toContain('fine');
  });

  it('EXPERT reads the grade of the making as well', () => {
    const text = tasteOf(dish(STEW, 'fine'), taster('expert'));
    expect(text).toContain('stew meat');
    expect(text).toContain('fine');
  });

  it('an unexercised palate reads as the floor — honest, not broken', () => {
    // No digest at all (a cold cache, or somebody who has never cooked).
    const text = tasteOf(dish(STEW), taster(null));
    expect(text).toContain('sweet');
    expect(text).not.toContain('stew meat');
  });

  it('⚠ every band TASTES it — the palate is never a gate', () => {
    for (const band of ['untrained', 'novice', 'competent', 'proficient', 'expert']) {
      expect(tasteOf(dish(STEW), taster(band))).toContain('It tastes');
    }
  });

  it('⚠ the palate never leaks onto `look`', () => {
    const text = lookOf(dish(STEW), taster('expert'));
    expect(text).not.toContain('It tastes');
    expect(text).not.toContain('stew meat');
  });

  it('an empty dish tastes of nothing at all', () => {
    const empty = makeStuff(() => new TestDish());
    (empty as unknown as { interiorBulk: boolean }).interiorBulk = true;
    empty.setInteriorCapacity(Quantity.of(1, 'L'));
    expect(tasteOf(empty, taster('expert'))).not.toContain('It tastes');
  });

  it('⭐ no dish anywhere authors a flavour string — the read is the composition', () => {
    // Change what went in; the reading changes, with nothing else edited.
    const other: BulkPayload = {
      ...STEW,
      parts: ['lime', 'sugar'],
      tastes: ['sour', 'sweet'],
    };
    const text = tasteOf(dish(other), taster('competent'));
    expect(text).toContain('sour');
    expect(text).toContain('lime');
    expect(text).not.toContain('stew meat');
  });
});
