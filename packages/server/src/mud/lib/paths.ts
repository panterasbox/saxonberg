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
  parcelRegistry: "/obj/ParcelRegistry",
  chattelRegistry: "/obj/ChattelRegistry",
  officeRegistry: "/obj/OfficeRegistry",
  addressRegistry: "/obj/AddressRegistry",
  groupRegistry: "/obj/GroupRegistry",
  schedulerRegistry: "/obj/SchedulerRegistry",
  worldClockRegistry: "/obj/WorldClockRegistry",
  mqlSubscriptionRegistry: "/obj/MqlSubscriptionRegistry",
  forumSubscriptionRegistry: "/obj/ForumSubscriptionRegistry",
  reactionRegistry: "/obj/ReactionRegistry",
  /** The wiki's page/revision state + mutations (docs/subsystems/wiki.md). */
  wikiRegistry: "/obj/WikiRegistry",
  /** The wiki's article render pipeline — and its ONE reveal gate. */
  wikiRenderer: "/obj/WikiRenderer",

  // Singleton catalogues.
  channelCatalogue: "/obj/ChannelCatalogue",
  subjectCatalogue: "/obj/SubjectCatalogue",
  soulCatalogue: "/obj/SoulCatalogue",
  disciplineCatalogue: "/obj/DisciplineCatalogue",
  corpoCatalogue: "/obj/CorpoCatalogue",
  governmentCatalogue: "/obj/GovernmentCatalogue",
  helpCatalogue: "/obj/HelpCatalogue",
  pressBoard: "/obj/PressBoard",

  // Persistence infra (declared as `static templatePath` on these classes).
  persistentHydrator: "/obj/persistence/PersistentHydrator",
  quantityMarshaller: "/obj/persistence/QuantityMarshaller",
  encryptedStringMarshaller: "/obj/persistence/EncryptedStringMarshaller",

  // Class refs / defaults.
  idea: "/lib/stuff/Idea",
  folderZone: "/obj/FolderZone",
  rootBiome: "/obj/biome/universe",
  aetherImplant: "/obj/AetherImplant",

  // Hosted capability updates (aether hosting relation) — incorporeal
  // Ideas cloned into an attunement host by the default loadout.
  commsUpdate: "/obj/CommsUpdate",
  forumsUpdate: "/obj/ForumsUpdate",
  // The unified credential wallet app — one hosted holder for every
  // credential kind (payment, travel, …), replacing the per-credential
  // PaymentImplantUpdate + TravelCredentialUpdate twins.
  credentialWalletUpdate: "/obj/CredentialWalletUpdate",

  // Payment card template — cloned per issue (a bearer instrument, 1:1
  // with one account); the reissue path after a report-lost freeze.
  paymentCard: "/obj/PaymentCard",

  // Physical key template — cloned per issue (a bearer instrument holding a
  // keychain credential); the durable form of dorm/lock access.
  key: "/obj/Key",

  // Metabolism cascade conditions — the `floorEffect`-named `Condition`
  // Ideas the reconcile spawns/clears off a floored biological reserve.
  metabolismStarvation: "/obj/Condition/metabolism/starvation",
  metabolismDehydration: "/obj/Condition/metabolism/dehydration",
  metabolismCollapse: "/obj/Condition/metabolism/collapse",
  /** The body a player's death leaves behind (mortality.md). */
  mortalityCorpse: "/obj/Corpse",
  /** What coming back the cheap way costs you (mortality.md). */
  mortalityRecovering: "/obj/Condition/mortality/recovering",

  // Thermal cascade conditions — spawned/cleared by the thermoregulation
  // reconcile when driven `coreTemperature` crosses the survivable band.
  thermalHypothermia: "/obj/Condition/thermal/hypothermia",
  thermalHyperthermia: "/obj/Condition/thermal/hyperthermia",
  thermalTorpor: "/obj/Condition/thermal/torpor",

  // Respiration anoxia condition — the affliction the drain accrues
  // dwell-time on toward the death seam (asphyxiation: drowning/vacuum).
  respirationAsphyxiation: "/obj/Condition/respiration/asphyxiation",
} as const;

/**
 * Platform template-path *prefixes* (trailing slash) — for path-family
 * matching (`startsWith`) or building per-instance child paths.
 */
export const TemplatePathPrefixes = {
  avatar: "/obj/Avatar/",
  species: "/obj/species/",
  topic: "/obj/Topic/",
  discipline: "/obj/Discipline/",
  // Corpos — the two reference-identity leaf rosters the CorpoCatalogue
  // scans at boot (the megacorps and their product brands).
  corpo: "/obj/corpo/Corpo/",
  brand: "/obj/corpo/Brand/",
  // Civics — the diegetic Government leaf roster the GovernmentCatalogue
  // scans at boot (governments are plural authored content — never the
  // Compact's face).
  government: "/obj/Government/",
  perceptionModalities: "/obj/modalities/",
  // Addressing — the Locality leaf roster lives under this prefix; the
  // AddressRegistry enumerates it to build the coverage index.
  address: "/obj/Locality/",
  // Conditions — the whole authored roster, which `ConditionApi.boot`
  // stands up as live singletons (the sync resolve-on-read seams, e.g.
  // `Metabolic.resolveToxinBehavior`, cannot await).
  condition: "/obj/Condition/",
  // Metabolism toxin conditions resolve by `<prefix><toxin-type>` (v1
  // keys the condition by the toxin tag, e.g. `…/conditions/alcohol`).
  metabolismCondition: "/obj/Condition/metabolism/",
  // Magic — authored condition seeds (dread, overchannel-strain) and the
  // spell roster the SpellCatalogue scans at boot.
  magicCondition: "/obj/Condition/magic/",
  spell: "/obj/magic/Spell/",
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
