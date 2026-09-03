/**
 * Thing — the concrete twin of the substrate `Thing`.
 *
 * `lib/stuff/Thing` is the root every tangible object inherits, and it is
 * substrate: **nothing instances `/lib/`** (`pnpm lint:instanceable`), so
 * no template may name it. But six shipped rows want exactly a bare
 * `Thing` and nothing more — a toilet, an anvil, a folded hide, a stash
 * pouch, an offering bowl, a crumpled ticket stub. They have no shared
 * concept beyond being tangible; that IS the class.
 *
 * So this is the thin concrete subclass those rows name, the pattern
 * CLAUDE.md § "Instanceable Lives in `platform/<branch>/`" calls
 * *splitting the base*. Seven of its nine instances share the base's name
 * and alias the import (`Vessel`, `Exit`, `Biome`, `Material`, `NPC`,
 * `CartesianLocation`, `SingletonCartesianLocation`); this one is now the
 * eighth.
 *
 * ⚠ **It was called `Prop` and that name was a small lie.** It suggested
 * set-dressing — a theatrical prop, something there to be looked at — and
 * there is no `PropMixin`, no prop concept, nothing anywhere in the tree
 * that means "prop". The anvil is a working tool, the offering bowl is
 * load-bearing for the altar, and a name implying otherwise invited
 * exactly what happened to it: a catch-all nobody felt protective of, so
 * a spoilage gauge and a thermal model got hung on it to serve four rows
 * that belonged on `Provision`. **A class named for what it IS gets
 * defended; a class named "generic thing you don't care about" does
 * not.**
 */

import ThingBase from '../../lib/stuff/Thing';

export default class Thing extends ThingBase {}
