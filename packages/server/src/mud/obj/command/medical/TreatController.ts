/**
 * TreatController — `treat` / `bind` / `dress` [target].
 *
 * The medic vertical: dress a bleeding wound on a body (self or another),
 * consuming a reachable **dressing** item (any `MixinApi.isDressing` —
 * `Bandage` is the canonical one, NOT `instanceof Bandage`). Dressing sets
 * the wound `dressed` (arrests the bleed, begins the clot) via the trauma
 * behavior's `resolve`, spends the item, and re-arms the wound-tick so the
 * dressed wound heals to clear.
 *
 * Treatment is **skill-gated** — harm is the first non-combat advancement
 * consumer. Outcome quality = the dressing's `dressingQuality` × the
 * treater's `medicine` competence band; difficulty is derived from the
 * wound (a world-measurement, not a tag — advancement's rule). A graded
 * outcome mints an `ActSignature` (`recordDeed`) into the treater's
 * Transcript.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { AdvancementApi } from '../../../api/advancement';
import { HarmApi } from '../../../api/harm';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Vitals } from '../../../lib/vitals/Vitals';
import type { Dressing } from '../../../lib/vitals/Dressing';
import { TRAUMA_BEHAVIOR } from '../../../lib/vitals/Condition';
import type { Trauma } from '../../../lib/vitals/Condition';
import type { Difficulty, Outcome } from '../../../lib/advancement/ActSignature';

const TOPIC = 'world.narration.action';

interface TreatModel extends CommandModel {
  target?: MqlOneResult;
}

/** Pick the most-pressing dressable wound: bleeding first, then severity. */
function pickWound(target: Stuff & Vitals): Trauma | null {
  const traumas = target
    .getConditions()
    .filter((c): c is Trauma => c.kind === 'trauma');
  const open = traumas.filter((t) => t.bleeding && !t.dressed);
  const pool = open.length
    ? open
    : traumas.filter((t) => !t.dressed && t.severity > 0);
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => b.severity - a.severity)[0]!;
}

/** Wound severity/site → a world-grounded difficulty (a measurement). */
function difficultyFor(w: Trauma): Difficulty {
  const s = w.severity;
  let d: Difficulty =
    s < 0.5
      ? 'trivial'
      : s < 1
        ? 'easy'
        : s < 2
          ? 'standard'
          : s < 3
            ? 'hard'
            : 'formidable';
  // An avulsion is a step harder to dress than a plain laceration.
  if (w.type === 'avulsion') {
    const bump: Record<Difficulty, Difficulty> = {
      trivial: 'easy',
      easy: 'standard',
      standard: 'hard',
      hard: 'formidable',
      formidable: 'formidable',
    };
    d = bump[d];
  }
  return d;
}

const BAND_SCORE: Record<string, number> = {
  untrained: 0,
  novice: 1,
  competent: 2,
  proficient: 3,
  expert: 4,
};

/** Competence band × dressing quality → the graded outcome (deterministic). */
function outcomeFor(band: string, quality: number): Outcome {
  const score = (BAND_SCORE[band] ?? 0) + Math.round(Math.max(0, Math.min(1, quality)) * 2);
  if (score <= 1) return 'failure';
  if (score === 2) return 'partial';
  if (score <= 4) return 'success';
  return 'critical';
}

export default class TreatController extends CommandController<TreatModel> {
  async execute(model: TreatModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Default to self when no target was named; reject a named-but-unresolved
    // query.
    let target: Stuff | null;
    if (model.target?.stuff) {
      target = model.target.stuff;
    } else if (model.target?.raw) {
      return this.fail(
        context,
        `You don't see any '${model.target.raw}' to treat.`,
        'empty-result'
      );
    } else {
      target = giver;
    }
    const isSelf = target === giver;

    if (!MixinApi.isVitals(target)) {
      return this.fail(
        context,
        `You can't treat ${Mml.item(target).toString()}.`,
        'not-a-body'
      );
    }

    const wound = pickWound(target);
    if (!wound) {
      const who = isSelf ? 'You have' : `${target.getPresentation()} has`;
      return this.fail(context, `${who} no wound to dress.`, 'no-wound');
    }

    const dressing = ContainmentApi.findReachable(
      giver,
      context.location,
      (s: Stuff): s is Stuff & Dressing => MixinApi.isDressing(s)
    );
    if (!dressing) {
      return this.fail(
        context,
        'You have nothing to dress the wound with.',
        'no-dressing'
      );
    }

    const band = await AdvancementApi.bandFor(giver, 'medicine');
    const difficulty = difficultyFor(wound);
    const outcome = outcomeFor(band, dressing.getDressingQuality());

    // Mechanical effect: dress it (arrest the bleed, begin the clot), spend
    // the item, and re-arm the tick so the dressed wound heals to clear.
    TRAUMA_BEHAVIOR[wound.type].resolve(target, wound);
    await StuffApi.destruct(dressing);
    HarmApi.rearmWoundTicks(target);

    // Mint the graded deed into the treater's Transcript (the ActSignature).
    await AdvancementApi.recordDeed(giver, {
      discipline: 'medicine',
      difficulty,
      outcome,
    });

    const selfLine = isSelf
      ? Mml.compose`You dress the ${wound.type} on your ${siteWord(wound)}.`
      : Mml.compose`You dress the ${wound.type} on ${Mml.name(target)}.`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(selfLine)
      .toPeers(
        isSelf
          ? Mml.compose`${Mml.name(giver)} dresses a wound.`
          : Mml.compose`${Mml.name(giver)} dresses a wound on ${Mml.name(target)}.`
      )
      .send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: 'controller-rejected', reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}

/** A short human word for the wound's site (`body.leg.left.foot` → `foot`). */
function siteWord(w: Trauma): string {
  const parts = w.site.split('.');
  return parts[parts.length - 1] ?? w.site;
}
