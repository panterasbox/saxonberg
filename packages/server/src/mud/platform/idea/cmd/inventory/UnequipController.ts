/**
 * UnequipController — `unequip`, the other direction.
 *
 * Absorbs `remove` / `doff` / `unwield`, which are now aliases, for the
 * same reason `equip` absorbed `wear` and `wield`: taking your kit off
 * is one intention.
 *
 * ⭐ **Outermost-first, and that is the whole ordering claim.**
 * `wornStack()` is already outermost-first, so stripping is a walk down
 * it — you cannot get a shirt out from under a hauberk, and the player
 * should not have to work that out in the same way they should not have
 * had to work out the way in.
 *
 * ⭐⭐ **Undressing costs time too, and this is where it bites.** Heavy
 * armour in deep water, or a burning building: the minutes it takes to
 * get a hauberk off are the same minutes it took to get it on, and they
 * are now real. See `mortality.md` before tuning the dial.
 *
 * ⚠ **The cursed-release gate is preserved exactly.**
 * `tryReleaseFromSlots` is the one call that both refuses a cursed item
 * and dumps its charge into the wearer — one fact from the wearer's
 * side, not two features that co-occur — and a bare `unequip` walks
 * into it per layer like any other. A cursed piece stops the strip at
 * itself and says so; everything outside it has already come off.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { DressingStep } from '../../../../lib/slot/DressingStep';
import { donDurationMs } from './EquipController';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Slotted } from '../../../../lib/slot/Slotted';

const TOPIC = 'sense.survey';

interface UnequipModel extends CommandModel {
  /** Absent for bare `unequip` — the strip-everything form. */
  target?: MqlOneResult;
}

export default class UnequipController extends CommandController<UnequipModel> {
  async execute(model: UnequipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `UnequipController: requiresSlotted should have caught ${giver.stuffId}`,
      );
    }
    if (model.target?.stuff) {
      await this.takeOff(model.target.stuff, context, giver, false);
      return;
    }
    await this.strip(context, giver);
  }

  /**
   * ⭐ Outermost-first, straight down `wornStack()`. A cursed layer
   * stops the walk AT itself — everything outside it is already off,
   * which is the honest outcome and reads correctly.
   */
  private async strip(
    context: CommandContext,
    giver: Stuff & Slotted,
  ): Promise<void> {
    const stack = [...giver.wornStack()] as unknown as Stuff[];
    if (stack.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have nothing on to take off.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-worn',
        detail: 'the stack is empty',
      });
      return;
    }
    const off: Stuff[] = [];
    for (const item of stack) {
      const ok = await this.takeOff(item, context, giver, true);
      if (!ok) break; // cursed, or the hands are busy — stop here
      off.push(item);
    }
    const names = off.map((o) => o.getPresentation()).join(', ');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        off.length > 0
          ? Mml.compose`You strip off: ${names}.`
          : Mml.compose`You get nothing off.`,
      )
      .toPeers(
        off.length > 0
          ? Mml.compose`${Mml.actor(giver)} strips off their kit.`
          : Mml.compose`${Mml.actor(giver)} struggles with their kit.`,
      )
      .send();
  }

  /** One layer. Returns whether it actually came off. */
  private async takeOff(
    target: Stuff,
    context: CommandContext,
    giver: Stuff & Slotted,
    quiet: boolean,
  ): Promise<boolean> {
    const wieldy = MixinApi.isWieldable(target) && !MixinApi.isWearable(target);
    /*
     * ⚠ The cursed gate, preserved verbatim from `remove`/`unwield`:
     * `tryReleaseFromSlots` refuses a cursed item AND dumps its charge
     * into the wearer in one call, because from the wearer's side that
     * is one fact. It refuses only for something actually worn, so a
     * cursed item in your pack refuses nothing — the curse is a fact
     * about wearing it, not about owning it.
     */
    const release = giver.tryReleaseFromSlots(
      target as Parameters<typeof giver.tryReleaseFromSlots>[0],
    );
    if (!release.released) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          wieldy
            ? release.dumpedTau > 0
              ? Mml.compose`Your hand will not open around ${Mml.thing(target)} — and it is running hot against your palm.`
              : Mml.compose`Your hand will not open around ${Mml.thing(target)}. It has no intention of letting go.`
            : release.dumpedTau > 0
              ? Mml.compose`${Mml.thing(target)} will not come away — and it is running hot against your skin.`
              : Mml.compose`${Mml.thing(target)} will not come away. It has no intention of letting go.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'cursed-will-not-release',
        detail: `${target.getPresentation()} refuses release`,
      });
      return false;
    }
    if (release.vacated === 0) {
      if (!quiet) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            wieldy
              ? Mml.compose`You aren't holding ${Mml.thing(target)}.`
              : Mml.compose`You aren't wearing ${Mml.thing(target)}.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'not-worn',
          detail: target.getPresentation(),
        });
      }
      return false;
    }

    /*
     * ⚠⚠ The release has ALREADY happened by the time the step starts,
     * because the cursed gate and the slot vacate are the same call. So
     * the step here is the time the act TAKES, not a gate on whether it
     * lands — which is right for undressing (a strap undone is undone)
     * and is the mirror of `equip`, where the claim lands at completion
     * because a garment half-on is not on.
     */
    if (MixinApi.isEngaged(giver)) {
      SchedulerApi.start(
        new DressingStep({
          actor: giver,
          durationMs: donDurationMs(target),
          onComplete: () => {},
        }),
      );
    }
    if (!quiet) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          wieldy
            ? Mml.compose`You put up ${Mml.thing(target)}.`
            : Mml.compose`You take off ${Mml.thing(target)}.`,
        )
        .toPeers(
          wieldy
            ? Mml.compose`${Mml.actor(giver)} puts up ${Mml.thing(target)}.`
            : Mml.compose`${Mml.actor(giver)} takes off ${Mml.thing(target)}.`,
        )
        .send();
    }
    return true;
  }
}
