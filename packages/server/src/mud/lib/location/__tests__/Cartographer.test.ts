/**
 * ⭐⭐ The extraction's whole point: **map-keeping is a capability any
 * perceiver can compose**, in one line, with nothing reimplemented.
 *
 * It lived on `Avatar` first, and the tell that it did not belong there
 * was a private predicate re-narrowing the host set from inside the
 * class. The deeper sign was in the doc: *"an NPC that wants a map
 * implements the two `Perceiver` hooks"* — true, and under that shape
 * it would have had to reimplement the whole Stuff→claims conversion,
 * because all of it was private to `Avatar`.
 *
 * So the test that matters is a host which is **not an Avatar** keeping
 * a map. If this file ever needs an Avatar to pass, the extraction has
 * come undone.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CartographerMixin } from '../Cartographer';
import { NavigationApi } from '../../../api/navigation';
import { AddressApi } from '../../../api/address';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Idea } from '../../stuff/Idea';
import { SingletonMixin } from '../../stuff/Singleton';
import { ContainerMixin } from '../../spatial/Container';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { MapClaim } from '../MapClaim';
import type { Stuff } from '../../stuff/Stuff';

const GUIDE_ROW = '/test/carto/agent/guide';
const GUIDE_ID = '/test/carto/agent/guide/one';
const HALL = '/test/carto/zone/hall';

/** ⭐ An NPC guide. Not an Avatar, and composes nothing of Avatar's. */
class Guide extends CartographerMixin(NamedMixin(Idea)) {}

/** The same, declining to keep one. */
class Incurious extends CartographerMixin(NamedMixin(Idea)) {
  public override keepsMaps(): boolean {
    return false;
  }
}

/** A singleton place, so its handle is its row. */
class Hall extends SingletonMixin(
  ContainerMixin(NamedMixin(PerceptibleMixin(Idea))),
) {}

let recorded: Array<{
  viewerKey: string;
  locality: string;
  claims: readonly MapClaim[];
}>;

beforeEach(() => {
  StuffApi.clearAll();
  recorded = [];
  vi.spyOn(NavigationApi, 'recordPlace').mockImplementation((async (
    viewerKey: string,
    locality: string,
    claims: readonly MapClaim[],
  ) => {
    recorded.push({ viewerKey, locality, claims });
  }) as never);
  vi.spyOn(NavigationApi, 'mapNow').mockReturnValue(1234);
  vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue({
    getAddress: () => 'test/cartoville',
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function hall(): Hall {
  const h = makeStuffAtPath(() => new Hall(), HALL);
  h.setName('the hall');
  return h;
}

describe('⭐⭐ a host that is not an Avatar keeps a map', () => {
  it('composing the mixin is the whole of it', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);

    guide.onPerceivedPlace(hall() as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));

    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.viewerKey).toBe(GUIDE_ID);
    expect(recorded[0]!.locality).toBe('test/cartoville');
    const place = recorded[0]!.claims[0]!;
    expect(place.kind).toBe('place');
    // ⭐ The HANDLE, not the template path: a singleton place's row IS
    // its handle, and the conversion is the mixin's.
    expect(place.place).toBe(HALL);
    expect(place.name).toBe('the hall');
    expect(place.channel).toBe('perception');
    expect(place.recordedBy).toBe(GUIDE_ID);
  });

  it('⭐ declines in one override, and nothing is written', async () => {
    const dull = makeStuffAtPath(() => new Incurious(), GUIDE_ROW, GUIDE_ID);
    dull.onPerceivedPlace(hall() as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));
    expect(recorded).toEqual([]);
  });

  it('the mixin is nameable, so a row can require it', () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    expect(MixinApi.hasMixin(guide, Mixins.Cartographer)).toBe(true);
  });
});

describe('the policy hooks are the host\'s to answer', () => {
  it('⭐ `keepsMaps` defaults to HAVING A DURABLE HANDLE', () => {
    // A map-keeper needs a durable handle for the same reason the
    // places it records do: a map is filed under a name and read back
    // later. This is one fact the host already answers about itself —
    // NOT the mixin narrowing its own composers by shape, which is the
    // thing the extraction was for.
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    expect(guide.keepsMaps()).toBe(true);
  });

  it('⚠⚠ an UNMINTED host declines — the Extra-pooling hazard', () => {
    // ⭐ The defect this closes, measured: `mapOwnerKey()` falls back to
    // the template path for a host with no minted identity, so every
    // `Extra` cloned from one row filed into ONE SHARED MAP — two
    // sentries from the same row probed identical owner keys. An
    // `Extra` is a ROLE, not a person: no `SingletonMixin`, no mint, no
    // durable handle, and now a clean decline.
    const extra = makeStuffAtPath(() => new Guide(), GUIDE_ROW);
    expect((extra as unknown as Stuff).getDurableHandle()).toBeNull();
    expect(extra.keepsMaps()).toBe(false);
    // ⚠ And the tell that the old default was wrong rather than merely
    // permissive: the key it WOULD have filed under is the row every
    // sibling shares.
    expect(extra.mapOwnerKey()).toBe(GUIDE_ROW);
  });

  it('⭐ a SINGLETON host keeps one — the one instance IS the row', () => {
    // The `Cast` shape (one person per path). Nothing is minted, so the
    // base rung says null; the singleton rung fills it with the row,
    // which is a name that outlives the instance.
    class Person extends CartographerMixin(SingletonMixin(NamedMixin(Idea))) {}
    const cast = makeStuffAtPath(() => new Person(), GUIDE_ROW);
    expect((cast as unknown as Stuff).getDurableHandle()).toBe(GUIDE_ROW);
    expect(cast.keepsMaps()).toBe(true);
  });

  it('⚠ the handle is the PREDICATE, never the key', () => {
    // A saved Avatar reads a compound `<row>#<key>` handle, so keying
    // the map on it would move a player's map the first time they
    // persisted. `mapOwnerKey` stays the identity path.
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    expect(guide.mapOwnerKey()).toBe(GUIDE_ID);
    expect(guide.mapOwnerKey()).not.toContain('#');
  });

  it('`mapOwnerKey` is the identity — so a projecting body files as the person', () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    expect(guide.mapOwnerKey()).toBe(GUIDE_ID);
  });

  it('⚠ no owner key is a clean decline, not a throw', async () => {
    // Nowhere to file is not an error; it is an answer.
    const loose = makeStuffAtPath(() => new Guide(), GUIDE_ROW);
    vi.spyOn(loose, 'mapOwnerKey').mockReturnValue('');
    loose.onPerceivedPlace(hall() as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));
    expect(recorded).toEqual([]);
  });
});

describe('⚠ a place with no durable handle writes NO claim', () => {
  it('an ephemeral clone is honestly nothing', async () => {
    // A fresh clone per landing, named by nothing durable — so an
    // honest map of it is nothing rather than a stale entry for a room
    // that no longer exists.
    class Satellite extends ContainerMixin(NamedMixin(Idea)) {}
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    const sat = makeStuffAtPath(() => new Satellite(), '/test/carto/sat');
    expect((sat as unknown as Stuff).getDurableHandle()).toBeNull();

    guide.onPerceivedPlace(sat as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));
    expect(recorded).toEqual([]);
  });
});

describe('⚠ a map is a convenience — it never fails the act', () => {
  it('a throw in the record is swallowed', async () => {
    vi.mocked(NavigationApi.recordPlace).mockRejectedValue(
      new Error('the store hiccupped'),
    );
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    // These run inside a FORCED frame on arrival, where there is nobody
    // to report an error to; failing somebody's `look` for a map would
    // be the wrong trade.
    expect(() =>
      guide.onPerceivedPlace(hall() as unknown as Stuff, []),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});
