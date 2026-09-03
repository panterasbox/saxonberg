/**
 * AlterController — `alter`, and ⭐⭐ **the retention loop, for free.**
 *
 * `Creature.getMass()` moves with metabolism. Girth is
 * `√(mass / stature)`. So **a garment cut for you last season stops
 * fitting when your body changes** — with zero new mechanism, falling
 * straight out of the fit model.
 *
 * That is what turns tailoring from a one-time purchase into a
 * **recurring service**: letting out, taking in, and coming back. It is
 * the retention loop for tailoring the way recolouring is for dyeing,
 * and neither of them is a subscription bolted on — both are what the
 * physics already said.
 *
 * ## ⚠⚠ The ceiling is the seam allowance, because MATTER IS CONSERVED
 *
 * Making a coat bigger needs more cloth, and there is no more cloth —
 * only what `cut` chose to fold into the seams. Making it smaller is
 * just cutting, and is always available.
 *
 * ⭐ **Magic hits the identical wall.** A spell cannot conjure matter
 * (elemental transformation is off by ~10⁶), so a working might alter
 * *faster*; it can never alter *further*. The cleanest magic/craft
 * interaction in the build, and it needed no code: the limit is already
 * `cut`'s waste decision.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { measurementsOf } from './CutController';

const TOPIC = 'act.deed';

interface AlterModel extends CommandModel {
  garment: MqlOneResult;
  for?: MqlOneResult;
}

export default class AlterController extends ManualBuildController<AlterModel> {
  static readonly BASE_MS_KEY = 'tailoring.alter.baseMs';
  static readonly BASE_MS = 25 * 60 * 1000;
  /** How much of a unit of allowance one act of letting out spends. */
  static readonly ALLOWANCE_PER_ACT = 1;

  execute(model: AlterModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const garment = model.garment?.stuff ?? null;
    if (!garment || !MixinApi.isWearable(garment)) {
      this.declineStep(context, Mml.compose`Alter what?`, 'no-garment');
      return;
    }
    const subject = model.for?.stuff ?? giver;
    const measured = measurementsOf(subject);
    if (!measured) {
      this.declineStep(
        context,
        Mml.compose`There is nobody there to fit it to.`,
        'no-subject',
      );
      return;
    }

    const fit = garment.fitOn(subject);
    if (fit.measurable && fit.distance < 0.02) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(garment)} already fits. There is nothing to do to it.`,
        'already-fits',
      );
      return;
    }

    // ⚠⚠ CONSERVATION. Letting out needs cloth that must already be
    // folded into the seams; taking in is just cutting and is always
    // available.
    const lettingOut = fit.tightness > 0;
    const allowance =
      (garment as unknown as { getSeamAllowance?(): number }).getSeamAllowance?.() ?? 0;
    if (lettingOut && allowance < AlterController.ALLOWANCE_PER_ACT) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(garment)} was cut close. There is nothing folded in the seams to let out — and nothing anywhere makes cloth out of nothing.`,
        'no-allowance',
      );
      return;
    }

    const instrument = this.findCapability(giver, 'mending');
    const durationMs = this.paceMs(
      dial(AlterController.BASE_MS_KEY, AlterController.BASE_MS),
      instrument as Stuff | null,
      ['mending'],
    );

    this.engageStep(context, {
      durationMs,
      beginSelf: lettingOut
        ? Mml.compose`You unpick the seams of ${Mml.thing(garment)} and start letting it out.`
        : Mml.compose`You pin ${Mml.thing(garment)} in and start taking it up.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} works over a garment with pins.`,
      onComplete: () => {
        if (!MixinApi.isWearable(garment)) return;
        garment.setCutTo(measured.bodyPlan, measured.stature, measured.girth);
        if (lettingOut) {
          (garment as unknown as {
            setSeamAllowance?(n: number): void;
          }).setSeamAllowance?.(allowance - AlterController.ALLOWANCE_PER_ACT);
        }
        if (giver.isDestroyed()) return;
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            lettingOut
              ? Mml.compose`It sits properly again, and there is less in the seams than there was.`
              : Mml.compose`It sits properly again, and there is a little more folded inside than there was.`,
          )
          .send();
      },
    });
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
