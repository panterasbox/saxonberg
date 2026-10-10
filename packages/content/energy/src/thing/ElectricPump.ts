/**
 * ElectricPump — **a pump that runs off a wire and can be switched.** The
 * city intake's pump at Wharfside.
 *
 * `GridPoweredMixin(SwitchableMixin(Pump))`: the kernel's pump (the law,
 * the seal, the five facts) with a mover. ⭐ **A prime mover is a `Powered`
 * implementer** — the kernel pump reads `availablePowerW` and
 * `poweredTrajectory` structurally and never imports the grid, so a steam
 * engine or a horse gin is a second implementer in its own pack and this
 * class is the model for it.
 *
 * It is the energy pack's appliance exactly as `ElectricLight` and
 * `ColdStore` are: the water pack ships no mover and no verb, and keeps
 * shipping none.
 *
 * ⭐ It affords `switch` in BOTH buckets itself — nothing else in the tree
 * affords it but the mana lamp, so a switchable class that does not say so
 * is a switch nobody can reach (the ManaLamp precedent).
 *
 * ⚠⚠ The switch has no history, so turning it reconciles the packing's
 * running wear FIRST: the hours before the flip are integrated at the old
 * position, and the integral never samples the switch.
 */

import Pump from '@saxonberg/server/mud/platform/thing/Pump';
import { SwitchableMixin } from '@saxonberg/server/mud/lib/boundary/Switchable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { GridPoweredMixin } from '../lib/GridPowered';

const ElectricPumpBase = GridPoweredMixin(SwitchableMixin(Pump));

export default class ElectricPump extends ElectricPumpBase {
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/device/switch.yaml'],
    environment: ['platform/cmd/device/switch.yaml'],
  };

  public override setOn(value: boolean): void {
    try {
      this.reconcileRunning(WorldClockApi.getNow().rawValue());
    } catch {
      // No clock (a bare test fixture) — nothing has run to reconcile.
    }
    super.setOn(value);
  }
}
