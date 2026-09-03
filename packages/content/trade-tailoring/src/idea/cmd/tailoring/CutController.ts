/**
 * CutController — `cut`, and ⭐ **the decision is optimisation under
 * waste.**
 *
 * > **A pattern is a 2D solution to a 3D problem, and cloth is
 * > expensive.**
 *
 * That is the lesson the trade exists to teach, and it is the whole of
 * `cut`'s choice:
 *
 * | | cloth | later |
 * |---|---|---|
 * | `--tight` | least | **no seam allowance** — it can never be let out |
 * | ordinary | middling | a little room |
 * | `--generous` | most | room to let out twice |
 *
 * ⭐ **A bolt is capital, not a consumable** (a 12-unit bolt is ~20
 * unskilled days), which is exactly what makes that bite: cutting
 * generous on a coat costs real money against a future you cannot see.
 *
 * ⭐⭐ **And the stamp is where fit comes from.** `cut` takes a SUBJECT
 * — yourself, a customer, or nobody at all — and stamps the
 * measurements onto the pieces. Cut for nobody and it is *stock*, which
 * fits the plan average and therefore fits an unusual body badly. That
 * is the tailor's entire economic reason to exist.
 *
 * ⭐ **Offcuts are the byproduct**, because byproducts are what make a
 * trade economic: patchwork, quilting stock, and rags.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';

const TOPIC = 'act.deed';
const PIECES_ROW = '/trade/tailoring/thing/pieces';
const OFFCUT_ROW = '/trade/tailoring/thing/offcuts';

interface CutModel extends CommandModel {
  cloth: MqlOneResult;
  for?: MqlOneResult;
  tight?: boolean;
  generous?: boolean;
}

export default class CutController extends ManualBuildController<CutModel> {
  static readonly BASE_MS_KEY = 'tailoring.cut.baseMs';
  static readonly BASE_MS = 40 * 60 * 1000;

  execute(model: CutModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const cloth = model.cloth?.stuff ?? null;
    if (!cloth || !MixinApi.isGlobbable(cloth)) {
      this.declineStep(context, Mml.compose`Cut what?`, 'no-cloth');
      return;
    }
    if (!MixinApi.isConstructed(cloth) || !cloth.getConstruction()?.isCovering()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(cloth)} is not cloth.`,
        'not-cloth',
      );
      return;
    }

    // ⚠ Tight cuts LESS cloth and leaves no allowance; generous costs
    // more and buys a future alteration. The middle is the default.
    const units = model.tight ? 2 : model.generous ? 4 : 3;
    const allowance = model.tight ? 0 : model.generous ? 2 : 1;
    if (cloth.getQuantity() < units) {
      this.declineStep(
        context,
        Mml.compose`There is not enough cloth there — that pattern wants ${String(units)}.`,
        'too-little-cloth',
      );
      return;
    }

    // ⭐ The SUBJECT. Nobody = stock, and stock is an honest answer
    // rather than a fallback: off-the-rack clothing fits most people
    // imperfectly for exactly this reason.
    const subject = model.for?.stuff ?? null;
    const measured = subject ? measurementsOf(subject) : null;

    const instrument = this.findCapability(giver, 'cutting');
    const durationMs = this.paceMs(
      dial(CutController.BASE_MS_KEY, CutController.BASE_MS),
      instrument as Stuff | null,
      ['cutting'],
    );

    this.engageStep(context, {
      durationMs,
      beginSelf: measured
        ? Mml.compose`You chalk the pattern out on ${Mml.thing(cloth)} to ${Mml.actor(subject!)}'s measure.`
        : Mml.compose`You chalk a stock pattern out on ${Mml.thing(cloth)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} chalks a pattern out on a length of cloth.`,
      onComplete: () => {
        void finish(context, cloth, units, allowance, measured);
      },
    });
  }
}

async function finish(
  context: CommandContext,
  cloth: Stuff & { getQuantity(): number; setQuantity(n: number): void },
  units: number,
  allowance: number,
  measured: { bodyPlan: string; stature: number; girth: number } | null,
): Promise<void> {
  const giver = context.commandGiver;
  // ⚠⚠ A module function — the controller is destructed by now.
  const watching = !giver.isDestroyed();
  // `split` is the shipped Globbable operation: `cut` takes units off a
  // bolt, and the remainder stays a bolt.
  const left = Math.max(0, cloth.getQuantity() - units);
  if (left === 0) StuffApi.destruct(cloth);
  else cloth.setQuantity(left);

  try {
    const pieces = await StuffApi.clone<Stuff>(PIECES_ROW);
    if (MixinApi.isGraded(pieces) && MixinApi.isGraded(cloth)) {
      pieces.setGrade(Grade.of(cloth.getGradeBand()));
    }
    if (MixinApi.isConstructed(pieces) && MixinApi.isConstructed(cloth)) {
      const form = cloth.getConstructionForm();
      if (form) pieces.setConstructionForm(form);
    }
    // ⭐ The material travels: a coat cut from fine linen IS fine linen,
    // and every downstream read (clo, resist, dye) asks the material.
    if (MixinApi.isTangible(pieces) && MixinApi.isTangible(cloth)) {
      const mat = cloth.getMaterial();
      if (mat) pieces.setMaterial(mat);
    }
    // ⭐⭐ The stamp — the whole reason `cut` takes a subject.
    if (MixinApi.isWearable(pieces) && measured) {
      pieces.setCutTo(measured.bodyPlan, measured.stature, measured.girth);
    }
    const asPieces = pieces as unknown as { setSeamAllowance?(n: number): void };
    asPieces.setSeamAllowance?.(allowance);
    if (MixinApi.isContainable(pieces) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(
        pieces as Stuff & Containable,
        giver as Stuff & Container,
      );
    }

    // ⭐ Offcuts. A trade whose off-cuts vanish has stopped being an
    // economy — and a generous cut leaves more of them, which is part
    // of what it costs.
    const offcutUnits = Math.max(1, allowance + 1);
    const offcuts = await StuffApi.clone<Stuff>(OFFCUT_ROW);
    if (MixinApi.isGlobbable(offcuts)) offcuts.setQuantity(offcutUnits);
    if (MixinApi.isContainable(offcuts) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(
        offcuts as Stuff & Containable,
        giver as Stuff & Container,
      );
    }

    if (!watching) return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        allowance === 0
          ? Mml.compose`Cut close. Almost nothing on the floor, and nothing at the seams either — this will never be let out.`
          : Mml.compose`Cut with ${String(allowance)} of allowance at the seams, and ${String(offcutUnits)} of offcuts on the floor.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} cuts out a pattern.`)
      .send();
  } catch (err) {
    console.warn('CutController: could not mint the pieces:', err);
  }
}

/**
 * The two derived measurements of a body — the same pair the fit model
 * uses, read here rather than restated.
 */
export function measurementsOf(
  subject: Stuff,
): { bodyPlan: string; stature: number; girth: number } | null {
  if (!MixinApi.isOrganism(subject)) return null;
  const species = subject.getSpecies();
  const plan = species?.getBodyPlan();
  if (!species || !plan) return null;
  const stature = species.getStature();
  const massKg = MixinApi.isTangible(subject)
    ? subject.getMass().rawValue()
    : 0;
  if (!(stature > 0) || !(massKg > 0)) return null;
  return {
    bodyPlan: plan.getTemplatePath() ?? '',
    stature,
    girth: Math.sqrt(massKg / stature),
  };
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
