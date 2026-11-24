/**
 * WhichController — `which` / `which <thing>` / `which <verb>` (the which
 * build). ⭐ Dumb: the read decides everything — the gates, the grouping,
 * the order, thing-or-verb (`CommandApi.which`); this words the answer it
 * got back, one line per source, and opens the `which` card on it.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CommandApi } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { MessageApi } from '../../../../api/message';
import type { WhichAnswer, WhichGroup, WhichSource } from '@saxonberg/types';

interface WhichModel extends CommandModel {
  what?: string;
}

/** A source as a reply names it: *the lever here*, *your calendar*, *you*. */
function sourcePhrase(s: WhichSource): string {
  if (s.place === '') return s.name;
  if (s.place === 'where you are') return `${s.name}, where you are`;
  return `${s.name} ${s.place}`;
}

function groupLines(g: WhichGroup): string[] {
  const lines = [`  ${g.verbs.map((v) => v.verb).join(', ')} — ${sourcePhrase(g.source)}`];
  for (const v of g.verbs) {
    if (v.state === 'disabled' && v.reason) lines.push(`      ${v.verb}: ${v.reason}`);
  }
  return lines;
}

/** The terminal reply for a `which` answer. */
function whichLines(a: WhichAnswer): string[] {
  const lines: string[] = [];
  if (a.ask.mode === 'all') lines.push('What you can type here:');
  for (const g of a.groups) lines.push(...groupLines(g));
  if (a.common) lines.push(`and anything you're carrying: ${a.common.verbs.join(', ')}`);
  if (a.usual && a.usual.verbs.length > 0) {
    const all = a.ask.mode === 'all';
    lines.push(`${all ? 'and the usual' : 'you'}: ${a.usual.verbs.join(', ')}${all ? ' (you)' : ''}`);
  }
  if (a.ask.mode === 'verb' && a.ask.what) lines.push(`(\`help ${a.ask.what}\` has its shape.)`);
  return lines;
}

export default class WhichController extends CommandController<WhichModel> {
  /** A source as a reply names it (shared with `which ~ <thing>`). */
  static sourcePhrase(s: WhichSource): string {
    return sourcePhrase(s);
  }

  async execute(model: WhichModel, context: CommandContext): Promise<void> {
    const answer = await CommandApi.which(context.commandGiver, model.what);
    if (!answer.ok) return this.refuse(context, answer);
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(`\n${whichLines(answer.facts).join('\n')}\n`)).send();
  }
}
