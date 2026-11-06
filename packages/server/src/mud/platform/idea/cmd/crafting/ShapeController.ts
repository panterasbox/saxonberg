/**
 * ShapeController — `shape [<material>] [with <instrument>] [into <form>]`.
 * ⭐ Dumb by construction (ceramics D14): the INSTRUMENT plans the shape
 * (`FormingMixin.shapePlanFor` — a wheel, a brick table, a blowpipe); when
 * none has anything to say, the MATERIAL plans it by hand
 * (`ShapeableMixin.shapePlanFor`). This controller never names clay or
 * glass.
 *
 * Promoted from `trade-glass` (the `dry` precedent): a gather on a pipe
 * and clay on a wheel are one act, and a second trade's instrument is a
 * second implementation of the protocol, not a second verb.
 *
 * ⚠ `shape bottle` keeps working word for word: with no `into`, the word
 * the material arg bound IS the form.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type {
  ShapeBegin,
  ShapeFacts,
  ShapePlan,
  ShapeRefusal,
  ShapeRequest,
} from '../../../../lib/craft/Shapeable';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

interface ShapeModel extends CommandModel {
  material?: MqlOneResult;
  instrument?: MqlManyResult;
  form?: string;
}

export default class ShapeController extends ManualBuildController<ShapeModel> {
  async execute(model: ShapeModel, context: CommandContext): Promise<void> {
    let material: Stuff | null = model.material?.stuff ?? null;
    let formText = (model.form ?? '').trim();
    if (formText === '' && model.material?.raw) {
      // `shape bottle`: the word is the form, not a thing to shape.
      formText = model.material.raw.trim();
      material = null;
    }
    const req: ShapeRequest = {
      actor: context.commandGiver,
      material,
      formText,
      commandText: context.commandText,
    };

    let plan: ShapePlan | ShapeRefusal | null = null;
    for (const tool of model.instrument?.stuff ?? []) {
      if (tool === material || !MixinApi.isForming(tool)) continue;
      plan = await tool.shapePlanFor(req);
      if (plan !== null) break;
    }
    if (plan === null && material !== null && MixinApi.isShapeable(material)) {
      plan = await material.shapePlanFor(req);
    }
    if (plan === null) {
      this.declineStep(
        context,
        material === null
          ? Mml.compose`Shape what? You have nothing soft enough to work, and nothing here to work it on.`
          : Mml.compose`${Mml.thing(material)} will not take a shape.`,
        'nothing-to-shape',
      );
      return;
    }
    const words = this.shapeWords(context.commandGiver);
    if (!plan.ok) {
      this.declineStep(context, words.onRefused(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, words);
  }

  /** ⭐ The words for a shape (D4) — every reason and outcome, exhaustively. */
  private shapeWords(actor: Stuff): ActWords<ShapeBegin, ShapeFacts, ShapeRefusal> {
    return {
      beginSelf: (b) => {
        switch (b.kind) {
          case 'throw':
            return Mml.compose`You centre the clay on ${Mml.thing(b.instrument)}, open it with your thumbs and draw the wall up for a ${b.form}.`;
          case 'mould':
            return Mml.compose`You sand the brick mould, throw the first clot of clay into it and strike it off. It is going to be a long day.`;
          case 'blow':
            return Mml.compose`You put the pipe to your lips and your tools to the glass, working it toward a ${Mml.fromMarkup(b.form)}.`;
          case 'coil':
            return Mml.compose`You roll coils of clay between your palms and begin to build them up, ring on ring.`;
          default: {
            const never: never = b;
            return never;
          }
        }
      },
      beginPeers: (b) => {
        switch (b.kind) {
          case 'throw':
            return Mml.compose`${Mml.actor(actor)} throws a pot on ${Mml.thing(b.instrument)}.`;
          case 'mould':
            return Mml.compose`${Mml.actor(actor)} sets to at ${Mml.thing(b.instrument)}, throwing clay into the mould.`;
          case 'blow':
            return Mml.compose`${Mml.actor(actor)} works a gather of hot glass.`;
          case 'coil':
            return Mml.compose`${Mml.actor(actor)} coils a pot by hand.`;
          default: {
            const never: never = b;
            return never;
          }
        }
      },
      onRefused: (r) => this.refusalWords(r),
      onDone: (f) => this.doneWords(f, actor),
    };
  }

  private refusalWords(r: ShapeRefusal): Composed {
    switch (r.reason) {
      case 'no-form':
        return Mml.compose`Shape it into what? ${this.choices(r.facts.named)}`;
      case 'unknown-form':
        return Mml.compose`You don't know a form called '${r.facts.form}'. ${this.choices(r.facts.named)}`;
      case 'bad-capacity':
        return r.facts.noun === null
          ? Mml.compose`How much should it hold? Say it in pints, quarts, gallons or litres.`
          : Mml.compose`An ${r.facts.noun} holding how much? Say "holding 2 pints".`;
      case 'wrong-instrument':
        return Mml.compose`${Mml.thing(r.facts.instrument)} will not make that shape.`;
      case 'no-product':
        return r.facts.coiling !== null
          ? Mml.compose`You could coil ${Mml.thing(r.facts.coiling)} into a shape, but it would be nothing anybody has a name for. Work it on a wheel, or in a mould.`
          : Mml.compose`You could make that shape, but it would be nothing anybody has a name for.`;
      case 'beyond-your-hand':
        return r.facts.maker === 'glassblower'
          ? Mml.compose`That is more glass than you can blow yet — a ${r.facts.band} glassblower blows a vessel of up to ${String(r.facts.maxL)} liters.`
          : Mml.compose`That is more than your hand can raise yet — a ${r.facts.band} potter raises a pot of up to ${String(r.facts.maxL)} litres.`;
      case 'set-hard':
        return Mml.compose`It has set hard.`;
      case 'no-material':
        return Mml.compose`There is nothing in it to shape.`;
      case 'unknown-product':
        return Mml.compose`That is not a thing anybody here knows how to make.`;
      case 'not-enough-clay':
        return Mml.compose`There is not enough clay here for that.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  private doneWords(f: ShapeFacts, actor: Stuff): { self?: Composed | null; peers?: Composed | null } | null {
    switch (f.kind) {
      case 'thrown':
        return {
          // ⭐ The thrower names it as they know it, not as the light shows it (a
          // throw that ends after dark read "You wire something off the wheel").
          self: Mml.compose`You wire ${f.made.getPresentation()} off the wheel. It is green and soft — let it stiffen to leather-hard before you touch it again.`,
          peers: Mml.compose`${Mml.actor(actor)} lifts ${Mml.thing(f.made)} off the wheel.`,
        };
      case 'moulded': {
        // ⭐ Named as the maker knows them, not as the light shows them: a day at
        // the table ends after dark half the year, and the perceptual name read
        // "something stand turned out on the pallet" (ceramics browser walk).
        // ⚠ The day's bricks may have MERGED into a stack already on the pallet,
        // and a merged-away stack is destroyed — its proxy answers nothing, and
        // `undefined.charAt` here once took the whole world down (wizard-axis
        // finalize, wire:dirty). Name the bricks without it.
        const made = f.made;
        const gone = made.isDestroyed();
        const n = !gone && MixinApi.isStackable(made) ? made.getQuantity() : 2;
        const what = gone ? 'the bricks' : (made.getPresentation() ?? 'the bricks');
        const them = `${what.charAt(0).toUpperCase()}${what.slice(1)}`;
        return {
          self: Mml.compose`The day is done. ${them} ${n === 1 ? 'stands' : 'stand'} turned out on the pallet, green and soft — get ${n === 1 ? 'it' : 'them'} under the hack cover before it rains.`,
          peers: Mml.compose`${Mml.actor(actor)} straightens a stiff back over a pallet of green bricks.`,
        };
      }
      case 'coiled':
        return {
          self: Mml.compose`You have made ${Mml.thing(f.made)}. It is green — let it dry before anything else.`,
          peers: Mml.compose`${Mml.actor(actor)} sets down ${Mml.thing(f.made)}.`,
        };
      case 'blown':
        return { self: Mml.compose`The glass takes the form of a ${Mml.fromMarkup(f.form)}. Crack it off while it holds.` };
      case 'lost':
        // The gather's loss to cullet says itself.
        return null;
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** The forms an instrument knows, and the classes any hand can name. */
  private choices(named: readonly string[]): string {
    const list = named.length > 0 ? `This will make a ${named.join(', a ')}; or ` : '';
    return `${list}say an open vessel, a closed vessel, a flat piece, a block or a cone, and how much it holds.`;
  }
}
