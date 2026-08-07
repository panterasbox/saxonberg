/**
 * Desk — a dorm's work surface. A university-owned in-room fixture
 * (invariant, respawned from template), seeded into each `DormRoom` via its `populates:` data (the spine's
 * seed-once). A work surface; no `Named`.
 *
 *   Surfaced → Detailed → Thing
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { SurfacedMixin } from '../../../lib/spatial/Surfaced';
import type { CommandContributions } from '../../../api/command';
import type { FieldMeta } from '../../../lib/mixin';

const DeskBase = SurfacedMixin(DetailedMixin(Thing));

export default class Desk extends DeskBase {
  static fieldMeta: FieldMeta = {};

  /**
   * The desk carries the room's personalization surface: while you're in
   * your dorm (with your desk), `remodel` lights up. The commit
   * is lease-gated in the controller; a fixture is the affordance carrier
   * (a container doesn't afford its own verbs to occupants — a co-located
   * sibling does), the Menu-in-the-room precedent.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['domain/eternal/duncan-hall/cmd/remodel.yaml'],
    environment: [],
  };
}
