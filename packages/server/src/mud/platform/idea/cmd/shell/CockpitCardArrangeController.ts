/**
 * CockpitCardArrangeController — `cockpit card <action> <card>` for the
 * shape actions: `close`, `grow`, `shrink`, `minimize`, `restore`,
 * `maximize`, `place`, `unplace` (over {@link CockpitCardControllerBase}).
 *
 * ⭐ ONE act — `Interactive.arrangeCard(card, action)` — with the action
 * word as its input, the way `fight`'s gambit words are one act
 * (client-surface D8). The view's stanza names it; this controller only
 * passes the word through and says the outcome. `move` has its own
 * controller because it takes a position.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { CardArrangeAction } from '../../CardRegistry';
import { CockpitCardControllerBase, type CardModel } from './CockpitCardControllerBase';

/** What each shape action says when it lands. */
const ARRANGED: Record<CardArrangeAction, string> = {
  close: 'closed',
  grow: 'grown',
  shrink: 'shrunk',
  minimize: 'in the tray',
  restore: 'restored from the tray',
  maximize: 'maximized',
  move: 'moved',
  place: 'placed — it stays where it is',
  unplace: 'flowing again',
};

/** How each refusal reads. */
const REFUSED: Record<string, string> = {
  'unknown-card': 'no open card',
  'primary-terminal': 'is the primary terminal and cannot be put away:',
};

export default class CockpitCardArrangeController extends CockpitCardControllerBase {
  execute(model: CardModel, context: CommandContext): void {
    this.arrange(model, context, model.subcommand as CardArrangeAction);
  }

  /** Arrange the card and say how it landed (shared with `move`). */
  protected arrange(
    model: CardModel,
    context: CommandContext,
    action: CardArrangeAction,
    at?: { col: number; row: number },
  ): void {
    const interactive = this.interactiveOf(context);
    if (!interactive) return;
    const cardId = model.cardId?.trim() ?? '';
    // ⭐ Named by what its header says, not the ref it was addressed by:
    // a card opened by a click is keyed `look #4Uans…`, and the echo
    // "card look #4Uans… in the tray" read the transport at the player.
    const name = this.cardName(context, cardId);
    const { refused, instanceId } = interactive.arrangeCard(cardId, action, at);
    if (refused === 'bad-position') {
      return this.fail(context, 'a column and row are whole numbers from 0', refused);
    }
    if (refused) {
      return this.fail(context, `${REFUSED[refused] ?? refused} '${cardId}'`, refused);
    }
    // `shrink` at the foot of the ladder lands in the tray — say so.
    const landed = interactive.listCards().find((c) => c.instanceId === instanceId);
    const said = action === 'shrink' && landed?.minimized ? ARRANGED.minimize : ARRANGED[action];
    this.send(context, Mml.fromMarkup(Mml.escape(`\ncard ${name} ${said}\n`)));
  }
}
