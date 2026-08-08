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
 * Glob emits canonical `@saxonberg/types` note shapes pre-stamped
 * with `field: 'targets'`; `renderResult` forwards each into
 * `ctx.note(...)` and pairs the player-facing kinds with their
 * Scene.send prose. Status auto-escalates via the dispatch-response
 * envelope — no `success`/`summary` mediation.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { MqlManyResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { ContainmentApi } from '../../../api/containment';
import { GlobbableApi, type ApplyQuantityResult } from '../../../api/glob';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { ChattelApi } from '../../../api/chattel';

interface DropModel extends CommandModel {
  targets: MqlManyResult;
}

interface DropPayload {
  operand: Stuff;
  applied: number;
}

export default class DropController extends CommandController<DropModel> {
  async execute(
    model: DropModel,
    context: CommandContext
  ): Promise<void> {
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
    const inventory = giver.getContents();

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
        if (!this.dropOperand(operand, context)) {
          return { ok: false, reason: 'it will not leave your hand' };
        }
        return { ok: true, payload: { operand, applied } };
      },
      { field: 'targets', query: raw }
    );

    return this.renderResult(result, raw, context);
  }

  private executeWholeSet(
    targets: Stuff[],
    inventory: readonly Stuff[],
    raw: string,
    context: CommandContext
  ): void {
    if (targets.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't have any '${raw}' to drop.`)
        .send();
      context.note({ kind: 'empty-result', field: 'targets', query: raw });
      return;
    }
    const droppedNames: string[] = [];
    for (const target of targets) {
      if (!inventory.some((item) => item.stuffId === target.stuffId)) {
        continue;
      }
      if (!this.dropOperand(target, context)) continue;
      droppedNames.push(target.getPresentation());
    }
    if (droppedNames.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`Nothing dropped.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-dropped',
        detail: 'nothing dropped',
      });
      return;
    }
    return;
  }

  private renderResult(
    result: ApplyQuantityResult<DropPayload>,
    raw: string,
    context: CommandContext,
  ): void {
    for (const note of result.notes) {
      // Glob already constructed canonical-shape notes — forward
      // straight through. Per-kind prose decides whether the player
      // sees a Scene frame.
      context.note(note);
      switch (note.kind) {
        case 'empty-result':
          MessageApi.scene(context.commandGiver)
            .topic('sense.survey')
            .toSelf(Mml.compose`You don't have any '${raw}' to drop.`)
            .send();
          return;
        case 'quantity-clamped-rejected':
          MessageApi.scene(context.commandGiver)
            .topic('sense.survey')
            .toSelf(
              Mml.compose`You only have ${String(note.available)} of those.`,
            )
            .send();
          return;
        case 'quantity-clamped':
        case 'target-declined':
          // Notes forwarded; nothing more to render here.
          break;
      }
    }

    if (!result.ok || result.payloads.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`Nothing dropped.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-dropped',
        detail: 'nothing dropped',
      });
    }
  }

  /**
   * Move one operand into the location and emit the per-operand scene.
   * Shared by both the bareword whole-set path and the quantity-bearing
   * `applyQuantity` action callback so the move + scene pair stays in
   * one place. `false` ⇒ it refused and stayed put
   * (the refusal has already been narrated).
   *
   * **Leaving your inventory means leaving your body first.** Dropping
   * was moving the Stuff without ever vacating the slot it occupied, so
   * a dropped sword lay on the floor while the hand it came from stayed
   * full — a phantom occupant, for all equipment, not just cursed
   * things. It was also the hole that made the cursed-release gate
   * decorative: you could not unwield a cursed wand, but you could drop
   * it.
   */
  private dropOperand(operand: Stuff, context: CommandContext): boolean {
    if (!MixinApi.isContainable(operand)) {
      throw new Error(
        `DropController: operand ${operand.stuffId} is not Containable`
      );
    }
    const giver = context.commandGiver;
    if (MixinApi.isSlotted(giver) && MixinApi.isSlottable(operand)) {
      const release = giver.tryReleaseFromSlots(operand);
      if (!release.released) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            release.dumpedKJ > 0
              ? Mml.compose`You cannot let go of ${Mml.item(operand)} — and it is running hot against your skin.`
              : Mml.compose`You cannot let go of ${Mml.item(operand)}. It has no intention of being put down.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cursed-will-not-release',
          detail: `${operand.getPresentation()} refuses release`,
        });
        return false;
      }
    }
    ContainmentApi.move(operand, context.location);
    // Custody moved; title did not. Re-derive where the owner keeps it, so
    // a dropped good persists on ITS OWNER'S record naming this room —
    // "I left my book at a friend's" — rather than becoming part of the
    // room. A no-op for anything unowned. (D8)
    void ChattelApi.followCustody(operand);
    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You drop ${Mml.item(operand)}.`)
      .toPeers(
        Mml.compose`${Mml.name(context.commandGiver)} drops ${Mml.item(operand)}.`
      )
      .send();
    return true;
  }
}
