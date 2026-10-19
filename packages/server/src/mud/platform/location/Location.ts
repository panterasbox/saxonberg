/**
 * Location — you FILL a location (one of many laid out to a plan); you
 * VISIT a locale. The instanceable face of the grid location.
 *
 * ⭐ **Not singleton, and that is the default on purpose.** The mixin
 * SUBTRACTS: a class without `SingletonMixin` backs singleton templates
 * perfectly well (`StuffApi.singleton(path)` get-or-creates, which is how
 * an eager exit resolves its destination), while a class WITH it can back
 * ONLY singleton templates, because `clone()` throws after the first. So
 * the permissive class holds the unmarked name and
 * {@link Locale} is the one that opts in.
 *
 * Use this for a row that describes a **kind** of place minted many
 * times: nine reaches of one lane, a landing per occupied floor, the
 * archetype scaffold's bare venue. Each instance carries its own
 * coordinates and its own minted identity (`asIdentityPath`, D17) —
 * which is also what makes them distinguishable in the registry.
 *
 * Use `Locale` where one row IS one place (the
 * Registry office, a crossing): the guard then catches a second
 * `clone()` that would otherwise silently produce two of them.
 *
 * ⚠ **It keeps no record**, and before it existed that was the problem.
 * The only multi-instance location in the game was `PersistentLocation`, so
 * anything minted many-times-from-one-row had to be one — and
 * `PersistentLocation` is `Persistable`. `cleanupOnDestruct` fires with
 * `scope = getTemplatePath()`, so every reap wrote a `holder_snapshots`
 * row, and every landing in a building shared ONE scope: write-only
 * records nothing read back, on a path that reaps constantly by design.
 *
 * A minted location needs no record: its fixtures come from its row on
 * every mint (`Staged`), and anything a PLAYER leaves there is
 * chattel, which persists owner-side against the owner's estate.
 * `PersistentLocation` — the interior somebody furnishes, whose contents
 * must survive — extends THIS and adds `Persistable` back.
 *
 * ⚠⚠ **It EXTENDS the lib class; it must never re-compose the mixin
 * stack.** The two compositions are identical, which is exactly the
 * trap: re-listing the mixins produces a class that looks right, type-
 * checks, passes every test, and has silently dropped
 * `Location.addExit` — the cardinal-only-intra-zone rule. This
 * class shipped that way briefly. The rule is what guarantees a grid
 * exit has a known inverse, and it is load-bearing at Hinkley (the
 * `lots` zone exists to satisfy it), so losing it on the MINTED road
 * reaches while the AUTHORED lane still enforced it meant one street
 * checked the invariant at one end and not the other. Same-name split
 * (`NPC`, `Vessel`, `Exit`, `Material`, `Biome`): the lib class is the
 * behaviour, this is the instanceable face, and the face adds nothing.
 */

import LocationBase from "../../lib/location/Location";

export default class Location extends LocationBase {}
