/**
 * MillController — `mill <grain> [<extraction>] [at <stones>]`.
 *
 * ## ⭐⭐ The two rungs differ in a SLOT, not in a number
 *
 * What a mill buys is **your time back**, and the engagement vocabulary
 * says it exactly: a **quern** claims your `hands` for the whole grind; a
 * **water mill** claims nothing of yours — you set it going and leave, and
 * the sacks are waiting where the mill is when it finishes.
 *
 * ⭐⭐⭐ **The stones decide** (controller-liquidity W10, C17). Which arm a
 * charge takes (a feed through the extraction, anything else through a
 * recipe), whether the stones turn, how long, how hard and what lands are
 * all `Comminuting.millPlanFor`'s — one engine, on the instrument, so a
 * rewritten controller changes the words and nothing in the world. ⭐ The
 * hopper takes the charge as driven stones start: the water path used to
 * leave the grain in your hands, free to spend while the flour came.
 *
 * This file is the words.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { CraftingDecline } from '@saxonberg/server/mud/lib/craft/CraftingDecline';
import type {
  MillDone,
  MillRefusal,
} from '@saxonberg/server/mud/lib/craft/Comminuting';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

type Composed = ReturnType<typeof Mml.compose>;

const TOPIC = 'act.deed';

interface MillModel extends CommandModel {
  grain?: MqlOneResult;
  /** ⭐ The stones, resolved by the BINDER off the view's arg. */
  mill?: MqlOneResult;
  extraction?: number;
}

export default class MillController extends CommandController<MillModel> {
  async execute(model: MillModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐⭐ Read, never hunted: the view's `mill` arg defaults to
    // `reachable:[mixin.ComminutingMixin]`, so a second set of stones is
    // addressable (`mill wheat at the quern`).
    const mill = model.mill?.stuff ?? null;
    if (mill === null || !MixinApi.isComminuting(mill)) {
      this.decline(context, Mml.compose`There are no stones here to grind with.`, 'no-mill');
      return;
    }
    const source = model.grain?.stuff ?? null;
    if (source === null) {
      this.decline(context, Mml.compose`Mill what?`, 'no-input');
      return;
    }
    const plan = await mill.millPlanFor(giver, source, model.extraction);
    if (plan === null) {
      this.decline(context, MillController.refusalWords({ ok: false, reason: 'not-grindable', facts: { mill, source } }), 'not-grindable');
      return;
    }
    if (plan.ok === false) {
      if (plan.reason === 'craft-declined' && plan.facts.craft) {
        this.decline(context, MillController.refusalWords(plan), plan.facts.craft.reason, plan.facts.craft.detail ?? '');
        return;
      }
      this.decline(context, MillController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f) =>
        Mml.compose`You feed ${Mml.thing(f.source)} into the eye of the stone a handful at a time and lean on the handle. It is going to take a while, and both your hands are on it.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} settles down to the quern.`,
      onRefused: (r) => MillController.refusalWords(r),
      onDone: (f) => MillController.doneWords(f, giver),
    });
  }

  /** The words for each refusal the stones can give. */
  protected static refusalWords(r: MillRefusal): Composed {
    const { mill, source } = r.facts;
    switch (r.reason) {
      case 'already-milling':
        return Mml.compose`${Mml.thing(mill)} is already turning. Wait for it.`;
      case 'no-power':
        return Mml.compose`${Mml.thing(mill)} will not turn. There is nothing driving it.`;
      case 'not-grindable':
        return Mml.compose`${Mml.thing(source)} is not grain, and the stones will not take it.`;
      case 'grain-gone':
        return Mml.compose`The grain is not where it was. The stones run empty.`;
      case 'craft-declined':
        return r.facts.craft
          ? Mml.compose`${CraftingDecline.messageFor(r.facts.craft)}`
          : Mml.compose`The stones will not take it.`;
      default: {
        const never: never = r.reason;
        return Mml.compose`${String(never)}`;
      }
    }
  }

  /** The words for a grind that landed (or, at driven stones, began). */
  protected static doneWords(
    f: MillDone,
    giver: Stuff,
  ): { self?: Composed | null; peers?: Composed | null } | null {
    switch (f.kind) {
      case 'set-going':
        return {
          self: Mml.compose`You tip ${f.sourceName} into the hopper and let in the water. The stones take up their turn, and you are free to go — they do not need you.`,
          peers: Mml.compose`${Mml.actor(giver)} sets the stones turning.`,
        };
      case 'ground':
        return null;
      case 'recipe':
        return {
          // A solid is swept up off the bed; a grind that fills a vessel
          // you brought is caught in it — say which happened.
          self: f.caught
            ? Mml.compose`You put ${f.sourceName} through the stones and catch what comes off in ${Mml.thing(f.output)}.`
            : Mml.compose`You put ${f.sourceName} through the stones and sweep ${Mml.thing(f.output)} up off the bed.`,
          peers: Mml.compose`${Mml.actor(giver)} grinds something down at the stones.`,
        };
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  private decline(context: CommandContext, prose: Composed, reason: string, detail = reason): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
