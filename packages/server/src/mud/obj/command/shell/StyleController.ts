/**
 * StyleController — the player's surface for editing the cockpit
 * style overlay (`HasInteractiveMixin.clientState['style.overlay']`).
 *
 * Reached as `cockpit style …` (the `style` subcommand of `cockpit`
 * declares this controller). Settings, per `cmd/shell/cockpit.yaml`:
 *   - `show`         — print current overlay as readable JSON
 *   - `theme <name>` — `default` | `high-contrast`
 *   - `channel <key> color <value>` — set per-channel chip color
 *   - `channel <key> clear`         — drop all overlay rules for the channel
 *   - `mention self on|off`         — own-name highlight toggle
 *   - `plain on|off`                — global plain-mode toggle
 *   - `plain channel <key> on|off`  — per-channel plain
 *   - `reset`                       — clear overlay to {}
 *
 * ⚠ These are NOT command subcommands — `cockpit style` is already the
 * subcommand, and subcommands are one level deep framework-wide. They
 * ride positional slots (`styleSub` / `a` / `b` / `c`) and dispatch in
 * `execute`, which is why an unknown setting must be refused HERE: the
 * matcher's `unknown-subcommand` path never sees it.
 *
 * Every mutation writes via `setClientState`, persists via `save()`,
 * and pushes to connected Interactives via `pushClientStateUpdate`
 * so the client re-renders without waiting for a reconnect.
 *
 * The overlay vocabulary is documented on `StyleOverlay` in
 * `@saxonberg/types`; this controller is purely UI sugar that
 * mutates that shape — unknown subcommands or malformed args reject
 * via `controller-rejected` notes per the response-envelope
 * subsystem.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import Avatar from '../../Avatar';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import type {
  StyleOverlay,
  StyleTreatment,
} from '@saxonberg/types';

const STYLE_KEY = 'style.overlay';
const KNOWN_THEMES = new Set(['default', 'high-contrast']);

type StyleHost = Stuff & HasInteractive;

/**
 * Positional slots under `cockpit style`. The style tree is two levels
 * deep (`cockpit style channel <key> color <value>`) and command
 * subcommands are one level framework-wide, so the second level rides
 * generic positionals and this controller dispatches on `styleSub` —
 * the same shape `style channel <key> color|clear` already used for its
 * own third level. `a` / `b` / `c` are slot-addressed because their
 * meaning depends on `styleSub`.
 */
interface StyleModel extends CommandModel {
  styleSub?: string;
  a?: string;
  b?: string;
  c?: string;
}

const STYLE_SUBS = ['show', 'theme', 'channel', 'mention', 'plain', 'reset'];

export default class StyleController extends CommandController<StyleModel> {
  execute(model: StyleModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error(
        'StyleController: command giver lacks HasInteractive',
      );
    }
    const host = giver as StyleHost;

    const sub = model.styleSub ?? 'show';
    switch (sub) {
      case 'show':
        return this.executeShow(host, context);
      case 'theme':
        return this.executeTheme(host, model.a, context);
      case 'channel':
        return this.executeChannel(host, model.a, model.b, model.c, context);
      case 'mention':
        return this.executeMention(host, model.a, model.b, context);
      case 'plain':
        return this.executePlain(host, model.a, model.b, model.c, context);
      case 'reset':
        return this.executeReset(host, context);
      default:
        // The style tree rides positionals, so an unknown second-level
        // word reaches the controller instead of being refused by the
        // matcher's `unknown-subcommand` path. Refuse it here — silently
        // doing nothing is the failure mode this default exists to stop.
        return this.fail(
          context,
          `unknown style setting '${sub}' (known: ${STYLE_SUBS.join(', ')})`,
          'unknown-style-setting',
        );
    }
  }

  private executeShow(host: StyleHost, context: CommandContext): void {
    const overlay = host.getClientState<StyleOverlay>(STYLE_KEY);
    const body = Object.keys(overlay).length === 0
      ? 'overlay is empty'
      : JSON.stringify(overlay, null, 2);
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(body)}\n`));
  }

  private executeTheme(
    host: StyleHost,
    name: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) {
      return this.fail(context, 'usage: cockpit style theme <default|high-contrast>', 'missing-arg');
    }
    if (!KNOWN_THEMES.has(name)) {
      return this.fail(
        context,
        `unknown theme '${name}' (known: default, high-contrast)`,
        'unknown-theme',
      );
    }
    const next = this.cloneOverlay(host);
    next.theme = name as 'default' | 'high-contrast';
    this.commit(host, next);
    this.send(context, Mml.fromMarkup(`\ntheme set to ${Mml.escape(name)}\n`));
  }

  private executeChannel(
    host: StyleHost,
    channelKey: string | undefined,
    action: string | undefined,
    value: string | undefined,
    context: CommandContext,
  ): void {
    if (!channelKey || !action) {
      return this.fail(
        context,
        'usage: cockpit style channel <key> color <value> | clear',
        'missing-arg',
      );
    }
    const next = this.cloneOverlay(host);
    const colorKey = `channel.${channelKey}.color`;
    const plainKey = `plain.channel.${channelKey}`;

    if (action === 'color') {
      if (!value) {
        return this.fail(
          context,
          `usage: cockpit style channel ${channelKey} color <value>`,
          'missing-arg',
        );
      }
      next[colorKey] = value;
      this.commit(host, next);
      this.send(
        context,
        Mml.fromMarkup(
          `\nchannel '${Mml.escape(channelKey)}' color set to ${Mml.escape(value)}\n`,
        ),
      );
      return;
    }
    if (action === 'clear') {
      delete next[colorKey];
      delete next[plainKey];
      this.commit(host, next);
      this.send(
        context,
        Mml.fromMarkup(`\nchannel '${Mml.escape(channelKey)}' rules cleared\n`),
      );
      return;
    }
    return this.fail(
      context,
      `unknown channel action '${action}' (known: color, clear)`,
      'unknown-action',
    );
  }

  private executeMention(
    host: StyleHost,
    target: string | undefined,
    state: string | undefined,
    context: CommandContext,
  ): void {
    if (target !== 'self') {
      return this.fail(
        context,
        "usage: cockpit style mention self <on|off>",
        'unknown-target',
      );
    }
    const flag = parseOnOff(state);
    if (flag === null) {
      return this.fail(context, 'usage: cockpit style mention self <on|off>', 'missing-arg');
    }
    const next = this.cloneOverlay(host);
    next['mention.self'] = flag;
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(`\nown-name highlight ${flag ? 'on' : 'off'}\n`),
    );
  }

  private executePlain(
    host: StyleHost,
    a: string | undefined,
    b: string | undefined,
    c: string | undefined,
    context: CommandContext,
  ): void {
    if (!a) {
      return this.fail(
        context,
        'usage: cockpit style plain on|off | cockpit style plain channel <k> on|off',
        'missing-arg',
      );
    }

    // `style plain channel <key> on|off`
    if (a === 'channel') {
      if (!b) {
        return this.fail(context, 'usage: cockpit style plain channel <k> on|off', 'missing-arg');
      }
      const flag = parseOnOff(c);
      if (flag === null) {
        return this.fail(context, 'usage: cockpit style plain channel <k> on|off', 'missing-arg');
      }
      const next = this.cloneOverlay(host);
      const key = `plain.channel.${b}`;
      if (flag) next[key] = true;
      else delete next[key];
      this.commit(host, next);
      this.send(
        context,
        Mml.fromMarkup(
          `\nchannel '${Mml.escape(b)}' plain-mode ${flag ? 'on' : 'off'}\n`,
        ),
      );
      return;
    }

    // `style plain on|off`
    const flag = parseOnOff(a);
    if (flag === null) {
      return this.fail(
        context,
        'usage: cockpit style plain on|off | cockpit style plain channel <k> on|off',
        'unknown-arg',
      );
    }
    const next = this.cloneOverlay(host);
    if (flag) next.plain = true;
    else delete next.plain;
    this.commit(host, next);
    this.send(context, Mml.fromMarkup(`\nplain-mode ${flag ? 'on' : 'off'}\n`));
  }

  private executeReset(host: StyleHost, context: CommandContext): void {
    this.commit(host, {});
    this.send(context, Mml.fromMarkup('\noverlay cleared\n'));
  }

  /**
   * Read the current overlay, shallow-clone it for mutation.
   * (Treatment objects are nested but v1 mutations never reach into
   * them — they're whole-object replaces, so shallow is fine.)
   */
  private cloneOverlay(host: StyleHost): StyleOverlay {
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
  private commit(host: StyleHost, next: StyleOverlay): void {
    host.setClientState(STYLE_KEY, next);
    // Persistence — Avatars own their own save path; other
    // HasInteractive hosts have no persist-back surface today and
    // skip silently. Avatar.save() is the only v1 consumer.
    if (host instanceof Avatar) {
      const savePromise = host.save();
      savePromise.catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(
          `StyleController.commit: save failed (non-fatal): ${detail}`,
        );
      });
    }
    host.pushClientStateUpdate(STYLE_KEY, next);
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
      .tags(['control:style'])
      .toSelf(body)
      .send();
  }
}

function parseOnOff(s: string | undefined): boolean | null {
  if (s === 'on') return true;
  if (s === 'off') return false;
  return null;
}
