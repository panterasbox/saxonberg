/**
 * `tends` brain (`/trade/diving/behavior/tends`) — **the tender**
 * (underwater C4).
 *
 * A tender holds a diver's line on the quay and reads it. Two tugs: haul
 * them up. And a diver who has stopped signalling and gone limp on the
 * line is hauled up too — the tender's whole job is noticing that the
 * line has gone quiet in the wrong way. The tender hauls with the same
 * verb a player types (`haul line`), a band at a time.
 *
 * config: `{ silenceS?: number }` — how long a limp diver is left before
 * the tender starts hauling (default 20 game-seconds).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Lifeline from '../thing/Lifeline';

export const brain = class {
  static label = 'tends';
  static kind: TaskKind = 'work';
  static summary = 'Holds a diver\'s line, reads its signals, and hauls them up.';
  static claims: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'tends a diver\'s line');
  }
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host as Stuff;
    if (host.isDestroyed() || !MixinApi.isCommandGiver(host) || !MixinApi.isContainer(host)) return;
    const line = host.getContents().find((c) => c instanceof Lifeline) as Lifeline | undefined;
    if (!line) return;
    const diver = line.getOnEnd();
    if (diver === null || diver === host) return;
    const nowS = WorldClockApi.getNow().rawValue();
    const signal = line.lastSignal();
    if (signal !== null && signal.tugs === 2) {
      await host.executeCommand('haul line');
      return;
    }
    const limp = MixinApi.isVitals(diver) && diver.getConsciousness() !== 'conscious';
    const silence = typeof ctx.config.silenceS === 'number' ? ctx.config.silenceS : 20;
    const state = ctx.state as { limpSinceS?: number };
    if (!limp) {
      delete state.limpSinceS;
      return;
    }
    state.limpSinceS ??= nowS;
    if (nowS - state.limpSinceS >= silence) await host.executeCommand('haul line');
  }
};
