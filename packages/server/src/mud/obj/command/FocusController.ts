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
 * The fragment text the player typed is read from `ctx.raw.fragment`
 * since `model.fragment` is now the resolved `Stuff[]`, not the
 * source string. The match list itself is informational —
 * controllers report the count so players can sanity-check what
 * they've focused on.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';

interface FocusModel extends CommandModel {
  fragment?: Stuff[];
}

export class FocusController extends CommandController<FocusModel> {
  execute(model: FocusModel, context: CommandContext): CommandResult {
    const giver = context.commandGiver;
    const fragmentRaw = context.raw?.fragment?.trim() ?? '';

    if (fragmentRaw.length === 0) {
      const current = giver.getScope();
      return {
        success: true,
        summary: `scope: ${current}`,
      };
    }

    giver.setScope(fragmentRaw);
    const matches = Array.isArray(model.fragment) ? model.fragment.length : 0;
    const noun = matches === 1 ? 'object' : 'objects';
    return {
      success: true,
      summary: `scope: ${fragmentRaw} (${matches} ${noun})`,
    };
  }
}
