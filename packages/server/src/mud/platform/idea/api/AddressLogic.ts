// AddressLogic — the hot-reloadable logic singleton behind AddressApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { TemplatePaths } from '../../../lib/paths';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Addressable } from '../../../lib/address/Addressable';
import type Locality from '../Locality';
import type AddressRegistry from '../AddressRegistry';
import type {
  AddressResolution,
  AddressTrace,
  AddressSource,
} from '../../../api/address';

const REGISTRY_PATH = TemplatePaths.addressRegistry;

const AddressApiCallers = SecurityPolicies.FromModule('/api/address#AddressApi',
);

const CONTAINMENT_DEPTH_CAP = 32;

/**
 * Step one container outward, mirroring `BiomeLogic.stepOutward`
 * verbatim so the addressing containment walk stays identical to the
 * biome one. Stops at the first non-Containable / uncontained host.
 */
function stepOutward(cursor: Stuff & Container): (Stuff & Container) | null {
  if (!MixinApi.isContainable(cursor)) return null;
  const next = (cursor as Stuff & Containable).getContainer();
  if (next === null) return null;
  if (!MixinApi.isContainer(next)) return null;
  return next as Stuff & Container;
}

/**
 * The first two steps of the resolve chain — find the address string
 * for `scope`: walk containment-outward to the nearest ancestor that
 * declares an `_address`, else fall through to the outermost
 * Location's spatial zone (`Zone.lookupField('address')`). Returns
 * `{ address: null }` when no address is declared or inherited
 * anywhere. The one `await` in the model is the zone step.
 */
async function resolveAddressString(scope: Stuff & Container): Promise<{
  address: string | null;
  source: AddressSource;
  sourcePath: string | null;
  ancestorChain: string[];
}> {
  const ancestorChain: string[] = [];
  let cursor: (Stuff & Container) | null = scope;
  let outermost: Stuff & Container = scope;
  let isInnermost = true;
  let depth = CONTAINMENT_DEPTH_CAP;

  // Step 1 — containment-outward to the nearest declared address.
  while (cursor !== null && depth-- > 0) {
    outermost = cursor;
    const cursorPath = (cursor as Stuff).getTemplatePath?.() ?? null;
    if (cursorPath !== null) ancestorChain.push(cursorPath);

    if (MixinApi.isAddressable(cursor)) {
      const declared = (cursor as Stuff & Addressable).getAddress();
      if (declared !== null && declared.length > 0) {
        return {
          address: declared,
          source: isInnermost ? 'declared' : 'inherited-containment',
          sourcePath: cursorPath,
          ancestorChain,
        };
      }
    }

    const next = stepOutward(cursor);
    if (next === null) break;
    cursor = next;
    isInnermost = false;
  }

  // Step 2 — spatial-zone fallthrough (the one await).
  const zone = outermost.getZone();
  if (zone !== null) {
    const zoned = await zone.lookupField<string>('address');
    if (zoned !== null && zoned !== undefined) {
      return {
        address: zoned,
        source: 'zone',
        sourcePath: zone.getTemplatePath(),
        ancestorChain,
      };
    }
  }

  return { address: null, source: 'none', sourcePath: null, ancestorChain };
}

/**
 * Resolve the Registry without forcing a clone. Module-level cache
 * mirrors the access pattern — it survives the logic singleton's
 * `dest`/recreate and is cleared by the reload seam. Returns `null` in
 * a test harness without a live Registry; the public methods treat
 * that as "no coverage" (null Locality), never a throw.
 */
let registryRef: AddressRegistry | null = null;
function lookupRegistry(): AddressRegistry | null {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<AddressRegistry>(REGISTRY_PATH);
  if (reg) registryRef = reg;
  return reg ?? null;
}

/**
 * AddressLogic — the hot-reloadable logic singleton behind
 * {@link AddressApi}.
 *
 * Lives at `/platform/idea/api/address`. Holds the resolve-chain orchestration
 * (the containment-outward + zone-fallthrough walk in
 * `resolveAddressString`, then the longest-prefix call into the
 * Registry). The durable coverage index lives on the pinned
 * `/platform/idea/AddressRegistry`, whose methods admit this logic singleton
 * (`FromTemplate('/platform/idea/api/address')`). Each method here is gated
 * `FromModule('/api/address#AddressApi')`; shared logic is in
 * module-private free functions, so there are no intra-singleton
 * self-calls.
 *
 * @internal
 */
@Unshadowable
export class AddressLogic extends ApiLogic {
  /** See {@link AddressApi.resolveLocalityFor}. */
  @CallSecurity(AddressApiCallers)
  public async resolveLocalityFor(
    scope: Stuff & Container,
  ): Promise<Locality | null> {
    const r = await resolveAddressString(scope);
    if (r.address === null) return null;
    return lookupRegistry()?.coveringLocalityOf(r.address) ?? null;
  }

  /** See {@link AddressApi.resolveFor}. */
  @CallSecurity(AddressApiCallers)
  public async resolveFor(scope: Stuff & Container): Promise<AddressResolution> {
    const r = await resolveAddressString(scope);
    if (r.address === null) {
      return { locality: null, address: null, source: 'none' };
    }
    const locality = lookupRegistry()?.coveringLocalityOf(r.address) ?? null;
    return { locality, address: r.address, source: r.source };
  }

  /** See {@link AddressApi.traceResolveFor}. */
  @CallSecurity(AddressApiCallers)
  public async traceResolveFor(
    scope: Stuff & Container,
  ): Promise<AddressTrace> {
    const r = await resolveAddressString(scope);
    if (r.address === null) {
      return {
        locality: null,
        address: null,
        source: 'none',
        ancestorChain: r.ancestorChain,
        sourcePath: null,
        coverageChain: [],
      };
    }
    const chain = lookupRegistry()?.coverageChainOf(r.address) ?? [];
    return {
      locality: chain[0] ?? null,
      address: r.address,
      source: r.source,
      ancestorChain: r.ancestorChain,
      sourcePath: r.sourcePath,
      coverageChain: chain.map((l) => ({
        address: l.getAddress(),
        templatePath: l.getTemplatePath() ?? '',
      })),
    };
  }

  /** See {@link AddressApi.coveringLocalityOf}. Sync fast-path. */
  @CallSecurity(AddressApiCallers)
  public coveringLocalityOf(address: string): Locality | null {
    return lookupRegistry()?.coveringLocalityOf(address) ?? null;
  }

  /** See {@link AddressApi.coverageChainOf}. Sync fast-path. */
  @CallSecurity(AddressApiCallers)
  public coverageChainOf(address: string): Locality[] {
    return lookupRegistry()?.coverageChainOf(address) ?? [];
  }

  /** See {@link AddressApi.findByAddress}. Exact-match. */
  @CallSecurity(AddressApiCallers)
  public findByAddress(address: string): Locality | null {
    return lookupRegistry()?.findByExactAddress(address) ?? null;
  }

  /** See {@link AddressApi.findByPath}. */
  @CallSecurity(AddressApiCallers)
  public findByPath(path: string): Locality | null {
    return StuffApi.findByTemplatePath<Locality>(path) ?? null;
  }

  /** See {@link AddressApi.registerLocality}. */
  @CallSecurity(AddressApiCallers)
  public registerLocality(locality: Locality): void {
    lookupRegistry()?.registerLocality(locality);
  }

  /** See {@link AddressApi.deregisterLocality}. */
  @CallSecurity(AddressApiCallers)
  public deregisterLocality(locality: Locality): void {
    lookupRegistry()?.deregisterLocality(locality);
  }

  /** See {@link AddressApi.rebuildCoverageIndex}. */
  @CallSecurity(AddressApiCallers)
  public async rebuildCoverageIndex(): Promise<void> {
    await lookupRegistry()?.rebuildCoverageIndex();
  }

  /** See {@link AddressApi._resetRegistryRefForReload}. */
  @CallSecurity(AddressApiCallers)
  public _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
