/**
 * MakerMixin — a minimal role marker: "this agent can fulfill an order."
 *
 * The served path's `order` verb routes to a *present maker able to fulfill*
 * (the bartender). With crafting location-agnostic and no venue/staff roster,
 * the fulfilling maker is identified by an **agent property** — this marker —
 * not a place flag: `CraftingLogic` resolves the present `isMaker()` agent in
 * the patron's location. The maker is thus always an agent property, never a
 * value off the wire.
 *
 * Deliberately tiny — no behavior, no state. It is **not** used to gate
 * `serve`/`mix` (those are general agent verbs; maker = the giver); it is
 * only the order-fulfiller signal. Composed onto a maker NPC — see
 * `lib/character/Crafter.ts`.
 */

import type { MixinConstructor } from '../mixin';

export interface Maker {
  /** Whether this agent can fulfill orders. */
  isMaker(): boolean;
}

export function MakerMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MakerMixin extends Base implements Maker {
    static _mixinName = 'MakerMixin';

    /**
     * Augment-gated: composing `MakerMixin` is necessary but not
     * sufficient. The role is **active** only while a conferral grants it
     * (`MixinApi.isActive` / `getActiveMixins`) — for the bar staff, the
     * on-shift Position's `confers: ['MakerMixin']` surfaced via
     * `EmployedMixin.getConferredMixinNames`. So an off-shift (or never-
     * employed) Crafter is composed-but-inactive, and `MixinApi.isMaker`
     * (now routed through `isActive`) selects only the on-shift bartender
     * as the order fulfiller. See docs/subsystems/augmentation.md.
     */
    static _augmentGated = true;

    isMaker(): boolean {
      return true;
    }
  };
}
