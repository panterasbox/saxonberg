/**
 * ⭐⭐ The failure-model drive — every refusal a player meets is worded by its
 * row, a script stops at its first one and can handle it, and a defect is
 * never shown as its exception nor caught by a script.
 *
 * The blocking drive of the failure-model build (requirements § The drive,
 * twelve steps). Every step is `instant` or `staged`; there is no soak
 * drive. Steps a player cannot reach by playing say how they are staged.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  stage,
  hand,
  advanceWorldClock,
  failDatastore,
  forceDocument,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

export const DIRTY_REASON =
  'unlocks and relocks the shipped pump-house door, fells oak in the Hanging ' +
  'Wood (a stand only the increment refills), and writes a broken recipe ' +
  'under a test character’s home';

declareFile({
  file: 'failure-model.dirty.wire.test.ts',
  packs: [
    'world-seed',
    'terminus',
    'rejection',
    'generic-objects',
    'base-library',
    'trade-forestry',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK = '/world/terminus/wharfside/bank';
const PUMP_HOUSE = '/world/terminus/wharfside/pumphouse/location/house';
const PUMP_DOOR = '/world/terminus/wharfside/thing/pump-house-door';
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
  // Leave the pump-house door as shipped: shut and locked.
  await stage(PUMP_DOOR, 'setOpen', false).catch(() => undefined);
  await stage(PUMP_DOOR, 'setLocked', true).catch(() => undefined);
  for (const s of open) s.close();
  console.log(`\n── failure-model drive record ──\n${record.join('\n')}\n`);
});

suite('⭐⭐ the failure model — refusals worded by their rows', () => {
  let bank: Session;
  let inside: Session;

  beforeAll(async () => {
    await stage(PUMP_DOOR, 'setOpen', false);
    await stage(PUMP_DOOR, 'setLocked', true);
    bank = await session(uniqueHandle('fmbank'), BANK);
    inside = await session(uniqueHandle('fmhouse'), PUMP_HOUSE);
  }, 180_000);

  it('1. [instant · player] `open` at a locked door is worded by the `locked` row; the envelope carries the code and the door', async () => {
    const { r, w } = await say(bank, 'open pumphouse');
    expect(r.status).toBe('declined');
    expect(w).toMatch(/The lock holds — the pump-house door won't open\./);
    const note = refusedOf(r);
    expect(note?.reason).toBe('locked');
    expect((note?.facts.target as { stuffId?: string } | undefined)?.stuffId).toEqual(expect.any(String));
    // No legacy wording rides beside it.
    expect((r.notes as Array<{ kind: string }>).some((n) => n.kind === 'controller-rejected')).toBe(false);
  });

  it('2. [instant · player] a script stops at its first refusal, says so once, and the next line never runs', async () => {
    await say(bank, 'def fmfetch { open pumphouse; go pumphouse }');
    const { r, w } = await say(bank, 'do fmfetch');
    expect(w).toMatch(/The script stopped at `?open pumphouse`?: The lock holds — the pump-house door won't open\./);
    expect(w.match(/The lock holds/g)).toHaveLength(1);
    expect(refusedOf(r)).toMatchObject({ reason: 'locked', at: 'open pumphouse' });
    // `go pumphouse` never ran: still at the bank.
    expect(squash(await bank.prose('look here'))).toMatch(/bank/i);
  });

  it('3. [instant · player] `try … on locked` unlocks the very door the refusal named, opens it, and goes through', async () => {
    // Inside is the free side: the thumb-turn needs no key.
    await say(inside, 'def fmfetch2 { try { open out } on locked { unlock $why.target; open out }; go out }');
    const { w } = await say(inside, 'do fmfetch2');
    expect(w).not.toMatch(/script stopped/i);
    expect(squash(await inside.prose('look here'))).toMatch(/bank/i);
  });

  it('4. [instant · player] the same handler without a key stops at `unlock`, worded from `no-key`', async () => {
    await stage(PUMP_DOOR, 'setOpen', false);
    await stage(PUMP_DOOR, 'setLocked', true);
    await say(bank, 'def fmfetch3 { try { open pumphouse } on locked { unlock $why.target; open pumphouse }; go pumphouse }');
    const { r, w } = await say(bank, 'do fmfetch3');
    expect(w).toMatch(/The script stopped at `?unlock \$why\.target`?: You have no key that fits the pump-house door ?\./);
    expect(refusedOf(r)?.reason).toBe('no-key');
  });

  it('5. [instant · player] a misspelled reason is refused at parse, with the corrected line to tap', async () => {
    const { r, w } = await say(bank, 'def fmbad { try { open pumphouse } on lockd { say no } }');
    expect(w).toMatch(/there is no reason 'lockd' — the nearest is 'locked'\. Did you mean def fmbad \{ try \{ open pumphouse \} on locked \{ say no \} \} ?\?/);
    const note = (r.notes as Array<{ kind: string; reason?: string; suggestion?: string }>).find(
      (n) => n.kind === 'command-rejected' && n.reason === 'parse-failed',
    );
    expect(note?.suggestion).toBe('def fmbad { try { open pumphouse } on locked { say no } }');
  });
});

suite('⭐ a refusal thrown deep in the bank', () => {
  let payer: Session;

  beforeAll(async () => {
    payer = await session(uniqueHandle('fmpayer'), BANK);
  }, 180_000);

  it('6. [instant · player] a payment the purse cannot cover is worded from its row — no exception text', async () => {
    // The fisher who works the bank takes coin in hand; the purse is short.
    const { r, w } = await say(payer, 'pay fisher 100000 --cash');
    expect(r.status).toBe('declined');
    expect(w).toMatch(/You haven't the coin for|You can't make .* exactly in coin/);
    expect(w).not.toMatch(/BankingLogic|settle:|Error/);
    expect(refusedOf(r)?.reason).toMatch(/insufficient-coin|inexact-cash/);
  });

  it('7. [instant · player] `on *` catches the thrown refusal like any other', async () => {
    const { w } = await say(payer, 'try { pay fisher 100000 --cash } on * { say Short today. }');
    expect(w).toMatch(/Short today/);
    expect(w).not.toMatch(/script stopped/i);
  });
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

suite('⭐ a content error, and an outage', () => {
  let keeper: Session;
  let keeperId: string;
  let wizard: Session;

  beforeAll(async () => {
    const opened = await Session.openAtRoster(uniqueHandle('fmkeeper'), { startLocation: BANK, wizard: true });
    keeper = opened.session;
    keeperId = opened.playerId;
    open.push(keeper);
    await keeper.play(keeperId);
    await keeper.drainProse();
    wizard = await session(uniqueHandle('fmwizard'), BANK, { wizard: true });
  }, 180_000);

  const recipe = (): string => `/home/${keeperId}/recipes/fm-drive-knife`;
  const bad = {
    inputSlots: [{ type: 'iron', minGrade: 'legendary' }],
    outputTemplate: '/generic-objects/thing/knife',
    baseGradeBand: 'shoddy',
  };

  it('8. [staged] a bad recipe is refused at save; forced through, the player reads a sentence and only its keeper the diagnostic', async () => {
    // (The save's refusal — invalid-document — is unit-tested at the store;
    // the CMS is its door. Here the row is forced past it.)
    await forceDocument(recipe(), 'recipe', bad);
    const { r, w } = await say(keeper, 'fit fm-drive-knife');
    expect(r.status).toBe('error');
    expect(w).toMatch(/Something is wrong with the fm-drive-knife recipe\. Whoever keeps it has been told\./);
    expect(w).not.toMatch(/legendary|shoddy|ContentError|grade band/);
    // `errors` answers on the diagnostics topic, not as prose.
    const listed = await keeper.cmd('errors');
    await listed.said();
    const mine = squash(keeper.diagnostics());
    record.push(`${keeper.handle}: errors → ${mine.slice(0, 240)}`);
    expect(mine).toMatch(/content-error .*fm-drive-knife/);
    const theirsR = await wizard.cmd('errors');
    await theirsR.said();
    const theirs = squash(wizard.diagnostics());
    record.push(`${wizard.handle}: errors → ${theirs.slice(0, 240)}`);
    expect(theirs).not.toMatch(/fm-drive-knife/);
  });

  it('9. [staged] `on *` does NOT catch a content error: the script stops, the handler never runs', async () => {
    const { w } = await say(keeper, 'try { fit fm-drive-knife } on * { say caught }');
    expect(w).not.toMatch(/caught/);
    // The defect's own sentence first, then where the script stopped.
    expect(w).toMatch(/Something is wrong with the fm-drive-knife recipe\..*The script stopped at `?fit fm-drive-knife`?\./);
  });

  it('12. [staged] an outage says try again, and a script can handle it', async () => {
    // ⚠ The world's own background writes share the store: stage the outage
    // wide enough that the verb's read meets it, then end it.
    await failDatastore(500);
    const { r, w } = await say(keeper, 'errors');
    await failDatastore(0);
    expect(w).toMatch(/can't be reached just now — try again in a moment\./);
    expect(refusedOf(r)?.reason).toBe('unavailable');
    await failDatastore(500);
    // The handler does nothing that writes — the outage is still on.
    const handled = await say(keeper, 'try { errors } on unavailable { }');
    await failDatastore(0);
    expect(handled.r.status).not.toBe('declined');
    expect(handled.w).not.toMatch(/script stopped|can't be reached/i);
  });
});
