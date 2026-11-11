/**
 * RoomsReading — `analyze rooms`: what the place you are standing in
 * answers to, as a PLACE rather than as a list of objects (residences
 * D15/D4, paint D13; the retired `survey`, controller-liquidity W17).
 *
 * The room archetypes — a bedroom, a kitchen, a bathroom, a living room —
 * each said yes, no or *not quite*, with what met each need named (a
 * hotplate makes a kitchen as surely as a range does) and what is missing.
 * Standing in a home you own or rent it reads the WHOLE holding, and adds
 * who owes the upkeep; standing in a building it adds the shell — the
 * fabric's condition word and why.
 *
 * ⭐ **A mirror, never a score.** Nothing in the game is gated on any of
 * this and no multiplier reads it; the readout is bands and words, and no
 * digit reaches it (D4 — the test holds that).
 *
 * ⭐ An eye rung only, and UNBANDED (`discipline: ""`): nothing in it is
 * competence-resolved — whether a room has a bed in it is the same answer
 * for everybody. Free and ungated, like every eye rung.
 *
 * See [docs/subsystems/instrumentation.md] and [docs/subsystems/holding.md].
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tool';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Archetype, Satisfaction } from '../../../lib/archetype/Archetype';
import type { OutsideRead } from '../../../lib/structure/Structure';
import type { Container } from '../../../lib/spatial/Container';
import type ArchetypeCatalogue from '../ArchetypeCatalogue';
import Place from '../../../lib/stuff/Place';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { BiomeApi } from '../../../api/biome';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';

/**
 * ⭐ What a place answers to, as facts — gathered by {@link RoomsReading}
 * from the objects that own each answer (the archetype catalogue, the
 * warren, the structure, the realm's way index). Moved off `Place` in
 * controller-liquidity W21: an interpretation over five other objects is
 * the reading's, not every location's.
 */
export interface RoomsRead {
  /** The place as a whole (a holding's every room), or the one room. */
  whole: boolean;
  /** Each reported room archetype's verdict, met by what. */
  reports: Satisfaction[];
  /** The building this place is part of, read from outside — the shell's condition and why. */
  shell: OutsideRead | null;
  /** The holding's tenure term — who owes the upkeep. */
  upkeepTerm: string | null;
}

export default class RoomsReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    here: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const actor = this.actorOf(context);
    if (!(here instanceof Place)) {
      this.decline(context, Mml.compose`There is nothing here to take stock of.`, 'nowhere');
      return;
    }
    // A place is read from inside it (aboard a boat in it counts).
    if (!RoomsReading.standsIn(actor, here)) {
      this.decline(context, Mml.compose`You take stock of a place from inside it.`, 'not-here');
      return;
    }
    const read = await this.readRooms(here);
    this.report(context, Mml.text(`${RoomsReading.linesOf(read).join('\n')}\n`));
  }

  /** Is `viewer` standing in `place` — in it, or aboard something in it? */
  protected static standsIn(viewer: Stuff, place: Place): boolean {
    if (!MixinApi.isContainable(viewer)) return true;
    const container = viewer.getContainer();
    return container === null || container === place || viewer.getEnclosingPlace() === place;
  }

  /**
   * ⭐ **What `place` answers to** (residences D15/D4, paint D13). Facts
   * only: every room archetype (the industry-less ones: a bedroom derives
   * from no recipes), met *by what*, over the whole holding when the room
   * is part of one and over the WAY when a corridor archetype asks and this
   * is outdoor ground on one; the shell (the building it is part of — a
   * shop, a ship, a home — read from outside); at home, who owes the
   * upkeep (the holding's tenure term). Nothing is enforced; no multiplier
   * reads this. Each answer is asked of the object that owns it.
   */
  protected async readRooms(place: Place): Promise<RoomsRead> {
    const self = place as unknown as Stuff & Container;
    const warren = MixinApi.isWarrenMember(self) ? self.getWarren() : null;
    const upkeepTerm = warren?.getUpkeepTerm() ?? null;
    const spaces: (Stuff & Container)[] =
      warren && upkeepTerm !== null
        ? warren.getMembers().filter((m): m is Stuff & Container => MixinApi.isContainer(m))
        : [self];
    const wayside = await RoomsReading.waysideOf(place);
    const reports = RoomsReading.roomArchetypes()
      .filter(
        (a) => a.getRoomsScope() !== 'off-room' && (a.getRoomsScope() !== 'corridor' || wayside !== null),
      )
      .map((a) => a.satisfies(a.getRoomsScope() === 'corridor' && wayside ? wayside : spaces));

    // ⭐ The fabric is the BUILDING's (paint D13): whatever structure this
    // room is a member of — a shop, a ship, a home — asked for its outside.
    const structure = await place.structure();
    const shell = structure ? await structure.readOutside() : null;
    return { whole: upkeepTerm !== null, reports, shell, upkeepTerm };
  }

  /** The room archetypes — the ones that derive nothing from an industry (a bedroom has no trade; a bar does). */
  protected static roomArchetypes(): Archetype[] {
    const catalogue = StuffApi.findByTemplatePath<ArchetypeCatalogue>('/platform/idea/ArchetypeCatalogue');
    if (!catalogue) return [];
    return catalogue
      .allArchetypes()
      .filter((a) => a.getIndustry() === null)
      .sort((a, b) => a.getArchetypeId().localeCompare(b.getArchetypeId()));
  }

  /**
   * The rooms a `roomsScope: corridor` archetype reports over, or `null`
   * when this is not a place a way runs through.
   *
   * ⭐ **Outdoors is what makes somewhere a WAY rather than a room**
   * (`exposureOf(...).isOutside()` — open above and nothing around it), so
   * a bedroom, a bar and a brewing floor never ask corridor questions.
   * ⚠⚠ **The way is the LANE, not the zone** — a one-room courtyard is a
   * spot and a city-sized zone is not a road. The realm's ways are a
   * pack's (transport's lanes); the kernel asks the `WayIndex` the
   * realm names in `ways.indexPath`. ⚠ **No index named → no ways → no
   * corridor archetype is reported** (a realm without the transport pack,
   * by design). A named path that is not a `WayIndex` is an authoring
   * error and throws.
   */
  protected static async waysideOf(place: Place): Promise<(Stuff & Container)[] | null> {
    if (!(BiomeApi.exposureOf(place)?.isOutside() ?? false)) return null;
    const here = place.getTemplatePath() ?? '';
    if (here === '') return null;
    const indexPath = AppApi.setting(AppSettingKeys.waysIndexPath);
    if (indexPath === '') return null;
    const index = await StuffApi.singleton<Stuff>(indexPath);
    if (!MixinApi.isWayIndex(index)) {
      throw new Error(`ways.indexPath '${indexPath}' does not compose WayIndexMixin`);
    }
    const rooms: (Stuff & Container)[] = [];
    for (const p of await index.waysideOf(here)) {
      // ⚠ The multi-instance form: a shared row stands in many places, and
      // the singleton lookup THROWS on more than one live instance.
      const live = StuffApi.findAllByTemplatePath(p)[0];
      if (live && MixinApi.isContainer(live)) rooms.push(live);
    }
    return rooms.length > 0 ? rooms : null;
  }

  /** The place read, in the order rooms → fabric → upkeep. */
  protected static linesOf(f: RoomsRead): string[] {
    const lines = [f.whole ? 'You take stock of the place as a whole:' : 'You take stock of the room:'];
    if (f.reports.length === 0) lines.push('  (nothing here knows what a room is for.)');
    for (const r of f.reports) lines.push(RoomsReading.reportOf(r));
    if (f.shell) lines.push(RoomsReading.shellLine(f.shell));
    if (f.upkeepTerm !== null) lines.push(`Upkeep here is ${RoomsReading.termProse(f.upkeepTerm)}.`);
    return lines;
  }

  /** The building's fabric, in words — the band and why. */
  protected static shellLine(o: OutsideRead): string {
    return `The fabric of the place is ${o.band}${o.cause ? ` — ${o.cause}` : ''}.`;
  }

  /** One archetype's line: the verdict, then what met or missed each need. */
  protected static reportOf(s: Satisfaction): string {
    const met = s.rows.filter((r) => r.satisfied);
    const short = s.rows.filter((r) => !r.satisfied);
    const head = s.satisfied
      ? `  ${s.label}: yes`
      : met.length === 0
        ? `  ${s.label}: no`
        : `  ${s.label}: not quite`;
    const by = met
      .filter((r) => r.by)
      .map((r) => `${r.key} (${r.by})`)
      .join(', ');
    const missing = short.map((r) => r.key).join(', ');
    const parts: string[] = [];
    if (by) parts.push(`has ${by}`);
    if (missing) parts.push(`wants ${missing}`);
    return parts.length > 0 ? `${head} — ${parts.join('; ')}` : head;
  }

  /** The term vocabulary, said in words rather than in its key. */
  protected static termProse(term: string): string {
    switch (term) {
      case 'institution-all':
        return 'the institution’s, inside and out';
      case 'landlord-shell':
        return 'the landlord’s for the shell; yours for what you put in it';
      case 'owner-all':
        return 'yours, all of it';
      default:
        return term;
    }
  }
}
