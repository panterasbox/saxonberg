/**
 * PackResolveController — `pack resolve <packId> <path> --take-pack | --keep --pin | --export`: close one conflict, exactly one mode (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackApi } from '../../../../api/pack';
import type { PackResolveMode } from '../../../../api/pack';
import { PackControllerBase, type PackModel } from './PackControllerBase';

export default class PackResolveController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim();
    const path = model.path?.trim();
    if (!packId || !path) return this.failUsage(context, 'path-required');

    const modes: PackResolveMode[] = [];
    if (model.takePack) modes.push('take-pack');
    if (model.export) modes.push('export');
    if (model.keep && model.pin) modes.push('keep-pin');
    if (model.keep && !model.pin) {
      return this.fail(
        context,
        'keeping means claiming: use --keep --pin (a kept row is pinned, and ' +
          'never compared again). There is no bare --keep.',
        'keep-without-pin',
      );
    }
    if (modes.length !== 1) {
      return this.fail(
        context,
        'resolve takes exactly one of --take-pack, --keep --pin, --export',
        'one-mode-required',
      );
    }
    const mode = modes[0]!;
    try {
      const result = await PackApi.resolve(packId, path, mode);
      if (mode === 'keep-pin') {
        this.tell(context, `kept and pinned ${path} in pack '${packId}' — it is never compared again until \`pack unpin\``);
      } else if (mode === 'export') {
        this.tell(
          context,
          `exported the database row at ${path} to pack '${packId}'s workspace file; ` +
            `the conflict stays open until \`pack sync ${packId}\` sees both sides agree`,
        );
      } else if (result) {
        this.tell(context, this.formatResult('resolved (took the pack)', result));
      }
    } catch (err) {
      return this.fail(context, (err as Error).message, 'resolve-failed');
    }
  }
}
