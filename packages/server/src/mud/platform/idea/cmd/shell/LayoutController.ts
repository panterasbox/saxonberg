/**
 * LayoutController — `cockpit layout`, the **arrangement** axis.
 *
 *   cockpit layout <name>          recall an arrangement in this mode
 *   cockpit layout save <name>     name the current arrangement
 *   cockpit layout list            what is available here
 *   cockpit layout forget <name>   drop one you saved
 *
 * ⚠⚠ **An arrangement is not a closed vocabulary.** This verb used to
 * validate against a frozen `LAYOUT_NAMES`; it cannot any more, because
 * arrangements are *savable* — a player composes and names one. It
 * resolves against **the active mode's shipped defaults plus this
 * player's saved arrangements**, and that union is the whole reason
 * `LAYOUT_NAMES` was replaced by per-mode defaults rather than promoted.
 *
 * Arrangements are scoped to a mode, so a name that exists in a
 * *different* mode is refused **with the mode named**. "Unknown
 * arrangement" would be a lie to a player who has one by that name one
 * door over, and silently switching their mode to find it would be
 * worse — a recall is not a mode change.
 *
 * ⚠ Everything here rides `clientState`, not a new store: the memory in
 * `cockpit.arrangements`, the saved set in `cockpit.savedArrangements`.
 * Both already persist and already push.
 *
 * ⚠ The commit also writes the legacy `cockpit.layout` key. That is a
 * compatibility projection for the shipped client, which still swaps
 * its frame off that key — see `legacyLayoutFor`. It dies with the
 * client overhaul; the two real axes are mode and arrangement.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import Avatar from '../../../agent/Avatar';
import type { HasInteractive } from '../../../../lib/connection/HasInteractive';
import type { ArrangementSpec, CockpitMode, CardId } from '@saxonberg/types';
import { CardApi } from '../../../../api/card';

const LAYOUT_KEY = 'cockpit.layout';
const ARRANGEMENTS_KEY = 'cockpit.arrangements';
const SAVED_KEY = 'cockpit.savedArrangements';

type LayoutHost = Stuff & HasInteractive;

interface LayoutModel extends CommandModel {
  /** Either an arrangement name, or one of `save` / `list` / `forget`. */
  name?: string;
  /** The arrangement name, when `name` was an action word. */
  target?: string;
}

export default class LayoutController extends CommandController<LayoutModel> {
  execute(model: LayoutModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error('LayoutController: command giver lacks HasInteractive');
    }
    // `isHasInteractive` above narrows `giver` to `Stuff & HasInteractive`.
    const host: LayoutHost = giver;
    const mode = host.getCockpitMode();

    const word = model.name?.trim();
    if (!word || word === 'list') return this.executeList(host, mode, context);
    if (word === 'save') {
      return this.executeSave(host, mode, model.target?.trim(), context);
    }
    if (word === 'forget') {
      return this.executeForget(host, mode, model.target?.trim(), context);
    }
    return this.executeRecall(host, mode, word, context);
  }

  /** `cockpit layout <name>` — activate an arrangement of this mode. */
  private executeRecall(
    host: LayoutHost,
    mode: CockpitMode,
    name: string,
    context: CommandContext,
  ): void {
    if (!host.getArrangementNames(mode).includes(name)) {
      // Name the owning mode when there is one. This is the difference
      // between a useful refusal and a dead end.
      const elsewhere = host.findArrangementMode(name, mode);
      if (elsewhere) {
        return this.fail(
          context,
          `'${name}' is a ${elsewhere} arrangement, and you are in ${mode} ` +
            `(try \`cockpit mode ${elsewhere}\` first)`,
          'wrong-mode-arrangement',
        );
      }
      return this.fail(
        context,
        `unknown ${mode} arrangement '${name}' ` +
          `(known: ${host.getArrangementNames(mode).join(', ')})`,
        'unknown-arrangement',
      );
    }

    this.commit(host, mode, name);
    /*
     * ⭐⭐ **Recalling an arrangement now OPENS it.**
     *
     * ⚠ Until this build, `save` wrote a card list that `recall` never
     * read: the name appeared in `list`, recalling it restored nothing,
     * and the whole feature was a naming feature. The card catalogue
     * fixed the first half — cards finally had a durable id worth
     * saving — and this is the second.
     */
    const interactive = context.interactive;
    if (interactive) {
      CardApi.applyArrangement(
        interactive,
        host.arrangementCards(mode, name),
      );
    }
    this.send(
      context,
      Mml.fromMarkup(
        Mml.escape(`\nlayout set to ${name} (${mode})\n`),
      ),
    );
  }

  /** `cockpit layout save <name>` — name the current arrangement. */
  private executeSave(
    host: LayoutHost,
    mode: CockpitMode,
    name: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) {
      return this.fail(context, 'usage: cockpit layout save <name>', 'missing-arg');
    }
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
      ? CardApi.list(context.interactive)
      : [];
    const cards = [
      ...new Set(
        open.map((p) => p.cardId).filter((id): id is CardId => id !== undefined),
      ),
    ];
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

  /** `cockpit layout forget <name>` — drop a saved arrangement. */
  private executeForget(
    host: LayoutHost,
    mode: CockpitMode,
    name: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) {
      return this.fail(context, 'usage: cockpit layout forget <name>', 'missing-arg');
    }
    if (host.isShippedArrangement(mode, name)) {
      return this.fail(
        context,
        `'${name}' ships with ${mode} and cannot be forgotten`,
        'shipped-arrangement',
      );
    }
    const saved = this.cloneSaved(host);
    const forMode: Record<string, ArrangementSpec> = { ...(saved[mode] ?? {}) };
    if (forMode[name] === undefined) {
      return this.fail(
        context,
        `you have no saved ${mode} arrangement '${name}'`,
        'unknown-arrangement',
      );
    }
    delete forMode[name];
    saved[mode] = forMode;
    host.setClientState(SAVED_KEY, saved);

    // Forgetting the one you are in drops you to the mode's default.
    if (host.getCockpitArrangement(mode) === name) {
      this.commit(host, mode, host.getArrangementNames(mode)[0] ?? 'default');
    } else {
      this.persistAndPush(host, mode);
    }
    this.send(
      context,
      Mml.fromMarkup(Mml.escape(`\nforgot ${mode} arrangement '${name}'\n`)),
    );
  }

  /** `cockpit layout list` / bare — what is available in this mode. */
  private executeList(
    host: LayoutHost,
    mode: CockpitMode,
    context: CommandContext,
  ): void {
    const active = host.getCockpitArrangement(mode);
    const lines = [`\n${mode} arrangements`];
    for (const name of host.getArrangementNames(mode)) {
      const marker = name === active ? '*' : ' ';
      const origin = host.isShippedArrangement(mode, name) ? 'shipped' : 'saved';
      lines.push(`  ${marker} ${name} (${origin})`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(Mml.escape(lines.join('\n'))));
  }

  private cloneSaved(
    host: LayoutHost,
  ): Record<string, Record<string, ArrangementSpec>> {
    const current =
      host.getClientState<Record<string, Record<string, ArrangementSpec>>>(
        SAVED_KEY,
      );
    return { ...current };
  }

  /**
   * Atomic commit: remember the arrangement for this mode, project the
   * legacy layout key for the shipped client, persist, push.
   *
   * `save()` failures are logged, never propagated: a save rejection
   * must not break the player's immediate UI feedback. The push still
   * fires so the client swaps; persistence catches up next save.
   */
  private commit(host: LayoutHost, mode: CockpitMode, name: string): void {
    const arrangements = {
      ...host.getClientState<Record<string, string>>(ARRANGEMENTS_KEY),
      [mode]: name,
    };
    host.setClientState(ARRANGEMENTS_KEY, arrangements);
    host.setClientState(LAYOUT_KEY, host.legacyLayoutFor(mode, name));
    this.persistAndPush(host, mode);
  }

  private persistAndPush(host: LayoutHost, _mode: CockpitMode): void {
    if (host instanceof Avatar) {
      host.save().catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `LayoutController.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    for (const key of [ARRANGEMENTS_KEY, SAVED_KEY, LAYOUT_KEY]) {
      host.pushClientStateUpdate(key, host.getClientState(key));
    }
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
      .tags(['control:layout'])
      .toSelf(body)
      .send();
  }
}
