/**
 * ⭐ The second instance (forestry.md § The second instance) — **a second locality's
 * wood is rows and nothing else.**
 *
 * Two clearings authored as a second locality would author them —
 * literal rows on `/trade/forestry/location/Wood` with a `mix:` each,
 * hydrated through the shipped `PersistentHydrator` — register, derive
 * their own standing from their own block, afford `fell` to whoever
 * stands in them, and felling one leaves the other untouched. No pack
 * code was written to make this true; that is the claim.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Wood from '../location/Wood';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const BEECH = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/fagaceae/fagus/sylvatica';
const PINE = '/stuff/idea/species/plantae/tracheophyta/pinopsida/pinales/pinaceae/pinus/sylvestris';

/** What a second locality's author would type — a row, verbatim. */
const BEECH_HANGER = {
  shortDescription: 'beech hanger',
  woodName: 'the Hanger',
  areaM2: 400,
  mix: [
    { speciesPath: BEECH, name: 'beech', woodMaterialPath: '/stuff/idea/material/wood/beech', seedPath: null, standing: 20, capacity: 24, incrementPerYear: 2 },
  ],
};
const PINE_PLANTATION = {
  shortDescription: 'pine plantation',
  woodName: 'the Plantation',
  areaM2: 100,
  mix: [
    { speciesPath: PINE, name: 'pine', woodMaterialPath: '/stuff/idea/material/wood/pine', seedPath: null, standing: 30, capacity: 30, incrementPerYear: 3 },
  ],
};

describe('a second wood is rows', () => {
  let base: number;
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function hydrate(path: string, data: Record<string, unknown>): Promise<Wood> {
    const w = makeStuffAtPath(() => new Wood(), path);
    await makeStuff(() => new PersistentHydrator()).hydrate(w, data);
    await w.postRegister();
    return w;
  }

  it('two clearings in another locality read their own blocks, afford fell, and deplete apart', async () => {
    const hanger = await hydrate('/world/_elsewhere/hanger/beeches', BEECH_HANGER);
    const plantation = await hydrate('/world/_elsewhere/plantation/rows', PINE_PLANTATION);

    expect(hanger.getWoodName()).toBe('the Hanger');
    expect(hanger.getAreaM2()).toBe(400);
    expect(hanger.standingNow(hanger.getMix()[0]!)).toBe(20);
    expect(plantation.standingNow(plantation.getMix()[0]!)).toBe(30);
    expect(hanger.standPhrase()).toBe("Beech stands here — about twenty trees' worth, old, planted by nobody alive.");
    expect(plantation.standPhrase()).toBe("Pine stands here — about thirty trees' worth, old, planted by nobody alive.");

    // Ground, sized by its own area.
    expect(hanger.soilCatchmentAreaM2()).toBe(400);
    expect(hanger.getReserve('moisture')!.capacity.rawValue()).toBe(400 * 45);

    // The verb, to whoever stands in it.
    const verbs = CommandApi.collectContributions(Wood, 'inventory').map((d) => d.verbs).flat();
    expect(verbs).toContain('fell');

    // A cut in one is a cut in one.
    expect(hanger.cut(BEECH, base, 'somebody')).toBe(true);
    expect(hanger.standingNow(hanger.getMix()[0]!)).toBe(19);
    expect(plantation.standingNow(plantation.getMix()[0]!)).toBe(30);
    expect(plantation.getStandStamp()).toBe(0);
  });
});
