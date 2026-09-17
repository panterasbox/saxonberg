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

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Vitals } from '../../../../lib/vitals/Vitals';
import { TRAUMA_BEHAVIOR } from '../../Condition';
import type { Trauma } from '../../Condition';
import { BulkableApi } from '../../../../api/bulk';

// The same topic `treat` and `wash` speak — rinsing is a deed done to a
// body, not a category of its own. (`lint:topics` refuses a key nothing
// authored, which is how a muted-by-default channel gets caught.)
const TOPIC = 'act.deed';

interface RinseModel extends CommandModel {
  patient?: MqlOneResult;
}

export default class RinseController extends CommandController<RinseModel> {
  async execute(model: RinseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Default to yourself — the overwhelmingly common case is that the
    // thing eating you is on you.
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;
    if (!MixinApi.isVitals(target)) {
      return this.fail(context, 'There is nothing there to rinse.', 'no-body');
    }

    // ⭐ Water in reach, before anything else — the refusal a player can
    // act on ("find water") comes before the one they cannot ("you have
    // no caustic"), and before the fight-opening side of anything.
    const water = this.findWater(giver as unknown as Stuff);
    if (water === null) {
      return this.fail(
        context,
        'There is no water here to rinse with.',
        'no-water',
      );
    }

    const active = (target as Stuff & Vitals)
      .getConditions()
      .filter(
        (c): c is Trauma =>
          c.kind === 'trauma' && c.type === 'caustic' && c.agentActive === true,
      );

    if (active.length === 0) {
      const who = self ? 'You have' : 'They have';
      return this.fail(
        context,
        `${who} nothing on them that water would help.`,
        'nothing-to-rinse',
      );
    }

    // ⭐ `resolve` on a caustic means *remove the cause*, not *arrest the
    // bleed* — the same interface, a different act, which is the whole
    // reason `TraumaBehavior.resolve` is on the table rather than in the
    // verb.
    for (const wound of active) {
      TRAUMA_BEHAVIOR.caustic.resolve(target as Stuff & Vitals, wound);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You sluice the water over it until the burning stops. It still hurts — but it has stopped getting worse.`
          : Mml.compose`You sluice water over ${Mml.thing(target)} until the burning stops.`,
      )
      .toPeers(
        self
          ? Mml.compose`${Mml.actor(giver)} sluices water over themselves.`
          : Mml.compose`${Mml.actor(giver)} sluices water over ${Mml.thing(target)}.`,
      )
      .send();
  }

  /**
   * Any reachable bulk holder whose matter is tagged `water` — carried
   * or in the room, a jug as good as a basin. The `WashController` read,
   * repeated rather than shared: a `BulkableApi.findWater(giver)` would
   * be an Api static taking a world object, which is the OO antipattern
   * `lint:object-verbs` holds at zero.
   */
  private findWater(giver: Stuff): Stuff | null {
    const candidates: Stuff[] = [];
    if (MixinApi.isContainer(giver)) candidates.push(...giver.getContents());
    if (MixinApi.isContainable(giver)) {
      const loc = giver.getContainer();
      if (loc && MixinApi.isContainer(loc)) candidates.push(...loc.getContents());
    }
    for (const c of candidates) {
      if (!MixinApi.isBulkable(c) || MixinApi.isCrafted(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty()) continue;
      const m = slot.getMaterial();
      if (m?.hasTag('water')) return c;
    }
    return null;
  }

  private fail(
    context: CommandContext,
    line: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({
      kind: 'controller-rejected',
      reason,
      detail: line,
    });
  }
}
