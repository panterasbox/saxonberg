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
import { AddressableMixin } from '../../address/Addressable';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import Exit from '../../boundary/Exit';
import type { Stuff } from '../../stuff/Stuff';
import type { MapClaim } from '../MapClaim';

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

/**
 * ⭐ The same, but ADDRESSABLE — composed, not stubbed.
 *
 * ⚠⚠ This class exists because of how the group bug hid: the routing
 * tests set `MapClaim.group` by hand in their fixtures, so the
 * resolution tier they were exercising worked perfectly against data
 * the WRITER never writes. A claim-shape field has to be asserted
 * through the thing that banks it.
 */
class AddressedHall extends AddressableMixin(
  SingletonMixin(ContainerMixin(NamedMixin(PerceptibleMixin(Idea)))),
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

    guide.recordSurroundings(hall() as unknown as Stuff, []);
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
    // ⭐ `seen`, not `perception`: this claim came from LOOKING. The
    // channel vocabulary is navigational now — `walked` · `seen` ·
    // `published` — because the old `perception` covered both looking
    // and walking and the renderer was translating it to the word
    // "walked" regardless.
    expect(place.channel).toBe('seen');
    expect(place.recordedBy).toBe(GUIDE_ID);
  });

  it('⭐ declines in one override, and nothing is written', async () => {
    const dull = makeStuffAtPath(() => new Incurious(), GUIDE_ROW, GUIDE_ID);
    dull.recordSurroundings(hall() as unknown as Stuff, []);
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
    loose.recordSurroundings(hall() as unknown as Stuff, []);
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

    guide.recordSurroundings(sat as unknown as Stuff, []);
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
      guide.recordSurroundings(hall() as unknown as Stuff, []),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe("⭐⭐ a walked edge records that you saw it was a ford", () => {
  /*
   * You were standing at the exit, so anything the exit says about
   * ITSELF is earned — the Cartographer's standing rule. A plan over
   * your own map can then carry *this way is not always passable*
   * rather than quietly routing you over a crossing that disappears.
   *
   * ⚠⚠ And NO `minutes` beside it. An earlier draft recorded the
   * duration on the same argument and the lens pass killed it:
   * ordinary movement is instantaneous and free by design, so a walker
   * who crossed in zero game time did not learn how long the way
   * takes. Recording it would write a number the world never charged.
   */
  function exitOut(conditional: boolean): Exit {
    const from = hall() as unknown as Stuff;
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: from as never,
          destinationPath: '/test/cartoville/yard',
          conditional,
        }),
    );
    return exit;
  }

  it('stamps `conditional: true` on a way that closes', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    guide.onTraversed(exitOut(true) as never);
    await new Promise((r) => setTimeout(r, 0));
    const edge = recorded.flatMap((r) => r.claims).find((c) => c.kind === 'edge');
    expect(edge?.conditional).toBe(true);
  });

  it('⚠ leaves it ABSENT on an ordinary way — absent is what it means', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    guide.onTraversed(exitOut(false) as never);
    await new Promise((r) => setTimeout(r, 0));
    const edge = recorded.flatMap((r) => r.claims).find((c) => c.kind === 'edge');
    expect(edge?.conditional).toBeUndefined();
  });

  it('⚠⚠ records NO duration, however long the edge declares', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    const exit = makeStuff(
      () =>
        new Exit({
          direction: 'north',
          source: hall() as unknown as never,
          destinationPath: '/test/cartoville/yard',
          edgeMinutes: 40,
        }),
    );
    guide.onTraversed(exit as never);
    await new Promise((r) => setTimeout(r, 0));
    const edge = recorded.flatMap((r) => r.claims).find((c) => c.kind === 'edge');
    expect(edge).toBeDefined();
    expect((edge as unknown as { minutes?: number }).minutes).toBeUndefined();
  });
});

describe('⭐⭐ a place claim banks the tokens it answered to', () => {
  /*
   * The LAST LEG of naming a destination. An address names a
   * COLLECTION of rooms — giving every room a unique one does not
   * work — and the keyword picks within it. Banked rather than read
   * live for the same reason the handle is: the room may not be
   * loaded when somebody asks the way to it.
   */
  it('records the place\'s keywords alongside its name', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    const hall_ = hall() as unknown as Stuff & { setKeywords(k: string[]): void };
    hall_.setKeywords(['hall', 'entry']);
    guide.recordSurroundings(hall_ as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));
    const place = recorded.flatMap((r) => r.claims).find((c) => c.kind === 'place');
    expect(place?.keywords).toEqual(['hall', 'entry']);
    // ⚠ And the short description too — it is what a prompt shows to
    // tell two rooms with the same keyword apart.
    expect(place?.name).toBe('the hall');
  });

  it('⚠ leaves them ABSENT when the place answers to nothing', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    const bare = hall() as unknown as Stuff & { setKeywords(k: string[]): void };
    bare.setKeywords([]);
    guide.recordSurroundings(bare as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));
    const place = recorded.flatMap((r) => r.claims).find((c) => c.kind === 'place');
    expect(place?.keywords).toBeUndefined();
  });
});

describe("⭐⭐⭐ a place claim banks the address it DECLARES", () => {
  /*
   * ⚠⚠ This read was broken from the day it shipped, and silently:
   * `groupingAddressOf` duck-typed `getDeclaredAddress?.()`, a method
   * that exists NOWHERE in the tree (`AddressableMixin`'s reader is
   * `getAddress()`). The optional call answered `undefined` every
   * time, so `MapClaim.group` was never once populated and `map`'s
   * grouping-by-address has never grouped anything.
   *
   * ⭐ Found in the routing build's pre-merge sweep, by the routing
   * build NEEDING it — a dead read stays dead until something depends
   * on it. 53 of the realm's 128 places declare an address.
   */
  it('reads the declared address through the mixin, not a duck-type', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    const addressed = makeStuffAtPath(() => new AddressedHall(), HALL);
    addressed.setName('the hall');
    addressed.setAddress('test/cartoville/civic-quarter');

    guide.recordSurroundings(addressed as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));

    const place = recorded.flatMap((r) => r.claims).find((c) => c.kind === 'place');
    expect(place?.group).toBe('test/cartoville/civic-quarter');
  });

  it('⚠ leaves it absent for a place that declares none — the sparse case', async () => {
    const guide = makeStuffAtPath(() => new Guide(), GUIDE_ROW, GUIDE_ID);
    guide.recordSurroundings(hall() as unknown as Stuff, []);
    await new Promise((r) => setTimeout(r, 0));
    const place = recorded.flatMap((r) => r.claims).find((c) => c.kind === 'place');
    // 75 of 128 places declare nothing, so `undefined` is the COMMON
    // answer — which is why a bare keyword must widen past the
    // standing locality rather than refuse.
    expect(place?.group).toBeUndefined();
  });
});
