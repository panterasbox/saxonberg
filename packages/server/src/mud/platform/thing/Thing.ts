/**
 * Thing — the generic concrete `Thing`, and it is called what it is.
 *
 * `lib/stuff/Thing` is substrate: the root every tangible object inherits
 * from, with 21 subclasses. It is not itself content, and **nothing
 * instances `/lib/`** — so a row for an object that needs no behaviour
 * beyond being a thing you can see, take and carry needs somewhere
 * concrete to land. This is that place.
 *
 * ⚠ It adds nothing and is meant to add nothing. The split is a
 * PLACEMENT fact, not a behavioural one: `lib/` holds what is only ever
 * inherited, `platform/<branch>/` holds what a template may name, and
 * this class is the second half of a base that has to be both.
 *
 * ⭐ It shares its base's name **deliberately**, like the other eight
 * splits (`platform/agent/NPC`, `platform/thing/Vessel`,
 * `platform/idea/Exit`, `platform/idea/Biome`, …): the import aliases
 * it, and the module registry keys on class identity rather than on
 * name. Two names for one thing is the confusion, not the fix — this was
 * called `Prop` until somebody asked what it did that `Thing` did not.
 * The answer was "nothing", and the word was wanted elsewhere:
 * `PopulatesMixin` spends it on `props:` (the set dressing) against
 * `cast:` (who is there), which is the theatre sense and the one worth
 * keeping.
 *
 * See CLAUDE.md § Instanceable Lives in `platform/<branch>/`.
 */

import ThingBase from '../../lib/stuff/Thing';

export default class Thing extends ThingBase {}
