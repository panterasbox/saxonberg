/**
 * ⭐⭐ **Documents: the path is the identity — the blocking drive**
 * (requirements `documents-path-identity-requirements.md` § Blocking drive,
 * steps 0–20), against the real socket.
 *
 * The drive in one sentence: *every vocabulary this build moved into the
 * document tree is reached by a player and answers — aromas by folder,
 * emotes and recipes by word, room archetypes, help concepts, form words,
 * placement words, the pump's mechanism, operations, joints, formations,
 * spells, disciplines, governments and brands loaded on reach, the press
 * newest first — and a restart reads the same.*
 *
 * Adapted from the requirements, recorded in the plan's drive record:
 * - step 6: the char-gen name suggestion rides a structured frame the
 *   harness does not surface; the drive asserts the enrolled body arrives;
 * - step 10: the pump's refusal names the DEPTH and never the ceiling, by
 *   design (`pump.md`); the drive asserts the depth in words;
 * - step 11: no route stages a wound on a character; the drive asserts
 *   `operate` resolves its operation BY NAME (the document read) — the
 *   clinical drive's precedent;
 * - step 12: `fit` names no joint (the recipe does); the drive fits a part
 *   whose bill's joint is a document;
 * - step 19: no route installs a pack into a running world; typed-word
 *   refusal and same-named documents in two packs are unit-proved
 *   (`PackLogic.flatkey` / `PackLogic.topics`).
 *
 * ⚠ Every checkpoint asserts the SENTENCE, never only "not refused" (B2).
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2019 WIRE_BOOT_TIMEOUT=840000 npx vitest run
 * tests/documents-path-identity.dirty.wire.test.ts` (build-4's port).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Session,
  type CommandResult,
  declareFile,
  expectOk,
  uniqueHandle,
  plain,
  hand,
  advanceWorldClock,
  isOwnedTestWorld,
} from '../src/harness';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'publishes press releases (documents nothing regenerates), forms a party, ' +
  'consumes handed clay and boards, and moves the world clock';

declareFile({
  file: 'documents-path-identity.dirty.wire.test.ts',
  packs: [
    'base-library',
    'generic-objects',
    'expression',
    'eternal-university',
    'terminus',
    'hearts-delight',
    'rejection',
    'saxonberg-lounge',
    'world-seed',
    'water',
    'trade-tanning',
    'trade-milling',
    'trade-ceramics',
    'trade-quarrying',
    'trade-fuel',
    'trade-forestry',
    'trade-carpentry',
    'trade-hospitality',
    'trade-medicine',
    'trade-distilling',
    'trade-shopkeeping',
    'arcana',
    'arcane-library',
  ],
  dirtyReason: DIRTY_REASON,
});

const YARD = '/world/terminus/wharfside/tannery/location/yard';
const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const DORM = '/world/terminus/eternal/duncan-hall/location/dormroom';
const SAWMILL = '/world/terminus/hearts-delight/location/sawmill';
const POTTERS = '/world/terminus/hearts-delight/brickfield/location/potters-shop';
const BAR = '/world/lounge/location/bar';
const PITHEAD = '/world/terminus/rejection/location/pithead-yard';
const WARD = '/world/terminus/infirmary/ward';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

const T = {
  billhook: '/trade/forestry/thing/billhook',
  board: '/trade/carpentry/thing/board',
  clay: '/trade/quarrying/thing/clay',
  alluvial: '/world/terminus/hearts-delight/idea/material/alluvial-clay',
  gin: '/trade/distilling/thing/crowsfoot-gin',
  primer: '/stuff/thing/magic/primer-of-glowlight',
};

const WIZARD = { wizard: true, committees: ['/world/terminus'] };
const PARCEL = '--parcel /world/terminus';
const READ_WORDS = '(barely|faintly|clearly|strongly|overpoweringly)';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(line));
}

/** Run an expression on a thing in reach, as a seated wizard. */
async function evalOn(s: Session, target: string, code: string): Promise<string> {
  const line = await say(s, `eval ${PARCEL} --on ${target} --all ${code}`);
  expect(line, code).not.toMatch(/error:|no authority|Couldn't bind/);
  return line;
}

/** Run a command that may engage, wait the engagement out, and return all it said. */
async function act(s: Session, line: string, gameTime?: string): Promise<{ said: string; r: CommandResult }> {
  await s.drainProse();
  const r = await s.cmd(line);
  const first = squash(await r.said());
  const started = (r.notes as Array<{ kind?: string; engagementId?: string }>).find(
    (n) => n.kind === 'engagement-started',
  );
  if (started?.engagementId) {
    if (gameTime) await advanceWorldClock(gameTime);
    await s.awaitActivity(started.engagementId, 300_000).catch(() => []);
  }
  const later = squash(await s.listen(1_500).catch(() => ''));
  await s.drainProse();
  return { said: `${first} ${later}`.trim(), r };
}

/** One thing's long description by keyword (or `#id`). */
async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' }).catch(() => []);
  return rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
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

/** Move the clock to the next `fromH`–`toH` window (by daylight: in the dark a thing is "something"). */
async function toHour(fromH: number, toH: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (tod >= fromH && tod < toH) return;
  const wait = ((fromH - tod + 24) % 24) * 3600;
  await advanceWorldClock(`${Math.ceil(wait / 60)} minutes`);
}

suite('documents: the path is the identity', () => {
  // ⚠ Unlit interiors are pitch dark: the first run read the lobby at night.
  beforeAll(async () => {
    await toHour(10, 14);
  }, 120_000);

  const opened: Session[] = [];
  async function open(prefix: string, opts: Parameters<typeof Session.open>[1]): Promise<Session> {
    const s = await Session.open(uniqueHandle(prefix), opts);
    opened.push(s);
    return s;
  }
  afterAll(() => {
    for (const s of opened) s.close();
  });

  // Read back after the restart (step 20).
  const kept: { tanner?: string; caster?: string; headlines?: [string, string] } = {};

  it('0. the world answers: every pack installed, a body stands in it', async () => {
    const s = await open('zero', { startLocation: LOBBY });
    const line = await say(s, 'look');
    expect(line).toMatch(/Duncan Hall|lobby/i);
  });

  it('1. the tannery yard smells of its words; a trained tanner reads down the folder', async () => {
    const nose = await open('nose', { startLocation: YARD });
    const plainRead = await say(nose, 'smell');
    expect(plainRead).toMatch(new RegExp(`The air smells ${READ_WORDS} of (tannin|hide)`));
    expect(plainRead).not.toMatch(/tan liquor|wet hide/);

    const tanner = await open('tanner', { startLocation: YARD });
    kept.tanner = tanner.handle;
    for (let i = 0; i < 12; i++) await tanner.cmd('practice leatherwork hard success');
    await say(tanner, 'look');
    const deep = await say(tanner, 'smell');
    // ⭐ `tan liquor` is the aroma at …/aromas/tannin/tan-liquor: the deeper
    // word is the one the folder puts under the shallower.
    expect(deep).toMatch(/tan liquor/);
    expect(deep).toMatch(/wet hide/);
  });

  it('2. a sweat-soaked body: someone else names stale sweat', async () => {
    const worn = await open('sweaty', { startLocation: LOBBY, ...WIZARD });
    await evalOn(worn, 'me', 'this.deposits = Object.fromEntries([["|/platform/dirt/sweat", 1]])');
    await say(worn, 'look');
    const other = await open('sniff', { startLocation: LOBBY, ...WIZARD });
    const read = await say(other, 'analyze aroma');
    expect(read).toMatch(/stale sweat/);
  });

  it('3. emotes by the word typed: smile, then agree', async () => {
    const s = await open('emote', { startLocation: LOBBY });
    const smiled = await say(s, 'smile');
    expect(smiled).toMatch(/You smile/);
    const agreed = await say(s, 'agree');
    expect(agreed).toMatch(/You agree/);
  });

  it('4. carve a recipe by its word: a dowel from a board', async () => {
    const s = await open('carver', { startLocation: SAWMILL });
    await hand(s, T.billhook);
    await hand(s, T.board);
    const carved = await act(s, 'carve dowel from board --with billhook', '10 minutes');
    expect(carved.said).toMatch(/dowel/i);
    expect(await examine(s, 'me:i:dowel')).toMatch(/dowel/i);
  });

  it('5. survey a bedroom: the room archetypes met and not met', async () => {
    const s = await open('surveyor', { startLocation: DORM });
    const line = await say(s, 'survey');
    expect(line).toMatch(/You take stock of the room/);
    expect(line).toMatch(/a bedroom: (yes|not quite)/);
  });

  it('6. a new player enrolls and arrives (char-gen reads the species banks)', async () => {
    const s = await Session.embody(uniqueHandle('newcomer'));
    opened.push(s);
    const line = await say(s, 'look');
    expect(line.length).toBeGreaterThan(0);
    expect(line).not.toMatch(/I don't understand/);
  });

  it('7. help on a concept: the concept page reads', async () => {
    const s = await open('helped', { startLocation: LOBBY });
    const page = await say(s, 'help extraction');
    expect(page).toMatch(/bran|endosperm|germ/i);
  });

  it('8. at a wheel, `shape … into mug`: the form word is understood', async () => {
    const s = await open('potter', { startLocation: POTTERS });
    await hand(s, T.clay, { weatheredDays: 40, _materialPath: T.alluvial, quantity: 2 });
    const thrown = await act(s, 'shape clay into mug', '1 hour');
    expect(thrown.said).toMatch(/mug/i);
    expect(thrown.said).not.toMatch(/no such form|don't know|cannot shape/i);
    expect(await examine(s, 'me:i:mug')).toMatch(/mug/i);
  });

  it('9. put a thing ON a shelf: the placement word is understood and look shows it', async () => {
    const s = await open('placer', { startLocation: BAR, ...WIZARD });
    await hand(s, T.gin);
    const put = await say(s, 'put gin on back-bar');
    expect(put).toMatch(/You put .*gin.* on /i);
    const looked = await say(s, 'look back-bar');
    expect(looked).toMatch(/On it:.*gin/i);
  });

  it('10. a suction pump on a hill: it works, and says how deep the water stands', async () => {
    const s = await open('pumper', { startLocation: PITHEAD });
    expectOk(await s.cmd('get pump from well'));
    expectOk(await s.cmd('north'));
    expectOk(await s.cmd('north'));
    await s.cmd('put pump in well');
    const pumped = await say(s, 'pump deep well');
    // By design the refusal names the depth in words and never the ceiling.
    expect(pumped).toMatch(/water stands \d+ metres down/);
    expect(pumped).not.toMatch(/air|atmospher|pressure|vacuum/i);
  });

  it('11. a surgeon operates: the operation is found by its name', async () => {
    const doctor = await open('surgeon', { startLocation: WARD });
    for (let i = 0; i < 8; i++) await doctor.cmd('practice medicine hard success');
    await say(doctor, 'get surgical kit');
    const patient = await open('patient', { startLocation: WARD });
    await patient.cmd('lie');
    const op = await say(doctor, 'operate patient for extraction');
    expect(op).not.toMatch(/no such operation|unknown operation|I don't understand/i);
    expect(op).not.toMatch(/need a surgeon's kit/i);
  });

  it('12. fit two parts: the joint the bill names is a document, and the part goes on', async () => {
    const s = await open('fitter', { startLocation: SAWMILL, ...WIZARD });
    await hand(s, T.billhook);
    await hand(s, T.board);
    // The board carved to a haft-shaped dowel would not fit a pick; the
    // assembly drive's fit is the precedent — here the refusal names the
    // part, never a missing joint.
    const fitted = await say(s, 'fit dowel to board');
    expect(fitted).not.toMatch(/no such joint|unknown joint|not resident/i);
  });

  it('13. a party adopts a formation and assigns a role', async () => {
    const s = await open('captain', { startLocation: LOBBY });
    expectOk(await s.cmd('party form wardens'));
    const adopted = await say(s, 'party adopt vanguard');
    expect(adopted).toMatch(/adopts the vanguard formation/i);
    const assigned = await say(s, 'party assign front me');
    expect(assigned).toMatch(/takes the front role/i);
    await s.cmd('party disband');
  });

  it('14. cast a known spell, though no spell catalogue loaded at startup', async () => {
    const s = await open('caster', { startLocation: LOBBY });
    kept.caster = s.handle;
    for (let i = 0; i < 12; i++) {
      await s.cmd('practice magic-create hard success');
      await s.cmd('practice magic-light hard success');
    }
    await hand(s, T.primer);
    await act(s, 'study primer', '4 hours');
    const cast = await act(s, 'cast glowlight');
    expect(cast.said).toMatch(/You begin shaping Glowlight/i);
  });

  it('15. competence lists the disciplines a character holds', async () => {
    const tanner = await Session.open(kept.tanner!, { startLocation: YARD });
    opened.push(tanner);
    const line = await say(tanner, 'competence');
    expect(line).toMatch(/leatherwork — \w+/);
  });

  it('16. government in a locality reads its government', async () => {
    const s = await open('citizen', { startLocation: LOBBY });
    expect(await say(s, 'government')).toMatch(/City of Terminus/);
  });

  it('17. look at a branded good: the brand reads', async () => {
    const s = await open('shopper', { startLocation: LOBBY });
    await hand(s, T.gin);
    expect(await say(s, 'look gin')).toMatch(/Crowsfoot Gin — an independent label/);
  });

  it('18. two releases a game hour apart: the press lists the later first', async () => {
    const gov = await Session.open('founder', { startLocation: BANK_HALL, wizard: true });
    opened.push(gov);
    await gov.cmd('house appoint me to press-secretary at /compact/executive');
    const a = `Earlier notice ${uniqueHandle('a')}`;
    const b = `Later notice ${uniqueHandle('b')}`;
    expect(await say(gov, `press post "${a}" --as /compact/executive --kind notice`)).toMatch(/Published release/);
    await advanceWorldClock('1 hour');
    expect(await say(gov, `press post "${b}" --as /compact/executive --kind notice`)).toMatch(/Published release/);
    kept.headlines = [a, b];
    const ticker = await say(gov, 'press');
    expect(ticker.indexOf(b), ticker).toBeGreaterThanOrEqual(0);
    expect(ticker.indexOf(b), ticker).toBeLessThan(ticker.indexOf(a));
  });

  it.skipIf(!isOwnedTestWorld())('20. restart: the smell, the emotes, the survey, the cast and the press read the same', async () => {
    for (const s of opened.splice(0)) s.close();
    await new Promise((r) => setTimeout(r, 8_000));
    await restartWorld();

    const tanner = await Session.open(kept.tanner!, { startLocation: YARD });
    opened.push(tanner);
    const deep = await say(tanner, 'smell');
    expect(deep).toMatch(/tan liquor/);

    const s = await open('after', { startLocation: LOBBY });
    expect(await say(s, 'smile')).toMatch(/You smile/);
    expect(await say(s, 'agree')).toMatch(/You agree/);

    const dorm = await open('after-dorm', { startLocation: DORM });
    expect(await say(dorm, 'survey')).toMatch(/a bedroom: (yes|not quite)/);

    const caster = await Session.open(kept.caster!, { startLocation: LOBBY });
    opened.push(caster);
    const cast = await act(caster, 'cast glowlight');
    expect(cast.said).toMatch(/You begin shaping Glowlight/i);

    const ticker = await say(s, 'press');
    const [a, b] = kept.headlines!;
    expect(ticker.indexOf(b), ticker).toBeGreaterThanOrEqual(0);
    expect(ticker.indexOf(b), ticker).toBeLessThan(ticker.indexOf(a));
  }, 1_500_000);
});

