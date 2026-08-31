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

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ContainmentApi } from '../../../../api/containment';
import { GlobbableApi, type ApplyQuantityResult } from '../../../../api/glob';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ConditionApi } from '../../../../api/condition';
import { Touch } from '../../../../lib/perception/Touch';
import { ChattelApi } from '../../../../api/chattel';
import { PerceptionApi } from '../../../../api/perception';
import { ProxyApi } from '../../../../api/proxy';

interface GetModel extends CommandModel {
  targets: MqlManyResult;
}

interface GetPayload {
  operand: Stuff;
  applied: number;
}

export default class GetController extends CommandController<GetModel> {
  async execute(
    model: GetModel,
    context: CommandContext
  ): Promise<void> {
    const { stuff, quantity, raw } = model.targets;
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    // `giver` is narrowed to `Stuff & Container`; carry the inventory
    // / location snapshots into both paths so neither has to re-cast.
    const inventory = giver.getContents();
    // Defensive: placeless avatars are blocked at the inbound gate, so a
    // real `get` always has a location by the time the controller runs.
    if (!context.location) return;
    if (!quantity) {
      return this.executeWholeSet(stuff, inventory, raw, context);
    }

    // ⭐ The controller checks STATE; it does not rebuild the binder's
    // pool. The scope already resolved which objects `raw` names — all
    // that is left is whether each one is takeable from here, which is
    // one question with one owner: `PerceptionApi.canReach`. It knows
    // about open containers, so the rack's coupe and the stock's keg
    // answer true without this file knowing what a container is.
    // ⚠ ONE reach walk for the whole list — never `canReach` per
    // candidate. Each `canReach` re-walks the room and one level into
    // every open container AND pays a call-security stack capture, so
    // the per-candidate form is quadratic: a live drive found 96.5% of
    // the server's CPU in this controller, with `get produce` binding
    // every item in an open floor stock.
    const reachable = PerceptionApi.reachableAmong(giver, stuff);
    // ⭐ A bolted-down thing is not a CANDIDATE for picking up, so it
    // must not consume the quantity slot. `get 1 crowsfoot` matches both
    // the crowsfoot stock and the crowsfoot bottles standing in it — and
    // spending the one slot on the immovable counter, then reporting
    // `fixed-in-place`, is not what was asked. Filter them out and take
    // the bottle. (If EVERY match is fixed there is nothing to take, and
    // the whole-set branch below says so by name.)
    const candidates = reachable.filter(
      (s) =>
        !this.isFixed(s) &&
        !inventory.some((it) => it.stuffId === s.stuffId)
    );
    if (candidates.length === 0 && reachable.some((s) => this.isFixed(s))) {
      return this.declineAllFixed(reachable, raw, context);
    }

    const result = await GlobbableApi.applyQuantity<GetPayload>(
      candidates,
      quantity,
      async (operand, applied) => {
        if (!this.pickUpOperand(operand, context)) {
          // Lift gate declined this operand — the decline scene + note
          // already fired in `pickUpOperand`; report it as a non-applied
          // result so glob skips it.
          return { ok: false, reason: 'too-heavy-to-lift' };
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
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'targets', query: raw });
      return;
    }
    const pickedNames: string[] = [];
    // ⚠ Same rule, one walk — see the note in `execute`.
    const reachable = PerceptionApi.reachableAmong(
      context.commandGiver,
      targets,
    );
    const takeable = reachable.filter((s) => !this.isFixed(s));
    if (takeable.length === 0 && reachable.length > 0) {
      return this.declineAllFixed(reachable, raw, context);
    }
    for (const target of takeable) {
      if (inventory.some((item) => item.stuffId === target.stuffId)) {
        continue;
      }
      if (this.pickUpOperand(target, context)) {
        pickedNames.push(target.getPresentation());
      }
    }
    if (pickedNames.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`Nothing picked up.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-picked-up',
        detail: 'nothing picked up',
      });
      return;
    }
    return;
  }

  /**
   * Bolted down: not a candidate for picking up.
   *
   * ⚠ Read off the RAW target. This runs once per candidate, and
   * `get produce` on a floor stock binds hundreds — every proxied call
   * pays the call-security gate, and the gate captures a JS stack. The
   * eager form (`MixinApi.isContainable(s) && s.isFixedInPlace()`) was
   * two gated calls per candidate and put `GetController` back at 36%
   * of the server within one boot of my adding it.
   *
   * Safe to read raw here on both counts: `fixedInPlace` is plain state
   * with no shadow that could legitimately disagree (a polymorph does
   * not un-bolt a basin), and `get.yaml` requires `ContainableMixin` on
   * its targets, so the mixin check the gate was paying for is already
   * guaranteed by the arg spec.
   */
  private isFixed(s: Stuff): boolean {
    const raw = ProxyApi.unwrap(s) as unknown as {
      isFixedInPlace?: () => boolean;
    };
    return raw.isFixedInPlace?.() === true;
  }

  /**
   * Everything the words named is bolted down. Say THAT — "you don't see
   * any 'basin' here" would be a lie about a basin standing right there.
   */
  private declineAllFixed(
    matches: readonly Stuff[],
    raw: string,
    context: CommandContext,
  ): void {
    const first = matches.find((s) => this.isFixed(s)) ?? matches[0]!;
    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
      .toSelf(Mml.compose`${Mml.thing(first)} is fixed in place.`)
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'fixed-in-place',
      detail: raw,
    });
  }

  private renderResult(
    result: ApplyQuantityResult<GetPayload>,
    raw: string,
    context: CommandContext,
  ): void {
    for (const note of result.notes) {
      // Glob already constructed canonical-shape notes — forward
      // straight through. Prose for the kinds that the controller
      // surfaces to the player rides alongside.
      context.note(note);
      switch (note.kind) {
        case 'empty-result':
          MessageApi.scene(context.commandGiver)
            .topic('sense.survey')
            .toSelf(Mml.compose`You don't see any '${raw}' here.`)
            .send();
          return;
        case 'quantity-clamped-rejected':
          MessageApi.scene(context.commandGiver)
            .topic('sense.survey')
            .toSelf(Mml.compose`Only ${String(note.available)} of those here.`)
            .send();
          return;
        case 'quantity-clamped':
        case 'target-declined':
          // Notes already forwarded above; clamp suffix or per-
          // target prose decisions live on the controller's
          // success-path rendering.
          break;
      }
    }

    if (!result.ok || result.payloads.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('sense.survey')
        .toSelf(Mml.compose`Nothing picked up.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-picked-up',
        detail: 'nothing picked up',
      });
    }
  }

  /**
   * Move one operand into the giver's inventory and emit the
   * per-operand scene. Shared by both the bareword whole-set path
   * and the quantity-bearing `applyQuantity` action callback so the
   * move + scene pair stays in one place.
   *
   * Returns `true` when the operand was picked up, `false` when the
   * encumbrance lift gate declined it — so callers skip a declined item
   * (it is simply left behind; lighter items in the same `get all`
   * still succeed).
   */
  private pickUpOperand(operand: Stuff, context: CommandContext): boolean {
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

    // ⭐ Bolted down. The narrow test that replaces a `canMove` veto:
    // the wall TV, the terminal's brass pillar. It refuses *an agent
    // taking it*, and nothing else — a remodel, a `place`, an author
    // rearranging scenery all still move it through
    // `ContainmentApi.move`, because none of those is a person pocketing
    // a television. Authored per row, so the same class covers a screen
    // standing on a counter.
    if (operand.isFixedInPlace()) {
      context.note({
        kind: 'controller-rejected',
        reason: 'fixed-in-place',
        detail: `${operand.getPresentation()} is fixed in place`,
      });
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`${Mml.thing(operand)} is fixed in place.`)
        .send();
      return false;
    }

    // Pick-up-your-own-trap: a placed, still-armed trap can only be lifted
    // by the one who set it — you can't pocket someone else's rigged snare
    // (and a concealed one a stranger can't perceive never resolves here
    // anyway). An authored/environmental hazard (no `placedBy`) isn't
    // player-pocketable through this path.
    if (
      MixinApi.isHazard(operand) &&
      operand.isArmed() &&
      operand.getPlacedBy() &&
      operand.getPlacedBy() !== giver.getTemplatePath()
    ) {
      context.note({
        kind: 'controller-rejected',
        reason: 'not-your-trap',
        detail: `${operand.getPresentation()} isn't yours to take`,
      });
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`You'd rather not lay a hand on ${Mml.thing(operand)} — it isn't yours, and it's live.`,
        )
        .send();
      return false;
    }

    // Hands-occupied while hauling: you can't pick a thing up into your
    // hands while gripping a cart's handle. Keyed on the giver being the
    // hauler (a mounted rider whose horse hauls keeps their hands free).
    if (MixinApi.isHauling(giver) && giver.isHitched()) {
      context.note({
        kind: 'controller-rejected',
        reason: 'hands-hauling',
        detail: 'cannot pick up while hauling a cart',
      });
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`Your hands are full — you're pulling ${Mml.thing(giver.getHauledCart()!)}.`,
        )
        .send();
      return false;
    }

    // Encumbrance lift gate — only a load-bearing giver (a creature with
    // the gauge) is gated; non-creature containers (a chest looting into
    // a bag) skip it. Diegetic decline: an envelope note + a scene line,
    // no throw, no boolean-result move. An item that pushes burden over
    // *capacity* but stays under the *strain ceiling* still lifts (now
    // overloaded — locomotion-gated + drains on traverse).
    if (MixinApi.isLoadBearing(giver) && giver.wouldExceedCeiling(operand)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'too-heavy-to-lift',
        detail: `${operand.getPresentation()} won't budge`,
      });
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You strain, but ${Mml.thing(operand)} doesn't budge.`)
        .send();
      return false;
    }

    ContainmentApi.move(operand, giver);
    // Custody returns to a pair of hands; `place` follows to `inventory`.
    // Picking up a good you do not hold title to is theft — permitted and
    // recoverable — so this records, it does not refuse. (D8)
    void ChattelApi.followCustody(operand);
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You pick up ${Mml.thing(operand)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} picks up ${Mml.thing(operand)}.`)
      .send();
    this.burnOnGrab(operand, giver);
    return true;
  }

  /**
   * The scalding-band burn hook applied to a bare-handed grab. Any
   * Thermal object whose surface scalds afflicts a `burn` trauma on the
   * grabber via the `heat` channel — the scalding-band rule itself lives in
   * `Touch.contactBurnEnergy` (shared with `feel`), so this is just the
   * `get`-side application + prose. No-op
   * below the band or on a giver with no vitals.
   */
  private burnOnGrab(operand: Stuff, giver: Stuff): void {
    if (!MixinApi.isThermal(operand)) return;
    const energy = Touch.contactBurnEnergy(
      operand.getSurfaceTemperature().rawValue(),
    );
    if (energy === null || !MixinApi.isVitals(giver)) return;
    // Route through the `heat` materials-response channel so a glove / gauntlet
    // insulates the hand before the residual burns tissue.
    ConditionApi.inflict(giver, {
      mechanism: 'heat',
      site: 'body.hand',
      energy,
    });
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`It scalds your hand!`)
      .send();
  }
}
