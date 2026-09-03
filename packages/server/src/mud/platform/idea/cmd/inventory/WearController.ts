/**
 * WearController — claim a Wearable's body-plan slots on the actor.
 *
 * Multi-slot claims are atomic via the giver's `occupyAll`.
 *
 * Validation surface (from `cmd/wear.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory (target-level) + `requires: WearableMixin`
 *
 * The TypeScript narrows below throw if reached — meaning a validator
 * failed to do its job. They're not user-facing failure paths.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SpeciesApi } from '../../../../api/species';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Slotted } from '../../../../lib/slot/Slotted';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';

interface WearModel extends CommandModel {
  target: MqlOneResult;
}

/**
 * The presentation of the outermost thing already occupying one of
 * `slots` — what the refusal names, so the line says what is in the
 * way rather than *"no"*. Falls back to a bare phrase if the stack has
 * gone empty between the check and the read.
 */
function outermostClaimedBy(
  giver: Stuff & Slotted,
  candidate: Stuff,
  slots: readonly string[],
): string {
  for (const slot of slots) {
    for (const occ of giver.getOccupants(slot)) {
      if ((occ as unknown as Stuff) === candidate) continue;
      return (occ as unknown as Stuff).getPresentation();
    }
  }
  return 'what you already have on';
}

/** Numeric AppSetting read with a seeded-literal fallback. */
function fitDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export default class WearController extends CommandController<WearModel> {
  execute(model: WearModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't have any '${model.target.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    if (!MixinApi.isWearable(target)) {
      throw new Error(
        `WearController: mustBeWearable validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `WearController: requiresSlotted validator should have caught ${giver.stuffId}`
      );
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!bodyPlanPath) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You have no body plan.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'BodyPlanMixin' });
      return;
    }
    const slots = target.getSlotClaim(bodyPlanPath);
    if (slots.length === 0) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(target)} doesn't fit your body.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'wrong-fit',
        detail: `${target.getPresentation()} doesn't fit your body`,
      });
      return;
    }
    // ⚠ The impossible fit — a HARD refusal, independent of the ladder.
    //
    // ⭐ A halfling's coat on a dragonborn fails on a NUMBER, not on a
    // species check, so a heavy human and a light dragonborn shade into
    // each other correctly. And a `cutTo` naming a DIFFERENT body plan
    // is refused whatever the distance: both are `biped`, so slot
    // matching alone would let the coat straight on.
    const fit = target.fitOn(giver);
    const refuseAbove = fitDial(AppSettingKeys.textilesFitRefuseAbove, 0.35);
    if (fit.measurable && (fit.wrongBody || fit.distance > refuseAbove)) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(target)} was not cut for a body like yours — it will not go on.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'fit-impossible',
        detail: `${target.getPresentation()} was cut for a different body`,
      });
      return;
    }
    // ⚠ The ladder refusal, and it is narrow on purpose: a low band may
    // not go OUTSIDE a high one — you cannot put a shirt over plate.
    // Shirt-vs-coat is NOT refused: both are band 0, which of them goes
    // on first is the player's call, and getting it wrong should make
    // you cold rather than be prevented.
    if (giver.wouldLayerViolate(target)) {
      const outer = outermostClaimedBy(giver, target, slots);
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(target)} won't go on over ${outer}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'layer-order',
        detail:
          `${target.getPresentation()} would sit outside something heavier`,
      });
      return;
    }
    for (const slot of slots) {
      if (giver.isSlotFull(slot)) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(Mml.compose`Your ${slot} is occupied.`)
          .send();
        context.note({
          kind: 'slot-occupied',
          host: MessageApi.refOf(giver),
          slot,
        });
        return;
      }
    }
    // occupyAll may throw on race conditions or shape
    // violations; the dispatcher's outer catch emits
    // controller-error uniformly — no try/catch here per plan.
    giver.occupyAll(target, [...slots]);
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You put on ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} puts on ${Mml.thing(target)}.`
      )
      .send();
    return;
  }
}
