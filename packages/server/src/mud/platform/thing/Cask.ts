/**
 * Cask — a vat raised from staves, heads and hoops by a cooper (assembly
 * W5). Everything a {@link Vat} is — it ferments, matures, seals and keeps
 * its warmth — and, because it is made of parts, it is also an assembly:
 * a sprung stave or a slack hoop and it weeps, and left standing empty it
 * dries out and its hoops ride loose.
 *
 * ⭐ Its OWN class, not mixins on `Vat`: a carboy, a culture jar and a
 * starter crock are vats too and none of them is made of parts, so the
 * assembly behaviour belongs only on the rows that have a bill
 * (`lint:bills` holds both directions: a class that composes
 * `AssembledMixin` has a bill on every row, and a row with a bill names
 * such a class).
 */

import Vat from './Vat';
import type { ClosureLevel } from '../../lib/bulk/Bulkable';
import type { FieldMeta } from '../../lib/mixin';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin, type JointState } from '../../lib/craft/Assembled';

/** How far an empty cask's hoops ride loose when it dries out. */
const DRY_OUT_SLACK = 0.6;

/** Numeric AppSetting read with the seeded fallback. */
function caskDial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

// Durable beneath Assembled (assembly D8): an assembly's wear has to have
// somewhere to go, and `repair <cask>` gates on `DurableMixin`.
const CaskBase = AssembledMixin(DurableMixin(Vat));

export default class Cask extends CaskBase {
  /** Game-seconds it was first read empty; 0 = wet (or never read empty). */
  public emptySince = 0;

  static fieldMeta: FieldMeta = {
    emptySince: { persistent: true, runtimeState: true },
  };

  /**
   * ⭐ The authored closure is the CEILING; the joints are the floor
   * (assembly D10). A cask holds what its build allows only while every
   * structural member is sound and every joint is tight — a sprung stave
   * or a slack hoop and it weeps, whatever the row says.
   */
  public override getClosure(): ClosureLevel {
    this.reconcileDrying();
    return this.leaks() ? 'open' : super.getClosure();
  }

  /** Re-entry guard: `reconcileDrying` reads the joints it may slacken. */
  private drying = false;

  /**
   * ⚠ The joints are read by `look` (the slack line) before anything asks
   * the closure, so the drying reconciles here too — a cask left empty
   * read "tight-hooped" until something tried to fill it (the drive).
   */
  public override getJoints(): JointState[] {
    if (!this.drying) this.reconcileDrying();
    return super.getJoints();
  }

  /**
   * ⭐⭐ **A cask left standing EMPTY dries out, and its hoops slip**
   * (assembly AC 6, drive 8) — why a cooper keeps a cask wet, and why an
   * empty one weeps the first time it is filled again. The staves shrink
   * as they dry and the hoops ride loose with every stave still sound: a
   * joint failing with every part undamaged, and the repair (drive the
   * hoops back down) consumes nothing.
   *
   * Reconciled on read: the first read that finds it empty starts the
   * clock; a read that finds it full stops it. After `cask.dryOutDays`
   * empty, every joint slackens once.
   */
  public reconcileDrying(): void {
    if (this.drying) return;
    this.drying = true;
    try {
      this.reconcileDryingOnce();
    } finally {
      this.drying = false;
    }
  }

  private reconcileDryingOnce(): void {
    if (this.getJoints().length === 0) return;
    const now = WorldClockApi.getNow().rawValue();
    if (!this.isBulkEmpty('interior')) {
      this.emptySince = 0;
      return;
    }
    if (this.emptySince === 0) {
      this.emptySince = now;
      return;
    }
    const days = caskDial(AppSettingKeys.caskDryOutDays, 7);
    if (now - this.emptySince < days * 86_400) return;
    // Once per drying-out: restart the clock so it does not slacken again
    // until it has been wetted and left empty again.
    this.emptySince = Number.MAX_SAFE_INTEGER;
    for (const j of this.getJoints()) this.slackenJoint(j.key, DRY_OUT_SLACK);
  }
}
