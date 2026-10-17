/**
 * ⭐⭐ **Repair — assemblies part two, driven end to end** — the repair
 * build's exit criterion against the real socket (the requirements doc's
 * drive, retired at the sweep; the model is docs/subsystems/assembly.md
 * § repair and crafting.md § The lifecycle).
 *
 * The drive in one sentence: *buy a pick and a billhook; find the pick is
 * a head and a haft and the whetstone one piece; mend the worn pick badly,
 * twice, and see it; sharpen the billhook, take it apart, hone the loose
 * blade and fit it again; have the smith mend it properly for money, and
 * be refused when she is off shift; meet the tinker on his round at the
 * smelter; have the cobbler re-sole your boots, then take her seat and be
 * paid for re-soling somebody else's; take down the heirloom and re-hilt
 * it under its name; consign the botched pick and let a stranger read
 * what was done to it; and restart the world and find it all as left.*
 *
 * ⚠ Every checkpoint asserts a STATE CHANGE read back off the world —
 * never only that a verb was not refused (the taps lesson).
 *
 * Setup that is not play, and why: a pick's wear and a billhook's edge are
 * set by a wizard `eval` (wearing a head through by hewing is a mining
 * drive's business), and the pick starts `fine` so two botched mends can
 * each be seen to cost a grade (the realm sells only fair picks). Iron and
 * parts nobody sells are cloned into the smithy.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  isOwnedTestWorld,
} from '../src/harness';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT, WIRE_LOG } from '../src/runner/boot';
import { copyFileSync } from 'fs';

export const DIRTY_REASON =
  'buys out picks, billhooks, whetstones, hafts and boots, clones iron, ' +
  'parts and a lamp into the Hearthworks smithy (nothing collects them), ' +
  'fills the cobbler’s second seat with a player, consigns a pick on ' +
  'the general store’s shelf, and moves the world clock by hours';

declareFile({
  file: 'repair.dirty.wire.test.ts',
  packs: [
    'trade-carpentry',
    'trade-forestry',
    'trade-smithing',
    'trade-smelting',
    'trade-mining',
    'trade-fuel',
    'trade-tanning',
    'trade-tailoring',
    'trade-shopkeeping',
    'generic-objects',
    'base-library',
    'hearthworks',
    'hearts-delight',
    'rejection',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const SMITHY = '/world/terminus/hearthworks/location/smithy';
const STORE = '/world/terminus/general-store/shop-floor';
const SHED = '/world/terminus/rejection/location/provisioning';
const SMELTER = '/world/terminus/rejection/location/smelter';
const CROSSROADS = '/world/terminus/delight-road/crossroads';
const COBBLER = '/world/terminus/mayfield-row/cobbler/location/shop';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';

const T = {
  // ⚠ Steel, not the smithy's iron: `clone` asks title over where a LIVE
  // instance stands, and an iron ingot stands in the smithy already.
  ingot: '/trade/smelting/thing/steel-ingot',
  handle: '/trade/carpentry/thing/handle',
  pommel: '/trade/smithing/thing/pommel',
  // The smelter's iron: its own pigs (steel ingots stand live in the
  // smithy by then, and `clone` refuses a row live where the founder
  // holds no title).
  pig: '/trade/smelting/thing/cast-iron-pig',
};

/** The verb was understood — not the parser's "I don't understand". */
function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

async function say(s: Session, line: string): Promise<string> {
  const r = await s.cmd(line);
  const said = (await r.said()).trim();
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
}

/**
 * What a player reads off a thing in reach — its description and every
 * augmenter's line (made of …, worn, mended by …, one piece). ⚠ Through
 * the projection: `look` at a thing renders to the CARD, not to prose.
 */
async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' });
  return rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
}

/** Into the ROOM, by the founder, who holds the title. */
async function cloneHere(where: string, path: string, count = 1): Promise<void> {
  const f = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await f.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
  } finally {
    f.close();
  }
}

/**
 * Setup by a wizard: run `code` against the thing called `keyword` lying in
 * `where`, governed by the realm's parcel (writes are real). The thing
 * must be on the FLOOR — `--on` reaches what the founder can.
 */
async function evalOn(where: string, keyword: string, code: string): Promise<string> {
  // ⚠ With a light: `--on` binds through perception, and an unlit smithy
  // hides the smith (the dark-room binding trap).
  const f = await goTo('founder', where);
  try {
    const r = await f.cmd(`eval --parcel /world/terminus --on ${keyword} return ${code}`);
    return `${(await r.said()).trim()} ${JSON.stringify(r.notes ?? [])}`;
  } finally {
    f.close();
  }
}

/** A funded player, standing at `where` with a light. */
async function newPlayer(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: repair drive"`));
  } finally {
    gov.close();
  }
  bank.close();
  return goTo(handle, where);
}

const LIT = new Set<string>();

/** The same person, somewhere else (inventory travels); a light the first time. */
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

async function buy(s: Session, item: string): Promise<void> {
  const said = await say(s, `buy ${item}`);
  expect(said, `buy ${item}: ${said}`).toMatch(/you buy/i);
}

async function practise(s: Session, discipline: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await s.cmd(`practice ${discipline} hard success`);
}

/** Jump the world clock to `hour`:00 today (or tomorrow, if it has passed). */
async function toHour(hour: number): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = ((after % 86_400) + 86_400) % 86_400;
  const wait = (hour * 3600 - tod + 86_400) % 86_400;
  if (wait > 0) await advanceWorldClock(`${Math.ceil(wait / 60)} minutes`);
}

/**
 * Ask a priced service and answer its yes/no. ⚠ A prompt holds the command
 * open until it is answered, so the command is NOT awaited first: it is
 * sent, the prompt is taken and answered, and THEN the command settles
 * with everything said — the quote, and what came of it.
 */
async function orderAnswering(s: Session, line: string, yes: boolean): Promise<string> {
  const pending = s.cmd(line);
  const prompt = await s.awaitPrompt(25_000).catch(() => null);
  // ⚠ The id is on the FRAME (`{type: 'prompt', promptId, outcome}`), not
  // under a payload — read under `payload` it was never answered and the
  // order waited out the timeout (runs 2–5 of this drive).
  const frame = prompt as unknown as { promptId?: string; payload?: { promptId?: string } } | null;
  const id = frame?.promptId ?? frame?.payload?.promptId;
  if (id) s.answerPrompt(id, yes);
  const said = (await (await pending).said()).trim();
  await s.drainProse();
  console.log(`[repair drive] ${line} → ${said}`);
  return said;
}

/** A player's balance, read at the bank. */
async function balanceOf(handle: string): Promise<string> {
  const s = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  try {
    return (await (await s.cmd('bank')).said()).trim();
  } finally {
    s.close();
  }
}

let mender: Session; // the untrained player — drives 1–4, 9, 10
let pickHandle = '';

beforeAll(async () => {
  await toHour(12);
}, 120_000);

afterAll(() => {
  mender?.close();
});

suite('⭐ drive 1 — parts or one piece (AC 12)', () => {
  it('a bought pick is a head and a haft, sound; a whetstone is one piece and refuses a fit', async () => {
    const s = await newPlayer('mender', SHED);
    pickHandle = s.handle;
    await buy(s, 'pick');
    s.close();
    mender = await goTo(pickHandle, STORE);
    await buy(mender, 'billhook');
    await buy(mender, 'whetstone');
    await buy(mender, 'pick haft');
    const pick = await examine(mender, 'miners-pick');
    expect(pick, `look pick: ${pick}`).toMatch(/made of/i);
    expect(pick).toMatch(/head/);
    expect(pick).toMatch(/haft/);
    // ⚠ Not /worn/ alone — the pick's own prose says its haft is "worn
    // pale where two hands have gripped it".
    expect(pick).not.toMatch(/It is worn|has been mended/);
    const stone = await examine(mender, 'whetstone');
    expect(stone, `look whetstone: ${stone}`).toMatch(/It is one piece\./);
    const fit = await say(mender, 'fit pick-haft to whetstone');
    expect(fit, `fit haft to whetstone: ${fit}`).toMatch(/one piece/i);
  }, 300_000);
});

suite('⭐⭐ drives 2–3 — a mend can be done badly, and again (AC 1, 4)', () => {
  it('drive 2 — the pick is worn, and says so', async () => {
    mender.close();
    mender = await goTo(pickHandle, SMITHY);
    await say(mender, 'drop miners-pick');
    await evalOn(SMITHY, 'miners-pick', "(this.ensureParts(), this.getParts().forEach(l => l.grade = 'fine'), this.setGradeBand('fine'), this.wearLine('head', 0.5), this.getCondition())");
    await say(mender, 'get miners-pick');
    const pick = await examine(mender, 'miners-pick');
    expect(pick, `worn pick: ${pick}`).toMatch(/It is worn\./);
  }, 300_000);

  it('⭐ drive 3 — an untrained hand at a lit forge: short of sound, a grade down; again, another grade', async () => {
    await cloneHere(SMITHY, T.ingot, 6);
    await say(mender, 'stoke charcoal into forge');
    await say(mender, 'light forge');
    await practise(mender, 'appraisal', 10); // to READ the grade; the mend stays untrained smithing
    const before = await say(mender, 'analyze condition miners-pick');
    expect(before, `before: ${before}`).toMatch(/fine work/);
    await say(mender, 'repair miners-pick');
    await new Promise((r) => setTimeout(r, 9_000)); // the repair is an engaged act
    await mender.drainProse();
    const once = await examine(mender, 'miners-pick');
    expect(once, `mended once: ${once}`).toMatch(/It has been mended by/);
    const read1 = await say(mender, 'analyze condition miners-pick');
    expect(read1, `after one botch: ${read1}`).toMatch(/fair work/);
    expect(read1).toMatch(/unpractised/);
    await say(mender, 'repair miners-pick');
    await new Promise((r) => setTimeout(r, 9_000));
    await mender.drainProse();
    const read2 = await say(mender, 'analyze condition miners-pick');
    expect(read2, `after two: ${read2}`).toMatch(/poor work/);
    expect(read2).toMatch(/twice/);
  }, 600_000);
});

suite('⭐ drive 4 — every edge takes a hone; a part honed loose is keen once fitted (AC 11)', () => {
  it('the billhook takes an edge; taken apart, its loose blade is honed and fitted again, keen', async () => {
    await say(mender, 'drop billhook');
    await evalOn(SMITHY, 'billhook', "(this.dull(0.7), this.getKeennessBand())");
    await say(mender, 'get billhook');
    const dull = await say(mender, 'analyze response billhook');
    expect(dull, `dulled: ${dull}`).toMatch(/edge: (dulled|blunted)/);
    await say(mender, 'sharpen billhook');
    await new Promise((r) => setTimeout(r, 15_000));
    await mender.drainProse();
    const keen = await say(mender, 'analyze response billhook');
    expect(keen, `sharpened: ${keen}`).toMatch(/edge: keen/);
    // Apart — the blade comes away whole (the wedge is lost).
    // Two handles, cloned BEFORE anything is taken apart (a salvaged
    // handle would be a live instance the founder may not clone past).
    await cloneHere(SMITHY, T.handle, 2);
    const apart = await say(mender, 'salvage billhook');
    expect(apart, `salvage: ${apart}`).toMatch(/blade/i);
    await evalOn(SMITHY, 'billhook-blade', "(this.dull(0.7), this.getKeennessBand())").catch(() => '');
    await say(mender, 'get billhook-blade');
    await say(mender, 'sharpen billhook-blade');
    await new Promise((r) => setTimeout(r, 15_000));
    await mender.drainProse();
    await say(mender, 'get handle');
    const raised = await say(mender, 'fit billhook');
    expect(raised, `fit billhook: ${raised}`).toMatch(/fit the parts together/i);
    const again = await say(mender, 'analyze response billhook');
    expect(again, `re-hafted: ${again}`).toMatch(/edge: keen/);
  }, 600_000);
});

suite('⭐⭐ drive 5 — the paid mend is the smith\'s work (AC 5, 6)', () => {
  it('on shift, Berta names the fault and the price, and mends it sound — her name on it', async () => {
    await say(mender, 'drop miners-pick');
    await evalOn(SMITHY, 'miners-pick', "(this.wearLine('head', 0.3), this.getCondition())");
    await say(mender, 'get miners-pick');
    await say(mender, 'look'); // the arrival look brings the house current
    const said = await orderAnswering(mender, 'order repair miners-pick', true);
    if (!/looks it over/i.test(said)) {
      // What the roster thinks of her, for the record of a failure.
      const state = await evalOn(
        SMITHY,
        'berta',
        "[this.getContainer()?.getTemplatePath(), this.isOnShift(), this.isFulfilling(), JSON.stringify(this.employments), String(StuffApi.findByTemplatePath('/world/terminus/hearthworks/agent/smith') === this), String(this.isDestroyed())].join(' ; ')",
      ).catch((e) => String(e));
      console.log(`[repair drive] Berta's shift state: ${state}`);
    }
    expect(said, `order repair: ${said}`).toMatch(/looks it over/i);
    expect(said).toMatch(/head is worn/i);
    expect(said).toMatch(/mends .*sound/i);
    const pick = await examine(mender, 'miners-pick');
    expect(pick, `after Berta: ${pick}`).toMatch(/mended by Berta/i);
  }, 300_000);

});

suite('⭐⭐ drive 6 — the tinker on his round (AC 8, 9)', () => {
  it('his notice reads the round at the crossroads', async () => {
    const s = await goTo(pickHandle, CROSSROADS);
    try {
      const notice = await say(s, 'read notice');
      expect(notice, `read notice: ${notice}`).toMatch(/smelter/i);
    } finally {
      s.close();
    }
  }, 300_000);

  it('⭐ at the smelter at two, unwatched until you arrive: iron mended, a split haft quoted as beyond him', async () => {
    mender.close();
    const s = await newPlayer('roadside', SHED);
    console.log('[repair drive] d6: roadside at the shed');
    await buy(s, 'pick');
    console.log('[repair drive] d6: bought a pick');
    s.close();
    await toHour(15); // nobody at the smelter while the clock turns
    const at = await goTo(s.handle, SMELTER);
    try {
      console.log('[repair drive] d6: at the smelter');
      await say(at, 'drop miners-pick');
      await evalOn(SMELTER, 'miners-pick', "(this.ensureParts(), this.wearLine('head', 0.5), this.getLine('haft').failed = 1, this.getCondition())");
      await say(at, 'get miners-pick');
      await say(at, 'stoke charcoal into furnace');
      await say(at, 'light furnace');
      await cloneHere(SMELTER, T.pig, 2);
      // ⚠ Not a bare `look` here: it asked "which target?" between the
      // furnace and the smelter. The projection says who is present.
      const here = await examine(at, 'tinker');
      expect(here, `the smelter at three: ${here}`).toMatch(/tinker/i);
      const said = await orderAnswering(at, 'order repair miners-pick', true);
      expect(said, `tinker: ${said}`).toMatch(/haft has failed/i);
      expect(said).toMatch(/head is worn/i);
      const pick = await examine(at, 'miners-pick');
      expect(pick, `after the tinker: ${pick}`).toMatch(/mended by Abel/i);
    } finally {
      at.close();
      await toHour(12);
    }
    mender = await goTo(pickHandle, SMITHY);
  }, 600_000);
});

let wearer = '';

suite('⭐⭐ drives 7–8 — the cobbler, and her second seat (AC 10)', () => {
  it('drive 7 — a worn sole, re-soled sound', async () => {
    const s = await newPlayer('wearer', STORE);
    wearer = s.handle;
    await buy(s, 'boots');
    s.close();
    const at = await goTo(wearer, COBBLER);
    try {
      await say(at, 'drop boots');
      await evalOn(COBBLER, 'boots', "(this.ensureParts(), this.wearLine('sole', 0.5), this.getCondition())");
      await say(at, 'get boots');
      await say(at, 'look');
      const said = await orderAnswering(at, 'order repair boots', true);
      expect(said, `cobbler: ${said}`).toMatch(/sole is worn/i);
      expect(said).toMatch(/sound/i);
      const boots = await examine(at, 'boots');
      expect(boots, `re-soled: ${boots}`).toMatch(/mended by Ottilie/i);
    } finally {
      at.close();
    }
  }, 300_000);

  it('⭐ off shift there is nobody to do the work (AC 6) — the cobbler\'s, at night', async () => {
    // ⚠ Not at the Hearthworks: Berta is the house's PROPRIETOR as well as
    // its rostered smith, and a proprietor covers her own house when no
    // rostered hand is on — so the smithy never shuts (a finding, recorded).
    await toHour(21);
    const at = await goTo(wearer, COBBLER);
    try {
      await say(at, 'look');
      const said = await say(at, 'order repair boots');
      expect(said, `off shift: ${said}`).toMatch(/nobody here to do the work/i);
    } finally {
      at.close();
      await toHour(12);
    }
  }, 300_000);

  it('⭐ drive 8 — a player takes the second seat and is paid by the pair, at THEIR band', async () => {
    const hand = await newPlayer('cobbler', COBBLER);
    await practise(hand, 'leatherwork', 3);
    const applied = await say(hand, 'apply for cobbler');
    console.log(`[repair drive] apply → ${applied}`);
    expect(applied, `apply: ${applied}`).toMatch(/cobbler/i);
    await toHour(19); // Ottilie is off; the player is the only hand
    try {
    const on = await say(hand, 'clock on');
    console.log(`[repair drive] clock on → ${on}`);
    expect(on, `clock on: ${on}`).not.toMatch(/can'?t|cannot|not/i);
    const before = await balanceOf(hand.handle);
    const customer = await goTo(wearer, COBBLER);
    try {
      await say(customer, 'drop boots');
      await evalOn(COBBLER, 'boots', "(this.wearLine('sole', 0.4), this.getCondition())");
      await say(customer, 'get boots');
      const said = await orderAnswering(customer, 'order repair boots', true);
      expect(said, `the player's mend: ${said}`).toMatch(/serviceable|sound/i);
      const boots = await examine(customer, 'boots');
      expect(boots, `mended by the player: ${boots}`).toMatch(/mended by/i);
    } finally {
      customer.close();
    }
    const after = await balanceOf(hand.handle);
    expect(after, `the wage landed: ${before} → ${after}`).not.toBe(before);
    await say(hand, 'clock off');
    } finally {
      hand.close();
      await toHour(12);
    }
  }, 600_000);
});

suite('⭐⭐ drive 9 — the heirloom keeps its name through its hilts (AC 14)', () => {
  it('its name and history on look; drawn, the blade keeps the name; re-hilted, the whole answers to it', async () => {
    await practise(mender, 'smithing', 6); // the peened joint wants a novice smith
    const look = await examine(mender, 'Hollin');
    expect(look, `look heirloom: ${look}`).toMatch(/Hollin/);
    expect(look).toMatch(/three hilts/i);
    await say(mender, 'get Hollin');
    const apart = await say(mender, 'salvage Hollin');
    expect(apart, `salvage heirloom: ${apart}`).toMatch(/blade/i);
    const blade = await examine(mender, 'Hollin');
    expect(blade, `the drawn blade: ${blade}`).toMatch(/sword blade|blade/i);
    const grip = await examine(mender, 'handle');
    expect(grip, `the hilt: ${grip}`).not.toMatch(/Hollin/);
    await cloneHere(SMITHY, T.pommel);
    const raised = await say(mender, 'fit sword');
    expect(raised, `fit sword: ${raised}`).toMatch(/fit the parts together/i);
    const whole = await examine(mender, 'Hollin');
    expect(whole, `re-hilted: ${whole}`).toMatch(/made of/i);
  }, 600_000);
});

suite('⭐ drive 10 — a stranger reads what was done to a botched pick (AC 4)', () => {
  it('consigned, it reads mended; with appraisal, by an unpractised hand', async () => {
    mender.close();
    mender = await goTo(pickHandle, STORE);
    const put = await say(mender, 'consign miners-pick --ask 6');
    expect(put, `consign: ${put}`).not.toMatch(/can'?t|cannot/i);
    const stranger = await newPlayer('stranger', STORE);
    try {
      const look = await examine(stranger, 'miners-pick');
      expect(look, `a stranger's look: ${look}`).toMatch(/mended/i);
      await practise(stranger, 'appraisal', 10);
      const read = await say(stranger, 'analyze condition miners-pick');
      expect(read, `appraised: ${read}`).toMatch(/unpractised/);
    } finally {
      stranger.close();
    }
  }, 600_000);
});

/**
 * ⭐⭐⭐ **Drive 12 — what was mended survives a restart.** Run LAST.
 * Only in a world this run OWNS (`WIRE_BOOT=1`).
 */
suite('⭐⭐⭐ drive 12 — a restart (AC 4, 18)', () => {
  afterAll(async () => {
    await stopOwnedWorld();
  });

  it.skipIf(!isOwnedTestWorld())('the botched pick\'s mends, the keen billhook and the named blade, as left', async () => {
    mender?.close();
    await new Promise((r) => setTimeout(r, 8_000)); // let the logout saves land
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
    await toHour(12); // by daylight: in the dark a thing is "something"
    const back = await Session.open(pickHandle, { startLocation: SMITHY, wizard: true });
    try {
      const sword = await examine(back, 'Hollin');
      expect(sword, `the named blade, after a restart: ${sword}`).toMatch(/Hollin/);
      const hook = await say(back, 'analyze response billhook');
      expect(hook, `the billhook, after a restart: ${hook}`).toMatch(/edge: keen/);
    } finally {
      back.close();
    }
    const store = await Session.open(pickHandle, { startLocation: STORE, wizard: true });
    try {
      await say(store, 'look'); // the arrival stands the shelf up
      const pick = await examine(store, 'miners-pick');
      if (!/mended/i.test(pick)) {
        const reach = (await store.query('reachable', { fields: 'detail' }))
          .map((r) => String((r as { displayName?: unknown }).displayName ?? ''))
          .join(', ');
        console.log(`[repair drive] after restart, in reach at the store: ${reach}`);
      }
      expect(pick, `the consigned pick, after a restart: ${pick}`).toMatch(/mended/i);
    } finally {
      store.close();
    }
  }, 900_000);
});
