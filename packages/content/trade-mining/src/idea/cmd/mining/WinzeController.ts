/**
 * WinzeController — the shared vertical half of {@link DriveController}.
 *
 * A base class only (no YAML names it), holding the one thing `sink` and
 * `raise` add to a level heading: ⭐ **a winze is climbed, not walked**,
 * so the fresh exit pair admits the vertical medium. `climb` and
 * `ClimbableMixin` already ship — winzes need no new locomotion, only an
 * edge declaring what it is.
 *
 * ⚠ It says so with a VALUE rather than by overriding a hook the
 * completion calls back into. The controller is ephemeral and the
 * engagement is not: by the time a heading breaks through, the object
 * that started it has been destructed, and a method on it is a no-op.
 * So the medium is read at DISPATCH time and carried into the closure.
 */

import DriveController from './DriveController';

/** The medium a vertical edge admits — `climb`'s own, off its shipped row. */
const VERTICAL = 'vertical';

export abstract class WinzeController extends DriveController {
  protected override edgeMedium(): string | null {
    return VERTICAL;
  }
}
