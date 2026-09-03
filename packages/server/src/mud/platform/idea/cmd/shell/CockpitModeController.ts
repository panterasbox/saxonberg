/**
 * CockpitModeController — `cockpit mode <name>`, the activity axis.
 *
 * A mode is a **front door**: what am I here to do. It is the axis that
 * used to be conflated with the layout, because the five old layout
 * values were really a mode plus that mode's arrangement flattened into
 * one string.
 *
 * ⚠ **A mode gates nothing.** It selects which arrangements ship, which
 * one you land in, and which card kinds may be summoned. It does not
 * decide what you may run — everything runnable in `play` is runnable
 * in `build`. A mode that forbade a verb would be a permission system
 * wearing a UI costume, with its checks in the wrong layer; that is
 * why this controller writes client state and touches nothing else.
 *
 * Commits through the same write → save → push triple as
 * `LayoutController`, deliberately mirrored rather than reinvented: one
 * commit path for the whole `cockpit.*` keyspace.
 *
 * The commit also pins the mode's arrangement into
 * `cockpit.arrangements`. Entering a mode for the first time resolves
 * its arrangement (shipped default, or the legacy migration's answer)
 * and writes it down, so the map on the wire always carries a concrete
 * answer and the client never has to derive one.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import Avatar from '../../../agent/Avatar';
import type { HasInteractive } from '../../../../lib/connection/HasInteractive';
import { COCKPIT_MODES, type CockpitMode } from '@saxonberg/types';

const MODE_KEY = 'cockpit.mode';
const ARRANGEMENTS_KEY = 'cockpit.arrangements';

type ModeHost = Stuff & HasInteractive;

interface CockpitModeModel extends CommandModel {
  name?: string;
  /**
   * Optional arrangement to land in. Lets one command express "this
   * front door, in this arrangement" — which is what a Views-menu item
   * means, and why the menu can stay one click = one previewable
   * command instead of a hidden two-command sequence.
   */
  arrangement?: string;
}

export default class CockpitModeController extends CommandController<CockpitModeModel> {
  execute(model: CockpitModeModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error(
        'CockpitModeController: command giver lacks HasInteractive',
      );
    }
    // `isHasInteractive` above narrows `giver` to `Stuff & HasInteractive`.
    const host: ModeHost = giver;

    const name = model.name?.trim();
    if (!name) {
      // Bare `cockpit mode` reports rather than refusing — asking what
      // mode you are in is a reasonable thing to mean.
      const active = host.getCockpitMode();
      return this.send(
        context,
        Mml.fromMarkup(
          Mml.escape(
            `\nmode ${active} (arrangement ${host.getCockpitArrangement(active)})\n` +
              `available: ${COCKPIT_MODES.join(', ')}\n`,
          ),
        ),
      );
    }

    if (!(COCKPIT_MODES as readonly string[]).includes(name)) {
      return this.fail(
        context,
        `unknown mode '${name}' (known: ${COCKPIT_MODES.join(', ')})`,
        'unknown-mode',
      );
    }

    const mode = name as CockpitMode;

    // An explicit arrangement is checked against the mode being
    // ENTERED, not the one being left — otherwise `cockpit mode watch
    // streamer` from play would be judged against play's vocabulary.
    const wanted = model.arrangement?.trim();
    if (wanted && !host.getArrangementNames(mode).includes(wanted)) {
      return this.fail(
        context,
        `unknown ${mode} arrangement '${wanted}' ` +
          `(known: ${host.getArrangementNames(mode).join(', ')})`,
        'unknown-arrangement',
      );
    }

    const arrangement = this.commit(host, mode, wanted);
    /*
     * ⭐⭐ **A mode switch OPENS its arrangement's cards, server-side.**
     *
     * S3 shipped arrangements as storage, not behaviour: nothing opened
     * or closed a card on recall, on either side, so a saved workspace
     * was a name that did nothing. This is that behaviour.
     *
     * ⚠ The client sends ONE command and renders what arrives. It never
     * learns what an arrangement means, which is what keeps *the client
     * owns zero command semantics* literally true — and it costs one
     * round trip rather than one per card.
     */
    const interactive = context.interactive;
    if (interactive) {
      interactive.applyCardArrangement(
        host.arrangementCards(mode, arrangement),
      );
    }
    this.send(
      context,
      Mml.fromMarkup(
        Mml.escape(
          `\nmode set to ${mode} (arrangement ${arrangement})\n`,
        ),
      ),
    );
  }

  /**
   * Atomic commit: write, persist, push — the LayoutController shape.
   * Returns the arrangement the mode resolved to.
   *
   * `save()` failures are logged, never propagated: a save rejection
   * must not break the player's immediate UI feedback. The push still
   * fires so the client swaps; persistence catches up next save.
   */
  private commit(
    host: ModeHost,
    mode: CockpitMode,
    wanted?: string,
  ): string {
    host.setClientState(MODE_KEY, mode);

    // Resolve AFTER the mode write so the lookup is against the mode
    // we are entering, then pin it so the wire carries a concrete
    // answer even on a first entry. An explicit arrangement overrides
    // the remembered one — asking for it IS choosing it.
    const arrangement = wanted ?? host.getCockpitArrangement(mode);
    const arrangements = {
      ...host.getClientState<Record<string, string>>(ARRANGEMENTS_KEY),
      [mode]: arrangement,
    };
    host.setClientState(ARRANGEMENTS_KEY, arrangements);
    // Keep the compatibility projection in step — the shipped client
    // still paints from `cockpit.layout`.
    host.setClientState(
      'cockpit.layout',
      host.legacyLayoutFor(mode, arrangement),
    );

    if (host instanceof Avatar) {
      host.save().catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `CockpitModeController.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    host.pushClientStateUpdate(MODE_KEY, mode);
    host.pushClientStateUpdate(ARRANGEMENTS_KEY, arrangements);
    host.pushClientStateUpdate(
      'cockpit.layout',
      host.getClientState('cockpit.layout'),
    );
    return arrangement;
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
      .tags(['control:cockpit-mode'])
      .toSelf(body)
      .send();
  }
}
