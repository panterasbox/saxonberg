/**
 * StaffGauge — **a painted board standing in a river** (water-supply D18): a
 * reach's stage, in metres, for anyone who can read the marks. The rider
 * reads it at the head of the ditch every morning; the rights are written
 * against it.
 *
 * It holds no state: the water against the board is the reach's, read on
 * the day (`analyze stage`). A plain `Thing` — it is set in the riverbed,
 * nobody's chattel, and fixed where it stands.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class StaffGauge extends Thing {
  static fieldMeta: FieldMeta = {
    reachRef: { persistent: true, authorable: true },
  };

  /** The reach it stands in — a citation like `delight:flats`. */
  protected reachRef = '';

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  public getReachRef(): string {
    return this.reachRef;
  }
  public setReachRef(value: string): void {
    this.reachRef = typeof value === 'string' ? value.trim() : '';
  }
}
