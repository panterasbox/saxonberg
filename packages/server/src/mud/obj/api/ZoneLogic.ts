// ZoneLogic — the hot-reloadable logic singleton behind ZoneApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { Zone } from '../../lib/zone/Zone';
import type { SpatialZone } from '../../lib/zone/SpatialZone';
import { SecurityApi } from '../../api/security';

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
  SecurityPolicies.FromModule('api/zone#ZoneApi'),
  SecurityPolicies.SelfOnly
);

/**
 * ZoneLogic — the hot-reloadable logic singleton behind {@link ZoneApi}.
 *
 * Lives at `/obj/api/zone` (a stateless `Stuff` singleton, no backing
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
export class ZoneLogic extends Idea {
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
    const { SpatialZone } = await import('../../lib/zone/SpatialZone');
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
    const ownPath = zone.getTemplatePath();
    if (!ownPath) return null;
    for (const ancestor of Template.ancestorPaths(ownPath)) {
      const tpl = await Template.findByPath(ancestor);
      if (!tpl) continue;
      if (!(await this.isFolderClass(tpl.class))) continue;
      return await StuffApi.singleton<Zone>(ancestor);
    }
    return null;
  }

  /** See {@link ZoneApi._clearClassCaches}. */
  @CallSecurity(ZoneApiCallers)
  public _clearClassCaches(): void {
    SecurityApi.assertTestOnly('_clearClassCaches');
    folderClassCache.clear();
    spatialZoneClassCache.clear();
  }

  /** See {@link ZoneApi.resolveZoneForPath}. */
  @CallSecurity(ZoneApiCallers)
  public async resolveZoneForPath(
    templatePath: string
  ): Promise<SpatialZone | null> {
    const selfTemplate = await Template.findByPath(templatePath);
    if (selfTemplate && (await this.isSpatialZoneClass(selfTemplate.class))) {
      return null;
    }

    for (const ancestor of Template.ancestorPaths(templatePath)) {
      const ancestorTpl = await Template.findByPath(ancestor);
      if (!ancestorTpl) continue;
      if (!(await this.isSpatialZoneClass(ancestorTpl.class))) continue;
      return await StuffApi.singleton<SpatialZone>(ancestor);
    }
    return null;
  }
}
