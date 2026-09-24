/**
 * FieldWorkController — what `plough` and `mow` still need that the
 * kernel's ground base does not give them.
 *
 * ⭐⭐ **The body of this file left for the kernel.** `grub`, `ditch` and
 * `lime` act on **ground** — you ditch a road, a yard and a quarry — so
 * the extraction build promoted `ImprovableMixin` and the three acts to
 * `platform/idea/cmd/ground/`, where a turbary reaches them with no
 * farming dependency at all. What stays here is exactly what is *not*
 * about improvement: ploughing and mowing want a **field** — a host that
 * answers `getGroundSpot` and carries a sward — and they want its resolved
 * ground SAMPLE rather than only its bill.
 *
 * ⚠ So this is a thin subclass by design, and the thinness is the point:
 * if it grows a second concern, that concern probably belongs one layer
 * down beside the acts every piece of ground shares.
 */

import {
  GroundWorkController,
  GROUND_TOPIC,
  AGRICULTURE,
  LABOUR_PER_ACT,
} from '@saxonberg/server/mud/platform/idea/cmd/ground/GroundWorkController';
import type { CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { ImprovementCost } from '@saxonberg/server/mud/lib/ground/Improvable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import GroundCharacter, { type GroundSample } from '@saxonberg/content-ground/src/idea/GroundCharacter';
import type Field from '../../../location/Field';

/**
 * ⭐ Re-exported so farming's own acts keep one import.
 *
 * ⚠ `FIELD_TOPIC` is the kernel's `GROUND_TOPIC` under its old name — the
 * same string, kept because `plough` and `mow` narrate on it and renaming
 * them is churn with no reader.
 */
export const FIELD_TOPIC = GROUND_TOPIC;
export { AGRICULTURE, LABOUR_PER_ACT };
export type { GroundStepOptions as FieldStepOptions } from '@saxonberg/server/mud/platform/idea/cmd/ground/GroundWorkController';

/** A field, its resolved character, and the bill that character implies. */
export interface FieldReading {
  field: Field & Stuff & Container;
  sample: GroundSample;
  bill: ImprovementCost;
}

export abstract class FieldWorkController<
  M extends CommandModel = CommandModel,
> extends GroundWorkController<M> {
  /**
   * The field the actor is standing in, with its ground resolved — or
   * `null` when they are not standing in one.
   *
   * ⭐ Narrowed by the SHAPE the room answers rather than by a mixin name,
   * because a hand-authored field (a venue that composed soil onto a room
   * of its own) must behave identically to a plotted one. Nothing in these
   * acts consults how the ground came to exist.
   *
   * ⚠ Distinct from the kernel's `groundOf`, and both are needed: that one
   * answers *ground that can be improved, and its bill*; this one answers
   * *a field, and its SAMPLE* — because the plough reads the texture and
   * the scythe reads the sward, neither of which is a bill.
   */
  protected async fieldOf(giver: Stuff): Promise<FieldReading | null> {
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    const candidate = room as unknown as Partial<Field> & Stuff & Container;
    if (typeof candidate.getGroundSpot !== 'function') return null;
    if (typeof (candidate as unknown as { progressOn?: unknown }).progressOn !== 'function') {
      return null;
    }
    const field = candidate as Field & Stuff & Container;
    const locality = await AddressApi.resolveLocalityFor(room as Stuff & Container);
    const seed = GroundCharacter.seedFor(locality?.getAddress() ?? '');
    const model = await this.characterAt(room as Stuff & Container);
    const sample = field.groundSample(model, seed);
    return { field, sample, bill: GroundCharacter.improvementCost(sample) };
  }

  /** The authored ground-character model, or `null` (the ordinary case). */
  protected async characterAt(place: Stuff & Container): Promise<GroundCharacter | null> {
    return GroundCharacter.forZone(
      (place as unknown as {
        getZone?(): { lookupField<T>(f: string): Promise<T | null> } | null;
      }).getZone?.(),
    );
  }
}
