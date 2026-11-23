/**
 * Wizard-axis cleanup — ⭐⭐ **the blocking drive** (the requirements'
 * drive, numbering kept), over the wire.
 *
 * The rule under test (owner, 2026-11-05): **the wizard axis is AUTHORING
 * TypeScript and nothing else.** Letting a room is a seat's act; reading is
 * open; reloading asks for title; the world's dials are the Prime
 * Minister's, and a tax is the Minister of Finance's, on the record; the
 * command-running spell is gone; fabricating a deed exists only in a test
 * world; and a new wizard check fails the build.
 *
 * ⭐ Every step is tagged with its PACE (docs/workflow.md § No merge waits
 * on the clock): `instant`, or `staged` (an office seated through the
 * harness's `offices:` option, because `office assign` cannot bind a
 * second online session yet — governance.md § Open). No span step, no
 * soak twin.
 *
 * ⚠ Departures from the plan's table, each for a reason:
 *  - **4 / 5 drive the predicate through `cp -s` / `mkdir -s`**, not
 *    `edit -s` / `edit -c`: the harness's `cmd()` sends text only and
 *    `edit` takes its body as a structured payload. `cp` writes a `.ts`
 *    (code) and `mkdir` a directory (content) through the same one
 *    predicate, so the three branches are each driven: a non-wizard is
 *    refused a `.ts` on the AXIS, a seatless wizard is refused anything on
 *    TITLE, and a directory never asks the axis.
 *  - **10 (wiki spoilers) is the unit suite's** (`WikiRenderer.test.ts` —
 *    the root-owner rung and *a wizard with no wiki title reads at 1*):
 *    seeding a spoiler-tagged page over the wire needs the same payload
 *    channel.
 *  - **8's cross-refusals land at the verb's seat validator**
 *    (`requiresFinanceMinister` / `requiresGovernor`) before the controller
 *    can say `wrong-seat`; the `wrong-seat` arm is the founder's (who holds
 *    both seats by default) and the unit suite's.
 *
 * ⭐ Stands in the scaffold (test-world-lifecycle D8). Steps 1–3 — the dorm
 * provisioner and the letting agency, which are placeholder content — moved,
 * unchanged, to `wizard-axis-content.dirty.wire.test.ts`. Runs twice on one
 * world: every office it moves goes back to the founder in a `finally`, and
 * both dials it sets are set back.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectNote,
  TESTBED,
  PLAZA,
  HOST,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

declareFile({
  file: 'wizard-axis.wire.test.ts',
  packs: ['platform', 'test-fixtures', 'arcana'],
});

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, '..', '..', 'server');
/**
 * Where every session stands. ⚠ The founder too: a login with no
 * `startLocation` lands wherever the world's default is (D7), so even the
 * founder's seat is exercised standing in the testbed.
 */
const HERE_AT = PLAZA;

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const open: Session[] = [];

async function session(handle: string, opts: Parameters<typeof Session.open>[1] = {}): Promise<Session> {
  const s = await Session.open(handle, opts);
  open.push(s);
  return s;
}

/** The refusal's words, wherever they rode (note detail or prose). */
async function words(r: CommandResult): Promise<string> {
  return squash(JSON.stringify(r.notes ?? []) + ' ' + (await r.said()));
}

const WIZ = uniqueHandle('wzax');
const PLAYER = uniqueHandle('plax');
let wiz: Session;
let player: Session;

beforeAll(async () => {
  wiz = await session(WIZ, { startLocation: HERE_AT, wizard: true });
  player = await session(PLAYER, { startLocation: HERE_AT });
}, 300_000);

afterAll(() => {
  for (const s of open) s.close();
});

suite('the axis is authoring TypeScript (4, 4b, 5)', () => {
  it('4. [instant] the one write predicate: a .ts asks the axis; a seatless wizard is refused on title; a directory never asks the axis', async () => {
    // A non-wizard copying a .ts is refused on the AXIS (code), whatever it holds.
    const code = await player.cmd('cp -s /platform/thing/Thing.ts /platform/thing/WizardAxisProbe.ts');
    expectNote(code, 'controller-rejected', { reason: 'access-denied' });
    expect(await words(code)).toMatch(/TypeScript, and authoring code asks for the wizard axis/);
    // A seatless wizard is refused the same write on TITLE — the axis is not a title.
    const untitled = await wiz.cmd('cp -s /platform/thing/Thing.ts /platform/thing/WizardAxisProbe.ts');
    expectNote(untitled, 'controller-rejected', { reason: 'access-denied' });
    expect(await words(untitled)).toMatch(/no title over/);
    // A directory is content: a non-wizard is refused on title, never the axis.
    const dir = await player.cmd('mkdir -s /platform/thing/wizard-axis-probe');
    expectNote(dir, 'controller-rejected', { reason: 'access-denied' });
    expect(await words(dir)).not.toMatch(/wizard axis/);
    // And `git publish --dry-run` touches nothing, for anyone. (Its report
    // rides `shell.diagnostic`, which the harness skips; the checkout is
    // the proof — the server's repo is this worktree.)
    const head = () => spawnSync('git', ['rev-parse', 'HEAD'], { cwd: SERVER, encoding: 'utf8' }).stdout.trim();
    const staged = () => spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: SERVER, encoding: 'utf8' }).stdout.trim();
    const [h0, s0] = [head(), staged()];
    expectOk(await wiz.cmd('git publish --dry-run -m probe'));
    expect(head()).toBe(h0);
    expect(staged()).toBe(s0);
  });

  it('4b. [instant] reading is open — to a seatless wizard and a plain player alike; the console ring is the PM\'s', async () => {
    for (const s of [wiz, player]) {
      expectOk(await s.cmd('git status'));
      expectOk(await s.cmd('git log --limit 3'));
      expectOk(await s.cmd('errors --source compile'));
      expectNote(await s.cmd('errors raw'), 'controller-rejected', { reason: 'pm-only' });
    }
    const founder = await session('founder', { startLocation: HERE_AT });
    expectOk(await founder.cmd('errors raw --limit 3'));
  });

  it('5. [instant] reload asks for TITLE: a seatless wizard is refused naming what it holds; the PM reloads', async () => {
    const r = await wiz.cmd('reload /platform/thing/Thing');
    expectNote(r, 'controller-rejected', { reason: 'access-denied' });
    expect(await words(r)).toMatch(/reload needs title over \/platform\/thing\/Thing/);
    const holder = await session(uniqueHandle('hoax'), { startLocation: HERE_AT, committees: [TESTBED] });
    const t = await holder.cmd(`typecheck ${HOST}`);
    // A held path passes the gate (a row with no source file is then declined by the checker).
    expect(await words(t)).not.toMatch(/needs title over/);
  });
});

suite('the dials belong to seats (6–8)', () => {
  it('6. [instant] the Prime Minister (the founder, by default) reads and sets a Tier B dial, and sets it back', async () => {
    const founder = await session('founder', { startLocation: HERE_AT });
    const before = squash(await founder.prose('config combat.poise.openingTicks')).match(/= (\S+)/)?.[1] ?? '';
    expectOk(await founder.cmd('config combat.poise.openingTicks 3'));
    expect(squash(await founder.prose('config combat.poise.openingTicks'))).toMatch(/= 3/);
    if (before) expectOk(await founder.cmd(`config combat.poise.openingTicks ${before}`));
  });

  it('6b. [instant] a seatless wizard is refused config, naming the Prime Minister', async () => {
    const r = await wiz.cmd('config combat.poise.openingTicks 3');
    expect(r.status).not.toBe('ok');
    expect(await words(r)).toMatch(/Prime Minister/);
  });

  it('7. [instant] a Tier C dial from config is refused, naming the Minister and her verb', async () => {
    const founder = await session('founder', { startLocation: HERE_AT });
    const r = await founder.cmd('config banking.salesTaxRate 0.1');
    expectNote(r, 'controller-rejected', { reason: 'tier-c' });
    expect(await words(r)).toMatch(/Minister of Finance.*treasury set/);
  });

  it('8. [staged] each seat sets its own dial, on the record; neither reaches the other\'s', async () => {
    const founder = await session('founder', { startLocation: HERE_AT });
    const taxBefore = squash(await founder.prose('config banking.salesTaxRate')).match(/= (\S+)/)?.[1] ?? '0';
    const capBefore = squash(await founder.prose('config banking.withdrawalDailyCap')).match(/= (\S+)/)?.[1] ?? '0';
    const minister = await session(uniqueHandle('mfax'), { startLocation: HERE_AT, offices: ['minister-of-finance'] });
    const governor = await session(uniqueHandle('cgax'), { startLocation: HERE_AT, offices: ['central-bank-governor'] });
    try {
      expectOk(await minister.cmd('treasury set banking.salesTaxRate 0.1'));
      expectOk(await governor.cmd('reserve set banking.withdrawalDailyCap 600'));
      expect(squash(await founder.prose('config banking.salesTaxRate'))).toMatch(/= 0\.1/);
      expect(squash(await founder.prose('config banking.withdrawalDailyCap'))).toMatch(/= 600/);
      expect(squash(await minister.prose('chronicle'))).toMatch(/As Minister of Finance, set .?banking\.salesTaxRate/);
      expect(squash(await governor.prose('chronicle'))).toMatch(/As Governor of the Central Bank/);
      // Cross-refusals: the other seat's verb refuses at its own seat.
      const g = await governor.cmd('treasury set banking.salesTaxRate 0.08');
      expect(g.status).not.toBe('ok');
      expect(await words(g)).toMatch(/Minister of Finance/);
      const m = await minister.cmd('reserve set banking.withdrawalDailyCap 500');
      expect(m.status).not.toBe('ok');
      expect(await words(m)).toMatch(/Governor/);
      // The founder no longer holds either seat — the authority moved with the office.
      expect((await founder.cmd('treasury set banking.salesTaxRate 0.2')).status).not.toBe('ok');
    } finally {
      // Hand both seats back (the seat MOVES) and restore the dials.
      const back = await session('founder', { startLocation: HERE_AT, offices: ['minister-of-finance', 'central-bank-governor'] });
      await back.cmd(`treasury set banking.salesTaxRate ${taxBefore}`);
      await back.cmd(`reserve set banking.withdrawalDailyCap ${capBefore}`);
    }
  });
});

suite('what left production (9, 11) and the gate (12)', () => {
  it('9. [instant] no spell runs commands', async () => {
    const r = await player.cmd('spells');
    expect(squash(await r.said())).not.toMatch(/\bscript\b/i);
  });

  it('11. [instant] practice is a test-world verb — admitted here, asking for no credential', async () => {
    expectOk(await player.cmd('help practice'));
    expectOk(await player.cmd('practice carpentry hard success'));
  });

  it('12. [instant] a new wizard check fails the gate; the shipped tree passes', () => {
    const run = () =>
      spawnSync('npx', ['tsx', 'scripts/check-wizard-axis.ts', '--lint'], { cwd: SERVER, encoding: 'utf8' });
    expect(run().status, run().stderr).toBe(0);
    const probe = join(SERVER, 'src', 'mud', 'lib', 'WizardAxisProbe.ts');
    try {
      writeFileSync(probe, `// probe\nexport const x = 'AccessApi.${'is'}Wizard(giver)';\n`);
      const r = run();
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/WizardAxisProbe/);
    } finally {
      rmSync(probe, { force: true });
    }
  });
});
