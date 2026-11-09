/**
 * ⭐⭐ SoilableMixin — dirt by kind, on the layer an act reached, with NO
 * clock (cleanliness D1, AC 1–2). The hands clock is retired: a clean
 * hand stays clean until something touches it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Garment from '../../../platform/thing/equipment/Garment';
import CraftVessel from '../../../platform/thing/CraftVessel';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { DirtKind } from '../DirtKind';
import { DocumentNotResidentError } from '../../errors';
import Cleanser from '../../../platform/idea/Cleanser';
import Material from '../../material/Material';
import { installDirtKinds } from './soil-fixtures';
import { Template } from '../../stuff/Template';
import { TemplatePaths } from '../../paths';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { rememberShippedDirt } from './soil-fixtures';

const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

const DIRT_ROWS = [
  { key: 'blood', adjective: 'bloodied', form: 'stain', setsAboveK: 318 },
  { key: 'grease', adjective: 'greasy' },
  { key: 'mud', adjective: 'muddy' },
  { key: 'manure', adjective: 'dung-spattered', contaminates: { 'e-coli': 0.3 } },
];

function warmDirt(rows: readonly Record<string, unknown>[] = DIRT_ROWS as Record<string, unknown>[]): void {
  installDirtKinds(rows);
}

let seq = 0;
/** A biped small enough to reason about: a torso, two hands. */
function body(): Creature {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`soil-biped-${n}`);
  plan.setBaseMass(70);
  plan.setBaseStature(1.75);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
    {
      name: 'hands',
      accepts: 'WearableMixin',
      capacity: 4,
      covers: ['body.arm.left.hand', 'body.arm.right.hand'],
    },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.arm.left.hand', parent: 'body.torso', serves: ['manipulation'], tissues: [] },
    { key: 'body.arm.right.hand', parent: 'body.torso', serves: ['manipulation'], tissues: [] },
  ]);
  const planPath = `/stuff/idea/species/BodyPlan/soil-${n}`;
  stampTemplatePathForTest(plan, planPath);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/soil-${n}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  (c as unknown as { _planPath: string })._planPath = planPath;
  return c;
}

function gloves(on: Creature): Garment {
  const g = makeStuff(() => new Garment());
  g.setSlotClaim((on as unknown as { _planPath: string })._planPath, ['hands']);
  on.occupyAll(g, ['hands']);
  return g;
}

beforeEach(() => {
  rememberShippedDirt();
  installV1QuantityMarshallers();
  atGameSeconds(10_000);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('a deposit — kind, amount, site, band', () => {
  it('reads in bands, as words', () => {
    const shirt = makeStuff(() => new Garment());
    expect(shirt.soilBand()).toBe('clean');
    shirt.soil('/platform/dirt/mud', 0.15);
    expect(shirt.soilBand()).toBe('marked');
    shirt.soil('/platform/dirt/mud', 0.3);
    expect(shirt.soilBand()).toBe('soiled');
    shirt.soil('/platform/dirt/grease', 0.6);
    expect(shirt.soilBand()).toBe('filthy');
    // Heaviest first.
    expect(shirt.soilKinds()).toEqual(['/platform/dirt/grease', '/platform/dirt/mud']);
  });

  it('⭐⭐ AC 1 — nothing has a clock: a game week of idling changes nothing', () => {
    const shirt = makeStuff(() => new Garment());
    shirt.soil('/platform/dirt/mud', 0.5);
    const before = shirt.soilAt();
    atGameSeconds(10_000 + 7 * 86_400);
    expect(shirt.soilAt()).toBe(before);
    expect(shirt.soilBand()).toBe('soiled');
    // …and a clean one stays clean.
    const clean = makeStuff(() => new Garment());
    expect(clean.soilBand()).toBe('clean');
  });

  it('describes the kinds with their rows\' adjectives', async () => {
    warmDirt();
    const apron = makeStuff(() => new Garment());
    apron.soil('/platform/dirt/blood', 0.5);
    apron.soil('/platform/dirt/grease', 0.5);
    expect(apron.describeSoil()).toBe('bloodied and greasy');
    expect(apron.soilPhrase()).toBe('filthy, bloodied and greasy');
    expect(apron.soilLookLine()).toBe('It is filthy, bloodied and greasy.');
  });

  it('⚠ a dirt nothing loaded is never read as its key — the soil act throws, by path', () => {
    const apron = makeStuff(() => new Garment());
    expect(() => apron.soil('/t/dirt/never-loaded', 0.5)).toThrow(/never-loaded/);
  });

  it('removing soil by fraction, to clean', () => {
    const g = makeStuff(() => new Garment());
    g.soil('/platform/dirt/mud', 0.5);
    g.removeSoil('/platform/dirt/mud', 0.5);
    expect(g.soilLoad('/platform/dirt/mud')).toBeCloseTo(0.25, 4);
    g.removeSoil('/platform/dirt/mud', 1);
    expect(g.soilBand()).toBe('clean');
    expect(g.soilKinds()).toEqual([]);
  });

  it('⭐ a deposit clears the heat stamp — sterile, touched, is not sterile', () => {
    const g = makeStuff(() => new Garment());
    g.recordHeat(373, 600);
    expect(g.getHeatStamp()?.peakK).toBe(373);
    g.soil('/platform/dirt/sweat', 0.05);
    expect(g.getHeatStamp()).toBeNull();
  });

  it('⭐ blood keeps the bleeder\'s sample; nothing else is attributed', () => {
    const bleeder = makeStuff(() => new Creature());
    vi.spyOn(bleeder, 'bloodType').mockReturnValue('B');
    vi.spyOn(bleeder, 'bloodSystemOf').mockReturnValue('/sys/abo');
    stampTemplatePathForTest(bleeder, '/platform/agent/Avatar/_bleeder');
    const coat = makeStuff(() => new Garment());
    coat.soil('/platform/dirt/blood', 0.5, bleeder);
    coat.soil('/platform/dirt/mud', 0.5, bleeder);
    const stains = coat.stainsOf();
    expect(stains).toHaveLength(1);
    expect(stains[0]).toMatchObject({ kind: '/platform/dirt/blood', type: 'B', system: '/sys/abo', set: false });
    // Washed off, the sample goes with it.
    coat.removeSoil('/platform/dirt/blood', 1);
    expect(coat.stainsOf()).toEqual([]);
  });

  it('a row\'s `contaminates` seeds a Contaminable host', async () => {
    warmDirt();
    // CraftVessel is the shipped Soilable + Contaminable host.
    const block = makeStuff(() => new CraftVessel());
    const spy = vi.spyOn(block, 'contaminate');
    block.soil('/platform/dirt/manure', 0.5);
    expect(spy).toHaveBeenCalledWith('e-coli', 0.15);
  });

  it('⛔ stains are a SPOILER — the bleeder\'s type is what `analyze` is for', () => {
    const meta = MixinApi.getAllFieldMeta(Garment);
    expect(meta.stains?.spoiler).toBe(2);
  });
});

describe('the body — the layer an act reaches (D4, D5)', () => {
  it('⭐ AC 2 — bare hands take it; a body is clean until touched', () => {
    const c = body();
    expect(c.handCleanliness()).toBe(1);
    c.soilHands('/platform/dirt/blood', 0.6);
    expect(c.soilBand('body.arm.left.hand')).toBe('soiled');
    expect(c.handCleanliness()).toBeCloseTo(0.4, 5);
    expect(c.soilBand('body.torso')).toBe('clean');
  });

  it('⭐ AC 3 — gloves take the dirt, the hands under them do not', () => {
    const c = body();
    const g = gloves(c);
    c.soilHands('/platform/dirt/blood', 0.6);
    expect(g.soilBand()).toBe('soiled');
    expect(c.soilAt('body.arm.left.hand')).toBe(0);
    // The hands READ dirty through the gloves (that is what touches the wound).
    expect(c.handCleanliness()).toBeCloseTo(0.4, 5);
    // Washing in gloves washes the gloves.
    c.washHands();
    expect(g.soilBand()).toBe('clean');
    expect(c.handCleanliness()).toBe(1);
  });

  it('an apron over a shirt: the outer layer takes it; sweat reaches the inner', () => {
    const c = body();
    const plan = (c as unknown as { _planPath: string })._planPath;
    const shirt = makeStuff(() => new Garment());
    shirt.setSlotClaim(plan, ['torso']);
    c.occupyAll(shirt, ['torso']);
    const apron = makeStuff(() => new Garment());
    apron.setSlotClaim(plan, ['torso']);
    c.occupyAll(apron, ['torso']);
    c.soilBodyPart('body.torso', '/platform/dirt/blood', 0.5);
    expect(apron.soilBand()).toBe('soiled');
    expect(shirt.soilBand()).toBe('clean');
    c.soilBodyPart('body.torso', '/platform/dirt/sweat', 0.2, null, 'inner');
    expect(shirt.soilBand()).toBe('marked');
  });

  it('the look line speaks only for bare skin', () => {
    const c = body();
    c.soilHands('/platform/dirt/mud', 0.5);
    expect(c.soilLookLine(c)).toBe('Your hands are soiled, muddy.');
    expect(c.soilLookLine(null)).toMatch(/^Their hands are soiled/);
    gloves(c);
    expect(c.soilLookLine(c)).toBe('');
  });
});

describe('the documents read themselves (D2, AC 23; no catalogue — B50)', () => {
  it('a dirt kind is named by its path, and reads its own document', () => {
    warmDirt([{ key: '/trade/mining/dirt/dust', adjective: 'dusty' }]);
    const row = DirtKind.need('/trade/mining/dirt/dust');
    expect(row.adjective).toBe('dusty');
    expect(row.form).toBe('film');
  });

  it('a malformed document is refused, naming what is wrong (installer + loader)', () => {
    expect(() => DirtKind.fromData({ form: 'puddle' }, '/t/dirt/bad')).toThrow(/form 'puddle'/);
    expect(() => DirtKind.fromData({ answersTo: ['magic'] }, '/t/dirt/worse')).toThrow(/magic/);
  });

  it('a sync read of a dirt nothing loaded is an engine defect, thrown by path', () => {
    expect(() => DirtKind.need('/t/dirt/never-loaded')).toThrow(DocumentNotResidentError);
  });

  it('⭐ a cleanser is what its MATERIAL names — no search by tag', () => {
    makeStuffAtPath(
      () => Object.assign(new Cleanser(), { key: 'soap', agent: 'soap', action: 'surfactant', hardWaterPenalty: true }),
      '/platform/idea/Cleanser/soap',
    );
    const soap = makeStuffAtPath(() => new Material(), '/stuff/idea/material/_test/soap');
    soap.setCleanser('/platform/idea/Cleanser/soap');
    expect(soap.getCleanser()?.action).toBe('surfactant');
    const sand = makeStuffAtPath(() => new Material(), '/stuff/idea/material/_test/sand');
    expect(sand.getCleanser()).toBeNull();
  });
});
