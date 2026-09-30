/**
 * PutController — `put X (in|on) Y`.
 *
 * Preposition-aware dispatch: `put X in Y` routes to
 * `ContainmentApi.move`, `put X on Y` routes to
 * `ContainmentApi.place`, and `put X in Y` where X fits an open SLOT
 * on Y routes to `Slotted.occupy` (after the containment move — the
 * `plant`/`repot` order). The YAML's `prepositions: [in, on]` on
 * the `target` field lands the consumed preposition on
 * `model.target.prep`; the controller branches on that.
 *
 * When no preposition is typed, the controller infers mode from the
 * target's capabilities (Container → in, Placing → on). A target
 * composing BOTH (a desk-with-drawer) is ambiguous — the
 * controller rejects with a `put it in or on X?` prompt.
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
import { ContainmentApi } from '../../../../api/containment';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ProseApi } from '../../../../api/prose';
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

    // The consumed preposition, lowercased by the binder, or undefined.
    const prep = model.target.prep;

    // ⭐ D6 — build the OFFERS this target makes, in listing order.
    const offers = PutController.offersFor(target);

    // The slot rule stays first and unchanged in spirit: a slot is more
    // specific than a container, so an item that fits an open slot goes
    // in the slot. The guard is *the region-zero words, or none* — with
    // one member that is exactly the old `prep !== 'on'`.
    const zeroWords = offers.find((o) => o.kind === 'zero')?.words ?? ['in'];
    const slotEligible = prep === undefined || zeroWords.includes(prep);
    const slot = slotEligible
      ? PutController.openSlotFor(target, item)
      : null;

    let chosen: PutOffer | null = null;
    if (slot === null) {
      const primaries = offers.map((o) => o.words[0] ?? o.name ?? 'in');
      let matches: PutOffer[];
      if (prep !== undefined) {
        // A typed word: the member whose PRIMARY word it is, else any
        // member that also answers to it. That secondary pass is how
        // `put ham on hook` reaches a host offering only `from`.
        matches = offers.filter((o) => (o.words[0] ?? '') === prep);
        if (matches.length === 0) {
          matches = offers.filter((o) => o.words.includes(prep));
        }
        if (matches.length === 0) {
          MessageApi.scene(giver)
            .topic('sense.survey')
            .toSelf(
              Mml.compose`You can't put things ${prep} ${Mml.thing(target)} — it takes ${joinOr(primaries)}.`,
            )
            .send();
          context.note({
            kind: 'controller-rejected',
            reason: 'wrong-preposition',
            detail: `target takes ${primaries.join('|')}; got '${prep}'`,
          });
          return;
        }
      } else {
        matches = offers;
      }
      if (matches.length !== 1) {
        // Ambiguous: a range is a firebox AND a hot plate, and the
        // player has to say which. (Two members sharing a primary word
        // is an authoring collision `lint:placement-words` refuses, so
        // the typed-word branch reaching here is unreachable in
        // practice — it is kept because "unreachable" is a claim about
        // content, and content changes.)
        const words = matches.map((o) => o.words[0] ?? o.name ?? 'in');
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(
            Mml.compose`Put it ${joinOr(words)} ${Mml.thing(target)}?`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: matches.length === 0 ? 'wrong-preposition' : 'preposition-ambiguous',
          detail: `target accepts ${words.join(', ')}`,
        });
        return;
      }
      chosen = matches[0]!;
    }

    const mode: 'slot' | 'zero' | 'placement' =
      slot !== null ? 'slot' : chosen!.kind;

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
    } else if (mode === 'zero') {
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
        return;
      }
    } else {
      const veto = (target as Stuff & Placing).canPlace(
        item as Stuff & Containable,
        chosen!.name!,
      );
      if (!veto.ok) {
        const word = chosen!.words[0] ?? chosen!.name!;
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
        return;
      }
    }

    // Branch to the correct primitive based on resolved mode. Three
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
    } else if (mode === 'zero') {
      ContainmentApi.move(
        item as Stuff & Containable,
        target as Stuff & Container,
      );
    } else {
      ContainmentApi.place(
        item as Stuff & Containable,
        chosen!.name!,
        target as Stuff & Placing,
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

    // ⭐ The sentence is the MEMBER's, not the controller's — one Liquid
    // template on the row, rendered per audience with the agreement
    // variables `EmoteGrammar` already binds. That is what lets `from`
    // say *hang* where `on` says *put*, with no code here knowing the
    // difference. A member with no live row falls back to the shipped
    // sentence, so a cold catalogue still speaks English.
    const member = ContainmentApi.placement(chosen!.name ?? 'in');
    const template = member?.getProse() ?? '';
    const word = chosen!.words[0] ?? chosen!.name ?? 'in';
    const scene = MessageApi.scene(giver).topic('sense.survey');
    if (template !== '') {
      scene
        .toSelf(
          ProseApi.format(template, {
            actor: Mml.compose`You`,
            item: Mml.thing(item),
            host: Mml.thing(target),
            s: '',
            es: '',
          }),
        )
        .toPeers(
          ProseApi.format(template, {
            actor: Mml.actor(giver),
            item: Mml.thing(item),
            host: Mml.thing(target),
            s: 's',
            es: 'es',
          }),
        )
        .send();
      return;
    }
    scene
      .toSelf(Mml.compose`You put ${Mml.thing(item)} ${word} ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} puts ${Mml.thing(item)} ${word} ${Mml.thing(target)}.`,
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
  private static openSlotFor(target: Stuff, item: Stuff): string | null {
    if (!MixinApi.isSlotted(target) || MixinApi.isVitals(target)) return null;
    if (!MixinApi.isSlottable(item)) return null;
    for (const name of target.getSlotNames()) {
      if (target.isSlotFull(name)) continue;
      if (target.canOccupy(item, name)) return name;
    }
    return null;
  }

  /**
   * ⭐ The ways this target offers to be put into or onto, in listing
   * order: **region zero** first when the target is a plain container,
   * then one per member its row offers.
   *
   * Region zero is the container's own interior and is NOT a member —
   * a chest has no compartments, it just holds things. It borrows its
   * words and its prose from the `in` row when the catalogue has one,
   * which is what makes *one region and many regions the same thing*
   * literal rather than a slogan.
   *
   * Static so it stays unit-testable without a free-floating export.
   */
  private static offersFor(target: Stuff): PutOffer[] {
    const offers: PutOffer[] = [];
    if (MixinApi.isContainer(target) && !isBody(target)) {
      const member = ContainmentApi.placement('in');
      const words = member?.getPrepositions() ?? ['in'];
      offers.push({ kind: 'zero', name: 'in', words: [...words] });
    }
    if (MixinApi.isPlacing(target)) {
      for (const name of target.getPlacements()) {
        // ⚠ A member with no live row still gets offered, answering to
        // its own name. Dropping it would make a cold catalogue — or a
        // host naming a member no installed pack ships — silently
        // unaddressable, which is the failure class this build exists
        // to stop making; the fallback degrades to *the behaviour
        // before the vocabulary* instead.
        const words = ContainmentApi.placement(name)?.getPrepositions() ?? [];
        offers.push({
          kind: 'placement',
          name,
          words: words.length > 0 ? [...words] : [name],
        });
      }
    }
    return offers;
  }
}

/** One way this target offers to be put into or onto. */
interface PutOffer {
  kind: 'zero' | 'placement';
  name: string;
  /** The words it answers to, primary first. */
  words: string[];
}

/**
 * A container that is **somebody** is not a region you put things in —
 * near enough the exclusions `MixinApi.isOpenContainer` makes, minus the
 * lid (a shut chest still offers region zero; it refuses at the verb,
 * with a reason).
 *
 * ⚠⚠ **`isVitals`, not `isOrganism`, and the difference is a live
 * object.** The question this asks is *is this a BODY* — and the honest
 * marker of a body is that it has one (vitals, a body plan, parts you
 * could wound), not merely that it is alive. Being alive is a much
 * bigger set: the apiculture build's beehive is an `Organism` (the
 * colony IS the organism, and its species is where its taps and its
 * temper are read from) **and** a `Container` you put a nucleus, a
 * super and frames into, which is the whole design of the object.
 * Reading it as a body made `put nucleus in hive` answer
 * *"you can't put things in a hive"* — a refusal about the one act the
 * trade's acquisition ladder is built on.
 *
 * ⭐ Every real body still excluded, and by a stronger test than before:
 * a player, an NPC, a head of stock and a corpse are all `Creature`s and
 * all compose `VitalsMixin`. What is admitted is the narrow and
 * deliberate case of **a living thing that is also a vessel** — which
 * until now nothing in the game was, which is exactly why the check
 * could be wrong for a year and nobody could know.
 *
 * ⚠ No controller test could see this: `PutController` is the
 * platform's, the hive is a pack class, and the two only meet in a
 * booted world. The drive is the instrument that found it.
 */
function isBody(target: Stuff): boolean {
  return (
    MixinApi.isVitals(target) ||
    MixinApi.isCommandGiver(target) ||
    MixinApi.isHasInteractive(target)
  );
}

/** `a`, `a or b`, `a, b or c` — the roster in a refusal. */
function joinOr(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}
