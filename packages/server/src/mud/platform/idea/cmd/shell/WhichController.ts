/**
 * WhichController — `which` / `which <thing>` / `which <verb>` (the which
 * build). ⭐ Dumb: the read decides everything — the gates, the grouping,
 * the order, thing-or-verb (`CommandApi.which`); this words the answer it
 * got back, one line per source.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CommandApi } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import type { WhichAnswer, WhichGroup, WhichSource } from '@saxonberg/types';

interface WhichModel extends CommandModel {
  what?: string;
}

export default class WhichController extends CommandController<WhichModel> {
  /** A source as a reply names it: *the lever here*, *your calendar*, *you*. */
  static sourcePhrase(s: WhichSource): string {
    if (s.place === '') return s.name;
    if (s.place === 'where you are') return `${s.name}, where you are`;
    return `${s.name} ${s.place}`;
  }

  /** One source's line, and a line per greyed verb with its reason. */
  private static groupLines(g: WhichGroup): string[] {
    const lines = [`  ${g.verbs.map((v) => v.verb).join(', ')} — ${WhichController.sourcePhrase(g.source)}`];
    for (const v of g.verbs) {
      if (v.state === 'disabled' && v.reason) lines.push(`      ${v.verb}: ${v.reason}`);
    }
    return lines;
  }

  /** The terminal reply for a `which` answer. */
  private static lines(a: WhichAnswer): string[] {
    const all = a.ask.mode === 'all';
    const lines: string[] = all ? ['What you can type here:'] : [];
    for (const g of a.groups) lines.push(...WhichController.groupLines(g));
    if (a.common) lines.push(`and anything you're carrying: ${a.common.verbs.join(', ')}`);
    if (a.usual && a.usual.verbs.length > 0) {
      lines.push(`${all ? 'and the usual' : 'you'}: ${a.usual.verbs.join(', ')}${all ? ' (you)' : ''}`);
    }
    if (a.ask.mode === 'verb' && a.ask.what) lines.push(`(\`help ${a.ask.what}\` has its shape.)`);
    return lines;
  }

  async execute(model: WhichModel, context: CommandContext): Promise<void> {
    const answer = await CommandApi.which(context.commandGiver, model.what);
    if (!answer.ok) return this.refuse(context, answer);
    const prose = Mml.fromMarkup(`\n${WhichController.lines(answer.facts).join('\n')}\n`);
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(prose).send();
    // ⭐ The one `which` card, kept current while kept: the params are the
    // word the answer's own command re-asks (`#<id>` for one thing).
    const what = answer.facts.ask.command.replace(/^which\s*/, '');
    CardApi.open(context, 'which', {
      key: 'which',
      title: answer.facts.ask.command,
      prose,
      payload: { kind: 'which', answer: answer.facts },
      params: what === '' ? {} : { what },
    });
  }
}
