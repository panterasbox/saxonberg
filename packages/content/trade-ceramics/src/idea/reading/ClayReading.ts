/**
 * ClayReading — `analyze clay <lump>`: ⭐ a clay read by hand and eye
 * (ceramics M3, D12). Fat or lean, iron-rich or pale, limy, how far a winter
 * has weathered it — in WORDS, and the words get finer with competence: a
 * novice tells fat from lean, a competent hand the colour it will fire, a
 * practised one the lime and whether it would stand a furnace.
 *
 * Reads the subject's own composition through `Clay`'s methods (probed — a
 * pack reading may not import another pack's class), so a second clay of any
 * trade's is read the same way.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';

/** The clay a reading can read — `Clay`'s surface, probed. */
interface ReadableClay {
  plasticity(): number;
  crackRisk(): number;
  firedColor(): 'red' | 'buff' | 'white';
  refractoriness(): 'refractory' | 'common';
  shares(): { clayMineral: number; opener: number; iron: number; lime: number; organic: number };
  getWeatheredDays(): number;
}

function isReadableClay(s: Stuff | null): s is Stuff & ReadableClay {
  const c = s as unknown as Partial<ReadableClay> | null;
  return c !== null && typeof c.plasticity === 'function' && typeof c.shares === 'function';
}

export default class ClayReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    if (subject === null) {
      // ⭐ The channel is named and the lump is not (the drive typed
      // `analyze clay`): say what to type, not that nothing is clay.
      this.decline(
        context,
        Mml.compose`Which clay? Name the lump you mean — \`analyze clay lump\`.`,
        'no-subject',
      );
      return;
    }
    if (!isReadableClay(subject)) {
      this.decline(
        context,
        Mml.compose`That is not a clay you can read — roll a worm of clay, not of that.`,
        'not-clay',
      );
      return;
    }
    const lines: string[] = [];
    const p = subject.plasticity();
    // ⭐ Everybody can roll a worm of it.
    lines.push(
      p >= 0.65
        ? 'It is FAT — it rolls into a long worm and bends round your finger without a crack. It will throw beautifully and crack as it dries unless you open it with sand.'
        : p >= 0.45
          ? 'It rolls into a worm that cracks only when you bend it hard: a workable clay.'
          : 'It is LEAN — the worm cracks as you roll it. Short and sandy; it will dry well and throw badly.',
    );
    if (CompetenceBand.atOrAbove(band, 'novice')) {
      const risk = subject.crackRisk();
      lines.push(
        risk >= 0.7
          ? 'Dried fast, a brick of this will crack.'
          : risk >= 0.4
            ? 'It wants drying slowly.'
            : 'It is open enough to dry without cracking.',
      );
    }
    if (CompetenceBand.atOrAbove(band, 'competent')) {
      const colour = subject.firedColor();
      lines.push(
        colour === 'red'
          ? 'It is rusty with iron: it will fire red.'
          : colour === 'buff'
            ? 'There is a little iron in it: it will fire buff.'
            : 'There is hardly any iron in it: it will fire pale, nearly white.',
      );
    }
    if (CompetenceBand.atOrAbove(band, 'proficient')) {
      const s = subject.shares();
      if (s.lime >= 0.05) lines.push('It fizzes where you spit on it — limy; it will spit and blow in the kiln.');
      lines.push(
        subject.refractoriness() === 'refractory'
          ? 'There is almost nothing in it to melt: a FIRECLAY, that will stand a furnace.'
          : 'It would slump long before a furnace’s heat — a common clay.',
      );
      const days = subject.getWeatheredDays();
      lines.push(
        days <= 0
          ? 'It has not been weathered.'
          : 'A winter has been at it — it is the mellower for it.',
      );
    }
    this.report(context, Mml.compose`${lines.join(' ')}\n`);
  }
}
