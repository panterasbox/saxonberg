/**
 * Pen — a quill or a steel nib: the medieval rung of the
 * copy ladder. `copy <sheet> onto <blank> with pen` writes the words of one
 * sheet onto another by hand, with the copyist's errors (their printing
 * band, seeded), and the copy is bound to NOTHING — which is what lets the
 * issuer of a receipt tell it from the original. Ink comes from the pot in
 * the copyist's hands.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Sheet from '@saxonberg/server/mud/platform/thing/Sheet';
import { Misprint } from '../lib/Misprint';

const COPY = ['trade/printing/cmd/printing/copy.yaml'];

/** Slips of the pen per letter, by the copyist's band. */
const COPY_ERRORS: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0.02,
  novice: 0.01,
  competent: 0.005,
  proficient: 0.002,
  expert: 0.0005,
};

export type CopyOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

export default class Pen extends ToolMixin(Good) {
  static commandContributions: CommandContributions = { self: [], inventory: COPY, peers: COPY, environment: COPY };

  /** ⭐ Copy the words of `from` onto `blank` by hand. */
  public async copyOnto(from: Stuff, blank: Stuff, by: Stuff): Promise<CopyOutcome> {
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(by) ? by.getContainer() : null;
    if (room !== null) {
      const refused = await this.admittedAt(room);
      if (refused !== null) return { ok: false, reason: 'covenant-refuses', line: refused };
    }
    if (!MixinApi.isMarked(from)) return { ok: false, reason: 'not-marked', line: `There is nothing written on ${from.getPresentation()} to copy.` };
    if (!(blank instanceof Sheet) || blank.getBoundTo() !== '' || blank.getMarkText() !== '') {
      return { ok: false, reason: 'not-blank', line: `${blank.getPresentation()} is not a blank sheet to copy onto.` };
    }
    await from.refreshMarks(by);
    const text = from.getMarkText().trim();
    if (text === '') return { ok: false, reason: 'nothing-to-copy', line: `${from.getPresentation()} is blank.` };
    const band: CompetenceBandName = MixinApi.isAdvancing(by) ? await by.competenceBandFor('printing') : 'untrained';
    const copied = new Misprint(`${text}|${by.getIdentityPath() ?? ''}|pen`).corrupt(text, COPY_ERRORS[band]).text;
    let target: Sheet = blank;
    if (blank.getQuantity() > 1) target = (await blank.split(1)) as unknown as Sheet;
    if (target.getWritingRoom() < copied.length) target.setWritingRoom(copied.length);
    const out = target.writeOn(by, copied);
    if (!out.ok) return out;
    return { ok: true, line: `You copy ${from.getPresentation()} out by hand with ${self.getPresentation()}, line by line, onto ${target.getPresentation()}.` };
  }
}
