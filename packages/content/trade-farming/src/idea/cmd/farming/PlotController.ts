/**
 * PlotController — `plot [<name>]`, **the act that makes a field.**
 *
 * ⭐⭐ **A field is PLOTTED out of land you already hold** (D3). It is not
 * a lot bought from a plat book — that is the residential path, with a
 * catalogue, a price and a provisioner that builds you a house. Plotting
 * has none of that: you are standing on ground that is already yours, and
 * you cut the first sod.
 *
 * ⭐ **And because the ground was always there (D2), you can survey
 * before you commit.** Plotting is therefore a decision about *where*,
 * informed by work you chose to do — or a gamble you chose to take. That
 * is only true because {@link Field} carries the spot it was plotted
 * from, so the field you make on ground you sampled is the ground you
 * sampled.
 *
 * ## What it refuses, and why each refusal is a real fact
 *
 * | refusal | the fact |
 * |---|---|
 * | no spade | you do not plot a field by looking at it |
 * | not your ground | title, through `AccessApi.heldExtents` |
 * | zoned `bed` or `none` | ⭐ the **first consumer** of `LandUse`'s `field` ceiling, which has shipped unconsumed since the smallholding build |
 * | no room left on the holding | Σ areas against the parcel's declared yard |
 * | nowhere to hang it | the holding warren answers no `admitPlot` |
 *
 * ⚠ **Unparcelled ground is NOT policed** — the shipped convention, and
 * the reason the hermit works: *"nobody has zoned this"* is not the same
 * statement as *"this is zoned against you"*, and neither is *"nobody
 * measured this"* the same as *"this is full"*.
 *
 * ## The seam it crosses, and how it avoids depending on residence
 *
 * A holding is a `HoldingWarren` in the `residence` system pack, whose
 * own docstring has always promised *"the member contract stays open to
 * runtime-added members (the cross-build interface with farming's
 * break-ground act)"*. This calls that promise by the **shape it
 * answers** — `admitPlot` — never by importing it, exactly as
 * `analyze water` recognises a waterworks. A trade does not depend on
 * the residence system to put a field on ground somebody holds.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { LandUses } from '@saxonberg/server/mud/lib/parcel/LandUse';
import GroundCharacter from '../../GroundCharacter';
import type Field from '../../../location/Field';

const TOPIC = 'act.deed';

/** The row every plotted field clones from (D17 — always a real row). */
const FIELD_ROW = '/trade/farming/location/field';

/**
 * How much ground one `plot` takes, in m².
 *
 * ⭐ A fixed size rather than a parameter, and that is the design: a
 * field is a UNIT of ground the way a paddock is, and *how many* you have
 * is the interesting number rather than *how big you declared one*. It
 * also makes the yard arithmetic legible — a 1,000 m² Hinkley lot holds
 * two of these and no more, which is a fact a player can hold in their
 * head.
 */
const FIELD_AREA_M2 = 400;

/**
 * The shape a holding must answer for a field to be hung on it. ⚠ Not an
 * import — see the class docstring.
 */
interface PlotHost {
  admitPlot(spec: {
    leaf: string;
    room: string;
    direction: string;
    opposite?: string;
    from?: string;
    extra?: Record<string, unknown>;
  }): Promise<(Stuff & Container) | null>;
  getMembers(): readonly (Stuff & Container)[];
}

interface PlotModel extends CommandModel {
  name?: string;
}

export default class PlotController extends CommandController<PlotModel> {
  async execute(model: PlotModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to plot anything out of.`, 'no-place');
      return;
    }
    if (!this.spadeOf(giver)) {
      this.decline(
        context,
        Mml.compose`You do not plot a field by looking at it. You would want a spade.`,
        'no-tool',
      );
      return;
    }

    // The ground this room actually sits on. A room cloned once per lot
    // shares its template path with every other lot's, so the KEY is the
    // honest identity and the template path is the fallback.
    const where = MixinApi.isPersistable(place)
      ? (place.getPersistenceKey() ?? place.getTemplatePath() ?? '')
      : (place.getTemplatePath() ?? '');

    const covering = await ParcelApi.coveringParcelOf(where);
    if (covering) {
      const use = ParcelApi.landUseOf(where);
      const scale = LandUses.admitsCultivation(use);
      if (scale !== 'field') {
        this.decline(
          context,
          scale === 'bed'
            ? Mml.compose`This ground is zoned for ${LandUses.summaryOf(use)}. A bed, yes. A field, no.`
            : Mml.compose`Nothing may be grown on this ground — it is zoned for ${LandUses.summaryOf(use)}.`,
          'land-use-forbids-field',
        );
        return;
      }
      const held = await AccessApi.heldExtents(giver);
      const extent = covering.getExtent();
      if (!held.some((e) => extent === e || extent.startsWith(`${e}/`))) {
        this.decline(
          context,
          Mml.compose`This is not your ground to break.`,
          'not-held',
        );
        return;
      }
    }

    const warren = MixinApi.isWarrenMember(place) ? place.getWarren() : null;
    const host = warren as unknown as PlotHost | null;
    if (!host || typeof host.admitPlot !== 'function') {
      this.decline(
        context,
        Mml.compose`There is no holding here to add a field to.`,
        'no-holding',
      );
      return;
    }

    // ⭐ The land draw, and the FIRST consumer of the field ceiling.
    // ⚠ Unmeasured land is not policed — the shipped convention on
    // `ParcelRecord.area`, and the reason an unmeasured clearing works.
    const extent = covering?.getExtent() ?? '';
    if (extent) {
      const yard = await ParcelApi.workableAreaOf(extent);
      if (yard > 0) {
        const spoken = host
          .getMembers()
          .reduce((n, m) => n + areaOf(m), 0);
        if (spoken + FIELD_AREA_M2 > yard) {
          this.decline(
            context,
            Mml.compose`There is not the ground for another field here. You have ${Math.round(yard - spoken)} square metres of it left.`,
            'no-room',
          );
          return;
        }
      }
    }

    const leaf = leafFor(model.name, host.getMembers().length);
    const room = await host.admitPlot({
      leaf,
      room: FIELD_ROW,
      direction: leaf,
      opposite: 'out',
      extra: { plottedAreaM2: FIELD_AREA_M2 },
    });
    if (!room) {
      this.decline(
        context,
        Mml.compose`You cannot break another field here.`,
        'plot-refused',
      );
      return;
    }

    const field = room as unknown as Field;
    const spot = this.spotOf(place);
    field.setGroundSpot(spot);
    field.setAreaM2(FIELD_AREA_M2);
    if (model.name) field.setFieldName(model.name);

    const locality = await AddressApi.resolveLocalityFor(place);
    const seed = GroundCharacter.seedFor(locality?.getAddress() ?? '');
    const sample = field.groundSample(await this.characterAt(place), seed);
    field.installSoilReserves(sample);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You pace it out and cut the first sod. ${GroundCharacter.lookPhrase(sample)} It is ${Mml.thing(room as unknown as Stuff)} now, and it goes ${leaf} from here.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} paces out a piece of ground and cuts the first sod of it.`,
      )
      .send();

    // ⚠ No success note. Controllers return void and the envelope's
    // status escalates on its own; a `state-changed` kind does not exist
    // and inventing one would widen a closed vocabulary for a line
    // nothing reads.
  }

  /** The room the actor is standing in, or `null`. */
  private placeOf(giver: Stuff): (Stuff & Container) | null {
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    return room && MixinApi.isContainer(room) ? (room as Stuff & Container) : null;
  }

  /** A digging tool in hand. */
  private spadeOf(giver: Stuff): Stuff | null {
    if (!MixinApi.isContainer(giver)) return null;
    return (
      giver.getContents().find((i) => MixinApi.isTool(i) && i.hasCapability('digging')) ?? null
    );
  }

  /**
   * The soil-field spot the new field inherits — where the plotter was
   * standing, so a survey taken before committing predicts the ground.
   */
  private spotOf(place: Stuff & Container): [number, number] {
    const c = (place as unknown as {
      getCoordinates?(): [number, number, number];
    }).getCoordinates?.();
    return c ? [c[0], c[1]] : [0, 0];
  }

  /** The authored ground-character model, or `null` (the ordinary case). */
  private async characterAt(place: Stuff & Container): Promise<GroundCharacter | null> {
    const zone = (place as unknown as {
      getZone?(): { lookupField<T>(f: string): Promise<T | null> } | null;
    }).getZone?.();
    if (!zone) return null;
    const path = await zone.lookupField<string>('groundCharacter');
    if (!path) return null;
    const resident = StuffApi.findByTemplatePath<GroundCharacter>(path);
    if (resident) return resident;
    try {
      return await StuffApi.singleton<GroundCharacter>(path);
    } catch {
      return null;
    }
  }

  /** Decline diegetically, and file the structured reason. */
  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/** A field's area, when the member is one; zero for anything else. */
function areaOf(member: Stuff): number {
  return (member as unknown as { getAreaM2?(): number }).getAreaM2?.() ?? 0;
}

/**
 * ⭐ **D88 — holders name their fields**, and the name IS the way in.
 * `plot "top meadow"` gives you a gate you leave by as `top meadow`,
 * which is why *"move them to the top meadow"* works and *"paddock 7"*
 * was never going to.
 */
function leafFor(name: string | undefined, existing: number): string {
  const slug = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `field-${existing + 1}`;
}
