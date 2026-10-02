/**
 * `Stuff.onCreate` — the terminal, and the chain.
 *
 * ⭐ What this file pins is the whole reason `PostRegistrationMixin`
 * retired (2026-10-01). The hook used to arrive from a marker mixin whose
 * default was a **non-chaining no-op**, and the clone pipeline dispatched
 * it only `if (MixinApi.isPostRegistration(proxy))`. That shape had two
 * live failure modes:
 *
 *   1. a class that composed the marker **anywhere but innermost** swallowed
 *      every layer inside it (`KeptAnimal` shipped that way — see
 *      `KeptAnimal.onCreate.test.ts`), and
 *   2. a class that **overrode without composing** passed every predicate
 *      and simply never had its hook called.
 *
 * With a terminal on `Stuff` and an unconditional dispatch, both are
 * structurally impossible: there is no marker to compose twice, no
 * non-chaining default in the middle of a chain, and no predicate that can
 * answer "no". The only way left to shadow a layer is to forget `super` in
 * your own override — which the last test asserts, as documentation.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { Stuff } from '../Stuff';
import { Idea } from '../Idea';
import type { MixinConstructor } from '../../mixin';

describe('Stuff.onCreate — the terminal', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => StuffApi.clearAll());

  it('is a no-op every Stuff inherits, so a bare class needs no marker', async () => {
    class Bare extends Idea {}
    const obj = await StuffApi.create(() => new Bare());
    expect(obj.isDestroyed()).toBe(false);
    // The terminal is what the `createSync` guardrail compares against.
    expect(Bare.prototype.onCreate).toBe(Stuff.prototype.onCreate);
  });

  it('an override is called by the pipeline with NO mixin composed at all', async () => {
    const seen: string[] = [];
    class Plain extends Idea {
      override async onCreate(context?: unknown): Promise<void> {
        await super.onCreate(context);
        seen.push(`plain:${String(context)}`);
      }
    }
    await StuffApi.create(() => new Plain(), 'ctx');
    expect(seen).toEqual(['plain:ctx']);
  });

  it('a three-layer mixin chain runs every layer, outermost first', async () => {
    const order: string[] = [];

    function InnerMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
      return class InnerMixin extends Base {
        static _mixinName: string = 'TestInnerMixin';
        async onCreate(context?: unknown): Promise<void> {
          await super.onCreate(context);
          order.push('inner');
        }
      };
    }
    function MiddleMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
      return class MiddleMixin extends Base {
        static _mixinName: string = 'TestMiddleMixin';
        async onCreate(context?: unknown): Promise<void> {
          await super.onCreate(context);
          order.push('middle');
        }
      };
    }

    class Outer extends MiddleMixin(InnerMixin(Idea)) {
      override async onCreate(context?: unknown): Promise<void> {
        await super.onCreate(context);
        order.push('outer');
      }
    }

    await StuffApi.create(() => new Outer());
    // Each layer chains BEFORE doing its own work, so the pushes read
    // innermost-last-reached-first: inner, middle, outer.
    expect(order).toEqual(['inner', 'middle', 'outer']);
  });

  it('forgetting `super` is the only remaining way to shadow a layer', async () => {
    const order: string[] = [];

    function SeededMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
      return class SeededMixin extends Base {
        static _mixinName: string = 'TestSeededMixin';
        async onCreate(context?: unknown): Promise<void> {
          await super.onCreate(context);
          order.push('seeded');
        }
      };
    }

    class Forgetful extends SeededMixin(Idea) {
      // ⚠ Deliberately does NOT call super — this is the documented hazard.
      override async onCreate(): Promise<void> {
        order.push('forgetful');
      }
    }

    await StuffApi.create(() => new Forgetful());
    expect(order).toEqual(['forgetful']);
    expect(order).not.toContain('seeded');
  });
});
