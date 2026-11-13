/**
 * ClientCardControllerBase — what the `client-card` controllers share
 * (controller-liquidity W7b, D2/D13: `card` is a nested stanza, one
 * controller per act over a base per noun). `client-card` is the
 * player's override on the one lifetime axis and the card's shape and
 * place:
 *
 *   client-card [list]               — {@link ClientCardListController}
 *   client-card pin <card>           — {@link ClientCardPinController}
 *   client-card unpin|dismiss <card> — {@link ClientCardUnpinController}
 *   client-card auto <card>          — {@link ClientCardAutoController}
 *   client-card close|grow|shrink|minimize|restore|maximize|place|unplace <card>
 *                                     — {@link ClientCardArrangeController}
 *   client-card move <card> <col> <row> — {@link ClientCardMoveController}
 *
 * The words are the view's: an unknown action is refused by the binder,
 * naming the valid ones, before a controller is cloned.
 *
 * ⭐ **Pinned or unpinned is the WHOLE lifetime.** A prompt card opens
 * pinned and auto-releases when answered. ⚠ This is a command, not a
 * client-side toggle: the card set is server-authoritative, so the
 * override reaches the server as a real dispatch — replayable,
 * scriptable, attributable, visible to a stream overlay.
 *
 * Shared here: the words and the card's display name — no permission.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type Interactive from '../../Interactive';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

export interface CardModel extends CommandModel {
  /** The card to act on — its key, its catalogue name, or its id. */
  cardId?: string;
  /** `move`'s column, in units. */
  col?: number;
  /** `move`'s row. */
  row?: number;
}

export abstract class ClientCardControllerBase extends CommandController<CardModel> {
  /** The connection the cards belong to, or a refusal said and `null`. */
  protected interactiveOf(context: CommandContext): Interactive | null {
    const interactive = context.interactive;
    if (!interactive) {
      this.fail(
        context,
        'cards belong to a connection, and this command has none',
        'no-interactive',
      );
      return null;
    }
    return interactive;
  }

  /** A card's header title when it has one, else the ref as typed. */
  protected cardName(context: CommandContext, cardRef: string): string {
    const cards = context.interactive!.listCards();
    const hit =
      cards.find((c) => c.key === cardRef) ??
      cards.find((c) => c.cardId === cardRef) ??
      cards.find((c) => c.instanceId === cardRef);
    return hit?.title ? `“${hit.title}”` : cardRef;
  }

  /**
   * Set the card's pin (`true` keep, `false` let it age out, `null` hand
   * the decision back) and say it — the three pin acts' one body.
   */
  protected setPinned(
    model: CardModel,
    context: CommandContext,
    pinned: boolean | null,
    said: string,
  ): void {
    const interactive = this.interactiveOf(context);
    if (!interactive) return;
    const cardId = model.cardId?.trim() ?? '';
    const name = this.cardName(context, cardId);
    if (!interactive.setCardPinned(cardId, pinned)) {
      return this.fail(context, `no open card '${cardId}'`, 'unknown-card');
    }
    this.send(context, Mml.fromMarkup(Mml.escape(`\ncard ${name} ${said}\n`)));
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(detail)}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:card'])
      .toSelf(body)
      .send();
  }
}
