/**
 * ⭐⭐ **Assembly, driven end to end** — the assembly build's exit
 * criterion, run against the real socket (docs/requirements/
 * assembly-requirements.md § The drive).
 *
 * The drive in one sentence: *buy a haft, make a pick from it and a head
 * and read what it is made of; carve a haft from a green billet, fit it,
 * and watch it warp; be told which part failed and replace just that one,
 * in a second pair of hands; rive a bole and saw one at the mill; season
 * billets in the loft; buy staves from the yard; be refused a tight cask
 * until you are good enough, make a barrel instead, then a cask; let it
 * dry out and drive its hoops back down for nothing; spend it and have it
 * re-fired; have the gauger measure it; take it apart; raise a chair round
 * a frame and a cushion; re-shoe a plough twice; re-string a bow; pull a
 * spindle apart; and restart the world and find what you made.*
 *
 * ⚠ Every checkpoint asserts a STATE CHANGE read back off the world (a
 * `look`, a closure, a reading) — never only that the verb was not
 * refused (the taps lesson).
 *
 * Setup: parts the world SELLS are bought (the haft at the general store,
 * billets and staves at the timber yard — drive 16), and `clone` only
 * stands up what no shop sells. ⚠ `clone` asks for title over the
 * template — and, when a live instance exists, over where THAT stands — so
 * a stocked row cannot be cloned even by the founder, and room setup goes
 * through the founder for the rest. `practice` gives the cooper a band
 * without simulating years of barrels. Time moves in jumps of at most
 * forty days: a two-hundred-day jump wedged the world.
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
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'buys out the general store’s hafts and the timber yard’s staves and ' +
  'billets, clones parts and a bole into the Hearthworks smithy and the ' +
  'Heart’s Delight sawmill (nothing collects them), appoints the founder ' +
  'to the city’s gauger seat, and moves the world clock by months';

declareFile({
  file: 'assembly.dirty.wire.test.ts',
  packs: [
    'trade-carpentry',
    'trade-coopering',
    'trade-forestry',
    'trade-smithing',
    'trade-mining',
    'trade-brewing',
    'trade-farming',
    'trade-textiles',
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
const SAWMILL = '/world/terminus/hearts-delight/location/sawmill';
const STORE = '/world/terminus/general-store/shop-floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const REGISTRY = '/world/terminus/registry/business';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';
const FUEL_YARD = '/world/terminus/rejection/location/fuel-yard';

const T = {
  pickHead: '/trade/smithing/thing/pick-head',
  bole: '/trade/forestry/thing/bole',
  froe: '/trade/carpentry/thing/froe',
  billhook: '/trade/forestry/thing/billhook',
  head: '/trade/coopering/thing/cask-head',
  hoop: '/trade/smithing/thing/hoop',
  driver: '/trade/coopering/thing/driver',
  croze: '/trade/coopering/thing/croze',
  inshave: '/trade/coopering/thing/inshave',
  rod: '/trade/coopering/thing/gauging-rod',
  peg: '/trade/carpentry/thing/peg',
  butt: '/stuff/thing/fixture/water-butt',
  brewCask: '/trade/brewing/thing/cask',
  frame: '/trade/carpentry/thing/frame',
  plough: '/trade/farming/thing/plough',
  bow: '/stuff/thing/arms/hunting-bow',
};

/** The verb was understood — not the parser's "I don't understand". */
function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

async function say(s: Session, line: string): Promise<string> {
  const r = await s.cmd(line);
  const said = await r.said();
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
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

/** A funded player, standing at `where` with a light (the world boots at midnight). */
async function newPlayer(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: assembly drive"`));
  } finally {
    gov.close();
  }
  bank.close();
  return goTo(handle, where);
}

const LIT = new Set<string>();

/**
 * The same person, standing somewhere else (inventory travels). The first
 * time, they are handed a glowcap jar to CARRY — `clone` refuses a row with
 * a live instance on ground the founder holds no title to, so each row is
 * cloned once and carried after.
 */
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

async function buy(s: Session, item: string, n = 1): Promise<void> {
  for (let i = 0; i < n; i++) {
    const said = await say(s, `buy ${item}`);
    expect(said, `buy ${item} (#${i + 1}): ${said}`).not.toMatch(/bare of|can'?t afford|no .* here/i);
  }
}

async function practise(s: Session, discipline: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await s.cmd(`practice ${discipline} hard success`);
}

let smith: Session;
let sawyer: Session;
let cooper: Session;

afterAll(() => {
  smith?.close();
  sawyer?.close();
  cooper?.close();
});

suite('⭐⭐ the pick is a head on a haft (drive 2, 10, 16; AC 2, 3, 10, 12)', () => {
  it('⭐ drive 16 + 2 — buy a haft from the store; the SHIPPED pick recipe makes a pick that knows it has one', async () => {
    const s = await newPlayer('wright', STORE);
    await buy(s, 'pick haft');
    const handle = s.handle;
    s.close();
    smith = await goTo(handle, SMITHY);
    await cloneHere(SMITHY, T.pickHead);
    const made = await say(smith, 'fit pick');
    expect(made, `fit pick: ${made}`).toMatch(/fit the parts together/i);
    const looked = await say(smith, 'look at miners-pick');
    expect(looked, `look pick: ${looked}`).toMatch(/made of/i);
    expect(looked).toMatch(/head/i);
    expect(looked).toMatch(/haft/i);
    expect(looked).toMatch(/wedged/i);
  }, 300_000);

  it('⭐ drive 10 — a part cannot be inspected in place', async () => {
    const looked = await say(smith, 'look at haft');
    expect(looked, `look haft: ${looked}`).not.toMatch(/made of/i);
  }, 60_000);

  it('⭐ drive 5 (setup) — at the yard, carve a haft from a GREEN billet and fit it', async () => {
    const handle = smith.handle;
    smith.close();
    // The billhook is the fuel yard's; nobody sells one. Pick it up.
    smith = await goTo(handle, FUEL_YARD);
    await say(smith, 'get billhook');
    smith.close();
    smith = await goTo(handle, SAWMILL);
    await buy(smith, 'billet');
    await cloneHere(SAWMILL, T.froe); // stays at the mill; the sawyer uses it too
    const rove = await say(smith, 'rive billet into riven-blank');
    expect(rove, `rive: ${rove}`).not.toMatch(/can'?t|cannot|no (froe|tool)/i);
    await new Promise((r) => setTimeout(r, 10_000)); // riving takes a moment
    await smith.drainProse();
    const carved = await say(smith, 'carve pick-haft');
    expect(carved, `carve: ${carved}`).toMatch(/haft/i);
    const fitted = await say(smith, 'fit haft to miners-pick');
    expect(fitted, `fit green haft: ${fitted}`).toMatch(/fit a new haft/i);
  }, 300_000);
});

suite('⭐ the wood column (drive 4, 16, 23 setup; AC 12, 20)', () => {
  it('⭐ drive 4 — rive a bole into billets; set the mill sawing another', async () => {
    sawyer = await newPlayer('sawyer', SAWMILL);
    await cloneHere(SAWMILL, T.bole);
    await say(sawyer, 'rive bole'); // with the froe the smith left at the mill
    await new Promise((r) => setTimeout(r, 15_000)); // the riving's own engagement
    await sawyer.drainProse();
    const seen = (await sawyer.prose('look')) + (await sawyer.prose('inventory'));
    expect(seen, `after rive: ${seen}`).toMatch(/billet/i);
    const sawing = await say(sawyer, 'saw bole');
    expect(sawing, `saw: ${sawing}`).not.toMatch(/race is dry|no saw|can'?t/i);
  }, 300_000);

  it('drive 23 (setup) — green billets go up into the drying loft', async () => {
    await say(sawyer, 'get billet');
    const put = await say(sawyer, 'put billet in loft');
    expect(put, `put in loft: ${put}`).not.toMatch(/can'?t|cannot|don'?t see/i);
  }, 120_000);

  it('⭐ drive 16 — buy thirty staves from a yard that makes nothing else of them', async () => {
    cooper = await newPlayer('cooper', SAWMILL);
    await buy(cooper, 'stave', 30);
    const inv = await cooper.prose('inventory');
    expect(inv, `staves bought: ${inv}`).toMatch(/stave/i);
  }, 600_000);
});

suite('⭐⭐ the novice cooper (drive 9; AC 22)', () => {
  it('⭐⭐ drive 9 — refused a tight cask NAMING the band; a novice makes a BARREL', async () => {
    const handle = cooper.handle;
    cooper.close();
    cooper = await goTo(handle, SMITHY);
    await cloneHere(SMITHY, T.driver);
    await cloneHere(SMITHY, T.croze);
    // Enough heads and hoops for the barrel AND the cask — each row is
    // cloned once (see goTo).
    await cloneHere(SMITHY, T.head, 4);
    await cloneHere(SMITHY, T.hoop, 12);
    const refused = await say(cooper, 'fit cask');
    expect(refused, `untrained fit cask: ${refused}`).toMatch(/proficient/i);
    await practise(cooper, 'coopering', 4);
    const barrel = await say(cooper, 'fit slack-barrel');
    expect(barrel, `slack barrel: ${barrel}`).toMatch(/barrel/i);
    await cloneHere(SMITHY, T.peg, 3);
    await say(cooper, 'get peg');
    const put = await say(cooper, 'put peg in barrel');
    expect(put, `put in barrel: ${put}`).not.toMatch(/can'?t|cannot/i);
    await cloneHere(SMITHY, T.butt);
    const poured = (await (await cooper.cmd('fill barrel from butt')).said()).toLowerCase();
    expect(poured, `fill a barrel: ${poured}`).not.toMatch(/you fill/);
    expectOk(await cooper.cmd('drop barrel'));
  }, 300_000);
});

suite('⭐⭐ forty days later (drive 3, 4, 5, 18, 23; AC 10, 19, 25)', () => {
  let mender: Session;
  beforeAll(async () => {
    await advanceWorldClock('40 days');
  }, 300_000);
  afterAll(() => mender?.close());

  it('⭐⭐ drive 5 + 3 — the green haft has WARPED in place, and repair names it', async () => {
    const looked = await say(smith, 'look at miners-pick');
    expect(looked, `look warped pick: ${looked}`).toMatch(/warped/i);
    const refused = await say(smith, 'repair miners-pick');
    expect(refused.toLowerCase(), `repair refusal: ${refused}`).toMatch(/haft/);
  }, 300_000);

  it('⭐ drive 3 + 18 — a second pair of hands fits a new haft; the pick names both', async () => {
    expectOk(await smith.cmd('drop miners-pick'));
    const m = await newPlayer('mender', STORE);
    await buy(m, 'pick haft');
    const handle = m.handle;
    m.close();
    mender = await goTo(handle, SAWMILL);
    const fitted = await say(mender, 'fit haft to miners-pick');
    expect(fitted, `mender fit: ${fitted}`).toMatch(/fit a new haft/i);
    const looked = await say(mender, 'look at miners-pick');
    expect(looked, `look mended pick: ${looked}`).not.toMatch(/warped|broken/i);
    expect(looked, `two makers: ${looked}`).toMatch(/work of .+ and /i);
  }, 300_000);

  it('⭐ drive 4 — the mill has sawn the bole into boards while nobody stood over it', async () => {
    const seen = (await sawyer.prose('look')) + (await sawyer.prose('inventory'));
    expect(seen, `boards: ${seen}`).toMatch(/board/i);
  }, 120_000);

  it('⭐⭐ drive 23 — the billets in the LOFT have begun to dry', async () => {
    const lofted = await say(sawyer, 'look at billet');
    expect(lofted, `billet in the loft: ${lofted}`).toMatch(/begun to dry|still drying|seasoned/i);
  }, 120_000);
});

suite('⭐⭐ the proficient cooper (drive 6, 7, 8, 11, 17, 22; AC 6, 14, 23, 24)', () => {
  it('⭐⭐ drive 6 — a proficient cooper raises a cask, and it holds liquid', async () => {
    const handle = cooper.handle;
    cooper.close();
    cooper = await goTo(handle, SAWMILL);
    await buy(cooper, 'stave', 30);
    cooper.close();
    cooper = await goTo(handle, SMITHY);
    await practise(cooper, 'coopering', 16);
    const made = await say(cooper, 'fit cask');
    expect(made, `fit cask: ${made}`).toMatch(/cask/i);
    const looked = await say(cooper, 'look at cask');
    expect(looked, `look cask: ${looked}`).toMatch(/staves/i);
    expect(looked).toMatch(/hoop/i);
    expectOk(await cooper.cmd('drop cask'));
    await say(cooper, 'fill cask from butt');
    const full = await say(cooper, 'look at cask');
    expect(full, `filled cask: ${full}`).toMatch(/water/i);
  }, 900_000);

  it('⭐⭐ drive 8 + 7 — left empty it dries; its hoops ride loose with every stave sound; repair consumes nothing', async () => {
    await say(cooper, 'spill cask');
    await say(cooper, 'look at cask'); // the first empty read starts the drying
    await advanceWorldClock('10 days');
    const dry = await say(cooper, 'look at cask');
    expect(dry, `dried-out cask: ${dry}`).toMatch(/slack/i);
    expect(dry).not.toMatch(/sprung|split|broken/i);
    await say(cooper, 'repair cask');
    await new Promise((r) => setTimeout(r, 10_000)); // the repair's engagement
    const after = await say(cooper, 'look at cask');
    expect(after, `tightened: ${after}`).not.toMatch(/has gone slack/i);
  }, 300_000);

  it('⭐⭐ drive 17 — fill it until it gives nothing; re-fire it and it gives again', async () => {
    await cloneHere(SMITHY, T.inshave);
    for (let i = 0; i < 4; i++) {
      await say(cooper, 'fill cask from butt');
      await say(cooper, 'look at cask');
      await say(cooper, 'spill cask');
    }
    const spent = await say(cooper, 'look at cask');
    expect(spent, `spent cask: ${spent}`).toMatch(/given its contents everything/i);
    await say(cooper, 'repair cask');
    await new Promise((r) => setTimeout(r, 10_000));
    const refired = await say(cooper, 'look at cask');
    expect(refired, `re-fired cask: ${refired}`).toMatch(/charred/i);
    expect(refired).not.toMatch(/given its contents everything/i);
  }, 300_000);

  it('⭐⭐ drive 22 — anybody measures; the gauger’s figure is of record', async () => {
    await cloneHere(SMITHY, T.rod);
    const mine = await say(cooper, 'measure capacity cask');
    expect(mine, `cooper gauges: ${mine}`).toMatch(/not of record/i);
    const gauger = await Session.open('founder', { startLocation: SMITHY, wizard: true });
    try {
      expectOk(await gauger.cmd(`appoint me to gauger at ${REGISTRY}`));
      const record = await say(gauger, 'measure capacity cask');
      expect(record, `gauger gauges: ${record}`).toMatch(/of record/i);
      expect(record).not.toMatch(/not of record/i);
    } finally {
      gauger.close();
    }
  }, 300_000);

  it('⭐ drive 11 — taken apart by its joints, fewer staves come back than went in', async () => {
    const taken = await say(cooper, 'salvage cask');
    expect(taken, `cooper salvage: ${taken}`).toMatch(/of the thirty staves/i);
  }, 300_000);

  it('⭐ drive 22 — an off-standard cask says so, to anyone', async () => {
    await cloneHere(SMITHY, T.brewCask);
    const off = await say(cooper, 'measure capacity cask');
    expect(off, `off-standard: ${off}`).toMatch(/off standard/i);
  }, 300_000);
});

suite('⭐ the exemplar span (drive 13, 20, 21; AC 5, 13)', () => {
  let joiner: Session;
  beforeAll(async () => {
    const j = await newPlayer('joiner', STORE);
    await buy(j, 'cushion', 2);
    await buy(j, 'plough share', 2);
    await buy(j, 'bowstring');
    await buy(j, 'spindle shaft');
    await buy(j, 'whorl');
    const handle = j.handle;
    j.close();
    joiner = await goTo(handle, SMITHY);
  }, 600_000);
  afterAll(() => joiner?.close());

  it('⭐ drive 13 — a NESTED thing: a pegged frame and a stitched cushion make a chair; the cushion is replaced alone', async () => {
    await cloneHere(SMITHY, T.frame);
    const made = await say(joiner, 'fit armchair');
    expect(made, `fit armchair: ${made}`).toMatch(/armchair|chair/i);
    const looked = await say(joiner, 'look at armchair');
    expect(looked, `armchair: ${looked}`).toMatch(/frame/i);
    expect(looked).toMatch(/cushion/i);
    const swapped = await say(joiner, 'fit cushion to armchair');
    expect(swapped, `fit cushion: ${swapped}`).toMatch(/fit a new cushion/i);
    expect(swapped).toMatch(/take the old one back/i);
  }, 300_000);

  it('⭐⭐⭐ drive 20 — the plough’s share is replaced alone, twice; a bow is re-strung', async () => {
    await cloneHere(SMITHY, T.plough);
    for (let season = 0; season < 2; season++) {
      const fitted = await say(joiner, 'fit share to plough');
      expect(fitted, `season ${season} share: ${fitted}`).toMatch(/fit a new share/i);
    }
    const plough = await say(joiner, 'look at plough');
    expect(plough, `plough: ${plough}`).toMatch(/beam/i);
    await cloneHere(SMITHY, T.bow);
    const strung = await say(joiner, 'fit bowstring to bow');
    expect(strung, `restring: ${strung}`).toMatch(/fit a new bowstring/i);
  }, 300_000);

  it('⭐ drive 21 — the drop spindle: a shaft through a whorl, no fastener, no tool; pulled apart whole', async () => {
    const made = await say(joiner, 'fit drop-spindle');
    expect(made, `fit spindle: ${made}`).toMatch(/spindle/i);
    const apart = await say(joiner, 'salvage spindle');
    expect(apart, `pull apart: ${apart}`).toMatch(/come away whole/i);
  }, 300_000);
});

/**
 * ⭐⭐⭐ **Drive 1 — W0: what was made survives a restart.** Run LAST,
 * because it restarts the world.
 *
 * ⚠ Only in a world this run OWNS (`WIRE_BOOT=1`): the fork kills the
 * server on its own port through the same preflight the runner uses and
 * boots a fresh one — attached to somebody else's server, it skips.
 */
suite('⭐⭐⭐ drive 1 — a made, mended thing survives a restart (AC 1)', () => {
  afterAll(async () => {
    await stopOwnedWorld();
  });

  it.skipIf(!isOwnedTestWorld())('restart, and find the mended pick where it was left', async () => {
    // The pick the smith made and the mender re-hafted lies on the sawmill
    // floor, where it was mended — made by the mint, landed, stamped, and
    // captured. Restart the world and read it back.
    const handle = sawyer.handle;
    smith?.close();
    sawyer?.close();
    cooper?.close();

    const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();

    const back = await Session.open(handle, { startLocation: SAWMILL, wizard: true });
    try {
      const pick = await say(back, 'look at miners-pick');
      expect(pick, `the mended pick, after a restart: ${pick}`).toMatch(/haft/i);
      expect(pick, `both makers, after a restart: ${pick}`).toMatch(/work of .+ and /i);
    } finally {
      back.close();
    }
  }, 900_000);
});
