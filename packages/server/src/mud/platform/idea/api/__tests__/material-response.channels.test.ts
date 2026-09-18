/**
 * ⭐⭐ The two new channels — **cold** and **corrosion** — through the same
 * door everything else uses.
 *
 * What each is FOR, and why neither is "a new damage type":
 *
 * - **cold** shares the heat fold exactly. The insulation arithmetic is
 *   identical because what a garment does is resist a temperature
 *   DIFFERENCE; the direction is read once, at the end, to name the
 *   wound. So leather turns a freeze for the same reason it turns a burn,
 *   and steel betrays you either way.
 * - **corrosion** is the one channel where **thickness is irrelevant and
 *   the right material is everything.** Three outcomes decided by two
 *   reads and no hardness anywhere.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../../api/condition';
import { MaterialApi } from '../../../../api/material';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import Garment from '../../../thing/equipment/Garment';
import Material from '../../../../lib/material/Material';
import { Construction } from '../../../../lib/material/Construction';
import { Channels, FOLDED_CHANNELS } from '../../../../lib/material/Channel';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../Condition';

let seq = 0;

/** A material with a thermal conductivity — the insulation fold's height. */
function thermalMat(conductivityWmK: number): Material {
  const m = makeStuff(() => new Material());
  m.setThermalConductivity(Quantity.of(conductivityWmK, 'W/(m·K)'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/ch-tm-${seq++}`);
  return m;
}

/** A material with tags and an absorption capacity — corrosion's two reads. */
function chemMat(tags: string[], absorptionPct: number): Material {
  const m = makeStuff(() => new Material());
  m.setTags(tags);
  m.setWaterAbsorptionCapacity(Quantity.of(absorptionPct, '%'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/ch-cm-${seq++}`);
  return m;
}

/**
 * A garment with everything `getClo()` needs to derive a real number —
 * density, mass, a fabric form with loft, and slot claims that resolve to
 * a covered area on the wearer's plan. The channel tests above wear
 * under-authored garments on purpose (no mass, no density) so their clo
 * is 0 and the fold falls back to the slab; these are the opposite.
 */
function realGarment(
  c: Creature,
  material: Material,
  massKg: number,
): Garment {
  const g = makeStuff(() => new Garment());
  g.setMaterial(material);
  g.setMass(Quantity.of(massKg, 'kg'));
  g.setConstruction(Construction.of('woven'));
  stampTemplatePathForTest(g, `/stuff/thing/test/ch-real-${seq++}`);
  const plan = c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
  g.setSlotClaims({ [plan]: ['torso'] });
  c.occupy(g, 'torso');
  return g;
}

/** Wool: light, lofty, a poor conductor, and thirsty. */
function wool(): Material {
  const m = makeStuff(() => new Material());
  m.setDensity(Quantity.of(300, 'kg/m³'));
  m.setThermalConductivity(Quantity.of(0.04, 'W/(m·K)'));
  m.setWaterAbsorptionCapacity(Quantity.of(30, '%'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/ch-wool-${seq++}`);
  return m;
}

function bodied(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('ch-biped');
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 20 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/ch-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/ch-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

function wearTorso(c: Creature, material: Material, form: string): void {
  const g = makeStuff(() => new Garment());
  g.setMaterial(material);
  g.setConstruction(Construction.of(form));
  stampTemplatePathForTest(g, `/stuff/thing/test/ch-g-${seq++}`);
  const plan = c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
  g.setSlotClaims({ [plan]: ['torso'] });
  c.occupy(g, 'torso');
}

const woundOf = (c: Creature): Trauma | undefined =>
  c.getConditions().find((x): x is Trauma => x.kind === 'trauma');

describe('the channel vocabulary', () => {
  it('⭐ FOLDED is every channel that walks the covering stack — and not shock', () => {
    expect(FOLDED_CHANNELS).toContain('edge');
    expect(FOLDED_CHANNELS).toContain('heat');
    expect(FOLDED_CHANNELS).toContain('cold');
    expect(FOLDED_CHANNELS).toContain('corrosion');
    // ⚠ Electricity resolves by CIRCUIT — the conduction walk divides
    // current toward ground upstream — so it never consults the stack.
    // That exclusion is the reason this set exists rather than CHANNELS.
    expect(FOLDED_CHANNELS).not.toContain('shock');
  });

  it('cold is THERMAL, so it takes the insulation branch', () => {
    expect(Channels.isThermalChannel('cold')).toBe(true);
    expect(Channels.isMechanicalChannel('cold')).toBe(false);
  });

  it('corrosion is neither mechanical nor thermal — its own fold', () => {
    expect(Channels.isChannel('corrosion')).toBe(true);
    expect(Channels.isMechanicalChannel('corrosion')).toBe(false);
    expect(Channels.isThermalChannel('corrosion')).toBe(false);
  });
});

describe('cold — the heat fold, run the other way', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐ freezes bare flesh, and it is FROSTBITE not a burn', () => {
    const bare = bodied();
    const out = ConditionApi.inflict(bare, {
      mechanism: 'cold',
      site: 'body.torso',
      energy: 2,
    });
    expect(out.afflicted).toBe(true);
    expect(woundOf(bare)!.type).toBe('frostbite');
  });

  it('⭐⭐ leather insulates cold exactly as it insulates heat', () => {
    // The claim the shared fold makes: an insulator resists a temperature
    // DIFFERENCE, so the same garment answers both directions the same
    // way. Two separate folds would have let these drift.
    const leather = () => thermalMat(0.14);
    const cold = bodied();
    wearTorso(cold, leather(), 'padded');
    ConditionApi.inflict(cold, { mechanism: 'cold', site: 'body.torso', energy: 3 });

    const heat = bodied();
    wearTorso(heat, leather(), 'padded');
    ConditionApi.inflict(heat, { mechanism: 'heat', site: 'body.torso', energy: 3 });

    // Same attenuation, different wound.
    expect(woundOf(cold)?.severity ?? 0).toBeCloseTo(
      woundOf(heat)?.severity ?? 0,
      5,
    );
    expect(woundOf(cold)?.type).toBe('frostbite');
    expect(woundOf(heat)?.type).toBe('burn');
  });

  it('⚠ and steel does NOT help — the armour inversion, both directions', () => {
    const steelPlate = bodied();
    wearTorso(steelPlate, thermalMat(50), 'plate');
    ConditionApi.inflict(steelPlate, {
      mechanism: 'cold',
      site: 'body.torso',
      energy: 3,
    });
    const leatherClad = bodied();
    wearTorso(leatherClad, thermalMat(0.14), 'plate');
    ConditionApi.inflict(leatherClad, {
      mechanism: 'cold',
      site: 'body.torso',
      energy: 3,
    });
    expect(woundOf(steelPlate)!.severity).toBeGreaterThan(
      woundOf(leatherClad)?.severity ?? 0,
    );
  });
});

describe('⭐⭐ ONE insulation number — the fold reads the garment\u2019s real clo', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.6,
      weaveDensity: 0.75,
      drape: 0.6,
    });
  });
  afterEach(() => StuffApi.clearAll());

  it('a real garment derives a clo, and it is what the fold sees', () => {
    const c = bodied();
    const g = realGarment(c, wool(), 1.5);
    expect(g.getClo().rawValue()).toBeGreaterThan(0);
  });

  it('⭐⭐ a THICKER coat of the same cloth stops more of a blow — thickness was invisible before', () => {
    // The old heuristic scored a layer by its material's conductivity and
    // an ordinal "depth". A wool glove and a wool greatcoat were the same
    // number. Now the fold reads `getClo()`, which is thickness / k, so
    // the coat wins by exactly the physics.
    const thin = bodied();
    realGarment(thin, wool(), 0.3);
    ConditionApi.inflict(thin, { mechanism: 'heat', site: 'body.torso', energy: 3 });

    const thick = bodied();
    realGarment(thick, wool(), 3.0);
    ConditionApi.inflict(thick, { mechanism: 'heat', site: 'body.torso', energy: 3 });

    expect(woundOf(thick)?.severity ?? 0).toBeLessThan(
      woundOf(thin)?.severity ?? 0,
    );
  });

  it('⭐⭐ a SOAKED coat stops LESS — wetness needed no special case', () => {
    // Water conducts 23× better than the air in the loft it displaces, so
    // a wet coat's k_eff jumps and its clo collapses. `getClo()` already
    // knew this; the fold simply reads the number now. A firebolt through
    // a wet cloak is worse than through a dry one, which is correct, and
    // was inexpressible.
    const dry = bodied();
    realGarment(dry, wool(), 1.5);
    ConditionApi.inflict(dry, { mechanism: 'heat', site: 'body.torso', energy: 3 });

    const soaked = bodied();
    const g = realGarment(soaked, wool(), 1.5);
    g.wet(1);
    ConditionApi.inflict(soaked, { mechanism: 'heat', site: 'body.torso', energy: 3 });

    expect(woundOf(soaked)?.severity ?? 0).toBeGreaterThan(
      woundOf(dry)?.severity ?? 0,
    );
  });

  it('⭐ …and the same number is what thermoregulation reads', () => {
    // The reconciliation is the INPUT. This is the garment's clo; the
    // covering fold reads it per blow, `bodyInsulation` sums it per body,
    // and the shed damping divides by it. Three readers, one derivation.
    const c = bodied();
    const g = realGarment(c, wool(), 1.5);
    expect(c.bodyInsulation().rawValue()).toBeCloseTo(
      g.getClo().rawValue() * c.getSpecies()!.getBodyPlan()!.getPartSurfaceFraction('body.torso'),
      3,
    );
  });

  it('⚠ an under-authored garment (clo 0) falls back to the SLAB, not to transparent', () => {
    // A Wearable with no mass or density derives 0 clo — "unmodelled".
    // The honest fold reads that as "assume a typical slab of the
    // material", so a test garment of leather still turns a burn and a
    // test garment of steel still does not. The alternative — treating
    // 0 as transparent — made steel and leather identical.
    const leather = bodied();
    wearTorso(leather, thermalMat(0.14), 'plate');
    ConditionApi.inflict(leather, { mechanism: 'heat', site: 'body.torso', energy: 3 });
    const steel = bodied();
    wearTorso(steel, thermalMat(50), 'plate');
    ConditionApi.inflict(steel, { mechanism: 'heat', site: 'body.torso', energy: 3 });
    expect(woundOf(steel)!.severity).toBeGreaterThan(
      woundOf(leather)?.severity ?? 0,
    );
  });
});

describe('corrosion — the material is everything', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  const LIME = ['organic', 'tissue', 'leather', 'textile'];

  it('reaches bare flesh as a CAUSTIC, and the agent is still active', () => {
    const bare = bodied();
    const out = ConditionApi.inflict(bare, {
      mechanism: 'corrosion',
      site: 'body.torso',
      energy: 2,
      corrosiveTo: LIME,
    });
    expect(out.afflicted).toBe(true);
    const w = woundOf(bare)!;
    expect(w.type).toBe('caustic');
    // ⭐ The thing that makes it different in KIND: it is still happening.
    expect(w.agentActive).toBe(true);
  });

  it('⭐⭐ CONSUMED — a layer the agent eats stops nothing at all', () => {
    // Leather is on lime's list. It is being dissolved, so it passes the
    // full contact through: a hide jerkin against quicklime is not armour.
    const clad = bodied();
    wearTorso(clad, chemMat(['leather', 'organic'], 20), 'plate');
    ConditionApi.inflict(clad, {
      mechanism: 'corrosion',
      site: 'body.torso',
      energy: 2,
      corrosiveTo: LIME,
    });
    const bare = bodied();
    ConditionApi.inflict(bare, {
      mechanism: 'corrosion',
      site: 'body.torso',
      energy: 2,
      corrosiveTo: LIME,
    });
    expect(woundOf(clad)!.severity).toBeCloseTo(woundOf(bare)!.severity, 5);
  });

  it('⭐ WICKS — a linen shirt is not attacked and carries it through anyway', () => {
    // Not on the list, but absorbent. Worse than nothing is a real answer.
    const shirt = bodied();
    wearTorso(shirt, chemMat(['plant'], 30), 'padded');
    ConditionApi.inflict(shirt, {
      mechanism: 'corrosion',
      site: 'body.torso',
      energy: 3,
      corrosiveTo: ['metal'],
    });
    expect(woundOf(shirt)).toBeDefined();
  });

  it('⭐ SHEDS — plate is not attacked and not absorbent, so it runs off', () => {
    const plated = bodied();
    wearTorso(plated, chemMat(['metal'], 0.2), 'plate');
    const out = ConditionApi.inflict(plated, {
      mechanism: 'corrosion',
      site: 'body.torso',
      energy: 2,
      corrosiveTo: LIME, // does not name `metal`
    });
    expect(out.afflicted).toBe(false);
  });

  it('⭐⭐ …and the SAME plate is eaten by an acid that names metal', () => {
    // The whole claim in one pair: no amount of steel changes either
    // answer, because for corrosion the question is not how much armour
    // there is but what it is made of.
    const plated = bodied();
    wearTorso(plated, chemMat(['metal'], 0.2), 'plate');
    const out = ConditionApi.inflict(plated, {
      mechanism: 'corrosion',
      site: 'body.torso',
      energy: 2,
      corrosiveTo: ['metal'],
    });
    expect(out.afflicted).toBe(true);
    expect(woundOf(plated)!.type).toBe('caustic');
  });

  it('an agent that names nothing attacks nothing — every layer sheds', () => {
    const bare = bodied();
    const out = ConditionApi.inflict(bare, {
      mechanism: 'corrosion',
      site: 'body.torso',
      energy: 2,
      corrosiveTo: [],
    });
    // Bare flesh with an inert agent still takes the contact — there is
    // no layer to shed it. The claim is about LAYERS, not about tissue.
    expect(out.afflicted).toBe(true);
  });
});

describe('legibility — the readout shows every folded column', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ a covering previews a band on cold and corrosion, not just the three', () => {
    // The pip line and `analyze` walked MECHANICAL_CHANNELS only, so a
    // player examining a gambeson was told how it answers a sword and
    // never that it is the best thing in the game against a burn.
    const leather = thermalMat(0.14);
    for (const channel of FOLDED_CHANNELS) {
      const band = MaterialApi.previewBand(
        channel,
        leather,
        Construction.of('padded'),
      );
      expect(band, `${channel} previews`).toBeTruthy();
    }
  });

  it('⚠ a WEAPON previews `turned` on a channel it cannot deliver', () => {
    // `deliveryFor` is the mechanical shape table and throws on anything
    // else. A sword is not cold.
    const steel = chemMat(['metal'], 0.2);
    expect(MaterialApi.previewBand('cold', steel, Construction.of('bladed')))
      .toBe('turned');
    expect(
      MaterialApi.previewBand('corrosion', steel, Construction.of('bladed')),
    ).toBe('turned');
  });
});
