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
 *   2. **What shape is the place in?** The holding's shell condition, as
 *      a BAND with its cause named ("the paint has gone; rain has
 *      gotten into the sills") — never a number, never a gauge.
 *   3. **Who owes the upkeep?** The holding's tenure term.
 *
 * Questions 2 and 3 answer only when the room belongs to a holding, and
 * they are read through the `WarrenMember` back-ref by SHAPE, never by
 * import: the residential programme is a capability pack's class and the
 * kernel does not import packs. It is the same duck-typed seam
 * `OuterWarren` already uses in the other direction.
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
  conditionBand(): string;
  conditionCause(): string | null;
  getUpkeepTerm(): string;
  getMembers(): Stuff[];
}

export default class SurveyController extends CommandController {
  async execute(
    _model: CommandModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const room = context.location;
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

    if (holding) {
      const cause = holding.conditionCause();
      lines.push('');
      lines.push(
        `The fabric of the place is ${holding.conditionBand()}` +
          (cause ? ` — ${cause}` : '') +
          '.',
      );
      lines.push(`Upkeep here is ${this.termProse(holding.getUpkeepTerm())}.`);
    }

    MessageApi.scene(actor)
      .topic('sense.survey')
      .toSelf(Mml.text(`\n${lines.join('\n')}\n`))
      .send();
  }

  /** One archetype's line: the verdict, then what met or missed each need. */
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
    if (!BiomeApi.isSkyExposed(room)) return null;
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
      typeof warren.conditionBand !== 'function' ||
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
