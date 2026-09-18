/**
 * SharpenController — `sharpen <blade>` (the working-surface ritual).
 *
 * The keenness axis's restore: a durative engaged activity on the hands
 * slot (interruptible, campfire-compatible — no venue, no heat) using a
 * **carried**, un-broken whetstone that itself wears. The rasp is
 * emitted as an `Audible` at the start, so the room hears the ritual.
 * At completion the blade is honed to fully keen; an abort restores
 * nothing. Sharpening never touches structural `condition` — a nicked
 * blade needs the smith, not the stone (two axes, two cadences).
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';

const TOPIC = 'act.deed';
const SHARPEN_MS_FALLBACK = 12000;
const RASP_DB = 55;

interface SharpenModel extends CommandModel {
  /** ⭐ The instrument, resolved by the BINDER off the view's arg. */
  stone?: MqlOneResult;
  blade?: MqlOneResult;
}

function sharpenDurationMs(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.craftingKeennessSharpenDurationMs);
    const n = raw === '' || raw == null ? NaN : Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : SHARPEN_MS_FALLBACK;
  } catch {
    return SHARPEN_MS_FALLBACK;
  }
}

export default class SharpenController extends ManualBuildController<SharpenModel> {
  execute(model: SharpenModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const blade = model.blade?.stuff ?? null;
    if (!blade) {
      this.declineStep(
        context,
        Mml.compose`Sharpen what? Name a blade.`,
        'empty-result',
      );
      return;
    }
    // An edge to hold: Keen + an edge/point delivery form.
    const channel =
      MixinApi.isConstructed(blade) && blade.getConstruction()?.isWeapon()
        ? blade.getConstruction()!.primaryChannel()
        : null;
    if (
      !MixinApi.isKeen(blade) ||
      (channel !== 'edge' && channel !== 'point')
    ) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(blade)} has no edge to hold a hone.`,
        'no-edge',
      );
      return;
    }

    // A carried, un-broken whetstone (hasCapability goes dark broken).
    const stone = this.carriedWhetstone(model.stone?.stuff);
    if (!stone) {
      this.declineStep(
        context,
        Mml.compose`You need a whetstone in your kit for that.`,
        'missing-tool',
      );
      return;
    }

    const keenBlade = blade;
    this.engageStep(context, {
      // The stone paces its own ritual (a grinding wheel is faster).
      durationMs: this.paceMs(sharpenDurationMs(), stone, ['whetstone']),
      beginSelf: Mml.compose`You set to work on ${Mml.thing(blade)} with ${Mml.thing(stone)}, long slow strokes.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets to sharpening ${Mml.thing(blade)}.`,
      onComplete: () => {
        keenBlade.hone();
        if (MixinApi.isDurable(stone)) stone.wear();
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You thumb the edge of ${Mml.thing(blade)} — keen again.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} finishes sharpening ${Mml.thing(blade)}.`)
          .send();
      },
    });
    // The room hears the ritual — the rasp rides the Audible push.
    if (MixinApi.isAudible(stone)) {
      stone.emit({ db: RASP_DB, character: 'rasp of stone on steel' });
    }
  }

  /**
   * ⭐ The bound stone, if it is a working whetstone. Resolved by the
   * binder; a broken one still offers nothing, which is state no
   * predicate expresses.
   */
  private carriedWhetstone(bound: Stuff | null | undefined): (Stuff & Tooled) | null {
    if (!bound || !MixinApi.isTool(bound)) return null;
    return bound.hasCapability('whetstone') ? bound : null;
  }
}
