/**
 * ⭐⭐ **Assembly, driven end to end** — the assembly build's exit
 * criterion, run against the real socket (docs/requirements/
 * assembly-requirements.md § The drive).
 *
 * The drive in one sentence: *make a pick from a head and a haft and read
 * what it is made of; fit it a haft carved green and watch it warp; be
 * told which part failed and replace just that one, in a second pair of
 * hands; rive a bole and saw one at the mill; season billets in the loft;
 * be refused a tight cask until you are good enough, make a barrel
 * instead, then a cask; let it dry out and drive its hoops back down for
 * nothing; spend it and have it re-fired; have the gauger measure it;
 * take it apart; raise a chair round a frame and a cushion; re-shoe a
 * plough twice; re-string a bow; pull a spindle apart; and restart the
 * world and find what you made.*
 *
 * ⚠ Every checkpoint asserts a STATE CHANGE read back off the world (a
 * `look`, a closure, a reading) — never only that the verb was not
 * refused (the taps lesson).
 *
 * Setup that is not the drive's subject is done with `clone` (a found
 * part is the same kind of thing as a made one — AC 26) and `practice`
 * (the advancement harness: a cooper's band without simulating years of
 * barrels). ⚠ `clone` into a ROOM needs title to it (wizard confers none),
 * so room setup goes through the founder; a player's parts clone into
 * their hands, which the craft gather reaches. Time moves in jumps of at
 * most forty days — the whole world drains every schedule in an interval,
 * and two hundred days wedged it.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  engagementIdOf,
  advanceWorldClock,
  isOwnedTestWorld,
} from '../src/harness';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'clones parts, casks and a bole into the Hearthworks smithy and the ' +
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
const REGISTRY = '/world/terminus/registry/business';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';

const T = {
  pickHead: '/trade/smithing/thing/pick-head',
  pickHaft: '/trade/carpentry/thing/pick-haft',
  billet: '/trade/forestry/thing/billet',
  bole: '/trade/forestry/thing/bole',
  froe: '/trade/carpentry/thing/froe',
  billhook: '/trade/forestry/thing/billhook',
  stave: '/trade/coopering/thing/stave',
  head: '/trade/coopering/thing/cask-head',
  hoop: '/trade/smithing/thing/hoop',
  driver: '/trade/coopering/thing/driver',
  croze: '/trade/coopering/thing/croze',
  inshave: '/trade/coopering/thing/inshave',
  rod: '/trade/coopering/thing/gauging-rod',
  peg: '/trade/carpentry/thing/peg',
  butt: '/stuff/thing/fixture/water-butt',
  cask: '/stuff/thing/vessel/cask',
  brewCask: '/trade/brewing/thing/cask',
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

/** Where each player stands — their parts are cloned there. */
const WHERE = new WeakMap<Session, string>();

/**
 * A player's part, cloned into the room they stand in — by the founder,
 * because `clone` asks for title over the TEMPLATE's path (wizard confers
 * none). The craft gather reaches the room as well as the hands.
 */
async function cloneHand(s: Session, path: string, count = 1): Promise<void> {
  await cloneHere(WHERE.get(s) ?? SMITHY, path, count);
}

/** Into the ROOM, by the founder, who holds the title to it. */
async function cloneHere(where: string, path: string, count = 1): Promise<void> {
  const f = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await f.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
  } finally {
    f.close();
  }
}

/** Run an engaged act to completion. */
async function act(s: Session, line: string): Promise<string> {
  const started = await s.cmd(line);
  expectOk(started);
  const said = await started.said();
  const id = engagementIdOf(started);
  if (id) await s.awaitActivity(id, 120_000);
  await s.drainProse();
  return said;
}

async function practise(s: Session, discipline: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await s.cmd(`practice ${discipline} hard success`);
}

/** Open a player with a light — the world boots at midnight. */
async function player(tag: string, where: string): Promise<Session> {
  const s = await Session.open(uniqueHandle(tag), { startLocation: where, wizard: true });
  WHERE.set(s, where);
  await cloneHere(where, GLOWCAP);
  await s.drainProse();
  return s;
}

let smith: Session; // makes the pick
let mender: Session; // the second pair of hands
let sawyer: Session; // at the mill

beforeAll(async () => {
  smith = await player('wright', SMITHY);
  mender = await player('mender', SMITHY);
  sawyer = await player('sawyer', SAWMILL);
}, 300_000);

afterAll(() => {
  smith?.close();
  mender?.close();
  sawyer?.close();
});

suite('⭐⭐ the pick is a head on a haft (drive 2, 10; AC 2, 3, 10)', () => {
  it('⭐ drive 2 — the SHIPPED pick recipe makes a pick that knows it has a haft', async () => {
    await cloneHand(smith, T.pickHead);
    await cloneHand(smith, T.pickHaft);
    const made = await say(smith, 'fit pick');
    expect(made, `fit pick: ${made}`).toMatch(/pick/i);
    const looked = await say(smith, 'look at pick');
    expect(looked, `look pick: ${looked}`).toMatch(/made of/i);
    expect(looked).toMatch(/head/i);
    expect(looked).toMatch(/haft/i);
    expect(looked).toMatch(/wedged/i);
  }, 120_000);

  it('⭐ drive 10 — a part cannot be inspected in place', async () => {
    const looked = await say(smith, 'look at haft');
    expect(looked, `look haft: ${looked}`).not.toMatch(/made of/i);
  }, 60_000);

  it('⭐ drive 5 (setup) — carve a haft from a GREEN blank and fit it', async () => {
    await cloneHand(smith, T.billet);
    await cloneHand(smith, T.froe);
    await cloneHand(smith, T.billhook);
    const rove = await say(smith, 'rive billet into riven-blank');
    expect(rove, `rive: ${rove}`).not.toMatch(/can'?t|cannot|no (froe|tool)/i);
    const carved = await say(smith, 'carve pick-haft');
    expect(carved, `carve: ${carved}`).toMatch(/haft/i);
    const fitted = await say(smith, 'fit haft to pick');
    expect(fitted, `fit green haft: ${fitted}`).toMatch(/fit a new haft/i);
  }, 300_000);
});

suite('⭐ the wood column (drive 4, 23 setup; AC 12, 20)', () => {
  it('⭐ drive 4 — rive a bole into billets: something that is not a plank', async () => {
    await cloneHere(SAWMILL, T.bole);
    await cloneHand(sawyer, T.froe);
    await act(sawyer, 'rive bole');
    const seen = (await sawyer.prose('look')) + (await sawyer.prose('inventory'));
    expect(seen, `after rive: ${seen}`).toMatch(/billet/i);
  }, 300_000);

  it('⭐ drive 4 — saw boards from the bole at the mill', async () => {
    await act(sawyer, 'saw bole');
    const seen = (await sawyer.prose('look')) + (await sawyer.prose('inventory'));
    expect(seen, `after saw: ${seen}`).toMatch(/board/i);
  }, 300_000);

  it('drive 23 (setup) — green billets go up into the drying loft', async () => {
    await say(sawyer, 'get billet');
    const put = await say(sawyer, 'put billet in loft');
    expect(put, `put in loft: ${put}`).not.toMatch(/can'?t|cannot|don'?t see/i);
  }, 120_000);
});

suite('⭐⭐ forty days later (drive 3, 5, 18, 23; AC 10, 19, 25)', () => {
  beforeAll(async () => {
    await advanceWorldClock('40 days');
  }, 300_000);

  it('⭐⭐ drive 5 + 3 — the green haft has WARPED in place, and repair names it', async () => {
    const looked = await say(smith, 'look at pick');
    expect(looked, `look warped pick: ${looked}`).toMatch(/warped/i);
    const refused = await say(smith, 'repair pick');
    expect(refused.toLowerCase(), `repair refusal: ${refused}`).toMatch(/haft/);
  }, 120_000);

  it('⭐ drive 3 + 18 — a second pair of hands fits a new haft; the pick names both', async () => {
    expectOk(await smith.cmd('drop pick'));
    await cloneHand(mender, T.pickHaft);
    const fitted = await say(mender, 'fit haft to pick');
    expect(fitted, `mender fit: ${fitted}`).toMatch(/fit a new haft/i);
    const looked = await say(mender, 'look at pick');
    expect(looked, `look mended pick: ${looked}`).not.toMatch(/warped|broken/i);
    expect(looked, `two makers: ${looked}`).toMatch(/work of .+ and /i);
  }, 120_000);

  it('⭐⭐ drive 23 — the billets in the LOFT have begun to dry', async () => {
    const lofted = await say(sawyer, 'look at billet');
    expect(lofted, `billet in the loft: ${lofted}`).toMatch(/begun to dry|still drying|seasoned/i);
  }, 120_000);
});

suite('⭐⭐ the cooper (drive 6, 7, 8, 9, 11, 17, 22; AC 6, 14, 22, 23, 24)', () => {
  let cooper: Session;
  beforeAll(async () => {
    cooper = await player('cooper', SMITHY);
    await cloneHand(cooper, T.driver);
    await cloneHand(cooper, T.croze);
  }, 120_000);
  afterAll(() => cooper?.close());

  async function stock(): Promise<void> {
    await cloneHere(SMITHY, T.stave, 30);
    await cloneHere(SMITHY, T.head, 2);
    await cloneHere(SMITHY, T.hoop, 6);
  }

  it('⭐⭐ drive 9 — refused a tight cask NAMING the band; a novice makes a BARREL', async () => {
    await stock();
    const refused = await say(cooper, 'fit cask');
    expect(refused, `untrained fit cask: ${refused}`).toMatch(/proficient/i);
    await practise(cooper, 'coopering', 4);
    const barrel = await say(cooper, 'fit slack-barrel');
    expect(barrel, `slack barrel: ${barrel}`).toMatch(/barrel/i);
    await cloneHand(cooper, T.peg, 3);
    await say(cooper, 'get peg');
    const put = await say(cooper, 'put peg in barrel');
    expect(put, `put in barrel: ${put}`).not.toMatch(/can'?t|cannot/i);
    await cloneHere(SMITHY, T.butt);
    const poured = (await (await cooper.cmd('fill barrel from butt')).said()).toLowerCase();
    expect(poured, `fill a barrel: ${poured}`).not.toMatch(/you fill/);
    expectOk(await cooper.cmd('drop barrel'));
  }, 300_000);

  it('⭐⭐ drive 6 — a proficient cooper raises a cask, and it holds liquid', async () => {
    await practise(cooper, 'coopering', 16);
    await stock();
    const made = await say(cooper, 'fit cask');
    expect(made, `fit cask: ${made}`).toMatch(/cask/i);
    const looked = await say(cooper, 'look at cask');
    expect(looked, `look cask: ${looked}`).toMatch(/staves/i);
    expect(looked).toMatch(/hoop/i);
    expectOk(await cooper.cmd('drop cask'));
    await say(cooper, 'fill cask from butt');
    const full = await say(cooper, 'look at cask');
    expect(full, `filled cask: ${full}`).toMatch(/water/i);
  }, 300_000);

  it('⭐⭐ drive 8 + 7 — left empty it dries; its hoops ride loose with every stave sound; repair consumes nothing', async () => {
    await say(cooper, 'spill cask');
    await say(cooper, 'look at cask'); // the first empty read starts the drying
    await advanceWorldClock('10 days');
    const dry = await say(cooper, 'look at cask');
    expect(dry, `dried-out cask: ${dry}`).toMatch(/slack/i);
    expect(dry).not.toMatch(/sprung|split|broken/i);
    await act(cooper, 'repair cask');
    const after = await say(cooper, 'look at cask');
    expect(after, `tightened: ${after}`).not.toMatch(/has gone slack/i);
  }, 300_000);

  it('⭐⭐ drive 17 — fill it until it gives nothing; re-fire it and it gives again', async () => {
    await cloneHand(cooper, T.inshave);
    for (let i = 0; i < 4; i++) {
      await say(cooper, 'fill cask from butt');
      await say(cooper, 'look at cask');
      await say(cooper, 'spill cask');
    }
    const spent = await say(cooper, 'look at cask');
    expect(spent, `spent cask: ${spent}`).toMatch(/given its contents everything/i);
    await act(cooper, 'repair cask');
    const refired = await say(cooper, 'look at cask');
    expect(refired, `re-fired cask: ${refired}`).toMatch(/charred/i);
    expect(refired).not.toMatch(/given its contents everything/i);
  }, 300_000);

  it('⭐⭐ drive 22 — anybody measures; the gauger’s figure is of record', async () => {
    await cloneHand(cooper, T.rod);
    const mine = await say(cooper, 'measure capacity cask');
    expect(mine, `cooper gauges: ${mine}`).toMatch(/not of record/i);
    const gauger = await Session.open('founder', { startLocation: SMITHY, wizard: true });
    try {
      expectOk(await gauger.cmd(`appoint me to gauger at ${REGISTRY}`));
      expectOk(await gauger.cmd(`clone ${T.rod} --here`));
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
    joiner = await player('joiner', SMITHY);
  }, 120_000);
  afterAll(() => joiner?.close());

  it('⭐ drive 13 — a NESTED thing: a pegged frame and a stitched cushion make a chair; the cushion is replaced alone', async () => {
    await cloneHand(joiner, '/trade/carpentry/thing/frame');
    await cloneHand(joiner, '/trade/tailoring/thing/cushion');
    const made = await say(joiner, 'fit armchair');
    expect(made, `fit armchair: ${made}`).toMatch(/armchair|chair/i);
    const looked = await say(joiner, 'look at armchair');
    expect(looked, `armchair: ${looked}`).toMatch(/frame/i);
    expect(looked).toMatch(/cushion/i);
    await cloneHand(joiner, '/trade/tailoring/thing/cushion');
    const swapped = await say(joiner, 'fit cushion to armchair');
    expect(swapped, `fit cushion: ${swapped}`).toMatch(/fit a new cushion/i);
    expect(swapped).toMatch(/take the old one back/i);
  }, 300_000);

  it('⭐⭐⭐ drive 20 — the plough’s share is replaced alone, twice; a bow is re-strung', async () => {
    await cloneHand(joiner, '/trade/farming/thing/plough');
    for (let season = 0; season < 2; season++) {
      await cloneHand(joiner, '/trade/smithing/thing/plough-share');
      const fitted = await say(joiner, 'fit share to plough');
      expect(fitted, `season ${season} share: ${fitted}`).toMatch(/fit a new share/i);
    }
    const plough = await say(joiner, 'look at plough');
    expect(plough, `plough: ${plough}`).toMatch(/beam/i);
    await cloneHand(joiner, '/stuff/thing/arms/hunting-bow');
    await cloneHand(joiner, '/trade/textiles/thing/bowstring');
    const strung = await say(joiner, 'fit bowstring to bow');
    expect(strung, `restring: ${strung}`).toMatch(/fit a new bowstring/i);
  }, 300_000);

  it('⭐ drive 21 — the drop spindle: a shaft through a whorl, no fastener, no tool; pulled apart whole', async () => {
    await cloneHand(joiner, '/trade/textiles/thing/spindle-shaft');
    await cloneHand(joiner, '/trade/textiles/thing/whorl');
    const made = await say(joiner, 'fit drop-spindle');
    expect(made, `fit spindle: ${made}`).toMatch(/spindle/i);
    const apart = await say(joiner, 'salvage spindle');
    expect(apart, `pull apart: ${apart}`).toMatch(/come away whole/i);
  }, 300_000);
});

/**
 * ⭐⭐⭐ **Drive 1 — W0: what was made, left where it was made, survives a
 * restart.** Run LAST, because it restarts the world.
 *
 * ⚠ Only in a world this run OWNS (`WIRE_BOOT=1`): the fork kills the
 * server on its own port through the same preflight the runner uses and
 * boots a fresh one — attached to somebody else's server, it skips.
 */
suite('⭐⭐⭐ drive 1 — a made thing and a filled cask survive a restart (AC 1)', () => {
  afterAll(async () => {
    await stopOwnedWorld();
  });

  it.skipIf(!isOwnedTestWorld())('restart, and find them where they were', async () => {
    const keeper = await player('keeper', SMITHY);
    const handle = keeper.handle;
    await cloneHand(keeper, T.pickHead);
    await cloneHand(keeper, T.pickHaft);
    await say(keeper, 'fit pick'); // lands in HAND: the mint stamps and captures it
    keeper.close();
    smith?.close();
    mender?.close();
    sawyer?.close();

    const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();

    const back = await Session.open(handle, { startLocation: SMITHY, wizard: true });
    try {
      const inv = await back.prose('inventory');
      expect(inv, `the made pick, after a restart: ${inv}`).toMatch(/pick/i);
      const pick = await say(back, 'look at pick');
      expect(pick, `the pick still knows its haft: ${pick}`).toMatch(/haft/i);
    } finally {
      back.close();
    }
  }, 900_000);
});
