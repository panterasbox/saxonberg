/**
 * CockpitCardController — `cockpit card`, the player's override on the
 * one lifetime axis.
 *
 *   cockpit card list            what is open, its state, and its key
 *   cockpit card pin <id>        keep it out of the relevance window
 *   cockpit card dismiss <id>    let it age out again
 *   cockpit card auto <id>       hand the decision back to the catalogue
 *
 * ⭐ **Pinned or unpinned is the WHOLE lifetime.** The five hold
 * conditions this verb used to override are gone: four were spatial and
 * each cost a wake to fire, and `unanswered`'s guarantee — *nothing
 * still actionable ever leaves* — moved onto this axis, where a prompt
 * card opens pinned and auto-releases when answered.
 *
 * ⚠ This is a command, not a client-side toggle, for the same reason
 * everything else here is: the card set is server-authoritative, so the
 * override has to reach the server as a real dispatch — replayable,
 * scriptable, attributable, visible to a stream overlay.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import { Mml } from '../../../../api/mml';

interface CardModel extends CommandModel {
  /** `list` | `pin` | `dismiss` | `auto`. */
  action?: string;
  /** The subscription id of the card to act on. */
  cardId?: string;
}

const CARD_ACTIONS = ['list', 'pin', 'dismiss', 'auto'];

export default class CockpitCardController extends CommandController<CardModel> {
  execute(model: CardModel, context: CommandContext): void {
    const interactive = context.interactive;
    if (!interactive) {
      return this.fail(
        context,
        'cards belong to a connection, and this command has none',
        'no-interactive',
      );
    }

    const action = model.action?.trim() || 'list';
    if (action === 'list') return this.executeList(context);

    if (!CARD_ACTIONS.includes(action)) {
      return this.fail(
        context,
        `unknown card action '${action}' (known: ${CARD_ACTIONS.join(', ')})`,
        'unknown-card-action',
      );
    }

    const cardId = model.cardId?.trim();
    if (!cardId) {
      return this.fail(
        context,
        `usage: cockpit card ${action} <card>`,
        'missing-arg',
      );
    }

    // `auto` hands the decision back to the catalogue's own default.
    const pinned = action === 'pin' ? true : action === 'dismiss' ? false : null;
    const ok = CardApi.setPinned(interactive, cardId, pinned);
    if (!ok) {
      return this.fail(
        context,
        `no open card '${cardId}'`,
        'unknown-card',
      );
    }

    const said =
      action === 'pin'
        ? 'pinned — it will stay until you dismiss it'
        : action === 'dismiss'
          ? 'dismissed — it will age out of the relevance window'
          : 'returned to its default';
    this.send(
      context,
      Mml.fromMarkup(Mml.escape(`\ncard ${cardId} ${said}\n`)),
    );
  }

  private executeList(context: CommandContext): void {
    const cards = CardApi.list(context.interactive!);
    if (cards.length === 0) {
      return this.send(context, Mml.fromMarkup('\nno cards open\n'));
    }
    const lines = ['\ncards'];
    for (const c of cards) {
      /*
       * ⚠ Name it by its CATALOGUE id. The instance id is server-minted
       * transport plumbing — printing `card-X9aYf67qws…` at a player is
       * the transport leaking into the interface, and it is the id the
       * catalogue exists to stop being an identity.
       */
      const state = c.pinned ? 'pinned' : 'open';
      /*
       * ⭐ **Say which cards are live.** Liveness is the axis a player
       * cannot otherwise observe: a static card shows a timestamp and a
       * refresh, a live one shows neither, and without the word here the
       * only way to tell them apart is to watch one fail to update.
       */
      const liveness = c.live ? 'live' : 'static';
      lines.push(`  ${c.cardId} (${state}, ${liveness}) — ${c.key}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(Mml.escape(lines.join('\n'))));
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(detail)}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:card'])
      .toSelf(body)
      .send();
  }
}
