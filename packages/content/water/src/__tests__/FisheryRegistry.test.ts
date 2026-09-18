/**
 * FisheryRegistry (fishing B1) — **every reach holds what belongs in it,
 * unasked, and no table was written for any of them.**
 *
 * The claims:
 *
 *  - the SHIPPED Kestrel and Holloway rows, read against a species'
 *    authored habitat, sort the species between them by the one law
 *    (`Species.fitIn`) — the confluence holds a brackish slow-water fish
 *    and the Holloway's head holds none; a cold fast-water fish is the
 *    reverse;
 *  - `waterStateAt` reports every word of `WATER_PARAMETERS`: the
 *    Holloway soft and acid, the Kestrel hard, the confluence
 *    flow-weighted between the Kestrel and the Delight;
 *  - the limiter is NAMED, in words, at the practised band;
 *  - a draw lowers the level and is recovered over the half-life; a read
 *    writes nothing; a `stocks:` node overrides fit;
 *  - the register verifies prefix and kind on every read.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import Species, {
  WATER_PARAMETERS,
  type Habitat,
} from '@saxonberg/server/mud/platform/idea/species/Species';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, {
  WATERCOURSE_CATALOGUE_PATH,
} from '../idea/WatercourseCatalogue';
import FisheryRegistry, {
  FISHERY_PREFIX,
  FISHERY_REGISTRY_PATH,
} from '../idea/FisheryRegistry';

const DAY = 86_400;
/** Mid-summer of year 1 — every shipped seasonal species is in the water. */
const SUMMER = 365 * DAY + 120 * DAY;

const WORLD_SEED = fileURLToPath(
  new URL('../../../world-seed/content/stuff/idea/Watercourse/', import.meta.url),
);

interface Row {
  path: string;
  class: string;
  data: Record<string, unknown>;
}

/** The SHIPPED course rows — read off the files, never restated here. */
function shippedCourse(key: string): Row {
  const row = YAML.parse(readFileSync(join(WORLD_SEED, `${key}.yaml`), 'utf8')) as {
    class: string;
    data: Record<string, unknown>;
  };
  return { path: `/stuff/idea/Watercourse/${key}`, class: row.class, data: row.data };
}

let rows: Row[] = [];
function installRows(extra: Row[] = []): void {
  rows = [
    shippedCourse('kestrel'),
    shippedCourse('holloway'),
    shippedCourse('delight'),
    // Somebody has to live on each river or nothing flows.
    {
      path: '/stuff/idea/Locality/terminus',
      class: '/platform/idea/Locality',
      data: { name: 'terminus', _reach: 'kestrel:confluence', _catchmentKm2: 120 },
    },
    {
      path: '/stuff/idea/Locality/moor',
      class: '/platform/idea/Locality',
      data: { name: 'moor', _reach: 'holloway:vale', _catchmentKm2: 200 },
    },
    ...extra,
  ];
  serve();
}

/** Serve `rows` — read at call time, so a species pushed later is found. */
function serve(): void {
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      const store = rows.map((r, i) => ({ _id: String(i + 1), ...r }));
      if (typeof query.class === 'string') return store.filter((d) => d.class === query.class);
      const q = query.path as { $regex?: string } | string | undefined;
      if (typeof q === 'object' && q !== null && typeof q.$regex === 'string') {
        const re = new RegExp(q.$regex);
        return store.filter((d) => re.test(d.path));
      }
      if (typeof q === 'string') return store.filter((d) => d.path === q);
      return store.slice();
    },
  );
}

/** An in-memory document store behind the register's transport. */
let docs: Map<string, { kind: string; data: Record<string, unknown> }>;
let writes = 0;
function installDocuments(): void {
  docs = new Map();
  writes = 0;
  vi.spyOn(DocumentApi, 'saveToRegister').mockImplementation(
    (async (_register: unknown, path: string, data: Record<string, unknown>) => {
      writes += 1;
      docs.set(path, { kind: 'fishery', data: { ...data } });
    }) as never,
  );
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const doc = docs.get(path);
    return doc === undefined
      ? null
      : ({ getPath: () => path, getKind: () => doc.kind, getData: () => doc.data } as never);
  });
}

/** A species ROW (for the class query) and its live singleton (for the read). */
let seq = 0;
function species(name: string, habitat: Habitat): string {
  seq += 1;
  const path = `/stuff/idea/species/_test/${name}-${seq}`;
  rows.push({
    path,
    class: '/platform/idea/species/Species',
    data: { habitat },
  });
  const sp = makeStuffAtPath(() => new Species(), path) as Species;
  sp.setCommonNames([name]);
  sp.setHabitat(habitat);
  return path;
}

const catalogue = (): WatercourseCatalogue =>
  makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH) as WatercourseCatalogue;
const registry = (): FisheryRegistry =>
  makeStuffAtPath(() => new FisheryRegistry(), FISHERY_REGISTRY_PATH) as FisheryRegistry;

/** A trout: cold, fast, fresh. */
const TROUT: Habitat = {
  tolerances: {
    temperatureK: { min: 275, max: 288, margin: 4 },
    currentMps: { min: 0.3, margin: 0.2 },
    salinityPpt: { max: 0.5, margin: 2 },
  },
  role: 'predator',
  abundance: 40,
  fightRating: 0.5,
};
/** A mullet: brackish, slow, warm. */
const MULLET: Habitat = {
  tolerances: {
    temperatureK: { min: 283, max: 298, margin: 4 },
    currentMps: { max: 0.5, margin: 0.3 },
    salinityPpt: { min: 5, margin: 4 },
  },
  seasons: ['spring', 'summer', 'fall'],
  role: 'forage',
  abundance: 80,
  fightRating: 0.4,
};

beforeEach(() => {
  StuffApi.clearAll();
  WeatherApi._forceTypeForTesting('rain');
  installDocuments();
});

afterEach(() => {
  WeatherApi._forceTypeForTesting(null);
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ the reach reports every parameter a tank will hold (D22)', () => {
  it('every word of WATER_PARAMETERS, from the shipped rows', async () => {
    installRows();
    const c = catalogue();
    const state = (await c.waterStateAt('kestrel:confluence', SUMMER))!;
    for (const word of WATER_PARAMETERS) {
      expect(typeof state[word]).toBe('number');
      expect(Number.isFinite(state[word])).toBe(true);
    }
    expect(await c.waterStateAt('kestrel:nowhere', SUMMER)).toBeNull();
  });

  it('the Holloway reads soft and acid; the Kestrel hard; the moor cold and fast', async () => {
    installRows();
    const c = catalogue();
    const head = (await c.waterStateAt('holloway:head', SUMMER))!;
    const falls = (await c.waterStateAt('kestrel:falls', SUMMER))!;
    expect(head.pH).toBeLessThan(7);
    expect(head.hardnessDgh).toBeLessThan(6);
    expect(falls.hardnessDgh).toBeGreaterThan(6);
    expect(falls.pH).toBeGreaterThan(7);
    // 1100 m up under the lapse rate: cold. And fresh.
    expect(head.temperatureK).toBeLessThan(falls.temperatureK);
    expect(head.salinityPpt).toBeLessThan(1);
  });

  it('⭐ the confluence is flow-weighted between the Kestrel and the Delight', async () => {
    installRows();
    const c = catalogue();
    const above = (await c.waterStateAt('kestrel:falls', SUMMER))!;
    const delight = (await c.waterStateAt('delight:flats', SUMMER))!;
    const at = (await c.waterStateAt('kestrel:confluence', SUMMER))!;
    // The Delight is the farming valley — the richest of the four — so
    // the confluence is richer than the Kestrel above it and poorer than
    // the Delight itself.
    expect(delight.nitrateMgL).toBeGreaterThan(above.nitrateMgL);
    expect(at.nitrateMgL).toBeGreaterThan(above.nitrateMgL);
    expect(at.nitrateMgL).toBeLessThan(delight.nitrateMgL);
    expect(at.hardnessDgh).toBeLessThan(above.hardnessDgh);
    expect(at.hardnessDgh).toBeGreaterThan(delight.hardnessDgh);
  });

  it('the estuary is salt, the confluence brackish, the falls fresh', async () => {
    installRows();
    const c = catalogue();
    expect((await c.waterStateAt('kestrel:estuary', SUMMER))!.salinityPpt).toBeGreaterThan(25);
    const confluence = (await c.waterStateAt('kestrel:confluence', SUMMER))!.salinityPpt;
    expect(confluence).toBeGreaterThan(1);
    expect(confluence).toBeLessThan(25);
    expect((await c.waterStateAt('kestrel:falls', SUMMER))!.salinityPpt).toBeLessThan(1);
  });

  it('nothing lives in the vocabulary that a river makes: ammonia and nitrite read 0', async () => {
    installRows();
    const state = (await catalogue().waterStateAt('kestrel:gorge', SUMMER))!;
    expect(state.ammoniaMgL).toBe(0);
    expect(state.nitriteMgL).toBe(0);
  });
});

describe('⭐⭐ the fishery derives — no table for the confluence, none for the moor', () => {
  it('a brackish slow-water fish is at the confluence and not at the Holloway head; a trout the reverse', async () => {
    installRows();
    catalogue();
    const trout = species('trout', TROUT);
    const mullet = species('mullet', MULLET);
    const reg = registry();

    const confluence = (await reg.standingAt('kestrel:confluence', SUMMER))!;
    const head = (await reg.standingAt('holloway:head', SUMMER))!;
    const at = (s: typeof confluence, p: string) => s.species.find((x) => x.speciesPath === p)!;

    expect(at(confluence, mullet).capacity).toBeGreaterThan(0);
    expect(at(head, mullet).capacity).toBe(0);
    expect(at(head, trout).capacity).toBeGreaterThan(0);
    expect(at(confluence, trout).capacity).toBe(0);
    // A read writes nothing.
    expect(writes).toBe(0);
    expect(docs.size).toBe(0);
  });

  it('⭐ the limiter is named — the species says which factor, the read says it in words', async () => {
    installRows();
    catalogue();
    const trout = species('trout', TROUT);
    const mullet = species('mullet', MULLET);
    const reg = registry();
    const head = (await reg.standingAt('holloway:head', SUMMER))!;
    const mulletUp = head.species.find((x) => x.speciesPath === mullet)!;
    expect(mulletUp.fit).toBe(0);
    expect(mulletUp.limiting).toBe('salinityPpt');
    const lines = reg.readFor(head, 'proficient').join(' ');
    expect(lines).toMatch(/Not enough salt for mullet/);
    expect(lines).toMatch(/trout/);
    expect(lines).not.toMatch(/\d/); // never a number
    void trout;
  });

  it('the read is banded by competence: nothing untrained, presence at novice, names at competent, the apex named only when practised', async () => {
    installRows();
    catalogue();
    species('mullet', MULLET);
    species('sturgeon', { ...MULLET, role: 'apex', abundance: 2, fightRating: 1 });
    const reg = registry();
    const s = (await reg.standingAt('kestrel:confluence', SUMMER))!;
    expect(reg.readFor(s, 'untrained')).toEqual([]);
    expect(reg.readFor(s, 'novice').join(' ')).toMatch(/fish in this water/);
    const competent = reg.readFor(s, 'competent').join(' ');
    expect(competent).toMatch(/mullet/);
    expect(competent).toMatch(/something large/);
    expect(competent).not.toMatch(/sturgeon/);
    const practised = reg.readFor(s, 'proficient').join(' ');
    expect(practised).toMatch(/royal fish/);
    expect(practised).toMatch(/sturgeon/);
  });

  it('⭐ a draw lowers the level, is written, and recovers over the half-life', async () => {
    installRows();
    catalogue();
    const mullet = species('mullet', MULLET);
    const reg = registry();
    const before = (await reg.standingAt('kestrel:confluence', SUMMER))!.species.find((x) => x.speciesPath === mullet)!;
    expect(before.level).toBe(before.capacity);

    const taken = await reg.draw('kestrel:confluence', mullet, 10, SUMMER);
    expect(taken).toBe(10);
    expect(writes).toBe(1);
    const after = (await reg.standingAt('kestrel:confluence', SUMMER))!.species.find((x) => x.speciesPath === mullet)!;
    expect(after.level).toBe(before.capacity - 10);

    // Two game-days on (the seed half-life): half of it is back.
    const later = (await reg.standingAt('kestrel:confluence', SUMMER + 2 * DAY))!.species.find((x) => x.speciesPath === mullet)!;
    expect(later.level).toBe(before.capacity - 5);
    // A read of a recovered reach STILL writes nothing.
    expect(writes).toBe(1);

    // A release puts it back.
    await reg.release('kestrel:confluence', mullet, 5, SUMMER);
    const released = (await reg.standingAt('kestrel:confluence', SUMMER))!.species.find((x) => x.speciesPath === mullet)!;
    expect(released.level).toBe(before.capacity - 5);
  });

  it('a draw is capped at the level — a net cannot take what is not there', async () => {
    installRows();
    catalogue();
    const mullet = species('mullet', MULLET);
    const reg = registry();
    const cap = (await reg.standingAt('kestrel:confluence', SUMMER))!.species.find((x) => x.speciesPath === mullet)!.capacity;
    expect(await reg.draw('kestrel:confluence', mullet, cap * 3, SUMMER)).toBe(cap);
    const empty = (await reg.standingAt('kestrel:confluence', SUMMER))!;
    expect(empty.species.find((x) => x.speciesPath === mullet)!.level).toBe(0);
    expect(reg.readFor(empty, 'proficient').join(' ')).toMatch(/fished out/);
    expect(await reg.draw('kestrel:confluence', mullet, 1, SUMMER)).toBe(0);
  });

  it('⭐ a `stocks:` node overrides fit — the aquaculture seam', async () => {
    const stocked = shippedCourse('holloway');
    const nodes = stocked.data.nodes as Array<Record<string, unknown>>;
    installRows();
    catalogue();
    const mullet = species('mullet', MULLET);
    nodes[0]!.stocks = [{ species: mullet, capacity: 12 }];
    rows[1] = stocked; // served live: the catalogue has not compiled yet
    const reg = registry();
    const head = (await reg.standingAt('holloway:head', SUMMER))!;
    const up = head.species.find((x) => x.speciesPath === mullet)!;
    expect(up.stocked).toBe(true);
    expect(up.capacity).toBe(12);
    expect(reg.readFor(head, 'competent').join(' ')).toMatch(/stocked with mullet/);
  });
});

describe('the register verifies what the transport guarantees', () => {
  it('reads verify prefix AND kind; a forged tag on another branch does not count', async () => {
    installRows();
    catalogue();
    const reg = registry();
    docs.set(`${FISHERY_PREFIX}/kestrel/confluence`, {
      kind: 'water-right',
      data: { reachRef: 'kestrel:confluence', drawn: { x: 3 }, reconciledAtS: 0 },
    });
    expect(await reg.read('kestrel:confluence')).toBeNull();
    docs.set(`${FISHERY_PREFIX}/kestrel/confluence`, {
      kind: 'fishery',
      data: { reachRef: 'kestrel:confluence', drawn: { x: 3 }, reconciledAtS: 0 },
    });
    expect((await reg.read('kestrel:confluence'))!.drawn).toEqual({ x: 3 });
    // A citation that would escape the prefix reads nothing.
    expect(await reg.read('../home:evil')).toBeNull();
    expect(await reg.read('kestrel')).toBeNull();
  });
});
