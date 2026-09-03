/**
 * ScutchController — `scutch`, and ⭐ the decision is **purity against
 * staple length**.
 *
 * Break, scutch and hackle are three motions with one decision, so they
 * fold into one verb. What you are doing is beating the woody boon out
 * of retted straw; what you are CHOOSING is how hard.
 *
 * | | line | tow | grade |
 * |---|---|---|---|
 * | ordinary | most of it | the rest | as retted |
 * | `--hard` | more | less | **one band lower** |
 *
 * ⚠⚠ Working it harder gets more fibre out and BREAKS some of what it
 * gets. That is not a balance knob: long unbroken fibre is the whole
 * value of flax, and the trade-off is why "scutch" and "hackle" were
 * different jobs done by different people.
 *
 * ⭐ **Byproducts, because byproducts are what make a trade economic.**
 * Tow is short fibre — coarse yarn, rope, stuffing. Shive is the woody
 * boon — fuel and litter. Neither is waste, and a chain where the
 * off-cuts vanish is a chain that has quietly stopped being an economy.
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
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { Grade, GRADE_BANDS } from '@saxonberg/server/mud/lib/craft/Grade';

const TOPIC = 'act.deed';

const LINE_ROW = '/trade/textiles/thing/line';
const TOW_ROW = '/trade/textiles/thing/tow';
const SHIVE_ROW = '/trade/textiles/thing/shive';

interface ScutchModel extends CommandModel {
  source: MqlOneResult;
  hard?: boolean;
}

export default class ScutchController extends ManualBuildController<ScutchModel> {
  /**
   * ⭐ Durations are DIALS, read the `sharpenDurationMs` way rather
   * than the `HAMMER_MS` way — so the bottleneck is tunable in settings
   * and assertable by a bench without a recompile. The literals here
   * are the seeded fallbacks, not the source of truth.
   */
  static readonly BASE_MS_KEY = 'textiles.scutch.baseMs';
  static readonly BASE_MS = 20 * 60 * 1000;
  /**
   * Litres of retted fibre one act works. ⚠ LITRES: the bulk substrate
   * is volumetric throughout, and the first draft here said kg — which
   * typechecked as a number and would have debited the wrong quantity
   * silently.
   */
  static readonly CHARGE_L_KEY = 'textiles.scutch.chargeLitres';
  static readonly CHARGE_L = 4;

  async execute(model: ScutchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const source = model.source?.stuff ?? null;
    if (!source || !MixinApi.isBulkable(source)) {
      this.declineStep(context, Mml.compose`Scutch what?`, 'no-source');
      return;
    }
    const slot = BulkableApi.slotFor(source, undefined);
    const material = slot?.getMaterial() ?? null;
    if (!slot || slot.isEmpty() || !material) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(source)} is empty.`,
        'nothing-to-work',
      );
      return;
    }

    // ⚠⚠ The chain's ENTRY POINT is the fibre, and the gate says so: a
    // `fibre` material is what scutching works on, whatever produced it.
    // Naming the flax row here would be the one line that stops wool
    // ever plugging in.
    if (!material.hasTag('fibre')) {
      const straw = material.hasTag('retting');
      this.declineStep(
        context,
        straw
          ? Mml.compose`That is still straw. It wants a pit and a fortnight before it wants a knife.`
          : Mml.compose`${Mml.thing(source)} holds nothing you could work into a fibre.`,
        straw ? 'not-retted' : 'not-fibre',
      );
      return;
    }
    // ⚠ The over-ret, and the refusal is the whole failure mode: there
    // is no path from here back into the chain.
    if (material.hasTag('spoiled')) {
      this.declineStep(
        context,
        Mml.compose`It has gone past. Grey, slimy and short — there is nothing in there to save.`,
        'over-retted',
      );
      return;
    }

    const charge = Math.min(
      slot.available(),
      dial(ScutchController.CHARGE_L_KEY, ScutchController.CHARGE_L),
    );
    if (charge <= 0) {
      this.declineStep(context, Mml.compose`There is not enough there to work.`, 'too-little');
      return;
    }

    const hard = model.hard === true;
    const band = bandOf(source);
    // ⚠ Working it harder BREAKS fibre: more line out, one band down.
    const outBand = hard ? stepDown(band) : band;
    // ⚠ Worked harder: MORE line out of the same straw, and shorter.
    const lineUnits = Math.max(1, Math.round(charge * (hard ? 0.75 : 0.5)));
    const towUnits = Math.max(0, Math.round(charge * (hard ? 0.15 : 0.4)));
    // ⭐ Most of a flax stem is boon. You throw away the majority of what
    // you grew, and the minority is worth more than the crop.
    const shiveUnits = Math.max(1, Math.round(charge * 0.75));

    const instrument = this.findCapability(giver, 'scutching');
    const durationMs = this.paceMs(
      dial(ScutchController.BASE_MS_KEY, ScutchController.BASE_MS),
      instrument as Stuff | null,
      ['scutching'],
    );

    this.engageStep(context, {
      durationMs,
      beginSelf: hard
        ? Mml.compose`You set to ${Mml.thing(source)} hard, beating the boon out of it.`
        : Mml.compose`You work ${Mml.thing(source)} steadily against the board.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} works a bundle of flax against a scutching board.`,
      onComplete: () => {
        void finish(context, source, slot, charge, outBand, {
          line: lineUnits,
          tow: towUnits,
          shive: shiveUnits,
          hard,
        });
      },
    });
  }
}

async function finish(
  context: CommandContext,
  source: Stuff,
  slot: { debit(litres: number): void },
  charge: number,
  band: string,
  out: { line: number; tow: number; shive: number; hard: boolean },
): Promise<void> {
  const giver = context.commandGiver;
  // ⚠⚠ A module function, never `this.<method>`: a controller is one
  // ephemeral clone per execution and is destructed the moment `execute`
  // returns, while this runs after an engaged step. A completion calling
  // back into it would run on a destroyed Stuff and the proxy would
  // answer with a silent no-op — the straw would go in and no fibre
  // would ever come out. The mining acts shipped that bug once.
  const watching = !giver.isDestroyed();
  try {
    slot.debit(charge);
  } catch {
    /* the source went away mid-step; the mint below is still honest */
  }

  const made: string[] = [];
  for (const [row, units, label] of [
    [LINE_ROW, out.line, 'line'],
    [TOW_ROW, out.tow, 'tow'],
    [SHIVE_ROW, out.shive, 'shive'],
  ] as const) {
    if (units <= 0) continue;
    try {
      const stock = await StuffApi.clone<Stuff>(row);
      if (MixinApi.isGlobbable(stock)) stock.setQuantity(units);
      // ⭐ The grade rides `CraftedMixin` — the same stamp the harvest
      // put on the sheaf, carried one more step by the shipped
      // weakest-link rule and nothing else.
      if (MixinApi.isGraded(stock)) stock.setGrade(Grade.of(band));
      if (MixinApi.isContainable(stock) && MixinApi.isContainer(giver)) {
        ContainmentApi.move(
          stock as Stuff & Containable,
          giver as Stuff & Container,
        );
      }
      made.push(`${units} of ${label}`);
    } catch (err) {
      console.warn(`ScutchController: could not mint '${row}':`, err);
    }
  }

  if (!watching) return;
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      out.hard
        ? Mml.compose`The boon flies. You get ${made.join(', ')} — more line than a gentle hand would, and shorter.`
        : Mml.compose`The boon falls away. You get ${made.join(', ')}.`,
    )
    .toPeers(Mml.compose`${Mml.actor(giver)} finishes a bundle of flax.`)
    .send();
}

/** Numeric AppSetting read with the seeded-literal fallback. */
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

/** The grade a source carries, else the neutral middle. */
function bandOf(source: Stuff): string {
  return MixinApi.isGraded(source) ? source.getGradeBand() : 'fair';
}

/** One band down, floored at the bottom of the scale. */
function stepDown(band: string): string {
  const i = (GRADE_BANDS as readonly string[]).indexOf(band);
  return GRADE_BANDS[Math.max(0, (i < 0 ? 1 : i) - 1)]!;
}
