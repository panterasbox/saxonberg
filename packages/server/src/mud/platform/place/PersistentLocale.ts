/**
 * PersistentLocale — ONE particular place whose state outlives the process
 * (cleanliness D31a): a `Locale` that is kept.
 *
 * ⭐ The place taxonomy (decided 2026-10-18 — `docs/subsystems/location.md`
 * § The place taxonomy; the rename is `place-taxonomy-slate`): every place
 * is a `Place`; a **Locale** is ONE particular place (one row = one place —
 * you VISIT a locale) and a **Location** is one of MANY laid out to a plan
 * (you FILL a location); either may be `Persistent`. Cartesian is the
 * default and unprefixed; spherical places say so (`SphericalLocale`,
 * `SphericalLocation`). This is the kept Locale — the cookhouse, the
 * chandlery, the lavoir, the bathhouse.
 *
 * A place that is KEPT — a floor mucked out or let go, a flue swept or
 * not, a tub of hot water, the soap curing on the chandlery's rack — has
 * state an act made, and a restart that forgets it is the fiction
 * betraying itself. So this is the singleton with `PersistableMixin`
 * outermost: ONE row, ONE place, ONE `holder_snapshots` record keyed by
 * its template path. `StuffApi.singleton` already restores it (or seeds
 * its `props:` and captures the first record). Props capture as unstamped
 * contents with their fields; chattel persists owner-side; cast is
 * transient and re-seeded; the air's contents (dust, fumes) ride the
 * place's own runtime state; and the fixtures' runtime state — the floor's
 * soil — rides `AdornableMixin`'s fixture slice.
 *
 * ⛔ Not the kept LOCATION (today `PersistentLocation`): that is one of many,
 * minted per row and keyed per holding. A locale is authored once, on a
 * grid. A kept locale with substrate of its own (`Wood`, the quarries)
 * composes `PersistableMixin` outermost over its own stack the same way.
 */

import Locale from './Locale';
import { PersistableMixin } from '../../lib/persistence/Persistable';

export default class PersistentLocale extends PersistableMixin(
  Locale,
) {}
