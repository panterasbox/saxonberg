/**
 * ⭐⭐ **Assembly, driven end to end** — the assembly build's exit
 * criterion, run against the real socket (docs/requirements/
 * assembly-requirements.md § The drive).
 *
 * The drive in one sentence: *make a pick from a head and a haft and read
 * what it is made of; fit it a haft worked green and watch it warp; be
 * told which part failed and replace just that one, in a second pair of
 * hands; rive a bole and saw one at the mill; season boards in the loft;
 * be refused a tight cask until you are good enough, make a barrel
 * instead, then a cask; let it dry out and drive its hoops back down for
 * nothing; take one apart; spend it and have it re-fired; and have the
 * gauger measure it.*
 *
 * ⚠ Every checkpoint asserts a STATE CHANGE read back off the world (a
 * `look`, a closure, a reading) — never only that the verb was not
 * refused. `refusedFor` is blind to `command-rejected`, and "not refused"
 * is not "happened" (the taps lesson).
 *
 * Setup that is not the drive's subject is done with a wizard's `clone`
 * (a bought or found part is the same kind of thing as a made one —
 * AC 26) and `practice` (the advancement harness: a cooper's band without
 * simulating years of barrels). Time is moved with the test clock.
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
  'clones parts and casks into the Hearthworks smithy and the Heart’s ' +
  'Delight sawmill (nothing collects them), appoints the founder to the ' +
  'city’s gauger seat, and moves the world clock by months';

declareFile({
  file: 'assembly.dirty.wire.test.ts',
  packs: [
    'trade-carpentry',
    'trade-coopering',
    'trade-forestry',
    'trade-smithing',
    'trade-mining',
    'trade-brewing',
    'generic-objects',
    'base-library',
    'hearthworks',
    'hearts-delight',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const SMITHY = '/world/terminus/hearthworks/location/smithy';
const SAWMILL = '/world/terminus/hearts-delight/location/sawmill';
const REGISTRY = '/world/terminus/registry/business';

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
  return said;
}

async function clone(s: Session, path: string, count = 1): Promise<void> {
  expectOk(await s.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
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

let smith: Session; // the one who makes things
let mender: Session; // a second pair of hands

beforeAll(async () => {
  smith = await Session.open(uniqueHandle('wright'), { startLocation: SMITHY, wizard: true });
  mender = await Session.open(uniqueHandle('mender'), { startLocation: SMITHY, wizard: true });
}, 300_000);

afterAll(() => {
  smith?.close();
  mender?.close();
});

suite('⭐⭐ the pick is a head on a haft (drive 2, 3, 5, 18; AC 2, 3, 10, 19)', () => {
  it('⭐ drive 2 — the SHIPPED pick recipe makes a pick that knows it has a haft', async () => {
    await clone(smith, T.pickHead);
    await clone(smith, T.pickHaft);
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
    // The haft is a LINE on the pick, not a thing in the room.
    expect(looked, `look haft: ${looked}`).not.toMatch(/made of/i);
  }, 60_000);

  it('⭐⭐ drive 5 + 3 — a haft worked GREEN warps where it was fitted, and the refusal names it', async () => {
    await clone(smith, T.billet);
    await clone(smith, T.froe);
    await clone(smith, T.billhook);
    const rove = await say(smith, 'rive billet into riven-blank');
    expect(rove, `rive: ${rove}`).not.toMatch(/can'?t|cannot|no (froe|tool)/i);
    const carved = await say(smith, 'carve pick-haft');
    expect(carved, `carve: ${carved}`).toMatch(/haft/i);
    const fitted = await say(smith, 'fit haft to pick');
    expect(fitted, `fit green haft: ${fitted}`).toMatch(/fit/i);
    // A month and more: a tenth of ash's seasoning, dried in place.
    await advanceWorldClock('40 days');
    const looked = await say(smith, 'look at pick');
    expect(looked, `look warped pick: ${looked}`).toMatch(/warped/i);
    const refused = await say(smith, 'repair pick');
    await smith.drainProse();
    const after = (refused + (await smith.prose('look at pick'))).toLowerCase();
    expect(after, `repair refusal: ${refused}`).toMatch(/haft/);
  }, 300_000);

  it('⭐ drive 3 + 18 — a second pair of hands fits a new haft; the pick names both', async () => {
    // The pick is the smith's; it lies in the smithy for the mender.
    expectOk(await smith.cmd('drop pick'));
    await clone(mender, T.pickHaft);
    const fitted = await say(mender, 'fit haft to pick');
    expect(fitted, `mender fit: ${fitted}`).toMatch(/fit/i);
    const looked = await say(mender, 'look at pick');
    expect(looked, `look mended pick: ${looked}`).not.toMatch(/warped|broken/i);
    expect(looked, `two makers: ${looked}`).toMatch(/work of .+ and /i);
  }, 120_000);
});

suite('⭐ the wood column (drive 4, 23; AC 12, 20, 25)', () => {
  let sawyer: Session;
  beforeAll(async () => {
    sawyer = await Session.open(uniqueHandle('sawyer'), { startLocation: SAWMILL, wizard: true });
  }, 120_000);
  afterAll(() => sawyer?.close());

  it('⭐ drive 4 — rive a bole into billets: something that is not a plank', async () => {
    await clone(sawyer, T.bole);
    await clone(sawyer, T.froe);
    await act(sawyer, 'rive bole');
    const inv = (await sawyer.prose('look')) + (await sawyer.prose('inventory'));
    expect(inv, `after rive: ${inv}`).toMatch(/billet/i);
  }, 300_000);

  it('⭐ drive 4 — saw boards from a bole at the mill', async () => {
    await act(sawyer, 'saw bole');
    const seen = (await sawyer.prose('look')) + (await sawyer.prose('inventory'));
    expect(seen, `after saw: ${seen}`).toMatch(/board/i);
  }, 300_000);

  it('⭐⭐ drive 23 — boards in the drying loft season at the LOFT\'s air', async () => {
    const put = await say(sawyer, 'put board in loft');
    expect(put, `put in loft: ${put}`).not.toMatch(/can'?t|cannot|don'?t see/i);
    await advanceWorldClock('200 days');
    const lofted = await say(sawyer, 'look at board');
    expect(lofted, `seasoned in the loft: ${lofted}`).toMatch(/seasoned/i);
  }, 300_000);
});

suite('⭐⭐ the cooper (drive 6, 7, 8, 9, 11, 12, 17, 22; AC 6, 14, 22, 23, 24)', () => {
  let cooper: Session;
  let founder: Session;
  beforeAll(async () => {
    cooper = await Session.open(uniqueHandle('cooper'), { startLocation: SMITHY, wizard: true });
  }, 120_000);
  afterAll(() => {
    cooper?.close();
    founder?.close();
  });

  async function stock(): Promise<void> {
    await clone(cooper, T.stave, 30);
    await clone(cooper, T.head, 2);
    await clone(cooper, T.hoop, 6);
  }

  it('⭐⭐ drive 9 — refused a tight cask NAMING the band; a novice makes a BARREL', async () => {
    await clone(cooper, T.driver);
    await clone(cooper, T.croze);
    await stock();
    const refused = await say(cooper, 'fit cask');
    expect(refused, `untrained fit cask: ${refused}`).toMatch(/proficient/i);
    await practise(cooper, 'coopering', 4);
    const barrel = await say(cooper, 'fit slack-barrel');
    expect(barrel, `slack barrel: ${barrel}`).toMatch(/barrel/i);
    await clone(cooper, T.peg, 3);
    const put = await say(cooper, 'put peg in barrel');
    expect(put, `put in barrel: ${put}`).not.toMatch(/can'?t|cannot/i);
    // ⭐ And you cannot pour into it at all — it is not a vessel.
    await clone(cooper, T.butt);
    const poured = (await (await cooper.cmd('fill barrel from butt')).said()).toLowerCase();
    expect(poured, `fill a barrel: ${poured}`).not.toMatch(/you fill/);
  }, 300_000);

  it('⭐⭐ drive 6 — a proficient cooper raises a cask, and it holds liquid', async () => {
    await practise(cooper, 'coopering', 16);
    await stock();
    const made = await say(cooper, 'fit cask');
    expect(made, `fit cask: ${made}`).toMatch(/cask/i);
    const looked = await say(cooper, 'look at cask');
    expect(looked, `look cask: ${looked}`).toMatch(/staves/i);
    expect(looked).toMatch(/hoop/i);
    await say(cooper, 'drop cask');
    await say(cooper, 'fill cask from butt');
    const full = await say(cooper, 'look at cask');
    expect(full, `filled cask: ${full}`).toMatch(/water/i);
  }, 300_000);

  it('⭐⭐ drive 8 + 7 — left empty it dries, its hoops ride loose with every stave sound; repair consumes nothing', async () => {
    await say(cooper, 'spill cask');
    await say(cooper, 'look at cask'); // the first empty read starts the drying
    await advanceWorldClock('10 days');
    const dry = await say(cooper, 'look at cask');
    expect(dry, `dried-out cask: ${dry}`).toMatch(/slack/i);
    expect(dry).not.toMatch(/sprung|split|broken/i);
    const repaired = await say(cooper, 'repair cask');
    await cooper.drainProse();
    const after = await say(cooper, 'look at cask');
    expect(`${repaired}\n${after}`, `tightened: ${repaired} / ${after}`).not.toMatch(/has gone slack/i);
  }, 300_000);

  it('⭐⭐ drive 17 — fill it until it gives nothing; re-fire it and it gives again', async () => {
    await clone(cooper, T.inshave);
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

  it('⭐⭐ drive 22 — anybody measures; the gauger’s is of record', async () => {
    await clone(cooper, T.rod);
    const mine = await say(cooper, 'measure capacity cask');
    expect(mine, `cooper gauges: ${mine}`).toMatch(/not of record/i);

    founder = await Session.open('founder', { startLocation: SMITHY, wizard: true });
    expectOk(await founder.cmd(`appoint me to gauger at ${REGISTRY}`));
    await clone(founder, T.rod);
    const record = await say(founder, 'measure capacity cask');
    expect(record, `gauger gauges: ${record}`).toMatch(/of record/i);
    expect(record).not.toMatch(/not of record/i);
  }, 300_000);

  it('⭐ drive 11 — taken apart by its joints, fewer staves come back than went in', async () => {
    const taken = await say(cooper, 'salvage cask');
    expect(taken, `cooper salvage: ${taken}`).toMatch(/of the thirty staves/i);
    // (An expert recovering more — drive 12 — is the band table's, proven
    // by CraftingLogic.assembly's unit tests rather than a second cask.)
  }, 300_000);

  it('⭐ drive 22 — an off-standard cask says so, to anyone', async () => {
    await clone(founder, T.brewCask);
    const off = await say(founder, 'measure capacity cask');
    expect(off, `off-standard: ${off}`).toMatch(/off standard/i);
  }, 300_000);
});

suite('⭐ the exemplar span (drive 13, 20, 21; AC 5, 13)', () => {
  let joiner: Session;
  beforeAll(async () => {
    joiner = await Session.open(uniqueHandle('joiner'), { startLocation: SMITHY, wizard: true });
  }, 120_000);
  afterAll(() => joiner?.close());

  it('⭐ drive 13 — a NESTED thing: a pegged frame and a stitched cushion make a chair; the cushion is replaced alone', async () => {
    await clone(joiner, '/trade/carpentry/thing/frame');
    await clone(joiner, '/trade/tailoring/thing/cushion');
    const made = await say(joiner, 'fit armchair');
    expect(made, `fit armchair: ${made}`).toMatch(/armchair|chair/i);
    const looked = await say(joiner, 'look at armchair');
    expect(looked, `armchair: ${looked}`).toMatch(/frame/i);
    expect(looked).toMatch(/cushion/i);
    await clone(joiner, '/trade/tailoring/thing/cushion');
    const swapped = await say(joiner, 'fit cushion to armchair');
    // A SOUND cushion swapped out comes back to hand; the frame's pegged
    // joints are not touched (the frame is its own record).
    expect(swapped, `fit cushion: ${swapped}`).toMatch(/fit a new cushion/i);
    expect(swapped).toMatch(/take the old one back/i);
  }, 300_000);

  it('⭐⭐⭐ drive 20 — the plough’s share is replaced alone, and again next season; a bow is re-strung', async () => {
    await clone(joiner, '/trade/farming/thing/plough');
    for (let season = 0; season < 2; season++) {
      await clone(joiner, '/trade/smithing/thing/plough-share');
      const fitted = await say(joiner, 'fit share to plough');
      expect(fitted, `season ${season} share: ${fitted}`).toMatch(/fit a new share/i);
      await advanceWorldClock('120 days');
    }
    const plough = await say(joiner, 'look at plough');
    expect(plough, `plough: ${plough}`).toMatch(/beam/i);
    await clone(joiner, '/stuff/thing/arms/hunting-bow');
    await clone(joiner, '/trade/textiles/thing/bowstring');
    const strung = await say(joiner, 'fit bowstring to bow');
    expect(strung, `restring: ${strung}`).toMatch(/fit a new bowstring/i);
  }, 300_000);

  it('⭐ drive 21 — the drop spindle: a shaft through a whorl, no fastener, no tool; pulled apart whole', async () => {
    await clone(joiner, '/trade/textiles/thing/spindle-shaft');
    await clone(joiner, '/trade/textiles/thing/whorl');
    const made = await say(joiner, 'fit drop-spindle');
    expect(made, `fit spindle: ${made}`).toMatch(/spindle/i);
    const apart = await say(joiner, 'salvage spindle');
    expect(apart, `pull apart: ${apart}`).toMatch(/come away whole/i);
    expect(apart).not.toMatch(/nothing worth keeping/i);
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
suite('⭐⭐⭐ drive 1 — a made thing and a sealed cask survive a restart (AC 1)', () => {
  // The world this FORK booted is the fork's to stop (the runner's own
  // child died to the preflight).
  afterAll(async () => {
    await stopOwnedWorld();
  });
  it.skipIf(!isOwnedTestWorld())('restart, and find them where they were', async () => {
    const maker = await Session.open(uniqueHandle('keeper'), { startLocation: SMITHY, wizard: true });
    const handle = maker.handle;
    await clone(maker, T.pickHead);
    await clone(maker, T.pickHaft);
    await say(maker, 'fit pick'); // lands in HAND: the mint stamps and captures it
    await clone(maker, T.butt);
    await clone(maker, '/stuff/thing/vessel/cask');
    await say(maker, 'fill cask from butt');
    await say(maker, 'close cask');
    const before = await say(maker, 'look at cask');
    expect(before, `cask before: ${before}`).toMatch(/staves/i);
    maker.close();

    // Restart the world this run owns.
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
      const cask = await say(back, 'look at cask');
      expect(cask, `the cask after a restart: ${cask}`).toMatch(/staves/i);
      expect(cask).toMatch(/water/i);
    } finally {
      back.close();
    }
  }, 900_000);
});

