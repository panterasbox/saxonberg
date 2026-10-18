/**
 * `stokes` brain — ⭐ **a hand on shift keeps the house's fire going.**
 *
 * Candidate. On shift and serving here (`Employed.isFulfilling`), in a
 * room with a fire (a `Burner`) that is cold or nearly out, with fuel in
 * reach: lay fuel in the bed, and light it. One act a beat, by the same
 * two calls `stoke` and `light` make for a player — `Burner.stoke`,
 * `Burner.ignite` — and said out loud, so a watcher sees the smith see to
 * her forge.
 *
 * ⭐⭐ Why it exists (the repair build's browser walk): in a fresh world
 * the Hearthworks forge is banked, and nothing in the game ever lit it.
 * Every metal mend Berta was paid for was refused — *"wants a fire hotter
 * than any here"* — until a PLAYER stoked and lit her forge for her; the
 * drive had hidden it by lighting the forge itself first. The tinker's
 * smelter stop (*"where there is a fire: iron mended there"*) was the
 * same. A paid mend lighting the fire inside the ladder would have been
 * the engine doing the hand's job unseen; this is the hand doing it, in
 * the room, with the house's charcoal.
 *
 * ⭐ **Fuel is what is MADE to burn** — a thing whose material carries the
 * `fuel` tag (charcoal, coke, coal, peat). `Burner.stoke` accepts anything
 * with a heat of combustion, so without this the smith would feed the
 * hammer's ash handle and the heirloom's grip to her own fire. Fuel lying
 * loose in the room or carried by the hand; never off a counter (goods for
 * sale are the shop's until they are bought).
 *
 * ⭐ The charcoal is spent — two baskets in the smithy, two at the
 * smelter — and when it is gone the fire goes cold and the quote says so
 * again. That is demand for the fuel trade, not a faucet.
 *
 * Presence-gated (the default): a fire tended for nobody burns its
 * charcoal for nobody. It is lit when somebody is there to want it.
 *
 * config: none.
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import type { Stuff } from '../stuff/Stuff';
import type { Burner } from '../fire/Burner';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

/** A lit fire with less than this in its bed is fed (kg). */
const LOW_FUEL_KG = 1;

export const brain = class {
  static label = 'stokes';
  static kind: TaskKind = 'work';
  static summary =
    'On shift, keeps the house fire going: lays fuel in a cold or ' +
    'failing fire and lights it.';
  static consumes: readonly string[] = ['fuel'];
  static claims: readonly EngagementSlot[] = ['hands'];

  static urgency(ctx: BrainContext): Urgency {
    const job = fireJob(ctx.host);
    if (!job) return new Urgency('idle');
    return new Urgency(
      'wanted',
      job.fire.isLit() ? 'turns to feed the fire' : 'turns to the cold fire',
    );
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    const job = fireJob(host);
    if (!job) return;
    const { fire, fuel } = job;
    const fireStuff = fire as unknown as Stuff;

    // Feed it first when the bed is low — a fire cannot be lit on nothing.
    if (fire.fuelRemaining() < LOW_FUEL_KG && fuel) {
      // ⚠ The name is read BEFORE the stoke: a stoke consumes the item.
      const what = MixinApi.isVisible(fuel) ? fuel.getShortDescription() : 'fuel';
      const fed = fire.stoke(fuel);
      if (fed.ok) {
        MessageApi.scene(host)
          .topic('act.deed')
          .toPeers(
            Mml.compose`${Mml.actor(host)} lays a ${what} in ${Mml.thing(fireStuff)}.`,
          )
          .send();
      }
    }
    if (!fire.isLit() && fire.fuelRemaining() > 0) {
      const lit = fire.ignite();
      if (lit.lit) {
        MessageApi.scene(host)
          .topic('act.deed')
          .toPeers(Mml.compose`${Mml.actor(host)} sets ${Mml.thing(fireStuff)} alight.`)
          .send();
      }
    }
  }
} satisfies BrainStatics;

/**
 * The fire this hand should see to now, and the fuel to feed it — or
 * `null`. On shift and serving here; a fire in this room that is cold
 * (with fuel in its bed or in reach) or lit and nearly out (with fuel in
 * reach).
 */
function fireJob(host: Stuff): { fire: Burner; fuel: Stuff | null } | null {
  if (!MixinApi.isEmployed(host) || !host.isFulfilling()) return null;
  if (!MixinApi.isContainable(host)) return null;
  const room = host.getContainer();
  if (!room || !MixinApi.isContainer(room)) return null;
  const here: Stuff[] = [...room.getContents()];
  let fire: (Stuff & Burner) | null = null;
  for (const t of here) {
    if (MixinApi.isBurner(t)) {
      fire = t;
      break;
    }
  }
  if (!fire) return null;
  const fuel = fuelIn(here, host);
  const low = fire.fuelRemaining() < LOW_FUEL_KG;
  if (fire.isLit()) return low && fuel ? { fire, fuel } : null;
  // Cold: worth the beat if it can be lit — fuel in the bed, or to hand.
  return fire.fuelRemaining() > 0 || fuel ? { fire, fuel } : null;
}

/** The first thing made to burn, loose in the room or carried by the hand. */
function fuelIn(here: readonly Stuff[], host: Stuff): Stuff | null {
  const carried = MixinApi.isContainer(host) ? [...host.getContents()] : [];
  for (const thing of [...carried, ...here]) {
    if (thing === host) continue;
    if (!MixinApi.isTangible(thing)) continue;
    if (thing.getMaterial()?.hasTag('fuel')) return thing;
  }
  return null;
}
