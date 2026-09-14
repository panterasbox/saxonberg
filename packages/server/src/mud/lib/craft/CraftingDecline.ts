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
} from '../../api/crafting';

/** Any crafting-family decline (craft / repair / salvage) — one renderer. */
export type CraftingFailure = CraftFailure | RepairFailure | SalvageFailure;

export class CraftingDecline {
  /** The diegetic line a decline `reason` (and its `detail`) reads as. */
  static messageFor(failure: CraftingFailure): string {

    const detail = failure.detail;
    switch (failure.reason) {
      case 'no-maker':
        return "There's no one on hand to make that.";
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
        if (detail === 'no-material' || detail === 'no-matter') {
          return "There's no honest matter in it to recover.";
        }
        return `There isn't enough ${detail || 'stock'} to make that.`;
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
