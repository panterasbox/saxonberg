/**
 * Engine bootstrap manifest — what the engine clones at server start
 * BEYOND what the content packs declare.
 *
 * TRANSITIONAL (content-packs wave 3): every pack's `boot:` list is
 * unioned with this array by `BootstrapManager.run`; the platform pack
 * took the registries, catalogues and the Compact's two organizations;
 * the corpo packs took their charts.
 * What remains here is what `world-seed` (step 7) takes next, after which this file is deleted. A path present
 * both here and in a pack's list is the duplicate error — each move is
 * one atomic edit.
 *
 * The `BootstrapEntry` shape is owned by `BootstrapManager` (the
 * consumer); we import the type from there so this file stays pure
 * data.
 */

import type { BootstrapEntry } from '../backend/BootstrapManager';

export const bootstrapManifest: BootstrapEntry[] = [
  // Lounge TPA terminal — the eager root of the Teleport Authority
  // network. Its `postRegister` self-seats into the lounge Warren's host
  // (standing the lounge host up) and cascades the rest of the network
  // (University Avenue node + room) live off this one seed via
  // `armNetwork()`. The terminal is a `FixtureMixin` that re-seats on host
  // migration, so the warren no longer hand-seats it. Without this entry
  // nothing instantiates the cascade root and the network never stands up.
  { templatePath: '/domain/lounge/terminal' },
  // Duncan Hall dorms Warren — the elastic two-tier dorm manager. Boot-warmed
  // so its `postRegister` installs the lobby's `up` FloorStairExit and rebuilds
  // the sync floor-reachability cache from the durable unit-parcel slot set.
  // The building starts as just the lobby and grows on provisioning; rooms /
  // corridors / doors reconstitute lazily on entry. It faults in the lobby
  // singleton itself, so no dependsOn.
  { templatePath: '/domain/eternal/duncan-hall/dorm-warren' },
  // Hinkley Hills' plat book + its provisioner. Boot-warmed because the
  // `title` verb ENUMERATES live books (`world:[class.PlatBook]`) rather
  // than naming one, so a book that is only a row in `domain` is a book
  // nobody can buy from: `title list` reads "the plat book is empty" and
  // every lot is unreachable. The holder is warmed with it because the
  // book names it by path and a sale resolves it at that moment.
  //
  // Nothing else pulls these in — a subdivision has no room that
  // `populates:` its own catalogue, which is exactly why they need to be
  // here rather than cascading like the Terminus hub does.
  { templatePath: '/domain/terminus/hinkley-hills/plat-book' },
  { templatePath: '/domain/terminus/hinkley-hills/lot-holder' },
];
