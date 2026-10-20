/**
 * PermanentBed — ⭐ **a bed that is a fixture of its place, and remembers
 * what grows in it.**
 *
 * A plain `GardenBed` is a good: you buy one, it rides your estate. A bed
 * that belongs to a PLACE — an orchard's row, a coppice panel, a silk
 * house's mulberry walk — is propped by a room, and a room rebuilds its
 * props every boot: a bed of trees cut yesterday came back full after a
 * restart, a crop through `restart`. This is the bed that does not.
 *
 * `PersistableMixin(SingletonMixin(GardenBed))`:
 * - **`GardenBed`** — the same ground as every bed: soil with its own
 *   checkpoints, N plant slots, the cultivation verbs. Nothing here
 *   changes how anything grows.
 * - **`SingletonMixin`** — one row is one bed. A room's `props:` mints a
 *   singleton through `StuffApi.singleton`, the one path that
 *   restores-or-seeds a keyless persistable: restore when a record
 *   exists, else seed the born-with plants and capture the first record.
 * - **`PersistableMixin`** OUTERMOST — the host rule (its cleanup runs
 *   before the inner container evacuates; its `applyProps` wraps the
 *   bed's so the plants are seeded exactly once). The plants are keyed
 *   nested hosts in the bed's container slice, so a harvested tree comes
 *   back harvested, its fill still running.
 *
 * ⭐ Promoted out of forestry (silk build, 2026-10-18): this stack WAS the
 * forestry `Panel`, and the silk house's mulberry walk wanted it — trees
 * cropped for leaf, in an ordinary place, that must remember being cut.
 * Forestry and the silk trade share no pack ancestor, so the substrate is
 * the kernel's, beside the `GardenBed` it extends. The `Panel` is now this
 * bed plus what is forestry's own: the stool's ready line, `fell`, and the
 * woodland deed.
 */

import GardenBed from './GardenBed';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import type { FieldMeta } from '../../lib/mixin';

export default class PermanentBed extends PersistableMixin(SingletonMixin(GardenBed)) {
  static fieldMeta: FieldMeta = {};
}
