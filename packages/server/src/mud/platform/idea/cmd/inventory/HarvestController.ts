/**
 * HarvestController — `harvest <plant>` / `pick <plant|ground>`.
 *
 * Two yield shapes, one verb (D1/D2):
 *
 *   - **An annual** (monocarp): mint the crop, END the plant, export the
 *     nitrogen. The shipped phase-1 flow, unchanged.
 *   - **A polycarp** (the fruit cycle): a RIPE plant gives its whole set
 *     (`fruitSetCount` clones), the cycle settles, and the plant keeps
 *     its place — the standing tap. The grade reads the CYCLE window
 *     (`_worstLimiting` re-seeds at the set), so each pick is graded by
 *     the keeping that made it, and the next cycle regrades clean.
 *
 * The three halves stay in order, because the ordering matters:
 *
 *   1. **Read the grade BEFORE anything changes.** It comes off the
 *      plant's `_worstLimiting` — the monotone minimum over the window
 *      (an annual's whole life; a polycarp's set → harvest) — which is
 *      what makes farming reward your worst moment rather than your
 *      average. A plant nursed back from a drought looks perfectly
 *      healthy at harvest and still grades badly.
 *   2. **Mint through `StuffApi.clone` and stamp.** A Crafted crop takes
 *      the full maker's mark (the maker derives from the execution
 *      context and is never a parameter — crafting's rule); a merely
 *      Graded one takes the band.
 *   3. **Debit the bed, then settle/end the plant, then capture.** The
 *      bed is read while the plant is still seated; the capture is last
 *      so it records the finished state. A ripe pick draws the FULL
 *      authored nitrogen — the whole set comes off at once, so there is
 *      nothing to pro-rate under ripe-only picking.
 *
 * **Ground-targeting**: naming a bed or pot resolves to its first
 * harvestable growing occupant, else its first growing occupant (so the
 * refusal names the stage), else refuses with "nothing is growing".
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { AppApi } from '../../../../api/app';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import { AdvancementApi } from '../../../../api/advancement';
import { WorldClockApi } from '../../../../api/worldclock';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Grade, type GradeBand } from '../../../../lib/craft/Grade';
import type { Growing } from '../../../../lib/husbandry/Growing';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Containable } from '../../../../lib/spatial/Containable';
import type { Container } from '../../../../lib/spatial/Container';

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

    // ⭐ The CAPABILITY, not the `Plant` class — the same predicates the
    // spec declares (`requires: GrowingMixin|CultivableMixin`). Naming
    // the GROUND resolves to what grows in it: the first harvestable
    // occupant, else the first growing one (so the refusal names the
    // stage rather than saying "no").
    let plant: (Stuff & Growing) | null = null;
    if (MixinApi.isGrowing(named)) {
      plant = named;
    } else if (MixinApi.isCultivable(named)) {
      const growing = (named.getPlants() as Stuff[]).filter(
        (p): p is Stuff & Growing => MixinApi.isGrowing(p),
      );
      plant = growing.find((p) => p.isHarvestable()) ?? growing[0] ?? null;
      if (!plant) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`There's nothing growing in ${Mml.thing(named)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'nothing-growing',
          detail: `${named.getPresentation()} holds no growing plant`,
        });
        return;
      }
    } else {
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

    // Refuse an unready plant NAMING what it is waiting for: the stage
    // for an immature one, the ripening for a mature polycarp between
    // cycles, and the plain fact for a dead one.
    if (!plant.isHarvestable()) {
      const stage = plant.getGrowthStage();
      const dead = plant.getConditionBand() === 'dead';
      const unripe = !dead && plant.isPolycarp() && stage === 'mature';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          dead
            ? Mml.compose`${Mml.thing(plant)} is dead. There is nothing to take.`
            : unripe
              ? Mml.compose`${Mml.thing(plant)} has nothing ripe on it yet.`
              : Mml.compose`${Mml.thing(plant)} isn't ready — it is still ${stage}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: dead ? 'plant-dead' : unripe ? 'nothing-ripe' : 'not-mature',
        detail: dead
          ? `${plant.getPresentation()} is dead`
          : unripe
            ? `${plant.getPresentation()} has not filled its set`
            : `${plant.getPresentation()} is ${stage}, not mature`,
      });
      return;
    }

    // (1) Read the verdict BEFORE anything changes — the window closes
    // with the pick, and an ended annual takes its reading with it.
    const band = this.bandFor(plant.getWorstLimiting());
    const bed = plant.getBed();
    const polycarp = plant.isPolycarp();
    const count = polycarp
      ? Math.max(1, Math.floor(plant.getProfile()?.fruitSetCount ?? 1))
      : 1;

    // (2) Mint and stamp — the whole set for a polycarp, one for an
    // annual. The maker is NEVER a parameter; it derives from who acts.
    const maker =
      (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? giver;
    const crops: Stuff[] = [];
    try {
      for (let i = 0; i < count; i++) {
        const crop = await StuffApi.clone<Stuff>(cropPath);
        if (MixinApi.isCrafted(crop)) {
          crop.stamp({
            maker: maker.getTemplatePath() ?? '',
            grade: Grade.of(band),
            recipe: cropPath,
            craftedAt: this.nowSeconds(),
          });
        } else if (MixinApi.isGraded(crop)) {
          // A merely-graded crop (no maker's mark) still carries the
          // window's verdict.
          crop.setGrade(Grade.of(band));
        }
        if (MixinApi.isContainable(crop) && MixinApi.isContainer(giver)) {
          ContainmentApi.move(
            crop as Stuff & Containable,
            giver as Stuff & Container,
          );
        }
        crops.push(crop);
      }
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

    // (3) Export the nitrogen while the plant is still seated. A ripe
    // pick takes the FULL authored draw — the whole set comes off at
    // once, so there is nothing to pro-rate under ripe-only picking.
    const draw = plant.getNutrientDraw();
    if (bed && draw > 0) bed.drawNutrient(draw);

    // A routine pick must never grade `hard` — that would be a levelling
    // mill riding the fruit cycle. The annual keeps the root-disturbance
    // scale (ending a mature plant is real work).
    const difficulty = polycarp ? 'easy' : plant.transplantDifficulty();
    const presentation = plant.getPresentation();

    if (polycarp) {
      // The plant SURVIVES: settle the cycle so the next thriving
      // reconcile opens a fresh window (which re-seeds the verdict).
      plant.settleCycle();
    } else {
      await StuffApi.destruct(plant);
    }

    try {
      await PersistableApi.captureHostOf(bed ?? crops[0]!);
      // A polycarp is its own persistence host and just changed state.
      if (polycarp) await PersistableApi.captureHostOf(plant);
    } catch (err) {
      console.warn('HarvestController: capture after harvesting failed:', err);
    }

    try {
      await AdvancementApi.recordDeed(giver, {
        discipline: 'horticulture',
        difficulty,
        outcome: 'success',
      });
    } catch (err) {
      console.warn('HarvestController: recording the deed failed:', err);
    }

    const sample = crops[0]!;
    if (polycarp) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          count > 1
            ? Mml.compose`You pick ${Mml.thing(sample)} from ${presentation} — ${String(count)} in all — and it keeps its place.`
            : Mml.compose`You pick ${Mml.thing(sample)} from ${presentation}, and it keeps its place.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} picks ${Mml.thing(sample)} from ${presentation}.`,
        )
        .send();
    } else {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You take ${Mml.thing(sample)} off ${presentation}, and what is left of the plant comes away with it.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} harvests ${Mml.thing(sample)}.`)
        .send();
    }
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
