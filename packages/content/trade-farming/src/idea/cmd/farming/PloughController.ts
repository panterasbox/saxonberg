/**
 * PloughController — `plough`, and ⭐⭐ **draught power is body mass.
 * There is no new mechanism** (D40).
 *
 * `DraftAnimal` is the shipped precedent and its own doc says it: carry
 * capacity derives from body mass in the encumbrance substrate, *"the
 * pony is better at hauling because it is heavier, which is the actual
 * reason, and the engine already knew it."* Ploughing asks the same
 * question of the same number.
 *
 * > **By hand it is punishing; with an ox it is work.**
 *
 * ⭐ Which makes the ox a **genuine capital investment** and the first
 * rung of a mechanisation ladder nobody authors ahead of demand. And
 * ⚠ **an ox eats whether or not it works** — the
 * depreciating-asset-that-consumes insight applied to a tool, which is
 * the honest economics of draught power and falls out of the animal
 * being an animal rather than being modelled here.
 *
 * ## What ploughing IS, mechanically
 *
 * It is the same improvement work `grub` does, at a different rate and
 * against a different job: turning ground over rather than getting the
 * thorn out of it. So it banks against `clearing` like grubbing does —
 * one act, but an act worth several by hand and many behind an ox.
 *
 * ⚠ It is deliberately NOT a second improvement axis. A field does not
 * need a "ploughed" state on top of a cleared one; what a plough buys is
 * the same ground, sooner, for a smaller share of somebody's back.
 *
 * ## ⭐ The seedbed (cover build D4)
 *
 * Once the clearing is done, ploughing is SEASONAL: a bout turns the
 * sward under — the grass goes into the ground as organic matter — and
 * the field is ploughed for the season, which is what `sow` asks for. A
 * second bout that season is refused, and so is ploughing under a
 * standing crop (grub it out, or cut it).
 */

import { FieldWorkController, FIELD_TOPIC, LABOUR_PER_ACT } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface PloughModel extends CommandModel {
  tool?: MqlOneResult;
}


/**
 * Body mass, in kilograms, that one unit of draught represents.
 *
 * ⭐ A person is roughly 70 kg and an ox is roughly 700. So a man in the
 * traces is worth about one and an ox about ten, and **that ratio is not
 * authored anywhere** — it is the two animals' masses, which the species
 * rows carry for their own reasons. The economics of draught power falls
 * out of biology.
 */
const KG_PER_DRAUGHT = 70;

/**
 * Condition one bout of ploughing takes off the plough — which lands on
 * its share. Twenty-five bouts to a share: about one field turned, which
 * is the season the share is supposed to last. Grain: a number for a
 * balance pass to move.
 */
const SHARE_WEAR_PER_BOUT = 0.04;

export default class PloughController extends FieldWorkController {
  async execute(model: PloughModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is no ground here to turn.`, 'no-field');
      return;
    }
    const plough = this.toolOf(model.tool?.stuff, 'ploughing');
    if (!plough) {
      this.decline(
        context,
        Mml.compose`You would want a plough for that.`,
        'no-tool',
      );
      return;
    }
    // ⭐⭐ **A plough with its share worn through is a sledge** (assembly AC
    // 13). The refusal names the PART and the cure, because that is the
    // whole lesson of a wear part: you do not buy a plough, you fit a
    // share. A failed line of any kind refuses the same way — the beam
    // split, a stilt sprung.
    if (MixinApi.isAssembled(plough)) {
      const failed = plough.failedLines()[0];
      if (failed) {
        this.decline(
          context,
          Mml.compose`The ${failed.part} on ${Mml.thing(plough)} is done for. Fit a new ${failed.part} before you plough again.`,
          'part-failed',
        );
        return;
      }
    }
    const { field, sample, bill } = reading;
    // ⭐ Clearing owed: the bout banks clearing (the one-time improvement).
    // Cleared: it turns the sward under for a seedbed (D4) — refused under
    // a standing crop, and refused twice in one season.
    // ⚠ The crop first: while one stands the field reads its clearing as
    // unfinished (a crop is something to grub out), and a plough must
    // never be the thing that grubs it.
    if (field.getCrop()) {
      this.decline(
        context,
        Mml.compose`A crop stands in it. Cut it or grub it out before you plough.`,
        'crop-stands',
      );
      return;
    }
    const clearing = !field.isComplete('clearing', bill);
    if (!clearing && field.isSeedbedFresh()) {
      this.decline(
        context,
        Mml.compose`It is already ploughed for the season. It wants seed, not another furrow.`,
        'already-ploughed',
      );
      return;
    }

    const draught = this.draughtAvailable(giver);
    const beast = draught > 1.5;

    this.engageAct(context, {
      // ⭐ The PACE is the draught. Behind an ox a bout is minutes;
      // behind yourself it is most of a day, and the ground's own
      // stoniness slows both of you equally.
      durationMs: Math.round(
        (14_000 * (1 + sample.stoniness)) / Math.max(0.5, draught),
      ),
      // ⚠ And so is the cost. A man dragging a plough spends himself;
      // a man walking behind one spends a good deal less.
      cost: Math.round(14 / Math.max(1, draught)),
      beginSelf: beast
        ? Mml.compose`You set the share in, take up the reins, and the beast leans into the collar. The furrow opens ahead of you.`
        : Mml.compose`You get the traces over your shoulders and lean. The share goes in about half as far as it ought to.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts a furrow across the field.`,
      onComplete: () => {
        // ⭐⭐⭐ The ground WEARS the plough, and a plough is a beam with a
        // share on it: wear with no channel lands on the `role: wear`
        // line, which is the share (assembly D7). Until the assembly
        // build nothing wore a plough, so the share — the part a smith
        // sells every farmer every season — had no demand. ⚠ A local, not
        // `this`: the controller is gone by the time the bout ends.
        if (MixinApi.isDurable(plough) && !plough.isDestroyed()) {
          plough.wear(SHARE_WEAR_PER_BOUT);
        }
        void PloughController.finish(context, reading, draught, beast, clearing);
      },
    });
  }

  private static async finish(
    context: CommandContext,
    reading: NonNullable<Awaited<ReturnType<FieldWorkController['fieldOf']>>>,
    draught: number,
    beast: boolean,
    clearing: boolean,
  ): Promise<void> {
    const giver = context.commandGiver;
    const { field, bill } = reading;
    if (!clearing) {
      // ⭐ The seedbed: the grass goes under, and the field is ploughed
      // for the season (D4).
      field.turnUnder();
      try {
        await PersistableApi.captureHostOf(field as unknown as Stuff);
      } catch (err) {
        console.warn('PloughController: capture after ploughing failed:', err);
      }
      MessageApi.scene(giver)
        .topic(FIELD_TOPIC)
        .toSelf(
          Mml.compose`The grass goes under in long dark slices. Ploughed for the season.`,
        )
        .send();
      await this.credit(giver, 1);
      return;
    }
    // ⭐⭐ **The ox works ground a person cannot, at the same rate.** One
    // act, many acts' worth of work — and the multiplier is the animal's
    // mass, not a number in this file.
    const after = field.bankWork('clearing', LABOUR_PER_ACT * draught, bill);
    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(
        after >= 1
          ? Mml.compose`The last of it goes over. ${field.improvementPhrase(bill)}.`
          : beast
            ? Mml.compose`Four bouts and the end of it is in sight. ${field.improvementCause(bill) ?? 'There is more to do'}.`
            : Mml.compose`You get a few yards and stop, and your back tells you what an ox is for. ${field.improvementCause(bill) ?? 'There is more to do'}.`,
      )
      .send();
    await this.credit(giver, bill.clearing + bill.stonePicking);
  }

  /**
   * ⭐ **How much is pulling** — the actor, plus whatever is hitched or
   * standing with them, by MASS.
   *
   * ⚠ It reads mass off the animals present rather than asking for a
   * hitch, because that is the honest reading at this scale: a beast in
   * the field with you and a plough in your hands is a beast in the
   * traces. Hitching as a separate act is the haulage substrate's, and
   * it already ships.
   */
  private draughtAvailable(giver: Stuff): number {
    let kg = massOf(giver);
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (room && MixinApi.isContainer(room)) {
      for (const occupant of (room as Stuff & Container).getContents()) {
        if (occupant === giver) continue;
        if (!MixinApi.isOrganism(occupant) || !occupant.isAlive()) continue;
        // ⚠ Only something big enough to pull. A hen in the field with
        // you is not draught, and nothing had to say so in a list.
        const mass = massOf(occupant as unknown as Stuff);
        if (mass >= KG_PER_DRAUGHT * 2) kg += mass;
      }
    }
    return kg / KG_PER_DRAUGHT;
  }
}

/**
 * A body's mass in kilograms, or zero.
 *
 * ⚠ Narrowed by shape rather than by mixin: mass rides `Tangible`, which
 * every body has, but the union of what can be standing in a field is
 * wider than any one predicate — and a thing with no mass simply pulls
 * nothing.
 */
function massOf(stuff: Stuff): number {
  const m = (stuff as unknown as { getMass?(): { rawValue(): number } })
    .getMass?.();
  return m ? m.rawValue() : 0;
}
