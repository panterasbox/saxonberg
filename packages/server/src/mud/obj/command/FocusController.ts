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
import { parse, MqlParseError } from '../../api/mql/parser';
import { MqlApi } from '../../api/mql';
import { MqlPermissionError } from '../../api/mql/permissions';

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

    // Parse-validate so typos surface before we mutate state. The
    // parser doesn't touch the world; the permission probe (next)
    // is the gate that runs resolver tier checks.
    try {
      parse(fragmentRaw);
    } catch (err) {
      if (err instanceof MqlParseError) {
        return { success: false, summary: `bad scope: ${err.message}` };
      }
      throw err;
    }

    // Permission probe: run resolveOne against the fragment as both
    // query and scope so any admin-tier seeds (`online`, `world`,
    // path globs, stuff ids) trip the tier check before we commit.
    // Empty match lists are fine — the player's just pointing at a
    // valid-but-currently-empty area.
    try {
      MqlApi.resolveOne(fragmentRaw, {
        commandGiver: giver,
        scope: fragmentRaw,
      });
    } catch (err) {
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
