/**
 * `donates` brain (blood build D13) — the visible donor, the FACE of the
 * supply (the producer floor is the backbone). On a cadence, if the body
 * has marrow to spare and an empty bag is to hand, it really gives: `bleed
 * into <bag>` then `put <bag> on <stock>`. Otherwise it just sits — a
 * sleeve rolled down.
 *
 * ⚠ Known limit (D13): marrow regrows only while fed, and no feeding is
 * wired for this Extra, so it gives at most once. The floor stock is the
 * floor; this is the face. config: `{ bag: <keyword>, stock: <keyword> }`.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BLOOD_DEFAULTS } from '@saxonberg/server/mud/lib/vitals/Blood';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

function marrowOf(host: Stuff): number {
  if (!MixinApi.isReserved(host) || !host.hasReserve('marrow')) return 0;
  return host.getReserve('marrow')?.current.rawValue() ?? 0;
}

export const brain = class DonatesBrain {
  static label = 'donates';
  static kind: TaskKind = 'filler';
  static summary =
    'The visible donor — gives a unit when it has the marrow and a bag to ' +
    'hand, and otherwise just sits.';
  static presenceGated = true;
  static ambient = true;
  static claims: readonly EngagementSlot[] = ['hands'];

  static urgency(ctx: BrainContext): Urgency {
    return marrowOf(ctx.host) >= BLOOD_DEFAULTS.DONATION_MIN_MARROW
      ? new Urgency('wanted', 'offers an arm')
      : new Urgency('idle');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const bag = String(ctx.config.bag ?? 'bag');
    const stock = String(ctx.config.stock ?? 'counter');

    if (marrowOf(host) >= BLOOD_DEFAULTS.DONATION_MIN_MARROW) {
      // It really gives — through the same verbs a player uses.
      await host.forceCommand(`bleed into ${bag}`);
      await host.forceCommand(`put ${bag} on ${stock}`);
      return;
    }
    // Spent for now — the face, not the floor.
    ctx.emoteFree('rolls a sleeve back down and waits.');
  }
} satisfies BrainStatics;
