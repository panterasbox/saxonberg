/**
 * PutController — `put X (in|on) Y`.
 *
 * Preposition-aware dispatch: `put X in Y` routes to
 * `ContainmentApi.move`, `put X on Y` routes to
 * `ContainmentApi.placeOn`, and `put X in Y` where X fits an open SLOT
 * on Y routes to `Slotted.occupy` (after the containment move — the
 * `plant`/`repot` order). The YAML's `prepositions: [in, on]` on
 * the `target` field lands the consumed preposition on
 * `model.target.prep`; the controller branches on that.
 *
 * When no preposition is typed, the controller infers mode from the
 * target's capabilities (Container → in, Surfaced → on). A target
 * composing BOTH (a desk-with-drawer) is ambiguous — the
 * controller rejects with a `put it in or on X?` prompt.
 *
 * The field-level `requires: ContainerMixin|SurfacedMixin` already gated the
 * target as Container OR Surfaced, so the `wrong-preposition`
 * branch fires only when the typed preposition contradicts the
 * target's actual shape.
 *
 * ## ⭐ The slot branch, and why it is `put` (TPA reform, flag 1)
 *
 * **Nothing in the game could put anything into a non-body slot by any
 * verb.** `wear` / `wield` are body slots; `plant` / `repot` are the
 * plant slot; `mount` is conveyance; the whole shipped `device`
 * category (`arm · disarm · douse · fold · ignite · pump · switch ·
 * unfold`) drives no slot at all. That is a hole in the slot substrate,
 * not a requirement of any one build — so it is fixed once, here, and
 * every slot-bearing fixture anyone authors gets it: a battery bay, a
 * lamp's oil reservoir, a mill's replaceable stone.
 *
 * Three conditions, all checked, and each one is load-bearing:
 *
 * 1. **The target is not a body** (`!isVitals`). Dressing someone else
 *    is not `put`, and the two verbs that do body slots already exist.
 * 2. **The target is a Container.** A part that goes into a machine has
 *    to physically BE somewhere, and the slot is occupancy, not
 *    containment — so contents move first and the slot claims second,
 *    exactly as `plant` does into a pot. A Slotted host that is not a
 *    Container has nowhere for the part to sit, and says so.
 * 3. **Some open slot accepts the item.** *A slot is more specific than
 *    a container*: an item that fits the bay goes in the bay, and an
 *    item that does not is ordinary containment. So no existing target
 *    changes behaviour — a seed still just goes in the pot, because a
 *    seed is not a Plant.
 *
 * `get` is the reverse and needed only one thing: vacate the slot
 * before the move.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';
import type { Surfaced } from '../../../../lib/spatial/Surfaced';
import type { Slotted } from '../../../../lib/slot/Slotted';
import type { Slottable } from '../../../../lib/slot/Slottable';
import { ContainmentApi } from '../../../../api/containment';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ChattelApi } from '../../../../api/chattel';
import type { Chattel } from '../../../../lib/chattel/Chattel';

interface PutModel extends CommandModel {
  item: MqlOneResult;
  target: MqlOneResult;
}

export default class PutController extends CommandController<PutModel> {
  execute(model: PutModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const item = model.item.stuff;
    const target = model.target.stuff;

    if (!item) {
      MessageApi.scene(giver)
        .topic('sense.survey')
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
        .topic('sense.survey')
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
    // A slot is more specific than a container: an `in` whose item fits
    // an open slot on the target is a slot insertion, whatever the
    // target also happens to be.
    const slot =
      prep !== 'on' ? PutController.openSlotFor(target, item) : null;
    const mode = slot ? 'slot' : (prep ?? this.inferMode(target));
    if (!mode) {
      // No preposition AND target composes both Container and
      // Surfaced — ambiguous. Reject; ask the player to specify.
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`Put it in or on ${Mml.thing(target)}?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'preposition-ambiguous',
        detail: 'target accepts both in and on',
      });
      return;
    }

    if (mode === 'slot') {
      if (!MixinApi.isContainer(target)) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            Mml.compose`${Mml.thing(item)} would fit ${Mml.thing(target)}, but there is nowhere in it for that to sit.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'slot-host-not-container',
          detail: 'a slot host must also hold its occupant',
        });
        return;
      }
    } else if (mode === 'in') {
      if (!MixinApi.isContainer(target)) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(Mml.compose`You can't put things in ${Mml.thing(target)}.`)
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
          .topic('sense.survey')
          .toSelf(Mml.compose`You can't put things on ${Mml.thing(target)}.`)
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
          .topic('sense.survey')
          .toSelf(Mml.compose`${Mml.thing(item)} won't rest on ${Mml.thing(target)}.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cannot-rest',
          detail: 'host rejected item',
        });
        return;
      }
    }

    // **Leaving your inventory means leaving your body first** — the
    // same release gate `remove`/`unwield`/`drop` run. Without it this
    // verb both bypasses a curse and leaves a phantom slot occupant
    // behind (see `Slotted.tryReleaseFromSlots`).
    if (MixinApi.isSlotted(giver) && MixinApi.isSlottable(item)) {
      const release = giver.tryReleaseFromSlots(item);
      if (!release.released) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            release.dumpedKJ > 0
              ? Mml.compose`You cannot let go of ${Mml.thing(item)} — and it is running hot against your skin.`
              : Mml.compose`You cannot let go of ${Mml.thing(item)}. It has no intention of leaving your hand.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cursed-will-not-release',
          detail: `${item.getPresentation()} refuses release`,
        });
        return;
      }
    }

    // Branch to the correct primitive based on resolved mode. Two
    // distinct calls — each does one thing — preserving
    // ContainmentApi.move's existing contract.
    if (mode === 'slot') {
      // Contents FIRST, then the slot — the `plant` order. The slot is
      // occupancy; containment is where the part physically is.
      ContainmentApi.move(
        item as Stuff & Containable,
        target as Stuff & Container,
      );
      (target as unknown as Stuff & Slotted).occupy(
        item as unknown as Stuff & Slottable,
        slot!,
      );
    } else if (mode === 'in') {
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
    // Either way custody moved and title did not — re-derive the placement
    // so an owned good persists on its owner's record naming where it now
    // sits. A no-op for anything unowned. (D8)
    if (MixinApi.isChattel(item as Stuff)) {
      void (item as Stuff & Chattel).followCustody();
    }

    if (mode === 'slot') {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`You fit ${Mml.thing(item)} into ${Mml.thing(target)}. It seats with a click.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} fits ${Mml.thing(item)} into ${Mml.thing(target)}.`,
        )
        .send();
      return;
    }

    // `mode` is narrowed to 'in' | 'on' at this point; use it as the
    // preposition verbatim.
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You put ${Mml.thing(item)} ${mode} ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} puts ${Mml.thing(item)} ${mode} ${Mml.thing(target)}.`,
      )
      .send();
  }

  /**
   * The open slot on `target` that `item` fits, or null. A BODY is
   * excluded outright — `wear` and `wield` own body slots, and `put
   * shirt in bob` must never dress somebody.
   *
   * Static so it stays unit-testable without a free-floating export.
   */
  static openSlotFor(target: Stuff, item: Stuff): string | null {
    if (!MixinApi.isSlotted(target) || MixinApi.isVitals(target)) return null;
    if (!MixinApi.isSlottable(item)) return null;
    for (const name of target.getSlotNames()) {
      if (target.isSlotFull(name)) continue;
      if (target.canOccupy(item, name)) return name;
    }
    return null;
  }

  private inferMode(target: Stuff): 'in' | 'on' | 'slot' | null {
    const isContainer = MixinApi.isContainer(target);
    const isSurfaced = MixinApi.isSurfaced(target);
    if (isContainer && !isSurfaced) return 'in';
    if (isSurfaced && !isContainer) return 'on';
    // Both → ambiguous; neither shouldn't happen (validator gates).
    return null;
  }
}
