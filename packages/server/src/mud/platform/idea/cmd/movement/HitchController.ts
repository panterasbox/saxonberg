/**
 * HitchController — couple a hauler to a cart.
 *
 * Two paths, by whether a `to <mount>` operand is present:
 *   - **Self-haul** (`hitch cart`): the giver becomes the hauler. Hands
 *     fill up — declined if the giver is already hauling or is wielding
 *     anything (the hauling/wielding mutual exclusion). Overload never
 *     gates the hitch (you can always grab a handle) — the cost surfaces
 *     at move time (breakaway/terrain gates in LocomotionApi).
 *   - **Harness** (`hitch cart to horse`): the named mount becomes the
 *     hauler; the giver's hands stay free (a harnessed beast claims none).
 *
 * Validation surface (from `cmd/movement/hitch.yaml`):
 *   - requiresAnimate (verb-level)
 *   - `requires: [VisibleMixin, HaulableMixin]` (target); `[VisibleMixin, HaulerMixin]`
 *     (mount, optional)
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { HitchFacts, HitchRefusal } from '../../../../lib/slot/Hauler';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

interface HitchModel extends CommandModel {
  target: MqlOneResult;
  mount?: MqlOneResult;
}

/**
 * ⭐ The hauler decides (controller-liquidity W8): the cart's veto, whether
 * it already pulls something and whether the hands are free are all
 * `Hauler.hitchPlanFor`'s. This binds who pulls — the named beast, or the
 * giver — and words the answer.
 */
export default class HitchController extends CommandController<HitchModel> {
  async execute(model: HitchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const cart = model.target.stuff;
    if (!cart) {
      this.notFound(context, model.target.raw);
      return;
    }
    if (!MixinApi.isHaulable(cart)) {
      throw new Error(
        `HitchController: mustBeHaulable should have caught ${cart.stuffId}`,
      );
    }

    let hauler: Stuff;
    if (model.mount && (model.mount.stuff || model.mount.raw)) {
      // Harness: the named draft animal pulls; the giver's hands stay free.
      const mount = model.mount.stuff;
      if (!mount) {
        this.notFound(context, model.mount.raw);
        return;
      }
      if (!MixinApi.isHauling(mount)) {
        throw new Error(
          `HitchController: mustBeHauler should have caught ${mount.stuffId}`,
        );
      }
      hauler = mount;
    } else {
      // Self-haul: the giver grips the handle by hand.
      if (!MixinApi.isHauling(giver)) {
        this.refuse(context, 'act.deed', "You can't pull a cart.", 'cannot-haul', 'giver does not compose HaulerMixin');
        return;
      }
      hauler = giver;
    }
    if (!MixinApi.isHauling(hauler)) return;

    const answer = await hauler.hitchPlanFor(cart, giver);
    if (!answer.ok) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(HitchController.refusalWords(answer, hauler, giver))
        .send();
      context.note({ kind: 'controller-rejected', reason: answer.reason, detail: answer.reason });
      return;
    }
    await this.engagePlan(context, answer, {
      beginSelf: (f) => HitchController.selfLine(f),
      onRefused: (r) => HitchController.refusalWords(r, hauler, giver),
      onDone: (f) => ({ self: HitchController.selfLine(f), peers: HitchController.peersLine(giver, f) }),
    });
  }

  /** ⭐ Every refusal a hitch can say. */
  protected static refusalWords(r: HitchRefusal, hauler: Stuff, giver: Stuff): Composed {
    switch (r.reason) {
      case 'hitch-refused':
        return Mml.text(r.facts.veto);
      case 'already-hitched':
        return hauler.stuffId === giver.stuffId
          ? Mml.compose`You're already pulling something.`
          : Mml.compose`${Mml.thing(hauler)} is already pulling something.`;
      case 'hands-occupied':
        return Mml.compose`Your hands are full.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static selfLine(f: HitchFacts): Composed {
    return f.byHand
      ? Mml.compose`You take hold of ${Mml.thing(f.cart)}.`
      : Mml.compose`You hitch ${Mml.thing(f.cart)} to ${Mml.thing(f.hauler)}.`;
  }

  protected static peersLine(giver: Stuff, f: HitchFacts): Composed {
    return f.byHand
      ? Mml.compose`${Mml.actor(giver)} takes hold of ${Mml.thing(f.cart)}.`
      : Mml.compose`${Mml.actor(giver)} hitches ${Mml.thing(f.cart)} to ${Mml.thing(f.hauler)}.`;
  }

  private notFound(context: CommandContext, raw: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You don't see any '${raw}' here.`)
      .send();
    context.note({ kind: 'empty-result', field: 'target', query: raw });
  }
}
