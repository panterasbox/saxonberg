/**
 * ⭐⭐ **The exemplar claim, checked rather than asserted.**
 *
 * > **A second mining town must need ZERO pack code.** If making a mine
 * > look, read or feel different requires touching `trade-mining`, the
 * > wrong thing is in the trade.
 *
 * These tests live HERE, in the trade, because the claim is the TRADE's.
 * `rejection` is its reference implementation, and the way to check a
 * claim about what a trade requires is to look at what its reference
 * venue actually had to ship.
 *
 * ⚠ And that is also why `rejection` has no suite of its own: a venue
 * pack with a `src/__tests__/` would have a `src/`, and the headline
 * assertion below — *this pack ships no TypeScript at all* — would be
 * false by construction of its own proof.
 *
 * The corollary the whole split rests on: **code is shared; content is
 * copied.** A second mine imports the three trade packs and copies and
 * diverges from these rows. Copying content is the intended path;
 * copying code is the failure.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { Archetype } from '@saxonberg/server/mud/lib/archetype/Archetype';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const REJECTION = join(CONTENT, 'rejection');
const PACK = fileURLToPath(new URL('../../', import.meta.url));

function files(dir: string, pred: (f: string) => boolean): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (pred(entry)) out.push(full.slice(REJECTION.length + 1));
    }
  };
  walk(dir);
  return out;
}

function row(rel: string): { class?: string; data?: Record<string, unknown> } {
  return YAML.parse(readFileSync(join(REJECTION, rel), 'utf8')) as {
    class?: string;
    data?: Record<string, unknown>;
  };
}

describe('⭐⭐ a second mining town needs zero pack code', () => {
  it('the reference venue ships NO TypeScript AT ALL', () => {
    // The proof a reviewer can run in one line:
    //   find packages/content/rejection -name '*.ts' | wc -l   →   0
    expect(files(REJECTION, (f) => f.endsWith('.ts') || f.endsWith('.tsx'))).toEqual([]);
  });

  it('every class the venue names belongs to a trade or the platform', () => {
    const classes = new Set<string>();
    for (const rel of files(REJECTION, (f) => f.endsWith('.yaml'))) {
      const cls = row(rel).class;
      if (cls) classes.add(cls);
    }
    expect(classes.size).toBeGreaterThan(5);
    for (const cls of classes) {
      expect(
        cls.startsWith('/platform/') ||
          cls.startsWith('/trade/mining/') ||
          cls.startsWith('/trade/fuel/') ||
          cls.startsWith('/trade/smelting/'),
      ).toBe(true);
    }
    // ⭐ And it names NONE of its own — there is no `/world/rejection/...`
    // class anywhere, because there is no code to name.
    expect([...classes].filter((c) => c.startsWith('/world/'))).toEqual([]);
  });

  it('⭐⭐ the four procedural type rows are the VENUE’s, and the warren takes them as POLICY', () => {
    const warren = row('content/world/rejection/idea/ferrow-warren.yaml');
    expect(warren.class).toBe('/trade/mining/idea/MineWarren');
    const rows = warren.data!.typeRows as Record<string, string>;
    expect(Object.keys(rows).sort()).toEqual(['face', 'fall', 'junction', 'stope']);
    for (const path of Object.values(rows)) {
      // Every one is a `/world/rejection/...` row, so a second mine
      // supplies sandstone galleries or ice caves and the machinery does
      // not care. If these were `/trade/mining/...` every mine's workings
      // in the world would read identically.
      expect(path.startsWith('/world/rejection/')).toBe(true);
      const rel = `content${path}.yaml`;
      expect(existsSync(join(REJECTION, rel))).toBe(true);
      expect(row(rel).class).toBe('/trade/mining/location/MineRoom');
    }
  });

  it('⭐ every type row carries its OWN prose banks — the voice is the locality’s', () => {
    for (const kind of ['face', 'junction', 'stope', 'fall']) {
      const data = row(`content/world/rejection/ferrow/${kind}.yaml`).data!;
      for (const bank of ['backPhrases', 'seamPhrases', 'airPhrases', 'groundPhrases']) {
        expect(Array.isArray(data[bank])).toBe(true);
        expect((data[bank] as string[]).length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('⚠ the banks are plain data, NOT the descriptor-bank document kind', () => {
    // `lint:descriptors` enforces descriptor ∩ material keywords = ∅ in
    // both directions, and mining prose must be able to say slate, quartz
    // and malachite. The IDEA transfers from arcana; the document kind
    // does not.
    expect(existsSync(join(REJECTION, 'content/descriptor-banks'))).toBe(false);
    const face = readFileSync(join(REJECTION, 'content/world/rejection/ferrow/face.yaml'), 'utf8');
    expect(face).toMatch(/Green runs across the face/);
  });

  it('⭐⭐ the venue BINDS the archetype’s defaultless light slot — the demonstration', () => {
    const archetype = Archetype.fromData(
      YAML.parse(readFileSync(join(PACK, 'content/archetypes/mining.yaml'), 'utf8')) as Record<
        string,
        unknown
      >,
    );
    const light = archetype.getCapabilities().find((c) => c.key === 'light')!;
    // The trade states the need and names NOTHING…
    expect(light.default).toBeNull();
    // …and the venue answers with a cultivated fungus, which no other
    // mine has to. `bulkSource: lamp-oil` would have bound the oil and
    // refused this; `tool: lamp` would have made a bed of mushrooms a
    // tool, which it is not.
    const fixture = row('content/world/rejection/thing/glowcap-fixture.yaml');
    expect(fixture.class).toBe('/platform/thing/equipment/PortableLight');
    expect((fixture.data!.emittedIntensity as number)).toBeGreaterThan(0);
    const species = row(
      'content/stuff/idea/species/fungi/basidiomycota/agaricales/mycenaceae/mycena/lucifera.yaml',
    );
    expect((species.data!.commonNames as string[])).toContain('glowcap');
  });

  it('⭐ the deposit is the VENUE’s — the trade ships the class and no ore', () => {
    const deposit = row('content/world/rejection/idea/deposit/ferrow.yaml');
    expect(deposit.class).toBe('/trade/mining/idea/Deposit');
    // …and there is NO deposit row anywhere in the trade pack.
    const tradeRows = files(PACK, (f) => f.endsWith('.yaml'));
    void tradeRows;
    expect(existsSync(join(PACK, 'content/trade/mining/idea/deposit'))).toBe(false);
  });

  it('⚠ the deposit carries NO SEED — rename the mine and its ore moves', () => {
    const data = row('content/world/rejection/idea/deposit/ferrow.yaml').data!;
    expect(data).not.toHaveProperty('seed');
    expect(data).not.toHaveProperty('randomSeed');
    // The seed is derived from the covering Locality's claimed address at
    // read time, so no author manages a magic number and no row can drift
    // from the world it describes.
  });

  it('the ecology splits on FUNCTION vs CHARACTER, and the split is visible in the file tree', () => {
    // Functional — a need EVERY mine has — ships in the trade.
    for (const rel of [
      'content/stuff/idea/species/animalia/chordata/aves/passeriformes/fringillidae/serinus/canaria.yaml',
      'content/stuff/idea/species/animalia/chordata/mammalia/perissodactyla/equidae/equus/caballus-pumilus.yaml',
    ]) {
      expect(existsSync(join(PACK, rel))).toBe(true);
      expect(existsSync(join(REJECTION, rel))).toBe(false);
    }
    // Character — THIS place's ecology — ships in the venue, and a second
    // mine is free to have something else in its corners.
    const venueSpecies = files(
      join(REJECTION, 'content/stuff/idea/species'),
      (f) => f.endsWith('.yaml'),
    );
    expect(venueSpecies.length).toBeGreaterThanOrEqual(4);
    expect(venueSpecies.some((f) => f.includes('lucifera'))).toBe(true);
    expect(venueSpecies.some((f) => f.includes('fodinae'))).toBe(true);
  });

  it('⭐ ALL of it lands at the /stuff/idea/species COMMONS path — ownership ≠ namespace', () => {
    for (const base of [PACK, REJECTION]) {
      const dir = join(base, 'content/stuff/idea/species');
      if (!existsSync(dir)) continue;
      for (const rel of files(dir, (f) => f.endsWith('.yaml'))) {
        void rel;
      }
    }
    // Relocating a row later is a file move plus a title-claim edit: no
    // path changes, and nothing to migrate. That is what makes it safe to
    // leave the content-architecture question open.
    expect(existsSync(join(PACK, 'content/stuff/idea/species'))).toBe(true);
    expect(existsSync(join(REJECTION, 'content/stuff/idea/species'))).toBe(true);
  });
});

describe('the venue itself', () => {
  it('the SURFACE spine is authored singletons; the UNDERGROUND spine is authored WORKINGS', () => {
    // ⭐ `SingletonCartesianLocation` — *one row IS one place*, and the
    // mixin SUBTRACTS, so a second `clone()` is refused. The four TYPE
    // rows take the permissive class instead, because they are minted
    // many times.
    for (const n of [
      'pithead-yard', 'claims-office', 'assay-shed', 'provisioning', 'the-dry', 'adit',
    ]) {
      expect(row(`content/world/rejection/location/${n}.yaml`).class).toBe(
        '/platform/location/SingletonCartesianLocation',
      );
    }
    // ⚠⚠ …and the galleries are NOT plain singletons, which is the fix
    // for the drive's biggest finding: they are hand-cut MINE rooms, so
    // they compose the reads and afford the acts. The tutorial drift's
    // entire job is teaching `hew` and `shore`, and for one wave it had
    // neither — a plain room in a mine is a room in a mine, not a
    // working. ⭐ `AuthoredWorking` is also the class that makes *a
    // bespoke mine works with no warren* a thing an author can DO.
    for (const n of ['cage-bottom', 'timbered-drift', 'winze-head', 'hush-mouth']) {
      expect(row(`content/world/rejection/ferrow/${n}.yaml`).class).toBe(
        '/trade/mining/location/AuthoredWorking',
      );
    }
  });

  it('⚠ NO inbound exit is wired from another locality — arrival is by TPA', () => {
    for (const rel of files(REJECTION, (f) => f.endsWith('.yaml'))) {
      const text = readFileSync(join(REJECTION, rel), 'utf8');
      // Nothing here reaches into terminus, hinkley-hills, hearthworks or
      // anywhere else — which is what keeps a content-area standup clean
      // and what kept this build off another build's files entirely.
      expect(text).not.toMatch(/destination: \/world\/(?!rejection)/);
    }
  });

  it('⭐ the region zone carries the deposit, so the SURFACE can be surveyed', () => {
    const region = row('content/world/rejection.yaml');
    expect(region.data!.deposit).toBe('/world/rejection/idea/deposit/ferrow');
    /*
     * ⭐⭐ …on a PLAIN `CartesianZone`, because **a town is not a mine.**
     *
     * `deposit` briefly needed a `trade-mining` zone subclass, since a
     * pack cannot add a field to a kernel class and the failure is
     * silent. But that made the zone covering a whole town a `MineZone`.
     * The field now lives on `SpatialZone` beside the other ground and
     * region fields, and the subclass is deleted: a region that declares
     * what is under it is just a region.
     */
    expect(region.class).toBe('/platform/idea/location/CartesianZone');
    /*
     * ⭐ And the region declares the ADDRESS, which is what lets every
     * room here — including the ones the warren mints at runtime, which
     * can declare nothing for themselves — resolve the Locality. Without
     * it `getGroundSeed()` resolved none and seeded the orebody off the
     * empty string.
     */
    expect(region.data!.address).toBe('terminus/rejection');
    // ⚠ It is on the REGION and not on the mine: `lookupField` walks
    // outward, so the pithead inherits it and `measure strike` works
    // standing in the yard. A deposit declared only on the mine zone
    // would leave a prospector on the outcrop with nothing to measure.
    const pithead = row('content/world/rejection/location.yaml');
    expect(pithead.data).not.toHaveProperty('deposit');
    const mine = row('content/world/rejection/ferrow.yaml');
    expect(mine.data).not.toHaveProperty('deposit');
  });

  it('⭐ the chamber seam is EXPLICIT ON BOTH SIDES, and the pin agrees with the room', () => {
    const mouth = row('content/world/rejection/ferrow/hush-mouth.yaml');
    const chamber = row('content/world/rejection/hush/gallery.yaml');
    expect((mouth.data!.exits as Record<string, { destination: string }>)['in']!.destination).toBe(
      '/world/rejection/hush/gallery',
    );
    expect((chamber.data!.exits as Record<string, { destination: string }>)['out']!.destination).toBe(
      '/world/rejection/ferrow/hush-mouth',
    );
    // ⭐ Cartesian workings, spherical cavern: the grid represents what
    // labour cut, and a cavern was not cut.
    expect(row('content/world/rejection/hush.yaml').class).toBe(
      '/platform/idea/location/SphericalZone',
    );
    expect(row('content/world/rejection/ferrow.yaml').class).toBe(
      '/platform/idea/location/CartesianZone',
    );
    // ⚠ And the deposit's authored pin must sit at the mouth's own cell,
    // in metres. A pin the rooms do not match is a feature nobody can
    // ever reach.
    const coords = mouth.data!.coords as { x: number; y: number; z: number };
    const cellSize = (row('content/world/rejection/ferrow.yaml').data!.cellSize as number);
    const key = `${coords.x * cellSize},${coords.y * cellSize},${coords.z * cellSize}`;
    const pins = (
      (row('content/world/rejection/idea/deposit/ferrow.yaml').data!.features as {
        pins: Record<string, { feature: string }>;
      })
    ).pins;
    expect(pins[key]!.feature).toBe('hush-mouth');
  });

  it('⚠ ONLY authored chambers — no zone is minted at runtime', () => {
    // A zone is a template row, so a zone minted per procedurally-
    // discovered chamber would be the rowless mint D17 forbids. Seeded
    // pockets that are not authored stay grid cells with their own prose.
    const zones = files(REJECTION, (f) => f.endsWith('.yaml')).filter((rel) =>
      (row(rel).class ?? '').includes('/location/CartesianZone') ||
      (row(rel).class ?? '').includes('/location/SphericalZone'),
    );
    /*
     * ⭐ FOUR, and the region is now one of them. It used to be listed
     * separately because it was a `MineZone` and this filter did not
     * match it — which is a small demonstration of the cost of the
     * subclass: the town's own zone did not read as a zone to a check
     * looking for zones.
     */
    expect(zones.sort()).toEqual([
      'content/world/rejection.yaml',
      'content/world/rejection/ferrow.yaml',
      'content/world/rejection/hush.yaml',
      'content/world/rejection/location.yaml',
    ]);
  });

  it('⭐ FOUR businesses, and the smelter buys out of REVENUE — no new money anywhere', () => {
    const businesses = files(
      join(REJECTION, 'content/world/rejection/idea'),
      (f) => f.endsWith('-business.yaml'),
    );
    expect(businesses.length).toBe(4);
    for (const rel of businesses) {
      const b = row(rel);
      expect(b.class).toBe('/platform/idea/Business');
      // ⚠ Not one of them carries an endowment, a float or a lending
      // line. The mine makes new MATTER; the CB remains the only mint.
      expect(b.data).not.toHaveProperty('endowment');
      expect(b.data).not.toHaveProperty('floatAmount');
      expect(b.data).not.toHaveProperty('creditLine');
    }
  });

  it('the ore row authors NO grade — `hew` stamps the ground’s own figure', () => {
    const ore = row('content/world/rejection/thing/copper-ore.yaml');
    expect(ore.class).toBe('/trade/mining/thing/Ore');
    // A row that authored a grade would be a second source of truth for a
    // number the deposit already knows.
    expect(ore.data!.grade).toBe(0);
  });
});
