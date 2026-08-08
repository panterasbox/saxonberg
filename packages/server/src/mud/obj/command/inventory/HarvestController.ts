/**
 * HarvestController — `harvest <plant>`.
 *
 * Mints the crop, ends the plant, and takes nitrogen out of the ground
 * with it. The three halves in order, because the ordering matters:
 *
 *   1. **Read the grade BEFORE anything changes.** It comes off the
 *      plant's `_worstLimiting` — the monotone minimum of its limiting
 *      satisfaction over its whole life — which is what makes farming
 *      reward your worst moment rather than your average. A plant nursed
 *      back from a drought looks perfectly healthy at harvest and still
 *      grades badly, and that is not recoverable from the smoothed vigor
 *      after the fact.
 *   2. **Mint through `StuffApi.clone` and stamp through `CraftedMixin`.**
 *      The maker derives from the execution context and is never a
 *      parameter — crafting's rule, honoured rather than re-invented.
 *   3. **Debit the bed, then destruct the plant, then capture.** The bed
 *      has to be read while the plant is still seated (that is what makes
 *      `captureHostOf` resolve to the right host), and the capture has to
 *      be last so it records the finished state.
 *
 * A harvest ENDS the plant. There is no re-fruiting in v1: the bed gets
 * its place back and the soil is poorer, which is the loop phase 2 is
 * after. Perennials are a later question.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import { AdvancementApi } from '../../../api/advancement';
import { WorldClockApi } from '../../../api/worldclock';
import { ExecutionContextApi } from '../../../api/execution-context';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { Grade, type GradeBand } from '../../../lib/craft/Grade';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Container } from '../../../lib/spatial/Container';
import Plant from '../../Plant';

const TOPIC = 'act.deed';

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

interface HarvestModel extends CommandModel {
  target: MqlOneResult;
}

export default class HarvestController extends CommandController<HarvestModel> {
  async execute(model: HarvestModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target.stuff;

    if (!named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    if (!(named instanceof Plant)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(named)} isn't a plant.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-plant',
        detail: `${named.getPresentation()} is not a plant`,
      });
      return;
    }
    const plant = named;

    const cropPath = plant.getHarvestTemplatePath();
    if (!cropPath) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(plant)} isn't something you harvest.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-harvestable',
        detail: `${plant.getPresentation()} yields no crop`,
      });
      return;
    }

    // Refuse an immature plant NAMING the stage, so the player learns what
    // they are waiting for rather than being told "no".
    if (!plant.isHarvestable()) {
      const stage = plant.getGrowthStage();
      const dead = plant.getConditionBand() === 'dead';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          dead
            ? Mml.compose`${Mml.thing(plant)} is dead. There is nothing to take.`
            : Mml.compose`${Mml.thing(plant)} isn't ready — it is still ${stage}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: dead ? 'plant-dead' : 'not-mature',
        detail: dead
          ? `${plant.getPresentation()} is dead`
          : `${plant.getPresentation()} is ${stage}, not mature`,
      });
      return;
    }

    // (1) Read the verdict BEFORE anything changes. The worst moment is
    // the measure, and destructing the plant would take it with them.
    const band = this.bandFor(plant.getWorstLimiting());
    const bed = plant.getBed();

    // (2) Mint and stamp.
    let crop: Stuff;
    try {
      crop = await StuffApi.clone<Stuff>(cropPath);
    } catch (err) {
      console.warn(`HarvestController: could not mint '${cropPath}':`, err);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Something goes wrong as you reach for it.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'mint-failed',
        detail: `could not clone ${cropPath}`,
      });
      return;
    }

    if (MixinApi.isCrafted(crop)) {
      // The maker is NEVER a parameter — it derives from who is acting.
      const maker =
        (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? giver;
      crop.stamp({
        maker: maker.getTemplatePath() ?? '',
        grade: Grade.of(band),
        recipe: cropPath,
        craftedAt: this.nowSeconds(),
      });
    }

    if (MixinApi.isContainable(crop) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(crop as Stuff & Containable, giver as Stuff & Container);
    }

    // (3) Export the nitrogen while the plant is still seated, then end
    // it, then capture. A crop takes fertility away with it — that is the
    // whole reason `feed` exists.
    const draw = plant.getNutrientDraw();
    if (bed && draw > 0) bed.drawNutrient(draw);

    const difficulty = plant.transplantDifficulty();
    const presentation = plant.getPresentation();
    await StuffApi.destruct(plant);

    try {
      await PersistableApi.captureHostOf(bed ?? crop);
    } catch (err) {
      console.warn('HarvestController: capture after harvesting failed:', err);
    }

    try {
      await AdvancementApi.recordDeed(giver, {
        discipline: 'agriculture',
        difficulty,
        outcome: 'success',
      });
    } catch (err) {
      console.warn('HarvestController: recording the deed failed:', err);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You take ${Mml.thing(crop)} off ${presentation}, and what is left of the plant comes away with it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} harvests ${Mml.thing(crop)}.`)
      .send();
  }

  /**
   * Map the worst limiting satisfaction to a quality band. Ascending
   * floors, so a plant that was never meaningfully short of anything
   * earns `masterful` and one bad fortnight costs a band permanently.
   */
  private bandFor(worst: number): GradeBand {
    if (worst >= dial(AppSettingKeys.husbandryGradeMasterfulAt, 0.95)) {
      return 'masterful';
    }
    if (worst >= dial(AppSettingKeys.husbandryGradeExceptionalAt, 0.8)) {
      return 'exceptional';
    }
    if (worst >= dial(AppSettingKeys.husbandryGradeFineAt, 0.6)) return 'fine';
    if (worst >= dial(AppSettingKeys.husbandryGradeFairAt, 0.35)) return 'fair';
    return 'poor';
  }

  /** Game-seconds now, or 0 when no clock is running (tests / pre-boot). */
  private nowSeconds(): number {
    try {
      return WorldClockApi.getNow().rawValue();
    } catch {
      return 0;
    }
  }
}
