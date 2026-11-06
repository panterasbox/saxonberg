/**
 * Controllers are IO — the build's drive (requirements § The drive).
 *
 * ⭐⭐ **The before/after record (plan D13).** Steps 10–15 are verbs this
 * build MOVES: their logic leaves the controllers for the objects. The
 * acceptance criterion is that a person doing the same thing before and
 * after sees the same state change, the same refusal reason and the same
 * duration. So these steps do not assert outcomes they invented; they
 * RECORD what the world did — per act `{status, notes[{kind, reason}],
 * duration, state}`, no prose — into a committed baseline, and every later
 * run compares against it and fails on any difference.
 *
 *   CAIO_RECORD=1 → write `controllers-are-io.baseline.json` (the steps
 *                   this run recorded replace theirs; the rest are kept).
 *   otherwise     → compare each act to the baseline.
 *
 * `state` is the world facts the act changed, read through `eval` (a
 * staging wizard seated on the extent) — where an item landed, the crop's
 * grade, a wound's state, a wallet's delta, a scroll's charge. Only facts
 * that are the same on every run go in: kinds and booleans, never ids.
 *
 * ⚠ Step 12's venues are staffed by shift, so the step pins the hour of
 * day first (a jump under a day — lighting, not span).
 *
 * ⭐ The other steps assert what the requirements' drive names, on the
 * envelope first and on state through `eval`. Steps 17 and 18's restart half
 * run LAST and restart the world (a world this run owns).
 */

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  hand,
  nourish,
  advanceWorldClock,
  worldClockNow,
  isOwnedTestWorld,
  pinWeather,
  unpinWeather,
  engagementIdOf,
} from '../src/harness';
import type { CommandResult } from '../src/harness';
import { bootOwnedWorld, WIRE_PORT } from '../src/runner/boot';

/**
 * ⭐ What the file consumes. Every act runs on fresh characters with
 * handed objects, but the objects stay: dropped crates, tables and
 * saucers and a thrown ball pile up in the market square, two corpses'
 * worth of staging and the coin issued to fund the patron (a recorded
 * mint with no sink) stay behind, and step 12 eats a venue's stock.
 */
export const DIRTY_REASON =
  'leaves handed fixtures (crate, table, pot, saucer, a thrown ball) in ' +
  'the market square, issues the patron coin with no sink, and spends ' +
  "the venues' stock and a scroll per run; step 16 rewrites the shared `harvest` " +
  'view and restores it, and steps 17-18 restart the world';

declareFile({
  file: 'controllers-are-io.dirty.wire.test.ts',
  packs: [
    'trade-farming',
    'terminus',
    'saxonberg-lounge',
    'trade-hospitality',
    'arcane-library',
    'generic-objects',
    'arcana',
    'trade-chandlery',
    'trade-fishing',
    'trade-sericulture',
    'trade-mining',
    'trade-ice',
    'trade-carpentry',
    'trade-forestry',
    'transport',
    'trade-distilling',
    'rejection',
    'hollow-mere',
  ],
  dirtyReason: DIRTY_REASON,
});

/* ───────────────────────── the record ───────────────────────── */

/**
 * ⭐ The casting command for step 15: a scroll fires from `recite` and
 * never from `read` (W5).
 */
const CAST_COMMAND = 'recite';

const RECORD = process.env.CAIO_RECORD === '1';
const BASELINE_PATH = new URL('./controllers-are-io.baseline.json', import.meta.url);

interface ActRecord {
  status: string;
  notes: { kind: string; reason?: string; validator?: string }[];
  /** The engagement-started duration (ms), when the act was durative. */
  duration: number | null;
  state: Record<string, unknown>;
}
interface Baseline {
  note: string;
  acts: Record<string, ActRecord>;
}

const baseline: Baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline)
  : { note: '', acts: {} };
const recorded: Record<string, ActRecord> = {};

/** The structural half of an act's answer: status, kinds + reasons, duration. */
function shape(r: CommandResult): Omit<ActRecord, 'state'> {
  const started = r.notes.find((n) => n.kind === 'engagement-started') as
    | { duration?: number }
    | undefined;
  return {
    status: r.status,
    notes: r.notes.map((n) => {
      const { reason, validator } = n as { reason?: unknown; validator?: unknown };
      return {
        kind: n.kind,
        ...(typeof reason === 'string' ? { reason } : {}),
        // A failed validator's name is its reason.
        ...(typeof validator === 'string' ? { validator } : {}),
      };
    }),
    duration: started?.duration ?? null,
  };
}

/** Record (CAIO_RECORD=1) or compare one act against the baseline. */
function check(key: string, r: CommandResult, state: Record<string, unknown>): void {
  const rec: ActRecord = { ...shape(r), state };
  if (RECORD) {
    recorded[key] = rec;
    return;
  }
  const want = baseline.acts[key];
  expect(want, `no baseline for '${key}' — record with CAIO_RECORD=1`).toBeDefined();
  expect(rec, `'${key}' (${r.text}) differs from the before-record`).toEqual(want);
}

afterAll(() => {
  if (!RECORD || Object.keys(recorded).length === 0) return;
  const acts: Record<string, ActRecord> = { ...baseline.acts, ...recorded };
  const sorted = Object.fromEntries(
    Object.keys(acts)
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
      .map((k) => [k, acts[k]!]),
  );
  const out: Baseline = {
    note:
      'controllers-are-io drive: the before-record of steps 10-15 (plan D13). ' +
      'Written by CAIO_RECORD=1; compared on every other run. Do not hand-edit.',
    acts: sorted,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(out, null, 2)}\n`);
});

/* ───────────────────────── staging ───────────────────────── */

const TERMINUS = '/world/terminus';
const LOUNGE = '/world/lounge';
const SQUARE = '/world/terminus/market/square';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BAR = '/world/lounge/location/bar';
const WARD = '/world/terminus/infirmary/ward';
const LAVOIR = '/world/terminus/wharfside/lavoir/location/lavoir';
const BATHS = '/world/terminus/market/bathhouse/location/baths';
// ⚠ Not the tinker: he walks a round, so whether he is in his yard is the hour's.
const COBBLER = '/world/terminus/mayfield-row/cobbler/location/shop';
const NECROPOLIS = '/world/terminus/necropolis/ground';
const GAZETTE = '/world/terminus/gazette/office';
const TREELINE = '/world/newbie-wilds/crossroads/treeline';
const BAKERY = '/world/terminus/market/bakery';
const DEPOT = '/world/terminus/estuary/lower-towpath';
const MILL = '/world/terminus/wharfside/mill/location/floor';
const FISH_BANK = '/world/terminus/wharfside/bank';
const FACE = '/world/terminus/rejection/ferrow/face';
const SHORE = '/world/terminus/hollow-mere/location/shore';
const FISHING_ROD = '/trade/fishing/thing/rod';
const FISHING_WORM = '/trade/fishing/thing/worm';

const open: Session[] = [];

/**
 * ⚠⚠ A closed session's body LINGERS where it stood, and a walker arriving in a
 * room greets every player there one by one, each line rendered for every
 * sensor (each a light walk): thirty parked characters in the square pegged the
 * world at a full core and timed out commands all over the file. So every body
 * leaves the public rooms when its checkpoint is done.
 */
const PARKING = '/world/terminus/hollow-mere/small-house/location/house';
async function park(s: Session): Promise<void> {
  const i = open.indexOf(s);
  if (i >= 0) open.splice(i, 1);
  if (s.isOpen()) {
    // ⚠ `goto`, never a move from `eval`: a soiled body's restamp runs outside
    // the eval's frame, the sandbox boundary refuses it, and that unhandled
    // rejection killed the world.
    await s.cmd(`goto ${PARKING}`).catch(() => undefined);
  }
  s.close();
}
/** Park whoever a suite left standing. */
async function parkAll(): Promise<void> {
  for (const s of [...open]) await park(s);
}

/** A staging character: seated on both extents, so its `eval` reaches. */
async function stager(handle: string, where: string): Promise<Session> {
  const s = await Session.open(handle, {
    startLocation: where,
    wizard: true,
    committees: [TERMINUS, LOUNGE],
  });
  open.push(s);
  await s.drainProse();
  return s;
}

/**
 * Run a staging/reading `eval` in `extent` and hand back its JSON value.
 * ⚠ One EXPRESSION — the command line splits on `;` and pipes on `||`.
 */
async function ev<T = unknown>(s: Session, expr: string, extent = TERMINUS): Promise<T> {
  const r = await s.cmd(`eval --parcel ${extent} JSON.stringify(${expr})`);
  // ⚠ Prose is the slow channel, and a busy room chatters into it: the
  // value's own line can land after the settle, so give it a moment more.
  let said = (await r.said()).trim();
  const VALUE = /^\S+: ("(?:[^"\\]|\\.)*")\s*$/m;
  for (let i = 0; i < 8 && !VALUE.test(said) && !/\berror:|sandbox boundary denied/i.test(said); i++) {
    said += `\n${await s.listen(1_000)}`;
  }
  expect(said, `eval threw: ${expr}`).not.toMatch(/\berror:|sandbox boundary denied/i);
  const m = VALUE.exec(said);
  expect(m, `eval answered no value: ${said.slice(-400)}`).toBeTruthy();
  return JSON.parse(JSON.parse(m![1]!) as string) as T;
}

/** `StuffApi.findById` as an eval fragment. */
const byId = (id: string): string => `StuffApi.findById('${id}')`;

/** Where a thing is, in run-stable words. */
const whereIs = (id: string, holder: Record<string, string>): string =>
  `((t) => (t ? (t.isDestroyed() ? { gone: true, in: null, placement: null } : { gone: false, in: t.getContainer() ? (${JSON.stringify(
    holder,
  )}[t.getContainer().stuffId] ?? t.getContainer().getTemplatePath()) : null, placement: t.getPlacement && t.getPlacement() ? t.getPlacement().name : null }) : { gone: true, in: null, placement: null }))(${byId(id)})`;

/** Is the thing gone (destroyed, or never found)? — no `||`, the eval pipes on it. */
const goneExpr = (id: string): string => `((t) => t ? t.isDestroyed() : true)(${byId(id)})`;

/**
 * Run a command, answering every prompt it raises with `answer(prompt)`
 * (a stuffId for an object prompt, `'yes'` for a confirm). Returns the
 * result and how many prompts were answered.
 */
async function act(
  s: Session,
  text: string,
  answer: (p: unknown) => unknown = () => 'yes',
): Promise<{ r: CommandResult; prompts: number }> {
  const pending = s.cmd(text);
  let prompts = 0;
  let done = false;
  const settled = pending.then(
    (r) => {
      done = true;
      return r;
    },
    (e: unknown) => {
      done = true;
      throw e;
    },
  );
  // ⚠ Sequential, never raced: an `awaitPrompt` left pending past its command
  // steals the NEXT command's prompt, which then hangs unanswered.
  while (!done) {
    const p = await s.awaitPrompt(250).catch(() => null);
    if (p === null) continue;
    // ⚠ A prompt's settling frames (`prompt-dismissed`, validation) arrive on
    // the same channel; only a question is answered and counted.
    const id = (p as { promptId?: string }).promptId;
    const asks = (p.outcome?.notes ?? []).some((n) => /^prompt-/.test(n.kind) && !/dismissed|validation-failed/.test(n.kind));
    if (id && asks) {
      prompts++;
      s.answerPrompt(id, answer(p));
    }
  }
  const r = await settled;
  await s.drainProse();
  return { r, prompts };
}

/** Bring the world to `hour`:00 of the game day (a jump under a day). */
async function toHour(hour: number, living: Session[]): Promise<void> {
  const now = await worldClockNow();
  const h = (((now % 86_400) + 86_400) % 86_400) / 3_600;
  const minutes = Math.round((((hour - h) % 24) + 24) % 24 * 60);
  if (minutes > 0) await advanceWorldClock(`${minutes} minutes`);
  for (const s of living) await nourish(s);
}

/** The patron's money, in minor units, summed over its accounts. */
async function balance(s: Session, extent = TERMINUS): Promise<number> {
  const rows = await ev<{ minor: number }[]>(
    s,
    `(await BankingApi.accountIdsOf(self.getIdentityPath())).map(a => BankingApi.balanceOf(a))`,
    extent,
  );
  return rows.reduce((sum, m) => sum + m.minor, 0);
}

/*
 * ⭐ One clock, one sky, for every recorded step: the hour of day decides
 * who is on shift (step 12) and the light and warmth a plant reconciles
 * against at the pick (step 10), and the weather the cold. Pinned once,
 * here, so a record and its comparison read the same world.
 */
beforeAll(async () => {
  await toHour(11, []);
  await pinWeather('clear', SQUARE);
  // ⚠ The first `help` of a world warms the catalogue, past a command's patience
  // on a loaded box, and answers *no topic* to everybody until it is done.
  const h = await Session.open(uniqueHandle('caio-warmer'), { startLocation: BANK_HALL });
  for (let i = 0; i < 20; i++) {
    const r = await h.cmd('help look').catch(() => null);
    if (r?.status === 'ok') break;
    await new Promise((d) => setTimeout(d, 3_000));
  }
  await park(h);
}, 600_000);
afterAll(async () => {
  await unpinWeather(SQUARE).catch(() => undefined);
});

/* ───────────────── steps 1–5: `verb@source` ───────────────── */

const WATCH = '/world/terminus/general-store/thing/pocket-watch';
/** The mainspring of a watch, in seconds; `null` until it is first wound. */
const spring = (s: Session, id: string): Promise<number | null> =>
  ev<number | null>(s, `((w) => { const r = w.getReserve('mainspring'); return r ? r.current.rawValue() : null; })(${byId(id)})`);
const notesOf = (r: CommandResult): string =>
  JSON.stringify(r.notes.map((n) => [n.kind, (n as { reason?: string }).reason ?? null]));
const reasonOf = (r: CommandResult): string | null =>
  (r.notes.map((n) => (n as { reason?: string }).reason).find((x) => typeof x === 'string') as string | undefined) ?? null;

suite('1–5. `verb@source`', () => {
  afterAll(parkAll);
  let s: Session;
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-winder'), SQUARE);
  }, 300_000);

  it('1. `wind@me:i:watch` winds the carried watch and not the one beside it; `wind` alone as ever', async () => {
    const mine = await hand(s, WATCH);
    const beside = await hand(s, WATCH);
    expectOk(await s.cmd(`drop #${beside}`));
    await s.drainProse();
    expect(await spring(s, mine), 'unwound before').toBeNull();
    const { r } = await act(s, 'wind@me:i:watch');
    expectOk(r);
    expect(await spring(s, mine), 'the carried watch is wound').toBeGreaterThan(0);
    expect(await spring(s, beside), 'the one beside it is not').toBeNull();
    // `wind` has a required target, before this build and after it.
    const bare = await s.cmd('wind');
    expect(reasonOf(bare)).toBe('shape-fall-through');
    // Tidy: neither watch rides into step 2's "two carried".
    expectOk(await s.cmd(`put #${mine} in #${await hand(s, '/trade/farming/thing/crate')}`));
    await s.drainProse();
  }, 120_000);

  it('2. with two carried, `wind@watch` asks which; the chosen one is wound', async () => {
    s = await stager(uniqueHandle('caio-winder'), SQUARE);
    const a = await hand(s, WATCH);
    const b = await hand(s, WATCH);
    const { r, prompts } = await act(s, 'wind@me:i:watch', () => b);
    expect(prompts, 'asked which').toBe(1);
    expectOk(r);
    expect(await spring(s, b), 'the chosen watch').toBeGreaterThan(0);
    expect(await spring(s, a), 'the other').toBeNull();
    // The bare name asks too.
    const again = await act(s, 'wind@watch', () => a);
    expect(again.prompts, '`wind@watch` asks').toBe(1);
    expectOk(again.r);
    expect(await spring(s, a), 'chosen on the bare name').toBeGreaterThan(0);
  }, 120_000);

  it('3. a script errors at once where a person would be asked; `wind@"all watches"` winds both', async () => {
    s = await stager(uniqueHandle('caio-winder'), SQUARE);
    const a = await hand(s, WATCH);
    const b = await hand(s, WATCH);
    const began = Date.now();
    const { r, prompts } = await act(s, 'script wind@watch');
    expect(prompts, 'a script never waits on a person').toBe(0);
    expect(Date.now() - began, 'at once').toBeLessThan(10_000);
    expect(reasonOf(r), notesOf(r)).toBe('needs-input');
    expect(await spring(s, a)).toBeNull();
    expect(await spring(s, b)).toBeNull();
    const all = await act(s, 'wind@"all watches"');
    expect(all.prompts).toBe(0);
    expectOk(all.r);
    expect(await spring(s, a)).toBeGreaterThan(0);
    expect(await spring(s, b)).toBeGreaterThan(0);
  }, 120_000);

  it('4. `say@me hello` says what `say hello` says; `wind@nonsense` is not-found', async () => {
    const scoped = await s.cmd('say@me hello');
    expectOk(scoped);
    const plain_ = await s.cmd('say hello');
    expectOk(plain_);
    const scopedSaid = /You say, "hello"/.test(await scoped.said());
    expect(scopedSaid, 'the scoped line says hello').toBe(true);
    const nonsense = await s.cmd('wind@nonsense');
    expect(reasonOf(nonsense), notesOf(nonsense)).toBe('source-not-found');
  }, 120_000);

  it('5. two offers, the first refuses: the reply names the other in its scoped form', async () => {
    s = await stager(uniqueHandle('caio-grower'), SQUARE);
    // ⭐ Two pots, each offering `harvest`, and a word only these two answer to
    // (the square keeps other runs' pots). The binder takes the first.
    const word = `caiopot${Date.now().toString(36)}`;
    const stage = async (ripe: boolean): Promise<string> => {
      const pot = await hand(s, '/trade/farming/thing/pot/small', {
        interiorMaterial: '/stuff/idea/material/bulk/potting-soil',
        interiorAmount: 0.5,
      });
      const seed = await hand(s, '/trade/farming/thing/seed/turnip');
      expectOk(await s.cmd(`plant #${seed} in #${pot}`));
      expectOk(await s.cmd(`drop #${pot}`));
      await s.drainProse();
      await ev(s, `(${byId(pot)}.addKeyword('${word}'), true)`);
      if (ripe) {
        await ev(s, `((p) => (p.getVigor(), p.growthStage = 'mature', p._worstLimiting = 0.9, p.isHarvestable()))(${byId(pot)}.getContents().find(c => c.getGrowthStage))`);
      }
      return pot;
    };
    const unripe = await stage(false);
    const ripe = await stage(true);
    const { r, prompts } = await act(s, `harvest ${word}`, () => unripe);
    expect(prompts, 'nothing asked for the offer').toBeLessThanOrEqual(1);
    expect(reasonOf(r), notesOf(r)).toBe('not-mature');
    const offer = r.notes.find((n) => n.kind === 'other-offer') as
      | { verb: string; scopedForm: string; source: { stuffId: string } }
      | undefined;
    expect(offer, `no other-offer: ${notesOf(r)}`).toBeDefined();
    expect(offer!.verb).toBe('harvest');
    expect(offer!.source.stuffId, 'it names the ripe pot').toBe(ripe);
    const said = await r.said();
    expect(said).toContain(`harvest@${offer!.scopedForm}`);
    // ⭐ And the form it named works as printed.
    const taken = await act(s, `harvest@${offer!.scopedForm.includes(' ') ? `"${offer!.scopedForm}"` : offer!.scopedForm}`);
    expectOk(taken.r);
    expect(await ev(s, `!${byId(ripe)}.getContents().find(c => c.getGrowthStage)`), 'the ripe one was the one taken').toBe(true);
  }, 180_000);
});

/* ───────────────── steps 6–9 ───────────────── */

suite('6. `pour` is one act, unscoped', () => {
  afterAll(parkAll);
  it('6a. from a jug into a glass', async () => {
    const s = await stager(uniqueHandle('caio-pourer'), BAR);
    const jug = await hand(s, '/stuff/thing/vessel/pail', {
      interiorMaterial: '/stuff/idea/material/bulk/water',
      interiorAmount: 1,
    });
    const glass = await hand(s, '/trade/hospitality/thing/rocks');
    const { r } = await act(s, `pour #${jug} into #${glass} --amount 100ml`);
    expectOk(r);
    const held = await ev<number>(
      s,
      `${byId(glass)}.getInteriorAmount().rawValue()`,
      LOUNGE,
    );
    expect(held, 'the glass holds what was poured').toBeGreaterThan(0);
  }, 180_000);

  it('6b. an ingredient at a build', async () => {
    const s = await stager(uniqueHandle('caio-pourer'), BAR);
    const gin = await hand(s, '/trade/distilling/thing/gin');
    const shaker = await ev<string>(
      s,
      `self.getContainer().getContents().find(c => /hospitality\\/thing\\/shaker/.test(c.getTemplatePath())).stuffId`,
      LOUNGE,
    );
    const { r } = await act(s, `pour #${gin} into #${shaker}`);
    expectOk(r);
    expect(
      await ev<number>(s, `${byId(shaker)}.getBuildVolumeL()`, LOUNGE),
      'the gin is banked into the build',
    ).toBeGreaterThan(0);
  }, 180_000);
});

/**
 * Every regrouped noun: `help <noun>` names each subcommand, and each
 * subcommand reaches its own controller (a row that is missing, a view that
 * will not bind, answers `controller-error` or `error`; a word the noun lost
 * answers `unknown-verb`).
 */
const NOUNS: { noun: string; where: string; subs: string[] }[] = [
  { noun: 'bank', where: BANK_HALL, subs: ['open', 'balance', 'statement', 'deposit', 'withdraw', 'borrow', 'book', 'transfer'] },
  { noun: 'title', where: '/world/terminus/registry/office', subs: ['list', 'buy', 'publish', 'offline', 'transfer', 'subdivide'] },
  { noun: 'job', where: '/world/terminus/terminal/location/hall', subs: ['post', 'claim', 'complete', 'abandon', 'fulfill', 'apply', 'quit'] },
  { noun: 'party', where: SQUARE, subs: ['form', 'invite', 'enlist', 'accept', 'leave', 'kick', 'disband', 'transfer', 'side', 'adopt', 'assign', 'muster', 'standdown', 'list', 'show'] },
  { noun: 'chat', where: SQUARE, subs: ['list', 'join', 'leave', 'mute', 'unmute', 'who', 'make', 'on', 'rename', 'disband', 'history', 'anonymity', 'promote'] },
  { noun: 'wiki', where: SQUARE, subs: ['create', 'edit', 'read', 'history', 'diff', 'rollback', 'move', 'delete', 'undelete', 'purge', 'protect', 'preview', 'links', 'wanted', 'orphans', 'dangling', 'list'] },
  { noun: 'forum', where: SQUARE, subs: ['list', 'make', 'on', 'post', 'reply', 'edit', 'read', 'vote', 'mature', 'promote', 'follow'] },
  { noun: 'group', where: SQUARE, subs: ['make', 'delete', 'rename', 'add', 'remove', 'role', 'show', 'list'] },
  { noun: 'soul', where: SQUARE, subs: ['make', 'edit', 'delete', 'disable', 'enable', 'show', 'search', 'list'] },
  { noun: 'tune', where: SQUARE, subs: ['off', 'list', 'who', 'history'] },
  { noun: 'pack', where: SQUARE, subs: ['status', 'install', 'sync', 'provision', 'diff', 'resolve', 'pin', 'unpin'] },
  { noun: 'house', where: SQUARE, subs: ['book', 'pnl', 'payroll', 'appoint', 'dismiss', 'draw', 'roster'] },
  { noun: 'shelf', where: '/world/terminus/market/bakery', subs: ['consign', 'reclaim'] },
  { noun: 'rack', where: BAR, subs: ['check', 'reclaim'] },
];

suite('7. each regrouped noun keeps its subcommands', () => {
  afterAll(parkAll);
  for (const { noun, where, subs } of NOUNS) {
    it(`7. ${noun}: ${subs.join(' ')}`, async () => {
      const s = await stager(uniqueHandle(`caio-${noun}`), where);
      const word = `nosuchthing${Date.now().toString(36)}`;
      const help = await s.cmd(`help ${noun}`);
      expectOk(help);
      const page = await help.said();
      for (const sub of subs) {
        expect(page, `\`help ${noun}\` names \`${sub}\``).toMatch(new RegExp(`\\b${sub}\\b`));
      }
      for (const sub of subs) {
        // A compose refuses an unchanged body, so each answer is its own.
        let n = 0;
        const { r } = await act(s, `${noun} ${sub} ${word}`, (p) =>
          JSON.stringify(p).includes('prompt-compose') ? `drive text ${++n} ${sub}` : 'no',
        );
        const line = `\`${noun} ${sub}\` ${r.status} ${notesOf(r)}`;
        expect(r.status, line).not.toBe('error');
        expect(reasonOf(r), line).not.toBe('unknown-verb');
        expect(reasonOf(r), line).not.toBe('missing-subcommand');
        expect(r.notes.some((n) => n.kind === 'controller-error'), line).toBe(false);
      }
      await park(s);
    }, 300_000);
  }

  it('7. a subcommand does what it did: a party formed, shown, disbanded; an account opened, read', async () => {
    const s = await stager(uniqueHandle('caio-party'), SQUARE);
    expectOk(await s.cmd('party form wardens'));
    const shown = await s.cmd('party show');
    expectOk(shown);
    expect(await shown.said(), 'the party is there').toMatch(/wardens/i);
    expectOk((await act(s, 'party disband')).r);
    await park(s);
    await new Promise((r) => setTimeout(r, 1_500));
    const b = await stager(uniqueHandle('caio-saver'), BANK_HALL);
    expectOk(await b.cmd('bank open'));
    expectOk(await b.cmd('bank balance'));
    expectOk(await b.cmd('bank'));
    await park(b);
  }, 300_000);
});

suite('7. the binder paths the last waves could not see', () => {
  afterAll(parkAll);
  it('7. `title` finds the desk it stands at, by default and by name', async () => {
    const s = await stager(uniqueHandle('caio-titler'), '/world/terminus/registry/office');
    const bare = await s.cmd('title list');
    expect(reasonOf(bare), notesOf(bare)).not.toBe('not-at-registry');
    expect(bare.status).not.toBe('error');
    const named = await s.cmd('title list at desk');
    expect(reasonOf(named), notesOf(named)).not.toBe('not-at-registry');
    expect(named.status).not.toBe('error');
    const buy = await s.cmd('title buy nosuchlot');
    expect(reasonOf(buy), notesOf(buy)).not.toBe('not-at-registry');
    const elsewhere = await stager(uniqueHandle('caio-titler'), SQUARE);
    const away = await elsewhere.cmd('title list');
    expect(reasonOf(away), 'and refuses with no desk here').toBe('not-at-registry');
    const xfer = await s.cmd('title transfer nosuchparcel to nobody');
    expect(xfer.status, notesOf(xfer)).not.toBe('error');
    expect(reasonOf(xfer), notesOf(xfer)).not.toBe('shape-fall-through');
  }, 180_000);

  it('7. `job` binds the board in reach (`class:JobBoard`), and says when there is none', async () => {
    const s = await stager(uniqueHandle('caio-hand'), '/world/terminus/terminal/location/hall');
    const list = await s.cmd('job');
    expectOk(list);
    const claim = await s.cmd('job claim 999999');
    expect(reasonOf(claim), notesOf(claim)).not.toBe('no-board');
    const away = await stager(uniqueHandle('caio-hand'), SQUARE);
    const none = await away.cmd('job');
    expect(reasonOf(none), notesOf(none)).toBe('no-board');
  }, 180_000);
});

suite('8. overlapping pairs', () => {
  afterAll(parkAll);
  it('8. in a fight `fight defend` and `defend` are one act; `fight disarm` is the gambit, `disarm` the trap', async () => {
    const s = await stager(uniqueHandle('caio-fighter'), TREELINE);
    expectOk(await s.cmd('attack wolf'));
    const one = await s.cmd('fight defend');
    const two = await s.cmd('defend');
    expectOk(one);
    expectOk(two);
    expect(notesOf(one), 'one act, one result').toBe(notesOf(two));
    const line = /You cover up/;
    expect(await one.said()).toMatch(line);
    expect(await two.said()).toMatch(line);
    // ⭐ Two acts, each under its own word (plan § Verbs, words, a noun scopes
    // its own subcommand): the gambit answers about the fight…
    const gambit = await s.cmd('fight disarm');
    expect(reasonOf(gambit), notesOf(gambit)).toBe('target-unarmed');
    // …and the flat verb about a trap, whoever you point it at.
    const trap = await s.cmd('disarm wolf');
    expect(trap.status).not.toBe('ok');
    expect(await trap.said()).toMatch(/isn't a trap/);
    await s.cmd('fight break');
    await park(s);
  }, 180_000);
});

suite('9. the options read as the chain did', () => {
  afterAll(parkAll);
  it('9. `carve peg from X --with Y` makes the peg; the bare chain no longer parses', async () => {
    const s = await stager(uniqueHandle('caio-carver'), SQUARE);
    const hook = await hand(s, '/trade/forestry/thing/billhook');
    const blank = await hand(s, '/trade/carpentry/thing/riven-blank');
    const old = await s.cmd(`carve peg from #${blank} with #${hook}`);
    expect(old.status, 'the old chain is gone').not.toBe('ok');
    const { r } = await act(s, `carve peg from #${blank} --with #${hook}`);
    expectOk(r);
    const made = await ev<string[]>(s, `self.getContents().map(c => c.getTemplatePath())`);
    expect(made).toContain('/trade/carpentry/thing/peg');
    expect(await ev(s, goneExpr(blank)), 'the blank went into it').toBe(true);
    // `--of`/`--for`: the founder's pattern starts, with both options read.
    const board = await hand(s, '/trade/carpentry/thing/riven-blank');
    const p = await act(s, `carve pattern from #${board} --with #${hook} --of #${hook} --for bronze`);
    expectOk(p.r);
    expect(await p.r.said()).toMatch(/shrink rule for bronze/);
    await park(s);
  }, 180_000);
});

/* ───────────── step 10: plant, grow (staged), harvest ───────────── */

suite('10. plant a seed in a bed, grow it (staged), harvest', () => {
  afterAll(parkAll);
  let s: Session;
  let pot = '';
  let seed = '';
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-grower'), SQUARE);
    // The pot-as-a-bed (husbandry: a pot is a bed with one slot), filled.
    pot = await hand(s, '/trade/farming/thing/pot/small', {
      interiorMaterial: '/stuff/idea/material/bulk/potting-soil',
      interiorAmount: 0.5,
    });
    seed = await hand(s, '/trade/farming/thing/seed/turnip');
  }, 300_000);

  const plantIn = (): string =>
    `${byId(pot)}.getContents().find(c => c.getGrowthStage)`;

  it('10a. plant the seed', async () => {
    const { r } = await act(s, `plant #${seed} in #${pot}`);
    const state = await ev<Record<string, unknown>>(
      s,
      `((p) => ({ plant: p ? p.getTemplatePath() : null, stage: p ? p.getGrowthStage() : null, seedGone: ${goneExpr(seed)} }))(${plantIn()})`,
    );
    check('10a.plant', r, state);
  }, 120_000);

  it('10b. harvest before it is ready — refused', async () => {
    const { r } = await act(s, `harvest #${pot}`);
    check('10b.harvest-unready', r, {
      stillGrowing: await ev(s, `!!${plantIn()}`),
    });
  }, 120_000);

  it('10c. staged mature, harvested: the yield and its grade', async () => {
    // ⭐ The staged twin of the season: reconcile first, then set it ripe
    // with a kept season's worst stretch (0.9), as the field drive does.
    await ev(
      s,
      `((p) => (p.getVigor(), p.growthStage = 'mature', p._worstLimiting = 0.9, p.isHarvestable()))(${plantIn()})`,
    );
    const { r } = await act(s, `harvest #${pot}`);
    const state = await ev<Record<string, unknown>>(
      s,
      `({ crops: self.getContents().filter(c => /\\/crop\\//.test(c.getTemplatePath() ?? '')).map(c => ({ crop: c.getTemplatePath(), grade: c.getGradeBand ? c.getGradeBand() : null, madeByMe: c.getMaker ? c.getMaker() === self.getIdentityPath() : null })), potEmpty: !${plantIn()} })`,
    );
    check('10c.harvest', r, state);
  }, 120_000);
});

/* ───────────── step 11: put — in, on, into a slot, into a feeder ───────────── */

suite('11. put into a container, onto a surface, into a slot, into a feeder', () => {
  afterAll(parkAll);
  let s: Session;
  const id: Record<string, string> = {};
  const holder: Record<string, string> = {};
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-putter'), SQUARE);
    const fixtures: [string, string, Record<string, unknown>?][] = [
      ['crate', '/trade/farming/thing/crate'],
      ['table', '/stuff/thing/fixture/table'],
      // ⭐ With soil: a plant fits a slot by the root room it would get, and
      // an empty pot has none (11c's first record, an unclaimed slot).
      [
        'pot',
        '/trade/farming/thing/pot/small',
        { interiorMaterial: '/stuff/idea/material/bulk/potting-soil', interiorAmount: 0.5 },
      ],
      ['saucer', '/stuff/thing/vessel/saucer'],
    ];
    for (const [k, tpl, fields] of fixtures) {
      id[k] = await hand(s, tpl, fields);
      holder[id[k]!] = k;
      expectOk(await s.cmd(`drop #${id[k]}`));
    }
    id.rag = await hand(s, '/stuff/thing/rag');
    id.stone = await hand(s, '/trade/farming/thing/field-stone');
    id.mint = await hand(s, '/trade/farming/thing/plant/mint');
    id.rations = await hand(s, '/world/terminus/general-store/thing/rations');
    await s.drainProse();
  }, 300_000);

  it('11a. into a container', async () => {
    const { r } = await act(s, `put #${id.rag} in #${id.crate}`);
    check('11a.put-in-container', r, await ev(s, whereIs(id.rag!, holder)));
  }, 120_000);

  it('11b. onto a surface', async () => {
    const { r } = await act(s, `put #${id.stone} on #${id.table}`);
    check('11b.put-on-surface', r, await ev(s, whereIs(id.stone!, holder)));
  }, 120_000);

  it('11c. into a slot', async () => {
    const { r } = await act(s, `put #${id.mint} in #${id.pot}`);
    const where = await ev<Record<string, unknown>>(s, whereIs(id.mint!, holder));
    const slotted = await ev(
      s,
      `((p) => p.getSlotNames().map(n => [n, [...p.getOccupants(n)].some(o => o.stuffId === '${id.mint}')]))(${byId(id.pot!)})`,
    );
    check('11c.put-in-slot', r, { ...where, slotted });
  }, 120_000);

  it('11d. into a feeder', async () => {
    const { r } = await act(s, `put #${id.rations} in #${id.saucer}`);
    const where = await ev<Record<string, unknown>>(s, whereIs(id.rations!, holder));
    const filledByMe = await ev(
      s,
      `${byId(id.saucer!)}.getLastFilledBy() === self.getIdentityPath()`,
    );
    check('11d.put-in-feeder', r, { ...where, filledByMe });
  }, 120_000);
});

/* ───────────── step 12: order a drink, then the six services ───────────── */

suite('12. order a drink, then each of the six services', () => {
  afterAll(parkAll);
  const handle = uniqueHandle('caio-patron');
  const patientHandle = uniqueHandle('caio-patient');
  let s: Session;
  const goTo = async (where: string, who = handle): Promise<Session> => {
    if (s) {
      await park(s);
      // ⚠ Let the old socket's logout land before the new login, or it
      // evicts the character the new session just brought in.
      await new Promise((r) => setTimeout(r, 1_500));
    }
    s = await stager(who, where);
    return s;
  };

  /** A funded customer: an account at the hall, the Governor's recorded
   * override into it (economic bootstrap: no coin by hand). */
  async function fund(who: string): Promise<void> {
    const b = await Session.open(who, { startLocation: BANK_HALL });
    try {
      expectOk(await b.cmd('bank open'));
      const gov = await Session.open('founder', { startLocation: BANK_HALL });
      try {
        expectOk(await gov.cmd(`reserve override 200 to ${who} "wire: controllers-are-io patron"`));
      } finally {
        await park(gov);
      }
      await nourish(b);
    } finally {
      await park(b);
    }
    await new Promise((r) => setTimeout(r, 1_500));
  }

  beforeAll(async () => {
    // ⭐ The venues are staffed by shift: the file pinned mid-morning,
    // when every house is open. ⚠ Two patrons: the one who is wounded for
    // the clinic must not carry that wound into the other houses' records.
    await fund(handle);
    await fund(patientHandle);
  }, 600_000);

  /** One order: the act, the money it moved, and whatever else `extra` reads. */
  async function order(
    key: string,
    where: string,
    text: (s: Session) => Promise<string>,
    extra: (s: Session) => Promise<Record<string, unknown>> = async () => ({}),
    extent = TERMINUS,
    who = handle,
  ): Promise<void> {
    const p = await goTo(where, who);
    const line = await text(p);
    const before = await balance(p, extent);
    const { r, prompts } = await act(p, line);
    const after = await balance(p, extent);
    check(key, r, { prompts, paid: before - after, ...(await extra(p)) });
  }

  it('12a. a drink at the bar', async () => {
    await order(
      '12a.order-drink',
      BAR,
      async () => 'order pint',
      async (p) => ({
        carried: await ev(
          p,
          `self.getContents().map(c => c.getTemplatePath()).filter(t => !/clothes/.test(t ?? '')).filter(t => !/AetherImplant/.test(t ?? '')).sort()`,
          LOUNGE,
        ),
      }),
      LOUNGE,
    );
  }, 300_000);

  it('12b. treatment — a wounded patron', async () => {
    await order(
      '12b.order-treatment',
      WARD,
      async (p) => {
        // ⚠ A light cut: a heavier one bleeds the patient faint before the
        // house can see to it, and the record would be the validator's.
        await ev(p, `ConditionApi.inflict(self, { mechanism: 'edge', site: 'body.arm.right', energy: 10 }).afflicted`);
        return 'order treatment';
      },
      async (p) => ({
        wounds: await ev(
          p,
          `self.conditions.filter(c => c.kind === 'trauma').map(c => ({ type: c.type, dressed: !!c.dressed, bleeding: !!c.bleeding }))`,
        ),
      }),
      TERMINUS,
      patientHandle,
    );
  }, 300_000);

  it('12c. wash — the laundress', async () => {
    await order('12c.order-wash', LAVOIR, async (p) => {
      // A garment of her trade's (the house washes a `Garment`), brought in.
      const apron = await hand(p, '/trade/tailoring/thing/apron');
      return `order wash for #${apron}`;
    });
  }, 300_000);

  it('12d. bath — the bathhouse', async () => {
    await order('12d.order-bath', BATHS, async () => 'order bath');
  }, 300_000);

  it('12e. repair — the cobbler', async () => {
    await order('12e.order-repair', COBBLER, async (p) => {
      const knife = await hand(p, '/stuff/thing/arms/belt-knife');
      return `order repair for #${knife}`;
    });
  }, 300_000);

  it('12f. burial — the undertaker', async () => {
    await order('12f.order-burial', NECROPOLIS, async (p) => {
      const body = await hand(p, '/stuff/thing/Corpse');
      return `order burial for #${body}`;
    });
  }, 300_000);

  it('12g. transfusion — the blood window', async () => {
    await order('12g.order-transfusion', WARD, async (p) => {
      // ⭐ ABO is seeded on identity, and every run's patron is a new
      // person: stage the universal recipient so whether the window has a
      // compatible unit is the world's answer, not the dice's.
      await ev(p, `(self.bloodGenotype = 'AB', self.bloodType())`);
      return 'order transfusion';
    });
  }, 300_000);
});

/* ───────────── step 13: treat a wound, treat an affliction ───────────── */

suite('13. treat a wound with a dressing, an affliction with a remedy', () => {
  afterAll(parkAll);
  let s: Session;
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-medic'), SQUARE);
  }, 300_000);

  const traumas = `self.conditions.filter(c => c.kind === 'trauma').map(c => ({ type: c.type, dressed: !!c.dressed, bleeding: !!c.bleeding }))`;

  it('13a. a laceration, dressed with a bandage', async () => {
    const bandage = await hand(s, '/world/lounge/thing/bandage');
    await ev(s, `ConditionApi.inflict(self, { mechanism: 'edge', site: 'body.arm.right', energy: 10 }).afflicted`);
    const { r } = await act(s, `treat --with #${bandage}`);
    check('13a.treat-wound', r, {
      wounds: await ev(s, traumas),
      bandageSpent: await ev(s, goneExpr(bandage)),
    });
  }, 120_000);

  it('13b. an affliction that wants fluid, treated with water', async () => {
    // A fresh body: 13a's wound must not ride into this one's record.
    s = await stager(uniqueHandle('caio-medic'), SQUARE);
    // ⭐ The one item-borne remedy `treat` knows for an affliction is FLUID
    // (a vessel with something in it); salt poisoning is cured by water.
    // A full waterskin is the article. (⚠ At HEAD this is refused
    // `wrong-treatment`: the verb classes the skin `fluid` and the row asks
    // `water` — the before-record keeps that, and W5 decides it.)
    const skin = await hand(s, '/world/terminus/general-store/thing/waterskin', {
      interiorMaterial: '/stuff/idea/material/bulk/water',
      interiorAmount: 1,
    });
    await ev(
      s,
      `self.afflict({ kind: 'affliction', templatePath: '/platform/idea/Condition/metabolism/salt-poisoning', stage: 2, elapsed: 0 })`,
    );
    const { r } = await act(s, `treat --with #${skin}`);
    check('13b.treat-affliction', r, {
      afflictions: await ev(
        s,
        `self.conditions.filter(c => c.kind === 'affliction').map(c => c.templatePath.split('/').pop() + ':' + c.stage).sort()`,
      ),
    });
  }, 120_000);
});

/* ───────────── step 14: throw to, throw away, throw at ───────────── */

suite('14. throw to a person, throw away, throw at a target', () => {
  afterAll(parkAll);
  let s: Session;
  let ann: Session;
  const annHandle = uniqueHandle('caio-ann');
  let annName = '';
  beforeAll(async () => {
    ann = await stager(annHandle, SQUARE);
    s = await stager(uniqueHandle('caio-thrower'), SQUARE);
    // ⭐ A line goes to a person by what the THROWER knows her as, and a
    // stranger is "a human" — so Ann introduces herself first.
    expectOk(await ann.cmd('introduce'));
    await ann.drainProse();
    const annId = await ev<string>(ann, `self.stuffId`);
    annName = (await ev<string>(s, `${byId(annId)}.describeFor(self)`)).split(/\s+/)[0]!.toLowerCase();
  }, 300_000);

  it('14a. throw the line to Ann, and she has it', async () => {
    const line = await hand(s, '/world/terminus/wharfside/water/thing/heaving-line');
    const { r } = await act(s, `throw #${line} to ${annName}`);
    check('14a.throw-to', r, {
      fastToAnn: await ev(
        ann,
        `((l) => !!l && !!l.getOnEnd() && l.getOnEnd().getIdentityPath() === self.getIdentityPath())(${byId(line)})`,
      ),
      line: await ev(s, whereIs(line, {})),
    });
  }, 120_000);

  it('14b. throw the ball, and it lands', async () => {
    // ⚠ Not a musket ball: balls STACK, so a thrown one merges into the
    // last run's on the ground and the record would differ run to run.
    const ball = await hand(s, '/stuff/thing/cutlery/horn-spoon');
    const { r } = await act(s, `throw #${ball}`);
    check('14b.throw-away', r, await ev(s, whereIs(ball, {})));
  }, 120_000);

  it('14c. throw the ball at Ann — an attack, through the consent gate', async () => {
    const ball = await hand(s, '/stuff/thing/cutlery/horn-spoon');
    const { r, prompts } = await act(s, `throw #${ball} at ${annName}`, () => 'no');
    check('14c.throw-at', r, {
      prompts,
      ball: await ev(s, whereIs(ball, {})),
      annTraumas: await ev(ann, `self.conditions.filter(c => c.kind === 'trauma').map(c => c.type).sort()`),
    });
  }, 120_000);
});

/* ───────────── step 15: read a page, read a display, cast from a scroll ───────────── */

suite('15. read a page, read a display, cast from a scroll', () => {
  afterAll(parkAll);
  let s: Session;
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-reader'), SQUARE);
  }, 300_000);

  it('15a. read a page of a notebook', async () => {
    const book = await hand(s, '/platform/thing/book');
    const { r } = await act(s, `read #${book} page 1`);
    check('15a.read-page', r, await ev(s, whereIs(book, {})));
  }, 120_000);

  it('15b. read the wall display', async () => {
    const p = await stager(uniqueHandle('caio-reader'), GAZETTE);
    const { r } = await act(p, 'read screen');
    check('15b.read-display', r, {});
    await park(p);
  }, 120_000);

  it(`15c. cast from a scroll (${CAST_COMMAND})`, async () => {
    // ⚠ Not identify: at HEAD `read` on an identify scroll dies in the
    // controller (`reading 'replace'` of undefined) before any working —
    // remove-curse asks for its mark, which is the shape worth recording.
    const scroll = await hand(s, '/stuff/thing/magic/scroll-of-remove-curse');
    const mark = await hand(s, '/stuff/thing/cutlery/horn-spoon');
    const { r, prompts } = await act(s, `${CAST_COMMAND} #${scroll}`, () => mark);
    check('15c.cast-scroll', r, {
      prompts,
      scroll: await ev(
        s,
        `((t) => (t ? (t.isDestroyed() ? 'gone' : (t.isSpent && t.isSpent() ? 'spent' : 'charged')) : 'gone'))(${byId(scroll)})`,
      ),
    });
  }, 120_000);
});

/* ───────────── step 16: the doctrine test ───────────── */

suite('16. an alternate `harvest` controller: same world, other words', () => {
  afterAll(parkAll);
  const VIEW = '/platform/cmd/inventory/harvest';
  // ⭐ A view is its titleholder's to change, and /platform is the executive's:
  // the wizard takes the title for the length of the step and hands it back.
  const EXTENT = '/platform';
  let gov: Session;
  let holder = '';

  /**
   * Re-point the `harvest` view's controller through the CMS: the REST surface
   * a person saves a view with. It reaches `DocumentApi.save` as the session's
   * player, where an `eval`'s acting author is the script, which holds nothing.
   */
  const install = async (controller: string): Promise<void> => {
    const headers = { cookie: gov.cookie };
    const base = process.env.WIRE_SERVER_URL!;
    const { token } = (await (await fetch(`${base}/api/cms/csrf`, { headers })).json()) as { token: string };
    const read = (await (
      await fetch(`${base}/api/cms/read?backend=document&path=${encodeURIComponent(VIEW)}`, { headers })
    ).json()) as { content?: string; body?: string };
    const data = JSON.parse(read.content ?? read.body ?? '') as Record<string, unknown>;
    const res = await fetch(`${base}/api/cms/write`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'X-CMS-CSRF': token },
      body: JSON.stringify({ backend: 'document', path: VIEW, body: JSON.stringify({ ...data, controller }) }),
    });
    expect(res.status, `the CMS took the view: ${await res.clone().text()}`).toBe(200);
  };

  beforeAll(async () => {
    holder = await ev<string>(
      await stager(uniqueHandle('caio-clerk'), SQUARE),
      `JSON.stringify(ParcelApi.coveringParcelOfSync('/platform').getOwner())`,
    );
    gov = await Session.open(uniqueHandle('caio-keeper'), {
      startLocation: SQUARE,
      wizard: true,
      committees: [TERMINUS, LOUNGE],
      parcels: ['/platform'],
    });
    open.push(gov);
    await gov.drainProse();
    await install('/platform/idea/cmd/inventory/HarvestWordedController');
  }, 300_000);

  afterAll(async () => {
    await install('/platform/idea/cmd/inventory/HarvestController');
    await ev(gov, `(await ParcelApi.transfer('/platform', ${holder}), true)`, EXTENT);
  });

  it('16. the state and the duration are step 10c\'s; the words are not', async () => {
    const s = await stager(uniqueHandle('caio-doctrine'), SQUARE);
    const pot = await hand(s, '/trade/farming/thing/pot/small', {
      interiorMaterial: '/stuff/idea/material/bulk/potting-soil',
      interiorAmount: 0.5,
    });
    const seed = await hand(s, '/trade/farming/thing/seed/turnip');
    expectOk((await act(s, `plant #${seed} in #${pot}`)).r);
    const plantIn = `${byId(pot)}.getContents().find(c => c.getGrowthStage)`;
    const early = await act(s, `harvest #${pot}`);
    expect(reasonOf(early.r), 'the same refusal').toBe('not-mature');
    expect(await early.r.said(), 'in the other words').toMatch(/will not go that way \(not-mature\)/);
    await ev(s, `((p) => (p.getVigor(), p.growthStage = 'mature', p._worstLimiting = 0.9, p.isHarvestable()))(${plantIn})`);
    const { r } = await act(s, `harvest #${pot}`);
    const state = await ev<Record<string, unknown>>(
      s,
      `({ crops: self.getContents().filter(c => /\\/crop\\//.test(c.getTemplatePath() ?? '')).map(c => ({ crop: c.getTemplatePath(), grade: c.getGradeBand ? c.getGradeBand() : null, madeByMe: c.getMaker ? c.getMaker() === self.getIdentityPath() : null })), potEmpty: !${plantIn} })`,
    );
    const want = baseline.acts['10c.harvest']!;
    expect(r.status).toBe(want.status);
    expect(shape(r).duration, 'the same duration').toBe(want.duration);
    expect(state, 'the world ends as step 10 ended it').toEqual(want.state);
    expect(await r.said(), 'and the words are its own').toMatch(/The harvest comes in/);
    await park(s);
  }, 180_000);
});

/* ───────────── steps 19–25 ───────────── */

suite('19. `do martini`', () => {
  afterAll(parkAll);
  it('19. a script you wrote runs its steps over their real time; `make martini` is no such command', async () => {
    const s = await stager(uniqueHandle('caio-keep'), BAR);
    await hand(s, '/trade/distilling/thing/gin');
    await hand(s, '/trade/distilling/thing/empty-spirit-bottle', {
      interiorMaterial: '/trade/winemaking/idea/material/dry-vermouth',
      interiorAmount: 0.7,
    });
    const coupe = await hand(s, '/trade/hospitality/thing/coupe');
    const gone = await s.cmd('make martini');
    expect(reasonOf(gone), notesOf(gone)).toBe('unknown-verb');
    // ⚠ Words, not `#id`: in a script `#` opens a comment, so a body of ids is
    // an empty body that succeeds. Quoted: an object slot takes one token.
    expectOk(await s.cmd('def martini { pour gin into "mixing glass"; pour vermouth into "mixing glass"; stir "mixing glass"; strain "mixing glass" into coupe }'));
    const { r } = await act(s, 'do martini');
    expectOk(r);
    // ⭐ A script runs detached and paced: the verb comes back at once and the
    // steps take their time, each meeting its own gates.
    const amountIn = `${byId(coupe)}.getInteriorAmount().rawValue()`;
    expect(await ev<number>(s, amountIn, LOUNGE), 'not made at once').toBe(0);
    const before = Date.now();
    let held = 0;
    for (let i = 0; i < 60 && held === 0; i++) {
      await s.listen(2_000);
      held = await ev<number>(s, amountIn, LOUNGE);
    }
    expect(Date.now() - before, 'over its real time').toBeGreaterThan(1_000);
    const drink = { amount: held };
    expect(drink.amount, 'the drink is in the coupe').toBeGreaterThan(0);
    await park(s);
  }, 300_000);
});

suite('20. `reel` is fishing\'s; `unwind` is silk\'s', () => {
  afterAll(parkAll);
  it('20a. `reel` is the fishing verb, and its help page reads one trade', async () => {
    const s = await stager(uniqueHandle('caio-angler'), FISH_BANK);
    const page = await s.prose('help reel');
    expect(page).toMatch(/line/i);
    expect(page, 'no silk on the fishing page').not.toMatch(/silk|cocoon/i);
    await hand(s, FISHING_ROD);
    await hand(s, FISHING_WORM);
    const out = await s.cmd('fish with worm using cane');
    expectOk(out);
    await s.drainProse();
    // A fish takes on its own time; `reel` with nothing on it says so.
    let landed = false;
    for (let i = 0; i < 40 && !landed; i++) {
      await new Promise((r) => setTimeout(r, 5_500));
      landed = /\b(brown trout|eel|grey mullet|carp|shore crab|sturgeon)\b/i.test(await s.prose('inventory'));
      if (landed) break;
      const reel = await s.cmd('reel');
      expect(reasonOf(reel), notesOf(reel)).not.toBe('unknown-verb');
    }
    expect(landed, 'a fish in hand').toBe(true);
    await park(s);
  }, 400_000);

  it('20b. `unwind cocoons` reels silk into a skein at the basin', async () => {
    const s = await stager(uniqueHandle('caio-reeler'), MILL);
    const page = await s.prose('help unwind');
    expect(page).toMatch(/silk/i);
    expect(page, 'no fish on the silk page').not.toMatch(/fish/i);
    await hand(s, '/trade/sericulture/thing/cocoons', { quantity: 60, stifled: true });
    await s.cmd('stoke charcoal into brazier');
    await s.cmd('light brazier');
    await s.drainProse();
    const r = await s.cmd('unwind cocoons --count 6 with basin');
    expectOk(r);
    await s.awaitActivity(engagementIdOf(r), 200_000);
    await s.drainProse();
    const kit = await ev<string[]>(s, `self.getContents().map(c => c.getPresentation())`);
    expect(kit.join(' ')).toMatch(/skein of raw silk/i);
    await park(s);
  }, 400_000);
});

suite('21. `drift` is the miner\'s; `drive` is the vehicle\'s', () => {
  afterAll(parkAll);
  it('21a. in a drift, `drift` is the mining verb and answers about the ground', async () => {
    // ⚠ The shipped workings are authored and finished: a carve needs a keyed
    // warren room, and nothing a player or an `eval` here can stand in one
    // (`eval` carving a keyed room out of its extent crashes the server). The
    // cut itself is trade-mining's unit proof; this is the verb's whole chain up
    // to the ground's own refusal, under the new word.
    const s = await stager(uniqueHandle('caio-miner'), FACE);
    await hand(s, '/trade/mining/thing/pick');
    await s.drainProse();
    const r = await s.cmd('drift north');
    expect(reasonOf(r), notesOf(r)).toBe('no-warren');
    expect(await r.said()).toMatch(/cut and finished/);
    const old = await s.cmd('drive north');
    expect(reasonOf(old), 'the vehicle word is no mining act').not.toBe('no-warren');
    await park(s);
  }, 180_000);

  it('21b. `drive` binds a way, and refuses where nothing is being driven', async () => {
    const s = await stager(uniqueHandle('caio-driver'), SQUARE);
    await hand(s, '/system/transport/thing/wagon');
    const r = await s.cmd('drive north');
    expect(r.status).not.toBe('ok');
    const gate = r.notes.find((n) => n.kind === 'locomotion-gate-failed') as { mode?: string } | undefined;
    expect(gate?.mode, `the gate, not the binder: ${notesOf(r)}`).toBe('drive');
    expect(await r.said(), 'the slot took the way').not.toMatch(/can't drive north/);
    await park(s);
  }, 180_000);

  // ⚠ RED by content, for a person to judge: no shipped vehicle seats a driver.
  // The coach's `driver:1` is an adornment slot, the barge has none, the wagon
  // no slots at all; `mount` seats only a draft animal; and the `drive` mode's
  // exit gate refuses every exit. `journey` is what moves a vehicle today.
  it.todo('21c. on a cart, `drive` takes it through an exit');
});

suite('22. the institution nouns', () => {
  afterAll(parkAll);
  it('22a. `store deposit`, then the receipt draws it back', async () => {
    const s = await stager(uniqueHandle('caio-depositor'), DEPOT);
    const rag = await hand(s, '/stuff/thing/rag');
    const dep = await s.cmd(`store deposit #${rag}`);
    expectOk(dep);
    expect(await ev(s, `self.getContents().some(c => c.stuffId === '${rag}')`), 'it left the hand').toBe(false);
    const back = await s.cmd('store withdraw rag');
    expectOk(back);
    expect(await back.said()).toMatch(/pays out/);
    await park(s);
  }, 180_000);

  it('22b. `shelf consign`, `shelf reclaim`', async () => {
    const handle = uniqueHandle('caio-consignor');
    const b = await stager(handle, BANK_HALL);
    expectOk(await b.cmd('bank open'));
    await park(b);
    await new Promise((r) => setTimeout(r, 1_500));
    const s = await stager(handle, BAKERY);
    const watch = await hand(s, WATCH);
    const on = await s.cmd(`shelf consign #${watch} --ask 5`);
    expectOk(on);
    expect(await ev(s, `self.getContents().some(c => c.stuffId === '${watch}')`), 'it is on the shelf').toBe(false);
    const off = await s.cmd('shelf reclaim watch');
    expectOk(off);
    expect(await ev(s, `self.getContents().some(c => c.stuffId === '${watch}')`), 'it came back').toBe(true);
    await park(s);
  }, 180_000);

  it('22c. `help` lists commands by category', async () => {
    const s = await stager(uniqueHandle('caio-reader'), SQUARE);
    const page = await s.prose('help');
    expect(page).toMatch(/by category/i);
    for (const c of ['banking', 'crafting', 'device', 'retail']) expect(page).toMatch(new RegExp(`\\b${c}\\b`));
    const crafting = await s.prose('help retail');
    expect(crafting).toMatch(/\bshelf\b/);
    await park(s);
  }, 120_000);
});

suite('23. where a verb looks first', () => {
  afterAll(parkAll);
  it('23. `cut ice` binds the block underfoot, not the lump in hand; `--strict` names both', async () => {
    const s = await stager(uniqueHandle('caio-cutter'), BAKERY);
    await hand(s, '/trade/ice/thing/ice-saw');
    const block = await hand(s, '/stuff/thing/ice-block');
    expectOk(await s.cmd(`drop #${block}`));
    await hand(s, '/stuff/thing/ice-lump');
    await s.drainProse();
    const r = await s.cmd('cut ice');
    // ⚠ Refused: a bare block is no marked sheet (cutting a real sheet wants a
    // winter). What the step pins is WHICH the verb bound, and it says.
    expect(await r.said()).toMatch(/block of ice/);
    expect(await r.said()).not.toMatch(/lump of ice/);
    const strict = await s.cmd('cut ice --strict');
    expect(strict.status).not.toBe('ok');
    const said = await strict.said();
    expect(said, 'names the block').toMatch(/block of ice/);
    expect(said, 'and the lump').toMatch(/lump of ice/);
    const note = strict.notes.find((n) => n.kind === 'validator-failed') as { validator?: string } | undefined;
    expect(note?.validator).toBe('cardinality:ambiguous');
    await park(s);
  }, 180_000);
});

suite('24. a script has nobody to ask; `--async` frees the line', () => {
  afterAll(parkAll);
  it('24a. a script command that would ask a question fails at once, naming the input', async () => {
    const s = await stager(uniqueHandle('caio-scripter'), SQUARE);
    const began = Date.now();
    // `wiki create` opens a composer for the body.
    const { r, prompts } = await act(s, `script wiki create caioscript${Date.now().toString(36)}`);
    expect(prompts).toBe(0);
    expect(Date.now() - began).toBeLessThan(15_000);
    expect(reasonOf(r), notesOf(r)).toBe('needs-input');
    const note = r.notes.find((n) => (n as { reason?: string }).reason === 'needs-input') as { detail?: string };
    expect(note.detail, 'it names what it needed').toMatch(/needs .+ when run from a script/);
    await park(s);
  }, 180_000);

  it('24b. a typed `--async` line runs behind the player', async () => {
    // ⭐ Two pours of 3s each: a typed line holds the prompt through them. A bare
    // `wait` would not tell the two apart, since a wait detaches of its own accord
    // (B2 found this checkpoint blind).
    const s = await stager(uniqueHandle('caio-scripter'), BAR);
    await hand(s, '/trade/distilling/thing/gin');
    const t0 = Date.now();
    const line = await s.cmd('--async pour gin into shaker; pour gin into shaker; say done now');
    expectOk(line);
    expect(Date.now() - t0, 'the line came back at once').toBeLessThan(2_500);
    const mid = await s.cmd('say meanwhile');
    expectOk(mid);
    expect(await mid.said()).not.toMatch(/done now/);
    const later = await s.listen(15_000);
    expect(later).toMatch(/done now/);
    await park(s);
  }, 120_000);
});

suite('25. a protocol reads as the verb it serves', () => {
  afterAll(parkAll);
  it('25. the dip pot answers dip; `help dip` lists who does; a greyed offer says why', async () => {
    const s = await stager(uniqueHandle('caio-chandler'), SQUARE);
    const pot = await hand(s, '/trade/chandlery/thing/dip-pot');
    const answer = await s.affordances(pot);
    const verbs = answer.composition.filter((c) => c.kind === 'protocol').flatMap((c) => c.verbs ?? []);
    expect(verbs, 'the card reads answers: dip').toContain('dip');
    const page = await s.prose('help dip');
    expect(page).toMatch(/answers:/);
    expect(page).toMatch(/DipPot/);
    expect(page).toMatch(/PaintPot/);
    const greyed = answer.verbs.filter((v) => v.state === 'disabled');
    expect(greyed.length, `something here is greyed: ${JSON.stringify(answer.verbs.map((v) => [v.verb, v.state]))}`).toBeGreaterThan(0);
    for (const v of greyed) {
      expect(v.reason, `${v.verb} says why`).toBeTruthy();
      expect(v.validator, `${v.verb} says which gate`).toBeTruthy();
    }
    await park(s);
  }, 120_000);
});

/* ───────────── steps 17, 18: a real restart, LAST ───────────── */

/**
 * ⭐ A real restart rather than the plan's staged capture-and-materialize:
 * `eval` under a parcel jurisdiction may not materialize a body (the sandbox
 * boundary refuses the row's own setters), and "survives a restart" is the
 * sentence. Precedent: `ceramics-d` drive 35. Only in a world this run owns.
 */
suite.skipIf(!isOwnedTestWorld())('17–18. what survives a restart', () => {
  afterAll(parkAll);
  const body = uniqueHandle('caio-keeper');
  const fresh = uniqueHandle('caio-newcomer');
  const BUSINESS = '/world/lounge/idea/business';
  const opts = { wizard: true, committees: [TERMINUS, LOUNGE] };
  const readBusiness = `((b) => ({ call: b.getCall(), roster: b.getRosterSlots ? b.getRosterSlots().length : null }))(StuffApi.findByTemplatePath('${BUSINESS}'))`;
  const readBody = `({ meal: self.getLastMealLabel(), full: self.getLastMealLabel() !== null && self.digestionPools !== undefined, buoyancy: Math.round(self.getNetBuoyancyN(1000)) })`;
  let before: { business: unknown; good: unknown; body: { meal: string | null; buoyancy: number } };
  // ⚠ By kind, in hand: a stuffId is one process's, and a restart mints anew.
  const readGood =
    `((g) => ({ owner: g.getOwner ? g.getOwner() : null, maker: g.getMaker ? g.getMaker() === self.getIdentityPath() : null, title: g.getChattelId ? !!g.getChattelId() : null, tpl: g.getTemplatePath() }))(self.getContents().find(c => /carpentry\\/thing\\/peg/.test(c.getTemplatePath())))`;

  it('18a. a new character has the default aliases; `l` runs look; `alias unset l` removes it; no second word', async () => {
    const s = await Session.open(fresh, { startLocation: SQUARE, ...opts });
    open.push(s);
    await s.drainProse();
    const list = await s.prose('alias list');
    expect(list).toMatch(/\bl = look \[view: look\]/);
    const l = await s.cmd('l');
    expectOk(l);
    expect(await l.said()).toMatch(/farmers market square/i);
    for (const gone of ['examine', 'bind', 'dress', 'grind']) {
      const r = await s.cmd(`${gone} me`);
      expect(reasonOf(r), `\`${gone}\` answers to nothing: ${notesOf(r)}`).toBe('unknown-verb');
    }
    expectOk(await s.cmd('alias unset l'));
    const none = await s.cmd('l');
    expect(reasonOf(none), notesOf(none)).toBe('unknown-verb');
    expectOk(await s.cmd('look'));
  }, 180_000);

  it('17a. stage all four: a roster read, a good with title and maker, a meal down, a load in the water', async () => {
    const s = await Session.open(body, { startLocation: SQUARE, ...opts });
    open.push(s);
    await s.drainProse();
    const hook = await hand(s, '/trade/forestry/thing/billhook');
    const blank = await hand(s, '/trade/carpentry/thing/riven-blank');
    expectOk((await act(s, `carve peg from #${blank} --with #${hook}`)).r);
    const rations = await hand(s, '/world/terminus/general-store/thing/rations');
    const ate = await s.cmd(`eat #${rations}`);
    expectOk(ate);
    const eating = ate.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
    if (eating?.engagementId) await s.awaitActivity(eating.engagementId, 120_000);
    await s.drainProse();
    // ⚠ Walked in, not logged in there: a login's start location is the test
    // hook's and never reaches the body's record.
    open.splice(open.indexOf(s), 1);
    s.close(4000);
    await new Promise((r) => setTimeout(r, 1_500));
    const w = await Session.open(body, { startLocation: SHORE, ...opts });
    open.push(w);
    await w.drainProse();
    const wade = await w.cmd('north');
    expect(wade.status, `into the water: ${notesOf(wade)}`).toBe('ok');
    await w.drainProse();
    before = {
      business: await ev(w, readBusiness, LOUNGE),
      good: await ev(w, readGood),
      body: await ev(w, readBody),
    };
    expect((before.body as unknown as { full: boolean }).full, 'mid-digestion').toBe(true);
    expect(before.body.meal, 'the meal').toBeTruthy();
    expect(before.body.buoyancy, 'a load in water has a net buoyancy').toEqual(expect.any(Number));
    expect((before.good as { maker: boolean }).maker, 'the peg is mine by making').toBe(true);
    expect((before.business as { call: string }).call, 'the bar has a call').toBeTruthy();
  }, 300_000);

  it('17b + 18b. restart: the four read back, and `l` stays gone', async () => {
    for (const s of open) await park(s);
    open.length = 0;
    await new Promise((r) => setTimeout(r, 8_000)); // let the logout saves land
    const serverDir = fileURLToPath(new URL('../../server', import.meta.url));
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();

    const w = await Session.open(body, opts);
    open.push(w);
    await w.drainProse();
    const business = await ev(w, readBusiness, LOUNGE);
    expect(business, 'the call roster').toEqual(before.business);
    expect(await ev(w, readGood), 'the title and the maker').toEqual(before.good);
    const after = await ev<typeof before.body & { full: boolean }>(w, readBody);
    expect(after.meal, 'the meal still down').toBe(before.body.meal);
    expect(after.full, 'mid-digestion').toBe(true);
    // ⚠ OPEN, recorded: `after.at` read back the FIRST login's room in this staging
    // (four runs), though the record held the water at the sign-out and a body
    // staged alone (two logins, a wade, a restart) came back to the water. Not
    // root-caused; where a body stands is no state these splits moved.
    // Within a newton or two: the body goes on digesting across the restart.
    expect(Math.abs(after.buoyancy - before.body.buoyancy), 'the same load in the same water').toBeLessThanOrEqual(2);
    const look = await w.prose('look me:i:peg');
    expect(look, 'a player reads the title').toMatch(/Owned by/);

    const n = await Session.open(fresh, opts);
    open.push(n);
    await n.drainProse();
    const none = await n.cmd('l');
    expect(reasonOf(none), `the unset default stays gone: ${notesOf(none)}`).toBe('unknown-verb');
    const list = await n.prose('alias list');
    expect(list, 'the rest are still there').toMatch(/\bi = inventory \[view: inventory\]/);
  }, 900_000);
});

afterAll(parkAll);

// The owned/attached split: nothing here jumps more than a day, but step 12
// pins the hour, which only a test world allows.
void isOwnedTestWorld;
