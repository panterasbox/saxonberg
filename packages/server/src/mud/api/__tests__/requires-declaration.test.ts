/**
 * `requires:` — the declarative kind gate.
 *
 * ⭐ **What replaced what.** A command spec used to say what a slot
 * accepted in two mutually-blind ways: ~34 near-identical validator
 * files, each one `MixinApi.isX` and one sentence, and a bare
 * `targetKind: any` marker meaning "no constraint". Neither could be
 * checked. Review of the sweep that introduced them found **three of
 * fifty `any` declarations were wrong** — the slot promised it accepted
 * anything while its controller refused by kind — and nothing could
 * have caught them, because `'any'` asserts nothing falsifiable.
 *
 * A mixin name is falsifiable, and the first two tests below are why
 * the whole mechanism exists: every other guarantee here is downstream
 * of "a name that isn't a mixin stops the build".
 *
 * ⚠ The last test loads the **shipped tree** for real. The unit cases
 * prove the synthesis behaves; only that one proves the specs use it.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CommandApi, type FieldValidator } from '../command';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { MixinApi } from '../mixin';
import { Idea } from '../../lib/stuff/Idea';
import { Agent } from '../../lib/stuff/Agent';
import Location from '../../lib/stuff/Location';
import { NamedMixin } from '../../lib/description/Named';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';
import { VitalsMixin } from '../../lib/vitals/Vitals';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

/** A plain, capability-less thing — the shape a kind gate turns away. */
class Rock extends NamedMixin(Idea) {
  static _mixinName = 'RockForRequiresTest';
}
class Chest extends SealableMixin(NamedMixin(Idea)) {}
class Shelf extends SurfacedMixin(ContainableMixin(NamedMixin(Idea))) {}
class Crate extends ContainerMixin(NamedMixin(Idea)) {}
class Person extends NamedMixin(Agent) {}

const WHERE = 'cmd/probe.yaml arg `target`';

/** The refusal a declaration produces for a binding, or `undefined`. */
async function refusalForBinding(
  requires: string | string[],
  binding: unknown,
): Promise<string | undefined> {
  const check: FieldValidator | null = await CommandApi.resolveRequirement(
    requires,
    WHERE,
  );
  // `'any'` resolves to no check at all — nothing to run, nothing to
  // pay for at dispatch.
  if (!check) return undefined;
  return check(binding, 'target', undefined as never, undefined as never);
}

/** Singular binding — an `MqlOneResult`, the `type: object` shape. */
async function refusalFor(
  requires: string | string[],
  stuff: Stuff | null,
): Promise<string | undefined> {
  return refusalForBinding(requires, { stuff, raw: 'it' });
}

/** Plural binding — an `MqlManyResult`, the `type: objects` shape. */
async function refusalForMany(
  requires: string | string[],
  stuff: Stuff[],
): Promise<string | undefined> {
  return refusalForBinding(requires, { stuff, raw: 'them' });
}

function named(make: () => unknown, name: string): Stuff {
  const s = makeStuff(make as () => Stuff) as unknown as Stuff;
  (s as unknown as { setName(n: string): void }).setName(name);
  return s;
}

describe('requires: — a slot states what it accepts', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  /*
   * ⚠⚠ THE test. `targetKind: any` could not be wrong; a mixin name
   * can, and this is what makes it so. A typo, a renamed mixin, or a
   * capability that no longer exists stops the spec loading instead of
   * quietly producing a check that never fires.
   */
  it('refuses to resolve a declaration naming a mixin that does not exist', async () => {
    await expect(
      CommandApi.resolveRequirement('SealbleMixin', WHERE),
    ).rejects.toThrow(/not a mixin/);
  });

  /*
   * ⚠ And it says WHERE. "A mixin doesn't exist" without a location is
   * a boot failure somebody has to bisect.
   */
  it('names the offending slot in the error', async () => {
    await expect(
      CommandApi.resolveRequirement('NotAMixin', WHERE),
    ).rejects.toThrow(/arg `target`/);
  });

  it('refuses a Stuff that does not compose the mixin, in its own words', async () => {
    const rock = named(() => new Rock(), 'a plain rock');
    expect(await refusalFor('SealableMixin', rock)).toBe(
      "a plain rock doesn't open and close",
    );
  });

  it('accepts a Stuff that composes it', async () => {
    const chest = named(() => new Chest(), 'an oak chest');
    expect(MixinApi.hasMixin(chest, 'SealableMixin')).toBe(true);
    expect(await refusalFor('SealableMixin', chest)).toBeUndefined();
  });

  /*
   * ⚠ Composition, not class. This is the property `plant` was missing
   * when it refused with `instanceof Seed` and the menu offered
   * planting a rock: anything composing the capability satisfies the
   * slot, with no shared base class.
   */
  it('accepts anything composing the mixin, whatever its class', async () => {
    class Hatch extends SealableMixin(NamedMixin(Idea)) {}
    const hatch = named(() => new Hatch(), 'a hatch');
    expect(hatch).not.toBeInstanceOf(Chest);
    expect(await refusalFor('SealableMixin', hatch)).toBeUndefined();
  });

  /*
   * ⭐ Criterion 23's canonical wrong target. A room is what the
   * affordance resolver was offering `attack`, `drink` and `talk`
   * against; a kind declaration is what stopped it.
   */
  it('refuses a Location for a slot that wants a living thing', async () => {
    const room = makeStuff(() => new Location()) as unknown as Stuff;
    expect(await refusalFor('VitalsMixin', room)).toMatch(/isn't alive/);
  });

  it('accepts something with the vitals', async () => {
    class Beast extends VitalsMixin(NamedMixin(Idea)) {}
    const beast = named(() => new Beast(), 'a goat');
    expect(await refusalFor('VitalsMixin', beast)).toBeUndefined();
  });

  /*
   * ⚠ An unbound operand is NOT a wrong kind. `put <thing> in <what?>`
   * resolves with the second slot empty, and refusing it would report
   * `put` unavailable on every object in the world — the affordance
   * resolver reads exactly this distinction to say `pending-operand`.
   */
  it('passes an unbound slot rather than refusing it', async () => {
    expect(await refusalFor('SealableMixin', null)).toBeUndefined();
  });

  /*
   * ⚠⚠ `type: objects` — the plural shape, and a trap worth pinning.
   * `MqlOneResult` and `MqlManyResult` both carry a `stuff` key; the
   * plural one holds an ARRAY. A check that discriminated on the key's
   * presence would hand the array to the singular door-aware path,
   * whose predicate then answers a well-formed `false` — so `get`,
   * `drop` and every plural verb would refuse silently and universally
   * instead of crashing. Nothing in the shipped controller tests would
   * have caught it: they bind their own models and skip the binder.
   */
  describe('plural bindings', () => {
    it('accepts a list where every member qualifies', async () => {
      const a = named(() => new Chest(), 'a chest');
      const b = named(() => new Chest(), 'a locker');
      expect(await refusalForMany('SealableMixin', [a, b])).toBeUndefined();
    });

    it('refuses the FIRST member that does not, and names it', async () => {
      const chest = named(() => new Chest(), 'a chest');
      const rock = named(() => new Rock(), 'a plain rock');
      expect(await refusalForMany('SealableMixin', [chest, rock])).toBe(
        "a plain rock doesn't open and close",
      );
    });

    it('passes an empty result — the controller owns the no-match line', async () => {
      expect(await refusalForMany('SealableMixin', [])).toBeUndefined();
    });
  });

  describe('the grammar', () => {
    /*
     * A list is AND — and the refusal names the term that FAILED, not
     * the first one declared.
     */
    it('a list requires ALL of them', async () => {
      const shelf = named(() => new Shelf(), 'a shelf');
      expect(await refusalFor(['SurfacedMixin', 'ContainerMixin'], shelf)).toBe(
        "a shelf isn't a place",
      );
    });

    it('a list passes something composing every term', async () => {
      class Sideboard extends SurfacedMixin(
        ContainerMixin(ContainableMixin(NamedMixin(Idea))),
      ) {}
      const sideboard = named(() => new Sideboard(), 'a sideboard');
      expect(
        await refusalFor(['SurfacedMixin', 'ContainerMixin'], sideboard),
      ).toBeUndefined();
    });

    /*
     * `|` is OR, and it exists for the case where two mixins are the
     * same idea from two directions — `put` takes a container or a
     * surface, `ignite` takes a combustible or a furnace.
     */
    it('an alternation accepts either side', async () => {
      const crate = named(() => new Crate(), 'a crate');
      const shelf = named(() => new Shelf(), 'a shelf');
      const which = 'ContainerMixin|SurfacedMixin';
      expect(await refusalFor(which, crate)).toBeUndefined();
      expect(await refusalFor(which, shelf)).toBeUndefined();
    });

    it('an alternation refuses something with neither, in the FIRST phrase', async () => {
      const rock = named(() => new Rock(), 'a rock');
      expect(await refusalFor('ContainerMixin|SurfacedMixin', rock)).toBe(
        "a rock isn't a place",
      );
    });

    /*
     * `any` is the explicit no-constraint value, and it must stay
     * genuinely free: the perception family is the largest group
     * declaring it, so an invented constraint here quietly deletes
     * `look`.
     */
    it('`any` constrains nothing and costs nothing', async () => {
      expect(await CommandApi.resolveRequirement('any', WHERE)).toBeNull();
    });
  });

  /*
   * ⚠ The `class:` escape is CLOSED — one entry, for the top-level
   * `Agent` type where `instanceof` is the sanctioned check. The
   * rejection half is what keeps it closed: a capability reaching for
   * `class:` must be told to become a mixin instead.
   */
  describe('the class: escape', () => {
    it('accepts an Agent and refuses a thing', async () => {
      const alice = named(() => new Person(), 'Alice');
      const rock = named(() => new Rock(), 'a rock');
      expect(await refusalFor('class:Agent', alice)).toBeUndefined();
      expect(await refusalFor('class:Agent', rock)).toBe(
        "a rock isn't a person",
      );
    });

    it('refuses to resolve any class that is not sanctioned', async () => {
      await expect(
        CommandApi.resolveRequirement('class:Seed', WHERE),
      ).rejects.toThrow(/wants a mixin, not a class/);
    });
  });

  /*
   * The whole shipped tree, loaded for real — the regression that
   * catches a mixin rename landing without its spec edits. `lint:
   * arg-kinds` catches that statically; this makes it fail a test run
   * too, because the static gate is easy to skip and a red suite is
   * not.
   */
  it('every shipped spec declares a resolvable requirement', async () => {
    CommandApi.clearCache();
    const result = await CommandApi.preloadAll();
    expect(result.failed).toEqual([]);
  });
});
