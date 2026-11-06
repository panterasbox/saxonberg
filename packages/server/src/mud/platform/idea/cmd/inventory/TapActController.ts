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
 * {@link Producing} take protocol, which is what lets a kernel verb earn a
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

import { EngagedActController, type ActWords } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Tooled } from '../../../../lib/craft/Tool';
import type { Bulkable } from '../../../../lib/bulk/Bulkable';
import type { WorkLanding } from '../../../../lib/ground/Workable';
import type {
  Producing,
  TapBegin,
  TapDone,
  TapPlan,
  TapRefusal,
} from '../../../../lib/husbandry/Producing';
import type { TapClosedReason } from '../../../../platform/idea/species/Species';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

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

/** A take's words: its begin, its refusals, its landing. */
export type TapWords = ActWords<TapBegin, TapDone & WorkLanding, TapRefusal>;

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
  ): Promise<(Stuff & Producing) | null> {
    const bound = model.target?.stuff ?? null;
    if (bound === null) return null;
    return MixinApi.isProducing(bound) ? bound : null;
  }

  /**
   * ⭐ The take's words (D4) — the kernel's defaults, every reason. A pack
   * controller overrides it in its host's voice and falls back to these
   * (`super.tapWords(...)`).
   *
   * ⚠⚠ Built at execute, as closures that never call back into the
   * controller: it is destructed the moment `execute` returns, and a
   * completion calling `this.<method>` on it is a SILENT no-op.
   */
  protected tapWords(_giver: Stuff, subject: Stuff & Producing): TapWords {
    return {
      beginSelf: (b) =>
        b.setting === null
          ? Mml.compose`You settle in to the work.`
          : b.setting.bores
            ? Mml.compose`You set the auger against the trunk and start to bore, cranking slowly so the bit does not bind.`
            : Mml.compose`You set the blade to the trunk and cut a long face through the bark, down to the pale wet wood.`,
      onRefused: (out) => TapActController.defaultRefusal(out, subject),
      onDone: (d) => ({ self: TapActController.defaultDone(d) }),
    };
  }

  /** The kernel's sentence for a shut tap. ⚠ No digits, ever. */
  protected static seasonWords(season: TapClosedReason): string {
    switch (season) {
      case 'before-season':
        return 'it is not the season for that yet';
      case 'after-season':
        return 'that season is over for the year';
      case 'cold':
        return 'it is too cold for anything to run';
      case 'warm':
        return 'it is too warm; nothing is running';
      case 'dried-off':
        return 'there is nothing left to give this season';
      case 'brooding':
        return 'she is sitting tight and will not be moved';
      case 'no-forage':
        return 'there is nothing out there to work';
      case 'wrong-sex':
        return 'there is nothing of that to be had from this one';
      default: {
        const never: never = season;
        return never;
      }
    }
  }

  /** ⭐ The kernel's words for a refused take — every reason, exhaustively. */
  protected static defaultRefusal(out: TapRefusal, subject: Stuff): Composed {
    switch (out.reason) {
      case 'no-such-tap':
        return Mml.compose`${subject.getPresentation()} does not give that.`;
      case 'wrong-sex':
        return Mml.compose`${TapActController.seasonWords('wrong-sex')}`;
      case 'season-before-season':
      case 'season-after-season':
      case 'season-cold':
      case 'season-warm':
      case 'season-dried-off':
      case 'season-brooding':
      case 'season-no-forage':
      case 'season-wrong-sex':
        return Mml.compose`${TapActController.seasonWords(out.facts.season)}`;
      case 'nothing-standing':
        return Mml.compose`There is nothing to take just now.`;
      case 'no-vessel':
        return Mml.compose`You have nothing to catch it in.`;
      case 'no-material':
        return Mml.compose`There is nothing to draw.`;
      case 'material-mismatch':
        return Mml.compose`There is ${out.facts.held} in ${out.facts.vessel.getPresentation()} already.`;
      case 'empty':
        return out.facts.spiled
          ? Mml.compose`Nothing has run into it yet. Give it time.`
          : Mml.compose`There is no spile in it. Nothing can run out of a whole stem.`;
      case 'girth':
        return out.facts.none
          ? Mml.compose`The stem is too slender to take a spile at all. Leave it to grow.`
          : Mml.compose`The stem will not take another spile at this girth.`;
      case 'no-tool':
        return out.facts.bores
          ? Mml.compose`You would need an auger to bore the hole.`
          : Mml.compose`You would need a blade to cut a face through the bark.`;
      case 'no-spile':
        return Mml.compose`You have no spile to drive into it.`;
      case 'beaten-to-it':
        return Mml.compose`Somebody has been here before you. Nothing came of it.`;
      case 'nothing-came':
        return Mml.compose`Nothing came of it.`;
      case 'not-there':
        return Mml.compose`Nothing came of it — you are not there any more.`;
      default: {
        const never: never = out;
        return never;
      }
    }
  }

  /**
   * The kernel's words for a landed take.
   *
   * ⭐ `kept` vs `drawn` is the completeness the vessel decided, and the
   * sentence says so without a number when they differ — a player who
   * brought too small a pail should be told it overflowed, not handed a
   * figure.
   */
  protected static defaultDone(d: TapDone): Composed {
    if (d.kind === 'set') {
      return d.bores
        ? Mml.compose`The bit breaks through into the wet wood and you drive the spile home with the heel of your hand. It beads, and then it drips.`
        : Mml.compose`You set the cup under the face and press it into the bark. Resin beads along the cut, clear and slow.`;
    }
    const first = d.minted[0];
    if (first) {
      return d.minted.length > 1
        ? Mml.compose`You come away with ${String(d.minted.length)} of them.`
        : Mml.compose`You come away with ${first.getPresentation()}.`;
    }
    if (d.kept <= 0) return Mml.compose`It runs away to nothing before you can catch it.`;
    if (d.kept < d.drawn - 0.01) {
      return Mml.compose`You catch what you can; the rest goes on the ground.`;
    }
    return Mml.compose`You come away with the lot.`;
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

    const words = this.tapWords(giver, subject);
    const plan = await subject.planTap(giver, key, tool, vessel, what);
    if (!plan.ok) {
      // ⭐⭐ A closed SEASON is information, not a refusal. Rendering
      // "the run is over for the year" in the rejected voice would make
      // the calendar read as the player's mistake — and none of
      // `TapClosedReason` is a failure. Same channel, different
      // register, and no `controller-rejected` note.
      if (plan.reason.startsWith('season-')) {
        this.inform(context, words.onRefused(plan));
        return;
      }
      this.decline(context, words.onRefused(plan), plan.reason);
      return;
    }
    this.engageAct(context, landing(giver, subject, plan), words);
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
 * ⭐ The take's plan, with its landing: the premise re-checked, and the
 * Discipline **the host** named credited.
 *
 * ⚠⚠ A module function over captured locals, because the controller
 * that started this is already destructed when the take lands.
 *
 * ⚠ Unlike worked ground, a take DOES NOT LAND when the taker has left
 * the room: milking a cow is something you do *to an animal you are
 * standing next to*, and finishing it from another room would be the
 * fiction betraying itself. So nothing came of it — no state change,
 * nothing consumed, nothing minted.
 */
function landing(giver: Stuff, subject: Stuff & Producing, plan: TapPlan): TapPlan {
  return {
    ...plan,
    onComplete: async () => {
      if (giver.isDestroyed() || subject.isDestroyed() || !sameRoom(giver, subject)) {
        return { ok: false, reason: 'not-there' };
      }
      const out = await plan.onComplete();
      if (!out.ok || giver.isDestroyed()) return out;
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
