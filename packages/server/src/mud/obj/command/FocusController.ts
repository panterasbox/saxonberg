/**
 * FocusController — explicit scope inspection / set.
 *
 * `focus` (no fragment) — display the giver's current scope.
 * `focus <fragment>` — parse-validate the fragment as MQL, run a
 *   permission probe (so admin-tier seeds reject for non-admins),
 *   then apply via `commandGiver.setScope(fragment)`.
 *
 * The verb is `focus` (action-shaped) and the engine state remains
 * `commandGiver.scope` (state-shaped) — the verb-noun split is
 * intentional. From the player's perspective, `focus X` points
 * subsequent queries at X; the prompt rendering reflects the current
 * scope fragment.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MqlApi, MqlParseError, MqlPermissionError } from '../../api/mql';

interface FocusModel extends CommandModel {
  fragment?: string;
}

export class FocusController extends CommandController<FocusModel> {
  execute(model: FocusModel, context: CommandContext): CommandResult {
    const giver = context.commandGiver;
    const fragmentRaw = typeof model.fragment === 'string' ? model.fragment.trim() : '';

    if (fragmentRaw.length === 0) {
      const current = giver.getScope();
      return {
        success: true,
        summary: `scope: ${current}`,
      };
    }

    // Single validation pass — `resolveOne` runs the parser and the
    // permission gate. An empty match list is fine; the player's
    // just pointing at a valid-but-currently-empty area
    // (e.g. `focus online` when no one's online).
    try {
      MqlApi.resolveOne(fragmentRaw, {
        commandGiver: giver,
        scope: fragmentRaw,
      });
    } catch (err) {
      if (err instanceof MqlParseError) {
        return { success: false, summary: `bad scope: ${err.message}` };
      }
      if (err instanceof MqlPermissionError) {
        return { success: false, summary: err.message };
      }
      throw err;
    }

    giver.setScope(fragmentRaw);
    return {
      success: true,
      summary: `scope: ${fragmentRaw}`,
    };
  }
}
