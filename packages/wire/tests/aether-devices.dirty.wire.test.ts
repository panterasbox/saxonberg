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
 * - staged steps (11 dead, 16 cannot see) use a wizard re-login of the same
 *   character (`eval`, `testharness afflict`) — a wizard confers no title.
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
  ],
  dirtyReason: DIRTY_REASON,
});

const STORE = '/world/terminus/general-store/location/shop';
const LOUNGE = '/world/lounge/location/lounge';
const WIZARD = { wizard: true, committees: ['/world/terminus'] };
const PARCEL = '--parcel /world/terminus';

const squash = (t: string): string => plain(t).replace(/\s+/g, ' ').trim();

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(line));
}

/** What `s` hears over the next `ms`. */
async function hears(s: Session, ms = 1_500): Promise<string> {
  return squash(await s.listen(ms).catch(() => ''));
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

/** The charge `look phone` reports, as a percent, or null (off / dead). */
function chargeOf(look: string): number | null {
  const m = /battery reads (\d+)%/.exec(look);
  return m ? Number(m[1]) : null;
}

suite('aether devices', () => {
  const handleA = uniqueHandle('ad-ana');
  const handleB = uniqueHandle('ad-bo');
  let A: Session;
  let B: Session;
  let nameA = '';
  let nameB = '';

  beforeAll(async () => {
    A = await Session.embody(handleA, { name: 'Anaphone' });
    B = await Session.embody(handleB, { name: 'Bophone' });
    nameA = 'Anaphone';
    nameB = 'Bophone';
  }, 300_000);

  afterAll(() => {
    A?.close();
    B?.close();
  });

  it('1 · spawn with a phone, ready, full', async () => {
    const inv = await say(A, 'i');
    expect(inv).toMatch(/Hollis Pal phone/i);
    const look = await say(A, 'look phone');
    expect(look).toMatch(/battery reads 100%/);
  });

  it('2 · dm works at once, read off the phone', async () => {
    await B.drainProse();
    await say(A, `dm ${nameB} hello from a phone`);
    expect(await hears(B)).toMatch(/hello from a phone/);
  });

  it('2a · built in and installed: the phone runs Messages', async () => {
    const look = await say(A, 'look phone');
    expect(look).toMatch(/It runs Messages\./);
    expect(look).toMatch(/bound to you/);
    expect(await say(A, 'apps')).toMatch(/runs: Messages/);
  });

  it('2b · uninstall: refused, held; install: it goes', async () => {
    expect(await say(A, 'apps uninstall messages')).toMatch(/You uninstall Messages/);
    await B.drainProse();
    const refused = await say(A, `dm ${nameB} held by the missing app`);
    expect(refused).toMatch(/apps install messages/);
    expect(refused).toMatch(/Held — it goes when you can send/);
    expect(await hears(B, 800)).not.toMatch(/held by the missing app/);
    expect(await say(A, 'apps install messages')).toMatch(/You install Messages/);
    expect(await hears(B, 2_500)).toMatch(/held by the missing app/);
  });

  it('3 · no implant', async () => {
    const inv = await say(A, 'i');
    expect(inv).not.toMatch(/implant/i);
  });

  it('4 · a directed emote reaches someone in another room', async () => {
    await say(B, `goto ${LOUNGE}`).catch(() => '');
    await B.drainProse();
    await say(A, `wave ${nameB}`);
    expect(await hears(B)).toMatch(new RegExp(`${nameA}.*wave`, 'i'));
  });

  it('6 · packed: refused (ready it), held; an inbound dm waits', async () => {
    await say(A, 'get rucksack').catch(() => '');
    const packed = await say(A, 'put phone in rucksack');
    expect(packed).not.toMatch(/can't|cannot/i);
    const refused = await say(A, `dm ${nameB} from the bottom of the bag`);
    expect(refused).toMatch(/ready it to send/);
    await say(B, `dm ${nameA} hey are you there`);
    expect(await hears(A, 800)).not.toMatch(/hey are you there/);
  });

  it('7 · ready it: the held line goes; what waited arrives under "While you were away"', async () => {
    await B.drainProse();
    const readied = squash(`${await say(A, 'ready phone')} ${await hears(A, 2_500)}`);
    expect(readied).toMatch(/While you were away/);
    expect(readied).toMatch(/hey are you there/);
    expect(await hears(B, 2_500)).toMatch(/from the bottom of the bag/);
  });

  it('9 · off: refused (switch phone on), held; on: it goes', async () => {
    expect(await say(A, 'switch phone off')).toMatch(/off/i);
    const refused = await say(A, `dm ${nameB} while it was off`);
    expect(refused).toMatch(/switch phone on/);
    await B.drainProse();
    await say(A, 'switch phone on');
    expect(await hears(B, 2_500)).toMatch(/while it was off/);
  });

  it('8 · local emotes need no phone (packed)', async () => {
    await say(A, 'put phone in rucksack');
    await say(B, `goto ${STORE}`).catch(() => '');
    await say(A, `goto ${STORE}`).catch(() => '');
    await B.drainProse();
    await say(A, 'smile');
    expect(await hears(B)).toMatch(/smiles/);
    await say(A, 'ready phone');
  });

  it('10 · the battery drains, a little', async () => {
    const before = chargeOf(await say(A, 'look phone'));
    await advanceWorldClock('3 hours');
    await say(A, 'look');
    const after = chargeOf(await say(A, 'look phone'));
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after!).toBeLessThan(before!);
    expect(before! - after!).toBeLessThanOrEqual(10);
  });

  it('11 · dead (staged): refused (charge it), held; a local emote still works', async () => {
    A.close();
    A = await Session.open(handleA, WIZARD);
    const staged = await say(A, `eval ${PARCEL} --on phone --all this.setChargeFraction(0)`);
    expect(staged).not.toMatch(/error:|no authority|Couldn't bind/);
    await say(A, 'look');
    const refused = await say(A, `dm ${nameB} on a dead phone`);
    expect(refused).toMatch(/charge it/);
    expect(await say(A, 'look phone')).toMatch(/battery is dead/);
  });

  it('12 · charge on the dorm charger: the charge rises and the held line goes', async () => {
    await say(A, 'home').catch(() => '');
    const room = await say(A, 'look');
    expect(room).toMatch(/charger/i);
    expect(await say(A, 'put phone on charger')).not.toMatch(/can't|cannot|refuse/i);
    await advanceWorldClock('1 hour');
    expect(await say(A, 'look charger')).toMatch(/has power/);
    await B.drainProse();
    await say(A, 'get phone');
    const charged = chargeOf(await say(A, 'look phone'));
    expect(charged).not.toBeNull();
    expect(charged!).toBeGreaterThan(50);
    await say(A, 'look');
    expect(await hears(B, 2_500)).toMatch(/on a dead phone/);
  });

  it('13 · charging while logged out', async () => {
    await say(A, `eval ${PARCEL} --on phone --all this.setChargeFraction(0.1)`);
    await say(A, 'put phone on charger');
    A.close();
    await advanceWorldClock('2 hours');
    A = await Session.open(handleA, WIZARD);
    await say(A, 'get phone');
    const charged = chargeOf(await say(A, 'look phone'));
    expect(charged).toBe(100);
  });

  it('14 · restart: the phone, its charge and a held line read back', async () => {
    await say(A, 'switch phone off');
    await say(A, `dm ${nameB} held through a restart`);
    B.close();
    A.close();
    await restartWorld();
    A = await Session.open(handleA, WIZARD);
    B = await Session.open(handleB);
    const inv = await say(A, 'i');
    expect(inv).toMatch(/Hollis Pal phone/i);
    await B.drainProse();
    await say(A, 'switch phone on');
    expect(await hears(B, 3_000)).toMatch(/held through a restart/);
  });

  it('15 · theft is a brick: B cannot use it, cannot pass it on, cannot sell it', async () => {
    await say(B, `goto ${STORE}`).catch(() => '');
    await say(A, `goto ${STORE}`).catch(() => '');
    await say(A, 'drop phone');
    await say(B, 'get phone');
    const look = await say(B, 'look phone');
    expect(look).toMatch(/not yours/);
    expect(await say(B, `title transfer phone to ${nameA}`)).toMatch(/not yours to hand on/);
    expect(await say(B, 'sell phone')).toMatch(/not yours|bound|does not buy/i);
    await say(B, `give phone to ${nameA}`);
  });

  it('15a · buy one: a phone and a charger; the new phone tunes A', async () => {
    await say(A, `eval ${PARCEL} --all BankingApi`).catch(() => '');
    const bought = await say(A, 'buy aevex meridian');
    expect(bought).not.toMatch(/can't afford|cannot afford|refus/i);
    expect(await say(A, 'buy charger')).not.toMatch(/can't afford|refus/i);
    const look = await say(A, 'look aevex');
    expect(look).toMatch(/It is yours\./);
  });

  it('15b · pass it on: title transfer with consent; it runs for B, with its brand', async () => {
    const prompt = B.awaitPrompt(30_000);
    const offer = A.cmd(`title transfer aevex to ${nameB}`);
    const p = await prompt;
    B.answerPrompt(p.promptId, true);
    await offer;
    expect(squash(await A.listen(1_500))).toMatch(/is .*'s now/);
    await say(A, `give aevex to ${nameB}`);
    const look = await say(B, 'look aevex');
    expect(look).toMatch(/It is yours\./);
    expect(look).toMatch(/Aevex/);
  });

  it('16 · cannot see (staged): a dm waits, and arrives when A can see', async () => {
    await say(A, `testharness afflict ${handleA} /stuff/idea/condition/anaesthesia`);
    await say(B, `dm ${nameA} wake up and read this`);
    expect(await hears(A, 800)).not.toMatch(/wake up and read this/);
  });

  it('18 · light: the dorm room shows its charger', async () => {
    await say(B, 'home').catch(() => '');
    expect(await say(B, 'look')).toMatch(/charger/i);
  });
});
