/**
 * The lock reconciliation — ⭐⭐ **the drive**, and what it proves is that
 * four verbs a player types now reach something.
 *
 * ## What opened the cycle
 *
 * `lock`, `unlock` and the vehicular `drive` shipped as command views
 * afforded by **nothing**, so all three answered *"I don't understand"*
 * for the whole life of the game. The reachability sweep found them,
 * and — correctly — held them rather than wiring them, because each
 * hold was on a real problem:
 *
 *     lock / unlock   the mixin they targeted was a BOLT WITH NO KEY,
 *                     so conferring them would have let any player
 *                     alive lock a university's gate
 *     drive           a live collision with `trade-mining`'s view, same
 *                     arity, and conferring one side of an undiagnosed
 *                     collision IS adjudicating it
 *
 * Both are resolved now — the lock by composing the keyway with the
 * bolt (`lib/boundary/Lockable.ts`), the collision by working the ladder
 * (`command-spec.md § When both are bodily acts`) — so this file drives
 * the result.
 *
 * ## ⚠⚠ What a socket CANNOT settle here, and where it lives instead
 *
 * **The key-holder arm.** The payoff of the reconciliation is that a
 * key-holder walks through a locked door without unlocking it, and that
 * `unlock` then lets in somebody holding no key at all. Proving that
 * live needs a session that actually HOLDS a key, and there is no cheap
 * way to one:
 *
 *   - the realm's keyed doors are the dorm and holding family, and
 *     `avatar-family.dirty.wire.test.ts` measured why a drive cannot
 *     shortcut to them: a `startLocation` stands the ROOM up but not its
 *     `props:`, and the key arrives with provisioning (Katie), which is
 *     the residence flow;
 *   - a key is minted only by `Lock.issueKeyTo`, which no verb exposes —
 *     `title buy` reaches it, and that is a funded economic flow of its
 *     own;
 *   - the one door a newcomer can walk to is the university gate, and
 *     it is authored with NO keyway on purpose: *shut, chained, and
 *     locked — the gown's, not the town's.*
 *
 * So the key-holder arm is pinned by unit tests instead, and by name:
 * `lib/boundary/__tests__/Lockable.test.ts § Exit.canTraverse — the
 * keyway, not just the bolt` drives all eight cases over the real
 * `Exit.canTraverse` — a fitting key, a wrong keyway, a wrong
 * technology, a master key, an empty keyway, and ⭐ *once unlocked, a
 * stranger with no key walks through.*
 *
 * ⭐ What this file CAN settle, and does, is the half that fails closed
 * and silent: **the verbs are understood, and the refusal is diegetic.**
 * That is precisely the thing no controller test can see, and precisely
 * the thing that was broken.
 *
 * ⭐ **Clean, not dirty** (the `pets.wire.test.ts` precedent): every act
 * here is a read or a refusal. Nothing is bought, minted or consumed, so
 * the world after a run is the world before it. The one act that would
 * change state — throwing a bolt — requires the key this file has
 * established it cannot get.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  describe as describeResult,
  type CommandResult,
} from '../src/harness';

declareFile({
  file: 'lock-reconciliation.wire.test.ts',
  packs: [
    'saxonberg-lounge',
    'terminus',
    'eternal-university',
    'world-seed',
    'trade-mining',
    'rejection',
    'trade-cooking',
    'generic-objects',
    'ground',
  ],
});

/** University Avenue — its `north` exit carries the one gate a newcomer
 *  can walk to, and that gate is locked with no key in the world. */
const CROSSING = '/world/terminus/university-avenue/location/crossing';

const open: Session[] = [];

async function at(where: string | undefined, tag: string): Promise<Session> {
  const s = await Session.open(
    uniqueHandle(`lockrec-${tag}`),
    where ? { startLocation: where } : {},
  );
  open.push(s);
  return s;
}

/**
 * ⭐⭐⭐ **The reachability predicate, and it must key on the REASON.**
 *
 * `command-rejected` covers two different answers and they are not
 * interchangeable: `unknown-verb` means nothing in the game claims the
 * word — the failure this whole build exists to close — while
 * `shape-fall-through` means the verb WAS found and the arguments did
 * not fit it, which is the parser being helpful. Keying on the note
 * KIND makes a shape error read as a dead verb, which cost the
 * reachability sweep a whole run to learn.
 */
function expectUnderstood(r: CommandResult, what: string): void {
  const dead = (r.notes ?? []).find(
    (n) =>
      n.kind === 'command-rejected' &&
      (n as { reason?: string }).reason === 'unknown-verb',
  );
  expect(
    dead,
    `'${what}' is not a verb this game can hear: ${describeResult(r)}`,
  ).toBeUndefined();
}

/** Every note, verbatim — the diagnostic a bare kind name withholds. */
function notesOf(r: CommandResult): string {
  return JSON.stringify(r.notes ?? [], null, 1);
}

/** The `reason` of the first rejection note, or null if there is none. */
function reasonOf(r: CommandResult): string | null {
  for (const n of r.notes ?? []) {
    const reason = (n as { reason?: string }).reason;
    if (
      reason &&
      (n.kind === 'command-rejected' ||
        n.kind === 'controller-rejected' ||
        n.kind === 'validator-failed')
    ) {
      return reason;
    }
  }
  return null;
}

let newcomer: Session;
let avenue: Session;

beforeAll(async () => {
  // ⭐ No `startLocation` — a brand-new character in the room everybody
  // actually opens their eyes in. `lock`/`unlock`/`drive` are conferred
  // by mixins on the BODY and on the environment, so if the affordance
  // does not reach a newcomer it does not reach anybody.
  newcomer = await at(undefined, 'new');
  avenue = await at(CROSSING, 'avenue');
  await newcomer.drainProse();
  await avenue.drainProse();
}, 300_000);

afterAll(async () => {
  for (const s of open) await s.close();
});

/* ──────────────── 1–3. the verbs exist at all ──────────────── */

suite('1–3. three verbs that could not be said', () => {
  it('⭐⭐⭐ 1. `lock` is a word this game knows', async () => {
    // Bare, with no target: the honest answer is *lock what?* — a
    // controller asking for a target, which is a verb that EXISTS.
    // Before this build the answer was `unknown-verb`.
    const r = await newcomer.cmd('lock');
    expectUnderstood(r, 'lock');
    expect(
      reasonOf(r),
      'bare `lock` should ask for a target, not die at dispatch',
    ).not.toBe('unknown-verb');
  }, 120_000);

  it('⭐⭐⭐ 2. `unlock` is a word this game knows', async () => {
    const r = await newcomer.cmd('unlock');
    expectUnderstood(r, 'unlock');
  }, 120_000);

  it('⭐⭐ 3. the `drive`/`drift` collision is gone — one claimant each', async () => {
    // ⚠⚠ **This checkpoint does NOT drive the words from here, and the
    // reason is a real finding rather than a dodge.** `DrivableMixin`
    // confers `drive` on `environment` + `peers` — a vehicle you are
    // aboard is your CONTAINER — and `MountableMixin` confers `mount`
    // the same way. A **peers-bucket affordance only exists while its
    // target does**, so in a room with no vehicle and no horse, `drive`
    // and `mount` are correctly `unknown-verb`.
    //
    // ⭐ That is *afford statically, decline diegetically* meeting its
    // own boundary: the doctrine is about not deleting a verb whose
    // target you might meet, not about every word being sayable in an
    // empty room. The first run of this file asserted both words from
    // the lounge and failed on both — **my checkpoints were in the
    // wrong room, not the affordances in the wrong bucket.**
    //
    // So the reachability half is proven by `lint:reachability` (both
    // views conferred, arm A a zero invariant) and the ADJUDICATION
    // half — one claimant per word — by `trade-mining`'s own tripwire
    // test, which is the instrument that caught the sweep conferring
    // this unilaterally in the first place. ⚠ `mount horse` live is
    // `base-class-narrowing.dirty.wire.test.ts`'s, which already drives
    // it against a real draft animal.
    //
    // What IS driveable from here: that neither word has become a
    // *parse* failure. An unaffordable verb declines; a malformed view
    // would answer `shape-fall-through` or break the chain.
    for (const word of ['drive north', 'drift north']) {
      const r = await newcomer.cmd(word);
      expect(
        r.status,
        `'${word}' should decline, not error: ${notesOf(r)}`,
      ).not.toBe('error');
    }
  }, 120_000);
});

/* ──────────── 4–6. the gate, and the refusal that is the point ──────────── */

suite('4–6. the one locked door a newcomer can walk to', () => {
  it('4. the gate is there, and it refuses passage', async () => {
    const r = await avenue.cmd('go north');
    expect(r.status, `the gate should refuse: ${describeResult(r)}`).not.toBe(
      'ok',
    );
    const said = plain(await r.said()).toLowerCase();
    expect(said, 'and it refuses as LOCKED, not as closed').toMatch(/lock/);
  }, 120_000);

  it('⭐⭐⭐ 5. `unlock north` answers about the KEY, not about the parser', async () => {
    // ⭐ This is the whole build in one checkpoint. Before it, the
    // answer was *"I don't understand 'unlock'"* — a verb that shipped,
    // with a controller and passing unit tests, that no player could
    // say. After it, the answer names what you are missing.
    //
    // ⚠⚠ And had the verb been conferred over the OLD mixin, the answer
    // would have been *"You unlock the university gate."* — for every
    // player alive, with no key, no credential and no title consulted.
    // So `no-key` is not a weak pass; it is the authority existing.
    const r = await avenue.cmd('unlock north');
    expectUnderstood(r, 'unlock north');
    const reason = reasonOf(r);
    expect(
      reason,
      `expected the key refusal, got ${describeResult(r)}\n${notesOf(r)}`,
    ).toBe('no-key');
    const said = plain(await r.said()).toLowerCase();
    expect(said, 'the sentence names a key').toMatch(/key/);
  }, 120_000);

  it('⭐⭐ 6. `lock north` is refused the same way — the key is asked FIRST', async () => {
    // ⚠ Ordering matters and is asserted here. The gate is already
    // locked, so a controller that checked state before authority would
    // answer `already-locked` and leak that anybody may operate it. The
    // key question comes first, so a stranger learns only that they have
    // no key.
    const r = await avenue.cmd('lock north');
    expectUnderstood(r, 'lock north');
    expect(
      reasonOf(r),
      `the key is asked before the bolt is read\n${notesOf(r)}`,
    ).toBe('no-key');
  }, 120_000);

  it('⭐⭐⭐ `open north` works — a defect that predates this build by years', async () => {
    // ⛔⛔ **This is the drive's real find.** Targeting a boundary verb
    // by DIRECTION threw inside MQL — `Converting circular structure to
    // JSON` — because the resolver and `consensusVia` both compared a
    // match's `via` by serializing it, and a direction's `via` holds a
    // live `Exit` whose `Boundary.anchorA` points back at it.
    //
    // ⚠ So `open north` and `close north` have been broken for as long
    // as they have existed, each promised in its own help text, and
    // nothing could see it: `OpenController`'s test names the door by
    // KEYWORD, and the verbs this build conferred are the first to
    // resolve a direction through a `requires:` mixin gate at all.
    // `lock`/`unlock` merely made it reachable.
    //
    // ⭐ The gate is locked and keyless, so the honest answer is a
    // refusal — what matters is that it is a refusal ABOUT THE DOOR and
    // not an `mql-error` about the query.
    const r = await avenue.cmd('open north');
    expectUnderstood(r, 'open north');
    const bad = (r.notes ?? []).find((n) => n.kind === 'mql-error');
    expect(
      bad,
      `the query itself must resolve: ${notesOf(r)}`,
    ).toBeUndefined();
  }, 120_000);

  it('⭐ the gate resolves by NAME too, not only by direction', async () => {
    // ⭐⭐ `MqlLogic.effectiveTarget` walks the named object, then the
    // exit's door, then — new in this build — the exit ITSELF, which the
    // keyed-door family needed because it carries its lock with no
    // `Door` Thing at all. Both resolution shapes must land on the same
    // refusal.
    const r = await avenue.cmd('unlock gate');
    expectUnderstood(r, 'unlock gate');
    expect(reasonOf(r)).toBe('no-key');
  }, 120_000);
});

/* ──────────── 7–8. the aliases that were taken away ──────────── */

suite('7–9. the adjudications, read the way a player meets them', () => {
  /**
   * ⭐⭐⭐ `help <verb>` is the right instrument here, and
   * `check-verb-collisions.ts`'s own header is why: the shipped
   * collision it was written for presented as
   *
   *     help watch  →  "WATCH: Stand a guard's post"
   *
   * when the player wanted the livestream verb. **`help` resolves a
   * word to ONE view**, so it is exactly the surface a collision
   * corrupts — and therefore the surface that proves one is gone.
   *
   * ⚠ This replaces a first draft that typed `hang`, `dry`, `mount` and
   * `drive` from the lounge and failed on all four. ⭐ **That was my
   * error and it is worth recording**, because it is a fact about this
   * whole verb family: those four are conferred by their TARGETS — a
   * sconce in your hands, a rack in the room, a horse, a cart — on the
   * `inventory`/`environment`/`peers` buckets. A target-conferred verb
   * is correctly `unknown-verb` in an empty room, so typing it there
   * measures nothing. Only `lock`/`unlock` are body-conferred
   * (`MobileMixin.self`), which is why steps 1–6 can drive them bare.
   */
  async function helpFor(word: string): Promise<string> {
    const r = await newcomer.cmd(`help ${word}`);
    expectUnderstood(r, `help ${word}`);
    return plain(await r.said()).toLowerCase();
  }

  it('⭐⭐ 7. `help drive` is the VEHICLE, and `help drift` is the mine', async () => {
    const drive = await helpFor('drive');
    expect(drive, '`drive` must describe a vehicle').toMatch(
      /vehicle|cart|coach|aboard|ride/,
    );
    expect(
      drive,
      '…and must NOT have resolved to the mining act',
      ).not.toMatch(/heading|drift|working/);

    const drift = await helpFor('drift');
    expect(drift, '`drift` must still reach the mining act').toMatch(
      /heading|working|ground|timber|shore/,
    );
  }, 120_000);

  it('⭐ 8. `help mount` is mounting, and `help hang` is the wall', async () => {
    const mount = await helpFor('mount');
    expect(mount, '`mount` must describe climbing aboard').toMatch(
      /ride|rider|aboard|horse|mount/,
    );
    // ⚠ The alias that was removed: `mount` must no longer answer about
    // putting a sconce on a wall.
    expect(mount, '…and not about hanging a fixture').not.toMatch(
      /sconce|wall fixture|fixes it to the room/,
    );

    const hang = await helpFor('hang');
    expect(hang, '`hang` keeps the wall-fixture meaning').toMatch(
      /wall|sconce|sign|fixture/,
    );

    const dry = await helpFor('dry');
    expect(dry, '`dry` keeps the drying act').toMatch(/dry|air|rack/);
  }, 120_000);

  it('⭐ 9. `help me` is the identity card, not the settings surface', async () => {
    // `me` was an alias on BOTH `author/player.yaml` and
    // `social/score.yaml`. It stays with `score`, because "me" reads as
    // *show me* rather than *configure me* — and `player` is
    // subcommanded, which would have made `me set name …` the shape of
    // a bodily-sounding word.
    const me = await helpFor('me');
    expect(me, '`me` must resolve to the identity card').toMatch(
      /identity|standing|renown|species|score/,
    );
    const player = await helpFor('player');
    expect(player, '`player` keeps its own settings surface').toMatch(
      /pronoun|name|settings|character/,
    );
  }, 120_000);

  it('⭐ 10. `score` and `me` both render a card', async () => {
    for (const word of ['score', 'me', 'player']) {
      expectUnderstood(await newcomer.cmd(word), word);
    }
    const mine = plain(await (await newcomer.cmd('me')).said());
    expect(
      mine.length,
      '`me` should render an identity card, not nothing',
    ).toBeGreaterThan(20);
  }, 120_000);
});
