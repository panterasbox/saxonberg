/**
 * ⭐⭐ **A location that keeps a record must be singleton or keyed.**
 *
 * `PersistableMixin.cleanupOnDestruct` fires with
 * `scope = getTemplatePath()`. So a persistable location that is neither
 * a singleton (one row IS one place) nor keyed (a `WarrenMember`, whose
 * provisioner supplies the key) shares ONE scope across every instance
 * minted from its row: every reap writes a `holder_snapshots` row, they
 * all collide on the same scope, and nothing ever reads them back.
 * That was the `FurnishableRoom` drift this build cut back — thirteen
 * trade floors and three pieces of minted scaffolding, each getting a
 * persistence record for free.
 *
 * ⚠ This test WALKS THE DIRECTORY rather than naming classes, on
 * purpose: it has to cover classes that do not exist yet. The rule is
 * one a merge can break silently — a class composed as
 * `PersistableMixin(CartesianLocationBase)` is singleton-and-durable
 * while the lib base carries `SingletonMixin` and becomes
 * minted-and-durable the moment it does not, with no textual change and
 * no type error. Naming the classes would let exactly that through.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../../lib/mixin";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "..");

/** Every class file directly under `platform/location/`. */
function classFiles(): string[] {
  return readdirSync(DIR)
    .filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"))
    .sort();
}

describe("every persistable location is singleton or keyed", () => {
  it("covers the whole directory, so a new class is checked by existing", () => {
    // If this ever reads zero the walk has broken and the rule below is
    // vacuously true — the failure mode a directory-walking test has.
    expect(classFiles().length).toBeGreaterThanOrEqual(6);
  });

  for (const file of classFiles()) {
    it(`${file} — a record needs a scope of its own`, async () => {
      const mod = (await import(join(DIR, file))) as { default?: unknown };
      const cls = mod.default;
      if (typeof cls !== "function") return; // not a class module
      const ctor = cls as never;
      if (!MixinApi.hasMixin(ctor, Mixins.Persistable)) return;

      const singleton = MixinApi.hasMixin(ctor, Mixins.Singleton);
      const keyed = MixinApi.hasMixin(ctor, Mixins.WarrenMember);
      expect(
        singleton || keyed,
        `${file} composes Persistable but is neither Singleton (one row = ` +
          `one place) nor WarrenMember (keyed by a provisioner). Every ` +
          `instance from its row would share ONE holder_snapshots scope — ` +
          `write-only records nothing reads back. Compose it over ` +
          `SingletonCartesianLocation, or give it the keyed shape.`,
      ).toBe(true);
    });
  }
});
