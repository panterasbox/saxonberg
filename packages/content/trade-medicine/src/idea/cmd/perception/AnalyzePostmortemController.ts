/**
 * ⭐⭐ AnalyzePostmortemController — `analyze postmortem <body>`.
 *
 * **The forensic read, and the decay curve's first consumer.**
 * `MORTALITY_DEFAULTS.FORENSIC_READABILITY` shipped with the comment that
 * it was *"consumed by a **future** examination surface"* — `fresh 1 ·
 * stale 0.6 · decomposed 0.25 · spent 0` — and nothing has ever read it.
 * This is that surface.
 *
 * ⭐⭐ **The cause is INFERRED from the wounds, never read off the
 * stamp.** A corpse knows what killed it (`causeOfDeath`); an examiner
 * does not, and handing that over would make forensics a lookup. So the
 * examiner sees `ceil(readability × wounds)` of the wounds, worst first,
 * and reasons from those — which means **the reading can be wrong, and
 * gets worse as the body goes**. Somebody who wants the truth about a
 * death has a reason to hurry, and somebody who does not has a reason to
 * wait, which is a whole design that falls out of one honest inference.
 *
 * Difficulty is `1 − readability`: reading a fresh body is easy and
 * reading a spent one is formidable, and that is a measurement of the
 * world rather than a tag.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import { TRAUMA_BEHAVIOR } from '@saxonberg/server/mud/platform/idea/Condition';
import type { Difficulty } from '@saxonberg/server/mud/lib/advancement/ActSignature';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'sense.reading';
const FORENSICS = 'forensics';

interface PostmortemModel extends CommandModel {
  target?: MqlOneResult;
}

/** What a wound's mechanism family reads as, without naming the weapon. */
const FAMILY: Record<string, string> = {
  laceration: 'something with an edge',
  puncture: 'something with a point',
  avulsion: 'something that tore',
  contusion: 'something blunt',
  fracture: 'something heavy',
  burn: 'fire, or something like it',
};

export default class AnalyzePostmortemController extends CommandController<PostmortemModel> {
  async execute(
    model: PostmortemModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const body = model.target?.stuff ?? null;
    if (!body || !MixinApi.isPostmortem(body) || !MixinApi.isVitals(body)) {
      return this.refuse(context, 'There is no body there to examine.');
    }
    if (!MixinApi.isOrganism(body) || !body.isDead()) {
      return this.refuse(
        context,
        'They are still alive. Try `analyze patient`.',
      );
    }

    const readability = body.getForensicReadability();
    if (readability <= 0) {
      return this.refuse(
        context,
        'There is nothing left in them to read.',
      );
    }

    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor(FORENSICS)
      : CompetenceBand.FLOOR;

    // ⭐ What the body will still show you, worst first. The rest has
    // gone with the decay — not hidden, GONE.
    const wounds = body
      .getConditions()
      .filter((c): c is Trauma => c.kind === 'trauma')
      .sort((a, b) => b.severity - a.severity);
    const visible = wounds.slice(0, Math.ceil(readability * wounds.length));

    const lines: string[] = [
      Mml.strong(`Examination — ${body.getPresentation()}`).toString(),
    ];
    lines.push(
      Mml.escape(
        visible.length === 0
          ? 'No marks you can still make out.'
          : visible
              .map((w) => TRAUMA_BEHAVIOR[w.type]?.describe(w) ?? w.type)
              .join('; ') + '.',
      ),
    );
    if (visible.length < wounds.length) {
      lines.push(
        Mml.escape(
          'Whatever else was written on them has gone with the rest.',
        ),
      );
    }

    // ── competent: the mechanism family ────────────────────────────
    if (CompetenceBand.atOrAbove(band, 'competent') && visible[0]) {
      lines.push(
        Mml.escape(
          `Done with ${FAMILY[visible[0].type] ?? 'something'}.`,
        ),
      );
    }
    // ── proficient: the cause, INFERRED ────────────────────────────
    if (CompetenceBand.atOrAbove(band, 'proficient')) {
      lines.push(Mml.escape(this.inferCause(visible)));
    }
    // ── expert: how long ago ───────────────────────────────────────
    if (CompetenceBand.atOrAbove(band, 'expert')) {
      lines.push(Mml.escape(`They have been dead a ${body.getDecayStage()} while.`));
    }

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: FORENSICS,
        difficulty: this.difficultyFrom(readability),
        outcome: visible.length > 0 ? 'success' : 'partial',
      });
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(lines.join('\n\n')))
      .send();
  }

  /**
   * ⚠ **Inferred from what is visible, never from `causeOfDeath`.** The
   * stamp is on the body and this deliberately does not read it: an
   * examiner who could would be reading the engine's answer, and a
   * forensic reading that cannot be wrong is not forensics.
   */
  private inferCause(visible: readonly Trauma[]): string {
    if (visible.length === 0) return 'You could not say what killed them.';
    const worst = visible[0]!;
    const bleeding = visible.some((w) => w.bleeding);
    if (bleeding) return 'They bled out. That is your reading.';
    if (worst.type === 'burn') return 'The burns did it, you think.';
    if (worst.type === 'fracture') return 'Something broke in them.';
    return 'The worst of these was enough, most likely.';
  }

  /** Reading a fresh body is easy; reading a spent one is formidable. */
  private difficultyFrom(readability: number): Difficulty {
    if (readability >= 0.9) return 'easy';
    if (readability >= 0.5) return 'standard';
    if (readability >= 0.2) return 'hard';
    return 'formidable';
  }

  private refuse(context: CommandContext, detail: string): void {
    context.note({
      kind: 'controller-rejected',
      reason: 'no-subject',
      detail,
    });
    MessageApi.scene(context.commandGiver as Stuff)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
