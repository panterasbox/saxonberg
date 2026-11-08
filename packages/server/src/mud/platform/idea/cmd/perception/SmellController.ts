/**
 * SmellController — the `smell` verb.
 *
 * The bare form reads the air at the giver's place and the target form reads a
 * thing with your nose to it. This controller only words what the nose read:
 * who detects what, and what they can name, is the body's.
 */

import {
  SingleSenseControllerBase,
  type SingleSenseModel,
} from './SingleSenseControllerBase';
import type { SenseChannel } from '../../../../lib/description/Perceiver';
import type { CommandContext } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';
import type { SmellModality } from '../../modalities/SmellModality';
import { Aroma } from '../../../../lib/perception/Aroma';
import { PerceptionApi } from '../../../../api/perception';
import { Scent } from '../../../../lib/perception/Smell';

export default class SmellController extends SingleSenseControllerBase {
  protected readonly senseChannel: SenseChannel = 'smell';
  protected readonly sceneTopic = 'sense.survey';

  /**
   * ⭐ A word a row names may not be resident yet (a restored bottle whose cask
   * is not loaded): a first read starts the load, and this waits it out, so a
   * cold read does not lose a smell.
   */
  override execute(model: SingleSenseModel, context: CommandContext): void | Promise<void> {
    const target = model.target?.stuff ?? null;
    const signal =
      target && target !== context.location
        ? this.modality().emissionOf(target, { close: true })
        : context.location
          ? this.modality().signalAt(context.location)
          : null;
    for (const note of signal?.notes ?? []) Aroma.resolve(note.aroma);
    const settling = Aroma.settling();
    if (settling) return settling.then(() => super.execute(model, context));
    return super.execute(model, context);
  }

  protected override senseLocation(context: CommandContext): void {
    const location = context.location;
    if (!location) return;
    const actor = context.commandGiver;
    const scent = MixinApi.isSensor(actor)
      ? PerceptionApi.perceiveAt(actor, location, this.modality())
      : null;
    if (scent instanceof Scent && !scent.isEmpty()) {
      const phrases = scent.notes.map((n, i) => {
        const phrase = scent.phrases()[i]!;
        return n.sourceName ? `${phrase} from ${n.sourceName}` : phrase;
      });
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(Mml.compose`The air smells ${GrammarApi.joinList(phrases)}.`)
        .send();
      return;
    }
    // Nothing a nose can read: the room's own authored prose, if it has any.
    super.senseLocation(context);
  }

  protected override senseTarget(target: Stuff, context: CommandContext): void {
    const actor = context.commandGiver;
    // A still is read for where it is in its run: its own prose says so.
    if (MixinApi.isFractionating(target)) return super.senseTarget(target, context);
    const scent = MixinApi.isOlfactory(actor)
      ? actor.nose(this.modality().emissionOf(target, { close: true }), { close: true })
      : Scent.EMPTY;
    if (!scent.isEmpty()) {
      const said = GrammarApi.joinList(scent.phrases());
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(
          target === actor
            ? Mml.compose`You smell ${said}.`
            : Mml.compose`${Mml.thing(target)} smells ${said}.`,
        )
        .send();
      return;
    }
    // ⭐ Prose a thing authored for the nose stands. Otherwise its look is not an
    // answer: this reader smells nothing on it, and that is what they are told.
    if (MixinApi.isVisible(target) && !target.getLongDescription().includes('channel="smell"')) {
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(
          target.stuffId === actor.stuffId
            ? Mml.compose`You can't smell anything on yourself.`
            : Mml.compose`You can't smell anything on ${Mml.thing(target)}.`,
        )
        .send();
      return;
    }
    super.senseTarget(target, context);
  }

  private modality(): SmellModality {
    return PerceptionApi.modalityByName('smell') as SmellModality;
  }
}
