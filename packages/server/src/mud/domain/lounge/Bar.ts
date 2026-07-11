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
import { TabMixin } from '../../lib/banking/Tab';

// `PopulatesMixin` lets the bar stock itself declaratively from the seed's
// `populates:` list on hydration — the crafting fixtures (back-bar, bottles
// + tools placed `onto` it, the menu) and the cast (each NPC a non-singleton
// clone moved in), all fresh each boot (transient runtime). The bar is
// otherwise a plain room: crafting is location-agnostic, so there is NO
// venue mixin — "Dave's Bar" is emergent from the matter and the maker
// present in it. See docs/subsystems/behavior.md and crafting.md.
// `TabMixin` makes the bar the house that extends credit: the tab is the
// establishment's receivable, owned by the venue Location so it outlives
// shift changes (see docs/subsystems/banking.md). It is purely the additive
// credit layer — the bar still receives pay-as-you-go through its account +
// the priced Menu; the tab lights up only because this venue extends credit.
const BarBase = SingletonMixin(
  PostRegistrationMixin(
    PopulatesMixin(
      TabMixin(ExitableMixin(DetailedMixin(VisibleMixin(Location)))),
    ),
  ),
);

export default class Bar extends BarBase {
  static persistentFields: string[] = [];

  public override async postRegister(_context?: unknown): Promise<void> {
    this.verifyOutboundExits();
    // The bar's Business is NOT stood up here. It stands up lazily, derived
    // from its own `operatingLocations` (this room), on the first order
    // (`OrderController` → `EmploymentApi.ensureOperatorAt`). No standup hook.
  }
}
