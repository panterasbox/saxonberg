/**
 * PumpMechanism — **how a displacement machine moves its fluid**, as a
 * `pump-mechanism` document.
 *
 * ⭐⭐ **The law rides the mechanism, never the machine.** A pump row says
 * which mechanism it is (`mechanism: /platform/pump-mechanisms/suction`)
 * and never whether it has a ceiling: a mechanism that `pulls` relies on
 * the atmosphere to push the fluid up the pipe, so it can lift no higher
 * than the pressure where it stands will carry — and one that pushes has
 * no such wall. The ceiling itself is arithmetic over the place
 * (`BiomeApi.suctionHeadFor`), so no document carries a number for it.
 *
 * ⭐ A Document, not an Idea (documents path identity, D6): a mechanism is
 * authored metadata — nothing writes one, nothing acts on one, nothing
 * finds one with MQL. A third mechanism (`centrifugal`, `sucker-rod`) is a
 * file under any pack's `content/pump-mechanisms/`, named by its path.
 * It is resident whenever a pump that names it is: the pump's `mechanism`
 * setter awaits its load. The mechanisms are SERVED by
 * `PumpMechanismCatalogue`, reached as `BulkableApi.pumpMechanisms()`.
 *
 * See [docs/subsystems/pump.md].
 */

import type { FieldMeta } from '../mixin';

export class PumpMechanism {
  /**
   * The fields as authored. ⭐ `pulls` is `spoiler: 1` — the one fact the
   * suction law follows from. That a mechanism HAS this property is
   * public; whether THIS one pulls is collapsed by default on a wiki panel,
   * so the law stays something a player can find out rather than read.
   */
  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    pulls: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    description: { persistent: true, authorable: true },
  };

  /** A mechanism as its document says (read through `PumpMechanismCatalogue.parse`). */
  public constructor(
    private readonly path: string,
    private readonly name: string,
    private readonly pulls: boolean,
    private readonly description: string,
  ) {}

  public getPath(): string {
    return this.path;
  }

  public getName(): string {
    return this.name;
  }

  /** Does this mechanism pull its fluid (and so meet the atmosphere's wall)? */
  public isPulling(): boolean {
    return this.pulls;
  }

  public getDescription(): string {
    return this.description;
  }
}
