/**
 * CliController — the player's surface for prefixing one command line
 * (`HasInteractiveMixin.clientState['cockpit.inputModes']`).
 *
 * Reached as `cockpit cli …`. It was the standalone `mode` verb until
 * the cockpit consolidation, then briefly `cockpit scope`.
 *
 * ⚠ **Neither of those names survived, and the reasons are worth
 * keeping.** `mode` had to go because `cockpit mode` now means the
 * activity axis (chat / play / watch / …). `scope` had to go because
 * it made three unrelated things share one word: a command spec's
 * `scope:` is an MQL search anchor, a sandbox scope is a jurisdiction,
 * and this is a text prefix on one input. The class is named for what
 * it edits now rather than for a verb it used to be.
 *
 * We run a command-line interface and multiplex it, so a player can
 * have several command lines open at once — the IRC-client shape (N
 * windows, each bound to a target) rather than anything bash has.
 *
 * Input mode is server-authoritative and **per-bar**: a `{ barId →
 * prefix }` map. The command interpreter
 * ({@link CommandApi.applyInputMode}, hooked in
 * `CommandGiver.executeCommand`) prepends a bar's prefix to bare input
 * submitted from that bar. This controller only edits the map; the
 * prepend is the load-bearing half.
 *
 *   - `cockpit cli [id] --prefix "<text>"` — set that line's prefix.
 *   - `cockpit cli [id] --clear` — clear it.
 *   - `cockpit cli [id]` — report it.
 *
 * The target line is resolved `model.cli ?? context.barId ?? 'main'`:
 *   - `context.barId` is the line the command was typed in (carried from
 *     the inbound `command` message) — the default for a typed `cli`.
 *   - the positional names a line explicitly. A UI affordance dispatches
 *     **un-prefixed** (no `barId` on the wire, so preview == send), so a
 *     prefix-setting button can't rely on `context.barId`; it names its
 *     target in the command instead (`cockpit cli stream-chat --prefix
 *     chat`). The target stays visible in the ghost-line preview — no
 *     hidden state.
 *
 * Every mutation writes the whole map via `setClientState` and pushes to
 * connected Interactives so the client's inline prefix indicator
 * re-renders without a reconnect. Input modes are **transient**
 * (`clientStateSchema` marks `cockpit.inputModes` transient): they live
 * with the live session, never persist, and reset on a fresh login — so
 * there is no save step and no cross-session barId vocabulary to keep.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { HasInteractive } from '../../../../lib/connection/HasInteractive';

const MODES_KEY = 'cockpit.inputModes';

type CliHost = Stuff & HasInteractive;

interface CliModel extends CommandModel {
  /** `--prefix "<text>"` — the prefix to prepend to bare input. */
  prefix?: string;
  /** `--clear` — drop this line's prefix. */
  clear?: boolean;
  /** Positional — name the line explicitly (un-prefixed affordances). */
  cli?: string;
}

export default class CliController extends CommandController<CliModel> {
  execute(model: CliModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error('CliController: command giver lacks HasInteractive');
    }
    // `isHasInteractive` above narrows `giver` to `Stuff & HasInteractive`.
    const host: CliHost = giver;
    // An explicit positional wins (un-prefixed affordances name their
    // target), then the line the command was typed in, then the main one.
    const barId = model.cli?.trim() || context.barId || 'main';

    const prefix = model.prefix?.trim();
    const next = this.cloneModes(host);
    const current = next[barId];

    // ⚠ Report is the BARE form, and it is deliberately not the same as
    // clear. The predecessor conflated them — bare `cockpit scope`
    // cleared the prefix — so a player checking what was set destroyed
    // it. `--clear` is now the only thing that clears.
    if (!prefix && model.clear !== true) {
      return this.send(
        context,
        current === undefined
          ? Mml.fromMarkup('\nthis command line has no prefix\n')
          : Mml.fromMarkup(
              `\nthis command line is prefixed \`${Mml.escape(current)} …\`\n`,
            ),
      );
    }

    if (model.clear === true) {
      if (current === undefined) {
        return this.send(
          context,
          Mml.fromMarkup('\nthis command line has no prefix\n'),
        );
      }
      delete next[barId];
      this.commit(host, next);
      return this.send(context, Mml.fromMarkup('\nprefix cleared\n'));
    }

    next[barId] = prefix!;
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(
        `\nprefix set — bare input dispatches as \`${Mml.escape(prefix!)} …\` ` +
          `(/ for a raw command, \`cockpit cli --clear\` to clear)\n`,
      ),
    );
  }

  /** Read the current map, shallow-clone it for mutation. */
  private cloneModes(host: CliHost): Record<string, string> {
    const current = host.getClientState<Record<string, string>>(MODES_KEY);
    return { ...current };
  }

  /**
   * Commit: write the transient map + push. No persistence — input mode
   * is transient session state (`cockpit.inputModes` is a transient
   * clientState key), so it stays in memory and dies with the session.
   */
  private commit(host: CliHost, next: Record<string, string>): void {
    host.setClientState(MODES_KEY, next);
    host.pushClientStateUpdate(MODES_KEY, next);
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:cli'])
      .toSelf(body)
      .send();
  }
}
