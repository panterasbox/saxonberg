/**
 * LookController — examine surroundings or a specific object.
 *
 * Fires a Scene at `world.perception.look` with a single self frame
 * carrying the location/target description body. No peer broadcast —
 * looking is a private observation.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOne } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
import type { Exit } from '../../lib/spatial/Exit';

interface LookModel extends CommandModel {
  target?: MqlOne;
}

export class LookController extends CommandController<LookModel> {
  execute(model: LookModel, context: CommandContext): CommandResult {
    const target = model.target;
    // `look.yaml` declares `default: "$scope"`, so the matcher fills
    // bare `look` with the giver's current scope — undefined target
    // here means the dispatcher couldn't supply input at all (no
    // scope, structured input that omitted the field, etc.). Treat
    // that as "look at the room" for backwards compatibility.
    if (target === undefined) {
      return this.lookAtLocation(context);
    }
    if (target.stuff === null) {
      // Player typed something but MQL produced no match.
      return {
        success: false,
        summary: `you don't see any '${target.raw}' here`,
      };
    }
    // Render the room (with exits) when the resolved target IS the
    // current location — bare `look` on arrival, `look here`, or
    // any `$scope` that re-resolved to the location.
    if (target.stuff === context.location) {
      return this.lookAtLocation(context);
    }
    return this.lookAtTarget(target.stuff, context);
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
    return 'You see nothing special.';
  }

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
