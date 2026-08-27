/**
 * BroadcastController — forced messaging over an extent you HOLD
 * (content-packs wave 3, D2c).
 *
 * `broadcast --at <extent> <message>`: the speaker must hold `extent`
 * (`AccessApi.canAtPath(giver, 'broadcast', extent)` — the same title
 * dispatch every path-targeted act uses: group membership, organization
 * staff-or-head, a player's own home). Omitted, the extent is the parcel
 * covering where the speaker stands, iff they hold it; otherwise the
 * refusal lists what they DO hold (`AccessApi.heldExtents`). "Holding a
 * parent reaches its children" is implemented on the AUDIENCE: every
 * online Sensor whose container chain sits at or under the extent —
 * no `ParcelApi` read per avatar, so delivery does not depend on a
 * healthy world.
 *
 * Modality stamp `'verbal-esp'`; topic `session.notice`. Body MML wraps
 * the sender+payload in a `<chan id="broadcast" label="Broadcast">`
 * region so the cockpit renders distinctly. No history ring, no
 * rate-limiting (own substrate, deferred).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MqlApi } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { AccessApi } from '../../../../api/access';
import { ParcelApi } from '../../../../api/parcel';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface BroadcastModel extends CommandModel {
  message: string;
  extent?: string;
}

/** Is any container in `stuff`'s chain at or under `extent`? */
function standsUnder(stuff: Stuff, extent: string): boolean {
  let cur: Stuff | null = MixinApi.isContainable(stuff) ? stuff.getContainer() : null;
  while (cur !== null) {
    const path = cur.getTemplatePath();
    if (path !== null && (path === extent || path.startsWith(extent + '/'))) return true;
    cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
  }
  return false;
}

export default class BroadcastController extends CommandController<BroadcastModel> {
  async execute(model: BroadcastModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver;
    const body = (model.message ?? '').trim();
    if (!body) {
      context.note({ kind: 'controller-rejected', reason: 'message-required', detail: 'broadcast body required' });
      return;
    }

    // The extent: named, or the one covering where the speaker stands.
    let extent = (model.extent ?? '').trim();
    if (!extent) {
      const here = context.location?.getTemplatePath() ?? '';
      const covering = here ? await ParcelApi.coveringParcelOf(here) : null;
      extent = covering?.getExtent() ?? '';
    }
    const admitted = extent.length > 0 && (await AccessApi.canAtPath(speaker, 'broadcast', extent));
    if (!admitted) {
      const held = await AccessApi.heldExtents(speaker);
      const detail = held.length > 0
        ? `you hold: ${held.join(', ')}`
        : 'you hold nothing';
      MessageApi.scene(speaker)
        .topic('session.notice')
        .toSelf(Mml.fromMarkup(
          (extent
            ? `\nYou do not hold ${extent} — `
            : `\nNobody holds the ground you stand on, so there is no extent to address — `) +
            `${detail}.\n`,
        ))
        .send();
      context.note({ kind: 'controller-rejected', reason: 'extent-not-held', detail });
      return;
    }

    // The audience: every online Sensor standing under the extent.
    const online = MqlApi.resolveMany('online', { commandGiver: speaker, scope: 'online' }).stuff;
    const audience = online.filter((a) => MixinApi.isSensor(a) && standsUnder(a, extent));

    const parsed = Mml.markdownToMml(body, Mml.perceiverMentionResolver(speaker));
    const speakerName = Mml.actor(speaker);
    const line = `<chan id="broadcast" label="Broadcast">${speakerName.toString()}: ${parsed.toString()}</chan>`;

    MessageApi.scene(speaker)
      .topic('session.notice')
      .modality('verbal-esp')
      .toSelf(Mml.fromMarkup(line))
      .payload({
        speaker: MessageApi.refOf(speaker),
        text: body,
        extent,
        audienceSize: audience.length,
      })
      .send();

    for (const a of audience) {
      if ((a as unknown) === (speaker as unknown)) continue;
      MessageApi.scene(speaker)
        .topic('session.notice')
        .modality('verbal-esp')
        .toTarget(a, Mml.fromMarkup(line))
        .payload({
          speaker: MessageApi.refOf(speaker),
          text: body,
          extent,
        })
        .send();
    }
  }
}
