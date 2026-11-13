/**
 * WorkedActController — the shared body of `dig` and `split`: **resolve
 * what is being worked, ask it for a plan, engage the hands, and let it do
 * the work at completion.**
 *
 * ⭐⭐ **It knows nothing about stone, peat, clay or worms**, and that is
 * the whole design. It speaks the {@link Workable} protocol and nothing
 * else: the thing being worked prices its own pace, refuses for its own
 * reasons, mints its own product and names the Discipline it wants
 * credited. ⭐ The WORDS are the verb's (controllers-are-io D4): each
 * subclass says its act's reasons and facts ({@link workWords}).
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
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Tooled } from '../../../../lib/craft/Tool';
import type { AnyActRefusal } from '../../../../lib/craft/ActPlan';
import type { WorkLanding, WorkPlan, Workable } from '../../../../lib/ground/Workable';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { MaterialApi } from '../../../../api/material';

/** The topic both acts narrate on. */
export const WORK_TOPIC = 'act.deed';

export interface WorkedActModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlOneResult;
}

/** A worked act's words: its begin, its refusals, its landing. */
export type WorkWords<B, F, X extends AnyActRefusal> = ActWords<B, F & WorkLanding, X>;

export abstract class WorkedActController<
  B,
  F,
  X extends AnyActRefusal,
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
  ): Promise<(Stuff & Workable<B, F, X>) | null>;

  /** What to say when nothing answers. */
  protected abstract nothingHere(model: M): ReturnType<typeof Mml.compose>;

  /** The reason filed when nothing answers. */
  protected abstract nothingHereReason(): string;

  /**
   * ⭐ This verb's words for its act (D4) — every reason, exhaustively.
   * ⚠⚠ Built at execute, as closures that never call back into the
   * controller: it is destructed the moment `execute` returns, and a
   * completion calling `this.<method>` on it is a SILENT no-op (the dig
   * drive found the shape — the swing played its scene and nothing was
   * minted).
   */
  protected abstract workWords(giver: Stuff, subject: Stuff): WorkWords<B, F, X>;

  async execute(model: M, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const subject = await this.subjectOf(model, giver);
    if (subject === null) {
      this.decline(context, this.nothingHere(model), this.nothingHereReason());
      return;
    }

    const tool = this.boundTool(model);
    // ⭐ The player's word is the BAND's name unless it bound the very thing
    // being worked (`dig the bank`). Found twice by the ceramics drives: in
    // the Delight's "clay pit" `dig clay` bound the PIT, and with a lump of
    // coal in hand `dig coal` bound the LUMP — either way the word was lost,
    // the working dug its floor, and the floor was at the water.
    const bound = model.target?.stuff ?? null;
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const boundIsWorked = bound !== null && subject === bound && (bound as unknown) !== here;
    const what = boundIsWorked ? null : (model.target?.raw ?? null);

    const words = this.workWords(giver, subject);
    const plan = await subject.planWork(giver, tool, what);
    if (!plan.ok) {
      // ⭐ The ground's reason, in this verb's words.
      this.decline(context, words.onRefused(plan), plan.reason);
      return;
    }
    this.engageAct(context, landing(giver, plan), words);
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

/**
 * ⭐ The plan, with the landing the ground asked for: what the work put on
 * the worker, and the Discipline **it** named.
 *
 * ⚠⚠ A module function over captured locals — never `this.<method>` —
 * because the controller that started this is already destructed when the
 * swing lands (the live drive proved it: a completion on a destroyed Stuff
 * is a silent no-op).
 *
 * ⚠ And the ACTOR may be gone too — a player can log out mid-swing. ⭐ The
 * work still lands, because the ground does not stop being worked because
 * somebody left; only the telling (and the crediting) needs a listener.
 */
function landing<B, F, X extends AnyActRefusal>(
  giver: Stuff,
  plan: WorkPlan<B, F, X>,
): WorkPlan<B, F, X> {
  return {
    ...plan,
    onComplete: async () => {
      const out = await plan.onComplete();
      if (!out.ok || giver.isDestroyed()) return out;
      const soils = out.facts.soils;
      if (soils && soils.length > 0 && MixinApi.isHygienic(giver)) {
        // The act lands the dirt it names: a pack's own kind (rock dust)
        // loads here, so the deposit's later sync reads find it (D7).
        for (const sp of soils) await MaterialApi.dirtKinds().ensure(sp.kind);
        giver.soilFrom(soils);
      }
      const credit = out.facts.credit;
      if (credit && MixinApi.isAdvancing(giver)) {
        await giver.creditDeed({
          discipline: credit.discipline,
          difficulty: credit.difficulty,
          outcome: 'success',
        });
      }
      return out;
    },
  };
}
