/**
 * PumpController — `pump <thing>` / `work <thing>`: work something by hand
 * that moves a fluid. A well's handle, a wellhead's lift, a furnace's
 * bellows.
 *
 * ⭐⭐ **One verb behind one interface** ({@link Pumpable}). Before the pump
 * build this controller worked the bellows and nothing else, and its view
 * said so (`requires: BurnerMixin`). A well and a furnace share no mixin,
 * so the target is `requires: any` — the `dig.yaml` reasoning, because an
 * alternation would delete a check — and the controller narrows by SHAPE:
 *
 *   1. the bound thing speaks the protocol (a furnace, a loose pump) — work it;
 *   2. it is a pump SOURCE (a well, a wellhead) — work the pump set in it,
 *      or say plainly that nothing is;
 *   3. anything else — *"The chair has nothing to pump."*
 *
 * ⭐ Every refusal past that is the THING's sentence, never the verb's: the
 * bellows says it is cold, the pump says the water stands fourteen metres
 * down. The controller knows nothing about atmospheres or bellows.
 *
 * A spell at a handle is an engagement on the hands with `effortW` the
 * thing derived from the work it does — the body pays at completion through
 * the exertion substrate (the `LiftController` shape). A plan with no
 * duration (the bellows' toggle) completes at once, as it always did.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type {
  Pumpable,
  PumpPlan,
  PumpSource,
} from '../../../../lib/pump/Pumpable';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface PumpModel extends CommandModel {
  target?: MqlOneResult;
}

/** Does `x` speak the pump protocol? A module-private narrowing, by shape. */
function asPumpable(x: Stuff): (Stuff & Pumpable) | null {
  const p = x as unknown as Partial<Pumpable>;
  return typeof p.planPump === 'function' && typeof p.completePump === 'function'
    ? (x as Stuff & Pumpable)
    : null;
}

/** Is `x` something a pump is set in? */
function asSource(x: Stuff): (Stuff & PumpSource) | null {
  const s = x as unknown as Partial<PumpSource>;
  return typeof s.pumpFitted === 'function' ? (x as Stuff & PumpSource) : null;
}

/**
 * ⚠ A MODULE function, not a method: an engagement completes after the
 * controller has been destructed in its dispatch `finally` (the
 * `WorkedActController` scar).
 */
async function land(
  context: CommandContext,
  subject: Stuff & Pumpable,
  plan: PumpPlan,
): Promise<void> {
  const giver = context.commandGiver;
  const result = await subject.completePump(giver, plan.token);
  if (giver.isDestroyed()) return;
  const scene = MessageApi.scene(giver).topic(TOPIC).toSelf(result.self);
  if (result.peers) scene.toPeers(result.peers);
  scene.send();
}

export default class PumpController extends ManualBuildController<PumpModel> {
  async execute(model: PumpModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          raw
            ? Mml.compose`You don't see any '${raw}' here.`
            : Mml.compose`Pump what?`,
        )
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }

    let subject = asPumpable(target);
    if (!subject) {
      const source = asSource(target);
      if (!source) {
        this.declineStep(
          context,
          Mml.compose`${Mml.thing(target)} has nothing to pump.`,
          'nothing-to-pump',
        );
        return;
      }
      const fitted = source.pumpFitted();
      subject = fitted ? asPumpable(fitted) : null;
      if (!subject) {
        this.declineStep(
          context,
          Mml.compose`Nothing is set in ${Mml.thing(target)} to work.`,
          'no-pump',
        );
        return;
      }
    }

    const prognosis = await subject.planPump(giver);
    if (prognosis.kind === 'refusal') {
      this.declineStep(context, prognosis.prose, prognosis.reason);
      return;
    }
    const plan = prognosis;
    const worked = subject;
    if (plan.durationMs <= 0) {
      await land(context, worked, plan);
      return;
    }
    this.engageStep(context, {
      durationMs: plan.durationMs,
      effortW: plan.effortW,
      beginSelf: plan.beginSelf ?? Mml.compose`You set to work.`,
      ...(plan.beginPeers ? { beginPeers: plan.beginPeers } : {}),
      onComplete: () => {
        void land(context, worked, plan);
      },
    });
  }
}
