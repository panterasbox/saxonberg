/**
 * BatheController — `bathe [in <tub|water>] [with <soap>]` (cleanliness
 * D28): a whole body washed at once.
 *
 * ⭐ Dumb over the bath, as `wash` is over the wash: the WATER is the
 * source's (a tub's own water at its own heat, or a shore's — through the
 * one shore answer, so a frozen river refuses unless there is a hole in
 * it); the chemistry and the chill are the BODY's (`Attired.bathe`: every
 * part washed, the body soaked, the heat exchanged by the one law). This
 * file finds the water and the soap, engages the body and says what
 * happened.
 */

import WashController, { type WashModel, type WashWater } from './WashController';
import type { CommandContext } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { WashCleanser } from '../../../../lib/cleanliness/Soilable';
import type CleanserCatalogue from '../../CleanserCatalogue';
import type DirtKindCatalogue from '../../DirtKindCatalogue';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { BulkableApi } from '../../../../api/bulk';
import { StuffApi } from '../../../../api/stuff';
import { TemplatePaths } from '../../../../lib/paths';

const TOPIC = 'act.deed';
/** A bath, in game-seconds (D28's `BATHE_S`). */
export const BATHE_S = 120;
/** Real milliseconds the engagement holds the body. */
const BATHE_MS = 12000;
/** A vessel smaller than this is a basin, not a bath. */
const BATH_MIN_L = 60;

export default class BatheController extends WashController {
  override async execute(model: WashModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isAttired(giver)) {
      this.declineStep(context, Mml.compose`You have no body to bathe.`, 'no-body');
      return;
    }
    for (const c of model.water?.stuff ?? []) {
      await BulkableApi.slotFor(c, undefined)?.settle();
    }
    const cleansers = await StuffApi.singleton<CleanserCatalogue>(
      TemplatePaths.cleanserCatalogue,
    );
    await StuffApi.singleton<DirtKindCatalogue>(TemplatePaths.dirtKindCatalogue).then((c) =>
      c.allWarmed(),
    );
    const found = await this.findCleansers(model.cleanser, cleansers);
    if ('refusal' in found) {
      this.declineStep(context, Mml.compose`${found.refusal}`, 'not-a-cleanser');
      return;
    }
    // ⭐ Big enough to get into: a shore's water, or a vessel holding a
    // bath's worth (a tub); a basin washes hands and faces.
    const bound = (model.water?.stuff ?? []).filter(
      (c) => MixinApi.isShore(c) || bathVolumeL(c) >= BATH_MIN_L,
    );
    const water = await this.findWater({ ...model.water, stuff: bound } as MqlManyResult, context);
    if ('refusal' in water) {
      const none = water.reason === 'no-water';
      this.declineStep(
        context,
        none
          ? Mml.compose`There's nothing here deep enough to bathe in.`
          : Mml.compose`${water.refusal}`,
        none ? 'no-bath' : water.reason,
      );
      return;
    }
    this.bathe(giver, water, found.cleansers, context);
  }

  private bathe(
    giver: Stuff,
    water: WashWater,
    cleansers: WashCleanser[],
    context: CommandContext,
  ): void {
    const dressed =
      MixinApi.isAttired(giver) &&
      giver.trunkSite() !== null &&
      giver.outermostAt(giver.trunkSite()!) !== null;
    this.engageStep(context, {
      durationMs: BATHE_MS,
      effortW: 120,
      beginSelf: dressed
        ? Mml.compose`You get into ${Mml.thing(water.source)} with your clothes on.`
        : Mml.compose`You get into ${Mml.thing(water.source)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} gets into ${Mml.thing(water.source)}.`,
      onComplete: () => {
        if (giver.isDestroyed() || !MixinApi.isAttired(giver)) return;
        giver.bathe(
          {
            waterK: water.waterK,
            hardnessDgh: water.hardnessDgh,
            cleansers,
            effort: 2,
          },
          BATHE_S,
        );
        this.spend(cleansers, 1);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`${bathLine(water.waterK, cleansers.length > 0, dressed)}`)
          .toPeers(Mml.compose`${Mml.actor(giver)} climbs out, dripping.`)
          .send();
      },
    });
  }
}

/** The litres a vessel holds right now, or 0. */
function bathVolumeL(c: Stuff): number {
  if (!MixinApi.isBulkable(c)) return 0;
  const slot = BulkableApi.slotFor(c, undefined);
  return slot && !slot.isEmpty() ? slot.getAmount().rawValue() : 0;
}

/** What climbing out feels like — by the water's heat, and the soap. */
function bathLine(waterK: number, soaped: boolean, dressed: boolean): string {
  const heat =
    waterK >= 310
      ? 'You climb out pink and warm'
      : waterK >= 290
        ? 'You climb out cool and clean'
        : 'You climb out blue-lipped and shaking';
  const soap = soaped ? ', scrubbed clean' : ', rinsed, if not scrubbed';
  const clothes = dressed ? ' Your clothes hang off you sodden.' : '';
  return `${heat}${soap}.${clothes}`;
}
