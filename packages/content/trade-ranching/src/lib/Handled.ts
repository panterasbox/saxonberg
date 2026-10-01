/**
 * HandledMixin — the **affordance half** of handling: an animal you can
 * put your hands on offers `handle`.
 *
 * The kernel owns the mechanism (`lib/husbandry/Handling` — the
 * quiet-to-wild band, the risk curve, the decay toward a floor) and it
 * cannot own the verb, because `handle` is `trade-ranching`'s and a
 * kernel mixin must not name a pack's command view. So the affordance
 * attaches on this side of the boundary, and this mixin is that and
 * nothing else.
 *
 * ⭐ **This is what a sheepdog and a milk cow actually share.** Not taps,
 * not a herd record, and not being something you butcher — but both are
 * animals whose temper is a fact you find out by putting your hands on
 * them, which is the whole of the act.
 *
 * ⚠ It does NOT compose `HandlingMixin` itself, deliberately. Nesting a
 * mixin factory inside another factory collapses TypeScript's inference
 * through the chain — this build already lost a day to that once — so
 * the two are composed side by side at the call site and this one stays
 * a pure carrier.
 *
 * ⭐⭐ **And it owns the BODY of the act now, not just the verb**
 * (apiculture D12). `handle` used to be a controller that knew what a
 * head of stock is: it printed a flesh score out of a hundred, slammed
 * you into a rail, and read a mammal's spine and ribs. A colony of bees
 * is handled too — you put your hands on a hive and find out its temper
 * — and none of those three sentences is true of it.
 *
 * So the act moved onto the animal as {@link Handled.workedOver}, whose
 * DEFAULT is the livestock body verbatim, and the controller shrank to
 * machinery. The alternative was a
 * `typeof target.colonyReading === 'function'` branch in the controller,
 * which is the guard that tells you the host is wrong — and
 * `lint:verb-collisions` refuses a second `handle` view, correctly, so
 * there was never a second-verb way out.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import { Mml } from '@saxonberg/server/mud/api/mml';

export const HANDLED_MIXIN = 'HandledMixin';

/** One composed line — what `Mml.compose` hands back. */
type Line = ReturnType<typeof Mml.compose>;

/**
 * What working an animal produced: the two halves of the scene, how hard
 * it was, and (optionally) which Discipline it exercised.
 *
 * `prelude` is the beat that happens BEFORE the handling — the rail-slam
 * of a badly handled beast, the stings out of a hive. It is a separate
 * send because it is a separate event: it happens whether or not the rest
 * of the act goes well, and it reads wrong folded into the same
 * paragraph.
 */
export interface HandleReport {
  self: Line;
  peers: Line;
  prelude?: { self: Line; peers: Line };
  difficulty: 'trivial' | 'standard' | 'hard';
  /** Absent → the controller credits stockmanship. */
  discipline?: string;
}

/** The surface `workedOver`'s default needs, duck-typed as the
 * controller duck-typed it: `HandledMixin` deliberately composes no
 * `HandlingMixin` (see the header), so the fields are read off the host
 * at the call rather than promised by the type. */
interface HandledHost {
  getHandling(): number;
  handlingRisk(): number;
  handlingPhrase(): string;
  handle(sessions: number): number;
  getMass(): { rawValue(): number };
  getReserve(key: string): { current: { rawValue(): number } } | undefined;
}

/**
 * Risk above which working an animal actually hurts you.
 *
 * ⚠ It sits well up the scale on purpose: a `wary` animal — which is
 * most farm stock most of the time — never hurts anybody, and the
 * ordinary act stays ordinary. What gets you is the one nobody has
 * worked with.
 */
const HURT_THRESHOLD = 0.45;

export function HandledMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class HandledMixin extends Base {
    /**
     * ⚠⚠ **Load-bearing, and its absence failed silently.** Affordances
     * are collected off the class's OWN static plus every registered
     * mixin in the chain (`MixinApi.queryMixins`), and a mixin is only
     * registered if it carries this marker. Without it the contribution
     * was still inherited — so `WorkingAnimal`, which declares no static
     * of its own, offered `handle` and looked fine — while `Livestock`,
     * which does declare one, SHADOWED it and silently lost the verb.
     * One of the two hosts working is exactly how this hides.
     */
    static _mixinName = HANDLED_MIXIN;

    static commandContributions: CommandContributions = {
      self: [],
      peers: ['trade/ranching/cmd/ranching/handle.yaml'],
      environment: [],
    };

    /**
     * ⭐⭐ **What putting your hands on this animal tells you** — the
     * body of `handle`, on the animal rather than in the controller.
     *
     * The default IS the head-of-stock act, moved here verbatim and
     * behaving identically:
     *
     *  1. **You work the animal**, which raises its handling — earned by
     *     contact, lost by neglect, with a diminishing return so the
     *     first session is cheap and the twentieth is not.
     *  2. **You get a precise body-condition score**, because real body
     *     condition scoring *is* palpation of spine and ribs. By eye you
     *     get a band; with your hands you get a number.
     *
     * ⭐ That the two are one act is the whole point: the person who
     * handles their stock is the person who knows what condition they
     * are in, and neither is bought separately.
     *
     * ⚠ **And it is where the risk is.** A flighty animal is dangerous
     * to work, which is why quiet stock handling exists in the real
     * world. The hazard fires BEFORE the handling improves, because the
     * animal you are about to work is the animal you have.
     *
     * An override answers for a different KIND of animal — a colony of
     * bees has no spine to run a hand down and no number to give you —
     * and returning a report rather than sending a scene is what lets it
     * do so without re-implementing the credit or the topic.
     */
    public workedOver(actor: Stuff): HandleReport {
      const host = this as unknown as HandledHost;
      const before = host.getHandling();
      const flesh = host.getReserve('flesh');

      // ⭐⭐ **A badly handled animal is a HAZARD, not an
      // inconvenience.** Quiet stock handling exists in the real world
      // because flighty animals injure people: crushing against a gate,
      // kicks, trampling in a race. Cattle are the most dangerous thing
      // on a farm.
      //
      // ⚠ The risk is the SQUARE of the complement of tractability, so
      // it is near zero across the whole quiet end and climbs steeply at
      // the wild end — which is how handling injuries actually
      // distribute, and why this is a reason to handle stock properly
      // rather than a tax on doing so.
      let prelude: HandleReport['prelude'];
      const risk = host.handlingRisk();
      if (risk > HURT_THRESHOLD) {
        const mass = host.getMass().rawValue();
        ConditionApi.inflict(actor, {
          mechanism: 'blunt',
          site: 'body.torso',
          // ⭐ The energy is the ANIMAL's: a hen cannot hurt you and a
          // cow can break your ribs against a gate, and the difference
          // is mass rather than a table.
          energy: mass * risk * 0.6,
        });
        prelude = {
          self: Mml.compose`It swings hard into you before you have a hand on it and you go into the rail.`,
          peers: Mml.compose`One of the animals slams ${Mml.actor(actor)} into the rail and is away across the yard.`,
        };
      }

      host.handle(1);

      // ⭐ The precise score — the thing you paid an act for. Everything
      // else about this animal is a band.
      const score = flesh
        ? `${Math.round(flesh.current.rawValue())} out of 100`
        : 'nothing you can feel through the coat';

      return {
        prelude,
        self:
          before < 0.25
            ? Mml.compose`You get a hand on it, barely, and it is away again before you have finished. What you did feel: ${score}. ${host.handlingPhrase()}.`
            : Mml.compose`You run a hand down the spine and over the ribs and hips. ${score}. ${host.handlingPhrase()}.`,
        peers: Mml.compose`${Mml.actor(actor)} works quietly around one of the animals, hands on it.`,
        // ⚠ Difficulty is the ANIMAL's, read at the moment of the act: a
        // wild one is a hard check and a quiet one is trivial, so the
        // estimator's own anti-grind property does the work.
        difficulty:
          before < 0.25 ? 'hard' : before < 0.6 ? 'standard' : 'trivial',
      };
    }
  };
}
