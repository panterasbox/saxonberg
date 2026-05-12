/**
 * GetController — pick up objects from the location.
 *
 * Mirror of `DropController` shape — see that file for the two-path
 * pattern (whole-set vs quantity-bearing). Source for `get` is the
 * location's contents, destination is the giver's inventory.
 *
 * v1 envelope stub: notes from `GlobbableApi.applyQuantity` are
 * folded into the `summary` inline. Future response-envelope work
 * threads them through `ctx.note(...)` instead.
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

interface GetModel extends CommandModel {
  targets: MqlManyResult;
}

interface GetPayload {
  operand: Stuff;
  applied: number;
}

export class GetController extends CommandController<GetModel> {
  async execute(
    model: GetModel,
    context: CommandContext
  ): Promise<CommandResult> {
    const { stuff, quantity, raw } = model.targets;
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    // `giver` is narrowed to `Stuff & Container`; carry the inventory
    // / location snapshots into both paths so neither has to re-cast.
    const inventory = ContainmentApi.getContents(giver);
    const here = ContainmentApi.getContents(context.location);

    if (!quantity) {
      return this.executeWholeSet(stuff, inventory, here, raw, context);
    }

    // Source: location contents. Filter to candidates actually
    // present here and not already in inventory.
    const inLocation = stuff.filter((s) =>
      here.some((it) => it.stuffId === s.stuffId)
    );
    const candidates = inLocation.filter(
      (s) => !inventory.some((it) => it.stuffId === s.stuffId)
    );

    const result = await GlobbableApi.applyQuantity<GetPayload>(
      candidates,
      quantity,
      async (operand, applied) => {
        this.pickUpOperand(operand, context);
        return { ok: true, payload: { operand, applied } };
      },
      { query: raw }
    );

    return this.renderResult(result, raw);
  }

  private executeWholeSet(
    targets: Stuff[],
    inventory: readonly Stuff[],
    here: readonly Stuff[],
    raw: string,
    context: CommandContext
  ): CommandResult {
    if (targets.length === 0) {
      return {
        success: false,
        summary: `you don't see any '${raw}' here`,
      };
    }
    const pickedNames: string[] = [];
    for (const target of targets) {
      if (inventory.some((item) => item.stuffId === target.stuffId)) {
        continue;
      }
      if (!here.some((item) => item.stuffId === target.stuffId)) {
        continue;
      }
      this.pickUpOperand(target, context);
      pickedNames.push(DescribeApi.formatName(target, 'something'));
    }
    if (pickedNames.length === 0) {
      return { success: false, summary: 'nothing picked up' };
    }
    return { success: true, summary: pickedNames.join(', ') };
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
      payloads: GetPayload[];
    },
    raw: string
  ): CommandResult {
    let clampedSuffix = '';
    for (const note of result.notes) {
      switch (note.kind) {
        case 'empty-result':
          return {
            success: false,
            summary: `you don't see any '${raw}' here`,
          };
        case 'quantity-clamped-rejected':
          return {
            success: false,
            summary: `only ${note.available} of those here`,
          };
        case 'quantity-clamped':
          clampedSuffix = ` (only ${note.applied} available)`;
          break;
        case 'target-declined':
          break;
      }
    }

    if (!result.ok || result.payloads.length === 0) {
      return { success: false, summary: 'nothing picked up' };
    }

    const pickedNames = result.payloads
      .map(({ operand }) => DescribeApi.formatName(operand, 'something'))
      .join(', ');
    return {
      success: true,
      summary: `${pickedNames}${clampedSuffix}`,
    };
  }

  /**
   * Move one operand into the giver's inventory and emit the
   * per-operand scene. Shared by both the bareword whole-set path
   * and the quantity-bearing `applyQuantity` action callback so the
   * move + scene pair stays in one place.
   */
  private pickUpOperand(operand: Stuff, context: CommandContext): void {
    if (!MixinApi.isContainable(operand)) {
      throw new Error(
        `GetController: operand ${operand.stuffId} is not Containable`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }
    ContainmentApi.move(operand, giver);
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You pick up ${Mml.item(operand)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} picks up ${Mml.item(operand)}.`)
      .send();
  }
}
