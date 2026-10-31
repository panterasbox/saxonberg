/**
 * LayReading — `analyze lay <rope>`: ⭐ a rope read by hand and eye
 * (cordage D15). Fiber, lay and thickness, what it would hold, its wear —
 * and the rogue's yarn, found by opening the lay a little and looking at
 * the heart, which no `look` shows while both ends are whole.
 *
 * Words only, finer with `ropework`: anybody can tell the fiber and the
 * thickness; a competent hand reads how much of its strength it still has;
 * a practised one opens the lay and finds the marks.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Rope from '@saxonberg/server/mud/platform/thing/Rope';

export default class LayReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    if (subject === null) {
      this.decline(context, Mml.compose`Which rope? Name it — \`analyze lay rope\`.`, 'no-subject');
      return;
    }
    if (!(subject instanceof Rope)) {
      this.decline(context, Mml.compose`That has no lay to read — it is not a rope.`, 'not-rope');
      return;
    }
    const lines: string[] = [];
    const what = subject.getStage() === 'strand' ? 'a strand' : 'a rope';
    lines.push(
      `It is ${what} of ${subject.fiber()}, about ${Math.round(subject.getDiameterMm())} mm thick, ${subject.getStage() === 'strand' ? 'its yarns hard-laid right-handed' : 'its strands laid left-handed against their own twist'}.`,
    );
    if (CompetenceBand.atOrAbove(band, 'novice')) {
      lines.push(`New and untied, ${subject.holdsWordsNew()}; as it is, ${subject.holdsWords()}.`);
    }
    const wear = subject.chafeWords();
    if (wear !== '') lines.push(wear);
    if (CompetenceBand.atOrAbove(band, 'competent') || subject.hasCutEnd()) {
      const marks = subject.getMarks();
      lines.push(
        marks.length > 0
          ? `You open the lay with a thumbnail: ${marks.map((m) => `a ${m} yarn`).join(' and ')} runs in the heart of it.`
          : 'You open the lay with a thumbnail: there is no colored yarn in its heart.',
      );
    }
    MessageApi.scene(this.actorOf(context)).topic('act.deed').toSelf(Mml.compose`${lines.join(' ')}`).send();
  }
}
