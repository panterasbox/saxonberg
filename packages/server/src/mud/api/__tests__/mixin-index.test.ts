/**
 * The registry's composition index — the ONE axis every object has.
 *
 * ⭐ The design decision this pins is what the index is NOT: a bucket
 * per feature. `byMixin` describes the whole population (every object
 * has a class, and a class has a composition), which is why it is the
 * only index the registry grows here. A `byClassName`, or a bucket for
 * some subsystem's slice, would be the first entry in an ever-growing
 * bag of indexes each true of a fraction of the world.
 *
 * The two ways an index like this rots, and both are tested:
 *
 *   - **it drifts** — an object registers or unregisters and a bucket
 *     is not updated. Maintenance lives inside the single
 *     register/unregister chokepoint, so invalidation is by
 *     construction rather than by a lifecycle anyone has to remember;
 *   - **it changes the answer** — the whole claim of this build is that
 *     `world:[mixin.X]` still means exactly what it meant. So the
 *     indexed result is asserted **equal as a set** to the walk-and-
 *     filter it replaces.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../stuff';
import { MixinApi } from '../mixin';
import { ShadowApi } from '../shadow';
import { Idea } from '../../lib/stuff/Idea';
import { Shadow } from '../../lib/stuff/Shadow';
import { Shadowing } from '../../lib/security/decorators';
import { NamedMixin } from '../../lib/description/Named';
import { ContainableMixin } from '../../lib/spatial/Containable';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { MqlContext } from '../mql/types';

class Plain extends Idea {}
class Named extends NamedMixin(Idea) {}
class Both extends ContainableMixin(NamedMixin(Idea)) {}

/** A shadow that COMPOSES a mixin its host does not. */
class NamedShadow extends NamedMixin(Shadow) {
  @Shadowing
  public override getName(): string {
    return 'shadowed';
  }
}

const systemCtx = (): MqlContext => ({ commandGiver: null, scope: 'world' });

/**
 * ⭐ A stand-in for a real engine reader.
 *
 * The engine's registry-wide read is `StuffApi.findByMixin`, gated to a
 * `(template, method)` pair per admitted caller. So the test stands an
 * object at one of the SHIPPED pair templates with the matching method
 * name — which means these assertions exercise the gate end to end
 * rather than around it, and would fail if that pair were mistyped.
 */
class Reader extends Idea {
  public employeesOf(mixinName: string): Stuff[] {
    return StuffApi.findByMixin(mixinName);
  }
  /** The same call from a method the pair list does not name. */
  public sneak(mixinName: string): Stuff[] {
    return StuffApi.findByMixin(mixinName);
  }
}

const EMPLOYMENT = '/platform/idea/api/employment';

function reader(): Reader {
  return (
    StuffApi.findByTemplatePath<Reader>(EMPLOYMENT) ??
    makeStuffAtPath(() => new Reader(), EMPLOYMENT)
  );
}

/** The pre-index answer: walk the world, filter by composition. */
function byWalk(mixinName: string): Set<string> {
  const wanted = mixinName.toLowerCase();
  const out = new Set<string>();
  for (const obj of StuffApi.getAllObjects()) {
    const names = MixinApi.lowercasedMixinNames(
      obj.constructor as new (...args: never[]) => unknown,
    );
    if (names.has(wanted)) out.add(obj.stuffId);
  }
  return out;
}

const idsOf = (mixinName: string): Set<string> =>
  new Set(reader().employeesOf(mixinName).map((s) => s.stuffId));

describe('the registry composition index', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('answers world:[mixin.X] exactly as the walk-and-filter did', () => {
    makeStuff(() => new Plain());
    makeStuff(() => new Named());
    makeStuff(() => new Named());
    makeStuff(() => new Both());
    expect(idsOf('NamedMixin')).toEqual(byWalk('NamedMixin'));
    expect(idsOf('ContainableMixin')).toEqual(
      byWalk('ContainableMixin'),
    );
    expect(idsOf('NoSuchMixin')).toEqual(new Set());
  });

  it('is case-insensitive, as the filter has always been', () => {
    makeStuff(() => new Named());
    expect(idsOf('namedmixin')).toEqual(byWalk('NamedMixin'));
  });

  it('drops an object from its buckets when it is destroyed', async () => {
    const a = makeStuff(() => new Named());
    makeStuff(() => new Named());
    expect(idsOf('NamedMixin').size).toBe(2);
    await StuffApi.destruct(a as unknown as Stuff);
    const after = idsOf('NamedMixin');
    expect(after.size).toBe(1);
    expect(after.has(a.stuffId)).toBe(false);
    expect(after).toEqual(byWalk('NamedMixin'));
  });

  it('starts empty after clearAll — no bucket outlives the registry', () => {
    makeStuff(() => new Named());
    StuffApi.clearAll();
    expect(idsOf('NamedMixin')).toEqual(new Set());
  });

  it('⭐ is COMPOSED-only: a shadow-granted mixin does not bucket its host', async () => {
    const plain = makeStuff(() => new Plain());
    const shadow = await StuffApi.create(() => new NamedShadow());
    ShadowApi.attach(plain as unknown as Stuff, shadow as unknown as Shadow);

    // The instance-level predicate walks shadows and says yes …
    expect(MixinApi.hasMixin(plain as unknown as Stuff, 'NamedMixin')).toBe(
      true,
    );
    // … and the index, which is about what the CLASS is, says no. That is
    // today's meaning of `world:[mixin.X]`, hardened deliberately: an
    // `[active.X]` selector is the place a runtime grant would belong.
    expect(idsOf('NamedMixin').has(plain.stuffId)).toBe(false);
  });

  it('refuses a reader that is not the query engine', () => {
    makeStuff(() => new Named());
    expect(() => StuffApi.findByMixin('namedmixin')).toThrow();
  });

  it('⭐ refuses a method the pair list does not name', () => {
    makeStuff(() => new Named());
    // Same object, same template, one method along. The gate is on the
    // FUNCTION, which is the whole reason it is `FromTemplateMethod`.
    expect(() => reader().sneak('NamedMixin')).toThrow();
  });

  it('⭐ cannot express an unindexed read at all — the SIGNATURE is the gate', () => {
    // Being permitted is not being permitted to walk the world. This
    // used to be a runtime check inside the query resolver; it is now
    // the parameter type. `findByMixin` takes a mixin NAME, so
    // `world:[class.X]` — or bare `world` — is not something an engine
    // reader can ask for, correctly or otherwise.
    makeStuff(() => new Named());
    expect(idsOf('world')).toEqual(new Set());
    expect(idsOf('world:[class.Named]')).toEqual(new Set());
  });
});

describe('MixinApi composition memo', () => {
  it('returns the same composition on repeat calls, and a fresh array', () => {
    const first = MixinApi.queryMixins(Both);
    const second = MixinApi.queryMixins(Both);
    expect(second.map((m) => m._mixinName)).toEqual(
      first.map((m) => m._mixinName),
    );
    // A caller that mutates the returned array must not corrupt the memo.
    first.length = 0;
    expect(MixinApi.queryMixins(Both).length).toBeGreaterThan(0);
  });

  it('lowercases every composed name', () => {
    const names = MixinApi.lowercasedMixinNames(Both);
    expect(names.has('namedmixin')).toBe(true);
    expect(names.has('containablemixin')).toBe(true);
    expect(names.has('nosuchmixin')).toBe(false);
  });

  it('keys on the constructor, so a reloaded class is simply a new key', () => {
    // HMR replaces a class rather than mutating it; the memo is a
    // WeakMap, so there is nothing to invalidate.
    class Reloaded extends NamedMixin(Idea) {}
    expect(MixinApi.lowercasedMixinNames(Reloaded).has('namedmixin')).toBe(true);
    expect(MixinApi.lowercasedMixinNames(Plain).has('namedmixin')).toBe(false);
  });
});
