/**
 * SurveyChannelController — the shared base for the three geological
 * reads (`measure strike`, `measure dip`, `analyze ground`).
 *
 * ## Why these controllers live in the PACK
 *
 * They are named ABSOLUTELY from the platform's own `measure`/`analyze`
 * views (`CommandDefinition.resolveController` takes a `/`-leading mud
 * path verbatim). That is deliberate and it is the correct home under
 * CLAUDE.md's own rule — *nothing content-specific belongs in the core
 * trees* — and these are content-specific three times over: they gate on
 * a mining instrument, they band by the `geology` Discipline, and they
 * speak mining prose. In an install without `trade-mining`,
 * `measure strike` is advertised in `measure`'s help and dies on
 * dispatch with a legible `controller-error` note.
 *
 * ## The three layers, and this base is the middle two
 *
 * | | Verb | What it is |
 * |---|---|---|
 * | the mirror | `survey` — shipped, free, ungated | *what is this place* |
 * | the measurement | `measure <channel>` | instrumented, banded, load-bearing |
 * | the interpretation | `analyze ground` | route-gated synthesis with error bands |
 *
 * ⭐⭐ **`survey` is a MIRROR. The mine's read is a MEASUREMENT.** The
 * geological read is instrument-mediated, competence-banded, and the
 * thing a player pays for and acts on — the opposite of a read nothing
 * is gated on. It does not fold into `survey`, and `survey` still works
 * in a working for free.
 *
 * ## What competence buys
 *
 * ⭐ **Resolution, and the availability of an inference. Never the
 * number.** The error band IS the competence (`040 ± 15°` against
 * `041 ± 3°`, same lode); the underlying figure is `Deposit`'s and is
 * identical for both, which the suite asserts by identity rather than by
 * presentation. A better prospector does not get more ore from the same
 * rock — he knows where to point.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from "@saxonberg/server/mud/lib/advancement/CompetenceBand";
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { DISCOVERY } from '@saxonberg/server/mud/lib/belief/BeliefStore';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import type { GroundSample } from '@saxonberg/content-ground/src/idea/Deposit';

/** The Discipline every geological read is banded by, and credits. */
export const GEOLOGY = 'geology';

/** The topic the readings narrate on. */
export const READING_TOPIC = 'sense.reading';

/**
 * The tool capability a surveying instrument affords. Open vocabulary,
 * like every `ToolCapability`: a compass, a miner's dial and anything a
 * later build invents agree on this string and the kernel keeps no list.
 */
export const SURVEYING = 'surveying';

/**
 * ⭐ **The error band IS the competence** — half-widths in degrees, by
 * band. An untrained eye reads a green rock; an expert reads a plane.
 *
 * ⚠ These never touch the underlying figure. `Deposit.surfaceReadingAt`
 * takes the band as an INPUT and returns both the truth and the
 * observation, so a test can assert the two readers got the identical
 * truth at different resolutions.
 */
const ERROR_DEG: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 25,
  novice: 15,
  competent: 8,
  proficient: 4,
  expert: 2,
};

/**
 * How many measurement points a band can actually SOLVE a plane from.
 * ⭐ Competence decides whether an inference is available at all: three
 * green rocks under a novice are three green rocks, and the same three
 * points under a practised eye are a strike.
 */
const SOLVE_FROM: Readonly<Record<CompetenceBandName, number>> = {
  untrained: Number.POSITIVE_INFINITY,
  novice: Number.POSITIVE_INFINITY,
  competent: 3,
  proficient: 3,
  expert: 2,
};

export abstract class SurveyChannelController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /** Decline diegetically, and file the structured reason. */
  protected decline(context: CommandContext, prose: ReturnType<typeof Mml.compose>, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(READING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** The room the actor is standing in, or `null`. */
  protected placeOf(giver: Stuff): (Stuff & Container) | null {
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    return room && MixinApi.isContainer(room) ? (room as Stuff & Container) : null;
  }

  /**
   * A surveying instrument in hand.
   *
   * ⚠ The gate is the CONTROLLER's, not the view's — the `Sextant` shape:
   * an instrument contributes the whole `measure` view and each channel's
   * controller checks for the instrument it actually needs. Without one,
   * `no-instrument`, which is the same refusal `measure altitude` gives.
   */
  protected instrumentOf(bound: Stuff | null | undefined): Stuff | null {
    if (!bound || !MixinApi.isTool(bound)) return null;
    return bound.hasCapability(SURVEYING) ? bound : null;
  }

  /** The deposit governing where the actor stands, through the zone chain. */
  protected async depositAt(place: Stuff & Container): Promise<Deposit | null> {
    const zone = (place as unknown as {
      getZone?(): { lookupField<T>(f: string): Promise<T | null> } | null;
    }).getZone?.();
    if (!zone) return null;
    const path = await zone.lookupField<string>('deposit');
    if (!path) return null;
    // ⚠ Get-or-create: `Deposit` is a reference Idea and nothing boots a
    // roster of them, so a bare `findByTemplatePath` reads null forever
    // on a fresh process. See `Working`'s `resolveDeposit`.
    //
    // ⭐ And `singleton` IS the get-or-create — its first act is that
    // same index read, clone only on a miss — so a resident pre-check in
    // front of it is the lookup written twice.
    try {
      return await StuffApi.singleton<Deposit>(path);
    } catch (err) {
      // ⚠ Tolerated, never silent: a zone naming a deposit row that does
      // not exist is an authoring fault, and barren ground is a
      // plausible-looking answer that hides it.
      console.error(`SurveyChannelController: deposit '${path}' did not resolve`, err);
      return null;
    }
  }

  /**
   * The cell the actor is standing in, in **zone metres** — the deposit's
   * own units. A deposit is a fact about the rock and does not know what
   * cell size somebody chose for the workings cut through it, so the
   * multiply happens here exactly as it does in `Working`.
   */
  protected metresAt(place: Stuff & Container): [number, number, number] {
    const coords = (place as unknown as {
      getCoordinates?(): [number, number, number];
    }).getCoordinates?.() ?? [0, 0, 0];
    const cellSize = (place as unknown as {
      getZone?(): { getCellSize?(): number } | null;
    }).getZone?.()?.getCellSize?.() ?? 1;
    return [coords[0] * cellSize, coords[1] * cellSize, coords[2] * cellSize];
  }

  /**
   * ⭐ What the ground under the actor's feet actually IS — the resolved
   * sample and the mineral's own row, or `null` where the ground is
   * barren.
   *
   * ⚠ The instruments used to hardcode the colour of copper ore
   * (*"the ground here is stained green"*). That was fine while there
   * was one mineral and a lie the moment there were two, so the words
   * come off the `Material`'s `appearance` now: the fringe says rust
   * and the heart says verdigris, and neither controller knows either
   * word. **The room prose says rust; the instrument says goethite;
   * neither lies.**
   */
  protected async groundAt(
    place: Stuff & Container,
  ): Promise<{ sample: GroundSample; mineral: Material | null } | null> {
    const deposit = await this.depositAt(place);
    if (!deposit) return null;
    const sample = deposit.sampleAt(this.metresAt(place), await this.seedAt(place));
    const mineral = sample.mineralPath
      ? StuffApi.findByTemplatePath<Material>(sample.mineralPath) ?? null
      : null;
    return { sample, mineral };
  }

  /** The deposit's seed — the covering Locality's address, and nothing stored. */
  protected async seedAt(place: Stuff & Container): Promise<number> {
    const locality = await AddressApi.resolveLocalityFor(place);
    return Deposit.seedFor(locality?.getAddress() ?? '');
  }

  /**
   * ⭐ Whether this band can make an inference from observations at all
   * — `SOLVE_FROM` being finite, read as the predicate it already is.
   *
   * ⚠ Derived rather than re-listed. Every consumer of "is this reader
   * a geologist yet?" asks here, so the band vocabulary moving cannot
   * leave a second copy of the answer behind in another file.
   */
  protected solvesGround(band: CompetenceBandName): boolean {
    return Number.isFinite(SOLVE_FROM[band]);
  }

  /** The reader's band in `geology`, and the half-width it buys. */
  protected async bandOf(giver: Stuff): Promise<{ band: CompetenceBandName; errorDeg: number; solveFrom: number }> {
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor(GEOLOGY)
      : CompetenceBand.FLOOR;
    return { band, errorDeg: ERROR_DEG[band], solveFrom: SOLVE_FROM[band] };
  }

  /**
   * ⭐⭐ **A survey record is a per-viewer BELIEF, not a UI cache.**
   *
   * What a measurement learns is written to the belief store's DISCOVERY
   * realm, keyed on `(deposit, observation point, channel)` — so two
   * characters standing on one outcrop hold different records, and a
   * survey record is **a tradeable asset** rather than a scrollback
   * artifact. DISCOVERY is exempt from the liveness GC precisely because
   * its referent is a durable feature handle rather than a live Stuff,
   * which is exactly what a survey point is.
   *
   * The reading is stored and the ERROR BAND is not: the band is a fact
   * about the reader at the moment of reading it back, so a prospector
   * who improves re-reads their old notes at their new resolution — which
   * is what actually happens to a field book.
   */
  protected remember(
    giver: Stuff,
    deposit: Deposit,
    where: string,
    channel: string,
    reading: number,
  ): void {
    const store = giver as unknown as {
      know?(realm: string, referent: string, update: Record<string, unknown>): void;
    };
    if (typeof store.know !== 'function') return;
    store.know(DISCOVERY, referentFor(deposit, where, channel), {
      knownAs: String(reading),
      found: true,
    });
  }

  /** Every reading this character holds about `deposit`. */
  protected recallAll(
    giver: Stuff,
    deposit: Deposit,
  ): Array<{ where: string; channel: string; reading: number }> {
    const store = giver as unknown as {
      recallRealm?(realm: string): ReadonlyMap<string, { knownAs: string | null }>;
    };
    if (typeof store.recallRealm !== 'function') return [];
    const prefix = `survey:${deposit.getTemplatePath() ?? deposit.getName()}@`;
    const out: Array<{ where: string; channel: string; reading: number }> = [];
    for (const [referent, record] of store.recallRealm(DISCOVERY)) {
      if (!referent.startsWith(prefix)) continue;
      const rest = referent.slice(prefix.length);
      const hash = rest.lastIndexOf('#');
      if (hash < 0 || record.knownAs === null) continue;
      const value = Number(record.knownAs);
      if (!Number.isFinite(value)) continue;
      out.push({ where: rest.slice(0, hash), channel: rest.slice(hash + 1), reading: value });
    }
    return out.sort((a, b) => a.where.localeCompare(b.where) || a.channel.localeCompare(b.channel));
  }
}

/**
 * The DISCOVERY referent for one reading.
 *
 * ⚠ A durable FEATURE HANDLE, not a `templatePath` — which is what the
 * realm's records already are (an exit's `source#exit:dir`), and why the
 * realm is exempt from the liveness GC. A survey point is a place, and a
 * place does not stop existing because nobody is standing in it.
 */
function referentFor(deposit: Deposit, where: string, channel: string): string {
  return `survey:${deposit.getTemplatePath() ?? deposit.getName()}@${where}#${channel}`;
}
