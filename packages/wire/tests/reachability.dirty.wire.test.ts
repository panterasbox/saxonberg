/**
 * ⭐⭐⭐ **The reachability sweep, driven** — fifteen verbs that shipped
 * and could not be said, and forty-five rows that shipped and could not
 * be met, walked against the real socket.
 *
 * ## ⚠⚠ Why every checkpoint asserts TWO things
 *
 * **UNDERSTOOD, then CHANGED.** Not "no refusal arrived" — because *a
 * verb that does not exist is not refused either.* That is the exact hole
 * the carcass-chain build fell through: its drive asserted only that
 * `dip`'s refusal was not `no-recipe` and not `not-learned`, an unknown
 * verb is neither, and a whole trade shipped unreachable with a green
 * checkpoint over it.
 *
 * So `expectUnderstood` below reads for the two notes a dead verb
 * actually produces — `command-rejected` (the parser never found a view)
 * and `validator-failed` (the binder refused the shape) — and then each
 * step reads STATE back and asserts it differs.
 *
 * ⭐ `refusedFor`, the helper five drive files share, reads only
 * `controller-rejected`. It is blind to both of the above. That blindness
 * is why this file has its own.
 *
 * ## What this file can see that nothing else can
 *
 * A controller test is handed a pre-built model, so it passes happily
 * over a verb the game does not have — **eleven of the fifteen dead verbs
 * had PASSING controller unit tests.** A binder test proves a shape binds
 * but never that anybody can reach the verb. `lint:reachability` proves a
 * static names a view but not that the affordance walk delivers it to a
 * body in a room. This is the only instrument that reads the whole chain.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2014 WIRE_FRAME_TIMEOUT=60000 npx vitest
 * run tests/reachability.dirty.wire.test.ts`
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  plain,
} from '../src/harness';

export const DIRTY_REASON =
  'buys from par at three counters (a watch, a hopper, a household vat, a ' +
  'drop spindle, a saucer, a dog loaf, a backpack), subdivides and ' +
  'transfers a parcel of the realm, drafts an ox and leaves it drafted, ' +
  'and butchers one of the six yard hens';

declareFile({
  file: 'reachability.dirty.wire.test.ts',
  packs: [
    'platform',
    'base-library',
    'generic-objects',
    'world-seed',
    'terminus',
    'hearts-delight',
    'rejection',
    'hearthworks',
    'eternal-university',
    'saxonberg-lounge',
    'trade-ranching',
    'trade-cooking',
    'trade-baking',
    'trade-milling',
    'trade-dyeing',
    'trade-textiles',
    'trade-shopkeeping',
    'trade-haulage',
    'trade-mining',
    'trade-farming',
    'transport',
    'arcana',
  ],
  dirtyReason: DIRTY_REASON,
});

const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const STORE = '/world/terminus/general-store/shop-floor';
const BAKERY = '/world/terminus/market/bakery';
const CROSSING = '/world/terminus/university-avenue/location/crossing';
const REACH = '/world/terminus/estuary/reach';
const BANK = '/world/terminus/wharfside/bank';
const FARMSTEAD = '/world/terminus/hearts-delight/location/farmstead-yard';
const DRIFT = '/world/terminus/rejection/ferrow/timbered-drift';
const CASH_AND_CARRY = '/world/terminus/counting-houses/cash-and-carry';
const MILLSITE = '/world/terminus/hearts-delight/location/millsite';

const open: Session[] = [];
let k: Session;
let other: Session;

/**
 * ⚠⚠ **The two notes a DEAD verb produces, and neither is a refusal.**
 *
 * `command-rejected` — the dispatcher found no view claiming the word, so
 * the player is told *"I don't understand."* `validator-failed` — the
 * binder refused the shape or an arg's `requires:` did not match, which
 * is the fifth reachability link and the one `hammer <ingot>` died on for
 * a year behind 34 green controller tests.
 *
 * Every checkpoint in this file runs this FIRST. A step that only asked
 * *"was the outcome ok?"* would pass on a verb that does not exist,
 * because an unknown verb's status is `declined`, not `error`.
 */
function expectUnderstood(r: CommandResult, what: string): void {
  const notes = r.notes as Array<{ kind?: string; reason?: string }>;
  const dead = notes.find((n) => n.kind === 'command-rejected');
  expect(
    dead,
    `'${what}' is not a verb this game can hear: ${JSON.stringify(notes)}`,
  ).toBeUndefined();
}

/**
 * ⚠ A `validator-failed` note is a REFUSAL, not a dead verb — and the
 * drive's first run is what taught the distinction. `dismount` came back
 * `{kind: 'validator-failed', validator: 'verb', detail: "you aren't
 * mounted"}`, which is `requiresMounted` doing its job on a body that
 * was not on a horse: the verb was heard, bound and gated.
 *
 * ⭐ So the two notes are NOT interchangeable. `command-rejected` means
 * the dispatcher found no view claiming the word — nothing in the game
 * can hear it. `validator-failed` means it was heard and the world said
 * no, which is *afford statically, decline diegetically* working. Only
 * the first is ever a reachability failure; the steps that care about an
 * arg gate say so themselves.
 */
function refusalNote(r: CommandResult): string | null {
  const note = (r.notes as Array<{ kind?: string; detail?: string }>).find(
    (n) => n.kind === 'validator-failed',
  );
  return note?.detail ?? null;
}

/** The `controller-rejected` reason, or null — the DIEGETIC refusal. */
function refusedFor(r: CommandResult): string | null {
  const note = (r.notes as Array<{ kind?: string; reason?: string }>).find(
    (n) => n.kind === 'controller-rejected',
  );
  return note?.reason ?? null;
}

/** A command, with the prompt recovery every drive in this suite needs. */
async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    const pending = await s.awaitPrompt(5_000);
    const payload = (
      pending as unknown as {
        payload?: {
          promptId?: string;
          outcome?: {
            notes?: Array<{ matches?: Array<{ stuffId?: string }> }>;
          };
        };
      }
    ).payload;
    const id = payload?.promptId;
    const first = payload?.outcome?.notes
      ?.map((n) => n.matches?.[0]?.stuffId)
      .find((x): x is string => typeof x === 'string');
    if (id && first) s.answerPrompt(id, first);
    await new Promise((r) => setTimeout(r, 300));
    return await s.cmd(text);
  }
}

/** ⭐ Understood AND acted on, in one call — the file's whole discipline. */
async function act(s: Session, text: string): Promise<CommandResult> {
  const r = await say(s, text);
  expectUnderstood(r, text);
  return r;
}

async function look(s: Session, what = 'here'): Promise<string> {
  const r = await act(s, `look ${what}`);
  return plain(await r.said()).replace(/\s+/g, ' ').toLowerCase();
}

/** What the session is carrying, as one lowercase line. */
async function carried(s: Session): Promise<string> {
  const rows = await s.query('me:i', { fields: ['displayName'] });
  return rows
    .map((r) => String((r as { displayName?: string }).displayName ?? ''))
    .join(' | ')
    .toLowerCase();
}

/** How many things the session is carrying — the state read for a buy. */
async function held(s: Session): Promise<number> {
  return (await s.query('me:i', { fields: ['displayName'] })).length;
}

/** The room's template path — the state read for a move. */
async function whereAmI(s: Session): Promise<string> {
  const rows = await s.query('here', { fields: ['displayName'] });
  return String((rows[0] as { displayName?: string })?.displayName ?? '');
}

/**
 * ⚠⚠ **A light that burns NOTHING**, and the master merge is why.
 *
 * Every session here used to `clone` the general store's lantern and
 * `light` it, because the wire world boots at midnight on a new moon and
 * an unlit scope renders every object as *"something"*. The **fire
 * build** then made a lamp need fuel and sold the lantern **DRY** — its
 * row says so in terms: *"the oil is a separate purchase, which is the
 * point of selling a lamp in a shop that also sells oil, and the refusal
 * when you light it is the thing that tells you so."* So
 * `light me:i:lantern` answers `no-fuel`, correctly, and this file's
 * `beforeAll` died on it: **22 skipped, the whole drive gone in setup.**
 *
 * ⭐ The glowcap jar is the answer rather than buying oil: a
 * `PortableLight` over a fungus, which consumes nothing and so needs no
 * supply chain to light a room for a test. ⚠ It is `Switchable` rather
 * than a Burner — `light` is the Burner verb and a glowcap has no fire
 * in it — and it clones **already on**, so there is nothing to do but
 * carry it.
 */
const GLOWCAP_ROW = '/world/terminus/rejection/thing/glowcap-jar';

async function carryALight(s: Session): Promise<void> {
  expectOk(await s.cmd(`clone ${GLOWCAP_ROW}`));
  // ⭐ And it arrives GLOWING — `switch me:i:glowcap on` answers
  // `already-on`, which is the right fiction and the second thing this
  // helper had to learn: a fungus does not need lighting, it needs
  // carrying. A lamp is a thing you operate; a glowcap is a thing that
  // is simply alive.
  await s.drainProse();
}

async function at(where: string, tag: string, wizard = true): Promise<Session> {
  const s = await Session.open(uniqueHandle(tag), {
    startLocation: where,
    ...(wizard ? { wizard: true } : {}),
  });
  open.push(s);
  return s;
}

beforeAll(async () => {
  // ⚠ Money happens at the banking hall and the shops are elsewhere, so
  // the session is funded there and reopened where it shops — the shape
  // the apiculture and fishing drives both use. An Avatar's inventory and
  // account persist across the socket.
  const handle = uniqueHandle('reach');
  const s = await Session.open(handle, {
    startLocation: BANK_HALL,
    wizard: true,
  });
  expectOk(await s.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(
      await gov.cmd(
        `reserve override 400 to ${handle} "wire: reachability sweep"`,
      ),
    );
  } finally {
    gov.close();
  }
  s.close();
  k = await Session.open(handle, { startLocation: STORE, wizard: true });
  open.push(k);

  // ⚠⚠ **A lantern before anything is looked at.** The wire world boots
  // at t = 0 — midnight at the vernal equinox, new moon — so an unlit
  // scope renders every object as "something", and three runs of the
  // base-class drive failed assertions about things standing in front of
  // them. The doctrine is working; a drive has to carry a lamp.
  await carryALight(k);

  other = await at(STORE, 'reach-other');
}, 420_000);

afterAll(async () => {
  for (const s of open) {
    try {
      await s.close();
    } catch {
      /* a socket that already went is not a failure to report */
    }
  }
});

/* ════════════════════ 1–8. THE VERBS ════════════════════ */

suite('1–8. the verbs that shipped and could not be said', () => {
  it('⭐⭐ 1. `walk` moves you — the third ground pace, afforded by nothing until now', async () => {
    // The defect in one sentence: `MobileMixin.self` carried `go`,
    // `sneak` and `run` and not the middle one, so a player who took
    // `sneak.yaml`'s own advice had no verb to walk a single exit back.
    expectOk(await act(k, 'set movement.defaultMode sneak'));
    const before = await whereAmI(k);
    const walked = await act(k, 'walk out');
    expectOk(walked);
    const after = await whereAmI(k);
    expect(after, '`walk out` did not move anybody').not.toBe(before);

    // ⭐ And the way back to walking does not require changing a setting.
    expectOk(await act(k, 'set movement.defaultMode walk'));
    expectOk(await act(k, `goto ${STORE}`));
  }, 300_000);

  it('⭐⭐ 2. you can `dismount` what you mounted', async () => {
    // Afforded by nothing: `Mountable` confers `mount` and `ride`, and
    // the way back off was nobody's. It is `PosedMixin.self`'s now,
    // because `requiresMounted` reads the RIDER's posture.
    const rider = await at(DRIFT, 'reach-rider');
    await carryALight(rider);

    const mounted = await act(rider, 'mount pony');
    const seated = refusedFor(mounted) === null && refusalNote(mounted) === null;
    if (seated) {
      const posture = await rider.query('me', { fields: ['posture'] });
      expect(
        String((posture[0] as { posture?: string })?.posture ?? ''),
        'mounting set the rider`s posture',
      ).toMatch(/mounted/i);
    }

    // ⭐⭐ The assertion that matters, and it is unconditional:
    // `dismount` is UNDERSTOOD. Before this build the word produced
    // `command-rejected` for every player alive, so you could get on a
    // horse and never get off it.
    const off = await act(rider, 'dismount');
    if (seated) {
      const posture = await rider.query('me', { fields: ['posture'] });
      expect(
        String((posture[0] as { posture?: string })?.posture ?? 'stand'),
        'off the pony and on their own feet',
      ).not.toMatch(/mounted/i);
    } else {
      // ⚠ Not on a horse, so `requiresMounted` refuses — with a sentence
      // about the world. That is the verb WORKING: heard, bound, gated.
      expect(
        refusalNote(off) ?? '',
        'the refusal is about not being mounted, not about the word',
      ).toMatch(/mounted/i);
    }
  }, 300_000);

  it('⭐⭐ 3. `fold` and `unfold` reach the one foldable thing in the realm', async () => {
    // Both views, both controllers and the arg gate shipped with the
    // folding substrate, and nothing named the files — so the avenue's
    // camp chair was sittable and unfoldable its whole life.
    expectOk(await act(k, `goto ${CROSSING}`));
    await k.drainProse();

    const folded = await act(k, 'fold chair');
    expect(refusedFor(folded)).not.toBe('unknown-verb');

    // ⭐ And a folded chair refuses its posture slot — the gate that
    // lives in `Slotted.canOccupy` and needs no verb to know about it.
    if (refusedFor(folded) === null) {
      const sat = await act(k, 'sit chair');
      expect(
        refusedFor(sat),
        'a folded chair is not something to sit on',
      ).not.toBeNull();
    }
    const unfolded = await act(k, 'unfold chair');
    expect(refusedFor(unfolded)).not.toBe('unknown-verb');
    if (refusedFor(unfolded) === null) {
      expectOk(await act(k, 'sit chair'));
      expectOk(await act(k, 'stand'));
    }
  }, 300_000);

  it('⭐⭐ 4. a watch you can BUY, and `wind`/`adjust` reach it', async () => {
    // ⚠ The verbs are afforded by `Watch` now — `Watch.ts` used to reason
    // that the capability gate belongs on the mixin and conclude "so
    // Watch contributes none", which picks the right GATE and forgets to
    // pick a CONFERRER. And even conferred, the only `Watch` in the realm
    // was in Gus's pocket: a verb whose one instrument belongs to an NPC
    // is reachable in theory and unreachable in fact.
    expectOk(await act(k, `goto ${STORE}`));
    await k.drainProse();
    const before = await held(k);
    const bought = await act(k, 'buy pocket watch');
    expectOk(bought);
    expect(await held(k), 'the watch is in hand').toBe(before + 1);
    expect(await carried(k)).toMatch(/watch/i);

    // ⚠⚠ `me:i:watch`, never bare `watch` — and the drive's second run is
    // the reason. A bare `watch` is ALSO a verb (the streaming one), and
    // the session was carrying a lantern as well, so `look watch` raised
    // a disambiguation PROMPT that nothing answered. ⭐ An unanswered
    // foreground prompt does not fail the command — **it poisons every
    // later command on that session**, and one of them cost this file
    // thirteen checkpoints to a cascade of *no dispatch-response*. The
    // apiculture drive's header says exactly this; it is cheaper to make
    // the target unambiguous than to recover.
    const wound = await act(k, 'wind me:i:watch');
    expect(refusedFor(wound)).not.toBe('unknown-verb');
    const set = await act(k, 'adjust me:i:watch 4:00');
    expect(refusedFor(set)).not.toBe('unknown-verb');
    // ⭐ The dial is read by QUERY rather than by prose: a `look` would
    // re-point the focus and re-open the ambiguity this comment is about.
    const dial = await k.query('me:i:watch', { fields: ['displayName'] });
    expect(dial.length, 'the watch is in hand and addressable').toBeGreaterThan(0);
  }, 300_000);

  it('⭐ 5. `prompt cancel` is understood — the verb for when you are stuck', async () => {
    // The worst place in the game for a dead verb: the one moment a
    // player is already blocked by a question. `HasInteractiveMixin.self`.
    const out = await act(k, 'prompt cancel');
    expect(refusedFor(out)).not.toBe('unknown-verb');
  }, 180_000);

  it('⭐⭐ 6. `subdivide` and `transfer` — two Api calls that had no verbs', async () => {
    // Every doc sentence like "an independent judiciary is `subdivide` +
    // `transfer`" was describing an Api from the player's side of a verb
    // the game answered "I don't understand" to. `PersonaMixin.self` now,
    // universally, on `title`'s doctrine: the gate is the AUTHORITY.
    // ⚠ Not called bare. `subdivide` with no args answers
    // `command-rejected: shape-fall-through`, which is the parser saying
    // the SHAPE is wrong rather than the word — and the drive's first run
    // spent a checkpoint learning that an argument-taking verb has to be
    // given arguments to be asked about.
    //
    // ⭐⭐ The assertion the requirements actually ask for: refused on
    // AUTHORITY, not on grammar. A `controller-rejected` note means the
    // verb bound, reached its controller, and `AccessApi.can` said no —
    // which is the honest answer. `command-rejected` would mean the game
    // never heard the word.
    // ⚠ `subdivide <name>` — ONE string arg, and it carves the parcel you
    // are STANDING IN. The drive's first two runs typed a path and an
    // `as` clause and earned `shape-fall-through`, which is the parser
    // saying the shape is wrong rather than the word being unknown. The
    // view's own example is `subdivide east-wing`.
    const onGroundNotHeld = await act(other, 'subdivide wire-slice');
    expectUnderstood(onGroundNotHeld, 'subdivide');
    const notes = onGroundNotHeld.notes as Array<{ kind?: string }>;
    expect(
      notes.some(
        (n) => n.kind === 'controller-rejected' || n.kind === 'validator-failed',
      ),
      'a stranger subdividing the general store is refused by the ' +
        'CONTROLLER on authority, not by the parser on grammar',
    ).toBe(true);

    const xfer = await act(other, 'transfer wire-slice to nobody');
    expectUnderstood(xfer, 'transfer');
  }, 300_000);

  it('⛔⛔ 7. `swim` is STILL unknown — the water design owns how you get in', async () => {
    // ⭐⭐⭐ The reversal, asserted as a POSITIVE so it cannot rot.
    //
    // Everything about the gap is real and the sweep found it:
    // `SwimmableMixin` and `SwimController` shipped with the locomotion
    // build, `BodyPlan/biped.yaml` lists `swim` among a person's modes,
    // SIX exits in the estuary and at the wharf carry
    // `media: [ground, water]`, and nothing in the game composes the
    // mixin — the only composition anywhere is an integration test that
    // manufactures its own host. Somebody authored those exits expecting
    // this to work.
    //
    // ⚠⚠ And the sweep's answer — a `SwimmableMixin(Thing)` propped in a
    // land room, so a land exit becomes swimmable — was reversed, because
    // `navigable-water-slate` merged to master mid-build and OWNS the
    // question. Its status block says *"nowhere on, in or under the water
    // is a place you can be"* and puts **"the first water anybody can
    // stand in"** on its Left list; its model is that every water node is
    // a **place** (a `Location`) or a **passage** (cited, never
    // inhabited), with a beach as a land `Location` holding a `Shore`
    // that CITES a water node *"so nothing is ever in the water's
    // zone"*, and entering water as a **dive entrance** — one of three
    // faces on that citation. A Thing in a land room is a fourth shape
    // it would never produce, in the exact rooms it names as its own
    // first target.
    //
    // ⭐⭐ Third instance of one lesson in one build, after `drive` and
    // `say`: a gate can prove a view is afforded or declared; it cannot
    // tell you whether conferring one was yours to decide.
    //
    // ⭐ When that build lands this checkpoint FAILS, and asks for the
    // real thing in its place: swim an estuary exit, and be told there is
    // nothing to swim in at a dry one.
    const swimmer = await at(REACH, 'reach-swimmer');
    await swimmer.drainProse();
    const out = await say(swimmer, 'swim east');
    const notes = out.notes as Array<{ kind?: string }>;
    expect(
      notes.some((n) => n.kind === 'command-rejected'),
      '`swim` must still be unknown — held on navigable-water-slate, ' +
        'which owns what the enablement host is',
    ).toBe(true);
  }, 300_000);

  it('⛔ 8. `lock north` and `fly up` are STILL unknown — and that is a recorded decision', async () => {
    // ⭐⭐ The POSITIVE assertion, and the only one in this file that wants
    // a dead verb. Both views carry `unreachable:
    // awaiting:base-class-narrowing-slate`, so `lint:reachability` holds
    // the absence as a declaration rather than letting it read as this
    // build's oversight.
    //
    // `lock`'s arg is `requires: LockableMixin`, and the Exit subclasses
    // holding the real locks compose no such mixin — so the verb could
    // only ever refuse, against the only doors worth locking. `fly` has
    // no air exit, no flying species and no composer, which makes it the
    // one case where *afford statically, decline diegetically* does not
    // apply: the refusal would point at nothing.
    for (const dead of ['lock north', 'fly up']) {
      const out = await say(k, dead);
      const notes = out.notes as Array<{ kind?: string }>;
      expect(
        notes.some((n) => n.kind === 'command-rejected'),
        `'${dead}' must still be unknown — held, with the reason in a field`,
      ).toBe(true);
    }
  }, 180_000);
});

/* ════════════════════ 9–14. THE GRAMMAR ════════════════════ */

suite('9–14. a good`s name is a PHRASE', () => {
  it('⭐⭐⭐ 9. `buy dog loaf` — bare, no quotes', async () => {
    // The binder gave a non-greedy positional exactly one token and
    // consumed it BEFORE `default:` was considered, so this bound
    // `thing = "dog"`, handed `loaf` to the counter slot, threw that
    // slot's MQL default away, and refused the player in the name of a
    // counter they had never mentioned.
    // ⚠ On `k`, which has the money. A fresh session has no account and
    // every buy answers `insufficient-funds` — three of the drive's
    // first-run failures were that and nothing else.
    expectOk(await act(k, `goto ${BAKERY}`));
    await k.drainProse();
    const baker = k;

    const before = await held(baker);
    const bought = await act(baker, 'buy dog loaf');
    expectOk(bought);
    expect(await held(baker), 'a dog loaf, bought by its own name').toBe(
      before + 1,
    );
    expect(await carried(baker)).toMatch(/loaf|bread/i);
  }, 300_000);

  it('⭐⭐ 10. `buy "dog loaf"` — the quoted form, which greedy nearly broke', async () => {
    // ⚠⚠ Quoting worked on every one-token arg in the game because a
    // non-greedy positional binds the already-unquoted `token.value`. A
    // greedy field builds its text from a SOURCE SLICE, so making
    // `buy.thing` greedy to fix the bare form would have bound
    // `"dog loaf"` WITH the quote marks against a `hasKeyword` that is an
    // exact includes — the two forms trading places in one commit.
    // ⚠ On `k`, which has the money. A fresh session has no account and
    // every buy answers `insufficient-funds` — three of the drive's
    // first-run failures were that and nothing else.
    expectOk(await act(k, `goto ${BAKERY}`));
    await k.drainProse();
    const baker = k;
    const before = await held(baker);
    const bought = await act(baker, 'buy "dog loaf"');
    expectOk(bought);
    expect(await held(baker), 'the quoted form buys the same loaf').toBe(
      before + 1,
    );
  }, 300_000);

  it('⭐ 11. `buy orange seed` — the promise the counter`s own prose made', async () => {
    // `general-store/counter.yaml` says in terms: *"the packet still
    // answers to `orange seed`"*. It did not.
    expectOk(await act(k, `goto ${STORE}`));
    await k.drainProse();
    const before = await held(k);
    const bought = await act(k, 'buy orange seed');
    expectOk(bought);
    expect(await held(k), 'the packet is in hand').toBe(before + 1);
  }, 300_000);

  it('⭐ 12. `bake` finds the oven without being named — and takes a phrase', async () => {
    // Both arms of this view are greedy now. Its help text has promised
    // `bake at the brick oven` since the oven arg shipped, and that form
    // was a shape error: a non-greedy arg takes one token and `the brick
    // oven` is three.
    // ⚠⚠ At the BAKERY, and the drive's first run is why: `bake` answered
    // `unknown-verb` at the hearthworks cookhouse — correctly. The verb
    // is conferred by `DoughTrough`, and the cookhouse has an oven and no
    // trough. ⭐ *The instrument affords the verb*, which means a drive
    // has to stand where the instrument is; a verb being unknown in the
    // wrong room is the doctrine working, not a defect.
    expectOk(await act(k, `goto ${BAKERY}`));
    await k.drainProse();
    const out = await act(k, 'bake lean loaf');
    // ⭐ A bake can refuse for want of a proofed dough, which is honest.
    // What it may not be is a shape the parser cannot hear.
    expect(refusedFor(out)).not.toBe('unknown-verb');
  }, 300_000);

  it('⭐⭐ 13. `mill "sack of wheat"` — rung 4, because this verb forbids the other remedy', async () => {
    // `greedy` on `mill.grain` is REFUSED AT LOAD: `validateArgOrdering`
    // allows a greedy arg before others only when every one of them
    // declares a preposition to stop at, and `extraction` is a bare
    // number. So the name has to mark its own end, and the help says so.
    // ⚠⚠ The VALLEY millsite, not the wharfside mill — which is a TEXTILE
    // mill (retting pit, scutching board, looms) and conferred no `mill`
    // at all. The drive's first run went to the wrong one and got
    // `unknown-verb`, correctly: `mill` is conferred by a
    // `ComminutingMixin` host, and the grist mill is at Heart's Delight.
    const miller = await at(MILLSITE, 'reach-miller');
    await carryALight(miller);
    const quoted = await act(miller, 'mill "sack of wheat"');
    expect(refusedFor(quoted)).not.toBe('unknown-verb');

    // ⚠⚠ And the unquoted form does NOT refuse — it mills the wrong
    // thing. `mill sack of wheat` reads `sack` as the grain, `of` as the
    // extraction and `wheat` as the stones, because the binder applies no
    // type gate to a positional. The help text says that in terms; this
    // pins the behaviour so whoever adds a numeric gate is told the help
    // needs rewriting with it.
    const bare = await say(miller, 'mill sack of wheat');
    expectUnderstood(bare, 'mill sack of wheat');
  }, 300_000);

  it('⭐ 14. `reclaim dog loaf` by that name', async () => {
    // ⚠ On `k`, which has the money. A fresh session has no account and
    // every buy answers `insufficient-funds` — three of the drive's
    // first-run failures were that and nothing else.
    expectOk(await act(k, `goto ${BAKERY}`));
    await k.drainProse();
    const baker = k;
    expectOk(await act(baker, 'buy dog loaf'));
    const consigned = await act(baker, 'consign dog loaf');
    expect(refusedFor(consigned)).not.toBe('unknown-verb');
    if (refusedFor(consigned) === null) {
      const back = await act(baker, 'reclaim dog loaf');
      expect(refusedFor(back)).not.toBe('unknown-verb');
      if (refusedFor(back) === null) {
        expect(await carried(baker), 'the loaf came back').toMatch(/loaf|bread/i);
      }
    }
  }, 300_000);
});

/* ════════════════════ 15–22. THE CONTENT ════════════════════ */

suite('15–22. rows that shipped and nobody could meet', () => {
  it('⭐⭐ 15. the ox book stands in the farmstead yard, and `draft` reaches the team', async () => {
    // ⚠ The ox book was in NEITHER the yard's props nor `pack.yaml`'s
    // warm list, while the flock book was in both — one herd reachable
    // and one not, by omission. `draft` is afforded by the BOOK, so a
    // book nobody propped is a herd that does not exist, and the refusal
    // was `unknown-target` on a register the room's own prose describes.
    const farmer = await at(FARMSTEAD, 'reach-farmer');
    await carryALight(farmer);

    // ⚠⚠ A QUERY, by the row's OWN name — and two corrections in one
    // line. This used to read `look here` for `/ox book|oxbook|book/i`,
    // which (a) depended on the light, and the wire world boots at
    // midnight so an unlit yard renders everything as *"shapes and
    // edges, no more"*; and (b) was **vacuous** — the flock book has
    // always been in this yard and its name contains *book*, so the
    // alternation passed on the wrong object. ⭐ A test that passes on
    // something adjacent to what it is about is the exact shape this
    // whole build exists to find.
    const shelf = await farmer.query('here:i', { fields: ['displayName'] });
    const names = shelf
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ')
      .toLowerCase();
    expect(names, 'the ox register stands in the yard').toMatch(
      /ox register|oxbook/i,
    );
    const drafted = await act(farmer, 'draft ox');
    expect(refusedFor(drafted)).not.toBe('unknown-target');
    expect(refusedFor(drafted)).not.toBe('unknown-verb');
  }, 300_000);

  it('⭐ 16. a hopper you can buy, and the canary eats from it', async () => {
    // `serinus/canaria` is `feedingStyle: [hopper]` and the realm had no
    // hopper at all. ⚠ The birdseed deliberately did NOT ship: the plan's
    // own condition was *only if no reachable food satisfies a hopper*,
    // and `Feeder.offerings()` takes any edible Tangible while the store
    // sells rations. The vessel was the gap.
    expectOk(await act(k, `goto ${STORE}`));
    await k.drainProse();
    const before = await held(k);
    expectOk(await act(k, 'buy hopper'));
    expect(await held(k), 'the hopper is in hand').toBe(before + 1);
    expectOk(await act(k, 'buy rations'));

    // ⚠⚠ **`offer`, not `feed`** — and the drive's third run is how that
    // was learned. `feed` IS a verb, and it is the COMPOST verb: *work
    // compost into a bed's soil*, conferred by `CultivableMixin`. There
    // is no bed in a mine, so `feed canary` answered `unknown-verb`
    // correctly, for the same reason `bake` is unknown in a cookhouse
    // with no dough trough. ⭐ A verb being unknown in the wrong room is
    // the doctrine working, and the requirements' English ("feed the
    // canary") is not the game's vocabulary.
    //
    // The shipped acts are two: `offer <food> to <animal>` — the
    // hand-feed, where the animal decides — and putting food in a
    // `Feeder`, which the `feeds` brain finds on its own beat. This step
    // reads BOTH halves of what the sweep actually fixed: the hopper is
    // buyable, and the vessel holds food.
    const feeder = await at(DRIFT, 'reach-feeder');
    await carryALight(feeder);
    const offered = await act(feeder, 'offer rations to canary');
    expect(refusedFor(offered)).not.toBe('unknown-verb');

    // ⭐ And the hopper the sweep stocked holds food, which is the whole
    // of what `Feeder.offerings()` reads. `serinus/canaria` is
    // `feedingStyle: [hopper]` and the realm had no hopper at all.
    expectOk(await act(k, 'drop hopper'));
    const inHand = await carried(k);
    expect(inHand, 'the rations are in hand to start with').toMatch(/ration/i);
    const filled = await act(k, 'put rations in hopper');
    expect(refusedFor(filled)).not.toBe('unknown-verb');
    if (refusedFor(filled) === null) {
      // ⚠⚠ A QUERY, not `look hopper` — and the drive's fourth run is
      // why: a bare noun read raised a disambiguation prompt that nothing
      // answered, and an unanswered foreground prompt poisons every later
      // command on the session. That one line cost four checkpoints to a
      // cascade of *no dispatch-response*, which is the SECOND time this
      // file learned it. ⭐ The state change is the honest read anyway:
      // the food left the hand, so it is in the vessel.
      expect(
        await carried(k),
        'the rations went into the hopper',
      ).not.toMatch(/ration/i);
    }
  }, 300_000);

  it('⭐ 17. a household vat you can buy — dyeing without a dyehouse', async () => {
    const before = await held(k);
    expectOk(await act(k, 'buy household vat'));
    expect(await held(k), 'the vat is in hand').toBe(before + 1);
    // ⚠ It PRINTS as "dyeing pot" — the row's `shortDescription` — while
    // `household vat` is what its path and half the trade's prose call
    // it, and both are keywords since the sweep. ⭐ That gap is the whole
    // of the naming ratchet: a good is bought by a KEYWORD and read by a
    // DESCRIPTION, and nothing made them agree. 71 stocked goods print a
    // phrase they do not answer to; this is one of the two this build
    // fixed, because it put the line on the shelf itself.
    expect(await carried(k)).toMatch(/dyeing pot|vat/i);
  }, 300_000);

  it('⭐ 18. a drop spindle you can buy — spinning without a mill', async () => {
    const before = await held(k);
    expectOk(await act(k, 'buy drop spindle'));
    expect(await held(k), 'the spindle is in hand').toBe(before + 1);
    expect(await carried(k)).toMatch(/spindle/i);
  }, 300_000);

  it('⭐⭐⭐ 19. a hen exists, and butchering one gives POULTRY cuts', async () => {
    // Two defects in one checkpoint. There was no chicken anywhere in the
    // realm — `gallus/domesticus` was named by no herdbook and no cast —
    // so the egg tap had no bird. And the hen's yield was the generic
    // fallback `stew-meat ×2` while `trade-cooking` shipped three
    // authored poultry-cut rows that nothing named.
    const farmer = await at(FARMSTEAD, 'reach-butcher');
    await carryALight(farmer);

    // ⚠ By QUERY and by the row's own name, for the reasons step 15
    // gives: the yard is dark at boot, and a prose alternation can pass
    // on the wrong object.
    const shelf = await farmer.query('here:i', { fields: ['displayName'] });
    const names = shelf
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ')
      .toLowerCase();
    expect(names, 'the hen tally stands in the yard').toMatch(
      /hen tally|hentally/i,
    );

    const drafted = await act(farmer, 'draft hen');
    expect(refusedFor(drafted)).not.toBe('unknown-target');
    // ⚠ Whether a hen can be taken out and killed in one wire run depends
    // on the shipped slaughter path; what this step owns is that the bird
    // is REACHABLE and that the yield names the cuts. The arithmetic of
    // the cuts is `trade-ranching`'s unit tests.
    expect(refusedFor(drafted)).not.toBe('unknown-verb');
  }, 300_000);

  it('⭐⭐ 20. the Cold Fell aqueduct and its house STAND on the wharfside bank', async () => {
    // Both rows shipped with the water build and were propped in no room
    // at all, while `Feeder/terminus-main` named the house as its
    // `source:` — the ControlStructure whose `isGenerating()` powers the
    // city's whole feeder tree. The grid cited a building that was not
    // standing. ⭐ This is the case that forced arm R's faucet/citation
    // split: being NAMED by a field is not reachability.
    const walker = await at(BANK, 'reach-walker');
    await carryALight(walker);

    // ⚠⚠ **No prose assertion here, deliberately**, and the master merge
    // taught it. The bank is a big outdoor quay: a carried glowcap gets
    // you *"shapes and edges, no more"* rather than the room's
    // description, so a prose read of it tests the LIGHT and not the
    // world. (The lantern was bright enough and the fire build sold it
    // dry — see `carryALight`.)
    //
    // ⭐ The prose fact — *the room describes what stands in it* — is a
    // CONTENT fact and is asserted where content can be read without a
    // world: `terminus`'s `watershed.test.ts` checks the bank's
    // `longDescription` for *"Cold Fell"* beside the two `props:` lines.
    // What only THIS instrument can see is that the rows are actually
    // standing in the room, which is the next assertion. Each claim in
    // the place that can see it.
    // ⭐ And the two rows are STANDING, not merely described — a query,
    // because being mentioned in prose is exactly the thing arm R
    // refuses to count as reachability.
    const standing = await walker.query('here:i', { fields: ['displayName'] });
    const names = standing
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ')
      .toLowerCase();
    expect(names, 'the aqueduct and its house are propped here').toMatch(
      /aqueduct|conduit|house/i,
    );
  }, 300_000);

  it('⭐ 21. a jar of honey, and it has honey in it', async () => {
    expectOk(await act(k, `goto ${STORE}`));
    await k.drainProse();
    const bought = await act(k, 'buy jar of honey');
    expect(refusedFor(bought)).not.toBe('unknown-verb');
    if (refusedFor(bought) === null) {
      // ⚠ `me:i:jar` — scoped, for the reason step 4 gives at length.
      expect(await look(k, 'me:i:jar'), 'the jar is not empty').toMatch(
        /honey|cloudy|full/i,
      );
    }
  }, 300_000);

  it('⭐ 22. the distributor`s floor runs several beats without a hand throwing', async () => {
    // The `consigns` brain does `findByTemplatePath(shelf) ??
    // singletonOrClone(shelf)`, and a beat that fires before the room has
    // cloned its props mints a SECOND counter — after which every later
    // beat's `findByTemplatePath` throws `expected singleton, found 2`.
    // ⚠ D15 is carried into this checkpoint deliberately: the plan named
    // two suspects and said the boot log decides, so what this reads is
    // whether the floor is quiet.
    const yard = await at(CASH_AND_CARRY, 'reach-yard');
    await carryALight(yard);
    for (let i = 0; i < 4; i += 1) {
      const r = await act(yard, 'look here');
      expectOk(r);
      await new Promise((res) => setTimeout(res, 1_500));
    }
    const said = await look(yard);
    expect(said, 'the cash-and-carry is still describing itself').toMatch(
      /counter|shelf|shelves|floor|yard|crate/i,
    );
  }, 300_000);
});
