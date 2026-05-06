/**
 * TellController — send a private message to another player.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { PlayerApi } from '../../api/player';
import { Mml } from '../../api/mml';
import type { Avatar } from '../Avatar';

interface TellModel extends CommandModel {
  target: string;
  message: string;
}

export class TellController extends CommandController<TellModel> {
  execute(model: TellModel, context: CommandContext): CommandResult {
    const speaker = context.commandGiver;
    const targetName = model.target;
    const message = model.message;

    const target = this.findAvatarByName(targetName, context);
    if (!target) {
      return {
        success: false,
        summary: `no one named '${targetName}' available`,
      };
    }

    const speechFragment = Mml.speech(message);
    MessageApi.scene(speaker)
      .topic(MessageApi.Topics.world.speech.tell)
      .toSelf(Mml.compose`You tell ${Mml.name(target)}, ${speechFragment}`)
      .toTarget(
        target,
        Mml.compose`${Mml.name(speaker)} tells you, ${speechFragment}`
      )
      .payload({
        speaker: MessageApi.refOf(speaker),
        target: MessageApi.refOf(target),
        text: message,
      })
      .send();

    return { success: true, summary: `told ${target.getFullName()}` };
  }

  private findAvatarByName(
    name: string,
    context: CommandContext
  ): Avatar | null {
    const nameLower = name.toLowerCase();

    const location = context.location;
    const sensors = MessageApi.getSensors(location);
    for (const sensor of sensors) {
      if (!MixinApi.isNamed(sensor)) continue;
      if (sensor.getFullName().toLowerCase() === nameLower) {
        return sensor as unknown as Avatar;
      }
    }

    const allAvatars = PlayerApi.getAllAvatars();
    for (const avatar of allAvatars) {
      const fullName = avatar.getFullName() || '';
      if (fullName.toLowerCase() === nameLower) {
        return avatar;
      }
    }
    return null;
  }
}
