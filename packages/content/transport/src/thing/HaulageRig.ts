/**
 * HaulageRig — a wagon, a dray, a sledge: a wheeled load you **hitch and
 * pull**, that also carries continuous matter.
 *
 * ⭐ **Deliberately NOT `Mobile`.** A wagon does not steer itself; it is
 * pulled, and the shipped haulage tow inside `Mobile.traverse` already
 * carries it and its cargo through an exit as a unit. Making it Mobile
 * would have meant a second thing that moves — which is exactly the
 * duplication AC5 forbids — and it would have put the risky new
 * composition (`MobileMixin` on a non-Character host) on the shape that
 * needs it least.
 *
 * `BulkableMixin(HaulableMixin(Vessel))`, and every part is doing work:
 *
 * | | |
 * |---|---|
 * | `Vessel` | discrete cargo — crates, tools, bottles — plus the frame's own mass |
 * | `Haulable` | the hitch coupling, and `draftFactor`-attenuated draft load on the team rather than the full cargo weight |
 * | `Bulkable` | continuous matter — grain, ore, water — in slots, because half of freight is not countable |
 *
 * ⭐ Variety is **data, not subclassing**, per the shipped `Handcart`
 * note: a heavy wagon, a light barrow and a dragged sledge differ in
 * `mass` and `draftFactor` and in nothing else. The sledge's high
 * `draftFactor` is the second-variant probe, answered in a row.
 *
 * ⭐ **Whether passengers can see out is also data**: an open rig is an
 * open container, and `MixinApi.isOpenContainer` is the single rule
 * `canReach`, the MQL `peers` walk and `VisionModality` all ask. No seam
 * is needed here for that (logistics D3).
 */

import { Vessel } from '@saxonberg/server/mud/lib/stuff/Vessel';
import { HaulableMixin } from '@saxonberg/server/mud/lib/slot/Haulable';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import {
  CompetenceBand,
  COMPETENCE_BANDS,
} from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

const HaulageRigBase = BulkableMixin(HaulableMixin(Vessel));

export default class HaulageRig extends HaulageRigBase {
  static fieldMeta: FieldMeta = {
    requiredDiscipline: { persistent: true, authorable: true },
    requiredBand: { persistent: true, authorable: true },
  };

  /**
   * ⭐⭐ **What it takes to handle this rig** — a discipline key and a
   * band, both authored, both empty by default.
   *
   * This is the CAPABILITY half of a trade discipline, and it is a
   * *different act* rather than the same act done better: a novice
   * handles a barrow, a competent teamster handles a wagon and a team.
   * The wagon is not faster in a competent teamster's hands — it is
   * **available at all**. The known-of → can-make ladder, never the
   * odometer failure.
   *
   * ⚠⚠ **The transport system knows about no disciplines**, and it must
   * not: a road exists with nobody employed by it, and *which* trade
   * answers for handling a rig is that trade's business. So the rig is
   * handed a KEY it never interprets — exactly as `Drivable` is handed
   * a `vehicularMode` path — and the haulage trade's row is what says
   * `teamstering`. A content word in the code would be the mistake; the
   * data carries it.
   *
   * ⭐ **Band 0 must be able to earn.** The barrow, the handcart and the
   * sledge leave both empty and ask nothing of anybody. If handling
   * gated entry it would stop being the labor market that takes a
   * brand-new player, which is the whole point of D16.
   *
   * ⚠ Team SIZE is the design's axis and the RIG is its proxy today: the
   * shipped haulage substrate couples one hauler to one cart, so *how
   * many horses* is not a quantity the world has. A wagon IS the
   * four-horse job.
   */
  public requiredDiscipline = '';
  public requiredBand = '';

  public getRequiredDiscipline(): string {
    return this.requiredDiscipline;
  }
  public setRequiredDiscipline(value: string): void {
    this.requiredDiscipline = value;
  }

  public getRequiredBand(): string {
    return this.requiredBand;
  }
  public setRequiredBand(value: string): void {
    this.requiredBand = value;
  }

  /**
   * The cart's own veto: *may this hauler, coupled by this actor, take
   * me?*
   *
   * ⚠ The **ACTOR's** competence decides, not the hauler's. A horse has
   * no transcript, and the person putting it in the shafts is the one
   * who does or does not know how.
   *
   * ⚠ The Competence SCALAR never crosses the Api boundary: this is a
   * band × rank comparison and nothing else, and no number is shown or
   * stored anywhere.
   */
  public async canHitch(_hauler: Stuff, actor: Stuff): Promise<VetoResult> {
    const key = this.requiredDiscipline;
    const demanded = this.requiredBand;
    if (key === '' || demanded === '' || !isBandName(demanded)) {
      return { ok: true };
    }
    const held = MixinApi.isAdvancing(actor)
      ? await actor.competenceBandFor(key)
      : CompetenceBand.FLOOR;
    if (CompetenceBand.rank(held) >= CompetenceBand.rank(demanded)) {
      return { ok: true };
    }
    return {
      ok: false,
      reason:
        `You get the shafts up and put them straight back down. ` +
        `${this.getPresentation()} is more rig than you can hold — ` +
        `somebody who has done it would take it; you have not.`,
    };
  }

  /**
   * ⭐ **Content affords content.** `journey` lights up because a rig is
   * here, never because a core mixin says so — which is what lets a
   * second realm ship a second kind of cart with zero pack code.
   */
  static commandContributions: CommandContributions = {
    // `peers` and `environment`: the rig grants `journey` to whoever is
    // standing beside it, and to anyone riding in it.
    peers: ['system/transport/cmd/movement/journey.yaml'],
    environment: ['system/transport/cmd/movement/journey.yaml'],
  };
}

/** Is this authored string one of the shipped band names? */
function isBandName(value: string): value is CompetenceBandName {
  return (COMPETENCE_BANDS as readonly string[]).includes(value);
}
