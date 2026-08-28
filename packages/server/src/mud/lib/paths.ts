/**
 * Platform template-path index.
 *
 * The canonical `/lib/` and `/platform/` template paths the engine's TypeScript
 * looks up at runtime — singleton registries, catalogues, persistence
 * infra, class refs, and path-family prefixes. Centralized because a
 * template path is *data*: the templates live in the (one) database, and a
 * path is just a string key into it, so the TS-side index of those keys
 * belongs in one place too — not scattered as a per-file `const` in every
 * Api and class.
 *
 * **Platform only.** Authored content under `/world/` references its own
 * paths in its seeds (and, for spawn/evacuation, in app config). That's
 * content, not platform, and does not belong here.
 *
 * Cross-cutting infra; sits at `lib/` root alongside `events.ts` /
 * `mixin.ts` / `errors.ts` / `quantity.ts`.
 */

import { DOCUMENT_KINDS } from "./document/DocumentKinds";

/** Exact platform template paths — direct singleton / class lookups. */
export const TemplatePaths = {
  // Singleton registries.
  accessRegistry: "/platform/idea/AccessRegistry",
  parcelRegistry: "/platform/idea/ParcelRegistry",
  chattelRegistry: "/platform/idea/ChattelRegistry",
  officeRegistry: "/platform/idea/OfficeRegistry",
  addressRegistry: "/platform/idea/AddressRegistry",
  groupRegistry: "/platform/idea/GroupRegistry",
  schedulerRegistry: "/platform/idea/SchedulerRegistry",
  worldClockRegistry: "/platform/idea/WorldClockRegistry",
  mqlSubscriptionRegistry: "/platform/idea/MqlSubscriptionRegistry",
  forumSubscriptionRegistry: "/platform/idea/ForumSubscriptionRegistry",
  reactionRegistry: "/platform/idea/ReactionRegistry",
  /** The wiki's page/revision state + mutations (docs/subsystems/wiki.md). */
  wikiRegistry: "/platform/idea/WikiRegistry",
  /** The wiki's article render pipeline — and its ONE reveal gate. */
  wikiRenderer: "/platform/idea/WikiRenderer",

  // Singleton catalogues.
  channelCatalogue: "/platform/idea/ChannelCatalogue",
  subjectCatalogue: "/platform/idea/SubjectCatalogue",
  soulCatalogue: "/platform/idea/SoulCatalogue",
  disciplineCatalogue: "/platform/idea/DisciplineCatalogue",
  corpoCatalogue: "/platform/idea/CorpoCatalogue",
  governmentCatalogue: "/platform/idea/GovernmentCatalogue",
  helpCatalogue: "/platform/idea/HelpCatalogue",
  pressBoard: "/platform/idea/PressBoard",

  // Persistence infra (declared as `static templatePath` on these classes).
  persistentHydrator: "/platform/idea/persistence/PersistentHydrator",
  quantityMarshaller: "/platform/idea/persistence/QuantityMarshaller",
  encryptedStringMarshaller: "/platform/idea/persistence/EncryptedStringMarshaller",

  // Class refs / defaults.
  idea: "/lib/stuff/Idea",
  folderZone: "/platform/idea/FolderZone",
  rootBiome: "/stuff/idea/biome/universe",
  aetherImplant: "/stuff/thing/AetherImplant",

  // Hosted capability updates (aether hosting relation) — incorporeal
  // Ideas cloned into an attunement host by the default loadout.
  commsUpdate: "/platform/idea/CommsUpdate",
  forumsUpdate: "/platform/idea/ForumsUpdate",
  // The unified credential wallet app — one hosted holder for every
  // credential kind (payment, travel, …), replacing the per-credential
  // PaymentImplantUpdate + TravelCredentialUpdate twins.
  credentialWalletUpdate: "/platform/idea/CredentialWalletUpdate",

  // Payment card template — cloned per issue (a bearer instrument, 1:1
  // with one account); the reissue path after a report-lost freeze.
  paymentCard: "/stuff/thing/PaymentCard",

  // Physical key template — cloned per issue (a bearer instrument holding a
  // keychain credential); the durable form of dorm/lock access.
  key: "/stuff/thing/Key",

  // Metabolism cascade conditions — the `floorEffect`-named `Condition`
  // Ideas the reconcile spawns/clears off a floored biological reserve.
  metabolismStarvation: "/platform/idea/Condition/metabolism/starvation",
  metabolismDehydration: "/platform/idea/Condition/metabolism/dehydration",
  metabolismCollapse: "/platform/idea/Condition/metabolism/collapse",
  /** The body a player's death leaves behind (mortality.md). */
  mortalityCorpse: "/stuff/agent/Corpse",
  /** What coming back the cheap way costs you (mortality.md). */
  mortalityRecovering: "/platform/idea/Condition/mortality/recovering",

  // Thermal cascade conditions — spawned/cleared by the thermoregulation
  // reconcile when driven `coreTemperature` crosses the survivable band.
  thermalHypothermia: "/platform/idea/Condition/thermal/hypothermia",
  thermalHyperthermia: "/platform/idea/Condition/thermal/hyperthermia",
  thermalTorpor: "/platform/idea/Condition/thermal/torpor",

  // Respiration anoxia condition — the affliction the drain accrues
  // dwell-time on toward the death seam (asphyxiation: drowning/vacuum).
  respirationAsphyxiation: "/platform/idea/Condition/respiration/asphyxiation",
} as const;

/**
 * Platform template-path *prefixes* (trailing slash) — for path-family
 * matching (`startsWith`) or building per-instance child paths.
 */
/**
 * Rosters a catalogue scans by PREFIX that ship from more than one root —
 * the platform's own rows under `/platform/…` and other packs' under
 * `/stuff/…` (the pack decides the root; the class decides the branch).
 */
export const TemplatePathRosters = {
  locality: ["/platform/idea/Locality/", "/stuff/idea/Locality/"],
  government: ["/platform/idea/Government/", "/stuff/idea/Government/"],
} as const;

export const TemplatePathPrefixes = {
  avatar: "/platform/agent/Avatar/",
  species: "/stuff/idea/species/",
  topic: "/platform/idea/Topic/",
  discipline: "/platform/idea/Discipline/",
  // Corpos — the two reference-identity leaf rosters the CorpoCatalogue
  // scans at boot (the megacorps and their product brands).
  corpo: "/stuff/idea/corpo/Corpo/",
  brand: "/stuff/idea/corpo/Brand/",
  // Civics — the diegetic Government leaf roster the GovernmentCatalogue
  // scans at boot (governments are plural authored content — never the
  // Compact's face).
  government: "/platform/idea/Government/",
  perceptionModalities: "/platform/idea/modalities/",
  // Addressing — the Locality leaf roster lives under this prefix; the
  // AddressRegistry enumerates it to build the coverage index.
  address: "/platform/idea/Locality/",
  // Conditions — the whole authored roster, which `ConditionApi.boot`
  // stands up as live singletons (the sync resolve-on-read seams, e.g.
  // `Metabolic.resolveToxinBehavior`, cannot await).
  condition: "/platform/idea/Condition/",
  // Metabolism toxin conditions resolve by `<prefix><toxin-type>` (v1
  // keys the condition by the toxin tag, e.g. `…/conditions/alcohol`).
  metabolismCondition: "/platform/idea/Condition/metabolism/",
  // Magic — authored condition seeds (dread, overchannel-strain) and the
  // spell roster the SpellCatalogue scans at boot.
  magicCondition: "/platform/idea/Condition/magic/",
  spell: "/stuff/idea/magic/Spell/",
} as const;

/**
 * Template-path prefixes RESERVED for engine runtime use — no authored
 * `domain`-collection Template may be saved under them. Enforced at the
 * domain-save chokepoint (`DomainHook.aroundSave` →
 * `TemplateApi.validateReservedPath`).
 *
 * `/platform/idea/api/` is owned by the surface-architecture logic singletons:
 * `StuffApi.singletonSync('/platform/idea/api/<feature>', …)` stamps a runtime
 * instance at that path (never a DB Template). A Template authored there
 * would be returned by `singletonSync`'s `byTemplatePath` lookup as the
 * (wrong-class) logic singleton, so the namespace must stay DB-free.
 */
export const ReservedTemplatePrefixes = ["/platform/idea/api/"] as const;

/**
 * The title-bearing namespace roots — every shipped template path under
 * one of these must lie under some pack's `requires.title` claim (the
 * installer's covered-extent rule; `lint:untitled`). A pack's OWN document
 * root outside them (`/expression`, `/generic-objects`) is the pack's to
 * claim or not. The four-namespaces doctrine, one line each:
 *
 *   `/platform` the engine's own — every row the platform pack ships
 *              (controllers, registries, catalogues, the Avatar, the void)
 *   `/stuff`   the commons — every other pack's rows (gear, items,
 *              materials, species, brands)
 *   `/trade`   the industries — what a trade INTRODUCES (its stations,
 *              its stock, its recipes), `/trade/<industry>/…`
 *   `/world`   the places — localities and their venues
 *   `/compact` the state
 *   `/corpo`   the marks
 *   `/arcana`  magic's substrate — the first capability pack's own root
 *              (its classes, disciplines, verbs and banks)
 *
 * with `/studio`, `/wiki`, `/home` the platform's own trees. Under
 * `/platform`, `/stuff` and `/trade/<industry>` the SECOND segment is
 * the Stuff branch the row's class descends from — `thing`, `idea`,
 * `agent`, `location` (`shadow` has no instanceable class) — and a
 * controller sits at `<root>/idea/cmd/<Name>Controller` beside its view
 * document at `<root>/cmd/<verb>`.
 */
export const TITLE_ROOTS: readonly string[] = [
  "/platform",
  "/stuff",
  "/world",
  "/compact",
  "/studio",
  "/wiki",
  "/home",
  "/corpo",
  "/trade",
  "/arcana",
];

/**
 * The `content/` subdirs that are NOT the template kind: every other
 * declared kind's directory (settings, subjects, descriptor-banks,
 * quantity, and each `DOCUMENT_KINDS` yaml `contentDir`). ENUMERATED by
 * kind, never guessed: a new kind adds itself here through its spec. Every
 * OTHER top-level `content/` dir is a template tree — and may carry a
 * locality's / industry's own `cmd/` views at any depth.
 */
export const NON_TEMPLATE_DIRS: ReadonlySet<string> = new Set([
  "settings",
  "subjects",
  "descriptor-banks",
  "quantity",
  ...Object.values(DOCUMENT_KINDS)
    .filter((spec) => spec.ext === "yaml")
    .map((spec) => spec.contentDir),
]);
