/**
 * BroadcastController — one-to-many ESP-channel broadcast.
 *
 * Default audience: every online Avatar. `--to <mql>` narrows to an
 * MQL-resolved subset. Modality stamp `'verbal-esp'`; topic
 * `system.broadcast`. Body MML wraps the sender+payload in a
 * `<chan id="broadcast" label="Broadcast">` region so the cockpit
 * renders distinctly.
 *
 * Gated by `AccessApi.can(actor, 'broadcast', null)` — the resource
 * is global (`null`), so the check routes through the `'core'`
 * fallback. Only `'core'` members can broadcast in this build.
 *
 * No history ring (broadcasts ride scrollback like any other frame),
 * no rate-limiting (own substrate, deferred).
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MqlApi } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';
import { PlayerApi } from '../../api/player';
import { AccessApi } from '../../api/access';

interface BroadcastModel extends CommandModel {
  message: string;
  query?: string;
}

export class BroadcastController extends CommandController<BroadcastModel> {
  async execute(model: BroadcastModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver;
    const body = (model.message ?? '').trim();
    if (!body) {
      context.note({ kind: 'controller-rejected', reason: 'message-required', detail: 'broadcast body required' });
      return;
    }
    if (!(await AccessApi.can(speaker, 'broadcast', null))) {
      MessageApi.scene(speaker)
        .topic('system.broadcast')
        .toSelf(Mml.fromMarkup(`\nyou don't have permission to broadcast\n`))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'access-denied',
        detail: "you don't have permission to broadcast",
      });
      return;
    }

    // Default audience: every online avatar. `online` is a recognized
    // MQL seed (see resolver.ts). `--to` overrides with author-supplied
    // MQL like `online with species:khazadicus` or any other shape the
    // grammar accepts.
    const queryString = (model.query ?? '').trim() || 'online';
    let audience: Stuff[];
    try {
      const result = MqlApi.resolveMany(queryString, {
        commandGiver: speaker,
        scope: 'online',
      });
      audience = result.stuff;
    } catch (err) {
      MessageApi.scene(speaker)
        .topic('system.broadcast')
        .toSelf(Mml.fromMarkup(`\nBroadcast query failed: ${(err as Error).message}\n`))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'mql-query-failed',
        detail: (err as Error).message,
      });
      return;
    }

    if (audience.length === 0) {
      MessageApi.scene(speaker)
        .topic('system.broadcast')
        .toSelf(Mml.fromMarkup(`\nNo one matched '${queryString}'.\n`))
        .send();
      return;
    }

    // Fall back to "every online Avatar" if the query somehow doesn't
    // return Avatars — the broadcast verb's natural audience is
    // players, not props.
    const filtered = audience.filter((a) => MixinApi.isSensor(a));
    const parsed = Mml.markdownToMml(body, Mml.perceiverMentionResolver(speaker));
    const speakerName = Mml.name(speaker);
    const selfBody = Mml.fromMarkup(
      `<chan id="broadcast" label="Broadcast">${speakerName.toString()}: ${parsed.toString()}</chan>`,
    );

    MessageApi.scene(speaker)
      .topic('system.broadcast')
      .modality('verbal-esp')
      .toSelf(selfBody)
      .payload({
        speaker: MessageApi.refOf(speaker),
        text: body,
        audienceSize: filtered.length,
      })
      .send();

    for (const a of filtered) {
      if ((a as unknown) === (speaker as unknown)) continue;
      const peerBody = Mml.fromMarkup(
        `<chan id="broadcast" label="Broadcast">${speakerName.toString()}: ${parsed.toString()}</chan>`,
      );
      MessageApi.scene(speaker)
        .topic('system.broadcast')
        .modality('verbal-esp')
        .toTarget(a, peerBody)
        .payload({
          speaker: MessageApi.refOf(speaker),
          text: body,
        })
        .send();
    }
  }
}

// Suppress unused-imports warning — PlayerApi was kept for a future
// audience-default override path.
void PlayerApi;
