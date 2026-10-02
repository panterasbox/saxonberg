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
  expectNote,
} from '../src/harness';

export const DIRTY_REASON =
  'clones two coaches and a brazier into a street and burns the ' +
  "brazier's fuel; takes the general store's ration pack into a bag and " +
  'carries it to the cookhouse; lights the cookhouse hearth; clones a ' +
  'lantern per session and burns its oil; takes the delve corridor to ' +
  'the point of searching it; stands a draft horse up in the goods yard ' +
  'and leaves it there — none of it produced again';

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
    'trade-shopkeeping',
    'newbie-wilds',
    'hinkley-hills',
    'saxonberg-lounge',
    'trade-hospitality',
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

/* Part E's places. */
const CORRIDOR = '/world/newbie-wilds/delve/corridor-1';
const LANE = '/world/terminus/hinkley-hills/location/lane';
const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const TREELINE = '/world/newbie-wilds/crossroads/treeline';
const HORSE_ROW = '/system/transport/agent/draft-horse';
/*
 * ⚠⚠ **No cart is CLONED here, and the reason is a finding worth
 * keeping.** `clone /system/transport/thing/wagon` and `…/ore-tram`
 * both answer `controller-rejected:access-denied`, while `clone
 * …/coach` (part C) succeeds — same pack, same `/system/transport`
 * prefix. `CloneController.ts:161-183` is the rule:
 *
 *   - **no live instance** → `AccessApi.canAtPath(giver, 'clone', path)`
 *     — the honest path question, and a titled root answers yes;
 *   - **a live instance exists** → `AccessApi.can(giver, 'clone',
 *     representative)`, which resolves title through **that instance's
 *     zone**.
 *
 * So a wagon standing in the Terminus goods yard makes the wagon ROW
 * unclonable by anyone who does not hold Terminus. ⭐ **A row gets
 * harder to clone the moment somebody puts one down** — which reads
 * backwards, and is filed rather than fixed here.
 *
 * ⚠ My first reading of this was "the store stocks it, so it is
 * owned", which was a guess that fitted two data points and was wrong:
 * the ore-tram is stocked nowhere. Reading the controller was what
 * settled it.
 *
 * The yard already HAS a wagon, so the horse walks to the cart.
 */
const GOODS_YARD = '/world/terminus/goods-yards/yard';

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

/**
 * What the ROOM says — `look here`, never bare `look`.
 *
 * ⚠⚠ **This is a fact about the verb, and it cost five runs of part E.**
 * `look`'s target arg is optional and its scope is
 * `["$focus", "reachable"]`, so after you have handled something — a
 * `clone`, a `light`, any command with `updates_focus` — a bare `look`
 * binds the FOCUS and shows you that thing again instead of the room.
 * Every one of those runs read back *"a punched-tin lantern…"* as the
 * answer to `look` in a delve corridor and a hill lane, and it survived
 * two drains, a two-second wait and a re-read, because it was never a
 * stray frame: it was the right answer to a question the drive did not
 * mean to ask. ⭐ Part D's leg passes because `goto` re-points the focus
 * at the destination.
 *
 * Whether bare `look` SHOULD fill an optional target from focus is a
 * live question for the perception subsystem and not this build's; the
 * drive states the behaviour rather than working around it silently.
 */
async function roomText(s: Session): Promise<string> {
  await s.drainProse();
  return squash(plain(await (await s.cmd('look here')).said()));
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
  // ⚠⚠ **A component that FAILED renders its failure into the page**, and
  // to a reader that is indistinguishable from a capability nothing
  // composes. This guard was missing on the first run of part E and the
  // panel had blown its 2 s budget on `Chattel`'s 470 rows — every
  // *does not contain* below would have passed against the words
  // `<composition> failed: exceeded 2000ms`. The positive half of each
  // pair is what caught it; this is so the next one fails by name.
  expect(
    page,
    `wiki ${mixin}: the composition component reported a FAILURE — ` +
      'the panel is not answering, and every negative below would pass ' +
      'vacuously against its error text',
  ).not.toMatch(/composition&gt; failed|composition> failed|exceeded \d+ms/i);
  return page;
}

/**
 * What `feel` says about a thing, in the words a player reads.
 *
 * ⚠⚠ **Bind carried things with `me:i:` and never by bare keyword.**
 * `feel rations` answered in 887 ms on a street and never answered in
 * the general store, which stocks `rations` at `par: 5` — so the binder
 * found six, asked which, and the command sat on an unanswered PROMPT.
 * A prompt lands on its own frame, so `cmd()` waits out its whole
 * timeout and reports "no dispatch-response", which reads exactly like
 * a wedged server. Five rounds of this drive went looking for a thermal
 * defect that was never there. The harness names it now.
 */
async function feel(s: Session, what: string): Promise<string> {
  return squash(plain(await (await s.cmd(`feel ${what}`)).said()));
}

/** The temperature BAND in a `feel` answer — the word, never a number. */
const BANDS = ['cold', 'cool', 'comfortable', 'warm', 'hot', 'scalding'];
function bandOf(said: string): string {
  for (const b of BANDS) if (new RegExp(`\\b${b}\\b`, 'i').test(said)) return b;
  return 'none';
}

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
    // ⚠ `me:i:` — the rule this file already states for `feel`. By the
    // time part E stands its sessions up the street holds five cloned
    // lanterns, and a bare `light lantern` raises a disambiguation
    // PROMPT that every later command then lands on.
    expectOk(await s.cmd('light me:i:lantern'));
    await s.drainProse();
  }
}, 180_000);

afterAll(async () => {
  for (const s of open) {
    try {
      await s.close();
    } catch {
      /* a session whose socket already went is not a failure to report */
    }
  }
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
    // ⚠ Asserted on CLASSES, not on rows. The inverse answers by class
    // once the row list passes 40 — `Branded` is 53 rows over 9 classes
    // — and the class is the honest unit anyway: composing is something
    // a CLASS does, and a row inherits it.
    expect(page, 'a kept animal can carry a mark — a cat, a canary').toMatch(
      /platform\/agent\/KeptAnimal/i,
    );
    expect(page, 'and a head of stock, which is the point').toMatch(
      /ranching\/agent\/Livestock/i,
    );
    // ⚠⚠ **The negative had to be sharpened the moment the panel began
    // listing CLASSES.** `/platform/agent/` was the right exclusion when
    // the panel listed rows; it now matches `/platform/agent/KeptAnimal`,
    // which is the POSITIVE two lines up. A negative that fires on the
    // thing it is meant to permit is as useless as one that fires on
    // nothing — name the people.
    expect(
      page,
      'Branded left Creature in this build — no player character, ' +
        'Cast member, Extra, ShadeAvatar or corpse carries a maker’s mark',
    ).not.toMatch(/agent\/(Avatar|Cast|Extra|Corpse|ShadeAvatar|Character)\b/i);
  }, 120_000);
});

/* ───────── B — a carried perishable is no longer frozen ───────── */

suite('B — a carried perishable tracks the world', () => {
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

    const streetBand = bandOf(await feel(walker, 'me:i:rations'));
    expect(
      streetBand,
      '`feel` must name a temperature band before we can watch one move',
    ).not.toBe('none');
  }, 240_000);

  it('⚠ the pack answers in both places — and see why that is ALL this proves', async () => {
    /*
     * ⛔⛔ **This checkpoint is a smoke check, and saying so is the point.**
     *
     * The claim the build actually makes — a carried thing reads the
     * nearest air instead of the ambient it was stamped with — **cannot
     * be observed over this socket**, and four attempts is enough to
     * call it:
     *
     *  1. *band before vs after* — Mayfield Row at midnight and the
     *     cookhouse both read `comfortable`. No boundary crossed.
     *  2. *chill it in the icebox first* — real gradient, but the icebox
     *     already holds a ration pack, so `me:i:rations` matched two and
     *     the command sat on a disambiguation prompt.
     *  3. *converge on the room* — the rooms did differ (cookhouse
     *     `cold`, street `comfortable`) and the pack held `comfortable`
     *     for 1.5 game-hours. ⚠ That is not the defect: `feel` reports
     *     the pack's OWN temperature, which relaxes toward ambient over
     *     many time constants, and `cold` is below 273 K — the assertion
     *     was demanding ~20 K of equilibration from 0.8 kg of biscuit.
     *  4. *read a number instead of a band* — there is none to read.
     *     `platform/idea/reading/temperature` is `scope: [here]`: the
     *     channel measures the ROOM. No verb reports a carried item's
     *     temperature as a figure.
     *
     * So: band granularity needs full equilibration, equilibration needs
     * game-hours, and the only sub-band read is a room read. The socket
     * cannot see it.
     *
     * ⭐ **Where the claim IS proved:** `Thermal.bagged.test.ts`. Three
     * of its four cases FAIL with the repair reverted — including the
     * worn bag, whose container is the wearer — and one is pinned at
     * depth 2 to show that "one step outward" leaves a worn bag frozen.
     * That file asserts `lastAmbientK` directly, which is the quantity
     * that changed and the one no verb exposes.
     *
     * What this leaves behind is worth keeping anyway: the pack is
     * reachable, answers `feel` in both places, and the world produces a
     * real gradient between them — which is what makes the unit test's
     * fixture a fair model rather than a convenient one.
     */
    const streetPack = bandOf(await feel(walker, 'me:i:rations'));
    const streetRoom = bandOf(await feel(walker, 'here'));

    expectOk(await walker.cmd(`goto ${COOKHOUSE}`));
    await walker.drainProse();
    await idle(walker, 900);

    const cookPack = bandOf(await feel(walker, 'me:i:rations'));
    const cookRoom = bandOf(await feel(walker, 'here'));

    expect(streetPack, 'the pack answers on the street').not.toBe('none');
    expect(cookPack, 'and still answers indoors').not.toBe('none');
    expect(
      cookRoom,
      `the two rooms must differ or even this proves nothing — street ` +
        `'${streetRoom}', cookhouse '${cookRoom}'`,
    ).not.toBe(streetRoom);
  }, 300_000);
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

/* ───────── E — matter is not a good ───────── */

/*
 * ⭐⭐ **The claim this build exists to remove, driven on the one surface
 * that shows a claim.** `Thing` composed `ChattelMixin` and
 * `ConcealableMixin`, so every floor, hearth, forge, counter and yard
 * wall in the game carried author surface saying it could be OWNED and
 * HIDDEN — and `Creature` composed `Chattel`, saying the same of every
 * player, Cast member, Extra, ShadeAvatar and corpse.
 *
 * ⚠⚠ **Nothing ever stamped one, so nothing behaved differently**, which
 * is precisely why this part is written against the inverse panel and
 * not against a behaviour: there is no behaviour to catch. The defect
 * was entirely in what the classes CLAIMED, the claim is the documented
 * author surface, and the panel is where a player reads it.
 *
 * Every assertion below is therefore a PAIR — something the panel must
 * contain and something it must not. A panel that has broken again (the
 * `/obj` scan root) renders identically to one that is simply honest,
 * and `inverse()` refuses an empty or truncated page before either half
 * is read.
 */

suite('E — what is a GOOD, and what is part of the place', () => {
  /*
   * ⚠⚠ **Part E reads on its OWN sessions, and that is not tidiness.**
   * The founder idles five wall-minutes beside a hearth and inside a
   * coach in parts B and C, and by part E its socket is carrying stale
   * frames: `wiki chattel` came back as an NPC's ambient line about
   * trimming a torch wrap, and `look` in a delve corridor came back as
   * the description of a lantern cloned four commands earlier. Part D
   * had already hit this and worked around it by switching sessions;
   * the note is here so the next part does it by default. A drive that
   * cascades one slow leg into five unrelated failures is reporting
   * noise, not findings.
   */
  let reader: Session;
  let ground: Session;
  let delver: Session;
  let keeper: Session;

  beforeAll(async () => {
    // These two only read the wiki and the floor under their feet —
    // neither needs a lamp, and neither clones one.
    reader = await at(STREET, 'reader', true);
    ground = await at(STREET, 'ground', true);

    /*
     * ⚠⚠ **`startLocation`, not `goto`, and that is a fact about the
     * world.** `goto` binds its target through MQL, which resolves LIVE
     * objects — and a `SingletonCartesianLocation` that nobody has
     * visited has no instance yet, so `goto /world/newbie-wilds/delve/
     * corridor-1` answers `unknown-target`. Opening a session AT the
     * path materializes it. The same is true of the hill lane.
     *
     * ⭐ Standing them up HERE rather than inside the test body is also
     * what settles the lantern. A `clone`'s own description arrives on a
     * frame the harness cannot correlate and lands on whatever command
     * is next; four earlier runs read *"a punched-tin lantern…"* as the
     * answer to `look` in a corridor and a lane, through two drains, a
     * wait and a retry. Cloning in `beforeAll` puts the whole of the
     * suite's first assertion between the echo and the read.
     */
    delver = await at(CORRIDOR, 'delver', true);
    keeper = await at(LANE, 'keeper', true);
    for (const s of [delver, keeper]) {
      expectOk(await s.cmd(`clone ${LANTERN_ROW}`));
      expectOk(await s.cmd('light me:i:lantern'));
      await s.drainProse();
    }
  }, 240_000);

  it('⭐⭐ the chattel panel: goods and kept animals, not the ground and not people', async () => {
    const page = await inverse(reader, 'chattel');

    // The positives first — an empty panel satisfies every negative.
    // ⚠ CLASSES: the inverse answers by class past 40 rows, and Chattel
    // is the widest mixin in the game.
    expect(page, 'a bare good is a good somebody owns').toMatch(
      /platform\/thing\/Good/i,
    );
    expect(page, 'and so is a kept animal, once it has a name').toMatch(
      /platform\/agent\/KeptAnimal/i,
    );

    // ⚠ The three that used to be here, and the reason the build ran.
    expect(
      page,
      'a shop counter is part of the shop — the GOODS on it are the ' +
        'chattel, which is what the stamp at the sale is for',
    ).not.toMatch(/shopkeeping\/thing\/Stock|lib\/retail\/Stock/i);
    expect(page, 'nor is a bank counter somebody’s property').not.toMatch(
      /thing\/BankCounter/i,
    );
    expect(page, 'and you do not own the floor, you own the PARCEL').not.toMatch(
      /platform\/thing\/Floor/i,
    );
    expect(page, 'nor the hearth, the forge or the water fixture').not.toMatch(
      /thing\/(Hearth|Forge|WaterFixture)/i,
    );
    // ⚠ Named, not prefixed: `/platform/agent/KeptAnimal` is the
    // positive above, and it lives under the same root as the people.
    expect(
      page,
      '⭐⭐ and no PERSON is anybody’s chattel — Chattel left Creature in ' +
        'this build, so no Avatar, Cast member, Extra, ShadeAvatar or corpse ' +
        'appears here',
    ).not.toMatch(/agent\/(Avatar|Cast|Extra|Corpse|ShadeAvatar|Character)\b/i);
  }, 120_000);

  it('⭐⭐ the concealable panel: loose things and bodies, not the place itself', async () => {
    const page = await inverse(reader, 'concealable');

    expect(page, 'a trap is set to be missed').toMatch(/thing\/Trap/i);
    expect(page, 'and a bare good can be stashed — the delve cache is one').toMatch(
      /platform\/thing\/Good/i,
    );

    expect(
      page,
      'you cannot hide a floor — there is nowhere for it to be hidden FROM',
    ).not.toMatch(/platform\/thing\/Floor/i);
    expect(page, 'nor a shop counter').not.toMatch(
      /shopkeeping\/thing\/Stock|lib\/retail\/Stock/i,
    );
    expect(page, 'nor a hearth, a forge or a water fixture').not.toMatch(
      /thing\/(Hearth|Forge|WaterFixture)/i,
    );
  }, 120_000);

  it('⭐ the hidden cache is still hidden, still found, still taken', async () => {
    // ⚠⚠ THE checkpoint of part E. `hidden-cache` changed class in W0
    // (`/platform/thing/Thing` → `/platform/thing/Good`), and its
    // authored `concealment: hidden` lives on the mixin that moved with
    // it. If the band had been dropped in the move, the pouch would sit
    // in plain sight and no unit test in the tree would know.
    const before = await roomText(delver);
    expect(
      before,
      'the corridor must render at all before "no pouch" means anything',
    ).toMatch(/corridor|slab|passage/i);
    expect(before, 'the pouch is hidden: a passer-by does not see it').not.toMatch(
      /pouch/i,
    );

    /*
     * ⚠⚠ **What this leg proves, and where it stops.**
     *
     * The W0 claim is that `hidden-cache` changed class
     * (`/platform/thing/Thing` → `/platform/thing/Good`) and kept its
     * authored `concealment: hidden`, which lives on the mixin that
     * moved with it. **The assertion above is what proves that**: if the
     * band had been dropped in the move the pouch would be standing in
     * plain sight in the room listing, and it is not.
     *
     * ⚠ The FIND does not land inside this drive's reach. `search` is a
     * durative engagement — it answers *"You begin searching your
     * surroundings"* and resolves on its own frame — and through raw
     * waits of 15 s, reads on the search's own result and reads on a
     * later command, neither *"Your search turns up…"* nor its
     * counterpart *"you turn up nothing you hadn't already"* arrived.
     * Whether that is the engagement not completing for an actor whose
     * hands hold a lit lantern, or a competence gate, or a wire-harness
     * correlation problem, is the concealment subsystem's question and
     * not this build's — **filed, not faked.** What is asserted here is
     * that the verb is afforded and accepted, which is the half a
     * narrowing could have broken.
     */
    expectOk(await delver.cmd('search'));

    // ⚠ And `get pouch` is NOT driven here for the same reason: you
    // cannot take what the search has not turned up, and a `get` that
    // refuses because the thing is still concealed would be asserting
    // the concealment gate rather than the class move.
  }, 240_000);

  it('⭐ a floor is not a good: it refuses to be taken, and still answers a hand', async () => {
    // The two halves of the narrowing on one object: it is not takeable,
    // and the matter root's `Tangible`/`Detailed` survived the
    // subtraction so a hand still gets an answer.
    //
    // ⚠ `feel` FIRST. Run the other way round, `get`'s refusal prose
    // lands on `feel`'s frame and the band read sees the floor's
    // description instead of its temperature — which is how the third
    // run of this leg failed.
    await ground.drainProse();
    const felt = await feel(ground, 'floor');
    expect(felt, 'the floor still answers a hand at all').not.toBe('');
    // ⭐ It answers with the SURFACE, not a temperature band, and that is
    // correct: `Floor` composes no `ThermalMixin`, so there is no
    // temperature to report. An earlier draft of this checkpoint
    // demanded a band and was asserting something the world has never
    // claimed — the read under test is the matter root's `Tangible` and
    // `Detailed` surviving the narrowing, which is what the floor
    // answering AT ALL proves.
    expect(felt, 'and the answer is about the floor').toMatch(/floor|stone|plain|smooth|rough|cold|cool/i);

    // ⚠⚠ **This found a shipped defect.** On the first run of part E
    // `get floor` answered *"You pick up a featureless plain floor"* —
    // every room in the game handed you its own ground. `Floor` never
    // set `fixedInPlace`, and `AdornmentMixin`'s not-portable invariant
    // fires only when `adornedTo` is non-null, which a minted floor's is
    // not: the one guard on the stack was structurally unable to see it.
    // Fixed in `platform/thing/Floor.ts`; this is the checkpoint.
    await ground.drainProse();
    const said = squash(plain(await (await ground.cmd('get floor')).said()));
    expect(
      said,
      'a floor cannot be pocketed, and the refusal is diegetic',
      // ⚠ Asserted on the PROSE, not on an envelope kind: a refusal the
      // player cannot read is the failure mode this repo keeps finding.
    ).toMatch(/can.?t|cannot|fixed|part of|won.?t budge|no way/i);
  }, 180_000);

  it('⭐ a counter still sells, and the good is what changes hands', async () => {
    const shopper = founder; // carries the lamp in — see the cache leg
    expectOk(await shopper.cmd(`goto ${STORE}`));
    await shopper.drainProse();

    /*
     * ⚠⚠ **What this checkpoint can and cannot prove, stated plainly.**
     * A fresh avatar has no funded account, so `buy` answers
     * `controller-rejected:insufficient-funds` — for the 10-coin lantern
     * AND for the 2-coin torch. Funding a buyer means the Governor's
     * `reserve override` and a walk to a bank, which is
     * `farming.dirty`'s drive; duplicating it here would be a second
     * copy of somebody else's flow.
     *
     * ⭐ The refusal is still the checkpoint W1 needs, and it is not a
     * weak one: `insufficient-funds` is reached only AFTER the counter
     * has resolved the good, found its price on the offer and looked up
     * the buyer's account. That whole path runs over a counter that
     * stopped being a `Vessel` and became a `Holder` in
     * this build. A structural break would answer `no-such-target` or
     * `wrong-target`, and the assertion below is written to fail on
     * either.
     */
    const attempt = await shopper.cmd('buy torch');
    expectRefused(attempt);
    expectNote(attempt, 'controller-rejected', {
      // The till was REACHED — the counter resolved the torch, found its
      // price on the offer and looked up the purse. A counter broken by
      // the narrowing refuses EARLIER than this, at the target.
      reason: 'insufficient-funds',
    });

    // And the counter is still standing in the shop holding its stock.
    const floor = await roomText(shopper);
    expect(floor, 'the counter stayed where it was').toMatch(/counter/i);
  }, 180_000);

  it('⭐⭐ a kept animal is still a thing that CAN be owned — the other end of D15', async () => {
    /*
     * `Chattel` came off `Creature` and landed on `KeptAnimal`, and the
     * panel in the first checkpoint of this part is the claim: the cat's
     * class is listed, the people's are not.
     *
     * ⚠⚠ **What the drive cannot reach, stated rather than faked.**
     * `name` is the promotion that STAMPS the chattel, and it is gated
     * on the animal having chosen you — *"it must know you well, and it
     * must have followed you home at least once,"* which cannot be
     * bought with food. Driving that is the pets loop end to end and it
     * is `pets`' own drive, not this build's.
     *
     * ⭐ So the checkpoint is the SHAPE of the refusal, and it is not a
     * weak one. `controller-rejected:not-chosen` is reached only after
     * the binder has resolved the cat against `requires: BondedMixin`
     * and the controller has run its own gate. A cat that had lost the
     * kept-animal rung in this build would be refused EARLIER — at the
     * arg gate, which fails closed and silent, and which is the exact
     * failure class this repo keeps finding. The gate that fired is the
     * RELATIONSHIP, which is what it should be.
     */
    const lane = await roomText(keeper);
    expect(lane, 'the lane keeps a stray — it mints one on any boot').toMatch(
      /cat/i,
    );

    const attempt = await keeper.cmd('name stray Mouse');
    expectRefused(attempt);
    expectNote(attempt, 'controller-rejected', { reason: 'not-chosen' });
  }, 240_000);
});

/* ───────── F — the dead keys ───────── */

suite('F — a key the applier never writes is a key nobody wrote', () => {
  it('⭐⭐ `look sextant` has a long description again', async () => {
    /*
     * ⚠⚠ **Eleven shipped instruments authored `long:` and the applier
     * has never written that field.** `VisibleMixin` declares
     * `longDescription`; `long` is declared nowhere, so the applier —
     * which reflects only into fields a composed class declares —
     * discarded every one of them at hydration, without a word. The
     * balance, the altimeter, the hydrometer, the sextant: every
     * instrument in the game rendered with NO long description, for the
     * whole life of the instrumentation build.
     *
     * ⭐ This is the same failure as `material:` on twelve crop and
     * quarry rows, and as the coach's dead `ambientLumens`: **a data key
     * that matches no field is not an error, it is a silence.** The
     * census is what made them countable; `lint:instanceable`'s
     * invariant 12 is what keeps the count from growing, and its ceiling
     * came down 436 → 412 on this fix.
     *
     * ⚠ The sextant is `props:`-minted in the Duncan Hall lobby, which
     * is how the drive can reach it at all — `/stuff` is covered by no
     * parcel, so nobody can `clone` one.
     */
    expectOk(await founder.cmd(`goto ${LOBBY}`));
    await founder.drainProse();
    const said = squash(plain(await (await founder.cmd('look sextant')).said()));
    expect(said, 'the sextant renders at all').toMatch(/sextant|brass/i);
    expect(
      said,
      'and its long description is the authored prose, not a blank — ' +
        'the row said `long:` and nothing has ever read that key',
    ).toMatch(/graduated arc|index mirror|vernier/i);
  }, 180_000);
});

/* ───────── G — the agent branch ───────── */

/*
 * ⭐⭐ **A horse is not a person, and a wolf fights back.**
 *
 * The Agent branch had two tiers where the readers were asking for
 * three. `Creature` is a body; `Character` is a person; there was no
 * rung for *a body that ACTS* — so every animal that needed to move,
 * perceive, be engaged or fight had to be filed as a person to get it.
 * The newbie-wilds wolf was an `Extra` (*"a character who is a role,
 * not a person"*) and the draft horse was a `HaulingCreature`
 * (`Mountable(Character)`), so both composed
 * `CasterMixin`, `MemorizedMixin`, `EmployedMixin`, `PersonaMixin`,
 * `CommandGiverMixin`, `SoulMixin` and `VocalMixin`.
 *
 * ⚠ Nothing ever called any of it — the defect was in what the classes
 * CLAIMED — so like part E this reads the panel for the claim, and
 * drives the two behaviours the move had to keep and the one it nearly
 * broke.
 */

suite('G — a horse is not a person, and a wolf fights back', () => {
  let carter: Session;
  let hunter: Session;

  beforeAll(async () => {
    /*
     * ⚠ The FOUNDER walks to the yard rather than a fresh session
     * standing up in it. The goods yard is outdoors at midnight (the
     * wire world boots at t=0, new moon), and a freshly-cloned lantern
     * lights *"shapes and edges, no more"* — enough to move by, not
     * enough to list what is standing there. The founder has been
     * reading rooms correctly since part A.
     *
     * ⭐ Darkness blocks the RENDER, not the binder: `hitch wagon to
     * horse` resolves `wagon` in reach whatever the light, which is why
     * the checkpoints below do not depend on a room listing.
     */
    carter = founder;
    expectOk(await carter.cmd(`goto ${GOODS_YARD}`));
    expectOk(await carter.cmd(`clone ${HORSE_ROW}`));
    /*
     * ⚠⚠ **`drop`, and it is load-bearing.** `clone` puts the clone in
     * the GIVER's inventory by default (`CloneController`'s precedence:
     * `--into` → `--here` → self-placement → giver fallback), and a
     * thing in your pack is not a PEER. `MountableMixin` affords
     * `mount` to peers, so a pocketed horse affords nothing and the
     * verb stays unknown — which is how this checkpoint failed once
     * with the affordance already in place and correct. The wagon is a
     * room prop, which is why `hitch` worked from the first run and
     * `mount` did not: the same bug would have read as "the Mountable
     * affordance does not work".
     */
    expectOk(await carter.cmd('drop horse'));
    await carter.drainProse();

    /*
     * ⚠⚠ **Only ONE horse can exist per run, and that is the clone gate
     * again.** The carter's clone above is the row's first instance, so
     * `canAtPath` answered it; every clone after that resolves the
     * REPRESENTATIVE and asks `AccessApi.can` through *its* zone — the
     * Terminus goods yard — which the hunter does not hold. The second
     * `clone /system/transport/agent/draft-horse` answers
     * `access-denied`, in a different locality, for a row nobody there
     * has touched.
     *
     * ⭐ So the mount question is asked where the verb LIVES (at the
     * yard, below) rather than where the wolf is. The wolf's half —
     * that a `Beast` composes neither `Mountable` nor `Hauler` — is
     * asserted by `Beast.test.ts` and read off the `hauler` panel in G5.
     */
    hunter = await at(TREELINE, 'hunter', true);
    expectOk(await hunter.cmd(`clone ${LANTERN_ROW}`));
    expectOk(await hunter.cmd('light me:i:lantern'));
    await hunter.drainProse();

    // Drain, wait, drain — the clone echoes land late (part E's lesson).
    await new Promise((r) => setTimeout(r, 2000));
    for (const s of [carter, hunter]) await s.drainProse();
    // ⚠ Drain, wait, drain — the clone echoes land late and on the next
    // command's frame (part E's five wasted runs).
    await new Promise((r) => setTimeout(r, 2000));
    for (const s of [carter, hunter]) await s.drainProse();
  }, 300_000);

  it('⭐ the horse stood up, and it is a DraftAnimal', async () => {
    // ⚠ A TARGETED look, not the room listing: the yard is unlit and
    // renders "shapes and edges, no more". That the wagon is there is
    // proved by the next checkpoint binding it, which is a stronger
    // statement than a render anyway.
    // ⚠ Matched on the long description, not the presentation: the
    // unlit yard renders an unrecognised agent as *"someone"*, so the
    // noun phrase is no evidence here and the prose is.
    const said = squash(plain(await (await carter.cmd('look horse')).said()));
    expect(said, 'the horse renders at all').toMatch(
      /seventeen hands|feathered feet|horse|draft|shire/i,
    );
  }, 180_000);

  it('⭐⭐ `hitch wagon to horse` reaches the CONTROLLER — the arg gate resolved a DraftAnimal', async () => {
    /*
     * ⚠⚠ THE checkpoint of part G. `hitch.yaml:35` gates its `mount`
     * arg on `HaulerMixin`, which has **zero** `MixinApi.isHauler`
     * narrowings and **zero** affordance statics — that one `requires:`
     * is the whole of its reachability. When the horse stopped being a
     * `Character`, `Hauler` had to be composed on `DraftAnimal` by hand
     * or hitching would have died at the BINDER, which fails closed and
     * silent and which no controller test can see.
     *
     * ⭐ **What this proves, and what it cannot.** The wagon demands a
     * competence band (`HaulageRig.canHitch` — *"the ACTOR's competence
     * decides, not the hauler's"*), and a fresh founder has no
     * transcript, so the act legitimately refuses. That is shipped
     * behaviour and not this build's. ⭐⭐ But `hitch-refused` is the
     * CONTROLLER's veto, and reaching it means the binder had already
     * resolved the horse against `requires: HaulerMixin` — which is the
     * whole question. A horse that had lost `Hauler` refuses EARLIER,
     * at the gate, with a different reason and no prose a player can
     * read. The assertion is written to fail on either.
     */
    const attempt = await carter.cmd('hitch wagon to horse');
    expectRefused(attempt);
    expectNote(attempt, 'controller-rejected', { reason: 'hitch-refused' });
    const said = squash(plain(await attempt.said()));
    expect(
      said,
      'and the refusal is the diegetic competence one, not a binder error',
    ).toMatch(/shafts|more rig than you can hold|somebody who has done it/i);
  }, 240_000);

  it('⭐ `mount` exists because a horse is standing there — and refuses the wagon BY NAME', async () => {
    /*
     * ⭐⭐ **Both halves of the affordance in one checkpoint.**
     *
     * `mount` is afforded by `MountableMixin` to peers, so the verb is
     * in the carter's surface only because a mountable horse is in the
     * room — ⚠ and until this build it was afforded by NOTHING AT ALL.
     * View, controller and arg gate had shipped; no
     * `commandContributions` anywhere in the repo named the file, so
     * `mount horse` answered *"I don't understand 'mount'."* for every
     * player since conveyance shipped. Same for `hitch`, `unhitch` and
     * `ride`. The FIRST of the five reachability links, dead on four
     * verbs, and `conveyance.md`'s worked example — *a horse you ride
     * while it hauls* — unreachable.
     *
     * Then the arg gate: point the now-existing verb at the wagon and
     * `mount.yaml:21`'s `requires: MountableMixin` refuses it by name.
     * That is the same gate that refuses a `Beast`, asked of the one
     * non-mountable thing standing in this yard.
     */
    const attempt = await carter.cmd('mount wagon');
    expectRefused(attempt);
    const said = squash(plain(await attempt.said()));
    expect(
      said,
      'the verb EXISTS (a horse affords it) and the gate names the reason — ' +
        "`lib/mixin.ts:803`'s \u201cyou can't ride\u201d",
    ).toMatch(/can.?t ride|not something you can ride/i);
    expect(said, '⚠ and it is not an unknown verb').not.toMatch(
      /don.?t understand/i,
    );
  }, 180_000);

  it('⭐⭐ the wolf fights back — Combatant survived the move to Actor', async () => {
    // `AttackController` gates its TARGET on `Vitals && Engaged`, never
    // on `Combatant`, so the wolf could always be attacked. What the
    // move had to preserve is the half that ANSWERS: `Combatant` is on
    // `Actor` now rather than on the person rung. If this fails, the
    // wolf is taking the fight in silence.
    expectOk(await hunter.cmd('attack wolf'));
    await new Promise((r) => setTimeout(r, 8000));
    const said = squash(plain(await (await hunter.cmd('look')).said()));
    expect(
      said,
      'the fight is running and the wolf is in it',
    ).toMatch(/wolf|fight|bite|snarl|lunge|teeth/i);
  }, 240_000);

  it('⭐⭐ the panels: a person hauls, a beast fights, and NOTHING animal is employed', async () => {
    const hauler = await inverse(founder, 'hauler');
    expect(hauler, 'a draft animal pulls').toMatch(/agent\/DraftAnimal/i);
    expect(hauler, 'and so does a person').toMatch(
      /agent\/(Cast|Avatar|Extra)|character\/Character/i,
    );
    expect(
      hauler,
      '⚠ but a plain Beast does NOT — that is why `Hauler` is not on the rung',
    ).not.toMatch(/agent\/Beast\b/i);

    const combatant = await inverse(founder, 'combatant');
    expect(combatant, 'a wolf fights back').toMatch(/agent\/Beast/i);
    expect(combatant, 'and a kept animal does now too').toMatch(
      /agent\/KeptAnimal/i,
    );
    expect(
      combatant,
      '⭐ a corpse does not — it is a body, not a body that acts',
    ).not.toMatch(/agent\/Corpse/i);

    const employed = await inverse(founder, 'employed');
    expect(employed, 'a Cast member holds a post').toMatch(/agent\/Cast/i);
    expect(
      employed,
      '⭐⭐ and NO animal does — this is the narrowing’s claim, read off ' +
        'the page a player can open. A pit pony held a job until 2026-09-30.',
    ).not.toMatch(/agent\/(Beast|DraftAnimal|KeptAnimal)/i);
  }, 180_000);

  it('⭐ and the beast has a page of its own', async () => {
    const page = squash(plain(await (await founder.cmd('wiki beast')).said()));
    expect(page).not.toMatch(/no such page|does not exist/i);
    expect(page, 'the three tiers are stated where a player reads them').toMatch(
      /body that acts|is nobody/i,
    );
  }, 120_000);
});

/* ───────── H — the Location and Idea branches ───────── */

/*
 * ⭐⭐ **The Location root was too NARROW — the one branch of the four
 * where the owner's criterion ADDS instead of subtracting.** `Visible`,
 * `Perceptible` and `Detailed` were composed per room class, and three
 * docstrings carried the same sentence: *"every room class built
 * directly on `Location` has to remember"*. Two classes did not, and
 * their rows' `keywords:` were dead.
 *
 * The Idea branch needed no rung at all — it is the one root that
 * composes nothing, and the owner's ruling (*every branch wants
 * `Perceptible` on the base except Idea*) turned out to describe the
 * shipped state rather than a change.
 */

suite('H — a room can be named, and a cellar can be read', () => {
  let reader: Session;

  beforeAll(async () => {
    reader = await at(STREET, 'hreader', true);
  }, 180_000);

  it('⭐⭐ the cellar has a description again — it never rendered one', async () => {
    /*
     * `cellar.yaml` authored `name:` and `description:`; the Location
     * branch declares `shortDescription` and `longDescription`, so the
     * applier discarded both. The hospitality cellar has NEVER
     * rendered its prose, and it is good prose.
     *
     * ⚠ `startLocation`, not `goto` — a singleton room nobody has
     * visited has no instance for MQL to bind.
     */
    const cellar = await at(
      '/trade/hospitality/location/cellar',
      'cellarer',
      true,
    );
    // ⚠ **Unlit interiors are PITCH BLACK**, and a cellar behind a bar
    // is the most interior room in the game — the first run read *"It
    // is pitch dark. You can make out nothing."*, which is the doctrine
    // working, not the fix failing. Carry the lamp in.
    expectOk(await cellar.cmd(`clone ${LANTERN_ROW}`));
    expectOk(await cellar.cmd('light me:i:lantern'));
    await cellar.drainProse();
    await new Promise((r) => setTimeout(r, 2000));
    await cellar.drainProse();
    const said = await roomText(cellar);
    expect(said, 'the cellar renders its authored description').toMatch(
      /steel racking|kegs|cooler/i,
    );
  }, 240_000);

  it('⭐ Dave’s Bar is in the grid — its `coords:` used to be discarded', async () => {
    /*
     * `Bar` restated `SingletonCartesianLocation`'s mixin set on a
     * plain `Location`, which composes the `coordinates` FIELD and not
     * `coords` — `coords` lives on the `CartesianLocation` CLASS. The
     * row authored `coords:` under a comment reading *"`coords:` is
     * the MEMBERSHIP operation"* and the applier dropped it: the bar
     * belonged to no zone, inside a `/world/lounge` that IS a
     * `CartesianZone`.
     *
     * ⭐ `trace atmosphere` is the honest instrument: it prints a
     * `volume:` line only when `getVolume() !== null`, and a zoneless
     * bare `Location` has no extent to cube. A volume means the room
     * resolved a zone.
     */
    const barkeep = await at('/world/lounge/location/bar', 'barkeep', true);
    const said = squash(
      plain(await (await barkeep.cmd('trace atmosphere')).said()),
    );
    expect(said, 'the trace runs at all').not.toMatch(/don.?t understand/i);
    expect(
      said,
      'and the bar has a volume, which means it resolved a zone',
    ).toMatch(/volume/i);
  }, 240_000);

  it('⭐⭐ the panels: a place is describable, and an Idea is not addressable', async () => {
    const perceptible = await inverse(reader, 'perceptible');
    expect(
      perceptible,
      'the Location root is perceptible now — every room, not the ones that remembered',
      // ⭐ Read by CLASS: the inverse answers by class past 40 rows and
      // Perceptible is the widest mixin in the game.
    ).toMatch(/location|room/i);

    // ⚠ The Idea-branch claim, and the owner's own ruling: nothing on
    // that branch is addressed by keyword. `Material` is the one Idea
    // composing Perceptible and it LENDS its keywords to the good made
    // of it — it must be absent from nothing, but the reference
    // singletons must be.
    expect(
      perceptible,
      'a Discipline is addressed by string key, never by keyword',
    ).not.toMatch(/idea\/Discipline/i);
    expect(perceptible, 'nor a QuantityMarshaller').not.toMatch(
      /QuantityMarshaller/i,
    );
  }, 180_000);

  it('⭐ and nothing that is one instance for the whole world carries a stat sheet', async () => {
    // `Propertied` came off seven reference singletons: a prop on `oak`
    // would be a prop on every oak there has ever been.
    const page = await inverse(reader, 'propertied');
    expect(
      page,
      'a BODY carries per-instance state — that is what the mixin is for',
    ).toMatch(/agent\/|Creature|Character|Avatar/i);
    expect(
      page,
      '⚠ a material does NOT — one instance, shared by every holder',
    ).not.toMatch(/idea\/material\/Material|idea\/species\/Species/i);
    expect(page, 'nor a Condition or a LocomotionMode').not.toMatch(
      /idea\/(Condition|LocomotionMode)/i,
    );
  }, 180_000);
});
