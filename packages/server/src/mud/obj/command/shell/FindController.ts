/**
 * FindController — enumerate things matching an MQL query without
 * binding focus.
 *
 * `find <mql>` is the snapshot-shaped counterpart to `focus`: the
 * dispatcher runs `MqlApi.resolveMany` against the giver's scope
 * chain (`$focus`, then `reachable`), and this controller renders
 * the resulting Stuff list one row per match. **No focus update** —
 * `find.yaml` omits `updates_focus` (defaults to `'none'`), and the
 * absence is load-bearing: `focus` is the verb that binds, `find`
 * is the verb that scans without binding.
 *
 * Rendering:
 *   - Empty result → friendly "no matches" line.
 *   - Non-empty → one row per match, each row carrying the canonical
 *     display name via `Mml.item(stuff)`. The MML identity tag
 *     makes each row clickable in the inspection-pane / terminal
 *     client (the click resolves to `look <primaryKeyword>` via the
 *     client stuff registry — see the inspection-pane wave plan).
 *
 * Admin-gated row suffix:
 *   - Viewers whose `commandGiver` composes `AuthorMixin`
 *     (`MixinApi.isAuthor`) see each row's template path in parens
 *     after the display name (e.g. `apple (/obj/apple)`). Non-admin
 *     viewers see name only. The check is per-giver, not per-match —
 *     admins see template paths universally; non-admins never.
 *
 * Topic / channel:
 *   - Emits via `MessageApi.scene(...).topic(sense.survey)`,
 *     the same private-observation topic family as `look`. `find`
 *     is a perception verb (the actor surveys what matches a query);
 *     it just doesn't bind the result to focus.
 *
 * Substrate note:
 *   - Player-typed `find <mql>` rides the command bus exactly like
 *     any other verb — this controller renders the prose to the
 *     terminal scroll. The `mql-query` wire channel (Wave 4) exists
 *     as the substrate surface for future programmatic consumers
 *     that want a one-shot read without bouncing through the command
 *     bus + prose pipeline; the v1 inspection pane does not consume
 *     it. See the inspection-pane build plan, Wave 5 note.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import type { MqlManyResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

interface FindModel extends CommandModel {
  query?: MqlManyResult;
}

export default class FindController extends CommandController<FindModel> {
  execute(model: FindModel, context: CommandContext): void {
    const wrapper = model.query;
    const raw = wrapper?.raw?.trim() ?? '';
    const matches: Stuff[] = wrapper?.stuff ?? [];

    if (matches.length === 0) {
      // `find.yaml` declares `query` as required, so the dispatcher
      // hands us a wrapper or rejects upstream. Empty `stuff` means
      // the query parsed + resolved fine but matched nothing — a
      // perfectly honest outcome that deserves a clean prose line
      // (not an error envelope).
      const body =
        raw.length > 0
          ? Mml.compose`No matches for '${raw}'.\n`
          : Mml.compose`No matches.\n`;
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(body)
        .send();
      return;
    }

    // Admin gate: per-giver, not per-row. Avatars composing
    // `AuthorMixin` see template paths everywhere; non-admins never.
    const showTemplatePath = MixinApi.isAuthor(context.commandGiver);

    // One row per match. `Mml.item` emits the identity-tagged
    // affordance the client makes clickable; the admin suffix is
    // appended as plain text so the click region stays exactly
    // over the display name. Empty template-path (transient /
    // bootstrap Stuff with no clone-pipeline stamp) renders as
    // bare display name even for admins.
    const rows: Mml[] = matches.map((stuff) => {
      const item = Mml.item(stuff);
      if (!showTemplatePath) return item;
      const path = stuff.getTemplatePath();
      if (!path) return item;
      return Mml.compose`${item} (${path})`;
    });

    // Newline-joined, not English-list joined — `find` outputs are
    // scanning surfaces, one-row-per-line stays readable when match
    // counts grow. The leading + trailing newlines mirror `look`'s
    // body padding so the result renders as a discrete block in
    // terminal scroll.
    let body = Mml.compose`\n`;
    for (const row of rows) {
      body = Mml.compose`${body}${row}\n`;
    }

    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
      .toSelf(body)
      .send();
  }
}
