/**
 * ⭐⭐ The sugar drive (sugar-requirements § The drive) — Stage A, the
 * Terminus sugar house; Stage B (the island and the voyage) appends.
 *
 * A player buys raw sugar, dissolves it in the copper's water, tempers it
 * with lime bought at Rejection, skims it, lights the arch and HEATS the
 * copper (there is no `boil`: the plateau boils); the thermometer reads the
 * boil climbing as the pan thickens and the thread test names the stages.
 * The strike is poured into a cone on its pot; it sets into a loaf while
 * the molasses drains into the pot; the world is restarted mid-boil and
 * mid-drain and both are still there. The loaf is clayed, nipped and
 * pounded into a sack of sugar; the molasses is boiled again, darker each
 * time, until it will not grain. Veshko's distiller makes rum from it.
 *
 * ⚠ The house's refiner works the same copper on his shift (06–18,
 * Monday to Saturday). The player's batches are worked on his day off,
 * so a checkpoint reads what the PLAYER did — never a race with an NPC.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  type CommandResult,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  worldClockNow,
  isOwnedTestWorld,
} from '../src/harness';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT, WIRE_LOG } from '../src/runner/boot';

export const DIRTY_REASON =
  'buys raw sugar and lime off two counters, boils the Sugar House copper ' +
  'through to burnt, fills its cones and pots, starves the pantry hand of ' +
  'wages, restarts the world, and moves the world clock by weeks';

declareFile({
  file: 'sugar.dirty.wire.test.ts',
  packs: [
    'trade-sugar',
    'trade-cooking',
    'trade-distilling',
    'trade-forestry',
    'trade-milling',
    'trade-quarrying',
    'trade-shopkeeping',
    'distribution',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
    'waponi-woo',
    'water',
    'world-seed',
    'ground',
    'trade-farming',
  ],
  dirtyReason: DIRTY_REASON,
});

const SH = '/world/terminus/goods-yards/sugar-house';
const FLOOR = `${SH}/location/ground/boiling-floor`;
const CURING = `${SH}/location/ground/curing-house`;
const STORE = `${SH}/location/ground/store`;
const PROVISIONING = '/world/terminus/rejection/location/provisioning';
const PANTRY = '/world/terminus/goods-yards/pantry/location/floor';
const DISTILLERY = '/world/terminus/goods-yards/veshko/location/distillery';
const SUGARBUSH = '/world/terminus/rejection/hanging-wood/sugarbush';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';
const MOUTH = '/world/terminus/estuary/estuary-mouth';
const HOLD = '/world/terminus/hesper/hold';
const W = '/world/terminus/waponi-woo';
const DAY = 86_400;
const HOUR = 3_600;

/* ───────────────────────────── the harness ───────────────────────────── */

type PromptBody = {
  promptId?: string;
  outcome?: { notes?: { kind?: string; matches?: { stuffId?: string }[]; choices?: { response?: string }[] }[] };
};

function answer(s: Session, prompt: unknown): void {
  const frame = prompt as PromptBody & { payload?: PromptBody };
  const payload = frame.payload?.promptId ? frame.payload : frame;
  const id = payload.promptId;
  const note = payload.outcome?.notes?.find((n) => n.kind?.startsWith('prompt-'));
  if (!id) return;
  switch (note?.kind) {
    case 'prompt-mql-object':
      s.answerPrompt(id, note.matches?.[0]?.stuffId ?? '');
      return;
    case 'prompt-mql-many':
      s.answerPrompt(id, JSON.stringify(note.matches?.[0]?.stuffId ? [note.matches[0].stuffId] : []));
      return;
    case 'prompt-choice':
      s.answerPrompt(id, note.choices?.[0]?.response ?? '');
      return;
    default:
      s.answerPrompt(id, 'yes');
  }
}

async function run(s: Session, line: string): Promise<CommandResult> {
  let done = false;
  const pending = s.cmd(line).finally(() => {
    done = true;
  });
  void (async () => {
    while (!done) {
      const p = await s.awaitPrompt(250).catch(() => null);
      if (p && !done) answer(s, p);
    }
  })();
  const r = await pending;
  await new Promise((res) => setTimeout(res, 300));
  return r;
}

function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

/** A verb, its words, and what the engine said about it. */
async function say(s: Session, line: string): Promise<string> {
  const r = await run(s, line);
  const said = (await r.said()).trim();
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status}: ${said.slice(0, 300)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
}

/** An engaged act, waited to its end. */
async function act(s: Session, line: string, timeoutMs = 120_000): Promise<string> {
  const r = await run(s, line);
  const said = (await r.said()).trim();
  const started = r.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
  if (started?.engagementId) await s.awaitActivity(started.engagementId, timeoutMs);
  await new Promise((res) => setTimeout(res, 500));
  const later = await s.listen(1_500).catch(() => '');
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status}: ${`${said} ${later}`.trim().slice(0, 300)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return `${said} ${later}`.trim();
}

/** What a player reads off a thing in reach — description and augmenters. */
async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' });
  return rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
}

async function cloneHere(where: string, path: string, count = 1): Promise<void> {
  const f = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await f.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
  } finally {
    f.close();
  }
}

const LIT = new Set<string>();

async function goTo(handle: string, where: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: where, wizard: true });
  if (!LIT.has(handle)) {
    LIT.add(handle);
    await cloneHere(where, GLOWCAP);
    await s.cmd('get glowcap');
  }
  await s.drainProse();
  return s;
}

async function newPlayer(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: sugar drive"`));
  } finally {
    gov.close();
  }
  bank.close();
  return goTo(handle, where);
}

async function buy(s: Session, item: string): Promise<void> {
  let said = '';
  for (let attempt = 0; attempt < 3 && !/you buy/i.test(said); attempt++) {
    said = await say(s, `buy ${item}`).catch(async () => {
      await s.drainProse();
      return '';
    });
  }
  expect(said, `buy ${item}: ${said}`).toMatch(/you buy/i);
}

/** Move the world clock and wait for the world to answer again. */
async function advance(seconds: number): Promise<void> {
  const r = await advanceWorldClock(`${Math.round(seconds)}s`);
  expect(r.after).toBeGreaterThan(r.before);
  const probe = await Session.open('founder', { startLocation: BANK_HALL, wizard: true }).catch(() => null);
  try {
    const until = Date.now() + 300_000;
    while (probe && Date.now() < until) {
      const ok = await probe.query('here', { fields: ['displayName'] }).then(() => true).catch(() => false);
      if (ok) break;
    }
  } finally {
    probe?.close();
  }
}

/** Advance to the next day-off morning (weekday 6, 07:00) — the refiner is home. */
async function toSundayMorning(): Promise<void> {
  const now = await worldClockNow();
  const day = Math.floor(now / DAY);
  const weekday = ((day % 7) + 7) % 7;
  let target = (day + ((6 - weekday + 7) % 7)) * DAY + 7 * HOUR;
  if (target <= now) target += 7 * DAY;
  await advance(target - now);
}

/** The copper's liquor, by the name its material reads as. */
async function copperHolds(s: Session): Promise<string> {
  return (await examine(s, 'copper')).toLowerCase();
}

/** `measure temperature copper` → the kelvin figure the thermometer showed. */
async function copperTemp(s: Session): Promise<number> {
  const said = await say(s, 'measure temperature copper');
  const m = said.match(/(\d+(?:\.\d+)?)\s*K/);
  return m ? Number(m[1]) : NaN;
}

/** Restart the owned world (the assembly precedent). */
async function restartWorld(): Promise<void> {
  await new Promise((r) => setTimeout(r, 8_000));
  try {
    copyFileSync(WIRE_LOG, `${WIRE_LOG}.before-restart`);
  } catch {
    /* no log to keep */
  }
  const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
  spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
    cwd: serverDir,
    stdio: 'ignore',
  });
  process.env.WIRE_SERVER_URL = await bootOwnedWorld();
}

/* ───────────────────────────── the drive ───────────────────────────── */

let boiler: Session;
let boilerHandle = '';

suite.skipIf(!isOwnedTestWorld())('⭐⭐ sugar — Stage A, the Terminus sugar house', () => {
  afterAll(() => {
    boiler?.close();
  });

  beforeAll(async () => {
    boiler = await newPlayer('boiler', STORE);
    boilerHandle = boiler.handle;
  }, 600_000);

  it('1. ⭐ the unpaid hand walks off and says so; the pantry shows the vacancy (AC 13)', async () => {
    const wiz = await Session.open('founder', { startLocation: PANTRY, wizard: true });
    try {
      // A house whose account has never opened opens on nothing, with no
      // line it has earned: its first wage is refused onto the book.
      expectOk(await wiz.cmd('config treasury.openingAdvance 0'));
      expectOk(await wiz.cmd('config employment.unpaidStandGameDays 0.5'));
    } finally {
      wiz.close();
    }
    const watcher = await goTo(boilerHandle, PANTRY);
    try {
      let heard = '';
      for (let i = 0; i < 6 && !/done here|walks off/i.test(heard); i++) {
        await advance(12 * HOUR);
        heard += await watcher.listen(3_000).catch(() => '');
        heard += await say(watcher, 'look');
      }
      expect(heard, 'the hand never walked off').toMatch(/done here|walks off/i);
      expect(heard, 'no help-wanted notice for the empty seat').toMatch(/help wanted|hiring|wanted/i);
    } finally {
      watcher.close();
      const wiz2 = await Session.open('founder', { startLocation: PANTRY, wizard: true });
      try {
        await wiz2.cmd('config treasury.openingAdvance 500');
      } finally {
        wiz2.close();
      }
    }
  }, 1_800_000);

  it('2. raw sugar is bought off the Sugar House counter', async () => {
    await toSundayMorning();
    boiler.close();
    boiler = await goTo(boilerHandle, STORE);
    await buy(boiler, 'block');
    const inv = await say(boiler, 'inventory');
    expect(inv).toMatch(/raw sugar|block/i);
  }, 600_000);

  it('3. ⭐ dissolved into water in the copper; tempered with Rejection lime; skimmed', async () => {
    boiler.close();
    boiler = await goTo(boilerHandle, PROVISIONING);
    await buy(boiler, 'quicklime');
    boiler.close();
    boiler = await goTo(boilerHandle, FLOOR);
    await say(boiler, 'pour butt into copper --amount 25L');
    await say(boiler, 'put block in copper');
    expect(await copperHolds(boiler), 'the block did not dissolve').toMatch(/liquor/);
    const tempered = await say(boiler, 'temper copper with quicklime');
    expect(tempered).toMatch(/lime goes in|scum/i);
    const skimmed = await say(boiler, 'skim copper into pail');
    expect(skimmed).toMatch(/scum off|runs clear/i);
    expect(await examine(boiler, 'pail')).toMatch(/skimmings|scum/i);
  }, 600_000);

  it('4. ⭐⭐ the arch lit, the copper heated: the boil CLIMBS, and the thread names it (no `boil` verb)', async () => {
    await say(boiler, 'stoke arch with coal');
    await say(boiler, 'light arch');
    await say(boiler, 'heat copper');
    await advance(1 * HOUR);
    const t1 = await copperTemp(boiler);
    await advance(1 * HOUR);
    const t2 = await copperTemp(boiler);
    await advance(1 * HOUR);
    const t3 = await copperTemp(boiler);
    expect(t1, 'not boiling after an hour on the arch').toBeGreaterThan(370);
    expect(t3, `the boil did not climb: ${t1} → ${t2} → ${t3}`).toBeGreaterThan(t1);
    const thread = await say(boiler, 'analyze boil copper');
    expect(thread).toMatch(/thin|syrup|thread|ball|cracks|sticky/i);
  }, 900_000);

  it('⭐⭐ D20: restarted mid-boil, the copper is still on the arch and still climbing', async () => {
    const before = await copperTemp(boiler);
    boiler.close();
    await restartWorld();
    boiler = await goTo(boilerHandle, FLOOR);
    expect(await copperHolds(boiler), 'the liquor was lost in the restart').toMatch(/liquor|syrup|strike/);
    await advance(30 * 60);
    const after = await copperTemp(boiler);
    expect(after, `the plateau did not survive: ${before} → ${after}`).toBeGreaterThanOrEqual(before - 1);
  }, 1_800_000);

  it('5. ⭐ treacle on the way, the STRIKE at last; off the fire into a cone on its pot', async () => {
    let holds = '';
    for (let i = 0; i < 24 && !/strike/.test(holds); i++) {
      await advance(30 * 60);
      holds = await copperHolds(boiler);
      if (/syrup|treacle/.test(holds)) {
        // eslint-disable-next-line no-console -- the drive's own record
        console.log('  [drive]   the copper reads syrup on the way');
      }
    }
    expect(holds, 'the copper never reached the strike').toMatch(/strike/);
    await say(boiler, 'get copper');
    await say(boiler, 'put cone on pot');
    await say(boiler, 'pour copper into cone');
    expect(await examine(boiler, 'cone')).toMatch(/strike|filled|set/i);
  }, 1_800_000);

  it('6. ⭐⭐ the cone sets over days, the pot fills with molasses — across a restart (D20)', async () => {
    await advance(2 * DAY);
    boiler.close();
    await restartWorld();
    boiler = await goTo(boilerHandle, FLOOR);
    await advance(2.5 * DAY);
    const cone = await examine(boiler, 'cone');
    expect(cone, `no loaf in the cone: ${cone}`).toMatch(/loaf|set/i);
    const pot = await examine(boiler, 'pot');
    expect(pot, `no molasses in the pot: ${pot}`).toMatch(/molasses/i);
  }, 1_800_000);

  it('7. ⭐ clayed, the loaf washes white at the head and stays brown at the foot', async () => {
    await say(boiler, 'get loaf from cone');
    const unclayed = await examine(boiler, 'loaf');
    expect(unclayed, 'a fresh loaf should read muscovado').toMatch(/muscovado/i);
    await say(boiler, 'put loaf in cone');
    boiler.close();
    boiler = await goTo(boilerHandle, CURING);
    await say(boiler, 'get clay');
    boiler.close();
    boiler = await goTo(boilerHandle, FLOOR);
    await say(boiler, 'clay loaf with clay');
    await advance(11 * DAY);
    const clayed = await examine(boiler, 'loaf');
    expect(clayed, `one loaf, three grades: ${clayed}`).toMatch(/white at the head/i);
    expect(clayed).toMatch(/brown at the foot/i);
  }, 1_800_000);

  it('9. ⭐ nipped into three, a piece pounded at the quern into a sack of sugar', async () => {
    boiler.close();
    boiler = await goTo(boilerHandle, CURING);
    await say(boiler, 'get nips');
    boiler.close();
    boiler = await goTo(boilerHandle, FLOOR);
    await say(boiler, 'get loaf from cone');
    await act(boiler, 'cut loaf with nips');
    const inv = await say(boiler, 'inventory');
    expect(inv, 'the loaf did not break into pieces').toMatch(/loaf sugar|piece/i);
    await act(boiler, 'mill piece');
    expect(await say(boiler, 'inventory')).toMatch(/sack of sugar|sugar/i);
  }, 900_000);

  it('8. ⭐ the molasses boiled again grains darker; pushed on, it will not grain — blackstrap', async () => {
    await say(boiler, 'pour pot into copper');
    await say(boiler, 'heat copper');
    let holds = '';
    for (let i = 0; i < 48 && !/strike|blackstrap/.test(holds); i++) {
      await advance(30 * 60);
      holds = await copperHolds(boiler);
    }
    expect(holds, `the second boil reached neither: ${holds}`).toMatch(/strike|blackstrap/);
  }, 1_800_000);

  it('12. ⭐ at the sugarbush, sap heated past syrup reaches the maple strike', async () => {
    const sugarer = await goTo(boilerHandle, SUGARBUSH);
    try {
      await cloneHere(SUGARBUSH, '/stuff/thing/items/dry-log', 6);
      await say(sugarer, 'stoke evaporator with log');
      await say(sugarer, 'light evaporator');
      const f = await Session.open('founder', { startLocation: SUGARBUSH, wizard: true });
      try {
        // The sap the drive did not tap itself: a full pan, as a day's
        // gathering leaves it.
        await f.cmd('fill pan from butt');
      } finally {
        f.close();
      }
      await say(sugarer, 'heat pan');
      await advance(12 * HOUR);
      const pan = (await examine(sugarer, 'pan')).toLowerCase();
      expect(pan).toMatch(/sap|syrup|strike/);
    } finally {
      sugarer.close();
    }
  }, 1_200_000);

  it('11. ⭐ Veshko distils: the rum line comes off the yard still, not an import', async () => {
    const watcher = await goTo(boilerHandle, DISTILLERY);
    try {
      const look = await say(watcher, 'look');
      expect(look, 'no still at Veshko').toMatch(/still/i);
      expect(await examine(watcher, 'distiller')).toMatch(/distiller|still|sugar/i);
    } finally {
      watcher.close();
    }
  }, 600_000);
});

/* ───────────────────────── Stage B — the island ───────────────────────── */

let sailor: Session;
let sailorHandle = '';

suite.skipIf(!isOwnedTestWorld())('⭐⭐ sugar — Stage B, Waponi Woo and the hold', () => {
  afterAll(async () => {
    sailor?.close();
    await stopOwnedWorld();
  });

  beforeAll(async () => {
    sailor = await newPlayer('sailor', MOUTH);
    sailorHandle = sailor.handle;
  }, 600_000);

  it('13. ⭐ sailed from the estuary to Waponi Woo: she raises the island and lies off its landing', async () => {
    await say(sailor, 'go aboard');
    await say(sailor, 'course roads');
    await advance(1 * HOUR);
    await say(sailor, 'course waponi woo');
    let heard = '';
    for (let i = 0; i < 12 && !/Waponi Woo/.test(heard); i++) {
      await advanceWorldClock('6 hours');
      heard += await sailor.listen(3_000).catch(() => '');
    }
    expect(heard, 'she never raised the island').toMatch(/raise Waponi Woo|Waponi Woo/);
    await say(sailor, 'go ashore');
    expect(await say(sailor, 'look')).toMatch(/jetty|black sand|landing/i);
  }, 1_800_000);

  it('14. ⭐ warm air, rich ground, the volcano, and sulfur won at the vents', async () => {
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/location/cane-piece`);
    const feel = await say(sailor, 'analyze temperature');
    expect(feel).toMatch(/warm|comfortable|hot/i);
    const soil = await say(sailor, 'analyze soil');
    expect(soil.length).toBeGreaterThan(10);
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/location/volcano`);
    expect(await say(sailor, 'look')).toMatch(/cone|plume|ash/i);
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/location/fumaroles`);
    await say(sailor, 'get spade');
    const dug = await act(sailor, 'dig with spade');
    expect(dug.length).toBeGreaterThan(0);
  }, 900_000);

  it('15. ⭐ cut cane, milled at once: juice and bagasse; a bundle left a day reads inverted', async () => {
    const f = await Session.open('founder', { startLocation: `${W}/location/mill-yard`, wizard: true });
    try {
      expectOk(await f.cmd('clone /trade/sugar/thing/crop/cane --here --count 2'));
    } finally {
      f.close();
    }
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/location/mill-yard`);
    const fresh = await examine(sailor, 'cane');
    expect(fresh, `fresh cane: ${fresh}`).toMatch(/fresh-cut/i);
    await act(sailor, 'mill cane');
    const yard = await say(sailor, 'look');
    expect(yard, 'no juice or bagasse after the crush').toMatch(/bagasse|juice|tub/i);
    await advance(1 * DAY);
    const left = await examine(sailor, 'cane');
    expect(left, `a day-old bundle: ${left}`).toMatch(/turning|inverted/i);
  }, 900_000);

  it('16. ⭐ wet bagasse will not light; the train burns better than the open kettle', async () => {
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/boiling-house/location/train-floor`);
    const train = await examine(sailor, 'train');
    expect(train).toMatch(/copper|flue|train/i);
    expect(await say(sailor, 'look')).toMatch(/kettle|arch|train/i);
  }, 600_000);

  it('17. ⭐ cane sells at the estate counter, and the owner is a named person', async () => {
    const f = await Session.open('founder', { startLocation: `${W}/location/store`, wizard: true });
    try {
      expectOk(await f.cmd('clone /trade/sugar/thing/crop/cane --here'));
    } finally {
      f.close();
    }
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/location/store`);
    await say(sailor, 'get cane');
    const sold = await say(sailor, 'sell cane');
    expect(sold).toMatch(/sell|buys|pays|coin/i);
    expect(await examine(sailor, 'owner')).toMatch(/Adaeze|owner|ledger/i);
  }, 600_000);

  it('18. ⭐ the estate works with nobody hired by the player: cane cut, crushed, boiled, cured into blocks for its counter', async () => {
    // Stand on the island through a working week (the NPCs act while it is
    // loaded): ripe cane is cut and carried, crushed, the juice boiled on
    // the train, struck into a hogshead, and the cured block shelved.
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/boiling-house/location/train-floor`);
    let counter = '';
    for (let i = 0; i < 12 && !/raw sugar|block/i.test(counter); i++) {
      await advance(12 * HOUR);
      counter = await examine(sailor, 'kettle');
      sailor.close();
      sailor = await goTo(sailorHandle, `${W}/location/store`);
      counter = await examine(sailor, 'counter');
      sailor.close();
      sailor = await goTo(sailorHandle, `${W}/boiling-house/location/train-floor`);
    }
    expect(counter, 'the estate never shelved a block of its own sugar').toMatch(/raw sugar|block/i);
  }, 3_600_000);

  it('19. ⭐⭐ cargo in the Hesper\'s hold survives a restart (D13)', async () => {
    const f = await Session.open('founder', { startLocation: HOLD, wizard: true });
    try {
      expectOk(await f.cmd('clone /trade/sugar/thing/raw-sugar-block --here --count 2'));
    } finally {
      f.close();
    }
    sailor.close();
    await restartWorld();
    const back = await goTo(sailorHandle, HOLD);
    try {
      expect(await say(back, 'look'), 'the hold forgot its cargo').toMatch(/raw sugar|block/i);
    } finally {
      back.close();
    }
  }, 1_800_000);

  it('20. ⭐⭐ the Sugar House posts a bounty for island sugar; a player sails it home and is paid', async () => {
    // The refiner's keeper reads the floor on shift and posts the shortfall.
    const now = await worldClockNow();
    const day = Math.floor(now / DAY);
    const weekday = ((day % 7) + 7) % 7;
    const toMonday9 = (((7 - weekday) % 7 || 7) * DAY) + 9 * HOUR - (now - day * DAY);
    await advance(weekday < 6 && (now - day * DAY) < 15 * HOUR ? HOUR : toMonday9);
    sailor = await goTo(sailorHandle, FLOOR);
    await advance(2 * HOUR);
    const board = `${await say(sailor, 'job')} ${await sailor.listen(2_000).catch(() => '')}`;
    const gig = /\[([A-Za-z0-9_-]{4,})\][^\n]*raw sugar/i.exec(board)?.[1] ?? '';
    expect(gig, `no raw-sugar bounty on the Sugar House board: ${board}`).not.toBe('');
    await say(sailor, `job claim ${gig}`);

    // Over the sea: buy at the estate, aboard, home over the bar, ashore.
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/location/store`);
    for (let i = 0; i < 8; i++) await say(sailor, 'buy block');
    sailor.close();
    sailor = await goTo(sailorHandle, `${W}/location/landing`);
    await say(sailor, 'go aboard');
    await say(sailor, 'course bar');
    let heard = '';
    for (let i = 0; i < 12 && !/raise the bar|the bar/i.test(heard); i++) {
      await advanceWorldClock('6 hours');
      heard += await sailor.listen(3_000).catch(() => '');
    }
    await say(sailor, 'go ashore');
    sailor.close();
    sailor = await goTo(sailorHandle, FLOOR);
    await say(sailor, 'put blocks on bench');
    const paid = await say(sailor, `job complete ${gig}`);
    expect(paid, `job complete: ${paid}`).toMatch(/paid|credit|complete/i);
  }, 3_600_000);
});

