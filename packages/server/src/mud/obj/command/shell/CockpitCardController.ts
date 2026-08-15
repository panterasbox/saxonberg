/**
 * CockpitCardController — `cockpit card`, the manual override on a
 * card's hold condition.
 *
 *   cockpit card list            what is open, and why it is staying
 *   cockpit card pin <id>        keep it even once its condition lapses
 *   cockpit card dismiss <id>    drop it even though its condition holds
 *   cockpit card auto <id>       hand the decision back to the condition
 *
 * ⚠ Pinning is an **override on the five hold conditions, in both
 * directions** — not a sixth condition. A sixth condition could only
 * ever keep a card; it could never dismiss one whose condition still
 * holds, which is half of what a player needs.
 *
 * ⚠ This is a command, not a client-side toggle, for the same reason
 * everything else here is: the card set is server-authoritative, so the
 * override has to reach the server as a real dispatch — replayable,
 * scriptable, attributable, visible to a stream overlay.
 *
 * `dismiss` does not tear the card down inline. It marks the override
 * and lets the next re-resolve apply it, so a dismissal is released
 * down the same path — and emits the same reasoned envelope — as every
 * other release. A second teardown path is how a card ends up vanishing
 * without a reason.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import { Mml } from '../../../api/mml';

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

    const pinned = action === 'pin' ? true : action === 'dismiss' ? false : null;
    const ok = MqlSubscriptionApi.setCardPinned(interactive, cardId, pinned);
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
          ? 'dismissed'
          : 'released to its hold condition';
    this.send(
      context,
      Mml.fromMarkup(Mml.escape(`\ncard ${cardId} ${said}\n`)),
    );
  }

  private executeList(context: CommandContext): void {
    const cards = MqlSubscriptionApi.listCards(context.interactive!);
    if (cards.length === 0) {
      return this.send(context, Mml.fromMarkup('\nno cards open\n'));
    }
    const lines = ['\ncards'];
    for (const p of cards) {
      /*
       * ⚠ Name it by its CATALOGUE id. The `subscriptionId` is a
       * client-minted `nanoid` — showing it printed
       * `X9aYf67qws_FobUqk6M6I` at the player, which is the transport
       * handle the card catalogue exists to stop being an identity.
       * A card opened by shape rather than by name has no durable id;
       * it falls back to the handle, because that is genuinely all it
       * has.
       */
      const name = p.cardId ?? p.subscriptionId;
      /*
       * ⚠ A card need not have a hold — `inspect` and `location` do
       * not, because paint/clear means a focus change clears the body
       * rather than closing the card. This branch rendered `held while
       * undefined` until it was driven.
       */
      const state =
        p.pinned === true
          ? 'pinned'
          : p.pinned === false
            ? 'dismissed'
            : p.hold
              ? `held while ${p.hold}`
              : 'open';
      lines.push(`  ${name} (${state})`);
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
