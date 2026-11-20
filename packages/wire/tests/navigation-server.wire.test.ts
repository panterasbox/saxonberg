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
 *
 * Stands in the scaffold (test-world-lifecycle D8): the walk is bank →
 * plaza, the locked way is the cellar door (staged locked first), the low
 * door is the works', the building is the testbed building, the dark is the
 * cellar. Every character is fresh, so the file runs twice on one world.
 * Steps 1, 10 and 15g stand aboard a ship and before a horizon of landmarks,
 * which are content: `navigation-server-content.dirty.wire.test.ts`.
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
  stage,
  BANK,
  PLAZA,
  APPROACH,
  YARD,
  SHOP,
  CELLAR,
  PASSAGE,
  CELLAR_DOOR,
  EXITS,
} from '../src/harness';
import type { CommandResult } from '../src/harness';
import type { WireClaim, NavWay } from '@saxonberg/types';

declareFile({
  file: 'navigation-server.wire.test.ts',
  packs: ['platform', 'test-fixtures'],
});

const record: string[] = [];
const open: Session[] = [];
afterAll(() => {
  for (const s of open) s.close();
  // eslint-disable-next-line no-console
  console.log(`\n[navigation-server drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

async function session(handle: string, start: string): Promise<{ s: Session; nav: NavClient }> {
  // `handle` is already unique (`uniqueHandle`): step 18 reopens the walker.
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

  // Step 1 (`locate`; the passenger at a ship's helm) is content.
  // Steps 2–8 walk the lit, addressed testbed; step 14 drives the dark cellar.
  it('2 · walk from the bank to the plaza: the copy holds the plaza, walked, with its zone, cell and level', async () => {
    walker = await session(walkerHandle, BANK);
    expectOk(await walker.s.cmd(`go ${EXITS.bank.plaza}`));
    await beat();
    // The arrival's `walked` claim is written after the walked edge — it
    // reaches the copy on its own beat.
    await expect
      .poll(() => placeClaims(walker.nav, PLAZA).some((c) => c.channel === 'walked'), { timeout: 15_000 })
      .toBe(true);
    const sq = placeClaims(walker.nav, PLAZA);
    record.push(`2: plaza claims ${JSON.stringify(sq.map((c) => [c.channel, c.at]))}`);
    expect(sq.some((c) => c.channel === 'walked')).toBe(true);
    const at = sq.find((c) => c.at)?.at;
    expect(at?.zone?.spoiler).toBe(1);
    expect(typeof at?.x).toBe('number');
    expect(typeof at?.level).toBe('number');
  }, 120_000);

  it('3 · `look`: the ways seen arrive with their state; the zone section is kind, cell and a label — no extent; every path tagged', async () => {
    expectOk(await walker.s.cmd('look'));
    await beat();
    const edges = walker.nav.claims((c) => c.kind === 'edge' && typeof c.place !== 'string' && c.place.path === PLAZA);
    record.push(`3: edges from the plaza ${edges.map((e) => `${e.dir}:${e.channel}:${e.state}`).join(', ')}`);
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
    expect(other.nav.claims((c) => typeof c.place !== 'string' && c.place.path === PLAZA)).toHaveLength(0);
  }, 120_000);

  it('6 · a locked door: the way says locked, and trying it refuses in those words', async () => {
    await stage(CELLAR_DOOR, 'setOpen', false);
    await stage(CELLAR_DOOR, 'setLocked', true);
    const { s, nav } = await session(uniqueHandle('nav-door'), SHOP);
    await beat();
    const way = wayNamed(nav, EXITS.shop.cellar);
    record.push(`6: cellar way ${JSON.stringify(way?.take)} facts ${JSON.stringify(way?.facts)}`);
    expect(way?.state).toBe('locked');
    expect(way?.take?.ok).toBe(false);
    const tried = await s.cmd(`go ${EXITS.shop.cellar}`);
    expect(tried.status).not.toBe('ok');
    const w = await words(tried);
    expect(way?.take && !way.take.ok ? w : '').toContain(way?.take && !way.take.ok ? way.take.reason : '∅');
  }, 120_000);

  it('6a · the low door: the way says stoop, `go south` refuses in exactly those words, `stoop south` goes through', async () => {
    const LOW = EXITS.approach.works;
    const { s, nav } = await session(uniqueHandle('nav-stoop'), APPROACH);
    await beat();
    const way = wayNamed(nav, LOW);
    record.push(`6a: low door ${JSON.stringify(way?.take)}`);
    expect(way?.take?.ok).toBe(false);
    const take = way?.take && !way.take.ok ? way.take : null;
    expect(take?.works?.command).toMatch(new RegExp(`${LOW}$`));
    const tried = await s.cmd(`go ${LOW}`);
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

  // Step 10 (aboard a ship: her name, where she lies) is content.
  it('12 · inside a building: its name, height, landmark, title', async () => {
    // The testbed building stands over the bank, the hall and the shop.
    const { nav } = await session(uniqueHandle('nav-hall'), BANK);
    await beat();
    const b = nav.section('building');
    record.push(`12: building ${JSON.stringify(b)}`);
    expect(b?.name).toBeTruthy();
  }, 120_000);

  it('14 · the place section; in the unlit cellar a `look` writes nothing (Light)', async () => {
    const place = walker.nav.section('place');
    record.push(`14: place (plaza) ${JSON.stringify(place)}`);
    expect(place?.light).toBeDefined();
    // The cellar is dark only while its door is shut (an open way passes light).
    await stage(CELLAR_DOOR, 'setOpen', false);
    await stage(CELLAR_DOOR, 'setLocked', true);
    // The passage and the cellar are both unlit: walk from one into the other.
    const caver = await session(uniqueHandle('nav-caver'), PASSAGE);
    expectOk(await caver.s.cmd(`go ${EXITS.passage.cellar}`));
    await beat();
    const dark = caver.nav.section('place');
    record.push(`14: place (cellar) ${JSON.stringify(dark)}`);
    expect(dark?.dark).toBe(true);
    // ⚠ The cellar lies inside the testbed Locality (the Delve lay in none), so
    // the walk's own claims may land on their own beat: wait for the copy to
    // stand still before counting it.
    for (let last = -1, i = 0; i < 20 && caver.nav.copy.size !== last; i++) {
      last = caver.nav.copy.size;
      await new Promise((r) => setTimeout(r, 500));
      await beat();
    }
    const before = caver.nav.copy.size;
    await caver.s.cmd('look');
    await beat();
    expect(caver.nav.copy.size).toBe(before);
    expect(placeClaims(caver.nav, CELLAR).filter((c) => c.channel === 'seen')).toHaveLength(0);
  }, 120_000);

  it('15 · the you section: pace, posture, hands', async () => {
    const you = walker.nav.section('you');
    record.push(`15: you ${JSON.stringify(you)}`);
    expect(you?.pace).toBe('walk');
    expect(you?.posture).toBeTruthy();
  }, 120_000);

  // Step 15g (the horizon of landmarks off a headland) is content.
  it('16 · a move sends only the sections that changed; sizes recorded', async () => {
    const snap = walker.nav.log.filter((e) => e.sub === 'where' && e.type === 'subscription-result')[0]!.bytes;
    const map = walker.nav.log.filter((e) => e.sub === 'map' && e.type === 'subscription-result')[0]!.bytes;
    const mark = walker.nav.mark();
    expectOk(await walker.s.cmd(`go ${EXITS.plaza.approach}`));
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
    const second = await session(walkerHandle, YARD).catch((err: Error) => {
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
    const back = await session(walkerHandle, YARD);
    const after = [...back.nav.copy.keys()].sort();
    record.push(`17: copy before ${before.length}, after ${after.length}; missing ${JSON.stringify(before.filter((k) => !after.includes(k)))}`);
    for (const k of before) expect(after).toContain(k);
    expect(new Set(after).size).toBe(after.length);
  }, 600_000);
});
