/**
 * Launcher — the instanceable weapon that shoots: a bow, a crossbow, a
 * musket.
 *
 * `LauncherMixin(Weapon)` and nothing else. The mixin's own header
 * explains why it is here rather than on `Weapon`: a knife does not
 * launch, and claiming otherwise would put a muzzle speed on every blade
 * in the game and a guard on every read of it.
 *
 * ⭐ It is still a `Weapon`, so a bowstave has a melee profile and can be
 * swung — which is true, and is also what keeps `lint:inert-weapon`
 * satisfied without a special case.
 */

import Weapon from './Weapon';
import { LauncherMixin } from '../../../lib/combat/Launcher';

const LauncherBase = LauncherMixin(Weapon);

export default class Launcher extends LauncherBase {}
