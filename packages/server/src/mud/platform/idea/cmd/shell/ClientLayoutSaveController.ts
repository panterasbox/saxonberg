/**
 * ClientLayoutSaveController — `client-layout save <name>`: name the current
 * arrangement, capturing the cards actually open with their shape and
 * place (over {@link ClientLayoutControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { ArrangementSpec, ArrangementCard, CardId } from '@saxonberg/types';
import {
  ClientLayoutControllerBase,
  SAVED_KEY,
  type LayoutModel,
} from './ClientLayoutControllerBase';

export default class ClientLayoutSaveController extends ClientLayoutControllerBase {
  execute(model: LayoutModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const mode = host.getCockpitMode();
    const name = model.name?.trim() ?? '';

    // Player input: bounded, and never allowed to shadow a shipped
    // default. Both refusals say which rule they hit.
    const problem = host.validateArrangementName(mode, name);
    if (problem) return this.fail(context, problem, 'bad-arrangement-name');

    const saved = this.cloneSaved(host);
    const forMode: Record<string, ArrangementSpec> = { ...(saved[mode] ?? {}) };
    const existed = forMode[name] !== undefined;

    /*
     * ⭐ Capture the cards that are actually open, by their CATALOGUE
     * name.
     *
     * ⚠ This used to write `cards: []` and say "saved", which made the
     * whole feature a naming feature: the name appeared in `list`,
     * recalling it restored nothing, and no code path anywhere ever
     * filled the array. That was not laziness — it was the only honest
     * thing to write, because the only id a card HAD was the
     * client-minted `subscriptionId`, a `nanoid` that dies on
     * reconnect. Saving those would have produced an arrangement that
     * decayed to garbage the moment the socket dropped.
     *
     * ⚠ A held subscription opened by SHAPE rather than by name has no
     * `cardId` and is skipped — there is nothing durable to record. It
     * is dropped silently on purpose: the alternative is refusing the
     * save over a card the player never asked for by name.
     */
    const open = context.interactive
      ? context.interactive.listCards()
      : [];
    // ⭐ With each card's shape and place, in units (client-surface D5) —
    // the arrangement is the workspace, not just its membership. A subject
    // card is a moment, not a workspace, and is not recorded.
    // ⭐ Every TERMINAL is its own card — its filter, its input mode, and
    // whether it is the primary (D5) — so recall rebuilds the same set of
    // terminals rather than one extra unfiltered one.
    const inputModes =
      (host.getClientState<Record<string, string>>('cockpit.inputModes') ?? {}) as Record<string, string>;
    const seen = new Set<CardId>();
    const cards: ArrangementCard[] = [];
    for (const c of open) {
      if (c.role === 'here' || c.cardId === 'subject') continue;
      if (c.cardId !== 'terminal') {
        if (seen.has(c.cardId)) continue;
        seen.add(c.cardId);
      }
      const mode = c.terminal ? inputModes[c.terminal.barId] : undefined;
      cards.push({
        cardId: c.cardId,
        size: c.size,
        pinned: c.pinned,
        ...(c.minimized ? { minimized: true } : {}),
        ...(c.placed ? { placed: c.placed } : {}),
        ...(c.terminal
          ? {
              terminal: {
                filter: c.terminal.filter,
                ...(mode ? { inputMode: mode } : {}),
                ...(c.terminal.primary ? { primary: true as const } : {}),
              },
            }
          : {}),
      });
    }
    forMode[name] = { cards };
    saved[mode] = forMode;
    host.setClientState(SAVED_KEY, saved);

    this.commit(host, mode, name);
    this.send(
      context,
      Mml.fromMarkup(
        Mml.escape(
          `\n${existed ? 'updated' : 'saved'} ${mode} arrangement ` +
            `'${name}' — ${cards.length} card${cards.length === 1 ? '' : 's'}\n`,
        ),
      ),
    );
    }
}
