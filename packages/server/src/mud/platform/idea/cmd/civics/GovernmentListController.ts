/**
 * GovernmentListController — `government list` and bare `government` —
 * the jurisdiction chain over where the giver stands
 * (`GovernmentApi.subjectTo`), each government rendered with its
 * description, departments, seats + holders, and charter (over {@link
 * GovernmentControllerBase}).
 */

import type { CommandContext, CommandModel } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  GovernmentApi,
  type GovernmentDescriptor,
} from '../../../../api/government';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { GovernmentControllerBase } from './GovernmentControllerBase';

export default class GovernmentListController extends GovernmentControllerBase {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // The resolve walk wants a containment scope; a giver is always one,
    // but the narrowing keeps the type honest.
    const chain = MixinApi.isContainer(giver)
      ? await GovernmentApi.subjectTo(giver)
      : [];
    if (chain.length === 0) {
      this.send(
        context,
        Mml.fromMarkup('\nNo government claims this ground.\n'),
      );
      context.note({
        kind: 'controller-rejected',
        reason: 'no-government',
        detail: 'No government claims this ground.',
      });
      return;
    }
    const blocks: string[] = ['Governments here, most local first:'];
    for (const government of chain) {
      blocks.push(await this.renderGovernment(government));
    }
    blocks.push(
      Mml.link('mudcmd:government residency', 'Where am I a resident?')
        .toString(),
    );
    this.send(context, Mml.fromMarkup(`\n${blocks.join('\n\n')}\n`));
  }

  /** One government's block: name, description, departments, seats, charter. */
  private async renderGovernment(
    government: GovernmentDescriptor,
  ): Promise<string> {
    const lines = [Mml.strong(government.name).toString()];
    if (government.description.length > 0) {
      lines.push(`  ${Mml.escape(government.description).toString()}`);
    }
    if (government.departments.length > 0) {
      lines.push(`  Departments: ${government.departments.length}`);
    }
    const seats = await GovernmentApi.seatsOf(government.key);
    for (const view of seats) {
      lines.push(
        `  ${Mml.escape(view.seat.label).toString()} — ` +
          `${this.presentHolder(view.holder)}`,
      );
    }
    if (government.charter.length > 0) {
      lines.push(`  Charter: ${Mml.escape(government.charter).toString()}`);
    }
    return lines.join('\n');
  }

  /** Present a seat holder by live presentation, else path tail, else vacant. */
  private presentHolder(holderPath: string | null): string {
    if (!holderPath) return '(vacant)';
    const live = StuffApi.findByTemplatePath(holderPath);
    if (live) return Mml.escape(live.getPresentation()).toString();
    const tail = holderPath.split('/').filter(Boolean).pop() ?? holderPath;
    return Mml.escape(tail).toString();
  }
}
