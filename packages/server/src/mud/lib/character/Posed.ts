/**
 * PosedMixin — actor-side posture state. Composed by `Character` so
 * every PC and NPC carries `getPosture()` / `setPosture()` uniformly.
 *
 * The host-side counterpart is `PosturedMixin` (`lib/slot/Postured`):
 * a chair / bed / floor exposes posture-bearing slots, and an actor
 * sitting in one of them flips to the matching `Postures.*` value.
 *
 * Storage: a direct string field — posture is intrinsic per-actor
 * runtime state, persistent across saves so reconnects restore the
 * posture an avatar logged off in. Default `Postures.Stand`.
 *
 * The `Postures` constants live in `lib/slot/Postured.ts` (the
 * host-side mixin owns the vocabulary). Verbs and validators import
 * from there.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Postures } from '../slot/Postured';
import type { Postured } from '../slot/Postured';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from '../slot/Slotted';
import type { Slottable } from '../slot/Slottable';
import { MixinApi } from '../../api/mixin';
import { SlotApi } from '../../api/slot';
import type { CommandContributions } from '../../api/command';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/**
 * The transfer's discriminated result (moved with the verbs):
 * `'no-posture-slot'` when the target accepts no slot for this posture,
 * `'occupied'` when every candidate slot is full, `'transfer-failed'`
 * when the underlying `SlotApi.transferOccupancy` throws.
 */
export type PostureTransferResult =
  | { ok: true; host: Stuff & Slotted; slot: string }
  | { ok: false; reason: string; summary: string };

/**
 * The posture verbs' controllers — the only legitimate posture-transfer
 * entry paths (the narrow-entry pattern; module-id strings so lib does
 * not import the controller classes).
 */
const PostureVerbCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/platform/idea/cmd/posture/SitController#SitController'),
  SecurityPolicies.FromModule('/platform/idea/cmd/posture/StandController#StandController'),
  SecurityPolicies.FromModule('/platform/idea/cmd/posture/LieController#LieController'),
  SecurityPolicies.FromModule('/platform/idea/cmd/posture/KneelController#KneelController'),
  SecurityPolicies.FromModule('/platform/idea/cmd/movement/MountController#MountController'),
  SecurityPolicies.FromModule('/platform/idea/cmd/movement/DismountController#DismountController'),
  SecurityPolicies.SelfOnly,
);

/**
 * Find the (host, slot) pair the candidate currently occupies that is
 * posture-bearing (i.e. its `SlotSpec.postures` is non-empty). Returns
 * null if the candidate occupies no posture-bearing slot. (Moved from
 * the retired PostureLogic with the OO sweep.)
 */
function findPostureBearingSlot(
  candidate: Stuff & Slottable,
): { host: Stuff & Slotted; slot: string } | null {
  const occupied = SlotApi.findOccupiedSlots(candidate);
  for (const [host, slotNames] of occupied.entries()) {
    for (const slotName of slotNames) {
      const spec = host.getSlotSpec(slotName);
      if (spec?.postures && spec.postures.length > 0) {
        return { host, slot: slotName };
      }
    }
  }
  return null;
}

export interface Posed {
  getPosture(): string;
  setPosture(value: string): void;
  /** Template path of the host whose posture slot this body occupies, or ''. */
  getRestingOnPath(): string;
  /** The slot name occupied on that host, or ''. */
  getRestingSlot(): string;
  transferPosture(
    target: Stuff & Postured,
    posture: string,
    verb: string,
  ): PostureTransferResult;
  vacatePostureBearingSlots(): number;
  currentPostureBearingSlot(): {
    host: Stuff & Slotted;
    slot: string;
  } | null;
}

export function PosedMixin<TBase extends MixinConstructor>(Base: TBase) {
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class PosedMixin extends Base {
    static _mixinName = 'PosedMixin';
    static fieldMeta: FieldMeta = {
      posture: { persistent: true, authorable: true },
      restingOnPath: { persistent: true },
      restingSlot: { persistent: true },
    };

    /**
     * The posture verbs, on the SELF affordance surface — an actor that has
     * a posture is the thing that can change it (the `Respiration`
     * inhale/exhale precedent one line up the same folder).
     *
     * These YAML views and their controllers have shipped since the posture
     * substrate landed, but **nothing contributed them**, so no player could
     * ever issue one: `lie`/`sit`/`stand`/`kneel` all came back "I don't
     * understand". Verbs reach a giver ONLY through `commandContributions`
     * (`Perceiver` contributes `look` the same way), so an uncontributed
     * view is dead YAML.
     *
     * Found by driving the world in a browser while verifying
     * sleep-as-logout: the bed was lieable and the mechanic still had no
     * player-facing entry point, because the verb that reaches it did not
     * exist for anybody.
     */
    static commandContributions: CommandContributions = {
      self: [
        'platform/cmd/posture/lie.yaml',
        'platform/cmd/posture/sit.yaml',
        'platform/cmd/posture/stand.yaml',
        'platform/cmd/posture/kneel.yaml',
      ],
      peers: [],
      environment: [],
    };

    public posture: string = Postures.Stand;

    /**
     * The template path of the host whose posture slot this body occupies,
     * or `''`. Persisted, because **`getOccupiedHost()` is a live scan** —
     * the posture survives a logout but the bed does not, so on restore
     * `currentRestQuality()` would read 1.0 on the very reconcile that was
     * meant to pay out. Recording it is what makes "you wake where you
     * slept" true rather than "you wake lying on the floor" (D10).
     *
     * Kept as a path + slot name rather than a reference: the instance is
     * long gone by restore time, and the bed is re-cloned by its room.
     */
    public restingOnPath: string = '';

    /** The slot name occupied on that host, or `''`. */
    public restingSlot: string = '';

    public getPosture(): string {
      return this.posture;
    }

    public setPosture(value: string): void {
      this.posture = value;
    }

    public getRestingOnPath(): string {
      return this.restingOnPath;
    }

    public getRestingSlot(): string {
      return this.restingSlot;
    }

    /**
     * Record the host + slot when this body takes a POSTURE-BEARING slot.
     * Worn, held, mount and fixture slots leave `postures` undefined and are
     * deliberately ignored: what is being remembered is where you are
     * resting, not what you are carrying.
     *
     * @hook
     */
    public onSlotOccupied(host: Stuff & Slotted, slotName: string): void {
      // Chain FIRST. `onSlotOccupied`/`onSlotReleased` are optional
      // witnesses on `Slottable`, and mixin methods do not merge — the
      // outermost layer silently REPLACES an inner one. That is how
      // `PosedMixin.onSlotReleased` came to never fire (MobileMixin is
      // composed further out), leaving a sleeper who stood up still
      // recorded as occupying the bed. This mixin is currently the sole
      // implementor of `onSlotOccupied`, which is exactly when the
      // reflex is cheapest to install.
      (
        Base.prototype as unknown as {
          onSlotOccupied?: (h: Stuff & Slotted, s: string) => void;
        }
      ).onSlotOccupied?.call(this, host, slotName);
      const bearing =
        MixinApi.isPostured(host) &&
        host.getAcceptedPostures(slotName).length > 0;
      if (!bearing) return;
      this.restingOnPath = host.getTemplatePath() ?? '';
      this.restingSlot = slotName;
    }

    /**
     * Forget it again on release, so a body that got up does not claim a
     * bed it is no longer in.
     *
     * @hook
     */
    public onSlotReleased(_host: Stuff & Slotted, slotName: string): void {
      // Same chaining reflex as `onSlotOccupied` above. `super.x?.()` is
      // not expressible here (the base is generic, and `super` is not an
      // expression), so the chain goes through the base prototype —
      // which is exactly what `super` would resolve to.
      (
        Base.prototype as unknown as {
          onSlotReleased?: (h: Stuff & Slotted, s: string) => void;
        }
      ).onSlotReleased?.call(this, _host, slotName);
      if (slotName !== this.restingSlot) return;
      this.restingOnPath = '';
      this.restingSlot = '';
    }
    /**
     * Atomic posture transfer (was `PostureApi.transferPosture` — the
     * OO sweep). Vacates any current posture-bearing slot, finds a slot
     * on `target` accepting `posture`, occupies it, and sets this
     * actor's posture string. `verb` is used only for the
     * "no posture-accepting slot" failure surface. Gated to the posture
     * verbs' controllers (the narrow-entry pattern) and sealed — the
     * method owns the one-posture-slot invariant.
     */
    @CallSecurity(PostureVerbCallers)
    @Final
    @Unshadowable
    public transferPosture(
      target: Stuff & Postured,
      posture: string,
      verb: string,
    ): PostureTransferResult {
      const actor = this as unknown as Stuff & Posed & Slottable;
      // Find a slot on the target accepting this posture.
      const candidates = target.getSlotsAcceptingPosture(posture);
      let chosen: string | null = null;
      for (const slot of candidates) {
        if (target.isSlotFull(slot)) continue;
        if (!target.canOccupy(actor, slot)) continue;
        chosen = slot;
        break;
      }
      if (!chosen) {
        if (candidates.length === 0) {
          return {
            ok: false,
            reason: 'no-posture-slot',
            summary: `you can't ${verb} on ${target.getPresentation()}`,
          };
        }
        return {
          ok: false,
          reason: 'occupied',
          summary: `${target.getPresentation()} is occupied`,
        };
      }

      const from = findPostureBearingSlot(actor);

      try {
        SlotApi.transferOccupancy(actor, from, { host: target, slot: chosen });
      } catch (err) {
        return {
          ok: false,
          reason: 'transfer-failed',
          summary: (err as Error).message,
        };
      }
      actor.setPosture(posture);
      return { ok: true, host: target, slot: chosen };
    }

    /**
     * Vacate every posture-bearing slot this actor currently occupies.
     * Returns the count vacated. No-op if the actor isn't Slottable.
     * Does NOT touch the posture string — callers (typically
     * `StandController`) flip it to `Postures.Stand` separately so the
     * value is explicit at the call site.
     */
    @CallSecurity(PostureVerbCallers)
    @Final
    @Unshadowable
    public vacatePostureBearingSlots(): number {
      const actor = this as unknown as Stuff;
      if (!MixinApi.isSlottable(actor)) return 0;
      const occupied = SlotApi.findOccupiedSlots(actor);
      let vacated = 0;
      for (const [host, slotNames] of occupied.entries()) {
        for (const slotName of slotNames) {
          const spec = host.getSlotSpec(slotName);
          if (!spec?.postures || spec.postures.length === 0) continue;
          if (host.vacate(slotName, actor)) vacated++;
        }
      }
      return vacated;
    }

    /**
     * The (host, slot) pair this actor occupies that is posture-bearing,
     * or null. The substrate guarantees at most one — `transferPosture`
     * vacates before occupying. Ungated read.
     */
    public currentPostureBearingSlot(): {
      host: Stuff & Slotted;
      slot: string;
    } | null {
      const actor = this as unknown as Stuff;
      if (!MixinApi.isSlottable(actor)) return null;
      return findPostureBearingSlot(actor);
    }

  }
  return PosedMixin;
}
