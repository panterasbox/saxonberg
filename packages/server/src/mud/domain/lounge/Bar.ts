/**
 * Bar — Dave's Bar, the singleton room one exit north of the lounge host.
 *
 * NOT a Warren member: never cloned, budded, drained, or reaped. A
 * persistent singleton room; the Warren wires the back-exit (south, to
 * the host) when it designates or migrates the host, so that exit is NOT
 * declared in the seed. v1 ships it as a bare shell (description + the
 * back-exit); Dave the NPC, drinks, `sit`, and the menu are deferred.
 *
 * A plain zone-less Exitable/Visible/Detailed `Location`. `SingletonMixin`
 * pins it to one instance per path (the host-fixture wiring resolves it
 * via `StuffApi.singleton`).
 */

import Location from '../../lib/stuff/Location';
import { VisibleMixin } from '../../lib/description/Visible';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ExitableMixin } from '../../lib/boundary/Exitable';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { PopulatesMixin } from '../../lib/stuff/Populates';
import { SingletonMixin } from '../../lib/stuff/Singleton';

// `PopulatesMixin` lets the bar spawn its cast (the `populates:` list in
// bar.yaml) into itself on hydration — each NPC is a non-singleton clone
// moved in. See docs/subsystems/behavior.md.
const BarBase = SingletonMixin(
  PostRegistrationMixin(
    PopulatesMixin(ExitableMixin(DetailedMixin(VisibleMixin(Location)))),
  ),
);

export default class Bar extends BarBase {
  static persistentFields: string[] = [];

  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }
}
