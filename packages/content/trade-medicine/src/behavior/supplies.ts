/**
 * `supplies` brain (blood build D13) — the Goodkin runner who carries
 * blood from the collection floor to the ward fridge while the window is
 * short. The producer floor (a `Stock` + the spawn sweep) keeps units
 * standing in the collection room; this brain moves them into the vault
 * the window reads — through the honest door dance (`open`/`put`/`close`),
 * forced verbs a player could do identically.
 *
 * No money: the floor cannot be bankrupted (no bounty, no house account).
 * config: `{ window: <path>, unit: <keyword>, fridge: <keyword>,
 * out: <exit to the ward>, back: <exit to the collection room> }`.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { DonationBank } from '@saxonberg/server/mud/lib/commerce/DonationBank';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

function windowOf(ctx: BrainContext): (Stuff & DonationBank) | null {
  const path = String(ctx.config.window ?? '');
  if (!path) return null;
  const w = StuffApi.findByTemplatePath(path);
  return w && MixinApi.isDonationBank(w) ? (w as Stuff & DonationBank) : null;
}

function onShift(host: Stuff): boolean {
  return MixinApi.isEmployed(host) && host.shiftState() === 'on-shift';
}

export const brain = class SuppliesBrain {
  static label = 'supplies';
  static kind: TaskKind = 'work';
  static summary =
    'Carries blood units from the collection floor to the ward fridge ' +
    'while the window is short of par.';
  static presenceGated = false;
  static ambient = false;
  static claims: readonly EngagementSlot[] = ['hands'];

  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (!onShift(host)) return new Urgency('idle');
    const window = windowOf(ctx);
    if (!window || window.shortfall() <= 0) return new Urgency('idle');
    return new Urgency('wanted', 'goes for more blood');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!onShift(host)) return;
    const window = windowOf(ctx);
    if (!window || window.shortfall() <= 0) return;
    if (!MixinApi.isCommandGiver(host)) return;

    const unit = String(ctx.config.unit ?? 'unit');
    const fridge = String(ctx.config.fridge ?? 'fridge');
    const out = String(ctx.config.out ?? 'west');
    const back = String(ctx.config.back ?? 'east');

    // The door dance: pull one unit off the floor, carry it to the ward,
    // open the cold store, shelve it, close up, return. Each a forced verb.
    await host.forceCommand(`get 1 ${unit}`);
    await host.forceCommand(`go ${out}`);
    await host.forceCommand(`open ${fridge}`);
    await host.forceCommand(`put ${unit} in ${fridge}`);
    await host.forceCommand(`close ${fridge}`);
    await host.forceCommand(`go ${back}`);
  }
} satisfies BrainStatics;
