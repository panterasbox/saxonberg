/**
 * Hall — ⭐ **one particular interior**: the bathhouse's baths, the ward,
 * the banking hall, a cellar. You VISIT a hall the way you visit a locale;
 * you fill a {@link Room}.
 *
 * The medieval house was *the hall and the chambers* — the one great room
 * you went to, and the many behind it — which is the Locale/Location split
 * said of interiors. A hall is a `Room` that opts into one live instance
 * per row (`SingletonMixin`), exactly as `Locale` is a `Location` that
 * does: plumbed, and roofed in its walls unless its row says otherwise.
 */

import Room from './Room';
import { SingletonMixin } from '../../lib/stuff/Singleton';

export default class Hall extends SingletonMixin(Room) {}
