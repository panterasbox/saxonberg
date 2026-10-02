/**
 * `keeps` brain (`/lib/behavior/keeps`) — ⭐⭐⭐ **keeping the round.**
 *
 * Milk's answer, and the taps build's relief. A dairy cow wants taking
 * twice a game day and a game day is two real hours, so the honest
 * design problem is not a mechanic at all: it is that **attendance is
 * the whole of what milk costs**, and a player cannot be awake for it.
 * The feedback law says there is nothing to decide at the act — a take
 * always empties her — so the thing that needed building was not a
 * finer judgment but a way to keep the round when you are not there.
 *
 * ## ⭐⭐ It PRESERVES; it never EARNS
 *
 * The bound, and the reason the design is defensible rather than
 * idle-game drift:
 *
 *  - a round is a **literal command line** the player typed, re-issued
 *    through `forceCommand` — exactly the verb, exactly the target;
 *  - the yield lands in the body's own hands or vessel, where a manual
 *    take would have put it;
 *  - ⛔ **nothing here touches money, a counter, a shelf or a ledger.**
 *    It cannot sell, consign, price or bank. The verb refuses any line
 *    whose view does not declare `standing: true`, and only the TAKES
 *    declare it.
 *
 * So an absent player keeps what they had — a cow in milk, a hen laying
 * — and gains nothing they were not already standing next to. ⚠ The
 * distinction is the one that matters: *preserve* is a remedy for a
 * clock the game chose, *earn* would be the game playing itself.
 *
 * ## ⚠ It stays where you left it
 *
 * Each round resolves its target among the host's **peers in the room
 * the host is standing in** — no path-finding, no teleport. The
 * instruction is *stay here and keep this round*, and a round whose
 * target is not here **lapses silently**, which is the honest cost of
 * logging off in the wrong place rather than a rule anybody has to
 * learn. (Walking to a byre is the `homes` brain's path-finding pointed
 * at a target, and is deferred.)
 *
 * ## The bound
 *
 * One take per round per beat, and a cap on rounds. A beat that found
 * every tap full still issues a handful of commands, never a flood.
 *
 * `presenceGated = false` — the entire point is that it runs while
 * nobody is watching. `ambient = false` — it is a functional poller,
 * so the ambient-chatter pacing dial must not stretch its interval.
 *
 * config: `{ rounds: Array<{ line: string; target: string }> }` —
 * `line` the literal command text, `target` the keyword the line names
 * (held separately so the beat can check the thing is still here
 * without re-parsing the line).
 */

import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import type { BrainContext } from './brain';

/** Rounds kept per beat. A bound, like every loop in a brain. */
const ROUNDS_CAP = 8;

/**
 * ⭐ How full an `expire` tap must be before the round bothers.
 *
 * Half a window's worth: a cow milked out by the brain the instant she
 * has a cupful would be *the game milking her for you*, and the round
 * is meant to stand in for the keeper who comes when there is something
 * to come for.
 */
const EXPIRE_WORTH_TAKING = 0.5;

interface Round {
  line: string;
  target: string;
}

export const brain = class {
  static label = 'keeps';
  /** ⭐ The whole point: it runs while nobody is watching. */
  static presenceGated = false;
  /** A functional poller, not ambient chatter — keep the interval exact. */
  static ambient = false;
  /** It occupies the hands, because the act it issues does. */
  static claims = ['hands'];

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    if (!MixinApi.isContainable(host)) return;
    const here = host.getContainer();
    if (here === null || !MixinApi.isContainer(here)) return;

    const rounds = readRounds(ctx.config.rounds).slice(0, ROUNDS_CAP);
    if (rounds.length === 0) return;

    // What is standing in this room, by keyword. ⚠ One level out only:
    // the round is *stay here*, so a cow in the next field is not this
    // beat's business.
    const present = here.getContents() as Stuff[];

    for (const round of rounds) {
      const subject = present.find((s) => answersTo(s, round.target));
      // ⚠ Lapses SILENTLY. A player who logged off in the wrong place
      // has paid the honest cost of that; a complaint every ten minutes
      // into an empty room would be noise nobody reads.
      if (!subject) continue;
      if (!worthTaking(subject)) continue;
      // ⭐ The literal line the player typed, through the ordinary
      // dispatch. Every gate the manual act has still applies: the
      // window, the vessel, the engagement, the endurance check.
      await host.forceCommand(round.line);
    }
  }
} satisfies {
  label: string;
  presenceGated: boolean;
  ambient: boolean;
  claims: string[];
  act(ctx: BrainContext): Promise<void>;
};

/** The config's rounds, defensively — a bad entry is skipped, not fatal. */
function readRounds(raw: unknown): Round[] {
  if (!Array.isArray(raw)) return [];
  const out: Round[] = [];
  for (const entry of raw) {
    const e = entry as { line?: unknown; target?: unknown };
    if (typeof e?.line !== 'string' || typeof e?.target !== 'string') continue;
    if (e.line.trim() === '' || e.target.trim() === '') continue;
    out.push({ line: e.line, target: e.target });
  }
  return out;
}

/** Does `thing` answer to `keyword`? The perception surface's own test. */
function answersTo(thing: Stuff, keyword: string): boolean {
  if (!MixinApi.isPerceptible(thing)) return false;
  const want = keyword.toLowerCase();
  return thing.getKeywords().some((k) => k.toLowerCase() === want);
}

/**
 * ⭐⭐ Is there enough standing to be worth an act?
 *
 * By SHAPE, which is the same rule the take itself uses:
 *
 *  - an `expire` tap (milk) wants half a window's worth — see
 *    {@link EXPIRE_WORTH_TAKING};
 *  - a `count` tap (eggs) wants at least one whole egg, because a
 *    fraction mints nothing;
 *  - anything else (a `continuous` fleece, honey) is worth taking
 *    whenever there is any of it, which is what the manual act does.
 *
 * ⚠ A non-producer answers TRUE: a round may legitimately name
 * something that is not a tap at all, and it is the VERB's job to
 * refuse that, not this brain's. Guessing here is how a brain starts
 * re-implementing the verbs it is supposed to be issuing.
 */
function worthTaking(subject: Stuff): boolean {
  if (!MixinApi.isProducing(subject)) return true;
  const taps = subject.taps();
  if (taps.length === 0) return true;
  for (const tap of taps) {
    const standing = subject.standingIn(tap.key);
    if (standing <= 0) continue;
    if (tap.behaviour === 'expire') {
      const ceiling = tap.perGameDay * tap.windowDays;
      if (ceiling > 0 && standing / ceiling >= EXPIRE_WORTH_TAKING) return true;
      continue;
    }
    if ((tap.yieldShape ?? 'mass') === 'count') {
      if (standing >= 1) return true;
      continue;
    }
    return true;
  }
  return false;
}
