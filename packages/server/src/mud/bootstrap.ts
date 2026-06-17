/**
 * Engine bootstrap manifest — what the engine clones at server start.
 *
 * Lower-level developers are expected to edit this file regularly as
 * things come and go from service. Adding an entry: append
 * `{ templatePath: '/obj/Whatever' }` and add `dependsOn: [...]`
 * if it requires another entry to exist first. Removing an entry:
 * delete the line.
 *
 * The `BootstrapEntry` shape is owned by `BootstrapManager` (the
 * consumer); we import the type from there so this file stays pure
 * data.
 *
 * Mods append their own entries to this array before
 * `BootstrapManager.run()` fires (when the modding subsystem lands).
 */

import type { BootstrapEntry } from '../backend/BootstrapManager';

export const bootstrapManifest: BootstrapEntry[] = [
  { templatePath: '/obj/EventRegistry' },
  // The void doubles as the bootstrap-starting location AND the
  // last-resort home for HasInteractive bodies whose container
  // destructs without an outer to evacuate to. ContainerMixin's
  // cleanup hook resolves it via sync `findByTemplatePath`, so it
  // must be live before any container can destruct — bootstrap
  // guarantees that.
  { templatePath: '/domain/void' },
  // Topic catalogue singleton. The catalogue lazy-loads descriptors
  // from the `domain` collection on first access — no need to
  // pre-clone the per-topic `Topic` templates at boot. Same pattern
  // as species clades / materials / biomes per the note above.
  { templatePath: '/obj/TopicCatalogue' },
  // SoulCatalogue singleton — the runtime verb→Emote cache. Warmed
  // at postRegister from the `emotes` collection (populated by
  // `EmoteSeeder.run` earlier in the boot sequence). Resolvable via
  // `SoulApi.resolve` after this entry's postRegister fires.
  { templatePath: '/obj/SoulCatalogue' },
  // GroupRegistry — provider table for managed / MQL / contacts
  // group sources. Registers the three v1 provider instances in
  // postRegister; downstream consumers (chat audience, future
  // permission gates) reach in via `GroupApi`.
  { templatePath: '/obj/GroupRegistry' },
  // ChannelCatalogue — chat substrate singleton. Owns the byName /
  // byHandle / history maps; warms its `byName` cache from the
  // `channels` collection (populated by `ChannelSeeder.run`).
  { templatePath: '/obj/ChannelCatalogue' },
  // StreamState — livestream overlay-state singleton (mode + awayUntil).
  // Mutated by the `stream` verb; mutations fire `Events.StreamStateChanged`
  // which the backend-layer `BroadcastFeed` re-pushes to broadcast
  // connections. No persisted state (in-memory for the process lifetime),
  // so no dependency ordering beyond the EventRegistry being live (which
  // the first manifest entry guarantees).
  { templatePath: '/obj/StreamState' },
  // AccessRegistry — access substrate singleton holding the access
  // predicates (`can`, `canMutateZone`, `isAuthor`, `isDeveloper`,
  // `isStreamer`) and the bootstrap seeding for the v1 groups
  // (`'core'`, `'lounge'`, `'developers'`, `'streamers'`) plus the
  // lounge FolderZones. Depends
  // on `GroupRegistry` (the seeding uses `GroupApi.registry().managed()`
  // to mint Groups via the managed provider). Idempotent —
  // re-running boot against a populated DB is a no-op.
  {
    templatePath: '/obj/AccessRegistry',
    dependsOn: ['/obj/GroupRegistry'],
  },
  // AddressRegistry — addressing-substrate singleton holding the
  // PathTrie coverage index (claimed-address-prefix → Locality). Its
  // postRegister eagerly clones the Locality roster under
  // `/lib/address/` so the index warms at boot. No dependsOn — it
  // self-clones its roster and leans on no other singleton.
  { templatePath: '/obj/AddressRegistry' },
  // EventSubscriptions — runtime listener registry + bounded history
  // for the EventApi bus. Distinct from `/obj/EventRegistry` (which
  // holds event-property declarations + per-prop `checkAccess`); this
  // singleton holds the per-event Set of live subscribers and the
  // 100-entry ring buffer of recent payloads. Depends on
  // `EventRegistry` so the EventApi cache resolves both pointers
  // before any consumer emits.
  {
    templatePath: '/obj/EventSubscriptions',
    dependsOn: ['/obj/EventRegistry'],
  },
  // WorldClockRegistry — game-time anchor + scale + pause flag, the
  // schedule registry, the deadline-armed real-time heartbeat, and
  // the crash-backstop snapshot timer. `WorldClockApi.boot()` runs
  // late in `AppBootstrap.run` AFTER this entry has cloned the
  // Registry, so the Api facade has a live storage backend before
  // any consumer schedules. Depends on `EventSubscriptions` because
  // the Registry's host-destruction hook installs an EventApi
  // listener at schedule time.
  {
    templatePath: '/obj/WorldClockRegistry',
    dependsOn: ['/obj/EventSubscriptions'],
  },
  // SchedulerRegistry — engagement-framework runtime: the by-id
  // engagement index, completion / emission timers, host-destruction
  // subscriptions, and the activity-class registry that backs
  // HMR-aware lifecycle dispatch. Depends on both the world clock
  // (timer cadence) and EventSubscriptions (host-destruction hook).
  {
    templatePath: '/obj/SchedulerRegistry',
    dependsOn: ['/obj/WorldClockRegistry', '/obj/EventSubscriptions'],
  },
  // MqlSubscriptionRegistry — server-side substrate for live MQL
  // queries. Holds the per-Interactive registry, the meta-bus
  // dependency index (3-level Map), the listener refcount table,
  // and the setImmediate-batched dirty queue. Depends on
  // EventSubscriptions because the Registry installs EventApi
  // listeners per `(KIND, by)` pair to dispatch dirty marks.
  {
    templatePath: '/obj/MqlSubscriptionRegistry',
    dependsOn: ['/obj/EventSubscriptions'],
  },
  // ReactionRegistry — the act-scoped-emote aggregation substrate: the
  // per-act tallies, the fixed-cadence sink-agnostic broadcaster, the
  // per-recipient familiar-biased sampler, and the TTL GC. In-memory
  // authority, nothing persisted. The flush tick installs lazily on the
  // first reactable act, so no awaitInit is needed; seeding the
  // singleton here just gives the Api a stable `findByTemplatePath`
  // target. Depends on WorldClock (the flush rides `ScheduleApi`).
  {
    templatePath: '/obj/ReactionRegistry',
    dependsOn: ['/obj/WorldClockRegistry'],
  },
  // Lounge TPA terminal — the eager root of the Teleport Authority
  // network. Its `postRegister` self-seats into the lounge Warren's host
  // (standing the lounge host up) and cascades the rest of the network
  // (University Avenue node + room) live off this one seed via
  // `armNetwork()`. The terminal is a `FixtureMixin` that re-seats on host
  // migration, so the warren no longer hand-seats it. Without this entry
  // nothing instantiates the cascade root and the network never stands up.
  { templatePath: '/domain/lounge/terminal' },
  // Species clades, perception modalities, and augmentation
  // templates are NOT bootstrapped. Same lazy-load pattern as
  // locomotion modes / topic-catalogue leaves:
  //
  //   - **Species / clades** lazy-load via
  //     `SpeciesApi.preloadAnatomy` (called from the
  //     `requiresAnimate` and `requires<Sense>`/`requires<ESP>`
  //     validators' async `preload` hooks).
  //   - **Perception modalities** lazy-load via the sense / ESP
  //     validators' async `preload` hook
  //     (`PerceptionApi.preloadForSenseGate`), which warms all
  //     modality singletons in one shot the first time a sense
  //     verb runs. No alt-bootstrap on `Avatar.enter` —
  //     `senseStripAugmenter` runs first inside
  //     `autoSenseOnArrival`'s `sense` dispatch, which is gated
  //     by `requires<Sense>` and so warm before render.
  //     `SensorMixin.filterMessage`'s "modality not loaded → let
  //     the frame through" path is the documented graceful
  //     degradation for any pre-validator render call.
  //   - **AetherImplant** lazy-loads via
  //     `StuffApi.clone(AetherImplant.TEMPLATE_PATH)` in
  //     `Avatar.installDefaultLoadout` (dispatched from `postRegister`
  //     during the clone cascade — see Avatar.ts). No bootstrap
  //     pre-clone needed.
  //
  // Adding any of these back to the manifest would be a regression
  // in boot-time work for no real benefit — the lazy paths are
  // proven by locomotion / topics / species.
];
