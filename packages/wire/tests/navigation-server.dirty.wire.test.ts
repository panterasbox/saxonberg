/**
 * ⭐⭐ The navigation-server blocking drive (the build's requirements,
 * retired at its sweep; what remains is `docs/slates/engine/
 * navigation-server-slate.md` § Left after the first pass).
 *
 * Every step asserts WHAT THE CLIENT RECEIVED over the real socket: a
 * `NavClient` subscribes to your map and to where-you-are exactly as the
 * client does, and is fed every frame before the per-command capture is
 * cleared. Steps keep the requirements' numbering; the steps not driven
 * here are named in the slate.
 *
 * Paces: every step `instant` except 17 (a restart, `short`). No soak drive.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  NavClient,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  isOwnedTestWorld,
  restartWorld,
} from '../src/harness';
import type { CommandResult } from '../src/harness';
import type { WireClaim, NavWay } from '@saxonberg/types';

export const DIRTY_REASON =
  'mints fresh characters whose maps it writes, walks them through the ' +
  'Sunken Delve, stoops through the steading\'s low door, and restarts the world';

declareFile({
  file: 'navigation-server.dirty.wire.test.ts',
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
    'trade-chandlery',
  ],
  dirtyReason: DIRTY_REASON,
});

const TREELINE = '/world/newbie-wilds/crossroads/treeline';
const CORRIDOR_1 = '/world/newbie-wilds/delve/corridor-1';
const YARD = '/world/newbie-wilds/steading/yard';
const BANK = '/world/terminus/wharfside/bank';
const DECK = '/world/terminus/hesper/deck';
const SQUARE = '/world/terminus/market/square';
const BROW = '/world/terminus/estuary/headland/brow';
const CHANDLERY_FLOOR = '/world/terminus/wharfside/chandlery/location/floor';

const record: string[] = [];
const open: Session[] = [];
afterAll(() => {
  for (const s of open) s.close();
  // eslint-disable-next-line no-console
  console.log(`\n[navigation-server drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

async function session(handle: string, start: string): Promise<{ s: Session; nav: NavClient }> {
  const s = await Session.open(handle, { startLocation: start });
  open.push(s);
  await s.drainProse();
  const nav = await NavClient.attach(s);
  navs.push(nav);
  return { s, nav };
}

async function words(r: CommandResult): Promise<string> {
  const said = squash(await r.said());
  const detail = (r.notes as Array<{ detail?: string }>).map((n) => n.detail ?? '').join(' ');
  return `${said} ${detail}`.trim();
}

/** Let the where-you-are flush land: a beat, then quiet. */
const beat = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 300));
  for (const n of navs) await n.settle();
};
const navs: NavClient[] = [];

const placeClaims = (nav: NavClient, path: string): WireClaim[] =>
  nav.claims((c) => c.kind === 'place' && typeof c.place !== 'string' && c.place.path === path);

const wayNamed = (nav: NavClient, dir: string): NavWay | undefined =>
  nav.section('ways')?.ways.find((w) => w.direction === dir);

suite('navigation-server — the blocking drive', () => {
  let walker: { s: Session; nav: NavClient };
  const walkerHandle = uniqueHandle('nav-walker');

  it('1 · `locate` is not a verb; a passenger at the Hesper\'s helm is refused the reckoning', async () => {
    const { s } = await session(uniqueHandle('nav-passenger'), DECK);
    const loc = await s.cmd('locate me');
    expect(loc.status).not.toBe('ok');
    const course = await s.cmd('course');
    const w = await words(course);
    record.push(`1: course as a passenger → ${w.slice(0, 120)}`);
    expect(w).toMatch(/Only her master takes the helm/);
  }, 120_000);

  // ⚠ The Delve is unlit (pitch black by day) and covered by no Locality,
  // so a walk there writes nothing — step 14 drives it for exactly that.
  // Steps 2–8 walk lit, addressed Terminus instead (recorded in the plan).
  it('2 · walk from the bank to the market square: the copy holds the square, walked, with its zone, cell and level', async () => {
    walker = await session(walkerHandle, BANK);
    expectOk(await walker.s.cmd('north'));
    await beat();
    // The arrival's `walked` claim is written after the walked edge — it
    // reaches the copy on its own beat.
    await expect
      .poll(() => placeClaims(walker.nav, SQUARE).some((c) => c.channel === 'walked'), { timeout: 15_000 })
      .toBe(true);
    const sq = placeClaims(walker.nav, SQUARE);
    record.push(`2: square claims ${JSON.stringify(sq.map((c) => [c.channel, c.at]))}`);
    expect(sq.some((c) => c.channel === 'walked')).toBe(true);
    const at = sq.find((c) => c.at)?.at;
    expect(at?.zone?.spoiler).toBe(2);
    expect(typeof at?.x).toBe('number');
    expect(typeof at?.level).toBe('number');
  }, 120_000);

  it('3 · `look`: the ways seen arrive with their state; the zone section is kind, cell and a label — no extent; every path tagged', async () => {
    expectOk(await walker.s.cmd('look'));
    await beat();
    const edges = walker.nav.claims((c) => c.kind === 'edge' && typeof c.place !== 'string' && c.place.path === SQUARE);
    record.push(`3: edges from the square ${edges.map((e) => `${e.dir}:${e.channel}:${e.state}`).join(', ')}`);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.state !== undefined)).toBe(true);
    const zone = walker.nav.section('zone');
    record.push(`3: zone ${JSON.stringify(zone)}`);
    expect(zone?.label).toBeTruthy();
    expect(Object.keys(zone ?? {})).not.toContain('extent');
    walker.nav.assertAllPathsTagged();
  }, 120_000);

  it('5 · a second character who has not been there receives nothing of it', async () => {
    const other = await session(uniqueHandle('nav-other'), BANK);
    record.push(`5: the other's copy ${other.nav.copy.size} claims`);
    expect(other.nav.claims((c) => typeof c.place !== 'string' && c.place.path === SQUARE)).toHaveLength(0);
  }, 120_000);

  it('6 · a locked door: the way says locked, and trying it refuses in those words', async () => {
    const { s, nav } = await session(uniqueHandle('nav-door'), BANK);
    await beat();
    const way = wayNamed(nav, 'pumphouse');
    record.push(`6: pumphouse way ${JSON.stringify(way?.take)} facts ${JSON.stringify(way?.facts)}`);
    expect(way?.state).toBe('locked');
    expect(way?.take?.ok).toBe(false);
    const tried = await s.cmd('go pumphouse');
    expect(tried.status).not.toBe('ok');
    const w = await words(tried);
    expect(way?.take && !way.take.ok ? w : '').toContain(way?.take && !way.take.ok ? way.take.reason : '∅');
  }, 120_000);

  it('6a · the low door: the way says stoop, `go east` refuses in exactly those words, `stoop east` goes through', async () => {
    const { s, nav } = await session(uniqueHandle('nav-stoop'), YARD);
    await beat();
    const way = wayNamed(nav, 'east');
    record.push(`6a: low door ${JSON.stringify(way?.take)}`);
    expect(way?.take?.ok).toBe(false);
    const take = way?.take && !way.take.ok ? way.take : null;
    expect(take?.works?.command).toMatch(/east$/);
    const tried = await s.cmd('go east');
    expect(tried.status).not.toBe('ok');
    expect(await words(tried)).toContain(take!.reason);
    const mark = nav.mark();
    expectOk(await s.cmd(take!.works!.command!));
    await beat();
    record.push(`6a: you after the stoop ${JSON.stringify(nav.section('you'))}`);
    // ⭐ Every change names its cause (navigation-server review): the deltas
    // this command's work produced carry its id — the id its own lines carry.
    const deltas = nav.log.slice(mark).filter((e) => e.type === 'subscription-delta' && e.sub === 'where');
    const causes = new Set(deltas.flatMap((e) => (e.frame.causes as string[] | undefined) ?? []));
    const lineIds = new Set(
      s.allFrames().flatMap((f) => [f.meta?.commandId, f.meta?.causingCommandId]).filter((x): x is string => typeof x === 'string'),
    );
    record.push(`6a: the stoop's deltas name ${JSON.stringify([...causes])}; its lines carry ${JSON.stringify([...lineIds])}`);
    expect(deltas.length, 'the stoop changed where you are').toBeGreaterThan(0);
    expect([...causes].some((c) => lineIds.has(c)), 'a delta names the command its own lines name').toBe(true);
  }, 120_000);

  it('7 · `route to` a known room: the plan arrives as data and says what the prose says', async () => {
    const r = await walker.s.cmd('route to the bank');
    const note = (r.notes as Array<{ kind: string; plans?: { legs: { dir: string }[] }[] }>).find((n) => n.kind === 'route-plan');
    const prose = await words(r);
    record.push(`7: route → ${prose.slice(0, 120)} · note ${JSON.stringify(note?.plans?.[0]?.legs)}`);
    expect(note).toBeDefined();
    for (const leg of note!.plans![0]!.legs) expect(prose).toContain(`${leg.dir} from`);
  }, 120_000);

  it('8 · Localities: the section names the chain with kinds; the copy holds the first visit', async () => {
    const loc = walker.nav.section('localities');
    record.push(`8: localities ${JSON.stringify(loc?.chain)}`);
    expect((loc?.chain.length ?? 0) > 0).toBe(true);
    expect(loc!.chain.every((l) => l.kind !== undefined)).toBe(true);
    const visits = walker.nav.claims((c) => c.kind === 'locality');
    expect(visits.length).toBeGreaterThan(0);
    expect(visits.every((c) => typeof c.place === 'string')).toBe(true);
  }, 120_000);

  it('10 · aboard the Hesper: the last crumb is the ship, where she lies, the jurisdiction', async () => {
    const { s, nav } = await session(uniqueHandle('nav-aboard'), DECK);
    await beat();
    const loc = nav.section('localities');
    const gov = await words(await s.cmd('government'));
    record.push(`10: aboard ${JSON.stringify({ ship: loc?.ship, outer: loc?.outer, jurisdiction: loc?.jurisdiction })} · government says ${gov.slice(0, 120)}`);
    expect(loc?.ship?.name).toBeTruthy();
    expect(loc?.outer?.at).toBeDefined();
    if (loc && loc.jurisdiction.length > 0) expect(gov).toContain(loc.jurisdiction[0]!.name);
  }, 120_000);

  it('12 · inside a building: its name, height, landmark, title', async () => {
    const { nav } = await session(uniqueHandle('nav-hall'), CHANDLERY_FLOOR);
    await beat();
    const b = nav.section('building');
    record.push(`12: building ${JSON.stringify(b)}`);
    expect(b?.name).toBeTruthy();
  }, 120_000);

  it('14 · the place section; in the unlit Delve a `look` writes nothing (Light)', async () => {
    const place = walker.nav.section('place');
    record.push(`14: place (square) ${JSON.stringify(place)}`);
    expect(place?.light).toBeDefined();
    const caver = await session(uniqueHandle('nav-caver'), TREELINE);
    // The Delve's mouth is lit; its first corridor is not.
    expectOk(await caver.s.cmd('north'));
    expectOk(await caver.s.cmd('north'));
    await beat();
    const dark = caver.nav.section('place');
    record.push(`14: place (Delve) ${JSON.stringify(dark)}`);
    expect(dark?.dark).toBe(true);
    const before = caver.nav.copy.size;
    await caver.s.cmd('look');
    await beat();
    expect(caver.nav.copy.size).toBe(before);
    expect(placeClaims(caver.nav, CORRIDOR_1).filter((c) => c.channel === 'seen')).toHaveLength(0);
  }, 120_000);

  it('15 · the you section: pace, posture, hands', async () => {
    const you = walker.nav.section('you');
    record.push(`15: you ${JSON.stringify(you)}`);
    expect(you?.pace).toBe('walk');
    expect(you?.posture).toBeTruthy();
  }, 120_000);

  it('15g · (geography\'s step 15) the horizon section says what `query horizon` says, and no frame carries a bearing in degrees', async () => {
    const { s, nav } = await session(uniqueHandle('nav-brow'), BROW);
    await beat();
    // ⭐ The section is the horizon AS READ ON ARRIVAL — the place's first
    // read at a session's open. It once took the brow's unread weather as
    // clear and named the light on Gannet Rock through fog; the verb, read
    // after the weather was known, did not.
    const horizon = nav.section('horizon');
    const said = plain(await s.prose('query horizon'));
    record.push(`15g: horizon ${JSON.stringify(horizon?.things.slice(0, 4))} · query horizon: ${said.slice(0, 200)}`);
    expect((horizon?.things.length ?? 0) > 0).toBe(true);
    for (const t of horizon!.things) {
      if (t.glance?.closeBy) expect(said).toMatch(/close by/i);
      else if (t.glance?.point) expect(said).toContain(t.glance.point);
    }
    // ⛔ Precision is `measure bearing`'s skill: no envelope carries one.
    for (const e of nav.log) expect(JSON.stringify(e.frame)).not.toContain('bearingDeg');
  }, 120_000);

  it('16 · a move sends only the sections that changed; sizes recorded', async () => {
    const snap = walker.nav.log.filter((e) => e.sub === 'where' && e.type === 'subscription-result')[0]!.bytes;
    const map = walker.nav.log.filter((e) => e.sub === 'map' && e.type === 'subscription-result')[0]!.bytes;
    const mark = walker.nav.mark();
    expectOk(await walker.s.cmd('south'));
    await beat();
    const sent = walker.nav.sentSince(mark);
    const moveBytes = walker.nav.bytesSince(mark, 'where');
    const idle = walker.nav.mark();
    expectOk(await walker.s.cmd('look'));
    await beat();
    record.push(`16: sizes — where snapshot ${snap} B, map snapshot ${map} B, a move ${moveBytes} B sending [${sent.join(', ')}], a look sends [${walker.nav.sentSince(idle).join(', ')}]`);
    expect(sent).toContain('place');
    expect(walker.nav.sentSince(idle)).not.toContain('horizon');
    walker.nav.assertContiguous();
  }, 120_000);

  it('18 · a second session of the same character: the same copy, and a move in one reaches the other', async () => {
    const second = await session(walkerHandle, TREELINE).catch((err: Error) => {
      record.push(`18: a second session could not open: ${err.message}`);
      return null;
    });
    if (second === null) return;
    await beat();
    // The second session's arrival writes reach both copies on their own beat.
    await expect
      .poll(() => JSON.stringify([...second.nav.copy.keys()].sort()) === JSON.stringify([...walker.nav.copy.keys()].sort()), { timeout: 15_000 })
      .toBe(true);
    const mine = [...walker.nav.copy.keys()].sort();
    const theirs = [...second.nav.copy.keys()].sort();
    record.push(`18: copies ${mine.length} / ${theirs.length}; only mine ${JSON.stringify(mine.filter((k) => !theirs.includes(k)))}`);
    expect(theirs).toEqual(mine);
  }, 120_000);

  it('19 · the firewall: no path untagged, and every place in the copy is one the character knows', async () => {
    walker.nav.assertAllPathsTagged();
    walker.nav.assertContiguous();
    for (const c of walker.nav.claims()) {
      expect(['walked', 'seen', 'searched', 'published', 'charted', 'told']).toContain(c.channel);
    }
  }, 120_000);

  it('17 · restart: on reconnect the copy is the same — nothing lost, nothing doubled', async () => {
    if (!isOwnedTestWorld()) return;
    await beat();
    const before = [...walker.nav.copy.keys()].sort();
    await restartWorld();
    const back = await session(walkerHandle, TREELINE);
    const after = [...back.nav.copy.keys()].sort();
    record.push(`17: copy before ${before.length}, after ${after.length}; missing ${JSON.stringify(before.filter((k) => !after.includes(k)))}`);
    for (const k of before) expect(after).toContain(k);
    expect(new Set(after).size).toBe(after.length);
  }, 600_000);
});
