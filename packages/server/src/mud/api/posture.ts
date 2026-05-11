/**
 * PostureApi — workflow helper for posture verbs (sit / lie / kneel /
 * stand-on).
 *
 * `transferPosture` consolidates the standard four-step pattern
 * shared by every posture-changing verb:
 *
 *   1. Validate target is Postured + actor is Posed + Slottable.
 *   2. Find a posture-accepting slot on the target.
 *   3. Atomically vacate the actor's current posture-bearing slot
 *      and occupy the new one (`SlotApi.transferOccupancy` carries
 *      the rollback semantics).
 *   4. Set the actor's `Posed` posture string and emit the verb's
 *      narration scene.
 *
 * Returns a `CommandResult` so verb controllers can pass it through
 * directly. The narration text is caller-supplied — controllers own
 * the verb-specific surface ("You sit down." vs "You kneel down.")
 * while the slot+state machinery lives here.
 */

import type {
  CommandContext,
  CommandResult,
} from './command';
import type { MqlOneResult } from './mql';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Slottable } from '../lib/slot/Slottable';
import type { Slotted } from '../lib/slot/Slotted';
import type { Posed } from '../lib/character/Posed';
import { MessageApi } from './message';
import { DescribeApi } from './describe';
import { MixinApi } from './mixin';
import { Mml } from './mml';
import { SlotApi } from './slot';
import { SecurityApi } from './security';

export interface PostureTransferOpts {
  /** Verb name for failure-message phrasing ("you can't `sit` on …"). */
  verb: string;
  /** The posture string to set on the actor (typically a `Postures.*`). */
  posture: string;
  /** MQL resolution of the verb's target argument. */
  target: MqlOneResult;
  /** Command context; supplies `commandGiver`. */
  context: CommandContext;
  /** Self-facing narration ("You sit down."). */
  successSelf: string;
  /**
   * Peers-facing narration template. A leading `{name}` is replaced
   * by the Mml-rendered actor name (the helper inserts `Mml.name`
   * before the rest of the template).
   */
  successPeers: string;
}

export class PostureApi {
  /**
   * Run the full posture-transfer workflow against an MQL-resolved
   * target. Returns a CommandResult — verb controllers typically
   * `return PostureApi.transferPosture(opts)` directly.
   */
  public static transferPosture(opts: PostureTransferOpts): CommandResult {
    const target = opts.target.stuff;
    if (!target) {
      return {
        success: false,
        summary: `you don't see any '${opts.target.raw}' here`,
      };
    }
    if (!MixinApi.isPostured(target)) {
      throw new Error(
        `PostureApi.transferPosture: target ${target.stuffId} is not Postured`
      );
    }
    const giver = opts.context.commandGiver;
    if (!MixinApi.isPosed(giver)) {
      throw new Error(
        `PostureApi.transferPosture: commandGiver ${giver.stuffId} is not Posed`
      );
    }
    if (!MixinApi.isSlottable(giver)) {
      throw new Error(
        `PostureApi.transferPosture: commandGiver ${giver.stuffId} is not Slottable`
      );
    }

    // Find a slot on the target accepting this posture.
    const candidates = target.getSlotsAcceptingPosture(opts.posture);
    let chosen: string | null = null;
    for (const slot of candidates) {
      if (target.isSlotFull(slot)) continue;
      if (!target.canOccupy(giver, slot)) continue;
      chosen = slot;
      break;
    }
    if (!chosen) {
      if (candidates.length === 0) {
        return {
          success: false,
          summary:
            `you can't ${opts.verb} on ` +
            `${DescribeApi.getDisplayName(target, 'that')}`,
        };
      }
      return {
        success: false,
        summary:
          `${DescribeApi.getDisplayName(target, 'that')} is occupied`,
      };
    }

    const from = PostureApi.findCurrentPostureBearingSlot(giver);

    try {
      SlotApi.transferOccupancy(
        giver,
        from,
        { host: target, slot: chosen }
      );
    } catch (err) {
      return { success: false, summary: (err as Error).message };
    }
    giver.setPosture(opts.posture);

    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`${opts.successSelf}`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} ${stripNamePrefix(opts.successPeers)}`
      )
      .send();
    return { success: true };
  }

  /**
   * Vacate every posture-bearing slot the actor currently occupies.
   * Returns the count of slots vacated. No-op if the actor isn't
   * Slottable. Does NOT touch the actor's `Posed` posture string —
   * callers (typically `StandController`) flip it to `Postures.Stand`
   * separately so the value is explicit at the call site.
   */
  public static vacatePostureBearingSlots(actor: Stuff & Posed): number {
    if (!MixinApi.isSlottable(actor)) return 0;
    const slottable = actor as Stuff & Slottable;
    const occupied = SlotApi.findOccupiedSlots(slottable);
    let vacated = 0;
    for (const [host, slotNames] of occupied.entries()) {
      for (const slotName of slotNames) {
        const spec = host.getSlotSpec(slotName);
        if (!spec?.postures || spec.postures.length === 0) continue;
        if (host.vacate(slotName, slottable)) vacated++;
      }
    }
    return vacated;
  }

  /**
   * Find the (host, slot) pair the candidate currently occupies that
   * is posture-bearing (i.e. its `SlotSpec.postures` is non-empty).
   * Returns null if the candidate occupies no posture-bearing slot.
   *
   * The substrate guarantees a single actor occupies at most one
   * posture-bearing slot at a time — `transferPosture` enforces this
   * by vacating before occupying. The first match wins.
   */
  public static findCurrentPostureBearingSlot(
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
}

function stripNamePrefix(template: string): string {
  // The peers-template uses `{name}` as a placeholder for the
  // Mml-rendered actor name. The Mml.compose template already
  // includes Mml.name(giver) before this string is appended.
  return template.replace(/^\{name\}\s*/, '');
}

SecurityApi.decorateApiClass(PostureApi);
