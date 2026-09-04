/**
 * Brewing's authored rows drive the kernel transform (fermentation W5)
 * — the REAL pack content, hydrated through the profile's own setters:
 * boiled wort is sterile (sealed never starts; open catches wild flora
 * after the authored lag; a pitch starts at once); lager refuses wild
 * and warm and ferments cold on its strain (D14's gate); the cask
 * conditions ale SEALED into naturally carbonated cask ale (P9); and
 * the mash's spent grain feeds a bed's nitrogen back (P11 — the
 * reverse B2B). A drifted pack file fails here.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import Vat from '../../platform/thing/Vat';
import MaturationProfile from '../../platform/idea/maturation/MaturationProfile';
import GardenBed from '../../platform/thing/GardenBed';
import Receptacle from '../../platform/thing/Receptacle';
import FeedController from '../../platform/idea/cmd/bulk/FeedController';
import Material from '../../lib/material/Material';
import { Reserve } from '../../lib/reserve';
import {
  SOIL_NITROGEN_RESERVE_KEY,
} from '../../lib/husbandry/Cultivable';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { ExecutionContextApi } from '../../api/execution-context';
import { CommandApi, type CommandContext } from '../../api/command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { Quantity } from '../../lib/quantity';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../lib/security/__tests__/test-setup';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { SensorMixin } from '../../lib/message/Sensor';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { NamedMixin } from '../../lib/description/Named';
import { Idea } from '../../lib/stuff/Idea';

class Grower extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'BrewingTestGrower';
}
import '../../platform/idea/WorldClockRegistry';

const PACKS = fileURLToPath(new URL('../../../../../content/', import.meta.url));
const BREWING = join(PACKS, 'trade-brewing', 'content', 'trade', 'brewing');

const DAY = 86_400;
const BASE = 40_000_000;
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

function rowData(rel: string): Record<string, unknown> {
  const raw = parse(readFileSync(join(BREWING, rel), 'utf8')) as {
    class: string;
    data: Record<string, unknown>;
  };
  return raw.data;
}

let seq = 0;

/** Stand a profile row's data up through the class's own setters. */
function standProfile(rel: string): MaturationProfile {
  const data = rowData(rel);
  return makeStuffAtPath(() => {
    const p = new MaturationProfile();
    for (const [k, v] of Object.entries(data)) {
      const setter = `set${k[0]!.toUpperCase()}${k.slice(1)}`;
      const fn = (p as unknown as Record<string, unknown>)[setter];
      if (typeof fn === 'function') {
        (fn as (x: unknown) => void).call(p, v);
      } else {
        (p as unknown as Record<string, unknown>)[k] = v;
      }
    }
    return p;
  }, `/stuff/idea/brewing-w5-${seq}/idea/maturation/${data.key as string}`);
}

/** Stand a material row's ferment-relevant face. */
function standMaterial(rel: string, path: string): Material {
  const data = rowData(rel);
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(data.name as string);
    if (typeof data.primaryKeyword === 'string') {
      m.setPrimaryKeyword(data.primaryKeyword);
    }
    m.setKeywords((data.keywords as string[]) ?? []);
    m.setTags((data.tags as string[]) ?? []);
    if (Array.isArray(data.nutrients)) m.setNutrients(data.nutrients as string[]);
    if (data.nutrientAmounts) {
      m.setNutrientAmounts(data.nutrientAmounts as Record<string, number>);
    }
    return m;
  }, path);
}

function makeVat(tempK: number): Vat {
  const vat = makeStuff(() => new Vat());
  vat.lastAmbientK = tempK;
  vat.stampedTemperatureK = tempK;
  return vat;
}

function fill(vat: Vat, material: Material, litres: number): void {
  vat.setBulkMaterial('interior', material);
  vat.setBulkAmount('interior', Quantity.of(litres, 'L'));
}

let wort!: Material;
let lagerWort!: Material;

beforeEach(() => {
  seq += 1;
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  const root = `/stuff/idea/brewing-w5-${seq}/idea/material`;
  wort = standMaterial('idea/material/wort.yaml', `${root}/wort`);
  lagerWort = standMaterial('idea/material/lager-wort.yaml', `${root}/lager-wort`);
  // The products the profiles swap to (paths must match the rows').
  for (const rel of ['ale', 'lager', 'cask-ale']) {
    const path = `/trade/brewing/idea/material/${rel}`;
    if (!StuffApi.findByTemplatePath(path)) {
      standMaterial(`idea/material/${rel}.yaml`, path);
    }
  }
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('the authored profiles agree with the strain contract (D14)', () => {
  it('the lager gate is the lager culture, and the lees trace to their species rows', () => {
    const lager = rowData('idea/maturation/lager.yaml');
    const lagerCulture = rowData('idea/maturation/lager-culture.yaml');
    expect(lager.requiresStrain).toBe(lagerCulture.strain);
    const aleCulture = rowData('idea/maturation/ale-culture.yaml');
    const aleLees = rowData('idea/material/ale-lees.yaml');
    expect((aleLees.tags as string[])).toContain(aleCulture.inputCategory);
    // The D13 bridge: each lees' biologicalSource names a shipped
    // species row (the fungi kingdom, by file).
    for (const rel of ['ale-lees', 'lager-lees']) {
      const src = rowData(`idea/material/${rel}.yaml`)
        .biologicalSource as { speciesPath: string };
      const file = join(
        PACKS,
        'base-library',
        'content',
        `${src.speciesPath}.yaml`,
      );
      expect(existsSync(file), src.speciesPath).toBe(true);
    }
  });
});

describe('boiled wort is sterile (the ale profile, real rows)', () => {
  it('sealed never starts; open catches wild flora after the lag; a pitch starts at once', () => {
    standProfile('idea/maturation/ale.yaml');
    const sealed = makeVat(288);
    fill(sealed, wort, 50);
    sealed.getMaturationPhase();
    setNow(12 * DAY);
    expect(sealed.getFractionConverted()).toBe(0);
    expect(sealed.getMaturationPhase()).toBe('active'); // waiting, not dead

    const open = makeVat(288);
    fill(open, wort, 50);
    open.open();
    open.getMaturationPhase();
    setNow(15 * DAY);
    open.getMaturationPhase();
    setNow(18 * DAY);
    expect(open.getBatchStrain()).toBe('wild');
    expect(open.getFractionConverted()).toBeGreaterThan(0);

    const pitched = makeVat(288);
    fill(pitched, wort, 50);
    pitched.getMaturationPhase();
    pitched.applyForeignPour('pitch', 'ale-yeast', 0.2);
    setNow(19 * DAY);
    expect(pitched.getFractionConverted()).toBeGreaterThan(0.2);
  });
});

describe('the lager line (D14 on real rows)', () => {
  it('refuses wild, refuses the warm brewhouse, ferments in the cold store on its strain', () => {
    standProfile('idea/maturation/lager.yaml');
    const wild = makeVat(279);
    fill(wild, lagerWort, 50);
    wild.open();
    wild.getMaturationPhase();
    setNow(6 * DAY);
    wild.getMaturationPhase();
    setNow(20 * DAY);
    expect(wild.getBatchStrain()).toBe('wild');
    expect(wild.getFractionConverted()).toBe(0);

    const warm = makeVat(288); // the brewhouse — above stallAboveK 287
    fill(warm, lagerWort, 50);
    warm.getMaturationPhase();
    warm.applyForeignPour('pitch', 'lager-yeast', 0.2);
    setNow(24 * DAY);
    expect(warm.getFractionConverted()).toBe(0);

    const cold = makeVat(279); // the cold store
    fill(cold, lagerWort, 50);
    cold.getMaturationPhase();
    cold.applyForeignPour('pitch', 'lager-yeast', 0.2);
    setNow(30 * DAY);
    expect(cold.getFractionConverted()).toBeGreaterThan(0.4);
  });
});

describe('the cask conditions (P9 on real rows)', () => {
  it('sealed ale referments its residual sugar into carbonated cask ale; open just breathes', () => {
    standProfile('idea/maturation/cask-conditioning.yaml');
    const ale = StuffApi.findByTemplatePath<Material>(
      '/trade/brewing/idea/material/ale',
    )!;
    const caskData = rowData('thing/cask.yaml');
    expect(caskData).toBeDefined();

    const sealed = makeVat(286);
    fill(sealed, ale, 40);
    sealed.getMaturationPhase(); // keyed + closed (a Vat defaults shut)
    setNow(6 * DAY);
    expect(sealed.getMaturationPhase()).toBe('finished');
    expect(sealed.getBulkMaterialPath('interior')).toBe(
      '/trade/brewing/idea/material/cask-ale',
    );
    const caskAle = StuffApi.findByTemplatePath<Material>(
      '/trade/brewing/idea/material/cask-ale',
    )!;
    expect(caskAle.getTags()).toContain('carbonated');
    expect(caskAle.getTags()).toContain('ale'); // the pint still pours it

    const open = makeVat(286);
    fill(open, ale, 40);
    open.open();
    open.getMaturationPhase();
    setNow(12 * DAY);
    expect(open.getFractionConverted()).toBe(0); // sealedOnly
  });
});

describe("the mash's residue feeds back (P11 — the reverse B2B)", () => {
  it('feeding a bed with spent grain measurably restores nitrogen', async () => {
    const grain = standMaterial(
      'idea/material/spent-grain.yaml',
      `/stuff/idea/brewing-w5-${seq}/idea/material/spent-grain`,
    );
    expect(grain.getTags()).toContain('compost'); // the feed verb's gate

    const bed = makeStuff(() => {
      const b = new GardenBed();
      b.setKeywords(['bed']);
      b.setPrimaryKeyword('bed');
      b.setReserve(
        new Reserve(
          SOIL_NITROGEN_RESERVE_KEY,
          Quantity.of(100, '%'),
          Quantity.of(30, '%'),
          'cultivation',
          'spent',
        ),
      );
      return b;
    });
    const sack = makeStuff(() => {
      const r = new Receptacle();
      r.setKeywords(['grain', 'sack']);
      r.setPrimaryKeyword('grain');
      (r as unknown as { interiorBulk: boolean }).interiorBulk = true;
      r.setInteriorCapacity(Quantity.of(8, 'L'));
      r.setBulkMaterial('interior', grain);
      r.setBulkAmount('interior', Quantity.of(8, 'L'));
      return r;
    });

    const before = bed.getReserve(SOIL_NITROGEN_RESERVE_KEY)!.current.rawValue();
    const giver = makeStuff(() => new Grower());
    const context = CommandApi.createCommandContext({
      commandGiver: giver as never,
      location: bed as never,
      commandText: 'feed bed with grain',
      executionId: 't',
      commandId: 't',
      verb: 'feed',
      command: CommandDefinition.fromYaml(
        'verbs: [feed]\ncontroller: NoopController\ndescription: stub\n',
        '<test>',
      ),
    }) as CommandContext;
    await withRootContext(null, 'brewing.test', () => {
      ExecutionContextApi.tagActingAuthor(giver);
      return makeStuff(() => new FeedController()).execute(
        {
          target: { stuff: bed as never, raw: 'bed' },
          source: { stuff: sack as never, raw: 'grain' },
        } as never,
        context,
      );
    });
    const after = bed.getReserve(SOIL_NITROGEN_RESERVE_KEY)!.current.rawValue();
    expect(after).toBeGreaterThan(before);
  });
});
