/**
 * PutController — `put X (in|on) Y`.
 *
 * Preposition-aware dispatch: `put X in Y` routes to
 * `ContainmentApi.move`, `put X on Y` routes to
 * `ContainmentApi.placeOn`. The YAML's `prepositions: [in, on]` on
 * the `target` field lands the consumed preposition on
 * `model.target.prep`; the controller branches on that.
 *
 * When no preposition is typed, the controller infers mode from the
 * target's capabilities (Container → in, Surfaced → on). A target
 * composing BOTH (a desk-with-drawer) is ambiguous — the
 * controller rejects with a `put it in or on X?` prompt.
 *
 * The field-level `mustBePutTarget` validator already gated the
 * target as Container OR Surfaced, so the `wrong-preposition`
 * branch fires only when the typed preposition contradicts the
 * target's actual shape.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Surfaced } from '../../lib/spatial/Surfaced';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

interface PutModel extends CommandModel {
  item: MqlOneResult;
  target: MqlOneResult;
}

export class PutController extends CommandController<PutModel> {
  execute(model: PutModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const item = model.item.stuff;
    const target = model.target.stuff;

    if (!item) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You don't have any '${model.item.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'item',
        query: model.item.raw,
      });
      return;
    }
    if (!target) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    // Preposition: 'in' | 'on' | undefined. The matcher lowercased it
    // when consuming.
    const prep = model.target.prep;
    const mode = prep ?? this.inferMode(target);
    if (!mode) {
      // No preposition AND target composes both Container and
      // Surfaced — ambiguous. Reject; ask the player to specify.
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`Put it in or on ${Mml.item(target)}?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'preposition-ambiguous',
        detail: 'target accepts both in and on',
      });
      return;
    }

    if (mode === 'in') {
      if (!MixinApi.isContainer(target)) {
        MessageApi.scene(giver)
          .topic(MessageApi.Topics.world.perception.inventory)
          .toSelf(Mml.compose`You can't put things in ${Mml.item(target)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'wrong-preposition',
          detail: `target not a Container; cannot 'in'`,
        });
        return;
      }
    } else {
      // mode === 'on'
      if (!MixinApi.isSurfaced(target)) {
        MessageApi.scene(giver)
          .topic(MessageApi.Topics.world.perception.inventory)
          .toSelf(Mml.compose`You can't put things on ${Mml.item(target)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'wrong-preposition',
          detail: `target not a Surfaced; cannot 'on'`,
        });
        return;
      }
      if (!(target as Stuff & Surfaced).canRest(item as Stuff & Containable)) {
        MessageApi.scene(giver)
          .topic(MessageApi.Topics.world.perception.inventory)
          .toSelf(Mml.compose`${Mml.item(item)} won't rest on ${Mml.item(target)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cannot-rest',
          detail: 'host rejected item',
        });
        return;
      }
    }

    // Branch to the correct primitive based on resolved mode. Two
    // distinct calls — each does one thing — preserving
    // ContainmentApi.move's existing contract.
    if (mode === 'in') {
      ContainmentApi.move(
        item as Stuff & Containable,
        target as Stuff & Container,
      );
    } else {
      ContainmentApi.placeOn(
        item as Stuff & Containable,
        target as Stuff & Surfaced,
      );
    }

    // `mode` is narrowed to 'in' | 'on' at this point; use it as the
    // preposition verbatim.
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You put ${Mml.item(item)} ${mode} ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} puts ${Mml.item(item)} ${mode} ${Mml.item(target)}.`,
      )
      .send();
  }

  private inferMode(target: Stuff): 'in' | 'on' | null {
    const isContainer = MixinApi.isContainer(target);
    const isSurfaced = MixinApi.isSurfaced(target);
    if (isContainer && !isSurfaced) return 'in';
    if (isSurfaced && !isContainer) return 'on';
    // Both → ambiguous; neither shouldn't happen (validator gates).
    return null;
  }
}
