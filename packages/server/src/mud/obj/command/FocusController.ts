/**
 * FocusController — explicit scope inspection / set.
 *
 * `focus` (no fragment) — display the giver's current scope.
 * `focus <fragment>` — apply via `commandGiver.setScope(fragment)`,
 *   reporting how many things the fragment currently resolves to.
 *
 * The verb is `focus` (action-shaped) and the engine state remains
 * `commandGiver.scope` (state-shaped) — the verb-noun split is
 * intentional. From the player's perspective, `focus X` points
 * subsequent queries at X; the prompt rendering reflects the current
 * scope fragment.
 *
 * `focus.yaml` declares `fragment: type: objects`, so the dispatcher
 * runs the parser + permission probe + resolveMany before the
 * controller fires. Parse / permission errors surface as command-
 * level failures from the dispatcher's outer try/catch (see
 * `CommandGiverMixin.executeCommand`), so the controller doesn't
 * need to re-validate. Empty resolutions are normal here — `focus
 * online` when no one's online still sets the scope.
 *
 * The fragment text the player typed comes from `model.fragment.raw`
 * (the dispatcher-bound wrapper). The match list itself is
 * informational — controllers report the count so players can
 * sanity-check what they've focused on.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlMany } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Focused } from '../../lib/command/Focused';

interface FocusModel extends CommandModel {
  fragment?: MqlMany;
}

export class FocusController extends CommandController<FocusModel> {
  execute(model: FocusModel, context: CommandContext): CommandResult {
    // `focus.yaml` is a self-bucket contribution from FocusedMixin,
    // so the verb only lands on a Focused giver's recency stack —
    // the cast is sound by construction.
    const giver = context.commandGiver as unknown as Stuff & Focused;
    const wrapper = model.fragment;

    if (!wrapper || wrapper.raw.trim().length === 0) {
      return {
        success: true,
        summary: `scope: ${giver.getScope()}`,
      };
    }

    const fragmentText = wrapper.raw.trim();
    giver.setScope(fragmentText);
    const matches = wrapper.stuff.length;
    const noun = matches === 1 ? 'object' : 'objects';
    return {
      success: true,
      summary: `scope: ${fragmentText} (${matches} ${noun})`,
    };
  }
}
