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
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Mixins } from '../../../../lib/mixin';

interface HitchModel extends CommandModel {
  target: MqlOneResult;
  mount?: MqlOneResult;
}

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

    // --- Harness path: hitch the cart to a named draft animal. ---
    if (model.mount && (model.mount.stuff || model.mount.raw)) {
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
      const vetoed = await hitchVeto(cart, mount as unknown as Stuff, giver);
      if (vetoed) {
        MessageApi.scene(giver)
          .topic('act.deed')
          .toSelf(Mml.text(vetoed))
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'hitch-refused',
          detail: vetoed,
        });
        return;
      }
      if (mount.isHitched()) {
        MessageApi.scene(giver)
          .topic('act.deed')
          .toSelf(Mml.compose`${Mml.thing(mount)} is already pulling something.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'already-hitched',
          detail: `${mount.getPresentation()} already hauls a cart`,
        });
        return;
      }
      mount.hitch(cart);
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You hitch ${Mml.thing(cart)} to ${Mml.thing(mount)}.`)
        .toPeers(
          Mml.compose`${Mml.actor(giver)} hitches ${Mml.thing(cart)} to ${Mml.thing(mount)}.`,
        )
        .send();
      return;
    }

    // --- Self path: the giver grips the handle by hand. ---
    const selfVeto = await hitchVeto(cart, giver, giver);
    if (selfVeto) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.text(selfVeto))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'hitch-refused',
        detail: selfVeto,
      });
      return;
    }
    if (!MixinApi.isHauling(giver)) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't pull a cart.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'cannot-haul',
        detail: 'giver does not compose HaulerMixin',
      });
      return;
    }
    if (giver.isHitched()) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You're already pulling something.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-hitched',
        detail: 'giver already hauls a cart',
      });
      return;
    }
    if (this.handsOccupied(giver)) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`Your hands are full.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'hands-occupied',
        detail: 'cannot hand-hitch while wielding',
      });
      return;
    }
    giver.hitch(cart);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You take hold of ${Mml.thing(cart)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} takes hold of ${Mml.thing(cart)}.`)
      .send();
  }

  /** True if the giver currently wields anything (a held slot is full). */
  private handsOccupied(giver: Stuff): boolean {
    if (!MixinApi.isSlotted(giver)) return false;
    for (const [slotName, occupants] of giver.getAllOccupants()) {
      if (occupants.size === 0) continue;
      if (giver.getSlotSpec(slotName)?.accepts === Mixins.Wieldable) {
        return true;
      }
    }
    return false;
  }

  private notFound(context: CommandContext, raw: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You don't see any '${raw}' here.`)
      .send();
    context.note({ kind: 'empty-result', field: 'target', query: raw });
  }
}

/**
 * The cart's own optional veto — *may this hauler, coupled by this
 * actor, take me?* Consulted by SHAPE (the `callTraverseHook` idiom), so
 * a `Haulable` that wants to refuse needs no mixin change anywhere and
 * one that does not costs a `typeof`.
 *
 * ⭐ The haulage trade band-gates rig size on `teamstering` through it —
 * *competence is access* rather than *the same act done better*. ⚠ The
 * ACTOR decides, not the hauler: a horse has no transcript, and the
 * person putting it in the shafts is the one who does or does not know
 * how.
 *
 * Returns the refusal text, or `null` when the coupling is fine.
 */
async function hitchVeto(
  cart: Stuff,
  hauler: Stuff,
  actor: Stuff,
): Promise<string | null> {
  const asked = cart as unknown as {
    canHitch?: (
      h: Stuff,
      a: Stuff,
    ) => { ok: boolean; reason?: string } | Promise<{ ok: boolean; reason?: string }>;
  };
  if (typeof asked.canHitch !== 'function') return null;
  const veto = await asked.canHitch.call(cart, hauler, actor);
  if (!veto || veto.ok) return null;
  return veto.reason ?? 'It will not couple.';
}
