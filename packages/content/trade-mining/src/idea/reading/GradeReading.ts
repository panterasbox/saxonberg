/**
 * GradeReading — ⭐⭐ **how much metal is in this rock**, and the channel
 * the whole ladder was designed around.
 *
 * It is the one channel with every rung:
 *
 * | rung | what it says |
 * |---|---|
 * | the eye | *ore-bearing* / *barren*, and no more — `eyeCeiling: novice` |
 * | a hand lens | the same words, told apart more finely |
 * | the bench | a NUMBER, off a sample somebody carried there |
 *
 * ⭐ **The eye rung is what the sample is FOR.** A prospector cannot
 * afford to assay every face; the free read is how they choose which
 * three to carry in. So it must be genuinely useful and genuinely
 * insufficient — *there is ore in this* is a decision, and *17.3 %* is
 * the thing you pay for.
 *
 * ⭐⭐ It also writes the FIELD CALL down, as a `grade:` belief note keyed
 * on the same place the sample's stamp carries. That is one half of the
 * calibration mirror advancement will build (*what did you guess, and
 * what was it really*); this build ships both halves as records and
 * leaves the arithmetic alone. ⚠ A hook several builds ahead of its
 * consumer is what `lint:unconsumed-seams` exists to find — two readable
 * records are not a hook.
 */

import { SurveyReading, READING_TOPIC, GEOLOGY } from '../../lib/SurveyReading';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

/**
 * ⭐ What a grade LOOKS like, in words. The bands are coarse on purpose:
 * this is the read that says *worth carrying in*, not the read that says
 * what it is worth.
 */
function richnessOf(grade: number): string {
  if (grade <= 0) return 'nothing in this rock at all';
  if (grade < 0.05) return 'a trace, and not enough to be worth the carriage';
  if (grade < 0.15) return 'ore-bearing, thinly';
  if (grade < 0.3) return 'fair ore';
  if (grade < 0.5) return 'good ore';
  return 'very rich';
}

/** The finer telling a lens or a streak plate buys. */
function fineTelling(grade: number): string {
  if (grade <= 0) return 'no metal streak at all — country rock.';
  if (grade < 0.05) return 'the streak is faint and patchy.';
  if (grade < 0.15) return 'the streak takes, but thin.';
  if (grade < 0.3) return 'a clean streak, and weight in the hand.';
  if (grade < 0.5) return 'a strong streak, and it is heavy for its size.';
  return 'the streak is unmistakable and the piece is heavy.';
}

export default class GradeReading extends SurveyReading {
  /**
   * The eye rung. ⭐ Words at every band, and `eyeCeiling: novice` on the
   * row means training past novice buys NOTHING here without a lens —
   * which is honest: a naked eye tells ore-bearing from barren and that
   * is the end of what a naked eye can do.
   */
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const found = await this.gradeOf(subject, giver, param);
    if (found === null) {
      this.decline(
        context,
        Mml.compose`There is no rock in front of you to judge, and nothing in your hands that came out of one.`,
        'no-rock',
      );
      return;
    }
    const lines: string[] = [richnessOf(found.grade)];
    if (handTool !== null) {
      lines.push(fineTelling(found.grade));
    } else if (CompetenceBand.atOrAbove(band, 'competent')) {
      lines.push(
        'You would want a lens or a streak plate to tell any finer than that.',
      );
    }
    // ⭐⭐ The FIELD CALL, written down. Keyed on the same place a
    // sample's stamp carries, so the two records line up without either
    // knowing about the other.
    this.rememberCall(giver, found.where, richnessOf(found.grade));
    MessageApi.scene(giver)
      .topic(READING_TOPIC)
      .toSelf(Mml.compose`${lines.join(' ')}`)
      .send();
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: GEOLOGY,
        difficulty: found.grade > 0 && found.grade < 0.15 ? 'hard' : 'standard',
        outcome: 'success',
      });
    }
  }

  /** ⚠ There is no dial for this. The refusal names the bench. */
  protected override async measure(context: CommandContext): Promise<void> {
    this.decline(
      context,
      Mml.compose`Nothing you can carry reads a grade off a rock. Take a sample to an assay bench — \`sample\` then \`assay\`.`,
      'no-instrumented-rung',
    );
  }

  /** The engine's own read: the grade, undecorated. */
  public override async truth(target: Stuff | null): Promise<number | null> {
    if (target && typeof (target as unknown as { getGrade?(): number }).getGrade === 'function') {
      return (target as unknown as { getGrade(): number }).getGrade();
    }
    return null;
  }

  /**
   * The grade in front of the reader — a lump they named, else the face
   * they are standing at.
   */
  private async gradeOf(
    subject: Stuff | null,
    giver: Stuff,
    param: string,
  ): Promise<{ grade: number; where: string } | null> {
    const lump = subject as unknown as { getGrade?(): number } | null;
    if (lump && typeof lump.getGrade === 'function') {
      const stamped = (subject as unknown as { getSampling?(): { at: string } | null })
        .getSampling?.();
      return { grade: lump.getGrade(), where: stamped?.at ?? whereOf(giver) };
    }
    const place = this.placeOf(giver);
    if (!place) return null;
    const working = place as unknown as {
      facesOf?(): Promise<Array<{ direction: string; grade: number; open: boolean; blocked: boolean }>>;
    };
    if (typeof working.facesOf !== 'function') return null;
    const faces = (await working.facesOf()).filter((f) => !f.open && !f.blocked);
    if (faces.length === 0) return null;
    const wanted = param.trim().toLowerCase();
    const face =
      wanted === ''
        ? [...faces].sort((a, b) => b.grade - a.grade)[0]!
        : faces.find((f) => wanted.includes(f.direction));
    if (!face) return null;
    return { grade: face.grade, where: whereOf(place as unknown as Stuff) };
  }

  /** The field call, as a per-viewer belief on this channel. */
  private rememberCall(giver: Stuff, where: string, call: string): void {
    this.remember(giver, where, call, 'grade');
  }
}

/** A place's or person's durable key — never the lineage stamp. */
function whereOf(stuff: Stuff | null): string {
  if (!stuff) return '';
  const s = stuff as unknown as {
    getIdentityPath?(): string | null;
    getTemplatePath?(): string | null;
  };
  return s.getIdentityPath?.() ?? s.getTemplatePath?.() ?? '';
}
