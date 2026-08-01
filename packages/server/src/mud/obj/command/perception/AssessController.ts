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

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { AdvancementApi } from '../../../api/advancement';
import { CombatApi, type CombatAssessResult } from '../../../api/combat';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Vitals, ConditionBand } from '../../../lib/vitals/Vitals';
import { TRAUMA_BEHAVIOR } from '../../../lib/vitals/Condition';
import type { Trauma } from '../../../lib/vitals/Condition';

const TOPIC = 'world.narration.action';

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
        `You can't assess ${Mml.item(target).toString()}.`,
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
