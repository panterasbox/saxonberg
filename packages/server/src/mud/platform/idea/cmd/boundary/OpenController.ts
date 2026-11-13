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
import type { Sealable, OpenFacts, OpenRefusal } from '../../../../lib/spatial/Sealable';

type Composed = ReturnType<typeof Mml.compose>;

interface OpenModel extends CommandModel {
  target?: MqlOneResult;
  setting?: string;
}

export default class OpenController extends CommandController<OpenModel> {
  async execute(model: OpenModel, context: CommandContext): Promise<void> {
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

    // ⭐ The thing decides (`Sealable.openPlanFor`, controller-liquidity
    // W7c): whether it opens for this person (a locked door does not), and
    // — a throttled gate — by how much. The controller words the answer.
    const setting = (model.setting ?? '').trim();
    const answer = sealable.openPlanFor(commandGiver, setting === '' ? null : setting);
    if (!answer.ok) {
      return this.refuse(context, 'act.deed', OpenController.refusal(answer, answer.facts?.why ?? null), answer.reason);
    }
    await this.engagePlan(context, answer, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => Mml.compose`${OpenController.refusal(r, null)}`,
      onDone: (f) => OpenController.done(commandGiver, f),
    });
  }

  /** The opening, in words. */
  protected static done(giver: Stuff, f: OpenFacts): { self: Composed; peers: Composed } {
    if (f.kind === 'set') {
      return {
        self: f.shut ? Mml.compose`You shut ${Mml.thing(f.thing)}.` : Mml.compose`You set ${Mml.thing(f.thing)} ${f.words}.`,
        peers: Mml.compose`${Mml.actor(giver)} works ${Mml.thing(f.thing)}.`,
      };
    }
    return {
      self: Mml.compose`You open ${Mml.thing(f.thing)}.`,
      peers: Mml.compose`${Mml.actor(giver)} opens ${Mml.thing(f.thing)}.`,
    };
  }

  /** Why it did not open, in words (`why` — the thing's own refusal, when it gave one). */
  protected static refusal(r: OpenRefusal, why: string | null): string {
    switch (r.reason) {
      case 'cannot-open':
        return why ?? "It won't open.";
      case 'already-open':
        return 'It is already open.';
      case 'no-setting':
        return 'It is open or shut — there is nothing between.';
      case 'bad-setting':
        return 'How far? A quarter, half, three quarters or full.';
      default: {
        const unworded: never = r;
        throw new Error(`OpenController: no words for ${String(unworded)}`);
      }
    }
  }
}
