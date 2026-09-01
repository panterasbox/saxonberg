/**
 * `maintains` brain — the agency that performs the upkeep its term owes.
 *
 * A tenure term is a claim about who is responsible (residences D5):
 * the university keeps the dorm inside and out, a landlord keeps the
 * shell of a let unit, an owner keeps their own house. A claim nobody
 * acts on is set dressing — so the institution's property manager walks
 * their extent on a cadence and does the work, and the shells the term
 * names stay sound whether or not any tenant is looking.
 *
 * ⭐ **Nothing here is unavailable to a player.** The act is the literal
 * `maintain` verb through `CommandApi.forceCommand`, gated exactly as a
 * typed line is: the NPC must be carrying a householder's kit (an
 * owner-authored `props:` loadout, not a self-issued power), must be
 * standing in the holding, and gets the same refusals anyone gets. Take
 * the kit off Katie and the dorm weathers.
 *
 * Movement is a `teleport` (the `shifts`/`restocks` shape — a walked
 * round is the locomotion slate's, and a property manager crossing a
 * campus every beat would be a lot of walking for a putty knife).
 *
 * config: `{ extent: string, batch?: number }` — the parcel extent whose
 * holdings this agent keeps (`/world/eternal/duncan-hall/units`,
 * `/world/terminus/mayfield-row/seznick-house/units`), and how many
 * holdings to work per beat (default 3, so a big building is covered
 * over several beats rather than in one thundering pass).
 *
 * The extent is config rather than derived because an agent's REMIT is
 * an authored fact about their job, not a thing to infer from where
 * they happen to be standing.
 */

import { MixinApi } from '../../api/mixin';
import { MqlApi } from '../../api/mql';
import { CommandApi } from '../../api/command';
import type { CommandGiver } from '../command/CommandGiver';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';

const DEFAULT_BATCH = 3;

/** The shape a holding programme presents — read, never imported. */
interface HoldingShape {
  holdingKey(): string | null;
  conditionBand(): string;
  entryRoom(): Stuff | null;
}

type Keeper = Stuff & Mobile & Containable & Container & CommandGiver;

export const brain = class {
  static label = 'maintains';
  static presenceGated = false;
  // Functional (it changes the world), not ambient chatter — exempt
  // from the ambient-cadence dial the same way `restocks` is.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainable(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    const extent = typeof ctx.config.extent === 'string' ? ctx.config.extent : '';
    if (!extent) return;
    const batch =
      typeof ctx.config.batch === 'number' && ctx.config.batch > 0
        ? Math.floor(ctx.config.batch)
        : DEFAULT_BATCH;

    const keeper = host as Keeper;
    const where = keeper.getContainer();
    let done = 0;
    for (const holding of holdingsUnder(extent)) {
      if (done >= batch) break;
      // Sound shells cost nothing to skip and the verb would refuse
      // anyway; skipping here keeps the beat's teleports honest.
      if (holding.conditionBand() === 'sound') continue;
      const room = holding.entryRoom();
      if (!room || !MixinApi.isContainer(room)) continue;
      keeper.teleport(room as Stuff & Container);
      try {
        await CommandApi.forceCommand(keeper, 'maintain');
        done += 1;
      } finally {
        /* keep walking the round even if one holding refuses */
      }
    }
    // Back to the desk. A property manager who ends the beat in
    // somebody's kitchen is a bug a player would report.
    if (where && MixinApi.isContainer(where)) {
      keeper.teleport(where as Stuff & Container);
    }
  }
} satisfies BrainStatics;

/**
 * Every live holding programme whose key sits under `extent`.
 *
 * Resolved through MQL by CLASS NAME — a string, never an import: the
 * residential programme is a capability pack's class and the kernel does
 * not import packs. The `key` atom is the programme's own parcel extent
 * (residences D16), so the prefix test is the ownership test.
 */
function holdingsUnder(extent: string): HoldingShape[] {
  const out: HoldingShape[] = [];
  let found: Stuff[] = [];
  try {
    found = MqlApi.resolveMany('world:[class.HoldingWarren]', {
      commandGiver: null,
      scope: 'world',
    }).stuff;
  } catch {
    return out;
  }
  for (const s of found) {
    const h = s as unknown as Partial<HoldingShape>;
    if (
      typeof h.holdingKey !== 'function' ||
      typeof h.conditionBand !== 'function' ||
      typeof h.entryRoom !== 'function'
    ) {
      continue;
    }
    const key = h.holdingKey();
    if (!key || !(key === extent || key.startsWith(`${extent}/`))) continue;
    out.push(h as HoldingShape);
  }
  return out;
}
