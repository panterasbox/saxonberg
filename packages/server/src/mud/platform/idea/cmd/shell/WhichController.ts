/**
 * WhichController — `which` / `which <thing>` / `which <verb>` (the which
 * build). ⭐ Dumb: the read decides everything — the gates, the grouping,
 * the order, thing-or-verb (`CommandApi.which`); this words the answer it
 * got back, one line per source.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { CommandApi } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import type { WhichAnswer, WhichGroup, WhichSource } from '@saxonberg/types';

interface WhichModel extends CommandModel {
  thing?: MqlOneResult;
  verb?: string;
  clashes?: boolean;
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

  /**
   * A word that means two commands here, one line per meaning:
   * *fire — Hold a loaded chamber at heat… — the hearth here (`hearth::fire`)*.
   */
  private static collisionLines(a: WhichAnswer): string[] {
    const lines: string[] = [];
    for (const c of a.collisions ?? []) {
      lines.push(`  ${c.verb} means ${c.meanings.length} different things here:`);
      for (const m of c.meanings) {
        const who = m.sources.map((x) => WhichController.sourcePhrase(x)).join(', ');
        lines.push(`    ${m.description} — ${who} (\`${m.scope}\`)`);
      }
    }
    return lines;
  }

  /** The terminal reply for a `which` answer. */
  private static lines(a: WhichAnswer): string[] {
    const mode = a.ask.mode;
    const lines: string[] = mode === 'all' ? ['What you can type here:'] : [];
    for (const g of a.groups) lines.push(...WhichController.groupLines(g));
    if (a.common) lines.push(`and anything you're carrying: ${a.common.verbs.join(', ')}`);
    if (a.usual && a.usual.verbs.length > 0) {
      // ⭐ The body's verbs are the bulk of any answer: on the whole read they
      // are one line that says how many and where the list is (owner, review).
      lines.push(
        mode === 'all'
          ? `and the usual: ${a.usual.verbs.length} verbs of your own — \`which me\` lists them`
          : `you: ${a.usual.verbs.join(', ')}`,
      );
    }
    const clashes = WhichController.collisionLines(a);
    if (mode === 'clashes' && clashes.length === 0) lines.push('No word here means two different commands.');
    if (mode === 'clashes' && clashes.length > 0) lines.push('One word, two commands (pick one with `thing::verb`):');
    if (mode === 'clashes') lines.push(...clashes);
    if (mode !== 'clashes' && clashes.length > 0) {
      // ⭐ Where a verb comes from when more than one thing gives it, and the
      // scope that picks one — a bare line tries each in turn.
      lines.push(
        mode === 'thing'
          ? "Its words mean something else here too (pick one with `thing::verb`):"
          : 'One word, two commands (pick one with `thing::verb`):',
      );
      lines.push(...clashes);
    }
    if (mode === 'verb' && a.ask.what) lines.push(`(\`help ${a.ask.what}\` has its shape.)`);
    return lines;
  }

  async execute(model: WhichModel, context: CommandContext): Promise<void> {
    const opts = { clashes: model.clashes === true };
    const thing = model.thing?.stuff ?? undefined;
    const answer = await CommandApi.which(context.commandGiver, {
      ...opts,
      ...(thing ? { thing } : {}),
      ...(model.verb ? { verb: model.verb } : {}),
    });
    if (!answer.ok) return this.refuse(context, answer);
    const prose = Mml.fromMarkup(WhichController.lines(answer.facts).join('\n'));
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(prose).send();
    // ⭐ The one `which` card, kept current while kept: the params are the
    // word the answer's own command re-asks (`#<id>` for one thing).
    // The card is titled by what the player TYPED (never an id); its
    // subscription re-asks the answer's own command (`#id` for one thing).
    const title = [
      'which',
      opts.clashes ? '--clashes' : '',
      model.verb ? `--verb ${model.verb}` : '',
      answer.facts.ask.mode === 'thing' ? (answer.facts.ask.what ?? '') : '',
    ]
      .filter((x) => x !== '')
      .join(' ');
    CardApi.open(context, 'which', {
      key: 'which',
      title,
      prose,
      payload: { kind: 'which', answer: answer.facts },
      params: {
        ...opts,
        ...(thing ? { thingId: thing.stuffId } : {}),
        ...(model.verb ? { verb: model.verb } : {}),
      },
    });
  }
}
