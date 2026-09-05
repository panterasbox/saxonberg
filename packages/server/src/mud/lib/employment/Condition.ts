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
 */
export const CONDITION_TEMPLATES = ["delivery", "supply"] as const;

export type ConditionTemplate = (typeof CONDITION_TEMPLATES)[number];

/** The item a delivery condition binds — a specific instance or a kind. */
export type ConditionItemRef =
  | { kind: "template"; path: string }
  | { kind: "chattel"; chattelId: string };

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
    } else {
      return "item must be template- or chattel-bound";
    }
    if (!d.destinationPath) return "condition needs a destinationPath";
    if (d.template === "supply") {
      const n = d.count;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
        return "a supply condition needs a whole count of at least 1";
      }
      // ⚠ A supply gig is kind-bound by construction: "ten of THIS one"
      // is not a thing anybody can mean, and a chattel id names exactly
      // one object.
      if (item.kind !== "template") {
        return "a supply condition counts a KIND, not one marked item";
      }
    }
    return null;
  }

  /** How many the condition asks for — 1 unless it is a counted supply. */
  public static countOf(data: ConditionData): number {
    return data.template === "supply" ? Math.max(1, data.count ?? 1) : 1;
  }

  /**
   * Whether a live `stuff` is the item this condition names. Refuses a
   * `Globbable` outright — a merging stack has no stable identity (the
   * chattel precedent), so a fungible good can never satisfy a gig.
   */
  public static matchesItem(data: ConditionData, stuff: Stuff): boolean {
    if (MixinApi.isGlobbable(stuff)) return false;
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
