/**
 * TapController — the shared base for `milk`, `shear` and `gather`.
 *
 * ⭐ **Three verbs, one act, three different failures.** What they share
 * is the whole of the mechanism: point at an animal, take what is
 * standing in one of its taps, mint it, and reset the neglect clock.
 * What differs is entirely in the tap's authored `behaviour`, and that
 * is the design working — a fourth product (honey, down, dung) is a row
 * on a species and a fifteen-line subclass.
 *
 * ⚠⚠ **Nothing here mints from nothing.** What a take produces is what
 * the reconcile put there, and the reconcile filled it out of the
 * production slice of the animal's own energy budget. An animal in poor
 * flesh gives less, and one that has been living on air gives nothing —
 * which is not a punishment, it is conservation.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { TapSpec } from '@saxonberg/server/mud/platform/idea/species/Species';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { RANCHING_TOPIC } from './DraftController';
import { STOCKMANSHIP } from './HandleController';
import type Livestock from '../../../agent/Livestock';

export interface TapModel extends CommandModel {
  target?: MqlOneResult;
}

export abstract class TapController extends CommandController<TapModel> {
  /** Which tap this verb takes from. */
  protected abstract tapKey(): string;

  /** What the actor sees when there is nothing standing. */
  protected abstract emptyPhrase(animal: Livestock): ReturnType<typeof Mml.compose>;

  /** What the actor sees on a successful take. */
  protected abstract takePhrase(
    animal: Livestock,
    units: number,
    got: Stuff | null,
  ): ReturnType<typeof Mml.compose>;

  async execute(model: TapModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const animal = model.target?.stuff as Livestock | undefined;
    if (!animal || typeof animal.takeFrom !== 'function') {
      this.decline(context, Mml.compose`That is not an animal that gives anything.`, 'not-producing');
      return;
    }
    const key = this.tapKey();
    const tap = animal.taps().find((t) => t.key === key);
    if (!tap) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(animal as unknown as Stuff)} does not give that.`,
        'no-such-tap',
      );
      return;
    }
    if (animal.isDriedOff(key)) {
      // ⚠ The slope, named. Not a punishment and not permanent — a
      // lactation, which is a season, and the next one is unaffected.
      this.decline(
        context,
        Mml.compose`She has dried off. Nothing will come of it this lactation; you will have to wait for the next.`,
        'dried-off',
      );
      return;
    }
    const units = animal.standingIn(key);
    if (units <= 0.01) {
      this.decline(context, this.emptyPhrase(animal), 'nothing-standing');
      return;
    }

    const taken = animal.takeFrom(key);
    const got = await this.mint(tap, taken, giver);
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(this.takePhrase(animal, taken, got))
      .toPeers(
        Mml.compose`${Mml.actor(giver)} works over one of the animals for a while.`,
      )
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: STOCKMANSHIP,
        // The animal decides how hard it was, at the moment of the act.
        difficulty: animal.getHandling() < 0.35 ? 'hard' : 'standard',
        outcome: 'success',
      });
    }
  }

  /**
   * Mint what came out. ⭐ Its MASS is the take, so how much a beast
   * gives is the beast's answer rather than a number somebody typed.
   */
  protected async mint(
    tap: TapSpec,
    units: number,
    giver: Stuff,
  ): Promise<Stuff | null> {
    let thing: Stuff;
    try {
      thing = await StuffApi.clone<Stuff>(tap.yieldRow);
    } catch {
      return null;
    }
    (thing as unknown as { setMass?(q: Quantity<'kg'>): void }).setMass?.(
      Quantity.of(round2(units), 'kg'),
    );
    if (MixinApi.isContainer(giver)) {
      ContainmentApi.move(thing as Stuff & Containable, giver as Stuff & Container);
    }
    return thing;
  }

  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
