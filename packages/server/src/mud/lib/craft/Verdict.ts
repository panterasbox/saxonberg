/**
 * Verdict — ⭐ the DF-style quality verdict as a VALUE: a band-word
 * headline, the descriptive *why*, and the maker as a viewer knows them.
 * Plain prose, **never a number**.
 *
 * One mark, two owners (matter-model-overlaps D2): a crafted THING's own
 * (`Crafted.renderVerdict` — the potter's bowl), and a BATCH's, read off a
 * bulk payload's `grade` + `maker` (the cook's stew in it, the distiller's
 * gin in any bottle — the holder's augmenter builds one off the payload).
 * Both render here, so the words are one copy and a
 * batch's verdict needs no crafted holder.
 */

import type { Grade } from './Grade';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../stuff/Stuff';

/** Grade-keyed verdict prose (v1 uniform — no per-instance scatter yet). */
const VERDICT_PROSE: Record<string, string> = {
  poor: 'cloudy and carelessly put together',
  fair: 'honestly made, if unremarkable',
  fine: 'clean, balanced, and well made',
  exceptional: 'expertly balanced — a pleasure to behold',
  masterful: 'flawless, the work of a true hand',
};

export class Verdict {
  constructor(
    public readonly grade: Grade,
    /** An identity path, or `''` when nobody is known to have made it. */
    public readonly maker: string,
  ) {}

  /**
   * The line: *"It looks fine: clean, balanced, and well made. Made by …"*.
   * `subject` names what is judged (`It` by default — the thing itself;
   * `What is in it` for a batch). ⛔ A maker's name is a NAME, and a name is
   * per viewer: a stranger's gin says "made by a woman", never her true
   * name (client-surface W0). With no viewer (a system read) the
   * presentation stands.
   */
  render(viewer?: Stuff, subject = 'It'): string {
    const band = this.grade.renderBandWord();
    const why = VERDICT_PROSE[band] ?? VERDICT_PROSE.fair!;
    let line = `${subject} looks ${band}: ${why}.`;
    const who = this.maker ? StuffApi.findByTemplatePath<Stuff>(this.maker) : null;
    if (who) line += ` Made by ${viewer ? who.describeFor(viewer) : who.getPresentation()}.`;
    return line;
  }
}
