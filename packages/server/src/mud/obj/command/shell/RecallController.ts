/**
 * RecallController — the record layer's retrieval verb.
 *
 * ⭐⭐ **One verb over several corpora, with the corpus as a named
 * argument.** A verb per corpus would mean a fourth corpus is a fourth
 * verb, a fourth help page and a fourth thing to discover; a scope
 * argument means it is an entry.
 *
 * ⚠⚠ **`recall` must not drift toward a client-side filter box.** The
 * client owns zero command semantics, and search is the case where that
 * most easily lapses: a box that filtered the local buffer would look
 * identical, work on one device, and quietly break the axiom. Every
 * invocation is a real command on the wire, and the results come back
 * as prose in the transcript like anything else.
 *
 * ⚠ `search` is taken — it is the in-world perception verb (looking
 * around a room with your own eyes). The two are not variations on each
 * other and must never be merged.
 *
 * Scope-specific behaviour lives in `RecordApi`, not here: `frames` is
 * the caller's own store and is owner-derived, while `wiki` and
 * `forums` are shared corpora carrying their own visibility rules.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { RecordApi } from '../../../api/record';
import { RECALL_SCOPES, type RecallHit, type RecallScope } from '@saxonberg/types';

interface RecallModel extends CommandModel {
  terms?: string;
  scope?: string;
}

/** The scene topic a readout rides — a private answer to your own ask. */
const TOPIC = 'sense.survey';

/** How a hit's age reads, given now. */
function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default class RecallController extends CommandController<RecallModel> {
  async execute(model: RecallModel, context: CommandContext): Promise<void> {
    const search = (model.terms ?? '').trim();
    if (!search) {
      return this.fail(context, 'Recall what? Give me something to look for.', 'terms-required');
    }

    const raw = (model.scope ?? 'frames').toLowerCase();
    if (!RECALL_SCOPES.includes(raw as RecallScope)) {
      return this.fail(
        context,
        `No such scope '${raw}'. Try one of: ${RECALL_SCOPES.join(', ')}.`,
        'unknown-scope',
      );
    }
    const scope = raw as RecallScope;

    const hits = await RecordApi.recall(scope, search);
    if (hits.length === 0) {
      this.send(
        context,
        Mml.compose`\nNothing in ${scope} matches "${search}".\n`,
      );
      return;
    }

    this.send(context, this.render(scope, search, hits));
  }

  /**
   * ⚠ Excerpts are **quoted, not re-rendered**. `RecordApi` flattens
   * each hit's MML to plain text before it gets here and this escapes
   * it again; pasting a stored body's live markup into a fresh frame
   * would let it act in a context that never composed it.
   */
  private render(
    scope: RecallScope,
    search: string,
    hits: readonly RecallHit[],
  ): Mml {
    const now = Date.now();
    const parts: Mml[] = [
      // The count is derived from the list beside it, never tracked.
      Mml.compose`\n${String(hits.length)} in ${scope} for "${search}":\n`,
    ];
    for (const hit of hits) {
      const when = hit.at ? ` · ${ago(hit.at, now)}` : '';
      parts.push(Mml.compose`\n  ${hit.title}${when}\n`);
      parts.push(Mml.compose`    ${hit.excerpt}\n`);
      // Every clickable previews exactly what it sends — a hit that can
      // be opened says so with the command, not with a word like "open".
      if (hit.command) {
        parts.push(
          Mml.compose`    ${Mml.link(`mudcmd:${hit.command}`, hit.command)}\n`,
        );
      }
    }
    return Mml.compose`${parts}`;
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.compose`\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }
}
