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
 *   - **Direction match** — `target.stuff` is the actor's current
 *     location and `target.via.exit` is the exit the actor named.
 *     The door is fetched from `via.exit.getDoor()`. This is the
 *     canonical `open north` shape.
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

/**
 * The words a setting may be said in (water-supply D12), or a figure 0..1,
 * or a percent. `null` when the phrase is no setting at all.
 */
function parseSetting(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/^(a|an|the)\s+/, '').replace(/\s+(open|way)$/, '');
  const words: Record<string, number> = {
    quarter: 0.25,
    'a quarter': 0.25,
    third: 1 / 3,
    half: 0.5,
    halfway: 0.5,
    'two thirds': 2 / 3,
    'three quarters': 0.75,
    full: 1,
    fully: 1,
    wide: 1,
    shut: 0,
    closed: 0,
  };
  if (t in words) return words[t]!;
  const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(t);
  if (pct) return Math.max(0, Math.min(1, Number(pct[1]) / 100));
  const n = Number(t);
  if (t !== '' && Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return null;
}

/** A setting said back in words. */
function settingWords(f: number): string {
  if (f >= 0.999) return 'fully open';
  if (Math.abs(f - 0.75) < 0.01) return 'three quarters open';
  if (Math.abs(f - 0.5) < 0.01) return 'half open';
  if (Math.abs(f - 0.25) < 0.01) return 'a quarter open';
  return `${Math.round(f * 100)}% open`;
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

    // Direct hit (open oak) → the door is target.stuff;
    // direction match (open north) → the door is via.exit.getDoor().
    // MqlApi.effectiveTarget tries both and returns the first
    // Sealable. The arrow wrapper preserves MixinApi as `this` —
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
      const fraction = parseSetting(settingRaw);
      const thing = sealable as unknown as Stuff;
      if (!MixinApi.isThrottleable(thing)) {
        MessageApi.scene(commandGiver)
          .topic('act.deed')
          .toSelf(Mml.compose`${Mml.thing(thing)} is open or shut — there is nothing between.`)
          .send();
        context.note({ kind: 'controller-rejected', reason: 'no-setting', detail: 'open or shut' });
        return;
      }
      if (fraction === null) {
        MessageApi.scene(commandGiver)
          .topic('act.deed')
          .toSelf(Mml.compose`How far? A quarter, half, three quarters or full.`)
          .send();
        context.note({ kind: 'controller-rejected', reason: 'bad-setting', detail: settingRaw });
        return;
      }
      thing.setOpening(fraction, commandGiver);
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(
          fraction <= 0
            ? Mml.compose`You shut ${Mml.thing(thing)}.`
            : Mml.compose`You set ${Mml.thing(thing)} ${settingWords(fraction)}.`,
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

    const throttled = sealable as unknown as Stuff;
    if (MixinApi.isThrottleable(throttled)) throttled.setOpening(1, commandGiver);
    else sealable.open();

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
