/**
 * StyleControllerBase — what the `cockpit style` controllers share: the
 * player's surface for editing the cockpit style overlay
 * (`HasInteractiveMixin.clientState['style.overlay']`). controller-liquidity
 * W7b, D2/D13: `style` is a nested stanza, one controller per setting:
 *
 *   - `show` (and bare `cockpit style`) — {@link StyleShowController}
 *   - `theme <ink|marble|high-contrast>` — {@link StyleThemeController}
 *   - `channel <key> color <value>` / `channel <key> clear` — {@link StyleChannelController}
 *   - `mention self on|off` — {@link StyleMentionController}
 *   - `plain on|off` — {@link StylePlainController}
 *   - `plain channel <key> on|off` — {@link StylePlainChannelController}
 *   - `links words|ids` — {@link StyleLinksController}
 *   - `reset` — {@link StyleResetController}
 *
 * ⭐ The words are the VIEW's now: the settings are nested stanzas and
 * each closed word (`theme`, `on|off`, `words|ids`, `color|clear`) is a
 * `values:` slot, so an unknown one is refused by the binder, naming the
 * set, before a controller is cloned. They used to ride positional
 * slots (`styleSub`/`a`/`b`/`c`) refused here, because subcommands were
 * one level deep framework-wide.
 *
 * Every mutation writes via `setClientState`, persists via `save()`, and
 * pushes via `pushClientStateUpdate` so the client re-renders without
 * waiting for a reconnect. The overlay vocabulary is `StyleOverlay` in
 * `@saxonberg/types`; these controllers are UI sugar over that shape.
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
import type {
  StyleOverlay,
  StyleTreatment,
} from '@saxonberg/types';

export const STYLE_KEY = 'style.overlay';

export type StyleHost = Stuff & ClientState & SaxonbergClient;

export interface StyleModel extends CommandModel {
  /** `theme <name>` — one of the view's `values:` (ink · marble · high-contrast). */
  theme?: 'ink' | 'marble' | 'high-contrast';
  /** A chat channel's key (`channel <key> …`, `plain channel <key> …`). */
  key?: string;
  /** `channel <key> <action>` — `color` | `clear`. */
  action?: 'color' | 'clear';
  /** `channel <key> color <value>` — the color. */
  value?: string;
  /** `on` | `off`. */
  state?: 'on' | 'off';
  /** `links <choice>` — `words` | `ids`. */
  choice?: 'words' | 'ids';
}

export abstract class StyleControllerBase extends CommandController<StyleModel> {
  /** The giver as a style host (the client mixin is the verb's precondition). */
  protected hostOf(context: CommandContext): StyleHost {
    const giver = context.commandGiver;
    if (!MixinApi.isSaxonbergClient(giver)) {
      throw new Error(
        `${this.constructor.name}: command giver lacks the client mixin`,
      );
    }
    return giver as StyleHost;
  }

  /** An `on|off` slot's word as the flag it sets (the view binds only those two). */
  protected static flagOf(state: 'on' | 'off' | undefined): boolean {
    return state === 'on';
  }

  /**
   * Read the current overlay, shallow-clone it for mutation.
   * (Treatment objects are nested but v1 mutations never reach into
   * them — they're whole-object replaces, so shallow is fine.)
   */
  protected cloneOverlay(host: StyleHost): StyleOverlay {
    const current = host.getClientState<StyleOverlay>(STYLE_KEY);
    const out: StyleOverlay = {};
    for (const [k, v] of Object.entries(current)) {
      out[k] = v as string | boolean | StyleTreatment;
    }
    return out;
  }

  /**
   * Atomic commit: write, persist, push. Future `style` mutations
   * route through this helper so the persist + push order is
   * uniform.
   *
   * `save()` failures are logged but never propagated — a save
   * rejection (e.g. a stale template-container validation error)
   * must not crash the server or break the player's immediate
   * UI feedback. The push still fires so the client sees the
   * mutation; persistence catches up on the next successful save
   * (or the player re-runs the command).
   */
  protected commit(host: StyleHost, next: StyleOverlay): void {
    host.setClientState(STYLE_KEY, next);
    // Persistence — Avatars own their own save path; other
    // HasInteractive hosts have no persist-back surface today and
    // skip silently. Avatar.save() is the only v1 consumer.
    if (host instanceof Avatar) {
      const savePromise = host.save();
      savePromise.catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `StyleControllerBase.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    host.pushClientStateUpdate(STYLE_KEY, next);
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
      .tags(['control:style'])
      .toSelf(body)
      .send();
  }
}
