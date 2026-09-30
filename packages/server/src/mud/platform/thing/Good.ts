/**
 * Good — the concrete twin of the substrate `Good`.
 *
 * `lib/stuff/Good` is the rung every ownable thing inherits, and it is
 * substrate: **nothing instances `/lib/`** (`pnpm lint:instanceable`),
 * so no template may name it. But a good many shipped rows want exactly
 * a bare good and nothing more — an anvil, a folded hide, a stash
 * pouch, a crumpled ticket stub. They have no shared concept beyond
 * being a discrete article somebody could own; that IS the class.
 *
 * So this is the thin concrete subclass those rows name, the pattern
 * CLAUDE.md § "Instanceable Lives in `platform/<branch>/`" calls
 * *splitting the base*, and it shares the base's name as the default
 * there says it should.
 *
 * ⭐ Its counterpart is `platform/thing/Thing` — the same shape one
 * rung in, for a row that is part of the place rather than an article
 * in it.
 */

import GoodBase from '../../lib/stuff/Good';

export default class Good extends GoodBase {}
