/**
 * Forme — type set and locked in a chase, ready for the press.
 *
 * ⭐ A record the fixture keeps of what IT holds: the document it was set
 * from, the text AS SET (misprints included), where the errors still are,
 * and the sorts it took out of the case — the case is the one truth of
 * what is left (the records audit). Its case is named on its row and
 * followed on use, never searched for.
 *
 * `compose` debits the case (refused naming the first glyph it runs short
 * of) and seeds the compositor's errors by their printing band; `proof`
 * catches a share of them by the proofreader's band; `print` freezes the
 * text as set; `distribute` puts the type back.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { Misprint } from '../lib/Misprint';
import TypeCase, { type Font } from './TypeCase';

const VIEWS = [
  'trade/printing/cmd/printing/compose.yaml',
  'trade/printing/cmd/printing/proof.yaml',
  'trade/printing/cmd/printing/distribute.yaml',
];

/** Turned sorts per letter, by the compositor's band. */
const SETTING_ERRORS: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0.03,
  novice: 0.015,
  competent: 0.008,
  proficient: 0.004,
  expert: 0.001,
};

/** The share of the errors a proof catches, by the proofreader's band. */
const PROOF_FINDS: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 0.25,
  novice: 0.45,
  competent: 0.65,
  proficient: 0.8,
  expert: 0.95,
};

/** What an act on the forme did, in words. */
export type FormeOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

export default class Forme extends Good {
  static fieldMeta: FieldMeta = {
    casePath: { persistent: true, authorable: true, ref: 'identity:relation' },
    source: { persistent: true, runtimeState: true },
    title: { persistent: true, runtimeState: true },
    original: { persistent: true, runtimeState: true },
    setText: { persistent: true, runtimeState: true },
    errors: { persistent: true, runtimeState: true },
    debits: { persistent: true, runtimeState: true },
    proofedBy: { persistent: true, runtimeState: true },
  };

  static commandContributions: CommandContributions = { self: [], inventory: VIEWS, peers: VIEWS, environment: VIEWS };

  /** ⭐ The case this forme is set from — by path, followed on use. */
  public casePath = '';
  public source = '';
  public title = '';
  /** The document's text, as the compositor read it. */
  public original = '';
  /** The text AS SET. */
  public setText = '';
  /** Where the turned sorts still are. */
  public errors: number[] = [];
  /** The sorts it took out of the case. */
  public debits: Font = {};
  /** Who has proofed it, so a second proof by the same eye finds nothing new. */
  public proofedBy: string[] = [];

  private async bandOf(actor: Stuff): Promise<CompetenceBandName> {
    return MixinApi.isAdvancing(actor) ? actor.competenceBandFor('printing') : 'untrained';
  }

  public isSet(): boolean {
    return this.setText !== '';
  }

  public getSource(): string {
    return this.source;
  }

  public getTitle(): string {
    return this.title;
  }

  public getSetText(): string {
    return this.setText;
  }

  private typeCase(): TypeCase | null {
    if (this.casePath === '') return null;
    const c = StuffApi.findByTemplatePath<Stuff>(this.casePath);
    return c instanceof TypeCase ? c : null;
  }

  /** ⭐ Set `path` in type from the case. */
  public async compose(path: string, title: string, by: Stuff): Promise<FormeOutcome> {
    if (this.isSet()) return { ok: false, reason: 'already-set', line: 'The forme is full of type already — distribute it first.' };
    const kase = this.typeCase();
    if (kase === null) return { ok: false, reason: 'no-case', line: 'There is no case of type to set it from.' };
    const pages = await DocumentApi.pagesOf(path);
    if (pages === null) return { ok: false, reason: 'not-a-page', line: 'That is not something that reads as a page.' };
    const text = pages.pages.join('\n\n');
    const need = kase.needFor(text);
    const short = kase.shortOf(need);
    if (short !== null) {
      return { ok: false, reason: `case-short:${short}`, line: `The case has no more ${/[a-z]/.test(short) ? `lowercase ${short}` : `'${short}'`} — not enough type to set it.` };
    }
    const salt = `${text}|${by.getIdentityPath() ?? ''}|${this.casePath}`;
    const set = new Misprint(salt).corrupt(text, SETTING_ERRORS[await this.bandOf(by)]);
    kase.debit(need);
    this.source = path;
    this.title = title;
    this.original = text;
    this.setText = set.text;
    this.errors = set.at;
    this.debits = need;
    this.proofedBy = [];
    return { ok: true, line: `You set ${title} letter by letter from the case and lock it up in the chase.` };
  }

  /** ⭐ Read the proof and correct what you catch. Nobody is told how many were missed. */
  public async proof(by: Stuff): Promise<FormeOutcome> {
    if (!this.isSet()) return { ok: false, reason: 'not-set', line: 'There is nothing in the forme to proof.' };
    const who = by.getIdentityPath() ?? by.stuffId;
    if (this.proofedBy.includes(who)) {
      return { ok: true, line: 'You read it through again and find nothing you did not find before.' };
    }
    const found = new Misprint(`${this.setText}|${who}`).find(this.errors, PROOF_FINDS[await this.bandOf(by)]);
    const chars = this.setText.split('');
    for (const i of found) chars[i] = this.original[i] ?? chars[i]!;
    this.setText = chars.join('');
    this.errors = this.errors.filter((i) => !found.includes(i));
    this.proofedBy = [...this.proofedBy, who];
    return {
      ok: true,
      line: found.length === 0
        ? 'You read the proof through and find nothing wrong.'
        : `You read the proof through and mark ${found.length} turned letter${found.length === 1 ? '' : 's'}; you pick them out and set them right.`,
    };
  }

  /** Put the type back in the case; the forme is empty. */
  public distribute(): FormeOutcome {
    if (!this.isSet()) return { ok: false, reason: 'not-set', line: 'There is no type in the forme to distribute.' };
    const kase = this.typeCase();
    if (kase === null) return { ok: false, reason: 'no-case', line: 'There is no case to put the type back into.' };
    kase.credit(this.debits);
    this.source = '';
    this.title = '';
    this.original = '';
    this.setText = '';
    this.errors = [];
    this.debits = {};
    this.proofedBy = [];
    return { ok: true, line: 'You break the forme up and put every sort back in its box in the case.' };
  }

  public override getLongDescription(): string {
    const base = super.getLongDescription();
    return this.isSet() ? `${base.trimEnd()}\nIt holds ${this.title}, set and locked.` : `${base.trimEnd()}\nIt is empty.`;
  }
}
