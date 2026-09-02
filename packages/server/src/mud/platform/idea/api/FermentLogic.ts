// FermentLogic — the hot-reloadable logic singleton behind FermentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import FermentProfile from '../../../lib/ferment/FermentProfile';
import type Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../../lib/stuff/Template';

const FermentApiCallers = SecurityPolicies.FromModule(
  '/api/ferment#FermentApi',
);

/**
 * FermentLogic — the hot-reloadable logic singleton behind
 * {@link FermentApi}.
 *
 * Lives at `/platform/idea/api/ferment` (a stateless `Stuff` singleton,
 * no backing `Template`); `FermentApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Holds NO state — the profile roster IS the
 * live-instance population (`findByPathGlob` over `idea/ferment/`
 * subtrees), stood up once by `boot()` and enumerated per query, so
 * there is no cache to invalidate and HMR/eviction cannot leave a stale
 * index (the `everyMaterial` shape). All real work lives in
 * module-private free functions; each public method carries the
 * `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class FermentLogic extends ApiLogic {
  /** See {@link FermentApi.boot}. */
  @CallSecurity(FermentApiCallers)
  public boot(): Promise<number> {
    return bootImpl();
  }

  /** See {@link FermentApi.profileFor}. */
  @CallSecurity(FermentApiCallers)
  public profileFor(material: Material): FermentProfile | null {
    return profileForImpl(material);
  }

  /** See {@link FermentApi.profileByKey}. */
  @CallSecurity(FermentApiCallers)
  public profileByKey(key: string): FermentProfile | null {
    if (!key) return null;
    return profilesImpl().find((p) => p.getKey() === key) ?? null;
  }

  /** See {@link FermentApi.profiles}. */
  @CallSecurity(FermentApiCallers)
  public profiles(): FermentProfile[] {
    return profilesImpl();
  }
}

/**
 * Stand up every authored profile row as a live singleton (the
 * `MaterialApi.boot` shape, third application of the rule: a reference
 * Idea nothing stands up is a null read forever). Filters to rows whose
 * backing `class` extends `FermentProfile`, wherever the row lives —
 * never an allowlist of roots.
 */
async function bootImpl(): Promise<number> {
  const templates = await Template.findByPathInfix('/idea/ferment/');
  let stood = 0;
  const isProfile = new Map<string, boolean>();
  for (const tpl of templates) {
    if (!isProfile.has(tpl.class)) {
      isProfile.set(tpl.class, await isProfileClass(tpl.class));
    }
    if (!isProfile.get(tpl.class)) continue;
    try {
      await StuffApi.singleton(tpl.path);
      stood++;
    } catch (err) {
      console.warn(`FermentApi.boot: '${tpl.path}' failed to stand up:`, err);
    }
  }
  console.info(`FermentApi.boot: ${stood} ferment profile(s) live`);
  return stood;
}

/** Does `classPath` resolve to a class extending `FermentProfile`? */
async function isProfileClass(classPath: string): Promise<boolean> {
  try {
    const cls = (await StuffApi.loadClassByPath(classPath)) as {
      prototype?: unknown;
    };
    return typeof cls === 'function' && cls.prototype instanceof FermentProfile;
  } catch {
    return false;
  }
}

/**
 * Every live profile, sorted by key — found by the branch segment over
 * the live population (the `everyMaterial` shape: no cache, no roster
 * list, invalidation by construction).
 */
function profilesImpl(): FermentProfile[] {
  return StuffApi.findByPathGlob<FermentProfile>('/**/idea/ferment/**')
    .filter((p): p is FermentProfile => p instanceof FermentProfile)
    .sort((a, b) => a.getKey().localeCompare(b.getKey()));
}

/**
 * Match a must to its profile by tags. Two matches is an authoring
 * error — warned, then resolved deterministically (lowest key wins,
 * the sort above): a diagnostic, never a roll.
 */
function profileForImpl(material: Material): FermentProfile | null {
  const matches = profilesImpl().filter((p) => {
    const category = p.getInputCategory();
    return category.length > 0 && material.hasTag(category);
  });
  if (matches.length > 1) {
    console.warn(
      `FermentApi.profileFor: material '${material.getTemplatePath()}' matches ` +
        `${matches.length} profiles (${matches.map((p) => p.getKey()).join(', ')}) — ` +
        `authoring error; using '${matches[0]!.getKey()}'`,
    );
  }
  return matches[0] ?? null;
}
