/**
 * FloodedCell — the electricity **demonstrator**: a flooded utility cell with
 * a downed live wire lying in the water. Wade in barefoot and the current
 * flows from the wire, through the salt-water pool + the grounded `Floor`,
 * through you — a shock. Stay on the dry raised step, or wear rubber boots,
 * and the ground path is broken: you're untouched. Two allies wading in both
 * take it — the current is faction-blind. It teaches the WHOLE model with no
 * magic: Ohm's law, conduction-spread, grounding, insulation, the armor
 * inversion (metal boots wouldn't save you), wet-skin.
 *
 * A **one-off demonstrator room class** (the {@link GlassAlley} precedent),
 * deliberately NOT a reusable `HazardMixin` — the reusable abstraction is
 * `ElectricityApi.conduct` itself. Config is class constants. The trigger is
 * **movement/presence** (`onEntered`): your feet meet the water. It calls
 * `conduct` (never `afflict`/`inflict` directly — the walk decides who is
 * bridged and how much passes through each).
 *
 * The hazard fixtures (a salt-water-pooled `Floor` + a `LiveWire` in the
 * pool) are provisioned idempotently in `postRegister` / on first entry.
 *
 * See docs/subsystems/electricity.md.
 */

import Location from '../../lib/stuff/Location';
import { VisibleMixin } from '../../lib/description/Visible';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ExitableMixin } from '../../lib/boundary/Exitable';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { PopulatesMixin } from '../../lib/stuff/Populates';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { ElectricityApi } from '../../api/electricity';
import { Quantity } from '../../lib/quantity';
import Floor from '../../obj/Floor';
import LiveWire from '../../lib/electricity/LiveWire';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Material from '../../lib/material/Material';
import type { Energized } from '../../lib/electricity/Energized';

const FloodedCellBase = SingletonMixin(
  PostRegistrationMixin(
    PopulatesMixin(ExitableMixin(DetailedMixin(VisibleMixin(Location)))),
  ),
);

export default class FloodedCell extends FloodedCellBase {
  static persistentFields: string[] = [];

  /** Mains-ish potential of the downed cable. */
  private static readonly WIRE_VOLTAGE = 120;
  /** The conductive pool's material (the base-library brine). */
  private static readonly POOL_MATERIAL = '/lib/material/bulk/salt-water';
  /** Litres of standing water. */
  private static readonly POOL_LITRES = 40;

  /** The provisioned live wire (Pattern B live handle; re-resolved by id). */
  private wireId: string | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
    await this.provisionHazard();
  }

  /**
   * Idempotently build the hazard fixtures: a salt-water-pooled `Floor`
   * (ground + the conductive medium) and a `LiveWire` lying in the pool.
   * Public + idempotent so an integration harness can provision without the
   * clone pipeline.
   */
  public async provisionHazard(): Promise<void> {
    if (this.wireId && StuffApi.findById(this.wireId)) return;
    const self = this as unknown as Stuff;

    // The pooled floor (ground node + conductive medium).
    if (!this.hasPooledFloor()) {
      const floor = await StuffApi.create(() => new Floor());
      floor.surfaceBulk = true;
      floor.setBulkMaterial(
        'surface',
        StuffApi.findByTemplatePath<Material>(FloodedCell.POOL_MATERIAL) ??
          null,
      );
      floor.setBulkAmount(
        'surface',
        Quantity.of(FloodedCell.POOL_LITRES, 'L'),
      );
      (self as unknown as { addFixture(f: unknown): boolean }).addFixture(
        floor,
      );
    }

    // The downed live wire, lying in the pool (a direct room content).
    const wire = await StuffApi.create(() => new LiveWire());
    wire.setVoltage(Quantity.of(FloodedCell.WIRE_VOLTAGE, 'V'));
    wire.switchOn();
    ContainmentApi.move(wire, self as never);
    this.wireId = (wire as unknown as Stuff).stuffId;
  }

  private hasPooledFloor(): boolean {
    const self = this as unknown as Stuff;
    if (!MixinApi.isAdornable(self)) return false;
    for (const fx of self.getFixtures()) {
      if (MixinApi.isBulkable(fx) && fx.hasSurfaceBulk()) return true;
    }
    return false;
  }

  private resolveWire(): (Stuff & Energized) | null {
    if (!this.wireId) return null;
    const wire = StuffApi.findById(this.wireId);
    if (!wire || !MixinApi.isEnergized(wire)) return null;
    return wire as Stuff & Energized;
  }

  /**
   * The hazard: fired on the destination when a body walks in (the
   * `Mobile.traverse` → `onEntered` seam). Conduct from the live wire — the
   * walk decides who in the cell is bridged to ground through the pool and
   * inflicts each. Faction-blind (allies included), grounding/insulation
   * emergent. A no-op if the wire is de-energized.
   */
  public onEntered(_mover: Stuff, _exit: unknown): void {
    const wire = this.resolveWire();
    if (!wire) return;
    ElectricityApi.conduct(wire);
  }
}
