/**
 * LoadDevice — ⭐ a made thing you load and lift.
 *
 * The gym's `load` slot wants a thing that offers the `load` capability;
 * this is the class such a thing is. A barbell, a sandbag, a mason's
 * stone — anything a trade makes that a body can put a chosen weight on
 * and pick up. A kernel class rather than a smithing one because a
 * second load device has no common pack ancestor with the first (the
 * CLAUDE.md test for substrate), and the verb it affords must be ONE
 * verb.
 *
 * `extends ToolItem`: Crafted (a smith's mark and grade), Tool
 * (`capabilities: [load]` is what satisfies the archetype), Durable (a
 * broken bar offers nothing — `hasCapability` is false on a broken
 * Durable). Four authorable fields say what the device can be loaded to
 * and what a set costs: `loadMinKg`/`loadMaxKg` bound the choice,
 * `wattsPerKg` prices it as metabolic power (`lift 60` on a 15 W/kg bar
 * is 900 W), `setDurationS` is how long a set holds the hands.
 *
 * ⭐ The verb lands in the `environment` bucket (and `peers`) — `lift` is
 * afforded by a bar in the ROOM, on the floor, which is what makes a
 * dorm corner a gym. `LiftController` reads the range and the body.
 */

import ToolItem from './ToolItem';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';

const LIFT = ['platform/cmd/device/lift.yaml'];

export default class LoadDevice extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: LIFT,
    peers: LIFT,
  };

  static fieldMeta: FieldMeta = {
    loadMinKg: { persistent: true, authorable: true },
    loadMaxKg: { persistent: true, authorable: true },
    wattsPerKg: { persistent: true, authorable: true },
    setDurationS: { persistent: true, authorable: true },
  };

  /** The least the device can be loaded to (kg) — the bar itself. */
  public loadMinKg = 20;
  /** The most it takes (kg) — the plates there are, the frame's limit. */
  public loadMaxKg = 160;
  /** Metabolic watts per kg of load over a set. */
  public wattsPerKg = 15;
  /** How long one set holds the hands (game-seconds). */
  public setDurationS = 30;

  public getLoadMinKg(): number {
    return this.loadMinKg;
  }
  public setLoadMinKg(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('LoadDevice.loadMinKg must be > 0');
    }
    if (value > this.loadMaxKg) {
      throw new RangeError('LoadDevice.loadMinKg must not exceed loadMaxKg');
    }
    this.loadMinKg = value;
  }

  public getLoadMaxKg(): number {
    return this.loadMaxKg;
  }
  public setLoadMaxKg(value: number): void {
    if (!Number.isFinite(value) || value < this.loadMinKg) {
      throw new RangeError('LoadDevice.loadMaxKg must be ≥ loadMinKg');
    }
    this.loadMaxKg = value;
  }

  public getWattsPerKg(): number {
    return this.wattsPerKg;
  }
  public setWattsPerKg(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('LoadDevice.wattsPerKg must be > 0');
    }
    this.wattsPerKg = value;
  }

  public getSetDurationS(): number {
    return this.setDurationS;
  }
  public setSetDurationS(value: number): void {
    if (!Number.isFinite(value) || value < 1) {
      throw new RangeError('LoadDevice.setDurationS must be ≥ 1');
    }
    this.setDurationS = value;
  }

  /** Is `kg` a load this device can be set to? */
  public acceptsLoad(kg: number): boolean {
    return Number.isFinite(kg) && kg >= this.loadMinKg && kg <= this.loadMaxKg;
  }

  /** The metabolic power of one set at `kg`. */
  public powerAt(kg: number): number {
    return kg * this.wattsPerKg;
  }
}
