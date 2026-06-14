/**
 * IntroduceController — the recognition instance-axis trigger.
 *
 * `introduce` (self) or `introduce <subject>` (third-party) emits a
 * public scene line and, in the same perception range, writes each
 * recipient's recognition record so they learn the introducee's name.
 * After "Mara introduces herself as Mara", everyone who perceived it
 * renders Mara's record by name thereafter.
 *
 * **Modality-neutral.** Introduction is a social act, not an acoustic
 * one — afforded by `SoulMixin` (on every Character), not `VocalMixin`.
 * You can introduce yourself by speech, sign, or gesture; the scene
 * routes by perception, so the controller doesn't gate on speech.
 *
 * Constraints honored:
 *  - **No content hook in the messaging substrate.** The controller owns
 *    the write — it iterates the scene's own recipient set
 *    (`getSensors(env)`) and calls the single
 *    `RecognitionApi.learnIdentity` sink. The substrate stays a dumb
 *    channel.
 *  - **Whole-audience write** (everyone who perceives it learns →
 *    "knowing is knowing"). The `--to` audience is addressing flavor,
 *    not a privacy scope (v1 decision).
 *  - **Third-party requires recognition.** You can only introduce someone
 *    whose name you already know (the actor's own recognition record).
 *    Same gate Wave 5 enforces at the targeting layer; here it's direct.
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

/** Diegetic world-action topic — modality-neutral, not a speech channel. */
const TOPIC = 'world.narration.action';

interface IntroduceModel extends CommandModel {
  /** Positional: who to introduce. Omit ⇒ self. */
  subject?: MqlOneResult;
  /** `--to <target>`: the addressed audience (room still hears). */
  audience?: MqlOneResult;
}

export default class IntroduceController extends CommandController<IntroduceModel> {
  execute(model: IntroduceModel, context: CommandContext): void {
    const actor = context.commandGiver;

    const subject = model.subject?.stuff ?? null;
    const selfIntro = subject === null || subject.stuffId === actor.stuffId;
    const introducee = selfIntro ? actor : subject!;

    // Resolve the name to convey.
    let name: string | null;
    if (selfIntro) {
      // Your own proper name — `getName()`, the clean identity with no
      // presentation affixes (status / wielded / posture). Null when the
      // actor has no proper name (rejected below).
      name = MixinApi.isNamed(actor) ? actor.getName() || null : null;
    } else {
      // Third-party: the actor can only vouch for a name they know.
      const referent = introducee.getTemplatePath();
      name =
        referent && MixinApi.isBeliefStore(actor)
          ? (actor.recall(RECOGNITION, referent)?.knownAs ?? null)
          : null;
      if (!name) {
        MessageApi.scene(actor)
          .topic(TOPIC)
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
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no name to give.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-name',
        detail: actor.stuffId,
      });
      return;
    }

    // Modality-neutral: the introduction reaches everyone who can
    // perceive the actor (spoken, signed, gestured — the scene routes by
    // perception, not by speech). Peers render the actor by *their own*
    // current perception (a stranger reads "a tall stranger introduces
    // themselves as Mara") — the learning below upgrades that next time.
    const selfBody = selfIntro
      ? Mml.compose`You introduce yourself as ${name}.`
      : Mml.compose`You introduce ${Mml.name(introducee)} as ${name}.`;
    const peerBody = selfIntro
      ? Mml.compose`${Mml.name(actor)} introduces themselves as ${name}.`
      : Mml.compose`${Mml.name(actor)} introduces ${Mml.name(introducee)} as ${name}.`;

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(selfBody)
      .toPeers(peerBody)
      .send();

    // Record the learned identity for everyone in perception range — the
    // same sensor set the scene reached. Skip the introducee (no self-
    // recognition); non-belief-holding sensors no-op in the sink.
    const env = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    if (env) {
      for (const sensor of MessageApi.getSensors(env)) {
        const listener = sensor as unknown as Stuff;
        if (listener.stuffId === introducee.stuffId) continue;
        RecognitionApi.learnIdentity(listener, introducee, name);
      }
    }
  }
}
