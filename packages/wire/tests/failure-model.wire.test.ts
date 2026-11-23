/**
 * ⭐⭐ The failure-model drive — every refusal a player meets is worded by its
 * row, a script stops at its first one and can handle it, and a defect is
 * never shown as its exception nor caught by a script.
 *
 * The blocking drive of the failure-model build (requirements § The drive,
 * twelve steps). Every step is `instant` or `staged`; there is no soak
 * drive. Steps a player cannot reach by playing say how they are staged.
 *
 * Stands in the scaffold (test-world-lifecycle D8): the cellar door off the
 * testbed shop (locked, free from the cellar side — the pump-house door was
 * the exemplar), the bank's teller as the one who would take the coin. The
 * door is staged before each use and put back after. Steps 10 and 11 fell an
 * oak stand, which is content: they are in `failure-model-content.dirty`.
 * Every character is fresh and the bad recipe lives under its own keeper's
 * home, so the file runs twice on one world.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  stage,
  failDatastore,
  forceDocument,
  standIn,
  BANK,
  SHOP,
  CELLAR,
  CELLAR_DOOR,
  EXITS,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

declareFile({
  file: 'failure-model.wire.test.ts',
  packs: ['platform', 'test-fixtures', 'generic-objects'],
});

/** The cellar door's words: `down` from the shop, `up` from the cellar. */
const DOWN = EXITS.shop.cellar;
const UP = EXITS.cellar.shop;

const record: string[] = [];
const open: Session[] = [];

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

async function session(prefix: string, start: string, opts: Record<string, unknown> = {}): Promise<Session> {
  const s = await standIn(start, prefix, opts);
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
  // Leave the cellar door as authored: shut and locked.
  await stage(CELLAR_DOOR, 'setOpen', false).catch(() => undefined);
  await stage(CELLAR_DOOR, 'setLocked', true).catch(() => undefined);
  for (const s of open) s.close();
  console.log(`\n── failure-model drive record ──\n${record.join('\n')}\n`);
});

suite('⭐⭐ the failure model — refusals worded by their rows', () => {
  let shop: Session;
  let inside: Session;

  beforeAll(async () => {
    await stage(CELLAR_DOOR, 'setOpen', false);
    await stage(CELLAR_DOOR, 'setLocked', true);
    shop = await session('fmshop', SHOP);
    inside = await session('fmcellar', CELLAR);
  }, 180_000);

  it('1. [instant · player] `open` at a locked door is worded by the `locked` row; the envelope carries the code and the door', async () => {
    const { r, w } = await say(shop, `open ${DOWN}`);
    expect(r.status).toBe('declined');
    expect(w).toMatch(/The lock holds — the cellar door won't open\./);
    const note = refusedOf(r);
    expect(note?.reason).toBe('locked');
    expect((note?.facts.target as { stuffId?: string } | undefined)?.stuffId).toEqual(expect.any(String));
    // No legacy wording rides beside it.
    expect((r.notes as Array<{ kind: string }>).some((n) => n.kind === 'controller-rejected')).toBe(false);
  });

  it('2. [instant · player] a script stops at its first refusal, says so once, and the next line never runs', async () => {
    await say(shop, `def fmfetch { open ${DOWN}; go ${DOWN} }`);
    const { r, w } = await say(shop, 'do fmfetch');
    expect(w).toMatch(new RegExp(`The script stopped at \`?open ${DOWN}\`?: The lock holds — the cellar door won't open\\.`));
    expect(w.match(/The lock holds/g)).toHaveLength(1);
    expect(refusedOf(r)).toMatchObject({ reason: 'locked', at: `open ${DOWN}` });
    // `go down` never ran: still in the shop.
    expect(squash(await shop.prose('look here'))).toMatch(/testbed shop/i);
  });

  it('3. [instant · player] `try … on locked` unlocks the very door the refusal named, opens it, and goes through', async () => {
    // The cellar is the free side: the thumb-turn needs no key.
    await say(inside, `def fmfetch2 { try { open ${UP} } on locked { unlock $why.target; open ${UP} }; go ${UP} }`);
    const { w } = await say(inside, 'do fmfetch2');
    expect(w).not.toMatch(/script stopped/i);
    expect(squash(await inside.prose('look here'))).toMatch(/testbed shop/i);
  });

  it('4. [instant · player] the same handler without a key stops at `unlock`, worded from `no-key`', async () => {
    await stage(CELLAR_DOOR, 'setOpen', false);
    await stage(CELLAR_DOOR, 'setLocked', true);
    await say(shop, `def fmfetch3 { try { open ${DOWN} } on locked { unlock $why.target; open ${DOWN} }; go ${DOWN} }`);
    const { r, w } = await say(shop, 'do fmfetch3');
    expect(w).toMatch(/The script stopped at `?unlock \$why\.target`?: You have no key that fits the cellar door ?\./);
    expect(refusedOf(r)?.reason).toBe('no-key');
  });

  it('5. [instant · player] a misspelled reason is refused at parse, with the corrected line to tap', async () => {
    const { r, w } = await say(shop, `def fmbad { try { open ${DOWN} } on lockd { say no } }`);
    expect(w).toMatch(
      new RegExp(`there is no reason 'lockd' — the nearest is 'locked'\\. Did you mean def fmbad \\{ try \\{ open ${DOWN} \\} on locked \\{ say no \\} \\} ?\\?`),
    );
    const note = (r.notes as Array<{ kind: string; reason?: string; suggestion?: string }>).find(
      (n) => n.kind === 'command-rejected' && n.reason === 'parse-failed',
    );
    expect(note?.suggestion).toBe(`def fmbad { try { open ${DOWN} } on locked { say no } }`);
  });
});

suite('⭐ a refusal thrown deep in the bank', () => {
  let payer: Session;

  beforeAll(async () => {
    payer = await session('fmpayer', BANK);
  }, 180_000);

  it('6. [instant · player] a payment the purse cannot cover is worded from its row — no exception text', async () => {
    // The teller at the bank counter takes coin in hand; the purse is short.
    const { r, w } = await say(payer, 'pay teller 100000 --cash');
    expect(r.status).toBe('declined');
    expect(w).toMatch(/You haven't the coin for|You can't make .* exactly in coin/);
    expect(w).not.toMatch(/BankingLogic|settle:|Error/);
    expect(refusedOf(r)?.reason).toMatch(/insufficient-coin|inexact-cash/);
  });

  it('7. [instant · player] `on *` catches the thrown refusal like any other', async () => {
    const { w } = await say(payer, 'try { pay teller 100000 --cash } on * { say Short today. }');
    expect(w).toMatch(/Short today/);
    expect(w).not.toMatch(/script stopped/i);
  });
});

// Steps 10 and 11 (a pack reason, an interrupted felling) stand in an oak
// stand: `failure-model-content.dirty.wire.test.ts`.

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
    wizard = await session('fmwizard', BANK, { wizard: true });
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
