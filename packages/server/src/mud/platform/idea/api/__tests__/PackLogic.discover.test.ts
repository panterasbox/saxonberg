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
  it('thirty-nine ship; the trade packs order after generic-objects (wave 4a); the venues after their trades (wave 4b); the localities after residence (residences D18); every consigner after distribution (fermentation D10); the localities after water (watershed W9); the metal chain after ITS trades; every locality with a terminal after tpa (the TPA reform); the textile chain after farming AND the locality it consigns into', () => {
    const ids = PackApi.contentRoots().map((root) => root.split('/').slice(-2)[0]!);
    expect(ids).toHaveLength(39);
    expect(ids[0]).toBe('platform');
    for (const trade of ['trade-smithing', 'trade-hearth-cooking', 'trade-hospitality', 'trade-distilling']) {
      expect(ids.indexOf(trade)).toBeGreaterThan(ids.indexOf('generic-objects'));
    }
    for (const trade of ['trade-smithing', 'trade-hearth-cooking']) {
      expect(ids.indexOf('hearthworks')).toBeGreaterThan(ids.indexOf(trade));
    }
    expect(ids.indexOf('hearthworks')).toBeGreaterThan(ids.indexOf('corpo-goodkin'));
    // The residences cut: the three locality packs depend on the
    // residence capability pack (and hinkley-hills on terminus).
    for (const locality of ['eternal-university', 'terminus', 'hinkley-hills']) {
      expect(ids.indexOf(locality)).toBeGreaterThan(ids.indexOf('residence'));
    }
    expect(ids.indexOf('hinkley-hills')).toBeGreaterThan(ids.indexOf('terminus'));
    // The metal chain: three capability packs, one venue over all three.
    // ⭐ `rejection` ships no `src/` at all — the exemplar claim is that a
    // second mining town is a locality pack over the same trades, and the
    // ordering here is what makes that installable.
    for (const trade of ['trade-mining', 'trade-fuel', 'trade-smelting']) {
      expect(ids.indexOf('rejection')).toBeGreaterThan(ids.indexOf(trade));
    }
    expect(ids.indexOf('trade-smelting')).toBeGreaterThan(ids.indexOf('trade-mining'));
    expect(ids.indexOf('trade-smelting')).toBeGreaterThan(ids.indexOf('trade-fuel'));
    // The D10 decoupling: every trade that consigns (and every venue
    // that buys) orders after distribution, and no producing sibling
    // depends on trade-distilling any more.
    for (const consigner of ['trade-brewing', 'trade-winemaking', 'trade-bottling', 'trade-farming', 'trade-hearth-cooking', 'trade-distilling', 'terminus', 'saxonberg-lounge']) {
      expect(ids.indexOf(consigner)).toBeGreaterThan(ids.indexOf('distribution'));
    }
    // ⭐ The textile chain. `trade-textiles` names farming's flax-straw
    // material in its retting profile, and CONSIGNS into the Terminus
    // general store — so it orders after both. That second edge is the
    // one that is easy to miss: a producer annex depends on the
    // locality whose counter it sells through, not the other way round.
    for (const upstream of ['trade-farming', 'terminus', 'distribution']) {
      expect(ids.indexOf('trade-textiles')).toBeGreaterThan(ids.indexOf(upstream));
    }
    // Dyeing consumes farming's dyestuff materials and colours
    // textiles' cloth, so it orders after both.
    for (const upstream of ['trade-farming', 'trade-textiles']) {
      expect(ids.indexOf('trade-dyeing')).toBeGreaterThan(ids.indexOf(upstream));
    }
    // Tailoring cuts textiles' cloth and hangs its shop off Terminus.
    for (const upstream of ['trade-textiles', 'terminus']) {
      expect(ids.indexOf('trade-tailoring')).toBeGreaterThan(ids.indexOf(upstream));
    }

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
    expect(ids.indexOf('tpa')).toBeGreaterThan(ids.indexOf('arcana'));
  });
});
