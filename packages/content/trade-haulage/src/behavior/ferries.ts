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
 * ⭐ **To a timetable** (river W12): with a `service` that runs one, in
 * its hours he works to it rather than to the bell — when boarding is
 * called at the other landing and the ferry is here with him, he takes her
 * over to it; when a departure from here has come and she is still here,
 * he takes her across. Out of its hours the service is on call, and the
 * bell rules as before.
 *
 * config: `{ landings: [a, b], bells: [bellA, bellB], way: string,
 * service?: string }` — the two landings (template paths), the bell at
 * each (same order), the name of the ferry way on both landings (default
 * `across`), and the timetabled service row, if there is one.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import FerryService from '@saxonberg/content-transport/src/idea/FerryService';
import FerryExit from '@saxonberg/content-transport/src/idea/FerryExit';

export const brain = class {
  static label = 'ferries';
  static kind: TaskKind = 'work';
  static summary = 'Answers the bell on the far landing and poles the ferry over for whoever rang it.';
  static discipline = 'navigation';
  // ⭐ His attention — he is watching the far landing for the bell — and
  // not his hands: the crossing he makes is itself a timed act on them, and
  // a beat holding them refused his own `go across` (the drive's pass 8).
  static claims: readonly EngagementSlot[] = ['attention'];
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

    // ⭐ To the timetable, in its hours (W12).
    const servicePath = typeof ctx.config.service === 'string' ? ctx.config.service : '';
    const service = servicePath ? await StuffApi.singleton(servicePath).catch(() => null) : null;
    if (service instanceof FerryService && service.isTimetabled()) {
      const room = host.getContainer();
      const exit = room !== null && MixinApi.isExitable(room) ? room.getExit(way) : undefined;
      if (!(exit instanceof FerryExit) || exit.ferryHere() === null) return;
      // Boarding called across the water, and she is here with him: over to it.
      const boardingThere = service.phaseNow() === `boarding:${landings[other]}`;
      // A departure from here has come, and she is still here: away.
      const due = service.lastDepartureFrom(here);
      const departed = typeof ctx.state.departedAtS === 'number' ? ctx.state.departedAtS : Number.NEGATIVE_INFINITY;
      const departing = due !== null && due > departed;
      if (!boardingThere && !departing) return;
      if (departing) ctx.state.departedAtS = due;
      await host.forceCommand(`go ${way}`);
      return;
    }

    // Rung on the far side since he last answered it?
    const bell = await StuffApi.singleton(bells[other]!).catch(() => null);
    const rung = bell !== null && MixinApi.isRingable(bell) ? bell.getLastRungAtS() : Number.NEGATIVE_INFINITY;
    const answered = typeof ctx.state.answeredAtS === 'number' ? ctx.state.answeredAtS : Number.NEGATIVE_INFINITY;
    if (!(rung > answered)) return;
    ctx.state.answeredAtS = rung;

    const room = host.getContainer();
    const exit = room !== null && MixinApi.isExitable(room) ? room.getExit(way) : undefined;
    if (!(exit instanceof FerryExit) || exit.ferryHere() === null) return;
    const gate = await exit.canTraverse(host);
    if (!gate.ok) {
      await host.forceCommand(`shout ${gate.reason ?? 'Not now!'}`);
      return;
    }
    // A named way is taken with `go` (the drive: a bare `across` was an
    // unknown verb, and the ferry never came).
    await host.forceCommand(`go ${way}`);
  }
} satisfies BrainStatics;

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];
}
