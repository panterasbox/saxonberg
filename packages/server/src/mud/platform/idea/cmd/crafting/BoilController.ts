/**
 * BoilController — `boil [<vessel>]`, **the actionable half of the John
 * Snow lesson**.
 *
 * Bring a vessel of water to a fire, hold it at a rolling boil, and what
 * comes off is fit to drink. Second rung of the counterplay ladder:
 *
 *  1. **move your intake** upstream of the outfall — free, and
 *     historically the first real answer anybody found;
 *  2. **boil** — personal, per-use, and it costs fuel and time *every
 *     single time*, which is exactly why a town eventually pays for
 *  3. **treatment** — capital, systemic, and an attribute of a conduit.
 *
 * ⭐ **Boiling does not fix everything, and the failure is the lesson.**
 * It is a change of *material*, from whatever the vessel holds to
 * whatever that material declares it becomes (`purifiedByBoiling`). A
 * material that declares no counterpart just gets hot — so boiling a
 * lead-fouled river gives you hot lead-fouled river, and the player who
 * tries it has learned the difference between organic and persistent
 * contamination the way it is actually learned.
 *
 * A material swap rather than a mutation because a `Material` is a
 * **shared reference Idea**: one row backs every litre of that stuff in
 * the world, so purifying by editing the material would clean every
 * river at once.
 *
 * See [docs/subsystems/watershed.md].
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type Material from '../../../../lib/material/Material';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { ThermalApi } from '../../../../api/thermal';

const TOPIC = 'act.deed';

interface BoilModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class BoilController extends CommandController<BoilModel> {
  async execute(model: BoilModel, ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver;
    const vessel = (model.vessel?.stuff ?? null) as Stuff | null;

    if (vessel === null || !MixinApi.isBulkable(vessel)) {
      this.decline(ctx, 'no-vessel', Mml.compose`Boil what?`);
      return;
    }

    const slot = vessel.getBulk();
    if (slot.isEmpty()) {
      this.decline(
        ctx,
        'empty-vessel',
        Mml.compose`${Mml.thing(vessel)} is empty.`,
      );
      return;
    }

    const material = slot.getMaterial();
    if (material === null) {
      this.decline(
        ctx,
        'unknown-contents',
        Mml.compose`You can't tell what is in ${Mml.thing(vessel)}.`,
      );
      return;
    }

    // A fire, and a hot enough one. The boiling point is the material's
    // own — no dial, no threshold table.
    const reachableK = ThermalApi.reachableHeatFor(giver);
    const boilK = material.getBoilingPoint().rawValue();
    if (reachableK <= 0) {
      this.decline(
        ctx,
        'no-heat',
        Mml.compose`There's no fire here to boil anything on.`,
      );
      return;
    }
    if (boilK > 0 && reachableK < boilK) {
      this.decline(
        ctx,
        'insufficient-heat',
        Mml.compose`The fire isn't hot enough to bring ${Mml.thing(vessel)} to a boil.`,
      );
      return;
    }

    const intoPath = material.getPurifiedByBoiling();
    if (intoPath === '') {
      // ⭐ The lesson, delivered as a non-event. Nothing is refused —
      // you really did boil it — but nothing improved either.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You bring ${Mml.thing(vessel)} to a rolling boil. It is exactly as it was, only hotter.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} boils ${Mml.thing(vessel)}.`,
        )
        .send();
      return;
    }

    const purified = await StuffApi.singleton<Material>(intoPath);
    slot.setMaterial(purified);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You hold ${Mml.thing(vessel)} at a rolling boil until it is fit to drink.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} boils ${Mml.thing(vessel)}.`)
      .send();
  }

  /** One decline shape — a note for the envelope, a sentence for the player. */
  private decline(
    ctx: CommandContext,
    reason: string,
    line: ReturnType<typeof Mml.compose>,
  ): void {
    ctx.note({ kind: 'controller-rejected', reason, detail: reason });
    MessageApi.scene(ctx.commandGiver).topic(TOPIC).toSelf(line).send();
  }
}
