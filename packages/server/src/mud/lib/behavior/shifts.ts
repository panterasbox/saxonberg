/**
 * `shifts` brain — presence as a **consequence of employment state**.
 *
 * On a cadence, reads the host's shift state from the employment engine
 * (`EmploymentApi.shiftStateOf`, a sync read of the roster-maintained
 * `Employment.status`) and migrates the NPC to the location that state
 * implies:
 *
 * - `on-shift`  → `behindBar` (working)
 * - `off-shift` → `offstage` (a holding location, out of play)
 *
 * The **schedule now lives on the Business `Roster`** — the engine's game-
 * clock tick maintains each assignee's on-shift status, so the brain no
 * longer reads the clock (`WorldClockApi` / `DefaultCalendar` are gone). It
 * stays hot-swappable and reactive: flip a worker's shift state and the next
 * beat moves them.
 *
 * Migration is a `teleport` (locations need no diegetic exit between them).
 * **Not** presence-gated: it must run unwatched so off-stage cast are moved
 * out before any player arrives. Presence/migration only — the in-room
 * shift-*change* ritual (count-out, reconcile) is a later wave.
 *
 * config: `{ behindBar: string, offstage: string, railStool?: string }` —
 * location paths are templatePaths resolved live. `railStool` is a reserved
 * key for the deferred off-shift-at-the-rail presence (v1 presence is
 * binary: behind the bar, or offstage).
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { EmploymentApi } from '../../api/employment';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';

export const brain = class {
  static label = 'shifts';
  static presenceGated = false;
  // Functional poller (reads roster/shift state), not ambient chatter —
  // exempt from the global ambient-cadence dial so shift transitions are
  // detected on the authored interval.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isMobile(host)) return;
    const mob = host as Stuff & Mobile & Containable;

    // Presence is driven by employment state, not the clock — the engine's
    // roster tick already resolved this host's on/off-shift status.
    if (!MixinApi.isEmployed(host)) return;

    // ⚠⚠ **"Not yet resolved" is not "off duty."** `shiftState()` collapses
    // both into `off-shift`, because `isOnShift()` is a `.some()` over the
    // stored employment records and an empty store answers false. A cast
    // NPC is spawned by residency when a player walks in, and its roster
    // record is only materialized by the engine's pass — so for the window
    // between the two, a 24/7-rostered cook read as off duty and this brain
    // teleported him out of his own kitchen. In the client that is *"Odo
    // vanishes."*, and `order` then answers "There's no one on hand to make
    // that."
    //
    // Presence FOLLOWS employment; with no employment there is nothing to
    // follow, so the brain leaves the host where the world put it and waits
    // for the pass. An NPC that has genuinely left keeps a record (`quit` /
    // `fired` are statuses, not deletions), so this never strands one.
    if (host.getEmployments().length === 0) return;

    const state = host.shiftState();
    const targetPath =
      state === 'on-shift' ? ctx.config.behindBar : ctx.config.offstage;
    if (typeof targetPath !== 'string') return;

    // Resolve (materializing) the destination singleton — the bar is
    // already live; the offstage holding room is created on demand.
    const dest = await StuffApi.singletonOrClone(targetPath);
    if (!MixinApi.isContainer(dest)) return;
    const current = mob.getContainer();
    if (current && current.stuffId === dest.stuffId) return; // already there
    mob.teleport(dest as Stuff & Container);
  }
} satisfies BrainStatics;
