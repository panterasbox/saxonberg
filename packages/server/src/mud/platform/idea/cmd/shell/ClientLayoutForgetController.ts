/**
 * ClientLayoutForgetController — `client-layout forget <name>`: drop a saved
 * arrangement; forgetting the one you are in drops you to the mode's
 * default (over {@link ClientLayoutControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { ArrangementSpec } from '@saxonberg/types';
import {
  ClientLayoutControllerBase,
  SAVED_KEY,
  type LayoutModel,
} from './ClientLayoutControllerBase';

export default class ClientLayoutForgetController extends ClientLayoutControllerBase {
  execute(model: LayoutModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const mode = host.getCockpitMode();
    const name = model.name?.trim() ?? '';

    if (host.isShippedArrangement(mode, name)) {
      return this.fail(
        context,
        `'${name}' ships with ${mode} and cannot be forgotten`,
        'shipped-arrangement',
      );
    }
    const saved = this.cloneSaved(host);
    const forMode: Record<string, ArrangementSpec> = { ...(saved[mode] ?? {}) };
    if (forMode[name] === undefined) {
      return this.fail(
        context,
        `you have no saved ${mode} arrangement '${name}'`,
        'unknown-arrangement',
      );
    }
    delete forMode[name];
    saved[mode] = forMode;
    host.setClientState(SAVED_KEY, saved);

    // Forgetting the one you are in drops you to the mode's default.
    if (host.getCockpitArrangement(mode) === name) {
      this.commit(host, mode, host.getArrangementNames(mode)[0] ?? 'default');
    } else {
      this.persistAndPush(host, mode);
    }
    this.send(
      context,
      Mml.fromMarkup(Mml.escape(`\nforgot ${mode} arrangement '${name}'\n`)),
    );
    }
}
