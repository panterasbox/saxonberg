/**
 * AtmosphereReading — what medium you are standing in, and ⭐ **what is
 * in it**.
 *
 * ⚠ Not `trace atmosphere`, which is the engine diagnostic that says
 * WHERE the value came from (a detail override, a biome ancestor, the
 * universe default). That was `analyze atmosphere` and it was never a
 * reading — it is a free engine read and lives on `trace` now.
 *
 * ⭐⭐ **No number reaches this reading at any band.** It used to print a
 * density digit off a per-tag table, which told a player the one thing
 * about the air that never varies and nothing about the thing that does.
 * The medium's identity is a word; what it carries is a level. The
 * instrument's worth is that it names substances a person cannot, not
 * that it prints them to three places.
 */

import Reading from '../../../lib/instrument/Reading';
import { BiomeApi } from '../../../api/biome';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { CompetenceBand } from '../../../lib/advancement/CompetenceBand';
import { Mml } from '../../../api/mml';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type Material from '../../../lib/material/Material';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { Concentrate } from '../../../lib/bulk/Concentration';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';

/**
 * ⭐ The fraction at or above which an untrained person simply notices
 * that the air is thick with something. Below it, telling one invisible
 * gas from another is the skill the reading measures — and the reason
 * firedamp at an ignitable fraction says nothing to a labourer, which is
 * the whole historical point of the canary and the lamp.
 *
 * ⚠ Small, because the fractions are small: these are the fire's actual
 * exhaust, and 4 % of a room being smoke is a room you can see is smoky.
 */
const OBVIOUS_FRACTION = 0.04;

/** Thick with it — a room you would not walk into. */
const THICK_FRACTION = 0.08;
/** Enough to tell, if you know what you are smelling. */
const TELLING_FRACTION = 0.015;

export default class AtmosphereReading extends Reading {
  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    if (!target || !MixinApi.isContainer(target)) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to measure.`,
        'no-scope',
      );
      return;
    }
    const scope = target as Stuff & Container;
    const medium = await BiomeApi.resolveAtmosphereFor(
      scope,
      param === '' ? undefined : param,
    );
    const contents = BiomeApi.resolveAtmosphereContentsFor(scope);
    const lines: string[] = [`Atmosphere: ${medium}`];
    // The instrument names everything it can find, in levels. A band
    // resolves DETAIL, never ACCESS: a novice with an analyser reads the
    // same substances, in coarser words.
    const noticeable = noticeableFraction();
    const listed = contents
      .filter((c) => c.amount >= noticeable)
      .sort((a, b) => b.amount - a.amount);
    for (const c of listed) {
      lines.push(`  ${levelWord(c.amount, band)} ${nameOf(c)}`);
    }
    if (listed.length === 0) lines.push('  nothing else it can find');
    this.report(context, Mml.compose`${lines.join('\n')}\n`);
  }

  /**
   * ⭐ The free read: standing in a place and judging its air. Words
   * only, and what a person can tell depends on what they know — the
   * row caps `eyeCeiling` at `competent`, so the analyser sells
   * everything above naming-what-you-can-feel.
   */
  protected override async analyze(
    context: CommandContext,
    target: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    if (!target || !MixinApi.isContainer(target)) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to judge the air.`,
        'no-scope',
      );
      return;
    }
    const scope = target as Stuff & Container;
    const medium = await BiomeApi.resolveAtmosphereFor(
      scope,
      param === '' ? undefined : param,
    );
    const contents = BiomeApi.resolveAtmosphereContentsFor(scope);
    const trained = CompetenceBand.atOrAbove(band, 'competent');
    const floor = trained ? noticeableFraction() : OBVIOUS_FRACTION;
    const found = contents
      .filter((c) => c.amount >= floor)
      .sort((a, b) => b.amount - a.amount);

    const sentences: string[] = [];
    if (found.length === 0) {
      sentences.push(
        BiomeApi.isBreathableMixture(medium, contents)
          ? `The ${medium} here seems ordinary enough.`
          : `There is ${medium} here, and you cannot breathe it.`,
      );
    } else {
      for (const c of found) {
        sentences.push(sentenceFor(nameOf(c), c.amount, trained));
      }
    }
    if (trained && !BiomeApi.isBreathableMixture(medium, contents)) {
      sentences.push('There is not enough good air left in here.');
    }
    this.report(context, Mml.compose`${sentences.join(' ')}\n`);
  }
}

/** The material's own name, falling back to its path's leaf. */
function nameOf(c: Concentrate): string {
  const material = StuffApi.findByTemplatePath<Material>(c.type);
  if (material) return material.getName();
  const leaf = c.type.substring(c.type.lastIndexOf('/') + 1);
  return leaf.replace(/-/g, ' ');
}

/** The level word for a fraction. Coarser below `competent`. */
function levelWord(amount: number, band: CompetenceBandName): string {
  const fine = CompetenceBand.atOrAbove(band, 'competent');
  if (amount >= THICK_FRACTION) return fine ? 'a great deal of' : 'a lot of';
  if (amount >= OBVIOUS_FRACTION) return fine ? 'a good deal of' : 'a lot of';
  if (amount >= TELLING_FRACTION) return 'some';
  return fine ? 'a trace of' : 'some';
}

/** One sentence about one thing in the air. */
function sentenceFor(name: string, amount: number, trained: boolean): string {
  if (!trained) {
    return amount >= THICK_FRACTION
      ? `The air in here is thick with something.`
      : `There is something in the air in here.`;
  }
  if (amount >= THICK_FRACTION) return `The air is thick with ${name}.`;
  if (amount >= OBVIOUS_FRACTION) return `There is a good deal of ${name} in the air.`;
  if (amount >= TELLING_FRACTION) return `You can tell there is ${name} about.`;
  return `There is a trace of ${name} in the air.`;
}

/** The dial below which a content is not worth mentioning. */
function noticeableFraction(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.atmosphereNoticeableFraction);
    if (raw == null || raw === '') return 0.002;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0.002;
  } catch {
    return 0.002;
  }
}
