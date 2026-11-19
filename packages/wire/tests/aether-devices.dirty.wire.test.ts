/**
 * ⭐⭐ **Aether devices — the blocking drive** (the aether-devices build;
 * requirements `docs/requirements/aether-devices-requirements.md` § The
 * drive, steps 1–18), against the real socket.
 *
 * The drive in one sentence: *a new player arrives with a bound phone in a
 * pocket and can `dm` at once; Messages is an app; a packed, switched-off
 * or dead phone holds what you type and says how to fix it, and it goes
 * when you do; the room carries emotes to NPCs and needs no phone; a phone
 * charges on the dorm charger while you are away and survives a restart;
 * a stolen phone is a brick; a bought one can be handed on.*
 *
 * Adapted, recorded in the plan's drive record:
 * - step 17 (guest): the harness has no guest login; the guest's implant is
 *   unit-proved (`Avatar.loadout.test.ts`) and walked in the browser.
 * - step 18 (light): the lounge has NO charger this build (plan R4 — a
 *   non-persistent room destroys an owned good left in it); the dorm's is
 *   looked at.
 * - staged steps: 11 (dead) sets the phone's charge through the harness's
 *   `stage` on the phone's own id (`#<stuffId>` — the instance handle this
 *   build added); 16 (cannot see) is unconsciousness (`testharness afflict`);
 *   A is funded through a bank account and the founder's override (the
 *   zone-instancing pattern) and handed a rucksack (`hand`).
 * - step 12 leases A a Duncan Hall unit from Katie, as a student does.
 *
 * ⚠ Every checkpoint asserts the SENTENCE, never only "not refused" (B2).
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=<port> WIRE_BOOT_TIMEOUT=840000 npx vitest run
 * tests/aether-devices.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  advanceWorldClock,
  hand,
  stage,
  nourish,
} from '../src/harness';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'mints new characters and their bound phones, buys a phone and a charger ' +
  'off the general store, moves the world clock and restarts the world';

declareFile({
  file: 'aether-devices.dirty.wire.test.ts',
  packs: [
    'base-library',
    'generic-objects',
    'expression',
    'eternal-university',
    'terminus',
    'saxonberg-lounge',
    'world-seed',
    'energy',
    'arcana',
    'corpo-hollis',
    'corpo-aevex',
    'trade-shopkeeping',
    'trade-tanning',
  ],
  dirtyReason: DIRTY_REASON,
});

const STORE = '/world/terminus/general-store/shop-floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const HALL_LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const ANAESTHESIA = '/platform/idea/Condition/metabolism/anaesthesia';
const RUCKSACK = '/trade/tanning/thing/rucksack';

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

/** Run a line and return everything it said (the reply and what follows). */
async function say(s: Session, line: string, ms = 600): Promise<string> {
  await s.drainProse();
  const r = await s.cmd(line);
  return squash(`${await r.said()} ${await s.listen(ms).catch(() => '')}`);
}

/** What `s` hears over the next `ms` (prose only — see `heard` for frames). */
async function hears(s: Session, ms = 1_500): Promise<string> {
  return squash(await s.listen(ms).catch(() => ''));
}

/** Topics a dm, a channel line, an emote or a spoken reply arrives on. */
const HEARD_TOPICS = ['speech.comms', 'speech.channel', 'act.emote', 'speech.vocal', 'speech.say', 'act.deed'];

/** Every frame body `s` has received on those topics since its last command. */
function framesText(s: Session): string {
  return squash(HEARD_TOPICS.flatMap((t) => s.framesOf(t).map((f) => String(f.body ?? ''))).join(' '));
}

/** Did `s` receive a frame matching `re` within `ms`? Returns what it received. */
async function heard(s: Session, re: RegExp, ms = 3_000): Promise<string> {
  const end = Date.now() + ms;
  for (;;) {
    const text = framesText(s);
    if (re.test(text) || Date.now() > end) return text;
    await new Promise((r) => setTimeout(r, 200));
  }
}

/** Move the clock to the next `fromH`–`toH` window (business hours: Katie is on shift). */
async function toHour(fromH: number, toH: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advanceWorldClock(`${Math.ceil(wait / 60)} minutes`);
}

/** `look <thing>` — the prose and the inspection card it opens (the augmented lines live there). */
async function examine(s: Session, thing: string): Promise<string> {
  s.clearCaptures();
  const said = await say(s, `look ${thing}`);
  return `${said} ${squash(JSON.stringify(s.envelopesOf('card-opened')))}`;
}

/** The charge `look phone` reports, as a percent, or null (off / dead). */
function chargeOf(look: string): number | null {
  const m = /battery reads (\d+)%/.exec(look);
  return m ? Number(m[1]) : null;
}

/** The stuff id of the phone `s` carries. */
async function phoneId(s: Session, word = 'phone'): Promise<string> {
  const rows = (await s.query(word, { cardinality: 'one', fields: 'ref' })) as Array<{ stuffId?: string }>;
  const id = rows[0]?.stuffId;
  expect(id, `a ${word} in reach`).toBeTruthy();
  return id!;
}

/** Restart the world (a SIGTERM, so the shutdown capture lands) — repair's pattern. */
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

/** A choice off the next prompt's wheel matching `want` (Katie's lease). */
async function choose(s: Session, want: RegExp): Promise<void> {
  type Choice = { response?: string };
  type Body = { promptId?: string; outcome?: { notes?: Array<{ kind?: string; choices?: Choice[] }> } };
  for (let i = 0; i < 5; i++) {
    const p = (await s.awaitPrompt(10_000)) as unknown as Body & { payload?: Body };
    const body = p.payload?.promptId ? p.payload : p;
    const choices = body.outcome?.notes?.find((n) => n.kind === 'prompt-choice')?.choices ?? [];
    if (choices.length === 0) continue;
    const pick = choices.find((c) => want.test(JSON.stringify(c)));
    expect(pick, `no choice matching ${want}`).toBeDefined();
    s.answerPrompt(body.promptId!, pick!.response ?? '');
    return;
  }
  throw new Error(`no choice wheel arrived for ${want}`);
}

suite('aether devices', () => {
  const handleA = uniqueHandle('ad-ana');
  const handleB = uniqueHandle('ad-bo');
  const nameA = 'Anaphone';
  const nameB = 'Bophone';
  let A: Session;
  let B: Session;
  let dormUnit = '';

  /** Re-open A where it is (or at `where`), as a wizard when staging needs one. */
  async function reopenA(opts: { where?: string } = {}): Promise<void> {
    A.close();
    A = await Session.open(handleA, opts.where ? { startLocation: opts.where } : {});
    await A.drainProse();
  }

  beforeAll(async () => {
    A = await Session.embody(handleA, { name: nameA });
    B = await Session.embody(handleB, { name: nameB });
    // Both arrive in the lounge; people `dm` whom they have met.
    await say(A, 'introduce');
    await say(B, 'introduce');
  }, 300_000);

  afterAll(() => {
    A?.close();
    B?.close();
  });

  it('1 · spawn with a phone, ready in a pocket, full, bound', async () => {
    expect(await say(A, 'i')).toMatch(/Ready:.*pocket.*Hollis Pal phone/i);
    const look = await examine(A, 'phone');
    expect(look).toMatch(/battery reads 100%/);
    expect(look).toMatch(/bound to you/);
  });

  it('2 · dm works at once, read off the phone', async () => {
    B.clearCaptures();
    await say(A, `dm ${nameB} hello from a phone`);
    expect(await heard(B, /hello from a phone/)).toMatch(/hello from a phone/);
  });

  it('2a · built in and installed: the phone runs Messages', async () => {
    expect(await examine(A, 'phone')).toMatch(/It runs Messages\./);
    expect(await say(A, 'apps')).toMatch(/runs: Messages/);
  });

  it('2b · uninstall: refused, held; install: it goes', async () => {
    expect(await say(A, 'apps uninstall messages')).toMatch(/You uninstall Messages/);
    B.clearCaptures();
    const refused = await say(A, `dm ${nameB} held by the missing app`);
    expect(refused).toMatch(/apps install messages/);
    expect(refused).toMatch(/Held — it goes when you can send/);
    expect(await heard(B, /held by the missing app/, 800)).not.toMatch(/held by the missing app/);
    expect(await say(A, 'apps install messages')).toMatch(/You install Messages/);
    expect(await heard(B, /held by the missing app/)).toMatch(/held by the missing app/);
  });

  it('3 · no implant', async () => {
    expect(await say(A, 'i')).not.toMatch(/implant/i);
  });

  it('4 · a directed emote reaches someone in another room', async () => {
    expect(await say(B, 'north')).toMatch(/Dave/i);
    B.clearCaptures();
    await say(A, `wave ${nameB}`);
    expect(await heard(B, /wave/i)).toMatch(new RegExp(`${nameA}.*wave`, 'i'));
  });

  it('5 · the room carries emotes to NPCs: Remy reacts', async () => {
    expect(await say(A, 'north')).toMatch(/Dave/i);
    // Remy works the swing shift on weekdays: an evening he is behind the bar.
    await toHour(18, 22);
    for (let d = 0; d < 7 && !/tiefling|Remy/i.test(await say(A, 'look')); d++) {
      await nourish({ handle: nameA } as unknown as Session).catch(() => undefined);
      await advanceWorldClock('24 hours');
    }
    expect(await say(A, 'look'), 'Remy is at the bar').toMatch(/tiefling|Remy/i);
    // Remy's greeting takes his attention as A walks in; let it pass.
    await hears(A, 5_000);
    await say(A, 'wave');
    expect(await heard(A, /the spirit|you're talking/i, 8_000)).toMatch(/the spirit|you're talking/i);
  });

  it('6 · packed: refused (ready it), held; an inbound dm waits', async () => {
    // The test routes find a character by NAME; an embodied one's is not its handle.
    await hand({ handle: nameA } as unknown as Session, RUCKSACK);
    await say(A, 'wear rucksack');
    // A pack on the back is reached by taking it off (carrying D15).
    await say(A, 'remove rucksack');
    expect(await say(A, 'put phone in rucksack')).toMatch(/phone/i);
    await say(A, 'wear rucksack');
    const refused = await say(A, `dm ${nameB} from the bottom of the bag`);
    expect(refused).toMatch(/ready it to send/);
    A.clearCaptures();
    await say(B, `dm ${nameA} hey are you there`);
    expect(await heard(A, /hey are you there/, 800)).not.toMatch(/hey are you there/);
  });

  it('7 · ready it: the held line goes; what waited arrives under "While you were away"', async () => {
    B.clearCaptures();
    // Hands full (coin in one, the rucksack in the other): set it down first.
    await say(A, 'remove rucksack');
    await say(A, 'drop rucksack');
    const readied = squash(`${await say(A, 'get phone from rucksack', 2_000)} ${framesText(A)}`);
    expect(readied).toMatch(/While you were away/);
    expect(await heard(A, /hey are you there/)).toMatch(/hey are you there/);
    expect(await heard(B, /from the bottom of the bag/)).toMatch(/from the bottom of the bag/);
    await say(A, 'get rucksack');
    await say(A, 'wear rucksack');
  });

  it('8 · local emotes need no phone (packed)', async () => {
    await say(A, 'put phone in rucksack');
    B.clearCaptures();
    await say(A, 'smile');
    expect(await heard(B, /smiles/i)).toMatch(new RegExp(`${nameA} smiles`, 'i'));
    await say(A, 'remove rucksack');
    await say(A, 'drop rucksack');
    expect(await say(A, 'get phone from rucksack')).toMatch(/phone/i);
    await say(A, 'get rucksack');
    await say(A, 'wear rucksack');
  });

  it('9 · off: refused (switch phone on), held; on: it goes', async () => {
    const off = await say(A, 'switch phone off');
    expect(off).toMatch(/You switch .*phone off/i);
    expect(await say(A, `dm ${nameB} while it was off`)).toMatch(/switch phone on/);
    B.clearCaptures();
    const on = await say(A, 'switch phone on');
    expect(on, 'switched back on').toMatch(/You switch .*phone on/i);
    await say(A, 'look');
    expect(await heard(B, /while it was off/)).toMatch(/while it was off/);
  });

  it('10 · the battery drains, a little', async () => {
    const before = chargeOf(await examine(A, 'phone'));
    await advanceWorldClock('3 hours');
    await say(A, 'look');
    const after = chargeOf(await examine(A, 'phone'));
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after!).toBeLessThan(before!);
    expect(before! - after!).toBeLessThanOrEqual(10);
  });

  it('11 · dead (staged): refused (charge it), held; a local emote still works', async () => {
    await stage(`#${await phoneId(A)}`, 'setChargeFraction', 0);
    await advanceWorldClock('2 seconds');
    const refused = await say(A, `dm ${nameB} on a dead phone`);
    expect(refused).toMatch(/charge it/);
    expect(await examine(A, 'phone')).toMatch(/battery is dead/);
    B.clearCaptures();
    await say(A, 'nod');
    expect(await heard(B, /nods/i)).toMatch(new RegExp(`${nameA} nods`, 'i'));
  });

  it('12 · a dorm room of A\'s own, its charger, and the charge rises', async () => {
    await funded(handleA, nameA);
    await toHour(10, 14);
    await reopenA({ where: HALL_LOBBY });
    let t = await A.cmd('talk katie');
    if (t.status !== 'ok') t = await A.cmd('talk super');
    expect(t.status, `Katie: ${JSON.stringify(t.notes)} ${squash(await t.said())}`).toBe('ok');
    await choose(A, /need a room/i);
    await choose(A, /./);
    await A.listen(6_000);
    await say(A, 'go up');
    const corridor = await say(A, 'look');
    for (const u of [...corridor.matchAll(/\bunit-(\d+)\b/gi)].map((m) => `unit-${m[1]}`)) {
      if (/dorm room|narrow single room/i.test(await say(A, `go ${u}`))) {
        dormUnit = u;
        break;
      }
    }
    expect(dormUnit, 'A walked into their own unit').toBeTruthy();
    expect(await say(A, 'look')).toMatch(/charger/i);
    const charger = await examine(A, 'charger');
    console.log('DORM CHARGER:', charger.slice(0, 1500));
    console.log('DORM GRID:', await say(A, 'analyze grid'));
    expect(charger).toMatch(/has power/);
    expect(await say(A, 'put phone on charger')).toMatch(/charger/i);
    await advanceWorldClock('1 hour');
    B.clearCaptures();
    await say(A, 'get phone');
    const charged = chargeOf(await examine(A, 'phone'));
    expect(charged).not.toBeNull();
    expect(charged!).toBeGreaterThan(50);
    await say(A, 'look');
    expect(await heard(B, /on a dead phone/)).toMatch(/on a dead phone/);
  }, 600_000);

  it('13 · charging while logged out', async () => {
    await stage(`#${await phoneId(A)}`, 'setChargeFraction', 0.1);
    await say(A, 'put phone on charger');
    A.close();
    await advanceWorldClock('2 hours');
    A = await Session.open(handleA);
    await say(A, 'get phone');
    expect(chargeOf(await examine(A, 'phone'))).toBe(100);
  });

  it('14 · restart: the phone, its charge and a held line read back', async () => {
    await say(A, 'switch phone off');
    expect(await say(A, `dm ${nameB} held through a restart`)).toMatch(/Held/);
    B.close();
    A.close();
    await restartWorld();
    A = await Session.open(handleA);
    B = await Session.open(handleB);
    expect(await examine(A, 'phone')).toMatch(/Hollis Pal/i);
    B.clearCaptures();
    await say(A, 'switch phone on');
    await say(A, 'look');
    expect(await heard(B, /held through a restart/)).toMatch(/held through a restart/);
    expect(chargeOf(await examine(A, 'phone'))).toBeGreaterThan(90);
  }, 900_000);

  it('15 · theft is a brick: B cannot use it, cannot pass it on, cannot sell it', async () => {
    // In the lounge, where no stock phone stands to confuse `get phone`.
    await reopenA({ where: '/world/lounge/location/lounge' });
    B.close();
    B = await Session.open(handleB, { startLocation: '/world/lounge/location/lounge' });
    // B carries a phone of their own: A's is named by its id throughout.
    const id = await phoneId(A);
    await say(A, 'drop phone');
    await say(B, `get #${id}`);
    expect(await examine(B, `#${id}`)).toMatch(/not yours/);
    expect(await say(B, `title transfer #${id} to ${nameA}`)).toMatch(/not yours to hand on/);
    await say(B, `give #${id} to ${nameA}`);
    expect(await examine(A, 'phone')).toMatch(/bound to you/);
  });

  it('15a · buy one: an Aevex and a charger; the new phone is A\'s and tunes A', async () => {
    await reopenA({ where: STORE });
    B.close();
    B = await Session.open(handleB, { startLocation: STORE });
    const bought = await say(A, 'buy "aevex meridian phone"');
    console.log('BUY:', bought, '| WALLET:', await say(A, 'wallet'));
    expect(bought).toMatch(/You buy|bought/i);
    expect(await say(A, 'buy "phone charger"')).toMatch(/You buy|bought/i);
    const look = await examine(A, 'aevex');
    expect(look, look).toMatch(/It is yours\./);
    expect(look).toMatch(/Aevex/);
  });

  it('15b · pass it on: title transfer with consent; it runs for B', async () => {
    const prompt = B.awaitPrompt(30_000);
    const offer = A.cmd(`title transfer aevex to ${nameB}`);
    const p = (await prompt) as unknown as { promptId: string };
    B.answerPrompt(p.promptId, true);
    await offer;
    expect(await hears(A, 1_500)).toMatch(/'s now/);
    await say(A, `give aevex to ${nameB}`);
    expect(await examine(B, 'aevex')).toMatch(/It is yours\./);
  });

  it('18 · light: the dorm room shows its charger by day', async () => {
    // ⚠ By day only: at night the dorm is pitch dark — its mana lamp ships
    // with an empty bay by design (TPA reform D5), before this build.
    await toHour(10, 14);
    await reopenA({ where: HALL_LOBBY });
    await say(A, 'go up');
    expect(await say(A, `go ${dormUnit}`)).toMatch(/dorm room|narrow single room/i);
    expect(await say(A, 'look')).toMatch(/charger/i);
  }, 300_000);
  it('16 · cannot see (staged): a dm waits, and arrives when A can see', async () => {
    await say(A, `testharness afflict ${nameA} ${ANAESTHESIA}`);
    A.clearCaptures();
    await say(B, `dm ${nameA} wake up and read this`);
    expect(await heard(A, /wake up and read this/, 1_000)).not.toMatch(/wake up and read this/);
  });

});

/** A funded stranger: a bank account and the founder's override into it (zone-instancing's pattern). */
async function funded(handle: string, name: string, zorkmids = 2000): Promise<void> {
  const s = await Session.open(handle, { startLocation: BANK_HALL });
  try {
    await s.drainProse();
    await say(s, 'bank open');
    const gov = await Session.open('founder', { startLocation: BANK_HALL });
    try {
      await say(gov, `reserve override ${zorkmids} to ${name} "wire: aether-devices funding"`);
    } finally {
      gov.close();
    }
  } finally {
    s.close();
  }
}
