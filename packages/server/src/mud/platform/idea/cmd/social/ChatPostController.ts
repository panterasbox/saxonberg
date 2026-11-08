/**
 * ChatPostController — `chat <channel> <message> [--anon]` — the fallthrough bare post (also an ad-hoc DM-group handle) (over {@link ChatControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { SecurityApi } from '../../../../api/security';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ChatControllerBase, type ChatModel } from './ChatControllerBase';

export default class ChatPostController extends ChatControllerBase {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const channelName = (model.channel ?? '').trim();
    const body = (model.message ?? '').trim();
    if (!channelName) {
      return this.fail(context, 'channel required', 'channel-required');
    }
    if (!body) {
      return this.fail(context, 'message required', 'message-required');
    }
    const anon = model.anon === true;
    const channel = await ChatApi.resolveByName(channelName);
    if (!channel) {
      // ⭐ An ad-hoc (DM-group) thread has no anonymity to grant — a
      // cohort you were added to BY NAME already knows who is in it —
      // but that is a reason to IGNORE the flag, not to refuse the
      // message. You always get to speak; the channel decides whether
      // your name shows. Told plainly below, never silently.
      if (anon) {
        this.send(
          context,
          Mml.compose`\nA group message shows who is speaking — posted under your name.\n`,
        );
      }
      // Try ad-hoc handle path.
      const ad = await speaker.resolveChatHandle(channelName);
      if (ad) {
        // For ad-hoc channels, audience = ad.members; route directly.
        const cat = await ChatApi.catalogue();
        // Lazy-import to avoid circular: post via a synthesized
        // pseudo-channel-shaped helper. For v1 we just iterate.
        for (const m of ad.members) {
          if (m === speaker) continue;
          MessageApi.scene(speaker)
            .topic('speech.channel')
            .modality('verbal-esp')
            .meta({ channelId: ad.handle })
            .toTarget(m, Mml.compose`[${ad.handle}] ${Mml.actor(speaker)}: ${body}`)
            .payload({
              channelId: ad.handle,
              channelName: ad.handle,
              speaker: MessageApi.refOf(speaker),
              text: body,
            })
            .send();
        }
        // Speaker self frame
        MessageApi.scene(speaker)
          .topic('speech.channel')
          .modality('verbal-esp')
          .meta({ channelId: ad.handle })
          .toSelf(Mml.compose`[${ad.handle}] You: ${body}`)
          .payload({
            channelId: ad.handle,
            channelName: ad.handle,
            speaker: MessageApi.refOf(speaker),
            text: body,
          })
          .send();
        // Append to history
        cat.appendToHistory(ad.handle, {
          id: SecurityApi.uuid(),
          topic: 'speech.channel',
          tags: ['audience:witness'],
          body: `[${ad.handle}] ${speaker.getPresentation()}: ${body}`,
          meta: { timestamp: Date.now(), modality: 'verbal-esp', channelId: ad.handle },
          payload: {
            channelId: ad.handle,
            channelName: ad.handle,
            speaker: MessageApi.refOf(speaker),
            text: body,
          },
        });
        return;
      }
      return this.fail(context, `No channel '${channelName}'.`, 'no-such-channel');
    }
    // ⭐⭐ **`--anon` is a REQUEST the channel may decline, not a
    // precondition that fails.** You always get to speak; the channel's
    // setting decides whether your name shows, and on a channel that
    // forbids anonymity it shows — exactly as if you had not asked.
    //
    // ⚠ It is said out loud rather than quietly done. The poster typed
    // `--anon` for a reason, and a line telling them the post went out
    // named is the difference between a rule they can see and a
    // surprise they find out about afterwards.
    if (anon && !channel.permitsAnonymity()) {
      this.send(
        context,
        Mml.compose`\n'${channel.name}' shows every poster's name — posted under yours.\n`,
      );
    }
    await speaker.postToChannel(channel, body, { anonymous: anon });
  }
}
