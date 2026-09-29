/**
 * Movable — the concrete twin of the substrate `Movable`.
 *
 * `lib/stuff/Movable` is the rung every carriable good inherits, and it is
 * substrate: **nothing instances `/lib/`** (`pnpm lint:instanceable`), so
 * no template may name it. But a good many shipped rows want exactly a
 * bare good and nothing more — an anvil, a folded hide, a stash pouch, a
 * crumpled ticket stub. They have no shared concept beyond being a thing
 * somebody can pick up and carry off; that IS the class.
 *
 * So this is the thin concrete subclass those rows name, the pattern
 * CLAUDE.md § "Instanceable Lives in `platform/<branch>/`" calls
 * *splitting the base*, and it shares the base's name as the default
 * there says it should.
 *
 * ⭐ Its immovable sibling is `platform/thing/Thing` — same shape, one rung
 * in, for a row that is part of the place rather than a good in it.
 */

import MovableBase from '../../lib/stuff/Movable';

export default class Movable extends MovableBase {}
