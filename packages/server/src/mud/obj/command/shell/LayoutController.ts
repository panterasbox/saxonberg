/**
 * LayoutController — the player's surface for switching the cockpit
 * layout (`HasInteractiveMixin.clientState['cockpit.layout']`).
 *
 * `layout <name>` writes the named layout, persists it, and pushes the
 * `client-state-update` to every connected Interactive so the client
 * swaps the whole cockpit without waiting on a reconnect. The client
 * holds a `layout → component` registry keyed by these names; the
 * server is the single source of truth for which one is active.
 *
 * Layout is server-authoritative per-player UI state, identical in kind
 * to `style.overlay` and `console.tabs` — so this controller mirrors
 * `StyleController`'s write+save+push commit shape. Unknown names reject
 * via a `controller-rejected` note; the write never lands.
 *
 * There is no auto-switch: the only way to change layout is this verb
 * (typed, or sent by the "Views" menu). The `forum` verb stays pure
 * forum CRUD — you reach the board view via `layout forum`.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import Avatar from '../../Avatar';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import { LAYOUT_NAMES, type LayoutName } from '@saxonberg/types';

const LAYOUT_KEY = 'cockpit.layout';

type LayoutHost = Stuff & HasInteractive;

interface LayoutModel extends CommandModel {
  name?: string;
}

export default class LayoutController extends CommandController<LayoutModel> {
  execute(model: LayoutModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error('LayoutController: command giver lacks HasInteractive');
    }
    // `isHasInteractive` above narrows `giver` to `Stuff & HasInteractive`.
    const host: LayoutHost = giver;

    const name = model.name?.trim();
    if (!name) {
      return this.fail(
        context,
        `usage: layout <${LAYOUT_NAMES.join(' | ')}>`,
        'missing-arg',
      );
    }
    if (!(LAYOUT_NAMES as readonly string[]).includes(name)) {
      return this.fail(
        context,
        `unknown layout '${name}' (known: ${LAYOUT_NAMES.join(', ')})`,
        'unknown-layout',
      );
    }

    this.commit(host, name as LayoutName);
    this.send(
      context,
      Mml.fromMarkup(`\nlayout set to ${Mml.escape(name)}\n`),
    );
  }

  /**
   * Atomic commit: write, persist, push — the StyleController shape.
   * `save()` failures are logged, never propagated: a save rejection
   * must not break the player's immediate UI feedback. The push still
   * fires so the client swaps; persistence catches up next save.
   */
  private commit(host: LayoutHost, name: LayoutName): void {
    host.setClientState(LAYOUT_KEY, name);
    if (host instanceof Avatar) {
      host.save().catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `LayoutController.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    host.pushClientStateUpdate(LAYOUT_KEY, name);
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
