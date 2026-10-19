/**
 * `surveys` brain (`/trade/diving/behavior/surveys`) — **the harbour works
 * posting the city's work below the waterline** (underwater C4/C5).
 *
 * Whoever holds the harbour-works seat (the Wharfside pilot) keeps three
 * kinds of work on the board, each posted with the same `job post` a
 * player types and paid from the department's account:
 *
 *  - **inspect the intake** — always wanted, one at a time;
 *  - **raise the lost anchor** — while it lies on the bed;
 *  - **recover a body** — a drowned body lying on the basin's bed, by who
 *    it was (a corpse has no chattel; it has its own identity).
 *
 * ⚠ It reads only what is already in the world: the bed band is asked
 * about only when it is RESIDENT — a column nobody has been down has
 * nobody drowned in it. Load on use, never a search.
 *
 * config: `{ board, bank, intake, anchor, basin, reward? }` — paths.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContractApi } from '@saxonberg/server/mud/api/contract';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import Corpse from '@saxonberg/server/mud/platform/thing/Corpse';
import type ColumnWarren from '@saxonberg/content-water/src/idea/ColumnWarren';

interface SurveyConfig {
  board?: string;
  bank?: string;
  intake?: string;
  anchor?: string;
  basin?: string;
  reward?: number;
}

export const brain = class {
  static label = 'surveys';
  static kind: TaskKind = 'work';
  static summary = 'Keeps the harbour works\' jobs below the waterline posted on the board.';
  static claims: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('idle', 'keeps the harbour board');
  }
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host as Stuff;
    if (host.isDestroyed() || !MixinApi.isCommandGiver(host)) return;
    const cfg = ctx.config as SurveyConfig;
    if (!cfg.board || !cfg.bank) return;
    const reward = typeof cfg.reward === 'number' && cfg.reward > 0 ? cfg.reward : 30;
    const open = await ContractApi.openGigsOn(cfg.board);
    const posted = (path: string): boolean =>
      open.some((g) => {
        const item = g.clause?.condition?.item;
        if (!item) return false;
        return (item.kind === 'template' && item.path === path) ||
          (item.kind === 'identity' && item.identityPath === path);
      });

    if (cfg.intake && !posted(cfg.intake)) {
      await host.forceCommand(`job post inspect ${cfg.intake} for ${reward} --business`);
      return;
    }
    if (cfg.anchor && !posted(cfg.anchor) && brain.lyingUnderWater(cfg.anchor)) {
      await host.forceCommand(`job post deliver ${cfg.anchor} to ${cfg.bank} for ${reward * 2} --business`);
      return;
    }
    if (cfg.basin) {
      for (const body of brain.drownedOnTheBed(cfg.basin)) {
        const id = body.getIdentityPath() ?? '';
        if (id === '' || posted(id)) continue;
        await host.forceCommand(`job post recover ${id} to ${cfg.bank} for ${reward * 2} --business`);
        return;
      }
    }
  }

  /** Is the thing of this row lying in a water place (down there)? */
  static lyingUnderWater(path: string): boolean {
    const thing = StuffApi.findAllByTemplatePath<Stuff>(path)[0];
    const at = thing && MixinApi.isContainable(thing) ? thing.getContainer() : null;
    return at !== null && MixinApi.isWaterPlace(at);
  }

  /** The bodies lying on the basin's bed — only if that bed is resident. */
  static drownedOnTheBed(basinPath: string): Stuff[] {
    const column = StuffApi.findByTemplatePath<Stuff>(TemplatePaths.waterColumn) as
      (Stuff & ColumnWarren) | undefined;
    const bed = column?.bandAt?.(basinPath, 'bed') ?? null;
    if (bed === null) return [];
    return (bed as unknown as Stuff & { getContents(): Stuff[] }).getContents()
      .filter((c) => c instanceof Corpse);
  }
};
