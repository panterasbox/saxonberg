/**
 * Planning on a player's own map — and the proof that it cannot
 * consult the index.
 *
 * ⭐⭐⭐ **This file is the evidence firewall's acceptance test.** The
 * per-player map is a *claim set*: append-only, never corrected,
 * possibly stale, possibly self-contradictory. *Rot is the feature.*
 * A map planner that could reach `location_graph` would eventually
 * consult it — not maliciously, but because it was convenient once,
 * in one branch — and a player would silently be handed the shape of
 * places they had not earned.
 *
 * So the test is not *does it behave*; it is **can it even reach**.
 * Every case below runs with the registry NOT STANDING and its
 * prototype spied, so a single read would both throw the spy's count
 * off and have nothing to read from.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { NavigationApi } from '../../../../api/navigation';
import { DocumentApi } from '../../../../api/document';
import LocationGraphRegistry from '../../LocationGraphRegistry';
import type { MapClaim } from '../../../../lib/location/MapClaim';
import { seedKernelContentStore } from '../../../../lib/security/__tests__/test-setup';

const VIEWER = '/platform/agent/Avatar/p1';
// ⚠ Synthetic paths under `/test/**`: a KERNEL test proves the kernel
// over synthetic fixtures, and `lint:test-content` holds that line
// (it caught the first draft of this file, which named Terminus's
// market square). A test of real content lives beside the content.
const LOCALITY = '/test/town';
const A = '/test/town/market/square';
const B = '/test/town/market/bakery';
const C = '/test/town/wharf/bank';

const ON_FOOT = { mode: 'walk', medium: 'ground' };
const PLENTY = 200;

/** A `place` claim. */
function place(handle: string, channel: MapClaim['channel'] = 'walked'): MapClaim {
  return {
    kind: 'place',
    place: handle,
    channel,
    firstSeen: 100,
    lastSeen: 100,
    recordedBy: VIEWER,
  } as MapClaim;
}

/** An `edge` claim. `toLabel` is the far side's authored row path. */
function edge(
  from: string,
  dir: string,
  toLabel: string,
  opts: Partial<MapClaim> = {},
): MapClaim {
  return {
    kind: 'edge',
    place: from,
    dir,
    to: null,
    toLabel,
    channel: 'walked',
    firstSeen: 100,
    lastSeen: 100,
    recordedBy: VIEWER,
    ...opts,
  } as MapClaim;
}

/** Install one viewer's map, and nothing else. */
function withMap(claims: readonly MapClaim[]): void {
  vi.spyOn(DocumentApi, 'readMaps').mockResolvedValue([
    { path: `/home/p1/map/town`, data: { locality: LOCALITY, claims } },
  ]);
}

let registrySpy: { toHaveBeenCalled?: unknown } | null = null;

beforeEach(() => {
  StuffApi.clearAll();
  seedKernelContentStore([]);
  // ⛔ The registry is NOT stood up. If the map path reached for it,
  // the honest best case is a `graph-cold`-shaped answer; this spy
  // catches the dishonest case where somebody later stands one up in
  // a shared fixture and the reads start quietly succeeding.
  registrySpy = vi.spyOn(
    LocationGraphRegistry.prototype,
    'graphView',
  ) as unknown as { toHaveBeenCalled?: unknown };
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The one assertion every case in this file shares. */
function expectNoIndexRead(): void {
  expect(registrySpy!).not.toHaveBeenCalled();
  expect(NavigationApi.isGraphWarm()).toBe(false);
}

describe('⭐⭐⭐ the firewall: a map plan cannot reach the index', () => {
  it('plans from claims alone, with no registry standing at all', async () => {
    withMap([place(A), place(B), edge(A, 'north', B)]);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      B,
      ON_FOOT,
      PLENTY,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.plans[0]!.source).toBe('map');
    expect(out.plans[0]!.legs.map((l) => l.dir)).toEqual(['north']);
    expectNoIndexRead();
  });

  it('⭐ refuses a place the claims never name, and does NOT look it up', async () => {
    // The whole point: the realm HAS a bank. This player has not been
    // to it, so the honest answer is *you do not know the way*, and
    // the engine must not be able to improve on that.
    withMap([place(A), place(B), edge(A, 'north', B)]);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      C,
      ON_FOOT,
      PLENTY,
    );
    expect(out.ok === false && out.reason).toBe('unknown-destination');
    expectNoIndexRead();
  });

  it('builds every assumption from the planner\'s OWN evidence', async () => {
    withMap([
      place(A),
      place(B),
      edge(A, 'north', B, { channel: 'seen', lastSeen: 42 }),
    ]);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      B,
      ON_FOOT,
      PLENTY,
    );
    if (!out.ok) throw new Error('expected a plan');
    const stale = out.plans[0]!.assumptions.find((a) => a.kind === 'stale')!;
    // The channel and the timestamp are the player's own claim, which
    // is the only thing an assumption may be made of.
    expect(stale.claim).toEqual({ channel: 'seen', lastSeen: 42 });
    expect(stale.text).toMatch(/seen/);
    expectNoIndexRead();
  });
});

describe('⭐⭐ a fuller map plans differently — the same question, two players', () => {
  const sparse = [place(A), place(C), edge(A, 'southwest', C)];
  const fuller = [
    place(A),
    place(B),
    place(C),
    edge(A, 'north', B),
    edge(B, 'west', C),
    edge(A, 'southwest', C),
  ];

  it('answers the one way a thin map knows', async () => {
    withMap(sparse);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      C,
      ON_FOOT,
      PLENTY,
    );
    if (!out.ok) throw new Error('expected a plan');
    expect(out.plans[0]!.nodes).toEqual([A, C]);
    expectNoIndexRead();
  });

  it('⭐ and knows the short one when the map knows both', async () => {
    withMap(fuller);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      C,
      ON_FOOT,
      PLENTY,
    );
    if (!out.ok) throw new Error('expected a plan');
    // Fewest legs wins on the legs axis; both players reach C, and the
    // difference between them is what they have WALKED.
    expect(out.plans.some((p) => p.nodes.length === 2)).toBe(true);
    expectNoIndexRead();
  });
});

describe('a map costs in LEGS, because a free walk taught no duration', () => {
  it('⚠ every leg is unmeasured, and the plan says so', async () => {
    // ⭐⭐ Ordinary movement is instantaneous and free by deliberate
    // design, so a walker who crossed in zero game time did not learn
    // how long the way takes. A claim therefore records no `minutes`,
    // and a map plan that quoted one would be inventing it.
    withMap([place(A), place(B), place(C), edge(A, 'north', B), edge(B, 'west', C)]);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      C,
      ON_FOOT,
      PLENTY,
    );
    if (!out.ok) throw new Error('expected a plan');
    const plan = out.plans[0]!;
    expect(plan.cost.legs).toBe(2);
    expect(plan.cost.minutes).toBe(0);
    expect(plan.cost.unmeasured).toBe(2);
    expect(plan.legs.every((l) => l.minutes === null)).toBe(true);
    expectNoIndexRead();
  });
});

describe('⚠⚠ a map that disagrees with itself routes over what it believes', () => {
  it('admits BOTH edges and NAMES the disagreement', async () => {
    // Claims append and nothing is corrected — that is the map's
    // contract. Resolving the contradiction here would be the reader
    // overriding the writer, so the plan carries it as an assumption
    // and the player decides.
    withMap([
      place(A),
      place(B),
      place(C),
      edge(A, 'north', B, { lastSeen: 10 }),
      edge(A, 'north', C, { lastSeen: 900 }),
    ]);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      B,
      ON_FOOT,
      PLENTY,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const disputed = out.plans[0]!.assumptions.find(
      (a) => a.kind === 'disputed',
    );
    expect(disputed).toBeDefined();
    expect(disputed!.text).toMatch(/2 different places/);
    expectNoIndexRead();
  });
});

describe('⭐ the handle/label join is a string match inside one document', () => {
  it('reaches a place named only as another claim\'s `toLabel`', async () => {
    // A singleton place's durable handle IS its row path, and an edge
    // claim's `toLabel` is the far side's row path read off the exit
    // the walker was standing at. So they are equal whenever the far
    // place is a template node — and matching them consults nothing.
    withMap([place(A), edge(A, 'north', B)]);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      A,
      B,
      ON_FOOT,
      PLENTY,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.plans[0]!.nodes).toEqual([A, B]);
    expectNoIndexRead();
  });
});

describe('the budget is spent on a map too', () => {
  it('answers `budget` rather than pretending there is no way', async () => {
    const claims: MapClaim[] = [place(`${LOCALITY}/n0`)];
    for (let i = 0; i < 10; i++) {
      claims.push(place(`${LOCALITY}/n${i + 1}`));
      claims.push(edge(`${LOCALITY}/n${i}`, 'north', `${LOCALITY}/n${i + 1}`));
    }
    withMap(claims);
    const out = await NavigationApi.routeOnMap(
      VIEWER,
      LOCALITY,
      `${LOCALITY}/n0`,
      `${LOCALITY}/n10`,
      ON_FOOT,
      2,
    );
    expect(out.ok === false && out.reason).toBe('budget');
    expectNoIndexRead();
  });
});
