/**
 * TitledRoom — **a room that stands on ground somebody holds title to**,
 * and remembers what is in it.
 *
 * The generic counterpart of `DormRoom`. Both are rooms whose contents
 * belong to a player, so both must be persistence hosts; the dorm's is a
 * Warren member with a floor and a corridor, and this one is tied to none
 * of that. A yard behind a house, a shopfront, a dock — whatever a
 * `LotHolder` stands up when a lot is sold.
 *
 * ## Why it has to exist
 *
 * A plain `CartesianLocation` is **not persistable**, so nothing it holds
 * would survive a reload and `PersistableApi.restoreOrSeed` throws on it
 * outright. This is that class plus the host mixin, and nothing else — it
 * deliberately does NOT rebuild the stack by hand, because
 * `CartesianLocation` carries six overrides beyond its mixins
 * (`getSizeScale` = the zone's `cellSize²` light denominator, `getZone`,
 * `getVolume`, `getCeilingHeight`, exit reciprocity in `addExit`, and the
 * `coords` field itself). A hand-built lookalike silently loses all of
 * them, and the light one is the dangerous omission: the yard would read
 * 36× brighter than its zone says.
 *
 * ## It stays SINGLETON, and that is the point
 *
 * `CartesianLocation` composes `SingletonMixin` — one live instance per
 * templatePath — because "a cartesian room is uniquely identified by its
 * template path". Keeping it is what forces each titled room to have an
 * **identity of its own** rather than N clones sharing one path.
 *
 * `LotHolder` mints that identity through `StuffApi.clone`'s
 * `asTemplatePath` channel (the identity doctrine: *templatePath =
 * identity, instance for minted singletons with scheme-derived keys*), so
 * lot 2's yard is `<lotExtent>/yard` and lot 3's is its own. The singleton
 * guard checks the IDENTITY path, so distinct lots never collide.
 *
 * Three things fall out of that, and each was a defect under the
 * shared-template shape:
 *
 *   1. **Land use resolves per lot** from the path alone — the parcel
 *      walk finds the lot's own row rather than the district's.
 *   2. **An avatar's captured placement is exact.** `capturePlacement`
 *      records `container: <templatePath>`, so logging out in your own
 *      yard and back in returns you to YOUR yard, not a freshly cloned
 *      one. The dorm needs a Warren to achieve this; a minted identity
 *      gets it for free.
 *   3. **Persistence needs no key.** The scope is already unique.
 *      `restoreOrSeed` still supplies the seed-vs-restore branch.
 *
 * See [docs/subsystems/smallholding.md] and
 * [docs/subsystems/persistence.md].
 */

import CartesianLocation from "../lib/location/CartesianLocation";
import { PersistableMixin } from "../lib/persistence/Persistable";

// PersistableMixin OUTERMOST — the documented host rule: its
// `cleanupOnDestruct` must fire before any inner evacuation, and its
// `applyPopulates` override must wrap `Populates`.
const TitledRoomBase = PersistableMixin(CartesianLocation);

export default class TitledRoom extends TitledRoomBase {
  static persistentFields: string[] = [];
}
