/**
 * SoilChannelController — the shared base for the three soil reads
 * (`measure texture`, `measure acidity`, `analyze soil`).
 *
 * ## The ladder, and which rung each verb is
 *
 * D4's law is the field-substrate slate's: *a field you read for free is
 * scenery; a field you pay to read is a career.* So the ladder has four
 * rungs and this pack owns the middle two:
 *
 * | Rung | Cost | Reading | Where |
 * |---|---|---|---|
 * | `look` | free | a coarse honest band | `GroundCharacter.lookPhrase` |
 * | **the ribbon test** | a spade, your hands, time | the texture class | `measure texture` |
 * | **instruments** | capital | pH, with an error band | `measure acidity` |
 * | the survey | many samples | the holding, known | `analyze soil` |
 *
 * ⭐⭐ **A procedure is a verb; a reading is a channel.** The ribbon test
 * is a *physical act* — you take a spadeful, wet it, and roll it between
 * finger and thumb — so it sits on `measure`, which is the act. What your
 * accumulated readings ADD UP TO is an interpretation, so it sits on
 * `analyze`. That split is the instrumentation model, and it is why this
 * build adds **no new verb** despite adding a whole survey ladder.
 *
 * ## Why these controllers live in the PACK
 *
 * They are named ABSOLUTELY from the platform's own `measure`/`analyze`
 * views, exactly as `trade-mining`'s three geological reads are, and for
 * the same reason: they gate on a farming tool, they band by the
 * `soil-science` Discipline, and they speak farming prose. In an install
 * without `trade-farming`, `measure texture` is advertised in `measure`'s
 * help and dies on dispatch with a legible `controller-error` note —
 * which is the shipped behaviour for `measure strike` without the mining
 * pack.
 *
 * ⚠ **`analyze ground` is NOT this.** That stanza is mining's and reads
 * an *orebody* — a plane in the rock, solved from strike and dip. Soil is
 * a different channel with different instruments, different arithmetic
 * and a different discipline; folding them together would put farming
 * code in the mining pack and make farmland unreadable in any install
 * without a mine in it.
 *
 * ## What competence buys
 *
 * ⭐ **Resolution and the availability of an inference. Never the
 * number.** The ground is what it is; `pH 6.4 ± 0.8` and `pH 6.4 ± 0.1`
 * are the same dirt read by two people. A better agronomist does not get
 * better soil.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
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
import GroundCharacter, { type GroundSample, type Spot } from '../../GroundCharacter';

/** The Discipline every soil read is banded by, and credits. */
export const SOIL_SCIENCE = 'soil-science';

/** The topic the readings narrate on. */
export const READING_TOPIC = 'sense.reading';

/**
 * The tool capability a digging implement affords — already spoken by
 * the mining shovel, so the vocabulary is shared and the kernel keeps no
 * list. **You cannot do a ribbon test without opening the ground.**
 */
export const DIGGING = 'digging';

/** The tool capability a soil test kit affords. */
export const SOIL_TESTING = 'soil-testing';

/**
 * ⭐ **The error band IS the competence** — the half-width on a pH
 * reading, in pH units, by band.
 *
 * ⚠ These never touch the underlying figure. The controller reports the
 * truth and the observation separately so a test can assert that two
 * readers got the identical ground at different resolutions.
 */
const PH_ERROR: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 1.2,
  novice: 0.8,
  competent: 0.4,
  proficient: 0.2,
  expert: 0.1,
};

/**
 * How many sampled spots a band can generalise a HOLDING from.
 * ⭐ Competence decides whether the inference is available at all: four
 * spadefuls under an untrained hand are four spadefuls, and the same four
 * under a practised one are a map of the field.
 */
const GENERALISE_FROM: Readonly<Record<CompetenceBandName, number>> = {
  untrained: Number.POSITIVE_INFINITY,
  novice: 4,
  competent: 3,
  proficient: 2,
  expert: 2,
};

export abstract class SoilChannelController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /** Decline diegetically, and file the structured reason. */
  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(READING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** The room the actor is standing in, or `null`. */
  protected placeOf(giver: Stuff): (Stuff & Container) | null {
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    return room && MixinApi.isContainer(room) ? (room as Stuff & Container) : null;
  }

  /**
   * A tool with `capability` in hand.
   *
   * ⚠ The gate is the CONTROLLER's, not the view's — the `Sextant`
   * shape, which mining's survey base states: an instrument contributes
   * the whole `measure` view and each channel's controller checks for
   * the one it actually needs.
   */
  protected toolOf(giver: Stuff, capability: string): Stuff | null {
    if (!MixinApi.isContainer(giver)) return null;
    return (
      giver.getContents().find((i) => MixinApi.isTool(i) && i.hasCapability(capability)) ?? null
    );
  }

  /**
   * The spot on the ground the actor is standing on, in zone cells.
   *
   * ⭐ Ground that plots has coordinates, and coordinates ARE membership:
   * a location with none is in no grid, so it inherits nothing and there
   * is no ground under it to read. That refusal is honest rather than a
   * missing feature — you cannot take a soil sample in an idea.
   */
  protected spotOf(place: Stuff & Container): Spot | null {
    const c = (place as unknown as {
      getCoordinates?(): [number, number, number];
    }).getCoordinates?.();
    return c ? [c[0], c[1]] : null;
  }

  /**
   * The authored ground-character model covering where the actor stands,
   * through the zone chain — or `null`, which is the ordinary case.
   *
   * ⚠ `null` means *nobody authored anything about this ground*, NOT
   * *this ground has no character*. {@link GroundCharacter.resolve} takes
   * the nullable model precisely so that distinction never leaks into a
   * caller as a branch.
   */
  protected async characterAt(place: Stuff & Container): Promise<GroundCharacter | null> {
    const zone = (place as unknown as {
      getZone?(): { lookupField<T>(f: string): Promise<T | null> } | null;
    }).getZone?.();
    if (!zone) return null;
    const path = await zone.lookupField<string>('groundCharacter');
    if (!path) return null;
    // ⚠ Get-or-create: a reference Idea nothing boots a roster of reads
    // `null` forever on a fresh process. The recurring bug, and the
    // shipped answer (`SurveyChannelController.depositAt`).
    const resident = StuffApi.findByTemplatePath<GroundCharacter>(path);
    if (resident) return resident;
    try {
      return await StuffApi.singleton<GroundCharacter>(path);
    } catch {
      return null;
    }
  }

  /** The soil field's seed — the Locality's address, and nothing stored. */
  protected async seedAt(place: Stuff & Container): Promise<number> {
    const locality = await AddressApi.resolveLocalityFor(place);
    return GroundCharacter.seedFor(locality?.getAddress() ?? '');
  }

  /** The whole resolved sample where the actor stands. */
  protected async sampleAt(
    place: Stuff & Container,
  ): Promise<{ sample: GroundSample; spot: Spot } | null> {
    const spot = this.spotOf(place);
    if (!spot) return null;
    const model = await this.characterAt(place);
    const seed = await this.seedAt(place);
    return { sample: GroundCharacter.resolve(model, spot, seed), spot };
  }

  /** The reader's band in `soil-science`, and what it buys. */
  protected async bandOf(
    giver: Stuff,
  ): Promise<{ band: CompetenceBandName; phError: number; generaliseFrom: number }> {
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor(SOIL_SCIENCE)
      : CompetenceBand.FLOOR;
    return { band, phError: PH_ERROR[band], generaliseFrom: GENERALISE_FROM[band] };
  }

  /**
   * ⭐⭐ **D5 — the survey is per-viewer, and it is a BELIEF.**
   *
   * *The map is a record of your sampling, not of the world.* Land you
   * have worked for years, you know; land you just bought, you do not.
   * Written to the belief store's DISCOVERY realm, keyed on `(locality,
   * spot, channel)`, so two characters standing in one gateway hold
   * different surveys of one field — which makes buying land a real risk
   * and an honest surveyor worth paying.
   *
   * The reading is stored and the ERROR BAND is not: the band is a fact
   * about the reader at the moment of reading it back, so an agronomist
   * who improves re-reads their own old notes at their new resolution.
   */
  protected remember(
    giver: Stuff,
    ground: string,
    spot: Spot,
    channel: string,
    reading: string,
  ): void {
    const store = giver as unknown as {
      know?(realm: string, referent: string, update: Record<string, unknown>): void;
    };
    if (typeof store.know !== 'function') return;
    store.know(DISCOVERY, referentFor(ground, spot, channel), {
      knownAs: reading,
      found: true,
    });
  }

  /** Every soil reading this character holds about `ground`. */
  protected recallAll(
    giver: Stuff,
    ground: string,
  ): Array<{ where: string; channel: string; reading: string }> {
    const store = giver as unknown as {
      recallRealm?(realm: string): ReadonlyMap<string, { knownAs: string | null }>;
    };
    if (typeof store.recallRealm !== 'function') return [];
    const prefix = `soil:${ground}@`;
    const out: Array<{ where: string; channel: string; reading: string }> = [];
    for (const [referent, record] of store.recallRealm(DISCOVERY)) {
      if (!referent.startsWith(prefix)) continue;
      const rest = referent.slice(prefix.length);
      const hash = rest.lastIndexOf('#');
      if (hash < 0 || record.knownAs === null) continue;
      out.push({
        where: rest.slice(0, hash),
        channel: rest.slice(hash + 1),
        reading: record.knownAs,
      });
    }
    return out.sort(
      (a, b) => a.where.localeCompare(b.where) || a.channel.localeCompare(b.channel),
    );
  }

  /**
   * The ground's identity for the survey record — the covering
   * Locality's address.
   *
   * ⚠ Deliberately the LOCALITY and not the room: a survey is knowledge
   * of *a piece of country*, and a holder who samples four corners of
   * one farm has surveyed one farm. Keying on the room would make every
   * field an island and the generalisation rung unreachable.
   */
  protected async groundIdOf(place: Stuff & Container): Promise<string> {
    const locality = await AddressApi.resolveLocalityFor(place);
    return locality?.getAddress() ?? 'unnamed ground';
  }
}

/**
 * The DISCOVERY referent for one soil reading.
 *
 * ⚠ A durable FEATURE HANDLE, not a `templatePath` — which is what the
 * realm's records already are, and why the realm is exempt from the
 * liveness GC. A sampled spot is a place, and a place does not stop
 * existing because nobody is standing on it.
 */
function referentFor(ground: string, spot: Spot, channel: string): string {
  return `soil:${ground}@${spot[0]},${spot[1]}#${channel}`;
}
