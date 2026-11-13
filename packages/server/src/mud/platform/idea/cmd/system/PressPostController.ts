/**
 * PressPostController — `press post <headline>` (and the bare
 * `press <headline>` fallthrough): publish a release to the ticker (over
 * {@link PressControllerBase}). `--as` / `--body` / `--visibility` /
 * `--kind` / `--pin` / `--expires` shape it.
 */

import type { CommandContext } from '../../../../api/command';
import { PressApi, type PublishRequest } from '../../../../api/press';
import { RELEASE_KINDS } from '../../../../lib/press/Release';
import {
  RELEASE_VISIBILITIES,
  type ReleaseVisibility,
} from '../../../../lib/press/Publisher';
import { PressControllerBase, type ReleaseModel } from './PressControllerBase';

export default class PressPostController extends PressControllerBase {
  async execute(
    model: ReleaseModel,
    context: CommandContext,
  ): Promise<void> {
    const headline = (model.headline ?? '').trim();
    if (!headline) {
      return this.fail(context, 'headline required', 'headline-required');
    }
    // ⚠ No `realm` here. It derives from the publisher — one source
    // rather than a copy that drifts, and nobody claiming to speak
    // in-fiction on an operator's feed.
    //
    // Publish defaults applied here (not in the YAML) so an unpassed flag
    // stays undefined for the edit patch — see press.yaml's options note.
    const kind = PressPostController.resolveKind(model.kind ?? 'notice');
    if (!kind) {
      return this.fail(
        context,
        `unknown kind '${model.kind}' (try ${RELEASE_KINDS.join(' / ')})`,
        'bad-kind',
      );
    }

    const caps = PressPostController.lengthCaps();
    if (headline.length > caps.headline) {
      return this.fail(
        context,
        `headline too long (max ${caps.headline})`,
        'headline-too-long',
      );
    }
    const body = (model.body ?? '').trim();
    if (body.length > caps.body) {
      return this.fail(
        context,
        `body too long (max ${caps.body})`,
        'body-too-long',
      );
    }

    const expiresAt = PressPostController.resolveExpiry(model.expires);
    if (expiresAt === null) {
      return this.fail(
        context,
        `--expires must be a time ahead (try 2h, 7d, 1h30m)`,
        'bad-expires',
      );
    }

    // ⚠ Required and never defaulted: which masthead a release goes out
    // under is the author's statement. Picking one for them would turn a
    // refusal ("you hold no publishing position anywhere") into a silent
    // downgrade ("...so here is the one you do hold").
    const publisher = (model.as ?? '').trim();
    if (!publisher) {
      return this.fail(
        context,
        'name the publisher to release as, e.g. --as /compact/press',
        'publisher-required',
      );
    }

    // The narrowing, if one is asked for. Only the narrow direction is
    // reachable: the clamp maxes over the visibility ordinal, so a
    // `public` on a members-only publisher lands back at `members`.
    let visibility: ReleaseVisibility | undefined;
    if (model.visibility !== undefined) {
      const resolved = PressPostController.resolveVisibility(model.visibility);
      if (!resolved) {
        return this.fail(
          context,
          `unknown visibility '${model.visibility}' (try ` +
            `${RELEASE_VISIBILITIES.join(' / ')})`,
          'bad-visibility',
        );
      }
      visibility = resolved;
    }

    const req: PublishRequest = {
      publisher,
      headline,
      kind,
      pinned: model.pin === true,
      expiresAt,
      ...(body ? { body } : {}),
      ...(visibility ? { visibility } : {}),
      ...(model.source ? { source: model.source.trim() } : {}),
    };
    try {
      const release = await PressApi.publish(req);
      this.tell(
        context,
        `\nPublished release '${release.getReleaseId()}'.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'publish-failed');
    }
  }
}
