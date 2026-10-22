/**
 * PourController — `pour X into Y`, `pour N unit M into Y`.
 *
 * Pours liquid from holder X (a vessel by name, or a material reached
 * by keyword / `:b`) into holder Y. The amount is the measure hint on
 * the source field (`pour 2 cups water` → 2 cups; `pour water:{99 cups}`
 * → strict 99 cups) or, absent one, the whole source clamped to Y's
 * headroom. Thin direction over `BulkableApi.transfer`, which owns the
 * material-compatibility check, the overflow clamp, and the
 * open-vessel drain-through cascade.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { BulkableApi } from '../../../../api/bulk';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';
import type { Stuff } from '../../../../lib/stuff/Stuff';

const TOPIC = 'act.deed';

interface PourModel extends CommandModel {
  source: MqlOneResult;
  target: MqlOneResult;
  /** `--amount 2cups` — how much to move. Absent ⇒ as much as fits. */
  amount?: string;
  /** `--exact` — take the full measure or none of it. */
  exact?: boolean;
}

export default class PourController extends CommandController<PourModel> {
  async execute(model: PourModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const source = model.source.stuff;
    const target = model.target.stuff;

    if (!source) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.source.raw}' to pour.`)
        .send();
      context.note({ kind: 'empty-result', field: 'source', query: model.source.raw });
      return;
    }
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to pour into.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    const fromSlot = BulkableApi.slotFor(source, model.source.via);
    const toSlot = BulkableApi.slotFor(target, model.target.via);
    if (fromSlot === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to pour out of ${Mml.thing(source)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-holder',
        detail: 'source has no bulk slot',
      });
      return;
    }
    if (toSlot === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't pour anything into ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-holder',
        detail: 'target has no bulk slot',
      });
      return;
    }

    const amount = BulkableApi.amountFromOption(
      model.amount,
      { kind: 'all' },
      model.exact === true,
    );
    // What the mould is made of, read BEFORE the pour: a mould the pour
    // consumes is gone by the time the line is written.
    const waxMould =
      MixinApi.isMould(target) && MixinApi.isTangible(target) && target.getMaterial()?.hasTag('wax') === true;
    const result = BulkableApi.transfer(fromSlot, toSlot, amount);
    for (const note of result.notes) context.note(note);
    if (result.applied > 0 && MixinApi.isBulkable(source)) {
      source.afterPouredOutBy(giver, result.applied);
    }

    // ⭐⭐ (ceramics S13) The receiver did not survive the pour: its melting
    // or ignition point is below the metal's heat. The pour is on the
    // floor now, and the sentence says what happened to the vessel.
    if (result.status === 'melted' || result.status === 'burned') {
      const line =
        result.status === 'melted'
          ? Mml.compose`${Mml.thing(target)} slumps and runs as the pour hits it — it has melted — and everything goes across the floor.`
          : Mml.compose`${Mml.thing(target)} smokes, chars and catches as the pour hits it — it is burning — and the metal runs out across the floor.`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(line)
        .toPeers(Mml.compose`${Mml.actor(giver)} pours into ${Mml.thing(target)}, and it gives way under the heat.`)
        .send();
      return;
    }
    if (result.applied > 0 && MixinApi.isBulkable(target) && !target.isDestroyed()) {
      target.afterPouredInBy(giver, result.applied);
    }

    // The rack credit (fermentation W7/D9): drawing off a FINISHED
    // batch is the craft's timing act — credit `fermenting` at the
    // deed (the WaterController shape; no credit for an idle pour).
    if (result.applied > 0 && MixinApi.isMaturing(source)) {
      const phase = source.getMaturationPhase();
      if (phase === 'finished' || phase === 'turned') {
        try {
          if (MixinApi.isAdvancing(giver))
            await giver.creditDeed({
            discipline: 'fermenting',
            difficulty: 'easy',
            outcome: 'success',
          });
        } catch (err) {
          console.warn('PourController: recording the deed failed:', err);
        }
      }
    }

    // ⭐ The cut's credit, the same shape one block up: drawing from a
    // RUNNING fractionating host is the distiller's timing act, and the
    // schedule names which Discipline it exercises — so a schedule any
    // pack ships credits its own trade with no controller edit.
    if (result.applied > 0 && MixinApi.isFractionating(source)) {
      const schedule = source.isRunning() ? source.getRunSchedule() : null;
      const discipline = schedule?.getDiscipline() ?? '';
      if (discipline) {
        try {
          if (MixinApi.isAdvancing(giver))
            await giver.creditDeed({
              discipline,
              difficulty: 'easy',
              outcome: 'success',
            });
        } catch (err) {
          console.warn('PourController: recording the deed failed:', err);
        }
      }
    }

    // ⭐ The mould's credit (dairy D22): filling a mould IS the act — there
    // is no recipe and no deed to gate — so a mould row that names a
    // Discipline credits it here, at the fill (a hoop → dairying, an ingot
    // mould → smelting; an ice pan names none).
    // ⭐ (ceramics D26) A mould whose pour is a DAY — the bell pit: the
    // metal goes in at once (it would freeze in the crucible otherwise),
    // and the founder's day is the watch over the cooling pit. The credit
    // lands when the watch is kept, not at the fill.
    if (result.applied > 0 && MixinApi.isMould(target) && target.getPourDurationS() > 0) {
      watchThePour(context, target, target.getPourDurationS());
    } else if (result.applied > 0 && MixinApi.isMould(target)) {
      const discipline = target.getMouldDiscipline();
      if (discipline) {
        try {
          if (MixinApi.isAdvancing(giver))
            await giver.creditDeed({
              discipline,
              difficulty: 'standard',
              outcome: 'success',
            });
        } catch (err) {
          console.warn('PourController: recording the deed failed:', err);
        }
      }
    }

    // ⭐⭐ Escape: a GAS into something that will not hold it. Not a
    // puddle and not silence — it is in the air of the room now, and the
    // sentence has to say so, because in a shut room that is dangerous.
    if (result.status === 'escaped') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`It will not stay in ${Mml.thing(target)} — it is gone into the air.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} loses a charge of gas into the air.`,
        )
        .send();
      return;
    }

    // Drain-through: an open destination didn't retain the liquid.
    if (result.status === 'drained') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The liquid runs straight through ${Mml.thing(target)} and pools on the floor.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} pours liquid through ${Mml.thing(target)}; it pools on the floor.`,
        )
        .send();
      return;
    }

    if (result.applied <= 0) {
      // Distinguish material mismatch from strict over-pour from empty.
      const mismatch = result.notes.some(
        (n) => n.kind === 'target-declined' && n.reason === 'material-mismatch',
      );
      const rejected = result.notes.some(
        (n) => n.kind === 'quantity-clamped-rejected',
      );
      // ⚠ A lenient pour into a brim-full vessel also moves nothing — and
      // "nothing to pour" blamed the full flask in your hand (the potash
      // drive's kettle, filled by one pail of water).
      const full = fromSlot.available() > 0 && toSlot.remaining() <= 0;
      const line = mismatch
        ? Mml.compose`That won't mix with what's already in ${Mml.thing(target)}.`
        : rejected
          ? Mml.compose`That's more than will fit in ${Mml.thing(target)}.`
          : full
            ? Mml.compose`${Mml.thing(target)} is already full.`
            : Mml.compose`There's nothing to pour.`;
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      return;
    }

    // ⭐ The pour consumed its mould — lost wax (the metal melts the wax out
    // and takes its place), or a sand mould broken away from what set in
    // it. Say so rather than naming a thing that is no longer there.
    if (target.isDestroyed()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          waxMould
            ? Mml.compose`You pour from ${Mml.thing(source)}. The wax runs out as the metal takes its place.`
            : Mml.compose`You pour from ${Mml.thing(source)}. It sets, and the mould is broken away from it.`,
        )
        .toPeers(
          waxMould
            ? Mml.compose`${Mml.actor(giver)} pours, and wax runs smoking out of the mould.`
            : Mml.compose`${Mml.actor(giver)} pours, and breaks the mould away from the casting.`,
        )
        .send();
      return;
    }

    // Success (possibly a lenient partial — the clamp note is already
    // forwarded; the prose stays the same).
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pour from ${Mml.thing(source)} into ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} pours from ${Mml.thing(source)} into ${Mml.thing(target)}.`,
      )
      .send();
  }
}

/** The founder's watch over a slow pour's cooling — sealed down, on the attention. */
const WATCH_EFFORT_W = 60;

/**
 * ⚠ A MODULE function, not a method: the watch completes after the
 * controller has been destructed in its dispatch `finally`.
 */
function watchThePour(context: CommandContext, mould: Stuff, durationS: number): void {
  const giver = context.commandGiver;
  const credit = (): void => {
    if (giver.isDestroyed() || mould.isDestroyed()) return;
    const discipline = MixinApi.isMould(mould) ? mould.getMouldDiscipline() : '';
    if (discipline && MixinApi.isAdvancing(giver)) {
      void giver
        .creditDeed({ discipline, difficulty: 'hard', outcome: 'success' })
        .catch((err: unknown) => console.warn('PourController: recording the deed failed:', err));
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The day is out. ${Mml.thing(mould)} has gone quiet and cool enough to dig the cast out of.`)
      .send();
  };
  if (!MixinApi.isEngaged(giver)) {
    credit();
    return;
  }
  const step = new ManualBuildStep({
    actor: giver,
    slots: ['attention'],
    durationMs: durationS * 1000,
    effortW: WATCH_EFFORT_W,
    onComplete: credit,
  });
  const started = SchedulerApi.start(step);
  if (started.ok && started.status !== 'completed-sync') context.note(started.note);
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(Mml.compose`The metal goes down into ${Mml.thing(mould)} in a long bright rope. Now it has to cool, and you settle in to watch it the day through.`)
    .toPeers(Mml.compose`${Mml.actor(giver)} settles in to watch over ${Mml.thing(mould)}.`)
    .send();
}
