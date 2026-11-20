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
  plain,
  isOwnedTestWorld,
  restartWorld,
} from '../src/harness';
import type { CommandResult } from '../src/harness';
import type { WireClaim } from '@saxonberg/types';

export const DIRTY_REASON =
  'mints fresh characters whose maps it writes, clones each a torch, ' +
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
const BANK = '/world/terminus/wharfside/bank';
const DELVE_ZONE = '/world/newbie-wilds/delve';
const VESTIBULE = '/world/newbie-wilds/delve/vestibule';
const CORRIDOR_1 = '/world/newbie-wilds/delve/corridor-1';
const PIT = '/world/newbie-wilds/delve/pit-below';
const TORCH_ROW = '/world/terminus/general-store/thing/torch';
/**
 * The Delve's address is `last-counted-mile/delve`; a claim files in the
 * covering LOCALITY's document, and the nearest Locality is the Mile.
 */
const DELVE_DOC = 'last-counted-mile';

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
    // A seat over Terminus, only to clone its general store's torch (the
    // clone gate is the ROW's title; a torch carries its own fuel, a
    // lantern clones empty) — a staged prop — and over the wilds, only to
    // stage a walker into a pit whose trap has already sprung. Every
    // assertion below is about what the player's own acts wrote.
    ...(opts.lamp ? { committees: ['/world/terminus', '/world/newbie-wilds'] } : {}),
  });
  open.push(s);
  await s.drainProse();
  if (opts.lamp) {
    expectOk(await s.cmd(`clone ${TORCH_ROW}`));
    expectOk(await s.cmd('light me:i:torch'));
    await s.drainProse();
  }
  const nav = await NavClient.attach(s);
  navs.push(nav);
  return { s, nav };
}

/** Run a command, record what it said, and return the result. */
async function run(who: { s: Session }, line: string, tag: string): Promise<CommandResult> {
  const r = await who.s.cmd(line);
  const said = plain(await r.said()).replace(/\s+/g, ' ').trim();
  record.push(`${tag}: \`${line}\` → ${r.status}: ${said.slice(0, 220)}`);
  return r;
}

/**
 * Take a way the way the ways section says works: its `take.works.command`
 * when going plainly would refuse, the verb it `needs` (a climb), else the
 * bare direction.
 */
async function take(who: { s: Session; nav: NavClient }, dir: string, tag: string): Promise<CommandResult> {
  const way = who.nav.section('ways')?.ways.find((w) => w.direction === dir);
  record.push(`${tag}: way ${dir} ${JSON.stringify(way)}`);
  const works = way?.take && !way.take.ok ? way.take.works : undefined;
  const line = works?.command ?? (way?.needs ? `${way.needs} ${dir}` : dir);
  return run(who, line, tag);
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

  /**
   * ⚠ The content's own way down: corridor-2's spike pit springs under a
   * walker and drops them into the pit below. Once it has sprung (a kept
   * world), the hidden `down` is searched for and taken instead.
   */
  it('5 · into corridor-2 and down to the pit: the copy holds two levels', async () => {
    expectOk(await run(walker, 'north', '5'));
    expectOk(await run(walker, 'north', '5'));
    await beat();
    if (walker.nav.section('place')?.at?.z !== -1) {
      // The pit has already sprung (a kept world). Search finds the way
      // down; with no rope tied at the lip there is nothing to climb by, so
      // the verdict says *you'll have to climb* and offers NO command (D18:
      // `works` only when trying it would get you through). Then stage the
      // walker into the pit.
      expectOk(await run(walker, 'search', '5'));
      await expect.poll(async () => {
        await beat();
        return walker.nav.section('ways')?.ways.some((w) => w.direction === 'down') ?? false;
      }, { timeout: 60_000, interval: 1_000 }).toBe(true);
      const down = walker.nav.section('ways')!.ways.find((w) => w.direction === 'down')!;
      record.push(`5: way down ${JSON.stringify(down.take)}`);
      expect(down.take?.ok).toBe(false);
      expect(down.take && !down.take.ok ? down.take.reason : '').toMatch(/climb/);
      expect(down.take && !down.take.ok ? down.take.works : undefined).toBeUndefined();
      expectOk(await run(walker, `goto ${PIT}`, '5'));
      await beat();
    }
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
    expect(walker.nav.section('place')?.at?.z).toBe(-1);
  }, 180_000);

  it('7 · back up; a hidden way found by searching corridor-1: its first record is `searched`', async () => {
    expectOk(await take(walker, 'up', '7'));
    await beat();
    expectOk(await run(walker, 'south', '7'));
    await beat();
    expectOk(await run(walker, 'search', '7'));
    const ne = (): WireClaim[] =>
      walker.nav.claims(
        (c) => c.kind === 'edge' && typeof c.place !== 'string' && c.place.path === CORRIDOR_1 && c.dir === 'northeast',
      );
    // A search takes the hands for a while; what it finds lands when it ends.
    await expect.poll(async () => {
      await beat();
      return ne().length > 0;
    }, { timeout: 60_000, interval: 1_000 }).toBe(true);
    record.push(`7: corridor-1 northeast ${JSON.stringify(ne().map((c) => [c.channel, c.firstSeen]))}`);
    const first = [...ne()].sort((a, b) => a.firstSeen - b.firstSeen)[0]!;
    expect(first.channel).toBe('searched');
  }, 180_000);

  it('11 · the bank\'s locked door is listed by its own name; its menu offers what a door does', async () => {
    const banker = await session(uniqueHandle('navc-bank'), BANK);
    await beat();
    const way = banker.nav.section('ways')?.ways.find((w) => w.direction === 'pumphouse');
    record.push(`11: pumphouse ${JSON.stringify({ state: way?.state, boundary: way?.boundary, take: way?.take })}`);
    expect(way?.state).toBe('locked');
    expect(way?.boundary?.stuffId).toBeTruthy();
    const menu = await banker.s.affordances(way!.boundary!.stuffId);
    const verbs = menu.verbs.map((v) => `${v.verb}:${v.state}`);
    record.push(`11: the door's menu ${verbs.join(', ')}`);
    expect(menu.verbs.map((v) => v.verb)).toEqual(expect.arrayContaining(['unlock', 'open']));
  }, 120_000);

  it('16, 24 · a first visit writes the Locality claims — Terminus, then Terminus City; a second character holds none', async () => {
    const visitor = await session(uniqueHandle('navc-visit'), BANK);
    expectOk(await run(visitor, 'look', '16'));
    await beat();
    const localities = (nav: NavClient): WireClaim[] => nav.claims((c) => c.kind === 'locality');
    await expect.poll(() => localities(visitor.nav).length, { timeout: 15_000 }).toBeGreaterThan(0);
    const named = Object.fromEntries(localities(visitor.nav).map((c) => [String(c.place), c.name]));
    record.push(`16: locality claims ${JSON.stringify(named)}`);
    expect(named['terminus']).toBe('Terminus');
    expect(named['terminus/city']).toBe('Terminus City');
    // The chain the section sends is the order the crumbs take.
    const chain = visitor.nav.section('localities')?.chain.map((c) => c.address) ?? [];
    expect(chain.slice(0, 2)).toEqual(['terminus', 'terminus/city']);
    const stranger = await session(uniqueHandle('navc-stranger'), TREELINE);
    await beat();
    expect(localities(stranger.nav).some((c) => String(c.place).startsWith('terminus'))).toBe(false);

    // 24 · the crumb's civic facts (W8): seats and holders, resident or
    // visitor, the sky — for a Locality your map holds, and for no other.
    const facts = (await visitor.s.localityFacts('terminus/city')).facts;
    record.push(`24: Terminus City's facts ${JSON.stringify(facts)}`);
    expect(facts).not.toBeNull();
    expect(facts!.government?.name).toBeTruthy();
    expect(facts!.seats.length).toBeGreaterThan(0);
    expect(facts!.resident).toBe(false);
    expect(facts!.seats.every((s) => s.holder === null || !s.holder.startsWith('/'))).toBe(true);
    expect((await stranger.s.localityFacts('terminus/city')).facts).toBeNull();
    expect((await visitor.s.localityFacts('narnia')).facts).toBeNull();
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
    // The client-state snapshot rides `connection-established`.
    const state = second.connectionClientState();
    record.push(`19: nav.card on a second session's connect: ${JSON.stringify(state?.['nav.card'])}`);
    expect(state?.['nav.card']).toEqual(value);
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
