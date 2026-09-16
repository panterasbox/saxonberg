/**
 * MillController — `mill <grain> [<extraction>]`.
 *
 * ## ⭐⭐ The two rungs differ in a SLOT, not in a number
 *
 * The obvious way to build a capital ladder is "the mill is 40× faster".
 * That is a number, and a number is not a decision — you would take the
 * faster one every time and there would be nothing to think about.
 *
 * What the mill actually buys is **your time back**, and the shipped
 * engagement vocabulary says it exactly:
 *
 *  - a **quern** claims your `hands` for the whole grind. `EngagedMixin`
 *    refuses every other hands act until it finishes, so you are
 *    standing there cranking and you can do nothing else. That is the
 *    bottom rung's real cost.
 *  - a **water mill** claims **nothing of yours**. You set it going and
 *    leave; the river turns the stones whether you are in the room or
 *    not, and the sacks are waiting where the mill is when it finishes.
 *
 * `trade-fuel`'s `char` is the precedent one rung down: it holds
 * `attention` rather than `hands`, because a burn is *watched, not
 * held*. A mill is not even watched.
 *
 * ⚠ **Risk 16 resolved by reading the code, not by inventing a fourth
 * engagement kind.** `SchedulerRegistry.start` throws outright on an
 * empty slot set (`'engagement declares an empty slots set'`), so a
 * `ManualBuildStep` with `slots: []` is not available. The compliant
 * shape the plan named is the one taken: `WorldClockApi.after` on the
 * game clock — the same path the script interpreter's `wait` rides.
 * That is *better* than an engagement here, because it does not depend
 * on the actor existing at all.
 *
 * ⚠⚠ The completion is a **module-level function**. A controller is one
 * ephemeral clone per execution, destructed the moment `execute`
 * returns; a grind runs for game-minutes. A completion calling back into
 * `this` would run on a destroyed Stuff, the proxy would answer with a
 * silent no-op, and the flour would simply never appear. Found by
 * driving in the mining acts; not repeated here.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type {
  Comminuting,
  ComminutionPlan,
} from '@saxonberg/server/mud/lib/craft/Comminuting';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';

const TOPIC = 'act.deed';

/** Tags a mill will take as input. */
const GRINDABLE = ['grain', 'malt'];

interface MillModel extends CommandModel {
  grain?: Stuff;
  /** ⭐ The stones, resolved by the BINDER off the view's arg. */
  mill?: Stuff;
  extraction?: number;
}

/** What is going in: a tangible sack of crop, or a bulk holder's matter. */
interface Charge {
  kg: number;
  materialPath: string;
  gradeBand: string;
  /** Drain this much from the source, or destruct it when null. */
  drainL: number | null;
}

export default class MillController extends CommandController<MillModel> {
  async execute(model: MillModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐⭐ Read, never hunted. The view declares `mill` with an MQL
    // default (`reachable:[mixin.ComminutingMixin]`), so the binder
    // resolves it exactly as it resolves the grain — and a room with two
    // sets of stones becomes addressable for free.
    const mill = model.mill ?? null;
    if (mill === null || !MixinApi.isComminuting(mill)) {
      this.decline(
        context,
        Mml.compose`There are no stones here to grind with.`,
        'no-mill',
      );
      return;
    }
    if (mill.isGrinding()) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(mill)} is already turning. Wait for it.`,
        'already-milling',
      );
      return;
    }

    const source = model.grain ?? null;
    if (source === null) {
      this.decline(context, Mml.compose`Mill what?`, 'no-input');
      return;
    }
    const charge = this.chargeFrom(source);
    if (charge === null) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(source)} is not grain, and the stones will not take it.`,
        'not-grindable',
      );
      return;
    }

    // ⭐ A mill with no water. It has no rate of its own, so there is
    // nothing to fall back to — and saying so is the honest failure,
    // because "it ground very slowly" would be a lie about a building.
    const rate = mill.throughputNow();
    if (!(rate > 0)) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(mill)} will not turn. There is nothing driving it.`,
        'no-power',
      );
      return;
    }

    const plan = mill.planComminution(
      {
        kg: charge.kg,
        materialPath: charge.materialPath,
        gradeBand: charge.gradeBand,
      },
      model.extraction,
    );
    const grindMs = mill.grindMs(charge.kg);
    const powered = mill.kgPerMinPerKw > 0;

    mill.setGrinding(true);
    const makerPath =
      (giver as unknown as { getIdentityPath?(): string }).getIdentityPath?.() ??
      '';

    if (powered) {
      // ⭐⭐ THE MILL HOLDS NOTHING OF YOURS. No engagement at all — the
      // game clock carries it, so the driver may walk out, log off, or
      // start something else, and the flour is here when they come back.
      WorldClockApi.after(
        Quantity.of(grindMs / 1000, 's'),
        () => {
          void finishGrind(mill, source, charge, plan, makerPath);
        },
        { host: mill as unknown as Stuff, tag: 'mill-grind' },
      );
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You tip ${Mml.thing(source)} into the hopper and let in the water. The stones take up their turn, and you are free to go — they do not need you.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} sets the stones turning.`,
        )
        .send();
      return;
    }

    // ⭐⭐ THE QUERN HOLDS YOUR HANDS. Every other hands act is refused
    // until it finishes — the shipped slot rule, not new code.
    if (!MixinApi.isEngaged(giver)) {
      await finishGrind(mill, source, charge, plan, makerPath);
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: grindMs,
      onComplete: () => {
        void finishGrind(mill, source, charge, plan, makerPath);
      },
      onAbort: () => {
        // Nothing was mutated — the matter is still in the sack.
        mill.setGrinding(false);
      },
      host: mill as unknown as Stuff,
    });
    const result = SchedulerApi.start(step);
    if (!result.ok) {
      mill.setGrinding(false);
      this.decline(
        context,
        Mml.compose`Your hands are already full.`,
        'engagement-conflict',
      );
      return;
    }
    if (result.status !== 'completed-sync') context.note(result.note);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You feed ${Mml.thing(source)} into the eye of the stone a handful at a time and lean on the handle. It is going to take a while, and both your hands are on it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} settles down to the quern.`)
      .send();
  }

  /**
   * What is going in. Two shapes, because grain arrives both ways: a
   * discrete `Crop` sack off a field, and bulk in a holder (the malt
   * sack off the distribution counter).
   */
  private chargeFrom(source: Stuff): Charge | null {
    // Bulk first — a Sack of malt is also Tangible, and its interior is
    // what we want rather than its tare.
    if (MixinApi.isBulkable(source) && source.hasInteriorBulk()) {
      const slot = BulkableApi.slotFor(source, undefined);
      const material = slot?.getMaterial() ?? null;
      if (slot && material && hasAnyTag(material, GRINDABLE)) {
        const litres = slot.getAmount().rawValue();
        if (litres <= 0) return null;
        const density = material.getDensity().rawValue() || 600;
        return {
          kg: litres * (density / 1000),
          materialPath: material.getTemplatePath() ?? '',
          gradeBand: MixinApi.isGraded(source) ? source.getGradeBand() : '',
          drainL: litres,
        };
      }
      return null;
    }
    if (!MixinApi.isTangible(source)) return null;
    const material = source.getMaterial();
    if (!material || !hasAnyTag(material, GRINDABLE)) return null;
    const kg = source.getMass().rawValue();
    if (!(kg > 0)) return null;
    return {
      kg,
      materialPath: material.getTemplatePath() ?? '',
      gradeBand: MixinApi.isGraded(source) ? source.getGradeBand() : '',
      drainL: null,
    };
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

function hasAnyTag(material: Material, tags: readonly string[]): boolean {
  return tags.some((t) => material.hasTag(t));
}

/**
 * ⚠⚠ A MODULE function, never a method. The controller clone is
 * destructed when `execute` returns and a grind runs for game-minutes; a
 * completion that called back into it would no-op on a dead proxy and
 * the flour would silently never appear.
 *
 * ⭐ The sacks land **in the mill's room**, not in the driver's hands.
 * At a water mill the driver may be a valley away by now, which is the
 * whole point of the rung — so the flour waits where the mill is.
 */
async function finishGrind(
  mill: Stuff & Comminuting,
  source: Stuff,
  charge: Charge,
  plan: ComminutionPlan,
  makerPath: string,
): Promise<void> {
  try {
    const room = (mill as unknown as { getContainer(): Stuff | null })
      .getContainer();
    const landing =
      room !== null && MixinApi.isContainer(room)
        ? (room as Stuff & Container)
        : null;

    // Consume the input first — conservation before creation, so a
    // failure leaves the grain rather than doubling it.
    if (!source.isDestroyed()) {
      if (charge.drainL !== null && MixinApi.isBulkable(source)) {
        const slot = BulkableApi.slotFor(source, undefined);
        if (slot) slot.setAmount(Quantity.of(0, 'L'));
      } else {
        await StuffApi.destruct(source);
      }
    }

    // The product, less the toll.
    const keptL = plan.productL - plan.tollL;
    if (keptL > 0 && mill.productVessel) {
      await fill(
        mill.productVessel,
        plan.productMaterial,
        keptL,
        plan,
        makerPath,
        landing,
        (plan.productKg - plan.tollKg),
      );
    }
    // The residue — bran is a real good, not waste.
    if (plan.residueL > 0 && mill.residueVessel) {
      await fill(
        mill.residueVessel,
        plan.residueMaterial,
        plan.residueL,
        null,
        makerPath,
        landing,
        plan.residueKg,
      );
    }
    // ⭐ The multure. A tenth stays here and the miller sells it.
    if (plan.tollL > 0 && mill.tollBinPath && landing) {
      const bin = landing
        .getContents()
        .find(
          (c) =>
            (c as unknown as Stuff).getTemplatePath() === mill.tollBinPath,
        ) as Stuff | undefined;
      if (bin && MixinApi.isBulkable(bin)) {
        const slot = BulkableApi.slotFor(bin, undefined);
        if (slot) {
          const held = slot.getAmount().rawValue();
          slot.setAmount(Quantity.of(held + plan.tollL, 'L'));
        }
      }
    }

    // ⚠ The scene is composed from the MILL, not from the room: a
    // `Location` is not `Containable`, and `Scene.toPeers` requires an
    // actor that is — it threw `Scene.toPeers requires the actor to be
    // Containable` every completion, which the tests surfaced as noise
    // beside a green run. The mill is a Thing standing in the room and
    // is the honest speaker anyway: it is the stones that fall quiet.
    if (landing && !mill.isDestroyed()) {
      MessageApi.scene(mill as unknown as Stuff)
        .topic(TOPIC)
        .toPeers(
          Mml.compose`The stones run empty and the last of the meal works out from under them.`,
        )
        .send();
    }
  } finally {
    mill.setGrinding(false);
  }
}

/** Clone a sack, fill it, stamp the grade, the mark and the payload. */
async function fill(
  vesselPath: string,
  materialPath: string,
  litres: number,
  plan: ComminutionPlan | null,
  makerPath: string,
  landing: (Stuff & Container) | null,
  kg: number,
): Promise<void> {
  const sack = await StuffApi.clone<Stuff>(vesselPath);
  const slot = BulkableApi.slotFor(sack, undefined);
  if (slot) {
    if (materialPath) {
      const material = await StuffApi.singleton<Material>(materialPath);
      slot.setMaterial(material);
    }
    slot.setAmount(Quantity.of(litres, 'L'));
    if (plan !== null) {
      // ⭐ The extraction, stamped continuously: the composition says
      // what this flour is made of and `cure.moisture` says how well it
      // will keep. Two settings a hundredth apart are different matter.
      slot.setPayload({
        ...(slot.getPayload() ?? {}),
        composition: plan.composition,
        cure: plan.cure,
      });
    }
  }
  if (MixinApi.isTangible(sack)) {
    // Tare plus what is in it — a full sack weighs what a full sack weighs.
    const tare = sack.getMass().rawValue();
    sack.setMass(Quantity.of(tare + Math.max(0, kg), 'kg'));
  }
  if (plan !== null && MixinApi.isGraded(sack)) {
    sack.setGradeBand(plan.grade.getBand());
  }
  if (makerPath && MixinApi.isCrafted(sack)) {
    sack.setMaker(makerPath);
  }
  if (landing) {
    await ContainmentApi.move(sack as Stuff & Containable, landing);
  }
}
