/**
 * CastMixin — **the identity rung.**
 *
 * A character is either **somebody** or **a role somebody fills**, and the
 * shipped prose has been saying which all along without being asked to:
 * of 39 written characters, 26 carry a proper name, and the rest split on
 * the article — *a* sentry, *a* sellsword, *a* hewer on tutwork, against
 * *the* collier, *the* smelterman, *the* storekeeper. This mixin is the
 * world agreeing with the prose.
 *
 * ⭐⭐ **It is a mixin because identity and capability are TWO AXES and
 * TypeScript has single inheritance.** Dave must be a `Crafter` *and*
 * cast; `Extra`/`Cast` as base classes cannot express that — it is a
 * diamond. The codebase had already answered this one line away:
 * `Crafter = MakerMixin(NPC)` and `Mercenary = PartyMemberMixin(NPC)`
 * are the capability axis *already* expressed as a mixin over the
 * substrate and given a name. So combinations stay one-liners in the
 * shipped idiom: `Crafter = CastMixin(MakerMixin(NPC))`.
 *
 * ⚠⚠ **A correlation trap to refuse.** All seven `Crafter` rows carry a
 * proper name and the one `Mercenary` does not, so capability and
 * identity look perfectly correlated today. **They are not.** That is a
 * 39-row accident of the same species as *every NPC row is instanced
 * exactly once*, and collapsing the axes on the strength of it would bake
 * the accident into the type system.
 *
 * ## What it carries
 *
 * `SingletonMixin`, and that is the whole enforcement: `StuffApi.clone`
 * refuses a second live instance for a path whose class composes it, so
 * *"there is only one Odile"* is a throw rather than a convention. An
 * `Extra` is deliberately un-singleton — two sentries are the point.
 *
 * ⭐ **Identity resolution is UNCHANGED by this mixin.** Neither rung
 * touches `getIdentityPath()`. An `Extra` keeps its own identity (two
 * dead sentries do not collapse into one corpse); what an Extra lacks is
 * a *person* to attribute to, which is why the institutional attribution
 * (`AffiliatedMixin`) is a **second** attribution rather than a
 * replacement projection.
 *
 * ## Promotion
 *
 * There is no runtime transition to build. Identity is a stamp and
 * `setTemplatePath` re-keys the registry index, so promoting an extra
 * means **authoring a `Cast` row** — an authoring act, not a mechanic.
 */

import type { MixinConstructor } from '../mixin';
import { SingletonMixin } from '../stuff/Singleton';

/**
 * Marker interface. Composition is detected via `MixinApi.isCast` —
 * there is no surface, because being somebody is a fact about the row,
 * not a capability the object exercises.
 */
export interface Cast {
  // Marker — see `MixinApi.isCast`.
}

export function CastMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CastMixin extends SingletonMixin(Base) implements Cast {
    static _mixinName = 'CastMixin';
  };
}
