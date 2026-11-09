/**
 * HaulableMixin — cart side of haulage: "this Vessel can be hitched and
 * dragged." The dragged-container half of the conveyance family (the
 * inverse of `Mountable`/`Drivable`: there the actor rides the host; here
 * the host follows the actor on the ground while staying a room object).
 *
 * Composes on `Stuff & Container & Tangible` (a `Vessel` supplies both —
 * `getContents` for the cargo it carries, `getMass` for its own frame).
 *
 * The cost of moving a loaded cart is **`draftFactor`** — the
 * rolling-resistance × mechanical-advantage coupling, the pushing-side
 * analog of `Vessel.transmissionFactor`. A hauler's borne burden gains
 * `getDraftLoad()` while hitched:
 *
 *   draftLoad = (cartSelfMass + effectiveContentsBurden) × draftFactor
 *
 * where the contents are weighed through the same Vessel-transmission
 * attenuation the encumbrance burden walk uses (so a bag of holding
 * inside a cart still contributes ~0). Wheels turn carry-weight into a
 * small push-weight; `carry / drag / cart / can't-budge` is emergent from
 * `draftFactor × mass` vs. the hauler's capacity.
 *
 * The hitch coupling is a Pattern-B live ref (`_hauledBy` here ↔
 * `_hauling` on `HaulerMixin`), a symmetric R2.2 pair with an R2.3
 * self-heal backstop, declared on the field rather than written into
 * the getter. See `docs/ref-shapes.md` and
 * `docs/subsystems/encumbrance.md`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { Quantity } from '../quantity';
import type { Stuff } from '../stuff/Stuff';
import { Vessel } from '../stuff/Vessel';
import type { Container } from '../spatial/Container';
import type { Tangible } from '../material/Tangible';
import type { LocomotionMode } from '../../platform/idea/LocomotionMode';
import type { Hauler } from './Hauler';
import type { VetoResult } from '../errors';
import { LocomotionApi } from '../../api/locomotion';
import { MixinApi } from '../../api/mixin';

/** Recursion guard for the contents weigh (matches the burden walk). */
const HAUL_MAX_DEPTH = 16;

/**
 * Weighted weight of one cart subtree for the draft computation —
 * mirrors the Vessel-transmission attenuation in
 * `lib/encumbrance/LoadBearing`'s `walk`, minus the placement surcharge
 * (a cart's contents have no held/worn coupling; the cart frame is the
 * placement root, and `draftFactor` is applied once by the caller).
 * Module-private (not the export-discipline-tripping shared helper).
 */
function weighSubtree(
  item: Stuff,
  transmission: number,
  depth: number,
  visited: Set<string>,
): number {
  if (depth > HAUL_MAX_DEPTH) return 0;
  if (visited.has(item.stuffId)) return 0;
  visited.add(item.stuffId);

  const self = MixinApi.isTangible(item) ? item.getMass().rawValue() : 0;
  let contribution = self * transmission;

  if (MixinApi.isContainer(item)) {
    const childTransmission =
      transmission *
      (item instanceof Vessel ? item.getTransmissionFactor() : 1.0);
    for (const child of item.getContents()) {
      contribution += weighSubtree(child, childTransmission, depth + 1, visited);
    }
  }
  return contribution;
}

/** Effective contained burden of a cart (own frame mass excluded). */
function weighContents(container: Stuff & Container): number {
  const visited = new Set<string>();
  let total = 0;
  for (const child of container.getContents()) {
    total += weighSubtree(child, 1.0, 0, visited);
  }
  return total;
}

/** The public surface added by HaulableMixin. */
export interface Haulable {
  getDraftFactor(): number;
  setDraftFactor(value: number): void;
  getHandedness(): number;
  setHandedness(value: number): void;
  /** Locomotion mode the cart's passage needs (default `wheeled`). */
  getPassageMode(): LocomotionMode | null;
  setPassageMode(value: string): void;
  /** Effective-kg draft a hauler bears while pulling this cart. */
  getDraftLoad(): Quantity<'kg'>;
  /** The hauler currently hitched to this cart (R2.3 self-heal). */
  getHauledBy(): (Stuff & Hauler) | null;
  /** Pairing setter (haulage-family internal — keep both sides in sync). */
  setHauledBy(hauler: (Stuff & Hauler) | null): void;

  /**
   * Pre-hitch veto: *may this hauler, coupled by this actor, take me?*
   *
   * ⭐ **On the CART, because refusing to be coupled is a question about
   * the cart.** Declared on the interface (controller-liquidity D9, Appendix
   * D 16e) — it was consulted by shape before; the default takes anybody.
   *
   * The haulage trade's rig band-gates rig size on `teamstering` through
   * it — *competence is access*. ⚠ It is the ACTOR's competence that
   * decides, not the hauler's: a horse has no transcript. ⚠ It may be
   * **async** (the band read is).
   *
   * @hook Override to refuse with an honest `{ ok: false, reason }`.
   */
  canHitch(hauler: Stuff, actor: Stuff): VetoResult | Promise<VetoResult>;
  /**
   * May `actor` uncouple me from `hauler`, who pulls me? ⭐ Asked by
   * `Hauler.unhitch(by)` itself (passing itself, as `canHitch` is passed
   * the hauler), so every caller meets it. The default
   * refuses only a cart another PERSON is pulling by hand — you do not
   * take a cart out of somebody's hands; a draft animal's cart is anybody's
   * to unhitch, as a horse's harness is.
   *
   * @hook Override to tighten (an owned rig, a team's own wagon).
   */
  canUnhitch(hauler: Stuff, actor: Stuff): VetoResult;
}

export function HaulableMixin<
  TBase extends MixinConstructor<Stuff & Container & Tangible>
>(Base: TBase) {
  return class HaulableMixin extends Base implements Haulable {
    static _mixinName = 'HaulableMixin';

    /*
     * ⭐⭐ **`hitch` and `unhitch` were afforded by NOTHING.** Found by
     * the base-class narrowing's drive, which typed `hitch wagon to
     * horse` in a goods yard with a wagon and a horse standing in it
     * and got back *"I don't understand 'hitch'."*
     *
     * The view shipped, the controller shipped, the arg gates shipped
     * (`hitch.yaml:35` is `HaulerMixin`'s only reader in the tree), and
     * no `commandContributions` anywhere in the repo named the file. So
     * the whole haulage loop — and `conveyance.md`'s worked example, *a
     * horse you ride while it hauls* — was unreachable for every player
     * since it shipped. ⚠ The FIRST of the five reachability links, and
     * it fails closed and silent: a verb nobody affords is simply not a
     * verb.
     *
     * `peers`, not `environment`: a cart stands in the room as your
     * SIBLING, and `environment` grants outward to the containers ABOVE
     * you — the same mistake `WaterFixture`'s `wash` shipped with, and
     * the same fix.
     */
    static commandContributions: CommandContributions = {
      peers: [
        'platform/cmd/movement/hitch.yaml',
        'platform/cmd/movement/unhitch.yaml',
      ],
    };
    static fieldMeta: FieldMeta = {
      draftFactor: { persistent: true, authorable: true },
      handedness: { persistent: true, authorable: true },
      passageMode: { persistent: true, authorable: true },
      // The hitch coupling, cart side — runtime-only, never persisted.
      _hauledBy: {
        ref: 'instance',
        lifetime: 'symmetric',
        inverse: '_hauling',
      },
    };

    /**
     * Rolling-resistance × mechanical-advantage coupling (`0..1`). The
     * pushing-side analog of `Vessel.transmissionFactor` — accessor pair
     * owns the invariant (the project rule), `setDraftFactor` delegates.
     */
    private _draftFactor: number = 0.05;

    protected get draftFactor(): number {
      return this._draftFactor;
    }
    protected set draftFactor(value: number) {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
      ) {
        throw new RangeError(
          `HaulableMixin.draftFactor must be a finite number in [0, 1], ` +
            `got ${value}`,
        );
      }
      this._draftFactor = value;
    }

    public getDraftFactor(): number {
      return this._draftFactor;
    }
    public setDraftFactor(value: number): void {
      this.draftFactor = value;
    }

    /**
     * Hands the haul claims when hitched by hand (1 or 2; default 2).
     */
    private _handedness: number = 2;

    protected get handedness(): number {
      return this._handedness;
    }
    protected set handedness(value: number) {
      if (value !== 1 && value !== 2) {
        throw new RangeError(
          `HaulableMixin.handedness must be 1 or 2, got ${value}`,
        );
      }
      this._handedness = value;
    }

    public getHandedness(): number {
      return this._handedness;
    }
    public setHandedness(value: number): void {
      this.handedness = value;
    }

    /**
     * Short locomotion-mode name (or path) the cart's passage needs —
     * `wheeled` (ground medium) by default. The terrain gate asks
     * `exit.allowsMode(...)`; `wheeled` is admitted
     * by any `media: ['ground']` exit and refused by vertical/water/air.
     * `LocomotionApi.modeOf` accepts either name or path form.
     */
    public passageMode: string = 'wheeled';

    public getPassageMode(): LocomotionMode | null {
      return LocomotionApi.modeOf(this.passageMode);
    }
    public setPassageMode(value: string): void {
      this.passageMode = value;
    }

    public getDraftLoad(
      this: Stuff & Container & Tangible & Haulable,
    ): Quantity<'kg'> {
      const self = this.getMass().rawValue();
      const contents = weighContents(this);
      return Quantity.of((self + contents) * this.getDraftFactor(), 'kg');
    }

    /**
     * The hauler hitched to this cart. Live ref (runtime-only — a
     * reloaded cart wakes up unhitched). Declared instance ref, so the
     * R2.3 self-heal applies:
     * clears the slot if the hauler destructed without our witness.
     */
    private _hauledBy: (Stuff & Hauler) | null = null;

    public getHauledBy(): (Stuff & Hauler) | null {
      return this._hauledBy;
    }

    public setHauledBy(hauler: (Stuff & Hauler) | null): void {
      this._hauledBy = hauler;
    }

    /** See {@link Haulable.canHitch} — the default takes anybody. */
    public canHitch(
      _hauler: Stuff,
      _actor: Stuff,
    ): VetoResult | Promise<VetoResult> {
      return { ok: true };
    }

    /** See {@link Haulable.canUnhitch}. */
    public canUnhitch(hauler: Stuff, actor: Stuff): VetoResult {
      if (hauler.stuffId === actor.stuffId) return { ok: true };
      if (MixinApi.isCommandGiver(hauler)) {
        return { ok: false, reason: 'held-by-another' };
      }
      return { ok: true };
    }

  };
}
