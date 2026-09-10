/**
 * Condition — the engine-verifiable predicate at the heart of a work
 * clause. The hard rule of the contract boundary lives here: a gig may
 * only be escrowed if its condition is a member of the **closed template
 * vocabulary** ({@link CONDITION_TEMPLATES}) — fuzzier intents are
 * rejected from the system-backed path (the anti-grief boundary: no
 * free-form MQL in a hostile mouth), and the vocabulary is the extension
 * seam later builds widen (cull, escort, restock — each a new `holdsFor`
 * predicate, never a new engine seam).
 *
 * v1 ships **delivery**: *item X rests in/on destination Y*. The item may
 * be bound to a specific instance (`chattel` — deliver *this* crate, keyed
 * on the durable `_chattelId`) or to a kind (`template` — any clone of the
 * template). Verification is **on demand at turn-in** (`fulfill` /
 * `complete`), viewer-blind, against modeled state at that moment — the
 * engine-as-observer doctrine: the player petitions, the state decides.
 *
 * **Strict possession**: delivered means *out of your hands*. The upward
 * containment walk refuses any Creature-tier ancestor (an item resting in
 * a courier's inventory is not delivered), and additionally accepts a
 * `restingOn` match (a `placeOn` onto a counter puts the item in the
 * *room* with a `restingOn` pointer — without this leg, "deliver to the
 * bar counter" could never hold).
 *
 * A pure static value-class (no instances) — the `Grade`/`Coinage` shape.
 */

import { MixinApi } from "../../api/mixin";
import { CategoryMeasure } from "./CategoryMeasure";
import { PAR_UNITS, type ParUnit } from "./ParLine";
import { Creature } from "../creature/Creature";
import type { Stuff } from "../stuff/Stuff";

/**
 * The closed, engine-verifiable condition-template vocabulary.
 *
 * | | what must be true at turn-in |
 * |---|---|
 * | `delivery` | **this** thing (or one of this kind) is at the destination |
 * | `supply` | **`count` of this kind** are at the destination |
 *
 * ⭐⭐ `supply` is the quantity contract, and it is why *"go mine ten
 * iron ore"* needs no extraction template. Requiring that YOU mined it
 * would mean provenance on every lump — expensive to verify, and bad
 * economics besides: it would forbid filling a supply contract by
 * BUYING, which is a legitimate way to fill one and the thing that makes
 * a spot market liquid. **How you sourced it is your business.** Mining,
 * salvage, purchase and hoarding all collapse into one predicate the
 * engine can simply count.
 *
 * ⚠ Every member must be checkable by the engine at turn-in with no
 * human adjudicating, because escrow holds real money. That is the wall
 * fuzzier intents ("guard my shop", "be nice to Mara") sit behind, and
 * it is the reason this list is closed rather than authored.
 *
 * ## ⭐⭐ `watch` — and it took kernel code, which is the finding
 *
 * *"Guard my shop"* was the canonical example of what sits BEHIND the
 * wall, and the consequence build asked whether it could be expressed on
 * the shipped board. It could not, and stating that loudly was the
 * requirement: a third template plus a phrase, a `watchedSec` accrual on
 * the record, an engagement and a verb — four kernel touches.
 *
 * ⭐ What makes it checkable is **giving up on intent entirely**. The
 * engine cannot verify that you *protected* anything: whether a theft was
 * deterred is counterfactual, and whether you were "attentive" is not a
 * modelled fact. What it CAN verify is that you were **present, for N
 * hours, with your hands free** — and that turns out to be what a guard
 * actually sells. Somebody standing in the door is the product; the
 * absence of trouble is the hoped-for consequence, not the deliverable.
 *
 * ⚠ Which means a guard who watched the full term and was robbed blind
 * still gets paid. That is correct, and it is the same reason a delivery
 * pays on arrival rather than on the client being pleased.
 */
export const CONDITION_TEMPLATES = ["delivery", "supply", "watch"] as const;

export type ConditionTemplate = (typeof CONDITION_TEMPLATES)[number];

/**
 * What a condition binds.
 *
 * | | means |
 * |---|---|
 * | `chattel` | **that** object — the one you pointed at, marked as somebody's |
 * | `template` | anything cloned from that row |
 * | ⭐ `category` | **what the business actually wants** — six litres of gin, in whatever you like |
 *
 * ⚠⚠ The third exists because the first two are opinions about
 * PACKAGING. A `supply` gig bound to a template path means "eight of
 * that exact row", so a player who brings one demijohn holding six
 * litres has done the job in every sense the bar cares about and the
 * engine counts zero. A business is denominated in category and unit;
 * saying so directly is what lets somebody solve the problem their own
 * way.
 */
export type ConditionItemRef =
  | { kind: "template"; path: string }
  | { kind: "chattel"; chattelId: string }
  | { kind: "category"; category: string; unit: ParUnit };

/** The serializable condition payload a Contract carries. */
export interface ConditionData {
  template: ConditionTemplate;
  /** What must be delivered — instance-bound (chattel) or kind-bound. */
  item: ConditionItemRef;
  /** The destination's durable `templatePath` (a Container/Surfaced). */
  destinationPath: string;
  /**
   * `supply` only: how many must arrive. Absent (or 1) for `delivery`,
   * which is the one-of-something case.
   */
  count?: number;
  /**
   * ⭐ `watch` only: how many game-hours of presence the term is. The
   * clause holds when the claimant has accrued at least this much watch
   * on the contract's own record.
   */
  gameHours?: number;
}

/** How deep the upward ancestor walk goes (a chest inside a room is 2). */
const MAX_WALK_DEPTH = 12;

export class Condition {
  /**
   * The "engine-verifiable or rejected" boundary: shape + template
   * membership. Returns a reason string for a refusal, null when valid.
   */
  public static validate(data: unknown): string | null {
    const d = data as Partial<ConditionData> | null;
    if (!d || typeof d !== "object") return "condition must be an object";
    if (!CONDITION_TEMPLATES.includes(d.template as ConditionTemplate)) {
      return `unknown condition template '${String(d.template)}' — ` +
        `engine-verifiable templates: ${CONDITION_TEMPLATES.join(", ")}`;
    }
    const item = d.item as ConditionItemRef | undefined;
    if (!item || typeof item !== "object") return "condition needs an item";
    if (item.kind === "template") {
      if (!item.path) return "a template-bound item needs a path";
    } else if (item.kind === "chattel") {
      if (!item.chattelId) return "a chattel-bound item needs its id";
    } else if (item.kind === "category") {
      if (!item.category) return "a category-bound item needs a category";
      if (!PAR_UNITS.includes(item.unit)) {
        return `a category needs a unit — one of ${PAR_UNITS.join(", ")}`;
      }
    } else {
      return "item must be template-, chattel- or category-bound";
    }
    if (!d.destinationPath) return "condition needs a destinationPath";
    if (d.template === "watch") {
      const h = d.gameHours;
      if (typeof h !== "number" || !Number.isFinite(h) || h <= 0) {
        return "a watch condition needs an hour count greater than zero";
      }
    }
    if (d.template === "supply") {
      const n = d.count;
      // ⚠ Whole things are counted in wholes; litres and kilos are not.
      // "Six litres" is a perfectly good order and 6.5 is too.
      const wholeOnly =
        item.kind !== "category" || item.unit === "count";
      if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
        return "a supply condition needs a quantity greater than zero";
      }
      if (wholeOnly && !Number.isInteger(n)) {
        return "a supply condition counts whole things in whole numbers";
      }
      // ⚠ A supply gig never binds ONE marked object: "ten of THIS one"
      // is not a thing anybody can mean.
      if (item.kind === "chattel") {
        return "a supply condition counts a KIND, not one marked item";
      }
    }
    return null;
  }

  /**
   * How much `item` contributes toward this condition — 1 for a named
   * object, and its measured quantity for a category.
   */
  public static contributionOf(data: ConditionData, item: Stuff): number {
    if (data.item.kind !== "category") return 1;
    return CategoryMeasure.contribution(
      item,
      data.item.category,
      data.item.unit,
    );
  }

  /**
   * ⭐⭐ Whether a `watch` clause holds — the accrued watch against the
   * term.
   *
   * ⚠ Deliberately NOT a `holdsFor(data, item)`: there is no item. That
   * asymmetry is the whole shape of the finding — the shipped clause
   * vocabulary is *"a thing is at a place"*, and a guard contract is
   * *"a person was at a place, for a while"*, which the existing
   * predicate cannot express however it is squeezed.
   */
  public static watchHolds(data: ConditionData, watchedSec: number): boolean {
    if (data.template !== "watch") return false;
    return watchedSec >= Math.max(0, data.gameHours ?? 0) * 3600;
  }

  /** How many the condition asks for — 1 unless it is a counted supply. */
  public static countOf(data: ConditionData): number {
    return data.template === "supply" ? Math.max(1, data.count ?? 1) : 1;
  }

  /**
   * Whether a live `stuff` is the item this condition names. Refuses a
   * `Stackable` outright — a merging stack has no stable identity (the
   * chattel precedent), so a fungible good can never satisfy a gig.
   */
  public static matchesItem(data: ConditionData, stuff: Stuff): boolean {
    if (data.item.kind === "category") {
      // ⚠ A stack is allowed HERE and nowhere else: a category condition
      // measures QUANTITY, so a stack of six limes is six limes and has
      // no identity problem to solve. The identity rule that refuses
      // stacks is about naming ONE object, which this never does.
      return CategoryMeasure.counts(stuff, data.item.category);
    }
    if (MixinApi.isStackable(stuff)) return false;
    if (data.item.kind === "chattel") {
      return (
        MixinApi.isChattel(stuff) &&
        stuff.getChattelId() === data.item.chattelId
      );
    }
    return stuff.getTemplatePath() === data.item.path;
  }

  /**
   * The authoritative check, run at turn-in: does the condition hold for
   * this live `item` **now**? Walks the containment chain upward comparing
   * each ancestor's `templatePath` to the destination (bounded — "inside a
   * chest inside Dave's bar" delivers), refusing if any ancestor is a
   * {@link Creature} (strict possession: still-carried is not delivered),
   * and additionally accepts a direct `restingOn` surface match.
   * Viewer-blind by construction — engine code, no perception gate.
   */
  public static holdsFor(data: ConditionData, item: Stuff): boolean {
    if (!Condition.matchesItem(data, item)) return false;
    if (!MixinApi.isContainable(item)) return false;

    // The surface leg: resting on the destination fixture itself.
    const restingOn = item.getRestingOn();
    if (restingOn?.getTemplatePath() === data.destinationPath) return true;

    // The upward ancestor walk.
    let node: Stuff | null = item.getContainer();
    for (let depth = 0; node && depth < MAX_WALK_DEPTH; depth++) {
      if (node instanceof Creature) return false; // still in someone's hands
      if (node.getTemplatePath() === data.destinationPath) return true;
      node = MixinApi.isContainable(node) ? node.getContainer() : null;
    }
    return false;
  }
}
