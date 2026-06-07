/**
 * FocusController — explicit focus inspection / set.
 *
 * `focus` (no fragment) — display the giver's current focus.
 * `focus <fragment>` — apply via `giver.setFocus(fragment)`,
 *   reporting how many things the fragment currently resolves to.
 *
 * The verb is `focus` and the engine state lives on
 * `FocusedMixin.getFocus()` — both are named for the player-facing
 * concept. (We use **scope** for the per-resolution MQL search anchor
 * since that's the broader term; **focus** is the persisted giver
 * state surfaced to YAMLs as `$focus`.)
 *
 * `focus.yaml` declares `fragment: type: objects`, so the dispatcher
 * runs the parser + permission probe + resolveMany before the
 * controller fires. Parse / permission errors surface as command-
 * level failures from the dispatcher's outer try/catch (see
 * `CommandGiverMixin.executeCommand`), so the controller doesn't
 * need to re-validate. Empty resolutions are normal here — `focus
 * online` when no one's online still sets the focus.
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
} from '../../api/command';
import type { MqlManyResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Focused } from '../../lib/command/Focused';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

interface FocusModel extends CommandModel {
  fragment?: MqlManyResult;
}

export class FocusController extends CommandController<FocusModel> {
  execute(model: FocusModel, context: CommandContext): void {
    // `focus.yaml` is a self-bucket contribution from FocusedMixin,
    // so the verb only lands on a Focused giver's recency stack —
    // the cast is sound by construction.
    const giver = context.commandGiver as unknown as Stuff & Focused;
    const wrapper = model.fragment;

    // No fragment → report current focus state.
    if (!wrapper || wrapper.raw.trim().length === 0) {
      const current = giver.getFocus();
      MessageApi.scene(context.commandGiver)
        .topic('world.perception.vision')
        .toSelf(Mml.fromMarkup(`focus: ${current}\n`))
        .send();
      return;
    }

    const fragmentText = wrapper.raw.trim();
    giver.setFocus(fragmentText);
    const matches = wrapper.stuff.length;
    const noun = matches === 1 ? 'object' : 'objects';
    MessageApi.scene(context.commandGiver)
      .topic('world.perception.vision')
      .toSelf(
        Mml.fromMarkup(
          `focus set to '${fragmentText}' (${matches} ${noun})\n`,
        ),
      )
      .send();
  }
}
