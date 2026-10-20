/**
 * `reels` brain (`/trade/sericulture/behavior/reels`) — ⭐ the mill's
 * reeler: cocoons off the crib, reeled at the basin, thrown at the wheel,
 * woven at the loom, and the cloth into the silk stock.
 *
 * The `weaves` shape over the silk chain: ONE engaged act per beat,
 * furthest along first (the loom before the wheel before the basin), each
 * stage taken only when the input for it is in hand — an act whose input is
 * absent MIS-RESOLVES to the nearest thing that answers, which is how the
 * linen floor once deadlocked on `spin line`. So every word here is one
 * nothing else on this floor answers to: `hank` (raw silk), `yarn` (only
 * the reeler's silk yarn is in the reeler's hands), `crib` (the cocoon
 * store), `silks` (the silk stock).
 *
 * ⭐ The reeling basin wants hot water: when the brazier beside it is cold
 * the reeler lights it, by the two calls `stoke`/`light` make (the kernel
 * `stokes` precedent), with the floor's charcoal.
 *
 * ⚠ The reeler's stock is bought, not minted: its `stocks` beat walks to
 * the silk house and buys cocoons there; this beat only works what is on
 * the crib. Nothing here clones; nothing here teleports — a reeler away on
 * an errand simply does nothing this beat.
 *
 * config: `{ floor, bin, stock, count? }` — template paths (`bin` the
 * cocoon crib), and the
 * cocoons-to-the-thread the reeler reels at (default 8).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
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

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

const COCOONS = '/trade/sericulture/thing/cocoons';
const RAW_SILK = '/trade/sericulture/thing/raw-silk';
const YARN = '/trade/textiles/thing/yarn';
const BOLT = '/trade/textiles/thing/bolt';

/** The controllers' own charges, read only to decide WHETHER to act. */
const REEL_CHARGE = 40;
const SPIN_CHARGE = 2;
const WEAVE_CHARGE = 4;
const DEFAULT_COUNT = 8;

function held(hand: Hand, path: string): number {
  let n = 0;
  for (const s of hand.getContents() as Stuff[]) {
    if (s.getTemplatePath() !== path) continue;
    n += MixinApi.isStackable(s) ? s.getQuantity() : 1;
  }
  return n;
}

function onHand(holder: Stuff | null | undefined, path: string): number {
  if (!holder || !MixinApi.isContainer(holder)) return 0;
  let n = 0;
  for (const s of holder.getContents() as Stuff[]) {
    if (s.getTemplatePath() !== path) continue;
    n += MixinApi.isStackable(s) ? s.getQuantity() : 1;
  }
  return n;
}

export const brain = class {
  static label = 'reels';
  static kind: TaskKind = 'work';
  static summary = 'Reels silk off the cocoons at the basin, throws it and weaves it.';
  static discipline = 'textiles';
  static produces: readonly string[] = ['cloth'];
  static consumes: readonly string[] = ['cocoons'];
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  /**
   * ⭐ PRESSING when there is silk work in reach — a reeling's worth on the
   * crib or in hand, raw silk to throw, yarn to weave, cloth to shelve —
   * and idle otherwise. The reeler also runs `stocks` and `consigns`, and
   * with one deliberation beat per agent the brains have to say when they
   * have nothing to do, or the first one listed does everything (found by
   * the drive).
   */
  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (!MixinApi.isContainer(host)) return new Urgency('idle');
    const hand = host as Hand;
    // ⚠ Away from the floor (stranded on an errand) the work is not hers to
    // do — and a brain that won every beat while doing nothing would keep
    // `stocks` from ever walking her home.
    if (!MixinApi.isContainable(hand) || hand.getContainer()?.getTemplatePath() !== ctx.config.floor) {
      return new Urgency('idle');
    }
    const bin = typeof ctx.config.bin === 'string' ? StuffApi.findByTemplatePath(ctx.config.bin) : null;
    const work =
      held(hand, YARN) >= WEAVE_CHARGE ||
      held(hand, RAW_SILK) >= SPIN_CHARGE ||
      held(hand, BOLT) > 0 ||
      held(hand, COCOONS) + onHand(bin, COCOONS) >= REEL_CHARGE;
    return work ? new Urgency('pressing', 'bends over the basin') : new Urgency('idle');
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
    const { floor: floorPath, bin: cribPath, stock: stockPath } = ctx.config;
    if (typeof floorPath !== 'string' || typeof cribPath !== 'string' || typeof stockPath !== 'string') return;
    const floor = hand.getContainer();
    // Away on an errand — this beat is not the reeler's.
    if (!floor || floor.getTemplatePath() !== floorPath || !MixinApi.isContainer(floor)) return;
    // ⚠ Busy means a REAL act in progress. The beat itself claims this
    // brain's slots before `act` runs, so `hasEngagement('hands')` is
    // always true here and the brain never acted (found by the drive).
    if (MixinApi.isEngaged(hand) && hand.getEngagements().some((e) => e.type !== BEHAVIOR_BEAT_TYPE)) return;
    const count =
      typeof ctx.config.count === 'number' && ctx.config.count > 0 ? Math.round(ctx.config.count) : DEFAULT_COUNT;

    // The loom before the wheel before the basin.
    if (held(hand, YARN) >= WEAVE_CHARGE) {
      await hand.forceCommand('weave yarn');
    } else if (held(hand, RAW_SILK) >= SPIN_CHARGE) {
      await hand.forceCommand('spin hank');
    } else if (held(hand, COCOONS) >= REEL_CHARGE) {
      const fire = (floor.getContents() as Stuff[]).find((s): s is Stuff & Burner => MixinApi.isBurner(s));
      if (fire && !fire.isLit()) {
        const fuel = (floor.getContents() as Stuff[]).find(
          (s) => MixinApi.isTangible(s) && s.getMaterial()?.hasTag('fuel') === true,
        );
        if (fire.fuelRemaining() <= 0 && fuel) fire.stoke(fuel);
        if (fire.fuelRemaining() > 0 && fire.ignite().lit) {
          MessageApi.scene(hand)
            .topic('act.deed')
            .toPeers(Mml.compose`${Mml.actor(hand)} lights the fire under the basin.`)
            .send();
        }
        return;
      }
      await hand.forceCommand(`reel cocoons --count ${count}`);
    } else {
      // ⚠ Off the crib by OBJECT: bought cocoons are one titled unit apiece
      // and never stack, so `get 40 cocoons` names forty things the
      // resolver will not hand over as one (found by the drive).
      const crib = StuffApi.findByTemplatePath(cribPath);
      if (crib && MixinApi.isContainer(crib) && onHand(crib, COCOONS) >= REEL_CHARGE - held(hand, COCOONS)) {
        for (const c of crib.getContents() as Stuff[]) {
          if (held(hand, COCOONS) >= REEL_CHARGE) break;
          if (c.getTemplatePath() !== COCOONS || !MixinApi.isContainable(c)) continue;
          ContainmentApi.move(c as Stuff & Containable, hand);
        }
        MessageApi.scene(hand).topic('act.deed').toPeers(Mml.compose`${Mml.actor(hand)} scoops cocoons out of the crib.`).send();
      }
    }

    // Shelve the cloth — `put` is not an engagement. The silk stock is a
    // prop of this floor; until it stands, the cloth stays in hand.
    if (!StuffApi.findByTemplatePath(stockPath)) return;
    for (let i = 0; i < 4 && held(hand, BOLT) > 0; i++) {
      const before = held(hand, BOLT);
      await hand.forceCommand('put bolt in silks');
      if (held(hand, BOLT) >= before) break;
    }
  }
} satisfies BrainStatics;
