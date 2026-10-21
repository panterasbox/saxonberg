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

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GovernmentApi } from '@saxonberg/server/mud/api/government';
import { Mml } from '@saxonberg/server/mud/api/mml';

/** Meters per unit a standard may be declared in. */
const PER_UNIT: Readonly<Record<string, number>> = { in: 0.0254, cm: 0.01, mm: 0.001, m: 1 };

/** The realm's default statute brick, inches (9 × 4½ × 2¼). */
const DEFAULT_IN = { length: 9, width: 4.5, depth: 2.25 };

/** How far from the standard a brick may be before it is off it. */
const OFF_STANDARD_FRACTION = 0.05;
/** The seat key a polity names its gauger by (the capacity precedent). */
const GAUGER_SEAT = 'gauger';

export default class SizeReading extends Reading {
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
    const place = this.placeOf(actor);
    const chain = place && MixinApi.isContainer(place) ? await GovernmentApi.subjectTo(place) : [];
    let unit = 'in';
    let std = { ...DEFAULT_IN };
    let where = 'the realm';
    for (const gov of chain) {
      const l = gov.standards.find((s) => s.key === 'brick-length');
      const w = gov.standards.find((s) => s.key === 'brick-width');
      const d = gov.standards.find((s) => s.key === 'brick-depth');
      if (l && w && d && l.unit === w.unit && w.unit === d.unit && PER_UNIT[l.unit]) {
        unit = l.unit;
        std = { length: l.value, width: w.value, depth: d.value };
        where = gov.name;
        break;
      }
    }
    const per = PER_UNIT[unit] ?? 0.0254;
    // The standard's proportion, scaled to this brick's volume; the length
    // read off it is blurred by the reader's hand (the seeded bracket).
    const stdVolume = std.length * std.width * std.depth * per * per * per;
    const trueLength = std.length * Math.cbrt(volume / stdVolume);
    const length = this.observe(trueLength, band, this.seedFor(actor, subject, param)).centre;
    const off = length / std.length - 1;
    const words = (n: number): string => (Math.round(n * 4) / 4).toString();
    const line =
      Math.abs(off) <= OFF_STANDARD_FRACTION
        ? Mml.compose`It measures about ${words(length)} ${unit} long — a true brick by ${where}'s statute (${words(std.length)} × ${words(std.width)} × ${words(std.depth)}).`
        : off > 0
          ? Mml.compose`⚠ It measures about ${words(length)} ${unit} long — OVER ${where}'s statute brick of ${words(std.length)} ${unit}: off standard.`
          : Mml.compose`⚠ It measures about ${words(length)} ${unit} long — SHORT of ${where}'s statute brick of ${words(std.length)} ${unit}: off standard.`;
    // The innermost polity here that seats a gauger is whose measure counts.
    const gov = chain.find((g) => g.seats.some((st) => st.key === GAUGER_SEAT)) ?? null;
    const ofRecord = gov !== null && (await GovernmentApi.holdsSeat(actor, gov.key, GAUGER_SEAT));
    this.report(
      context,
      ofRecord
        ? Mml.compose`You lay the rule along it. ${line} Your measure is of record.`
        : Mml.compose`You lay the rule along it. ${line}`,
    );
  }
}
