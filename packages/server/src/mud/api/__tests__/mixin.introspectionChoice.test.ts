/**
 * ⭐⭐⭐ **Two introspection walks, and choosing the wrong one silently
 * invents findings.**
 *
 * `MixinApi` offers two ways to ask what a class is made of, and they
 * answer different questions:
 *
 * | walk | answers | drops |
 * |---|---|---|
 * | {@link MixinApi.queryMixins} | **identity** — every mixin composed | nothing |
 * | {@link MixinApi.getPersistenceContributors} | **serialization** — every layer contributing a slice | any layer with no persistent field and no `captureSlice` |
 *
 * The second is right for *what fields does this layer own* and wrong
 * for *what is this class*. A `fieldMeta`-less mixin — `ManualBuild`,
 * `NutritionLabel`, `UnboundedSource`, `Palatable`, `Singleton` — is
 * **invisible** to it.
 *
 * ⚠⚠ That is not hypothetical. The base-class narrowing build's
 * `--siblings` scan derived a class's mixin signature from the
 * contributor walk and reported four pairs of classes as having
 * character-for-character identical composition:
 *
 *   `Ingot`/`Casting` · `ServingVessel`/`Dish` ·
 *   `Receptacle`/`UnboundedReceptacle` ·
 *   `CartesianLocation`/`SingletonCartesianLocation`
 *
 * All four were false, and the plan built on them proposed merging
 * classes that differ by a real mixin — one of them a PARENT and its
 * CHILD (`Dish extends ServingVessel`). It was caught by a reviewer
 * opening the two files, not by anything automated.
 *
 * This pins the distinction so the next reader of either API is told
 * which one they want, in the failure message, rather than discovering
 * it from a plausible-looking list.
 */

import '../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { MixinApi } from '../mixin';
import Ingot from '../../platform/thing/Ingot';
import Casting from '../../platform/thing/Casting';
import Thing from '../../lib/stuff/Thing';

const names = (ctor: unknown): string[] =>
  MixinApi.queryMixins(ctor as never)
    .map((m) => (m as { _mixinName?: string })._mixinName ?? '')
    .filter((n) => n !== '');

const contributors = (ctor: unknown): string[] =>
  MixinApi.getPersistenceContributors(ctor as never).map((c) => c.key);

describe('⭐⭐⭐ queryMixins is identity; getPersistenceContributors is serialization', () => {
  it('⭐ Ingot and Casting differ by ManualBuildMixin, and queryMixins sees it', () => {
    // `Ingot  = Alloyed(ManualBuild(Meltable(Thermal(Thing))))`
    // `Casting = Alloyed(          Meltable(Thermal(Thing)))`
    expect(names(Ingot)).toContain('ManualBuildMixin');
    expect(names(Casting)).not.toContain('ManualBuildMixin');
  });

  it('⚠⚠ the CONTRIBUTOR walk cannot see it — this is the trap', () => {
    // `ManualBuildMixin` declares no `fieldMeta` and no `captureSlice`,
    // so it contributes no slice and the walk skips it. Anything using
    // this list as a signature reads Ingot and Casting as identical.
    expect(contributors(Ingot)).not.toContain('ManualBuildMixin');
    expect(
      contributors(Ingot).sort(),
      'if these two ever differ, the trap has closed and the comment above ' +
        'should be revisited — until then, signatures come from queryMixins',
    ).toEqual(contributors(Casting).sort());
  });

  it('⭐⭐ so the two walks DISAGREE about these classes, on purpose', () => {
    const byIdentity =
      names(Ingot).sort().join('+') === names(Casting).sort().join('+');
    const bySerialization =
      contributors(Ingot).sort().join('+') ===
      contributors(Casting).sort().join('+');

    expect(byIdentity, 'identity: Ingot and Casting are different').toBe(false);
    expect(
      bySerialization,
      'serialization: they persist the same slices, which is also true',
    ).toBe(true);
  });

  it('⚠ a contributor entry still owns its OWN fields, not the chain', () => {
    // The reason the contributor walk exists, and why it is right for
    // the composition census's field columns: each entry's `fields` is
    // that layer's own declaration, so a class's slices stay
    // independent. `getAllPersistentFields` is the aggregated question.
    const all = MixinApi.getAllPersistentFields(Ingot as never);
    for (const c of MixinApi.getPersistenceContributors(Ingot as never)) {
      for (const f of c.fields) expect(all).toContain(f);
    }
    const summed = MixinApi.getPersistenceContributors(Ingot as never).reduce(
      (n, c) => n + c.fields.length,
      0,
    );
    expect(summed).toBeLessThanOrEqual(all.length);
  });
});

/**
 * ⭐⭐ **The `authorable` read, which decides whether a zero MEANS
 * anything.**
 *
 * The composition census splits its findings in two, and the split is
 * the difference between a shortlist and noise:
 *
 *  - **list A** — the layer has authorable fields and no row writes one.
 *    An author COULD say this and never does.
 *  - **list B** — the layer has no authorable field at all, so authoring
 *    cannot judge it: no row could author it.
 *
 * Without the split the top of the list was `Chattel`, `Wet` and
 * `Containable` — three mixins whose state is minted, derived and
 * runtime respectively, and not one of them a narrowing candidate.
 * Ranking them beside `Thermal` compares an absence to a silence.
 *
 * So the census is only as good as this read, and these are the two
 * cases it was checked against by hand.
 */
describe('⭐⭐ the authorable read behind the census A/B split', () => {
  const authorableOf = (ctor: unknown): string[] => {
    const meta = MixinApi.getAllFieldMeta(ctor as never) as Record<
      string,
      { authorable?: true } | undefined
    >;
    return Object.keys(meta).filter((k) => meta[k]?.authorable === true);
  };

  it('⭐ Containable exposes exactly ONE authorable field — a flag', () => {
    // Which is why `Containable` scored 8/599 and is NOT a narrowing
    // candidate: where a thing currently IS is runtime state, and
    // `fixedInPlace` is the only part of it an author ever writes.
    const a = authorableOf(Thing);
    expect(a).toContain('fixedInPlace');
  });

  it('⚠⚠ Chattel exposes NONE — its id is stamped at transfer', () => {
    // `_chattelId` is minted by `ChattelApi.stamp`, never authored. A
    // zero here is list B and means nothing about whether the mixin
    // belongs; that judgment came from the concept (a floor is not
    // owned as an instance), not from this number.
    const meta = MixinApi.getAllFieldMeta(Thing as never) as Record<
      string,
      { authorable?: true } | undefined
    >;
    expect(meta['_chattelId']).toBeDefined();
    expect(meta['_chattelId']?.authorable).toBeUndefined();
  });

  it('⭐ and the prose fields ARE authorable — the 99% that made them mandatory', () => {
    const a = authorableOf(Thing);
    for (const f of ['shortDescription', 'longDescription', 'keywords']) {
      expect(a, `${f} must read as authorable`).toContain(f);
    }
  });
});
