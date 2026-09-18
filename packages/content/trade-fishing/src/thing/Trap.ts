/**
 * Trap — **a pot and a net are one class and two rows** (fishing D13).
 * They differ by numbers only: how fast each draws, which roles it
 * takes, and how much it holds. There is no `trapKind` branch anywhere.
 *
 * ## Lay, then lift — reconcile at the lift
 *
 * `lay` moves the trap from your hand into the water (the room), stamps
 * when, where and by whom, fixes it in place and vetoes its eviction: a
 * set trap survives a bounce. `lift` integrates the elapsed game-hours
 * against the reach's record — `Σ min(level, drawPerHour × hours ×
 * level/capacity)` over the roles it takes, capped by what it holds —
 * and hands over that many fish, the fraction decided by one seeded
 * unit. No skill, no engagement, no tick: a trap is a thing you leave.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { HabitatRole } from '@saxonberg/server/mud/platform/idea/species/Species';
import { HABITAT_ROLES } from '@saxonberg/server/mud/platform/idea/species/Species';

export default class Trap extends ToolItem {
  static commandContributions: CommandContributions = {
    self: [],
    // `peers` = whoever stands where it lies (a set trap in the water);
    // `environment` = whoever holds it. `lay` needs it held; `lift` needs
    // it set; both views are offered either way and the controllers
    // narrow on state.
    peers: ['trade/fishing/cmd/fishing/lay.yaml', 'trade/fishing/cmd/fishing/lift.yaml'],
    environment: ['trade/fishing/cmd/fishing/lay.yaml', 'trade/fishing/cmd/fishing/lift.yaml'],
  };

  static fieldMeta: FieldMeta = {
    drawPerHour: { persistent: true, authorable: true },
    takesRoles: { persistent: true, authorable: true },
    capacity: { persistent: true, authorable: true },
    setAtS: { persistent: true },
    setReach: { persistent: true },
    setBy: { persistent: true },
  };

  /** Fish per game-hour at a full reach. */
  public drawPerHour = 0;
  /** Which of the food web it takes. */
  public takesRoles: HabitatRole[] = [];
  /** How many it holds. */
  public capacity = 1;
  /** Game-seconds it was set, `0` while carried. */
  public setAtS = 0;
  /** The reach it was set on. */
  public setReach = '';
  /** Who set it — an identity path. */
  public setBy = '';

  constructor() {
    super();
    this.capabilities = ['trapping'];
  }

  public getDrawPerHour(): number {
    return this.drawPerHour;
  }
  public setDrawPerHour(value: number): void {
    this.drawPerHour = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public getTakesRoles(): readonly HabitatRole[] {
    return this.takesRoles;
  }
  public setTakesRoles(value: HabitatRole[]): void {
    this.takesRoles = Array.isArray(value)
      ? value.filter((r) => (HABITAT_ROLES as readonly string[]).includes(r))
      : [];
  }
  public getCapacity(): number {
    return this.capacity;
  }
  public setCapacity(value: number): void {
    this.capacity = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
  }
  public getSetAtS(): number {
    return this.setAtS;
  }
  public getSetReach(): string {
    return this.setReach;
  }
  public getSetBy(): string {
    return this.setBy;
  }
  public isSet(): boolean {
    return this.setAtS > 0 && this.setReach !== '';
  }

  /** Stamp the set: when, where, by whom. Fixed in place from here. */
  public markSet(nowS: number, reachRef: string, byKey: string): void {
    this.setAtS = nowS;
    this.setReach = reachRef;
    this.setBy = byKey;
    this.fixedInPlace = true;
  }

  /** Clear the set: back in a hand. */
  public markLifted(): void {
    this.setAtS = 0;
    this.setReach = '';
    this.setBy = '';
    this.fixedInPlace = false;
  }

  /**
   * How many the water would have put in it over `hours`, given each
   * species' level and capacity and the roles this trap takes — the
   * expectation, before the seeded fraction. Pure over its inputs.
   */
  public expectedTake(
    hours: number,
    species: ReadonlyArray<{ role: HabitatRole; level: number; capacity: number }>,
  ): number {
    if (!(hours > 0)) return 0;
    let expected = 0;
    for (const s of species) {
      if (!this.takesRoles.includes(s.role) || s.capacity <= 0 || s.level <= 0) continue;
      expected += Math.min(s.level, this.drawPerHour * hours * (s.level / s.capacity));
    }
    return Math.min(this.capacity, expected);
  }

  /** ⭐ A set trap stays resident — a pot in the water survives the sweep. */
  public override canEvict(context: EvictionContext): VetoResult {
    if (this.isSet()) return { ok: false, reason: 'a set trap stays in the water' };
    return super.canEvict(context);
  }
}
