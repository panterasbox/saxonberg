/**
 * DipController — `dip [<thing>] [inside|outside] [in <bath>]` (alias
 * `melt`). ⭐ Dumb by construction (ceramics D14): the BATH plans the dip
 * (`DipPlanner.dipPlanFor`) and this controller engages the plan it is
 * handed. It never names a pot, a candle or a glaze.
 *
 * Promoted from `trade-chandlery` (the `dry` and `knead` precedent): a wick
 * into hot fat and a crock into a glaze slip are one act — put a thing in a
 * bath and draw it out with the bath on it — and a second trade's bath is a
 * second implementation of the protocol, not a second verb.
 *
 * ## The order of asking
 *
 * Every bound bath is a candidate (the default binds every reachable bulk
 * vessel). Each one that implements the protocol is asked in turn, and the
 * first plan or refusal wins: a chandler's pot plans a candle, a tub of
 * glaze or slip (`CompoundingMixin`) lays a WET coat on the target's named
 * faces. When none answers, the refusal says why in words — this
 * controller plans nothing.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Bulkable } from '../../../../lib/bulk/Bulkable';
import type { FaceName } from '../../../../lib/material/Faced';
import type {
  DipPlan,
  DipPlanner,
  DipRefusal,
  DipRequest,
} from '../../../../lib/craft/DipPlanner';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';
const FACE_WORDS: readonly FaceName[] = ['inside', 'outside'];

interface DipModel extends CommandModel {
  target?: MqlOneResult;
  face?: string;
  bath?: MqlManyResult;
  side?: string;
}

/** Does this bath plan a dip? Duck-probed — a protocol is not a mixin. */
function isDipPlanner(s: Stuff): s is Stuff & DipPlanner {
  return typeof (s as unknown as Partial<DipPlanner>).dipPlanFor === 'function';
}


export default class DipController extends ManualBuildController<DipModel> {
  async execute(model: DipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (model.target && target === null) {
      this.declineStep(
        context,
        Mml.compose`You don't see any '${model.target.raw}' here.`,
        'no-target',
      );
      return;
    }

    const faceWord = (model.face ?? model.side ?? '').trim().toLowerCase();
    let faces: FaceName[] | null = null;
    if (faceWord !== '') {
      if (!FACE_WORDS.includes(faceWord as FaceName)) {
        this.declineStep(
          context,
          Mml.compose`Dip which face of it? Say inside or outside.`,
          'bad-face',
        );
        return;
      }
      faces = [faceWord as FaceName];
    }

    const baths = (model.bath?.stuff ?? []).filter(
      (b: Stuff) => target === null || b.stuffId !== target.stuffId,
    );
    const req: DipRequest = {
      actor: giver,
      target,
      faces,
      raw: model.target?.raw ?? null,
    };

    let answer: DipPlan | DipRefusal | null = null;
    for (const bath of baths) {
      if (!isDipPlanner(bath)) continue;
      answer = await bath.dipPlanFor(target, req);
      if (answer !== null) break;
    }
    if (answer === null) answer = this.noBathAnswered(target, baths);

    if (!answer.ok) {
      this.declineStep(context, answer.line, answer.reason);
      return;
    }
    const plan = answer;
    // ⚠ A zero-length plan runs NOW, inside the command frame: a bath whose
    // act is a craft resolved from the actor's reach (the chandler's
    // candle) needs the acting author the engaged completion would lose.
    if (plan.durationMs <= 0) {
      const out = await plan.onComplete();
      if (out && !out.ok) this.declineStep(context, out.line, out.reason);
      return;
    }
    this.engageStep(context, {
      durationMs: plan.durationMs,
      effortW: plan.effortW,
      beginSelf: plan.beginSelf,
      beginPeers: plan.beginPeers,
      onComplete: () => {
        void Promise.resolve(plan.onComplete()).then((out) => {
          if (out && !out.ok && !giver.isDestroyed()) {
            MessageApi.scene(giver).topic(TOPIC).toSelf(out.line).send();
          }
        });
      },
      onAbort: plan.onAbort,
    });
  }

  /**
   * When no bath answered: the refusal in words, chosen by what is here.
   * ⚠ Words only — every bath plans its own dip (a chandler's pot its
   * candle, a glaze tub its coat: `CompoundingMixin`); this decides nothing.
   */
  private noBathAnswered(target: Stuff | null, baths: readonly Stuff[]): DipRefusal {
    if (target === null) {
      return { ok: false, reason: 'no-target', line: Mml.compose`Dip what? Name the thing you mean to dip.` };
    }
    const wet = baths.find(
      (b) =>
        MixinApi.isBulkable(b) &&
        b.hasInteriorBulk() &&
        b.getBulkAmount('interior').rawValue() > 0 &&
        b.getBulkMaterial('interior') !== null,
    );
    if (wet === undefined) {
      return {
        ok: false,
        reason: 'nothing-to-dip-in',
        line: Mml.compose`There is nothing to dip it in — nothing here holds a bath.`,
      };
    }
    return {
      ok: false,
      reason: 'lays-no-coat',
      line: Mml.compose`That will not lay a coat — what is in ${Mml.thing(wet)} runs off and leaves nothing behind.`,
    };
  }
}
