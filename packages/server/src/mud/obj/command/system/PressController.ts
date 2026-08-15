/**
 * PressController — the `press` verb: post / edit / retract on the
 * staff→player broadcast feed (the news ticker).
 *
 * Afforded via `AuthorMixin.commandContributions` (`system/press.yaml`)
 * and authorized declaratively on the author axis — `release.yaml` carries
 * `requiresAuthor`, so a non-author sees the verb but the dispatcher
 * rejects the command before this controller runs.
 *
 * Goes through the Api layer only: calls `PressApi.publish / edit /
 * retract`, never the `PressBoard` / `PressLogic` directly. The
 * publishing author is NOT passed — the logic derives it from the
 * execution context (the gated-API actor-from-context rule).
 *
 * Forms (`post` subcommand, with a bare-headline fallthrough shorthand):
 *   - `release post <headline>` (or bare `release <headline>`) — publish;
 *     `--realm` / `--kind` / `--pin` / `--expires` options shape it; the
 *     long-form `body` rides the structured-form side-channel (overlaid
 *     into `model.body`).
 *   - `release edit <id> [headline]` — patch an existing release.
 *   - `release retract <id>` — soft-delete (kept in the archive).
 *
 * Controllers return `void`; outcomes ride the dispatch-response envelope.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { AppApi } from '../../../api/app';
import { CardApi } from '../../../api/card';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import {
  PressApi,
  type PublishRequest,
  type ReleasePatch,
} from '../../../api/press';
import { RELEASE_KINDS, type ReleaseKind } from '../../../lib/press/Release';
import {
  RELEASE_VISIBILITIES,
  type ReleaseVisibility,
} from '../../../lib/press/Publisher';

interface ReleaseModel extends CommandModel {
  /** The publish form's headline (greedy inline), or the edit form's new headline. */
  headline?: string;
  /** Long-form MML body — overlaid from the `{text, fields}` side-channel. */
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
  expires?: string;
}

/** Fallback length caps when the AppSetting is unread / unparseable (mirrors the seed). */
const HEADLINE_CAP_FALLBACK = 120;
const BODY_CAP_FALLBACK = 4000;

export default class PressController extends CommandController<ReleaseModel> {
  async execute(
    model: ReleaseModel,
    context: CommandContext,
  ): Promise<void> {
    switch (model.subcommand) {
      /*
       * ⭐ Bare `press` with NO headline is the READ — the news, and the
       * command that opens the `news` card.
       *
       * ⚠ It used to refuse with *headline required*, which made the
       * news the one shipped surface a player could not ask for: the
       * ticker arrived on connect and there was no verb to see it again.
       * A card whose only birth path is an arrangement would contradict
       * *a command opens a card; nothing else does*.
       */
      case undefined:
        if (!(model.headline ?? '').trim()) {
          return this.executeRead(context);
        }
        return this.executePublish(model, context);
      case 'post':
        return this.executePublish(model, context);
      case 'edit':
        return this.executeEdit(model, context);
      case 'retract':
        return this.executeRetract(model, context);
      default:
        return this.fail(
          context,
          `Unknown release subcommand: ${model.subcommand}`,
          'unknown-subcommand',
        );
    }
  }

  /** Bare `press` — the live ticker window, as prose and as a card. */
  private executeRead(context: CommandContext): void {
    const releases = PressApi.recent();
    const rows = releases.map((r) => PressApi.toRow(r));
    const body =
      rows.length === 0
        ? Mml.fromMarkup('\nNothing on the wire.\n')
        : Mml.fromMarkup(
            '\n' +
              rows
                .map(
                  (r) =>
                    `${r.pinned ? '📌 ' : ''}${Mml.escape(r.headline)}` +
                    ` — ${Mml.escape(r.publisher)}`,
                )
                .join('\n') +
              '\n',
          );
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .meta({ carded: true })
      .toSelf(body)
      .send();
    /*
     * ⭐ The card carries **the rows this read already projected**. One
     * `PressApi.recent` call, two renderings.
     */
    CardApi.open(context, 'news', {
      payload: { kind: 'releases', rows },
      prose: body,
    });
  }

  private async executePublish(
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
    const kind = PressController.resolveKind(model.kind ?? 'notice');
    if (!kind) {
      return this.fail(
        context,
        `unknown kind '${model.kind}' (try ${RELEASE_KINDS.join(' / ')})`,
        'bad-kind',
      );
    }

    const caps = PressController.lengthCaps();
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

    const expiresAt = PressController.resolveExpiry(model.expires);
    if (expiresAt === null) {
      return this.fail(
        context,
        `can't parse --expires '${model.expires}' (try 2h, 7d, 1h30m)`,
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
      const resolved = PressController.resolveVisibility(model.visibility);
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

  private async executeEdit(
    model: ReleaseModel,
    context: CommandContext,
  ): Promise<void> {
    const id = (model.id ?? '').trim();
    if (!id) return this.fail(context, 'release id required', 'id-required');

    const caps = PressController.lengthCaps();
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
      const resolved = PressController.resolveVisibility(model.visibility);
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
      const kind = PressController.resolveKind(model.kind);
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
      const expiresAt = PressController.resolveExpiry(model.expires);
      if (expiresAt === null) {
        return this.fail(
          context,
          `can't parse --expires '${model.expires}' (try 2h, 7d, 1h30m)`,
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

  private async executeRetract(
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

  /** Validate a visibility token against the vocabulary; `null` = unknown. */
  private static resolveVisibility(
    raw: string | undefined,
  ): ReleaseVisibility | null {
    const v = (raw ?? '').trim().toLowerCase();
    return RELEASE_VISIBILITIES.includes(v as ReleaseVisibility)
      ? (v as ReleaseVisibility)
      : null;
  }

  /** Validate a kind token against the vocabulary; `null` = unknown. */
  private static resolveKind(raw: string | undefined): ReleaseKind | null {
    const v = (raw ?? '').trim().toLowerCase();
    return RELEASE_KINDS.includes(v as ReleaseKind)
      ? (v as ReleaseKind)
      : null;
  }

  /**
   * Resolve the `--expires` flag to an epoch-ms expiry. Absent / empty →
   * `0` (never expires). Unparseable → `null` (caller rejects).
   */
  private static resolveExpiry(raw: string | undefined): number | null {
    const text = (raw ?? '').trim();
    if (!text) return 0;
    const ms = PressController.parseDurationMs(text);
    if (ms === null || ms <= 0) return null;
    return Date.now() + ms;
  }

  /** Operator-tunable headline / body length caps (fallbacks mirror the seed). */
  private static lengthCaps(): { headline: number; body: number } {
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

  /**
   * Parse a shell-style duration into milliseconds (the StreamController
   * precedent). Accepts a chain of `<number><unit>` segments (`1h30m`,
   * `90s`, `7d`), a single unit, or a bare number read as minutes. Units:
   * `s`/`m`/`h`/`d`. Returns `null` on anything it can't read.
   */
  private static parseDurationMs(input: string): number | null {
    const text = input.trim().toLowerCase();
    if (text.length === 0) return null;
    if (/^\d+$/.test(text)) return Number(text) * 60_000; // bare → minutes
    const unitMs: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    const re = /(\d+)\s*([smhd])/g;
    let total = 0;
    let matched = false;
    let consumed = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matched = true;
      consumed += m[0].length;
      total += Number(m[1]) * unitMs[m[2] as string]!;
    }
    if (!matched || consumed !== text.replace(/\s/g, '').length) return null;
    return total;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('publication.press')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
