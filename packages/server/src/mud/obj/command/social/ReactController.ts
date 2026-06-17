/**
 * ReactController — `react [--to <person>] [--msg <#>] <emote-expression>`.
 *
 * A reaction is an act-scoped emote. The controller's only jobs are
 * (1) resolve the target act → `commandId` from the parser-typed
 * selectors (never string-sniffing), (2) validate reactability +
 * audience membership, and (3) dispatch the emote-expression through the
 * ordinary emote path with `inReactionTo` set. The tally / toggle /
 * threshold-suppression / renown all live in the `SoulMixin` hook +
 * `ReactionRegistry` — the controller does not touch the registry beyond
 * resolution/validation. "Reactions inherit the emote path wholesale."
 *
 * See docs/subsystems/reactions.md.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import type { EmoteOptions } from '../../../lib/social/Soul';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { ReactionApi } from '../../../api/reaction';
import { SoulApi } from '../../../api/soul';
import { EmoteGrammarRunner } from '../../../lib/social/EmoteGrammar';
import type { MqlOneResult } from '../../../api/mql';

interface ReactModel extends CommandModel {
  /** The greedy emote-expression, e.g. `;wave bob` / `nod` / `cheer`. */
  expression: string;
  /** From `--to <person>` (type: object → MqlOneResult). */
  toPerson?: MqlOneResult;
  /** From `--msg <#>` (kept as string; parsed here). */
  msgNum?: string;
}

export default class ReactController extends CommandController<ReactModel> {
  async execute(model: ReactModel, context: CommandContext): Promise<void> {
    const reactor = context.commandGiver;
    if (!MixinApi.isSoul(reactor)) {
      context.note({ kind: 'mixin-missing', mixin: 'SoulMixin' });
      return;
    }

    // 1. Resolve the act → commandId from the parser-typed selectors.
    const interactive = context.interactive;
    let commandId: string | null = null;
    if (model.msgNum !== undefined) {
      const n = Number.parseInt(model.msgNum, 10);
      if (!Number.isFinite(n) || !interactive) {
        context.note({
          kind: 'controller-rejected',
          reason: 'bad-msg-number',
          detail: `'${model.msgNum}' is not a message number on your screen.`,
        });
        return;
      }
      commandId = ReactionApi.resolveGutter(interactive, n);
    } else if (model.toPerson?.stuff) {
      commandId = ReactionApi.lastReactableActBy(model.toPerson.stuff.stuffId);
    } else if (interactive) {
      commandId = ReactionApi.lastDeliveredActFor(interactive);
    }

    // 2. Validate reactability + audience membership.
    if (!commandId || !ReactionApi.isReactableAct(commandId)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'not-reactable',
        detail:
          "You can't react to that — it isn't a reactable act, or " +
          "nothing recent is in view.",
      });
      return;
    }
    const scope = ReactionApi.scopeOf(commandId);
    if (!this.canReach(reactor, scope)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'not-in-audience',
        detail: "You can't react to that — you didn't witness it.",
      });
      return;
    }

    // 3. Parse the emote-expression through the existing emote path.
    let expr = model.expression.trim();
    if (expr.startsWith(':') || expr.startsWith(';')) expr = expr.slice(1).trim();
    const words = expr.split(/\s+/).filter(Boolean);
    const verb = words[0] ?? '';
    if (!verb) {
      context.note({
        kind: 'controller-rejected',
        reason: 'empty-expression',
        detail: 'React with what? Add an emote, e.g. `re ;smile`.',
      });
      return;
    }

    // 4. Dispatch with the scope. The mixin hook does the
    //    tally/toggle/suppression/renown.
    const emote = await SoulApi.resolve(verb);
    if (emote) {
      const bound = await EmoteGrammarRunner.bind(emote, words.slice(1), reactor);
      const opts: EmoteOptions = {
        fills: bound.fills,
        inReactionTo: commandId,
      };
      if (bound.target) opts.target = bound.target;
      reactor.emote(emote, opts);
    } else {
      reactor.emoteFree(expr, undefined, commandId);
    }
  }

  /** Audience-membership gate: the reactor must witness the act's scope. */
  private canReach(reactor: Stuff, scope: string | null): boolean {
    if (!scope) return false;
    if (scope.startsWith('location:')) {
      if (MixinApi.isContainable(reactor)) {
        const env = reactor.getContainer();
        if (env && `location:${env.stuffId}` === scope) return true;
      }
      if (
        MixinApi.isContainer(reactor) &&
        `location:${reactor.stuffId}` === scope
      ) {
        return true;
      }
      return false;
    }
    // Channel scope: in v1 the selector resolved the act from the
    // reactor's own view (their gutter ring / a subject they witnessed),
    // so membership is implied. Tighter channel-membership gating is a
    // later refinement.
    if (scope.startsWith('channel:')) return true;
    return false;
  }
}
