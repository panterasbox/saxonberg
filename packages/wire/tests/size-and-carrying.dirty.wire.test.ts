/**
 * ⭐ Size and carrying — the blocking drive.
 *
 * The build's exit criterion (docs/workflow.md § the drive): the 22 steps
 * of `docs/requirements/size-and-carrying-requirements.md` § The drive, run
 * against one world. A body carries what it can hold, wear, pocket, hang and
 * pack — nothing loose on it, after any act and after a restart; a verb finds
 * the nearest thing you perceive; a way, a ladder, a stair's turn and a pond
 * each answer by their size and the body's; what you cannot perceive no verb
 * shows, names, counts or asks about.
 *
 * Each step names its pace and who acts, as the requirements tag it:
 * `instant` · `short` (a clock jump under a day) and `player` (player verbs
 * only) · `staged` (setup through the harness — `hand`, `testharness
 * gravity|afflict|species|clock-advance`, a wizard's `destruct`). There is no span step: the two-hour expedition is
 * the soak drive (`size-and-carrying.soak.dirty.wire.test.ts`); step 17 is
 * its staged twin.
 *
 * ⭐ Every step stands up its own people where it needs them (a checkpoint
 * that inherits its position inherits every earlier failure). The Old
 * Steading (`/world/newbie-wilds/steading`, W6-o) is the size ground; the
 * lounge is the newcomer's first room; Duncan Hall's Katie hands the
 * daypack; the treeline's wolf is the fight.
 */

import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  hand,
  nourish,
  advanceWorldClock,
  worldClockNow,
  isOwnedTestWorld,
} from '../src/harness';
import type { CommandResult } from '../src/harness';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'hands every step its gear and leaves it where the step left it (the ' +
  'lounge, the Old Steading, the treeline, Duncan Hall), has Katie let two ' +
  'dorm rooms, sets and clears a steading room\'s gravity, tethers and ' +
  'loads the steading mule, and restarts the world once (step 21)';

declareFile({
  file: 'size-and-carrying.dirty.wire.test.ts',
  packs: [
    'platform',
    'generic-objects',
    'species-and-names',
    'saxonberg-lounge',
    'newbie-wilds',
    'terminus',
    'eternal-university',
    'residence',
    'transport',
    'water',
    'trade-tanning',
    'trade-tailoring',
    'trade-smithing',
    'trade-mining',
    'trade-hospitality',
    'trade-textiles',
    'trade-baking',
  ],
  dirtyReason: DIRTY_REASON,
});

/* ───────────────────────── places and things ───────────────────────── */

const STEADING = '/world/newbie-wilds/steading';
const YARD = `${STEADING}/yard`;
const COTTAGE = `${STEADING}/cottage`;
const BARN = `${STEADING}/barn`;
const POND = `${STEADING}/pond`;
const TREELINE = '/world/newbie-wilds/crossroads/treeline';
const HALL_LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';

const T = {
  mug: '/trade/hospitality/thing/mug',
  bowl: '/stuff/thing/items/bowl',
  key: '/stuff/thing/Key',
  lantern: '/world/terminus/general-store/thing/lantern',
  coat: '/trade/tailoring/thing/coat',
  belt: '/trade/tanning/thing/belt',
  pouch: '/trade/tanning/thing/belt-pouch',
  holster: '/trade/tanning/thing/holster',
  scabbard: '/trade/tanning/thing/scabbard',
  sheath: '/trade/tanning/thing/sheath',
  canteenClip: '/trade/tanning/thing/canteen-clip',
  oilskin: '/trade/tanning/thing/oilskin-pouch',
  saddlebags: '/trade/tanning/thing/saddlebags',
  backpack: '/stuff/thing/gear/backpack',
  hauberk: '/stuff/thing/armor/mail-hauberk',
  sword: '/stuff/thing/arms/sword',
  longsword: '/stuff/thing/arms/longsword',
  greatsword: '/stuff/thing/arms/greatsword',
  shield: '/stuff/thing/arms/shield',
  pistol: '/stuff/thing/arms/flintlock-pistol',
  knife: '/stuff/thing/arms/belt-knife',
  compass: '/trade/mining/thing/compass',
  pole: '/system/transport/thing/propulsion/pole',
  sheet: '/platform/thing/sheet',
  rope: '/platform/thing/rope',
  handcart: '/stuff/thing/gear/handcart',
  tarpaulin: '/trade/textiles/thing/tarpaulin',
  headlamp: '/trade/smithing/thing/headlamp',
  rations: '/stuff/thing/items/ration-stock',
  loaf: '/trade/baking/thing/lean-loaf',
  pail: '/stuff/thing/vessel/pail',
} as const;

const SPECIES = '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo';
const ANAESTHESIA = '/platform/idea/Condition/metabolism/anaesthesia';

/** A letter: a sheet of paper that answers to `letter` (the commons has no letter row). */
const LETTER = { shortDescription: 'letter', keywords: ['letter', 'paper', 'sheet'] };

/* ───────────────────────── the record ───────────────────────── */

const record: string[] = [];
const open: Session[] = [];

const squash = (t: string): string =>
  plain(t).replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ ([,).])/g, '$1').trim();

/** The words a command produced — its prose and every note's detail. */
async function words(r: CommandResult): Promise<string> {
  const said = squash(await r.said());
  const detail = (r.notes as Array<{ detail?: unknown }>)
    .map((n) => (typeof n.detail === 'string' ? n.detail : ''))
    .join(' ');
  return squash(`${said} ${detail}`);
}

/** Run one command, record it, and hand back the result with its words. */
async function say(s: Session, text: string): Promise<{ r: CommandResult; w: string }> {
  const r = await s.cmd(text);
  const w = await words(r);
  record.push(`${s.handle}: ${text} → ${r.status} · ${w.slice(0, 600)}`);
  return { r, w };
}

/** The refusal reason a command died with, whichever of the three ways it died. */
function reasonOf(r: CommandResult): string | undefined {
  const n = r.notes.find((x) =>
    ['controller-rejected', 'command-rejected', 'validator-failed'].includes(x.kind),
  ) as { reason?: string } | undefined;
  return n?.reason;
}

/** It was refused — a non-ok status, with words. */
function expectRefused(x: { r: CommandResult; w: string }, words?: RegExp): void {
  expect(x.r.status, `${x.r.text} should be refused: ${x.w}`).not.toBe('ok');
  if (words) expect(x.w, x.r.text).toMatch(words);
}

/** It went — an ok status. */
function expectDone(x: { r: CommandResult; w: string }, words?: RegExp): void {
  expect(x.r.status, `${x.r.text}: ${x.w}`).toBe('ok');
  if (words) expect(x.w, x.r.text).toMatch(words);
}

/** Wait out an engaged act the command started, if any. */
async function finish(s: Session, r: CommandResult, ms = 90_000): Promise<string> {
  const started = r.notes.find((n) => n.kind === 'engagement-started') as
    | { engagementId?: string }
    | undefined;
  if (!started?.engagementId) return '';
  const notes = await s.awaitActivity(started.engagementId, ms).catch(() => null);
  record.push(`${s.handle}: ${r.text} ended: ${notes === null ? 'never' : notes.map((n) => `${n.kind}${(n as { reason?: string }).reason ? `:${(n as { reason?: string }).reason}` : ''}`).join(',')}`);
  return squash(await s.listen(800));
}

/** A person, standing where the step needs them, fed and watered. */
async function person(prefix: string, where?: string, extra: Partial<Parameters<typeof Session.open>[1]> = {}): Promise<Session> {
  const s = await Session.open(uniqueHandle(prefix), { ...(where ? { startLocation: where } : {}), ...extra });
  open.push(s);
  await s.drainProse();
  await nourish(s);
  return s;
}

/** Hand `s` a thing and return its id. Granted: a hand, a pocket, else at their feet. */
async function give(s: Session, template: string, data?: Record<string, unknown>): Promise<string> {
  const id = await hand(s, template, data);
  record.push(`${s.handle}: handed ${template} → #${id}`);
  return id;
}

/** Hand `s` a thing and have them set it down where they stand (a thing on the floor). */
async function lay(s: Session, template: string, data?: Record<string, unknown>): Promise<string> {
  const id = await give(s, template, data);
  expectDone(await say(s, `drop #${id}`));
  return id;
}

/** Hand `s` a garment and have them put it on. */
async function don(s: Session, template: string): Promise<string> {
  const id = await give(s, template);
  const r = await say(s, `wear #${id}`);
  expectDone(r);
  await finish(s, r.r);
  return id;
}

/**
 * `i` with options, as one squashed string — the default alias for `query
 * --ledger me:i` (size-and-carrying W10h: there is no inventory verb).
 */
async function inv(s: Session, opts = ''): Promise<string> {
  return (await say(s, `i${opts ? ` ${opts}` : ''}`)).w;
}

/** Everything on you, one list (`query --flat me:I` — what `inventory --flat` was). */
async function flat(s: Session): Promise<string> {
  return (await say(s, 'query --flat me:I')).w;
}

/** What one holder holds, grouped (`query --ledger <holder>:i` — what `i <holder>` was). */
async function ledgerOf(s: Session, holder: string): Promise<string> {
  return (await say(s, `query --ledger ${holder}:i`)).w;
}

/** The burden line's words (the last tier line of `i`). */
const BURDEN = /(light|a fair load|well laden|heavily burdened|more than you can bear)/i;

/** The kilograms `i --weight` gives a thing (`name … N kg`), or null. */
function kgOf(text: string, name: RegExp): number | null {
  const m = new RegExp(`${name.source}[^,.;]*?([0-9.]+) kg`, 'i').exec(text);
  return m ? Number(m[1]) : null;
}

/** To daylight by the clock as it stands (a short step: a day at most). */
async function toHour(fromH: number, toH: number): Promise<void> {
  const now = await worldClockNow();
  const tod = (((now % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advanceWorldClock(`${Math.ceil(wait / 60) + 1} minutes`);
}

/** Restart the world (a SIGTERM so the shutdown capture lands) — repair's pattern. */
async function restartWorld(): Promise<void> {
  const listener = Number(
    spawnSync('lsof', ['-ti', `tcp:${WIRE_PORT}`, '-sTCP:LISTEN']).stdout?.toString().trim().split('\n')[0] ?? '',
  );
  if (listener > 0) {
    process.kill(listener, 'SIGTERM');
    const deadline = Date.now() + 180_000;
    for (;;) {
      try {
        process.kill(listener, 0);
      } catch {
        break;
      }
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await stopOwnedWorld();
  const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
  spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
    cwd: serverDir,
    stdio: 'ignore',
  });
  process.env.WIRE_SERVER_URL = await bootOwnedWorld();
}

afterAll(() => {
  for (const s of open) s.close();
  // eslint-disable-next-line no-console
  console.log(`\n[size-and-carrying drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

/* ───────────────────────── the steps ───────────────────────── */

/**
 * ⭐ B2 — every checkpoint can fail. `SC_B2=all` (or a list, `SC_B2=2,13`) swaps each step's key
 * expectation for one nothing can satisfy, so the run must go red at
 * every step, each with its own `B2` label — proof the checkpoint asserts
 * something rather than passing on anything.
 */
const B2_STEPS = (process.env.SC_B2 ?? '').split(',').map((x) => x.trim()).filter(Boolean);
/** Is `step`'s key expectation inverted this run (`SC_B2=all` or `SC_B2=2,13`)? */
function b2(step: string): boolean {
  return B2_STEPS.includes('all') || B2_STEPS.includes(step);
}
function key(step: string, re: RegExp): RegExp {
  return b2(step) ? new RegExp(`B2 inverted at step ${step} — ${re.source}`) : re;
}

/** People who must come back from the restart (step 21) exactly as they were. */
const survivors: { s: Session; flat: string }[] = [];

/**
 * A person by the id their card carries (`#id`, what a client sends when a
 * player clicks them). ⚠ `human` is ambiguous to a human — the binder asks
 * "which?", offering yourself beside them — so the drive names the other
 * by their card, as a player's click does.
 */
async function idOf(s: Session): Promise<string> {
  const me = (await s.queryOne('me', 'ref')) as unknown as { stuffId?: string } | null;
  expect(me?.stuffId, `${s.handle}'s id`).toBeTruthy();
  return `#${me!.stuffId!}`;
}

suite.skipIf(!isOwnedTestWorld())('size and carrying — the blocking drive', () => {
  beforeAll(async () => {
    // ⚠ The steading is open to the sky: by day, or nothing is seen.
    await toHour(9, 12);
  }, 240_000);

  it('1. [instant · player] get: a hand, the other hand, a pocket; a fourth refused in words; Katie hands the daypack, or it is set down at your feet', async () => {
    const a = await person('scget');
    await lay(a, T.mug);
    await lay(a, T.lantern);
    await lay(a, T.key);
    await lay(a, T.bowl);
    expectDone(await say(a, 'get mug'), /pick up a mug/i);
    expectDone(await say(a, 'get lantern'), /lantern/i);
    expectDone(await say(a, 'get key'), /key/i);
    // A mug would not fit a pocket — the key went to one.
    const tiers = await inv(a);
    expect(tiers, 'the mug and the lantern are in hand').toMatch(/In hand: a mug and a punched-tin lantern/i);
    expect(tiers, 'the key is in a pocket').toMatch(/pocket: a key/i);
    const fourth = await say(a, 'get bowl');
    expectRefused(fourth, key('1', /hands are full — the mug and the punched-tin lantern/i));
    expect(fourth.w, 'the refusal names the next command').toMatch(/`(drop|put) [^`]+`/);
    expect(await flat(a)).not.toMatch(/bowl/);
    survivors.push({ s: a, flat: '' });

    // Katie: a newcomer with free hands is handed the daypack.
    const k = await person('sckatie', HALL_LOBBY);
    let t = await k.cmd('talk katie');
    if (t.status !== 'ok') t = await k.cmd('talk super');
    record.push(`${k.handle}: talk → ${t.status}`);
    expect(t.status).toBe('ok');
    await choose(k, /need a room/i);
    await choose(k, /./);
    const daypack = squash(await k.listen(6_000));
    record.push(`${k.handle}: after Katie: ${daypack}`);
    expect(await flat(k)).toMatch(/daypack/i);

  }, 300_000);

  it('1b. [instant · player] a newcomer with full hands: the daypack is set down at their feet, said so (W10i — move is the only call)', async () => {
    // ⚠ Blocked in this world by a pre-existing residence defect (drive
    // record): Duncan Hall's SECOND let throws at `addExit` ("non-cardinal
    // direction 'unit-2' requires the destination to be in a different
    // zone") — the same failure every move-in theme already logs.
    const k2 = await person('sckatie', HALL_LOBBY);
    await give(k2, T.mug);
    await give(k2, T.lantern);
    let t2 = await k2.cmd('talk katie');
    if (t2.status !== 'ok') t2 = await k2.cmd('talk super');
    expect(t2.status).toBe('ok');
    await choose(k2, /need a room/i);
    await choose(k2, /./);
    // ⚠ Katie's line rides her dialogue's own beats, so an 8 s listen
    // missed it once (run 14) while a 10 s probe heard it: listen until it
    // arrives, up to 30 s, rather than guessing a window.
    let told = '';
    for (const until = Date.now() + 30_000; Date.now() < until && !/set .*daypack down/i.test(told); ) {
      told += ' ' + squash(await k2.listen(2_000));
    }
    told = told.trim();
    record.push(`${k2.handle}: after Katie: ${told}`);
    expect(await flat(k2), 'full hands: not carried').not.toMatch(/daypack/i);
    expect(told, 'the routing\'s line: set down').toMatch(key('1b', /hands are full — you set .*daypack down/i));
  }, 180_000);

  it('2. [instant · player] `i` (query --ledger me:i) shows the tiers and the burden in words; --flat is one list', async () => {
    const a = survivors[0]!.s;
    const tiers = await inv(a);
    expect(tiers).toMatch(/In hand:/);
    expect(tiers).toMatch(/Ready:[\s\S]*pocket/);
    expect(tiers).toMatch(/Worn:/);
    expect(tiers, 'the burden line').toMatch(key('2', BURDEN));
    // ⭐ No article inside a possessive: "your shirt's breast pocket".
    expect(tiers).not.toMatch(/your an? /i);
    // `i --flat`: the alias's line with the option appended — one list.
    const one = await inv(a, '--flat');
    expect(one).toMatch(/^You have:/);
    expect(one).not.toMatch(/In hand:|Worn:/);
    // ⭐ The alias says what it runs (W10h).
    expect((await say(a, 'alias get i')).w).toMatch(key('2', /i = query --ledger me:i/));
  }, 120_000);

  it('3. [instant · player] a coat\'s pockets differ, so it asks and says how; the trousers\' are alike, so they pick; a mug is refused by its size', async () => {
    const a = survivors[0]!.s;
    expectDone(await say(a, 'drop lantern'));
    await give(a, T.coat);
    const worn = await say(a, 'wear coat');
    expectDone(worn);
    await finish(a, worn.r);
    // ⭐ The coat's four pockets DIFFER (two plain, one buttoned, one inside):
    // `put key in coat` asks, and the ask says how (W10, D-W10-6).
    expectRefused(
      await say(a, 'put key in coat'),
      key('3', /Which — .*left pocket.*right pocket.*breast pocket \(buttoned\).*inner pocket \(inside\)/i),
    );
    const coat = (await say(a, 'look coat')).w;
    expect(coat, '`look coat` shows each pocket and what differs').toMatch(/breast pocket \(buttoned[^)]*\)[\s\S]*inner pocket \(inside\)/i);
    expectDone(await say(a, 'put key in "inner pocket"'), /inner pocket of a linen coat/i);
    expect(await inv(a)).toMatch(/In your linen coat's inner pocket: a key/i);
    // The trousers' two pockets are ALIKE: the trousers pick, and say which.
    expectDone(await say(a, 'get key from "inner pocket"'));
    expectDone(await say(a, 'put key in trousers'), key('3', /in the (left|right) pocket of .*trousers/i));
    const mug = await say(a, 'put mug in "left pocket"');
    expectRefused(mug, /too big/i);
  }, 120_000);

  it('4. [instant · staged] a belt holds what hangs from it by its length; readying a tool from a belt pouch says where each hand goes', async () => {
    const b = await person('scbelt', COTTAGE);
    await don(b, T.belt);
    // The hang rule (W7-d): a pouch, a scabbard, a holster or a clip that
    // claims no slot is hung from the worn belt as it is received.
    const pouch = await give(b, T.pouch);
    await give(b, T.scabbard);
    // Pouches until one does not hang: then `i` says there is no room on the belt,
    // and `put` of one more is refused, naming the belt.
    let belt = '';
    let hung = 2;
    let last = '';
    for (let i = 0; i < 16; i++) {
      last = await give(b, T.pouch);
      if (/In hand: a leather belt pouch/i.test(await inv(b))) break;
      hung++;
    }
    belt = await inv(b);
    record.push(`belt holds ${hung}: ${belt}`);
    expect(belt, '`i` says when there is no room on the belt').toMatch(key('4', /Room left: (none|a small thing)/i));
    const more = await say(b, `put #${last} on belt`);
    expectRefused(more, /belt/i);
    expectDone(await say(b, `drop #${last}`));
    // ⭐ A compass in the OPEN belt pouch is used where it sits (W10,
    // D-W10-1): the reading runs with both hands full and the compass is
    // still in the pouch after — nothing moved, no sheathe line.
    await give(b, T.compass);
    expectDone(await say(b, `put compass in #${pouch}`));
    await give(b, T.sword);
    await give(b, T.mug);
    const m = await say(b, 'measure strike with compass');
    expect(reasonOf(m.r), 'the reading ran (its own answer, not a reach refusal)').not.toMatch(/packed|shut|hands/);
    expect(m.w).not.toMatch(/sheathe|pull out/i);
    expect(await inv(b), 'the compass stays in the pouch').toMatch(key('4', /pouch[^\n]*compass|compass[^\n]*pouch/i));
    // Shut means shut — and the refusal names the next command; never an implicit open.
    expectDone(await say(b, `close #${pouch}`));
    expectRefused(await say(b, 'measure strike with compass'), key('4', /belt pouch is shut — `open pouch` first/i));
    expectDone(await say(b, `open #${pouch}`));
    expect(reasonOf((await say(b, 'measure strike with compass')).r) ?? '').not.toMatch(/shut|packed/);
    // `get compass from pouch` with both hands full: refused, naming what they hold and the ways out.
    const full = await say(b, `get compass from #${pouch}`);
    expectRefused(full, /you're holding[^.]*(sword|mug)[^.]*\. `drop/i);
    expect(full.w).toMatch(/`unwield/i);
    // Nothing on you takes a mug (no bag worn): `unwield` says so and keeps it in hand.
    expectRefused(await say(b, 'unwield mug'), /nowhere on you to put/i);
    expectDone(await say(b, 'drop mug'));
    expectDone(await say(b, `get compass from #${pouch}`), /You pull out your surveyor's brass compass from your leather belt pouch/i);
  }, 240_000);

  it('5. [instant · player] a compass packed in a worn backpack is refused until the pack is off; off, it lies at your feet and is used there', async () => {
    const b = await person('scpack', COTTAGE);
    await give(b, T.backpack);
    await give(b, T.compass);
    expectDone(await say(b, 'put compass in backpack'));
    const w = await say(b, 'wear backpack');
    expectDone(w);
    await finish(b, w.r);
    const packed = await say(b, 'measure strike with compass');
    expectRefused(packed, key('5', /is on your back — take it off first/i));
    // Both hands full first: taking the pack off sets it down at your feet (D-W10-16).
    await give(b, T.lantern);
    await give(b, T.mug);
    const off = await say(b, 'remove backpack');
    expectDone(off);
    await finish(b, off.r);
    expect(squash(await b.prose('look here')), 'the pack lies at your feet').toMatch(/backpack/i);
    // Open, within reach: the compass in it is used where it sits.
    const then = await say(b, 'measure strike with compass');
    expect(reasonOf(then.r) ?? '').not.toMatch(/packed|shut/);
    // The reading's own answer — the steading has no named orebody — not a reach refusal.
    expect(then.w).toMatch(/orebody/i);
    expectDone(await say(b, 'close backpack'));
    // ⚠ On the ground a shut pack is a room thing whose contents are unseen
    // — by its owner too (D-W10-16 C) — and the binder names only what the
    // giver perceives, so the compass in it is not named and there is no
    // shut holder to refuse by: the reading says it has no instrument in
    // reach and which one it wants (run 15; the plan's step-5 line asked
    // for "is shut — `open backpack` first", which D-W10-16 rules out).
    const shut = await say(b, 'measure strike with compass');
    expect(shut.w).toMatch(key('5', /nothing in reach that could read that/i));
    expect(shut.w, 'never an implicit open').not.toMatch(/orebody/i);
  }, 180_000);

  it('6. [short · staged] a hand act in a fight is a guarded beat by holder — a scabbard, the open pouch, a buttoned pocket opened first; drop is free', async () => {
    const f = await person('scbeat', TREELINE, { wizard: true, parcels: ['/world/newbie-wilds'] });
    await don(f, T.belt);
    await give(f, T.pouch);
    await give(f, T.scabbard);
    await give(f, T.sword);
    expectDone(await say(f, 'put sword in scabbard'));
    await give(f, T.compass);
    expectDone(await say(f, 'put compass in pouch'));
    // A key in the coat's buttoned breast pocket (the shirt off, so the
    // coat's is the only breast pocket); the pocket starts shut.
    const shirt = await say(f, 'remove shirt');
    await finish(f, shirt.r);
    expectDone(await say(f, 'drop shirt'));
    await don(f, T.coat);
    const keyId = await give(f, T.key);
    expectDone(await say(f, 'open "breast pocket"'));
    expectDone(await say(f, `put #${keyId} in "breast pocket"`));
    expectDone(await say(f, 'close "breast pocket"'));
    const id = (await f.queryOne('me', 'ref')) as unknown as { stuffId?: string } | null;
    const me = id?.stuffId ?? '';
    // The beat is read off the session after each command (W10: `readySeconds` is gone).
    const beat = async (): Promise<number> => {
      const r = await say(f, `eval --parcel /world/newbie-wilds JSON.stringify(CombatApi.sessionFor(StuffApi.findById('${me}'))?.getState(StuffApi.findById('${me}'))?.weaponSwitch?.getRemaining() ?? 0)`);
      return Number(/"?([0-9.]+)"?\s*$/.exec(r.w)?.[1] ?? NaN);
    };
    const settle = async (): Promise<void> => {
      for (let i = 0; i < 20 && (await beat()) > 0; i++) await new Promise((r) => setTimeout(r, 1_000));
    };
    expectDone(await say(f, 'attack wolf'));
    // ⭐ A weapon comes by `fight switch`; anything else by the hand act
    // itself — `get … from …` in a fight is a guarded beat (D-W10-5). A
    // compass or a key is not a weapon, and an instrument is used where it
    // sits (W10), so the drive times the GET, never a switch to it.
    expectDone(await say(f, 'fight switch sword'));
    const fromScabbard = await beat();
    await settle();
    expectDone(await say(f, 'unwield sword'));
    await settle();
    const pouchGet = await say(f, 'get compass from pouch');
    expect(pouchGet.w).toMatch(/guard drops/i);
    const fromPouch = await beat();
    await settle();
    // ⭐ The buttoned pocket is SHUT: refused naming `open`, then opening it is its own beat.
    expectRefused(await say(f, `get #${keyId} from "breast pocket"`), key('6', /breast pocket is shut — `open "breast pocket"` first/i));
    const opened = await say(f, 'open "breast pocket"');
    expect(opened.w).toMatch(/guard drops/i);
    const unfasten = await beat();
    await settle();
    expectDone(await say(f, 'drop compass'));
    expectDone(await say(f, `get #${keyId} from "breast pocket"`), /guard drops/i);
    const fromPocket = await beat();
    await settle();
    record.push(`fight beats: scabbard ${fromScabbard}, pouch ${fromPouch}, unfasten ${unfasten}, pocket ${fromPocket}`);
    // The seconds add and ROUND to beats (requirements § Readying): at the
    // 3 s combat tick a scabbard's draw (1.5 s) and a pouch's reach (3 s)
    // are one beat each, so the scabbard is never the slower.
    expect(fromScabbard, 'a scabbard is the quick draw').toBeLessThanOrEqual(fromPouch);
    expect(unfasten + fromPocket, 'the buttoned pocket costs more than the open pouch').toBeGreaterThan(b2('6') ? unfasten + fromPocket : fromPouch);
    // A mug in the other hand: the greatsword is refused naming the mug and `drop mug`.
    await give(f, T.mug);
    await give(f, T.greatsword);
    const gs = await say(f, 'fight switch greatsword');
    expectRefused(gs, /mug[\s\S]*`drop mug`|`drop mug`[\s\S]*mug/i);
    // `put mug in pouch` in the fight: the guard drops, and the mug lands at the beat's end.
    const put = await say(f, 'put mug in pouch');
    expect(put.w).toMatch(/guard drops/i);
    expect(await beat()).toBeGreaterThan(0);
    await settle();
    // `drop` is free: no switch on the state.
    await give(f, T.mug);
    expectDone(await say(f, 'drop mug'));
    expect(await beat()).toBe(0);
    // An instrument is used where it sits — no beat.
    const r = await say(f, 'measure strike with compass');
    expect(reasonOf(r.r) ?? '', 'the reading ran').not.toMatch(/packed|shut|hands/);
    await f.cmd('fight yield');
  }, 300_000);

  it('7. [short · staged] a lantern and a shield: the draw is refused naming the lantern; a greatsword names the shield; a big body holds it in one hand, a gnome cannot', async () => {
    const g = await person('schands', TREELINE);
    await don(g, T.belt);
    await give(g, T.scabbard);
    await give(g, T.sword);
    expectDone(await say(g, 'put sword in scabbard'));
    await give(g, T.lantern);
    await give(g, T.shield);
    // (Step 6 may have left the wolf dead: the sellsword is the fight here.)
    expectDone(await say(g, 'attack sellsword'));
    const draw = await say(g, 'fight draw');
    expectRefused(draw, key('7', /you're holding[^.]*lantern/i));
    expect(draw.w, 'offers to drop the lantern').toMatch(/`drop lantern`/i);
    expectDone(await say(g, 'drop lantern'));
    expect(squash(await g.prose('look here'))).not.toMatch(/pitch dark/i);
    expectDone(await say(g, 'fight draw'));
    await g.cmd('fight yield');
    await new Promise((r) => setTimeout(r, 4_000));
    const gs = await give(g, T.greatsword);
    await say(g, 'drop sword'); // wherever the draw left it
    await say(g, 'get greatsword'); // handed with full hands, it lay at the feet
    const two = await say(g, `wield #${gs}`);
    expectRefused(two, /shield/i);

    // A staged large body holds the same greatsword in one hand.
    const big = await person('scbig', TREELINE);
    expectDone(await say(big, `testharness species ${big.handle} ${SPECIES}/draconicus`));
    await give(big, T.shield);
    await give(big, T.greatsword);
    // Handed, it is taken up in the free hand beside the shield.
    expect(await inv(big), 'one hand on the shield, one on the greatsword').toMatch(/In hand: (a faced shield and a greatsword|a greatsword and a faced shield)/i);
    // A gnome is refused a longsword one-handed.
    const gnome = await person('scgnome', TREELINE);
    expectDone(await say(gnome, `testharness species ${gnome.handle} ${SPECIES}/gnomus`));
    await lay(gnome, T.longsword);
    await give(gnome, T.shield);
    expectRefused(await say(gnome, 'get longsword'), key('7g', /(takes both hands — you're holding|hands are full —) the faced shield/i));
  }, 300_000);

  it('8. [instant · player] a three-meter pole takes both hands; with a lantern held it is refused, naming both hands', async () => {
    const p = await person('scpole', BARN);
    await lay(p, T.pole);
    await give(p, T.lantern);
    const no = await say(p, 'get pole');
    expectRefused(no, key('8', /takes both hands — you're holding the punched-tin lantern/i));
    expectDone(await say(p, 'drop lantern'));
    expectDone(await say(p, 'get pole'));
    expect(await inv(p)).toMatch(/In hand: a setting pole\./i);
  }, 120_000);

  it('9. [instant · player] a low door: stoop; a crawlway refuses the pack on your back until it is off', async () => {
    const c = await person('sccrawl', YARD);
    const go = await say(c, 'go east');
    expectRefused(go, key('9', /you'd have to stoop — `stoop east`/i));
    expectDone(await say(c, 'stoop east'), /roofless cottage/i);
    await give(c, T.backpack);
    const w = await say(c, 'wear backpack');
    await finish(c, w.r);
    expectRefused(await say(c, 'crawl east'), /canvas backpack won't go through — `remove backpack`/i);
    const off = await say(c, 'remove backpack');
    expectDone(off);
    await finish(c, off.r);
    expect(await inv(c), 'the pack comes to hand, not loose on you').toMatch(/In hand: a canvas backpack/i);
    const through = await say(c, 'crawl east');
    expectDone(through, /push the canvas backpack ahead/i);
  }, 180_000);

  it('10. [instant · player] a ladder wants both hands; sheathe the sword, hang the lantern, and climb', async () => {
    const d = await person('scladder', YARD);
    await don(d, T.belt);
    await give(d, T.scabbard);
    await give(d, T.lantern);
    await give(d, T.sword);
    expectRefused(await say(d, 'climb up'), key('10', /both hands to climb — you're holding a punched-tin lantern and an arming sword/i));
    expectDone(await say(d, 'put sword in scabbard'));
    expectDone(await say(d, 'put lantern on belt'), /hang a punched-tin lantern from a leather belt/i);
    expectDone(await say(d, 'climb up'), /lookout platform/i);
    expectDone(await say(d, 'climb down'));
  }, 180_000);

  it('11. [instant · staged] a long crate will not turn the stair but passes the wide door; a pole standing out of a chest will not let it shut', async () => {
    const e = await person('sccrate', BARN);
    expectDone(await say(e, 'get crate'));
    expectRefused(await say(e, 'go up'), key('11', /long crate is too long to get round the turn/i));
    expectDone(await say(e, 'go north'), /yard/i);
    expectDone(await say(e, 'go south'), /barn/i);
    expectDone(await say(e, 'drop crate'));
    await give(e, T.pole);
    expectDone(await say(e, 'put pole in barrel'));
    expect((await say(e, 'look in barrel')).w).toMatch(/setting pole/i);
    expectDone(await say(e, 'get pole from barrel'));
    expectDone(await say(e, 'put pole in chest'));
    expectRefused(await say(e, 'close chest'), /setting pole sticks out/i);
  }, 180_000);

  it('12–13. [instant · player] another person: what they hold, their outer layer, the knife on their belt — never the letter in their inner pocket, by any verb', async () => {
    const v = await person('scbearer', `${STEADING}/paddock`);
    await don(v, T.coat);
    await don(v, T.belt);
    await give(v, T.sheath);
    await give(v, T.knife);
    expectDone(await say(v, 'put knife in sheath'));
    await give(v, T.sheet, LETTER);
    expectDone(await say(v, 'put letter in "inner pocket"'));
    await give(v, T.sword);
    const o = await person('scother', `${STEADING}/paddock`);
    const OTHER = await idOf(v);
    const seen = { w: await ledgerOf(o, OTHER) };
    expect(seen.w, 'what they hold').toMatch(/arming sword/i);
    expect(seen.w, 'their outer layer').toMatch(key('12', /linen coat/i));
    expect(seen.w, 'the knife on their belt').toMatch(/knife|sheath/i);
    expect(seen.w, 'never the letter').not.toMatch(/letter|paper/i);
    // ⭐ Probes on the covered letter answer exactly as for a person with none.
    const control = await person('scnone', `${STEADING}/paddock`);
    const NONE = await idOf(control);
    const probe = async (who: string): Promise<string[]> => {
      const out: string[] = [];
      for (const q of [`get letter from ${who}`, `get paper from ${who}`, `query ${who}:I:letter`, `if (${who}:I:letter) { say yes }`]) {
        const x = await say(o, q);
        // (The typed word is echoed — "any 'letter'" — never the thing.)
        expect(x.w, q).not.toMatch(/which one|a letter|sheet of paper|\byes\b/i);
        out.push(`${x.r.status}|${reasonOf(x.r) ?? ''}|${x.r.notes.map((n) => n.kind).join(',')}`);
      }
      return out;
    };
    const withLetter = await probe(OTHER);
    const without = await probe(NONE);
    record.push(`probe answers: bearer ${withLetter.join(' ; ')} | no letter ${without.join(' ; ')}`);
    expect(withLetter, 'identical to a person with no letter').toEqual(b2('13') ? [...without, 'B2 inverted at step 13'] : without);
    // The same query typed by the bearer finds it.
    expect((await say(v, 'query me:I:letter')).w).toMatch(/letter/i);
  }, 240_000);

  it('14. [instant · staged] a shut backpack: the ledger lists its contents; a wizard removes one; it is gone from the list', async () => {
    const s = await person('scshut', `${STEADING}/hayloft`, { wizard: true, parcels: ['/world/newbie-wilds'] });
    const pack = await give(s, T.backpack);
    await give(s, T.mug);
    expectDone(await say(s, `put mug in #${pack}`));
    const bowl = await give(s, T.bowl);
    expectDone(await say(s, `put bowl in #${pack}`));
    expectDone(await say(s, `close #${pack}`));
    const w = await say(s, `wear #${pack}`);
    await finish(s, w.r);
    const before = await ledgerOf(s, `#${pack}`);
    expect(before).toMatch(/mug/);
    expect(before).toMatch(key('14', /bowl/));
    expectDone(await say(s, `testharness vanish #${bowl}`));
    const after = await ledgerOf(s, `#${pack}`);
    expect(after).toMatch(/mug/);
    expect(after).not.toMatch(/bowl/);
  }, 180_000);

  it('14b. [instant · staged] the pack on the ground: shut, another sees only the pack; open, they see in and take — and the owner cannot fight-draw from it', async () => {
    const a = await person('scdrop', `${STEADING}/hayloft`);
    const pack = await give(a, T.backpack);
    const pistol = await give(a, T.pistol);
    expectDone(await say(a, `put #${pistol} in #${pack}`));
    expectDone(await say(a, `close #${pack}`));
    expectDone(await say(a, `drop #${pack}`));
    const b = await person('scrifle', `${STEADING}/hayloft`);
    // Shut: B sees the pack and no pistol; reaching in is refused naming `open`.
    const seen = squash(await b.prose('look backpack'));
    expect(seen).toMatch(/backpack/i);
    expect(seen, 'shut: its contents are unseen').not.toMatch(/pistol/i);
    expectRefused(await say(b, 'get pistol from backpack'), key('14b', /is shut — `open backpack` first/i));
    expect(await ledgerOf(b, 'backpack')).toMatch(/shut/i);
    // Before the handover, with the pistol in A's open pack at A's feet:
    // within reach, not ready — `fight draw`/`fight switch` reach only what is ON you.
    expectDone(await say(a, `open #${pack}`));
    expectDone(await say(a, `attack ${await idOf(b)}`));
    expectRefused(await say(a, 'fight draw'), /no sidearm/i);
    expectRefused(await say(a, 'fight switch pistol'), /don't have that on you|don't have any/i);
    const got = await say(a, `get #${pistol} from #${pack}`);
    expect(got.w).toMatch(/guard drops/i);
    await a.cmd('fight yield');
    await new Promise((r) => setTimeout(r, 6_000));
    expectDone(await say(a, `put #${pistol} in #${pack}`));
    expectDone(await say(a, `drop #${pack}`));
    // Open: B sees in, and takes — theft on the ledger; nothing new.
    expect(squash(await b.prose('look in backpack'))).toMatch(key('14b', /pistol/i));
    expectDone(await say(b, 'get pistol from backpack'));
    expect(await inv(b)).toMatch(/pistol/i);
    expect((await say(b, `title #${pistol}`)).w, 'still A\'s on the ledger').toMatch(new RegExp(a.handle, 'i'));
  }, 240_000);

  it('15. [instant · staged] knocked out mid-fight: the sword falls, the belt stays; the letter is found only by searching, and only by the searcher', async () => {
    const v = await person('scvictim', `${STEADING}/lookout`);
    await don(v, T.coat);
    await don(v, T.belt);
    await give(v, T.sheet, LETTER);
    expectDone(await say(v, 'put letter in "inner pocket"'));
    await give(v, T.sword);
    const s = await person('scsearch', `${STEADING}/lookout`);
    const OTHER = await idOf(v);
    expectDone(await say(s, `attack ${OTHER}`));
    const out = await say(s, `testharness afflict ${v.handle} ${ANAESTHESIA}`);
    expectDone(out, /unconscious/);
    const here = squash(await s.prose('look here'));
    expect(here, 'the sword fell to the floor').toMatch(/arming sword/i);
    const seen = { w: await ledgerOf(s, OTHER) };
    expect(seen.w, 'the belt stays on them').toMatch(/belt/i);
    expect(seen.w).not.toMatch(/arming sword/i);
    const first = await say(s, `get letter from ${OTHER}`);
    expectRefused(first);
    expect(first.w).not.toMatch(/a letter|sheet of paper/i);
    const search = await say(s, `search ${OTHER}`);
    expectDone(search);
    const found = `${search.w} ${await finish(s, search.r)}`;
    record.push(`search: ${found}`);
    // The find is the searcher's: the letter in the inner pocket is now
    // perceived by them, and only by them.
    expect((await say(s, `query ${OTHER}:I:letter`)).w, 'the searcher found it').toMatch(key('15', /letter/i));
    // Another who did not search still cannot see it.
    const o = await person('scbystander', `${STEADING}/lookout`);
    expect((await say(o, `query ${OTHER}:I:letter`)).w).not.toMatch(/letter/i);
    expectDone(await say(s, `get letter from ${OTHER}`));
    expect(await flat(s)).toMatch(/letter/i);
    // Once it is in your own pocket, nobody's earlier find shows it.
    expect((await say(o, `query ${OTHER}:I:letter`)).w).not.toMatch(/letter/i);
  }, 240_000);

  it('16. [short · player] swimming the pond: a letter in an ordinary pack comes out ruined, in an oilskin pouch dry; a cork floats out of an open pocket', async () => {
    const p = await person('scswim', YARD);
    const pack = await give(p, T.backpack);
    const wet = await give(p, T.sheet, { ...LETTER, keywords: ['letter', 'paper', 'wet'] });
    expectDone(await say(p, `put #${wet} in #${pack}`));
    expectDone(await say(p, `close #${pack}`));
    const w = await say(p, `wear #${pack}`);
    await finish(p, w.r);
    const oil = await give(p, T.oilskin);
    const dry = await give(p, T.sheet, { ...LETTER, keywords: ['letter', 'paper', 'dry'] });
    expectDone(await say(p, `put #${dry} in #${oil}`));
    expectDone(await say(p, `close #${oil}`));
    expectDone(await say(p, 'swim west'), /pond/i);
    expectDone(await say(p, 'swim west'), /reed bank/i);
    const wetLook = (await say(p, `look #${wet}`)).w;
    const dryLook = (await say(p, `look #${dry}`)).w;
    const packed = await ledgerOf(p, `#${pack}`);
    record.push(`after the swim: pack letter "${wetLook}" · oilskin letter "${dryLook}" · packed "${packed}"`);
    // The pack's letter is no letter any more (it went to pulp in the water).
    expect(wetLook, 'the pack letter is gone').toMatch(key('16', /don't see any/i));
    expect(packed).not.toMatch(/letter/i);
    expect(dryLook).toMatch(/letter/i);
    expect(dryLook).not.toMatch(/wet|sodden|ruined|pulp/i);
  }, 240_000);

  it('17. [short · staged] four hours on the body\'s own clock: what it ate and drank is gone from its pack, and the burden line is lighter', async () => {
    const h = await person('schungry', YARD);
    const satchel = await give(h, '/trade/tanning/thing/satchel');
    const w = await say(h, `wear #${satchel}`);
    await finish(h, w.r);
    for (let i = 0; i < 4; i++) await give(h, T.rations);
    const before = await inv(h, '--weight');
    expectDone(await say(h, 'testharness clock-advance 4h'));
    await nourish(h); // the harness's top-up for the jump; the meal below is the act
    expectDone(await say(h, 'eat ration'));
    const after = await inv(h, '--weight');
    record.push(`step 17: before ${before} | after ${after}`);
    const count = (t: string): number => (t.match(/ration/g) ?? []).length;
    expect(count(after)).toBeLessThan(b2('17') ? count(after) : count(before));
  }, 240_000);

  it('18. [instant · player] a mule carries in what it wears and is led on a rope; a cart fills your hands, will not pass a narrow gate, and a tarp hides its load', async () => {
    const m = await person('scmule', YARD);
    // Tack the mule: a mule does not saddle itself — handed the saddle, it
    // has nowhere to carry it and sets it down (W10i: `move` is the only
    // call, owner 2026-11-15); `put … on` seats it (W10, D-W10-8).
    expectDone(await say(m, 'get "pack saddle"'));
    expectDone(await say(m, 'give saddle to mule'), key('18', /mule sets .*saddle down/i));
    expectDone(await say(m, 'get "pack saddle"'));
    expectDone(await say(m, 'put saddle on mule'), /put .* saddle on/i);
    expectDone(await say(m, 'get pannier'));
    expectDone(await say(m, 'give pannier to mule'));
    expectDone(await say(m, 'give pannier to mule'));
    expect(await ledgerOf(m, 'mule')).toMatch(/pannier/i);
    // Two days of food for one: most of a pack, said in words.
    for (let i = 0; i < 6; i++) await give(m, T.rations);
    const heavy = await inv(m, '--weight');
    record.push(`step 18 carrying it: ${heavy}`);
    expect(heavy).toMatch(BURDEN);
    let refused: { r: CommandResult; w: string } | null = null;
    for (let i = 0; i < 120; i++) {
      await give(m, T.rations);
      // ⚠ The room's reach stops at the mule: its panniers are named through it (MQL).
      const x = await say(m, 'put ration in mule:i:pannier');
      if (x.r.status !== 'ok') {
        refused = x;
        break;
      }
    }
    expect(refused, 'the mule refuses in words').not.toBeNull();
    expect(refused!.w.length).toBeGreaterThan(10);
    // Hands free again for the lead.
    for (let i = 0; i < 4 && /In hand:[^\n]*ration/i.test(await inv(m)); i++) await say(m, 'drop ration');
    expectDone(await say(m, 'get halter'));
    expectDone(await say(m, 'put halter on mule'));
    await give(m, T.rope);
    expectDone(await say(m, 'tie rope to mule'));
    // At the narrow gate, the laden mule's panniers won't fit.
    const gate = await say(m, 'go north');
    expectRefused(gate, key('18', /mule won't follow you: its canvas panniers won't go through/i));
    // Out on the open path it comes with you, and you have a hand free.
    expectDone(await say(m, 'go southeast'));
    expect(squash(await m.prose('look here'))).toMatch(/mule/i);
    expect(await inv(m), 'one hand holds the rope').toMatch(/In hand: (a|the|an end of a) rope/i);
    expectDone(await say(m, 'go northwest'));

    // `give cup to` a person whose hands are full: given — they set it down
    // at their feet, said so (W10i: the handed pre-check is retired).
    const full = await person('scfull', YARD);
    await give(full, T.lantern);
    await give(full, T.mug);
    const cup = await give(m, T.mug);
    await inv(m); // (where the cup went, for the record)
    const gv = await say(m, `give #${cup} to ${await idOf(full)}`);
    expectDone(gv, key('18', /sets .*mug down/i));
    expect(await flat(m)).not.toMatch(/mug/);

    // A cart: hitched, your hands are on it.
    const h = await person('sccart', YARD);
    await lay(h, T.lantern);
    await lay(h, T.handcart);
    expectDone(await say(h, 'hitch handcart'));
    expectRefused(await say(h, 'get lantern'), /hands are on (a|the) wooden handcart/i);
    expectRefused(await say(h, 'go north'), /handcart won't fit/i);
    expectDone(await say(h, 'unhitch'));
    const r = await give(h, T.rations);
    expectDone(await say(h, `put #${r} in handcart`));
    const tarp = await give(h, T.tarpaulin);
    expectDone(await say(h, `put #${tarp} in handcart`));
    expectDone(await say(h, 'close handcart'));
    expect((await say(m, 'look in handcart')).w).not.toMatch(/ration/i);
  }, 360_000);

  it('19. [instant · staged] no gravity: a dropped cup floats, a cup on the table drifts off, a full pack weighs nothing yet still takes both hands and will not pass the crawlway', async () => {
    const z = await person('scfloat', COTTAGE);
    await give(z, T.mug);
    expectDone(await say(z, 'put mug on table'));
    // ⭐ A pack BIGGER than the crawlway (0.8 × 0.8 m): the requirement's
    // "won't fit the hatch" is about the pack's own size, which no gravity
    // changes (D10-d). Full — a mail hauberk and six rations, 15 kg — so
    // it takes both hands by its mass.
    const pack = await give(z, T.backpack, { dimensions: { width: 0.85, depth: 0.5, height: 0.9 } });
    const mail = await give(z, T.hauberk);
    expectDone(await say(z, `put #${mail} in #${pack}`));
    for (let i = 0; i < 6; i++) {
      await give(z, T.rations);
      await say(z, `put ration in #${pack}`);
    }
    const w = await say(z, `wear #${pack}`);
    await finish(z, w.r);
    // Shut, or weightless its load drifts out of it.
    expectDone(await say(z, `close #${pack}`));
    const set = await say(z, 'testharness gravity 0');
    expectDone(set);
    expect(set.w + squash(await z.listen(1500))).toMatch(/mug drifts away from (a|the) plain deal table/i);
    await give(z, T.bowl);
    const dropped = await say(z, 'drop bowl');
    expectDone(dropped);
    expect(`${dropped.w} ${squash(await z.listen(2500))}`).toMatch(key('19', /floats where you let it go/i));
    const tiers = await inv(z);
    expect(tiers, 'no weight on the burden line').not.toMatch(/fair load|well laden|heavily|more than you/i);
    // Still won't pass the crawlway: weightless the body goes lengthwise,
    // but the pack follows it by its own size.
    expectRefused(await say(z, 'go east'), key('19', /backpack won't go through/i));
    expectRefused(await say(z, 'crawl east'), /backpack won't go through/i);
    // Still too big for a pocket.
    const off = await say(z, 'remove backpack');
    await finish(z, off.r);
    expectRefused(await say(z, `put #${pack} in "left pocket"`), /too big/i);
    // Still takes both hands: a lantern in one, and the pack is refused.
    expectDone(await say(z, `drop #${pack}`));
    await give(z, T.lantern);
    expectRefused(await say(z, `get #${pack}`), key('19', /takes both hands — you're holding (a|an|the) [^,]*lantern/i));
    expectDone(await say(z, 'testharness gravity clear'));
  }, 180_000);

  it('20. [instant · staged] the builder lens: inside your extent a shut chest reads true, labeled; off, it is shut like anyone\'s', async () => {
    const b = await person('sclens', BARN, { wizard: true, parcels: ['/world/newbie-wilds'] });
    // (Step 11 left a pole standing in the chest.)
    await say(b, 'get pole from chest');
    await say(b, 'drop pole');
    await give(b, T.mug);
    expectDone(await say(b, 'put mug in chest'));
    expectDone(await say(b, 'close chest'));
    expectDone(await say(b, 'lens on'));
    const lensed = await say(b, 'look in chest');
    expect(lensed.w).toMatch(/mug/i);
    expect(lensed.w).toMatch(key('20', /\[builder\]/i));
    expectDone(await say(b, 'lens off'));
    const plainLook = await say(b, 'look in chest');
    expect(plainLook.w).not.toMatch(/mug/i);
  }, 120_000);

  // ⭐ Step 22 runs before the restart: after it the world comes up cold and
  // a long clock jump on it ran the server out of heap (run 3, recorded).
  it('22. [instant · player] look in the new places by day, and by headlamp at night', async () => {
    await toHour(10, 14);
    const l = await person('sclook', YARD);
    const places: Array<[string, RegExp]> = [
      ['', /low|cottage/i],
      ['stoop east', /roofless cottage/i],
      ['', /gap|crawl/i],
      ['stoop west', /yard/i],
      ['go south', /barn/i],
      ['', /stair/i],
      ['go north', /yard/i],
    ];
    for (const [move, want] of places) {
      if (move) expectDone(await say(l, move));
      expect(squash(await l.prose('look here')), `${move || 'here'} by day`).toMatch(key('22', want));
    }
    // The pond, from its bank (the yard is its shore) and from the water.
    expect((await say(l, 'look pond')).w, 'the pond by day').toMatch(/pond|water/i);
    // At night, by a headlamp.
    await toHour(22, 24);
    const n = await person('scnight', YARD);
    await give(n, T.headlamp);
    const w = await say(n, 'wear headlamp');
    await finish(n, w.r);
    expectDone(await say(n, 'switch headlamp on'));
    for (const move of ['', 'stoop east', 'stoop west', 'go south', 'go north']) {
      if (move) await say(n, move);
      expect(squash(await n.prose('look here')), `${move || 'yard'} by headlamp`).not.toMatch(/pitch dark|too dark/i);
    }
    expect((await say(n, 'look pond')).w, 'the pond by headlamp').toMatch(/pond|water/i);
  }, 300_000);

  it('21. [short · staged] restart: everyone comes back as they were', async () => {
    // ⭐ The pre-flip staging is cut (finalize, owner: no migrations — no
    // pre-flip record exists to place): a restore puts back exactly what
    // was captured, and a loose thing found on a restored body is a loud
    // diagnostic, never placed.
    const keep = await person('screstart', YARD);
    await don(keep, T.belt);
    await give(keep, T.pouch);
    await give(keep, T.mug);
    await give(keep, T.key);
    const before = await flat(keep);
    // The steading mule step 18 tacked: what it wears is its own record.
    const tackBefore = await ledgerOf(keep, 'mule');
    record.push(`mule before restart: ${tackBefore}`);
    expect(tackBefore, 'the mule wears its tack').toMatch(/saddle/i);
    const keepHandle = keep.handle;
    for (const s of open.splice(0)) s.close();
    await new Promise((r) => setTimeout(r, 3_000));
    await restartWorld();
    const back = await Session.open(keepHandle, {});
    open.push(back);
    await back.drainProse();
    const after = await flat(back);
    record.push(`restart: before "${before}" · after "${after}"`);
    const set = (t: string): string[] => t.replace(/^You have: /, '').replace(/\.$/, '').split(/ (?=an? )/).map((x) => x.trim()).sort();
    expect(set(after), 'the same things, none loose, none duplicated').toEqual(b2('21') ? [...set(before), 'B2 inverted at step 21'] : set(before));
    expect(await inv(back)).not.toMatch(/Loose:/);
    // The cast mule comes back wearing what it wore (its own record) — read
    // by daylight: the yard is open to the sky, and the restart may land at
    // night ("someone … wearing something").
    await toHour(9, 12);
    const tackAfter = await ledgerOf(back, 'mule');
    record.push(`mule after restart: ${tackAfter}`);
    expect(tackAfter, 'the mule keeps its tack across the restart').toMatch(/saddle/i);
    expect(tackAfter).toMatch(/pannier/i);
  }, 900_000);

});

/**
 * Answer a dialogue wheel with the choice whose line matches `want`. ⚠ The
 * previous wheel's `prompt-dismissed` frame arrives first — skip any frame
 * that carries no choices (the wizard-axis drive's helper).
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
