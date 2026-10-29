/**
 * SizeReading — `measure size <brick>` against the polity's statute brick
 * (ceramics D30, S11).
 *
 * A brick's size is read off the brick itself: its volume (mass ÷ its
 * material's density) in the statute's own proportion (length : width :
 * depth as the standard declares them), so a brick struck from an
 * oversize mould — or fired from a clay that shrank less — reads OFF
 * STANDARD, and the reading says by how much in the standard's own unit.
 * The polity is the innermost one over the place that declares
 * `brick-length` / `brick-width` / `brick-depth`; a gauger's reading is of
 * record (the capacity precedent), anyone else's is theirs. ⭐ Competence
 * resolves DETAIL, never access: anyone with a rule may measure, and the
 * figure is blurred by the reader's band and the rule's ceiling like any
 * other reading. Nothing is written on the brick — a brick has no head to
 * mark; what the seat adds is standing.
 */

import StatuteReading from '@saxonberg/server/mud/lib/instrument/StatuteReading';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';

/** Meters per unit a standard may be declared in. */
const PER_UNIT: Readonly<Record<string, number>> = { in: 0.0254, cm: 0.01, mm: 0.001, m: 1 };

/** The realm's default statute brick, inches (9 × 4½ × 2¼). */
const DEFAULT_IN = { length: 9, width: 4.5, depth: 2.25 };

/** The three keys a polity declares its statute brick by. */
const BRICK_KEYS = ['brick-length', 'brick-width', 'brick-depth'] as const;

export default class SizeReading extends StatuteReading {
  protected override async measure(
    context: CommandContext,
    subject: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    if (!subject || !MixinApi.isTangible(subject)) {
      this.decline(context, Mml.compose`There's nothing there to measure.`, 'nothing-to-measure');
      return;
    }
    const mat = subject.getMaterial();
    const density = mat?.getDensity().rawValue() ?? 0;
    if (!(density > 0)) {
      this.decline(context, Mml.compose`${Mml.thing(subject)} will not take a rule.`, 'no-size');
      return;
    }
    // One brick's volume (a stack's mass is per piece).
    const volume = subject.getMass().rawValue() / density;

    const actor = this.actorOf(context);
    // The statute walk, the 5 % line and the gauger's standing are the
    // shared StatuteReading's (review R2-D9).
    const { chain, ofRecord } = await this.jurisdictionOf(actor);
    const declared = this.declaredStandard(chain, BRICK_KEYS, Object.keys(PER_UNIT));
    const unit = declared?.unit ?? 'in';
    const std = declared
      ? {
          length: declared.values['brick-length']!,
          width: declared.values['brick-width']!,
          depth: declared.values['brick-depth']!,
        }
      : { ...DEFAULT_IN };
    const where = declared?.where ?? 'the realm';
    const per = PER_UNIT[unit] ?? 0.0254;
    // The standard's proportion, scaled to this brick's volume; the length
    // read off it is blurred by the reader's hand (the seeded bracket).
    const stdVolume = std.length * std.width * std.depth * per * per * per;
    const trueLength = std.length * Math.cbrt(volume / stdVolume);
    const length = this.observe(trueLength, band, this.seedFor(actor, subject, param)).centre;
    const standing = this.standing(length, std.length);
    const words = (n: number): string => (Math.round(n * 4) / 4).toString();
    const line =
      standing === 'true'
        ? Mml.compose`It measures about ${words(length)} ${unit} long — a true brick by ${where}'s statute (${words(std.length)} × ${words(std.width)} × ${words(std.depth)}).`
        : standing === 'over'
          ? Mml.compose`⚠ It measures about ${words(length)} ${unit} long — OVER ${where}'s statute brick of ${words(std.length)} ${unit}: off standard.`
          : Mml.compose`⚠ It measures about ${words(length)} ${unit} long — SHORT of ${where}'s statute brick of ${words(std.length)} ${unit}: off standard.`;
    this.report(
      context,
      ofRecord
        ? Mml.compose`You lay the rule along it. ${line} Your measure is of record.`
        : Mml.compose`You lay the rule along it. ${line}`,
    );
  }
}
