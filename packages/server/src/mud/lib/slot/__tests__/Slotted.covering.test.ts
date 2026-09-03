/**
 * The covering stack — the one outside-in walk, derived `clo`, and
 * per-part thermal.
 *
 * ⭐⭐ These are the assertions that say clothing is a physical object
 * rather than prose. Every number here comes out of material properties
 * and construction forms; **nothing is authored**, and the tests are
 * written so that authoring one would break them.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WearableMixin } from '../Wearable';
import { SlottableMixin } from '../Slottable';
import { SlottedMixin } from '../Slotted';
import { ConstructedMixin } from '../../material/Constructed';
import { ContainableMixin } from '../../spatial/Containable';
import Thing from '../../stuff/Thing';
import Material from '../../material/Material';
import { Construction } from '../../material/Construction';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestGarment extends WearableMixin(
  SlottableMixin(ContainableMixin(ConstructedMixin(Thing))),
) {}
class Rack extends SlottedMixin(Thing) {}

let seq = 0;
let planPath = '';

/** The shipped biped's shape, small enough to reason about by hand. */
function dressableBody(): Creature {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`cover-biped-${n}`);
  plan.setBaseMass(70);
  plan.setBaseStature(1.75);
  plan.setSlots([
    // ⚠ Capacity 4, mirroring the shipped biped: a covering slot that
    // holds one thing cannot layer at all.
    { name: 'head', accepts: 'WearableMixin', capacity: 4, covers: ['body.head'] },
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
    {
      name: 'hands',
      accepts: 'WearableMixin',
      capacity: 4,
      covers: ['body.arm.left.hand', 'body.arm.right.hand'],
    },
    { name: 'sheath', accepts: 'SlottableMixin' },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [
        { tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 },
        { tissuePath: '/stuff/idea/material/tissue/flesh', mass: 32 },
      ],
    },
    {
      key: 'body.head',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 5 }],
    },
    {
      key: 'body.arm.left.hand',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 1 }],
    },
    {
      key: 'body.arm.right.hand',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 1 }],
    },
    // ⚠ An ORGAN — no external surface, and excluded from the weighting.
    {
      key: 'body.torso.heart',
      parent: 'body.torso',
      governsVital: 'heartRate',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 0.3 }],
    },
  ]);
  planPath = `/stuff/idea/species/BodyPlan/cover-${n}`;
  stampTemplatePathForTest(plan, planPath);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/cover-${n}`);

  const body = makeStuff(() => new Creature());
  body.setSpecies(species);
  return body;
}

function fibre(
  name: string,
  opts: {
    density: number;
    conductivity: number;
    absorption: number;
  },
): Material {
  const m = makeStuff(() => new Material());
  m.setName(name);
  m.setDensity(Quantity.of(opts.density, 'kg/m³'));
  m.setThermalConductivity(Quantity.of(opts.conductivity, 'W/(m·K)'));
  m.setWaterAbsorptionCapacity(Quantity.of(opts.absorption, '%'));
  stampTemplatePathForTest(m, `/stuff/idea/material/textile/${name}-${seq++}`);
  return m;
}

/** The two shipped fibres, verbatim from their rows. */
const wool = () =>
  fibre('wool', { density: 1310, conductivity: 0.04, absorption: 33 });
const linen = () =>
  fibre('linen', { density: 1500, conductivity: 0.05, absorption: 20 });

function garment(
  material: Material,
  slots: string[],
  massKg: number,
  form = 'woven',
): TestGarment {
  const g = makeStuff(() => new TestGarment());
  g.setMaterial(material);
  g.setMass(Quantity.of(massKg, 'kg'));
  g.setConstructionForm(form);
  g.setSlotClaim(planPath, slots);
  return g;
}

describe('derived `clo` — physics, never an authored number', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
    Construction.registerFabric({
      key: 'knit',
      layerBand: 0,
      loft: 0.45,
      weaveDensity: 0.35,
      drape: 0.8,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('⚠ there is no `clo` FIELD to author — only a derived read', () => {
    const g = makeStuff(() => new TestGarment());
    expect(
      (g as unknown as Record<string, unknown>).clo,
    ).toBeUndefined();
    expect(
      (g as unknown as Record<string, unknown>).setClo,
    ).toBeUndefined();
    const meta = (WearableMixin as unknown as {
      (b: never): { fieldMeta: Record<string, unknown> };
    });
    void meta;
    expect(Object.keys(TestGarment.fieldMeta ?? {})).not.toContain('clo');
  });

  it('⭐ wool out-insulates linen AT EQUAL MASS, from material properties alone', () => {
    // AC 2. Nothing about wool is special-cased: it conducts at 0.04
    // where linen conducts at 0.05, and it is less dense, so the same
    // mass of it is thicker AND conducts worse. Both effects fall out
    // of the two authored numbers.
    dressableBody();
    const woolCoat = garment(wool(), ['torso'], 1.0);
    const linenCoat = garment(linen(), ['torso'], 1.0);
    expect(woolCoat.getClo().rawValue()).toBeGreaterThan(
      linenCoat.getClo().rawValue(),
    );
  });

  it('⭐ form is a REAL thermal parameter — a knit beats a weave', () => {
    // "Form sets the band" is not merely an ordering rule. The loops of
    // a knit trap air, and air is the insulator; the same wool woven
    // flat insulates less.
    dressableBody();
    const knitted = garment(wool(), ['torso'], 1.0, 'knit');
    const woven = garment(wool(), ['torso'], 1.0, 'woven');
    expect(knitted.getClo().rawValue()).toBeGreaterThan(
      woven.getClo().rawValue(),
    );
  });

  it('states its insulation with NO WEARER (the shop shelf)', () => {
    dressableBody();
    const coat = garment(wool(), ['torso'], 1.0);
    expect(coat.getClo().rawValue()).toBeGreaterThan(0);
  });

  it('an unmodelled garment insulates NOTHING rather than guessing', () => {
    dressableBody();
    const bare = makeStuff(() => new TestGarment());
    expect(bare.getClo().rawValue()).toBe(0);
  });
});

describe('wet cloth is a different object', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('⭐ a soaked garment LOSES insulation and GAINS mass', () => {
    // AC 3. Water floods the loft, and the loft is where the insulation
    // lived — water conducts 23× better than the air it displaced.
    dressableBody();
    const coat = garment(wool(), ['torso'], 1.0);
    const dryClo = coat.getClo().rawValue();
    const dryMass = coat.getMass().rawValue();
    coat.wet(1);
    expect(coat.getClo().rawValue()).toBeLessThan(dryClo);
    expect(coat.getMass().rawValue()).toBeGreaterThan(dryMass);
  });

  it('⭐ wet wool retains more than wet linen — because absorption differs', () => {
    // Not a special case for wool: linen holds 20% of its mass in water
    // and wool 33%, so the two end up at different flooded fractions,
    // and the arithmetic does the rest.
    dressableBody();
    const woolCoat = garment(wool(), ['torso'], 1.0);
    const linenCoat = garment(linen(), ['torso'], 1.0);
    woolCoat.wet(1);
    linenCoat.wet(1);
    expect(woolCoat.getClo().rawValue()).toBeGreaterThan(
      linenCoat.getClo().rawValue(),
    );
  });

  it('⚠ a soaked ORGANISM does not gain a quarter of its body mass', () => {
    // The carve-out, asserted. Flesh authors a 25% absorption capacity,
    // so without it a rained-on character would move carry capacity,
    // thermal mass, basal drain and the mass-scaled fist at once. A
    // body's water is metabolism's business.
    const body = dressableBody();
    body.setMass(Quantity.of(70, 'kg'));
    body.setMaterial(
      fibre('flesh', { density: 1000, conductivity: 0.5, absorption: 25 }),
    );
    const dry = body.getMass().rawValue();
    body.wet(1);
    expect(body.getMass().rawValue()).toBe(dry);
  });
});

describe('the covering stack orders itself', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('⭐ form sets the band; wear-order breaks ties INSIDE a band', () => {
    // AC 5. Plate is band 4 and cloth band 0, so plate reads outermost
    // however it was put on; two cloth garments are decided by wear
    // order, later-worn outer.
    const body = dressableBody();
    const shirt = garment(linen(), ['torso'], 0.25);
    const coat = garment(wool(), ['torso'], 1.0);
    const cuirass = garment(wool(), ['torso'], 8, 'plate');
    // Deliberately worn innermost-last, which wear order alone would
    // put outermost.
    body.occupyAll(cuirass, ['torso']);
    body.occupyAll(shirt, ['torso']);
    body.occupyAll(coat, ['torso']);

    const stack = body.coveringAt('body.torso');
    expect(stack[0]).toBe(cuirass);
    // …and inside the cloth band, the coat went on after the shirt.
    expect(stack.indexOf(coat)).toBeLessThan(stack.indexOf(shirt));
  });

  it('⚠ a shirt cannot go over plate — but a coat over a shirt is fine', () => {
    const body = dressableBody();
    const cuirass = garment(wool(), ['torso'], 8, 'plate');
    const shirt = garment(linen(), ['torso'], 0.25);
    const coat = garment(wool(), ['torso'], 1.0);

    body.occupyAll(cuirass, ['torso']);
    expect(body.wouldLayerViolate(shirt)).toBe(true);

    // Both band 0 — which goes on first is the player's call, and its
    // consequence is being cold rather than being prevented.
    const bare = dressableBody();
    const innerShirt = garment(linen(), ['torso'], 0.25);
    const outerCoat = garment(wool(), ['torso'], 1.0);
    bare.occupyAll(innerShirt, ['torso']);
    expect(bare.wouldLayerViolate(outerCoat)).toBe(false);
    void coat;
  });

  it('`outermostAt` answers which layer takes a deposit', () => {
    // AC 20 — the soiling seam. The apron works the moment a deposit
    // driver exists, with nothing retrofitted here.
    const body = dressableBody();
    const shirt = garment(linen(), ['torso'], 0.25);
    const apron = garment(linen(), ['torso'], 0.4);
    body.occupyAll(shirt, ['torso']);
    expect(body.outermostAt('body.torso')).toBe(shirt);
    body.occupyAll(apron, ['torso']);
    expect(body.outermostAt('body.torso')).toBe(apron);
    // …and the shirt when nothing outer covers the part at all.
    expect(body.outermostAt('body.head')).toBeNull();
  });

  it('a non-Wearable slot occupant is not part of the covering', () => {
    const body = dressableBody();
    const sheathed = makeStuff(() => new (class extends SlottableMixin(Thing) {})());
    body.occupy(sheathed, 'sheath');
    expect(body.coveringAt('body.torso')).toHaveLength(0);
  });

  it('a Slotted host with no body plan answers empty and zero', () => {
    const rack = makeStuff(() => new Rack());
    rack.setStaticSlots([{ name: 'peg:1', accepts: 'WearableMixin' }]);
    expect(rack.coveringAt('body.torso')).toHaveLength(0);
    expect(rack.outermostAt('body.torso')).toBeNull();
    expect(rack.bodyInsulation().rawValue()).toBe(0);
    expect(rack.wouldLayerViolate(
      makeStuff(() => new TestGarment()),
    )).toBe(false);
  });
});

describe('per-part thermal — the consumer `getSlotsCovering` never had', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('⚠ an UNCOVERED part is colder than a covered one', () => {
    // AC 4. A body-wide sum cannot say this at all, which is exactly
    // why it could not teach that bare extremities cost you.
    const body = dressableBody();
    body.occupyAll(garment(wool(), ['torso'], 1.0), ['torso']);
    expect(body.insulationAt('body.torso').rawValue()).toBeGreaterThan(0);
    expect(body.insulationAt('body.arm.left.hand').rawValue()).toBe(0);
  });

  it('⭐ a bare hand costs exactly its SURFACE SHARE, not a flat penalty', () => {
    const body = dressableBody();
    const plan = body.getSpecies()!.getBodyPlan()!;
    const torso = plan.getPartSurfaceFraction('body.torso');
    const hand = plan.getPartSurfaceFraction('body.arm.left.hand');
    expect(torso).toBeGreaterThan(hand);
    // The shares are a partition of 1 over the EXTERNAL parts.
    const total =
      torso +
      plan.getPartSurfaceFraction('body.head') +
      hand +
      plan.getPartSurfaceFraction('body.arm.right.hand');
    expect(total).toBeCloseTo(1, 6);
    // ⚠ The heart is internal — it has no surface and no share.
    expect(plan.getPartSurfaceFraction('body.torso.heart')).toBe(0);
  });

  it('⭐ a garment covering MORE parts is worth more at the same clo', () => {
    // "A cloak beats a shirt because it covers more" — the whole point
    // of weighting, and it needs both garments to have equal per-part
    // insulation for the comparison to be about coverage.
    const shirtBody = dressableBody();
    shirtBody.occupyAll(garment(wool(), ['torso'], 1.0), ['torso']);
    const shirtOnly = shirtBody.bodyInsulation().rawValue();

    const cloakBody = dressableBody();
    cloakBody.occupyAll(garment(wool(), ['torso'], 1.0), ['torso']);
    cloakBody.occupyAll(garment(wool(), ['head'], 0.2), ['head']);
    cloakBody.occupyAll(garment(wool(), ['hands'], 0.1), ['hands']);
    expect(cloakBody.bodyInsulation().rawValue()).toBeGreaterThan(shirtOnly);
  });
});

describe('windproofing — no `shell` role word', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.9,
      drape: 0.6,
    });
    Construction.registerFabric({
      key: 'knit',
      layerBand: 0,
      loft: 0.45,
      weaveDensity: 0.2,
      drape: 0.8,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('⭐ a close weave breaks the wind and an open one does not', () => {
    // The dense oiled thing simply IS a shell. Nobody authors that.
    const wovenBody = dressableBody();
    wovenBody.occupyAll(garment(wool(), ['torso'], 1.0, 'woven'), ['torso']);
    const knitBody = dressableBody();
    knitBody.occupyAll(garment(wool(), ['torso'], 1.0, 'knit'), ['torso']);
    expect(wovenBody.windproofing()).toBeGreaterThan(knitBody.windproofing());
  });

  it('⚠ only the OUTERMOST layer counts', () => {
    // A jumper under an open coat does not break a wind, which is the
    // whole reason you put the coat on.
    const body = dressableBody();
    body.occupyAll(garment(wool(), ['torso'], 1.0, 'woven'), ['torso']);
    const shelteredByWeave = body.windproofing();
    body.occupyAll(garment(wool(), ['torso'], 0.8, 'knit'), ['torso']);
    expect(body.windproofing()).toBeLessThan(shelteredByWeave);
  });

  it('a soaked shell stops working', () => {
    const body = dressableBody();
    const shell = garment(wool(), ['torso'], 1.0, 'woven');
    body.occupyAll(shell, ['torso']);
    const dry = body.windproofing();
    shell.wet(1);
    expect(body.windproofing()).toBeLessThan(dry);
  });

  it('a bare body reads zero', () => {
    expect(dressableBody().windproofing()).toBe(0);
  });
});

describe('fit consequences ride SHIPPED mechanisms', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('⭐ a LOOSE garment insulates less — air gaps convect the warmth away', () => {
    // The penalty lands on `insulationAt`, not inside `getClo()`, whose
    // whole point is being wearer-free: a garment on a shelf has no fit.
    const body = dressableBody();
    const coat = garment(wool(), ['torso'], 1.0);
    body.occupyAll(coat, ['torso']);
    const wellFitted = body.insulationAt('body.torso').rawValue();
    expect(wellFitted).toBeGreaterThan(0);
    // Now cut it for a much bigger body — same cloth, same mass.
    const plan = body.getSpecies()!.getBodyPlan()!;
    coat.setCutTo(plan.getTemplatePath()!, 2.4, 12);
    expect(coat.fitOn(body).looseness).toBeGreaterThan(0);
    expect(body.insulationAt('body.torso').rawValue()).toBeLessThan(
      wellFitted,
    );
    // …and the garment's OWN clo is untouched, because clo is physics.
    expect(coat.getClo().rawValue()).toBeGreaterThan(0);
  });
});
