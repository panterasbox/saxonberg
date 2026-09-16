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
import type { CommandContributions } from '../../../api/command';

const LauncherBase = LauncherMixin(Weapon);

export default class Launcher extends LauncherBase {
  /**
   * ⭐⭐ **Carrying a launcher is what gives you `shoot`.**
   *
   * ⚠⚠ **The live drive found this missing, and nothing else could
   * have.** `help shoot` answered perfectly — the view was on disk and
   * the help system reads views — the controller's unit tests passed,
   * the seed row existed, and typing `shoot` still returned *"I don't
   * understand 'shoot'."* A verb with no affordance is conferred on
   * nobody, and every other check in the build reads green through it.
   *
   * `environment` is the OUTWARD bucket: it grants to the containers
   * ABOVE the thing, which is why a rock in a bag in your pack still
   * hands you `throw`. A bow in your hand — or in your pack — hands you
   * `shoot`, and putting it down takes it away again. (`peers`, the
   * sideways bucket, is for a fixture you stand at, like a basin.)
   */
  static commandContributions: CommandContributions = {
    environment: ['platform/cmd/combat/shoot.yaml'],
  };
}
