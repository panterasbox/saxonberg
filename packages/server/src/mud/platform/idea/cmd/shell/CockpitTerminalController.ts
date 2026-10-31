/**
 * CockpitTerminalController — `cockpit terminal`, which view or channel a
 * terminal card shows (client-surface D6).
 *
 *   cockpit terminal <view>            show a view in the primary terminal
 *   cockpit terminal #<channel>        show a channel in the primary
 *   cockpit terminal <view> --beside   open it in a new terminal card
 *   cockpit terminal primary <card>    make another terminal the primary
 *
 * ⭐ A terminal is a card with its own bar; the registry owns which
 * terminals are up and which is primary. This controller only checks that
 * the view exists — a console view the player has, or `All` — and words
 * the outcome. A name that is neither a view nor a `#channel` refuses
 * `unknown-view`, so a typo never silently opens an empty terminal.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ALL_VIEW, type ConsoleTab, type TerminalFilter } from '@saxonberg/types';

interface TerminalModel extends CommandModel {
  /** A view name, `#<channel>`, or `primary`. */
  target?: string;
  /** `primary`'s card. */
  cardId?: string;
  beside?: boolean;
}

export default class CockpitTerminalController extends CommandController<TerminalModel> {
  execute(model: TerminalModel, context: CommandContext): void {
    const interactive = context.interactive;
    if (!interactive) {
      return this.fail(
        context,
        'terminals belong to a connection, and this command has none',
        'no-interactive',
      );
    }
    const target = model.target?.trim();
    if (!target) {
      return this.fail(
        context,
        'usage: cockpit terminal <view|#channel> [--beside]  ·  cockpit terminal primary <card>',
        'missing-arg',
      );
    }

    if (target === 'primary') {
      const card = model.cardId?.trim();
      if (!card) {
        return this.fail(context, 'usage: cockpit terminal primary <card>', 'missing-arg');
      }
      const refused = interactive.setPrimaryTerminal(card);
      if (refused) {
        return this.fail(
          context,
          refused === 'not-a-terminal' ? `'${card}' is not a terminal` : `no open card '${card}'`,
          refused,
        );
      }
      return this.send(context, `\nterminal ${card} is now the primary\n`);
    }

    const filter = this.filterFor(target, context);
    if (!filter) {
      return this.fail(
        context,
        `no view '${target}' — name one of your console views, All, or a #channel`,
        'unknown-view',
      );
    }
    const beside = model.beside === true;
    interactive.showInTerminal(filter, beside);
    const shown = filter.channel ? `#${filter.channel}` : (filter.view ?? ALL_VIEW);
    this.send(
      context,
      beside ? `\n${shown} opened in a new terminal\n` : `\nthe terminal now shows ${shown}\n`,
    );
  }

  /**
   * The filter a target names: `#name` is a channel; `All` is everything;
   * anything else must be one of the player's console views, whose mutes
   * and facets the terminal carries.
   */
  private filterFor(target: string, context: CommandContext): TerminalFilter | null {
    if (target.startsWith('#') && target.length > 1) return { channel: target.slice(1) };
    if (target.toLowerCase() === ALL_VIEW.toLowerCase()) return { view: ALL_VIEW };
    const giver = context.commandGiver;
    if (!MixinApi.isClientState(giver)) return null;
    const tabs = giver.getClientState<ConsoleTab[]>('console.tabs') ?? [];
    const tab = tabs.find((t) => t.name.toLowerCase() === target.toLowerCase());
    if (!tab) return null;
    return {
      view: tab.name,
      ...(tab.muted.length > 0 ? { muted: [...tab.muted] } : {}),
      ...(tab.facets ? { facets: tab.facets } : {}),
    };
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:terminal'])
      .toSelf(Mml.fromMarkup(Mml.escape(text)))
      .send();
  }
}
