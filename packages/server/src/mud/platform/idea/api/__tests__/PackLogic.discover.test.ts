/**
 * Discovery (content-packs wave 3, D10): `SAXONBERG_PACKS` filters the
 * install set after ordering; an id no shipped pack provides throws at
 * boot; `platform` sorts first regardless of input order.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { stubPersist, stubClassResolution, quietConsole, writePack, cleanupPacks } from './pack-harness';

let prior: string | undefined;

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
  prior = process.env.SAXONBERG_PACKS;
});
afterEach(() => {
  if (prior === undefined) delete process.env.SAXONBERG_PACKS;
  else process.env.SAXONBERG_PACKS = prior;
  vi.restoreAllMocks();
  cleanupPacks();
});

const ROW = (rel: string) => ({ rel, data: { name: rel } });

describe('discovery', () => {
  it('platform sorts first regardless of input order (then dependsOn order)', async () => {
    const a = writePack('a', [ROW('obj/a.yaml')]);
    const b = writePack('b', [ROW('obj/b.yaml')], { dependsOn: ['a'] });
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    const results = await PackApi.install([b, a, platform]);
    expect(results.map((r) => r.packId)).toEqual(['platform', 'a', 'b']);
  });

  it('SAXONBERG_PACKS filters the install set; unset means every pack', async () => {
    const a = writePack('a', [ROW('obj/a.yaml')]);
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    process.env.SAXONBERG_PACKS = 'platform';
    expect((await PackApi.install([a, platform])).map((r) => r.packId)).toEqual(['platform']);
    process.env.SAXONBERG_PACKS = ' platform , a ';
    expect((await PackApi.install([a, platform])).map((r) => r.packId)).toEqual(['platform', 'a']);
    delete process.env.SAXONBERG_PACKS;
    expect((await PackApi.install([a, platform])).map((r) => r.packId)).toEqual(['platform', 'a']);
  });

  it('an id no shipped pack provides throws at boot', async () => {
    const platform = writePack('platform', [ROW('obj/p.yaml')]);
    process.env.SAXONBERG_PACKS = 'platform,nope';
    await expect(PackApi.install([platform])).rejects.toThrow(/SAXONBERG_PACKS names 'nope', which no shipped pack provides/);
  });
});

describe('the shipped packs (real discovery, no install)', () => {
  it('fifty-one ship; the trade packs order after generic-objects (wave 4a); the venues after their trades (wave 4b); the localities after residence (residences D18); every consigner after distribution (fermentation D10); the localities after water (watershed W9); the metal chain after ITS trades; every locality with a terminal after tpa (the TPA reform); ranching after farming (farmstead P9 — pasture is a field); the lanes and the haulier after transport (logistics); the textile chain after farming; the city after every trade whose premises it hosts (economic bootstrap D6)', () => {
    const ids = PackApi.contentRoots().map((root) => root.split('/').slice(-2)[0]!);
    // ⭐ 43 → 46: the grain chain adds `trade-milling`, `trade-baking`
    // and `hearts-delight`; 46 → 47: forestry adds `trade-forestry`;
    // 47 → 48: fishing adds `trade-fishing`; 48 → 50: TWO builds landed a
    // pack in the same window — `trade-shopkeeping` (trades-and-labor) and
    // `ground` (the system pack the column and the surface character moved
    // OUT of two trades into); 50 → 51: extraction adds `trade-quarrying`.
    //
    // ⚠⚠ Worth knowing: each of those builds wrote `49` independently, and
    // git merged the two comment blocks as a CONFLICT while merging the
    // assertion line CLEANLY — so the number would have stayed 49 and gone
    // red on master with nothing in the diff to explain it. A count is the
    // one assertion a three-way merge cannot reconcile. A
    // count, not a claim — what the claims below check is the ORDER,
    // which is where a pack graph actually breaks.
    expect(ids).toHaveLength(51);
    expect(ids[0]).toBe('platform');    for (const trade of ['trade-smithing', 'trade-cooking', 'trade-hospitality', 'trade-distilling']) {
      expect(ids.indexOf(trade)).toBeGreaterThan(ids.indexOf('generic-objects'));
    }
    for (const trade of ['trade-smithing', 'trade-cooking']) {
      expect(ids.indexOf('hearthworks')).toBeGreaterThan(ids.indexOf(trade));
    }
    expect(ids.indexOf('hearthworks')).toBeGreaterThan(ids.indexOf('corpo-goodkin'));
    // The residences cut: the three locality packs depend on the
    // residence capability pack (and hinkley-hills on terminus).
    for (const locality of ['eternal-university', 'terminus', 'hinkley-hills']) {
      expect(ids.indexOf(locality)).toBeGreaterThan(ids.indexOf('residence'));
    }
    expect(ids.indexOf('hinkley-hills')).toBeGreaterThan(ids.indexOf('terminus'));
    // ⭐ The shopkeeping cut (trades-and-labor): every pack whose rows
    // name the counter or the shelf orders after the trade that ships
    // them — the general store, the market stalls, the pithead store,
    // the bale store, the farm shelf.
    for (const namer of ['terminus', 'rejection', 'trade-textiles', 'hearts-delight']) {
      expect(ids.indexOf(namer)).toBeGreaterThan(ids.indexOf('trade-shopkeeping'));
    }
    // ⭐ The quarrying cut (extraction): the trade reads `/system/ground`'s
    // column, and the venue's quarry rows name the trade's own classes. ⚠ It
    // does NOT order after `trade-mining` — that is the claim: a QUARRY does
    // not depend on a mine, which is the whole reason the column left the
    // mining trade in the first place.
    expect(ids.indexOf('trade-quarrying')).toBeGreaterThan(ids.indexOf('ground'));
    expect(ids.indexOf('rejection')).toBeGreaterThan(ids.indexOf('trade-quarrying'));
    // ⭐ …and TERMINUS too, because the saltings' pans and the salt house's
    // brine hearth are rows on the trade's classes. Salt has three sources in
    // three different places and one trade behind all of them.
    expect(ids.indexOf('terminus')).toBeGreaterThan(ids.indexOf('trade-quarrying'));
    // The metal chain: three capability packs, one venue over all three.
    // ⭐ `rejection` ships no `src/` at all — the exemplar claim is that a
    // second mining town is a locality pack over the same trades, and the
    // ordering here is what makes that installable.
    // (forestry: the wood above the yard is rows on forestry's classes,
    // so the venue orders after that trade too — and the fuel trade does
    // NOT, a customer of wood being installable without a forester.)
    for (const trade of ['trade-mining', 'trade-fuel', 'trade-smelting', 'trade-forestry']) {
      expect(ids.indexOf('rejection')).toBeGreaterThan(ids.indexOf(trade));
    }
    // ⭐ The ground cut (ground build): `Deposit` and `GroundCharacter` are
    // `/system/ground`'s now, not two trades'. Everything that names either
    // class — the two trades, and the three localities whose rows do —
    // orders after it. This is the order that makes the claim installable:
    // a QUARRY can read the column without depending on a mine, and a WOOD
    // can read its own dirt without depending on a farm.
    for (const consumer of [
      'trade-mining',
      'trade-farming',
      'rejection',
      'eternal-university',
      'hearts-delight',
    ]) {
      expect(ids.indexOf(consumer)).toBeGreaterThan(ids.indexOf('ground'));
    }
    expect(ids.indexOf('trade-smelting')).toBeGreaterThan(ids.indexOf('trade-mining'));
    expect(ids.indexOf('trade-smelting')).toBeGreaterThan(ids.indexOf('trade-fuel'));
    // The D10 decoupling: every trade that consigns (and every venue
    // that buys) orders after distribution, and no producing sibling
    // depends on trade-distilling any more.
    for (const consigner of ['trade-brewing', 'trade-winemaking', 'trade-bottling', 'trade-farming', 'trade-cooking', 'trade-distilling', 'terminus', 'saxonberg-lounge']) {
      expect(ids.indexOf(consigner)).toBeGreaterThan(ids.indexOf('distribution'));
    }
    // ⭐ The textile chain. `trade-textiles` names farming's flax-straw
    // material in its retting profile and the distributor's counter, so
    // it orders after both. (It USED to order after terminus too, for
    // the mill — the mill's premises are terminus's now, below.)
    for (const upstream of ['trade-farming', 'distribution']) {
      expect(ids.indexOf('trade-textiles')).toBeGreaterThan(ids.indexOf(upstream));
    }
    // Dyeing consumes farming's dyestuff materials and colours
    // textiles' cloth, so it orders after both.
    for (const upstream of ['trade-farming', 'trade-textiles']) {
      expect(ids.indexOf('trade-dyeing')).toBeGreaterThan(ids.indexOf(upstream));
    }
    // Tailoring cuts textiles' cloth.
    for (const upstream of ['trade-textiles']) {
      expect(ids.indexOf('trade-tailoring')).toBeGreaterThan(ids.indexOf(upstream));
    }
    // ⭐ Economic bootstrap D6: the trade PREMISES sit in the city, so the
    // dependency runs terminus → every trade whose floor it hosts, never
    // the other way (a trade is placeless).
    for (const trade of ['trade-textiles', 'trade-dyeing', 'trade-tailoring', 'trade-cooking', 'trade-bottling', 'trade-distilling', 'trade-brewing', 'trade-farming', 'trade-winemaking', 'distribution']) {
      expect(ids.indexOf('terminus'), trade).toBeGreaterThan(ids.indexOf(trade));
    }

    // ⭐ The fishing cut: the trade reads the water pack's register by
    // path and ships nothing the water pack names, so it orders after
    // water; Terminus casts the fisher with the trade's rod and brains,
    // so it orders after the trade. The moor's mere is a WATER class in
    // world-seed — no edge to the trade at all.
    expect(ids.indexOf('trade-fishing')).toBeGreaterThan(ids.indexOf('water'));
    expect(ids.indexOf('terminus')).toBeGreaterThan(ids.indexOf('trade-fishing'));

    // The watershed cut: the three packs whose content names the water
    // pack's classes (`/system/water/thing/Conduit`, `StorageNode`) or its
    // `Watercourse` rows must install after it.
    for (const namer of ['world-seed', 'terminus', 'hinkley-hills']) {
      expect(ids.indexOf(namer)).toBeGreaterThan(ids.indexOf('water'));
    }
    // ⭐ The TPA cut: every locality whose rows name
    // `/system/tpa/thing/TpaTerminal` installs after the pack that ships
    // the class — and `tpa` itself after `arcana`, whose
    // `ManaPoweredMixin` its terminal composes. The mechanism is the
    // system's; a terminal is the realm's.
    for (const namer of [
      'terminus',
      'hinkley-hills',
      'newbie-wilds',
      'saxonberg-lounge',
    ]) {
      expect(ids.indexOf(namer)).toBeGreaterThan(ids.indexOf('tpa'));
    }
    // ⭐⭐ The farmstead cut, and it is the design's own claim made
    // installable: **pasture is a field.** The ground an animal stands
    // on is farming's, so ranching depends on farming and installs after
    // it — the metal chain's shape (mining → fuel → smelting) reached
    // from the other direction, and declared in the manifest rather than
    // assumed.
    expect(ids.indexOf('trade-ranching')).toBeGreaterThan(
      ids.indexOf('trade-farming'),
    );
    expect(ids.indexOf('tpa')).toBeGreaterThan(ids.indexOf('arcana'));
    // ⭐ The logistics cut: the realm's lanes and service routes are rows
    // in the COMMONS (world-seed), and Terminus's ford names the
    // transport system's `FordExit` — so both install after the pack
    // that ships the classes. The mechanism is the system's; a road up
    // somebody's valley is the realm's.
    for (const namer of ['world-seed', 'terminus', 'trade-haulage']) {
      expect(ids.indexOf(namer)).toBeGreaterThan(ids.indexOf('transport'));
    }
    // …and the depot's rows are the trade's while the QUAY is the
    // locality's, so Terminus installs after the trade whose counter and
    // shed it stands.
    expect(ids.indexOf('terminus')).toBeGreaterThan(ids.indexOf('trade-haulage'));
  });
});
