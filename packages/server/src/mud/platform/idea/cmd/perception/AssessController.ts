/**
 * AssessController — `assess [target]`: a perception-gated readout of a
 * body's condition band and wounds.
 *
 * **Full fidelity on one's own body** (self); **banded + competence-gated
 * on others** — the treater's `medicine` competence sharpens the detail
 * (novice reads the qualitative state; proficient+ reads precise severity).
 * A **dressed** wound reads "dressed / bleeding controlled" and **hides
 * precise severity behind the dressing** — a high-competence (expert)
 * assessor can judge through it, else `undress` to see the true state.
 * This is the loop that answers "how do I know I'm healed."
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { WorldClockApi } from '../../../../api/worldclock';
import { CombatApi, type CombatAssessResult } from '../../../../api/combat';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Vitals, ConditionBand } from '../../../../lib/vitals/Vitals';
import { TRAUMA_BEHAVIOR } from '../../Condition';
import type { Trauma } from '../../Condition';
import type Condition from '../../Condition';
import { StuffApi } from '../../../../api/stuff';
import type { Combatant } from '../../../../lib/combat/Combatant';
import { Creature, type BmiBand } from '../../../../lib/creature/Creature';
import type BodyPlan from '../../species/BodyPlan';

const TOPIC = 'act.deed';

interface AssessModel extends CommandModel {
  target?: MqlOneResult;
}

const BAND_PHRASE: Record<ConditionBand, string> = {
  healthy: 'looks unhurt',
  hurt: 'looks hurt',
  serious: 'is seriously injured',
  critical: 'is in critical condition',
  dying: 'is dying',
  dead: 'is dead',
};

// Second-person conjugation for a self-assess (subject is "You") — the
// singular third-person verbs above ("looks", "is") don't agree with "You".
const BAND_PHRASE_SELF: Record<ConditionBand, string> = {
  healthy: 'look unhurt',
  hurt: 'look hurt',
  serious: 'are seriously injured',
  critical: 'are in critical condition',
  dying: 'are dying',
  dead: 'are dead',
};

/** The weight band in the physician's words — a percept, never a figure. */
const BMI_PHRASE: Readonly<Record<BmiBand, string>> = {
  underweight: 'underweight for the frame',
  healthy: 'of a healthy weight',
  overweight: 'carrying more weight than is good for the frame',
  obese: 'heavily overweight',
};

export default class AssessController extends CommandController<AssessModel> {
  async execute(model: AssessModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    let target: Stuff | null;
    if (model.target?.stuff) {
      target = model.target.stuff;
    } else if (model.target?.raw) {
      return this.fail(
        context,
        `You don't see any '${model.target.raw}' to assess.`,
        'empty-result'
      );
    } else {
      target = giver;
    }
    const isSelf = target === giver;

    // Mid-fight, `assess <opponent>` is the costed combat read: it spends
    // the actor's next exchange, mints a combat signature, and reveals the
    // opponent's banded tactical state (poise / flags / armed) at a
    // fidelity the passive `fight` read hedges. Only against the actual
    // opponent (1v1) — assessing a bystander stays the medic read.
    if (!isSelf) {
      const session = CombatApi.sessionFor(giver);
      const opp = session?.opponentState(giver)?.combatant;
      if (opp && (opp as Stuff) === (target as Stuff)) {
        const read = (giver as unknown as Stuff & Combatant).assessCombat(
          target,
        );
        if (read.ok) return this.renderCombatAssess(giver, target, read);
      }
    }

    if (!MixinApi.isVitals(target)) {
      return this.fail(
        context,
        `You can't assess ${Mml.thing(target).toString()}.`,
        'not-a-body'
      );
    }
    // Self reads full fidelity; on others the medicine competence band
    // gates the detail. (The perception/recognition layer gates *whether*
    // you can see the target at all via the visibility validators; the
    // detail *sharpening* is the competence axis.)
    const medBand = isSelf
      ? 'expert'
      : MixinApi.isAdvancing(giver)
        ? await giver.competenceBandFor('medicine')
        : 'untrained';
    const precise =
      isSelf || medBand === 'proficient' || medBand === 'expert';

    const wounds = (target as Stuff & Vitals)
      .getConditions()
      .filter((c): c is Trauma => c.kind === 'trauma');

    const label = isSelf ? 'You' : target.getPresentation();
    const band = (target as Stuff & Vitals).getConditionBand();
    const blocks: string[] = [
      Mml.fromMarkup(
        `${Mml.strong(label).toString()} ${Mml.escape(
          isSelf ? BAND_PHRASE_SELF[band] : BAND_PHRASE[band]
        )}.`
      ).toString(),
    ];

    // ⭐ The weight, in the physician's words and never a number. A
    // competent medic (or yourself) can say which band a body sits in;
    // a novice sees the body-condition line above and nothing more. The
    // BMI itself is derived on the body (`Creature.bodyMassIndexBand`)
    // and rendered nowhere.
    if ((medBand === 'competent' || precise) && target instanceof Creature) {
      const who = isSelf ? 'You are' : `${target.getPresentation()} is`;
      blocks.push(
        Mml.fromMarkup(
          `${Mml.escape(who)} ${Mml.escape(BMI_PHRASE[target.bodyMassIndexBand()])}.`
        ).toString(),
      );
    }

    // The dying readout. Competence buys INFORMATION, never outcomes: a
    // novice can tell that someone is going, a competent one can name what
    // is taking them, and only a proficient medic can say how long there
    // is to work with. No roll, no effect on the clock itself.
    const vitalsTarget = target as Stuff & Vitals;
    if (vitalsTarget.isDying()) {
      const cause = vitalsTarget.getCauseOfDeath();
      const remaining = vitalsTarget.getDyingRemainingSec();
      const who = isSelf ? 'You are' : `${target.getPresentation()} is`;
      if (precise && remaining !== null) {
        blocks.push(
          Mml.escape(
            `${who} dying${cause ? ` of ${cause}` : ''} — about ` +
              `${Math.max(1, Math.round(remaining / 60))} minute(s) left.`,
          ),
        );
      } else if (medBand === 'competent' && cause) {
        blocks.push(Mml.escape(`${who} dying of ${cause}.`));
      } else {
        blocks.push(Mml.escape(`${who} dying.`));
      }
    }

    // The affliction readout — what is WRONG with someone that isn't a
    // wound. Without it `assess` could describe only trauma, so anything
    // carried rather than cut showed up nowhere: a body under the floor
    // route's `recovering` diminishment read exactly as "unhurt", and the
    // cost a resurrection service is meant to undercut was invisible to
    // the player who paid it.
    //
    // Signs, not names. `observableSigns` is authored per condition
    // precisely so a looker reports what they can SEE ("unsteady",
    // "hollow") — naming the condition is a diagnosis, and diagnosis is
    // what competence buys. Same rule as the dying block above: a novice
    // sees that something is off, a competent medic names it.
    const afflictions = (target as Stuff & Vitals)
      .getConditions()
      .filter((c) => c.kind === 'affliction');
    if (afflictions.length > 0) {
      const named = medBand === 'competent' || precise;
      const seen: string[] = [];
      for (const a of afflictions) {
        const path = (a as { templatePath: string }).templatePath;
        const condition = StuffApi.findByTemplatePath<Condition>(path);
        if (condition) {
          seen.push(
            named
              ? condition.getName()
              : (condition.getObservableSigns()[0] ?? 'unwell'),
          );
          continue;
        }
        // The Idea is not live. Condition seeds are inserted as template
        // ROWS and nothing clones them into Ideas at boot, so today
        // `findByTemplatePath` answers null for every one of them —
        // `starvation` as much as `recovering`. (Pre-existing and
        // world-wide: `Metabolic.resolveToxinBehavior` and `MagicLogic`
        // already tolerate the same null.) Resolving the catalogue is its
        // own build; until then, degrade to the path's leaf rather than
        // rendering nothing, so the readout is useful now and gets
        // strictly better — authored signs, real names — the moment the
        // Ideas exist.
        const leaf = path.split('/').filter(Boolean).pop();
        if (!leaf) continue;
        // The competence rule still holds: a leaf IS the condition's
        // name, so an untrained looker must not be handed it.
        seen.push(named ? leaf.replace(/-/g, ' ') : 'unwell');
      }
      if (seen.length > 0) {
        const who = isSelf ? 'You seem' : `${target.getPresentation()} seems`;
        blocks.push(Mml.escape(`${who} ${[...new Set(seen)].join(', ')}.`));
      }
    }

    // ⭐⭐ **Interior wounds read differently, and that is the point** (D10).
    //
    // A wound inside a cavity is not visible and cannot be judged by
    // looking. The shipped competence rule already says a novice reads
    // *"bleeding badly"* and a practised eye reads the site; this is that
    // rule one clause wider:
    //
    //   - **untrained / novice on someone else** — nothing at all. There
    //     is no outward sign of a torn liver.
    //   - **yourself** — one line, and it names nothing: *"Something is
    //     wrong inside; you cannot tell what."* ⭐ This is the honest
    //     asymmetry the build wants: you know less about your own body
    //     than a competent stranger does.
    //   - **competent** — names the organ.
    //   - **precise** — adds the severity, like any other wound.
    const plan = MixinApi.isOrganism(target)
      ? target.getSpecies()?.getBodyPlan()
      : null;
    const isInterior = (w: Trauma): boolean =>
      plan?.isInterior(w.site) ?? false;
    // ⭐⭐ **Naming an interior wound reads REAL competence, not the self
    // shortcut.** `medBand` is forced to `expert` for a self-assess — the
    // shipped fidelity rule, and right for everything you can SEE. It is
    // wrong here: what your own liver is doing is not visible to you
    // because it is you, and a body that could name its own internal
    // injuries would delete the asymmetry this clause exists for.
    //
    // So a trained medic examining themselves still names it (they know
    // the signs) and an ordinary player does not — and learns more from a
    // competent stranger than from looking, which is the drive's step 7.
    const realMedBand = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor('medicine')
      : 'untrained';
    const named =
      realMedBand === 'competent' ||
      realMedBand === 'proficient' ||
      realMedBand === 'expert';
    const visible = wounds.filter((w) => !isInterior(w));
    const hidden = wounds.filter(isInterior);

    if (visible.length === 0 && hidden.length === 0) {
      blocks.push(Mml.escape('No visible wounds.'));
    } else {
      const lines = visible.map((w) => {
        let line = TRAUMA_BEHAVIOR[w.type].describe(w);
        // A dressed wound gates precise severity behind the dressing:
        // only self / an expert can judge through it.
        const canJudge =
          precise && (!w.dressed || isSelf || medBand === 'expert');
        if (canJudge) line += ` (severity ${w.severity.toFixed(1)})`;
        return line;
      });
      if (named) {
        for (const w of hidden) {
          let line = TRAUMA_BEHAVIOR[w.type].describe(w);
          if (precise) line += ` (severity ${w.severity.toFixed(1)})`;
          lines.push(line);
        }
      }
      if (lines.length === 0) {
        blocks.push(Mml.escape('No visible wounds.'));
      } else {
        blocks.push(
          Mml.unorderedList(
            lines.map((l) => Mml.fromMarkup(Mml.escape(l)))
          ).toString()
        );
      }
      if (hidden.length > 0 && !named) {
        blocks.push(
          Mml.escape(
            isSelf
              ? 'Something is wrong inside; you cannot tell what.'
              : `${target.getPresentation()} is hurt in some way you cannot read.`,
          ),
        );
      }
      // ⭐ **How fast it is knitting** — one line from the convalescence
      // factor `k` (recovery build). A bed, a carer and a spell all raise
      // it; being freshly hurt or in a fight drops it to nothing (D3a).
      // The same read every wound's `mend` uses, said in words.
      const k = (target as Stuff & Vitals).convalescenceFactor();
      const pace =
        k <= 0
          ? isSelf
            ? 'Nothing is knitting yet — too soon, or you are not safe.'
            : `${target.getPresentation()} is not mending — too recently hurt, or not safe.`
          : k >= 1.5
            ? 'The wounds are mending well.'
            : k >= 0.5
              ? 'The wounds are mending steadily.'
              : 'The wounds are mending slowly.';
      blocks.push(Mml.escape(pace));
    }

    // ⭐ **A festering wound** (D11) — a symptomatic wound-sepsis reads even
    // when the wound itself has closed. The one clinical read that says the
    // infection deadline is running.
    const now = WorldClockApi.getNow().rawValue();
    const septic = (target as Stuff & Vitals)
      .getConditions()
      .some(
        (c) =>
          c.kind === 'affliction' &&
          c.templatePath.endsWith('/wound-sepsis') &&
          (c.pathogenLoad ?? 0) > 0 &&
          now >= (c.symptomsAt ?? Infinity),
      );
    if (septic) {
      blocks.push(
        Mml.escape(
          isSelf
            ? 'One of your wounds is festering — hot, swollen, and starting to smell.'
            : `One of ${target.getPresentation()}'s wounds is festering.`,
        ),
      );
    }

    // ⭐ Scars (D14) — what the body survived. Read to anyone; never a
    // penalty, just a history written on the skin.
    const scars = (target as Stuff & Vitals).getScars();
    if (scars.length > 0) {
      const lines = scars.map(
        (sc) => `a healed ${sc.type} of ${sc.site}`,
      );
      blocks.push(Mml.escape(`Scars: ${lines.join('; ')}.`));
    }

    // ⭐ Prosthetics (D16) — a worn stand-in for a lost part.
    if (MixinApi.isSlotted(target)) {
      const standIns: string[] = [];
      for (const slot of target.getSlotNames()) {
        for (const occ of target.getOccupants(slot)) {
          const item = occ as unknown as Stuff;
          if (MixinApi.isProsthetic(item)) {
            standIns.push(item.getPresentation());
          }
        }
      }
      if (standIns.length > 0) {
        blocks.push(
          Mml.escape(`Fitted with ${standIns.join(', ')}.`),
        );
      }
    }

    // ⭐⭐ **The anatomy block** (D12) — one line per part: what it is,
    // how well it still works, and what is over it, outside-in.
    //
    // `assess` listed wounds and never listed PARTS, so a player had no
    // way to see that they now have a brain, a spine and a liver, no way
    // to read a function band, and — the reachability gap AC 8 names — no
    // way to confirm that three layers of armour are all being counted.
    // The covering stack is `coveringAt`, which is already the one
    // outside-in walk the resist fold uses, so what is printed here is
    // literally what a blow will go through.
    const anatomy = this.renderAnatomy(target, plan, named, isSelf);
    if (anatomy.length > 0) {
      blocks.push(Mml.unorderedList(anatomy).toString());
    }

    const body = Mml.fromMarkup(blocks.join('\n\n'));
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }

  /**
   * One line per body part — `torso — full — steel breastplate over mail
   * hauberk over padded gambeson`.
   *
   * ⚠ **Interior parts are listed only to a reader who could name them**
   * (the same competence rule the wound list uses). A missing part says so
   * instead of showing a band, because *"left hand — lost"* reads as an
   * injury and the hand is not there at all.
   */
  private renderAnatomy(
    target: Stuff,
    plan: BodyPlan | null | undefined,
    named: boolean,
    isSelf: boolean,
  ): Mml[] {
    if (!plan || !MixinApi.isVitals(target)) return [];
    const out: Mml[] = [];
    for (const part of target.getParts()) {
      const interior = plan.isInterior(part.key);
      // ⭐⭐ **You know your own anatomy; you cannot read it.** The drive
      // caught this: an untrained self-assess showed ten exterior parts
      // and no brain, spine or liver, because naming an interior part was
      // gated on medicine competence. But *"do I have a liver"* is not a
      // diagnosis — everybody has one, and drive step 2 asks to SEE the
      // organs that were not there before.
      //
      // ⚠ What stays gated is the BAND. Showing an untrained player
      // `liver — failing` would hand them exactly the diagnosis D10 says
      // they cannot make about themselves. So on yourself an organ is
      // listed as present and nothing more; a competent reader gets the
      // band; a stranger with no training gets no organ at all, because
      // they cannot see inside you.
      if (interior && !named && !isSelf) continue;
      const label = part.key.replace(/^body\./, '').replace(/\./g, ' ');
      if (part.missing) {
        out.push(Mml.fromMarkup(Mml.escape(`${label} — gone`)));
        continue;
      }
      if (interior && !named) {
        out.push(Mml.fromMarkup(Mml.escape(label)));
        continue;
      }
      let line = `${label} — ${target.functionAt(part.key)}`;
      if (!interior && MixinApi.isAttired(target)) {
        const stack = target
          .coveringAt(part.key)
          .map((layer) => (layer as unknown as Stuff).getPresentation());
        if (stack.length > 0) line += ` — ${stack.join(' over ')}`;
      }
      out.push(Mml.fromMarkup(Mml.escape(line)));
    }
    // A body with no anatomy authored (no species/bodyplan) says nothing
    // rather than printing an empty list.
    if (out.length === 0) return [];
    return [
      Mml.fromMarkup(
        Mml.escape(isSelf ? 'Your body:' : 'Their body:'),
      ),
      ...out,
    ];
  }

  /** The mid-fight tactical read — bands only, never a number. */
  private renderCombatAssess(
    giver: Stuff,
    target: Stuff,
    read: CombatAssessResult,
  ): void {
    const label = target.getPresentation();
    const guard = read.poiseBand ?? 'steady';
    const arms = read.armed ? 'armed' : 'unarmed';
    const lines: string[] = [
      Mml.fromMarkup(
        `You read ${Mml.strong(Mml.escape(label)).toString()} — guard ${Mml.escape(
          guard,
        )}, ${Mml.escape(arms)}.`,
      ).toString(),
    ];
    if (read.conditionBand) {
      // Reuse the label subject (as the medical read does) so the singular
      // `BAND_PHRASE` verbs agree — "…looks unhurt", never "They looks…".
      lines.push(
        Mml.fromMarkup(
          `${Mml.strong(Mml.escape(label)).toString()} ${Mml.escape(
            BAND_PHRASE[read.conditionBand as ConditionBand] ?? 'looks hurt',
          )}.`,
        ).toString(),
      );
    }
    if (read.flags && read.flags.length > 0) {
      lines.push(Mml.escape(`Off balance: ${read.flags.join(', ')}.`));
    }
    const body = Mml.fromMarkup(lines.join('\n\n'));
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: 'controller-rejected', reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
