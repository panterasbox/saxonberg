/**
 * TrapKit — the carried, deployable trap (the player-trapper's acquisition,
 * kept deliberately **thin**: no recipe/component economy in v1). A plain
 * `Thing` you obtain ready-made and `arm` into a room or onto an exit; the
 * `arm` controller clones the kit's `trapTemplate` (one of the `/stuff/thing/traps/`
 * generics), sets the deployed trap's concealment from the placer's own
 * `stealth` competence (the shared spine with self-hiding), and stamps the
 * placer on it (`HazardMixin.placedBy`) so a spring is attributable.
 *
 * A kit is consumed on a successful deploy (one trap per kit — the one-shot
 * v1 stance; no rearm, no re-pocketing beyond picking your own un-sprung
 * placed trap back up). The `trapTemplate` is authored on the kit's seed.
 */

import Good from '../../lib/stuff/Good';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { ActOutcome, ActRefusal } from '../../lib/craft/ActPlan';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { PerceptionApi } from '../../api/perception';
import { AccessApi } from '../../api/access';
import { GovernmentApi } from '../../api/government';
import { ParcelApi } from '../../api/parcel';
import { StuffApi } from '../../api/stuff';
import { CompetenceBand } from '../../lib/advancement/CompetenceBand';

/** The Discipline that grades a placed trap's concealment (as for `hide`). */
const STEALTH_DISCIPLINE = 'stealth';

/** ⭐ Every reason a kit will not arm — `ArmController` words each. */
export type ArmRefusal =
  | ActRefusal<'no-room'>
  | ActRefusal<'not-your-property'>
  | ActRefusal<'bad-kit-template'>;

/** What the armed words need: the trap now set. */
export interface ArmFacts {
  trap: Stuff;
}

export default class TrapKit extends Good {
  static fieldMeta: FieldMeta = {
    trapTemplate: { persistent: true, authorable: true },
  };

  /**
   * The template path of the `/stuff/thing/traps/` generic this kit deploys (cloned
   * by `arm`). Authored on the kit's seed.
   */
  public trapTemplate = '/stuff/thing/traps/step-dart';

  /** The trap generic this kit deploys (a `/stuff/thing/traps/` template path). */
  public getTrapTemplate(): string {
    return this.trapTemplate;
  }

  public setTrapTemplate(path: string): void {
    this.trapTemplate = path;
  }

  /**
   * ⭐ `arm` (controller-liquidity W8 — the gate moved here off the
   * controller, with the actor): deploy this kit into the place `actor`
   * stands in. **The property gate** — free on ground you control or on
   * government ground nobody privately holds; refused on another owner's
   * property and on ungoverned ground. Then the trap is cloned, concealed
   * by the placer's own `stealth` band (the shared spine with self-hiding;
   * a failed hide still tucks it to at least `subtle`), stamped with the
   * placer (so a spring is attributable and derives `crime` on a
   * non-consenting sentient), placed, and the kit is spent.
   */
  public async armBy(actor: Stuff): Promise<ArmRefusal | ActOutcome<ArmFacts>> {
    const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    if (!room || !MixinApi.isContainer(room)) return { ok: false, reason: 'no-room' };
    if (!(await this.mayPlaceIn(actor, room))) return { ok: false, reason: 'not-your-property' };

    // Snapshot the band at arming time.
    await PerceptionApi.preloadForSenseGate(actor);
    const band = MixinApi.isAdvancing(actor)
      ? await actor.competenceBandFor(STEALTH_DISCIPLINE).catch(() => CompetenceBand.FLOOR)
      : CompetenceBand.FLOOR;
    let level = PerceptionApi.hideLevelFor(actor, band);
    if (level === 'obvious') level = 'subtle';

    const trap = await StuffApi.clone<Stuff>(this.getTrapTemplate());
    if (!MixinApi.isHazard(trap) || !MixinApi.isConcealable(trap) || !MixinApi.isContainable(trap)) {
      StuffApi.destruct(trap);
      return { ok: false, reason: 'bad-kit-template' };
    }
    trap.setConcealment(level);
    trap.setPlacedBy(actor.getIdentityPath() ?? '');
    ContainmentApi.move(trap, room as Stuff & Container);
    StuffApi.destruct(this as unknown as Stuff);
    return { ok: true, facts: { trap } };
  }

  /**
   * The parcel property gate: ground `actor` controls (own / self-home / a
   * group they're in / an organization they staff — the `AccessApi.can`
   * write test), OR GOVERNMENT ground with no private title (allowed, but
   * a spring is crime-marked). Refused on another principal's property,
   * and on ground nobody governs.
   */
  private async mayPlaceIn(actor: Stuff, room: Stuff): Promise<boolean> {
    if (await AccessApi.can(actor, 'write', room)) return true;
    const owner = await ParcelApi.ownerOf(room.getTemplatePath() ?? '');
    if (owner !== null) return false;
    const address = MixinApi.isAddressable(room) ? room.getAddress() : null;
    if (address === null) return false;
    // The government is found by the address chain — its index and the
    // catalogue load on reach (load-on-use W5).
    await StuffApi.ready(GovernmentApi);
    return GovernmentApi.governmentAt(address) !== null;
  }
}
