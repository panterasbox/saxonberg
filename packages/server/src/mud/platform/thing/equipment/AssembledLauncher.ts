/**
 * AssembledLauncher — a launcher made of parts — a yew stave, horn nocks, and a string that is the WEAR part (the hunting bow). The string is re-strung alone.
 *
 * ⭐ Its own class, not `AssembledMixin` on `Launcher`: most launcher rows
 * have no parts, and a mixin every instance does not need is the
 * antipattern the base-class narrowing removed. `lint:bills` holds both
 * directions: a class that composes `AssembledMixin` has a bill on every
 * row, and a row with a bill names such a class.
 */

import Launcher from './Launcher';
import { AssembledMixin } from '../../../lib/craft/Assembled';
import type { CommandContributions } from '../../../api/command';

const AssembledLauncherBase = AssembledMixin(Launcher);

export default class AssembledLauncher extends AssembledLauncherBase {
  /**
   * ⚠ Restated: a class's own `commandContributions` is read up the
   * prototype chain, so the mixin's would SHADOW Launcher's — and carrying
   * a launcher is what gives you `shoot`. (The mixin's own verbs are
   * collected from the mixin chain regardless.)
   */
  static commandContributions: CommandContributions = Launcher.commandContributions as CommandContributions;
}
