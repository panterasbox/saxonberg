// ZoneLogic — the hot-reloadable logic singleton behind ZoneApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../../lib/stuff/Template';
import { Zone } from '../../../lib/zone/Zone';
import type { SpatialZone } from '../../../lib/zone/SpatialZone';
import { SecurityApi } from '../../../api/security';
import { MixinApi } from '../../../api/mixin';
import type { Stuff } from '../../../lib/stuff/Stuff';
import {
  DEFAULT_CLIMATE_SITE,
  type ClimateSite,
} from '../../../lib/weather/WeatherType';

/**
 * Cache of `classPath → prototype instanceof Zone` results. The check
 * is structural and stable across the process lifetime — a class
 * that extends Zone today still extends it tomorrow. Cleared by
 * `_clearClassCaches` for tests.
 */
const folderClassCache = new Map<string, boolean>();
const spatialZoneClassCache = new Map<string, boolean>();

interface ClassWithPrototype {
  prototype: object;
}

/**
 * Containment-walk depth cap — the biome chain's number, for the same
 * reason: a cycle in containment must bound rather than hang.
 */
const CONTAINMENT_DEPTH_CAP = 32;

/** One step outward through containment, or `null` at the top. */
function stepOutward(
  cursor: Stuff,
): Stuff | null {
  if (!MixinApi.isContainable(cursor)) return null;
  const next = cursor.getContainer();
  if (next === null || !MixinApi.isContainer(next)) return null;
  return next;
}

/**
 * ⭐ The live COPY of a zone filed at exactly `path`, if one stands
 * (zone-instancing D2) — a `MintedZone` minted under that identity by its
 * warren. The row's own instance (identity = template) is not a copy and
 * answers `null` here; the row lookup that follows finds it.
 *
 * Read off the live index, never a registry: a copy exists while its warren
 * has it standing, and a sleeping copy's path falls through to its row.
 */
async function liveCopyAt(path: string): Promise<Zone | null> {
  const bucket = StuffApi.findByIdentityPath<Stuff>(path);
  if (bucket.length === 0) return null;
  // Through the class loader (the module instance every row's class comes from).
  const MintedZone = (await StuffApi.loadClassByPath(
    '/platform/idea/location/MintedZone',
  )) as typeof import('../location/MintedZone').default;
  for (const s of bucket) {
    if (s instanceof MintedZone && !s.isDestroyed() && s.isCopy()) return s;
  }
  return null;
}

function hasPrototype(value: unknown): value is ClassWithPrototype {
  return (
    typeof value === 'function' &&
    typeof (value as { prototype?: unknown }).prototype === 'object' &&
    (value as { prototype?: unknown }).prototype !== null
  );
}

// `AnyOf(FromModule, SelfOnly)`: `FromModule` admits the `ZoneApi`
// facade forwarders; `SelfOnly` admits the intra-singleton self-calls
// (`getEnclosingZone` → `this.isFolderClass`, `resolveZoneForPath` →
// `this.isSpatialZoneClass`).
const ZoneApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/zone#ZoneApi'),
  SecurityPolicies.SelfOnly
);

/**
 * ZoneLogic — the hot-reloadable logic singleton behind {@link ZoneApi}.
 *
 * Lives at `/platform/idea/api/zone` (a stateless `Stuff` singleton, no backing
 * `Template`); `ZoneApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Guts-variant gate (`AnyOf(FromModule, SelfOnly)`): `getEnclosingZone`
 * and `resolveZoneForPath` make intra-singleton self-calls into the
 * structural predicates, so every method carries `AnyOf`. The
 * structural-check caches and the `hasPrototype` helper are
 * module-private (off-class, ungated).
 *
 * Cycle note: `SpatialZone` is *not* statically imported here. It's
 * lazy-loaded inside `isSpatialZoneClass` — eager `SpatialZone extends
 * Zone` evaluation during this module's load would form a
 * Zone → ZoneApi → ZoneLogic → SpatialZone → Zone cycle whose middle
 * step blows up before Zone's class binding is ready. Dynamic-loading
 * SpatialZone inside the predicate keeps the static graph clean.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class ZoneLogic extends ApiLogic {
  /** See {@link ZoneApi.isFolderClass}. */
  @CallSecurity(ZoneApiCallers)
  public async isFolderClass(classPath: string): Promise<boolean> {
    const cached = folderClassCache.get(classPath);
    if (cached !== undefined) return cached;
    let result = false;
    try {
      const cls = await StuffApi.loadClassByPath(classPath);
      result = hasPrototype(cls) && cls.prototype instanceof Zone;
    } catch {
      result = false;
    }
    folderClassCache.set(classPath, result);
    return result;
  }

  /** See {@link ZoneApi.isSpatialZoneClass}. */
  @CallSecurity(ZoneApiCallers)
  public async isSpatialZoneClass(classPath: string): Promise<boolean> {
    const cached = spatialZoneClassCache.get(classPath);
    if (cached !== undefined) return cached;
    const { SpatialZone } = await import('../../../lib/zone/SpatialZone');
    let result = false;
    try {
      const cls = await StuffApi.loadClassByPath(classPath);
      result = hasPrototype(cls) && cls.prototype instanceof SpatialZone;
    } catch {
      result = false;
    }
    spatialZoneClassCache.set(classPath, result);
    return result;
  }

  /** See {@link ZoneApi.getEnclosingZone}. */
  @CallSecurity(ZoneApiCallers)
  public async getEnclosingZone(zone: Zone): Promise<Zone | null> {
    // ⭐ Walk where the zone is FILED, not where its row is (D2). An
    // authored zone's identity is its row, so nothing changes for one; a
    // copy minted at a lot's extent walks the lot's chain, and a copy filed
    // under its row walks the row's.
    const ownPath = zone.getIdentityPath() ?? zone.getTemplatePath();
    if (!ownPath) return null;
    for (const ancestor of Template.ancestorPaths(ownPath)) {
      const copy = await liveCopyAt(ancestor);
      if (copy !== null) return copy;
      const tpl = await Template.findByPath(ancestor);
      if (!tpl) continue;
      if (!(await this.isFolderClass(tpl.class))) continue;
      return await StuffApi.singleton<Zone>(ancestor);
    }
    return null;
  }

  /** See {@link ZoneApi.elevationFor}. */
  @CallSecurity(ZoneApiCallers)
  public async elevationFor(scope: Stuff): Promise<number | null> {
    // Walk OUT to the outermost container first. The zone stamped on an
    // object is resolved from its own TEMPLATE path — a garden bed's
    // stamp names the farming trade's zone, which has no opinion about
    // where the bed is standing. Only the enclosing place's zone knows
    // that, and it is the outermost containment step that finds it (the
    // biome chain's step 5, for the same reason).
    let cursor: Stuff | null = scope;
    let outermost: Stuff = scope;
    let depth = CONTAINMENT_DEPTH_CAP;
    while (cursor !== null && depth-- > 0) {
      outermost = cursor;
      cursor = stepOutward(cursor);
    }
    const zone = outermost.getZone();
    if (zone === null) return null;
    return zone.lookupField<number>('elevation');
  }

  /** See {@link ZoneApi.climateSiteFor}. */
  @CallSecurity(ZoneApiCallers)
  public async climateSiteFor(scope: Stuff): Promise<ClimateSite> {
    // The same outward walk as `elevationFor`, for the same reason: the
    // zone that knows where a thing stands is its outermost container's.
    let cursor: Stuff | null = scope;
    let outermost: Stuff = scope;
    let depth = CONTAINMENT_DEPTH_CAP;
    while (cursor !== null && depth-- > 0) {
      outermost = cursor;
      cursor = stepOutward(cursor);
    }
    const zone = outermost.getZone();
    if (zone === null) return { ...DEFAULT_CLIMATE_SITE };
    // ⭐ Geography D7: a chain that states no latitude takes the chart's —
    // the nearest positioned Locality over where the thing stands — so the
    // sextant, the sun and the climate cannot disagree.
    const stated = await zone.lookupField<number>('latitude');
    if (stated !== null && stated !== undefined) return zone.climateSite();
    // The place's own memoized Locality (its address walk) — asked of the
    // place, so this resolver imports nothing of addressing (a module cycle).
    let charted: number | null = null;
    if (MixinApi.isAtmospheric(outermost)) {
      await outermost.resolveWeatherLocality();
      charted = outermost.weatherLocality()?.positionedLocality()?.getPosition()?.latDeg ?? null;
    }
    return zone.climateSite(charted);
  }

  /** See {@link ZoneApi._clearClassCaches}. */
  @CallSecurity(ZoneApiCallers)
  public _clearClassCaches(): void {
    SecurityApi.assertTestOnly('_clearClassCaches');
    folderClassCache.clear();
    spatialZoneClassCache.clear();
  }

  /** See {@link ZoneApi.resolveEnclosingZoneForPath}. */
  @CallSecurity(ZoneApiCallers)
  public async resolveEnclosingZoneForPath(
    templatePath: string
  ): Promise<Zone | null> {
    const selfCopy = await liveCopyAt(templatePath);
    if (selfCopy !== null) return selfCopy;
    const selfTemplate = await Template.findByPath(templatePath);
    if (selfTemplate && (await this.isFolderClass(selfTemplate.class))) {
      return await StuffApi.singleton<Zone>(templatePath);
    }
    for (const ancestor of Template.ancestorPaths(templatePath)) {
      const copy = await liveCopyAt(ancestor);
      if (copy !== null) return copy;
      const ancestorTpl = await Template.findByPath(ancestor);
      if (!ancestorTpl) continue;
      if (!(await this.isFolderClass(ancestorTpl.class))) continue;
      return await StuffApi.singleton<Zone>(ancestor);
    }
    return null;
  }

  /** See {@link ZoneApi.resolveZoneForPath}. */
  @CallSecurity(ZoneApiCallers)
  public async resolveZoneForPath(
    templatePath: string
  ): Promise<SpatialZone | null> {
    // A zone is not inside itself — a live copy at this exact path, or a
    // spatial zone row, answers null.
    if ((await liveCopyAt(templatePath)) !== null) return null;
    const selfTemplate = await Template.findByPath(templatePath);
    if (selfTemplate && (await this.isSpatialZoneClass(selfTemplate.class))) {
      return null;
    }

    for (const ancestor of Template.ancestorPaths(templatePath)) {
      // ⭐ A live copy filed at this ancestor wins over any row (D2): a
      // room keyed under a standing house is stamped into the house.
      const copy = await liveCopyAt(ancestor);
      if (copy !== null) return copy as SpatialZone;
      const ancestorTpl = await Template.findByPath(ancestor);
      if (!ancestorTpl) continue;
      if (!(await this.isSpatialZoneClass(ancestorTpl.class))) continue;
      return await StuffApi.singleton<SpatialZone>(ancestor);
    }
    return null;
  }
}
