/**
 * ⭐⭐ The failure-model drive — the CONTENT half (test-world-lifecycle D8).
 *
 * Steps 10 and 11 of the failure-model build's drive, moved here unchanged
 * when the file was split: they stand in the Hanging Wood's ride and fell its
 * oak, which no scaffold place holds (a forestry stand is content). The
 * kernel steps are in `failure-model.wire.test.ts`. Build 2's to move.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, plain, hand, advanceWorldClock } from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'fells oak in the Hanging Wood (a stand only the increment refills)';

declareFile({
  file: 'failure-model-content.dirty.wire.test.ts',
  packs: ['world-seed', 'terminus', 'rejection', 'base-library', 'trade-forestry'],
  dirtyReason: DIRTY_REASON,
});

const RIDE = '/world/terminus/rejection/hanging-wood/ride';
const BILLHOOK = '/trade/forestry/thing/billhook';
const AXE = '/trade/forestry/thing/felling-axe';

const record: string[] = [];
const open: Session[] = [];

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

async function session(handle: string, start: string, opts: Record<string, unknown> = {}): Promise<Session> {
  const s = await Session.open(handle, { startLocation: start, ...opts });
  open.push(s);
  await s.drainProse();
  return s;
}

async function say(s: Session, text: string): Promise<{ r: CommandResult; w: string }> {
  const r = await s.cmd(text);
  const w = squash(await r.said());
  record.push(`${s.handle}: ${text} → ${r.status} · ${w.slice(0, 240)}`);
  return { r, w };
}

/** A refused note on a result, if any. */
function refusedOf(r: CommandResult): { reason: string; facts: Record<string, unknown>; at?: string } | undefined {
  return (r.notes as Array<{ kind: string }>).find((n) => n.kind === 'refused') as
    | { reason: string; facts: Record<string, unknown>; at?: string }
    | undefined;
}

afterAll(async () => {
  for (const s of open) s.close();
  console.log(`\n── failure-model (content) drive record ──\n${record.join('\n')}\n`);
});

suite('⭐ a pack reason, and an interrupted step', () => {
  let f: Session;

  beforeAll(async () => {
    f = await session(uniqueHandle('fmforest'), RIDE);
    await hand(f, BILLHOOK);
    await hand(f, AXE);
  }, 180_000);

  it('10. [instant · player] forestry’s own reason is handled by its path, with no kernel change', async () => {
    const plainRefusal = await say(f, 'fell oak with billhook');
    expect(plainRefusal.w).toMatch(/It will take a stool off at the ankle, and it will not take an oak\./);
    expect(refusedOf(plainRefusal.r)?.reason).toBe('/trade/forestry/reasons/wrong-tool');
    const { w } = await say(f, 'try { fell oak with billhook } on /trade/forestry/reasons/wrong-tool { say Wrong tool. }');
    expect(w).toMatch(/Wrong tool/);
  });

  it('11. [staged · player] `on interrupted` runs when the step is cut short', async () => {
    await say(f, 'try { fell oak with axe } on interrupted { say Later. }');
    // Staged: the player cancels the felling alone (not the script).
    await say(f, 'cancel manual-build-step');
    await f.drainProse();
    // ⚠ The script wakes at the step's expected end (a deferred seam).
    await advanceWorldClock('1 minute');
    let heard = '';
    for (let i = 0; i < 10 && !/Later/.test(heard); i++) {
      heard += squash(await f.listen(1500, { sinceDrain: true }));
    }
    record.push(`${f.handle}: after cancel → ${heard.slice(0, 200)}`);
    expect(heard).toMatch(/Later/);
  });
});
