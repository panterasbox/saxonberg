/**
 * Platform template-path index.
 *
 * The canonical `/lib/` and `/obj/` template paths the engine's TypeScript
 * looks up at runtime — singleton registries, catalogues, persistence
 * infra, class refs, and path-family prefixes. Centralized because a
 * template path is *data*: the templates live in the (one) database, and a
 * path is just a string key into it, so the TS-side index of those keys
 * belongs in one place too — not scattered as a per-file `const` in every
 * Api and class.
 *
 * **Platform only.** Authored content under `/domain/` references its own
 * paths in its seeds (and, for spawn/evacuation, in app config). That's
 * content, not platform, and does not belong here.
 *
 * Cross-cutting infra; sits at `lib/` root alongside `events.ts` /
 * `mixin.ts` / `errors.ts` / `quantity.ts`.
 */

/** Exact platform template paths — direct singleton / class lookups. */
export const TemplatePaths = {
  // Singleton registries.
  accessRegistry: "/obj/AccessRegistry",
  addressRegistry: "/obj/AddressRegistry",
  groupRegistry: "/obj/GroupRegistry",
  schedulerRegistry: "/obj/SchedulerRegistry",
  worldClockRegistry: "/obj/WorldClockRegistry",
  mqlSubscriptionRegistry: "/obj/MqlSubscriptionRegistry",
  forumSubscriptionRegistry: "/obj/ForumSubscriptionRegistry",
  reactionRegistry: "/obj/ReactionRegistry",

  // Singleton catalogues.
  channelCatalogue: "/obj/ChannelCatalogue",
  soulCatalogue: "/obj/SoulCatalogue",

  // Persistence infra (declared as `static templatePath` on these classes).
  persistentHydrator: "/lib/persistence/PersistentHydrator",
  quantityMarshaller: "/lib/persistence/QuantityMarshaller",
  encryptedStringMarshaller: "/lib/persistence/EncryptedStringMarshaller",

  // Class refs / defaults.
  idea: "/lib/stuff/Idea",
  folderZone: "/lib/zone/FolderZone",
  rootBiome: "/lib/biome/universe",
  aetherImplant: "/lib/augmentation/AetherImplant",

  // Hosted capability updates (aether hosting relation) — incorporeal
  // Ideas cloned into an attunement host by the default loadout.
  commsUpdate: "/lib/comms/CommsUpdate",
  travelCredentialUpdate: "/lib/fasttravel/TravelCredentialUpdate",
  forumsUpdate: "/lib/forum/ForumsUpdate",

  // Metabolism cascade conditions — the `floorEffect`-named `Condition`
  // Ideas the reconcile spawns/clears off a floored biological reserve.
  metabolismStarvation: "/lib/metabolism/conditions/starvation",
  metabolismDehydration: "/lib/metabolism/conditions/dehydration",
  metabolismCollapse: "/lib/metabolism/conditions/collapse",

  // Thermal cascade conditions — spawned/cleared by the thermoregulation
  // reconcile when driven `coreTemperature` crosses the survivable band.
  thermalHypothermia: "/lib/thermal/conditions/hypothermia",
  thermalHyperthermia: "/lib/thermal/conditions/hyperthermia",
  thermalTorpor: "/lib/thermal/conditions/torpor",

  // Respiration anoxia condition — the affliction the drain accrues
  // dwell-time on toward the death seam (asphyxiation: drowning/vacuum).
  respirationAsphyxiation: "/lib/respiration/conditions/asphyxiation",
} as const;

/**
 * Platform template-path *prefixes* (trailing slash) — for path-family
 * matching (`startsWith`) or building per-instance child paths.
 */
export const TemplatePathPrefixes = {
  avatar: "/obj/Avatar/",
  species: "/lib/species/",
  topic: "/lib/messaging/Topic/",
  perceptionModalities: "/lib/perception/modalities/",
  // Addressing — the Locality leaf roster lives under this prefix; the
  // AddressRegistry enumerates it to build the coverage index.
  address: "/lib/address/",
  // Metabolism toxin conditions resolve by `<prefix><toxin-type>` (v1
  // keys the condition by the toxin tag, e.g. `…/conditions/alcohol`).
  metabolismCondition: "/lib/metabolism/conditions/",
} as const;

/**
 * Template-path prefixes RESERVED for engine runtime use — no authored
 * `domain`-collection Template may be saved under them. Enforced at the
 * domain-save chokepoint (`DomainHook.aroundSave` →
 * `TemplateApi.validateReservedPath`).
 *
 * `/obj/api/` is owned by the surface-architecture logic singletons:
 * `StuffApi.singletonSync('/obj/api/<feature>', …)` stamps a runtime
 * instance at that path (never a DB Template). A Template authored there
 * would be returned by `singletonSync`'s `byTemplatePath` lookup as the
 * (wrong-class) logic singleton, so the namespace must stay DB-free.
 */
export const ReservedTemplatePrefixes = ["/obj/api/"] as const;
