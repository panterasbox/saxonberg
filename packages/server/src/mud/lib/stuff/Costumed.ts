/**
 * CostumedMixin — ⭐⭐⭐ **the third designation: `costume:` — what a cast member is
 * wearing.**
 *
 * `props:` dresses the set and `cast:` fills it with people; a person in
 * the cast has a **costume**. Same rail as the other two: an
 * `instruction:` field, a Phase-2 applier, a once-flag, and the class
 * checked *before* anything is cloned.
 *
 * ```yaml
 * costume:
 *   - /stuff/thing/clothing/wool-coat
 *   - /stuff/thing/clothing/boots
 * ```
 *
 * ## ⚠⚠ Why this is here and not on `NPC`, where it shipped
 *
 * It shipped as `wears:` on `NPC` in the envelope build, and review
 * named the problem exactly: *"you're exactly duplicating what populates
 * does with an extra step of dressing the agent."* True — the old
 * `wears` did `clone(path)` → `move(garment, self)`, which is
 * `applyProps` with the designation check missing, plus one slot
 * occupation. So it belongs beside the two lists it duplicates, in the
 * vocabulary they share.
 *
 * ⭐ And putting it on the rail fixes what being off it cost:
 *
 * - **A designation check.** `props:` throws on a `Behaved` entry and
 *   `cast:` throws on a non-`Behaved` one, because *the designation is
 *   declared and the class is the check*. `wears:` checked nothing:
 *   `costume: [/stuff/thing/rock]` cloned the rock, moved it into the
 *   person's hands, found no slot to claim and **said nothing** — so the
 *   row claimed a garment and the world got a carried rock.
 * - **A once-flag.** `wears` ran in `onCreate` and leaned on
 *   `wearGarments` being idempotent *by slot occupancy*, which is true
 *   of a real garment and false of anything that occupies no slot. A
 *   non-wearable entry was therefore re-cloned on **every** go-live
 *   re-hydrate: one rock per publish. The flag makes that structural
 *   rather than incidental.
 * - **Discoverability.** `props:` and `cast:` are documented in
 *   `persistence.md`; `wears:` was documented in a build plan that gets
 *   retired at the sweep, so an author would have had to read kernel
 *   source to learn it existed.
 *
 * ## ⚠ Why `costume` and not `wardrobe`
 *
 * *Wardrobe* was the ask, and it is taken: `lib/slot/Wardrobe.ts` is a
 * **player's saved named outfits** (`wear formal` in one command). The
 * theatre distinction is the one that resolves it — **wardrobe is the
 * department and its rail of sets; a costume is what a given character
 * wears in the show** — so `costume:` is the more precise word *and*
 * leaves the existing mixin more coherent rather than colliding with it.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from './Stuff';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import type { CastSpec } from './Staged';

/** A `costume` entry — the same shape as a cast entry. */
export type CostumeSpec = CastSpec;

export interface Costumed {
  /**
   * @hook Invoked by the `TemplateApplier`'s Phase-2 instruction dispatch from
   *   a template's `costume` field. **Instruction applier** — clothes
   *   the host. Throws on an entry whose class does not compose
   *   `Wearable` (a thing you carry is a prop, not a costume).
   *
   *   ⭐ Runs **once per instance**, the same guard discipline as
   *   {@link Propped.applyProps}.
   */
  applyCostume(specs: CostumeSpec[]): Promise<void>;

  /** Storage for the costume once-guard (public for the applier). */
  _costumeWorn: boolean;
}

export function CostumedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class CostumedMixin extends Base {
    static _mixinName: string = 'CostumedMixin';

    static fieldMeta: FieldMeta = {
      costume: { instruction: true, authorable: true, inherit: 'by-entry' },
      _costumeWorn: { persistent: true, runtimeState: true },
    };

    public _costumeWorn: boolean = false;

    /** Phase 2 applier for `costume:`. See {@link Costumed}. */
    async applyCostume(specs: CostumeSpec[]): Promise<void> {
      if (!Array.isArray(specs)) return;
      if (specs.length === 0) return; // opt-in: an absent costume is not a costume
      if (this._costumeWorn) return;

      // ⭐ The gate BEFORE anything is cloned, exactly as `stageList`
      // does it: a mis-filed entry is an authoring error at hydrate, not
      // a person holding a rock that nobody can explain.
      const { Template } = await import('./Template');
      const paths: string[] = [];
      const seenKeys = new Set<string>();
      for (const spec of specs) {
        const path = Template._entryTemplate(spec);
        if (path === null) continue;
        if ((spec as { count?: unknown })?.count !== undefined) {
          throw new Error(
            `CostumedMixin.applyCostume: '${path}' carries \`count\`. A ` +
              `count is a props feature; a person wears one of a thing.`,
          );
        }
        const as = typeof spec === 'string' ? undefined : spec.as;
        if (as !== undefined) {
          if (seenKeys.has(as)) {
            throw new Error(
              `CostumedMixin.applyCostume: two entries share \`as: ${as}\`. ` +
                `⚠ This is the exact shape that undresses somebody: an ` +
                `entry's \`as\` is the slot a child row replaces, so two ` +
                `of them have no answer.`,
            );
          }
          seenKeys.add(as);
        }
        paths.push(path);
        const tpl = await Template.findByPath(path);
        if (!tpl) {
          throw new Error(
            `CostumedMixin.applyCostume: '${path}' resolves to no ` +
              `template. A costume entry names a garment row.`,
          );
        }
        const cls = (await StuffApi.loadClassByPath(tpl.class)) as new (
          ...args: never[]
        ) => unknown;
        if (!MixinApi.hasMixin(cls, Mixins.Wearable)) {
          throw new Error(
            `CostumedMixin.applyCostume: '${path}' does not compose ` +
              `WearableMixin, so it cannot be worn. Something a person ` +
              `merely CARRIES is a prop, not a costume.`,
          );
        }
      }

      // The recipe is `Character.wearGarments` — one implementation, two
      // callers (this and the test-character mint), which is why it is a
      // method on the body rather than inlined here.
      await (
        this as unknown as {
          wearGarments(paths: readonly string[]): Promise<void>;
        }
      ).wearGarments(paths);
      this._costumeWorn = true;
    }
  };
}
