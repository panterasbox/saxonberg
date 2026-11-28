/**
 * Wizard-axis cleanup — the CONTENT half (split by test-world-lifecycle D8):
 * steps 1–3, unchanged — the dorm provisioner at Duncan Hall (Katie) and the
 * letting agency at Seznick House, both placeholder content. The kernel half
 * (the write predicate, reading, reload, the dials and the gate) is
 * `wizard-axis.wire.test.ts`, standing in the scaffold.
 *
 * The rule under test (owner, 2026-11-05): letting a room is a SEAT's act,
 * never the wizard axis's.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectNote,
} from '../src/harness';
import type { CommandResult } from '../src/harness';
import { WIRE_LOG } from '../src/runner/boot';

export const DIRTY_REASON =
  'moves a newcomer into Duncan Hall through Katie — the dorm slot is not ' +
  'given back — and stands on Terminus\'s dorm and letting agency';

declareFile({
  file: 'wizard-axis-content.dirty.wire.test.ts',
  packs: ['platform', 'terminus', 'eternal-university', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

const HALL_LOBBY = '/world/terminus/eternal/duncan-hall/place/lobby';
const SEZNICK_LOBBY = '/world/terminus/mayfield-row/seznick-house/lobby';

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

/**
 * Answer a dialogue wheel with the choice whose line matches `want`. ⚠ The
 * previous wheel's `prompt-dismissed` frame arrives first — skip any frame
 * that carries no choices.
 */
async function choose(s: Session, want: RegExp): Promise<void> {
  type Choice = { response?: string };
  type Body = { promptId?: string; outcome?: { notes?: Array<{ kind?: string; choices?: Choice[] }> } };
  for (let i = 0; i < 5; i++) {
    const p = (await s.awaitPrompt(10_000)) as unknown as Body & { payload?: Body };
    const body = p.payload?.promptId ? p.payload : p;
    const choices = body.outcome?.notes?.find((n) => n.kind === 'prompt-choice')?.choices ?? [];
    if (choices.length === 0) continue;
    const pick = choices.find((c) => want.test(JSON.stringify(c)));
    expect(pick, `no choice matching ${want} in ${JSON.stringify(choices).slice(0, 400)}`).toBeDefined();
    s.answerPrompt(body.promptId!, pick!.response ?? '');
    return;
  }
  throw new Error(`no choice wheel arrived for ${want}`);
}

const WIZ = uniqueHandle('wzax');
let wiz: Session;

beforeAll(async () => {
  wiz = await session(WIZ, { startLocation: HALL_LOBBY, wizard: true });
}, 300_000);

afterAll(() => {
  for (const s of open) s.close();
});

suite('the seats are exercised, not bypassed (1–3)', () => {
  it('1. [instant] a newcomer talks to Katie and is moved in — her dispatch passes the seat', async () => {
    const logMark = readFileSync(WIRE_LOG, 'utf8').length;
    const newcomer = await session(uniqueHandle('nwax'), { startLocation: HALL_LOBBY });
    // ⚠ The lobby is unlit at night, and you cannot talk to whom you
    // cannot see: bring the clock round to daylight first (2h steps, a
    // day at most — instant).
    for (let i = 0; i < 12 && /pitch dark/i.test(plain(await newcomer.prose('look'))); i++) {
      expectOk(await newcomer.cmd('testharness clock-advance 2h'));
    }
    let t = await newcomer.cmd('talk katie');
    if (t.status !== 'ok') t = await newcomer.cmd('talk super');
    expectOk(t);
    await choose(newcomer, /need a room/i);
    await choose(newcomer, /Mining/i);
    // The provision ran AS Katie — through her own affordance and the
    // seat at execute(). Its outcome is told to HER, and the server logs an
    // NPC's dispatch only when it is NOT ok, so a quiet log is the pass:
    // this check caught `unknown-verb(provision)` and would catch the old
    // wizard validator's refusal (both were live before this build).
    await new Promise((r) => setTimeout(r, 4000));
    const failed = readFileSync(WIRE_LOG, 'utf8').slice(logMark)
      .split('\n').filter((l) => /\[dispatch\] Katie "provision /.test(l));
    expect(failed, failed.join('\n')).toEqual([]);
  });

  it('2. [instant] a seatless wizard at Katie\'s desk is refused, and told whose act it is', async () => {
    const r = await wiz.cmd(`provision ${WIZ}`);
    expectNote(r, 'controller-rejected', { reason: 'not-authorized' });
    expect(await words(r)).toMatch(/college's staff|hall's committee/);
  });

  it('3. [instant] the same at Seznick House — the agency is named', async () => {
    const w = await session(WIZ, { startLocation: SEZNICK_LOBBY, wizard: true });
    wiz = w;
    const r = await w.cmd(`lease ${WIZ}`);
    expectNote(r, 'controller-rejected', { reason: 'not-authorized' });
    expect(await words(r)).toMatch(/letting agency's staff|building's committee/);
  });
});
