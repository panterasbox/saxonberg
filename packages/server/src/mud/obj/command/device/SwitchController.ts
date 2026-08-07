/**
 * SwitchController — `switch <thing> [on|off]` / `toggle <thing>`.
 *
 * Targets any Switchable in reach (a lamppost, a beacon, a machine).
 * With an explicit `on`/`off` state it sets that state; without one it
 * toggles. Gated by the Switchable capability the same way open/close
 * are gated by Sealable — the controller narrows the target with
 * `MixinApi.isSwitchable` and rejects anything else.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Switchable } from '../../../lib/boundary/Switchable';

interface SwitchModel extends CommandModel {
  target?: MqlOneResult;
  state?: string;
}

export default class SwitchController extends CommandController<SwitchModel> {
  execute(model: SwitchModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Switch what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'switch what?',
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

    const switchable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & Switchable => MixinApi.isSwitchable(s),
    );
    if (!switchable) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't switch that.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-switchable',
        detail: "can't switch that",
      });
      return;
    }

    // Resolve the requested state: explicit on/off, else toggle.
    const raw = (model.state ?? '').trim().toLowerCase();
    let next: boolean;
    if (raw === 'on') {
      next = true;
    } else if (raw === 'off') {
      next = false;
    } else if (raw === '') {
      next = !switchable.isOn();
    } else {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Switch it on or off?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'bad-state',
        detail: `cannot read '${raw}' as on/off`,
      });
      return;
    }

    if (switchable.isOn() === next) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(
          Mml.compose`It is already ${next ? 'on' : 'off'}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: next ? 'already-on' : 'already-off',
        detail: next ? 'already on' : 'already off',
      });
      return;
    }

    switchable.setOn(next);
    const word = next ? 'on' : 'off';

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(
        Mml.compose`You switch ${Mml.object(switchable as unknown as Stuff)} ${word}.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(commandGiver)} switches ${Mml.object(switchable as unknown as Stuff)} ${word}.`,
      )
      .send();

    return;
  }
}
