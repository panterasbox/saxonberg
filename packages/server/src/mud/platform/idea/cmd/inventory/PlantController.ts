/**
 * PlantController — `plant <seed> in <pot>`, and `plant <seed>` on ground
 * (`--at <part>`, `--with <drill>`).
 *
 * ⭐⭐ **Input and output** (controllers-are-io D11). **Two shapes, one verb**
 * (cover build D4): named into a pot or a bed, a seed becomes one plant in the
 * slot (`CultivableMixin.plantPlanFor`); with no pot, or naming soil-bearing
 * ground that holds no slot (a field), the seed is broadcast
 * (`SoilMixin.sowPlanFor`). This file picks which object to ask, and words what
 * it says.
 */

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { PLANT_SLOT } from '../../../../lib/husbandry/Cultivable';
import type { PlantBegin, PlantDone, PlantRefusal } from '../../../../lib/husbandry/Plantable';
import type { ActPlan } from '../../../../lib/craft/ActPlan';
import type { PartChoices } from '../../../../lib/husbandry/Soil';
import type { Stuff } from '../../../../lib/stuff/Stuff';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

interface PlantModel extends CommandModel {
  seed: MqlOneResult;
  /** Absent when sowing the ground you stand on. */
  pot?: MqlOneResult;
  /** `--at <part>` — which part of a divided field to sow (D5). */
  part?: MqlOneResult;
  /** `--with <drill>` — sows in rows at its own seed rate. */
  drill?: MqlOneResult;
}

export default class PlantController extends EngagedActController<PlantModel> {
  async execute(model: PlantModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const seed = model.seed.stuff;
    const target = model.pot?.stuff ?? null;

    if (!seed) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.seed.raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'seed', query: model.seed.raw });
      return;
    }
    // ⭐ The CAPABILITY, not the `Seed` class. `mustBePlantable` on the
    // spec checks this exact predicate — one source of truth, so the
    // menu and the verb cannot disagree about what can be planted.
    if (!MixinApi.isPlantable(seed)) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(seed)} isn't a seed.`,
        'not-a-seed',
        `${seed.getPresentation()} is not a seed`,
      );
      return;
    }
    const potRaw = model.pot?.raw ?? '';
    if (!target && potRaw.trim() !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${potRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'pot', query: potRaw });
      return;
    }
    // ⭐ No pot named, or soil-bearing GROUND named: the ground is asked.
    const ground: Stuff | null =
      target ?? (MixinApi.isContainable(giver) ? giver.getContainer() : null);
    let plan: ActPlan<PlantBegin, PlantDone, PlantRefusal> | PlantRefusal | PartChoices;
    if (
      ground &&
      MixinApi.isSoil(ground) &&
      MixinApi.isContainer(ground) &&
      !MixinApi.isCultivable(ground)
    ) {
      const patchRaw = model.part?.raw ?? '';
      const patch = model.part?.stuff ?? null;
      if (!patch && patchRaw.trim() !== '') {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You don't see any '${patchRaw}' here.`)
          .send();
        context.note({ kind: 'empty-result', field: 'patch', query: patchRaw });
        return;
      }
      const drill = model.drill?.stuff ?? null;
      plan = await ground.sowPlanFor({
        by: giver,
        seed,
        part: patch && MixinApi.isSoil(patch) ? patch : null,
        drill: drill && MixinApi.isTool(drill) && drill.hasCapability('drilling') ? drill : null,
      });
    } else if (!target) {
      plan = { ok: false, reason: 'no-ground', facts: {} };
    } else if (!MixinApi.isCultivable(target)) {
      this.decline(
        context,
        Mml.compose`You can't plant anything in ${Mml.thing(target)}.`,
        'not-a-pot',
        `${target.getPresentation()} is not a pot`,
      );
      return;
    } else {
      plan = await target.plantPlanFor({ by: giver, seed });
    }
    if (plan.ok === 'choose') {
      // ⭐ The ground answered its fields (controller-liquidity D8): this
      // controller refuses with the list; an asking one would prompt.
      const line = this.partLine(plan);
      this.decline(context, Mml.fromMarkup(line), plan.reason, line);
      return;
    }
    if (!plan.ok) {
      PlantController.say(this, context, plan);
      return;
    }
    await this.engageAct(context, plan, {
      beginSelf: (f) => PlantController.beginSelf(f),
      beginPeers: (f) =>
        f.drill
          ? Mml.compose`${Mml.actor(giver)} works a seed drill down the ground.`
          : Mml.compose`${Mml.actor(giver)} walks the ground, broadcasting seed.`,
      onRefused: (r) => PlantController.refusalWords(r),
      onDone: (f) => PlantController.doneWords(f, giver),
    });
  }

  /** ⚠ `slot-occupied` is its own note kind, not a rejection. */
  private static say(
    self: PlantController,
    context: CommandContext,
    r: PlantRefusal,
  ): void {
    if (r.reason === 'slot-occupied') {
      MessageApi.scene(context.commandGiver)
        .topic(TOPIC)
        .toSelf(PlantController.refusalWords(r))
        .send();
      context.note({
        kind: 'slot-occupied',
        host: MessageApi.refOf(r.facts.target!),
        slot: PLANT_SLOT,
      });
      return;
    }
    self.decline(
      context,
      PlantController.refusalWords(r),
      r.reason,
      r.facts.zoned?.detail ?? r.reason,
    );
  }

  private static beginSelf(f: PlantBegin): Composed {
    if (f.drill) {
      return f.part
        ? Mml.compose`You take ${Mml.thing(f.drill)} down ${Mml.thing(f.part)}, the coulters laying the seed from ${Mml.thing(f.seed)} in rows.`
        : Mml.compose`You take ${Mml.thing(f.drill)} down the ground, the coulters laying the seed from ${Mml.thing(f.seed)} in rows.`;
    }
    return f.part
      ? Mml.compose`You walk ${Mml.thing(f.part)}, casting seed from ${Mml.thing(f.seed)} in wide arcs.`
      : Mml.compose`You walk the ground, casting seed from ${Mml.thing(f.seed)} in wide arcs.`;
  }

  private static refusalWords(r: PlantRefusal): Composed {
    const f = r.facts;
    switch (r.reason) {
      case 'no-ground':
        return Mml.compose`Plant it in what? Name a pot or a bed, or stand on ground that will take seed.`;
      case 'land-use-forbids-cultivation':
        return Mml.compose`Nothing may be grown on this ground — it is zoned for ${f.zoned!.summary}.`;
      case 'not-held':
        return Mml.compose`This is not your ground to sow.`;
      case 'not-a-part-here': {
        const what = f.part!.presentationPhrase().definite();
        return Mml.fromMarkup(
          `${what.charAt(0).toUpperCase()}${what.slice(1)} is not a part of ${f.target!.presentationPhrase().definite()}.`,
        );
      }
      case 'ground-refuses-sowing':
        return Mml.fromMarkup(f.line!);
      case 'other-crop-stands':
        return Mml.compose`${Mml.thing(f.standing!)} already stands here. Grub it out before you sow anything else.`;
      case 'seed-names-no-plant':
        return Mml.compose`${Mml.thing(f.seed!)} doesn't seem to be viable.`;
      case 'not-broadcast':
        return Mml.compose`${Mml.thing(f.seed!)} is planted one at a time, in a pot or a bed — not broadcast over a field.`;
      case 'too-little-seed':
        return Mml.compose`There is not enough in ${Mml.thing(f.seed!)} to sow anything.`;
      case 'part-sown':
        return Mml.compose`${Mml.thing(f.part!)} is sown already, edge to edge.`;
      case 'ground-full':
        return Mml.compose`It is sown already, edge to edge.`;
      case 'no-soil':
        return Mml.compose`${Mml.thing(f.target!)} has no soil in it. Pour some in first.`;
      case 'slot-occupied':
        return Mml.compose`${Mml.thing(f.target!)} already has something growing in it.`;
      case 'pot-too-small':
        return Mml.compose`${Mml.thing(f.target!)} is too small for that to grow in.`;
      case 'walked-off':
        return Mml.compose`Nothing came of it — you are not standing on it any more.`;
      default: {
        const unworded: never = r.reason;
        throw new Error(`PlantController: no words for '${String(unworded)}'`);
      }
    }
  }

  private static doneWords(f: PlantDone, giver: Stuff): { self: Composed; peers: Composed } {
    if (f.kind === 'potted') {
      return {
        self: Mml.compose`You press the seed into the soil. ${Mml.thing(f.plant)} will grow here.`,
        peers: Mml.compose`${Mml.actor(giver)} plants a seed in ${Mml.thing(f.target)}.`,
      };
    }
    const at = f.part ? Mml.compose` at ${Mml.thing(f.part)}` : Mml.compose``;
    return {
      self: f.phrase
        ? Mml.compose`The seed goes into the ground${at}, and ${Mml.thing(f.crop)} is sown ${f.phrase}.`
        : Mml.compose`The seed goes into the ground${at}.`,
      peers: Mml.compose`${Mml.actor(giver)} finishes a cast of seed.`,
    };
  }
}
