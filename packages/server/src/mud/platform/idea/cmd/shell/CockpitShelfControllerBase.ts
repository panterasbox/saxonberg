/**
 * CockpitShelfControllerBase — what the `cockpit shelf` controllers
 * share: the widget shelf's pin surface (controller-liquidity W7b, D2/D13:
 * `shelf` is a nested stanza, one controller per act over a base).
 *
 *   cockpit shelf [list]        what is on the shelf, and what is not — {@link CockpitShelfListController}
 *   cockpit shelf pin <row>     add it, at the end — {@link CockpitShelfPinController}
 *   cockpit shelf unpin <row>   take it off — {@link CockpitShelfUnpinController}
 *   cockpit shelf first <row>   move it to the front — {@link CockpitShelfFirstController}
 *
 * ⭐ **`first` exists because the shelf has an ORDER and a phone can
 * only show the head of it.** The mobile bar renders `shelf.slice(0, 3)`
 * as its glance-line, so *choosing* what rides a phone's bar is exactly
 * *reordering the shelf* — and until this action there was no way to do
 * that at all. The alternative was a second clientState key naming the
 * bar rows explicitly, which is two lists that must agree: an unpin that
 * forgot to update the glance key, a glance row that is not on the
 * shelf, and a `list` output that cannot say which is true. One ordered
 * list has one answer.
 *
 * ⚠ It **pins first when the row was not pinned**, because *"put this on
 * my bar"* is ONE intention and making a player type `pin` then `first`
 * would be two commands for one thought. The naming follows suit:
 * `first` over `promote`/`move`, because it names the resulting state
 * rather than the operation, and it reads correctly in the machine voice
 * — *coin moved to the front of the shelf*.
 *
 * ⚠ **Pinning is a command, not a client-side toggle**, and this is the
 * build's load-bearing reason for it. The status bar introduced
 * alongside this advertises one axiom — *every click sends a command,
 * and the interface shows which*. A pin affordance that mutated local
 * state while the status bar previewed a command would falsify the one
 * claim that bar exists to make. The cockpit keyspace is already
 * server-owned besides, and a second persistence path for one
 * preference is drift.
 *
 * ⭐ The words are the VIEW's now (W7b): the actions are nested stanzas
 * and `row` is a `values:` slot equal to `SHELF_ROW_IDS` (a test pins
 * the two together), so an unknown action or row is refused by the
 * binder, naming the known set, before any controller is cloned. They
 * used to ride positional slots refused here, because subcommands were
 * one level deep framework-wide.
 *
 * ⭐ **`list` reports PINNED-NESS, not live-or-hatched.** The honesty
 * vocabulary — which rows render a real figure and which render their
 * reason — is client-side, because hatched-ness is a property of the
 * client's wiring rather than of the server's capability. The server
 * cannot know which of the fields it sends the client actually paints,
 * and a verb printing a guess would be exactly the kind of confident
 * wrong answer this build exists to eliminate.
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
import {
  SHELF_ROW_IDS,
  DEFAULT_SHELF,
  type ShelfRowId,
} from '@saxonberg/types';

const SHELF_KEY = 'cockpit.shelf';

export type ShelfHost = Stuff & ClientState & SaxonbergClient;

export interface ShelfModel extends CommandModel {
  /** The row to pin, unpin or move to the front — one of `SHELF_ROW_IDS` (the view's `values:`). */
  row?: ShelfRowId;
}

export abstract class CockpitShelfControllerBase extends CommandController<ShelfModel> {
  /** The giver as a shelf host (the client mixin is the verb's precondition). */
  protected hostOf(context: CommandContext): ShelfHost {
    const giver = context.commandGiver;
    if (!MixinApi.isSaxonbergClient(giver)) {
      throw new Error(
        `${this.constructor.name}: command giver lacks the client mixin`,
      );
    }
    return giver as ShelfHost;
  }

  /**
   * The stored shelf, filtered to known rows.
   *
   * ⚠ The filter is not defensive clutter: `cockpit.shelf` is a
   * persisted field, so a shelf saved before a row was retired would
   * otherwise carry a name nothing can render. Dropping the unknown
   * beats surfacing it.
   */
  protected currentShelf(host: ShelfHost): ShelfRowId[] {
    const stored = host.getClientState<ShelfRowId[]>(SHELF_KEY);
    if (!Array.isArray(stored)) return [...DEFAULT_SHELF];
    return stored.filter((r) =>
      (SHELF_ROW_IDS as readonly string[]).includes(r),
    );
  }

  /**
   * Atomic commit: write, persist, push — the `StyleControllerBase.commit`
   * shape, including its non-fatal save handling. A save rejection must
   * not crash the server or swallow the player's immediate feedback;
   * the push still fires and persistence catches up.
   */
  protected commit(host: ShelfHost, next: ShelfRowId[]): void {
    host.setClientState(SHELF_KEY, next);
    if (host instanceof Avatar) {
      host.save().catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `CockpitShelfControllerBase.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    host.pushClientStateUpdate(SHELF_KEY, next);
  }

  /** Say one line on the shelf's control channel. */
  protected say(context: CommandContext, line: string): void {
    this.send(context, Mml.fromMarkup(Mml.escape(`\n${line}\n`)));
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:shelf'])
      .toSelf(body)
      .send();
  }
}
