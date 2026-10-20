/**
 * mills — the estate miller's brain (sugar D18): crush what the cutters
 * brought, while it is still fresh. One bundle a beat through the edge
 * runner (`mill cane` — the `crush-cane` recipe: juice into a tub, the
 * crushed fibre left as bagasse to dry), and the tub of juice carried to
 * the boiling house (config `carry: { to, back }` — directions). Every act a
 * verb a player could type, on shift only.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

export const brain = class {
  static label = 'mills';
  static kind: TaskKind = 'work';
  static summary = 'Crushes the cut cane at the edge runner while it is fresh.';
  static discipline = 'milling';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  static ambient = false;

  /** What the miller can see: cane to crush, and a tub of juice to carry. */
  static read(host: Stuff): { crush: boolean; tub: boolean } | null {
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') return null;
    if (!MixinApi.isContainable(host)) return null;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    const here = [
      ...(room.getContents() as Stuff[]),
      ...(MixinApi.isContainer(host) ? (host.getContents() as Stuff[]) : []),
    ];
    const cane = here.some(
      (s) => MixinApi.isTangible(s) && (s.getMaterial()?.hasTag('cane') ?? false) && !MixinApi.isGrowing(s),
    );
    const stones = here.some((s) => MixinApi.isTool(s) && s.hasCapability('millstone'));
    const tub = here.some(
      (s) =>
        MixinApi.isBulkable(s) &&
        !s.isBulkEmpty('interior') &&
        (s.getBulkMaterial('interior')?.hasTag('cane-juice') ?? false),
    );
    return { crush: cane && stones, tub };
  }

  /** The next verbs, one per line, or `null`. Pure. */
  static next(
    yard: { crush: boolean; tub: boolean },
    carry: { to: readonly string[]; back: readonly string[] },
  ): string | null {
    if (yard.crush) return 'mill cane';
    if (yard.tub && carry.to.length > 0) {
      return ['get tub', ...carry.to.map((d) => `go ${d}`), 'drop tub', ...carry.back.map((d) => `go ${d}`)].join('\n');
    }
    return null;
  }

  static carry(config: unknown): { to: readonly string[]; back: readonly string[] } {
    const c = ((config ?? {}) as { carry?: { to?: string[]; back?: string[] } }).carry ?? {};
    return { to: c.to ?? [], back: c.back ?? [] };
  }

  static urgency(ctx: BrainContext): Urgency {
    const yard = brain.read(ctx.host);
    return yard && brain.next(yard, brain.carry(ctx.config)) !== null
      ? new Urgency('wanted', 'drives the mule round')
      : new Urgency('idle');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const yard = brain.read(host);
    if (yard === null) return;
    const verbs = brain.next(yard, brain.carry(ctx.config));
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
