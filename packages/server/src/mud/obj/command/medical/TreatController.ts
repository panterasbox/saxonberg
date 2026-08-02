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
import { MqlApi } from '../../../api/mql';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { AdvancementApi } from '../../../api/advancement';
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

    // A body in the dying window is treatable even with no wound to
    // dress — the thing killing it may be cold, or a toxin, or blood
    // already lost. Stabilizing is not the same act as dressing.
    const dying = target.isDying();
    const wound = pickWound(target);
    if (!wound && !dying) {
      const who = isSelf ? 'You have' : `${target.getPresentation()} has`;
      return this.fail(context, `${who} no wound to dress.`, 'no-wound');
    }

    const dressing =
      MqlApi.resolveMany('reachable', {
        commandGiver: giver,
        scope: 'reachable',
      }).stuff.find(
        (s): s is Stuff & Dressing => MixinApi.isDressing(s)
      ) ?? null;
    if (!dressing) {
      return this.fail(
        context,
        'You have nothing to dress the wound with.',
        'no-dressing'
      );
    }

    const band = await AdvancementApi.bandFor(giver, 'medicine');
    // Pulling someone back from the edge is the hardest thing this verb
    // does, whatever the wound looks like.
    const difficulty: Difficulty = dying
      ? 'formidable'
      : difficultyFor(wound!);
    const outcome = outcomeFor(band, dressing.getDressingQuality());

    // Mechanical effect: dress the wound (arrest the bleed, begin the
    // clot) and spend the item. The dressed wound heals to clear on the
    // next read (reconcile-on-read — no tick to arm).
    if (wound) TRAUMA_BEHAVIOR[wound.type].resolve(target, wound);

    // The stabilization: pull them out of the dying window. RESCUED, NOT
    // HEALED — whatever drove them under is untouched, so a body still
    // below its threshold re-enters the window on the next reconcile.
    // Stabilizing someone in a snowdrift buys them time, not a life.
    const stabilized =
      dying && outcome !== 'failure' ? target.stabilize() : false;

    await StuffApi.destruct(dressing);

    // Mint the graded deed into the treater's Transcript (the ActSignature).
    await AdvancementApi.recordDeed(giver, {
      discipline: 'medicine',
      difficulty,
      outcome,
    });

    if (stabilized) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          isSelf
            ? Mml.compose`You drag yourself back from the edge.`
            : Mml.compose`You drag ${Mml.name(target)} back from the edge.`
        )
        .toPeers(
          isSelf
            ? Mml.compose`${Mml.name(giver)} drags themselves back from the edge.`
            : Mml.compose`${Mml.name(giver)} drags ${Mml.name(target)} back from the edge.`
        )
        .send();
      return;
    }

    if (!wound) {
      // Dying, and the attempt was not good enough to hold them.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          isSelf
            ? Mml.compose`You can't stop it.`
            : Mml.compose`You can't hold ${Mml.name(target)}.`
        )
        .send();
      return;
    }

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
