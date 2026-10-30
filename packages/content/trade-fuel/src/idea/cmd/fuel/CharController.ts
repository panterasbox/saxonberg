/**
 * CharController — `char [<draught>]`, the burn.
 *
 * A **watched engagement over game time**: the collier sets the draught,
 * lights the clamp, and three days later breaks it open. Re-issuing `char`
 * while a burn is running RE-SETS the draught rather than starting a second
 * one — which is what watching a burn actually consists of.
 *
 * ⭐⭐ **The verb decides nothing about the charge** (ceramics ruling A).
 * It used to read the draught at completion against a threshold table and
 * mint charcoal, brands or ash from three rows. Now the clamp is a real
 * fire: below `fire.air.flamingCompleteness` the heap is starved and every
 * length of cordwood in it chars by its own wood's heat transition (a
 * quarter of its mass, its volatiles up the vents); too cool and it only
 * gets to brands; given air it CATCHES, goes onto the bed and burns, and
 * leaves ash in the grate. The lengths are the same lengths, become what
 * the heat made of them. This verb sets the air, lights it, holds the watch
 * and says what came out.
 *
 * Because it is a real fire, an adjustment on day two still counts — the
 * heat-work banked after it is banked at the new draught.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import CharcoalPit from '../../../thing/CharcoalPit';

const TOPIC = 'act.deed';
/** The Discipline a burn credits. Fuel is its own trade. */
const COLLIERY = 'colliery';
/**
 * Three days, compressed. ⚠ It is long ON PURPOSE: a burn you can watch
 * to the end in one sitting is not a burn you can lose track of, and
 * losing track of it is the failure the craft is about.
 */
const BURN_MS = 3 * 24 * 60 * 60 * 1000;

const CHARCOAL = '/stuff/idea/material/organic/charcoal';
const BRANDS = '/stuff/idea/material/organic/half-burnt-wood';

interface CharModel extends CommandModel {
  /** ⭐ The clamp, resolved by the BINDER off the view's arg. */
  clamp?: MqlOneResult;
  draught?: number;
}

export default class CharController extends CommandController<CharModel> {
  async execute(model: CharModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bound = model.clamp?.stuff ?? null;
    const pit = bound instanceof CharcoalPit ? bound : undefined;
    if (!pit) {
      this.decline(context, Mml.compose`There is no clamp here to burn.`, 'no-clamp');
      return;
    }

    if (model.draught !== undefined) pit.setDraught(model.draught);

    // ⭐ Re-issuing while a burn runs is ADJUSTING it, which is what
    // watching a burn consists of. It is not a second burn and it is not
    // an error.
    if (
      MixinApi.isEngaged(giver) &&
      giver.getEngagements().some((e) => e.slots.has('attention'))
    ) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You work along the clamp, opening and stopping vents. The draught is ${pit.getDraught().toFixed(2)} now.`,
        )
        .send();
      return;
    }

    const charge = (pit.getContents() as Stuff[]).filter((c) => isCordwood(c));
    if (charge.length === 0) {
      this.decline(
        context,
        Mml.compose`The clamp is empty. Fill it with cordwood before you light it.`,
        'empty-clamp',
      );
      return;
    }

    if (!pit.isLit()) {
      // ⭐ A spent chimney is laid again from the charge: one length down
      // the middle, which is how a clamp is lit.
      let laid = false;
      if (pit.fuelRemaining() <= 0) {
        const kindling = charge.pop()!;
        const stoked = pit.stoke(kindling);
        if (!stoked.ok) {
          charge.push(kindling);
          this.decline(
            context,
            stoked.reason === 'too-wet'
              ? Mml.compose`The chimney is empty, and green cordwood will not light it. Stoke the clamp with something dry first.`
              : Mml.compose`The chimney is empty. Stoke the clamp with something that will burn first.`,
            'no-fuel',
          );
          return;
        }
        laid = true;
      }
      const lit = pit.ignite();
      if (!lit.lit && lit.reason !== 'already-burning') {
        this.decline(
          context,
          lit.reason === 'too-wet'
            ? Mml.compose`It will not catch — the chimney is too wet.`
            : lit.reason === 'no-fuel'
              ? Mml.compose`There is nothing down the chimney to light. Stoke it first.`
              : Mml.compose`It will not catch.`,
          lit.reason ?? 'not-lit',
        );
        return;
      }
      if (laid) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You lay a length down the chimney and drop a coal in after it.`)
          .send();
      }
    }

    // ⭐ Whoever holds the burn is credited for what it makes — stamped on
    // every length now, so a rung reached while nobody watched still knows
    // whose burn it was.
    const identity = giver.getIdentityPath() ?? '';
    for (const length of charge) {
      if (!MixinApi.isThermal(length)) continue;
      length.getTemperature();
      if (identity !== '') length.stampFiredBy(identity);
    }

    // ⚠⚠ A free function, never `this.<method>`: a controller is one
    // ephemeral clone per execution, destructed the moment `execute`
    // returns — and this act runs for three days of game time.
    const lengths = charge.length;
    this.engage(context, pit, () => {
      void openClamp(context, pit, lengths);
    });
  }

  /** Hand the clock the rest. */
  private engage(context: CommandContext, pit: CharcoalPit, onDone: () => void): void {
    const giver = context.commandGiver;
    if (!MixinApi.isEngaged(giver)) {
      onDone();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      // ⚠ The `attention` slot, not `hands`: a burn is WATCHED, not held.
      slots: ['attention'],
      durationMs: BURN_MS,
      // ⚠ No `effortW`: a three-day burn is watched, not worked.
      onComplete: onDone,
      host: pit as unknown as Stuff,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && result.status !== 'completed-sync') context.note(result.note);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You fire the clamp and turf it over. Smoke finds its way out in a dozen places. Draught set at ${pit.getDraught().toFixed(2)}; now it is three days of watching.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} fires the clamp.`)
      .send();
  }

  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/**
 * Break the clamp open. ⭐ The heat already decided: the clamp settles
 * (each length reads its own heat history), and this says what the lengths
 * became.
 *
 * ⚠⚠ A module function: the controller is long gone. And the collier may
 * be too — the clamp still burns; only the telling needs somebody there.
 */
async function openClamp(
  context: CommandContext,
  pit: CharcoalPit,
  lengths: number,
): Promise<void> {
  const giver = context.commandGiver;
  const ashBefore = pit.getAshKg();
  const settled = await pit.settleFiring(giver.isDestroyed() ? null : giver);
  let charcoal = 0;
  let brands = 0;
  for (const body of settled.contents) {
    if (!isCordwood(body) || !MixinApi.isTangible(body)) continue;
    const path = body.getMaterial()?.getTemplatePath() ?? '';
    if (path === CHARCOAL) charcoal += 1;
    else if (path === BRANDS) brands += 1;
  }
  const ash = settled.burnt > 0 || (charcoal === 0 && brands === 0 && pit.getAshKg() > ashBefore);
  if (giver.isDestroyed()) return;

  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      charcoal > 0
        ? Mml.compose`You break the clamp open. Black, light, and it rings when you knock two lengths together — ${String(charcoal)} of ${String(lengths)} lengths came out charcoal.`
        : brands > 0
          ? Mml.compose`You break the clamp open on half-burnt brands. Brown at the heart, heavy in the hand. You drew it too tight, and a week's cutting is worth a fraction of what it should be.`
          : ash
            ? Mml.compose`You break the clamp open on nothing but warm ash. It took too much air and the wood caught and burned. A week's cutting and three days' watching, gone.`
            : Mml.compose`You break the clamp open. The wood in it is barely scorched — it never got hot enough to char.`,
    )
    .send();

  // ⚠ The DEED is recorded either way. A lost burn is evidence of
  // practice — it is how a collier learns where the band is, and
  // recording only successes would make the ledger a scoreboard. ⭐ One
  // credit for the burn: the lengths' own rung credits (`settled
  // .disciplines`, colliery too) are drained by the settle and folded into
  // this one, so a burn of twenty lengths is one deed, not twenty.
  if (MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: COLLIERY,
      difficulty: 'standard',
      outcome: charcoal > 0 ? 'success' : 'failure',
    });
  }
}

/** Cordwood — what a clamp is charged with, charred or not. */
function isCordwood(item: Stuff): boolean {
  if (!MixinApi.isPerceptible(item)) return false;
  return item.getKeywords().includes('cordwood');
}
