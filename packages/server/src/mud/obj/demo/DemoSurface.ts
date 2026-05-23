/**
 * DemoSurface — generic showcase Surfaced Thing.
 *
 * Mirror of `DemoItem` plus the `Surfaced` and presentation mixins
 * needed for the `put X on Y` proof: a tangible Thing players can
 * see, name, and look at, that also supports items resting on top.
 * `Container` is deliberately NOT composed — a simple table holds
 * nothing inside, just supports items above. A future
 * desk-with-drawer variant would compose both Container (for the
 * drawer) and Surfaced (for the top) independently.
 *
 * `obj/demo/` is the temporary holding area for substrate-
 * demonstration content; see `DemoItem.ts` for the full caveat.
 */

import { Thing } from '../../lib/stuff/Thing';
import { NamedMixin } from '../../lib/description/Named';
import { VisibleMixin } from '../../lib/description/Visible';
import { DetailedMixin } from '../../lib/description/Detailed';
import { SurfacedMixin } from '../../lib/spatial/Surfaced';

export class DemoSurface extends SurfacedMixin(
  DetailedMixin(VisibleMixin(NamedMixin(Thing))),
) {}
