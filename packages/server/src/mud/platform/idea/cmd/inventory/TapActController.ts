/**
 * TapActController — the shared body of every take: **resolve what is
 * being tapped, ask it for a plan, engage the hands, and let it do the
 * work at completion.**
 *
 * ⭐⭐ The kernel owns the ACT and no verb. `milk`, `shear`, `gather`
 * (ranching), `rob` (apiculture) and `tap` (forestry) are their packs'
 * — each is a subclass naming one `tapKey()` and nothing else. The
 * controller cannot name a yield, a Discipline or a duration even if it
 * wanted to: all three come back from the host through the
 * {@link Tappable} protocol, which is what lets a kernel verb earn a
 * trade's competence without knowing the trade exists.
 *
 * ⚠ **The god-verb guard:** *if a new tap needs THIS FILE to branch on
 * what kind of tap it is, the design is wrong.* The five shipped
 * subclasses differ by one string.
 *
 * ## Why `inventory/`
 *
 * Taking a renewable yield off a living thing is the harvest family, and
 * `HarvestController` is its neighbour. Not `crafting/` — nothing is
 * made — and not a new category, which would be a module-category
 * invention for five verbs that already have homes.
 *
 * ## What it adds over `EngagedActController`
 *
 * The three things a take has that ground work does not: a **vessel**
 * (bound by the view, required or not *by the yield's shape*), a
 * **season** that is information rather than refusal, and a
 * **completion-time co-location check** — walk away from a cow and
 * nothing came of it, with no state change. ⚠ That last one is not
 * belt-and-braces: nothing in the scheduler cancels a `hands`
 * engagement on movement, so the act must re-check its own premise
 * where it lands (the `FellController` rule).
 */

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Tooled } from '../../../../lib/craft/Tooled';
import type { Bulkable } from '../../../../lib/bulk/Bulkable';
import type { Tappable } from '../../../../lib/husbandry/Tappable';
import type { WorkPlan } from '../../../../lib/ground/Workable';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

/**
 * The topic the take narrates on. ⭐ The same `act.deed` as ground work
 * and the worked acts — one topic for every hands-work act.
 *
 * ⚠ A LITERAL rather than an import of the promoted const, because
 * `lint:topics` resolves a literal and cannot follow a re-export.
 */
export const TAP_TOPIC = 'act.deed';

export interface TapActModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlOneResult;
  vessel?: MqlOneResult;
}

export abstract class TapActController<
  M extends TapActModel = TapActModel,
> extends EngagedActController<M> {
  /** Which tap this verb draws. The only thing a subclass must say. */
  protected abstract tapKey(model: M): string;

  /**
   * What to say when nothing here answers this verb.
   *
   * ⭐ Takes the GIVER as well as the model, because the honest answer
   * can depend on where you are standing: `tap` with nothing bound means
   * *a stand is not a stem* in a wood and *nothing here takes a spile*
   * anywhere else, and the controller has no other way to know which.
   */
  protected abstract nothingHere(
    model: M,
    giver: Stuff,
  ): ReturnType<typeof Mml.compose>;

  /** The reason filed when nothing answers. */
  protected nothingHereReason(): string {
    return 'no-such-tap';
  }

  /**
   * What is being tapped. Default: the bound target, if it produces.
   *
   * ⭐ Overridden where a verb has more than one possible subject — the
   * sap `tap` answers for a tree, and lets a WOOD refuse on behalf of a
   * stand it is not.
   */
  protected async subjectOf(
    model: M,
    _giver: Stuff,
  ): Promise<(Stuff & Tappable) | null> {
    const bound = model.target?.stuff ?? null;
    if (bound === null) return null;
    return MixinApi.isProducing(bound) ? bound : null;
  }

  async execute(model: M, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const subject = await this.subjectOf(model, giver);
    if (subject === null) {
      this.decline(
        context,
        this.nothingHere(model, giver),
        this.nothingHereReason(),
      );
      return;
    }

    const key = this.tapKey(model);
    const tool = this.boundTool(model);
    const vessel = this.boundVessel(model);
    const what = model.target?.stuff ? null : (model.target?.raw ?? null);

    const prognosis = await subject.planTap(giver, key, tool, vessel, what);
    if (prognosis.kind === 'refusal') {
      // ⭐⭐ A closed SEASON is information, not a refusal. Rendering
      // "the run is over for the year" in the rejected voice would make
      // the calendar read as the player's mistake — and none of
      // `TapClosedReason` is a failure. Same channel, different
      // register, and no `controller-rejected` note.
      if (prognosis.reason.startsWith('season-')) {
        this.inform(context, Mml.fromMarkup(prognosis.prose));
        return;
      }
      // Otherwise the host's own sentence, passed through untouched —
      // the verb does not know enough to improve on it.
      this.decline(context, Mml.fromMarkup(prognosis.prose), prognosis.reason);
      return;
    }

    const plan: WorkPlan = prognosis;
    this.engageAct(context, {
      durationMs: plan.durationMs,
      cost: plan.cost,
      beginSelf: Mml.fromMarkup(plan.beginSelf),
      ...(plan.beginPeers
        ? { beginPeers: Mml.fromMarkup(plan.beginPeers) }
        : {}),
      onComplete: () => {
        // ⚠⚠ **A MODULE function, never `this.<method>`.** A controller
        // is one ephemeral clone per execution and the dispatcher
        // destructs it in a `finally` the moment `execute` returns —
        // while this engagement is still pending. A completion calling
        // back into it runs on a destroyed Stuff, and the proxy answers
        // with a SILENT NO-OP: the scene plays, nothing is minted, and
        // nobody can tell. The dig/split and smelt builds each shipped
        // that bug and a live drive is what found it.
        void land(context, subject, key, tool, vessel, plan);
      },
    });
  }

  /**
   * The bound instrument, or `null`.
   *
   * ⚠ No capability check here, deliberately: only the host knows which
   * tool is right for which tap, so the controller hands over whatever
   * the binder resolved and lets the host refuse it by name. Filtering
   * here is what makes the wrong tool read as *there is nothing to tap*
   * instead of *that will not bore a hole*.
   */
  protected boundTool(model: M): (Stuff & Tooled) | null {
    const bound = model.tool?.stuff ?? null;
    if (bound === null) return null;
    return MixinApi.isTool(bound) ? bound : null;
  }

  /**
   * The bound vessel, or `null`.
   *
   * ⭐ Whether `null` is acceptable is the HOST's answer, derived from
   * the tap's `yieldShape` — litres need something to go in, a count and
   * a mass do not. The controller never asks.
   */
  protected boundVessel(model: M): (Stuff & Bulkable) | null {
    const bound = model.vessel?.stuff ?? null;
    if (bound === null) return null;
    return MixinApi.isBulkable(bound) ? bound : null;
  }
}

/**
 * The take landed: let the host do it, narrate what it says, and credit
 * the Discipline **it** named.
 *
 * ⚠⚠ A module function over captured locals, because the controller
 * that started this is already destructed. See the call site.
 *
 * ⚠ And the actor may be gone — a player can log out mid-take, or walk
 * off. ⭐ Unlike worked ground, a take DOES NOT LAND when they have
 * left the room: milking a cow is something you do *to an animal you
 * are standing next to*, and finishing it from another room would be the
 * fiction betraying itself. So the premise is re-checked here and
 * nothing came of it otherwise — no state change, nothing consumed,
 * nothing minted.
 */
async function land(
  context: CommandContext,
  subject: Stuff & Tappable,
  key: string,
  tool: (Stuff & Tooled) | null,
  vessel: (Stuff & Bulkable) | null,
  plan: WorkPlan,
): Promise<void> {
  const giver = context.commandGiver;
  if (giver.isDestroyed() || subject.isDestroyed()) return;
  if (!sameRoom(giver, subject)) {
    MessageApi.scene(giver)
      .topic(TAP_TOPIC)
      .toSelf(Mml.compose`Nothing came of it — you are not there any more.`)
      .send();
    return;
  }
  const result = await subject.completeTap(giver, key, tool, vessel, plan.token);
  if (giver.isDestroyed()) return;
  const scene = MessageApi.scene(giver)
    .topic(TAP_TOPIC)
    .toSelf(Mml.fromMarkup(result.self));
  if (result.peers) scene.toPeers(Mml.fromMarkup(result.peers));
  scene.send();

  const credit = result.credit;
  if (credit && MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: credit.discipline,
      difficulty: credit.difficulty,
      outcome: 'success',
    });
  }
}

/**
 * Are the taker and the tapped still in the same place?
 *
 * ⚠ Walks one level out of a container on the SUBJECT's side, because a
 * tappable tree stands in a panel standing in the room — the same
 * one-level reach the affordance walk uses to offer the verb in the
 * first place. Without it, every sugarbush take would land as *you are
 * not there any more*.
 */
function sameRoom(giver: Stuff, subject: Stuff): boolean {
  const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
  if (here === null) return false;
  let there = MixinApi.isContainable(subject) ? subject.getContainer() : null;
  if (there === here) return true;
  if (there !== null && MixinApi.isContainable(there)) {
    there = there.getContainer();
  }
  return there === here;
}
