/**
 * ConditionReading — `analyze condition <thing>`: what a trained eye can
 * tell about a thing's wear and its mends (repair D11).
 *
 * ⭐ **Competence resolves DETAIL, never ACCESS.** Anyone can read the
 * word `look` already prints (*worn*, *mended by Berta*); the appraiser's
 * band unfolds the rest, one rung at a time:
 *
 *   - untrained — the condition word, and whether it has been mended;
 *   - novice — how many times;
 *   - competent — the worst hand in it, in words (*by an unpractised
 *     hand*), and how good the work is now (the grade band);
 *   - proficient — part by part;
 *   - expert — the menders, by name.
 *
 * The first code reader of the `appraisal` Discipline — which until this
 * build specialized retail and was read by nothing. An eye rung only: no
 * instrument tells you who mended a pick.
 *
 * See [docs/subsystems/instrumentation.md] and [docs/subsystems/assembly.md].
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tooled';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Durable, MendRecord } from '../../../lib/material/Durable';
import { MixinApi } from '../../../api/mixin';
import { GrammarApi } from '../../../api/grammar';
import { Mml } from '../../../api/mml';

/** A hand's band, as an appraiser would say it of the work. */
const HAND_WORDS: Record<string, string> = {
  untrained: 'an unpractised hand',
  novice: 'a learner’s hand',
  competent: 'a fair hand',
  proficient: 'a practised hand',
  expert: 'a master’s hand',
};

const BAND_ORDER = ['untrained', 'novice', 'competent', 'proficient', 'expert'];

/** How many times, in words. */
function times(n: number): string {
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  return `${GrammarApi.inWords(n)} times`;
}

/** The worst band among a set of mends. */
function worstBand(mends: MendRecord[]): string {
  let worst = 'expert';
  for (const m of mends) {
    if (BAND_ORDER.indexOf(m.band) < BAND_ORDER.indexOf(worst)) worst = m.band;
  }
  return worst;
}

export default class ConditionReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    if (!subject || !MixinApi.isDurable(subject)) {
      this.decline(context, Mml.compose`That isn't anything that wears.`, 'not-durable');
      return;
    }
    const thing: Stuff & Durable = subject;
    const lines: Mml[] = [];
    const mends = thing.getMends();
    const at = (b: CompetenceBandName): boolean => CompetenceBand.atOrAbove(band, b);

    // untrained — the word, and whether it has been mended.
    lines.push(Mml.compose`${GrammarApi.cap(`it is ${thing.getConditionWord()}.`)}`);
    if (mends.length === 0) {
      lines.push(Mml.compose`It has never been mended.`);
    } else if (!at('novice')) {
      lines.push(Mml.compose`It has been mended.`);
    } else {
      // novice — how many times.
      lines.push(Mml.compose`It has been mended ${times(mends.length)}.`);
    }

    // competent — the worst hand in it, and how good the work is now.
    if (at('competent')) {
      if (mends.length > 0) {
        const hand = HAND_WORDS[worstBand(mends)] ?? 'a hand';
        lines.push(Mml.compose`The roughest of it was done by ${hand}.`);
      }
      if (MixinApi.isGraded(thing)) {
        lines.push(Mml.compose`As it stands, it is ${thing.getGrade().renderBandWord()} work.`);
      }
    }

    // proficient — part by part.
    if (at('proficient') && MixinApi.isAssembled(thing) && !thing.isOnePiece()) {
      for (const line of thing.getParts()) {
        const n = line.mends?.length ?? 0;
        const state = line.failed > 0 ? 'has failed' : line.condition >= 0.8 ? 'is sound' : line.condition >= 0.4 ? 'is worn' : 'is badly worn';
        const mended = n === 0 ? '' : `, mended ${times(n)}`;
        lines.push(Mml.compose`  The ${line.part} ${state}${mended} — ${line.grade} work.`);
      }
    }

    // expert — the menders, by name.
    if (at('expert') && mends.length > 0) {
      const names = [...new Set(mends.map((m) => m.byName).filter((n) => n))];
      if (names.length > 0) {
        lines.push(Mml.compose`You know the work of ${GrammarApi.joinList(names)} in it.`);
      }
    }

    let body = Mml.compose``;
    for (const line of lines) body = Mml.compose`${body}${line}\n`;
    this.report(context, body);
  }
}
