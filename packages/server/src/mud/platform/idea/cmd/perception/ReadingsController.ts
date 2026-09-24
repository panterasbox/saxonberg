/**
 * ReadingsController — `readings [<channel>]`.
 *
 * ⭐⭐ **The progression UI, and it is a refusal list.**
 *
 * Nothing on the reading ladder is gated on a band, so there is no menu
 * that grows as you learn. What there IS is a ladder of ROUTES per
 * channel — the eye, the carried instrument, the bench — and at any
 * moment some of them are open to you and some are not. That is the
 * honest thing to show, and it is strictly more useful than a list of
 * verbs you may type, because it says what would change if you learned
 * something or bought something.
 *
 * The shape is `spells`': one call per subject, the actor's own view,
 * bands and prose only. ⚠ **Never a number about a person** — the
 * honesty firewall is "no quantity without a referent", and a
 * competence band's referent is a Discipline, not a score.
 *
 * `readings <channel>` adds what knowing it is worth and what it costs
 * you not to — the two clauses every channel row must author.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import ReadingCatalogue, {
  READING_CATALOGUE_PATH,
} from '../../ReadingCatalogue';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

interface ReadingsModel extends CommandModel {
  channel?: string;
  tool?: MqlManyResult;
}

const TOPIC = 'shell.result';

export default class ReadingsController extends CommandController<ReadingsModel> {
  async execute(model: ReadingsModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const tools = model.tool?.stuff ?? [];
    const named = (model.channel ?? '').trim().toLowerCase();

    if (named !== '') {
      const reading = await (await this.catalogue()).warmed(named);
      if (!reading) {
        this.refuse(
          context,
          TOPIC,
          `There is no reading called '${named}'. Bare \`readings\` lists what you can find out.`,
          'unknown-channel',
          named,
        );
        return;
      }
      const lines: string[] = [`${reading.getChannel()}:`];
      for (const route of await reading.routesFor(actor, tools)) {
        lines.push(`  ${route.open ? '·' : '×'} ${route.line}`);
      }
      // ⭐ AC12: every channel says what it is FOR and what it costs not
      // to know. A row that cannot answer either is a channel nobody has
      // thought about yet, and the emptiness shows.
      if (reading.getImproves() !== '') {
        lines.push(`  what it settles: ${reading.getImproves()}`);
      }
      if (reading.getStakes() !== '') {
        lines.push(`  what not knowing costs: ${reading.getStakes()}`);
      }
      this.say(context, lines);
      return;
    }

    const all = await (await this.catalogue()).allWarmed();
    if (all.length === 0) {
      this.refuse(
        context,
        TOPIC,
        'There is nothing this world can tell you about yet.',
        'no-readings',
      );
      return;
    }
    const lines: string[] = ['What you can find out:'];
    for (const reading of all) {
      const routes = await reading.routesFor(actor, tools);
      const open = routes.filter((r) => r.open).map((r) => r.line);
      lines.push(
        open.length > 0
          ? `  ${reading.getChannel()} — ${open.join('; ')}`
          : `  ${reading.getChannel()} — ${routes.map((r) => r.line).join('; ')}`,
      );
    }
    lines.push('');
    lines.push('`readings <channel>` for what one is worth knowing.');
    this.say(context, lines);
  }

  /** The channel roster, stood up on the way past if nothing has. */
  private async catalogue(): Promise<ReadingCatalogue> {
    return StuffApi.singleton<ReadingCatalogue>(READING_CATALOGUE_PATH);
  }

  private say(context: CommandContext, lines: string[]): void {
    let body = Mml.compose`\n`;
    for (const line of lines) body = Mml.compose`${body}${line}\n`;
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }
}
