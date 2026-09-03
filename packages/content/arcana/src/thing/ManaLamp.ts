/**
 * ManaLamp — **a lamp on a wall that runs on mana**, and the whole
 * reason `ManaPoweredMixin` is a category rather than a terminal
 * feature.
 *
 * ⭐⭐ It ships BEFORE the Teleport Authority's terminal composes the
 * same mixin, and that order is the point (AC6). A capability only one
 * class uses is a method wearing a costume; a capability proved on two
 * unrelated things — a domestic light and a piece of public
 * infrastructure — is a category. If the abstraction were secretly a
 * terminal, this class is where that would show.
 *
 * It is also D5's third row made concrete: **a resident is a sufficient
 * battery.** Somebody who can cast pours a little of their own reserve
 * in and the room stays lit; somebody who cannot buys a cell. Neither
 * one is a special case in the lamp — both arrive through
 * `resolveSupply`.
 *
 * `drawMode: impulse` and `armingFloorTau: 0`: a lamp draws when it is
 * switched on and has no floor to fall below. It is the plain half of
 * the axis the terminal is the complicated half of.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { ChargedMixin } from '@saxonberg/server/mud/lib/magic/Charged';
import { SlottedMixin } from '@saxonberg/server/mud/lib/slot/Slotted';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { FixtureMixin } from '@saxonberg/server/mud/lib/stuff/Fixture';
import { SwitchableMixin } from '@saxonberg/server/mud/lib/boundary/Switchable';
import { LightSourceMixin } from '@saxonberg/server/mud/lib/perception/LightSource';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { SUPPLY_STATE_GLOSS } from '@saxonberg/server/mud/lib/supply/SupplyState';
import { BATTERY_SLOT, ManaPoweredMixin } from '../lib/ManaPowered';

const ManaLampBase = LightSourceMixin(
  SwitchableMixin(
    FixtureMixin(
      DetailedMixin(
        ManaPoweredMixin(SlottedMixin(ChargedMixin(ReservedMixin(Thing)))),
      ),
    ),
  ),
);

export default class ManaLamp extends ManaLampBase {
  /**
   * ⚠ `switch` ships in the platform pack's `device` category and is
   * afforded by NOTHING — a shipped verb with no door. Declaring it
   * here is the content-side fix (a verb affordance is a static on a
   * class; a row's `commandContributions:` is dead silently). A general
   * fix belongs on `SwitchableMixin` and is a kernel MR.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/device/switch.yaml'],
    environment: ['platform/cmd/device/switch.yaml'],
  };

  static fieldMeta: FieldMeta = {
    litFlux: { persistent: true, authorable: true },
    drawPerHourTau: { persistent: true, authorable: true },
  };

  /** How bright it is when lit, in lumens. */
  public litFlux: number = 400;

  /** What holding the light up costs, in τ per game-hour. */
  public drawPerHourTau: number = 2;

  constructor() {
    super();
    this.fixedInPlace = true;
    this.setDrawMode('impulse');
    // A lamp has no working to lapse: it is either lit or it is not.
    this.setArmingFloorTau(0);
    this.setStaticSlots([
      {
        name: BATTERY_SLOT,
        // ⚠ `accepts` may only name a value from the KERNEL's `Mixins`
        // registry — a pack cannot invent one — so the bay takes any
        // charged shell and `ManaCell.fitsSlot` narrows from the
        // candidate side. Anything else throws at hydrate, which is the
        // lint.
        accepts: 'ChargedMixin',
        capacity: 1,
        userFacingDetail: 'bay',
      },
    ]);
  }

  /**
   * Switching it on draws an hour's worth up front and lights it; a
   * device with nothing to draw from says so in one of the six words
   * and stays dark.
   */
  public async light(): Promise<boolean> {
    if (!(await this.draw(this.drawPerHourTau))) {
      this.setOn(false);
      this.setEmittedFlux(Quantity.of(0, 'lumen'));
      return false;
    }
    this.setOn(true);
    this.setEmittedFlux(Quantity.of(this.litFlux, 'lumen'));
    return true;
  }

  /** Dark, and giving its charge back to nobody. */
  public douse(): void {
    this.setOn(false);
    this.setEmittedFlux(Quantity.of(0, 'lumen'));
  }

  override getShortDescription(): string {
    return super.getShortDescription() || 'a mana lamp';
  }

  override getLongDescription(): string {
    const flavor =
      this.longDescription && this.longDescription.length > 0
        ? this.longDescription
        : 'A brass sconce with a pale glass bowl, bracketed to the wall.';
    const state = this.supplyState();
    const line = this.isOn()
      ? 'It is lit, and the light is very steady.'
      : state
        ? `It is dark — ${SUPPLY_STATE_GLOSS[state]}.`
        : 'It is dark, and waiting to be switched on.';
    return `${flavor}\n${line}`;
  }

  override getLong(): string {
    return this.getLongDescription();
  }
}
