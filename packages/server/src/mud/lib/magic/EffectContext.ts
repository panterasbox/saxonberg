/**
 * EffectContext — what an effect executes *from*.
 *
 * The shipped pipeline threaded one `caster` parameter through every
 * executor, and that parameter was quietly doing **four different jobs**:
 *
 * | Job | Read as | Where it showed |
 * |---|---|---|
 * | **origin** | where the working comes from | the reachability check, `sceneOf(caster)` |
 * | **actor** | who is acting | `target ?? caster` self-effects, the harm row's initiator |
 * | **source** | what supplies the energy | the reserve spend |
 * | **potency** | how hard it lands | already a parameter |
 *
 * When a person casts, the first three are the same object, which is
 * why one parameter sufficed. **A wand pulls them apart**: the wand is
 * the origin and the source, the user is the actor. A wand set down and
 * pointed at a door is a trap — that only means anything if origin is
 * separable from actor. See requirements D1.
 *
 * Two consequences the executors must respect, and both are the kind of
 * bug that is silent:
 *
 * - **A self-effect targets `ctx.actor`, never `ctx.origin`.** Getting
 *   this wrong retargets a spell at the wand.
 * - **The accountability row names `ctx.actor`, never `ctx.origin`.** A
 *   wand must not be able to initiate a harm row.
 *
 * Immutable value + a static holder for the two construction shapes (the
 * `Suppressions` / `Resists` idiom). Purely a *runtime* plumbing value —
 * it is never persisted, and it is **internal to the gated Api**: an
 * item entry point derives its actor from the execution context, and
 * never takes one as a parameter.
 */

import type { Stuff } from '../stuff/Stuff';
import type { MagicNoun, MagicVerb } from './Grid';
import type { MagicProvenance } from './Grid';

/** The grid address + identity a context stamps onto everything it produces. */
export interface EffectAddress {
  readonly verb: MagicVerb;
  readonly noun: MagicNoun;
  readonly spellId: string;
}

/** The four separated jobs, plus the tag they compose into. */
export interface EffectContext {
  /**
   * Where the working issues from — the reachability base. The caster
   * for a cast, **the item** for an item discharge.
   */
  readonly origin: Stuff;
  /**
   * Who is acting — the subject of a self-effect and the principal of
   * any harm row. The caster for a cast, **the user** for an item.
   */
  readonly actor: Stuff;
  /**
   * What supplies the energy. The caster's mana for a cast, **the
   * item's charge** for a charged item, the *user's* reserve for a
   * focus (which is why source and origin are separate fields rather
   * than one).
   */
  readonly source: Stuff;
  /** Magnitude multiplier — competence-scaled, or the maker's stored efficiency. */
  readonly potency: number;
  /** The provenance tag every condition this context produces is stamped with. */
  readonly tag: MagicProvenance;
}

/** Thin static holder — the two construction shapes. */
export class EffectContexts {
  /**
   * The durable id the ledgers key on — a `templatePath` where one
   * exists, else a stable per-instance fallback.
   */
  public static durableIdOf(s: Stuff): string {
    return s.getTemplatePath() ?? `stuff:${s.stuffId}`;
  }

  /**
   * A cast: one object plays all three roles, so this collapses to the
   * shipped behaviour exactly. **The reachability check must stay a
   * no-op for casts**, which it does because `origin === caster`.
   */
  public static forCast(
    caster: Stuff,
    address: EffectAddress,
    potency: number,
  ): EffectContext {
    const id = EffectContexts.durableIdOf(caster);
    return {
      origin: caster,
      actor: caster,
      source: caster,
      potency,
      tag: {
        verb: address.verb,
        noun: address.noun,
        spellId: address.spellId,
        specifiedBy: id,
        firedBy: id,
      },
    };
  }

  /**
   * An item discharge: the item is the origin, the **user** is the
   * actor, and `source` names whichever of the two pays — the item for
   * a charged shell, the user for a focus (D5's whole distinction).
   *
   * `specifiedBy` is the maker's durable id, carried on the item from
   * manufacture; it falls back to the item's own id for an unattributed
   * one so the tag is never half-formed.
   */
  public static forItem(
    item: Stuff,
    user: Stuff,
    address: EffectAddress,
    potency: number,
    options?: { readonly source?: Stuff; readonly specifiedBy?: string },
  ): EffectContext {
    return {
      origin: item,
      actor: user,
      source: options?.source ?? item,
      potency,
      tag: {
        verb: address.verb,
        noun: address.noun,
        spellId: address.spellId,
        specifiedBy:
          options?.specifiedBy && options.specifiedBy.length > 0
            ? options.specifiedBy
            : EffectContexts.durableIdOf(item),
        firedBy: EffectContexts.durableIdOf(user),
      },
    };
  }
}
