/**
 * Bait — what goes on the hook. One class, rows for the kinds: a worm
 * suits forage and bait fish, a baitfish suits a predator, and what
 * suits what is the species' `role` read against `baitKind` at the
 * bite. Consumed at the take.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** The kinds a bait can be, and what each suits — see `FishingEngagement`. */
export const BAIT_KINDS = ['worm', 'baitfish', 'crumbs'] as const;
export type BaitKind = (typeof BAIT_KINDS)[number];

const BaitBase = DetailedMixin(Thing);

export default class Bait extends BaitBase {
  static fieldMeta: FieldMeta = {
    baitKind: { persistent: true, authorable: true },
  };

  public baitKind: BaitKind = 'worm';

  public getBaitKind(): BaitKind {
    return this.baitKind;
  }
  public setBaitKind(value: BaitKind): void {
    if (!(BAIT_KINDS as readonly string[]).includes(value)) {
      throw new RangeError(`Bait.setBaitKind: unknown kind '${String(value)}' — one of ${BAIT_KINDS.join(', ')}`);
    }
    this.baitKind = value;
  }
}
