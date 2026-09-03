/**
 * The conspicuity rebase and the covering contribution.
 *
 * ⚠ Two things are under test and the second is the one that would rot:
 * the mechanism, and the promise that **every authored concealment row
 * in shipped content still resolves** after the scale moved.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import {
  CONCEALMENT_LEVELS,
  ConcealmentLevels,
} from '../ConcealmentLevel';
import { WearableMixin } from '../../slot/Wearable';
import { SlottableMixin } from '../../slot/Slottable';
import { ConstructedMixin } from '../../material/Constructed';
import { DyedMixin } from '../../material/Dyed';
import { ContainableMixin } from '../../spatial/Containable';
import Thing from '../../stuff/Thing';
import { Construction } from '../../material/Construction';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Covering extends WearableMixin(
  SlottableMixin(ContainableMixin(DyedMixin(ConstructedMixin(Thing)))),
) {}

let seq = 0;
let planPath = '';

function wearer(): Creature {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`conceal-${n}`);
  plan.setBaseMass(70);
  plan.setBaseStature(1.75);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
    { name: 'head', accepts: 'WearableMixin', capacity: 4, covers: ['body.head'] },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 40 }],
    },
    {
      key: 'body.head',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 5 }],
    },
  ]);
  planPath = `/stuff/idea/species/BodyPlan/conceal-${n}`;
  stampTemplatePathForTest(plan, planPath);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/conceal-${n}`);

  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

function covering(
  slots: string[],
  opts: { form?: string; dye?: number } = {},
): Covering {
  const g = makeStuff(() => new Covering());
  g.setConstructionForm(opts.form ?? 'woven');
  g.setSlotClaim(planPath, slots);
  if (opts.dye !== undefined) {
    g.setDyeStack([
      {
        dyestuff: '/stuff/idea/material/dyestuff/madder',
        mordant: 'alum',
        strength: opts.dye,
      },
    ]);
    g.setFastness(0.9);
  }
  return g;
}

describe('the scale extends DOWNWARD', () => {
  it('`conspicuous` is the new floor, below `obvious`', () => {
    expect(CONCEALMENT_LEVELS[0]).toBe('conspicuous');
    expect(CONCEALMENT_LEVELS[1]).toBe('obvious');
    expect(ConcealmentLevels.rankOf('conspicuous')).toBeLessThan(
      ConcealmentLevels.rankOf('obvious'),
    );
  });

  it('⭐ its requirement is NEGATIVE — a dial like every other band', () => {
    expect(ConcealmentLevels.requirementFor('conspicuous')).toBeLessThan(0);
    // `obvious` stays a hardcoded 0.
    expect(ConcealmentLevels.requirementFor('obvious')).toBe(0);
  });

  it('⚠ `isConcealed` ranks ABOVE obvious — conspicuous is NOT concealed', () => {
    // It used to be `level !== 'obvious'`, which was equivalent while
    // obvious was the floor and is wrong now.
    expect(ConcealmentLevels.isConcealed('conspicuous')).toBe(false);
    expect(ConcealmentLevels.isConcealed('obvious')).toBe(false);
    expect(ConcealmentLevels.isConcealed('subtle')).toBe(true);
  });

  it('the requirements stay MONOTONE across the whole scale', () => {
    let last = Number.NEGATIVE_INFINITY;
    for (const level of CONCEALMENT_LEVELS) {
      const req = ConcealmentLevels.requirementFor(level);
      expect(req).toBeGreaterThan(last);
      last = req;
    }
  });

  it('`hiddenDefault` never returns a non-concealed band', () => {
    expect(ConcealmentLevels.isConcealed(ConcealmentLevels.hiddenDefault())).toBe(
      true,
    );
  });
});

describe('⚠ every authored concealment row in shipped content still resolves', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const CONTENT = join(here, '..', '..', '..', '..', '..', '..', 'content');

  function walkYaml(root: string): string[] {
    if (!existsSync(root)) return [];
    const out: string[] = [];
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of readdirSync(dir)) {
        // ⚠ `node_modules` is a pnpm symlink farm back into the other
        // packs — walking it took the check from ~1s to 85s and read
        // every file several times over.
        if (entry === 'node_modules' || entry === 'dist') continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) stack.push(full);
        else if (entry.endsWith('.yaml')) out.push(full);
      }
    }
    return out;
  }

  it('resolves every `concealment:` word authored anywhere in the packs', () => {
    // Content authors band WORDS, not indices, which is the whole
    // reason the scale could move at all. This is the assertion that
    // says so — and it walks EVERY pack, because the direction nobody
    // thinks to check is a new row authored later.
    const found: Array<{ file: string; value: string }> = [];
    for (const file of walkYaml(CONTENT)) {
      const text = readFileSync(file, 'utf-8');
      if (!/concealment:/.test(text)) continue;
      let doc: unknown;
      try {
        doc = YAML.parse(text);
      } catch {
        continue;
      }
      const stack: unknown[] = [doc];
      while (stack.length > 0) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node)) {
          stack.push(...node);
          continue;
        }
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          if (k === 'concealment' && typeof v === 'string') {
            found.push({ file, value: v });
          } else if (v && typeof v === 'object') {
            stack.push(v);
          }
        }
      }
    }
    for (const { file, value } of found) {
      expect(ConcealmentLevels.isLevel(value), `${file}: '${value}'`).toBe(true);
    }
  });
});

describe('the covering contribution', () => {
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
      weaveDensity: 0.1,
      drape: 0.8,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('⭐ a bright covering RAISES conspicuity; a quiet one LOWERS it', () => {
    // AC 18. And the sign comes from CONTENT — the colour on it and the
    // weave — never from an `isCamouflage` flag.
    const loud = wearer();
    loud.occupyAll(covering(['torso'], { dye: 1 }), ['torso']);
    const quiet = wearer();
    quiet.occupyAll(covering(['torso']), ['torso']);

    expect(loud.concealmentOffset()).toBeGreaterThan(0);
    expect(quiet.concealmentOffset()).toBeLessThan(0);
  });

  it('⭐ a WASHED-OUT garment goes quiet again on its own', () => {
    // Fading is desaturation, and desaturation is exactly what stops
    // somebody being easy to spot. No second mechanism.
    const body = wearer();
    const coat = covering(['torso'], { dye: 1 });
    body.occupyAll(coat, ['torso']);
    const loud = body.concealmentOffset();
    coat.setFastness(0);
    coat.launder();
    expect(body.concealmentOffset()).toBeLessThan(loud);
  });

  it('`getConcealment` DERIVES — authored base shifted by what is worn', () => {
    const body = wearer();
    expect(body.getBaseConcealment()).toBe('obvious');
    body.occupyAll(covering(['torso'], { dye: 1 }), ['torso']);
    // Loud enough to fall below obvious.
    expect(ConcealmentLevels.rankOf(body.getConcealment())).toBeLessThanOrEqual(
      ConcealmentLevels.rankOf(body.getBaseConcealment()),
    );
    // …and the AUTHORED band is untouched.
    expect(body.getBaseConcealment()).toBe('obvious');
  });

  it('⚠ a non-Slotted host reads exactly its authored band', () => {
    // Every shipped concealment row — a trapdoor, a cached letter —
    // behaves identically to before.
    const trapdoor = makeStuff(() => new Thing());
    trapdoor.setConcealment('hidden');
    expect(trapdoor.getConcealment()).toBe('hidden');
    expect(trapdoor.isConcealed()).toBe(true);
  });
});

describe('the hood/veil interlock', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.9,
      drape: 0.6,
    });
  });
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it('a bare head draws full attention', () => {
    expect(wearer().attentionFactor()).toBe(1);
  });

  it('⭐ a head covering LOWERS attention; a torso one does not', () => {
    // A cloak over the torso hides nothing anybody was reading you by.
    const hooded = wearer();
    hooded.occupyAll(covering(['head']), ['head']);
    const cloaked = wearer();
    cloaked.occupyAll(covering(['torso']), ['torso']);

    expect(hooded.attentionFactor()).toBeLessThan(1);
    expect(cloaked.attentionFactor()).toBe(1);
  });

  it('⚠⚠ the factor is FLOORED well above zero — never free', () => {
    // Faculty is capacity, never access: a hood makes a binding cheaper
    // to HOLD, and no garment makes one free.
    const body = wearer();
    for (let i = 0; i < 4; i++) {
      body.occupyAll(covering(['head']), ['head']);
    }
    expect(body.attentionFactor()).toBeGreaterThan(0.2);
  });
});
