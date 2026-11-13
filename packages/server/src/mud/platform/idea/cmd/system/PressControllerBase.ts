/**
 * PressControllerBase — what the `press` controllers share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the news ticker, the staff→player broadcast feed.
 *
 *   - bare `press` — {@link PressReadController} (`press-read.yaml`, a
 *     shape of its own): the live ticker window and the `news` card.
 *   - `press post <headline>` (or bare `press <headline>`, the
 *     fallthrough) — {@link PressPostController}.
 *   - `press edit <id> [headline]` — {@link PressEditController}.
 *   - `press retract <id>` — {@link PressRetractController}.
 *
 * Goes through the Api layer only: `PressApi.publish / edit / retract`,
 * never the `PressBoard` / `PressLogic` directly. The publishing author is
 * NOT passed — the logic derives it from the execution context (the
 * gated-API actor-from-context rule). The publishing subcommands carry
 * `requiresPublisher`; the bare shorthand is refused at `PressApi.publish`'s
 * own `EmploymentApi.mayPublishAs` entitlement.
 *
 * Shared here: the vocabulary reads, the length caps and the words — no
 * permission. Controllers return `void`; outcomes ride the envelope.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { RELEASE_KINDS, type ReleaseKind } from '../../../../lib/press/Release';
import {
  RELEASE_VISIBILITIES,
  type ReleaseVisibility,
} from '../../../../lib/press/Publisher';

export interface ReleaseModel extends CommandModel {
  /** The publish form's headline (greedy inline), or the edit form's new headline. */
  headline?: string;
  /** Long-form MML body (`--body`). */
  body?: string;
  /** Edit / retract target id. */
  id?: string;
  /** The publisher organization to publish as (`--as`). */
  as?: string;
  /** A narrowing of the publisher's reach (`--visibility`). */
  visibility?: string;
  /** Where a repost's substance came from (`--source`). */
  source?: string;
  kind?: string;
  pin?: boolean;
  /** `--expires` — the view's `type: duration`, bound in milliseconds. */
  expires?: number;
}

/** Fallback length caps when the AppSetting is unread / unparseable (mirrors the seed). */
const HEADLINE_CAP_FALLBACK = 120;
const BODY_CAP_FALLBACK = 4000;

export abstract class PressControllerBase extends CommandController<ReleaseModel> {
  /** Validate a visibility token against the vocabulary; `null` = unknown. */
  protected static resolveVisibility(
    raw: string | undefined,
  ): ReleaseVisibility | null {
    const v = (raw ?? '').trim().toLowerCase();
    return RELEASE_VISIBILITIES.includes(v as ReleaseVisibility)
      ? (v as ReleaseVisibility)
      : null;
  }

  /** Validate a kind token against the vocabulary; `null` = unknown. */
  protected static resolveKind(raw: string | undefined): ReleaseKind | null {
    const v = (raw ?? '').trim().toLowerCase();
    return RELEASE_KINDS.includes(v as ReleaseKind)
      ? (v as ReleaseKind)
      : null;
  }

  /**
   * The `--expires` duration (ms, bound by the view) as an epoch-ms
   * expiry. Absent → `0` (never expires). Zero or negative → `null`
   * (caller rejects).
   */
  protected static resolveExpiry(ms: number | undefined): number | null {
    if (ms === undefined) return 0;
    if (!(ms > 0)) return null;
    return Date.now() + ms;
  }

  /** Operator-tunable headline / body length caps (fallbacks mirror the seed). */
  protected static lengthCaps(): { headline: number; body: number } {
    const read = (key: string, fallback: number): number => {
      try {
        const n = Number(AppApi.setting(key));
        return Number.isFinite(n) && n > 0 ? n : fallback;
      } catch {
        return fallback;
      }
    };
    return {
      headline: read(
        AppSettingKeys.pressHeadlineMaxLength,
        HEADLINE_CAP_FALLBACK,
      ),
      body: read(AppSettingKeys.pressBodyMaxLength, BODY_CAP_FALLBACK),
    };
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('publication.press')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
