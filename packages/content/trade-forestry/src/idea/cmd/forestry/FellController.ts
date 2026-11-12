/**
 * FellController — `fell [<species>|<planted tree>] [with <axe>]`.
 *
 * ⭐⭐ **The forestry trade's one act, and the stand is the ROOM.** A
 * `Wood` composes `StandMixin`; standing in it, a player with a felling
 * axe takes a standard down out of the stand, and what comes down is
 * the whole tree:
 *
 *   - **one bole** on the room floor — the felled trunk, mass = the
 *     species' wood density × 0.9 m³ (oak ≈ 675 kg, too much for any one
 *     back; can't-budge is emergent from mass);
 *   - four logs off the crown beside it;
 *   - a seed in hand.
 *
 * **Cross-cutting is a second act on the bole, and it is a CUT**: `cut
 * bole` takes one length of green timber off it per engagement until
 * nothing is left but the butt and the brash — the bole answers the
 * kernel's `cut` (controller-liquidity D14; this verb cross-cut it until
 * then). A planted standard is felled where it stands
 * (`fell sapling`): mature → the same bole + logs + seed; young or
 * established → one whole carryable tree; a seedling refuses.
 *
 * ## The target is POLYMORPHIC, so the view gates nothing on it
 *
 * Two things can stand in the slot: a planted `Standard`, or a bare
 * species word that binds NOTHING — the room is not a bindable target, so
 * `fell oak` lands as `{ stuff: null, raw: 'oak' }` and the word is handed
 * to the room's stand. ⭐ Both answer the same protocol
 * (`FellableMixin.fellPlanFor` — controller-liquidity W11): the axe, the
 * species, the stage and what comes down are the tree's; this controller
 * words the plan and its refusals.
 *
 * ## The axe is an ARGUMENT, never hunted
 *
 * The view's `default: "reachable:[capability.felling]"` binds the first
 * reachable thing offering `felling`; null → `no-axe`; a bound billhook is
 * the tree's to refuse (`no-felling-axe`).
 *
 * Refusals are diegetic and noted. No deed gate — felling is labour.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import {
  FELLABLE_MIXIN,
  type Fellable,
  type FellBegin,
  type FellDone,
  type FellRefusal,
} from '../../../lib/Fellable';
import Bole from '../../../thing/Bole';

export const FORESTRY_TOPIC = 'act.deed';

export interface FellModel extends CommandModel {
  /** A planted tree, or a bare species word (`stuff: null`). */
  target?: MqlOneResult;
  /** The axe the view's default bound, or the one named `with`. */
  axe?: MqlOneResult;
}

type Composed = ReturnType<typeof Mml.compose>;
type FellableStuff = Stuff & Fellable;

export default class FellController extends CommandController<FellModel> {
  async execute(model: FellModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // The instrument — bound by the view, never hunted.
    const axe = model.axe?.stuff ?? null;
    if (!axe) {
      this.decline(context, 'no-axe', Mml.compose`You have nothing here that will fell a tree.`);
      return;
    }

    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const stand: FellableStuff | null =
      room && MixinApi.isActive(room, FELLABLE_MIXIN) ? (room as unknown as FellableStuff) : null;
    const named = model.target?.stuff ?? null;
    const word = (model.target?.raw ?? '').trim();

    // Which tree: a named thing that answers the axe (a planted
    // standard), else the room's stand with the word.
    let tree: FellableStuff | null = null;
    if (named && MixinApi.isActive(named, FELLABLE_MIXIN)) {
      tree = named as unknown as FellableStuff;
    } else if (named && MixinApi.isGrowing(named)) {
      // A stool is cut with a billhook, through `harvest`.
      this.decline(context, 'not-a-standard', Mml.compose`That is a stool — cut it with a billhook.`);
      return;
    } else if (named) {
      // ⚠ The WORD comes first when the stand knows it: after a felling,
      // `fell oak` binds an oak LOG off the floor (the binder matches
      // materials), and the player meant the tree.
      const known = stand && word ? await stand.fellPlanFor(giver, axe, word) : null;
      if (!known || (!known.ok && known.reason === 'no-such-species')) {
        // ⭐ A felled trunk is CUT now (D14) — the refusal says the new word.
        this.decline(
          context,
          'not-a-tree',
          named instanceof Bole
            ? Mml.compose`${Mml.thing(named)} is already down. Cross-cut it with \`cut\`.`
            : Mml.compose`${Mml.thing(named)} is not a tree.`,
        );
        return;
      }
      tree = stand;
    } else {
      tree = stand;
    }
    if (!tree) {
      this.decline(context, 'no-stand', Mml.compose`There is nothing here to fell.`);
      return;
    }

    const plan = await tree.fellPlanFor(giver, axe, word);
    if (!plan.ok) {
      this.decline(context, plan.reason, FellController.refusalWords(plan, axe, named));
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f: FellBegin) =>
        f.planted
          ? Mml.compose`You set to ${f.name} with the axe.`
          : Mml.compose`You set your feet, sight the ${f.name}, and swing.`,
      beginPeers: (f: FellBegin) =>
        f.planted
          ? Mml.compose`${Mml.actor(giver)} sets to ${f.name} with an axe.`
          : Mml.compose`${Mml.actor(giver)} sets to ${GrammarApi.articleFor(f.name)} ${f.name} with an axe.`,
      onRefused: (r: FellRefusal) => FellController.refusalWords(r, axe, named),
      onDone: (f: FellDone) => FellController.doneWords(giver, f),
    });
  }

  /** ⭐ Every reason a tree refuses the axe, in this verb's words. */
  protected static refusalWords(r: FellRefusal, axe: Stuff, named: Stuff | null): Composed {
    switch (r.reason) {
      case 'wrong-tool':
        return Mml.compose`That is ${Mml.thing(axe)}. It will take a stool off at the ankle, and it will not take an oak.`;
      case 'no-such-species':
        return Mml.compose`Nothing called '${r.facts.word}' stands here.`;
      case 'stand-empty':
        return r.facts.name
          ? Mml.compose`There is nothing left here that is worth the axe — the ${r.facts.name} is stumps and brash.`
          : Mml.compose`There is nothing left here that is worth the axe.`;
      case 'not-yet-a-tree':
        return named
          ? Mml.compose`${Mml.thing(named)} is not yet a tree. Leave it.`
          : Mml.compose`It is not yet a tree. Leave it.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** What the feller and the room read when the tree comes down. */
  protected static doneWords(
    giver: Stuff,
    f: FellDone,
  ): { self: Composed; peers: Composed } | null {
    switch (f.kind) {
      case 'gone':
        return null;
      case 'whole':
        return {
          self: Mml.compose`${f.name} comes away at the ankle, whole, and you take it up.`,
          peers: Mml.compose`${Mml.actor(giver)} fells ${f.name} and takes it up whole.`,
        };
      case 'standard': {
        const logs = GrammarApi.cap(GrammarApi.inWords(f.logs));
        if (f.planted) {
          return {
            self: Mml.compose`${f.name} goes over with a crack you feel in your feet and lies there, the whole length of it. ${logs} logs come off the crown.`,
            peers: Mml.compose`${Mml.actor(giver)} brings ${f.name} down.`,
          };
        }
        return {
          self: f.seed
            ? Mml.compose`The ${f.name} goes over with a crack you feel in your feet and lies there, the whole length of it, too much for any one back. ${logs} logs come off the crown, and ${Mml.thing(f.seed)}.`
            : Mml.compose`The ${f.name} goes over with a crack you feel in your feet and lies there, the whole length of it, too much for any one back. ${logs} logs come off the crown.`,
          peers: Mml.compose`${Mml.actor(giver)} brings ${GrammarApi.articleFor(f.name)} ${f.name} down; ${f.bole ? Mml.thing(f.bole) : 'the trunk'} lies where it fell.`,
        };
      }
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  private decline(context: CommandContext, reason: string, text: Composed): void {
    MessageApi.scene(context.commandGiver).topic(FORESTRY_TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
