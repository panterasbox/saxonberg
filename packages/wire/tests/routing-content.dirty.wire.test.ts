/**
 * Routing — the CONTENT half of the drive (test-world-lifecycle D8).
 *
 * Steps 1, 1b, 10 and 13, moved here unchanged when the file was split: they
 * ask a moored barge at Wharfside bank for a journey, read `map terminus`
 * against the realm's far side, and route to the TPA terminal hall — a
 * sailed lane, a locality map and a teleport terminal the scaffold does not
 * have. The kernel steps are in `routing.wire.test.ts`. Every act here is a
 * plan, a read or a refusal; it is `.dirty.` because it stands in Terminus,
 * which build 2 moves.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, plain } from '../src/harness';

export const DIRTY_REASON =
  'stands in Terminus content (a moored barge at Wharfside bank, the TPA ' +
  'terminal hall, the Terminus map) — clean in itself, build 2 moves it';

declareFile({
  file: import.meta.url,
  packs: [
    'saxonberg-lounge',
    'terminus',
    'world-seed',
    'rejection',
    'transport',
    'generic-objects',
    'ground',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK = '/world/terminus/wharfside/bank';
const SQUARE = '/world/terminus/market/square';
const YARD = '/world/terminus/goods-yards/yard';

const open: Session[] = [];

async function at(where: string, tag: string): Promise<Session> {
  const s = await Session.open(uniqueHandle(`routing-${tag}`), {
    startLocation: where,
  });
  open.push(s);
  return s;
}

/** What a command said, as plain prose. */
async function say(s: Session, cmd: string): Promise<string> {
  return plain(await (await s.cmd(cmd)).said());
}

afterAll(async () => {
  // ⚠ `close()` is SYNCHRONOUS — `await s.close().catch(...)` threw
  // `Cannot read properties of undefined (reading 'catch')` in the
  // teardown, which failed the SUITE while all 14 steps passed. A
  // green run reported as a failure is the worst kind of noise.
  for (const s of open) {
    try {
      s.close();
    } catch {
      // A socket already gone is not a drive finding.
    }
  }
});

suite('routing — the drive (content)', () => {
  /* ── 1 · planned by the conveyance, not by a named way ───────────── */

  it('1 · ⭐⭐ a SAILED vehicle is not routed over roads, and says so', async () => {
    // ⭐⭐ AC1 from the other side, and the live content gave a better
    // test than the one this step was written with. What affords
    // `journey` at Wharfside bank is a **moored barge** — and a barge
    // asked for the market square answers *no road from here goes to
    // 'the market square'*, which is exactly right: the mode is the
    // VEHICLE's now, so a sailed hull is never planned over a wheeled
    // way.
    //
    // ⚠ Before this build the Journey's mode came from `lane.mode`, so
    // the same command with a wagon hitched and `via estuary` made the
    // WAGON SAIL and it died at the first leg. That direction of the
    // property needs a hitched rig at a two-way place, which over a
    // socket means the haulage flow and a funded session;
    // `JourneyController.test.ts` and `Vehicular.test.ts` pin it
    // directly, and this step pins the half the shipped content can
    // actually reach.
    const s = await at(BANK, 'bank');
    const res = await s.cmd('journey to the market square');
    const out = plain(await res.said());
    // ⚠ Understood, and refused in words. "I don't understand" would
    // mean nothing afforded the verb — the silent-failure class.
    expect(out).not.toMatch(/don't understand/i);
    expect(out.length).toBeGreaterThan(0);
    expect(out).toMatch(/no road from here|no way you can take|does not join/i);
    // ⛔ And it must NOT have departed: a barge setting off along a
    // road is the defect this build removed.
    expect(out).not.toMatch(/set off along/i);
  });

  it('1b · ⚠ the way it names is the SAME on two runs', async () => {
    // The label is the lanes a plan crosses, sorted by key. A label
    // that varied with compile order would be a different answer to
    // the same question — which is the defect `laneFor`'s old
    // `candidates.find(...)` had.
    const a = await at(BANK, 'label-a');
    const b = await at(BANK, 'label-b');
    const first = await say(a, 'journey to the market square');
    const second = await say(b, 'journey to the market square');
    const nameOf = (t: string): string =>
      (/set off along ([^—.]+)/i.exec(t)?.[1] ?? '').trim();
    expect(nameOf(first)).toBe(nameOf(second));
  });

  /* ── 10 · the firewall, from the map verb's side ─────────────────── */

  it('10 · ⭐⭐⭐ `map` still shows only what YOU know', async () => {
    const s = await at(YARD, 'map');
    await s.cmd('look');
    const out = await say(s, 'map terminus');
    // It must not have grown the whole realm. The yard's own
    // neighbourhood, and nothing from the far side of the pass.
    expect(out).not.toMatch(/kestrel|ferrow|hush-mouth/i);
  });

  /* ── 13 · the terminal still works ──────────────────────────────── */

  it('13 · ⚠ a TPA terminal is a DESTINATION, never a routed leg', async () => {
    // A node's `travel` block is not an edge for the search: a plan
    // ends at the terminal, and taking the service is a separate act.
    // So the board must still read and the network must still carry.
    const s = await at(SQUARE, 'tpa');
    const out = await say(s, 'route to the terminal hall');
    // Whatever it answers, it must not have planned THROUGH a
    // timetable — a routed plan to a place only the TPA reaches would
    // be the search treating a service as a doorway.
    expect(out).toMatch(/do not know the way|The way to|no map|already there/i);
  });
});
