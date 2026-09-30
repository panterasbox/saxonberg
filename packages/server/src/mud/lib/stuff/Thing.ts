/**
 * Thing — the matter root: what is *in a place and made of something*.
 *
 * Composition:
 * `WetMixin(VisibleMixin(DetailedMixin(PerceptibleMixin(TangibleMixin(ContainableMixin(Stuff))))))`.
 *
 * Things are the physical-object branch: they're contained somewhere,
 * made of material, describable (Visible), and referenceable by
 * keyword (Perceptible). The presence-by-default of Visible /
 * Perceptible is the structural claim — *dynamic* invisibility
 * (illusion, concealment, darkness) is the perception subsystem's job
 * later. A Thing whose `getLong` happens to return empty is still
 * structurally a Thing.
 *
 * ⭐⭐ **`Thing` is matter; a GOOD is `Good`.** Until 2026-09-29 this
 * root also composed `ChattelMixin` and `ConcealableMixin`, which made
 * every floor, hearth, counter and yard wall in the game claim it could
 * be *owned* and *hidden*. Those two are what it means to be **carried
 * off**, so they moved one rung out to `lib/stuff/Good` — see its
 * docstring for the line. The test, and it is the project's own: **if an
 * immovable class needs a guard like `if (MixinApi.isChattel(this))` to
 * behave, it belongs on `Good`** — that is a finding to write down,
 * never a guard to add.
 *
 * The root's seven were measured against the owner's criterion — *strip
 * it to the bare bones; a mandatory mixin tells you the whole branch
 * wants it.* `Visible` (597/599 rows) and `Perceptible` (598/599) are
 * mandatory because the branch says so; `Tangible`, `Containable` and
 * `Wet` are mandatory by concept (a thing is made of something, is
 * somewhere, and stands in the weather); `Detailed` goes wherever
 * `Perceptible` goes, because a thing you can address by keyword has
 * parts that can be addressed the same way.
 *
 * `NamedMixin` is deliberately NOT defaulted here — names are for
 * *proper names* (Excalibur the sword, Bob the shopkeeper), not
 * generic descriptions. A "brass thermometer" is just a Thing with a
 * short description, no name.
 *
 * ⭐ **And the agent branch follows the same rule now.** This paragraph
 * was true of `Thing` and false of `Creature` for the life of the
 * project — the creature base composed `NamedMixin`, so every body in
 * the game carried name-shaped surface. Fixed 2026-09-10: `CastMixin`
 * and `Avatar` compose it, and nothing else does by inheritance.
 *
 * If you genuinely need a physical-shaped object that opts out of
 * Visible OR Perceptible, that's a sign you want a different branch
 * (Idea for pure state holders) or you should extend Stuff directly
 * — the rare escape hatch.
 *
 * Provides (composed in):
 * - environment, container management (ContainableMixin)
 * - material refs (TangibleMixin)
 * - keyword pool, MQL matching (PerceptibleMixin)
 * - named parts and their metadata (DetailedMixin)
 * - description machinery — getShort/getLong (VisibleMixin)
 * - a material-driven wetness gauge (WetMixin)
 * - runtimeId, destroyed (Stuff)
 */

import { Stuff } from './Stuff';
import { ContainableMixin } from '../spatial/Containable';
import { TangibleMixin } from '../material/Tangible';
import { PerceptibleMixin } from '../description/Perceptible';
import { DetailedMixin } from '../description/Detailed';
import { VisibleMixin } from '../description/Visible';
import { WetMixin } from '../wetness/Wet';
import type { FieldMeta } from '../mixin';

// DetailedMixin composes immediately outside PerceptibleMixin because the
// two answer one question: a thing addressable by keyword has PARTS
// addressable by keyword. `Detailed` is no longer just descriptive strings
// — it is the access path to per-part metadata (a part's own material, its
// own feel), and you must compose it to reach any of that. 78 Thing-branch
// classes used to wrap it themselves; the root carries it now.
//
// WetMixin gives every Thing a material-driven wetness gauge (inert until
// wetted). Composition order among the additive attribute mixins is moot.
//
// ⚠ **`FreshnessMixin` is deliberately NOT here.** It shipped on this base
// for one review round and put five spoilage methods — `getMicrobialLoad`,
// `getFreshnessBand`, `isPerishable`, `setMicrobialLoad`,
// `reconcileFreshness` — on the documented author surface of all 152 Thing
// classes. A rock does not need a microbial load, and
// `callable == visible == cared-about` says so.
//
// ⭐ It lives on **`Provision`**, and only there — the one class in the
// library that IS food by name. The narrowing went via the concrete
// `platform/thing/Thing` first (then named `Prop`), which was wrong for a
// reason worth keeping: that class is the generic concrete twin of THIS
// one, deliberately empty, so hanging a gauge on it taxes the anvil and
// the toilet to serve four rows that were simply on the wrong class.
// `prime-cut` sat in the same pantry chest as `stew-meat` and was already
// a `Provision`; the fix was to move the rows, not to widen a class.
//
// ⚠⚠ Narrowing it is only safe because a GATE replaces the coverage:
// `pnpm lint:perishable` fails CI when a row's `_materialPath` names a
// material that rots and its class cannot. Without that, food authored
// onto an inert class would simply never spoil, silently — the failure
// mode this build hit twice by other routes.
const ThingBase = WetMixin(
  VisibleMixin(
    DetailedMixin(PerceptibleMixin(TangibleMixin(ContainableMixin(Stuff)))),
  ),
);

export default class Thing extends ThingBase {
  static fieldMeta: FieldMeta = {};

  constructor() {
    super();
  }
}

// Self-register as a top-level branch (the one sanctioned module-scope
// self-registration — see `Stuff._registerTopLevelBranch` for why the
// hierarchy's root invariant must populate at branch-module load, and
// `scripts/check-module-scope.ts`'s allowlist).
Stuff._registerTopLevelBranch(Thing);
