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

import { CommandController } from '../../../../lib/command/CommandController';
import { CompetenceBand } from '../../../../lib/advancement/CompetenceBand';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi } from '../../../../api/mql';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import type Condition from '../../Condition';
import type ConditionCatalogue from '../../ConditionCatalogue';
import { TemplatePaths } from '../../../../lib/paths';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Vitals } from '../../../../lib/vitals/Vitals';
import type { Dressing } from '../../../../lib/vitals/Dressing';
import { TRAUMA_BEHAVIOR } from '../../Condition';
import type { Trauma, AfflictionRecord } from '../../Condition';
import type { Difficulty, Outcome } from '../../../../lib/advancement/ActSignature';

const TOPIC = 'act.deed';

interface TreatModel extends CommandModel {
  target?: MqlOneResult;
  /** `treat <target> with <item>` — the treatment being offered. */
  with?: MqlOneResult;
  /**
   * ⭐⭐ `treat <target> for <condition>` — **what the medic thinks it
   * is.** The judgment loop: `analyze patient` hands back candidates
   * plural and unranked, and this is where the medic commits.
   */
  for?: string;
}

/** How much a single treatment pours into someone. */
const TREAT_FLUID_LITRES = 0.25;

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

/**
 * ⭐ **What the treater is offering**, matched against what the target's
 * conditions declare relieves them.
 *
 * The closed vocabulary is `ResolutionSpec.by`'s: `dressing` · `fluid` ·
 * `medicine` · `rest` · `warmth` · `cooling` · `air` · an antidote token.
 * `treat` can supply the first three; the rest are things the world does
 * to you, not things a medic hands over, and asking for them is refused
 * with the reason.
 */
type Treatment =
  | { by: 'dressing'; item: Stuff & Dressing }
  | { by: 'fluid'; item: Stuff }
  | { by: 'medicine' }
  | { by: string; item: Stuff };

/** What a condition declares relieves it, or null when nothing does. */
function resolutionOf(c: Trauma | AfflictionRecord): string | null {
  if (c.kind === 'trauma') {
    return TRAUMA_BEHAVIOR[c.type]?.resolution ?? null;
  }
  const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
  return row?.getResolution()?.by ?? null;
}

/** Prose for a treatment that does nothing for what is wrong. */
function mismatchLine(offered: string, wanted: string | null): string {
  if (wanted === null) return 'Nothing you have will touch that.';
  const words: Record<string, string> = {
    dressing: 'a bandage',
    fluid: 'water',
    medicine: 'sitting with them',
    rest: 'rest',
    warmth: 'warmth',
    cooling: 'cooling',
    air: 'air',
  };
  const o = words[offered] ?? offered;
  const w = words[wanted] ?? wanted;
  return `${o[0]!.toUpperCase()}${o.slice(1)} does nothing for that. It wants ${w}.`;
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
        `You can't treat ${Mml.thing(target).toString()}.`,
        'not-a-body'
      );
    }

    // A body in the dying window is treatable even with no wound to
    // dress — the thing killing it may be cold, or a toxin, or blood
    // already lost. Stabilizing is not the same act as dressing.
    const dying = target.isDying();

    // ⭐ **What are you actually offering?** An explicit `with <item>`
    // wins; otherwise the first thing to hand that could treat anything.
    const treatment = this.resolveTreatment(model, giver);

    // ⭐⭐ **The judgment loop.** When the medic NAMES what they are
    // treating, that is the act being graded — not the bandaging.
    if (model.for) {
      return this.treatNamed(target, model.for, treatment, isSelf, context);
    }

    // ⭐⭐ **Match it against what is wrong.** `pickWound` used to choose
    // the worst wound and the verb applied whatever was carried to it. It
    // now picks the worst condition **this treatment can actually
    // relieve** — and refuses, with the reason, when nothing matches.
    const treatable = this.pickTreatable(target, treatment.by);
    if (!treatable && !dying) {
      const worst = pickWound(target) ?? firstAffliction(target);
      if (!worst) {
        const who = isSelf ? 'You have' : `${target.getPresentation()} has`;
        return this.fail(context, `${who} nothing to treat.`, 'no-wound');
      }
      // Something IS wrong — this is just not what it wants. That
      // refusal is the teaching.
      return this.fail(
        context,
        mismatchLine(treatment.by, resolutionOf(worst)),
        'wrong-treatment',
      );
    }

    // An illness wants a medic's hands, not an item.
    if (treatable && treatable.kind === 'affliction') {
      return this.tendInfection(target, treatable, isSelf, context);
    }

    const wound = treatable as Trauma | null;
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor('medicine')
      : CompetenceBand.FLOOR;
    // Pulling someone back from the edge is the hardest thing this verb
    // does, whatever the wound looks like.
    const difficulty: Difficulty = dying
      ? 'formidable'
      : difficultyFor(wound!);
    // Quality is the dressing's when there is one; fluid and bare hands
    // are worth a middling article.
    const quality =
      treatment.by === 'dressing'
        ? (treatment as { item: Stuff & Dressing }).item.getDressingQuality()
        : 0.5;
    const outcome = outcomeFor(band, quality);

    // Mechanical effect. A dressing arrests the bleed and begins the clot
    // through the trauma's own `resolve`; fluid is DRUNK, through the
    // shipped ingest path, which is what makes it a real supply that runs
    // out rather than a gesture.
    if (wound && treatment.by === 'dressing') {
      TRAUMA_BEHAVIOR[wound.type].resolve(target, wound);
    } else if (wound && treatment.by === 'fluid') {
      this.pourInto(target, (treatment as { item: Stuff }).item);
    }

    // The stabilization: pull them out of the dying window. RESCUED, NOT
    // HEALED — whatever drove them under is untouched, so a body still
    // below its threshold re-enters the window on the next reconcile.
    // Stabilizing someone in a snowdrift buys them time, not a life.
    const stabilized =
      dying && outcome !== 'failure' ? target.stabilize() : false;

    // The dressing is spent either way; a vessel is emptied, not
    // destroyed — you keep the waterskin.
    if (treatment.by === 'dressing') {
      await StuffApi.destruct((treatment as { item: Stuff }).item);
    }

    // Mint the graded deed into the treater's Transcript (the ActSignature).
    if (MixinApi.isAdvancing(giver))
      await giver.creditDeed({
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
            : Mml.compose`You drag ${Mml.actor(target)} back from the edge.`
        )
        .toPeers(
          isSelf
            ? Mml.compose`${Mml.actor(giver)} drags themselves back from the edge.`
            : Mml.compose`${Mml.actor(giver)} drags ${Mml.actor(target)} back from the edge.`
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
            : Mml.compose`You can't hold ${Mml.actor(target)}.`
        )
        .send();
      return;
    }

    const verb = treatment.by === 'fluid' ? 'get water onto' : 'dress';
    const selfLine = isSelf
      ? Mml.compose`You ${verb} the ${wound.type} on your ${siteWord(wound)}.`
      : Mml.compose`You ${verb} the ${wound.type} on ${Mml.actor(target)}.`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(selfLine)
      .toPeers(
        isSelf
          ? Mml.compose`${Mml.actor(giver)} tends a wound.`
          : Mml.compose`${Mml.actor(giver)} tends a wound on ${Mml.actor(target)}.`
      )
      .send();
  }

  /**
   * ⭐⭐ **The medic names it, and can be wrong.**
   *
   * `analyze patient` deliberately returns candidates *plural and
   * unranked*, so choosing between them is the medic's act rather than a
   * readout. This grades that act:
   *
   * - **difficulty** is the AMBIGUITY — how many warmed conditions could
   *   produce the signs this body is showing. That is a measurement of
   *   the world, not a tag: a presentation only one thing causes is easy
   *   to call and a presentation four things cause is not.
   * - **outcome** is whether the named condition is one the body actually
   *   carries.
   *
   * ⚠ A wrong call **spends the supply and changes nothing**, and the
   * body tells the medic by not getting better — the next `analyze` shows
   * the same signs. Nothing announces the mistake, because a game that
   * announced it would be grading the medic instead of letting the world
   * do it.
   */
  private async treatNamed(
    target: Stuff & Vitals,
    named: string,
    treatment: Treatment,
    isSelf: boolean,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const wanted = named.trim().toLowerCase();
    const carried = target
      .getConditions()
      .filter((c): c is AfflictionRecord => c.kind === 'affliction');

    // What this body is showing, and everything that could show it.
    const signs = new Set<string>();
    for (const c of carried) {
      const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
      for (const sign of row?.getObservableSigns() ?? []) signs.add(sign);
    }
    const catalogue = StuffApi.findByTemplatePath<ConditionCatalogue>(
      TemplatePaths.conditionCatalogue,
    );
    const candidates = (catalogue?.roster() ?? []).filter((row) =>
      (row.getObservableSigns() ?? []).some((sign) => signs.has(sign)),
    );
    // ⭐ The ambiguity IS the difficulty.
    const difficulty: Difficulty =
      candidates.length >= 4
        ? 'formidable'
        : candidates.length === 3
          ? 'hard'
          : candidates.length === 2
            ? 'standard'
            : 'easy';

    const hit =
      carried.find((c) => {
        const row = StuffApi.findByTemplatePath<Condition>(c.templatePath);
        return (row?.getName() ?? '').toLowerCase() === wanted;
      }) ?? null;

    // The supply is spent either way — that is what makes a wrong call
    // cost something.
    if (treatment.by === 'dressing') {
      await StuffApi.destruct((treatment as { item: Stuff }).item);
    }

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: 'medicine',
        difficulty,
        outcome: hit ? 'success' : 'failure',
      });
    }

    const who = isSelf ? 'yourself' : target.getPresentation();
    if (!hit) {
      // ⚠ It does NOT say "wrong". The body says it, by not improving.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.fromMarkup(
            Mml.escape(
              `You treat ${who} for ${named}, and do it properly. ` +
                `Nothing about them changes.`,
            ),
          ),
        )
        .send();
      return;
    }

    // Right call: resolve it the way its own row says it resolves.
    if (hit.pathogenLoad !== undefined) {
      return this.tendInfection(target, hit, isSelf, context);
    }
    const row = StuffApi.findByTemplatePath<Condition>(hit.templatePath);
    const wants = row?.getResolution()?.by ?? null;
    if (wants && wants !== treatment.by) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.fromMarkup(
            Mml.escape(
              `You have it right — but ${mismatchLine(treatment.by, wants)}`,
            ),
          ),
        )
        .send();
      return;
    }
    if (treatment.by === 'fluid') {
      this.pourInto(target, (treatment as { item: Stuff }).item);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.fromMarkup(
          Mml.escape(`You treat ${who} for ${named}, and it answers.`),
        ),
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} tends ${Mml.actor(target as unknown as Stuff)}.`)
      .send();
  }

  /**
   * ⭐ **What the treater is offering.** An explicit `with <item>` wins;
   * otherwise the first thing to hand that could treat anything, and
   * failing that the medic's own hands.
   *
   * ⚠ Bare hands are `medicine` — the load knock — not "nothing". That
   * is what lets `treat` reach an illness at all: `tendInfection` has
   * been in this file since it was written, complete, commented, and
   * **with no caller anywhere**.
   */
  private resolveTreatment(model: TreatModel, giver: Stuff): Treatment {
    const named = model.with?.stuff ?? null;
    const reachable = MqlApi.resolveMany('reachable', {
      commandGiver: giver as never,
      scope: 'reachable',
    }).stuff;
    const classify = (item: Stuff): Treatment | null => {
      if (MixinApi.isDressing(item)) return { by: 'dressing', item };
      if (
        MixinApi.isBulkable(item) &&
        item.getBulkAmount('interior').rawValue() > 0
      ) {
        return { by: 'fluid', item };
      }
      return null;
    };
    if (named) {
      // A named item that treats nothing is still what they chose: the
      // mismatch is reported against it rather than silently ignored.
      return classify(named) ?? { by: 'medicine' };
    }
    for (const item of reachable) {
      const t = classify(item);
      if (t) return t;
    }
    return { by: 'medicine' };
  }

  /**
   * The worst condition this treatment can actually relieve, or null.
   * Bleeding first, then severity — the shipped ordering, now filtered by
   * what the treatment is FOR.
   */
  private pickTreatable(
    target: Stuff & Vitals,
    by: string,
  ): Trauma | AfflictionRecord | null {
    const conditions = target.getConditions();
    const traumas = conditions
      .filter((c): c is Trauma => c.kind === 'trauma')
      .filter((t) => !t.dressed && t.severity > 0)
      .filter((t) => resolutionOf(t) === by);
    if (traumas.length > 0) {
      const bleeding = traumas.filter((t) => t.bleeding);
      const pool = bleeding.length ? bleeding : traumas;
      return [...pool].sort((a, b) => b.severity - a.severity)[0]!;
    }
    const afflictions = conditions
      .filter((c): c is AfflictionRecord => c.kind === 'affliction')
      .filter((a) => resolutionOf(a) === by);
    return [...afflictions].sort((a, b) => b.stage - a.stage)[0] ?? null;
  }

  /**
   * Fluid, drunk. Routed through the shipped `Metabolic.ingest` path so
   * the water is a real supply that runs out — a medic with an empty
   * skin has nothing to give, which is the whole point of pricing a
   * treatment.
   */
  private pourInto(target: Stuff & Vitals, vessel: Stuff): void {
    if (!MixinApi.isBulkable(vessel)) return;
    const self = target as unknown as Stuff;
    if (!MixinApi.isMetabolic(self)) return;
    const material = vessel.getBulkMaterial('interior');
    if (!material) return;
    const have = vessel.getBulkAmount('interior').rawValue();
    const dose = Math.min(have, TREAT_FLUID_LITRES);
    if (!(dose > 0)) return;
    const taken = self.ingest(
      material,
      Quantity.of(dose, 'L'),
      'liquid',
      vessel.getBulkPayload('interior'),
    );
    if (taken > 0) vessel.debitBulk('interior', taken);
  }

  /**
   * ⭐ **Tend an illness.** Not a cure and not a coin flip: the medic's
   * competence knocks the population back, and how far depends on how good
   * they are. A capable one clears it outright; a novice buys the body
   * time it would not otherwise have had.
   *
   * ⚠ No dressing is spent — you do not bandage dysentery — and no new
   * pharmacology arrives with it. What a medic changes is which way the
   * race between growth and clearance is already going, which is exactly
   * the shape the requirements asked for: this build **creates demand for
   * a diagnostician and deliberately supplies none.**
   */
  private async tendInfection(
    target: Stuff & Vitals,
    infection: AfflictionRecord,
    isSelf: boolean,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor('medicine')
      : CompetenceBand.FLOOR;
    const score = BAND_SCORE[band] ?? 0;
    const outcome: Outcome =
      score >= 3
        ? 'critical'
        : score >= 2
          ? 'success'
          : score >= 1
            ? 'partial'
            : 'failure';
    // Knock the population back by what the hand is worth. A failure is a
    // failure: you sat with them, and nothing changed.
    const knock = [0, 0.35, 0.6, 0.85, 1][score] ?? 0;
    const before = infection.pathogenLoad ?? 0;
    infection.pathogenLoad = Math.max(0, before * (1 - knock));
    const cleared = infection.pathogenLoad <= 0.01;
    if (cleared) target.relieve(infection);

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: 'medicine',
        difficulty: 'standard',
        outcome,
      });
    }

    const who = isSelf ? 'yourself' : target.getPresentation();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        cleared
          ? Mml.compose`You get water and rest into ${who}, and the worst of it passes.`
          : knock > 0
            ? Mml.compose`You do what can be done for ${who}. It is not nothing.`
            : Mml.compose`You sit with ${who} for a while. You are not sure it helped.`,
      )
      .toPeers(
        isSelf
          ? Mml.compose`${Mml.actor(giver)} tends themselves.`
          : Mml.compose`${Mml.actor(giver)} tends ${Mml.actor(target as unknown as Stuff)}.`,
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

/** The first affliction on a body, for the mismatch report. */
function firstAffliction(target: Stuff & Vitals): AfflictionRecord | null {
  for (const c of target.getConditions()) {
    if (c.kind === 'affliction') return c;
  }
  return null;
}

/** A short human word for the wound's site (`body.leg.left.foot` → `foot`). */
function siteWord(w: Trauma): string {
  const parts = w.site.split('.');
  return parts[parts.length - 1] ?? w.site;
}
