/**
 * ButcherController — `butcher <animal>`, and ⭐ **it is sober and
 * complete** (D28).
 *
 * It exists because the cooking chain needs protein and nothing produced
 * any. It is work, it takes skill, and **the animal is used entirely** —
 * meat and offal to cooking, tallow to the shipped render pot, hide to
 * leather, bone and horn to crafting.
 *
 * > **Make waste the thing that feels bad, not the killing.**
 *
 * No minigame, no guilt meter, no confirmation ritual. The density dial
 * does the rest unaided: **a number in the herdbook is easy to cull and
 * an animal you named is not**, and that is a fact about the player
 * rather than a mechanic anybody has to author.
 *
 * ⚠ **What comes off is the ANIMAL's**, scaled by its condition and its
 * frame. A thin beast dresses out light, which is why condition is worth
 * something at the end as well as along the way — and why *"finish it
 * before you kill it"* is a thing a player works out rather than reads.
 *
 * ⚠ It is a terminal act on the object AND on the record: a butchered
 * head leaves the tally, because it is not coming back.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import HerdRegistry from '../../HerdRegistry';
import { RANCHING_TOPIC, HERD_REGISTRY_PATH } from './DraftController';
import { STOCKMANSHIP } from './HandleController';
import type Livestock from '../../../agent/Livestock';

/**
 * ⭐ **The whole carcass, and every part goes somewhere that already
 * exists.** Fractions of live weight, and they are roughly the real
 * ones: a beef carcass dresses out around 60 %, the hide is about 7 %,
 * fat around 5 %, and bone the rest of what is not meat.
 */
const YIELDS: ReadonlyArray<{ row: string; fraction: number; what: string }> = [
  { row: '/stuff/idea/material/food/stew-meat', fraction: 0.42, what: 'meat' },
  { row: '/trade/ranching/thing/tallow', fraction: 0.05, what: 'tallow' },
  { row: '/trade/ranching/thing/hide', fraction: 0.07, what: 'a hide' },
  { row: '/trade/ranching/thing/bone', fraction: 0.12, what: 'bone' },
];

interface ButcherModel extends CommandModel {
  target?: MqlOneResult;
}

export default class ButcherController extends CommandController<ButcherModel> {
  async execute(model: ButcherModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const animal = model.target?.stuff as Livestock | undefined;
    if (!animal || typeof animal.getHandling !== 'function') {
      this.decline(context, Mml.compose`That is not something you butcher.`, 'not-livestock');
      return;
    }

    const liveMass = animal.getMass().rawValue();
    // ⚠ Condition scales the dressing percentage, because it does: a
    // beast in poor flesh is bone and hide and not much else.
    const flesh = animal.getReserve('flesh')?.current.rawValue() ?? 55;
    const finish = clamp01(0.55 + (flesh - 30) / 90);

    const parts: string[] = [];
    for (const cut of YIELDS) {
      const mass = liveMass * cut.fraction * (cut.what === 'meat' ? finish : 1);
      if (mass < 0.05) continue;
      const thing = await this.mint(cut.row, mass, giver);
      if (thing) parts.push(cut.what);
    }

    // The record first, then the object — a head that leaves the tally
    // and an object that is destructed, in that order, so a failed write
    // never loses an animal that is still in the book.
    const herdId = animal.getHerdId?.() ?? '';
    const index = animal.getHeadIndex?.() ?? -1;
    if (herdId && index >= 0) {
      const registry = await this.registry();
      const herd = await registry.read(herdId);
      if (herd) {
        await registry.returnHead(herdId, index, {
          note: 'butchered',
        });
        const back = await registry.read(herdId);
        if (back) await registry.update({ ...back, tally: Math.max(0, back.tally - 1) });
      }
    }

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        parts.length === 0
          ? Mml.compose`There was less on it than you hoped. You get almost nothing off it.`
          : Mml.compose`It is quick, and then it is a long afternoon's work. Nothing is wasted: ${parts.join(', ')}.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} works over a carcass, taking it apart properly.`)
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: STOCKMANSHIP,
        difficulty: 'hard',
        outcome: 'success',
      });
    }
    StuffApi.destruct(animal as unknown as Stuff);
  }

  private async mint(row: string, mass: number, giver: Stuff): Promise<Stuff | null> {
    let thing: Stuff;
    try {
      thing = await StuffApi.clone<Stuff>(row);
    } catch {
      // ⚠ A missing cut row is a content gap, not a reason to lose the
      // rest of the carcass. The others still come off.
      return null;
    }
    (thing as unknown as { setMass?(q: Quantity<'kg'>): void }).setMass?.(
      Quantity.of(Math.round(mass * 100) / 100, 'kg'),
    );
    const where = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (where && MixinApi.isContainer(where)) {
      ContainmentApi.move(thing as Stuff & Containable, where as Stuff & Container);
    }
    return thing;
  }

  protected async registry(): Promise<HerdRegistry> {
    const resident = StuffApi.findByTemplatePath<HerdRegistry>(HERD_REGISTRY_PATH);
    if (resident) return resident;
    return StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
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

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
