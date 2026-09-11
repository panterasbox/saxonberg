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
 * `maintain` verb through `forceCommand` (the giver's own method since the OO sweep), gated exactly as a
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

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type {
  BrainContext,
  BrainStatics,
} from '@saxonberg/server/mud/lib/behavior/brain';
import ResidenceCatalogue, {
  RESIDENCE_CATALOGUE_PATH,
} from '../idea/ResidenceCatalogue';

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
    for (const holding of await holdingsUnder(extent)) {
      if (done >= batch) break;
      // Sound shells cost nothing to skip and the verb would refuse
      // anyway; skipping here keeps the beat's teleports honest.
      if (holding.conditionBand() === 'sound') continue;
      const room = holding.entryRoom();
      if (!room || !MixinApi.isContainer(room)) continue;
      keeper.teleport(room as Stuff & Container);
      try {
        await keeper.forceCommand('maintain');
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
 * ⭐ Asked of the residence system's own roster. It used to be asked of
 * the WORLD, by class name in a string — every live object read and
 * filtered, once per property manager per cadence, from a kernel file
 * naming a pack's class. Both halves of that are fixed by the brain
 * living where its subject does.
 *
 * The `key` atom is the programme's own parcel extent (residences D16),
 * so the prefix test is the ownership test.
 */
async function holdingsUnder(extent: string): Promise<HoldingShape[]> {
  const out: HoldingShape[] = [];
  let found: Stuff[] = [];
  try {
    const catalogue = await StuffApi.singleton<ResidenceCatalogue>(
      RESIDENCE_CATALOGUE_PATH,
    );
    found = await catalogue.holdingsUnder(extent);
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
    out.push(h as HoldingShape);
  }
  return out;
}
