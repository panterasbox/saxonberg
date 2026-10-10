/**
 * CraftingDecline — the diegetic prose for a crafting-family refusal
 * (craft / repair / salvage), keyed by the closed `reason` vocabulary the
 * three failure shapes share.
 *
 * ⭐ **Vocabulary, not a verb.** This was `CraftController.declineScene(
 * giver, failure)` — a static whose subject was a world object, reached
 * from a sibling controller and from an activity-completion closure. The
 * *sending* is `MessageApi.scene(giver)`, which already exists and is
 * where it belongs; what genuinely belonged to crafting is which line a
 * reason reads as. That is a pure lookup over a closed vocabulary, so it
 * stays a static and is author-visible as one.
 *
 * ⚠ Completion closures can call this freely: it takes no receiver and
 * touches no world object, which is exactly why the old shape needed to
 * be static and this one does not care.
 */

import type {
  CraftFailure,
  RepairFailure,
  SalvageFailure,
  FitFailure,
} from '../../api/crafting';

/** Any crafting-family decline (craft / repair / salvage / fit) — one renderer. */
export type CraftingFailure =
  | CraftFailure
  | RepairFailure
  | SalvageFailure
  | FitFailure;

export class CraftingDecline {
  /** The diegetic line a decline `reason` (and its `detail`) reads as. */
  static messageFor(failure: CraftingFailure): string {

    const detail = failure.detail;
    switch (failure.reason) {
      case 'no-maker':
        return "There's no one on hand to make that.";
      case 'not-learned':
        // ⭐ The refusal NAMES somebody, because "come back at two, Remy can
        // make that" is a different and far better answer than "no" — and
        // because a bar whose whole staff cannot make a listed drink is a
        // standing job advertisement, which is the thing worth saying out
        // loud.
        return detail
          ? `Nobody here knows how to make that. ${detail} could.`
          : 'Nobody here knows how to make that, and nobody here could.';
      case 'no-call-policy':
        return 'Nobody seems sure whose job that is.';
      case 'ambiguous-house':
        return "It isn't clear who you'd be ordering from here.";
      case 'missing-tool':
        return `There's no ${detail || 'tool'} here to make that with.`;
      case 'insufficient-input':
        // The service acts' details read as states, not stock.
        if (detail === 'no-location') return "You can't make that here.";
        if (detail === 'nothing-to-repair') {
          return "It's already sound — there's nothing to repair.";
        }
        if (detail === 'not-durable' || detail === 'not-salvageable') {
          return "That isn't something this kind of work applies to.";
        }
        if (detail === 'build-in-use') {
          return "There's a build still working in it — finish or empty it first.";
        }
        if (detail === 'nothing-to-fit') {
          return 'Fit what, to what? Name the part and the thing it goes on.';
        }
        if (detail === 'no-material' || detail === 'no-matter') {
          return "There's no honest matter in it to recover.";
        }
        return `There isn't enough ${detail || 'stock'} to make that.`;
      case 'part-failed':
        // ⭐⭐ The refusal NAMES the part and the cure (assembly D6, AC 10):
        // no repair mends a split haft, and saying so is the lesson. Below
        // the joint's band the detail is the set — "something about the
        // staves" — and the cure is still the same act.
        return detail && detail.startsWith('something about')
          ? `There is ${detail} that will not answer to repair — something in it has failed, and wants replacing. Fit a new one.`
          : `The ${detail || 'part'} has failed, and no repair will mend that. Fit a new ${detail || 'one'}.`;
      case 'not-skilled':
        return `You don't have the hand for that yet — ${detail || 'it wants more skill than you have'}.`;
      case 'no-line':
        if (detail === 'not-an-assembly') {
          return "That isn't made of parts — there's nothing in it to fit anything to.";
        }
        return detail
          ? `That doesn't fit anywhere in it. It is made of ${detail}.`
          : "That doesn't fit anywhere in it.";
      case 'insufficient-heat':
        return 'Nothing here runs hot enough for that — the forge is cold, or there is no fire at all.';
      case 'no-recipe':
        return "That can't be made here.";
      case 'no-glass':
        return 'There is no clean glass to pour that into.';
      case 'no-output':
      default:
        return 'Something goes wrong, and the drink never comes together.';
    }

  }
}
