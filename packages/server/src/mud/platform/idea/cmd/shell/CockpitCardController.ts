/**
 * CockpitCardController — `cockpit card`, the player's override on the
 * one lifetime axis.
 *
 *   cockpit card list            what is open, its state, and its key
 *   cockpit card pin <id>        keep it out of the relevance window
 *   cockpit card dismiss <id>    let it age out again (`unpin`)
 *   cockpit card auto <id>       hand the decision back to the catalogue
 *   cockpit card close|grow|shrink|minimize|restore|place|unplace <id>
 *   cockpit card move <id> <col> <row>
 *
 * ⭐ The shape-and-place actions (client-surface D8) all go through
 * `Interactive.arrangeCard`, which reports a `card-arranged`; this
 * controller only names the act and words the outcome.
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
import { Mml } from '../../../../api/mml';
import type { CardArrangeAction } from '../../CardRegistry';

interface CardModel extends CommandModel {
  /** One of {@link CARD_ACTIONS}. */
  action?: string;
  /** The card to act on — its key, its catalogue name, or its id. */
  cardId?: string;
  /** `move`'s column, in units. */
  col?: number;
  /** `move`'s row. */
  row?: number;
}

const PIN_ACTIONS = ['pin', 'unpin', 'dismiss', 'auto'];
const ARRANGE_ACTIONS: readonly CardArrangeAction[] = [
  'close',
  'grow',
  'shrink',
  'minimize',
  'restore',
  'move',
  'place',
  'unplace',
];
const CARD_ACTIONS = ['list', ...PIN_ACTIONS, ...ARRANGE_ACTIONS];

/** What each shape-and-place action says when it lands. */
const ARRANGED: Record<CardArrangeAction, string> = {
  close: 'closed',
  grow: 'grown',
  shrink: 'shrunk',
  minimize: 'in the tray',
  restore: 'restored from the tray',
  move: 'moved',
  place: 'placed — it stays where it is',
  unplace: 'flowing again',
};

/** How each refusal reads. */
const REFUSED: Record<string, string> = {
  'unknown-card': 'no open card',
  'role-card': 'fills a role and cannot be closed or unplaced:',
  'primary-terminal': 'is the primary terminal and cannot be put away:',
};

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

    if ((ARRANGE_ACTIONS as readonly string[]).includes(action)) {
      return this.executeArrange(context, action as CardArrangeAction, cardId, model);
    }

    // `auto` hands the decision back to the catalogue's own default;
    // `unpin` is `dismiss` by its other name.
    const pinned =
      action === 'pin' ? true : action === 'dismiss' || action === 'unpin' ? false : null;
    const name = this.cardName(context, cardId);
    const ok = interactive.setCardPinned(cardId, pinned);
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
        : action === 'dismiss' || action === 'unpin'
          ? 'dismissed — it will age out of the relevance window'
          : 'returned to its default';
    this.send(
      context,
      Mml.fromMarkup(Mml.escape(`\ncard ${name} ${said}\n`)),
    );
  }

  private executeArrange(
    context: CommandContext,
    action: CardArrangeAction,
    cardId: string,
    model: CardModel,
  ): void {
    let at: { col: number; row: number } | undefined;
    if (action === 'move') {
      const col = Number(model.col);
      const row = Number(model.row);
      const unit = (n: number): boolean => Number.isInteger(n) && n >= 0;
      if (model.col === undefined || model.row === undefined) {
        return this.fail(context, 'usage: cockpit card move <card> <col> <row>', 'missing-arg');
      }
      if (!unit(col) || !unit(row)) {
        return this.fail(context, 'a column and row are whole numbers from 0', 'bad-position');
      }
      at = { col, row };
    }
    // ⭐ Named by what its header says, not the ref it was addressed by:
    // a card opened by a click is keyed `look #4Uans…`, and the echo
    // "card look #4Uans… in the tray" read the transport at the player.
    const name = this.cardName(context, cardId);
    const { refused } = context.interactive!.arrangeCard(cardId, action, at);
    if (refused) {
      return this.fail(context, `${REFUSED[refused] ?? refused} '${cardId}'`, refused);
    }
    this.send(context, Mml.fromMarkup(Mml.escape(`\ncard ${name} ${ARRANGED[action]}\n`)));
  }

  /** A card's header title when it has one, else the ref as typed. */
  private cardName(context: CommandContext, cardRef: string): string {
    const cards = context.interactive!.listCards();
    const hit =
      cards.find((c) => c.key === cardRef) ??
      cards.find((c) => c.cardId === cardRef) ??
      cards.find((c) => c.instanceId === cardRef);
    return hit?.title ? `“${hit.title}”` : cardRef;
  }

  private executeList(context: CommandContext): void {
    const cards = context.interactive!.listCards();
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
      const where = c.placed ? `, at ${c.placed.col},${c.placed.row}` : '';
      const tray = c.minimized ? ', in the tray' : '';
      const role = c.role ? `, ${c.role}` : '';
      lines.push(
        `  ${c.cardId} (${state}, ${liveness}, ${c.size}${where}${tray}${role}) — ${c.key}`,
      );
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
