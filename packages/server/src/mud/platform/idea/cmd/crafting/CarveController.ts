/**
 * CarveController — `carve <part> [on <target>] [from <stock>] [--with <edge>] [--of <thing>] [--for <metal>]`.
 *
 * ⭐⭐ **Promoted to the platform (ceramics D14), and dumb.** `carve` is one
 * act — cutting away to a form with an edge — and two things can be carved:
 *
 *  1. a thing that plans its own carving (`CarvableMixin.carvePlanFor`),
 *     named ON (the target) or FROM (the stock): a leather-hard pot turns
 *     a foot (`GreenwareMixin`), a board cuts a founder's pattern
 *     (carpentry's `PatternStockMixin`), and each says itself why not;
 *  2. when it has nothing to say (`null`), the generic CARVING — a recipe
 *     row, planned by the recipe catalogue (`RecipeCatalogue.
 *     carvingPlanFor`) — and the named thing is then the stock.
 *
 * ⭐ One planner shape (controller-liquidity W7c): both answer the same
 * `CarvePlan | CarveRefusal`, the controller asks the next candidate on a
 * `null`, and ONE `engagePlan` with ONE set of words runs whichever
 * answered. The carving rows' rules (what a carving IS, the list a refusal
 * names) are the catalogue's, not this file's.
 *
 * Shapes one piece of wood into one part with an edge: a haft, a handle,
 * a peg, a dowel, a leg, a rail, a mallet. ⭐ **The by-hand rung of the
 * wood column** — no heat, no station, no second piece — and the reason
 * the tool tree has a root: a handle carved with a knife and a smith's
 * blade make a froe, and the froe rives the next blank.
 *
 * ## ⭐ A carving is a ROW, and this file knows none of them
 *
 * What can be carved is every installed recipe that takes **one item of
 * wood** and asks for **an edge** (`cutting`) and no heat — matched off
 * the recipe catalogue, never listed here. A pack that ships a spoon or
 * a bowl recipe in that shape is carvable the day it installs, with no
 * edit to this controller. The word the player says is the recipe's own
 * keyword (`carve haft`, `carve pick-haft`).
 *
 * The named stock is **preferred, not required** (`CraftRequest.target`):
 * `carve peg from the ash blank` takes that blank; `carve peg` takes the
 * cheapest wood in reach that will do.
 *
 * The edge is declared on the view (`reachable:[capability.cutting]`)
 * and checked by the catalogue so a refusal can name it; the craft finds its
 * tools by capability, as every recipe does.
 */

import { ManualBuildController } from './ManualBuildController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { CarveBegin, CarveDone, CarveRefusal } from '../../../../lib/craft/Carvable';
import RecipeCatalogue from '../../RecipeCatalogue';
import { CraftingDecline } from '../../../../lib/craft/CraftingDecline';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;
const RECIPE_CATALOGUE = '/platform/idea/RecipeCatalogue';

interface CarveModel extends CommandModel {
  /** The thing to carve on, when it plans its own carving (a green pot). */
  target?: MqlOneResult;
  /** The part to carve — a recipe word, read off `raw`. */
  thing?: MqlOneResult;
  /** The wood to carve it from, when named. */
  stock?: MqlOneResult;
  /** The edge the view's default bound, or the one named `with`. */
  knife?: MqlOneResult;
  /** ⭐ What a pattern is carved OF (`--of sword`). */
  of?: MqlOneResult;
  /** The metal a pattern is cut FOR, a word (`--for bronze`). */
  for?: string;
}

export default class CarveController extends ManualBuildController<CarveModel> {
  async execute(model: CarveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const word = (model.thing?.raw ?? '').trim().toLowerCase();

    // The object args, each told when it names nothing here.
    for (const field of ['target', 'stock', 'of'] as const) {
      const arg = model[field];
      if (arg && (arg.stuff ?? null) === null) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You don't see any '${arg.raw}' here.`)
          .send();
        context.note({ kind: 'empty-result', field, query: arg.raw });
        return;
      }
    }

    // ⭐ ONE request, asked of the thing named — what to carve ON, else
    // what to carve it FROM — and, when it has nothing to say (`null`), of
    // the generic carving (a recipe row; the named thing is then the stock).
    const target = model.target?.stuff ?? null;
    const named = target ?? model.stock?.stuff ?? null;
    const req = {
      actor: giver,
      word,
      knife: model.knife?.stuff ?? null,
      ...(model.of ? { of: model.of.stuff ?? null } : {}),
      forWord: (model.for ?? '').trim().toLowerCase(),
      stock: model.stock?.stuff ?? target,
    };
    let plan = named !== null && MixinApi.isCarvable(named) ? await named.carvePlanFor(req) : null;
    // A copy OF something is only ever a thing's own plan.
    if (plan === null && model.of) {
      this.turnDown(
        context,
        'not-carvable',
        Mml.compose`Nothing here will carve a copy of ${Mml.thing(model.of.stuff!)}. Name the piece to carve it from.`,
      );
      return;
    }
    if (plan === null) {
      const catalogue = await StuffApi.singleton<RecipeCatalogue>(RECIPE_CATALOGUE);
      plan = catalogue.carvingPlanFor(req);
    }
    // The words name the thing carved: the named piece, or the wood.
    const thing = named;
    if (!plan.ok) {
      this.turnDown(context, plan.reason, CarveController.refusalWords(plan, thing));
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f) => CarveController.beginWords(f, thing),
      beginPeers: (f) =>
        f.kind === 'trim'
          ? Mml.compose`${Mml.actor(giver)} pares at ${Mml.thing(thing!)}.`
          : f.kind === 'riser'
            ? Mml.compose`${Mml.actor(giver)} cuts into ${Mml.thing(thing!)}.`
            : f.kind === 'carving'
              ? Mml.compose`${Mml.actor(giver)} whittles away at a piece of wood.`
              : Mml.compose`${Mml.actor(giver)} measures and carves at ${Mml.thing(thing!)}.`,
      onRefused: (r) => CarveController.refusalWords(r, thing),
      onDone: (f) => {
        if (f.kind === 'carved') {
          return {
            self: Mml.compose`You work the wood down with ${Mml.thing(f.knife)}, following the grain, until it is ${Mml.thing(f.output)}.`,
            peers: Mml.compose`${Mml.actor(giver)} whittles away at a piece of wood and holds up ${Mml.thing(f.output)}.`,
          };
        }
        const self = CarveController.doneWords(f, thing!);
        return self === null ? null : { self };
      },
    });
  }

  /** ⭐ The words for a refused carving (D4) — every reason, exhaustively. */
  protected static refusalWords(r: CarveRefusal, named: Stuff | null): Composed {
    // Every reason but the generic carving's has a thing that refused.
    const thing = named as Stuff;
    switch (r.reason) {
      case 'not-carvable':
        switch (r.facts.carves) {
          case 'trim':
            return Mml.compose`You can trim ${Mml.thing(thing)}, turn a foot on it, or cut a design into it.`;
          case 'riser':
            return Mml.compose`The only thing to cut in ${Mml.thing(thing)} is a riser.`;
          case 'pattern':
            return Mml.compose`From ${Mml.thing(thing)} you can carve a pattern of something — say \`carve pattern of <thing>\`.`;
          case 'carving':
            return Mml.compose`You cannot carve that out of a piece of wood.`;
        }
        break;
      case 'no-edge':
        switch (r.facts.carves) {
          case 'trim':
            return Mml.compose`You need an edge to trim with — any knife will do.`;
          case 'riser':
            return Mml.compose`You need an edge to cut a riser — any knife will do.`;
          case 'pattern':
            return Mml.compose`You have no edge to carve with. Anything that offers a cutting edge will do.`;
          case 'carving':
            return Mml.compose`You have no edge to carve with. Anything that offers a cutting edge as a tool — a billhook, an axe, a pair of shears — will shape a blank.`;
        }
        break;
      case 'ruined':
      case 'fired':
      case 'too-soft':
      case 'too-dry':
        return CarveController.greenWords(r, thing);
      case 'no-cavity':
        return Mml.compose`There is no cavity in ${Mml.thing(thing)} to feed — press a pattern into it first.`;
      case 'has-riser':
        return Mml.compose`${Mml.thing(thing)} has a riser already.`;
      case 'self-target':
        return Mml.compose`You cannot carve a pattern of the wood you are carving it from.`;
      case 'green-stock':
        return Mml.compose`${Mml.thing(thing)} is still green. Wood moves as it dries; a pattern cut from it won't hold its size. Let it season first.`;
      case 'no-shape':
        return Mml.compose`${Mml.thing(r.facts.of)} has no shape a pattern could copy.`;
      case 'no-metal':
        return Mml.compose`Cut for which metal? A pattern is cut oversize by what the metal shrinks — say \`carve pattern of ${Mml.thing(r.facts.of)} for bronze\`.`;
      case 'too-small':
        return Mml.compose`${Mml.thing(thing)} is too small to carve a pattern of ${Mml.thing(r.facts.of)} from.`;
      case 'no-part':
        return Mml.compose`Carve what? ${CarveController.carvingList(r.facts.names)}`;
      case 'not-a-carving':
        return Mml.compose`You cannot carve '${r.facts.word}' out of a piece of wood. ${CarveController.carvingList(r.facts.names)}`;
      case 'wrong-tool':
        return Mml.compose`${Mml.thing(r.facts.knife)} has no edge you could carve with.`;
      case 'craft-refused':
        return Mml.compose`${CraftingDecline.messageFor(r.facts.failure)}`;
      default: {
        const never: never = r;
        return never;
      }
    }
    throw new TypeError(`CarveController: no words for '${r.reason}'`);
  }

  /** The words a carving begins on. */
  protected static beginWords(f: CarveBegin, named: Stuff | null): Composed {
    const thing = named as Stuff;
    switch (f.kind) {
      case 'carving':
        return Mml.compose`You set ${Mml.thing(f.knife)} to the wood.`;
      case 'trim':
        return Mml.compose`You set ${Mml.thing(thing)} upside down and pare at it with ${Mml.thing(f.knife)}.`;
      case 'riser':
        return Mml.compose`You cut a channel down into ${Mml.thing(thing)} and hollow a riser above the cavity.`;
      case 'pattern':
        return Mml.compose`You lay ${Mml.thing(f.of)} on ${Mml.thing(thing)}, scribe round it with a shrink rule for ${f.metalName}, and begin to carve.`;
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** The words a carving lands on (`null` — nothing said). */
  protected static doneWords(f: CarveDone, thing: Stuff): Composed | null {
    switch (f.kind) {
      case 'carved':
        return Mml.compose`You work the wood down with ${Mml.thing(f.knife)}, following the grain, until it is ${Mml.thing(f.output)}.`;
      case 'trimmed':
        return Mml.compose`The shavings curl away. ${Mml.thing(thing)} has ${f.feature} now.`;
      case 'riser':
        return Mml.compose`${Mml.thing(thing)} has a riser now: the last of the metal will have somewhere to feed from.`;
      case 'pattern':
        return Mml.compose`You blow the last shavings off ${Mml.thing(f.pattern)}: the shape of ${f.formDescription}, a shade fat all over — by what ${f.metalName} will shrink as it cools.`;
      case 'gone':
        return null;
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** The refusal's list — every installed carving, by name. */
  protected static carvingList(names: readonly string[]): string {
    if (names.length === 0) return 'Nothing installed here is carved.';
    return `What a piece of wood will make: ${names.join(', ')}.`;
  }

  private turnDown(
    context: CommandContext,
    reason: string,
    text: ReturnType<typeof Mml.compose>,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
