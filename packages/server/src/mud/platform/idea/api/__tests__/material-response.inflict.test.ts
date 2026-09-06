/**
 * The materials-response acceptance battery — driven entirely through
 * `ConditionApi.inflict`, no combat loop. A landed `Channel` insult resolves
 * outside-in through the covering stack into the tissue, yielding both the
 * trauma type and its severity: a knife, a club, and a knife *through armor*
 * produce honestly different wounds.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConditionApi } from '../../../../api/condition';
import { MaterialApi } from '../../../../api/material';
import { MixinApi } from '../../../../api/mixin';
import { Creature } from '../../../../lib/creature/Creature';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import Garment from '../../../thing/equipment/Garment';
import Weapon from '../../../thing/equipment/Weapon';
import Material from '../../../../lib/material/Material';
import { Construction } from '../../../../lib/material/Construction';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../Condition';

// Per-instance unique paths — several bodies / materials coexist in one test.
let seq = 0;

function mat(hardness: number, toughness: number): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, 'MPa'));
  m.setToughness(Quantity.of(toughness, 'MJ/m³'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/m-${seq++}`);
  return m;
}

const steel = () => mat(600, 200);
const wool = () => mat(3, 4);

/** A Material with a thermal conductivity — the heat channel's height. */
function thermalMat(conductivityWmK: number): Material {
  const m = makeStuff(() => new Material());
  m.setThermalConductivity(Quantity.of(conductivityWmK, 'W/(m·K)'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/tm-${seq++}`);
  return m;
}

/** The plan path a body was stamped with (for slot claims). */
function planPathOf(c: Creature): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

/** A bodied creature: torso (boned) + feet, both coverable. */
function bodied(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    // Capacity 2 so a gambeson + mail can layer over the same region; the
    // covering stack orders them by construction depth, not slot.
    {
      name: 'torso',
      accepts: 'WearableMixin',
      capacity: 2,
      covers: ['body.torso'],
    },
    {
      name: 'feet',
      accepts: 'WearableMixin',
      covers: ['body.leg.left.foot', 'body.leg.right.foot'],
    },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [
        { tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 },
        { tissuePath: '/stuff/idea/material/tissue/flesh', mass: 20 },
      ],
    },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    {
      key: 'body.leg.left.foot',
      parent: 'body.leg.left',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 0.5 }],
    },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.right.foot', parent: 'body.leg.right', tissues: [] },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/test-response-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/response-${id}`);

  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

/** Wear a piece of armor of `material` + `form` on the torso of `c`. */
function wearTorso(c: Creature, material: Material, form: string): Garment {
  const a = makeStuff(() => new Garment());
  a.setMaterial(material);
  a.setConstruction(Construction.of(form));
  a.setSlotClaim(planPathOf(c), ['torso']);
  (c as unknown as { occupy(x: unknown, s: string): void }).occupy(a, 'torso');
  return a;
}

function trauma(c: Creature): Trauma | undefined {
  return c.getConditions().find((x) => x.kind === 'trauma') as
    | Trauma
    | undefined;
}

describe('materials-response — inflict through the covering stack', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('edge lacerates bare flesh but is deflected by steel plate', () => {
    const bare = bodied();
    const out = ConditionApi.inflict(bare, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 2,
    });
    expect(out.afflicted).toBe(true);
    expect(trauma(bare)!.type).toBe('laceration');

    const plated = bodied();
    wearTorso(plated, steel(), 'plate');
    const deflected = ConditionApi.inflict(plated, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 2,
    });
    expect(deflected.afflicted).toBe(false); // turned — no meaningful wound
    expect(trauma(plated)).toBeUndefined();
  });

  it('blunt contuses bare flesh but transmits through plate to a fracture', () => {
    const bare = bodied();
    ConditionApi.inflict(bare, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 1,
    });
    expect(trauma(bare)!.type).toBe('contusion');

    const plated = bodied();
    wearTorso(plated, steel(), 'plate');
    const out = ConditionApi.inflict(plated, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 2,
    });
    expect(out.afflicted).toBe(true);
    expect(trauma(plated)!.type).toBe('fracture'); // plate doesn't stop blunt
  });

  it('point penetrates mail (puncture) while mail resists an edge', () => {
    const stabbed = bodied();
    wearTorso(stabbed, steel(), 'mail');
    ConditionApi.inflict(stabbed, {
      mechanism: 'point',
      site: 'body.torso',
      energy: 2,
    });
    expect(trauma(stabbed)!.type).toBe('puncture');

    const slashed = bodied();
    wearTorso(slashed, steel(), 'mail');
    ConditionApi.inflict(slashed, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 2,
    });
    const w = trauma(slashed);
    expect(w!.type).toBe('laceration');
    expect(w!.severity).toBeLessThan(2); // resisted vs the bare 2
  });

  it('a mace wounds a plated body an edge weapon cannot (real objects)', () => {
    const dagger = makeStuff(() => new Weapon());
    dagger.setConstruction(Construction.of('bladed'));
    const mace = makeStuff(() => new Weapon());
    mace.setConstruction(Construction.of('hafted'));

    const edgeChannel = dagger.getConstruction()!.primaryChannel()!;
    const bluntChannel = mace.getConstruction()!.primaryChannel()!;

    const struckByDagger = bodied();
    wearTorso(struckByDagger, steel(), 'plate');
    const daggerOut = ConditionApi.inflict(struckByDagger, {
      mechanism: edgeChannel,
      site: 'body.torso',
      energy: 2,
    });
    expect(daggerOut.afflicted).toBe(false); // plate turns the edge

    const struckByMace = bodied();
    wearTorso(struckByMace, steel(), 'plate');
    const maceOut = ConditionApi.inflict(struckByMace, {
      mechanism: bluntChannel,
      site: 'body.torso',
      energy: 2,
    });
    expect(maceOut.afflicted).toBe(true); // blunt transmits through plate
  });

  it('layering resolves blunt outside-in — padding under mail beats mail alone', () => {
    const mailOnly = bodied();
    wearTorso(mailOnly, steel(), 'mail');
    ConditionApi.inflict(mailOnly, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 2,
    });
    const mailSeverity = trauma(mailOnly)!.severity;

    const layered = bodied();
    wearTorso(layered, steel(), 'mail'); // outer (depth 2)
    wearTorso(layered, wool(), 'padded'); // inner (depth 0) — a gambeson
    ConditionApi.inflict(layered, {
      mechanism: 'blunt',
      site: 'body.torso',
      energy: 2,
    });
    const layeredSeverity = trauma(layered)!.severity;

    expect(layeredSeverity).toBeLessThan(mailSeverity);
  });

  it('the preview band matches the resolved inflict outcome (shared chokepoint)', () => {
    // The legibility invariant: analyze-response previews via the SAME
    // MaterialApi.previewBand chokepoint inflict resolves through, at the
    // canonical reference energy (2) — so the previewed band is exactly
    // what a real blow lands. Assert equality across a few forms/channels.
    const steelMat = steel();
    const cases = [
      ['plate', 'edge'], // deflected → turned
      ['mail', 'edge'], // resisted
      ['mail', 'point'], // penetrates
    ] as const;
    for (const [form, channel] of cases) {
      const body = bodied();
      const a = makeStuff(() => new Garment());
      a.setMaterial(steelMat);
      a.setConstruction(Construction.of(form));
      a.setSlotClaim(planPathOf(body), ['torso']);
      (body as unknown as { occupy(x: unknown, s: string): void }).occupy(
        a,
        'torso',
      );

      ConditionApi.inflict(body, {
        mechanism: channel,
        site: 'body.torso',
        energy: 2,
      });
      const w = trauma(body);
      const inflictBand = MaterialApi.severityToBand(w ? w.severity : null);
      if (!MixinApi.isGraded(a)) throw new Error('graded');
      const preview = MaterialApi.previewBand(
        channel,
        steelMat,
        Construction.of(form),
        a.getGrade(),
        a.getCondition(),
      );
      expect(preview).toBe(inflictBand);
    }
  });

  it('coverage is degree, not presence — a covered site turns what an uncovered gap takes', () => {
    const c = bodied();
    wearTorso(c, steel(), 'plate'); // torso covered, feet bare

    const covered = ConditionApi.inflict(c, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 2,
    });
    expect(covered.afflicted).toBe(false); // the plate turns it

    const gap = ConditionApi.inflict(c, {
      mechanism: 'edge',
      site: 'body.leg.left.foot',
      energy: 2,
    });
    expect(gap.afflicted).toBe(true); // the uncovered foot is opened
    expect(trauma(c)!.site).toBe('body.leg.left.foot');
  });

  it('heat burns bare flesh but insulating leather turns it', () => {
    const bare = bodied();
    const out = ConditionApi.inflict(bare, {
      mechanism: 'heat',
      site: 'body.torso',
      energy: 1,
    });
    expect(out.afflicted).toBe(true);
    expect(trauma(bare)!.type).toBe('burn');

    // Leather (thermalConductivity ≈ 0.14) hide over the torso insulates the
    // heat below the no-wound floor — coverage as degree, emergent from the
    // material property, no `isThermal` special case.
    const clad = bodied();
    wearTorso(clad, thermalMat(0.14), 'hide');
    const turned = ConditionApi.inflict(clad, {
      mechanism: 'heat',
      site: 'body.torso',
      energy: 1,
    });
    expect(turned.afflicted).toBe(false);
    expect(trauma(clad)).toBeUndefined();
  });

  it('heat conducts through a metal plate to a burn (the armor inversion)', () => {
    // A conductive plate (thermalConductivity ≈ 80) barely insulates — metal
    // armor is WORSE against heat than none, emergent from conductivity.
    const plated = bodied();
    wearTorso(plated, thermalMat(80), 'plate');
    const out = ConditionApi.inflict(plated, {
      mechanism: 'heat',
      site: 'body.torso',
      energy: 1,
    });
    expect(out.afflicted).toBe(true);
    expect(trauma(plated)!.type).toBe('burn');
    expect(trauma(plated)!.mechanism).toBe('heat');
  });
});
