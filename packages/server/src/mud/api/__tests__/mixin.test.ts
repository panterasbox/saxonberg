/**
 * Tests for MixinApi
 *
 * Covers:
 * - hasMixin / queryMixins / getMixinFields (existing behavior)
 * - Type-predicate narrowing helpers (isContainer, isNamed, ...)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MixinApi, Mixins } from '../mixin';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import { Stuff } from '../../lib/stuff/Stuff';
import { Shadow } from '../../lib/stuff/Shadow';
import { NamedMixin } from '../../lib/description/Named';
import { GenderedMixin } from '../../lib/character/Gendered';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { VisibleMixin } from '../../lib/description/Visible';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { DetailedMixin } from '../../lib/description/Detailed';
import { SensorMixin } from '../../lib/message/Sensor';
import { VocalMixin } from '../../lib/message/Vocal';
import { PropertiedMixin } from '../../lib/stuff/Propertied';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { Shadowing } from '../../lib/security/decorators';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// Plain Stuff — has no mixins (negative-case fixture)
class Plain extends Stuff {}

// Composite fixture covering every mixin we have a predicate for
class Composite extends CommandGiverMixin(
  PropertiedMixin(
    DetailedMixin(
      PerceptibleMixin(
        VisibleMixin(
          VocalMixin(
            SensorMixin(
              ContainerMixin(
                ContainableMixin(GenderedMixin(NamedMixin(Stuff)))
              )
            )
          )
        )
      )
    )
  )
) {}

describe('MixinApi.hasMixin', () => {
  it('returns true for mixins present on the class', () => {
    expect(MixinApi.hasMixin(Composite, Mixins.Named)).toBe(true);
    expect(MixinApi.hasMixin(Composite, Mixins.Container)).toBe(true);
  });

  it('returns false for mixins absent from the class', () => {
    expect(MixinApi.hasMixin(Plain, Mixins.Named)).toBe(false);
    expect(MixinApi.hasMixin(Plain, Mixins.Container)).toBe(false);
  });
});

describe('MixinApi type predicates', () => {
  const composite = makeStuff(() => new Composite());
  const plain = makeStuff(() => new Plain());

  const cases: Array<[string, (obj: Stuff) => boolean]> = [
    ['isContainer', (o) => MixinApi.isContainer(o)],
    ['isContainable', (o) => MixinApi.isContainable(o)],
    ['isSensor', (o) => MixinApi.isSensor(o)],
    ['isVocal', (o) => MixinApi.isVocal(o)],
    ['isNamed', (o) => MixinApi.isNamed(o)],
    ['isGendered', (o) => MixinApi.isGendered(o)],
    ['isVisible', (o) => MixinApi.isVisible(o)],
    ['isPerceptible', (o) => MixinApi.isPerceptible(o)],
    ['isDetailed', (o) => MixinApi.isDetailed(o)],
    ['isPropertied', (o) => MixinApi.isPropertied(o)],
    ['isCommandGiver', (o) => MixinApi.isCommandGiver(o)],
  ];

  for (const [name, predicate] of cases) {
    it(`${name} returns true for composite, false for plain`, () => {
      expect(predicate(composite)).toBe(true);
      expect(predicate(plain)).toBe(false);
    });
  }

  it('narrows the type inside a guarded block', () => {
    const obj: Stuff = composite;
    if (MixinApi.isNamed(obj)) {
      // Type-narrowed: accessing fullName compiles without cast
      expect(typeof obj.fullName).toBe('string');
    } else {
      throw new Error('composite should satisfy isNamed');
    }

    if (MixinApi.isContainer(obj)) {
      expect(Array.isArray(obj.getContents())).toBe(true);
    } else {
      throw new Error('composite should satisfy isContainer');
    }
  });
});

describe('hasMixin walks the shadow stack', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  // Host without NamedMixin.
  class BareHost extends Stuff {}

  // Shadow that composes NamedMixin and declares one own method so
  // the inferred-surface walk picks it up. The composition is what
  // makes `MixinApi.isNamed` see Named on the shadow side.
  class NamedShadow extends NamedMixin(Shadow) {
    @Shadowing('greet')
    greetOverride(): string {
      return 'shadowed';
    }
  }

  it('returns true for the constructor form when the class composes the mixin', () => {
    expect(MixinApi.hasMixin(NamedShadow as never, Mixins.Named)).toBe(true);
  });

  it('returns false on the host alone when no mixin is composed', () => {
    const host = makeStuff(() => new BareHost());
    expect(MixinApi.isNamed(host)).toBe(false);
  });

  it('returns true for an instance after a shadow composing the mixin attaches', () => {
    const host = makeStuff(() => new BareHost());
    const sh = makeStuff(() => new NamedShadow());
    ShadowApi.attach(host, sh);
    expect(MixinApi.isNamed(host)).toBe(true);
  });

  it('returns false again after the shadow detaches', () => {
    const host = makeStuff(() => new BareHost());
    const sh = makeStuff(() => new NamedShadow());
    ShadowApi.attach(host, sh);
    ShadowApi.detach(sh);
    expect(MixinApi.isNamed(host)).toBe(false);
  });
});
