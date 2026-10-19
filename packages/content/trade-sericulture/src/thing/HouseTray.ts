/**
 * HouseTray — a rearing tray that is a FIXTURE of a silk house: one row,
 * one tray, and ⭐ a rearing that survives a restart.
 *
 * A tray a player buys is a chattel good and rides its owner's estate
 * wherever they leave it. A house's trays stand in a room no player owns,
 * so they persist themselves — the forestry `Panel`'s shape (a prop in a
 * transient room that must remember being worked).
 */

import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import RearingTray from './RearingTray';

export default class HouseTray extends PersistableMixin(SingletonMixin(RearingTray)) {
  static fieldMeta: FieldMeta = {};
}
