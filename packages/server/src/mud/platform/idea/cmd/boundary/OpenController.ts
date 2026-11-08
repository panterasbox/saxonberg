/**
 * OpenController — open any Sealable the player can reach.
 *
 * Phase 7+: target is pre-resolved through MQL by the dispatcher;
 * the controller reads `model.target.stuff` directly. The wrapper
 * also carries `raw` (player-typed text) for no-match messaging.
 *
 * Two resolution shapes can arrive:
 *
 *   - **Direct hit on a Sealable** — `target.stuff` is the Sealable
 *     itself (a chest, a door matched by keyword like
 *     `open oak door`).
 *   - **Direction match** — `target.stuff` is the EXIT the actor
 *     named (a way is a candidate in its own right); the door hung
 *     in it is the sealable thing. This is the canonical
 *     `open north` shape.
 *
 * The YAML wires `canReach` so MQL queries that resolve to remote
 * Sealables fail validation before reaching the controller; the
 * controller's own checks handle wrong-type / already-open cases.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Sealable } from '../../../../lib/spatial/Sealable';

interface OpenModel extends CommandModel {
  target?: MqlOneResult;
  setting?: string;
}

export default class OpenController extends CommandController<OpenModel> {
  execute(model: OpenModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Open what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'open what?',
      });
      return;
    }
    if (target.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: target.raw,
      });
      return;
    }

    // Direct hit (open oak) → the door is target.stuff; a way (open
    // north) → the door hung in it. MqlApi.effectiveTarget is that one
    // rule. The arrow wrapper preserves MixinApi as `this` —
    // the security-gated static needs it for the internal
    // hasMixin lookup.
    const sealable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Sealable => MixinApi.isSealable(s),
    );
    if (!sealable) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't open that.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-sealable',
        detail: "can't open that",
      });
      return;
    }

    // ⭐ The mixin decides whether this opens for this person (D12): a
    // locked door does not, a padlocked gate does not for somebody with no
    // key. The controller only says the refusal it is given.
    const may = sealable.canOpen(commandGiver);
    if (!may.ok) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`${may.reason ?? "It won't open."}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'cannot-open',
        detail: may.reason ?? 'cannot open',
      });
      return;
    }

    // ⭐ How far (D12): a throttled gate opens BY an amount; a door is open
    // or shut, and says so.
    const settingRaw = (model.setting ?? '').trim();
    if (settingRaw !== '') {
      const thing = sealable as unknown as Stuff;
      if (!MixinApi.isThrottleable(thing)) {
        MessageApi.scene(commandGiver)
          .topic('act.deed')
          .toSelf(Mml.compose`${Mml.thing(thing)} is open or shut — there is nothing between.`)
          .send();
        context.note({ kind: 'controller-rejected', reason: 'no-setting', detail: 'open or shut' });
        return;
      }
      const worked = thing.workOpening(settingRaw, commandGiver);
      if (worked === null) {
        MessageApi.scene(commandGiver)
          .topic('act.deed')
          .toSelf(Mml.compose`How far? A quarter, half, three quarters or full.`)
          .send();
        context.note({ kind: 'controller-rejected', reason: 'bad-setting', detail: settingRaw });
        return;
      }
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(
          worked.shut
            ? Mml.compose`You shut ${Mml.thing(thing)}.`
            : Mml.compose`You set ${Mml.thing(thing)} ${worked.words}.`,
        )
        .toPeers(Mml.compose`${Mml.actor(commandGiver)} works ${Mml.thing(thing)}.`)
        .send();
      return;
    }

    if (sealable.isOpen()) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`It is already open.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-open',
        detail: 'already open',
      });
      return;
    }

    sealable.open(commandGiver);

    // Interact-hazard (a trapped chest): opening it is the touch that
    // springs it. The hazard self-resolves — armed + `trigger: interact`
    // is checked inside `resolveInteract`; a plain chest is a no-op.
    const opened = sealable as unknown as Stuff;
    if (MixinApi.isHazard(opened)) {
      opened.resolveInteract(commandGiver);
    }

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You open ${Mml.thing(sealable as unknown as Stuff)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} opens ${Mml.thing(sealable as unknown as Stuff)}.`,
      )
      .send();

    return;
  }
}
