/**
 * SurveyController — `survey`: read the room you are standing in as a
 * PLACE, rather than as a list of objects.
 *
 * Three questions, all read-only (residences D15/D4):
 *
 *   1. **What is this room FOR?** Every room archetype, satisfied or
 *      not, and — the point — *by what*. The report names whatever
 *      object actually answered the capability, so a studio corner with
 *      a hotplate reads as a kitchen and says "the hotplate". Nothing
 *      is enforced anywhere: an unrecognized room provisions, persists
 *      and functions identically, and no multiplier reads this.
 *   2. **What shape is the place in?** The BUILDING's fabric (paint D13 —
 *      a shop, a ship, a home: whatever structure this room is part of),
 *      as a BAND with its cause named ("the paint has gone; rain has
 *      gotten into the sills"), the coat on it, and the job in litres.
 *   3. **Who owes the upkeep?** The holding's tenure term.
 *
 * Question 3 answers only when the room belongs to a holding, and it is
 * read through the `WarrenMember` back-ref by SHAPE, never by
 * import: the residential programme is a capability pack's class and the
 * kernel does not import packs. It is the same duck-typed seam
 * `CirculationWarren` already uses in the other direction.
 *
 * Room archetypes are the industry-less ones — a bedroom derives from no
 * recipes, which is exactly what distinguishes it from a venue
 * archetype. That is the filter, and it needs no list.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Archetype, Satisfaction } from '../../../../lib/archetype/Archetype';
import type ArchetypeCatalogue from '../../ArchetypeCatalogue';
import { StuffApi } from '../../../../api/stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { BiomeApi } from '../../../../api/biome';
import { Mml } from '../../../../api/mml';
import { NavigationApi } from '../../../../api/navigation';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Paint } from '../../../../lib/material/Paint';
import StructureBase from '../../../../lib/structure/Structure';
import type Material from '../../../../lib/material/Material';
import type { Faced } from '../../../../lib/material/Faced';
import type { Durable } from '../../../../lib/material/Durable';

/** A building with an outside and a condition — what `survey` reads of one. */
type KeptBuilding = Stuff & Faced & Durable;

function isKeptBuilding(s: Stuff): s is KeptBuilding {
  return s instanceof StructureBase && MixinApi.isFaced(s) && MixinApi.isDurable(s);
}

const CATALOGUE_PATH = '/platform/idea/ArchetypeCatalogue';

/**
 * The transport pack's lane catalogue, reached BY SHAPE. The kernel does
 * not import a pack; a realm without transport installed simply has no
 * ways, and `survey` reports no corridor line.
 */
const LANE_CATALOGUE_PATH = '/system/transport/idea/LaneCatalogue';

/**
 * The holding half of the read, duck-typed. A programme is a Warren that
 * also answers for the condition of the shell and who owes it.
 */
interface HoldingShape {
  getUpkeepTerm(): string;
  getMembers(): Stuff[];
}

export default class SurveyController extends CommandController {
  async execute(
    model: CommandModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const room = context.location;
    const target = (model.target as { stuff?: Stuff | null } | undefined)?.stuff ?? null;
    // ⭐ `survey <building>` from where it meets the weather (paint D3):
    // the binder only finds a structure on its landing, so a target that
    // is one is read from outside, and anything else is refused in words.
    if (target != null && target !== room) {
      if (isKeptBuilding(target)) {
        await this.surveyOutside(actor, target);
        return;
      }
      context.note({ kind: 'controller-rejected', reason: 'not-a-building', detail: 'not a building' });
      MessageApi.scene(actor)
        .topic('sense.survey')
        .toSelf(Mml.compose`${Mml.thing(target)} is not a building you could take stock of. Survey the place you are in, or a building from outside it.`)
        .send();
      return;
    }
    if (!room || !MixinApi.isContainer(room)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'nowhere-to-survey',
        detail: 'nowhere to survey',
      });
      MessageApi.scene(actor)
        .topic('sense.survey')
        .toSelf(Mml.compose`There is nothing here to take stock of.`)
        .send();
      return;
    }

    const archetypes = this.roomArchetypes();
    const holding = this.holdingOf(room);
    const spaces: (Stuff & Container)[] = holding
      ? holding.getMembers().filter((m): m is Stuff & Container =>
          MixinApi.isContainer(m),
        )
      : [room as Stuff & Container];

    // The corridor space set: every room of every WAY through here,
    // resolved by lane and reached by shape (see `waysideSpaces`).
    const wayside = await this.waysideSpaces(room as Stuff & Container);

    const lines: string[] = [];
    lines.push(
      holding
        ? 'You take stock of the place as a whole:'
        : 'You take stock of the room:',
    );

    const reported = archetypes.filter(
      (a) => a.getSurveyScope() !== 'off-room' &&
        (a.getSurveyScope() !== 'corridor' || wayside !== null),
    );
    if (reported.length === 0) {
      lines.push('  (nothing here knows what a room is for.)');
    }
    for (const archetype of reported) {
      lines.push(
        this.reportOf(
          archetype.satisfies(
            archetype.getSurveyScope() === 'corridor' && wayside
              ? wayside
              : spaces,
          ),
        ),
      );
    }

    // ⭐ The fabric is the BUILDING's (paint D13): whatever structure this
    // room is a member of, read through its condition — a shop, a ship, a
    // home. A holding still answers for who OWES it (the term).
    const roomPath = room.getPlacePath();
    const structure = roomPath ? await NavigationApi.structureAt(roomPath) : null;
    if (structure !== null && isKeptBuilding(structure)) {
      lines.push('');
      lines.push(...(await this.outsideLines(structure, 'the place')));
    }
    if (holding) {
      lines.push(`Upkeep here is ${this.termProse(holding.getUpkeepTerm())}.`);
    }

    // ⭐ How the place is KEPT (cleanliness D15) — after the holding and
    // the fabric, the order repair's lines agree to: holding → fabric →
    // floor. A band and the method, never a number.
    const floorLine = this.floorLine(room);
    if (floorLine) {
      lines.push('');
      lines.push(floorLine);
    }

    MessageApi.scene(actor)
      .topic('sense.survey')
      .toSelf(Mml.text(`\n${lines.join('\n')}\n`))
      .send();
  }

  /** `survey <building>` — its outside, read from a landing. */
  private async surveyOutside(actor: Stuff, structure: KeptBuilding): Promise<void> {
    const lines = [`You take stock of ${structure.getPresentation()} from outside:`];
    lines.push(...(await this.outsideLines(structure, 'it')));
    MessageApi.scene(actor)
      .topic('sense.survey')
      .toSelf(Mml.text(`\n${lines.join('\n')}\n`))
      .send();
  }

  /**
   * ⭐ A building's outside, in words (paint D13): the coat and its color,
   * the fabric's condition and why, then the job — how much wall and roof, and
   * roughly how much paint one coat would take. The area and the litres
   * are figures because `survey` measures; the band and the color never are.
   */
  private async outsideLines(structure: KeptBuilding, noun: string): Promise<string[]> {
    if (structure instanceof StructureBase) await structure.standUpLandings();
    const band = structure.getConditionWord();
    const cause = structure.weatherCause();
    const out: string[] = [];
    const top = structure.getCoats('outside')[0];
    if (top === undefined) {
      out.push(`There is no coat left on ${noun === 'it' ? 'it' : 'the outside'}.`);
    } else {
      const paint = top.paint ? new Paint(top.paint) : null;
      const mat = StuffApi.findByTemplatePath<Material>(top.material) ?? null;
      const word = paint?.coatWord() ?? mat?.getCoatWord() ?? 'coated';
      const color = paint ? ` ${paint.colorTag(top.faded ?? 0)}` : '';
      const what = paint ? paint.words(top.faded ?? 0) : mat?.getName() || 'a coat';
      out.push(
        top.state === 'wet'
          ? `The outside has a wet coat of ${what}, not yet set.`
          : top.state === 'set'
            ? `The outside is ${word}${color} — ${what}.`
            : top.state === 'run'
              ? `The ${what} on the outside ran before it set.`
              : top.state === 'crazed'
                ? `The ${what} on the outside is crazed with fine cracks.`
                : `The ${what} on the outside has crawled off bare patches.`,
      );
    }
    out.push(`The fabric of ${noun} is ${band}${cause ? ` — ${cause}` : ''}.`);
    const area = structure.coatAreaM2();
    if (area > 0) {
      const film = this.dial(AppSettingKeys.structurePaintCoatThicknessM, 0.00005);
      const litres = area * film * 1000;
      out.push(
        `There is about ${Math.round(area)} square meters of wall and roof to the weather; ` +
          `one coat of paint would take about ${Math.max(1, Math.round(litres))} litres.`,
      );
    }
    return out;
  }

  private dial(key: string, fallback: number): number {
    try {
      const n = Number.parseFloat(AppApi.setting(key) ?? '');
      return Number.isFinite(n) && n > 0 ? n : fallback;
    } catch {
      return fallback;
    }
  }

  /** One archetype's line: the verdict, then what met or missed each need. */
  /** *The floor is soiled; scrub would see to it.* — or nothing. */
  private floorLine(room: Stuff): string {
    if (!MixinApi.isAdornable(room)) return '';
    const floor = room.getFloor() as unknown as Stuff | null;
    if (floor === null || !MixinApi.isFloor(floor) || !floor.takesSoil()) {
      return '';
    }
    if (!MixinApi.isSoilable(floor)) return '';
    floor.reconcileStalls();
    const band = floor.soilBand('');
    if (band === 'clean') return 'The floor is clean.';
    return `The floor is ${band}; to ${floor.cleaningMethod()} it would see to it.`;
  }

  private reportOf(s: Satisfaction): string {
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

  /**
   * The room archetypes: the ones that derive nothing from an industry.
   * A bedroom has no trade; a bar does.
   */
  private roomArchetypes(): Archetype[] {
    const catalogue =
      StuffApi.findByTemplatePath<ArchetypeCatalogue>(CATALOGUE_PATH);
    if (!catalogue) return [];
    return catalogue
      .allArchetypes()
      .filter((a) => a.getIndustry() === null)
      .sort((a, b) => a.getArchetypeId().localeCompare(b.getArchetypeId()));
  }

  /**
   * The rooms a `surveyScope: 'corridor'` archetype reports over, or
   * `null` when this is not a place a way runs through.
   *
   * ⭐ **Outdoors is what makes somewhere a WAY rather than a room**, and
   * `BiomeApi.isSkyExposed` is the shipped predicate for it — so this
   * costs no new field on the zone (logistics D20: *zone, nothing new*)
   * and no marker anywhere. A high street and a towpath both answer; a
   * bedroom, a bar and a brewing floor do not, which is what keeps five
   * new lines off every `survey` in the game.
   *
   * ⚠ An outdoor square on a WAY does answer, and that is correct
   * rather than noise: D18's own table calls the high street a
   * corridor, and *is there shelter, water, a crossing, light along
   * here* is a fair question to ask of any public way. An outdoor
   * square that is on no lane answers nothing, which is the fix — it
   * used to answer for its whole zone whether or not that zone was a
   * road. Reported, never enforced.
   */
  private async waysideSpaces(
    room: Stuff & Container,
  ): Promise<(Stuff & Container)[] | null> {
    // Cheap pre-filter: a corridor is outdoor ground. An interior room
    // never asks corridor questions, which is what keeps four lines off
    // every bedroom in the game.
    // (rubber build) outdoor ground = open above and nothing around it.
    if (!(BiomeApi.exposureOf(room)?.isOutside() ?? false)) return null;
    const here = room.getTemplatePath() ?? '';
    if (here === '') return null;

    /*
     * ⚠⚠ **The way is the LANE, not the zone.**
     *
     * This resolved the zone's rooms, and said so in its own comment:
     * *"by zone rather than by lane, so this controller imports no
     * pack"*. That is the tail wagging the dog — the unit that was
     * reachable rather than the unit that was right — and a zone is not
     * a way. It was wrong in BOTH directions: a one-room zone (an
     * outdoor courtyard) reported a "corridor" that is a spot, and a
     * city-sized zone would report *the corridor has water* because a
     * fountain exists a quarter-mile away. The shipped roads read
     * correctly only because they happen to be zoned one-road-per-zone,
     * which is an authoring coincidence and would break silently.
     *
     * ⭐ A lane IS the way — the subgraph of exits admitting one mode —
     * and the kernel reaches it BY SHAPE, the duck-typed singleton
     * lookup `consigns` already uses for the same catalogue. No import,
     * no pack dependency, and it degrades exactly right: standing
     * outdoors on no road answers `null`, so the corridor lines vanish
     * instead of being asked about a place that is not a way.
     */
    const catalogue = await StuffApi.singleton<Stuff>(
      LANE_CATALOGUE_PATH,
    ).catch(() => null);
    const asLanes = catalogue as unknown as {
      lanesAt?: (path: string) => Promise<readonly { nodes: string[] }[]>;
    } | null;
    if (!asLanes || typeof asLanes.lanesAt !== 'function') return null;

    const lanes = await asLanes.lanesAt(here);
    if (lanes.length === 0) return null;

    // The union of every way through here — a crossroads is on two, and
    // its needs are the needs of both.
    const paths = new Set<string>();
    for (const lane of lanes) for (const n of lane.nodes) paths.add(n);

    const rooms: (Stuff & Container)[] = [];
    for (const path of paths) {
      // ⚠ The multi-instance form: a shared fixture row stands in many
      // places, and the singleton lookup THROWS on more than one live
      // instance (the lesson `job post` paid for).
      const live = StuffApi.findAllByTemplatePath(path)[0];
      if (live && MixinApi.isContainer(live)) rooms.push(live);
    }
    return rooms.length > 0 ? rooms : null;
  }

  /** The room's holding, when it belongs to one and it answers for a shell. */
  private holdingOf(room: Stuff): HoldingShape | null {
    if (!MixinApi.isWarrenMember(room)) return null;
    const warren = room.getWarren() as unknown as Partial<HoldingShape> | null;
    if (
      !warren ||
      typeof warren.getUpkeepTerm !== 'function' ||
      typeof warren.getMembers !== 'function'
    ) {
      return null;
    }
    return warren as HoldingShape;
  }

  /** The term vocabulary, said in words rather than in its key. */
  private termProse(term: string): string {
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
