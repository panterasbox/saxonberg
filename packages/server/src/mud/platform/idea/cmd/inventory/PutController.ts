/**
 * PutController — `put X (in|on) Y`.
 *
 * ⭐⭐ **Input and output** (controllers-are-io D11): the target says what
 * the word means (`placementFor`, `PlacementOffers`) and which slot would take
 * the item (`SlottedMixin.openSlotFor`, `seatInSlot`); `ContainmentApi.move`
 * is the one primitive. ⭐ The whole route and its refusals are
 * `ContainmentApi.putPlanFor` (controller-liquidity W8) — this words them. The YAML's `prepositions` on the `target` field land
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
import type { Containable } from '../../../../lib/spatial/Containable';
import { Placements } from '../../../../lib/spatial/Placement';
import { ContainmentApi, type PlaceRefusal } from '../../../../api/containment';
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
      await this.putOne(item, target, prep, context);
      return;
    }
    await StackableApi.applyQuantity<Stuff>(
      [item],
      quantity,
      async (operand) =>
        (await this.putOne(operand, target, prep, context))
          ? { ok: true, payload: operand }
          : { ok: false, reason: 'refused' },
      { field: 'item', query: model.item.raw },
    );
  }

  /** Put ONE item (or one split-off stack) into the target; `true` when it went. */
  private async putOne(item: Stuff, target: Stuff, prep: string | undefined, context: CommandContext): Promise<boolean> {
    const giver = context.commandGiver;
    // ⭐ Where it would go, and every refusal before any write, is the
    // world's (`ContainmentApi.putPlanFor` — the slot, the interior, the
    // region; controller-liquidity W8). This words it.
    // Sizes load on use (size and carrying P7): the forms the tape measure
    // reads, before the sync plan asks it.
    for (const s of [item, target]) if (MixinApi.isTangible(s)) await s.ensureShape();
    const plan = ContainmentApi.putPlanFor(item as Stuff & Containable, target, { prep, by: giver });
    if (!plan.ok) {
      PutController.refused(item, target, plan, context);
      return false;
    }
    const done = await plan.onComplete();
    if (!done.ok) {
      PutController.refused(item, target, done, context);
      return false;
    }
    const { route, named } = done.facts;

    if (route.kind === 'slot') {
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
    // difference. The member is resident with its host (documents D7).
    // ⚠ The name was read BEFORE the move: a stack that arrives where its
    // like already is MERGES into it and is destroyed.
    const what = item.isDestroyed() ? Mml.text(named) : Mml.thing(item);
    const name = route.kind === 'zero' ? Placements.IN : route.name;
    const member =
      route.kind === 'region' && MixinApi.isPlacing(target)
        ? target.placementOf(name)
        : ContainmentApi.placements().need(name);
    const template = member.getProse();
    const word = route.kind === 'zero' ? (member.getPrepositions()[0] ?? 'in') : route.word;
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

  /** The words for a refused put, and its note. */
  protected static refused(item: Stuff, target: Stuff, r: PlaceRefusal, context: CommandContext): void {
    const giver = context.commandGiver;
    let line: Mml;
    let detail: string;
    switch (r.reason) {
      case 'wrong-preposition':
      case 'preposition-ambiguous': {
        const { takes, got } = r.facts;
        // ⚠ A target that offers nothing at all (a person — you do not
        // put things IN the bartender) has no list to give (finalize: the
        // line read *"it takes ."*).
        line =
          takes.length === 0
            ? Mml.compose`You can't put things ${got ?? 'in'} ${Mml.thing(target)}.`
            : got !== undefined
              ? Mml.compose`You can't put things ${got} ${Mml.thing(target)} — it takes ${PutController.joinOr(takes)}.`
              : Mml.compose`Put it ${PutController.joinOr(takes)} ${Mml.thing(target)}?`;
        detail =
          got !== undefined
            ? `target takes ${takes.join('|')}; got '${got}'`
            : `target accepts ${takes.join(', ')}`;
        break;
      }
      case 'slot-host-not-container':
        line = Mml.compose`${Mml.thing(item)} would fit ${Mml.thing(target)}, but there is nowhere in it for that to sit.`;
        detail = 'a slot host must also hold its occupant';
        break;
      case 'shut':
        line = Mml.compose`${Mml.thing(target)} is shut.`;
        detail = `${target.getPresentation()} is closed`;
        break;
      case 'refused-by-container':
        line = r.facts.said
          ? Mml.fromMarkup(r.facts.said)
          : Mml.compose`${Mml.thing(item)} won't go in ${Mml.thing(target)}.`;
        detail = `host rejected item (${r.facts.said ?? ''})`;
        break;
      case 'cannot-rest':
        // ⭐ The hanging rule's two refusals (size and carrying D4) — a
        // length used up, a weight it will not bear.
        line =
          r.facts.why === 'no-room-along'
            ? Mml.compose`There's no room ${r.facts.word} ${Mml.thing(target)} for ${Mml.thing(item)}.`
            : r.facts.why === 'too-heavy-for'
              ? Mml.compose`${Mml.thing(target)} won't take the weight of ${Mml.thing(item)}.`
              : Mml.compose`${Mml.thing(item)} won't go ${r.facts.word} ${Mml.thing(target)}.`;
        detail = `host rejected item (${r.facts.why})`;
        break;
      case 'wont-fit':
        // ⭐ What a tape measure would say (size and carrying D4).
        line =
          r.facts.why === 'too-big-for-mouth'
            ? Mml.compose`${Mml.thing(item)} won't go through the mouth of ${Mml.thing(target)}.`
            : r.facts.why === 'too-big-inside'
              ? Mml.compose`${Mml.thing(item)} is too big to go in ${Mml.thing(target)}.`
              : Mml.compose`There's no room left in ${Mml.thing(target)} for ${Mml.thing(item)}.`;
        detail = `it won't fit (${r.facts.why})`;
        break;
      case 'cursed-will-not-release':
        line =
          r.facts.dumpedTau > 0
            ? Mml.compose`You cannot let go of ${Mml.thing(item)} — and it is running hot against your skin.`
            : Mml.compose`You cannot let go of ${Mml.thing(item)}. It has no intention of leaving your hand.`;
        detail = `${item.getPresentation()} refuses release`;
        break;
      default: {
        const never: never = r;
        return never;
      }
    }
    MessageApi.scene(giver).topic('sense.survey').toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason: r.reason, detail });
  }

  /** `a`, `a or b`, `a, b or c` — the roster in a refusal. */
  protected static joinOr(words: readonly string[]): string {
    if (words.length <= 1) return words[0] ?? '';
    return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
  }
}
