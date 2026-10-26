/**
 * FerryCable — ⭐ **a rope across the river that a ferry rides on** (river
 * D31): the not-crew-powered crossing. Made fast on both banks, with the
 * ferry slung to it on a traveller, she is set at an angle to the current
 * and the current itself pushes her across — the reaction ferry. Nobody
 * poles; nobody is carried downstream.
 *
 * The crossing that has one is a landing's `FerryExit` naming it
 * (`tethered:`); the cable decides only the angle she is held at.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class FerryCable extends Good {
  static fieldMeta: FieldMeta = {
    angleDeg: { persistent: true, authorable: true },
  };

  /** The angle her hull is held at to the current, degrees. */
  protected angleDeg = 30;

  public getAngleDeg(): number {
    return this.angleDeg;
  }

  public setAngleDeg(v: number): void {
    this.angleDeg = Math.max(5, Math.min(60, Number(v) || 30));
  }
}
