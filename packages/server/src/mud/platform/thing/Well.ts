/**
 * Well — **a shaft sunk to standing water, with a trough at its collar.**
 * The village well at Rejection; the deep one somebody sank on the fringe
 * and gave up on.
 *
 * ⭐⭐ It answers {@link LiftSource}, and adds nothing it did not already
 * know: the water stands `depthM` below the collar, the body below is
 * taken as inexhaustible (the finite aquifer is a named non-goal), and
 * whatever comes up lands in the `interior` slot — the trough — which
 * starts EMPTY. So `fill bucket from well` before anybody has pumped says,
 * honestly, that there is nothing in it.
 *
 * ⭐ A well is a pump SOURCE: a `Container` that holds its pump as content
 * and refuses anything else (*"Only a pump goes in a well."*). A row is
 * born with one (`props: [/stuff/thing/gear/hand-pump]`); a player swaps
 * one with `get` and `put`. The veto narrows CONTENTS, never which classes
 * may be wells.
 *
 * `Thing`, not `Good` — the `WaterFixture` reasoning: it is a hole in the
 * ground with masonry round it, and nobody's chattel. ⚠ No `Thermal`:
 * nothing reads the trough's temperature in this build, and composing a
 * gauge nobody consults is surface with no consumer.
 *
 * ⚠ A bucket carried up on a rope would need no pump and no pressure, at
 * any depth — that is the bucket family's, and a well with a windlass is a
 * later row, not a change here.
 *
 * See [docs/subsystems/pump.md].
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { StagedMixin } from '../../lib/stuff/Staged';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../../lib/quantity';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { VetoResult } from '../../lib/errors';
import type Material from '../../lib/material/Material';
import type { LiftSource, PumpSource } from '../../lib/pump/Pumpable';
import type { CommandContributions } from '../../api/command';

/** What stands at the bottom of a well when the row does not say. */
const WATER_PATH = '/stuff/idea/material/bulk/water';

const WellBase = StagedMixin(ContainerMixin(BulkableMixin(Thing)));

export default class Well extends WellBase implements LiftSource, PumpSource {
  /** Metres from the collar down to the standing water. */
  protected depthM = 0;

  /** The Material standing at the bottom of the shaft. */
  protected standing = WATER_PATH;

  static fieldMeta: FieldMeta = {
    depthM: { persistent: true, authorable: true },
    standing: { persistent: true, authorable: true, ref: 'identity' },
  };

  /** Sideways: anyone at the well can try its handle. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/device/pump.yaml'],
  };

  constructor() {
    super();
    // Masonry round a hole in the ground. Nobody walks off with it.
    this.fixedInPlace = true;
  }

  public getDepthM(): number {
    return this.depthM;
  }
  public setDepthM(value: number): void {
    this.depthM = Math.max(0, Number(value) || 0);
  }

  // ---------- the pump it holds ----------

  /** The pump set in this well, or `null`. */
  public pumpFitted(): Stuff | null {
    for (const c of this.getContents()) {
      if (MixinApi.isPumping(c)) return c;
    }
    return null;
  }

  /** ⭐ Only a pump goes in a well, and only one. */
  public canAddContainable(thing: Stuff & Containable): VetoResult {
    if (!MixinApi.isPumping(thing)) {
      return { ok: false, reason: 'Only a pump goes in a well.' };
    }
    if (this.pumpFitted() !== null) {
      return { ok: false, reason: 'There is a pump in it already.' };
    }
    return { ok: true };
  }

  // ---------- ⭐⭐ LiftSource ----------

  public standingDepthM(): number {
    return this.depthM;
  }

  public async standingMaterial(): Promise<string | null> {
    return this.standing || null;
  }

  /** ⭐ A body, not a tank: the finite aquifer is a named non-goal. */
  public async standingAvailableL(): Promise<number> {
    return Infinity;
  }

  public receivableL(): number {
    const slot = this.getBulk('interior');
    const held = slot.getMaterialPath();
    if (held !== null && held !== this.standing) return 0;
    return slot.remaining();
  }

  /**
   * Raise up to `litres` into the trough. ⭐ It consults no pressure:
   * whether the fluid CAN be pulled this far is the pump's question, asked
   * before this is ever called — a bucket asks it never.
   */
  public async liftInto(litres: number): Promise<number> {
    const room = this.receivableL();
    const moved = Math.min(Math.max(0, litres), room);
    if (!(moved > 0)) return 0;
    const material = StuffApi.findByTemplatePath<Material>(this.standing);
    if (!material) return 0;
    const slot = this.getBulk('interior');
    if (slot.getMaterialPath() === null) slot.setMaterial(material);
    slot.setAmount(Quantity.of(slot.getAmount().rawValue() + moved, 'L'));
    return moved;
  }

  public liftScope(): (Stuff & Container) | null {
    const here = this.getContainer();
    return here && MixinApi.isContainer(here) ? here : null;
  }
}
