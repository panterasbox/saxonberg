/**
 * DipController — `dip [<thing>] [inside|outside] [in <bath>]` (alias
 * `melt`). ⭐ Dumb by construction (ceramics D14): the BATH plans the dip
 * (`DipBathMixin.dipPlanFor`) and this controller engages the plan it is
 * handed. It decides nothing about a pot, a candle or a glaze — it only
 * WORDS what the bath answered (facts and a reason, controllers-are-io D4).
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
import type { DipBegin, DipDone, DipPlan, DipRefusal, DipRequest } from '../../../../lib/craft/DipBath';
import { CraftingDecline } from '../../../../lib/craft/CraftingDecline';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const FACE_WORDS: readonly FaceName[] = ['inside', 'outside'];

type Composed = ReturnType<typeof Mml.compose>;

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

    let answer: DipPlan | DipRefusal | null = null;
    for (const bath of baths) {
      if (!MixinApi.isDipBath(bath)) continue;
      answer = await bath.dipPlanFor(req);
      if (answer !== null) break;
    }
    if (answer === null) {
      const none = this.noBathAnswered(target, baths);
      this.declineStep(context, none.line, none.reason);
      return;
    }

    if (!answer.ok) {
      this.declineStep(context, DipController.refusalWords(answer), answer.reason);
      return;
    }
    // ⚠ A zero-length plan runs NOW, inside the command frame (the
    // chandler's candle) — `engagePlan` keeps that rule for every act.
    await this.engagePlan(context, answer, {
      beginSelf: (f) => DipController.beginWords(f),
      beginPeers: (f) =>
        f.kind === 'coat'
          ? Mml.compose`${Mml.actor(giver)} dips ${Mml.thing(f.target)} into ${Mml.thing(f.bath)}.`
          : f.kind === 'sheet'
            ? Mml.compose`${Mml.actor(giver)} dips a mould into ${Mml.thing(f.bath)} and lifts it, streaming.`
            : null,
      onRefused: (r) => DipController.refusalWords(r),
      onDone: (f) => DipController.doneWords(f, giver),
    });
  }

  /** ⭐ The words for a refused dip (D4) — every reason, exhaustively. */
  private static refusalWords(r: DipRefusal): Composed {
    switch (r.reason) {
      case 'not-faced':
        return Mml.compose`${Mml.thing(r.facts.target)} has nothing a coat could lie on.`;
      case 'no-such-face':
        return Mml.compose`${Mml.thing(r.facts.target)} has no inside to coat.`;
      case 'bath-too-low':
        return Mml.compose`There is not enough left in ${Mml.thing(r.facts.bath)} to coat ${Mml.thing(r.facts.target)}.`;
      case 'bath-ran-dry':
        return Mml.compose`The bath has run dry before the coat could take.`;
      case 'craft-declined':
        return Mml.compose`${CraftingDecline.messageFor(r.facts.outcome)}`;
      case 'not-a-pipe':
        return Mml.compose`You gather hot glass on a blowpipe, not on ${Mml.thing(r.facts.target)}.`;
      case 'no-pipe':
        return Mml.compose`You need an empty blowpipe in hand — the one you have is already carrying a gather.`;
      case 'melt-cold':
        return Mml.compose`${Mml.thing(r.facts.bath)} has stiffened — there is no gathering from it cold. Work the bellows and fire it again.`;
      case 'cannot-engage':
        return Mml.compose`You cannot give this your attention just now.`;
      case 'not-a-mould':
        return Mml.compose`You lift sheets out of ${Mml.thing(r.facts.bath)} on a paper mould, not ${Mml.thing(r.facts.mould)}.`;
      case 'mould-full':
        return Mml.compose`There is a wet sheet on ${Mml.thing(r.facts.mould)} already — couch it first.`;
      case 'no-pulp':
        return Mml.compose`There is not enough stuff in ${Mml.thing(r.facts.bath)} to lift a sheet. The stamper makes it.`;
      case 'vat-ran-short':
        return Mml.compose`The vat ran short before the sheet formed.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** The words a dip begins on. */
  private static beginWords(f: DipBegin): Composed {
    switch (f.kind) {
      case 'coat':
        return Mml.compose`You lower ${Mml.thing(f.target)} into ${Mml.thing(f.bath)} and draw it out slowly, letting it drain.`;
      case 'candle':
        return Mml.compose`You run a wick down into the pot.`;
      case 'gather':
        return Mml.compose`You lower the pipe into ${Mml.thing(f.bath)}.`;
      case 'sheet':
        return Mml.compose`You dip ${Mml.thing(f.mould)} into ${Mml.thing(f.bath)} and lift it level, shaking the wire so the fibres lie every way at once.`;
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** The words a dip lands on. */
  private static doneWords(f: DipDone, giver: Stuff): { self?: Composed; peers?: Composed } | null {
    switch (f.kind) {
      case 'coated': {
        const where =
          f.faces.length === 2 ? 'inside and out' : f.faces[0] === 'inside' ? 'inside' : 'outside';
        const sets = f.setsByHeat ? 'It will set when it is fired.' : 'Let it set.';
        return {
          self: Mml.compose`${Mml.thing(f.target)} comes out ${where} under a wet skin of ${f.materialName}. ${sets}`,
        };
      }
      case 'candle':
        return f.melted
          ? {
              self: Mml.compose`It softens, slumps and goes clear, and you have a pot of it. You run a wick down into the pot and up again, and again, until ${Mml.thing(f.candle)} has built up on it.`,
              peers: Mml.compose`${Mml.actor(giver)} melts something down in a pot. ${Mml.actor(giver)} dips a candle.`,
            }
          : {
              self: Mml.compose`You run a wick down into the pot and up again, and again, until ${Mml.thing(f.candle)} has built up on it.`,
              peers: Mml.compose`${Mml.actor(giver)} dips a candle.`,
            };
      case 'gather':
        return {
          self: Mml.compose`You lower the pipe into ${Mml.thing(f.bath)} and turn up a glowing gather. Work it while it is hot.`,
          peers: Mml.compose`${Mml.actor(giver)} gathers a blob of hot glass on a blowpipe.`,
        };
      case 'sheet':
      case 'gone':
        return null;
      default: {
        const never: never = f;
        return never;
      }
    }
  }
  /**
   * When no bath answered: the refusal in words, chosen by what is here.
   * ⚠ Words only — every bath plans its own dip (a chandler's pot its
   * candle, a glaze tub its coat: `CompoundingMixin`); this decides nothing.
   */
  private noBathAnswered(
    target: Stuff | null,
    baths: readonly Stuff[],
  ): { reason: string; line: Composed } {
    if (target === null) {
      return {
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
        reason: 'nothing-to-dip-in',
        line: Mml.compose`There is nothing to dip it in — nothing here holds a bath.`,
      };
    }
    return {
      reason: 'lays-no-coat',
      line: Mml.compose`That will not lay a coat — what is in ${Mml.thing(wet)} runs off and leaves nothing behind.`,
    };
  }
}
