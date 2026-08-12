/**
 * Wave 7 — distribution.
 *
 * AC 32 — item rarity DERIVES from the grid cell via the price list; no
 *         authored rarity table exists in the codebase.
 * AC 33 — both placement channels work; `populates:` is unchanged and is
 *         not the injection path for economy-bearing items.
 * AC 34 — the census counts authored and random stock alike, and both
 *         channels decline at target. Authored placement suppresses
 *         random spawning **in the same region and not globally**.
 * AC 35 — every potion declares a route.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { PriceList } from '../../magic/PriceList';
import { Census } from '../Census';
import type { WorldCensus } from '../Census';
import { SpawnTable } from '../SpawnTable';
import type { SpawnCandidate } from '../SpawnTable';
import { CirculatingMixin } from '../Circulating';
import { ArcaneMixin } from '../../magic/Arcane';
import Thing from '../../stuff/Thing';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestGood extends CirculatingMixin(ArcaneMixin(Thing)) {}

const __filename = fileURLToPath(import.meta.url);
const MUD_ROOT = join(dirname(__filename), '../../..');
const POTION_DIR = join(
  MUD_ROOT,
  '../../../content/base-library/content/obj/material/potion',
);

/** Build a census by hand — the shape both channels consult. */
function censusOf(
  entries: Record<string, Record<string, number>>,
): WorldCensus {
  return new Map(
    Object.entries(entries).map(([region, keys]) => [
      region,
      new Map(Object.entries(keys)),
    ]),
  );
}

function candidate(
  over: Partial<SpawnCandidate> & { templatePath: string; censusKey: string },
): SpawnCandidate {
  return {
    effectTags: [],
    materialTags: [],
    regionTarget: 3,
    ...over,
  };
}

describe('AC32 — rarity DERIVES from the grid cell', () => {
  it('a dearer cell is rarer, and the ordering is the science\'s', () => {
    const cheap = PriceList.labourFor('perceive', 'arcana');
    const middling = PriceList.labourFor('create', 'fire');
    const dear = PriceList.labourFor('control', 'mind');
    expect(cheap).toBeLessThan(middling);
    expect(middling).toBeLessThan(dear);

    // Spawn weight is the INVERSE of stored labour — a cheap working is
    // common because it was cheap to make.
    expect(PriceList.spawnWeightFor([{ verb: 'perceive', noun: 'arcana' }]))
      .toBeGreaterThan(
        PriceList.spawnWeightFor([{ verb: 'control', noun: 'mind' }]),
      );
  });

  it('`transform` is priced OUT, and that is the point', () => {
    // Material transformation is priced out by ~10⁶ (chemical bonds in
    // eV against nuclear binding in MeV). It seeds the tree and has no
    // v1 spell; the price list says so rather than a comment doing it.
    const transform = PriceList.labourFor('transform', 'earth');
    const anythingElse = PriceList.labourFor('control', 'storm');
    expect(transform).toBeGreaterThan(anythingElse * 5);
  });

  it('a MULTI-EFFECT item takes rarity from its most expensive cell', () => {
    const cells = [
      { verb: 'perceive', noun: 'arcana' },
      { verb: 'control', noun: 'mind' },
    ] as const;
    // The honest reading: making it required clearing the HARDEST bar,
    // not the average one.
    expect(PriceList.labourForFootprint(cells)).toBe(
      PriceList.labourFor('control', 'mind'),
    );
    expect(PriceList.labourForFootprint(cells)).not.toBe(
      (PriceList.labourFor('perceive', 'arcana') +
        PriceList.labourFor('control', 'mind')) /
        2,
    );
  });

  it('nothing is strictly unfindable — the tail is thin, not empty', () => {
    expect(
      PriceList.spawnWeightFor([{ verb: 'transform', noun: 'earth' }]),
    ).toBeGreaterThan(0);
    // An empty footprint is priced as an ordinary object, not as free.
    expect(PriceList.spawnWeightFor([])).toBe(1);
  });

  it('rarity BANDS, never numbers, on any player-facing surface', () => {
    expect(PriceList.rarityBandFor([{ verb: 'perceive', noun: 'arcana' }])).toBe(
      'common',
    );
    expect(PriceList.rarityBandFor([{ verb: 'control', noun: 'storm' }])).toBe(
      'fabled',
    );
  });

  it('AC32 — there is NO authored rarity table anywhere in the codebase', () => {
    // The requirement is a NEGATIVE, so the test has to be one. An
    // authored table would let the economy and the physics disagree —
    // something expensive to make and common to find.
    const hits: string[] = [];
    const walk = (dir: string): void => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.yaml')) {
          const text = readFileSync(full, 'utf-8');
          if (/^\s*rarity:/m.test(text) || /^\s*spawnWeight:/m.test(text)) {
            hits.push(full);
          }
        }
      }
    };
    walk(join(MUD_ROOT, 'seeds'));
    expect(hits).toEqual([]);
  });
});

describe('AC34 — the census gates both channels', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('counts by region and key, and reports being at target', () => {
    const census = censusOf({ '/obj/zone/east': { wand: 3, potion: 1 } });
    expect(Census.countIn(census, '/obj/zone/east', 'wand')).toBe(3);
    expect(Census.countIn(census, '/obj/zone/east', 'potion')).toBe(1);
    expect(Census.countIn(census, '/obj/zone/west', 'wand')).toBe(0);
    expect(Census.isAtTarget(census, '/obj/zone/east', 'wand', 3)).toBe(true);
    expect(Census.isAtTarget(census, '/obj/zone/east', 'potion', 3)).toBe(false);
  });

  it('AC34 — the table DECLINES when the region is at target', () => {
    const census = censusOf({ '/obj/zone/east': { wand: 5 } });
    const wands = [candidate({ templatePath: '/obj/w', censusKey: 'wand' })];
    // Authored placement does not SPEND anything — it simply counts, and
    // the random channel backs off on its own. No allocation, no budget,
    // no coordination between the two channels.
    expect(SpawnTable.draw(wands, census, '/obj/zone/east')).toBeNull();
  });

  it('AC34 — the suppression is REGIONAL, never global', () => {
    const census = censusOf({ '/obj/zone/east': { wand: 5 } });
    const wands = [candidate({ templatePath: '/obj/w', censusKey: 'wand' })];
    // A hoard in one zone must not starve the world — that is exactly
    // what a global census would do.
    expect(SpawnTable.draw(wands, census, '/obj/zone/east')).toBeNull();
    expect(SpawnTable.draw(wands, census, '/obj/zone/west')).not.toBeNull();
  });

  it('AC34 — authored and random stock count ALIKE', () => {
    // The census does not know or care how anything got there. That is
    // the whole of D30: `S* = inflow/d` assumes ONE inflow, so the
    // second (unmetered) one has to be visible to the first.
    const authored = censusOf({ r: { wand: 3 } });
    const random = censusOf({ r: { wand: 3 } });
    const wands = [
      candidate({ templatePath: '/obj/w', censusKey: 'wand', regionTarget: 3 }),
    ];
    expect(SpawnTable.draw(wands, authored, 'r')).toBeNull();
    expect(SpawnTable.draw(wands, random, 'r')).toBeNull();
  });

  it('a key BELOW target is still eligible while a sibling is at target', () => {
    const census = censusOf({ r: { wand: 9, potion: 0 } });
    const both = [
      candidate({ templatePath: '/obj/w', censusKey: 'wand' }),
      candidate({ templatePath: '/obj/p', censusKey: 'potion' }),
    ];
    const drawn = SpawnTable.draw(both, census, 'r', { roll: () => 0 });
    expect(drawn?.censusKey).toBe('potion');
  });
});

describe('AC33 — the weighted draw', () => {
  it('weights by derived rarity, not by an authored number', () => {
    const cheap = candidate({
      templatePath: '/obj/cheap',
      censusKey: 'k',
      effectTags: [{ verb: 'perceive', noun: 'arcana' }],
    });
    const dear = candidate({
      templatePath: '/obj/dear',
      censusKey: 'k2',
      effectTags: [{ verb: 'control', noun: 'mind' }],
    });
    expect(SpawnTable.weightFor(cheap)).toBeGreaterThan(
      SpawnTable.weightFor(dear),
    );
  });

  it('material tags weigh PLACE AFFINITY, independently of rarity', () => {
    const wooden = candidate({
      templatePath: '/obj/w',
      censusKey: 'k',
      materialTags: ['wood'],
    });
    const plain = SpawnTable.weightFor(wooden);
    const inAGrove = SpawnTable.weightFor(wooden, new Map([['wood', 4]]));
    expect(inAGrove).toBeCloseTo(plain * 4, 10);
    // A material the region has no opinion about is NEUTRAL, not
    // excluded — a grove still holds the occasional brass thing.
    expect(SpawnTable.weightFor(wooden, new Map([['iron', 4]]))).toBe(plain);
  });

  it('the draw is deterministic under an injected roll', () => {
    const census = censusOf({});
    const a = candidate({ templatePath: '/obj/a', censusKey: 'a' });
    const b = candidate({ templatePath: '/obj/b', censusKey: 'b' });
    expect(
      SpawnTable.draw([a, b], census, 'r', { roll: () => 0 })?.templatePath,
    ).toBe('/obj/a');
    expect(
      SpawnTable.draw([a, b], census, 'r', { roll: () => 0.99 })?.templatePath,
    ).toBe('/obj/b');
  });
});

describe('CirculatingMixin — reads its footprint, never declares it', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('AC3a — effect tags come from `Arcane`, with no second copy', () => {
    const good = makeStuff(() => new TestGood());
    good.setDeclaredAddresses([{ verb: 'create', noun: 'fire' }]);
    good.setCensusKey('wand');
    good.setMaterialTags(['wood']);

    expect(good.getEffectTags()).toEqual([{ verb: 'create', noun: 'fire' }]);
    // ⚠ There is NO `effectTags` field. A copy would drift from the
    // footprint it came from — and a ward would end up consulting the
    // distribution subsystem to decide whether to suppress this, which
    // is backwards.
    expect(
      Object.prototype.hasOwnProperty.call(good, 'effectTags'),
    ).toBe(false);

    // Change the footprint; the distribution read follows automatically.
    good.setDeclaredAddresses([{ verb: 'perceive', noun: 'arcana' }]);
    expect(good.getEffectTags()).toEqual([
      { verb: 'perceive', noun: 'arcana' },
    ]);
  });

  it('spawn weight tracks the footprint through `Arcane`', () => {
    const good = makeStuff(() => new TestGood());
    good.setDeclaredAddresses([{ verb: 'control', noun: 'mind' }]);
    const dear = good.getSpawnWeight();
    good.setDeclaredAddresses([{ verb: 'perceive', noun: 'arcana' }]);
    expect(good.getSpawnWeight()).toBeGreaterThan(dear);
  });

  it('an item with no census key counts in NOTHING, by its own declaration', () => {
    const good = makeStuff(() => new TestGood());
    expect(good.getCensusKey()).toBe('');
  });
});

describe('Stock targets — item baseline, region override', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it('an item carries its OWN baseline target, not one global number', () => {
    const wand = makeStuff(() => new TestGood());
    const scroll = makeStuff(() => new TestGood());
    wand.setCensusKey('wand');
    wand.setRegionTarget(2);
    scroll.setCensusKey('scroll');
    scroll.setRegionTarget(8);
    // Before this, every census key on the planet targeted the same
    // number off one dial — a wand and a scroll were equally plentiful
    // however differently they were meant to stock.
    expect(wand.getRegionTarget()).toBe(2);
    expect(scroll.getRegionTarget()).toBe(8);
    expect(() => wand.setRegionTarget(-1)).toThrow(/non-negative/);
  });

  it('⚠ target is NOT rarity — an item still cannot declare itself common', () => {
    // The AC 32 line. Rarity answers WHICH item a draw yields and is
    // derived from the grid cell; target answers HOW MANY should exist.
    // Raising a target must not make a dear working commonplace.
    const dear = makeStuff(() => new TestGood());
    dear.setDeclaredAddresses([{ verb: 'control', noun: 'mind' }]);
    dear.setCensusKey('k');
    const cheap = makeStuff(() => new TestGood());
    cheap.setDeclaredAddresses([{ verb: 'perceive', noun: 'arcana' }]);
    cheap.setCensusKey('k2');

    const dearWeight = dear.getSpawnWeight();
    dear.setRegionTarget(500); // author wants lots of them around
    // …and the DRAW is unmoved. Stocking more of a thing does not make
    // any single draw likelier to be that thing.
    expect(dear.getSpawnWeight()).toBe(dearWeight);
    expect(dear.getSpawnWeight()).toBeLessThan(cheap.getSpawnWeight());
  });

  it('a region at its item baseline declines; a higher region target does not', () => {
    const census = censusOf({ r: { wand: 3 } });
    const atBaseline = [
      candidate({ templatePath: '/obj/w', censusKey: 'wand', regionTarget: 3 }),
    ];
    expect(SpawnTable.draw(atBaseline, census, 'r')).toBeNull();

    // The same stock, in a region whose zone declares it stocks 6 —
    // "how many wands this forest holds" is a fact about the forest.
    const zoneRaised = [
      candidate({ templatePath: '/obj/w', censusKey: 'wand', regionTarget: 6 }),
    ];
    expect(SpawnTable.draw(zoneRaised, census, 'r')).not.toBeNull();
  });

  it('a zone target of 0 means "this region stocks none of that"', () => {
    const census = censusOf({});
    const none = [
      candidate({ templatePath: '/obj/w', censusKey: 'wand', regionTarget: 0 }),
    ];
    // An empty region still declines, because the declared count is nil.
    expect(SpawnTable.draw(none, census, 'r')).toBeNull();
  });

  it('place affinity now DOES something — it was inert before', () => {
    // `SpawnTable.draw` always accepted an affinity map; the sweep never
    // passed one, so `materialTags` were stored, read, multiplied
    // against an empty map and did nothing at all.
    const census = censusOf({});
    const wooden = candidate({
      templatePath: '/obj/wood',
      censusKey: 'a',
      materialTags: ['wood'],
    });
    const iron = candidate({
      templatePath: '/obj/iron',
      censusKey: 'b',
      materialTags: ['iron'],
    });
    const grove = new Map([['wood', 3]]);

    // In a grove, the wooden thing dominates the draw…
    const drawn = SpawnTable.draw([wooden, iron], census, 'r', {
      affinity: grove,
      roll: () => 0.6,
    });
    expect(drawn?.templatePath).toBe('/obj/wood');
    // …and with no affinity at all the same roll picks differently,
    // which is the proof the map is actually consulted.
    const neutral = SpawnTable.draw([wooden, iron], census, 'r', {
      roll: () => 0.6,
    });
    expect(neutral?.templatePath).toBe('/obj/iron');
  });
});

describe('AC35 — every potion declares a route', () => {
  it('the shipped roster is populated', () => {
    if (!existsSync(POTION_DIR)) {
      throw new Error(`potion content missing at ${POTION_DIR}`);
    }
    const files = readdirSync(POTION_DIR).filter((f) => f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const doc = YAML.parse(readFileSync(join(POTION_DIR, f), 'utf-8')) as {
        data?: { route?: string };
      };
      // Route lands NOW because retrofitting it across every potion once
      // the ranged build exists is expensive — and because it is what
      // kills the throw-everything case without needing a rule: an
      // ingestion-only potion is a wasted flask. The DELIVERY half
      // (throwing, breakage, splash) defers whole to the ranged build.
      expect(['oral', 'contact', 'vapour']).toContain(doc.data?.route);
    }
  });
});
