/**
 * RiverHazard — ⭐ **the river's own killers, at a place on it** (river
 * D12): a strainer, the hydraulic below a weir, an undercut bank.
 *
 * A hazard has a SIDE (a strainer lies on the outside of a bend; pass it
 * in mid-channel and you are clear) and an APPROACH — how you meet it
 * decides what it does:
 *
 * - **strainer** — head-first and swimming hard you go over the trunk;
 *   feet-first or passive you go under and are pinned among the branches.
 * - **hydraulic** — whatever way you come it holds you, recirculating; the
 *   way out is sideways, or a line from the bank.
 * - **undercut** — passive, the water draws you in under the bank;
 *   swimming, you stay out.
 *
 * Met through the kernel's `proximity` trigger: the river's drift decides
 * when a body is near it (D12), this decides what happens. A river hazard
 * is never spent — the strainer is still there for the next one. It is a
 * good standing in the stop at its place, so `look`, `search` and the
 * rest find it as anywhere.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { HazardMixin } from '@saxonberg/server/mud/lib/hazard/Hazard';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** How a body meets what is ahead of it in the water. */
export type RiverApproach = 'head-first' | 'feet-first' | 'passive';

export default class RiverHazard extends HazardMixin(Good) {
  static fieldMeta: FieldMeta = {
    hazardKind: { persistent: true, authorable: true },
    side: { persistent: true, authorable: true },
    holdFactor: { persistent: true, authorable: true },
    hazardId: { persistent: true },
  };

  /** Which killer this is. */
  public hazardKind: 'strainer' | 'hydraulic' | 'undercut' = 'strainer';
  /** The bank it lies against, as you face downstream. */
  public side: 'left' | 'right' = 'left';
  /** How many times a snare's hold it holds a body for. */
  public holdFactor = 4;
  /** The line's id for it (`kestrel:strainer:20345:left`), stamped at placing. */
  public hazardId = '';

  public getHazardKind(): RiverHazard['hazardKind'] {
    return this.hazardKind;
  }

  public getHazardId(): string {
    return this.hazardId;
  }

  public setHazardId(value: string): void {
    this.hazardId = value;
  }

  /** ⭐ Does meeting it this way catch you (D12)? */
  public catches(approach: RiverApproach): boolean {
    if (!this.isArmed()) return false;
    switch (this.hazardKind) {
      case 'strainer':
        return approach !== 'head-first';
      case 'hydraulic':
        return true;
      case 'undercut':
        return approach === 'passive';
    }
  }

  /**
   * ⭐ A body has come up on it. Caught, it is held — breath and cold
   * running — until the hold ends on its own (then `onFree`: the river
   * takes it on) or somebody pulls it out. Not caught, it is told what it
   * got past. The hazard is never spent.
   */
  public meet(mover: Stuff, approach: RiverApproach, onFree: () => void): void {
    if (!this.catches(approach)) {
      this.tell(mover, PASSED[this.hazardKind]);
      return;
    }
    this.tell(mover, CAUGHT[this.hazardKind]);
    this.applyPin(mover, this.holdFactor, onFree);
  }

  /** The kernel's proximity trigger, answered by {@link meet} with nothing after. */
  public override resolveProximity(mover: Stuff, context: { approach: RiverApproach }): void {
    this.meet(mover, context.approach, () => undefined);
  }

  private tell(mover: Stuff, line: string): void {
    try {
      MessageApi.scene(mover).topic('act.deed').toSelf(Mml.compose`${line}`).send();
    } catch {
      /* decoration */
    }
  }
}

const PASSED: Record<RiverHazard['hazardKind'], string> = {
  strainer: 'A fallen tree lies out across the water; you drive at it head-first, get an arm over the trunk and go over it.',
  hydraulic: 'The water boils back on itself below you and you are through it.',
  undercut: 'The current sucks at the hollow under the bank; you keep swimming and it lets you go by.',
};

const CAUGHT: Record<RiverHazard['hazardKind'], string> = {
  strainer: 'A fallen tree lies out across the water and the river puts you into it: under the trunk, among the branches, the whole weight of the water holding you there.',
  hydraulic: 'Below the drop the water turns back on itself and takes you round — down, along, up into the boil and down again. It does not let go.',
  undercut: 'The water draws you in under the bank, into the dark among the roots, and holds you against them.',
};
