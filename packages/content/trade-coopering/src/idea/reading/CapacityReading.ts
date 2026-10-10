/**
 * CapacityReading — `measure capacity <cask>`: the GAUGER's act, and
 * anyone's (assembly D13, AC 24).
 *
 * ⭐⭐⭐ Competence resolves DETAIL and never ACCESS (instrumentation.md),
 * and an office is no different: anybody with a gauging rod may read what
 * a cask holds, to the resolution their coopering and their rod allow.
 * What the SEAT adds is not the figure but its standing — a holder of a
 * polity's `gauger` seat writes the gauge ON the cask, and that record is
 * what a buyer, a magistrate or an excise man takes. Everyone else is told
 * the figure is theirs and not of record. The seat is a row (the
 * government's `seats:`), the standard measure is a row (its
 * `standards:`), and this class is the only code: a second polity that
 * appoints a gauger and declares its own tun needs rows alone.
 *
 * The standard: the polity's declared `standards` entry for this vessel's
 * category (or `cask`), else this row's `standardL` — the realm default.
 * *Off standard* is said in words when the figure is more than 5 % from
 * it.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GovernmentApi } from '@saxonberg/server/mud/api/government';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { Mml } from '@saxonberg/server/mud/api/mml';

/** The seat key a polity names its gauger by. */
const GAUGER_SEAT = 'gauger';
/** How far from the standard a vessel may be before it is off it. */
const OFF_STANDARD_FRACTION = 0.05;

export default class CapacityReading extends Reading {
  /** The realm-default standard measure (L), when no polity declares one. */
  public standardL = 25;

  static fieldMeta: FieldMeta = {
    standardL: { persistent: true },
  };

  protected override async measure(
    context: CommandContext,
    subject: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const actor = this.actorOf(context);
    if (!subject || !MixinApi.isBulkable(subject)) {
      this.decline(
        context,
        Mml.compose`There's nothing there to gauge — a gauging rod reads what a cask can hold.`,
        'not-a-vessel',
      );
      return;
    }
    const cap = subject.getBulkCapacity('interior');
    if (cap === null || !(cap.rawValue() > 0)) {
      this.decline(context, Mml.compose`${Mml.thing(subject)} has no inside to gauge.`, 'no-interior');
      return;
    }
    const seed = this.seedFor(actor, subject, param);
    const shown = this.observed(cap, band, seed);
    const figure = this.bracketed(cap, band, seed);

    // The jurisdiction: the innermost polity over this place that seats a
    // gauger — the one whose measure counts here.
    const place = this.placeOf(actor);
    const address = place && MixinApi.isAddressable(place) ? place.getAddress() : null;
    const chain = address ? GovernmentApi.governmentChainAt(address) : [];
    const gov = chain.find((g) => g.seats.some((s) => s.key === GAUGER_SEAT)) ?? null;
    const category = MixinApi.isVesselKind(subject) ? subject.getCategory() : '';
    const declared =
      gov?.standards.find((s) => s.key === category && s.unit === 'L') ??
      gov?.standards.find((s) => s.key === 'cask' && s.unit === 'L') ??
      null;
    const standardL = declared?.value ?? this.standardL;
    const where = gov ? gov.name : 'the realm';

    // Off standard is a reading of the vessel, said to anyone.
    const off = (shown.rawValue() - standardL) / standardL;
    const standardLine =
      Math.abs(off) <= OFF_STANDARD_FRACTION
        ? Mml.compose`That is a true ${GrammarApi.inWords(standardL)}-litre measure by ${where}'s standard.`
        : off < 0
          ? Mml.compose`⚠ That is SHORT of ${where}'s ${GrammarApi.inWords(standardL)}-litre standard — off standard.`
          : Mml.compose`⚠ That is OVER ${where}'s ${GrammarApi.inWords(standardL)}-litre standard — off standard.`;

    const ofRecord = gov !== null && (await GovernmentApi.holdsSeat(actor, gov.key, GAUGER_SEAT));
    if (ofRecord && MixinApi.isAssembled(subject)) {
      subject.setGauge({
        litres: shown.rawValue(),
        by: actor.getIdentityPath() ?? '',
        at: WorldClockApi.getNow().rawValue(),
        standardL,
        government: gov!.key,
      });
      try {
        await PersistableApi.captureHostOf(subject);
      } catch (err) {
        console.warn('CapacityReading: capture failed:', err);
      }
      this.report(
        context,
        Mml.compose`You run the rod in at the bung: ${figure}. ${standardLine} You mark the head — gauged, and of record.`,
      );
      return;
    }
    // ⭐ Not a refusal: the figure is real. What it lacks is standing.
    this.report(
      context,
      Mml.compose`You run the rod in at the bung: ${figure}. ${standardLine} The figure is yours; it is not of record — the gauger's is.`,
    );
  }
}
