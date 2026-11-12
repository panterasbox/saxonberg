/**
 * PressRetractController — `press retract <id>`: soft-delete a release
 * (kept in the archive, gone from the live window) (over {@link
 * PressControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PressApi } from '../../../../api/press';
import { PressControllerBase, type ReleaseModel } from './PressControllerBase';

export default class PressRetractController extends PressControllerBase {
  async execute(
    model: ReleaseModel,
    context: CommandContext,
  ): Promise<void> {
    const id = (model.id ?? '').trim();
    if (!id) return this.fail(context, 'release id required', 'id-required');
    try {
      const retracted = await PressApi.retract(id);
      if (!retracted) {
        return this.fail(context, `no release '${id}'`, 'no-such-release');
      }
      this.tell(context, `\nRetracted release '${id}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'retract-failed');
    }
  }
}
