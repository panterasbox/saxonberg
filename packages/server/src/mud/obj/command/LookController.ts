/**
 * LookController — examine surroundings or a specific object.
 *
 * Fires a Scene at `world.perception.look` with a single self frame
 * carrying the location/target description body. No peer broadcast —
 * looking is a private observation.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
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

    let body = Mml.compose`\n${Mml.location(location)}\n\n${Mml.fromMarkup(description)}`;

    if (MixinApi.isExitable(location)) {
      const exitsLine = this.formatExits(location.getObviousExits());
      if (exitsLine) {
        body = Mml.compose`${body}\n\n${exitsLine}`;
      }
    }

    body = Mml.compose`${body}\n`;

    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return {
      success: true,
      summary: `examined ${DescribeApi.getDisplayName(location, 'somewhere')}`,
    };
  }

  private lookAtTarget(target: Stuff, context: CommandContext): CommandResult {
    const actor = context.commandGiver;
    const description = this.getObjectDescription(target);
    const body = Mml.compose`\n${Mml.name(target)}\n\n${Mml.fromMarkup(description)}\n`;

    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return {
      success: true,
      summary: `examined ${DescribeApi.getDisplayName(target, 'something')}`,
    };
  }

  private getObjectDescription(obj: Stuff): string {
    if (MixinApi.isVisible(obj)) return obj.getLong();
    // TODO: differentiate "looking at a non-Visible room" from
    // "looking at a non-Visible object." A bare `Location` has no
    // description by design (the starting `/domain/void` is one);
    // returning "You see nothing special." in that context reads
    // wrong. Either skip the description block entirely for rooms,
    // or use a context-aware fallback (e.g. "An unremarkable
    // place."). Tracked under "Command system polish" in
    // docs/roadmap.md.
    return 'You see nothing special.';
  }

  /**
   * Format the "Obvious exits" line as a single Mml fragment. Each
   * exit renders as its direction, optionally followed by ` (<door
   * name>, open|closed)` when it has a door. Returns null when there
   * are no obvious exits.
   */
  private formatExits(exits: Exit[]): Mml | null {
    if (exits.length === 0) return null;
    const parts = exits.map((exit) => {
      const dir = Mml.direction(exit.getDirection());
      const door = exit.getDoor();
      if (!door) return dir;
      const state = door.getIsOpen() ? 'open' : 'closed';
      const doorName = DescribeApi.getDisplayName(door, 'door');
      return Mml.compose`${dir} (${doorName}, ${state})`;
    });
    const joined = Mml.list(parts);
    return Mml.fromMarkup(`<exits>Obvious exits: ${joined.toString()}.</exits>`);
  }
}
