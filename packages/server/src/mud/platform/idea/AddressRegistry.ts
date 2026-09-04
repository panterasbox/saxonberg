/**
 * AddressRegistry — singleton Idea holding the addressing coverage
 * index. Lives at `/platform/idea/AddressRegistry`, sibling to `AccessRegistry`
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
 * Every public method is gated `FromTemplate('/platform/idea/api/address')` — the
 * `AddressLogic` singleton is the only legitimate caller. The thin
 * `AddressApi` facade forwards through `AddressLogic`; external code
 * that grabs this Stuff via `StuffApi.findByTemplatePath` gets a
 * reference but `SecurityError` on any method call.
 *
 * **Eager roster clone.** Leaf Ideas are cloned lazily, so a Locality's
 * self-registration hook only fires once something clones it.
 * `postRegister` therefore eagerly clones every Locality template under
 * the Locality rosters (`TemplatePathRosters.locality`) to populate the index even for never-accessed
 * Localities — a v1 simplification (trivial for the demonstrative
 * roster; a future delivery build with hundreds of Localities may want
 * an incremental scheme). `PathTrie.insert` is idempotent, so the
 * eager insert and a Locality's own self-registration converge.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { SecurityApi } from '../../api/security';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { PathTrie } from '../../lib/collections/PathTrie';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { TemplatePathRosters } from '../../lib/paths';
import type Locality from './Locality';

const AddressRegistryBase = PostRegistrationMixin(Idea);

/** Only the AddressLogic singleton at `/platform/idea/api/address` may call in. */
const AddressLogicCaller = SecurityPolicies.FromTemplate('/platform/idea/api/address');

/** The addressing prefix; its Locality leaves live beneath it. */
const ADDRESS_ROSTER = TemplatePathRosters.locality;
/**
 * The Locality class MODULE path — the filter for the roster walk.
 *
 * Stated outright rather than derived from `ADDRESS_PREFIX`. The two
 * coincided while the class and its template family shared a directory
 * (`/lib/address/Locality` was both), so `${prefix}Locality` read as
 * clever rather than as a bug. After the lib/obj taxonomy move the
 * class is flat at `/platform/idea/Locality` while the family root is
 * the roster prefix, and the derivation silently produced
 * `…/Locality/Locality` — a class nothing has, so the roster walk
 * matched nothing and every address resolved to its fallback.
 */
const LOCALITY_CLASS = '/platform/idea/Locality';

export default class AddressRegistry extends AddressRegistryBase {
  /**
   * Coverage index: claimed-address-prefix → Locality. A PathTrie
   * because addresses are path-shaped and longest-prefix is exactly
   * the nearest-ancestor query the resolve-walk needs.
   */
  private coverage = new PathTrie<Locality>();

  /**
   * ⭐ Name → Locality, lowercased. The coverage trie answers *"who
   * covers this address"*; this answers *"which place is called
   * Rejection"*, which is the question a PLAYER asks — and the only one
   * that lets a verb take a place by the name it is known by rather
   * than by a path nobody says out loud.
   *
   * ⚠⚠ **Names collide and the tie is broken deliberately.** Two shipped
   * Localities are called *Terminus* — the municipality (`terminus`) and
   * the city proper (`terminus/city`) — so a plain `Map` would let
   * whichever indexed last win, silently and differently on every boot.
   * The BROADER place wins (shortest claimed address), because somebody
   * naming a place they are not standing in means the big one: a bill
   * consigned "to Terminus" means the town, not one district of it.
   */
  private byName = new Map<string, Locality>();

  /** Index `locality` under its name, broadest-claim-wins (see above). */
  private indexName(locality: Locality): void {
    const name = locality.getName().trim().toLowerCase();
    if (name.length === 0) return;
    const held = this.byName.get(name);
    if (held && held !== locality) {
      const heldAddr = held.getAddress();
      const mine = locality.getAddress();
      // Shorter claimed address = the broader place = the winner. A tie
      // keeps the incumbent, so the order of a rebuild cannot matter.
      if (heldAddr.length > 0 && heldAddr.length <= mine.length) return;
    }
    this.byName.set(name, locality);
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.rebuildIndex();
  }

  /**
   * Insert a Locality's claimed prefix into the index. Called when a
   * Locality clones (self-registration) and during a rebuild.
   */
  @CallSecurity(AddressLogicCaller)
  public registerLocality(locality: Locality): void {
    // Sandbox needs-a-guard (docs/subsystems/sandbox.md): field-visible
    // shared state; denied under circle scope with a receipt.
    SecurityApi.assertFieldMutation(this, 'registerLocality');
    const addr = locality.getAddress();
    if (addr.length > 0) this.coverage.insert(addr, locality);
    this.indexName(locality);
  }

  /** Remove a Locality from the index (onDestruct / HMR re-clone). */
  @CallSecurity(AddressLogicCaller)
  public deregisterLocality(locality: Locality): void {
    const addr = locality.getAddress();
    if (addr.length > 0) this.coverage.remove(addr, locality);
    const name = locality.getName().trim().toLowerCase();
    if (this.byName.get(name) === locality) this.byName.delete(name);
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

  /** The Locality known by `name` (case-insensitive), or `null`. */
  @CallSecurity(AddressLogicCaller)
  public findByName(name: string): Locality | null {
    return this.byName.get(name.trim().toLowerCase()) ?? null;
  }

  /**
   * Eagerly clone every Locality template under the two roster prefixes and
   * index its claimed prefix. Ungated private — `postRegister` and the
   * gated `rebuildCoverageIndex` both route here.
   */
  private async rebuildIndex(): Promise<void> {
    this.coverage.clear();
    this.byName.clear();
    const templates = (await Promise.all(ADDRESS_ROSTER.map((p) => Template.findDescendants(p)))).flat();
    for (const t of templates) {
      if (t.class !== LOCALITY_CLASS) continue;
      const loc = await StuffApi.singleton<Locality>(t.path);
      const addr = loc.getAddress();
      if (addr.length > 0) this.coverage.insert(addr, loc);
      this.indexName(loc);
    }
  }
}
