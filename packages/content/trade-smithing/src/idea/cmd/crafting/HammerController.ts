/**
 * HammerController — `hammer [<workpiece>] [with <hammer>] [on <anvil>]`.
 *
 * ⭐ I/O over the piece's own protocol ({@link Hammerable.hammerPlanFor},
 * controller-liquidity Appendix B): the striker and the anvil are this
 * verb's to bind (the view declares both and the binder resolves every
 * reachable thing offering the kind; the best-rated is taken), and what a
 * blow does — the forming work, a bloom's consolidation, a blank struck on a
 * die, cast iron's refusal — is the piece's. The anvil paces the stroke.
 *
 * Words only, from here down: every reason and every outcome the piece can
 * answer is worded below, exhaustively.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import {
  HAMMERABLE_MIXIN,
  type Hammerable,
  type HammerBegin,
  type HammerDone,
  type HammerRefusal,
} from '../../../lib/Hammerable';

type Composed = ReturnType<typeof Mml.compose>;

interface HammerModel extends CommandModel {
  striker?: MqlManyResult;
  anvil?: MqlManyResult;
  target?: MqlOneResult;
}

export default class HammerController extends ManualBuildController<HammerModel> {
  async execute(model: HammerModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target || !MixinApi.isActive(target, HAMMERABLE_MIXIN)) {
      this.declineStep(context, Mml.compose`Hammer what? You need a workpiece on the anvil.`, 'no-vessel');
      return;
    }
    const piece = target as Stuff & Hammerable;
    const striker = this.bestInstrument(model.striker, 'striking');
    if (!striker) {
      this.declineStep(context, Mml.compose`You need a hammer in reach to work metal.`, 'missing-tool');
      return;
    }
    const anvil = this.bestInstrument(model.anvil, 'anvil');
    if (!anvil) {
      this.declineStep(context, Mml.compose`You need an anvil to work against.`, 'missing-tool');
      return;
    }
    const plan = piece.hammerPlanFor(giver, striker, anvil);
    if (!plan.ok) {
      this.declineStep(context, HammerController.refusalWords(plan, piece), plan.reason);
      return;
    }
    await this.engagePlan(
      context,
      // The anvil paces the forming work; the striking hammer is a
      // requirement, never a pacer.
      { ...plan, durationMs: this.paceMs(plan.durationMs, anvil, ['anvil']) },
      {
        beginSelf: (b) => HammerController.beginWords(b, piece, anvil),
        beginPeers: (b) => HammerController.beginPeerWords(b, giver, piece, anvil),
        onRefused: (r) => HammerController.refusalWords(r, piece),
        onDone: (d) => HammerController.doneWords(d, giver, piece),
      },
    );
  }

  /** ⭐ Every reason the piece refuses a blow (D4). */
  protected static refusalWords(r: HammerRefusal, piece: Stuff): Composed {
    switch (r.reason) {
      case 'unforgeable':
        return Mml.compose`You bring the hammer down and a corner of ${Mml.thing(piece)} simply breaks off, grey and glittering. This is cast iron: it has taken up so much carbon that it has no give in it at all. It shatters where iron would spread. Whatever this is going to be, it will be cast in a mould — never forged.`;
      case 'no-vessel':
        return Mml.compose`Hammer what? You need a workpiece on the anvil.`;
      case 'insufficient-heat':
        return Mml.compose`${Mml.thing(piece)} is stone cold — heat it first.`;
      case 'not-a-blank':
        return Mml.compose`Nothing comes of it — ${Mml.thing(piece)} is no blank for this die.`;
      case 'not-metal':
        return Mml.compose`${Mml.thing(piece)} is not metal; it only bruises.`;
      case 'too-hard':
        return Mml.compose`The hammer rings off ${Mml.thing(piece)} and the device barely shows on it. It is too hard to strike cold — heat it, or strike harder.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static beginWords(b: HammerBegin, piece: Stuff, anvil: Stuff): Composed {
    return b.on === 'die'
      ? Mml.compose`You set ${Mml.thing(piece)} on ${Mml.thing(anvil)} and raise the hammer.`
      : Mml.compose`You set ${Mml.thing(piece)} on the anvil and begin to hammer.`;
  }

  protected static beginPeerWords(b: HammerBegin, giver: Stuff, piece: Stuff, anvil: Stuff): Composed {
    return b.on === 'die'
      ? Mml.compose`${Mml.actor(giver)} strikes ${Mml.thing(piece)} on ${Mml.thing(anvil)}.`
      : Mml.compose`${Mml.actor(giver)} hammers at ${Mml.thing(piece)}, ringing the anvil.`;
  }

  /** ⭐ What a blow came to — the mass a bloom loses is the lesson, so it is said. */
  protected static doneWords(
    d: HammerDone,
    giver: Stuff,
    piece: Stuff,
  ): { self: Composed; peers?: Composed } {
    switch (d.kind) {
      case 'formed':
        return {
          self: Mml.compose`The metal moves under your hammer — ${Mml.thing(piece)} is taking shape.`,
          peers: Mml.compose`${Mml.actor(giver)} draws a shape out of ${Mml.thing(piece)} blow by blow.`,
        };
      case 'struck':
        return { self: Mml.compose`The die bites. ${Mml.thing(d.token)} comes up off it with the device sharp on its face.` };
      case 'consolidated':
        return {
          self: d.steel
            // ⭐ Natural steel: a bloom off a rich charge comes out carrying
            // enough carbon to be steel the moment the glass is out of it.
            ? Mml.compose`The mass spits glass with every blow — gouts of it, hissing onto the floor — and closes up under the hammer until it rings instead of thudding. ${String(d.slagKg)} kg of slag gone, ${String(d.barKg)} kg of metal left, and this is no ordinary bar: it came out of that furnace carrying enough carbon to be steel.`
            : Mml.compose`The mass spits glass with every blow — gouts of it, hissing onto the floor — and closes up under the hammer until it rings instead of thudding. ${String(d.slagKg)} kg of slag gone, and ${String(d.barKg)} kg of wrought iron left in your tongs. That is what a bar costs.`,
          peers: Mml.compose`${Mml.actor(giver)} beats the slag out of a bloom, and the floor hisses.`,
        };
      default: {
        const never: never = d;
        return never;
      }
    }
  }
}
