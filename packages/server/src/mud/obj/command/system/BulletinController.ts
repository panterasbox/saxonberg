/**
 * BulletinController — the `bulletin` verb: post / edit / retract on the
 * staff→player broadcast feed (the news ticker).
 *
 * Afforded via `AuthorMixin.commandContributions` (`system/bulletin.yaml`)
 * and authorized declaratively on the author axis — `bulletin.yaml` carries
 * `requiresAuthor`, so a non-author sees the verb but the dispatcher
 * rejects the command before this controller runs.
 *
 * Goes through the Api layer only: calls `BulletinApi.publish / edit /
 * retract`, never the `BulletinBoard` / `BulletinLogic` directly. The
 * publishing author is NOT passed — the logic derives it from the
 * execution context (the gated-API actor-from-context rule).
 *
 * Forms (`post` subcommand, with a bare-headline fallthrough shorthand):
 *   - `bulletin post <headline>` (or bare `bulletin <headline>`) — publish;
 *     `--realm` / `--kind` / `--pin` / `--expires` options shape it; the
 *     long-form `body` rides the structured-form side-channel (overlaid
 *     into `model.body`).
 *   - `bulletin edit <id> [headline]` — patch an existing bulletin.
 *   - `bulletin retract <id>` — soft-delete (kept in the archive).
 *
 * Controllers return `void`; outcomes ride the dispatch-response envelope.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import {
  BulletinApi,
  type PublishRequest,
  type BulletinPatch,
} from '../../../api/bulletin';
import {
  BULLETIN_REALMS,
  BULLETIN_KINDS,
  type BulletinRealm,
  type BulletinKind,
} from '../../../lib/bulletin/Bulletin';

interface BulletinModel extends CommandModel {
  /** The publish form's headline (greedy inline), or the edit form's new headline. */
  headline?: string;
  /** Long-form MML body — overlaid from the `{text, fields}` side-channel. */
  body?: string;
  /** Edit / retract target id. */
  id?: string;
  realm?: string;
  kind?: string;
  pin?: boolean;
  expires?: string;
}

/** Fallback length caps when the AppSetting is unread / unparseable (mirrors the seed). */
const HEADLINE_CAP_FALLBACK = 120;
const BODY_CAP_FALLBACK = 4000;

export default class BulletinController extends CommandController<BulletinModel> {
  async execute(
    model: BulletinModel,
    context: CommandContext,
  ): Promise<void> {
    switch (model.subcommand) {
      // Bare `bulletin <headline>` falls through with no subcommand; the
      // explicit `post` subcommand is the same publish path.
      case undefined:
      case 'post':
        return this.executePublish(model, context);
      case 'edit':
        return this.executeEdit(model, context);
      case 'retract':
        return this.executeRetract(model, context);
      default:
        return this.fail(
          context,
          `Unknown bulletin subcommand: ${model.subcommand}`,
          'unknown-subcommand',
        );
    }
  }

  private async executePublish(
    model: BulletinModel,
    context: CommandContext,
  ): Promise<void> {
    const headline = (model.headline ?? '').trim();
    if (!headline) {
      return this.fail(context, 'headline required', 'headline-required');
    }
    // Publish defaults applied here (not in the YAML) so an unpassed flag
    // stays undefined for the edit patch — see bulletin.yaml's options note.
    const realm = BulletinController.resolveRealm(model.realm ?? 'ooc');
    if (!realm) {
      return this.fail(
        context,
        `unknown realm '${model.realm}' (try ${BULLETIN_REALMS.join(' / ')})`,
        'bad-realm',
      );
    }
    const kind = BulletinController.resolveKind(model.kind ?? 'notice');
    if (!kind) {
      return this.fail(
        context,
        `unknown kind '${model.kind}' (try ${BULLETIN_KINDS.join(' / ')})`,
        'bad-kind',
      );
    }

    const caps = BulletinController.lengthCaps();
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

    const expiresAt = BulletinController.resolveExpiry(model.expires);
    if (expiresAt === null) {
      return this.fail(
        context,
        `can't parse --expires '${model.expires}' (try 2h, 7d, 1h30m)`,
        'bad-expires',
      );
    }

    const req: PublishRequest = {
      headline,
      realm,
      kind,
      pinned: model.pin === true,
      expiresAt,
      ...(body ? { body } : {}),
    };
    try {
      const bulletin = await BulletinApi.publish(req);
      this.tell(
        context,
        `\nPublished bulletin '${bulletin.getBulletinId()}'.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'publish-failed');
    }
  }

  private async executeEdit(
    model: BulletinModel,
    context: CommandContext,
  ): Promise<void> {
    const id = (model.id ?? '').trim();
    if (!id) return this.fail(context, 'bulletin id required', 'id-required');

    const caps = BulletinController.lengthCaps();
    const patch: BulletinPatch = {};

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

    if (model.realm !== undefined) {
      const realm = BulletinController.resolveRealm(model.realm);
      if (!realm) {
        return this.fail(
          context,
          `unknown realm '${model.realm}' (try ${BULLETIN_REALMS.join(' / ')})`,
          'bad-realm',
        );
      }
      patch.realm = realm;
    }
    if (model.kind !== undefined) {
      const kind = BulletinController.resolveKind(model.kind);
      if (!kind) {
        return this.fail(
          context,
          `unknown kind '${model.kind}' (try ${BULLETIN_KINDS.join(' / ')})`,
          'bad-kind',
        );
      }
      patch.kind = kind;
    }
    if (model.pin === true) patch.pinned = true;
    if (model.expires !== undefined) {
      const expiresAt = BulletinController.resolveExpiry(model.expires);
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
      const updated = await BulletinApi.edit(id, patch);
      if (!updated) {
        return this.fail(context, `no bulletin '${id}'`, 'no-such-bulletin');
      }
      this.tell(context, `\nEdited bulletin '${id}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'edit-failed');
    }
  }

  private async executeRetract(
    model: BulletinModel,
    context: CommandContext,
  ): Promise<void> {
    const id = (model.id ?? '').trim();
    if (!id) return this.fail(context, 'bulletin id required', 'id-required');
    try {
      const retracted = await BulletinApi.retract(id);
      if (!retracted) {
        return this.fail(context, `no bulletin '${id}'`, 'no-such-bulletin');
      }
      this.tell(context, `\nRetracted bulletin '${id}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'retract-failed');
    }
  }

  /** Validate a realm token against the vocabulary; `null` = unknown. */
  private static resolveRealm(raw: string | undefined): BulletinRealm | null {
    const v = (raw ?? '').trim().toLowerCase();
    return BULLETIN_REALMS.includes(v as BulletinRealm)
      ? (v as BulletinRealm)
      : null;
  }

  /** Validate a kind token against the vocabulary; `null` = unknown. */
  private static resolveKind(raw: string | undefined): BulletinKind | null {
    const v = (raw ?? '').trim().toLowerCase();
    return BULLETIN_KINDS.includes(v as BulletinKind)
      ? (v as BulletinKind)
      : null;
  }

  /**
   * Resolve the `--expires` flag to an epoch-ms expiry. Absent / empty →
   * `0` (never expires). Unparseable → `null` (caller rejects).
   */
  private static resolveExpiry(raw: string | undefined): number | null {
    const text = (raw ?? '').trim();
    if (!text) return 0;
    const ms = BulletinController.parseDurationMs(text);
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
        AppSettingKeys.bulletinHeadlineMaxLength,
        HEADLINE_CAP_FALLBACK,
      ),
      body: read(AppSettingKeys.bulletinBodyMaxLength, BODY_CAP_FALLBACK),
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
      .topic('system.bulletin')
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
