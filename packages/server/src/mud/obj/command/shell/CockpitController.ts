/**
 * CockpitController — the host verb for every cockpit control.
 *
 * The cockpit's controls used to be three independent top-level verbs
 * (`layout`, `style`, `mode`) that each wrote the same `cockpit.*`
 * clientState keyspace. They are now subcommands of one verb:
 *
 *   - `cockpit mode <name>`     — the activity axis (CockpitModeController)
 *   - `cockpit layout <name>`   — the arrangement (LayoutController)
 *   - `cockpit cli [id] --prefix …` — per-line input prefix (CliController)
 *   - `cockpit style <sub> …`   — appearance (StyleController)
 *
 * Each subcommand declares its own `controller:` (Option E), so this
 * controller handles exactly one case: **bare `cockpit`**, which reports
 * everything in effect in one view. That report is the reason the host
 * verb earns its keep — before it, no single command answered "how is my
 * cockpit set up right now?".
 *
 * ⭐ The exemption in `CommandApi.applyInputMode` is keyed to this verb,
 * not to any one subcommand: **interface control is not world input**, so
 * a bar scoped to a chat channel can still steer its own cockpit
 * un-prefixed. Widening the exemption from one verb to one verb's
 * subtree is correct by construction — everything under `cockpit` is
 * interface control.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import type { StyleOverlay } from '@saxonberg/types';

const MODES_KEY = 'cockpit.inputModes';
const STYLE_KEY = 'style.overlay';

type CockpitHost = Stuff & HasInteractive;

export default class CockpitController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      throw new Error('CockpitController: command giver lacks HasInteractive');
    }
    // `isHasInteractive` above narrows `giver` to `Stuff & HasInteractive`.
    const host: CockpitHost = giver;

    // Mode and arrangement come from the resolving readers, not raw
    // client state: a player who last played before the mode axis
    // existed has no stored mode, and the bare report is exactly where
    // showing them `null` would be worst.
    const mode = host.getCockpitMode();
    const lines = [
      '',
      'cockpit',
      `  mode     ${mode}`,
      `  layout   ${host.getCockpitArrangement(mode)}`,
      `  scope    ${this.describeScopes(host)}`,
      `  style    ${this.describeStyle(host)}`,
      '',
    ];
    this.send(context, Mml.fromMarkup(Mml.escape(lines.join('\n'))));
  }

  /**
   * Per-bar input scopes as `bar=prefix` pairs. Reports the whole map
   * rather than just the calling bar: the point of the bare report is
   * to answer "what is set up right now", and a scope you forgot you
   * left on another bar is exactly the thing worth surfacing.
   */
  private describeScopes(host: CockpitHost): string {
    const modes = host.getClientState<Record<string, string>>(MODES_KEY);
    const entries = Object.entries(modes ?? {});
    if (entries.length === 0) return 'none';
    return entries.map(([bar, prefix]) => `${bar}=${prefix}`).join(', ');
  }

  /** Theme plus a count of the remaining overlay rules. */
  private describeStyle(host: CockpitHost): string {
    const overlay = host.getClientState<StyleOverlay>(STYLE_KEY) ?? {};
    const theme = typeof overlay.theme === 'string' ? overlay.theme : 'default';
    const others = Object.keys(overlay).filter((k) => k !== 'theme').length;
    return others === 0
      ? `theme ${theme}`
      : `theme ${theme} (+${others} override${others === 1 ? '' : 's'})`;
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.control')
      .tags(['control:cockpit'])
      .toSelf(body)
      .send();
  }
}
