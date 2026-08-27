/**
 * GovernmentController — the `government` / `gov` verb, the read surface
 * of the civics substrate (the new `civics` command category — the
 * FICTION's governments, deliberately not `governance`, which is the
 * Compact's category). Subcommands:
 *
 *   - `list` / bare — the jurisdiction chain over where the giver
 *     stands (`GovernmentApi.subjectTo`), each government rendered with
 *     its description, departments, seats + holders, and charter.
 *   - `residency` — the chain over the giver's domicile
 *     (`GovernmentApi.residentOf`) — where they are a *resident*, as
 *     distinct from where they stand.
 *
 * Fully public and read-only; `requiresAnimate` only. NPCs can dispatch
 * it (no Interactive assumptions — output only, no prompts). Every Api
 * read takes the giver as the *subject* (a predicate about a subject,
 * not an authority claim); nothing here mutates.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import {
  GovernmentApi,
  type GovernmentDescriptor,
} from '../../../../api/government';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';

const TOPIC = 'shell.result';

export default class GovernmentController extends CommandController<CommandModel> {
  async execute(model: CommandModel, context: CommandContext): Promise<void> {
    // Undeclared subcommands are rejected by the dispatcher before the
    // controller is cloned — only declared branches here.
    switch (model.subcommand ?? 'list') {
      case 'list':
        return this.executeList(context);
      case 'residency':
        return this.executeResidency(context);
    }
  }

  private async executeList(context: CommandContext): Promise<void> {
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

  private async executeResidency(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const domicile = GovernmentApi.domicileAddressOf(giver);
    if (!domicile) {
      this.send(
        context,
        Mml.fromMarkup(
          '\nYou have no domicile on record — nowhere yet counts you ' +
            'as a resident.\n',
        ),
      );
      context.note({
        kind: 'controller-rejected',
        reason: 'no-domicile',
        detail: 'No domicile on record.',
      });
      return;
    }
    const chain = GovernmentApi.residentOf(giver);
    const lines = [`Domiciled at ${Mml.escape(domicile).toString()}.`];
    if (chain.length === 0) {
      lines.push('No government claims your domicile.');
    } else {
      lines.push('You are a resident of, most local first:');
      for (const government of chain) {
        lines.push(`  ${Mml.escape(government.displayName).toString()}`);
      }
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  /** One government's block: name, description, departments, seats, charter. */
  private async renderGovernment(
    government: GovernmentDescriptor,
  ): Promise<string> {
    const lines = [Mml.strong(government.displayName).toString()];
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

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
