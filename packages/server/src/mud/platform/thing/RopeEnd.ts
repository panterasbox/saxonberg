/**
 * RopeEnd — ⭐ **the far end of a rope** (cordage D1): the `LineEnd` a
 * ROPE mints. It is everything a line's end is — held, tugged, tied to a
 * load — and one thing more: hanging down a drop from a rope tied off above,
 * it is the way UP (`ClimbableMixin`, D11). A hose's end is never a way up,
 * so this is its own class and not a guard on the line's end.
 */

import LineEnd from './LineEnd';
import { ClimbableMixin } from '../../lib/locomotion/Climbable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Exit from '../../lib/boundary/Exit';
import type { CommandContributions } from '../../api/command';
import Rope from './Rope';

export default class RopeEnd extends ClimbableMixin(LineEnd) {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['platform/cmd/inventory/tug.yaml', 'platform/cmd/inventory/tie.yaml'],
    // A hanging end at the bottom of a drop is climbed, by anybody there.
    peers: ['platform/cmd/inventory/untie.yaml', 'platform/cmd/movement/climb.yaml'],
  };

  /** The rope this is the end of, when it is one. */
  private rope(): Rope | null {
    const line = this.getLine();
    return line instanceof Rope ? line : null;
  }

  /** ⭐ Hanging down a drop, the end is the way UP to where the rope is tied. */
  public override getAxes(): readonly string[] {
    return this.rope()?.isHung() ? ['up'] : [];
  }

  public override canEngageAxis(direction: string): boolean {
    return this.getAxes().includes(direction);
  }

  /** A hanging end stays where it hangs: it is the rope, not a thing to pick up. */
  public override isFixedInPlace(): boolean {
    return super.isFixedInPlace() || (this.rope()?.isHung() ?? false);
  }

  /** @hook A climb up the rope from its end takes the same wear (D11). */
  public override async afterEnabledTraverse(actor: Stuff, direction: string, exit: Exit): Promise<void> {
    void direction;
    void exit;
    await this.rope()?.takeClimb(actor);
  }
}
