/**
 * PlantableCrop — a crop that is also what its plant is grown from.
 *
 * ⭐ Threshed grain is seed. A farmer keeps back part of the harvest and
 * sows it, so a sack of wheat off the field goes into `sow wheat at
 * <patch>` as it is, at the crop's own seed rate, and the same sack is
 * still food and still milled. Eat it or sow it is the oldest decision on
 * a farm, and it is made with the one good. Cut cane is the same shape: a
 * field is planted by laying lengths of stalk in the furrow, so the bundle
 * a cutter carries to the mill is what a planter lays in a fresh-ploughed
 * piece (cover build D15).
 *
 * ⚠ Not every crop: an apple or a turnip is eaten, not sown. A row is a
 * `PlantableCrop` only when its harvest really is its planting stock, and
 * it says what it grows into with `growsIntoPath`. Bought seed (`Seed`)
 * stays for the pot and for whoever has no harvest to keep back.
 *
 * Kernel, not a pack's: the sugar and farming trades both compose it and
 * neither depends on the other. See docs/subsystems/smallholding.md.
 */

import Crop from './Crop';
import { PlantableMixin } from '../../lib/husbandry/Plantable';

export default class PlantableCrop extends PlantableMixin(Crop) {}
