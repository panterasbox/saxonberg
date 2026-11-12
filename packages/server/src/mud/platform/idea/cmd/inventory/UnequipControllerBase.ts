/**
 * UnequipControllerBase — the undressing act, behind three grammars.
 *
 * ⭐⭐ **`unequip`, `remove` and `unwield` each have a controller, and all
 * three inherit here** — the mirror of `EquipControllerBase`, and settled
 * the same way. A draft made the precise words aliases of `unequip`; the
 * cost was that one arg admitting `WearableMixin|WieldableMixin` cannot
 * refuse either, so `remove sword` reads as legal. The words keep their
 * own narrow `requires:` and share this implementation, because what
 * differs is the GRAMMAR and not the act.
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

import { PerceptionApi } from '../../../../api/perception';
import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { ContainmentApi } from '../../../../api/containment';
import { DressingStep } from '../../../../lib/slot/DressingStep';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Slotted } from '../../../../lib/slot/Slotted';
import type { Attired } from '../../../../lib/slot/Attired';

const TOPIC = 'sense.survey';

export interface UnequipModel extends CommandModel {
  /** Absent for bare `unequip` — the strip-everything form. */
  target?: MqlOneResult;
  /** `remove gloves carefully` — the manner word (cleanliness D5). */
  manner?: string;
}

/** A careful removal takes this many times as long (cleanliness D5). */
const CAREFUL_DOFF_FACTOR = 3;

export abstract class UnequipControllerBase extends CommandController<UnequipModel> {
  async execute(model: UnequipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isAttired(giver)) {
      throw new Error(
        `UnequipControllerBase: requiresSlotted should have caught ${giver.stuffId}`,
      );
    }
    // ⚠ Found by the drive: `remove apron` with no apron on bound the word
    // as the MANNER, left no target, and fell through to the strip below —
    // the player stood naked in the hall. A manner word that is not a
    // manner, or a manner with nothing to take off, is a refusal.
    // ⚠ And the drive again: `remove shirt` with the shirt on a drying rack
    // bound a TARGET that matched nothing — a result with no `stuff` — and
    // stripped shoes, trousers and all. Only an unnamed target strips.
    const manner = (model.manner ?? '').trim();
    const named = (model.target?.raw ?? '').trim();
    const unmatched = named !== '' && !model.target?.stuff;
    if (unmatched || (manner !== '' && (!model.target?.stuff || !/^(careful|quick|hast)/i.test(manner)))) {
      const what = unmatched ? named : manner;
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You aren't wearing ${what}.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-worn', detail: what });
      return;
    }
    if (model.target?.stuff) {
      const careful = /^careful/i.test(manner);
      const target = model.target.stuff;
      UnequipControllerBase.takeOff(target, this.heldSpeak(target), careful, false, context, giver, {
        onDone: () => {},
        onAbort: () => {},
      });
      return;
    }
    this.strip(context, giver);
  }

  /**
   * ⭐ Outermost-first, straight down `wornStack()`. A cursed layer
   * stops the walk AT itself — everything outside it is already off,
   * which is the honest outcome and reads correctly.
   *
   * ⚠⚠ Layers CHAIN (C53): each layer's step occupies `hands`, so the next
   * starts from the previous one's completion — the mirror of `equip`'s
   * `dressNext`. A loop that started them back to back spent ONE layer's
   * clock and ignored the rest's refused starts, so a hauberk, a gambeson
   * and a shirt came off in the time of the shirt.
   */
  private strip(context: CommandContext, giver: Stuff & Slotted & Attired): void {
    const stack = PerceptionApi.perceived(giver, [...giver.wornStack()] as unknown as Stuff[]);
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
    // The wording each layer would take, read now: the chain runs on after
    // this controller is gone.
    const wieldy = new Map(stack.map((item) => [item, this.heldSpeak(item)] as const));
    UnequipControllerBase.stripNext(stack, [], wieldy, context, giver);
  }

  private static stripNext(
    stack: Stuff[],
    off: Stuff[],
    wieldy: ReadonlyMap<Stuff, boolean>,
    context: CommandContext,
    giver: Stuff & Slotted & Attired,
  ): void {
    while (stack.length > 0) {
      const item = stack.shift()!;
      const begun = UnequipControllerBase.takeOff(
        item,
        wieldy.get(item) ?? false,
        false,
        true,
        context,
        giver,
        {
          onDone: () => {
            off.push(item);
            UnequipControllerBase.stripNext(stack, off, wieldy, context, giver);
          },
          // ⭐ What came off stays off — the strap undone is undone; the
          // rest never got its turn.
          onAbort: () => {
            off.push(item);
            stack.length = 0;
            UnequipControllerBase.stripReport(off, giver);
          },
        },
      );
      if (begun === 'refused') break; // cursed, or the hands are busy — stop here
      if (begun === 'later') return; // the chain resumes at completion
      off.push(item);
    }
    UnequipControllerBase.stripReport(off, giver);
  }

  private static stripReport(off: readonly Stuff[], giver: Stuff): void {
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

  /**
   * ⭐ Which reading the wording takes. `unwield` insists on the held
   * one, `remove` on the worn one, and bare `unequip` asks the
   * object — which is the only honest answer when the player did not
   * say. It steers the SENTENCE only: the release itself is one call
   * either way, because a slot is a slot.
   */
  protected heldSpeak(target: Stuff): boolean {
    return MixinApi.isWieldable(target) && !MixinApi.isWearable(target);
  }

  /**
   * One layer. `'now'` — off, and no clock in play; `'later'` — off, its
   * step under way (`then.onDone` runs at its completion, `then.onAbort`
   * if it is cut short); `'refused'` — it stays on (the refusal is said).
   *
   * ⚠⚠ The step is STARTED before the release (C53: its start result was
   * ignored, so a layer came off with the hands busy elsewhere and no clock
   * at all). Busy hands refuse with nothing written; a release the body
   * refuses then cancels the step it just began.
   */
  private static takeOff(
    target: Stuff,
    wieldy: boolean,
    careful: boolean,
    quiet: boolean,
    context: CommandContext,
    giver: Stuff & Slotted & Attired,
    then: { onDone: () => void; onAbort: () => void },
  ): 'now' | 'later' | 'refused' {
    let armed = false;
    let early = false;
    let dropped = false;
    let step: DressingStep | null = null;
    if (MixinApi.isEngaged(giver)) {
      step = new DressingStep({
        actor: giver,
        durationMs: giver.donDurationMs(target) * (careful ? CAREFUL_DOFF_FACTOR : 1),
        onComplete: () => {
          if (!armed) {
            early = true;
            return;
          }
          then.onDone();
        },
        onAbort: () => {
          if (!dropped) then.onAbort();
        },
      });
      const result = SchedulerApi.start(step);
      if (!result.ok) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Your hands are busy with something else.`)
          .send();
        context.note({ kind: 'controller-rejected', reason: 'busy', detail: target.getPresentation() });
        return 'refused';
      }
      if (result.status === 'completed-sync') early = true;
      else if (!quiet) context.note(result.note);
    }
    const drop = (): void => {
      if (step === null || early) return;
      dropped = true;
      SchedulerApi.cancel(step, 'preconditions-changed');
    };
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
      drop();
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
      return 'refused';
    }
    if (release.vacated === 0) {
      drop();
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
      return 'refused';
    }

    /*
     * ⚠⚠ The release lands as the step STARTS, because the cursed gate and
     * the slot vacate are the same call. So the step is the time the act
     * TAKES, not a gate on whether it lands — right for undressing (a strap
     * undone is undone), the mirror of `equip`, where the claim lands at
     * completion because a garment half-on is not on.
     */
    // ⭐ The hands that pulled it off take what was on its outside —
    // unless it was peeled off carefully (cleanliness D5).
    if (!wieldy && MixinApi.isHygienic(giver)) giver.doff(target, { careful });
    // ⭐ Nothing loose on a body (size and carrying D11, W8): what came off
    // is put up where it lives (its sheath, else the first place on you it
    // fits) or comes to hand (drive step 9's backpack) — and with neither,
    // it is set down where you stand, said so. A body with no hands sets
    // down what came off it: handed back, its tack would only go on again.
    let setDown = false;
    if (
      MixinApi.isCarrying(giver) &&
      MixinApi.isContainable(target) &&
      target.getContainer() === giver &&
      !giver.isHonest(target)
    ) {
      if (wieldy) giver.stow(target);
      if (!giver.isHonest(target)) {
        const here = giver.getContainer();
        if (giver.handSlots().length > 0 && giver.canReceive(target) === null) ContainmentApi.move(target, giver);
        else if (here !== null) {
          ContainmentApi.move(target, here);
          setDown = true;
        }
      }
    }

    if (!quiet) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          wieldy
            ? Mml.compose`You put up ${Mml.thing(target)}.`
            : careful
              ? Mml.compose`You peel off ${Mml.thing(target)} carefully, inside out, touching only the inside.`
              : Mml.compose`You take off ${Mml.thing(target)}.`,
        )
        .toPeers(
          wieldy
            ? Mml.compose`${Mml.actor(giver)} puts up ${Mml.thing(target)}.`
            : Mml.compose`${Mml.actor(giver)} takes off ${Mml.thing(target)}.`,
        )
        .send();
    }
    if (setDown) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Your hands are full — you set ${Mml.thing(target)} down.`)
        .send();
    }
    armed = true;
    return step === null || early ? 'now' : 'later';
  }
}
