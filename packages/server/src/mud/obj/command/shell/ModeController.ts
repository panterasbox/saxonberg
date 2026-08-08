/**
 * ModeController — the player's surface for scoping a command bar's
 * input mode (`HasInteractiveMixin.clientState['cockpit.inputModes']`).
 *
 * Input mode is server-authoritative and **per-bar**: a `{ barId →
 * prefix }` map. The command interpreter
 * ({@link CommandApi.applyInputMode}, hooked in
 * `CommandGiver.executeCommand`) prepends a bar's prefix to bare input
 * submitted from that bar. This controller only edits the map; the
 * prepend is the load-bearing half.
 *
 *   - `mode <prefix…>` — set the target bar's prefix.
 *   - `mode off` / bare `mode` — clear the target bar's mode.
 *
 * The target bar is resolved `model.bar ?? context.barId ?? 'main'`:
 *   - `context.barId` is the bar the line was typed in (carried from the
 *     inbound `command` message) — the default for a typed `mode`.
 *   - `--bar <id>` (`model.bar`) names a bar explicitly. A UI affordance
 *     dispatches **un-moded** (no `barId` on the wire, so preview == send),
 *     so a mode-setting button can't rely on `context.barId`; it names its
 *     target in the command instead (`mode chat --bar stream-chat`). The
 *     target stays visible in the ghost-line preview — no hidden state.
 *
 * Every mutation writes the whole map via `setClientState` and pushes to
 * connected Interactives so the client's inline prefix indicator
 * re-renders without a reconnect. Input modes are **transient**
 * (`clientStateSchema` marks `cockpit.inputModes` transient): they live
 * with the live session, never persist, and reset on a fresh login — so
 * there is no save step and no cross-session barId vocabulary to keep.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';

const MODES_KEY = 'cockpit.inputModes';

type ModeHost = Stuff & HasInteractive;

interface ModeModel extends CommandModel {
  prefix?: string;
  /** `--bar <id>` — name the target bar explicitly (un-moded affordances). */
  bar?: string;
}

export default class ModeController extends CommandController<ModeModel> {
  execute(model: ModeModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error('ModeController: command giver lacks HasInteractive');
    }
    // `isHasInteractive` above narrows `giver` to `Stuff & HasInteractive`.
    const host: ModeHost = giver;
    // Explicit `--bar` wins (un-moded affordances name their target), then
    // the bar the line was typed in, then the main bar.
    const barId = model.bar?.trim() || context.barId || 'main';

    const prefix = model.prefix?.trim();
    const next = this.cloneModes(host);

    if (!prefix || prefix.toLowerCase() === 'off') {
      // `mode` / `mode off` — clear this bar's mode.
      if (next[barId] === undefined) {
        this.commit(host, next);
        return this.send(
          context,
          Mml.fromMarkup('\nthis bar has no mode set\n'),
        );
      }
      delete next[barId];
      this.commit(host, next);
      return this.send(context, Mml.fromMarkup('\nmode cleared\n'));
    }

    // `mode <prefix…>` — scope this bar to the prefix.
    next[barId] = prefix;
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(
        `\nmode set — bare input dispatches as \`${Mml.escape(prefix)} …\` ` +
          `(/ for a raw command, \`mode off\` to clear)\n`,
      ),
    );
  }

  /** Read the current map, shallow-clone it for mutation. */
  private cloneModes(host: ModeHost): Record<string, string> {
    const current = host.getClientState<Record<string, string>>(MODES_KEY);
    return { ...current };
  }

  /**
   * Commit: write the transient map + push. No persistence — input mode
   * is transient session state (`cockpit.inputModes` is a transient
   * clientState key), so it stays in memory and dies with the session.
   */
  private commit(host: ModeHost, next: Record<string, string>): void {
    host.setClientState(MODES_KEY, next);
    host.pushClientStateUpdate(MODES_KEY, next);
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:mode'])
      .toSelf(body)
      .send();
  }
}
