/**
 * The boat (maritime D12): a vessel with a position of its own once it is
 * in the water — the outermost craft for whoever sits in it — that goes
 * back in the water after a restart if that is where its record left it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import StructureCatalogue from '@saxonberg/server/mud/platform/idea/StructureCatalogue';
import Boat from '../thing/Boat';

class Deck extends CartesianLocation {}

let boat: Boat;

beforeEach(() => {
  StuffApi.clearAll();
  boat = makeStuffAtPath(() => new Boat(), '/test/ship/thing/dinghy');
  vi.spyOn(Template, 'findByClass').mockResolvedValue([]);
  makeStuffAtPath(() => new StructureCatalogue(), '/platform/idea/StructureCatalogue');
});

afterEach(() => vi.restoreAllMocks());

describe('Boat', () => {
  it('is a craft: positioned, voyaging, persistable', () => {
    expect(MixinApi.isPositioned(boat)).toBe(true);
    expect(MixinApi.isVoyaging(boat)).toBe(true);
    expect(MixinApi.isPersistable(boat)).toBe(true);
  });

  it('on deck it has no position; in the water it answers for itself', async () => {
    expect(await ExpanseApi.craftAt('/test/ship/thing/dinghy')).toBeNull();
    boat.setExpanse('/test/sea');
    boat.placeAt(
      new (await import('@saxonberg/server/mud/lib/expanse/GeoPosition')).GeoPosition(50, -4),
      0,
    );
    expect(await ExpanseApi.craftAt('/test/ship/thing/dinghy')).toBe(boat);
  });

  it('everybody in it sees from its own low eye', () => {
    boat.setEyeHeightM(1);
    expect(boat.sightHeightFor(null)).toBe(1);
  });

  it('⭐ a boat restored ON its deck but whose record says it was in the water goes back in the water', async () => {
    const deck = makeStuffAtPath(() => new Deck(), '/test/ship/deck');
    ContainmentApi.move(boat as never, deck as never);
    boat.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    vi.spyOn(boat, 'liveExpanse').mockResolvedValue(null);
    await boat.onRestored();
    expect(boat.getContainer()).toBeNull();
  });
});
