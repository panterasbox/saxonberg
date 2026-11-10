/**
 * LayoutControllerBase — what the `cockpit layout` controllers share:
 * the **arrangement** axis (controller-liquidity W7b, D2/D13: `layout` is
 * a nested stanza, one controller per act over a base).
 *
 *   cockpit layout list            what is available here — {@link LayoutListController}
 *   cockpit layout save <name>     name the current arrangement — {@link LayoutSaveController}
 *   cockpit layout forget <name>   drop one you saved — {@link LayoutForgetController}
 *   cockpit layout recall <name>   recall an arrangement in this mode — {@link LayoutRecallController}
 *   cockpit layout <name>          the same recall, by fallthrough
 *
 * ⭐ The control words are the VIEW's stanzas now, so a layout NAMED
 * `list` (or `save`, `forget`, `recall`) is saved with `cockpit layout
 * save list` and recalled with `cockpit layout recall list`. It used to
 * be caught before names and could never be recalled.
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
import Avatar from '../../../../lib/character/Avatar';
import type { ClientState } from '../../../../lib/connection/ClientState';
import type { SaxonbergClient } from '../../../../lib/connection/SaxonbergClient';
import type { ArrangementSpec, CockpitMode } from '@saxonberg/types';

const LAYOUT_KEY = 'cockpit.layout';
const ARRANGEMENTS_KEY = 'cockpit.arrangements';
export const SAVED_KEY = 'cockpit.savedArrangements';

export type LayoutHost = Stuff & ClientState & SaxonbergClient;

export interface LayoutModel extends CommandModel {
  /** The arrangement name. */
  name?: string;
}

export abstract class LayoutControllerBase extends CommandController<LayoutModel> {
  /** The giver as a layout host (the client mixin is the verb's precondition). */
  protected hostOf(context: CommandContext): LayoutHost {
    const giver = context.commandGiver;
    if (!MixinApi.isSaxonbergClient(giver)) {
      throw new Error(
        `${this.constructor.name}: command giver lacks the client mixin`,
      );
    }
    // `isSaxonbergClient` above narrows `giver` to `Stuff & ClientState & SaxonbergClient`.
    return giver;
  }

  /** What is available in this mode — the list read, shared with a bare recall. */
  protected list(
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

  protected cloneSaved(
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
  protected commit(host: LayoutHost, mode: CockpitMode, name: string): void {
    const arrangements = {
      ...host.getClientState<Record<string, string>>(ARRANGEMENTS_KEY),
      [mode]: name,
    };
    host.setClientState(ARRANGEMENTS_KEY, arrangements);
    host.setClientState(LAYOUT_KEY, host.legacyLayoutFor(mode, name));
    this.persistAndPush(host, mode);
  }

  protected persistAndPush(host: LayoutHost, _mode: CockpitMode): void {
    if (host instanceof Avatar) {
      host.save().catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `LayoutControllerBase.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    for (const key of [ARRANGEMENTS_KEY, SAVED_KEY, LAYOUT_KEY]) {
      host.pushClientStateUpdate(key, host.getClientState(key));
    }
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
      .tags(['control:layout'])
      .toSelf(body)
      .send();
  }
}
