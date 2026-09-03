/**
 * WeaveController — `weave`, and ⭐ the decision is **weave density**:
 * yield against windproofing and wear.
 *
 * | | cloth per yarn | the cloth |
 * |---|---|---|
 * | `--open` | most | sackcloth — breathes, and a sack is what it is for |
 * | ordinary | middling | plain linen |
 * | `--close` | least | fine linen: breaks a wind, wears far longer |
 *
 * ⭐⭐ **The density is a FABRIC ROW, not a per-bolt number**, and that
 * is the demonstration that `Construction`'s second source works: this
 * pack ships its own `/trade/textiles/idea/fabric/*` rows, the
 * catalogue harvests them by path infix, and the kernel never learned
 * they exist. A pack adding `lace` tomorrow needs no kernel edit and
 * changes nothing about combat — cloth resists poorly, and the kernel
 * decides that, not the row.
 *
 * ⚠ A bad run yields a **flawed bolt** — one grade band down. Without a
 * failure mode competence is invisible, and weaving's is a slub you
 * cannot take out.
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
import { Grade, GRADE_BANDS } from '@saxonberg/server/mud/lib/craft/Grade';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

const TOPIC = 'act.deed';
const BOLT_ROW = '/trade/textiles/thing/bolt';

/** The three points on the continuum, as fabric FORM words. */
const OPEN = 'sackcloth';
const PLAIN = 'woven';
const CLOSE = 'fine-woven';

interface WeaveModel extends CommandModel {
  yarn: MqlOneResult;
  close?: boolean;
  open?: boolean;
}

export default class WeaveController extends ManualBuildController<WeaveModel> {
  /**
   * ⭐ A dial. ⚠⚠ And roughly a SIXTH of `spin`'s, which is the whole
   * lesson: one weaver kept several spinners busy. The bench asserts
   * the ratio at the shipped tech level and says so in its own name —
   * it is true before the wheel-and-loom era ends and false after, and
   * a later mill wave must be able to change it without anyone
   * "fixing" a test that was never eternal.
   */
  static readonly BASE_MS_KEY = 'textiles.weave.baseMs';
  static readonly BASE_MS = 15 * 60 * 1000;
  /** Units of yarn one act sets on the loom. */
  static readonly CHARGE_KEY = 'textiles.weave.chargeUnits';
  static readonly CHARGE = 4;

  async execute(model: WeaveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const yarn = model.yarn?.stuff ?? null;
    if (!yarn || !MixinApi.isGlobbable(yarn)) {
      this.declineStep(context, Mml.compose`Weave what?`, 'no-yarn');
      return;
    }
    if (!(yarn.getTemplatePath() ?? '').endsWith('/yarn')) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(yarn)} is not yarn. A loom wants thread.`,
        'not-yarn',
      );
      return;
    }
    const charge = dial(WeaveController.CHARGE_KEY, WeaveController.CHARGE);
    if (yarn.getQuantity() < charge) {
      this.declineStep(
        context,
        Mml.compose`There is not enough yarn there to warp a loom.`,
        'too-little',
      );
      return;
    }

    // ⭐ Yield against the cloth. An open weave gets more cloth out of
    // the same thread and is worth less; a close one gets less and is
    // worth more. Nobody authored the trade-off — it is what a weave IS.
    const form = model.close ? CLOSE : model.open ? OPEN : PLAIN;
    const units = model.close ? 1 : model.open ? 3 : 2;

    const band = await outcomeBand(giver, yarn, form);
    const instrument = this.findCapability(giver, 'weaving');
    const durationMs = this.paceMs(
      dial(WeaveController.BASE_MS_KEY, WeaveController.BASE_MS),
      instrument as Stuff | null,
      ['weaving'],
    );

    this.engageStep(context, {
      durationMs,
      beginSelf: Mml.compose`You warp the loom with ${Mml.thing(yarn)} and begin throwing the shuttle.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets a web on the loom.`,
      onComplete: () => {
        void finish(context, yarn, charge, form, units, band);
      },
    });
  }
}

async function finish(
  context: CommandContext,
  yarn: Stuff & { getQuantity(): number; setQuantity(n: number): void },
  charge: number,
  form: string,
  units: number,
  band: string,
): Promise<void> {
  const giver = context.commandGiver;
  // ⚠⚠ A module function — the controller is destructed by now.
  const watching = !giver.isDestroyed();
  const left = Math.max(0, yarn.getQuantity() - charge);
  if (left === 0) StuffApi.destruct(yarn);
  else yarn.setQuantity(left);

  try {
    const bolt = await StuffApi.clone<Stuff>(BOLT_ROW);
    if (MixinApi.isGlobbable(bolt)) bolt.setQuantity(units);
    if (MixinApi.isConstructed(bolt)) bolt.setConstructionForm(form);
    if (MixinApi.isGraded(bolt)) bolt.setGrade(Grade.of(band));
    if (MixinApi.isContainable(bolt) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(
        bolt as Stuff & Containable,
        giver as Stuff & Container,
      );
    }
    if (!watching) return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You cut ${String(units)} of ${form === CLOSE ? 'fine' : form === OPEN ? 'coarse' : 'plain'} cloth off the loom.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} cuts a web off the loom.`)
      .send();
  } catch (err) {
    console.warn('WeaveController: could not mint a bolt:', err);
  }
}

/**
 * The bolt's band. ⚠ It is the YARN's band, dropped one for a flawed
 * run — a close weave is harder to keep clean, and an untrained hand
 * setting a fine web will put a slub in it. Nothing here can raise the
 * band above what the fibre was.
 */
async function outcomeBand(
  giver: Stuff,
  yarn: Stuff,
  form: string,
): Promise<string> {
  const base = MixinApi.isGraded(yarn) ? yarn.getGradeBand() : 'fair';
  if (form !== CLOSE) return base;
  const asActor = giver as unknown as {
    competenceBandFor?(key: string): Promise<CompetenceBandName>;
  };
  let band: CompetenceBandName = 'untrained';
  if (typeof asActor.competenceBandFor === 'function') {
    try {
      band = await asActor.competenceBandFor('textiles');
    } catch {
      /* untrained */
    }
  }
  if (CompetenceBand.rank(band) >= 2) return base;
  const i = (GRADE_BANDS as readonly string[]).indexOf(base);
  return GRADE_BANDS[Math.max(0, (i < 0 ? 1 : i) - 1)]!;
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
