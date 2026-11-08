/**
 * PutController — `put X (in|on) Y`.
 *
 * ⭐⭐ **Input and output** (controllers-are-io D11): the target says what
 * the word means (`placementFor`, `PlacementOffers`) and which slot would take
 * the item (`SlottedMixin.openSlotFor`, `seatInSlot`); `ContainmentApi.move`
 * is the one primitive. The YAML's `prepositions` on the `target` field land
 * the consumed preposition on `model.target.prep`.
 *
 * With no preposition typed, the target's only offer is taken. A target
 * offering BOTH (a desk-with-drawer) is ambiguous — the controller rejects
 * with a `put it in or on X?` prompt.
 *
 * The field-level `requires: ContainerMixin|PlacingMixin` already gated the
 * target as Container OR Placing, so the `wrong-preposition`
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
import type { Placing } from '../../../../lib/spatial/Placing';
import type { Slotted } from '../../../../lib/slot/Slotted';
import type { Slottable } from '../../../../lib/slot/Slottable';
import type { PlacementChoice, PlacementOffer } from '../../../../lib/spatial/PlacementOffers';
import { ContainmentApi } from '../../../../api/containment';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ProseApi } from '../../../../api/prose';
import { StackableApi } from '../../../../api/stackable';

interface PutModel extends CommandModel {
  item: MqlOneResult;
  target: MqlOneResult;
}

export default class PutController extends CommandController<PutModel> {
  async execute(model: PutModel, context: CommandContext): Promise<void> {
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

    // The consumed preposition, lowercased by the binder, or undefined.
    const prep = model.target.prep;

    // ⭐ A count (`put 1 clay in tub`) splits it off the stack first — the
    // `drop` path: the helper walks the operands, and a put refused here
    // restacks what it split (the ceramics drive: `put` had no count).
    const quantity = model.item.quantity;
    if (!quantity || !MixinApi.isStackable(item)) {
      this.putOne(item, target, prep, context);
      return;
    }
    await StackableApi.applyQuantity<Stuff>(
      [item],
      quantity,
      async (operand) =>
        this.putOne(operand, target, prep, context)
          ? { ok: true, payload: operand }
          : { ok: false, reason: 'refused' },
      { field: 'item', query: model.item.raw },
    );
  }

  /** Put ONE item (or one split-off stack) into the target; `true` when it went. */
  private putOne(item: Stuff, target: Stuff, prep: string | undefined, context: CommandContext): boolean {
    const giver = context.commandGiver;

    // ⭐ The slot rule stays first: a slot is more specific than a container,
    // so an item that fits an open slot goes in the slot.
    const slot = MixinApi.isSlotted(target) ? target.openSlotFor(item, prep) : null;
    let offer: PlacementOffer | null = null;
    if (slot === null) {
      const choice: PlacementChoice =
        MixinApi.isPlacing(target) || MixinApi.isContainer(target)
          ? target.placementFor(prep)
          : { ok: false, reason: 'wrong-preposition', takes: [], ...(prep ? { got: prep } : {}) };
      if (!choice.ok) {
        const takes = choice.takes;
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            choice.got !== undefined
              ? Mml.compose`You can't put things ${choice.got} ${Mml.thing(target)} — it takes ${joinOr(takes)}.`
              : Mml.compose`Put it ${joinOr(takes)} ${Mml.thing(target)}?`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: choice.reason,
          detail:
            choice.got !== undefined
              ? `target takes ${takes.join('|')}; got '${choice.got}'`
              : `target accepts ${takes.join(', ')}`,
        });
        return false;
      }
      offer = choice.offer;
    }

    if (offer === null) {
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
        return false;
      }
    } else if (offer.kind === 'zero') {
      // ⭐ Region zero is the container's own interior. A shut lid
      // refuses HERE, at the verb — never in `ContainmentApi.move`,
      // which brains and restocks legitimately use to move goods into
      // closed cupboards. And the target stays BOUND: a region you can
      // name and be refused from teaches; one that vanishes reads as a
      // bug.
      if (MixinApi.isSealable(target) && !target.isOpen()) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(Mml.compose`${Mml.thing(target)} is shut.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'shut',
          detail: `${target.getPresentation()} is closed`,
        });
        return false;
      }
      // ⭐ A container that says what it is FOR refuses here, in its own
      // words — *"Only a pump goes in a well."*, *"A hive is not a
      // cupboard."* The same hook `ContainmentApi.move` asserts, asked
      // FIRST: unasked, a veto surfaced as a thrown ContainmentError and
      // `put bucket in well` — the most natural thing to type at a well —
      // answered with an error instead of a sentence.
      const veto = MixinApi.isContainer(target)
        ? target.canAddContainable?.(item as Stuff & Containable)
        : undefined;
      if (veto && !veto.ok) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            veto.reason
              ? Mml.fromMarkup(veto.reason)
              : Mml.compose`${Mml.thing(item)} won't go in ${Mml.thing(target)}.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'refused-by-container',
          detail: `host rejected item (${veto.reason ?? ''})`,
        });
        return false;
      }
    } else {
      const veto = (target as Stuff & Placing).canPlace(
        item as Stuff & Containable,
        offer.name,
      );
      if (!veto.ok) {
        const word = offer.words[0] ?? offer.name;
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            veto.reason === 'shut'
              ? Mml.compose`${Mml.thing(target)} is shut.`
              : Mml.compose`${Mml.thing(item)} won't go ${word} ${Mml.thing(target)}.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: veto.reason === 'shut' ? 'shut' : 'cannot-rest',
          detail: `host rejected item (${veto.reason})`,
        });
        return false;
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
            release.dumpedTau > 0
              ? Mml.compose`You cannot let go of ${Mml.thing(item)} — and it is running hot against your skin.`
              : Mml.compose`You cannot let go of ${Mml.thing(item)}. It has no intention of leaving your hand.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cursed-will-not-release',
          detail: `${item.getPresentation()} refuses release`,
        });
        return false;
      }
    }

    // ⚠ Named BEFORE the move (GetController's rule): a stack that arrives
    // where its like already is MERGES into it and is destroyed — a heap of
    // sawdust put on a stack that already holds sawdust (the storage-and-ice
    // drive) — and a late-bound reference to a destroyed thing broke the
    // scene's template.
    const named = item.getPresentation();

    // ⭐ `ContainmentApi.move` is the one primitive: custody and the
    // placement pair are derived in it, and a feeder hears who filled it on
    // its own hook. A slot is that move and then the occupancy.
    if (offer === null) {
      (target as unknown as Stuff & Slotted).seatInSlot(
        item as Stuff & Containable & Slottable,
        slot!,
      );
    } else if (offer.kind === 'zero') {
      ContainmentApi.move(item as Stuff & Containable, target as Stuff & Container);
    } else {
      ContainmentApi.move(item as Stuff & Containable, target as Stuff & Placing, offer.name);
    }

    if (offer === null) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`You fit ${Mml.thing(item)} into ${Mml.thing(target)}. It seats with a click.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} fits ${Mml.thing(item)} into ${Mml.thing(target)}.`,
        )
        .send();
      return true;
    }

    // ⭐ The sentence is the MEMBER's, not the controller's — one Liquid
    // template on the row, rendered per audience with the agreement
    // variables `EmoteGrammar` already binds. That is what lets `from`
    // say *hang* where `on` says *put*, with no code here knowing the
    // difference. A member with no live row falls back to the shipped
    // sentence, so a cold catalogue still speaks English.
    const what = item.isDestroyed() ? Mml.text(named) : Mml.thing(item);
    const member = ContainmentApi.placement(offer.name);
    const template = member?.getProse() ?? '';
    const word = offer.words[0] ?? offer.name;
    const scene = MessageApi.scene(giver).topic('sense.survey');
    if (template !== '') {
      scene
        .toSelf(
          ProseApi.format(template, {
            actor: Mml.compose`You`,
            item: what,
            host: Mml.thing(target),
            s: '',
            es: '',
          }),
        )
        .toPeers(
          ProseApi.format(template, {
            actor: Mml.actor(giver),
            item: what,
            host: Mml.thing(target),
            s: 's',
            es: 'es',
          }),
        )
        .send();
      return true;
    }
    scene
      .toSelf(Mml.compose`You put ${what} ${word} ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} puts ${what} ${word} ${Mml.thing(target)}.`,
      )
      .send();
    return true;
  }
}

/** `a`, `a or b`, `a, b or c` — the roster in a refusal. */
function joinOr(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}
