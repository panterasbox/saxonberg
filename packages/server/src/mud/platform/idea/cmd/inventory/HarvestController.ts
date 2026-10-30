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

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { AppApi } from '../../../../api/app';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import { WorldClockApi } from '../../../../api/worldclock';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Grade, type GradeBand } from '../../../../lib/craft/Grade';
import { Quantity } from '../../../../lib/quantity';
import type { Growing } from '../../../../lib/husbandry/Growing';
import type { Soil } from '../../../../lib/husbandry/Soil';
import type { Tooled } from '../../../../lib/craft/Tooled';
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
  /**
   * The instrument, when the plant asks for one (`harvestTool`). The
   * view's `default:` binds the first reachable thing with the
   * capability; the controller never hunts.
   */
  tool?: MqlOneResult;
}

export default class HarvestController extends EngagedActController<HarvestModel> {
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
      // ⭐ The ground's rule, for a named plant: `harvest cane` in a field of
      // stands means a RIPE stand when one stands there. The binder takes
      // the first match, and it refused "has not filled its set" while
      // ripe cane stood beside it (the sugar drive: an estate's cutters,
      // seventy-eight times). Only the same KIND is a substitute.
      plant = named.isHarvestable() ? named : (named.ripeSibling() ?? named);
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

    // A plant that names its tool is cut with it — a coppice stool comes
    // off with a billhook, not by hand. The plant says WHICH capability;
    // the view's default found the candidate; this only checks it.
    const need = plant.getHarvestTool();
    // ⭐ An AREA crop is cut by hand or with a tool, never refused for
    // want of one: the tool sets the swath, bare hands cut a little
    // (cover build D3).
    if (need && !plant.isAreaCrop()) {
      const tool = model.tool?.stuff ?? null;
      if (!tool || !MixinApi.isTool(tool) || !tool.hasCapability(need)) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`You need something that cuts to take ${Mml.thing(plant)} — a billhook, or an axe.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'needs-tool',
          detail: `${plant.getPresentation()} is cut with a '${need}' tool`,
        });
        return;
      }
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

    if (plant.isAreaCrop()) {
      this.engageSwath(context, plant, cropPath, model.tool?.stuff ?? null);
      return;
    }

    // (1) Read the verdict BEFORE anything changes — the window closes
    // with the pick, and an ended annual takes its reading with it. The
    // Discipline is read here for the same reason: an annual is gone by
    // the time the deed is credited.
    const band = bandFor(plant.getWorstLimiting());
    const discipline = plant.getDiscipline();
    const bed = plant.getBed();
    const polycarp = plant.isPolycarp();
    // ⭐ The count comes from the LATCH, not the profile: what was set
    // is a fact about this episode (and about whether anything worked
    // the bloom), and the pick is weeks after the set.
    const count = polycarp ? plant.getFruitSetCount() : 1;

    // (2) Mint and stamp — the whole set for a polycarp, one for an
    // annual. The maker is NEVER a parameter; it derives from who acts.
    const maker =
      (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? giver;
    const crops: Stuff[] = [];
    try {
      for (let i = 0; i < count; i++) {
        // Made FROM the plant: a gardener's crop is the gardener's.
        const crop = await StuffApi.clone<Stuff>(cropPath, undefined, { madeFrom: plant });
        if (MixinApi.isCrafted(crop)) {
          crop.stamp({
            maker: maker.getTemplatePath() ?? '',
            grade: Grade.of(band),
            recipe: cropPath,
            craftedAt: nowSeconds(),
          });
        } else if (MixinApi.isGraded(crop)) {
          // A merely-graded crop (no maker's mark) still carries the
          // window's verdict.
          crop.setGrade(Grade.of(band));
        }
        if (MixinApi.isContainable(crop) && MixinApi.isContainer(giver)) {
          ContainmentApi.move(crop as Stuff & Containable, giver as Stuff & Container);
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
      if (MixinApi.isAdvancing(giver))
        await giver.creditDeed({
          discipline,
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
   * ⭐ **The area crop: one act cuts one swath** (cover build D3). The
   * swath belongs to the TOOL (`swathM2`), bare hands cut the
   * `husbandry.handSwathM2` dial, and the act occupies the hands for a
   * time that grows with the ground worked. Everything lands at
   * completion — a barge-in leaves the crop standing.
   */
  private engageSwath(
    context: CommandContext,
    plant: Stuff & Growing,
    cropPath: string,
    bound: Stuff | null,
  ): void {
    const tool: (Stuff & Tooled) | null =
      bound && MixinApi.isTool(bound) ? bound : null;
    const hand = dial(AppSettingKeys.husbandryHandSwathM2, 2);
    const swathM2 = tool && tool.getSwathM2() > 0 ? tool.getSwathM2() : hand;
    const presentation = plant.getPresentation();
    this.engageAct(context, {
      durationMs: Math.round(3000 + swathM2 * 60),
      cost: 6,
      beginSelf: tool
        ? Mml.compose`You bend to ${presentation} with ${Mml.thing(tool)} and cut.`
        : Mml.compose`You bend to ${presentation} and pull it by hand.`,
      beginPeers: Mml.compose`${Mml.actor(context.commandGiver)} bends to ${presentation} and cuts.`,
      onComplete: () => {
        // ⚠⚠ A MODULE function: this controller is destructed the
        // moment `execute` returns (see `TapActController`).
        void landSwath(context, plant, cropPath, swathM2);
      },
    });
  }
}

/**
 * Map the worst limiting satisfaction to a quality band. Ascending
 * floors, so a plant that was never meaningfully short of anything
 * earns `masterful` and one bad fortnight costs a band permanently.
 */
function bandFor(worst: number): GradeBand {
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
function nowSeconds(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

/**
 * The swath landed. ⚠ A module function over captured locals: the
 * controller that started it is already destructed.
 *
 * The cut is re-checked here because the world moved while the hands
 * worked: the harvester may have walked off, or somebody else may have
 * cut the last of it.
 */
async function landSwath(
  context: CommandContext,
  plant: Stuff & Growing,
  cropPath: string,
  swathM2: number,
): Promise<void> {
  const giver = context.commandGiver;
  if (giver.isDestroyed() || plant.isDestroyed()) return;
  const where = MixinApi.isContainable(giver) ? giver.getContainer() : null;
  const bed = plant.getBed();
  // ⭐ Compare where the crop STANDS, not its bed: a crop in a patched
  // field is rooted in its patch (field population D4), which nobody
  // stands inside — the field holds both the harvester and the crop.
  const standsIn = MixinApi.isContainable(plant) ? plant.getContainer() : null;
  if (!where || (standsIn as Stuff | null) !== where) {
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Nothing came of it — you are not standing in it any more.`)
      .send();
    return;
  }
  if (!plant.isHarvestable()) {
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`There is nothing left standing to cut.`)
      .send();
    return;
  }
  // ⭐ Whose crop it is is settled by the ground BEFORE anything is
  // minted — the take follows `madeFrom: plant`, so the plant's title
  // must already be right (cover build D6). Never a look path.
  try {
    if (bed && MixinApi.isSoil(bed)) await (bed as Stuff & Soil).ensureCropTitle();
  } catch (err) {
    console.warn('HarvestController: settling the crop title failed:', err);
  }
  if (giver.isDestroyed() || plant.isDestroyed()) return;

  // (1) The verdict and the Discipline BEFORE anything changes.
  const band = bandFor(plant.getWorstLimiting());
  const discipline = plant.getDiscipline();
  const presentation = plant.getPresentation();
  const sownM2 = plant.getSownAreaM2();
  const cut = plant.takeSwath(swathM2);
  if (cut.areaCut <= 0) return;

  // (2) Mint by the crop row's own mass; the remainder is carried on
  // the plant to the next swath, and the LAST swath makes up whatever
  // is left as one short good, so nothing is lost to rounding.
  const maker =
    (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? giver;
  let total = cut.kg + plant.getHarvestCarryKg();
  const crops: Stuff[] = [];
  let dropped = 0;
  try {
    while (total > 0) {
      const crop = await StuffApi.clone<Stuff>(cropPath, undefined, {
        madeFrom: plant,
      });
      const unit = MixinApi.isTangible(crop) ? crop.getMass().rawValue() : 0;
      if (!(unit > 0) || total < unit) {
        if (!cut.last) {
          await StuffApi.destruct(crop);
          break;
        }
        // The last of it: a short good of what is left.
        if (MixinApi.isTangible(crop) && unit > 0) crop.setMass(Quantity.of(total, 'kg'));
        total = 0;
      } else {
        total -= unit;
      }
      if (MixinApi.isCrafted(crop)) {
        crop.stamp({
          maker: maker.getTemplatePath() ?? '',
          grade: Grade.of(band),
          recipe: cropPath,
          craftedAt: nowSeconds(),
        });
      } else if (MixinApi.isGraded(crop)) {
        crop.setGrade(Grade.of(band));
      }
      // ⭐ What the harvester cannot carry is left lying where they
      // stand — cut cane is piled in the row for the cart, not carried
      // off one armful per stroke.
      const carry =
        MixinApi.isContainer(giver) &&
        !(MixinApi.isLoadBearing(giver) && giver.wouldExceedCeiling(crop));
      if (MixinApi.isContainable(crop)) {
        ContainmentApi.move(
          crop as Stuff & Containable,
          (carry ? giver : where) as Stuff & Container,
        );
      }
      if (!carry) dropped++;
      crops.push(crop);
    }
  } catch (err) {
    console.warn(`HarvestController: could not mint '${cropPath}':`, err);
  }
  plant.setHarvestCarryKg(cut.last ? 0 : total);

  // (3) The nitrogen goes with the crop, in proportion to what was cut.
  const draw = plant.getNutrientDraw();
  if (bed && draw > 0 && sownM2 > 0) {
    bed.drawNutrient((draw * cut.areaCut) / sownM2);
  }

  const polycarp = plant.isPolycarp();
  if (cut.last) {
    if (polycarp) plant.settleRatoon();
    else await StuffApi.destruct(plant);
  }

  try {
    if (bed) await PersistableApi.captureHostOf(bed);
    if (!plant.isDestroyed()) await PersistableApi.captureHostOf(plant);
  } catch (err) {
    console.warn('HarvestController: capture after a swath failed:', err);
  }

  try {
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline,
        difficulty: 'easy',
        outcome: 'success',
      });
    }
  } catch (err) {
    console.warn('HarvestController: recording the deed failed:', err);
  }

  const left = cut.last
    ? polycarp
      ? 'That is the last of it; the stools will come again.'
      : 'That is the last of it, cut down to the stubble.'
    : standingPhrase(sownM2 > 0 ? plant.standingAreaM2() / sownM2 : 0);
  const took =
    crops.length === 0
      ? Mml.compose`You cut a swath of ${presentation} and bind it — not yet enough to make up a load.`
      : crops.length === 1
        ? Mml.compose`You cut a swath of ${presentation} and make up ${Mml.thing(crops[0]!)}.`
        : Mml.compose`You cut a swath of ${presentation} and make up ${Mml.thing(crops[0]!)} — ${String(crops.length)} in all.`;
  const lying =
    dropped > 0
      ? dropped === crops.length
        ? ' You leave it lying in the row; you cannot carry more.'
        : ` You leave ${String(dropped)} lying in the row; you cannot carry more.`
      : '';
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(Mml.compose`${took}${lying} ${left}`)
    .toPeers(Mml.compose`${Mml.actor(giver)} cuts a swath of ${presentation}.`)
    .send();
}

/** How much of the crop still stands, in words. */
function standingPhrase(f: number): string {
  if (f >= 0.85) return 'Nearly all of it is still standing.';
  if (f >= 0.6) return 'Most of it is still standing.';
  if (f >= 0.4) return 'About half of it is still standing.';
  if (f >= 0.15) return 'Some of it is still standing.';
  return 'Only a strip of it is still standing.';
}
