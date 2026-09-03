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

export const brain = class {
  static label = 'arms';

  static act(ctx: BrainContext): void {
    const host = ctx.host;
    if (!MixinApi.isContainer(host) || !MixinApi.isSlotted(host)) return;
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(host);
    if (!bodyPlanPath) return;

    // Candidates: what's already carried, then what's on the ground here.
    const candidates: Stuff[] = [...host.getContents()];
    if (MixinApi.isContainable(host)) {
      const room = host.getContainer();
      if (room && MixinApi.isContainer(room)) {
        candidates.push(...room.getContents());
      }
    }

    for (const item of candidates) {
      if (!MixinApi.isWieldable(item)) continue;
      const slots = item.getSlotClaim(bodyPlanPath);
      if (slots.length === 0) continue;
      // Already armed (this weapon's slots full) or hands otherwise
      // occupied — skip; the brain re-checks next tick (self-healing).
      if (slots.some((s) => host.isSlotFull(s))) continue;
      try {
        // Take it up first if it's lying in the room, then wield.
        if (MixinApi.isContainable(item) && item.getContainer() !== host) {
          ContainmentApi.move(item, host);
        }
        host.occupyAll(item, [...slots]);
      } catch {
        // Race / shape violation — leave it for the next tick.
      }
      return; // one weapon per fire
    }
  }
} satisfies BrainStatics;
