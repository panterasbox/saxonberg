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
 * setter awaits {@link PumpMechanism.ensure}.
 *
 * See [docs/subsystems/pump.md].
 */

import type { FieldMeta } from '../mixin';
import { DocumentCache } from '../document/DocumentCache';
import type { StoredDocument } from '../document/StoredDocument';

export class PumpMechanism {
  /** Every mechanism read, by path. */
  private static readonly cache = new DocumentCache<PumpMechanism>(
    'pump-mechanism',
    (doc) => PumpMechanism.fromDocument(doc),
  );

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

  private constructor(
    private readonly path: string,
    private readonly name: string,
    private readonly pulls: boolean,
    private readonly description: string,
  ) {}

  /** Read and validate a `pump-mechanism` document. @internal */
  public static fromDocument(doc: StoredDocument): PumpMechanism {
    return PumpMechanism.fromData(doc.getData(), doc.getPath());
  }

  /** Validate a mechanism's data at `path` (the installer's validator too). @internal */
  public static fromData(data: Record<string, unknown>, path: string): PumpMechanism {
    if (typeof data.pulls !== 'boolean') {
      throw new Error(`pump mechanism '${path}' must say whether it pulls (pulls: true | false)`);
    }
    const word = path.slice(path.lastIndexOf('/') + 1);
    return new PumpMechanism(
      path,
      typeof data.name === 'string' && data.name ? data.name : word,
      data.pulls,
      typeof data.description === 'string' ? data.description : '',
    );
  }

  /** The mechanism at `path`, read if it is not resident; throws naming a path with none. @internal */
  public static ensure(path: string): Promise<PumpMechanism> {
    return PumpMechanism.cache.ensure(path);
  }

  /** The resident mechanism at `path`; `DocumentNotResidentError` if its pump never loaded it. @internal */
  public static need(path: string): PumpMechanism {
    return PumpMechanism.cache.need(path);
  }

  /** Keep a mechanism (a unit fixture with no store behind it). @internal */
  public static remember(value: PumpMechanism): PumpMechanism {
    return PumpMechanism.cache.remember(value.path, value);
  }

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
