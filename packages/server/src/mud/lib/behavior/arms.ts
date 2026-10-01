/**
 * `arms` brain — take up a weapon and wield it. A humanoid has no innate
 * attack, so a seeded fighter is defenceless until a weapon is in its
 * hand. This brain closes that gap: on its cadence it finds the first
 * wieldable within reach — its own inventory first, then the room it
 * stands in — takes it up if needed, and wields it (the host's `occupyAll`,
 * the same call the `wield` verb makes). So a duelist authored beside a
 * knife on a stone simply picks it up; no starting-inventory seam needed.
 *
 * It is **idempotent and self-healing**: once armed, the weapon's held
 * slots are full, so the brain no-ops; if the weapon is ever knocked
 * away (disarm) it re-arms on the next tick from whatever is at hand. No
 * new Stuff class and no base-class change — an armed NPC is authored
 * with one `behaviors:` entry plus a weapon reachable in the room.
 *
 * config: none.
 */

import { MixinApi } from '../../api/mixin';
import { SpeciesApi } from '../../api/species';
import { ContainmentApi } from '../../api/containment';
import type { Stuff } from '../stuff/Stuff';
import type { BrainContext, BrainStatics } from './brain';
import type { EngagementSlot } from '../activity/Engaged';
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

export const brain = class {
  static label = 'arms';
  static kind: TaskKind = 'threat';
  static claims: readonly EngagementSlot[] = ['hands'];
  static summary =
    'Takes up and wields the first weapon within reach — own kit before ' +
    'the floor — and re-arms after a disarm.';
  /**
   * ⭐ `pressing`, not `wanted`: a humanoid has no innate attack, so
   * being empty-handed beside a knife is a condition, not a chore. And
   * `idle` the moment it is armed — which is what retires the two
   * `cadence:2s` rows that were the heaviest idle cost in the realm.
   */
  static urgency(ctx: BrainContext): Urgency {
    return firstWieldable(ctx.host)
      ? new Urgency('pressing', 'reaches for a weapon')
      : new Urgency("idle");
  }

  static act(ctx: BrainContext): void {
    const host = ctx.host;
    if (!MixinApi.isContainer(host) || !MixinApi.isSlotted(host)) return;
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(host);
    if (!bodyPlanPath) return;

    // ⭐ The reach pool, on-person-first: carried before the floor, so a
    // brain arms itself from its own kit before it stoops. This walked
    // the two hops by hand — one of eleven copies (see
    // docs/antipatterns.md § Rebuilding the two-leg reach by hand).
    const found = firstWieldable(host as unknown as Stuff);
    if (found && MixinApi.isSlottable(found.item)) {
      const { item, slots } = found;
      try {
        // Take it up first if it's lying in the room, then wield.
        if (MixinApi.isContainable(item) && item.getContainer() !== host) {
          ContainmentApi.move(item, host);
        }
        host.occupyAll(item, [...slots]);
      } catch {
        // Race / shape violation — leave it for the next tick.
      }
    }
  }
} satisfies BrainStatics;

/**
 * The first weapon within reach this host could still take up, with the
 * body slots it would claim — on-person before the floor.
 *
 * ⭐ Shared by `act` and `urgency` deliberately: the question *is there
 * a weapon I could pick up* is the same question whether you are
 * deciding or doing, and two copies of that walk would drift.
 */
function firstWieldable(
  host: Stuff,
): { item: Stuff; slots: string[] } | null {
  if (!MixinApi.isContainer(host) || !MixinApi.isSlotted(host)) return null;
  const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(host);
  if (!bodyPlanPath) return null;
  for (const item of ContainmentApi.reachableFrom(host)) {
    if (!MixinApi.isWieldable(item)) continue;
    const slots = item.getSlotClaim(bodyPlanPath);
    if (slots.length === 0) continue;
    // Already armed (this weapon's slots full) or hands otherwise
    // occupied — the brain re-checks next beat (self-healing).
    if (slots.some((s) => host.isSlotFull(s))) continue;
    return { item: item as unknown as Stuff, slots: [...slots] };
  }
  return null;
}
