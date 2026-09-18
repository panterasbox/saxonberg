/**
 * OfferEngagement — ⭐⭐ **the taming scene: hold still, and it comes.**
 *
 * The `approach` rung of an offer (`Bonded.offerRung`). The offerer holds
 * the food out for `APPROACH_MS`; this occupies their `hands` for that
 * long — the same shape as `search` — and at completion the animal
 * decides, on the world as it is THEN: same room, food still in hand,
 * still willing. Keep still and it takes it from your hand, with all the
 * credit a hand-feed earns. Walk out, hand the food to somebody, `cancel`,
 * and it never came.
 *
 * ⭐ This is the rung every kept animal is tamed on, and before this the
 * offer was a gate that resolved in zero time: a flighty animal either
 * took food from a stranger's hand at once or the food went on the floor.
 * There was no moment in which the animal decided about YOU. Now there
 * is one, and what you do during it is the whole of it.
 *
 * ⚠ Lazy revalidation, like every v1 activity (`activity.md`): nothing
 * watches you mid-beat. Movement is not an engagement in this game, so a
 * step out of the room is caught at completion, not the moment you take
 * it — the animal "notices" when the beat lands, which for a six-second
 * beat is the same thing.
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { DurativeActivity } from '../../api/scheduler';
import type { Bonded } from './Bonded';
import { APPROACH_MS } from './Bonded';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

export const OFFER_ENGAGEMENT_TYPE = 'offer' as const;
const OFFER_SLOTS: readonly EngagementSlot[] = ['hands'];
const TOPIC = 'act.deed';

export interface OfferEngagementOptions {
  actor: Stuff & Engaged;
  animal: Stuff & Bonded;
  food: Stuff;
}

export class OfferEngagement implements DurativeActivity {
  engagementId = '';
  readonly type = OFFER_ENGAGEMENT_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot> = new Set(OFFER_SLOTS);
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration = APPROACH_MS;
  readonly replaceableBy: readonly string[] = [];

  private readonly animal: Stuff & Bonded;
  private readonly food: Stuff;

  constructor(opts: OfferEngagementOptions) {
    this.actor = opts.actor;
    this.animal = opts.animal;
    this.food = opts.food;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  /**
   * The animal decides now, on the world as it is now. Every way of it
   * not working out reads the same — *it does not come* — because the
   * reason (you moved, you gave the food away, it stopped being hungry)
   * is yours to work out by watching, the same rule as a refusal.
   */
  onComplete(): void {
    const actor = this.actor as unknown as Stuff;
    const here = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    const animalHere = MixinApi.isContainable(this.animal)
      ? this.animal.getContainer()
      : null;
    const holding =
      MixinApi.isContainable(this.food) && this.food.getContainer() === actor;
    const stillHere = !!here && here === animalHere;
    if (!stillHere || !holding || this.animal.wouldEat(this.food)) {
      this.tellNotCome();
      return;
    }
    // Sequenced after the completion frame, so the meal's own scene lands
    // on a settled world; a failed ingest reads as not coming.
    void this.animal.eatFood(this.food, actor).then((ate) => {
      if (!ate) {
        this.tellNotCome();
        return;
      }
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.actor(this.animal)} comes to you and takes it from your hand.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(this.animal)} comes to ${Mml.actor(actor)} and takes food from their hand.`,
        )
        .send();
    });
  }

  onAbort(reason: AbortReason): void {
    // A replaced/host-destroyed abort has its own story to tell; a cancel
    // or a precondition failure is the offerer's doing, and reads as the
    // animal's answer.
    if (reason === 'host-destroyed' || reason === 'thrown') return;
    this.tellNotCome();
  }

  getHost(): Stuff | null {
    return this.animal as unknown as Stuff;
  }

  private tellNotCome(): void {
    const actor = this.actor as unknown as Stuff;
    if (this.animal.isDestroyed()) return;
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`${Mml.actor(this.animal)} does not come.`)
      .toPeers(
        Mml.compose`${Mml.actor(this.animal)} does not go to ${Mml.actor(actor)}.`,
      )
      .send();
  }
}
