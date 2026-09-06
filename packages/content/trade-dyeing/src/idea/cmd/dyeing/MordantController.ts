/**
 * MordantController — `mordant <thing> with <alum>`, and ⭐⭐ **this is
 * where the trade's missing failure mode comes from.**
 *
 * Two baths, as it really is, and the skill is front-loaded: you commit
 * to a colour family before you can see it.
 *
 * > Dye something un-mordanted and the colour **does not hold** — it
 * > washes straight out on the first launder.
 *
 * Real, nearly free (fastness ≈ 0), and it is exactly the *something to
 * be bad at* that every competence answer in this build needs to be
 * visible against.
 *
 * ⚠ And the mirror: **woad takes no mordant**, so mordanting before a
 * woad vat is wasted alum — refused rather than silently ignored,
 * because the point is that dyeing is TWO CHEMISTRIES and not one.
 *
 * ## ⚠ Where the mordant LIVES, and why
 *
 * It is an entry on the cloth's own `dyeStack` with **`strength: 0`** —
 * a thing applied to the cloth, at zero colour strength, which is
 * exactly what a mordant is. That keeps it on the cloth (so **mordanted
 * cloth is a real intermediate good** you can prepare in advance and
 * stockpile), keeps `getColorTag` honest (a strength-0 entry is below
 * legibility, so mordanted cloth shows no colour), and needs no field
 * the kernel does not already ship.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AppApi } from '@saxonberg/server/mud/api/app';

const TOPIC = 'act.deed';

/** The mordant keys the trade ships, and what each one does. */
export const MORDANTS: ReadonlyMap<string, string> = new Map([
  ['alum', 'brightens — the "true" colour'],
  ['iron', 'saddens — darkens and dulls'],
  ['tannin', 'the cellulose enabler'],
]);

interface MordantModel extends CommandModel {
  target: MqlOneResult;
  mordant?: string;
}

export default class MordantController extends ManualBuildController<MordantModel> {
  static readonly BASE_MS_KEY = 'dyeing.mordant.baseMs';
  static readonly BASE_MS = 30 * 60 * 1000;

  execute(model: MordantModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target || !MixinApi.isDyed(target)) {
      this.declineStep(context, Mml.compose`Mordant what?`, 'no-target');
      return;
    }
    const key = (model.mordant ?? '').trim().toLowerCase();
    if (!MORDANTS.has(key)) {
      this.declineStep(
        context,
        Mml.compose`Mordant it with what? There is alum, there is iron, and there is tannin.`,
        'unknown-mordant',
      );
      return;
    }

    // ⚠ Already mordanted and not yet dyed — the bath would do nothing.
    const stack = target.getDyeStack();
    const pending = stack[stack.length - 1];
    if (pending && pending.strength === 0) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(target)} is already mordanted, and a second bath will not take.`,
        'already-mordanted',
      );
      return;
    }

    this.engageStep(context, {
      durationMs: dial(MordantController.BASE_MS_KEY, MordantController.BASE_MS),
      beginSelf: Mml.compose`You set ${Mml.thing(target)} in the ${key} bath.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets something in a mordant bath.`,
      onComplete: () => {
        if (!MixinApi.isDyed(target)) return;
        // ⭐ The mordant as a zero-strength application: on the cloth,
        // below legibility, and a stockpileable intermediate good.
        target.applyDye({ dyestuff: mordantMaterial(key), mordant: key, strength: 0 });
        if (giver.isDestroyed()) return;
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`${Mml.thing(target)} comes out looking no different at all. That is the whole of it — what you have done is decide the colour before you can see it.`,
          )
          .send();
      },
    });
  }
}

/** The material path a mordant key names. */
function mordantMaterial(key: string): string {
  return `/trade/dyeing/idea/material/${key}`;
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
