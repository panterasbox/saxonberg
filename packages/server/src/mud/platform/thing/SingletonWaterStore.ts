/**
 * SingletonWaterStore — **a store a premises cites by its row** (water-supply
 * D1/D5): one tank, one row, one instance. A fixture loads the supply its
 * premises cites with `StuffApi.singleton(path)`; the room that props the
 * tank later ADOPTS that instance (`StagedMixin.applyProps` routes a
 * Singleton class through `singleton()`) instead of minting a second. A
 * generic butt row propped in twenty rooms is a plain {@link WaterStore} and
 * cannot be cited — there is no "the" butt.
 *
 * Staged, like its base: the lounge's cistern reverts with its room.
 */

import { SingletonMixin } from '../../lib/stuff/Singleton';
import WaterStore from './WaterStore';

export default class SingletonWaterStore extends SingletonMixin(WaterStore) {}
