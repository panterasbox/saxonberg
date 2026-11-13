/**
 * RinseController — ⭐⭐ **stop the wound that is still happening.**
 *
 * A caustic is the one injury in the game that keeps working after it
 * lands: `CAUSTIC_BEHAVIOR.tick` grows its severity every game-second
 * while `agentActive` is true. Everything else in the trauma table is a
 * record of something that already finished. So the act that matters is
 * not applying a treatment — it is **removing the cause**, and the only
 * thing that does it is water.
 *
 * ⚠⚠ **Why this is its own verb and not a second stanza on `wash`.**
 * `wash`'s argument is `requires: CraftedMixin` (a glass), and widening
 * it to `CraftedMixin|VitalsMixin` would DELETE a check — an arg
 * alternation is how two different verbs get quietly collapsed into one
 * that validates neither (see antipatterns.md). A second view claiming
 * the `wash` verb would shadow the first silently, which
 * `lint:verb-collisions` exists to catch. So: a verb of its own, afforded
 * by the same `WaterFixture` in the same `peers` bucket, so you learn it
 * by standing at a basin exactly as you learn `wash`.
 *
 * ⭐ The controller stays more permissive than the affordance, which is
 * the shipped `WashController` rule: what makes it DISCOVERABLE is a
 * fixture, and what makes it WORK is **water in reach** — a basin, a tap,
 * or a jug you are carrying. ⚠ The first cut of this file never looked
 * for any: it said "you sluice the water over it" while checking nothing,
 * so a carried jug let you `wash` a glass and not rinse your own foot.
 * `findWater` is the same read `wash` makes.
 *
 * → What removes a caustic is a fact about the AGENT, not about this
 * verb — quicklime wants flooding (a little water slakes it and cooks
 * you), an acid wants a base, and spirit does nothing to either. That is
 * `Material.neutralizedBy`, the `corrosiveTo` shape run the other way,
 * and it is the treatment build's (pharma-slate § the right substance).
 * Until then, water is the one thing this verb knows.
 */

import { ElementTreatmentControllerBase, type ElementTreatmentModel } from './ElementTreatmentControllerBase';
import type { CommandContext } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface RinseModel extends ElementTreatmentModel {
  water?: MqlManyResult;
}

export default class RinseController extends ElementTreatmentControllerBase<RinseModel> {
  async execute(model: RinseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Default to yourself — the overwhelmingly common case is that the
    // thing eating you is on you.
    const patient = this.patientOf(model, context, 'There is nothing there to rinse.');
    if (!patient) return;
    const { target, self } = patient;

    // ⭐ Water in reach, before anything else — the refusal a player can
    // act on ("find water") comes before the one they cannot ("you have
    // no caustic"). The source answers (`WaterDrawable`).
    const water = await RinseController.firstWater(model.water, giver as unknown as Stuff);
    if (water === 'frozen') {
      return this.fail(context, 'The water is frozen over; you would need a hole.', 'frozen');
    }
    if (water !== 'found') {
      return this.fail(context, 'There is no water here to rinse with.', 'no-water');
    }

    // ⭐ The body knows which caustic is still working; rinsing removes
    // the cause (`TraumaBehavior.resolve` on a caustic), not the wound.
    await this.treatWith(context, target, 'rinse', `${self ? 'You have' : 'They have'} nothing on them that water would help.`, {
      self: self
        ? Mml.compose`You sluice the water over it until the burning stops. It still hurts — but it has stopped getting worse.`
        : Mml.compose`You sluice water over ${Mml.thing(target)} until the burning stops.`,
      peers: self
        ? Mml.compose`${Mml.actor(giver)} sluices water over themselves.`
        : Mml.compose`${Mml.actor(giver)} sluices water over ${Mml.thing(target)}.`,
    });
  }
}
