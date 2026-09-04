/**
 * ServiceableMixin — ⭐ **the venue's washable kit: claimed clean,
 * dirtied by use, washed at the basin, counted on the house par.**
 *
 * This is the half a coupe and a horn spoon genuinely share, and it is
 * not about holding anything: a spoon holds nothing and is still claimed,
 * still dirtied by the meal, still washed, still counted.
 *
 * ⚠⚠ **Why it had to come out of `CraftVessel`.** The cutlery was made a
 * `CraftVessel` to get exactly this behaviour, and paid for it by
 * becoming a bulk vessel it is not — an interior slot it never fills, an
 * ice charge, and a `wash()` that opened with *"⚠ Serviceware without
 * contents is still washed … `getBulk` THROWS on a host that has no such
 * slot"*. **A method that throws on part of its own host set is the host
 * set being wrong**, and that guard was the tell, the same one that moved
 * the palate off `BulkableMixin`.
 *
 * The split: `wash()` here does what is true of all serviceware — drop
 * the technique stamp, mark it clean. `CraftVessel` overrides it to also
 * tip the dregs, destroy the garnish and drop the ice, because those are
 * things only a vessel has. Neither needs a guard. `isClaimable()` splits
 * the same way: clean here, clean AND empty AND iceless on a vessel.
 */

import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * Who may mark it used: the FILL, which is `CraftingLogic`'s. The wash is
 * `wash()` below — inside the mixin, so it writes the field directly and
 * needs no gate.
 *
 * ⚠⚠ **The clone pipeline arms are not optional.** `soiled` is a
 * `persistent` field, so a `Hydrator` writes it through the two-phase
 * `set<Field>` dispatch — both for a fresh clone and, critically, for a
 * logged-out player's inventory coming back out of `holder_snapshots`.
 *
 * ⭐ That is not theoretical. A live drive washed a coupe, logged out, and
 * could not log back in: `handleUserConnect` died with `Policy
 * FromModule(CraftingLogic) denied setSoiled()` from inside
 * `PersistentHydrator.hydrate`. Ordinary play wrote a `soiled` glass into
 * the snapshot and the player was locked out of their character.
 */
const SoiledWriters = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/platform/idea/api/CraftingLogic#CraftingLogic'),
  SecurityPolicies.FromModule('/platform/idea/persistence/PersistentHydrator', {
    includeSubclasses: true,
  }),
  SecurityPolicies.FromTemplate('/platform/idea/persistence/*Hydrator'),
);

/** The method surface serviceable kit offers other Stuff. */
export interface Serviceable {
  isSoiled(): boolean;
  soil(): void;
  setSoiled(value: boolean): void;
  getTechnique(): string;
  setTechnique(value: string): void;
  wash(): void;
  isClaimable(): boolean;
}

export function ServiceableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  // ⚠ A class DECLARATION, not `return class {…}`: a decorator is not
  // valid on a class-expression member, and `setSoiled` must stay gated.
  // Same shape as `ChattelMixin`, for the same reason.
  class ServiceableMixin extends Base implements Serviceable {
    static _mixinName = 'ServiceableMixin';

    static fieldMeta: FieldMeta = {
      soiled: { persistent: true, runtimeState: true },
      technique: { persistent: true, runtimeState: true },
    };

    /** Used since its last wash — soiled kit is never claimed. */
    public soiled: boolean = false;

    /** How what it held was worked (`''` = not yet used). */
    public technique: string = '';

    isSoiled(): boolean {
      return this.soiled;
    }

    /**
     * ⭐ **Mark it used.** Deliberately one-way: it can only ever dirty,
     * and `wash()` is the only road back. That is why it needs no gate
     * where the raw setter does — anyone who uses a piece of kit may soil
     * it, and nobody at all may quietly un-soil one.
     */
    soil(): void {
      this.soiled = true;
    }

    /** The raw setter, gated: the only way back to `false` but a wash. */
    @CallSecurity(SoiledWriters)
    setSoiled(value: boolean): void {
      this.soiled = value;
    }

    getTechnique(): string {
      return this.technique;
    }
    setTechnique(value: string): void {
      this.technique = value;
    }

    /**
     * Wash it: what is true of every piece of kit. A vessel overrides this
     * to tip its dregs and drop its ice first — see `CraftVessel.wash`.
     */
    wash(): void {
      this.setTechnique('');
      this.soiled = false;
    }

    /** Clean — claimable. A vessel adds "and empty, and iceless". */
    isClaimable(): boolean {
      return !this.soiled;
    }
  }
  return ServiceableMixin;
}
