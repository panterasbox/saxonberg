/**
 * IntroduceController — the recognition instance-axis trigger.
 *
 * `introduce` (self) or `introduce <subject>` (third-party) emits a
 * public spoken line on the Vocal scene spine and, in the same earshot,
 * writes each in-earshot listener's recognition record so they learn the
 * introducee's name. After "Mara says, 'I'm Mara.'", everyone who heard
 * it renders Mara's record by name thereafter.
 *
 * Constraints honored:
 *  - **No content hook in the speech substrate.** The controller owns
 *    the write — it iterates the scene's own earshot (`getSensors(env)`)
 *    and calls the single `RecognitionApi.learnIdentity` sink. The
 *    speech substrate stays a dumb channel.
 *  - **Spoken, in earshot.** Gated on `VocalMixin`; the write covers the
 *    whole earshot (public speech → "knowing is knowing"). The `--to`
 *    audience is addressing flavor, not a privacy scope (v1 decision).
 *  - **Third-party requires recognition.** You can only introduce
 *    someone whose name you already know (the speaker's own recognition
 *    record). This is the same gate Wave 5 enforces at the targeting
 *    layer; here it's a direct check.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { RecognitionApi } from '../../../api/recognition';
import { RECOGNITION } from '../../../lib/belief/BeliefStore';
import type { MqlOneResult } from '../../../api/mql';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';

interface IntroduceModel extends CommandModel {
  /** Positional: who to introduce. Omit ⇒ self. */
  subject?: MqlOneResult;
  /** `--to <target>`: the addressed audience (room still hears). */
  audience?: MqlOneResult;
}

export default class IntroduceController extends CommandController<IntroduceModel> {
  execute(model: IntroduceModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      MessageApi.scene(speaker)
        .topic('world.speech.say')
        .toSelf(Mml.compose`You cannot speak.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'VocalMixin' });
      return;
    }

    const subject = model.subject?.stuff ?? null;
    const selfIntro = subject === null || subject.stuffId === speaker.stuffId;
    const introducee = selfIntro ? speaker : subject!;

    // Resolve the name to announce.
    let name: string | null;
    if (selfIntro) {
      name = properName(speaker);
    } else {
      // Third-party: the speaker can only vouch for a name they know.
      const referent = introducee.getTemplatePath();
      name =
        referent && MixinApi.isBeliefStore(speaker)
          ? (speaker.recall(RECOGNITION, referent)?.knownAs ?? null)
          : null;
      if (!name) {
        MessageApi.scene(speaker)
          .topic('world.speech.say')
          .toSelf(
            Mml.compose`You don't know ${Mml.name(introducee)} well enough to introduce them.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'introducee-not-recognized',
          detail: introducee.stuffId,
        });
        return;
      }
    }

    if (!name) {
      MessageApi.scene(speaker)
        .topic('world.speech.say')
        .toSelf(Mml.compose`You have no name to give.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-name',
        detail: speaker.stuffId,
      });
      return;
    }

    // The spoken line is literal — NOT run through the say markdown /
    // mention parser (this is a controlled announcement, not user prose).
    const spoken = selfIntro ? `I'm ${name}.` : `This is ${name}.`;
    const selfBody = selfIntro
      ? Mml.compose`You introduce yourself as ${name}.`
      : Mml.compose`You introduce ${Mml.name(introducee)} as ${name}.`;

    // Public utterance. Peers render the speaker by *their own* current
    // perception (so a stranger reads "a tall stranger says, 'I'm
    // Mara.'") — the learning below upgrades that for next time.
    MessageApi.scene(speaker)
      .topic('world.speech.say')
      .toSelf(selfBody)
      .toPeers(Mml.compose`${Mml.name(speaker)} says, ${Mml.speech(spoken)}`)
      .send();

    // Record the learned identity for everyone in earshot — the same
    // sensor set the scene reached. Skip the introducee (no self-
    // recognition); non-belief-holding sensors no-op in the sink.
    const env = MixinApi.isContainable(speaker)
      ? speaker.getContainer()
      : null;
    if (env) {
      for (const sensor of MessageApi.getSensors(env)) {
        const listener = sensor as unknown as Stuff;
        if (listener.stuffId === introducee.stuffId) continue;
        RecognitionApi.learnIdentity(listener, introducee, name);
      }
    }
  }
}

/** The introducee's own proper name (Named), else its presentation. */
function properName(stuff: Stuff): string | null {
  if (MixinApi.isNamed(stuff)) {
    const n = stuff.getName();
    if (n) return n;
  }
  return stuff.getPresentation() || null;
}
