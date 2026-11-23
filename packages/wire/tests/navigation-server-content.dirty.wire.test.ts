/**
 * ⭐⭐ The navigation-server blocking drive — the CONTENT half
 * (test-world-lifecycle D8).
 *
 * Steps 1, 10 and 15g, moved here unchanged when the file was split: they
 * stand aboard the Hesper (a ship, her helm and her master) and on the
 * headland brow (a horizon of named landmarks), neither of which the scaffold
 * has. The kernel steps are in `navigation-server.wire.test.ts`. Build 2's to
 * move.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import { Session, NavClient, declareFile, uniqueHandle, plain } from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'mints fresh characters whose maps it writes, aboard the Hesper and on the headland brow';

declareFile({
  file: 'navigation-server-content.dirty.wire.test.ts',
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

const DECK = '/world/terminus/hesper/deck';
const BROW = '/world/terminus/estuary/headland/brow';

const record: string[] = [];
const open: Session[] = [];
afterAll(() => {
  for (const s of open) s.close();
  // eslint-disable-next-line no-console
  console.log(`\n[navigation-server drive (content)] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
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

suite('navigation-server — the blocking drive (content)', () => {
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
});
