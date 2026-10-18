/**
 * `tends` brain (`/trade/sericulture/behavior/tends`) — ⭐ the motion of a
 * rearing house: a paid hand keeps its trays fed, mounted, harvested and
 * stifled, and sets the crop on the house counter.
 *
 * The `weaves` shape: ONE act per beat (the acts that are engagements —
 * `harvest` — occupy the hands for real time, and a beat that fired
 * several got an engagement conflict for its trouble), furthest along the
 * chain first so finished work clears before new work starts, and every
 * stage guarded so a decline is a beat that does nothing rather than a
 * beat that grinds.
 *
 * Priority each beat, at the loft:
 *  1. stifled cocoons in hand → `put cocoons in counter` (the house's goods,
 *     priced — the mill reeler's errand buys them there);
 *  2. stifled cocoons in the oven → `get cocoons from oven`;
 *  3. unstifled cocoons in hand → light the oven if it is cold, else
 *     `put cocoons in oven`;
 *  4. a tray that has spun → take its cocoons (and its frass, which goes on
 *     the floor for whoever wants it);
 *  5. a tray wandering with nothing to climb → lay a brush in it;
 *  6. a feeding tray short of leaf, with leaf in hand → lay leaf on it;
 *  7. a feeding tray short of leaf, none in hand → `west` to the walk.
 * At the walk: `harvest mulberry` until there is leaf in hand, then `east`.
 *
 * ⚠ The TRAYS are worked by object, not by typed word: a loft has three of
 * them, `tray` resolves to whichever the resolver meets first, and a word
 * that picks the wrong tray is the `spin line` mis-resolution in another
 * hat. Everything with ONE of it in the room — the oven, the counter, the
 * mulberry, the doors — is the literal verb, exactly as a player types it.
 *
 * ⭐ The oven is lit when there is a crop to stifle and not otherwise, by
 * the two calls `stoke`/`light` make (the kernel `stokes` precedent): a
 * fire tended for nobody burns the house's charcoal for nobody.
 *
 * `presenceGated = false`: the house runs while it is LOADED — by a
 * visitor, or the Wharfside reeler walking in to buy — not for an audience
 * (silk D10). Nothing here clones, teleports or decides for the keeper.
 *
 * config: `{ floor, walk, counter }` — template paths.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import { BEHAVIOR_BEAT_TYPE } from '@saxonberg/server/mud/lib/behavior/BehaviorBeat';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import RearingTray from '../thing/RearingTray';
import Cocoons from '../thing/Cocoons';

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

/** A tray with less leaf on it than this (kg) wants more. */
const LOW_LEAF_KG = 0.5;
/** Armfuls a hand carries back from the walk before turning round. */
const ARMFULS = 3;

function isLeaf(s: Stuff): boolean {
  return MixinApi.isTangible(s) && s.getMaterial()?.hasTag('silkworm-fodder') === true;
}

function leafKg(tray: RearingTray): number {
  let kg = 0;
  for (const l of tray.leafOnTray()) kg += MixinApi.isTangible(l) ? l.getMass().rawValue() : 0;
  return kg;
}

function trays(room: Stuff & Container): RearingTray[] {
  return (room.getContents() as Stuff[]).filter((s): s is RearingTray & Stuff => s instanceof RearingTray);
}

function cocoonsIn(holder: Stuff & Container): Cocoons[] {
  return (holder.getContents() as Stuff[]).filter((s): s is Cocoons & Stuff => s instanceof Cocoons);
}

/** The first thing made to burn, loose on the floor or in hand. */
function fuelOn(room: Stuff & Container, hand: Hand): Stuff | null {
  for (const t of [...(hand.getContents() as Stuff[]), ...(room.getContents() as Stuff[])]) {
    if (t === hand) continue;
    if (MixinApi.isTangible(t) && t.getMaterial()?.hasTag('fuel')) return t;
  }
  return null;
}

/**
 * One step through a named exit — the `stocks` walker's shape, through
 * `LocomotionApi` so the mode and engagement bookkeeping are everyone's.
 * ⚠ A forced `west` does not walk an NPC (found by the drive); the
 * locomotion layer does.
 */
async function step(hand: Hand, direction: string): Promise<boolean> {
  const room = hand.getContainer();
  if (!room || !MixinApi.isExitable(room)) return false;
  const exit = (room as Stuff & Exitable).getExits().get(direction);
  if (!exit) return false;
  const moved = await LocomotionApi.traverseWithDefault(hand, exit);
  return moved.ok;
}

/** Move by object, said aloud — the tray acts (see the header). */
function handMoves(hand: Hand, thing: Stuff, to: Stuff & Container, line: string): void {
  if (!MixinApi.isContainable(thing)) return;
  ContainmentApi.move(thing as Stuff & Containable, to);
  MessageApi.scene(hand).topic('act.deed').toPeers(Mml.compose`${Mml.actor(hand)} ${line}`).send();
}

export const brain = class {
  static label = 'tends';
  static kind: TaskKind = 'work';
  static summary = 'Keeps the rearing trays fed and mounted, stifles the crop and sets it out for sale.';
  static discipline = 'sericulture';
  static produces: readonly string[] = ['cocoons'];
  static consumes: readonly string[] = ['leaf'];
  static claims: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'goes along the racks');
  }
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isContainable(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    const hand = host as Hand;
    const { floor: floorPath, walk: walkPath, counter: counterPath } = ctx.config;
    if (typeof floorPath !== 'string' || typeof walkPath !== 'string' || typeof counterPath !== 'string') return;
    // ⚠ Busy means a REAL act in progress. The beat itself claims this
    // brain's slots before `act` runs, so `hasEngagement('hands')` is
    // always true here and the brain never acted (found by the drive).
    if (MixinApi.isEngaged(hand) && hand.getEngagements().some((e) => e.type !== BEHAVIOR_BEAT_TYPE)) return;

    const here = hand.getContainer();
    const at = here?.getTemplatePath() ?? '';
    const carried = hand.getContents() as Stuff[];

    // ---- at the walk: cut leaf, then go back ----
    if (at === walkPath) {
      const armfuls = carried.filter(isLeaf).length;
      if (armfuls >= ARMFULS) {
        await step(hand, 'east');
        return;
      }
      const before = armfuls;
      await hand.forceCommand('harvest mulberry');
      // Nothing came of it (every tree cut) — go back with what there is.
      if ((hand.getContents() as Stuff[]).filter(isLeaf).length <= before) {
        await step(hand, 'east');
      }
      return;
    }
    if (at !== floorPath || !here || !MixinApi.isContainer(here)) return;
    const floor = here as Stuff & Container;

    // 1. Stifled cocoons in hand go on the counter.
    const heldCocoons = carried.filter((s): s is Cocoons & Stuff => s instanceof Cocoons);
    if (heldCocoons.some((c) => c.isStifled())) {
      if (StuffApi.findByTemplatePath(counterPath)) await hand.forceCommand('put cocoons in counter');
      return;
    }

    // 2. Stifled cocoons in the oven come out.
    const oven = (floor.getContents() as Stuff[]).find((s): s is Stuff & Burner & Container =>
      MixinApi.isBurner(s) && MixinApi.isContainer(s),
    );
    if (oven && cocoonsIn(oven).some((c) => c.isStifled())) {
      await hand.forceCommand('get cocoons from oven');
      return;
    }

    // 3. Unstifled cocoons in hand: light the oven, then in they go.
    if (heldCocoons.length > 0) {
      if (!oven) return;
      if (!oven.isLit()) {
        const fuel = fuelOn(floor, hand);
        if (oven.fuelRemaining() <= 0 && fuel) oven.stoke(fuel);
        if (oven.fuelRemaining() > 0 && oven.ignite().lit) {
          MessageApi.scene(hand).topic('act.deed').toPeers(Mml.compose`${Mml.actor(hand)} lights the oven.`).send();
        }
        return;
      }
      await hand.forceCommand('put cocoons in oven');
      return;
    }

    const all = trays(floor);
    // 4. A tray that has spun gives up its crop.
    for (const tray of all) {
      if (tray.hasLiveRearing()) continue;
      const crop = cocoonsIn(tray as unknown as Stuff & Container);
      if (crop.length === 0) continue;
      for (const c of crop) handMoves(hand, c as unknown as Stuff, hand, 'lifts the cocoons off a tray.');
      for (const f of (tray.getContents() as Stuff[]).filter((s) => s.getTemplatePath()?.endsWith('/frass'))) {
        handMoves(hand, f, floor, 'tips the frass out of a tray.');
      }
      return;
    }

    // 5. A wandering tray with nothing to climb gets a brush.
    const brush = (floor.getContents() as Stuff[]).find(
      (s) => MixinApi.isTangible(s) && s.getMaterial()?.hasTag('mounting') === true,
    );
    for (const tray of all) {
      if (tray.getRearingState() !== 'wandering' || tray.hasMounting()) continue;
      if (brush) handMoves(hand, brush, tray as unknown as Stuff & Container, 'stands a bundle of brushwood in a tray.');
      return;
    }

    // 6–7. Feed a hungry tray, or go and cut leaf for it.
    const wanting = all.filter(
      (t) => t.getRearingState() === 'feeding' && !t.isMoulting() && leafKg(t) < LOW_LEAF_KG,
    );
    if (wanting.length === 0) return;
    const leaf = carried.find(isLeaf);
    if (leaf) {
      const tray = wanting[0]!;
      handMoves(hand, leaf, tray as unknown as Stuff & Container, 'lays an armful of leaf along a tray.');
      // The worms are the house hand's work — the cocoons carry the mark.
      tray.noteKeeper(hand.getIdentityPath() ?? '');
      return;
    }
    await step(hand, 'west');
  }
} satisfies BrainStatics;
