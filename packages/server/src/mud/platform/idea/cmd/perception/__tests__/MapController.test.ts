/**
 * The `map` read — ⭐⭐ and the two ways a map shows you it is wrong.
 *
 * AC11 wants *"the map keeps the old claim until they next perceive the
 * place, and the two can be seen to disagree"*, and there are two
 * shapes of that:
 *
 *   - the far side CHANGED — two claims for one direction, and both
 *     render with their dates. Nothing picks a winner;
 *   - the exit VANISHED — and this is the common one, which records
 *     nothing at all, because the player saw no east exit to write
 *     down. The comparison is then against the PLACE's own latest
 *     observation: an edge older than the latest look at that place is
 *     an edge that was not there last time somebody looked.
 *
 * The second is why nothing has to be merged or deleted to make a map
 * honest: the staleness is derivable from two timestamps the document
 * already carries.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MapController from '../MapController';
import { NavigationApi } from '../../../../../api/navigation';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import {
  CommandApi,
  type CommandContext,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { NamedMixin } from '../../../../../lib/description/Named';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import {
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import type { MapClaim, MapDocument } from '../../../../../lib/location/MapClaim';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

const VIEWER_ROW = '/platform/agent/PrimaryAvatar';
const VIEWER_ID = '/platform/agent/Avatar/mapper';
const HALL = '/test/map/hall#a/one';

class Reader extends SensorMixin(CommandGiverMixin(NamedMixin(Idea))) {
  static _mixinName = 'MapTestReader';
}

let said: string[];

function ctx(giver: Stuff, text: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: giver as never,
    commandText: text,
    executionId: 't',
    commandId: 't',
    verb: 'map',
    command: CommandDefinition.fromYaml(
      'verbs: [map]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function reader(): Reader {
  return makeStuffAtPath(() => new Reader(), VIEWER_ROW, VIEWER_ID);
}

function claim(over: Partial<MapClaim> = {}): MapClaim {
  return {
    kind: 'place',
    place: HALL,
    channel: 'seen',
    firstSeen: 100,
    lastSeen: 100,
    recordedBy: VIEWER_ID,
    ...over,
  };
}

function docOf(claims: MapClaim[]): MapDocument {
  return { locality: 'test/mapville', claims };
}

async function run(giver: Stuff, locality?: string): Promise<CommandContext> {
  const c = ctx(giver, locality ? `map ${locality}` : 'map');
  await makeStuffAtPath(
    () => new MapController(),
    '/platform/idea/cmd/perception/MapController',
  ).execute({ locality } as never, c);
  return c;
}

function rejections(c: CommandContext): string[] {
  return c
    .getNotes()
    .filter((n) => n.kind === 'controller-rejected')
    .map((n) => (n as { reason: string }).reason);
}

beforeEach(() => {
  StuffApi.clearAll();
  said = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(((_a: unknown) => {
    const chain = {
      topic: () => chain,
      toSelf: (line: unknown) => {
        said.push(String((line as { toString(): string }).toString()));
        return chain;
      },
      toPeers: () => chain,
      send: () => undefined,
    };
    return chain as never;
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the index', () => {
  it('with no maps at all, says so and suggests looking around', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([]);
    const c = await run(reader());
    expect(rejections(c)).toEqual(['no-maps']);
    expect(said.join('\n')).toMatch(/no maps yet/i);
  });

  it('lists each locality with how many places are in it', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([claim(), claim({ place: '/test/map/hall#a/two' })]),
    ]);
    await run(reader());
    expect(said.join('\n')).toMatch(/test\/mapville — 2 places/);
  });
});

describe('⭐ an unvisited locality says so', () => {
  it('"You have no map of X" — not an empty map of X', async () => {
    // An empty rendering would read as *there is nothing there*, which
    // is a claim about the world. This is a claim about the player.
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([]);
    const c = await run(reader(), 'hinkley-hills');
    expect(rejections(c)).toEqual(['no-map']);
    expect(said.join('\n')).toMatch(/no map of hinkley-hills/i);
  });
});

describe('one locality', () => {
  it('names the places and how they are known', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([claim({ name: 'the hall' })]),
    ]);
    await run(reader(), 'test/mapville');
    expect(said.join('\n')).toMatch(/the hall \(seen\)/);
  });

  it('⚠⚠ one edge known TWO WAYS renders ONCE — channel is not disagreement', async () => {
    /*
     * The live regression that splitting `perception` into `walked` and
     * `seen` exposed. The channel is part of the growth key, so one
     * edge legitimately stores two claims — and the renderer keyed
     * `distinct` on `to|toLabel`, where `to` is populated only if the
     * far room was resident. Straddle an eviction and the map printed
     * `north → crossing` TWICE, both "recorded just now".
     *
     * ⭐ Same `to`-is-a-residency-artifact defect as `growMap`'s key,
     * fixed there and missed here. A disagreement is a different FAR
     * SIDE, never a different channel.
     */
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall' }),
        claim({
          kind: 'edge',
          dir: 'north',
          channel: 'seen',
          to: null,
          toLabel: '/test/map/zone/crossing',
        }),
        claim({
          kind: 'edge',
          dir: 'north',
          channel: 'walked',
          to: '/test/map/zone/crossing',
          toLabel: '/test/map/zone/crossing',
          lastSeen: 300,
        }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    const lines = said.join('\n').split('\n').filter((l) => l.includes('north'));
    expect(lines).toHaveLength(1);
  });

  it('⭐ but a differing FAR SIDE still appends its own line', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall' }),
        claim({
          kind: 'edge',
          dir: 'east',
          toLabel: '/test/map/zone/yard',
        }),
        claim({
          kind: 'edge',
          dir: 'east',
          toLabel: '/test/map/zone/cellar',
          lastSeen: 400,
        }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    const lines = said.join('\n').split('\n').filter((l) => l.includes('east'));
    expect(lines).toHaveLength(2);
  });

  it('⭐⭐ WALKED and SEEN are different claims, and both render', async () => {
    // Previously unrepresentable: one `perception` channel covered
    // both, and the renderer printed "walked" either way — so a place
    // you had only glimpsed from a doorway read as one you had been
    // inside. Two claims, two words, joined.
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall', channel: 'walked' }),
        claim({ name: 'the hall', channel: 'seen', lastSeen: 200 }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    expect(said.join('\n')).toMatch(/the hall \(seen, walked\)/);
  });

  it('⭐ a PUBLISHED place reads differently from a walked one', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall' }),
        claim({
          place: '/test/map/far',
          name: 'somewhere far',
          channel: 'published',
        }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    const text = said.join('\n');
    // ⭐ The channels ARE the words. This asserted `(walked)` for a
    // claim whose channel was `perception` — the renderer translated
    // it — and `(publication)` for the other, so the two halves of one
    // render disagreed about whether channels were display strings.
    expect(text).toMatch(/the hall \(seen\)/);
    expect(text).toMatch(/somewhere far \(published\)/);
  });

  it('⭐ groups by the address the CONTENT declares', async () => {
    // Duncan Hall's rooms read as Duncan Hall rather than as four
    // unrelated places — grouped by what the content already says.
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'lobby', group: 'terminus/campus/duncan-hall' }),
        claim({
          place: '/test/map/steps',
          name: 'steps',
          group: 'terminus/campus/duncan-hall',
        }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    const text = said.join('\n');
    expect(text).toMatch(/terminus\/campus\/duncan-hall:/);
    expect(text.indexOf('duncan-hall:')).toBeLessThan(text.indexOf('lobby'));
  });

  it('⚠ an ungrouped place gets NO invented heading', async () => {
    // Inventing one would be the map asserting a building nobody
    // authored.
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([claim({ name: 'nowhere in particular' })]),
    ]);
    await run(reader(), 'test/mapville');
    const lines = said.join('\n').split('\n').filter((l) => l.trim());
    // Exactly one line ends in a colon: the document's own header.
    expect(lines.filter((l) => l.trimEnd().endsWith(':'))).toHaveLength(1);
    // And the place sits at the ungrouped indent, directly under it.
    expect(lines.some((l) => /^ {2}nowhere in particular/.test(l))).toBe(true);
  });

  it('shows the ways out it knows', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall' }),
        claim({ kind: 'edge', dir: 'east', toLabel: '/test/map/yard' }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    expect(said.join('\n')).toMatch(/east → yard/);
  });
});

describe('⭐⭐ the disagreement renders — nothing picks a winner', () => {
  it('two claims for one direction BOTH render, with their dates', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall', lastSeen: 900 }),
        claim({ kind: 'edge', dir: 'east', toLabel: '/test/map/yard' }),
        claim({
          kind: 'edge',
          dir: 'east',
          toLabel: '/test/map/cellar',
          firstSeen: 900,
          lastSeen: 900,
        }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    const text = said.join('\n');
    expect(text).toMatch(/east → yard .*recorded/);
    expect(text).toMatch(/east → cellar .*recorded/);
  });

  it('⭐⭐ a VANISHED exit is marked stale against the latest LOOK', async () => {
    // The common case, and the one that records nothing: the player saw
    // no east exit, so there is no second claim. The place's own
    // observation time is what makes the absence legible.
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall', lastSeen: 9000 }),
        claim({ kind: 'edge', dir: 'east', toLabel: '/test/map/yard' }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    expect(said.join('\n')).toMatch(/not seen when you last looked/);
  });

  it('an edge seen on the latest look is NOT marked stale', async () => {
    vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([
      docOf([
        claim({ name: 'the hall', lastSeen: 100 }),
        claim({ kind: 'edge', dir: 'east', toLabel: '/test/map/yard' }),
      ]),
    ]);
    await run(reader(), 'test/mapville');
    expect(said.join('\n')).not.toMatch(/not seen when you last looked/);
  });
});

describe('⭐⭐ AC14 — the read is structurally the actor\'s own', () => {
  it('asks only for its own viewer key', async () => {
    const spy = vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([]);
    await run(reader(), 'test/mapville');
    expect(spy).toHaveBeenCalledWith(VIEWER_ID, 'test/mapville');
  });

  it('a body with no identity has no map', async () => {
    const spy = vi.spyOn(NavigationApi, 'readMap').mockResolvedValue([]);
    const anon = makeStuffAtPath(() => new Reader(), VIEWER_ROW);
    vi.spyOn(anon, 'getIdentityPath').mockReturnValue(null);
    const c = await run(anon as unknown as Stuff);
    expect(rejections(c)).toEqual(['no-identity']);
    expect(spy).not.toHaveBeenCalled();
  });
});
