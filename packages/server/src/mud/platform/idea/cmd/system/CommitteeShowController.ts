/**
 * CommitteeShowController — `committee show [<path>]` (and bare
 * `committee`) — the committee of record over where you stand, or over a
 * path (over {@link CommitteeControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { CompactApi } from '../../../../api/compact';
import {
  CommitteeControllerBase,
  type CommitteeModel,
} from './CommitteeControllerBase';

export default class CommitteeShowController extends CommitteeControllerBase {
  async execute(model: CommitteeModel, context: CommandContext): Promise<void> {
    const path = CommitteeControllerBase.queryPath(model, context);
    const committee = await CompactApi.committeeOf(path);
    if (!committee) {
      return CommitteeControllerBase.fail(
        context,
        'No committee administers that — it is personally held.',
        'no-committee',
      );
    }
    const lines = [
      `Committee of record: ${Mml.escape(committee.name).toString()}`,
      committee.subdivisionPath.length > 0
        ? `  Subdivision: ${Mml.escape(committee.subdivisionPath).toString()}`
        : '  Subdivision: (the state default — no finer title held)',
    ];
    const members = await CompactApi.committeeMembersOf(path);
    lines.push(
      members.length > 0
        ? `  Members here now: ${members
            .map((m) => Mml.escape(m.getPresentation()).toString())
            .join(', ')}`
        : '  Members here now: none online',
    );
    const channel = await CompactApi.committeeChannelOf(path);
    lines.push(
      channel
        ? `  Channel: ${Mml.escape(channel.name).toString()}`
        : `  Channel: none yet — ${Mml.link(
            'mudcmd:committee channel',
            'mint it',
          ).toString()}`,
    );
    CommitteeControllerBase.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
