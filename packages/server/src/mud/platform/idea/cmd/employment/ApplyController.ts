/**
 * ApplyController — the `apply` verb: ask for a job that is going here.
 *
 * ⭐ **The player moves first.** An opening is advertised on a card the
 * room's `look` prints, and the applicant asks. The alternative — an NPC
 * who notices your profile fits and offers — is the more flattering
 * mechanism and the wrong one to ship first: it is not how getting a job
 * works, and a house that can pick you out of a crowd can also pass you
 * over for reasons it never has to say.
 *
 * ⭐⭐ **Standing is conferred by the employer.** The organization
 * decides; this controller only carries the question and reads back the
 * answer. Every refusal names the number and what lifts it — a refusal
 * you cannot answer is not a rule, it is a wall
 * (`docs/antipatterns.md § A bare COUNT as a permanent gate`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { EmploymentApi } from '../../../../api/employment';
import type { Opening } from '../../../../lib/employment/Opening';
import type { ApplicationVerdict } from '../../../../lib/employment/Organization';

const TOPIC = 'act.deed';

interface ApplyModel extends CommandModel {
  /** The seat's key (`hand`, `tailor`), optional when only one is going. */
  position?: string;
  /** The house's path, optional when only one is hiring here. */
  organization?: string;
}

export default class ApplyController extends CommandController<ApplyModel> {
  async execute(model: ApplyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const wantPosition = (model.position ?? '').trim();
    const wantHouse = (model.organization ?? '').trim();

    let openings = EmploymentApi.noticesAt(context.location ?? null);
    if (wantHouse) {
      openings = openings.filter((o) => o.organizationPath === wantHouse);
    }
    if (wantPosition) {
      openings = openings.filter((o) => o.position.key === wantPosition);
    }

    if (openings.length === 0) {
      // ⚠ Say what IS going here, when anything is. "Nothing going" and
      // "not that one" are different facts and a player can act on the
      // second.
      const here = EmploymentApi.noticesAt(context.location ?? null);
      const line =
        here.length === 0
          ? "There's no work going here."
          : `No such opening here. Going: ${here
              .map((o) => o.position.key)
              .join(', ')}.`;
      return this.fail(context, line, 'no-opening');
    }
    if (openings.length > 1) {
      return this.fail(
        context,
        `Apply for which? ${openings
          .map((o) => `${o.position.key} — ${o.wants()}`)
          .join('; ')}.`,
        'ambiguous-opening',
      );
    }

    const opening = openings[0]!;
    const house = StuffApi.findByTemplatePath(opening.organizationPath);
    if (!house || !MixinApi.isOrganization(house)) {
      return this.fail(context, "That house isn't hiring.", 'no-opening');
    }

    const verdict = await house.considerApplicant(giver, opening.position.key);
    if (!verdict.ok) {
      return this.fail(
        context,
        ApplyController.refusal(verdict, opening),
        verdict.kind,
      );
    }

    await house.appoint(giver, opening.position.key);
    // Being taken on is not being on shift: the chart, not the clock.
    const noun = opening.position.noun ?? opening.position.key;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You are taken on as ${noun} at ${EmploymentApi.organizationLabel(house)}. \`clock on\` when you're ready to start; \`clock off\` pays you.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} is taken on as ${noun}.`,
      )
      .send();
  }

  /** ⭐ The refusal, with its number and what lifts it. */
  private static refusal(
    verdict: Exclude<ApplicationVerdict, { ok: true }>,
    opening: Opening,
  ): string {
    switch (verdict.kind) {
      case 'already-held':
        return 'You already hold that job.';
      case 'no-opening':
        return 'That seat is taken.';
      case 'not-employable':
        return "You can't hold a job.";
      case 'gigs':
        return (
          `They ask for ${String(verdict.wanted)} completed ` +
          `${verdict.wanted === 1 ? 'gig' : 'gigs'}; you have ` +
          `${String(verdict.held)}. Finish ${String(verdict.wanted - verdict.held)} more ` +
          `off a noticeboard and ask again.`
        );
      case 'band':
        return (
          `They ask for a ${verdict.wanted} hand at ${verdict.discipline}; ` +
          `you are ${verdict.held}. Practising lifts it.`
        );
      default:
        return `Not this time. They ask ${opening.wants()}.`;
    }
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${line}`)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
