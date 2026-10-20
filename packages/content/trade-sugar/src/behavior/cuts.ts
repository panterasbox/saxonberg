/**
 * cuts — a cane cutter's brain (sugar D18): cut the ripe cane where they
 * stand, and carry the bundle to the mill the same hour — cut cane inverts
 * on a clock (`InvertingMixin`), so a cutter who lets it lie sells sugar
 * nobody wants.
 *
 * Every act a verb a player could type: `harvest cane`, then an errand down
 * the track (`go …` steps), the hand-over (`drop cane` at the estate's mill
 * yard, or — with `deliver: sell cane` — a smallholder SELLING it at the
 * estate counter), and the steps back. A hired cutter works on shift; a
 * smallholder, who answers to nobody, works whenever there is ripe cane.
 *
 * config: `{ to: string[], back: string[], deliver?: string }` — the
 * directions to the mill (or the counter) and home, and the hand-over verb.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

interface Plot {
  /** A bundle of cut cane in hand. */
  holding: boolean;
  /** A stand of cane here ready to cut. */
  ripe: boolean;
}

interface Errand {
  to: readonly string[];
  back: readonly string[];
  deliver: string;
}

export const brain = class {
  static label = 'cuts';
  static kind: TaskKind = 'work';
  static summary = 'Cuts the ripe cane and carries it to the mill the same hour.';
  static discipline = 'agriculture';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  static ambient = false;

  static errand(config: unknown): Errand {
    const c = (config ?? {}) as Partial<Errand>;
    return { to: c.to ?? [], back: c.back ?? [], deliver: c.deliver ?? 'drop cane' };
  }

  static urgency(ctx: BrainContext): Urgency {
    const plot = brain.read(ctx.host);
    return plot && brain.next(plot, brain.errand(ctx.config)) !== null
      ? new Urgency('wanted', 'looks over the cane')
      : new Urgency('idle');
  }

  /** The next verbs (an errand is one per line), or `null`. Pure. */
  static next(p: Plot, e: Errand): string | null {
    if (p.holding) {
      return [...e.to.map((d) => `go ${d}`), e.deliver, ...e.back.map((d) => `go ${d}`)].join('\n');
    }
    return p.ripe ? 'harvest cane' : null;
  }

  static read(host: Stuff): Plot | null {
    // A hired hand works on shift; a smallholder works their own.
    if (MixinApi.isEmployed(host) && host.getActiveEmployment() && host.shiftState() !== 'on-shift') {
      return null;
    }
    if (!MixinApi.isContainable(host)) return null;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    const held = MixinApi.isContainer(host) ? (host.getContents() as Stuff[]) : [];
    const isCane = (s: Stuff): boolean =>
      MixinApi.isTangible(s) && (s.getMaterial()?.hasTag('cane') ?? false);
    return {
      holding: held.some(isCane),
      ripe: (room.getContents() as Stuff[]).some(
        (s) =>
          MixinApi.isGrowing(s) &&
          MixinApi.isPerceptible(s) &&
          s.hasKeyword('cane') &&
          s.isHarvestable(),
      ),
    };
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const plot = brain.read(host);
    if (plot === null) return;
    const verbs = brain.next(plot, brain.errand(ctx.config));
    if (verbs === null) return;
    for (const verb of verbs.split('\n')) {
      // NOT forced: the work is the hand's own act, and a forced frame is
      // unattributable by design — the maker verbs (`mill`, `cut`) read
      // the acting author and found none, so the estate's miller declined
      // `no-maker` at every bundle (sugar drive 8; `prints`' precedent).
      await (host as Stuff & CommandGiver).executeCommand(verb);
    }
  }
};
