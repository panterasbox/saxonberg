/**
 * AddressApi — thin facade over the `AddressRegistry` singleton.
 *
 * The caller-facing surface for the addressing substrate: a rooted,
 * named address namespace (independent of `templatePath` and zones)
 * and the upward longest-prefix resolve-walk that finds the `Locality`
 * covering a place. Every method delegates through the hot-reloadable
 * {@link AddressLogic} singleton at `/obj/api/address` to the Registry;
 * the Registry's methods are gated `FromTemplate('/obj/api/address')`
 * so only the addressing subsystem can reach them.
 *
 * **The seam weather consumes.** {@link AddressApi.resolveLocalityFor}
 * returns the nearest covering Locality or `null` — and `null` is the
 * normal "global field" result for a consumer (a place outside any
 * Locality has global weather). The full walk is async (the
 * zone-fallthrough step awaits `Zone.lookupField`), but
 * {@link AddressApi.coveringLocalityOf} is a sync longest-prefix
 * fast-path: a consumer resolves the address string once (cached on
 * its own read path) then does covering lookups synchronously.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type Locality from '../lib/address/Locality';
import { AddressLogic } from '../obj/api/AddressLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/obj/api/address';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/AddressLogic', import.meta.url),
);

/** Resolve the HMR-able AddressLogic singleton (sync). */
function logic(): AddressLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'AddressLogic',
      ) as typeof AddressLogic | null) ?? AddressLogic)(),
  );
}

/** Which resolve step supplied the address string. */
export type AddressSource =
  | 'declared'
  | 'inherited-containment'
  | 'zone'
  | 'none';

/** The result of a scope → Locality resolution. */
export interface AddressResolution {
  /** The most-specific covering Locality, or `null` (global / no cover). */
  locality: Locality | null;
  /** The resolved address string that was matched, or `null` when none. */
  address: string | null;
  /** Which step supplied `address`; `'none'` when nothing did. */
  source: AddressSource;
}

/** Provenance bundle for `analyze address`. Superset of the resolution. */
export interface AddressTrace extends AddressResolution {
  /** templatePaths walked containment-outward (innermost → outermost). */
  ancestorChain: string[];
  /** The path of the host (or zone) that supplied the address, if any. */
  sourcePath: string | null;
  /**
   * The covering Localities from most- to least-specific (the winner
   * plus its ancestors). Empty when no Locality covers; the head, when
   * present, equals `locality`.
   */
  coverageChain: { address: string; templatePath: string }[];
}

export class AddressApi {
  /**
   * The load-bearing read. Returns the most-specific Locality covering
   * `scope`'s resolved address, or `null` (global). Never throws; the
   * resolve chain is containment-outward → zone fallthrough →
   * longest-prefix → null. Async because the zone step awaits
   * `Zone.lookupField`.
   */
  public static async resolveLocalityFor(
    scope: Stuff & Container,
  ): Promise<Locality | null> {
    return logic().resolveLocalityFor(scope);
  }

  /** Full resolution bundle (locality + matched address + which step). */
  public static async resolveFor(
    scope: Stuff & Container,
  ): Promise<AddressResolution> {
    return logic().resolveFor(scope);
  }

  /** The `analyze address` provenance variant — full trace. */
  public static async traceResolveFor(
    scope: Stuff & Container,
  ): Promise<AddressTrace> {
    return logic().traceResolveFor(scope);
  }

  /**
   * Sync longest-prefix match for an already-known address string — no
   * containment walk, no zone await. The fast-path a consumer uses
   * after resolving the address once. `null` when uncovered.
   */
  public static coveringLocalityOf(address: string): Locality | null {
    return logic().coveringLocalityOf(address);
  }

  /**
   * The covering Localities for `address` from most- to least-specific
   * (the winner plus its ancestors) — the sync sibling of
   * {@link AddressApi.coveringLocalityOf}, exposing the full chain the
   * trace already computed internally. `[]` when uncovered. First
   * consumer: the civics jurisdiction chain.
   */
  public static coverageChainOf(address: string): Locality[] {
    return logic().coverageChainOf(address);
  }

  /** The Locality claiming exactly `address`, or `null`. Exact-match. */
  public static findByAddress(address: string): Locality | null {
    return logic().findByAddress(address);
  }

  /** Resolve a Locality singleton by its templatePath (HMR-safe). */
  public static findByPath(path: string): Locality | null {
    return logic().findByPath(path);
  }

  /** Index a Locality's claimed prefix (Locality self-registration). */
  public static registerLocality(locality: Locality): void {
    logic().registerLocality(locality);
  }

  /** Remove a Locality from the index (onDestruct / HMR). */
  public static deregisterLocality(locality: Locality): void {
    logic().deregisterLocality(locality);
  }

  /** Drop + rebuild the coverage index from the Locality roster. */
  public static async rebuildCoverageIndex(): Promise<void> {
    return logic().rebuildCoverageIndex();
  }

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    logic()._resetRegistryRefForReload();
  }
}

SecurityApi.decorateApiClass(AddressApi);
