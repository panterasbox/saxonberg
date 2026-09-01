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
 * `HoldingWarren` already uses in the other direction.
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
import { Mml } from '../../../../api/mml';

const CATALOGUE_PATH = '/platform/idea/ArchetypeCatalogue';

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
  execute(_model: CommandModel, context: CommandContext): void {
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

    const lines: string[] = [];
    lines.push(
      holding
        ? 'You take stock of the place as a whole:'
        : 'You take stock of the room:',
    );

    if (archetypes.length === 0) {
      lines.push('  (nothing here knows what a room is for.)');
    }
    for (const archetype of archetypes) {
      lines.push(this.reportOf(archetype.satisfies(spaces)));
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
