// PostureLogic — the hot-reloadable logic singleton behind PostureApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Slottable } from '../../lib/slot/Slottable';
import type { Slotted } from '../../lib/slot/Slotted';
import type { Postured } from '../../lib/slot/Postured';
import type { Posed } from '../../lib/character/Posed';
import { MixinApi } from '../../api/mixin';
import { SlotApi } from '../../api/slot';
import type { PostureTransferResult } from '../../api/posture';

const PostureApiCallers = SecurityPolicies.FromModule(
  'api/posture#PostureApi'
);

/**
 * PostureLogic — the hot-reloadable logic singleton behind
 * {@link PostureApi}.
 *
 * Lives at `/obj/api/posture` (a stateless `Stuff` singleton, no
 * backing `Template`); `PostureApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). The
 * posture-bearing-slot lookup shared by `transferPosture` and
 * `findCurrentPostureBearingSlot` lives in the module-private
 * `findPostureBearingSlot` free function (off-class, ungated,
 * un-callable from outside), so `transferPosture` doesn't make an
 * intra-singleton `this.findCurrentPostureBearingSlot()` self-call that
 * the gate would deny.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class PostureLogic extends Idea {
  /** See {@link PostureApi.transferPosture}. */
  @CallSecurity(PostureApiCallers)
  public transferPosture(
    actor: Stuff & Posed & Slottable,
    target: Stuff & Postured,
    posture: string,
    verb: string
  ): PostureTransferResult {
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
          summary:
            `you can't ${verb} on ` +
            `${target.getPresentation()}`,
        };
      }
      return {
        ok: false,
        reason: 'occupied',
        summary:
          `${target.getPresentation()} is occupied`,
      };
    }

    const from = findPostureBearingSlot(actor);

    try {
      SlotApi.transferOccupancy(
        actor,
        from,
        { host: target, slot: chosen }
      );
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

  /** See {@link PostureApi.vacatePostureBearingSlots}. */
  @CallSecurity(PostureApiCallers)
  public vacatePostureBearingSlots(actor: Stuff & Posed): number {
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

  /** See {@link PostureApi.findCurrentPostureBearingSlot}. */
  @CallSecurity(PostureApiCallers)
  public findCurrentPostureBearingSlot(
    candidate: Stuff & Slottable
  ): { host: Stuff & Slotted; slot: string } | null {
    return findPostureBearingSlot(candidate);
  }
}

/**
 * Find the (host, slot) pair the candidate currently occupies that is
 * posture-bearing (i.e. its `SlotSpec.postures` is non-empty). Returns
 * null if the candidate occupies no posture-bearing slot.
 *
 * The substrate guarantees a single actor occupies at most one
 * posture-bearing slot at a time — `transferPosture` enforces this by
 * vacating before occupying. The first match wins.
 */
function findPostureBearingSlot(
  candidate: Stuff & Slottable
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
