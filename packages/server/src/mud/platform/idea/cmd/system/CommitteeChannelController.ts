/**
 * CommitteeChannelController — `committee channel` — ensure the
 * committee's chat channel exists and name it (over {@link
 * CommitteeControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { CompactApi } from '../../../../api/compact';
import {
  CommitteeControllerBase,
  type CommitteeModel,
} from './CommitteeControllerBase';

export default class CommitteeChannelController extends CommitteeControllerBase {
  async execute(model: CommitteeModel, context: CommandContext): Promise<void> {
    const path = CommitteeControllerBase.queryPath(model, context);
    const channel = await CompactApi.ensureCommitteeChannel(path);
    if (!channel) {
      return CommitteeControllerBase.fail(
        context,
        'No committee administers this ground, so there is no channel to mint.',
        'no-committee',
      );
    }
    CommitteeControllerBase.send(
      context,
      Mml.fromMarkup(
        `\nThe committee's channel is ${Mml.escape(channel.name).toString()}.\n`,
      ),
    );
  }
}
