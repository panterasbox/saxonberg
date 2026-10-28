/**
 * DipController — `dip [<thing>] [inside|outside] [in <bath>]` (alias
 * `melt`). ⭐ Dumb by construction (ceramics D14): the BATH plans the dip
 * (`DipBathMixin.dipPlanFor`) and this controller engages the plan it is
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
import type { DipRequest } from '../../../../lib/craft/DipBath';
import type { ActPlan, ActRefusal } from '../../../../lib/craft/ActPlan';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const FACE_WORDS: readonly FaceName[] = ['inside', 'outside'];

interface DipModel extends CommandModel {
  target?: MqlOneResult;
  face?: string;
  bath?: MqlManyResult;
  side?: string;
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

    let answer: ActPlan | ActRefusal | null = null;
    for (const bath of baths) {
      if (!MixinApi.isDipBath(bath)) continue;
      answer = await bath.dipPlanFor(req);
      if (answer !== null) break;
    }
    if (answer === null) answer = this.noBathAnswered(target, baths);

    if (!answer.ok) {
      this.declineStep(context, answer.line, answer.reason);
      return;
    }
    // ⚠ A zero-length plan runs NOW, inside the command frame (the
    // chandler's candle) — `engagePlan` keeps that rule for every act.
    await this.engagePlan(context, answer);
  }

  /**
   * When no bath answered: the refusal in words, chosen by what is here.
   * ⚠ Words only — every bath plans its own dip (a chandler's pot its
   * candle, a glaze tub its coat: `CompoundingMixin`); this decides nothing.
   */
  private noBathAnswered(target: Stuff | null, baths: readonly Stuff[]): ActRefusal {
    if (target === null) {
      return {
        ok: false,
        reason: 'no-target',
        line: Mml.compose`Dip what, in what? There is no bath here — a pot of fat, a tub of glaze, a pot of molten glass.`,
      };
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
