/**
 * ⭐⭐ The navigation card's wire drive (requirements:
 * `docs/requirements/navigation-requirements.md` § The drive; plan:
 * `docs/plans/navigation-plan.md` § Test & gate strategy).
 *
 * It asserts what the client RECEIVED — the knowledge the card draws from —
 * before any pixel is drawn: a `NavClient` holds your map's copy and the
 * where-you-are sections exactly as the client does. The browser walk
 * (`e2e/tests/navigation-walk.spec.ts`) asserts what a person sees.
 *
 * Steps keep the requirements' numbering. Paces: every step `instant`
 * except 20 (a restart, `short`). No soak drive.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  NavClient,
  declareFile,
  uniqueHandle,
  expectOk,
  isOwnedTestWorld,
  restartWorld,
} from '../src/harness';
import type { WireClaim } from '@saxonberg/types';

export const DIRTY_REASON =
  'mints fresh characters whose maps it writes, clones each a lantern, ' +
  'walks them through the Sunken Delve, writes their navigation card ' +
  'memory, and restarts the world';

declareFile({
  file: 'navigation.dirty.wire.test.ts',
  packs: [
    'world-seed',
    'terminus',
    'eternal-university',
    'newbie-wilds',
    'residence',
    'transport',
    'water',
    'generic-objects',
    'base-library',
    'ground',
  ],
  dirtyReason: DIRTY_REASON,
});

const TREELINE = '/world/newbie-wilds/crossroads/treeline';
const DELVE_ZONE = '/world/newbie-wilds/delve';
const VESTIBULE = '/world/newbie-wilds/delve/vestibule';
const CORRIDOR_1 = '/world/newbie-wilds/delve/corridor-1';
const CORRIDOR_2 = '/world/newbie-wilds/delve/corridor-2';
const PIT = '/world/newbie-wilds/delve/pit-below';
const LANTERN_ROW = '/world/terminus/general-store/thing/lantern';
const DELVE_DOC = 'last-counted-mile/delve';

const record: string[] = [];
const open: Session[] = [];
const navs: NavClient[] = [];
afterAll(() => {
  for (const s of open) s.close();
  // eslint-disable-next-line no-console
  console.log(`\n[navigation drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

/** Let the where-you-are flush land: a beat, then quiet. */
const beat = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 300));
  for (const n of navs) await n.settle();
};

async function session(
  handle: string,
  start: string,
  opts: { lamp?: boolean } = {},
): Promise<{ s: Session; nav: NavClient }> {
  const s = await Session.open(handle, {
    startLocation: start,
    // A seat over the wilds, only to clone a lantern there (a staged prop;
    // every assertion below is about what the player's own acts wrote).
    ...(opts.lamp ? { committees: ['/world/newbie-wilds'] } : {}),
  });
  open.push(s);
  await s.drainProse();
  if (opts.lamp) {
    expectOk(await s.cmd(`clone ${LANTERN_ROW}`));
    expectOk(await s.cmd('light me:i:lantern'));
    await s.drainProse();
  }
  const nav = await NavClient.attach(s);
  navs.push(nav);
  return { s, nav };
}

const placeClaims = (nav: NavClient, path: string): WireClaim[] =>
  nav.claims((c) => c.kind === 'place' && typeof c.place !== 'string' && c.place.path === path);

const filedUnder = (nav: NavClient, path: string): string[] =>
  [...nav.copy.values()]
    .filter((e) => e.claim.kind === 'place' && typeof e.claim.place !== 'string' && e.claim.place.path === path)
    .map((e) => e.locality);

suite('navigation card — the wire drive', () => {
  let walker: { s: Session; nav: NavClient };
  const walkerHandle = uniqueHandle('navc-walker');

  it('1 · into the Delve with a lamp: each place is filed under the Last Counted Mile, with its zone, cell and level', async () => {
    walker = await session(walkerHandle, TREELINE, { lamp: true });
    expectOk(await walker.s.cmd('north'));
    await beat();
    await expect
      .poll(() => placeClaims(walker.nav, VESTIBULE).some((c) => c.channel === 'walked'), { timeout: 15_000 })
      .toBe(true);
    const v = placeClaims(walker.nav, VESTIBULE);
    const at = v.find((c) => c.at?.x !== undefined)?.at;
    record.push(`1: vestibule ${JSON.stringify(v.map((c) => [c.channel, c.at]))} filed under ${filedUnder(walker.nav, VESTIBULE)}`);
    expect(filedUnder(walker.nav, VESTIBULE)).toContain(DELVE_DOC);
    expect(at?.zone?.path).toBe(DELVE_ZONE);
    expect(at).toMatchObject({ x: 0, y: 0, level: 0 });
    expect(walker.nav.section('zone')?.id?.path).toBe(DELVE_ZONE);
  }, 180_000);

  it('2 · `look` in the lit vestibule: the ways out are openings — no far room is written', async () => {
    expectOk(await walker.s.cmd('look'));
    await beat();
    const edges = walker.nav.claims(
      (c) => c.kind === 'edge' && typeof c.place !== 'string' && c.place.path === VESTIBULE,
    );
    record.push(`2: vestibule edges ${edges.map((e) => `${e.dir}:${e.channel}:${e.to ? 'to' : 'open'}`).join(', ')}`);
    expect(edges.some((e) => e.dir === 'north')).toBe(true);
    expect(placeClaims(walker.nav, CORRIDOR_1)).toHaveLength(0);
  }, 120_000);

  it('5 · search corridor-2, take the hidden way down: the copy holds two levels', async () => {
    expectOk(await walker.s.cmd('north'));
    expectOk(await walker.s.cmd('north'));
    await beat();
    expectOk(await walker.s.cmd('search'));
    await beat();
    const down = walker.nav.claims(
      (c) => c.kind === 'edge' && typeof c.place !== 'string' && c.place.path === CORRIDOR_2 && c.dir === 'down',
    );
    record.push(`5: corridor-2 down ${JSON.stringify(down.map((c) => c.channel))}`);
    expect(down.some((c) => c.channel === 'searched')).toBe(true);
    expectOk(await walker.s.cmd('down'));
    await beat();
    await expect
      .poll(() => placeClaims(walker.nav, PIT).some((c) => c.channel === 'walked'), { timeout: 15_000 })
      .toBe(true);
    const levels = new Set(
      walker.nav
        .claims((c) => c.kind === 'place' && c.at?.zone?.path === DELVE_ZONE)
        .map((c) => c.at?.level),
    );
    record.push(`5: levels ${JSON.stringify([...levels])}`);
    expect(levels).toEqual(new Set([0, -1]));
    expectOk(await walker.s.cmd('up'));
  }, 180_000);

  it('7 · a hidden way found by searching: its first record is `searched`', async () => {
    expectOk(await walker.s.cmd('south'));
    await beat();
    expectOk(await walker.s.cmd('search'));
    await beat();
    const ne = walker.nav.claims(
      (c) => c.kind === 'edge' && typeof c.place !== 'string' && c.place.path === CORRIDOR_1 && c.dir === 'northeast',
    );
    record.push(`7: corridor-1 northeast ${JSON.stringify(ne.map((c) => [c.channel, c.firstSeen]))}`);
    expect(ne.length).toBeGreaterThan(0);
    const first = [...ne].sort((a, b) => a.firstSeen - b.firstSeen)[0]!;
    expect(first.channel).toBe('searched');
  }, 120_000);

  it('17 · two players, two maps: a second character holds none of the Delve', async () => {
    const other = await session(uniqueHandle('navc-other'), TREELINE);
    await beat();
    expect(placeClaims(other.nav, VESTIBULE)).toHaveLength(0);
    expect(placeClaims(other.nav, CORRIDOR_1)).toHaveLength(0);
  }, 120_000);

  it('19 · the card remembers: `nav.card` is accepted and comes back to a second session', async () => {
    const value = { sections: { horizon: 'closed', you: 'open' }, lenses: ['frontier', 'boundaries'] };
    walker.s.writeClientState('nav.card', value);
    await new Promise((r) => setTimeout(r, 800));
    const second = await Session.open(walkerHandle, { startLocation: TREELINE });
    open.push(second);
    const frames = JSON.stringify(second.allFrames().map((f) => f.payload));
    const seen = frames.includes('"nav.card"') && frames.includes('"boundaries"');
    record.push(`19: nav.card on a second session's connect: ${seen}`);
    expect(seen).toBe(true);
  }, 120_000);

  it('20 · restart: the copy and the card come back the same — nothing lost, nothing doubled', async () => {
    if (!isOwnedTestWorld()) return;
    await beat();
    const before = [...walker.nav.copy.keys()].sort();
    await restartWorld();
    const back = await session(walkerHandle, TREELINE);
    const after = [...back.nav.copy.keys()].sort();
    record.push(`20: copy before ${before.length}, after ${after.length}`);
    for (const k of before) expect(after).toContain(k);
    expect(new Set(after).size).toBe(after.length);
  }, 600_000);
});
