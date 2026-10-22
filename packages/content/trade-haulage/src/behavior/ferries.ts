/**
 * `ferries` brain (`/trade/haulage/behavior/ferries`) — ⭐ **the ferryman
 * answers the bell** (river D31).
 *
 * A ferry lies at one landing or the other. Whoever wants to cross from the
 * bank she is NOT at rings the bell on its post there; across the water the
 * ferryman knows it rang (the bell keeps when it was last struck) and, on
 * his beat, brings her over — by the same crossing a passenger takes, the
 * landing's ferry way, as a verb he issues. So whatever refuses a crossing
 * refuses him: at high water the crossing says *not at this water*, and he
 * shouts it across instead of going.
 *
 * Every act is a literal verb through `forceCommand`, as `hauls` does —
 * the ferryman is subject to the rules a person is.
 *
 * config: `{ landings: [a, b], bells: [bellA, bellB], way: string }` —
 * the two landings (template paths), the bell at each (same order), and
 * the name of the ferry way on both landings (default `across`).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** A bell, by shape: when it was last rung. */
interface Bell {
  getLastRungAtS(): number;
}

/** The ferry way on a landing, by shape: can she go now, and if not why. */
interface FerryWay {
  ferryHere(): Stuff | null;
  canTraverse(mover: Stuff, mode?: string): Promise<{ ok: boolean; reason?: string }>;
}

export const brain = class {
  static label = 'ferries';
  static kind: TaskKind = 'work';
  static summary = 'Answers the bell on the far landing and poles the ferry over for whoever rang it.';
  static discipline = 'navigation';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'answers the ferry bell');
  }
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isContainable(host) || !MixinApi.isCommandGiver(host)) return;
    const landings = list(ctx.config.landings);
    const bells = list(ctx.config.bells);
    const way = typeof ctx.config.way === 'string' && ctx.config.way !== '' ? ctx.config.way : 'across';
    if (landings.length !== 2 || bells.length !== 2) return;

    const here = host.getContainer()?.getTemplatePath() ?? '';
    const at = landings.indexOf(here);
    if (at < 0) return;
    const other = 1 - at;

    // Rung on the far side since he last answered it?
    const bell = (await StuffApi.singleton<Stuff>(bells[other]!).catch(() => null)) as unknown as Partial<Bell> | null;
    const rung = typeof bell?.getLastRungAtS === 'function' ? bell.getLastRungAtS() : Number.NEGATIVE_INFINITY;
    const answered = typeof ctx.state.answeredAtS === 'number' ? ctx.state.answeredAtS : Number.NEGATIVE_INFINITY;
    if (!(rung > answered)) return;
    ctx.state.answeredAtS = rung;

    const room = host.getContainer();
    const exit = room && MixinApi.isExitable(room) ? (room.getExit(way) as unknown as Partial<FerryWay> | undefined) : undefined;
    if (!exit || typeof exit.ferryHere !== 'function' || exit.ferryHere() === null) return;
    const gate = await exit.canTraverse!(host as unknown as Stuff);
    if (!gate.ok) {
      await host.forceCommand(`shout ${gate.reason ?? 'Not now!'}`);
      return;
    }
    await host.forceCommand(way);
  }
} satisfies BrainStatics;

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];
}
