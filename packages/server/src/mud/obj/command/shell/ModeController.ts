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
 *   - `mode <prefix…>` — set the submitting bar's prefix.
 *   - `mode off` / bare `mode` — clear the submitting bar's mode.
 *
 * The submitting bar is `context.barId` (defaults to `'main'`), carried
 * from the inbound `command` message. Every mutation writes the whole
 * map via `setClientState`, persists via `save()`, and pushes to
 * connected Interactives — the StyleController commit triple — so the
 * client's inline prefix indicator re-renders without a reconnect.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import Avatar from '../../Avatar';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';

const MODES_KEY = 'cockpit.inputModes';

type ModeHost = Stuff & HasInteractive;

interface ModeModel extends CommandModel {
  prefix?: string;
}

export default class ModeController extends CommandController<ModeModel> {
  execute(model: ModeModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error('ModeController: command giver lacks HasInteractive');
    }
    const host = giver as ModeHost;
    const barId = context.barId ?? 'main';

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

  /** Atomic commit: write, persist (Avatar only), push. */
  private commit(host: ModeHost, next: Record<string, string>): void {
    host.setClientState(MODES_KEY, next);
    if (host instanceof Avatar) {
      host.save().catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `ModeController.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    host.pushClientStateUpdate(MODES_KEY, next);
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.mode')
      .toSelf(body)
      .send();
  }
}
