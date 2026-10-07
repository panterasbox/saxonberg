/**
 * BloodReading — `analyze blood [<person>]` (blood build D15). Competence
 * resolves DETAIL, never access: anyone may read it, a better eye reads
 * more. The ladder (D3's lesson made legible — compatibility is of the
 * blood SYSTEM, and it crosses species):
 *
 * | band | what you read |
 * |---|---|
 * | untrained | your type (if tested), and that O gives within your system |
 * | novice | whom you can GIVE to, within your system (the ABO donate rule) |
 * | competent | whom you can RECEIVE from |
 * | proficient | the PEOPLES who share your system — and that others cannot |
 * | expert | the whole ABO table, in full |
 *
 * ⚠ `analyze blood <person>` reads a TESTED label only; an untested
 * stranger (or an untested you) reads *untested* at every band — the type
 * is a belief learned by `test`, not seen.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';

const TOPIC = 'sense.reading';

const at = (band: CompetenceBandName, floor: string): boolean =>
  CompetenceBand.atOrAbove(band, floor as CompetenceBandName);

export default class BloodReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const target = subject ?? giver;
    if (!MixinApi.isVitals(target) || target.bloodType() === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is no blood there to read.`)
        .send();
      return;
    }

    const isSelf = target === giver;
    const tested = target.isBloodTyped();
    const type = target.bloodType();
    const system = target.bloodSystemOf();
    const lines: string[] = [];

    const subjectName = isSelf ? 'Your blood' : `${target.getPresentation()}'s blood`;
    if (!tested) {
      lines.push(
        `${subjectName} is untested — a \`test\` would tell you its type.`,
      );
    } else {
      lines.push(`${subjectName} is typed ${Mml.strong(type ?? '?').toString()}.`);
      if (type === 'O') {
        lines.push('As type O, it can be given to anyone who shares your blood system.');
      }
      if (at(band, 'novice')) {
        lines.push(`You can give it to: ${this.canGiveTo(type)} (within your system).`);
      }
      if (at(band, 'competent')) {
        lines.push(`You can receive from: ${this.canReceiveFrom(type)}.`);
      }
    }

    if (at(band, 'proficient')) {
      const mates = this.systemMates(system);
      lines.push(
        mates.length > 0
          ? `Peoples who share your blood system (${system || 'your own'}): ${mates.join(', ')}. No one of another system can take your blood.`
          : `Your blood system (${system || 'your own'}) is yours alone — no other people shares it.`,
      );
    }
    if (at(band, 'expert')) {
      lines.push(
        'The rule in full: O gives to all, A to A and AB, B to B and AB, AB to AB — but only within one blood system; across systems, always a reaction.',
      );
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(lines.map((l) => Mml.escape(l)).join('\n')))
      .send();
  }

  private canGiveTo(type: string | null): string {
    switch (type) {
      case 'O':
        return 'O, A, B, AB';
      case 'A':
        return 'A, AB';
      case 'B':
        return 'B, AB';
      case 'AB':
        return 'AB';
      default:
        return 'no one (a mixed unit matches nobody)';
    }
  }

  private canReceiveFrom(type: string | null): string {
    switch (type) {
      case 'AB':
        return 'O, A, B, AB';
      case 'A':
        return 'O, A';
      case 'B':
        return 'O, B';
      case 'O':
        return 'O only';
      default:
        return 'no one';
    }
  }

  /** The names of species whose declared blood system matches `system`. */
  private systemMates(system: string): string[] {
    if (!system) return [];
    const out: string[] = [];
    let rows: Stuff[] = [];
    try {
      rows = StuffApi.findByPathGlob('/stuff/idea/species/**');
    } catch {
      rows = [];
    }
    for (const row of rows) {
      const sp = row as unknown as {
        getBloodGroups?: () => { system?: string } | null;
        getPresentation?: () => string;
      };
      if (typeof sp.getBloodGroups !== 'function') continue;
      if (sp.getBloodGroups()?.system === system) {
        const name = sp.getPresentation?.() ?? '';
        if (name) out.push(name);
      }
    }
    return out.sort();
  }
}
