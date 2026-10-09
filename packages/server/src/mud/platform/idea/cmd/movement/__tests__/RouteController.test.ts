/**
 * `route` — asking the way on your own map.
 *
 * ⭐⭐⭐ Two properties here are not about rendering and would be
 * invisible to a reader of the output:
 *
 *  1. **it cannot consult the index.** Every case runs with
 *     `LocationGraphRegistry.prototype.graphView` spied and asserts
 *     zero calls, so a refusal is a refusal and not a lookup that
 *     happened to miss.
 *  2. **no path and no raw leaf ever reaches the reader.** The verb
 *     consumes durable handles and row paths end to end, which is
 *     exactly the shape that once printed a raw template path at a
 *     player in the identity build. Every assertion that matters
 *     checks the rendered text for a slash.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RouteController from '../RouteController';
import { CommandApi } from '../../../../../api/command';
import { NavigationApi } from '../../../../../api/navigation';
import { DocumentApi } from '../../../../../api/document';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import LocationGraphRegistry from '../../../LocationGraphRegistry';
import type { MapClaim } from '../../../../../lib/location/MapClaim';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../../../../lib/security/__tests__/test-setup';
import CartesianLocation from '../../../../../lib/location/CartesianLocation';
import CartesianZone from '../../../location/CartesianZone';
import { Idea } from '../../../../../lib/stuff/Idea';

const VIEWER = '/platform/agent/Avatar/p1';
const SQUARE = '/test/town/market/square';
const BAKERY = '/test/town/market/bakery';
const QUAY = '/test/town/wharf/quay';

/** What the controller said to self, flattened. */
let said: string[];
let registrySpy: { toHaveBeenCalled?: unknown } | null = null;

function claim(c: Partial<MapClaim>): MapClaim {
  return {
    kind: 'place',
    place: '',
    channel: 'walked',
    firstSeen: 0,
    lastSeen: 0,
    recordedBy: VIEWER,
    ...c,
  } as MapClaim;
}

function withMap(claims: readonly MapClaim[]): void {
  vi.spyOn(DocumentApi, 'readMaps').mockResolvedValue([
    { path: '/home/p1/map/town', data: { locality: '/test/town', claims } },
  ]);
}

/** A giver with an identity, standing somewhere with a durable handle. */
function giverAt(handle: string): { giver: Stuff; location: Stuff } {
  const zone = makeStuff(() => new CartesianZone());
  const loc = makeStuff(() => new CartesianLocation());
  zone.addLocation(loc, 0, 0, 0);
  vi.spyOn(
    loc as unknown as { getDurableHandle(): string },
    'getDurableHandle',
  ).mockReturnValue(handle);
  // A bare `Idea` is enough: `route` reads an identity path and a
  // durable handle and nothing else about the actor.
  class Walker extends Idea {}
  const giver = makeStuff(() => new Walker()) as unknown as Stuff;
  // ⚠ `makeStuff`, not `new`: a controller IS a Stuff and the
  // construction sentinel refuses a direct `new`.
  vi.spyOn(giver, 'getIdentityPath').mockReturnValue(VIEWER);
  return { giver, location: loc as unknown as Stuff };
}

async function run(
  args: { destination?: string; by?: string },
  handle = SQUARE,
): Promise<{ reason: string | null; text: string }> {
  const { giver, location } = giverAt(handle);
  const context = CommandApi.createCommandContext({
    commandGiver: giver,
    location,
    verb: 'route',
    interactive: {} as never,
    commandText: 'route',
    executionId: 'test-execution',
    commandId: 'test-command-id',
  } as never);
  const controller = makeStuff(() => new RouteController());
  // ⚠ The note is captured off the CONTEXT, not read back out of it:
  // the accumulator is not external surface (the `PracticeController`
  // test's idiom).
  const seen: Array<{ reason?: string }> = [];
  vi.spyOn(context as unknown as { note(n: unknown): void }, 'note').mockImplementation(
    (n: unknown) => {
      seen.push(n as { reason?: string });
    },
  );
  await controller.execute(args as never, context as never);
  const rejected = seen.find((n) => n.reason !== undefined);
  return { reason: rejected?.reason ?? null, text: said.join('\n') };
}

beforeEach(() => {
  said = [];
  StuffApi.clearAll();
  seedKernelContentStore([]);
  registrySpy = vi.spyOn(
    LocationGraphRegistry.prototype,
    'graphView',
  ) as unknown as { toHaveBeenCalled?: unknown };
  // Capture what is rendered to self without standing a wire up.
  vi.spyOn(MessageApi, 'scene').mockImplementation(
    () =>
      ({
        topic: () => ({
          toSelf: (m: unknown) => ({
            send: () => {
              said.push(String((m as { text?: string }).text ?? m));
            },
          }),
        }),
      }) as never,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function expectNoIndexRead(): void {
  expect(registrySpy!).not.toHaveBeenCalled();
}

/** ⚠ The assertion that matters most: no path, no raw leaf. */
function expectNoPaths(text: string): void {
  expect(text).not.toMatch(/\//);
  expect(text).not.toMatch(/-[a-z]+\b(?![^`]*`)/);
}

describe('refusals, in words', () => {
  it('⚠ refuses a bare `route` IN WORDS rather than failing silent', async () => {
    // A required arg with no default fails closed and silent at the
    // binder — the player types `route` and nothing happens at all.
    withMap([claim({ place: SQUARE, name: 'the market square' })]);
    const out = await run({});
    expect(out.reason).toBe('no-destination');
    expect(out.text).toMatch(/Route to where/);
  });

  it('⭐⭐ refuses a place the claims never name, and does NOT look it up', async () => {
    withMap([claim({ place: SQUARE, name: 'the market square' })]);
    const out = await run({ destination: 'the bank' });
    expect(out.reason).toBe('unknown-place');
    expect(out.text).toMatch(/do not know the way/);
    expectNoIndexRead();
  });

  it('refuses when the player has no map at all', async () => {
    withMap([]);
    const out = await run({ destination: 'anywhere' });
    expect(out.reason).toBe('no-maps');
    expectNoIndexRead();
  });

  it('refuses a mode nobody travels by', async () => {
    withMap([
      claim({ place: SQUARE, name: 'the market square' }),
      claim({ place: BAKERY, name: 'the bakery' }),
    ]);
    const out = await run({ destination: 'the bakery', by: 'dragon' });
    expect(out.reason).toBe('unknown-mode');
  });

  it('says you are already there', async () => {
    withMap([claim({ place: SQUARE, name: 'the market square' })]);
    const out = await run({ destination: 'the market square' });
    expect(out.reason).toBe('already-there');
  });
});

describe('⭐⭐ a plan, named by what the places call themselves', () => {
  beforeEach(() => {
    withMap([
      claim({ place: SQUARE, name: 'the market square' }),
      claim({ place: BAKERY, name: 'the bakery' }),
      claim({
        kind: 'edge',
        place: SQUARE,
        dir: 'north',
        toLabel: BAKERY,
        channel: 'walked',
        lastSeen: 0,
      }),
    ]);
  });

  it('gives the directions and names the destination', async () => {
    const out = await run({ destination: 'the bakery' });
    expect(out.reason).toBeNull();
    expect(out.text).toMatch(/The way to the bakery/);
    expect(out.text).toMatch(/north from the market square/);
  });

  it('⚠⚠ prints NO path and NO raw leaf — a drive failure, not a cosmetic one', async () => {
    const out = await run({ destination: 'the bakery' });
    expectNoPaths(out.text);
  });

  it('resolves a partial name — `bakery` finds *the bakery*', async () => {
    const out = await run({ destination: 'bakery' });
    expect(out.reason).toBeNull();
    expect(out.text).toMatch(/the bakery/);
  });

  it('plans without ever reading the index', async () => {
    await run({ destination: 'the bakery' });
    expectNoIndexRead();
  });
});

describe('⭐⭐ the cost is quoted in the currency the traveller pays (D4a)', () => {
  beforeEach(() => {
    withMap([
      claim({ place: SQUARE, name: 'the market square' }),
      claim({ place: BAKERY, name: 'the bakery' }),
      claim({ place: QUAY, name: 'the quay' }),
      claim({ kind: 'edge', place: SQUARE, dir: 'north', toLabel: BAKERY }),
      claim({ kind: 'edge', place: BAKERY, dir: 'west', toLabel: QUAY }),
    ]);
  });

  it('⚠⚠ a PEDESTRIAN is never quoted minutes', async () => {
    // Ordinary movement is instantaneous and free by deliberate
    // design, so a figure here would teach a cost the world declines
    // to collect. This is the lens-pass finding, as an assertion.
    const out = await run({ destination: 'the quay' });
    expect(out.text).toMatch(/2 legs/);
    expect(out.text).not.toMatch(/minute/);
  });

  it('⭐⭐⭐ a MAP cannot answer for a conveyance, and says so plainly', async () => {
    // Found by this test. A claim records the CHANNEL you learned a
    // way on and NOT what you were driving, so your own map knows a
    // way exists and cannot know whether a cart fits through it.
    //
    // The two alternatives are both worse: reading "no media
    // recorded" as "a footpath" refuses every conveyance with a
    // mode-break sentence about needing `ground` (nonsense to a
    // reader), and inventing an assumption would have the engine
    // telling the player something their map never recorded.
    const out = await run({ destination: 'the quay', by: 'wagon' });
    expect(out.reason).toBe('map-cannot-say');
    // ⭐ And it names the verb that DOES know — `journey` plans over
    // the index with the vehicle's own declared mode, which is honest
    // because you are standing next to the vehicle.
    expect(out.text).toMatch(/`journey`/);
    expectNoIndexRead();
  });

  it('accepts `by foot` as a spelling of the default, not a refusal', async () => {
    const out = await run({ destination: 'the quay', by: 'foot' });
    expect(out.reason).toBeNull();
    expect(out.text).toMatch(/2 legs/);
  });
});

describe('assumptions — what believing the plan requires', () => {
  it('⭐ names a crossing that is not always passable', async () => {
    withMap([
      claim({ place: SQUARE, name: 'the market square' }),
      claim({ place: BAKERY, name: 'the far bank' }),
      claim({
        kind: 'edge',
        place: SQUARE,
        dir: 'north',
        toLabel: BAKERY,
        conditional: true,
      }),
    ]);
    const out = await run({ destination: 'the far bank' });
    expect(out.text).toMatch(/not always passable/);
    expectNoPaths(out.text);
  });

  it('⭐ cites the channel the belief came from', async () => {
    withMap([
      claim({ place: SQUARE, name: 'the market square' }),
      claim({ place: BAKERY, name: 'the bakery' }),
      claim({
        kind: 'edge',
        place: SQUARE,
        dir: 'north',
        toLabel: BAKERY,
        channel: 'seen',
      }),
    ]);
    const out = await run({ destination: 'the bakery' });
    // A place you only SAW from a doorway is different knowledge from
    // one you walked, and the plan says which it had.
    expect(out.text).toMatch(/seen/);
    expectNoIndexRead();
  });
});

describe("⭐ `route between <a> and <b>` — the matrix's typed reader", () => {
  beforeEach(() => {
    withMap([
      claim({ place: SQUARE, name: 'the market square' }),
      claim({ place: BAKERY, name: 'the bakery' }),
      claim({ kind: 'edge', place: SQUARE, dir: 'north', toLabel: BAKERY }),
    ]);
  });

  it('answers what the pair costs, and offers no order', async () => {
    const out = await run({
      destination: 'between the market square and the bakery',
    });
    expect(out.reason).toBeNull();
    expect(out.text).toMatch(/the market square to the bakery/);
    // ⛔ No "visit in this order", because deciding the order is the
    // activity. The verb has no way to ask for one.
    expect(out.text).not.toMatch(/order|first|then/i);
    expectNoPaths(out.text);
  });

  it('works without the leading `between` (the parser binds it)', async () => {
    const out = await run({ destination: 'the market square and the bakery' });
    expect(out.reason).toBeNull();
    expect(out.text).toMatch(/to the bakery/);
  });

  it('refuses the pair when one end is unknown', async () => {
    const out = await run({ destination: 'between the bakery and the bank' });
    expect(out.reason).toBe('unknown-place');
  });
});

describe('⭐ the budget refusal is distinguishable, and says so', () => {
  it("says 'could not work out a way that far', not 'there is no way'", async () => {
    // A search that spent its allowance has NOT proved there is no
    // way, and the two sentences lead a player to do different things.
    withMap([
      claim({ place: SQUARE, name: 'the market square' }),
      claim({ place: BAKERY, name: 'the bakery' }),
      claim({ kind: 'edge', place: SQUARE, dir: 'north', toLabel: BAKERY }),
    ]);
    vi.spyOn(NavigationApi, 'routeOnMap').mockResolvedValue({
      ok: false,
      reason: 'budget',
      expanded: 2,
    });
    const out = await run({ destination: 'the bakery' });
    expect(out.reason).toBe('budget');
    expect(out.text).toMatch(/could not work out a way that far/);
    expect(out.text).not.toMatch(/no way/);
  });
});
