/**
 * SearchController — `search [<target>]`: the active, costed detection act.
 *
 * Bare `search` scans the whole surroundings (broad-shallow — the location's
 * concealable contents + its exits). `search <container>` rummages *inside*
 * that thing (narrow-deep — a depth bonus, over the container's contents).
 * Either way it starts a {@link SearchActivity} that holds the searcher's
 * `hands` slot for `concealment.searchSeconds` game-time and resolves at
 * completion via `PerceptionApi.resolveSearch` — so a barge-in mid-rummage
 * aborts the search and finds nothing (the requirement's "ambushable"). The
 * outcome is graded by the searcher's `awareness` competence (warmed
 * synchronously via `preloadForSenseGate` before the activity starts).
 *
 * On completion it surfaces the discovered secrets AND the passive hints
 * for anything still-hidden-but-close (honest fog — a hint names a tell,
 * never the hidden thing's identity).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { AbortReason } from '@saxonberg/types';
import type { SearchDepth } from '../../../api/perception';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { PerceptionApi } from '../../../api/perception';
import { SchedulerApi } from '../../../api/scheduler';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { Mml } from '../../../api/mml';
import { SearchActivity } from '../../../lib/concealment/SearchActivity';
import Exit from '../../../lib/boundary/Exit';

const TOPIC = 'sense.survey';

/** `concealment.searchSeconds` fallback (game-seconds). */
const DEFAULT_SEARCH_SECONDS = 4;

interface SearchModel extends CommandModel {
  target?: MqlOneResult;
}

export default class SearchController extends CommandController<SearchModel> {
  async execute(model: SearchModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;

    // A named-but-unresolved target is an honest "you don't see that".
    if (model.target && model.target.stuff === null && model.target.raw) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to search.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    // Warm the `awareness` band so the completion's `resolveSearch` reads a
    // live competence snapshot (the sync detection gate reads a cache).
    await PerceptionApi.preloadForSenseGate(actor);

    const targetStuff = model.target?.stuff ?? null;
    const { scope, depth, subject } = this.buildScope(actor, targetStuff);

    const durationMs = this.searchSeconds() * 1000;
    const onComplete = (): void => this.resolveAndRender(actor, scope, depth);

    // No engagement capacity (bare test fixture / sessile NPC) → resolve
    // now (the ManualBuild degenerate-fallback pattern).
    if (!MixinApi.isEngaged(actor)) {
      onComplete();
      return;
    }

    const activity = new SearchActivity({
      actor,
      durationMs,
      onComplete,
      onAbort: (_reason: AbortReason): void => {
        // Interrupted mid-rummage — nothing was discovered. A quiet line;
        // the cancel note already rides the envelope.
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(Mml.compose`Your search is interrupted.`)
          .send();
      },
    });

    const result = SchedulerApi.start(activity);
    if (
      result.ok &&
      (result.status === 'started' || result.status === 'replaced')
    ) {
      context.note(result.note);
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(this.beginLine(subject))
        .toPeers(this.beginPeers(actor))
        .send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') {
      return; // onComplete already ran (incl. its own render)
    }
    if (!result.ok && result.reason === 'engagement-conflict') {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`Your hands are busy with something else.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'engagement-conflict',
        detail: 'busy',
      });
      return;
    }
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You can't search just now.`)
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'start-rejected',
      detail:
        !result.ok && result.reason === 'start-rejected'
          ? result.error.message
          : '',
    });
  }

  /**
   * Resolve broad-vs-narrow scope. A named container → rummage inside it
   * (narrow-deep, over its contents); no target → the whole surroundings
   * (broad-shallow, the location's concealable contents + its exits).
   */
  private buildScope(
    actor: Stuff,
    target: Stuff | null,
  ): { scope: Stuff[]; depth: SearchDepth; subject: Mml } {
    if (target && MixinApi.isContainer(target)) {
      return {
        scope: [...target.getContents()],
        depth: 'narrow',
        subject: Mml.item(target),
      };
    }
    // A named non-container: rummage its surface / immediate parts if any,
    // else there's simply nothing to open — still a valid (empty) search.
    if (target) {
      return { scope: [], depth: 'narrow', subject: Mml.item(target) };
    }
    const location = MixinApi.isContainable(actor)
      ? actor.getContainer()
      : null;
    const scope: Stuff[] = [];
    if (location && MixinApi.isContainer(location)) {
      scope.push(...location.getContents());
    }
    if (location && MixinApi.isExitable(location)) {
      for (const exit of location.getExits().values()) {
        scope.push(exit as unknown as Stuff);
      }
    }
    return { scope, depth: 'broad', subject: Mml.compose`your surroundings` };
  }

  /** Resolve the search and render discovered secrets + lingering hints. */
  private resolveAndRender(
    actor: Stuff,
    scope: readonly Stuff[],
    depth: SearchDepth,
  ): void {
    const found = PerceptionApi.resolveSearch(actor, scope, depth);
    const hints = PerceptionApi.hintsFor(actor, scope);

    let body: Mml;
    if (found.length > 0) {
      const list = Mml.list(found.map((f) => this.render(f)));
      body = Mml.compose`Your search turns up: ${list}.`;
    } else {
      body = Mml.compose`You search, but turn up nothing you hadn't already.`;
    }
    // Honest fog: name the tell, never the hidden thing. Authored hint if
    // present, else a generic nudge.
    for (const cand of hints) {
      const tell = MixinApi.isConcealable(cand)
        ? cand.getConcealmentHint()
        : undefined;
      body = Mml.compose`${body}\n${
        tell
          ? Mml.fromMarkup(tell)
          : Mml.compose`Something here still nags at you, just out of reach.`
      }`;
    }

    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }

  /** Render one discovered thing — an exit by its direction, else by name. */
  private render(found: Stuff): Mml {
    if (found instanceof Exit) return Mml.exit(found);
    return Mml.item(found);
  }

  private beginLine(subject: Mml): Mml {
    return Mml.compose`You begin searching ${subject}.`;
  }

  private beginPeers(actor: Stuff): Mml {
    return Mml.compose`${Mml.name(actor)} begins searching around.`;
  }

  private searchSeconds(): number {
    try {
      const raw = AppApi.setting(AppSettingKeys.concealmentSearchSeconds);
      if (raw === '' || raw == null) return DEFAULT_SEARCH_SECONDS;
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_SEARCH_SECONDS;
    } catch {
      return DEFAULT_SEARCH_SECONDS;
    }
  }
}
