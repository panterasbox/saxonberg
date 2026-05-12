/**
 * DropController — drop objects from inventory to location.
 *
 * Two paths:
 *
 *   - **No quantity**: existing whole-set behavior. Walk the resolved
 *     candidate list, move each into the room, emit one scene per
 *     drop.
 *   - **Quantity present** (`drop 5 coins`, `drop coins:{5}`): defer
 *     to `GlobbableApi.applyQuantity`. The helper owns the
 *     distribution algorithm, the strict pre-check, the
 *     split/reglob ripple, and the note emission. The action
 *     callback always returns `ok: true` in v1 because
 *     `ContainmentApi.move` throws on programmatic-contract failure
 *     (no soft failure to signal). Capacity-driven `ok: false`
 *     arrives with the collision slate.
 *
 * Response-envelope substrate isn't landed yet (separate slate). v1
 * folds the helper's notes into the `summary` Mml inline:
 *
 *   - `quantity-clamped` → append `" (only N available)"`.
 *   - `quantity-clamped-rejected` → return `{ success: false }` with
 *     `"you only have N of those"`.
 *   - `empty-result` → existing "you don't have any '<raw>'" form.
 *   - `target-declined` → no-op branch (TypeScript exhaustiveness;
 *     dead code in v1 because the v1 action always returns ok:true).
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlManyResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../../api/containment';
import { GlobbableApi } from '../../api/glob';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

interface DropModel extends CommandModel {
  targets: MqlManyResult;
}

interface DropPayload {
  operand: Stuff;
  applied: number;
}

export class DropController extends CommandController<DropModel> {
  async execute(
    model: DropModel,
    context: CommandContext
  ): Promise<CommandResult> {
    const { stuff, quantity, raw } = model.targets;
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `DropController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    if (!quantity) {
      return this.executeWholeSet(stuff, raw, context);
    }

    // Quantity present — defer to the helper.
    const inventory = ContainmentApi.getContents(giver);
    const inInventory = stuff.filter((s) =>
      inventory.some((it) => it.stuffId === s.stuffId)
    );

    const result = await GlobbableApi.applyQuantity<DropPayload>(
      inInventory,
      quantity,
      async (operand, applied) => {
        if (!MixinApi.isContainable(operand)) {
          throw new Error(
            `DropController: operand ${operand.stuffId} is not Containable`
          );
        }
        ContainmentApi.move(operand, context.location);
        return { ok: true, payload: { operand, applied } };
      },
      { query: raw }
    );

    return this.renderResult(result, raw, giver, context);
  }

  private executeWholeSet(
    targets: Stuff[],
    raw: string,
    context: CommandContext
  ): CommandResult {
    if (targets.length === 0) {
      return {
        success: false,
        summary: `you don't have any '${raw}' to drop`,
      };
    }
    let successCount = 0;
    const droppedNames: string[] = [];
    for (const target of targets) {
      if (this.dropObject(target, context)) {
        successCount++;
        droppedNames.push(GlobbableApi.formatName(target, 'something'));
      }
    }
    if (successCount === 0) {
      return { success: false, summary: 'nothing dropped' };
    }
    return { success: true, summary: droppedNames.join(', ') };
  }

  private renderResult(
    result: {
      ok: boolean;
      applied: number;
      status?: 'partial' | 'declined';
      notes: ReadonlyArray<
        | { kind: 'quantity-clamped'; requested: number; applied: number }
        | { kind: 'quantity-clamped-rejected'; requested: number; available: number }
        | { kind: 'empty-result'; query: string; reason: 'no-matches' }
        | { kind: 'target-declined'; target: Stuff; reason: string }
      >;
      payloads: DropPayload[];
    },
    raw: string,
    giver: Stuff,
    _context: CommandContext
  ): CommandResult {
    // Inspect notes inline (envelope substrate stub per G1). The
    // kind-switch is exhaustive so future note kinds force a compile
    // error here when added.
    let clampedSuffix = '';
    for (const note of result.notes) {
      switch (note.kind) {
        case 'empty-result':
          return {
            success: false,
            summary: `you don't have any '${raw}' to drop`,
          };
        case 'quantity-clamped-rejected':
          return {
            success: false,
            summary: `you only have ${note.available} of those`,
          };
        case 'quantity-clamped':
          clampedSuffix = ` (only ${note.applied} available)`;
          break;
        case 'target-declined':
          // No-op in v1. Action callback always returns ok:true here,
          // so this branch is dead code. The collision slate's
          // capacity-driven decline will land here.
          break;
      }
    }

    if (!result.ok || result.payloads.length === 0) {
      return { success: false, summary: 'nothing dropped' };
    }

    // Fire one scene per successful operand, then summarize.
    for (const { operand } of result.payloads) {
      this.fireDropScene(giver, operand);
    }

    const droppedNames = result.payloads
      .map(({ operand }) => GlobbableApi.formatName(operand, 'something'))
      .join(', ');
    return {
      success: true,
      summary: `${droppedNames}${clampedSuffix}`,
    };
  }

  private dropObject(target: Stuff, context: CommandContext): boolean {
    if (!MixinApi.isContainable(target)) {
      throw new Error(
        `DropController: target ${target.stuffId} is not Containable`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `DropController: commandGiver ${giver.stuffId} is not a Container`
      );
    }
    const inventory = ContainmentApi.getContents(giver);
    if (!inventory.some((item) => item.stuffId === target.stuffId)) {
      return false;
    }
    ContainmentApi.move(target, context.location);
    this.fireDropScene(giver, target);
    return true;
  }

  private fireDropScene(giver: Stuff, target: Stuff): void {
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You drop ${Mml.item(target)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} drops ${Mml.item(target)}.`)
      .send();
  }
}
