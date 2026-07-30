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

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Tooled } from '../../../lib/craft/Tooled';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';

const TOPIC = 'world.narration.action';
const SHARPEN_MS_FALLBACK = 12000;
const RASP_DB = 55;

interface SharpenModel extends CommandModel {
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
        Mml.compose`${Mml.item(blade)} has no edge to hold a hone.`,
        'no-edge',
      );
      return;
    }

    // A carried, un-broken whetstone (hasCapability goes dark broken).
    const stone = this.carriedWhetstone(giver);
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
      durationMs: sharpenDurationMs(),
      beginSelf: Mml.compose`You set to work on ${Mml.item(blade)} with ${Mml.item(stone)}, long slow strokes.`,
      beginPeers: Mml.compose`${Mml.name(giver)} sets to sharpening ${Mml.item(blade)}.`,
      onComplete: () => {
        keenBlade.hone();
        if (MixinApi.isDurable(stone)) stone.wear();
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You thumb the edge of ${Mml.item(blade)} — keen again.`)
          .toPeers(Mml.compose`${Mml.name(giver)} finishes sharpening ${Mml.item(blade)}.`)
          .send();
      },
    });
    // The room hears the ritual — the rasp rides the Audible push.
    if (MixinApi.isAudible(stone)) {
      stone.emit({ db: RASP_DB, character: 'rasp of stone on steel' });
    }
  }

  /** The giver's carried, working whetstone (broken offers nothing). */
  private carriedWhetstone(giver: Stuff): (Stuff & Tooled) | null {
    if (!MixinApi.isContainer(giver)) return null;
    for (const c of giver.getContents()) {
      if (MixinApi.isTool(c) && c.hasCapability('whetstone')) return c;
    }
    return null;
  }
}
