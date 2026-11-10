/**
 * RoomsReading — `analyze rooms`: what the place you are standing in
 * answers to, as a PLACE rather than as a list of objects (residences
 * D15/D4, paint D13; the retired `survey`, controller-liquidity W17).
 *
 * The room archetypes — a bedroom, a kitchen, a bathroom, a living room —
 * each said yes, no or *not quite*, with what met each need named (a
 * hotplate makes a kitchen as surely as a range does) and what is missing.
 * Standing in a home you own or rent it reads the WHOLE holding, and adds
 * who owes the upkeep; standing in a building it adds the shell — the
 * fabric's condition word and why.
 *
 * ⭐ **A mirror, never a score.** Nothing in the game is gated on any of
 * this and no multiplier reads it; the readout is bands and words, and no
 * digit reaches it (D4 — the test holds that).
 *
 * ⭐ An eye rung only, and UNBANDED (`discipline: ""`): nothing in it is
 * competence-resolved — whether a room has a bed in it is the same answer
 * for everybody. Free and ungated, like every eye rung.
 *
 * See [docs/subsystems/instrumentation.md] and [docs/subsystems/holding.md].
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tool';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Satisfaction } from '../../../lib/archetype/Archetype';
import type { OutsideRead } from '../../../lib/structure/Structure';
import Place, { type RoomsRead } from '../../../lib/stuff/Place';
import { Mml } from '../../../api/mml';

export default class RoomsReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    here: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const actor = this.actorOf(context);
    const read = here instanceof Place ? await here.readRooms(actor) : null;
    if (read === null) {
      this.decline(context, Mml.compose`There is nothing here to take stock of.`, 'nowhere');
      return;
    }
    this.report(context, Mml.text(`${RoomsReading.linesOf(read).join('\n')}\n`));
  }

  /** The place read, in the order rooms → fabric → upkeep. */
  protected static linesOf(f: RoomsRead): string[] {
    const lines = [f.whole ? 'You take stock of the place as a whole:' : 'You take stock of the room:'];
    if (f.reports.length === 0) lines.push('  (nothing here knows what a room is for.)');
    for (const r of f.reports) lines.push(RoomsReading.reportOf(r));
    if (f.shell) lines.push(RoomsReading.shellLine(f.shell));
    if (f.upkeepTerm !== null) lines.push(`Upkeep here is ${RoomsReading.termProse(f.upkeepTerm)}.`);
    return lines;
  }

  /** The building's fabric, in words — the band and why. */
  protected static shellLine(o: OutsideRead): string {
    return `The fabric of the place is ${o.band}${o.cause ? ` — ${o.cause}` : ''}.`;
  }

  /** One archetype's line: the verdict, then what met or missed each need. */
  protected static reportOf(s: Satisfaction): string {
    const met = s.rows.filter((r) => r.satisfied);
    const short = s.rows.filter((r) => !r.satisfied);
    const head = s.satisfied
      ? `  ${s.label}: yes`
      : met.length === 0
        ? `  ${s.label}: no`
        : `  ${s.label}: not quite`;
    const by = met
      .filter((r) => r.by)
      .map((r) => `${r.key} (${r.by})`)
      .join(', ');
    const missing = short.map((r) => r.key).join(', ');
    const parts: string[] = [];
    if (by) parts.push(`has ${by}`);
    if (missing) parts.push(`wants ${missing}`);
    return parts.length > 0 ? `${head} — ${parts.join('; ')}` : head;
  }

  /** The term vocabulary, said in words rather than in its key. */
  protected static termProse(term: string): string {
    switch (term) {
      case 'institution-all':
        return 'the institution’s, inside and out';
      case 'landlord-shell':
        return 'the landlord’s for the shell; yours for what you put in it';
      case 'owner-all':
        return 'yours, all of it';
      default:
        return term;
    }
  }
}
