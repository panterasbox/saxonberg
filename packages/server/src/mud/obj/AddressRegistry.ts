/**
 * AddressRegistry — singleton Idea holding the addressing coverage
 * index. Lives at `/obj/AddressRegistry`, sibling to `AccessRegistry`
 * and the other singleton registries under `obj/`.
 *
 * The durable state is a `PathTrie<Locality>` keyed by each Locality's
 * claimed address prefix. Because the address namespace is independent
 * of `templatePath` by design, Localities cannot be found by walking
 * template paths — the trie is the only way to answer "which Locality
 * covers this address?" by longest-prefix match. The index lives on
 * this `PostRegistrationMixin` Stuff (not the stateless logic
 * singleton) so it survives a reload of `api/address.ts`; a reload of
 * this file re-clones the Registry and `postRegister` rebuilds the
 * index idempotently.
 *
 * Every public method is gated `FromTemplate('/obj/api/address')` — the
 * `AddressLogic` singleton is the only legitimate caller. The thin
 * `AddressApi` facade forwards through `AddressLogic`; external code
 * that grabs this Stuff via `StuffApi.findByTemplatePath` gets a
 * reference but `SecurityError` on any method call.
 *
 * **Eager roster clone.** Leaf Ideas are cloned lazily, so a Locality's
 * self-registration hook only fires once something clones it.
 * `postRegister` therefore eagerly clones every Locality template under
 * `/lib/address/` to populate the index even for never-accessed
 * Localities — a v1 simplification (trivial for the demonstrative
 * roster; a future delivery build with hundreds of Localities may want
 * an incremental scheme). `PathTrie.insert` is idempotent, so the
 * eager insert and a Locality's own self-registration converge.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { PathTrie } from '../lib/collections/PathTrie';
import { StuffApi } from '../api/stuff';
import { Template } from '../lib/stuff/Template';
import type Locality from '../lib/address/Locality';

const AddressRegistryBase = PostRegistrationMixin(Idea);

/** Only the AddressLogic singleton at `/obj/api/address` may call in. */
const AddressLogicCaller = SecurityPolicies.FromTemplate('/obj/api/address');

/** The addressing admin folder; its Locality leaves live beneath it. */
const ADDRESS_FOLDER = '/lib/address';
/** The Locality class template path — the filter for the roster walk. */
const LOCALITY_CLASS = '/lib/address/Locality';

export default class AddressRegistry extends AddressRegistryBase {
  /**
   * Coverage index: claimed-address-prefix → Locality. A PathTrie
   * because addresses are path-shaped and longest-prefix is exactly
   * the nearest-ancestor query the resolve-walk needs.
   */
  private coverage = new PathTrie<Locality>();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.rebuildIndex();
  }

  /**
   * Insert a Locality's claimed prefix into the index. Called when a
   * Locality clones (self-registration) and during a rebuild.
   */
  @CallSecurity(AddressLogicCaller)
  public registerLocality(locality: Locality): void {
    const addr = locality.getAddress();
    if (addr.length > 0) this.coverage.insert(addr, locality);
  }

  /** Remove a Locality from the index (onDestruct / HMR re-clone). */
  @CallSecurity(AddressLogicCaller)
  public deregisterLocality(locality: Locality): void {
    const addr = locality.getAddress();
    if (addr.length > 0) this.coverage.remove(addr, locality);
  }

  /** Drop + rebuild the index from the cloned Locality roster. */
  @CallSecurity(AddressLogicCaller)
  public async rebuildCoverageIndex(): Promise<void> {
    await this.rebuildIndex();
  }

  /**
   * The most-specific Locality whose claimed prefix is an ancestor (or
   * equal) of `address`, or `null` when none covers. Sync — a pure
   * trie walk. One Locality per prefix in v1 (a duplicate claim is an
   * authoring error; the first wins).
   */
  @CallSecurity(AddressLogicCaller)
  public coveringLocalityOf(address: string): Locality | null {
    return this.coverage.longestPrefix(address)[0] ?? null;
  }

  /**
   * The full most-→least-specific chain of covering Localities (the
   * winner plus its ancestors), for `analyze address` provenance.
   * Empty when no Locality covers.
   */
  @CallSecurity(AddressLogicCaller)
  public coverageChainOf(address: string): Locality[] {
    const chain: Locality[] = [];
    let probe: string | null = address;
    while (probe !== null && probe.length > 0) {
      const matched = this.coverage.longestPrefixPath(probe);
      if (matched === null) break;
      const hit = this.coverage.longestPrefix(probe)[0];
      if (hit) chain.push(hit);
      const cut = matched.lastIndexOf('/');
      probe = cut > 0 ? matched.slice(0, cut) : null;
    }
    return chain;
  }

  /** The Locality claiming exactly `address`, or `null`. Exact-match,
   *  not nearest-ancestor. */
  @CallSecurity(AddressLogicCaller)
  public findByExactAddress(address: string): Locality | null {
    return this.coverage.exact(address)[0] ?? null;
  }

  /**
   * Eagerly clone every Locality template under `/lib/address/` and
   * index its claimed prefix. Ungated private — `postRegister` and the
   * gated `rebuildCoverageIndex` both route here.
   */
  private async rebuildIndex(): Promise<void> {
    this.coverage.clear();
    const templates = await Template.findDescendants(ADDRESS_FOLDER);
    for (const t of templates) {
      if (t.class !== LOCALITY_CLASS) continue;
      const loc = await StuffApi.singleton<Locality>(t.path);
      const addr = loc.getAddress();
      if (addr.length > 0) this.coverage.insert(addr, loc);
    }
  }
}
