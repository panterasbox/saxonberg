/**
 * Waters (fishing D7) — the trade's one place for world arithmetic.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Locality from '@saxonberg/server/mud/platform/idea/Locality';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import Waters, { WATERS_PATH } from '../idea/Waters';

const waters = (): Waters => makeStuffAtPath(() => new Waters(), WATERS_PATH) as Waters;

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('reachAt — the Locality fallback', () => {
  it('a room under a Locality that cites a reach fishes that reach with no Shore and no code', async () => {
    const locality = makeStuffAtPath(() => new Locality(), '/stuff/idea/Locality/hearts-delight');
    locality.setReach('delight:flats');
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(locality);
    const room = makeStuff(() => new Location());
    expect(await waters().reachAt(room)).toBe('delight:flats');
  });

  it('a room under no Locality, or one citing no reach, has no water', async () => {
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
    expect(await waters().reachAt(makeStuff(() => new Location()))).toBeNull();
    const dry = makeStuffAtPath(() => new Locality(), '/stuff/idea/Locality/terminus-city');
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(dry);
    expect(await waters().reachAt(makeStuff(() => new Location()))).toBeNull();
  });
});

describe('bandOf', () => {
  it('reads the floor for a viewer with no transcript, and the fishing band for one with', () => {
    const w = waters();
    const nobody = makeStuff(() => new Location());
    expect(w.bandOf(nobody)).toBe('untrained');
    const angler = makeStuff(() => new Location());
    vi.spyOn(MixinApi, 'isAdvancing').mockImplementation(((s: Stuff) => s === angler) as never);
    (angler as unknown as { competenceDigestCached: () => unknown }).competenceDigestCached = () => [
      { discipline: 'mining', band: 'expert' },
      { discipline: 'fishing', band: 'competent' },
    ];
    expect(w.bandOf(angler)).toBe('competent');
  });
});

describe('registry — met over a shape', () => {
  it('answers null when the water pack\'s register is not there', async () => {
    vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('no such template'));
    expect(await waters().registry()).toBeNull();
    expect(await waters().standingFor('kestrel:confluence', 0)).toBeNull();
  });
});
