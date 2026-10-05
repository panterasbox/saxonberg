/**
 * `banks` brain (blood build D14) — the registrar who runs the window.
 * Three beats, one act per beat, in priority order:
 *
 *   1. ⭐ THE FLOOR — a dying body in the room whose directive is not a
 *      refusal, and a compatible unit on the shelf: `issue <lot>` to her
 *      own hands, then `transfuse <patient> from blood`. Forced verbs, so
 *      a player attendant could do the identical thing. Free (the fee
 *      attaches only to a customer's own `order transfusion`).
 *   2. THE SUMMONS — PURE PULL (the user's decision): for each short lot,
 *      `say` the shortage in the room ONCE per onset. No `tell`, no push
 *      into anyone's feed. The night registrar (`config.quiet`) stays
 *      silent; the ticker still gets the notice.
 *   3. THE NOTICE — when a lot first goes short, `press post … --kind
 *      notice`. Ages off the ticker on its own; no retraction.
 *
 * config: `{ window: <path>, quiet?: boolean }`. state tracks which lots
 * have been announced / noticed, cleared when a lot refills.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BloodType } from '@saxonberg/server/mud/lib/vitals/BloodType';
import type { BloodTypeLabel } from '@saxonberg/server/mud/lib/vitals/BloodType';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
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

function roomOf(host: Stuff): (Stuff & Container) | null {
  if (!MixinApi.isContainable(host)) return null;
  const room = host.getContainer();
  return room && MixinApi.isContainer(room) ? (room as Stuff & Container) : null;
}

/** A dying body in the room that the host may transfuse (not a refusal). */
function dyingPatient(host: Stuff, room: Stuff & Container): (Stuff & { bloodType(): string | null; bloodSystemOf(): string }) | null {
  for (const occ of room.getContents()) {
    const s = occ as unknown as Stuff;
    if (s === host) continue;
    if (!MixinApi.isVitals(s) || !s.isDying()) continue;
    if (MixinApi.isPersona(s)) {
      const v = s.transfusionConsent(host);
      if (v.verdict === 'directive-no') continue;
    }
    return s as never;
  }
  return null;
}

/** A lot the window holds that is a compatible donor for `patient`. */
function compatibleLot(
  window: Stuff & DonationBank,
  system: string,
  type: string | null,
): string | null {
  const me = new BloodType(system, (type ?? 'O') as BloodTypeLabel);
  const lots = window.getLots();
  // Prefer O (the universal donor within the system), then any match.
  const order = ['O', 'A', 'B', 'AB'];
  for (const k of order) {
    if ((lots.get(k)?.units ?? 0) <= 0) continue;
    if (new BloodType(system, k as BloodTypeLabel).isCompatibleDonorFor(me)) {
      return k;
    }
  }
  return null;
}

function targetWord(patient: Stuff): string {
  return (patient.getPresentation() ?? 'patient').split(/\s+/).pop() ?? 'patient';
}

export const brain = class BanksBrain {
  static label = 'banks';
  static kind: TaskKind = 'body';
  static summary =
    'Runs the blood window: transfuses a dying body on the floor for ' +
    'free, calls a shortage in the room, and posts it to the ticker.';
  static presenceGated = false;
  static ambient = false;
  static claims: readonly EngagementSlot[] = ['hands'];

  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (!onShift(host)) return new Urgency('idle');
    const window = windowOf(ctx);
    const room = roomOf(host);
    if (window && room) {
      const patient = dyingPatient(host, room);
      if (patient && compatibleLot(window, patient.bloodSystemOf(), patient.bloodType())) {
        return new Urgency('critical', `moves to save ${patient.getPresentation()}`);
      }
    }
    if (window && window.shortLots().length > 0) {
      return new Urgency('wanted', 'minds the shortage');
    }
    return new Urgency('idle');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!onShift(host) || !MixinApi.isCommandGiver(host)) return;
    const window = windowOf(ctx);
    if (!window) return;
    const room = roomOf(host);

    // 1. The floor — one dying body, one transfusion, free.
    if (room) {
      const patient = dyingPatient(host, room);
      if (patient) {
        const lot = compatibleLot(window, patient.bloodSystemOf(), patient.bloodType());
        if (lot) {
          await host.forceCommand(`issue ${lot}`);
          await host.forceCommand(`transfuse ${targetWord(patient)} from blood`);
          return;
        }
      }
    }

    // Track announced / noticed lots across beats.
    const announced = (ctx.state.announced ??= {}) as Record<string, boolean>;
    const noticed = (ctx.state.noticed ??= {}) as Record<string, boolean>;
    const short = new Set(window.shortLots());
    // Clear flags for lots that have refilled.
    for (const k of Object.keys(announced)) if (!short.has(k)) delete announced[k];
    for (const k of Object.keys(noticed)) if (!short.has(k)) delete noticed[k];

    const quiet = ctx.config.quiet === true;

    // 2. The summons — pure pull: say the shortage once per onset.
    if (!quiet) {
      for (const lot of short) {
        if (announced[lot]) continue;
        announced[lot] = true;
        ctx.say(`Anyone type ${lot}? The window is out.`);
        return;
      }
    }

    // 3. The notice — post to the ticker once per onset (even when quiet).
    for (const lot of short) {
      if (noticed[lot]) continue;
      noticed[lot] = true;
      await host.forceCommand(
        `press post "The Goodkin window at the infirmary is short of type ${lot}" --kind notice`,
      );
      return;
    }
  }
} satisfies BrainStatics;
