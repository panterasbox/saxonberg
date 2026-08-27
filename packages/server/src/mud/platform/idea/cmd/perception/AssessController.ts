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
import { AdvancementApi } from '../../../../api/advancement';
import { CombatApi, type CombatAssessResult } from '../../../../api/combat';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Vitals, ConditionBand } from '../../../../lib/vitals/Vitals';
import { TRAUMA_BEHAVIOR } from '../../Condition';
import type { Trauma } from '../../Condition';
import type Condition from '../../Condition';
import { StuffApi } from '../../../../api/stuff';

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
        const read = CombatApi.assess(giver as Stuff, target);
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
    const medBand = isSelf ? 'expert' : await AdvancementApi.bandFor(giver, 'medicine');
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

    if (wounds.length === 0) {
      blocks.push(Mml.escape('No visible wounds.'));
    } else {
      blocks.push(
        Mml.unorderedList(
          wounds.map((w) => {
            let line = TRAUMA_BEHAVIOR[w.type].describe(w);
            // A dressed wound gates precise severity behind the dressing:
            // only self / an expert can judge through it.
            const canJudge =
              precise && (!w.dressed || isSelf || medBand === 'expert');
            if (canJudge) line += ` (severity ${w.severity.toFixed(1)})`;
            return Mml.fromMarkup(Mml.escape(line));
          })
        ).toString()
      );
    }

    const body = Mml.fromMarkup(blocks.join('\n\n'));
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
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
