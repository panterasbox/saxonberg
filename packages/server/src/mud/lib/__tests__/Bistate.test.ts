import { describe, it, expect, afterEach } from 'vitest';
import { Idea } from '../stuff/Idea';
import { BistateMixin } from '../Bistate';
import { SealableMixin } from '../spatial/Sealable';
import { SwitchableMixin } from '../boundary/Switchable';
import { FoldableMixin } from '../slot/Foldable';
import PersistentHydrator from '../../obj/persistence/PersistentHydrator';
import { StuffApi } from '../../api/stuff';
import { makeStuff } from '../security/__tests__/test-setup';

/**
 * Round-trip persistence coverage for the toggle-mixin family
 * (`Sealable`, `Switchable`, `Foldable`) now sharing `BistateMixin`.
 *
 * The genuine persistence path these content-clone mixins ride is
 * **template `data: { <field>: true }` → the two-phase
 * `PersistentHydrator` → `set<Field>()` → `is<Field>() === true`**. That
 * is the path `StuffApi.clone` / `restoreFromTemplate` drive when a Door
 * / lamp / folding chair is instantiated from its template. The test
 * exercises that real framework path (via `PersistentHydrator.hydrate`),
 * not a hand-rolled serializer: set true → hydrate a fresh instance from
 * the stored `data` → assert the boolean survived (and false stays
 * false, and a malformed non-boolean is rejected by the guard).
 *
 * NOTE ON THE CAPTURE PATH (holder_snapshots / `PersistableApi.capture`):
 * that path reads `self[field]` by the *noun* name declared in
 * `persistentFields` (`open` / `on` / `folded`), but the backing storage
 * lives under `BistateMixin`'s `private _state`. So capture does NOT see
 * the boolean: for `on` / `folded` no such property exists and the field
 * is skipped; for `open` the name collides with the `open()` action
 * method and capture reads the *function*. This is a **pre-existing**
 * property of how these mixins declare persistence — the refactor
 * preserves it byte-for-byte (same `private` storage, same `set<Field>`
 * restore) and does not attempt to change persistence semantics. These
 * mixins are only ever persisted via the reliable template→Hydrator path
 * covered below; the capture-path gap is latent, not live.
 */

function hydrator(): PersistentHydrator {
  return makeStuff(() => new PersistentHydrator());
}

class TestSealable extends SealableMixin(Idea) {}
class TestSwitchable extends SwitchableMixin(Idea) {}
class TestFoldable extends FoldableMixin(Idea) {}

const cases: Array<{
  label: string;
  field: string;
  make: () => TestSealable | TestSwitchable | TestFoldable;
  read: (h: TestSealable | TestSwitchable | TestFoldable) => boolean;
}> = [
  {
    label: 'Sealable',
    field: 'open',
    make: () => makeStuff(() => new TestSealable()),
    read: (h) => (h as TestSealable).isOpen(),
  },
  {
    label: 'Switchable',
    field: 'on',
    make: () => makeStuff(() => new TestSwitchable()),
    read: (h) => (h as TestSwitchable).isOn(),
  },
  {
    label: 'Foldable',
    field: 'folded',
    make: () => makeStuff(() => new TestFoldable()),
    read: (h) => (h as TestFoldable).isFolded(),
  },
];

describe('BistateMixin — shared guarded-boolean base', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('is not registered as a queryable capability (no _mixinName)', () => {
    // BistateMixin is shared implementation, not a contract surface:
    // consumers narrow on isSealable/isSwitchable/isFoldable instead.
    const Composed = BistateMixin(Idea);
    expect(
      (Composed as unknown as { _mixinName?: string })._mixinName
    ).toBeUndefined();
  });

  for (const c of cases) {
    describe(c.label, () => {
      it(`survives a template → Hydrator round trip (${c.field}: true)`, async () => {
        // Restore a fresh instance from the stored template data — the
        // real content-clone persistence path (set<Field> preferred).
        const restored = c.make();
        await hydrator().hydrate(restored, { [c.field]: true });
        expect(c.read(restored)).toBe(true);
      });

      it(`round-trips false (${c.field}: false)`, async () => {
        // Pre-set true, then hydrate false — proves the stored value
        // drives the outcome, not the default.
        const seeded = c.make();
        await hydrator().hydrate(seeded, { [c.field]: true });
        expect(c.read(seeded)).toBe(true);
        await hydrator().hydrate(seeded, { [c.field]: false });
        expect(c.read(seeded)).toBe(false);
      });

      it(`defaults to false when the field is absent from data`, async () => {
        const restored = c.make();
        await hydrator().hydrate(restored, {});
        expect(c.read(restored)).toBe(false);
      });

      it(`rejects a malformed non-boolean at hydrate time`, async () => {
        // The guard on setState fires through the setter the Hydrator
        // prefers — a malformed template crashes loudly.
        const restored = c.make();
        await expect(
          hydrator().hydrate(restored, { [c.field]: 1 })
        ).rejects.toThrow(TypeError);
      });
    });
  }
});
