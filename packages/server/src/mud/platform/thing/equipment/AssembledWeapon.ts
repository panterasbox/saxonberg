/**
 * AssembledWeapon — a weapon made of parts — a forged head on a haft (spear, mace, warhammer, flail). A blow jars the haft; a split haft is replaced and the head kept.
 *
 * ⭐ Its own class, not `AssembledMixin` on `Weapon`: most weapon rows
 * have no parts, and a mixin every instance does not need is the
 * antipattern the base-class narrowing removed. `lint:bills` holds both
 * directions: a class that composes `AssembledMixin` has a bill on every
 * row, and a row with a bill names such a class.
 */

import Weapon from './Weapon';
import { AssembledMixin } from '../../../lib/craft/Assembled';

const AssembledWeaponBase = AssembledMixin(Weapon);

export default class AssembledWeapon extends AssembledWeaponBase {}
