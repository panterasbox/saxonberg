/**
 * `weaves` brain (`/trade/textiles/behavior/weaves`) — the mill floor
 * works, through the literal verbs.
 *
 * The `farms` shape applied to a manufactory. Each beat, at the mill:
 * take a bale of retted flax off the input shelf, `scutch` it into line (and
 * tow, and shive — the byproducts are objects, not vapour), `spin` the
 * line into yarn, `weave` the yarn into a bolt, and `put` the bolt in
 * the mill's stock, where the weaver's `consigns` beat already finds it
 * and carries it to the general store's counter.
 *
 * ⭐ **Nothing here is unavailable to a player.** Every act is a forced
 * literal verb on the floor's own shipped tools — `get`, `scutch`,
 * `spin`, `weave`, `put` — resolved and gated exactly as a typed line
 * is. There is no NPC-only path, no `StuffApi.clone` of a finished
 * bolt, and no faucet at the OUTPUT end: cloth exists in this world
 * only because somebody, player or hand, worked fibre into it.
 *
 * ⭐⭐ **The stage ladder is where the bottleneck lives, and it is not
 * flattened here.** One `scutch` yields a couple of units of line; a
 * `spin` draws two of those into yarn; a `weave` sets four units of
 * yarn on the loom. So a beat that scutches freely still crawls at the
 * wheel, which is the whole finding the mill bench prints — spinning is
 * the maximum attended step by a margin, and it took the jenny to flip
 * it. The brain does not paper over that with a "make one bolt" step;
 * it runs the real acts and gets the real ratio.
 *
 * ⚠ Each stage is bounded twice — by `batch`, and by a NO-PROGRESS
 * guard that stops the stage the moment an act stops changing anything.
 * A verb can decline for a dozen honest reasons (nothing to work, not
 * enough on hand, a tool missing), and a brain that retried on decline
 * would grind the beat against a refusal forever.
 *
 * ⚠⚠ Retting is deliberately NOT a stage. It is the one act in the
 * chain whose craft is judgement — ready at a fortnight, ruined four
 * days later — so the pit on this floor stays a player's tool and the
 * mill buys its flax already retted (see `flax-bale`). An NPC that
 * never misjudges a pit would quietly retire the only decision
 * preparation has.
 *
 * config: `{ floor: string, stock: string, stages?: string[],
 * batch?: number }` — `floor` the mill room (template path), `stock`
 * the mill's own OUTPUT `Stock` the finished bolts go into (template
 * path; the INPUT shelf is reached by its `bales` keyword on the same
 * floor), `stages` which acts this hand performs (default all three),
 * `batch` acts per stage per beat (default 4).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type {
  BrainContext,
  BrainStatics,
} from '@saxonberg/server/mud/lib/behavior/brain';

const BALE = '/trade/textiles/thing/flax-bale';
const LINE = '/trade/textiles/thing/line';
const YARN = '/trade/textiles/thing/yarn';
const BOLT = '/trade/textiles/thing/bolt';

const DEFAULT_BATCH = 4;
/**
 * The units each act wants, mirroring the controllers' own charges
 * (`SpinController.CHARGE`, `WeaveController.CHARGE`). Read here only to
 * decide WHETHER to issue the act; the controller remains the authority
 * on what it then consumes, and a dial change makes this conservative
 * rather than wrong.
 */
const SPIN_CHARGE = 2;
const WEAVE_CHARGE = 4;
const ALL_STAGES = ['scutch', 'spin', 'weave'] as const;

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

/** Everything the hand is carrying that came from `path`. */
function carried(hand: Hand, path: string): Stuff[] {
  return (hand.getContents() as Stuff[]).filter(
    (c) => c.getTemplatePath() === path,
  );
}

/**
 * How much of `path` the hand holds — the SUMMED quantity for a stack,
 * the count otherwise. Line and yarn are `Globbable`, so two acts leave
 * one object with a bigger number rather than two objects, and a
 * progress guard that counted objects would call a working spin a
 * failure.
 */
function held(hand: Hand, path: string): number {
  let total = 0;
  for (const item of carried(hand, path)) {
    total += MixinApi.isGlobbable(item) ? item.getQuantity() : 1;
  }
  return total;
}

/** Is there still fibre in this bale to work? */
function baleHasFibre(bale: Stuff): boolean {
  if (!MixinApi.isBulkable(bale)) return false;
  return bale.getBulkAmount('interior').rawValue() > 0;
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

export const brain = class {
  static label = 'weaves';
  // The floor runs unwatched — a mill that only worked when somebody was
  // standing in it would put no cloth in the shops.
  static presenceGated = false;
  // A functional poller (makes goods), not ambient chatter — exempt from
  // the global ambient-cadence dial.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isContainable(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    const hand = host as Hand;

    const floorPath = ctx.config.floor;
    const stockPath = ctx.config.stock;
    if (typeof floorPath !== 'string' || typeof stockPath !== 'string') return;

    // The floor is the AUTHORED room, never "wherever the hand is now" —
    // the `farms` rule: a hand restored mid-beat at the shop counter has
    // to walk back to its own floor before it can work.
    const floor = StuffApi.findByTemplatePath(floorPath);
    if (!floor || !MixinApi.isContainer(floor)) return;
    if (hand.getContainer() !== floor) hand.teleport(floor as Stuff & Container);

    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);
    const configured = Array.isArray(ctx.config.stages)
      ? (ctx.config.stages as unknown[]).filter(
          (s): s is string => typeof s === 'string',
        )
      : [...ALL_STAGES];
    const stages = new Set(configured);

    /*
     * ⚠⚠ ONE ACT PER BEAT, and the reason is the activity framework
     * rather than taste. Scutching, spinning and weaving are
     * ENGAGEMENTS — they occupy the actor for real game-time — so a
     * beat that fired four in a row got
     * `controller-rejected:engagement-conflict(busy)` for its trouble
     * and the batch was fiction. A hand that is mid-act is left alone,
     * and the next beat picks up where this one stopped. A player
     * cannot scutch four times at once either.
     *
     * ⚠⚠ The guard names the `hands` SLOT — the one `ManualBuildController`
     * claims — and not "has any engagement at all". A hand on shift can
     * be holding other slots for perfectly ordinary reasons, and a
     * blanket check reads those as busy and stands the floor down
     * forever. Driven live with the blanket version and the mill never
     * moved: no error, no decline, just a spinner who never span.
     */
    if (MixinApi.isEngaged(hand) && hand.hasEngagement('hands')) return;

    /*
     * ⭐ Do the act that is KNOWN to be possible, furthest along the
     * ladder first — the loom before the wheel before the knife, so
     * finished work clears rather than piling up half-made.
     *
     * ⚠ Issuing an act whose input is absent is not merely wasteful: it
     * MIS-RESOLVES. `spin line` with no line in hand resolved the BALE
     * ("a bale of retted flax doesn't come in stacks") because the
     * resolver found the nearest thing that answered, and a brain that
     * names a target it does not hold is a brain making that mistake
     * every beat.
     */
    const bale = carried(hand, BALE)[0] ?? null;
    if (stages.has('weave') && held(hand, YARN) >= WEAVE_CHARGE) {
      await hand.forceCommand('weave yarn');
    } else if (stages.has('spin') && held(hand, LINE) >= SPIN_CHARGE) {
      /*
       * ⚠⚠ `strick`, not `line` — and the reason is worth the word.
       * The resolver matches SHORT DESCRIPTIONS as well as keywords, and
       * `line` is a prefix of `linen`: a spinner holding both line and
       * "a skein of linen yarn" answered `spin line` with the YARN, which
       * is not spinnable, and the floor deadlocked at
       * `controller-rejected:not-spinnable` forever — no error, no
       * progress, just a mill that stopped. Removing `linen` from the
       * yarn's KEYWORDS was not enough; the description still says it.
       *
       * A strick is what a hank of scutched line is actually called, it
       * is unique in this chain, and a beat should name its target by
       * the word nothing else answers to.
       */
      await hand.forceCommand('spin strick');
    } else if (stages.has('scutch') && bale !== null && baleHasFibre(bale)) {
      await hand.forceCommand('scutch bale');
    } else if (stages.has('scutch') && bale === null) {
      // ⚠ `from bales` names the INPUT shelf. A bare `get bale` is the
      // greedy-get hazard `consigns` documents, and this floor has two
      // shelves on it — the one this fills and the one it draws from.
      await hand.forceCommand('get bale from bales');
    } else if (bale !== null && !baleHasFibre(bale)) {
      // A worked-out bale is litter on a working floor; put the cord
      // back on the pile and take a fresh one next beat.
      await hand.forceCommand('put bale in bales');
    }

    // Shelve anything finished. `put` is not an engagement, so this runs
    // in the same beat as the act that produced it. ⚠ The stock is where
    // `consigns` looks: a bolt left in the hand is a bolt no customer
    // will ever see.
    const stock = StuffApi.findByTemplatePath(stockPath);
    if (stock && MixinApi.isContainer(stock)) {
      for (let i = 0; i < batch; i++) {
        const before = carried(hand, BOLT).length;
        if (before === 0) break;
        await hand.forceCommand('put bolt in stock');
        if (carried(hand, BOLT).length >= before) break;
      }
    }
  }
} satisfies BrainStatics;
