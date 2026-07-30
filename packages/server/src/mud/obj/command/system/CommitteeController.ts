/**
 * CommitteeController — the `committee` verb, the read surface of the
 * committee concept (the meta layer: the group holding title over a
 * subdivision IS its committee). Filed under `system`, NEVER `civics` —
 * the jargon standard's layer split (civics is the fiction's category).
 *
 *   - bare / `committee <path>` — the committee over the giver's
 *     location (or the given path): group, subdivision, members,
 *     channel-if-minted.
 *   - `committee channel` — ensure + show the committee's chat channel
 *     (idempotent; the one mutation, its actor derived from execution
 *     context inside the Api).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { CompactApi } from '../../../api/compact';

const TOPIC = 'system.compact';

interface CommitteeModel extends CommandModel {
  /** Optional explicit content path to ask about. */
  path?: string;
}

export default class CommitteeController extends CommandController<CommitteeModel> {
  async execute(model: CommitteeModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand ?? 'show';
    switch (sub) {
      case 'show':
        return this.executeShow(model, context);
      case 'channel':
        return this.executeChannel(context);
      default:
        return this.fail(
          context,
          `Unknown committee subcommand: ${sub}`,
          'unknown-subcommand',
        );
    }
  }

  /** The queried content path: an explicit arg, else where the giver stands. */
  private queryPath(model: CommitteeModel, context: CommandContext): string {
    const explicit = (model.path ?? '').trim();
    if (explicit.length > 0) return explicit;
    return (
      context.location?.getTemplatePath() ??
      context.commandGiver.getTemplatePath() ??
      ''
    );
  }

  private async executeShow(
    model: CommitteeModel,
    context: CommandContext,
  ): Promise<void> {
    const path = this.queryPath(model, context);
    const committee = await CompactApi.committeeOf(path);
    if (!committee) {
      return this.fail(
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
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeChannel(context: CommandContext): Promise<void> {
    const path = this.queryPath({} as CommitteeModel, context);
    const channel = await CompactApi.ensureCommitteeChannel(path);
    if (!channel) {
      return this.fail(
        context,
        'No committee administers this ground, so there is no channel to mint.',
        'no-committee',
      );
    }
    this.send(
      context,
      Mml.fromMarkup(
        `\nThe committee's channel is ${Mml.escape(channel.name).toString()}.\n`,
      ),
    );
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
