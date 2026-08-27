/**
 * GlassAlley — the harm-driver **demonstrator**: a grimy service alley
 * behind Dave's Bar with broken bottles underfoot. Walking in bare-footed
 * cuts you (a laceration through `ConditionApi.inflict` to a foot part); shod,
 * you're fine. It proves the flagship loop live in shipped, reachable
 * content: step on glass → bleed + limp → assess → treat-or-die.
 *
 * A **one-off demonstrator room class**, deliberately NOT a reusable
 * `HazardMixin` (a capability mixin buys nothing here — no multi-host
 * reuse, no consumer narrows on it, no composition; the reusable
 * abstraction is `inflict` itself). Config (mechanism / energy / candidate
 * foot sites) is **class constants**, not authored data — it's one room.
 * The trigger is **movement/presence** (`onEntered`), which is what makes
 * coverage legible: your feet meet the floor. It calls `inflict` (never
 * `afflict` directly). A hazard/trap taxonomy is a separate future build
 * over the same seam.
 *
 * See docs/subsystems/harm.md.
 */

import Location from '../../lib/stuff/Location';
import { VisibleMixin } from '../../lib/description/Visible';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ExitableMixin } from '../../lib/boundary/Exitable';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { PopulatesMixin } from '../../lib/stuff/Populates';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { MixinApi } from '../../api/mixin';
import { ConditionApi } from '../../api/condition';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

const GlassAlleyBase = SingletonMixin(
  PostRegistrationMixin(
    PopulatesMixin(
      ExitableMixin(DetailedMixin(VisibleMixin(Location)))
    )
  )
);

export default class GlassAlley extends GlassAlleyBase {
  static fieldMeta: FieldMeta = {};

  /**
   * The insult a foot takes from the broken glass — an `edge`. A bare foot
   * is opened (a bleeding laceration); a stoutly-shod foot's covering stack
   * attenuates it below the no-wound threshold (a plated / iron-shod boot
   * deflects it, a bare or thin-shod foot does not). The barefoot-vs-booted
   * distinction now falls out of the materials-response covering-stack
   * resolution automatically (a boot = a `Constructed` `Wearable` covering
   * the foot, its material + construction attenuating the edge) — no
   * explicit coverage gate.
   */
  private static readonly HAZARD_ENERGY = 2;
  private static readonly HAZARD_MECHANISM = 'edge' as const;
  /** Candidate foot part keys (biped); a non-biped matches none → no cut. */
  private static readonly FOOT_SITES = [
    'body.leg.left.foot',
    'body.leg.right.foot',
  ];

  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }

  /**
   * The hazard: fired on the destination when a body walks in (the
   * `Mobile.traverse` → `callTraverseHook(destination, 'onEntered', …)`
   * seam — NOT a teleport arrival, which uses `autoSenseOnArrival`; the
   * proof body is walked in). Resolve a foot site from the mover's own
   * anatomy (a non-biped matches none → graceful no cut) and cut it through
   * `ConditionApi.inflict` with an `edge` insult. Coverage is no longer a
   * gate: a shod foot's covering stack attenuates the low-energy edge below
   * the no-wound threshold (a boot deflects it), a bare foot lacerates — the
   * degree resolution *is* the coverage read.
   */
  public onEntered(mover: Stuff, _exit: unknown): void {
    if (!MixinApi.isVitals(mover)) return;
    const site = GlassAlley.FOOT_SITES.find((s) => mover.getPart(s) != null);
    if (!site) return; // no matching foot part — a non-biped takes no cut
    ConditionApi.inflict(mover, {
      mechanism: GlassAlley.HAZARD_MECHANISM,
      site,
      energy: GlassAlley.HAZARD_ENERGY,
    });
  }
}
