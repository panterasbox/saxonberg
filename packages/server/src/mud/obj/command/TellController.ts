/**
 * TellController — send a private message to another player.
 *
 * Target resolution is handled by the command framework via the
 * YAML's `scope: "online"` + `mustBeAgent` validator combination —
 * no custom name lookup in the controller. The dispatcher resolves
 * the target through MQL's keyword search against the online-Avatar
 * candidate pool; ambiguity surfaces a disambiguation prompt before
 * the controller is invoked.
 *
 * Self-tell works: the giver IS in the `online` candidate pool, and
 * `mustBeAgent` accepts them. Note-to-self is a real use case.
 *
 * Rendering is chat form (`Bobalu → Alice: ...`), not prose form
 * (`You tell Alice, "..."`). Tells are functionally DMs; the
 * chat-log shape reads at a glance, scans faster, matches modern
 * chat-app convention. Sender sees their own name (not "you");
 * recipient sees themselves as "you".
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  FieldValue,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MqlApi } from '../../api/mql';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';

interface TellModel extends CommandModel {
  target: FieldValue; // MQL-resolved object; extractStuffs gets the first
  message: string;
}

export class TellController extends CommandController<TellModel> {
  execute(model: TellModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    const stuffs = MqlApi.extractStuffs(model.target);
    if (!stuffs || stuffs.length === 0) {
      // Framework's empty-result path should have caught this; the
      // controller is just defensive.
      context.note({ kind: 'empty-result', field: 'target', query: '' });
      return;
    }
    const target = stuffs[0] as Stuff;
    const message = model.message;

    const parsedMessage = Mml.markdownToMml(
      message,
      Mml.perceiverMentionResolver(speaker),
    );
    MessageApi.scene(speaker)
      .topic(MessageApi.Topics.world.speech.tell)
      .toSelf(
        Mml.compose`${Mml.name(speaker)} → ${Mml.name(target)}: ${parsedMessage}`,
      )
      .toTarget(
        target,
        Mml.compose`${Mml.name(speaker)} → you: ${parsedMessage}`,
      )
      .payload({
        speaker: MessageApi.refOf(speaker),
        target: MessageApi.refOf(target),
        text: message,
      })
      .send();
  }
}
