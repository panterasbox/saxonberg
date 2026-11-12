/**
 * PressEditController — `press edit <id> [headline]`: revise a release
 * in place, changing only what is passed (over {@link PressControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PressApi, type ReleasePatch } from '../../../../api/press';
import { RELEASE_KINDS } from '../../../../lib/press/Release';
import { RELEASE_VISIBILITIES } from '../../../../lib/press/Publisher';
import { PressControllerBase, type ReleaseModel } from './PressControllerBase';

export default class PressEditController extends PressControllerBase {
  async execute(
    model: ReleaseModel,
    context: CommandContext,
  ): Promise<void> {
    const id = (model.id ?? '').trim();
    if (!id) return this.fail(context, 'release id required', 'id-required');

    const caps = PressEditController.lengthCaps();
    const patch: ReleasePatch = {};

    const headline = (model.headline ?? '').trim();
    if (headline) {
      if (headline.length > caps.headline) {
        return this.fail(
          context,
          `headline too long (max ${caps.headline})`,
          'headline-too-long',
        );
      }
      patch.headline = headline;
    }

    const body = (model.body ?? '').trim();
    if (body) {
      if (body.length > caps.body) {
        return this.fail(
          context,
          `body too long (max ${caps.body})`,
          'body-too-long',
        );
      }
      patch.body = body;
    }

    if (model.visibility !== undefined) {
      const resolved = PressEditController.resolveVisibility(model.visibility);
      if (!resolved) {
        return this.fail(
          context,
          `unknown visibility '${model.visibility}' (try ` +
            `${RELEASE_VISIBILITIES.join(' / ')})`,
          'bad-visibility',
        );
      }
      patch.visibility = resolved;
    }
    if (model.source !== undefined) patch.source = model.source.trim();
    if (model.kind !== undefined) {
      const kind = PressEditController.resolveKind(model.kind);
      if (!kind) {
        return this.fail(
          context,
          `unknown kind '${model.kind}' (try ${RELEASE_KINDS.join(' / ')})`,
          'bad-kind',
        );
      }
      patch.kind = kind;
    }
    if (model.pin === true) patch.pinned = true;
    if (model.expires !== undefined) {
      const expiresAt = PressEditController.resolveExpiry(model.expires);
      if (expiresAt === null) {
        return this.fail(
          context,
          `--expires must be a time ahead (try 2h, 7d, 1h30m)`,
          'bad-expires',
        );
      }
      patch.expiresAt = expiresAt;
    }

    try {
      const updated = await PressApi.edit(id, patch);
      if (!updated) {
        return this.fail(context, `no release '${id}'`, 'no-such-release');
      }
      this.tell(context, `\nEdited release '${id}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'edit-failed');
    }
  }
}
