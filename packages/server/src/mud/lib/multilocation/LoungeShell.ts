/**
 * LoungeShell — a singleton external-neighbor room shell adjacent to the
 * lounge host (Dave's Bar in v1).
 *
 * Distinct from `LoungeRoom`: a shell is NOT a Warren member — it is never
 * cloned, budded, drained, or reaped. It is a persistent singleton room
 * one exit off the host, wired by `LoungeWarren.wireHostFixtures` when the
 * host is designated or migrated. v1 ships it as a bare shell (description
 * + the back-exit to the host); Dave the NPC, drinks, `sit`, and the menu
 * are deferred.
 *
 * A plain zone-less Exitable/Visible/Detailed `Location`. `SingletonMixin`
 * pins it to one instance per path (the host-fixture wiring resolves it via
 * `StuffApi.singleton`).
 */

import Location from '../stuff/Location';
import { VisibleMixin } from '../description/Visible';
import { DetailedMixin } from '../description/Detailed';
import { ExitableMixin } from '../boundary/Exitable';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { SingletonMixin } from '../stuff/Singleton';

const LoungeShellBase = SingletonMixin(
  PostRegistrationMixin(ExitableMixin(DetailedMixin(VisibleMixin(Location)))),
);

export default class LoungeShell extends LoungeShellBase {
  static persistentFields: string[] = [];

  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
  }
}
