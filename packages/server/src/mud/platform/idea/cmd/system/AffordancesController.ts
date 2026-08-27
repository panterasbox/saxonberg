/**
 * AffordancesController — the "what can I do, and what grants me each
 * ability" inspector. The live consumer of affordance attribution
 * (command-routing.md § Affordance attribution).
 *
 * It exercises both seams of that substrate:
 *   - reads `commandGiver.getAffordances()` — standing state, the
 *     recency walk paired with each command's resolved affording
 *     `source` (the giver itself for innate verbs, the granting item
 *     otherwise) — and lists every available command annotated by its
 *     source; and
 *   - reads its own `context.commandSource` to print a
 *     self-demonstrating line proving the dispatcher threaded the
 *     affording object onto the context.
 *
 * Innate vs item is distinguished by identity-comparing the source to
 * the giver — the source object IS the discriminator; there is no
 * provisioning-category tag.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

export default class AffordancesController extends CommandController {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const affordances = giver.getAffordances();

    const lines: string[] = ['', 'You can run these commands:', ''];
    for (const a of affordances) {
      const verb = a.command.getPrimaryVerb();
      const innate = a.source === giver;
      const label = innate
        ? '(innate)'
        : `(${a.source.getPresentation()})`;
      lines.push(`  ${verb.padEnd(15)} ${label}`);
    }
    lines.push('');
    lines.push(
      `This command was afforded by ${context.commandSource.getPresentation()}.`
    );
    lines.push('');

    this.tell(context, Mml.fromMarkup(lines.join('\n')));
  }

  private tell(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:affordances'])
      .toSelf(body)
      .send();
  }
}
