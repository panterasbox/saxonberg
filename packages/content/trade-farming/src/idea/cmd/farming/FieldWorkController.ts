/**
 * FieldWorkController — what `plow` and `mow` still need that the
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
import Tract from '../../../location/Tract';
import type Field from '../../../thing/Field';
import type { Soil } from '@saxonberg/server/mud/lib/husbandry/Soil';

/**
 * ⭐ Re-exported so farming's own acts keep one import.
 *
 * ⚠ `FIELD_TOPIC` is the kernel's `GROUND_TOPIC` under its old name — the
 * same string, kept because `plow` and `mow` narrate on it and renaming
 * them is churn with no reader.
 */
export const FIELD_TOPIC = GROUND_TOPIC;
export { AGRICULTURE, LABOUR_PER_ACT };
export type { GroundStepOptions as FieldStepOptions } from '@saxonberg/server/mud/platform/idea/cmd/ground/GroundWorkController';

/** A tract, its resolved character, and the bill that character implies. */
export interface FieldReading {
  tract: Tract & Stuff & Container;
  sample: GroundSample;
  bill: ImprovementCost;
}

/**
 * Which field an act lands on — the one named, or the only one — or the
 * refusal the TRACT words (tracts build D25): nothing marked, or several
 * and none named.
 */
export type FieldChoice =
  | { ok: true; field: Field & Stuff }
  | { ok: false; reason: string; line: string };

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
    // ⭐ A tract, asked by class (controllers-are-io D8a), never probed.
    if (!(room instanceof Tract)) return null;
    const tract = room;
    const locality = await AddressApi.resolveLocalityFor(room as Stuff & Container);
    const seed = GroundCharacter.seedFor(locality?.getAddress() ?? '');
    const model = await this.characterAt(room as Stuff & Container);
    const sample = tract.groundSample(model, seed);
    return { tract, sample, bill: GroundCharacter.improvementCost(sample) };
  }

  /**
   * The field a crop act lands on (`plow at the gate end`): the TRACT
   * resolves it — the named field, the only field, or its refusal. ⭐ The
   * grass and the seedbed are a field's since the tracts build, so an act
   * on them must know which.
   */
  protected fieldChoice(tract: Tract, named: Stuff | null | undefined): FieldChoice {
    if (tract.getFields().length === 0) {
      return {
        ok: false,
        reason: 'no-field-marked',
        line: 'Nobody has marked a field here. Mark one first.',
      };
    }
    const part = named && MixinApi.isSoil(named) ? (named as Stuff & Soil) : null;
    const resolved = tract.resolvePartFor(part);
    if (resolved.ok !== true) {
      return { ok: false, reason: resolved.reason, line: this.partLine(resolved) };
    }
    const field = resolved.part ?? tract.getFields()[0]!;
    return { ok: true, field: field as unknown as Field & Stuff };
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
