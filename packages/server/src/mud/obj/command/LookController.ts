/**
 * LookController — examine surroundings, an object, or a sub-feature
 * (Detail).
 *
 * Fires a Scene at `world.perception.look` with a single self frame
 * carrying the location/target/detail description body. No peer
 * broadcast — looking is a private observation.
 *
 * Three rendering branches, dispatched on the bound `target`:
 *
 *   - **Detail** — `target.via.detailPath` is set. The host Stuff
 *     (`target.stuff`) carries `DetailedMixin`; the controller looks
 *     up the description via `host.getDetail(path.join('.'))` and
 *     renders the detail tip name + description. This is the
 *     `look bookcase` / `look at the inscription` flow that lands
 *     after MQL's chain narrows into the host's detail tree.
 *
 *   - **Location** — `target.stuff` is the giver's current location
 *     and no detail via is set. Renders the room name +
 *     description + obvious exits. Fired by bare `look` on arrival
 *     and `look here`.
 *
 *   - **Direct Stuff** — anything else. Renders the bound Stuff's
 *     own name + long description.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
import type { Exit } from '../../lib/boundary/Exit';

interface LookModel extends CommandModel {
  target?: MqlOneResult;
}

export class LookController extends CommandController<LookModel> {
  execute(model: LookModel, context: CommandContext): CommandResult {
    const target = model.target;
    // `look.yaml` declares `default: "$focus"` and the scope fallback
    // chain `["$focus", "reachable"]`, so the dispatcher always
    // hands us a wrapper. Empty (`null`) is the only honest "no
    // match" signal; we don't fabricate another fallback here.
    if (!target || target.stuff === null) {
      return {
        success: false,
        summary: `you don't see any '${target?.raw ?? ''}' here`,
      };
    }
    // Detail-via dispatch: when MQL's chain narrowed into the host's
    // detail tree, render the detail rather than the host itself.
    // Holds for `look bookcase` (host=location, via=['bookcase'])
    // AND `look engraving` against an item in inventory
    // (host=apple, via=['engraving']) — anywhere `via.detailPath`
    // is set.
    const detailPath = target.via?.detailPath;
    if (detailPath && detailPath.length > 0) {
      return this.lookAtDetail(target.stuff, detailPath, context);
    }
    // Render the room (with exits) when the resolved target IS the
    // current location — bare `look` on arrival, `look here`, or
    // any `$focus` that re-resolved to the location.
    if (target.stuff === context.location) {
      return this.lookAtLocation(context);
    }
    return this.lookAtTarget(target.stuff, context);
  }

  /**
   * Render a Detail as `<tip name>\n\n<description>`. The host's
   * `getDetail` resolver accepts dot-notation paths (`'bookcase.book'`),
   * so the controller just joins `via.detailPath` and asks. Aliases
   * are transparent at this layer — the detail tip name is whatever
   * id MQL matched on.
   *
   * Defensive on missing details: the chain rule that produced
   * `via.detailPath` already verified the detail exists, but a
   * race-y removal between resolve and execute (or a host that
   * isn't actually Detailed) falls through to a polite error.
   */
  private lookAtDetail(
    host: Stuff,
    detailPath: string[],
    context: CommandContext,
  ): CommandResult {
    if (!MixinApi.isDetailed(host)) {
      return {
        success: false,
        summary: `you can't make out any detail there`,
      };
    }
    const dotted = detailPath.join('.');
    const description = host.getDetail(dotted);
    if (description === null) {
      return {
        success: false,
        summary: `you can't make out any '${dotted}' there`,
      };
    }
    const tip = detailPath[detailPath.length - 1]!;
    const body = Mml.compose`\n${tip}\n\n${Mml.fromMarkup(description)}\n`;

    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return { success: true, summary: `examined ${tip}` };
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
