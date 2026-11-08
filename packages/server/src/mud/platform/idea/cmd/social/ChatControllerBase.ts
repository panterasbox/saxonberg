/**
 * ChatControllerBase — what every `chat` subcommand shares
 * (controllers-are-io W7, D9: one controller per subcommand over a base
 * per noun). The verb opts into `fallthrough: true`, so an unknown first
 * token (`chat gossip hi`) falls through to bind against the top-level
 * args — `model.subcommand` is absent and the verb-level controller,
 * {@link ChatPostController}, posts.
 *
 * `join`/`leave` share {@link ChatControllerBase.tune}, `mute`/`unmute`
 * share {@link ChatControllerBase.mute}.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { PlayerApi } from '../../../../api/player';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';

export interface ChatModel extends CommandModel {
  channel?: string;
  name?: string;
  message?: string;
  old_name?: string;
  new_name?: string;
  handle?: string;
  ordered?: boolean;
  /** `--anon` — post without being named, where the channel permits it. */
  anon?: boolean;
  /** `chat anonymity <name> permit|forbid`. */
  setting?: string;
}

export abstract class ChatControllerBase extends CommandController<ChatModel> {
  protected async tune(
    model: ChatModel,
    context: CommandContext,
    tunedIn: boolean,
  ): Promise<void> {
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars subscribe in v1.', 'avatar-required');
    }
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    await actor.updateChannelSubscription(channel, { tunedIn });
    this.send(
      context,
      tunedIn
        ? Mml.compose`\nTuned in to ${channel.name}.\n`
        : Mml.compose`\nLeft ${channel.name}.\n`,
    );
  }
  protected async mute(
    model: ChatModel,
    context: CommandContext,
    muted: boolean,
  ): Promise<void> {
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars mute in v1.', 'avatar-required');
    }
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    await actor.updateChannelSubscription(channel, { muted });
    this.send(
      context,
      muted
        ? Mml.compose`\nMuted ${channel.name}.\n`
        : Mml.compose`\nUnmuted ${channel.name}.\n`,
    );
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}
