/**
 * WorkedActController — the shared body of `dig` and `split`: **resolve
 * what is being worked, ask it for a plan, engage the hands, and let it do
 * the work at completion.**
 *
 * ⭐⭐ **It knows nothing about stone, peat, clay or worms**, and that is
 * the whole design. It speaks the {@link Workable} protocol and nothing
 * else: the thing being worked prices its own pace, refuses in its own
 * words, mints its own product and names the Discipline it wants credited.
 * Take every content pack away and both verbs still work — they refuse,
 * naming the tool.
 *
 * ⚠ **The god-verb guard, and it lives here because this is where it would
 * break:** *if a new case needs THIS FILE to branch on what kind of digging
 * it is, it is not `dig`.* `dig` shipped once before, in the fishing build,
 * and was **withdrawn in review for hard-coding its yield to a worm**. The
 * shape that survives that review is one where the controller cannot name a
 * yield even if it wanted to.
 *
 * ⭐ It extends {@link GroundWorkController} rather than copying
 * `engageAct`, which matters: `MiningActController`, `FieldWorkController`
 * and this would have been the **fourth** copy of the same engagement
 * bookkeeping, and forestry's doc already names the third copy as the
 * trigger to promote it. Reusing it adds none.
 */

import { GroundWorkController } from './GroundWorkController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Tooled } from '../../../../lib/craft/Tooled';
import type {
  WorkPlan,
  Workable,
} from '../../../../lib/ground/Workable';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

/** The topic both acts narrate on. */
export const WORK_TOPIC = 'act.deed';

export interface WorkedActModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlOneResult;
}

export abstract class WorkedActController<
  M extends WorkedActModel = WorkedActModel,
> extends GroundWorkController<M> {
  /**
   * Resolve what is being worked from the bound target and the actor's
   * surroundings. `null` means *nothing here answers this verb*, and the
   * subclass says so in its own sentence.
   */
  protected abstract subjectOf(
    model: M,
    giver: Stuff,
  ): Promise<Workable | null>;

  /** What to say when nothing answers. */
  protected abstract nothingHere(model: M): ReturnType<typeof Mml.compose>;

  /** The reason filed when nothing answers. */
  protected abstract nothingHereReason(): string;

  async execute(model: M, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const subject = await this.subjectOf(model, giver);
    if (subject === null) {
      this.decline(context, this.nothingHere(model), this.nothingHereReason());
      return;
    }

    const tool = this.boundTool(model);
    const what = model.target?.stuff ? null : (model.target?.raw ?? null);

    const prognosis = await subject.planWork(giver, tool, what);
    if (prognosis.kind === 'refusal') {
      // ⭐ The ground's own sentence, passed through untouched. The verb
      // does not know enough to improve on it and must not try.
      this.decline(
        context,
        Mml.fromMarkup(prognosis.prose),
        prognosis.reason,
      );
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
        void this.land(context, subject, tool, plan);
      },
    });
  }

  /**
   * The swing landed: let the subject do the work, narrate what it says,
   * and credit the Discipline **it** named.
   *
   * ⚠ A module-scope-free completion over captured locals, because a
   * controller is destructed when `execute` returns — the shipped rule for
   * every engaged act in the tree.
   */
  private async land(
    context: CommandContext,
    subject: Workable,
    tool: (Stuff & Tooled) | null,
    plan: WorkPlan,
  ): Promise<void> {
    const giver = context.commandGiver;
    const result = await subject.completeWork(giver, tool, plan.token);
    const scene = MessageApi.scene(giver)
      .topic(WORK_TOPIC)
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
   * The bound instrument, or `null`.
   *
   * ⚠ **No capability check here, deliberately.** `dig` takes a spade OR a
   * pick and only the ground knows which is right, so the controller hands
   * over whatever the binder resolved and lets the ground refuse by name.
   * Filtering here is what would make the wrong tool read as *there is no
   * face* instead of *that is rock*.
   */
  protected boundTool(model: M): (Stuff & Tooled) | null {
    const bound = model.tool?.stuff ?? null;
    if (bound === null) return null;
    return MixinApi.isTool(bound) ? bound : null;
  }
}
