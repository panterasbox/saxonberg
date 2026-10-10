/**
 * PumpMechanism — **how a displacement machine moves its fluid**, as a row.
 *
 * ⭐⭐ **The law rides the mechanism, never the machine.** A pump row says
 * which mechanism it is (`mechanism: /platform/idea/PumpMechanism/suction`)
 * and never whether it has a ceiling: a mechanism that `pulls` relies on
 * the atmosphere to push the fluid up the pipe, so it can lift no higher
 * than the pressure where it stands will carry — and one that pushes has
 * no such wall. The ceiling itself is arithmetic over the place
 * (`BiomeApi.suctionHeadFor`), so no row carries a number for it either.
 *
 * ⭐ **Rows, not a union** — the `Placement` precedent `lint:closed-
 * vocabularies` cites. A third mechanism (`centrifugal`, `sucker-rod`,
 * `diaphragm`) is a row with `pulls:` set honestly and no code. Resolved
 * by path with `StuffApi.singleton` on first use, so there is no catalogue
 * and nothing to warm at boot.
 *
 * See [docs/subsystems/pump.md].
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import type { FieldMeta } from '../../lib/mixin';

const PumpMechanismBase = SingletonMixin(Idea);

export default class PumpMechanism extends PumpMechanismBase {
  /** The subtree every mechanism row lives under, at any root. */
  static readonly PATH_INFIX = '/idea/PumpMechanism/';

  /** The mechanism's own word (`suction`, `force`). */
  public name: string = '';

  /**
   * ⭐ Whether the fluid is PULLED up the pipe — drawn by lowering the
   * pressure above it and letting the atmosphere do the lifting. The one
   * fact the ceiling follows from.
   */
  public pulls: boolean = false;

  /** How it reads to someone looking at it, in words. */
  public description: string = '';

  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    // ⭐ `spoiler: 1` — the one fact the suction law follows from. That a
    // mechanism HAS this property is public; whether THIS one pulls is
    // collapsed by default on a wiki panel, so the law stays something a
    // player can find out rather than read (AC 2; the maxHeatK precedent).
    pulls: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    description: { persistent: true, authorable: true },
  };

  public getName(): string {
    return this.name;
  }

  /** Does this mechanism pull its fluid (and so meet the atmosphere's wall)? */
  public isPulling(): boolean {
    return this.pulls === true;
  }

  public getDescription(): string {
    return this.description;
  }
}
