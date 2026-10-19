/**
 * `doorman` brain — ⭐ **the man on the door, and his reason** (cleanliness
 * D29). He keeps a `KeptDoor`: the exit finds him (on either side, ON SHIFT
 * for the house the door names — a doorman off shift in the hall is a man
 * in a coat) and asks {@link judge} whether you may pass. The criterion is
 * DATA, on his row's `config` — never code, and never a gauge:
 *
 * ```yaml
 * config:
 *   dressCode:
 *     turnsAway:
 *       - { outer: [apron, smock], where: torso, say: "Not in your working clothes." }
 *       - { soiledAbove: marked, say: "Not in that state." }
 *       - { bare: [torso], say: "Not like that." }
 *   regardAdmits: 60   # somebody he thinks well of, he lets by
 * ```
 *
 * ⭐ Lens 7: the criterion is named on the row; the appeal is every other
 * way in (a borrowed coat, a bath, the hall's other business, the bank's
 * own officer); tier C — a house may change its own door. His `act` greets
 * arrivals from `config.greets`, as `greets` does.
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics, DoorJudgment, KeptDoorShape } from './brain';
import type { TaskKind } from './Urgency';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { SOIL_BANDS, type SoilBand } from '../cleanliness/Soilable';

interface TurnAway {
  outer?: string[];
  where?: string;
  soiledAbove?: SoilBand;
  bare?: string[];
  say?: string;
}

/** The part a `where:`/`bare:` word names, on this body. */
function partFor(mover: Stuff, word: string): string | null {
  if (!MixinApi.isAttired(mover)) return null;
  if (word === 'torso' || word === 'trunk') return mover.trunkSite();
  return word;
}

export const brain = class {
  static label = 'doorman';
  static kind: TaskKind = 'social';
  static summary =
    'Keeps a door: says who may pass by the dress code on his row, and ' +
    'says why when he turns somebody away.';
  static claims: readonly EngagementSlot[] = ['attention'];

  static act(ctx: BrainContext): void {
    const lines = Array.isArray(ctx.config.greets) ? (ctx.config.greets as string[]) : [];
    if (!lines.length) return;
    const line = lines[Math.floor(Math.random() * lines.length)];
    if (typeof line === 'string') ctx.say(line, ctx.perceived?.subject);
  }

  static judge(
    host: Stuff,
    mover: Stuff,
    config: Record<string, unknown>,
    door: KeptDoorShape,
  ): DoorJudgment {
    // ⭐ He judges only ON SHIFT for the house the door names — the answer
    // is a SEAT, never presence: off shift he is a man in a coat.
    if (!MixinApi.isEmployed(host) || !host.isOnShiftFor(door.getKeptBy())) {
      return { admit: true };
    }
    const threshold = Number(config.regardAdmits ?? 60);
    if (MixinApi.isBeliefStore(host) && host.regardFor(mover) >= threshold) {
      return { admit: true };
    }
    const code = (config.dressCode ?? {}) as { turnsAway?: TurnAway[] };
    for (const rule of code.turnsAway ?? []) {
      const said = rule.say ?? 'Not like that, I am afraid.';
      if (rule.outer && MixinApi.isAttired(mover)) {
        const part = partFor(mover, rule.where ?? 'torso');
        const top = part ? mover.outermostAt(part) : null;
        const words = rule.outer.map((w) => w.toLowerCase());
        if (
          top &&
          MixinApi.isPerceptible(top) &&
          (words.some((w) => top.hasKeyword(w)) ||
            words.includes((top.getTemplatePath() ?? '').toLowerCase()))
        ) {
          return { admit: false, reason: said };
        }
      }
      if (rule.soiledAbove && MixinApi.isAttired(mover)) {
        const part = mover.trunkSite();
        const top = part ? mover.outermostAt(part) : null;
        const worst = top && MixinApi.isSoilable(top) ? top.soilBand() : null;
        const body = MixinApi.isSoilable(mover) ? mover.soilBand() : null;
        const limit = SOIL_BANDS.indexOf(rule.soiledAbove);
        if (
          (worst && SOIL_BANDS.indexOf(worst) > limit) ||
          (body && SOIL_BANDS.indexOf(body) > limit)
        ) {
          return { admit: false, reason: said };
        }
      }
      if (rule.bare && MixinApi.isAttired(mover)) {
        for (const w of rule.bare) {
          const part = partFor(mover, w);
          if (part && mover.outermostAt(part) === null) {
            return { admit: false, reason: said };
          }
        }
      }
    }
    return { admit: true };
  }
} satisfies BrainStatics;
