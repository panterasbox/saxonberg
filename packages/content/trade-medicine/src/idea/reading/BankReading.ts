/**
 * BankReading — `analyze bank [<window>]` (blood build D15): the typed
 * panel a blood window reads out. Competence resolves DETAIL:
 *
 * | band | what you read |
 * |---|---|
 * | untrained | each lot's units + litres, the par, which lots are OUT |
 * | proficient | + the donor ROLL (who registered, by type — the pull surface) |
 * | expert | + the custody trail (who issued what to whom, in this room) |
 *
 * ⭐ The donor roll is the pull surface that replaces a push (D14): a
 * shortage is answered by reading who registered as the needed type and
 * asking them in the room — never by paging anyone.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import ChronicleEntry from '@saxonberg/server/mud/lib/chronicle/ChronicleEntry';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { DonationBank } from '@saxonberg/server/mud/lib/commerce/DonationBank';

const TOPIC = 'sense.reading';
const LOTS = ['O', 'A', 'B', 'AB'] as const;

const at = (band: CompetenceBandName, floor: string): boolean =>
  CompetenceBand.atOrAbove(band, floor as CompetenceBandName);

export default class BankReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const window =
      subject && MixinApi.isDonationBank(subject)
        ? subject
        : this.bankHere(context);
    if (!window) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is no blood window here to read.`)
        .send();
      return;
    }

    const lots = window.getLots();
    const par = window.parLevel();
    const shortfall = window.shortfall();
    const lines: string[] = [];
    lines.push('The blood window:');
    for (const k of LOTS) {
      const t = lots.get(k);
      lines.push(
        t && t.units > 0
          ? `  ${k}: ${t.units} unit(s), ${t.litres.toFixed(2)} L`
          : `  ${k}: OUT`,
      );
    }
    lines.push(`  par ${par} L; short by ${shortfall.toFixed(2)} L.`);

    if (at(band, 'proficient')) {
      const roll = this.donorRoll(context);
      lines.push(
        roll.length > 0
          ? `Donor roll (present): ${roll.join(', ')}.`
          : 'Donor roll: nobody registered is present.',
      );
    }

    if (at(band, 'expert')) {
      const trail = await this.custodyTrail(window);
      if (trail.length > 0) {
        lines.push('Custody:');
        for (const d of trail) lines.push(`  ${d}`);
      }
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(lines.map((l) => Mml.escape(l)).join('\n')))
      .send();
  }

  /** A DonationBank fixture in the actor's room. */
  private bankHere(context: CommandContext): (Stuff & DonationBank) | null {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return null;
    for (const s of (loc as Stuff & Container).getContents()) {
      if (MixinApi.isDonationBank(s)) return s as Stuff & DonationBank;
    }
    return null;
  }

  /** Registered donors present in the room, by tested type (D14 roll). */
  private donorRoll(context: CommandContext): string[] {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return [];
    const out: string[] = [];
    for (const s of (loc as Stuff & Container).getContents()) {
      const p = s as unknown as Stuff;
      if (!MixinApi.isPersona(p)) continue;
      if (!p.getDonorCard().donor) continue;
      const type =
        MixinApi.isVitals(p) && p.isBloodTyped() ? p.bloodType() : null;
      out.push(`${p.getPresentation()} (${type ?? 'untested'})`);
    }
    return out.sort();
  }

  /** The last custody deeds recorded in this window's room (D16 trail). */
  private async custodyTrail(window: Stuff): Promise<string[]> {
    const container = MixinApi.isContainable(window) ? window.getContainer() : null;
    const where = container?.getTemplatePath() ?? window.getTemplatePath();
    if (!where) return [];
    let rows: ChronicleEntry[] = [];
    try {
      rows = await ChronicleEntry.find({ where });
    } catch {
      rows = [];
    }
    return rows
      .filter((r) => (r.tags ?? []).includes('custody'))
      .sort((a, b) => (b.when ?? 0) - (a.when ?? 0))
      .slice(0, 6)
      .map((r) => r.text);
  }
}
