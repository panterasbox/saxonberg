/**
 * The Hanging Wood (forestry.md § The second instance · § Daylight) — the rejection venue's rows, read
 * off disk: three clearings on `Wood` whose `mix:` resolves, every exit
 * resolving, every room plotted and lit above `dim` for its own cell,
 * no two rooms on one cell, no two rooms propping one panel, and the
 * title admitting cultivation. ⭐ The venue ships NO code — that is the
 * claim a second wood rests on, and `exemplar.test.ts` in trade-mining
 * pins it for the whole pack.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../../', import.meta.url));
const REJECTION = join(CONTENT, 'rejection', 'content', 'world', 'terminus', 'rejection');
const WOOD = join(REJECTION, 'hanging-wood');

interface Row {
  class: string;
  data: Record<string, unknown> & {
    coords?: { x: number; y: number; z: number };
    exits?: Record<string, { destination: string }>;
    ambientIntensity?: number;
    ambientSource?: string;
    ambientOpening?: string;
    _biomePath?: string;
    props?: string[];
    mix?: Array<{ speciesPath: string; woodMaterialPath: string; seedPath: string | null; standing: number; capacity: number; incrementPerYear: number }>;
  };
}

function row(file: string): Row {
  return YAML.parse(readFileSync(file, 'utf8')) as Row;
}

/** A template path → whether some pack ships it. */
function shipped(templatePath: string): boolean {
  for (const pack of readdirSync(CONTENT)) {
    if (existsSync(join(CONTENT, pack, 'content', `${templatePath}.yaml`))) return true;
  }
  return false;
}

/**
 * ⭐⭐ **The sky's noon lux, read off the platform pack's own dial.**
 *
 * Since the envelope build a row that authors no `ambientIntensity` is
 * not dark — it is DERIVED. A scope open to the sky is lit *because it
 * is open to the sky*, and its noon flux is this many lux times its own
 * floor area, which is why a 1 m² closet and a 100 m² yard are both
 * right without either one authoring a number. `ambientIntensity`
 * survives as a **calibration override**, which is exactly what a
 * canopy is: the wood authors one BECAUSE it is darker than open sky.
 *
 * Read from the shipped setting rather than copied here, so moving the
 * dial moves this test with it.
 */
function skyNoonLux(): number {
  const doc = YAML.parse(
    readFileSync(join(CONTENT, 'platform', 'content', 'settings', 'light.yaml'), 'utf8'),
  ) as { settings: Array<{ key: string; value: string }> };
  const row = doc.settings.find((s) => s.key === 'light.sky.noonLux');
  expect(row, 'light.sky.noonLux').toBeDefined();
  return Number.parseFloat(row!.value);
}

/** Is this row open to the sky — by its own biome, or by declaring so? */
function skyLit(r: Row): boolean {
  const src = r.data.ambientSource;
  if (src === 'sky') return true;
  if (src === 'glow' || src === 'none') return false;
  return String(r.data._biomePath ?? '').includes('/biome/outdoor/');
}

/**
 * The lux this room reads at a clear noon overhead sun — the engine's
 * own `skyNoonFlux()` arithmetic, off the row: the authored calibration
 * over the cell's area if there is one, else the derived default.
 */
function noonLuxOf(r: Row, cell: number): number {
  if (!skyLit(r)) return 0;
  const authored = r.data.ambientIntensity;
  return authored ? authored / (cell * cell) : skyNoonLux();
}

const ROOMS = ['treeline', 'ride', 'oak-clearing', 'hazel-cant'].map((n) => join(WOOD, `${n}.yaml`));

describe('the Hanging Wood', () => {
  it('is a sub-zone of its own at the region’s cell size, addressed', () => {
    const zone = row(join(REJECTION, 'hanging-wood.yaml'));
    expect(zone.class).toBe('/platform/idea/location/CartesianZone');
    expect(zone.data.cellSize).toBe(10);
    expect(zone.data.address).toBe('terminus/rejection/hanging-wood');
  });

  it('⭐ three clearings are STANDS on the forestry Wood; the treeline is not', () => {
    const classes = Object.fromEntries(ROOMS.map((f) => [f.split('/').pop(), row(f).class]));
    expect(classes['treeline.yaml']).toBe('/platform/location/SingletonCartesianLocation');
    for (const r of ['ride.yaml', 'oak-clearing.yaml', 'hazel-cant.yaml']) {
      expect(classes[r], r).toBe('/trade/forestry/location/Wood');
    }
  });

  it('every stand’s mix names a species, a wood and a seed that ship', () => {
    let standards = 0;
    for (const f of ROOMS) {
      const r = row(f);
      if (r.class !== '/trade/forestry/location/Wood') continue;
      expect(r.data.mix, f).toBeDefined();
      for (const sp of r.data.mix!) {
        expect(shipped(sp.speciesPath), `${f}: ${sp.speciesPath}`).toBe(true);
        expect(shipped(sp.woodMaterialPath), `${f}: ${sp.woodMaterialPath}`).toBe(true);
        if (sp.seedPath) expect(shipped(sp.seedPath), `${f}: ${sp.seedPath}`).toBe(true);
        expect(sp.standing).toBeLessThanOrEqual(sp.capacity);
        expect(sp.incrementPerYear).toBeGreaterThan(0);
        standards += sp.standing;
      }
      expect(r.data.woodName).toBe('the Hanging Wood');
      expect(r.data.areaM2).toBe(100);
    }
    // Thirty-six standards over three rooms: 24 oak, 12 ash.
    expect(standards).toBe(36);
  });

  it('every exit resolves, and the hillside climbs into it', () => {
    for (const f of ROOMS) {
      for (const [dir, exit] of Object.entries(row(f).data.exits ?? {})) {
        expect(shipped(exit.destination), `${f} ${dir} → ${exit.destination}`).toBe(true);
      }
    }
    const hillside = row(join(REJECTION, 'location', 'hillside.yaml'));
    expect(hillside.data.exits!.north!.destination).toBe('/world/terminus/rejection/hanging-wood/treeline');
    expect(row(join(WOOD, 'treeline.yaml')).data.exits!.south!.destination).toBe('/world/terminus/rejection/location/hillside');
  });

  it('every room plots on its own cell, and no two rooms prop one panel', () => {
    const cells = new Set<string>();
    const panels = new Set<string>();
    for (const f of ROOMS) {
      const r = row(f);
      expect(r.data.coords, f).toBeDefined();
      const key = `${r.data.coords!.x},${r.data.coords!.y},${r.data.coords!.z}`;
      expect(cells.has(key), `${f} shares ${key}`).toBe(false);
      cells.add(key);
      for (const p of r.data.props ?? []) {
        if (!p.includes('/panel-')) continue;
        expect(panels.has(p), `${p} propped twice`).toBe(false);
        panels.add(p);
        expect(shipped(p), p).toBe(true);
        expect(row(join(CONTENT, 'rejection', 'content', `${p}.yaml`)).class).toBe('/trade/forestry/thing/Panel');
      }
    }
    expect(panels.size).toBe(2);
  });

  it('⭐ daylight: every wood room clears `dim` at its 10 m cell; the wood is dimmer than the hill, its clearings brighter than its ride', () => {
    const lux = (f: string, cell: number): number => noonLuxOf(row(f), cell);
    expect(lux(join(WOOD, 'treeline.yaml'), 10)).toBeGreaterThanOrEqual(20); // lit
    expect(lux(join(WOOD, 'ride.yaml'), 10)).toBeGreaterThanOrEqual(5); // dim
    expect(lux(join(WOOD, 'ride.yaml'), 10)).toBeLessThan(20);
    expect(lux(join(WOOD, 'oak-clearing.yaml'), 10)).toBeGreaterThan(lux(join(WOOD, 'ride.yaml'), 10));
    // ⭐ The hill is brighter than the treeline, and since the envelope
    // build it is brighter WITHOUT AUTHORING A NUMBER: it dropped its
    // calibration and takes the derived sky, while the wood keeps one
    // because a canopy is a reason to be darker than the sky.
    const hillside = row(join(REJECTION, 'location', 'hillside.yaml'));
    expect(hillside.data.ambientIntensity, 'hillside.yaml authors no calibration').toBeUndefined();
    expect(lux(join(REJECTION, 'location', 'hillside.yaml'), 10)).toBeGreaterThan(
      lux(join(WOOD, 'treeline.yaml'), 10),
    );
  });

  it('⭐ daylight over Rejection: every room NAMES A SOURCE — open rooms clear `dim` at 10 m, every Kestrel room `bright` at 20 m', () => {
    // ⚠⚠ This used to require an authored `ambientIntensity` on every
    // file in `location/`, which was wrong in two ways the envelope
    // build made visible. Half of those rooms are INTERIORS — the adit,
    // the assay shed, the claims office, the store, the smelter, the
    // dry — and an interior open to no sky is dark, which is the point
    // rather than a gap. And an outdoor room no longer needs a number
    // at all: it is lit because its biome says it is open to the sky.
    //
    // ⭐ So the claim is the one S2 actually makes: **every room's light
    // has a named source.** Sky-lit rooms clear `dim`; the rest are
    // honestly dark and say so by authoring no ambient.
    for (const f of readdirSync(join(REJECTION, 'location'))) {
      const r = row(join(REJECTION, 'location', f));
      if (skyLit(r)) {
        expect(noonLuxOf(r, 10), f).toBeGreaterThanOrEqual(5);
        continue;
      }
      // An enclosed room: no ambient, no glow, no claim on the sky. It
      // is lit by what is IN it or by what spills through its door.
      expect(r.data.ambientIntensity, `${f} is enclosed and must author no ambient`).toBeUndefined();
      expect(r.data.ambientSource ?? null, f).not.toBe('sky');
    }
    for (const f of readdirSync(join(REJECTION, 'kestrel-road'))) {
      const r = row(join(REJECTION, 'kestrel-road', f));
      expect(skyLit(r), f).toBe(true);
      expect(noonLuxOf(r, 20), f).toBeGreaterThanOrEqual(60);
    }
  });

  it('the title admits cultivation — agricultural, not wild', () => {
    const pack = YAML.parse(readFileSync(join(CONTENT, 'rejection', 'pack.yaml'), 'utf8')) as {
      requires: { title: Array<{ extent: string; landUse?: string; holder: { group?: string } }> };
    };
    const wood = pack.requires.title.find((t) => t.extent === '/world/terminus/rejection/hanging-wood')!;
    expect(wood).toBeDefined();
    expect(wood.landUse).toBe('agricultural');
    expect(wood.holder.group).toBe('rejection');
  });

  it('⭐ the venue ships no code', () => {
    expect(existsSync(join(CONTENT, 'rejection', 'src'))).toBe(false);
  });
});

/* ───────────────────────── the sugarbush ───────────────────────── */

describe('the sugarbush — the taps build\u2019s first consumer', () => {
  const BUSH = join(WOOD, 'sugarbush.yaml');
  const PANEL = join(WOOD, 'thing', 'sugarbush-panel.yaml');
  const NAMES = ['birch-north', 'birch-middle', 'birch-south',
                 'maple-north', 'maple-middle', 'maple-south'];

  it('⚠⚠ it is NOT a Wood — a stand would read over six real stems', () => {
    // A `Wood` appends its own derived reading to `look`, and over six
    // standards a player can see and touch it would say *"nothing
    // stands here worth the axe"*. The sugarbush is the OTHER
    // representation: named individual trees in a panel.
    const bush = row(BUSH);
    expect(bush.class).toBe('/platform/location/SingletonCartesianLocation');
    expect(bush.data._biomePath).toBe('/stuff/idea/biome/outdoor/woodland');
  });

  it('⭐ it hangs off the ride, both ways, and takes its own cell', () => {
    const bush = row(BUSH);
    const ride = row(join(WOOD, 'ride.yaml'));
    expect(ride.data.exits?.east?.destination).toBe(
      '/world/terminus/rejection/hanging-wood/sugarbush',
    );
    expect(bush.data.exits?.west?.destination).toBe(
      '/world/terminus/rejection/hanging-wood/ride',
    );
    // ⚠ Its own cell: two rooms on one coordinate is the failure the
    // whole-venue plot check exists against.
    expect(bush.data.coords).toEqual({ x: 1, y: 1, z: 0 });
    expect(bush.data.coords).not.toEqual(ride.data.coords);
  });

  it('⭐⭐ six NAMED trees, each addressable by its own keyword', () => {
    // ⚠⚠ The correction this build had to make: `as:` is the identity
    // key for the by-entry template MERGE, not a naming keyword. Three
    // cherries authored with `as:` all answer to *cherry*. A tree the
    // drive addresses as `birch-north` needs a ROW whose keywords say
    // so — which is why these are six rows and not one propped six
    // times.
    const panel = row(PANEL);
    expect(panel.data.props?.length).toBe(6);
    const seen = new Set<string>();
    for (const name of NAMES) {
      const f = join(WOOD, 'thing', `${name}.yaml`);
      expect(existsSync(f), `${name}.yaml must exist`).toBe(true);
      const tree = row(f) as unknown as {
        extends: string;
        data: { keywords: string[]; growthStage: string };
      };
      // ⭐ `extends:` carries the class, the hydrator, the species and
      // the growth numbers; the child states only what differs.
      expect(tree.extends).toMatch(/\/plant\/(birch|maple)-standard$/);
      expect((tree as unknown as { class?: string }).class).toBeUndefined();
      // The distinct keyword is what makes it addressable at all.
      expect(tree.data.keywords).toContain(name);
      expect(seen.has(name)).toBe(false);
      seen.add(name);
      // ⭐ Mature: these trees were here before the player. A mature
      // stem takes two spiles.
      expect(tree.data.growthStage).toBe('mature');
    }
  });

  it('⭐⭐ the PANEL does not offer `tap` — the trees do', () => {
    // Checked structurally here and through `collectContributions` in
    // `verb-gates.test.ts`. A hazel panel offering `tap` would mean the
    // controller un-promising it, which is the host-placement tell.
    const panel = row(PANEL);
    expect(panel.class).toBe('/trade/forestry/thing/Panel');
    // Six slots and six trees: the bush is FULL, which is the honest
    // shape of a bush somebody else established.
    const slots = panel.data.staticSlots as Array<{ name: string; capacity: number }>;
    expect(slots.find((s) => s.name === 'plant')?.capacity).toBe(6);
  });

  it('⭐ the pan and the arch are the TRADE\u2019s rows, propped here', () => {
    // A second sugarbush anywhere is rows: one panel, N trees, two
    // vessels. That is the falsifiable line.
    const bush = row(BUSH);
    expect(bush.data.props).toContain('/trade/forestry/thing/sap-pan');
    expect(bush.data.props).toContain('/trade/forestry/thing/evaporator');
    for (const p of bush.data.props ?? []) expect(shipped(p), p).toBe(true);
  });

  it('⭐⭐ the store stocks AND PRICES the kit — the found-by-driving bug', () => {
    // ⚠ A `Stock` with stock lines and no prices holds the goods and
    // prices none of them: every `buy` answers *"isn't for sale"*. That
    // was found by DRIVING the apiculture build, and it is why this
    // asserts both halves.
    const counter = row(join(REJECTION, 'thing', 'store-counter.yaml')) as unknown as {
      data: {
        stockLines: Array<{ itemTemplatePath: string; par: number }>;
        prices: Record<string, number>;
      };
    };
    const kit = [
      '/trade/forestry/thing/auger',
      '/trade/forestry/thing/spile',
      '/stuff/thing/vessel/pail',
    ];
    for (const path of kit) {
      expect(
        counter.data.stockLines.some((l) => l.itemTemplatePath === path),
        `${path} must be stocked`,
      ).toBe(true);
      expect(counter.data.prices[path], `${path} must be priced`).toBeGreaterThan(0);
      expect(shipped(path), path).toBe(true);
    }
    // ⭐ And the spile is the cheapest thing on the slate, because it is
    // CONSUMED by setting a tap — the only recurring cost in the trade
    // besides fuel.
    expect(counter.data.prices['/trade/forestry/thing/spile']).toBeLessThan(
      counter.data.prices['/trade/forestry/thing/auger']!,
    );
  });

  it('⚠ the treeline is untouched — no `fell` there and no `tap` either', () => {
    // The parity the drive asserts: at the treeline both verbs give the
    // same not-afforded answer, so the design is legible from where the
    // verbs ARE afforded.
    const treeline = row(join(WOOD, 'treeline.yaml'));
    expect(treeline.class).toBe('/platform/location/SingletonCartesianLocation');
    expect(treeline.data.props ?? []).toEqual([]);
  });
});
