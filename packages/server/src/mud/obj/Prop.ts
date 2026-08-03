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
 * you need. See docs/plans/lib-obj-taxonomy-plan.md §2.2.
 */

import Thing from '../lib/stuff/Thing';

export default class Prop extends Thing {}
