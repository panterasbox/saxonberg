/**
 * `nurses` brain — ⭐ **the physician who actually practises** (recovery D9).
 *
 * On a cadence, while on shift, the physician reads the room, TRIAGES the
 * bodies in it — dying first, then open bleeds, then the worst untreated
 * wound, then the worst infection — and does one thing for the top patient:
 * dresses a treatable wound if a dressing is to hand (scrubbing first, like
 * a professional, so she does not infect what she treats), or sits with
 * them otherwise. Everything she does goes through the SAME body primitives
 * a player uses (`applyTreatment`, `TendingEngagement`) — no NPC shortcut.
 *
 * ⚠ Deterministic: no roll decides who she treats or how well. Her skill
 * is her medicine band; the supply is real (the cabinet's dressings run
 * out). The graded diagnosis (`treat … for`) is NOT here — that is
 * medic-judgment's; this brain never guesses a condition.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { TendingEngagement } from '@saxonberg/server/mud/lib/vitals/TendingEngagement';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Vitals } from '@saxonberg/server/mud/lib/vitals/Vitals';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { Dressing } from '@saxonberg/server/mud/lib/vitals/Dressing';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';

const NURSING = 'nursing';
const BLEED = new Set(['laceration', 'puncture', 'avulsion']);

/** A body worth attending, with its triage rank (higher = more urgent). */
function triageRank(body: Stuff & Vitals): number {
  const conds = body.getConditions();
  if (conds.some((c) => c.kind === 'dying')) return 400;
  const traumas = conds.filter((c): c is Trauma => c.kind === 'trauma');
  // An open bleed is the most urgent wound; among open bleeds, the worst
  // one first (severity breaks the tie so triage stays deterministic).
  const openBleed = Math.max(
    0,
    ...traumas
      .filter((t) => t.bleeding === true && t.dressed !== true)
      .map((t) => t.severity),
  );
  if (openBleed > 0) return 300 + openBleed;
  const worstWound = Math.max(
    0,
    ...traumas.filter((t) => t.dressed !== true).map((t) => t.severity),
  );
  if (worstWound > 0) return 100 + worstWound;
  const worstInfection = Math.max(
    0,
    ...conds
      .filter((c) => c.kind === 'affliction')
      .map((c) => (c.kind === 'affliction' ? c.pathogenLoad ?? 0 : 0)),
  );
  return worstInfection > 0 ? worstInfection : 0;
}

/** The worst dressable wound (a bleed the nurse can bandage), or null. */
function dressableWound(body: Stuff & Vitals): Trauma | null {
  return (
    body
      .getConditions()
      .filter(
        (c): c is Trauma =>
          c.kind === 'trauma' &&
          BLEED.has(c.type) &&
          c.dressed !== true &&
          c.severity > 0,
      )
      .sort((a, b) => b.severity - a.severity)[0] ?? null
  );
}

/** A dressing loose in the room or in one of its open containers. */
function findDressing(room: Stuff & Container): (Stuff & Dressing) | null {
  for (const item of room.getContents()) {
    if (MixinApi.isDressing(item)) return item as Stuff & Dressing;
    if (MixinApi.isContainer(item)) {
      for (const inner of (item as Stuff & Container).getContents()) {
        if (MixinApi.isDressing(inner)) return inner as Stuff & Dressing;
      }
    }
  }
  return null;
}

export const brain = class NursesBrain {
  static label = 'nurses';
  static kind: TaskKind = 'body';
  static summary =
    'Triages the bodies in the room — dying, then open bleeds, then the ' +
    'worst untreated wound, then infection — and does one thing for the ' +
    'top patient, through the same primitives a player uses.';
  static discipline = 'nursing';
  /**
   * ⭐⭐ **The smuggled priority, now declared.** `triageRank` was always a
   * priority function; it was simply private to this brain, so the
   * physician could be out-shouted by her own idle chatter because nothing
   * above her could see that a dying patient outranks a wiped counter.
   * Same arithmetic, same determinism — no roll decides who she treats —
   * read by the arbiter instead of only by the sort inside `act`:
   *
   * - a dying patient (400) ⇒ `critical`: it preempts whatever she was
   *   doing and wakes her early;
   * - an open bleed (300+) ⇒ `pressing`;
   * - any untreated wound or infection ⇒ `wanted`;
   * - a quiet ward ⇒ `idle`.
   *
   * ⚠ And the reason names the patient, because a watcher should be able
   * to see who she crossed the room for.
   */
  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') {
      return new Urgency('idle');
    }
    if (!MixinApi.isContainable(host)) return new Urgency('idle');
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return new Urgency('idle');
    let worst: (Stuff & Vitals) | null = null;
    let rank = 0;
    for (const occ of (room as Stuff & Container).getContents()) {
      const s = occ as unknown as Stuff;
      if (s === (host as unknown as Stuff)) continue;
      if (!MixinApi.isVitals(s)) continue;
      const r = triageRank(s);
      if (r > rank) {
        rank = r;
        worst = s;
      }
    }
    if (!worst || rank <= 0) return new Urgency('idle');
    const who = worst.getPresentation();
    if (rank >= 400) {
      return new Urgency('critical', `goes straight to ${who}`);
    }
    if (rank >= 300) {
      return new Urgency('pressing', `moves to stop ${who} bleeding`);
    }
    return new Urgency('wanted', `turns to ${who}`);
  }
  static presenceGated = false;
  static ambient = false;
  static claims: readonly EngagementSlot[] = ['attention'];

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    // On shift only.
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') return;
    if (!MixinApi.isContainable(host)) return;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;

    // Triage the room.
    const patients: (Stuff & Vitals)[] = [];
    for (const occ of (room as Stuff & Container).getContents()) {
      const s = occ as unknown as Stuff;
      if (s === (host as unknown as Stuff)) continue;
      if (MixinApi.isVitals(s) && triageRank(s) > 0) patients.push(s);
    }
    patients.sort((a, b) => triageRank(b) - triageRank(a));
    const patient = patients[0];
    if (!patient) return;

    const band = MixinApi.isAdvancing(host)
      ? await host.competenceBandFor(NURSING)
      : CompetenceBand.FLOOR;
    const skill = 0.4 + 0.15 * CompetenceBand.rank(band as never);

    // Dress a wound if there is one and a dressing to hand.
    const wound = dressableWound(patient);
    const dressing = wound ? findDressing(room as Stuff & Container) : null;
    if (wound && dressing) {
      // Scrub first — a professional does not infect what she treats.
      if (MixinApi.isHygiene(host)) host.scrub();
      const quality = skill * dressing.getDressingQuality();
      patient.applyTreatment(wound, {
        by: 'dressing',
        efficacy: quality,
        treater: host as unknown as Stuff,
      });
      await StuffApi.destruct(dressing as unknown as Stuff);
      if (MixinApi.isAdvancing(host)) {
        await host.creditDeed({
          discipline: NURSING,
          difficulty: 'standard',
          outcome: CompetenceBand.rank(band) >= 2 ? 'success' : 'partial',
        });
      }
      return;
    }

    // Otherwise sit with the top patient (if not already tending them).
    if (!MixinApi.isEngaged(host)) return;
    if (host.getEngagementByType('medical-tending') !== undefined) return;
    SchedulerApi.start(
      new TendingEngagement(host as unknown as Stuff & Engaged, patient, band),
    );
  }
} satisfies BrainStatics;
