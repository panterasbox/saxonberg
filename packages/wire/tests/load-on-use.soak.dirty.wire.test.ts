/**
 * The soak half of the load-on-use drive (requirements soak step S1): what
 * only the clock can show. Never run before merge; the soak lane runs it.
 * Its staged twin is the blocking drive's step 8 (a vat's conversion set by
 * `eval`).
 *
 * S1 — a vat of dark-rum wort left at the Veshko distillery works on the
 * clock alone, its profile (a document BulkableApi stands at boot) reached
 * by the charge: a day on it is working, a few days on it is done — with no
 * wizard help after the pour.
 */

import { describe as suite, it, expect } from 'vitest';
import { Session, declareFile, uniqueHandle, plain, hand, advanceWorldClock } from '../src/harness';

export const DIRTY_REASON =
  'leaves a charged vat at the Veshko distillery and moves the world clock by days';

declareFile({
  file: 'load-on-use.soak.dirty.wire.test.ts',
  packs: ['base-library', 'generic-objects', 'terminus', 'trade-distilling', 'trade-sugar'],
  dirtyReason: DIRTY_REASON,
});

const DISTILLERY = '/world/terminus/goods-yards/veshko/location/distillery';
const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(line));
}

suite('load on use, on the clock', () => {
  it('S1. a vat left to ripen reaches its profile’s next stage with no wizard help', async () => {
    const s = await Session.open(uniqueHandle('vintner'), { startLocation: DISTILLERY });
    const vat = await hand(s, '/trade/distilling/thing/vat');
    await say(s, `drop #${vat}`);
    const bucket = await hand(s, '/trade/distilling/thing/wash-bucket', {
      interiorMaterial: '/trade/distilling/idea/material/dark-rum-wort',
      interiorAmount: 10,
    });
    await say(s, `pour #${bucket} into #${vat}`);
    // ⚠ (soak repair 2026-11-16) A freshly pitched vat is WORKING: its first
    // line ("a first few beads") holds only while not a gram has converted,
    // and the clock runs between the pour and the look, so either working
    // line is the fresh vat. Not sweet and idle, and not done.
    const fresh = await say(s, `look #${vat}`);
    expect(fresh, fresh).toMatch(
      /A first few beads track up through it|It bubbles steadily, a yeasty breath rising off it/
    );
    expect(fresh, fresh).not.toMatch(/the work is done|nothing is working it yet/);
    const handle = s.handle;
    s.close(); // an offline body is frozen: no feeding across the jump

    await advanceWorldClock('1 day');
    const back = await Session.open(handle, { startLocation: DISTILLERY });
    expect(await say(back, `look #${vat}`)).toMatch(/It bubbles steadily, a yeasty breath rising off it/);
    back.close();

    await advanceWorldClock('4 days');
    const done = await Session.open(handle, { startLocation: DISTILLERY });
    expect(await say(done, `look #${vat}`)).toMatch(/It lies still — the work is done/);
    done.close();
  });
});
