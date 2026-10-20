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
 * first plan or refusal wins. Only when none answers does the kernel's
 * default run: the first bath whose held material `laysCoat` lays a WET coat
 * of it on the target's named faces (the coat fuses when the good is fired —
 * `FacedMixin.fuseCoats`).
 *
 * ⭐ The coat is a skin of `faces.dipThicknessM`, and the bath gives up what
 * the skin holds: thickness × the good's surface area, the area taken as a
 * cube's of the good's volume (`6 · V^⅔`, V from mass ÷ density). Plain on
 * purpose — the number that matters is that a bucket of slip glazes a
 * shelf of crocks and not one.
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
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Quantity } from '../../../../lib/quantity';

const TOPIC = 'act.deed';
/** Dipping a pot and drawing it out, letting it drain — a game-minute. */
const DIP_MS = 60_000;
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

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
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
    if (answer === null) answer = this.coatPlan(giver, target, faces, baths);

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
   * ⭐ The kernel's default: a bath whose held material lays a coat lays a
   * WET coat of it on the target's faces. Refuses in words otherwise.
   */
  private coatPlan(
    giver: Stuff,
    target: Stuff | null,
    faces: FaceName[] | null,
    baths: readonly Stuff[],
  ): DipPlan | DipRefusal {
    if (target === null) {
      return {
        ok: false,
        reason: 'no-target',
        line: Mml.compose`Dip what? Name the thing you mean to dip.`,
      };
    }
    if (!MixinApi.isFaced(target)) {
      return {
        ok: false,
        reason: 'not-faced',
        line: Mml.compose`${Mml.thing(target)} has nothing a coat could lie on.`,
      };
    }
    const wet = baths.filter(
      (b) =>
        MixinApi.isBulkable(b) &&
        b.hasInteriorBulk() &&
        b.getBulkAmount('interior').rawValue() > 0 &&
        b.getBulkMaterial('interior') !== null,
    ) as (Stuff & Bulkable)[];
    if (wet.length === 0) {
      return {
        ok: false,
        reason: 'nothing-to-dip-in',
        line: Mml.compose`There is nothing to dip it in — nothing here holds a bath.`,
      };
    }
    const bath = wet.find((b) => b.getBulkMaterial('interior')?.getLaysCoat() === true);
    if (bath === undefined) {
      const first = wet[0]!;
      return {
        ok: false,
        reason: 'lays-no-coat',
        line: Mml.compose`That will not lay a coat — what is in ${Mml.thing(first)} runs off and leaves nothing behind.`,
      };
    }
    const material = bath.getBulkMaterial('interior')!;
    const path = material.getTemplatePath() ?? '';
    const onto: FaceName[] = (faces ?? target.faces()).filter((f) =>
      target.faces().includes(f),
    );
    if (onto.length === 0) {
      return {
        ok: false,
        reason: 'no-such-face',
        line: Mml.compose`${Mml.thing(target)} has no inside to coat.`,
      };
    }
    const thicknessM = dial(AppSettingKeys.facesDipThicknessM, 0.0003);
    const litres = this.skinLitres(target, thicknessM) * onto.length;
    const where = onto.length === 2 ? 'inside and out' : onto[0] === 'inside' ? 'inside' : 'outside';
    return {
      ok: true,
      durationMs: DIP_MS,
      effortW: 80,
      beginSelf: Mml.compose`You lower ${Mml.thing(target)} into ${Mml.thing(bath)} and draw it out slowly, letting it drain.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} dips ${Mml.thing(target)} into ${Mml.thing(bath)}.`,
      onComplete: () => {
        if (target.isDestroyed() || bath.isDestroyed()) return;
        const have = bath.getBulkAmount('interior').rawValue();
        if (!(have > 0)) {
          return {
            ok: false,
            reason: 'nothing-to-dip-in',
            line: Mml.compose`The bath has run dry before the coat could take.`,
          };
        }
        bath.setBulkAmount('interior', Quantity.of(Math.max(0, have - litres), 'L'));
        for (const face of onto) {
          const soil = MixinApi.isSoilable(target)
            ? Math.max(target.soilAt(face), target.soilAt(''))
            : 0;
          target.layCoat(face, path, thicknessM, soil);
        }
        if (!giver.isDestroyed()) {
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              Mml.compose`${Mml.thing(target)} comes out ${where} under a wet skin of ${material.getName()}. It will fuse when it is fired.`,
            )
            .send();
        }
        return undefined;
      },
    };
  }

  /** Litres a skin of `thicknessM` over one face of the good takes. */
  private skinLitres(target: Stuff, thicknessM: number): number {
    if (!MixinApi.isTangible(target)) return 0;
    const kg = target.getMass().rawValue();
    const density = target.getMaterial()?.getDensity().rawValue() || 2000;
    const volumeM3 = kg / density;
    const areaM2 = 6 * Math.pow(Math.max(0, volumeM3), 2 / 3);
    return areaM2 * thicknessM * 1000;
  }
}
