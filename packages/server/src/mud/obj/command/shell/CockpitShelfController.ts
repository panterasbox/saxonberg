/**
 * CockpitShelfController — `cockpit shelf`, the widget shelf's pin
 * surface.
 *
 *   cockpit shelf list          what is on the shelf, and what is not
 *   cockpit shelf pin <row>     add it, at the end
 *   cockpit shelf unpin <row>   take it off
 *   cockpit shelf first <row>   move it to the front
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
 * ⚠ The actions ride **positional slots** (`action` / `row`) and
 * dispatch here, because subcommands are one level deep framework-wide
 * and `cockpit shelf` has already spent that level. So an unknown
 * action must be refused HERE — the matcher's `unknown-subcommand` path
 * never sees it. Same shape as `cockpit card`, which is the closest
 * exemplar in every respect: `list` / verb / `<id>`, two positionals, a
 * refusal that names the known set.
 *
 * ⭐ **`list` reports PINNED-NESS, not live-or-hatched.** The honesty
 * vocabulary — which rows render a real figure and which render their
 * reason — is client-side, because hatched-ness is a property of the
 * client's wiring rather than of the server's capability. The server
 * cannot know which of the fields it sends the client actually paints,
 * and a verb printing a guess would be exactly the kind of confident
 * wrong answer this build exists to eliminate.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import Avatar from '../../Avatar';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import {
  SHELF_ROW_IDS,
  DEFAULT_SHELF,
  type ShelfRowId,
} from '@saxonberg/types';

const SHELF_KEY = 'cockpit.shelf';
const SHELF_ACTIONS = ['list', 'pin', 'unpin', 'first'];

type ShelfHost = Stuff & HasInteractive;

interface ShelfModel extends CommandModel {
  /** `list` | `pin` | `unpin` | `first`. Bare `cockpit shelf` means `list`. */
  action?: string;
  /** The row to pin, unpin or move to the front. */
  row?: string;
}

export default class CockpitShelfController extends CommandController<ShelfModel> {
  execute(model: ShelfModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error(
        'CockpitShelfController: command giver lacks HasInteractive',
      );
    }
    const host = giver as ShelfHost;

    const action = model.action?.trim() || 'list';
    if (action === 'list') return this.executeList(host, context);

    if (!SHELF_ACTIONS.includes(action)) {
      return this.fail(
        context,
        `unknown shelf action '${action}' (known: ${SHELF_ACTIONS.join(', ')})`,
        'unknown-shelf-action',
      );
    }

    const row = model.row?.trim();
    if (!row) {
      return this.fail(
        context,
        `usage: cockpit shelf ${action} <row>`,
        'missing-arg',
      );
    }
    if (!(SHELF_ROW_IDS as readonly string[]).includes(row)) {
      // The machine voice, naming the known set — the
      // `cockpit style theme default` precedent. A refusal that says
      // only "no" leaves the player guessing at a closed vocabulary.
      return this.fail(
        context,
        `unknown shelf row '${row}' (known: ${SHELF_ROW_IDS.join(', ')})`,
        'unknown-shelf-row',
      );
    }

    const current = this.currentShelf(host);
    if (action === 'first') {
      if (current[0] === row) {
        // Already the head. Not an error — the state the player asked
        // for is the state they have — and crucially not a rewrite,
        // which would push an identical array and re-save for nothing.
        return this.send(
          context,
          Mml.fromMarkup(
            Mml.escape(`\n${row} already heads the shelf\n`),
          ),
        );
      }
      const wasPinned = current.includes(row as ShelfRowId);
      this.commit(host, [
        row as ShelfRowId,
        ...current.filter((r) => r !== row),
      ]);
      return this.send(
        context,
        Mml.fromMarkup(
          Mml.escape(
            wasPinned
              ? `\n${row} moved to the front of the shelf\n`
              : `\n${row} pinned to the front of the shelf\n`,
          ),
        ),
      );
    }

    if (action === 'pin') {
      if (current.includes(row as ShelfRowId)) {
        return this.send(
          context,
          Mml.fromMarkup(Mml.escape(`\n${row} is already on the shelf\n`)),
        );
      }
      // Appended, not inserted at the catalogue position: the order is
      // the player's, and a pin that reshuffled the shelf would move
      // rows the player did not touch.
      this.commit(host, [...current, row as ShelfRowId]);
      return this.send(
        context,
        Mml.fromMarkup(Mml.escape(`\n${row} pinned to the shelf\n`)),
      );
    }

    if (!current.includes(row as ShelfRowId)) {
      return this.send(
        context,
        Mml.fromMarkup(Mml.escape(`\n${row} is not on the shelf\n`)),
      );
    }
    this.commit(
      host,
      current.filter((r) => r !== row),
    );
    this.send(
      context,
      Mml.fromMarkup(Mml.escape(`\n${row} taken off the shelf\n`)),
    );
  }

  /*
   * Every row in catalogue order with its pinned-ness — including the
   * ones that are NOT pinned, which is the half that makes this a
   * catalogue rather than a dump of current state. A player cannot pin
   * what the verb never mentioned.
   */
  private executeList(host: ShelfHost, context: CommandContext): void {
    const pinned = new Set(this.currentShelf(host));
    const lines = [`\nshelf (${pinned.size} of ${SHELF_ROW_IDS.length} pinned)`];
    for (const row of SHELF_ROW_IDS) {
      lines.push(`  ${row.padEnd(8)} ${pinned.has(row) ? 'pinned' : '—'}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(Mml.escape(lines.join('\n'))));
  }

  /**
   * The stored shelf, filtered to known rows.
   *
   * ⚠ The filter is not defensive clutter: `cockpit.shelf` is a
   * persisted field, so a shelf saved before a row was retired would
   * otherwise carry a name nothing can render. Dropping the unknown
   * beats surfacing it.
   */
  private currentShelf(host: ShelfHost): ShelfRowId[] {
    const stored = host.getClientState<ShelfRowId[]>(SHELF_KEY);
    if (!Array.isArray(stored)) return [...DEFAULT_SHELF];
    return stored.filter((r) =>
      (SHELF_ROW_IDS as readonly string[]).includes(r),
    );
  }

  /**
   * Atomic commit: write, persist, push — the `StyleController.commit`
   * shape, including its non-fatal save handling. A save rejection must
   * not crash the server or swallow the player's immediate feedback;
   * the push still fires and persistence catches up.
   */
  private commit(host: ShelfHost, next: ShelfRowId[]): void {
    host.setClientState(SHELF_KEY, next);
    if (host instanceof Avatar) {
      host.save().catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `CockpitShelfController.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    host.pushClientStateUpdate(SHELF_KEY, next);
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
      .tags(['control:shelf'])
      .toSelf(body)
      .send();
  }
}
