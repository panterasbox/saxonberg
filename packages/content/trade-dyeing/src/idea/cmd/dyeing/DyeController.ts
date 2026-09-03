/**
 * DyeController — `dye <thing> with <dyestuff>`, and ⚠⚠ **two
 * chemistries, not one.**
 *
 * | | madder / weld | woad |
 * |---|---|---|
 * | chemistry | **mordant** dye | **vat** dye |
 * | needs | a metal ion, applied first | an alkaline reduction vat |
 * | mordant | decides the colour family | **refused** — wasted alum |
 * | the bath | **exhausts** (first dip deep, second paler) | **accumulates** (each dip builds depth) |
 * | the moment | the colour is there when you lift it | the colour arrives in the **AIR** |
 *
 * Shipping all three through one uniform grid would have asserted that
 * every dye works one way, which is false and is the thing a player
 * would carry away.
 *
 * ## ⭐⭐⭐ Linen is hard to dye, and that RETIRES the degenerate-axis worry
 *
 * > **Cellulose does not hold metal ions.** Protein fibres — wool, silk
 * > — take alum directly. Cotton and linen need a **tannin pre-mordant**
 * > to give the metal something to bind to.
 *
 * Which is exactly why linen was historically worn undyed or bleached
 * and **wool was the coloured fabric**. So one fibre does not make
 * `f(dyestuff, mordant, fibre)` degenerate — **it makes dyeing the hard
 * case**, and three good things follow: tannin is not one option of
 * four but the workhorse; wool's arrival becomes a genuine unlock
 * rather than a second row; and the trade is **harder now and easier
 * later**, which is backwards from the usual game shape and far more
 * interesting.
 *
 * ⚠ **Accepted with eyes open: the launch palette is MUTED.** Linen +
 * tannin + alum + madder is a real red, just softer, and a world of
 * heathery, chalky, sun-faded colour is a coherent look rather than a
 * deficient one. **Saturation is a thing wool brings. Do not "fix" the
 * muted palette by fudging cellulose chemistry.**
 *
 * ## ⭐ Competence buys FASTNESS and REPEATABILITY, never a brighter hue
 *
 * The hue comes from the dyestuff. What the craft decides is how many
 * washes it survives — and whether you can match last month's lot,
 * which is visible in whether your bolts stack.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import Dyestuff from '../../Dyestuff';

const TOPIC = 'act.deed';

interface DyeModel extends CommandModel {
  target: MqlOneResult;
  bath?: MqlOneResult;
}

export default class DyeController extends ManualBuildController<DyeModel> {
  static readonly BASE_MS_KEY = 'dyeing.dye.baseMs';
  static readonly BASE_MS = 45 * 60 * 1000;
  /** How much a band of competence adds to the bond, `0..1`. */
  static readonly FASTNESS_PER_BAND_KEY = 'dyeing.fastnessPerBand';
  static readonly FASTNESS_PER_BAND = 0.06;
  /** How much of the bath a first dip takes. The exhaust. */
  static readonly EXHAUST_KEY = 'dyeing.exhaustFraction';
  static readonly EXHAUST = 0.5;

  async execute(model: DyeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target || !MixinApi.isDyed(target)) {
      this.declineStep(context, Mml.compose`Dye what?`, 'no-target');
      return;
    }
    const bath = model.bath?.stuff ?? this.findBath(giver);
    if (!bath || !MixinApi.isBulkable(bath)) {
      this.declineStep(context, Mml.compose`There is no bath here to dip it in.`, 'no-bath');
      return;
    }
    const slot = BulkableApi.slotFor(bath, undefined);
    const material = slot?.getMaterial() ?? null;
    if (!slot || slot.isEmpty() || !material) {
      this.declineStep(context, Mml.compose`${Mml.thing(bath)} is empty.`, 'empty-bath');
      return;
    }

    // ⚠⚠ The chain's second entry point: `dye` takes a dyestuff
    // MATERIAL, never a crop. Madder-the-plant is farming's;
    // madder-the-dyestuff is what this consumes, and where it came
    // from — a bed or a retort — is upstream and none of dyeing's
    // business. ⭐ That is the seam a synthetic walks through.
    const dyestuff = Dyestuff.forMaterial(material.getTemplatePath() ?? '');
    if (!dyestuff) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(bath)} holds nothing that will colour anything.`,
        'not-a-dyestuff',
      );
      return;
    }

    const pending = pendingMordant(target);
    const chemistry = dyestuff.getChemistry();

    // ⚠⚠ A mordant applied to a VAT dye is REFUSED, not silently
    // ignored. The point is that dyeing is two chemistries.
    if (chemistry === 'vat' && pending) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(target)} has been mordanted, and ${Mml.thing(bath)} is a vat. The alum is wasted — a reduction vat wants the cloth bare.`,
        'mordant-on-vat',
      );
      return;
    }

    const shade = dyestuff.shadeFor(chemistry === 'vat' ? '' : (pending ?? ''));
    if (!shade) {
      this.declineStep(
        context,
        Mml.compose`Nothing happens worth speaking of. That mordant and that dye do not answer to each other.`,
        'no-shade',
      );
      return;
    }

    const fibre = fibreOf(target);
    // ⭐⭐⭐ Cellulose does not hold metal ions. A plant fibre needs a
    // TANNIN pre-mordant before a metal one will bind at all — which is
    // why linen was worn undyed and wool was the coloured cloth, and
    // why the launch palette is honestly muted.
    const cellulose = fibre?.hasTag('cellulose') ?? false;
    const tanninFirst = hasTannin(target);
    const bondPenalty =
      chemistry === 'mordant' && cellulose && !tanninFirst && pending !== 'tannin'
        ? 0.5
        : 1;

    const band = await competenceOf(giver);
    const fastness = clamp01(
      shade.fastness * bondPenalty +
        CompetenceBand.rank(band) *
          dial(
            DyeController.FASTNESS_PER_BAND_KEY,
            DyeController.FASTNESS_PER_BAND,
          ),
    );
    // ⭐ The bath EXHAUSTS for a mordant dye (first dip deep, second
    // paler) and ACCUMULATES for a vat dye (each dip builds depth).
    // Two chemistries, two opposite bath behaviours, one verb.
    const available = slot.available();
    const capacity = slot.getCapacity()?.rawValue() ?? available;
    const fullness = capacity > 0 ? Math.min(1, available / capacity) : 1;
    const strength =
      chemistry === 'vat'
        ? clamp01(0.35 + priorDepth(target, dyestuff.getKey()))
        : clamp01(fullness * dial(DyeController.EXHAUST_KEY, DyeController.EXHAUST) * 1.6);

    this.engageStep(context, {
      durationMs: dial(DyeController.BASE_MS_KEY, DyeController.BASE_MS),
      beginSelf: Mml.compose`You work ${Mml.thing(target)} down into ${Mml.thing(bath)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} works something down into a dye bath.`,
      onComplete: () => {
        if (!MixinApi.isDyed(target)) return;
        // The mordant entry is CONSUMED into the application it decided.
        if (pending) dropPendingMordant(target);
        target.applyDye({
          dyestuff: dyestuff.getMaterialPath(),
          mordant: chemistry === 'vat' ? '' : (pending ?? ''),
          strength,
        });
        target.setFastness(fastness);
        // The mordant bath exhausts; a vat is fed, not spent.
        if (chemistry === 'mordant') {
          try {
            slot.debit(available * dial(DyeController.EXHAUST_KEY, DyeController.EXHAUST));
          } catch {
            /* the bath went away mid-step */
          }
        }
        if (giver.isDestroyed()) return;
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            chemistry === 'vat'
              ? Mml.compose`You draw ${Mml.thing(target)} out yellow-green. As the air takes it, the colour walks up through jade to a deep, even blue.`
              : bondPenalty < 1
                ? Mml.compose`${Mml.thing(target)} comes up ${shade.colour}, and thinner than it ought to be. Cellulose will not hold a metal on its own — it wanted tannin first.`
                : Mml.compose`${Mml.thing(target)} comes up ${shade.colour}.`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} lifts something dripping out of a bath.`)
          .send();
      },
    });
  }

  /** A reachable bath — held first, then the room. */
  private findBath(giver: Stuff): Stuff | null {
    const candidates: Stuff[] = [];
    if (MixinApi.isContainer(giver)) candidates.push(...giver.getContents());
    if (MixinApi.isContainable(giver)) {
      const loc = giver.getContainer();
      if (loc && MixinApi.isContainer(loc)) candidates.push(...loc.getContents());
    }
    for (const c of candidates) {
      if (!MixinApi.isBulkable(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      const mat = slot?.getMaterial();
      if (mat && Dyestuff.forMaterial(mat.getTemplatePath() ?? '')) return c;
    }
    return null;
  }
}

/** The mordant key waiting on the cloth (a zero-strength entry), or null. */
function pendingMordant(target: Stuff): string | null {
  if (!MixinApi.isDyed(target)) return null;
  const stack = target.getDyeStack();
  const last = stack[stack.length - 1];
  return last && last.strength === 0 ? last.mordant : null;
}

/** Has this cloth ever had a tannin bath? The cellulose enabler. */
function hasTannin(target: Stuff): boolean {
  if (!MixinApi.isDyed(target)) return false;
  return target.getDyeStack().some((a) => a.mordant === 'tannin');
}

/** Drop the trailing zero-strength mordant entry — it is spent. */
function dropPendingMordant(target: Stuff & { getDyeStack(): readonly { dyestuff: string; mordant: string; strength: number }[]; setDyeStack(v: { dyestuff: string; mordant: string; strength: number }[]): void }): void {
  const stack = [...target.getDyeStack()];
  stack.pop();
  target.setDyeStack(stack.map((a) => ({ ...a })));
}

/** ⭐ A vat dye ACCUMULATES: each dip builds on the last. */
function priorDepth(target: Stuff, _key: string): number {
  if (!MixinApi.isDyed(target)) return 0;
  let depth = 0;
  for (const a of target.getDyeStack()) depth = Math.max(depth, a.strength);
  return depth * 0.5;
}

/** The fibre a thing is made of, for the cellulose question. */
function fibreOf(target: Stuff): Material | null {
  return MixinApi.isTangible(target) ? target.getMaterial() : null;
}

async function competenceOf(giver: Stuff): Promise<CompetenceBandName> {
  const asActor = giver as unknown as {
    competenceBandFor?(key: string): Promise<CompetenceBandName>;
  };
  if (typeof asActor.competenceBandFor !== 'function') return 'untrained';
  try {
    return await asActor.competenceBandFor('dyeing');
  } catch {
    return 'untrained';
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
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
