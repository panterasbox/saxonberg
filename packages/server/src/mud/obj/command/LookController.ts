/**
 * LookController — examine surroundings or a specific object.
 *
 * Fires a Scene at `world.perception.look` with a single self frame.
 * Prose comes from the central Phrasebook; the controller assembles
 * structured pieces (location vs target, with/without exits) and
 * hands them to the right phrasebook entry.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
import { Phrasebook } from '../../lib/Phrasebook';
import type { Exit } from '../../lib/spatial/Exit';

export interface LookInput {
  target?: Stuff;
}

export class LookController extends CommandController<LookInput> {
  execute(input: LookInput, context: CommandContext): CommandResult {
    if (input.target) {
      return this.lookAtTarget(input.target, context);
    }
    return this.lookAtLocation(context);
  }

  private lookAtLocation(context: CommandContext): CommandResult {
    const actor = context.commandGiver;
    const location = context.location;
    const description = this.getObjectDescription(location);
    const exitsLine = MixinApi.isExitable(location)
      ? this.formatExits(location.getObviousExits())
      : null;

    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(Phrasebook.perception.location(location, description, exitsLine))
      .send();

    return {
      success: true,
      summary: `examined ${DescribeApi.getDisplayName(location, 'somewhere')}`,
    };
  }

  private lookAtTarget(target: Stuff, context: CommandContext): CommandResult {
    const actor = context.commandGiver;
    const description = this.getObjectDescription(target);

    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(Phrasebook.perception.target(target, description))
      .send();

    return {
      success: true,
      summary: `examined ${DescribeApi.getDisplayName(target, 'something')}`,
    };
  }

  private getObjectDescription(obj: Stuff): string {
    if (MixinApi.isVisible(obj)) return obj.getLong();
    return Phrasebook.perception.nothingSpecial();
  }

  /**
   * Build the obvious-exits line as an Mml fragment, or `null` when
   * the room has no obvious exits. Each exit renders as its
   * direction, optionally annotated with `(<door name>, open|closed)`
   * when there's a door.
   */
  private formatExits(exits: Exit[]): Mml | null {
    if (exits.length === 0) return null;
    const parts = exits.map((exit) => {
      const dir = Mml.direction(exit.direction);
      if (!exit.door) return dir;
      const state = exit.door.isOpen ? 'open' : 'closed';
      const doorName = DescribeApi.getDisplayName(exit.door, 'door');
      return Mml.compose`${dir} (${doorName}, ${state})`;
    });
    return Phrasebook.perception.exitsLine(parts);
  }
}
