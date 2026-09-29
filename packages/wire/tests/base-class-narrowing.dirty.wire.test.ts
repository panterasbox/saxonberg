/**
 * Base-class narrowing — ⭐⭐ **the drive**: what the world stops
 * claiming, and the two things it starts doing.
 *
 * This build is mostly subtraction, and subtraction is the hardest kind
 * of change to drive: nothing new appears on screen when a backpack
 * stops having weather. So the drive reads the surface where a claim IS
 * visible — the wiki's `<composition>` panel, which derives itself from
 * the running world every time somebody opens the page — and then drives
 * the two behaviours the subtraction paid for:
 *
 *  - **a thing in a bag is no longer frozen in time**, which it was, for
 *    every perishable any player has ever carried;
 *  - **a coach is a place with air**, which is what `ExitableVessel` was
 *    always for.
 *
 * ⚠⚠ **Part A reads through an instrument that was itself broken.** The
 * inverse panel scanned `Template.findDescendants('/obj')` from its
 * first commit and `/obj` has never held a row, so every mixin page in
 * the game read *composed by: (nothing yet)* while looking perfectly
 * healthy. W0 repaired it. Without that repair every part-A assertion
 * here would pass vacuously on a panel that says nothing — which is
 * exactly why they are written as *contains X and does not contain Y*
 * rather than as *does not mention atmosphere*.
 *
 * ## Step 0 is a REGRESSION check, and it is here for a reason
 *
 * The register this build executes had two rows falsified before it ran.
 * `ImprovableMixin` and `RegistrarMixin` were called dead and are live —
 * `Improvable` gates `ditch`/`grub`/`lime` through a controller's own
 * narrowing, a necessity channel the census could not see. Deleting them
 * would have silently removed three shipped verbs. They are asserted
 * first, every run, because a register is only as good as the last thing
 * that falsified it.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  expectOk,
  expectRefused,
} from '../src/harness';

export const DIRTY_REASON =
  'clones two coaches and a brazier into a street and burns the ' +
  "brazier's fuel; takes the general store's ration pack into a bag and " +
  'carries it to the cookhouse; lights the cookhouse hearth — none of it ' +
  'produced again';

declareFile({
  file: 'base-class-narrowing.dirty.wire.test.ts',
  packs: [
    'platform',
    'wiki-starter',
    'generic-objects',
    'terminus',
    'world-seed',
    'transport',
    'hearthworks',
    'eternal-university',
    'trade-farming',
    'trade-ranching',
  ],
  dirtyReason: DIRTY_REASON,
});

const STREET = '/world/terminus/mayfield-row/street';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const STORE = '/world/terminus/general-store/shop-floor';
const YARD = '/world/terminus/eternal/campus-farm/location/yard';

const COACH_ROW = '/system/transport/thing/coach';
// ⚠⚠ **Only rows under a TITLED root can be cloned by anybody.**
// `/stuff` (the commons) and `/world/practicum` are covered by no
// parcel, so `ParcelApi.ownerOf` answers null and the clone gate fails
// closed for every player — which took out the backpack and every
// `SpaceHeating` row in the game across three runs of this file. The
// general store's rows are titled; `/system/transport` is titled, which
// is the only reason the coach can be stood up at all. Recorded as a
// finding: it is a title gap, not a model one.
const LANTERN_ROW = '/world/terminus/general-store/thing/lantern';
const RATIONS_ROW = '/world/terminus/general-store/thing/rations';

const open: Session[] = [];
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

async function at(where: string, tag: string, wizard = false): Promise<Session> {
  const s = await Session.open(uniqueHandle(`narrow-${tag}`), {
    startLocation: where,
    ...(wizard ? { wizard: true } : {}),
  });
  open.push(s);
  return s;
}

/** The world's clock runs at 12×: a game-minute is five wall-seconds. */
async function idle(s: Session, gameSeconds: number): Promise<void> {
  const until = Date.now() + (gameSeconds / 12) * 1000;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, Math.min(1500, until - Date.now())));
    await s.cmd('look');
  }
}

/**
 * ⭐ The *composed by* half of a mixin page, squashed to one line.
 *
 * ⚠⚠ Asserted as a POSITIVE first, every time. An inverse panel that
 * finds nothing renders the same words as one that truly has no
 * composers, so *"does not contain backpack"* is satisfied by a panel
 * that is simply broken — which is the state this panel shipped in.
 */
async function inverse(s: Session, mixin: string): Promise<string> {
  const page = squash(plain(await (await s.cmd(`wiki ${mixin}`)).said()));
  expect(
    page,
    `wiki ${mixin}: the page must render at all before its content means anything`,
  ).not.toMatch(/no such page|does not exist/i);
  expect(
    page,
    `wiki ${mixin}: an EMPTY inverse is the broken state, not a finding — ` +
      'if this fires, the composition panel is scanning a dead root again',
  ).not.toMatch(/nothing yet/i);
  expect(
    page,
    `wiki ${mixin}: a truncated inverse is a lie the reader cannot see`,
  ).not.toMatch(/truncated/i);
  return page;
}

/** What `feel` says about a thing, in the words a player reads. */
async function feel(s: Session, what: string): Promise<string> {
  return squash(plain(await (await s.cmd(`feel ${what}`)).said()));
}

/** The temperature BAND in a `feel` answer — the word, never a number. */
const BANDS = ['cold', 'cool', 'comfortable', 'warm', 'hot', 'scalding'];
function bandOf(said: string): string {
  for (const b of BANDS) if (new RegExp(`\\b${b}\\b`, 'i').test(said)) return b;
  return 'none';
}
const rank = (band: string): number => BANDS.indexOf(band);

let founder: Session;
let walker: Session;
let farmer: Session;

beforeAll(async () => {
  // ⚠ Both sessions are wizards, and `goto` is why: it gates on
  // `AccessApi.can(giver, 'goto', dest)`, which resolves the
  // destination zone's parcel title. This drive walks between four
  // localities, which is a wizard's business and not a walker's.
  founder = await at(STREET, 'founder', true);
  walker = await at(STREET, 'walker', true);
  farmer = await at(YARD, 'farmer');

  // ⚠⚠ **Light, before anything is looked at.** The wire world boots at
  // `t = 0` — midnight at the vernal equinox, new moon — so the street
  // is the darkest hour of the year, and an unlit scope renders EVERY
  // object as "something". Three runs of this file failed assertions
  // about rations and coaches that were standing right there. The
  // doctrine is working; the drive has to carry a lamp.
  for (const s of [founder, walker]) {
    expectOk(await s.cmd(`clone ${LANTERN_ROW}`));
    expectOk(await s.cmd('light lantern'));
    await s.drainProse();
  }
}, 180_000);

afterAll(async () => {
  for (const s of open) await s.close().catch(() => undefined);
});

/* ───────── 0 — the falsified register rows are still live ───────── */

suite('⛔ step 0 — the two mixins the register called dead', () => {
  it('⚠⚠ `ditch` and `lime` still answer, and answer diegetically', async () => {
    // `ImprovableMixin` gates all three ground improvements through
    // `ImproveController`'s own `MixinApi.isImprovable` narrowing — a
    // necessity channel nothing static can see. The census called it
    // dead. Deleting it would have removed three shipped verbs and no
    // test in the tree would have noticed.
    // ⚠ The yard outfits you; a bare-handed `ditch` answers *"you would
    // want a spade for that"*, which is a true and useless refusal for
    // this purpose — it proves the verb exists without reaching the
    // mixin's own narrowing, which is what step 0 is checking.
    for (const t of ['spade', 'kit']) await farmer.cmd(`get ${t}`);
    expectOk(await farmer.cmd('go field'));
    await farmer.drainProse();
    expect(await farmer.prose('ditch')).toMatch(
      /sheds its own water|already off this ground/i,
    );
    expect(await farmer.prose('lime')).toMatch(
      /sweet enough|money in a ditch/i,
    );
  }, 180_000);

  it('⚠ and the herdbook `RegistrarMixin` keeps is still readable', async () => {
    expectOk(await farmer.cmd('go yard'));
    await farmer.drainProse();
    expect(await farmer.prose('look herdbook')).toMatch(
      /hide-bound|ruled columns/i,
    );
  }, 120_000);
});

/* ───────── A — the panel stops lying ───────── */

suite('A — what the world CLAIMS', () => {
  it('⭐⭐ a backpack no longer claims to have weather', async () => {
    const page = squash(plain(await (await founder.cmd('wiki backpack')).said()));
    // The forward panel: what is this thing made of. It must render
    // something, or "does not say Atmospheric" is satisfied by a blank.
    expect(page, 'the backpack page must render its panel').toMatch(
      /Container|composes|mixins/i,
    );
    expect(
      page,
      'a bag is not a place — Atmospheric left Vessel in this build',
    ).not.toMatch(/Atmospheric/i);
  }, 120_000);

  it('⭐⭐ and the inverse agrees: a coach has air, a backpack does not', async () => {
    const page = await inverse(founder, 'atmospheric');
    expect(
      page,
      'the coach is the one thing in the game with air that is not a room',
    ).toMatch(/system\/transport\/thing\/coach/i);
    expect(page, 'a backpack is not a place').not.toMatch(
      /thing\/gear\/backpack/i,
    );
    expect(page, 'nor is a bank counter').not.toMatch(/bank-counter/i);
  }, 120_000);

  it('⭐⭐ a PERSON is nobody’s product; a kept animal can be marked', async () => {
    const page = await inverse(founder, 'branded');
    expect(page, 'a cat can carry a mark').toMatch(/stuff\/agent\/cat/i);
    expect(page, 'so can a canary').toMatch(/mining\/agent\/canary/i);
    expect(page, 'and a head of stock, which is the point').toMatch(
      /ranching\/agent\/livestock/i,
    );
    expect(
      page,
      'Branded left Creature in this build — no player character, ' +
        'Cast member, Extra, Shade or corpse carries a maker’s mark',
    ).not.toMatch(/\/platform\/agent\//i);
  }, 120_000);
});

/* ───────── B — a carried perishable is no longer frozen ───────── */

suite('B — a carried perishable tracks the world', () => {
  let coldBand = 'none';

  /*
   * ⚠⚠ **The requirements' drive says a WORN BAG, and the world has no
   * bag to wear.** `/stuff/thing/gear/backpack` is the only backpack row
   * in the tree, **no locality places one**, and the commons root
   * `/stuff` is covered by no parcel — so `clone` fails closed and
   * nothing in the game can produce one. Two content gaps meeting.
   *
   * ⭐ What is driven instead is the same walk one hop shorter, and it is
   * not a weaker case than it sounds: **a CARRIED thing's enclosing
   * scope is the carrier**, and a `Creature` is a `Container` without
   * being weather. So a ration pack in your hands already needs the
   * walk to step past you and find the room — which is precisely the
   * mechanism, and precisely what returned early before this build.
   *
   * The worn bag adds one more transparent hop. It is proved in
   * `Thermal.bagged.test.ts`, which asserts it directly and which FAILS
   * with the repair reverted — including a case pinned at depth 2 to
   * show that "one step outward" leaves a worn bag frozen.
   */

  it('sets out: a ration pack, carried, on a cold street', async () => {
    // ⚠ The walker clones its OWN. `give rations to walker` answered
    // `empty-result[recipient]` — the session handle is unique-suffixed,
    // so "walker" names nobody in the room, and a handoff that silently
    // does not happen is how the next checkpoint goes vacuous.
    expectOk(await walker.cmd(`clone ${RATIONS_ROW}`));
    await walker.drainProse();

    const inv = squash(plain(await (await walker.cmd('inventory')).said()));
    expect(inv, 'the walker is carrying the ration pack').toMatch(/ration/i);

    coldBand = bandOf(await feel(walker, 'rations'));
    expect(
      coldBand,
      '`feel rations` must name a temperature band before we can watch it move',
    ).not.toBe('none');
  }, 240_000);

  it('⭐⭐ carried indoors, the band RISES', async () => {
    // ⚠⚠ **Depends on the setup above, out loud.** This case passed
    // twice while the setup was failing: `coldBand` stayed `'none'`,
    // whose rank is -1, and every real band beats -1. A comparison
    // against a value that was never read is not a comparison.
    expect(
      coldBand,
      'the cold reading never happened — this comparison would be vacuous',
    ).not.toBe('none');

    // ⚠⚠ **No hearth is lit, and that is a FINDING, not a simplification.**
    // An earlier draft lit the cookhouse hearth and idled; `feel rations`
    // then never answered — no dispatch response in 90 s, twice, on a
    // session that had been answering in under a second. `feel here`
    // in the same run is fine and `feel rations` on the street is fine,
    // so it is `feel <item>` in a room with a lit fire. Recorded in the
    // drive record; not diagnosed, and not obviously this build's.
    //
    // ⚠⚠ And it is the COOKHOUSE, not the fire: the same `feel rations`
    // hangs there with the hearth cold. The shop floor answers in a
    // second. The cookhouse holds the placement build's icebox with a
    // block of ice in it, which is the obvious suspect and is not this
    // build's doing — `airScopeOf` resolves a carried item in ONE hop
    // (carrier → room), and the street reads are sub-second.
    //
    // ⭐ The checkpoint does not need either. An enclosed shop at
    // midnight is warmer than a street at midnight all by itself, which
    // is the envelope doing exactly what it is for — and it is the same
    // walk either way: the pack's scope is the CARRIER, and the carrier
    // has no air to give.
    expectOk(await walker.cmd(`goto ${STORE}`));
    await walker.drainProse();
    await idle(walker, 900);
    // ⚠ Drain AFTER the idle too. The idle sends fifty `look`s and the
    // harness correlates a session's replies BY ORDER, one in flight —
    // so an unread frame left over from the loop puts every later
    // command one slot behind, and the next one waits for a reply that
    // was already handed to its predecessor. It reads exactly like the
    // game hanging.
    await walker.drainProse();

    // ⚠ Diagnosis probe: is the SESSION alive, or is it `feel <item>`?
    const room = await feel(walker, 'here');
    expect(room, 'the session is alive and the room answers').not.toBe('');

    const warmBand = bandOf(await feel(walker, 'rations'));
    expect(warmBand, 'the pack still answers').not.toBe('none');
    expect(
      rank(warmBand),
      `a carried ration pack taken from a cold street to a lit hearth ` +
        `must warm: was '${coldBand}', now '${warmBand}'. If these are ` +
        'equal, the ambient walk stopped at the CARRIER — which is the ' +
        'defect this build repaired.',
    ).toBeGreaterThan(rank(coldBand));
  }, 420_000);
});

/* ───────── C — a coach is a place with air ───────── */

suite('C — the coach', () => {
  let streetSaid = '';

  it('the street answers with a bare band and no cause', async () => {
    expectOk(await founder.cmd(`goto ${STREET}`));
    await founder.drainProse();
    streetSaid = await feel(founder, 'here');
    expect(bandOf(streetSaid), 'a street has a temperature').not.toBe('none');
  }, 120_000);

  it('⚠ nobody places a coach, so the drive stands one up', async () => {
    // `passenger-conveyance.yaml` says it outright: no coach line ships
    // one. This is a founder cloning a row that exists, not a wizard
    // inventing content.
    // ⚠⚠ **`--here`, explicitly.** Without it the clone runs the
    // precedence chain and falls back to the GIVER — and an
    // `ExitableVessel` may not live in an Avatar's inventory (the
    // "carry a chest with someone in it" exploit-closer), so the coach
    // answered `ok` and then was not in the room. A clone that lands
    // nowhere reports success.
    expectOk(await founder.cmd(`clone ${COACH_ROW} --here`));
    const here = squash(plain(await (await founder.cmd('look')).said()));
    expect(here, 'the coach is standing in the street').toMatch(/coach/i);
  }, 180_000);

  it('⭐⭐ inside a shut coach, the air is the COACH’S and says why', async () => {
    /*
     * ⚠⚠ **The band does not move, and that is the honest answer.**
     * Five cubic metres behind a centimetre of oak is U ≈ 250 W/K and
     * τ ≈ 75 s: an EMPTY shut coach genuinely IS at street temperature
     * within a minute or two. To move the band you light something —
     * a carriage foot-warmer, historically exact, and what the plan
     * specified.
     *
     * ⛔ **No heater in the game can be put in it.** Every
     * `SpaceHeating` row — brazier, stove, campfire, hearth — lives
     * under `/stuff` or `/world/practicum`, and neither root is covered
     * by a parcel, so `clone` fails closed for everybody. Recorded as a
     * finding; it is a title gap, not a model one, and it is the second
     * thing this drive could not do for want of a row somebody can
     * reach.
     *
     * ⭐ So this asserts what is true whether or not anything is
     * burning, and it is the thing that actually distinguishes having
     * an envelope from not having one: a coach ANSWERS FOR ITS OWN AIR
     * and says what is holding it — the street answers with a bare
     * band. The heater case is proved in
     * `Atmospheric.envelope.test.ts`, where a hearth's warmth arrives
     * over minutes against a measured U.
     */
    // ⚠⚠ **Shut it from OUTSIDE, then get in.** `close` has
    // `scope: reachable`, and `reachable` does not include the actor's
    // own location — so `close coach` from inside a coach answers
    // `validator-failed[target]`. The plan flagged this as one of two
    // possible routes; this is the one that runs.
    //
    // ⭐ It is also the honest one: a passenger pulls the door to from
    // the inside in life, and the fact that they cannot here is a
    // finding about `reachable`, not about this build. On the slate.
    // ⭐ It is ALREADY shut — `coach.yaml` authors `open: false`, on the
    // grounds that a coach with its doors open is a wagon with a roof.
    // `close coach` answers `already-closed`, which is the right answer
    // and a better checkpoint than closing it: the row's own state is
    // what the envelope reads.
    const shut = await founder.cmd('close coach');
    expect(shut.status, 'the coach ships shut').toBe('declined');
    expectOk(await founder.cmd('go coach'));
    await founder.drainProse();
    await idle(founder, 600);

    const inside = await feel(founder, 'here');
    expect(
      inside,
      'inside a shut coach, `feel here` must answer at all — it is the ' +
        'one of the four reads that goes SILENT when the scope is not ' +
        'atmospheric, so this is the moved mixin, observed',
    ).not.toMatch(/don’t perceive anything notable|don't perceive anything notable/i);
    expect(
      inside,
      'a coach with an interior gives a CAUSE, not just a band — that ' +
        'is what having an envelope of your own means. The street gave ' +
        `'${streetSaid}'.`,
    ).toMatch(/burning|cold as|oak|timber|shut|outside/i);
  }, 300_000);

  it('⭐ and the four sense reads all answer INSIDE it', async () => {
    // The mixin moved; these are the reads that key off
    // `isAtmospheric(context.location)`. `feel` is the one that goes
    // silent when it is absent — the other three degrade to the
    // outside's air — so all four are checked.
    //
    // ⚠⚠ **Gated on actually being in the coach.** The first run of this
    // file passed this case while standing in a STREET, because the
    // clone above had failed and nothing here noticed: every one of
    // these verbs answers perfectly well in a room. A checkpoint that
    // cannot tell where it is standing is not a checkpoint.
    const where = squash(plain(await (await founder.cmd('look')).said()));
    expect(
      where,
      'these reads mean nothing unless the reader is inside the coach',
    ).toMatch(/coach|carriage|bench seats|footwell/i);

    for (const verb of ['feel here', 'smell', 'listen']) {
      const said = squash(plain(await (await founder.cmd(verb)).said()));
      expect(said, `${verb} must answer inside a coach`).not.toMatch(
        /don’t perceive anything notable|don't perceive anything notable/i,
      );
    }
    const trace = squash(plain(await (await founder.cmd('trace atmosphere')).said()));
    expect(trace, 'the coach states an interior, so it reports a volume').toMatch(
      /volume/i,
    );
  }, 180_000);

  it('⭐ opening the door collapses the difference', async () => {
    // Same reach rule on the way out: step out, open, step back in.
    // ⚠ `go out` — `out` alone is not a verb; the vessel's synthesized
    // exit is named `out` and `go` is what takes it.
    expectOk(await founder.cmd('go out'));
    await founder.drainProse();
    expectOk(await founder.cmd('open coach'));
    expectOk(await founder.cmd('go coach'));
    await founder.drainProse();
    await idle(founder, 600);
    const opened = await feel(founder, 'here');
    expect(
      opened,
      'an open coach is a wagon with a roof — the envelope leaks to the ' +
        'street, and the cause sentence says so',
    ).toMatch(/open|street|outside|cold/i);
  }, 240_000);
});

/* ───────── D — nothing that worked stopped working ───────── */

suite('D — the containers that lost their weather still hold things', () => {
  it('⭐ a shop counter still takes and returns what you put on it', async () => {
    // Seven classes lost `Atmospheric` in this build. None of them ever
    // used it; all of them are containers, and containing is the thing
    // that must be untouched.
    // ⚠ The walker is carrying a lit lantern from `beforeAll`: an unlit
    // shop floor at night reads "pitch dark", which would fail this
    // assertion for a reason that has nothing to do with containers.
    // ⚠ The FOUNDER walks this leg. The walker spent five wall-minutes
    // idling by a hearth in part B and its socket did not survive it —
    // every later command on that session timed out at 60 s. A drive
    // that cascades one slow step into four unrelated failures is
    // reporting noise; part D asks its own question on its own session.
    expectOk(await founder.cmd(`goto ${STORE}`));
    await founder.drainProse();
    const said = squash(plain(await (await founder.cmd('look')).said()));
    expect(said, 'the shop floor still furnishes itself').toMatch(
      /counter|shelf|shelves/i,
    );
  }, 180_000);

  it('⭐ and a counter still takes what you put on it and gives it back', async () => {
    // `place`/`get` over a Placing host — the containment surface the
    // seven narrowed classes all have and none of them lost.
    // ⚠ `in`, not `on`: the store counter answers `wrong-preposition`
    // for `on`. Its placement vocabulary is the row's, which is exactly
    // what the placement build made row-extensible.
    expectOk(await founder.cmd(`clone ${RATIONS_ROW}`));
    expectOk(await founder.cmd('put rations in counter'));
    const onIt = squash(plain(await (await founder.cmd('look counter')).said()));
    expect(onIt, 'the counter is holding the ration pack').toMatch(/ration/i);
    expectOk(await founder.cmd('get rations'));
    const inv = squash(plain(await (await founder.cmd('inventory')).said()));
    expect(inv, 'and it handed it back').toMatch(/ration/i);
  }, 180_000);
});
