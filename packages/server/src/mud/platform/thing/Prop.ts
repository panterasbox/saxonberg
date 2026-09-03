/**
 * Prop — the generic concrete `Thing`.
 *
 * `Thing` is substrate: the root every tangible object inherits, with
 * 21 subclasses. It is not itself content. But eleven templates cloned
 * it directly for objects that need no behavior beyond being a thing
 * you can see, take and carry — gutter litter, a stack of rations, an
 * anvil, a toilet.
 *
 * Those templates name this class instead. `Thing` keeps its job as the
 * inheritance root; `Prop` is the thing you clone when a prop is all
 * See CLAUDE.md § Instanceable Lives in `obj/`.
 */

import Thing from '../../lib/stuff/Thing';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { FreshnessMixin } from '../../lib/material/Freshness';

/**
 * ⭐ **Thermal, because a prop is often food.** The stew-meat, root-
 * vegetable and ration-stock rows are all `Prop`s, and a food's spoilage
 * gauge asks its host what temperature it is — a cold larder and a warm
 * windowsill have to be different answers or preservation is not a
 * subject. Thermal is reconcile-on-read and costs nothing until something
 * reads it, so the anvil and the toilet carry it unharmed.
 */
// ⭐ …and `Freshness` for the same reason, because it is the same rows:
// `Prop` is where the library's discrete perishable matter lives (stew
// meat, root vegetables, ration stock) — one of only TWO classes that do.
// It is not on `Thing`, so a rock has no microbial load; `lint:perishable`
// is what makes that narrowing safe (see `lib/stuff/Thing.ts`).
const PropBase = FreshnessMixin(ThermalMixin(Thing));

export default class Prop extends PropBase {}
