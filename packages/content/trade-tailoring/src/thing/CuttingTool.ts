/**
 * CuttingTool — what `cut` is done WITH.
 *
 * ⭐⭐ **The instrument affords the verb, never the furniture.** Every
 * other trade in this build already worked this way — `spin` comes from
 * `SpinningTool` (a drop spindle *or* a wheel), `weave` from `Loom` (a
 * hand loom *or* a broad loom) — and tailoring was the one place a verb
 * hung off a room fixture. That made `cut` impossible anywhere but a
 * shop, which is wrong: shears and a length of cloth are enough to cut
 * a shirt out in a field, and the reason not to is that you waste cloth
 * doing it.
 *
 * ⭐ So both rungs are rows over THIS class and nothing else changes:
 * `shears` (portable, rate 1, coarse) and `cutting-table` (fixed,
 * rate 2, fine). A tool variant is pure seed data — the drop-spindle
 * row says so in as many words.
 *
 * ⚠ The verb affordance is a STATIC ON THE CLASS; a row's
 * `commandContributions:` is dead silently.
 *
 * ⭐⭐ **And it PLANS the cut** (storage-and-ice D16): `cut` is one kernel
 * verb over a cut-plan protocol, and the bolt is the weaver's — the
 * pattern is the tailor's. So the shears are the `CutPlanner` for cloth:
 * the tight/ordinary/generous choice, the spoilage a coarse instrument
 * costs, the `--for` stamp and the offcuts all live here, moved whole from
 * tailoring's retired `cut` controller.
 */


import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type {
  CutPlan,
  CutPlanner,
  CutRefusal,
  CutRequest,
} from '@saxonberg/server/mud/lib/craft/Cuttable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';

/** ⭐ The kernel `cut` (storage-and-ice D16) — afforded by the instrument. */
const CUTTING = ['platform/cmd/crafting/cut.yaml'];

const TOPIC = 'act.deed';
const PIECES_ROW = '/trade/tailoring/thing/pieces';
const OFFCUT_ROW = '/trade/tailoring/thing/offcuts';
const BASE_MS_KEY = 'tailoring.cut.baseMs';
const BASE_MS = 40 * 60 * 1000;

/** The two derived measurements of a body the fit model uses. */
export interface Measurements {
  bodyPlan: string;
  stature: number;
  girth: number;
}

export default class CuttingTool extends Tool implements CutPlanner {
  static commandContributions: CommandContributions = {
    environment: CUTTING,
    peers: CUTTING,
  };

  /**
   * ⭐ **The decision is optimisation under waste.** A pattern is a 2D
   * solution to a 3D problem, and cloth is expensive: `--tight` uses the
   * least cloth and leaves NO seam allowance; `--generous` uses more and
   * buys a future alteration. A coarse instrument (no `control: fine`)
   * costs an extra unit of cloth — rung zero is possible and bad. `--for`
   * stamps a body's measurements; nobody is stock. `null` for anything
   * that is not cloth: these shears have nothing to say about it.
   */
  public async cutPlanFor(target: Stuff, req: CutRequest): Promise<CutPlan | CutRefusal | null> {
    if (!MixinApi.isStackable(target)) return null;
    if (!MixinApi.isConstructed(target) || !target.getConstruction()?.isCovering()) return null;
    const cloth = target;
    const refuse = (reason: string, line: ReturnType<typeof Mml.compose>): CutRefusal => ({
      ok: false,
      reason,
      line,
    });
    const tight = req.options.tight === true;
    const generous = req.options.generous === true;
    const pattern = tight ? 2 : generous ? 4 : 3;
    const allowance = tight ? 0 : generous ? 2 : 1;

    const instrument = bestCutting(req.tools) ?? (this as unknown as Stuff & Tool);
    const fine = instrument.capabilityControl('cutting') === 'fine';
    const spoilage = fine ? 0 : 1;
    const units = pattern + spoilage;
    if (cloth.getQuantity() < units) {
      return refuse(
        'too-little-cloth',
        spoilage > 0
          ? Mml.compose`There is not enough cloth there — that pattern wants ${String(pattern)}, and cutting it without a proper bench will cost you ${String(units)}.`
          : Mml.compose`There is not enough cloth there — that pattern wants ${String(units)}.`,
      );
    }
    const subject = req.options.for ?? null;
    const measured = subject ? measurementsOf(subject) : null;
    const rate = instrument.hasCapability('cutting') ? instrument.capabilityRate('cutting') : 1;
    const durationMs = Math.round(dial(BASE_MS_KEY, BASE_MS) / (rate || 1));
    const actor = req.actor;
    return {
      ok: true,
      durationMs,
      effortW: 250,
      beginSelf: measured
        ? spoilage > 0
          ? Mml.compose`You lay ${Mml.thing(cloth)} out as flat as you can manage and mark it to ${Mml.actor(subject!)}'s measure. Without a bench under it, some of this is going to be waste.`
          : Mml.compose`You chalk the pattern out on ${Mml.thing(cloth)} to ${Mml.actor(subject!)}'s measure.`
        : spoilage > 0
          ? Mml.compose`You lay ${Mml.thing(cloth)} out as flat as you can manage and mark a stock pattern on it. Without a bench under it, some of this is going to be waste.`
          : Mml.compose`You chalk a stock pattern out on ${Mml.thing(cloth)}.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} chalks a pattern out on a length of cloth.`,
      onComplete: () => {
        void finishCut(actor, cloth, units, allowance, measured);
      },
    };
  }
}

/**
 * The two derived measurements of a body — the same pair the fit model
 * uses, read here rather than restated. Shared by `alter` and the figure
 * reading (it moved here from tailoring's retired `cut` controller).
 */
export function measurementsOf(subject: Stuff): Measurements | null {
  if (!MixinApi.isOrganism(subject)) return null;
  const species = subject.getSpecies();
  const plan = species?.getBodyPlan();
  if (!species || !plan) return null;
  const stature = species.getStature();
  const massKg = MixinApi.isTangible(subject) ? subject.getMass().rawValue() : 0;
  if (!(stature > 0) || !(massKg > 0)) return null;
  return {
    bodyPlan: plan.getTemplatePath() ?? '',
    stature,
    girth: Math.sqrt(massKg / stature),
  };
}

/** The best-rated cutting instrument among the tools the binder bound. */
function bestCutting(tools: readonly Stuff[]): (Stuff & Tool) | null {
  let best: (Stuff & Tool) | null = null;
  let bestRate = -Infinity;
  for (const t of tools) {
    if (!MixinApi.isTool(t) || !t.hasCapability('cutting')) continue;
    const rate = t.capabilityRate('cutting');
    if (rate > bestRate) {
      best = t as unknown as Stuff & Tool;
      bestRate = rate;
    }
  }
  return best;
}

/** ⚠⚠ A module function — the plan's closure outlives the controller. */
async function finishCut(
  giver: Stuff,
  cloth: Stuff & { getQuantity(): number; setQuantity(n: number): void },
  units: number,
  allowance: number,
  measured: Measurements | null,
): Promise<void> {
  const watching = !giver.isDestroyed();
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
      if (form) await pieces.setConstructionForm(form);
    }
    // ⭐ The material travels: a coat cut from fine linen IS fine linen.
    if (MixinApi.isTangible(pieces) && MixinApi.isTangible(cloth)) {
      const mat = cloth.getMaterial();
      if (mat) pieces.setMaterial(mat);
    }
    // ⭐⭐ The stamp — the whole reason `cut` takes a subject.
    if (MixinApi.isWearable(pieces) && measured) {
      pieces.setCutTo(measured.bodyPlan, measured.stature, measured.girth);
    }
    if (MixinApi.isWearable(pieces)) pieces.setSeamAllowance(allowance);
    if (MixinApi.isContainable(pieces) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(pieces as Stuff & Containable, giver as Stuff & Container);
    }
    // ⭐ Offcuts — and a generous cut leaves more of them.
    const offcutUnits = Math.max(1, allowance + 1);
    const offcuts = await StuffApi.clone<Stuff>(OFFCUT_ROW);
    if (MixinApi.isStackable(offcuts)) offcuts.setQuantity(offcutUnits);
    if (MixinApi.isContainable(offcuts) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(offcuts as Stuff & Containable, giver as Stuff & Container);
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
    console.warn('CuttingTool: could not mint the pieces:', err);
  }
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
