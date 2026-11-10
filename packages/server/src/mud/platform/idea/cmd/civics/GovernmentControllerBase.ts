/**
 * GovernmentControllerBase — what the `government` subcommands share:
 * the read surface of the civics substrate (the new `civics` command category — the
 * FICTION's governments, deliberately not `governance`, which is the
 * Compact's category). One controller per subcommand:
 *
 *   - `list` / bare — the jurisdiction chain over where the giver
 *     stands (`GovernmentApi.subjectTo`), each government rendered with
 *     its description, departments, seats + holders, and charter
 *     (`GovernmentListController`).
 *   - `residency` — the chain over the giver's domicile
 *     (`GovernmentApi.residentOf`) — where they are a *resident*, as
 *     distinct from where they stand (`GovernmentResidencyController`).
 *
 * Fully public and read-only; `requiresAnimate` only. NPCs can dispatch
 * it (no Interactive assumptions — output only, no prompts). Every Api
 * read takes the giver as the *subject* (a predicate about a subject,
 * not an authority claim); nothing here mutates.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import type { Mml } from '../../../../api/mml';

const TOPIC = 'shell.result';

export abstract class GovernmentControllerBase extends CommandController<CommandModel> {
  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }
}
