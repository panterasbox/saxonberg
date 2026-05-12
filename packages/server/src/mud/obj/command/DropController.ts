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
import { DescribeApi } from '../../api/describe';
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

    // `giver` is narrowed to `Stuff & Container` from here on — the
    // narrowing has to survive across the two paths because each
    // wants the inventory snapshot.
    const inventory = ContainmentApi.getContents(giver);

    if (!quantity) {
      return this.executeWholeSet(stuff, inventory, raw, context);
    }

    // Quantity present — defer to the helper. Both paths drop each
    // operand through `dropOperand`, so the move + scene-emission
    // pair stays in one place.
    const inInventory = stuff.filter((s) =>
      inventory.some((it) => it.stuffId === s.stuffId)
    );

    const result = await GlobbableApi.applyQuantity<DropPayload>(
      inInventory,
      quantity,
      async (operand, applied) => {
        this.dropOperand(operand, context);
        return { ok: true, payload: { operand, applied } };
      },
      { query: raw }
    );

    return this.renderResult(result, raw);
  }

  private executeWholeSet(
    targets: Stuff[],
    inventory: readonly Stuff[],
    raw: string,
    context: CommandContext
  ): CommandResult {
    if (targets.length === 0) {
      return {
        success: false,
        summary: `you don't have any '${raw}' to drop`,
      };
    }
    const droppedNames: string[] = [];
    for (const target of targets) {
      if (!inventory.some((item) => item.stuffId === target.stuffId)) {
        continue;
      }
      this.dropOperand(target, context);
      droppedNames.push(DescribeApi.formatName(target, 'something'));
    }
    if (droppedNames.length === 0) {
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
    raw: string
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

    const droppedNames = result.payloads
      .map(({ operand }) => DescribeApi.formatName(operand, 'something'))
      .join(', ');
    return {
      success: true,
      summary: `${droppedNames}${clampedSuffix}`,
    };
  }

  /**
   * Move one operand into the location and emit the per-operand
   * scene. Shared by both the bareword whole-set path and the
   * quantity-bearing `applyQuantity` action callback so the move +
   * scene pair stays in one place.
   */
  private dropOperand(operand: Stuff, context: CommandContext): void {
    if (!MixinApi.isContainable(operand)) {
      throw new Error(
        `DropController: operand ${operand.stuffId} is not Containable`
      );
    }
    ContainmentApi.move(operand, context.location);
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You drop ${Mml.item(operand)}.`)
      .toPeers(
        Mml.compose`${Mml.name(context.commandGiver)} drops ${Mml.item(operand)}.`
      )
      .send();
  }
}
