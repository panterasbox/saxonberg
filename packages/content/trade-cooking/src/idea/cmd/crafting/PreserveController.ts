/**
 * PreserveController — the shared body of the preserving acts
 * (`cure` / `dry` / `smoke`).
 *
 * ⭐ **One act, three treatments, and the difference is entirely a recipe
 * row.** Each subclass names a recipe id and nothing else; what the
 * treatment *does* to the food is the recipe's `cure: { moisture?,
 * solute? }` block, which the craft applies to the output's water state.
 * A fourth treatment — brining, sugaring, a pack's own smoke chamber — is
 * a recipe and a six-line subclass, and a fourth *strength* of an existing
 * one is a recipe alone.
 *
 * ⚠ **Deliberately NOT deed-gated**, unlike `cook`. The can-make deed is
 * earned by working a recipe faithfully by hand once, and the cooking
 * branch's by-hand path banks contributions into a pot — which is the
 * wrong shape for a transform that turns one discrete cut into another.
 * A gate whose key does not exist is a lock, so these follow `order`
 * rather than `cook`. When a by-hand preserving path lands, the gate is
 * one `requireDeed` call away.
 *
 * The target is **named and honoured**: `dry the cut I just salted` has to
 * reach that cut, or the hurdles could never be stacked deliberately. It
 * rides `CraftRequest.target`, which prefers it for any input slot it
 * satisfies.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';

export interface PreserveModel extends CommandModel {
  target?: MqlOneResult;
}

export abstract class PreserveController<
  M extends PreserveModel = PreserveModel,
> extends CraftController<M> {
  /** The recipe this act resolves. */
  protected abstract recipeId(): string;

  /** `You <verb> …` — the first person half of the scene. */
  protected abstract selfLine(output: Stuff): ReturnType<typeof Mml.compose>;

  /** `<Actor> <verbs> …` — what the room sees. */
  protected abstract peerLine(
    actor: Stuff,
    output: Stuff,
  ): ReturnType<typeof Mml.compose>;

  async execute(model: M, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target?.stuff ?? null;

    if (model.target && !named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    const outcome = await CraftingApi.craft({
      recipeRef: this.recipeId(),
      makerMode: 'self',
      ...(named ? { target: named } : {}),
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    const output = outcome.output;
    if (MixinApi.isContainable(output) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(output, giver);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(this.selfLine(output))
      .toPeers(this.peerLine(giver, output))
      .send();
  }
}
