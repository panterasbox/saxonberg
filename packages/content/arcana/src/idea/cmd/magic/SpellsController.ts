/**
 * SpellsController — `spells`: the caster's numbers-free self-view.
 *
 * Renders `MagicApi.spellsView`: the roster by grid cell with the
 * caster's limiting band vs each spell's floor (castable / beyond
 * reach), then the faculty state — pool as prose band, depth / serenity
 * / composure bands, strain. **Bands and prose only, never numbers**
 * (the advancement honesty firewall; another's state never shows at
 * all — this is a self-view).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MagicApi } from '@saxonberg/server/mud/api/magic';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'shell.result';

const MANA_PROSE: Record<string, string> = {
  brimming: 'your reserves are brimming',
  steady: 'your reserves hold steady',
  ebbing: 'your reserves are ebbing',
  spent: 'you are all but spent',
};

export default class SpellsController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const view = await MagicApi.spellsView(actor);

    const rows = view.spells.map((s) => {
      const status = s.castable
        ? `within your command (${s.band})`
        : `beyond you yet (needs ${s.requiredBand})`;
      return `  ${s.name} — ${s.cell} — ${status}`;
    });

    const faculty = view.faculty;
    const facultyLine = [
      faculty.mana ? MANA_PROSE[faculty.mana] : 'no pool answers you',
      `a ${faculty.depth ?? 'still'} well, ${faculty.serenity ?? 'still'} to refill`,
      faculty.strained ? 'and you carry the shakes of overchannel strain' : null,
    ]
      .filter(Boolean)
      .join('; ');

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`Workings you know of:
${rows.join('\n')}

Your faculty: ${facultyLine}.`,
      )
      .send();
  }
}
