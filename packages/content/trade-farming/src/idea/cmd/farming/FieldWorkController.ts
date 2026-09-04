/**
 * FieldWorkController — the shared base for the reclamation acts
 * (`grub`, `ditch`, `lime`) and for `forage`.
 *
 * It holds exactly what they share: **standing in a field**, resolving
 * that field's seeded character and the improvement bill it implies, and
 * **engaging the actor's hands over game time** so the work lands at
 * completion and a barge-in leaves the ground as it was.
 *
 * ⚠⚠ **None of these acts carries a deed gate**, the same decision the
 * mine's four labour acts made and for the same reason: they are LABOUR,
 * not craft. `advancement`'s ruling is that a Discipline changes what you
 * LEARN, never what the ground GIVES. A man with no transcript grubs
 * exactly as much thorn out of a headland as a master does; what the
 * master has is knowing which field was worth grubbing.
 *
 * ⭐ **What differs between two fields is the GROUND, not the actor**
 * (D55). Each act banks one unit of labour against a job whose
 * requirement is `GroundCharacter.improvementCost` — so stony ground
 * takes more grubbing, wet ground more ditching, sour ground more lime,
 * and *two plots of different character demand measurably different work
 * to reach the same state.*
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import GroundCharacter, { type GroundSample, type ImprovementCost } from '../../GroundCharacter';
import type Field from '../../../location/Field';

/** The topic every field act narrates on. */
export const FIELD_TOPIC = 'act.deed';

/** The reserve labour is paid out of. */
const ENDURANCE = 'endurance';

/** The Discipline field labour credits. */
export const AGRICULTURE = 'agriculture';

/**
 * Labour banked by one act, in the units `improvementCost` speaks.
 *
 * ⭐ One unit per act is the whole calibration, and it is deliberately
 * not a dial: the *number of acts* a field takes is then read straight
 * off its improvement bill, which is a number a player can see in
 * `analyze soil`. Kind ground is two or three acts a job; the worst
 * ground in the game is a dozen.
 */
export const LABOUR_PER_ACT = 1;

type Composed = ReturnType<typeof Mml.compose>;

export interface FieldStepOptions {
  durationMs: number;
  beginSelf: Composed;
  beginPeers?: Composed;
  /** Endurance the act costs, in percentage points. */
  cost: number;
  onComplete: () => void;
  onAbort?: (reason: AbortReason) => void;
}

/** A field, its resolved character, and the bill that character implies. */
export interface FieldReading {
  field: Field & Stuff & Container;
  sample: GroundSample;
  bill: ImprovementCost;
}

export abstract class FieldWorkController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /**
   * The field the actor is standing in, with its ground resolved — or
   * `null` when they are not standing in one.
   *
   * ⭐ Narrowed by the SHAPE the room answers rather than by a mixin
   * name, because a hand-authored field (a venue that composed soil onto
   * a room of its own) must behave identically to a plotted one. Nothing
   * in these acts consults how the ground came to exist.
   */
  protected async fieldOf(giver: Stuff): Promise<FieldReading | null> {
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    const candidate = room as unknown as Partial<Field> & Stuff & Container;
    if (typeof candidate.getGroundSpot !== 'function') return null;
    if (typeof (candidate as unknown as { progressOn?: unknown }).progressOn !== 'function') {
      return null;
    }
    const field = candidate as Field & Stuff & Container;
    const locality = await AddressApi.resolveLocalityFor(room as Stuff & Container);
    const seed = GroundCharacter.seedFor(locality?.getAddress() ?? '');
    const model = await this.characterAt(room as Stuff & Container);
    const sample = field.groundSample(model, seed);
    return { field, sample, bill: GroundCharacter.improvementCost(sample) };
  }

  /** The authored ground-character model, or `null` (the ordinary case). */
  protected async characterAt(place: Stuff & Container): Promise<GroundCharacter | null> {
    return GroundCharacter.forZone(
      (place as unknown as {
        getZone?(): { lookupField<T>(f: string): Promise<T | null> } | null;
      }).getZone?.(),
    );
  }

  /** Decline diegetically, and file the structured reason. */
  protected decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(FIELD_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** A tool with `capability` in hand, or `null`. */
  protected toolOf(giver: Stuff, capability: string): Stuff | null {
    if (!MixinApi.isContainer(giver)) return null;
    return (
      giver.getContents().find((i) => MixinApi.isTool(i) && i.hasCapability(capability)) ?? null
    );
  }

  /**
   * Run the act as an engaged activity on the giver's `hands` slot, so
   * the effect lands **at completion** and a barge-in leaves the ground
   * as it was. Spends the endurance up front — the work was done whether
   * or not anything came of it.
   *
   * The mining base's `engageAct`, re-implemented rather than shared: a
   * pack does not reach into another pack, and what the two do not share
   * is the whole of what they are about.
   */
  protected engageAct(context: CommandContext, opts: FieldStepOptions): void {
    const giver = context.commandGiver;
    this.spend(giver, opts.cost);
    if (!MixinApi.isEngaged(giver)) {
      opts.onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: opts.durationMs,
      onComplete: opts.onComplete,
      onAbort: opts.onAbort,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      const scene = MessageApi.scene(giver).topic(FIELD_TOPIC).toSelf(opts.beginSelf);
      if (opts.beginPeers) scene.toPeers(opts.beginPeers);
      scene.send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    if (!result.ok && result.reason === 'engagement-conflict') {
      this.decline(context, Mml.compose`Your hands are already busy.`, 'engagement-conflict');
      return;
    }
    this.decline(context, Mml.compose`You can't manage that just now.`, 'start-rejected');
  }

  /** Spend endurance. A no-op on a body that carries no reserves. */
  protected spend(giver: Stuff, points: number): void {
    if (points <= 0 || !MixinApi.isReserved(giver)) return;
    if (!giver.hasReserve(ENDURANCE)) return;
    giver.adjustReserve(ENDURANCE, Quantity.of(-points, '%'));
  }

  /**
   * Credit the labour.
   *
   * ⚠ Difficulty is read off the GROUND at the moment of the act, not
   * off a counter: finishing a hard field is a hard check and turning
   * over kind ground is a trivial one, which is the estimator's own
   * anti-grind property doing the work rather than a bespoke guard.
   */
  protected async credit(giver: Stuff, required: number): Promise<void> {
    if (!MixinApi.isAdvancing(giver)) return;
    await giver.creditDeed({
      discipline: AGRICULTURE,
      difficulty: required >= 4 ? 'hard' : required >= 2 ? 'standard' : 'trivial',
      outcome: 'success',
    });
  }
}
