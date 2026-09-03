/**
 * ⭐ **The palate** (AC11) — what a dish tastes like is DERIVED from what
 * went into it and projected through the taster's competence IN THE
 * DISCIPLINE THAT MADE IT. The same bowl reads differently to two people,
 * and nothing anywhere authors a per-dish flavour string.
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
import { BulkableMixin, type BulkPayload } from '../../bulk/Bulkable';
import { GradedMixin } from '../../craft/Graded';
import { PalatableMixin } from '../Palatable';
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

/**
 * A served dish, in the shape `CraftVessel` has: graded, bulk-bearing,
 * and PALATABLE. ⚠ The palate rides `PalatableMixin`, not `Bulkable` —
 * that is the point of this file's home. A bare Bulkable (a floor
 * puddle, a garden bed) has no palate, and the last test says so.
 */
class TestDish extends PalatableMixin(GradedMixin(BulkableMixin(Thing))) {
  static _mixinName = 'TestDishPalate';
}

/** A bulk holder that is NOT palatable — the floor, a bed, an air tank. */
class TestPuddle extends BulkableMixin(Thing) {
  static _mixinName = 'TestPuddlePalate';
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
const ROOT_VEG = '/stuff/idea/material/food/root-vegetable';
const STEW_MEAT = '/stuff/idea/material/food/stew-meat';
const LIME = '/stuff/idea/material/food/lime';
const SUGAR = '/stuff/idea/material/food/sugar';

const STEW: BulkPayload = {
  name: 'hearty stew',
  appearance: 'a thick brown stew',
  nutrients: ['carb', 'protein'],
  nutrientAmounts: { carb: 34000, protein: 26000 },
  toxicity: [],
  edible: true,
  // ⭐ The COMPOSITION — Material paths and servings, not display names.
  // Asserting "root vegetable" below now requires a root-vegetable
  // Material to actually exist, which is the point: the reading is
  // derived from what went in, not from a string handed to the payload.
  composition: [
    { materialPath: ROOT_VEG, servings: 1 },
    { materialPath: STEW_MEAT, servings: 1 },
  ],
  // ⭐ The craft that made it — the discipline the palate is read
  // through. The kernel never knows the word; the recipe recorded it.
  discipline: 'cooking',
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
    // ⭐ The tastes live on the INGREDIENTS now, not on the payload — so
    // "it tastes sweet and umami" is a fact about what went in, and
    // changing an ingredient changes the reading with nothing else
    // edited. That is the whole claim this suite makes.
    for (const [path, name, tastes] of [
      [ROOT_VEG, 'root vegetable', ['sweet']],
      [STEW_MEAT, 'stew meat', ['umami']],
      [LIME, 'lime', ['sour']],
      [SUGAR, 'sugar', ['sweet']],
    ] as const) {
      makeStuffAtPath(() => {
        const ingredient = new Material();
        ingredient.setName(name);
        ingredient.setEdibility(true);
        ingredient.setTastes([...tastes]);
        return ingredient;
      }, path);
    }
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

  it('⭐ the discipline is the one that MADE it, not a word the kernel knows', () => {
    // The same taster, the same dish, read through two different crafts:
    // a cook tastes a cooked dish; a bartender tastes nothing extra off
    // it, because their skill is not the one that made it.
    const cookly = tasteOf(dish(STEW), taster('expert'));
    expect(cookly).toContain('stew meat');

    const drink: BulkPayload = { ...STEW, discipline: 'bartending' };
    const brewerly = tasteOf(dish(drink), taster('expert'));
    // Still tastes it — never a gate — but reads it at the floor.
    expect(brewerly).toContain('It tastes');
    expect(brewerly).not.toContain('stew meat');
  });

  it('a blend no recipe made records no discipline and reads at the floor', () => {
    const offSpec: BulkPayload = { ...STEW };
    delete offSpec.discipline;
    const text = tasteOf(dish(offSpec), taster('expert'));
    expect(text).toContain('It tastes');
    expect(text).not.toContain('stew meat');
  });

  it('⚠⚠ a bare Bulkable has NO palate — a puddle is not a dish', () => {
    // The whole reason this lives on `PalatableMixin`: it used to sit on
    // `BulkableMixin`, which put a taste augmenter on floors, garden
    // beds, plant pots, air tanks and watering cans.
    const puddle = makeStuff(() => new TestPuddle());
    (puddle as unknown as { interiorBulk: boolean }).interiorBulk = true;
    (puddle as unknown as { interiorMaterial: string }).interiorMaterial = COOKED;
    puddle.setInteriorCapacity(Quantity.of(1, 'L'));
    puddle.setInteriorAmount(Quantity.of(0.4, 'L'));
    puddle.getBulk('interior').setPayload(STEW);
    expect(tasteOf(puddle as unknown as Stuff, taster('expert'))).not.toContain(
      'It tastes',
    );
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
      composition: [
        { materialPath: LIME, servings: 1 },
        { materialPath: SUGAR, servings: 1 },
      ],
    };
    const text = tasteOf(dish(other), taster('competent'));
    expect(text).toContain('sour');
    expect(text).toContain('lime');
    expect(text).not.toContain('stew meat');
  });
});
