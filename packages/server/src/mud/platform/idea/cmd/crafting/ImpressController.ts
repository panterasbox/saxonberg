/**
 * ImpressController — `impress <pattern> on|in <medium>`.
 *
 * ⭐ Dumb (ceramics D21): pressing a hard shape into something soft is one
 * act, and the MEDIUM answers what it makes (`ImpressibleMixin.takeImpression`)
 * — a leather-hard pot takes its maker's mark; a mould's soft medium takes
 * an impression of the whole pattern. This controller binds, asks, and
 * WORDS what the medium answered (facts and a reason, controllers-are-io D4).
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ImpressFacts, ImpressRefusal } from '../../../../lib/craft/Impressible';

type Composed = ReturnType<typeof Mml.compose>;

interface ImpressModel extends CommandModel {
  pattern?: MqlOneResult;
  medium?: MqlOneResult;
}

export default class ImpressController extends ManualBuildController<ImpressModel> {
  async execute(model: ImpressModel, context: CommandContext): Promise<void> {
    const pattern = model.pattern?.stuff ?? null;
    const medium = model.medium?.stuff ?? null;
    if (pattern === null || medium === null) {
      this.declineStep(context, Mml.compose`Press what into what? Say \`impress stamp on jug\`.`, 'no-target');
      return;
    }
    if (pattern === medium) {
      this.declineStep(context, Mml.compose`You cannot press a thing into itself.`, 'self-target');
      return;
    }
    if (!MixinApi.isImpressible(medium)) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(medium)} is not soft enough to take an impression.`,
        'not-impressible',
      );
      return;
    }
    // ⭐ A press is a moment, not a shift: it happens now, and a refusal
    // is the medium's own words on the command's own result.
    const giver = context.commandGiver;
    const out = await medium.takeImpression(pattern, giver);
    if (!out.ok) {
      this.declineStep(context, this.refusalWords(out, pattern, medium), out.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(this.doneWords(out.facts, pattern, medium))
      .toPeers(Mml.compose`${Mml.actor(giver)} presses ${Mml.thing(pattern)} into ${Mml.thing(medium)}.`)
      .send();
  }

  /** ⭐ The words for a refused impression (D4) — every reason, exhaustively. */
  private refusalWords(r: ImpressRefusal, pattern: Stuff, medium: Stuff): Composed {
    switch (r.reason) {
      case 'not-impressible':
        return r.facts.why === 'cut-to-shape'
          ? Mml.compose`${Mml.thing(medium)} is cut to its own shape. Nothing presses into it.`
          : Mml.compose`${Mml.thing(medium)} is not soft enough to take an impression.`;
      case 'ruined':
      case 'fired':
      case 'too-soft':
      case 'too-dry':
        return ImpressController.greenWords(r, medium);
      case 'not-markable':
        return Mml.compose`There is nowhere on ${Mml.thing(medium)} a mark would mean anything.`;
      case 'no-mark':
        return Mml.compose`${Mml.thing(pattern)} leaves a dent, and no mark anybody would know.`;
      case 'already-impressed':
        return Mml.compose`${Mml.thing(medium)} already holds the impression of ${r.facts.held}.`;
      case 'occupied':
        return Mml.compose`${Mml.thing(medium)} is full. Empty it first.`;
      case 'no-shape':
        return Mml.compose`${Mml.thing(pattern)} leaves no shape a mould could hold.`;
      case 'too-big':
        return Mml.compose`${Mml.thing(pattern)} is too big for ${Mml.thing(medium)}.`;
      case 'undercut':
        return Mml.compose`${Mml.thing(pattern)} would not draw out of ${Mml.thing(medium)} — something stands out of it. A mould of two halves would take it, or a sand mould you break.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** The words for what the medium took. */
  private doneWords(f: ImpressFacts, pattern: Stuff, medium: Stuff): Composed {
    switch (f.kind) {
      case 'marked':
        return Mml.compose`You press ${Mml.thing(pattern)} into the base of ${Mml.thing(medium)}. It takes ${f.device ?? 'the mark'}, sharp and clean.`;
      case 'impressed':
        return Mml.compose`You press ${Mml.thing(pattern)} into ${Mml.thing(medium)} and draw it out clean. It holds the shape of ${f.form} now.`;
      default: {
        const never: never = f;
        return never;
      }
    }
  }
}
