/**
 * RecallController — `recall [scope] <terms…>`, the search verb.
 *
 * ⚠ **The verb is `recall`, not `search`.** `search` is the in-world
 * perception verb (going over a room for something concealed) and keeps
 * that meaning. This one needed its own word.
 *
 * ⚠ **It exists because an Api with no verb would break the axiom.**
 * Every click sends a command; a search panel with no command behind it
 * would be the one panel in the cockpit that cannot show you what it
 * just ran. So the panel and the typed verb dispatch the same thing.
 *
 * The first token is treated as a scope **only when it names one** —
 * otherwise it is part of the phrase. `recall wiki compact` searches
 * the wiki; `recall press release` searches everywhere for "press
 * release", because a reader who types a common word should not have
 * their query silently narrowed by it.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import {
  SearchApi,
  SEARCH_SCOPES,
  type SearchScope,
  type SearchHit,
} from '../../../api/search';

interface RecallModel extends CommandModel {
  query?: string;
}

export default class RecallController extends CommandController<RecallModel> {
  async execute(model: RecallModel, context: CommandContext): Promise<void> {
    const words = (model.query?.trim() ?? '').split(/\s+/).filter(Boolean);
    const first = words[0] ?? '';

    // A leading token counts as a scope only if it IS one, AND only if
    // something follows it. Otherwise it is the phrase — narrowing a
    // search because the reader's first word happened to be "chat"
    // would quietly answer a different question than the one they
    // asked, and `recall chat` alone plainly means "find 'chat'".
    const isScope =
      words.length > 1 && (SEARCH_SCOPES as readonly string[]).includes(first);
    const scope: SearchScope = isScope ? (first as SearchScope) : 'all';
    const terms = (isScope ? words.slice(1) : words).join(' ');

    if (terms.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(
          Mml.escape(
            `\nusage: recall [${SEARCH_SCOPES.join(' | ')}] <terms…>\n`,
          ),
        ),
      );
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-arg',
        detail: 'recall needs something to look for',
      });
      return;
    }

    const hits = await SearchApi.query({ scope, terms });
    this.send(context, this.render(scope, terms, hits));
  }

  private render(scope: SearchScope, terms: string, hits: SearchHit[]): Mml {
    if (hits.length === 0) {
      return Mml.fromMarkup(
        Mml.escape(`\nnothing in ${scope} for "${terms}"\n`),
      );
    }
    const lines = [
      '',
      `${hits.length} result${hits.length === 1 ? '' : 's'} for "${terms}"`,
    ];
    for (const h of hits) {
      lines.push(`  [${h.scope}] ${h.title}`);
      if (h.excerpt) lines.push(`      ${h.excerpt}`);
      lines.push(`      → ${h.command}`);
    }
    lines.push('');
    return Mml.fromMarkup(Mml.escape(lines.join('\n')));
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:recall'])
      .toSelf(body)
      .send();
  }
}
