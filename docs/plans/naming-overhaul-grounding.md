# Naming overhaul — grounding handed to the planner (2026-11-20)

Surveys run this cycle against HEAD `ace3d9b0a` (origin/master). Three
subagent surveys plus direct reads; spot-checked as noted. Paths: `S/` =
`packages/server/src/mud/`, `C/` = `packages/content/`. ⚠ This is input
for the plan's Grounding section; the planner verifies what it cites.
Retire this file at the sweep (fold what matters into the plan).

## 1. The document store (Stage A)

- **The closed list**: `S/lib/document/DocumentKinds.ts` —
  `DOCUMENT_KINDS` (42 kinds, l.110–582), `DeclaredDocumentKind` (~584),
  `DECLARED_DOCUMENT_KINDS` (~586). `DocumentKindSpec` fields: `kind`,
  `keys` (derivation fns), `words` (fn), `catalogue` (path), `contentDir`,
  `ext`, `onVanish`. `leafWord` helper. Imports nothing (read statically by
  ResetPolicy and gen-schema).
- **Readers of the list** (each must change):
  - `S/lib/document/StoredDocument.ts:125` `cardOf` (keys + `keys.word`).
  - `S/platform/idea/api/DocumentLogic.ts` — `BUSINESS_DOCUMENT_KINDS`
    (l.233, 3 kinds); `saveToRegister` declared check (~l.640);
    `catalogueForImpl` (~l.711); `pagesOfImpl` switch (l.777–860);
    pinned kind literals (instrument ~369, map ~433, stream-token ~452,
    berth-roll ~496, edition ~893); `COMMAND_VIEW_KIND` special cases.
  - `S/lib/persistence/ResetPolicy.ts:47,105` and
    `packages/server/scripts/gen-schema.ts:140–150`
    (`KEEP_DERIVATIONS['declared-document-kinds']`),
    `packages/server/src/schema/documents.yaml:48`.
  - `S/lib/paths.ts:20,259–270` `NON_TEMPLATE_DIRS` from every yaml
    `contentDir` (runtime-only dirs are reserved too — defect 3).
  - `S/platform/idea/api/PackLogic.ts` — `GATED_DOCUMENT_KINDS` (174),
    `DOCUMENT_VALIDATORS` (182–212: 15 catalogue `parse`, 5 `fromData`
    [Emote, Recipe, Archetype, StandbyReason, LowerThirdPanel], 3 shape
    checks [topic label, help-concept title, command-view schema]),
    `activeDocumentKinds()` (238) iterated at ~1123/2835/2849/2874/2989,
    command-view special cases (~214–236, 898–950, 1719),
    `invalidateDocumentKind` switch (3613–3660: command-view reload,
    emote → SoulApi.invalidateCache, recipe/archetype warm, name-bank
    `NameBank.clearCache`, blueprint), `validateDocument` (~4010).
  - `S/platform/idea/api/CmsLogic.ts:25,60,561`, `ScriptLogic.ts:37,403`
    (`DOCUMENT_KINDS.msh.kind`).
  - Scripts: `check-typed-words.ts`, `check-untitled-paths.ts`,
    `check-template-census.ts:68–71` (a STALE hand copy of the reserved
    dirs) and `:1151–1170` `DOCUMENT_PATH_FIELDS`; per-kind lints that
    hard-code dirs (`check-aromas`, `check-doneness`, `check-menu-staff`,
    `check-reachability:551`, `check-reason-rows:164`,
    `check-placement-words`).
  - Tests: `backend/__tests__/PersistenceManager.documentKinds.test.ts`,
    `lib/document/__tests__/PaperKinds.test.ts`,
    `scripts/__tests__/gen-schema.test.ts`.
  - Hard-coded kind constants per consumer (`HERD_KIND`, `FISHERY_KIND`,
    `BODY_KIND`, `BORE_KIND`, `WATER_RIGHT_KIND`, `SHIP_ENTRY_KIND`,
    `RECEIPT_KIND`, `BILL_OF_LADING_KIND`, `RATE_CARD_KIND`, `EMOTE_KIND`,
    `REASON_KIND`, `LOWER_THIRD_KIND`, `RELEASE_DOCUMENT_KIND`, each
    DocumentCatalogue's `kind`).
  - Comments assuming closure: `C/trade-tailoring/src/thing/MeasureBook.ts:12–17`,
    `S/lib/storage/Receipt.ts:6`.
- **Write transports in `S/api/document.ts` → DocumentLogic**:
  `saveRelease` (189), `saveAsBusiness` (269), `saveInstrument` (352),
  `saveMap` (398), `saveStreamToken` (444), `saveBerth` (502),
  `saveToRegister` (603; owner/branch/kind off the Registrar, path must be
  in its branch), `save` (652, plain, title-gated), `freezeEdition` (875).
  ⚠ `WaterRightRegistry` writes with plain `DocumentApi.save` (ungated).
  ⚠ `lib/behavior/enforces.ts:152` writes an undeclared kind
  `venue-eighty-six` (wiped at reset today).
- **The 42 kinds** fall into: shipped reference (27), mixed (edition,
  ship), filed records (13: herd, fishery, body, bore, water-right,
  warehouse-receipt, bill-of-lading, rate-card, instrument, map,
  berth-roll, berth-book, stream-token). Per-kind facts (catalogue,
  readers, writers, dated fields + units, value classes) are in the
  document-traits slate's survey; ⚠ catalogues NOT declared in the spec
  (so CMS edits never go live — defect 1): recipe (RecipeCatalogue),
  archetype, help-concept (HelpCatalogue), blueprint, name-bank (static
  cache on `NameBank`). Emote's SoulCatalogue refreshes itself.
- `pagesOf` reads `data.title`/`data.text` for an instrument, which its
  writer never sets (defect 2). `summaryLine` takes the first of
  `name|title|what|headline|key`.
- Dates: real ms — release `publishedAt`, edition `frozenAtMs`,
  stream-token `issuedAt`; game seconds — everything else. Only release's
  date is indexed (`findByKey`); others sort in memory after a prefix list.
- Only `formation` reads `keys.word` at runtime (`FormationCatalogue.pathOfWord`
  via `PartyLogic.ts:~584` → `DocumentCatalogue.byWord`, `S/lib/document/DocumentCatalogue.ts:145`).
- Pack manifest shape: `id`, `version`, `root`, `description`, `requires`
  (groups, title claims), `boot`, `maintainers` (content-packs.md).

## 2. MQL (Stage B)

- Sealed subdir: only `S/api/mql.ts` may import `S/api/mql/**`
  (`.eslintrc.js` no-restricted-imports). Files: `lexer.ts` (`:` → colon;
  `@` and `~` unused; `#`, `$`, `/`, `*`, `'`, `\`, `-`, `[ ]`, `( )`, `{ }`
  in use), `parser.ts` (`:` then a chain element; `::` is a parse error
  today, l.~345), `resolver.ts`, `scope-walk.ts` (`scoreCandidate` l.320,
  plural keywords via `GrammarApi.pluralize` ~l.238), `desugar.ts`,
  `pronoun-memory.ts`, `online-provider.ts`, `online-wire.ts`,
  `predicates.ts`, `via-augment.ts`, `types.ts`.
- Seeds resolved by hand TWICE: as a seed (`resolver.ts` ~l.445–525: `me`,
  `here`, pronouns, `inventory`, `online` 496, `peers` 506, `reachable`
  511, `person` 516, `horizon` 521 → `candidatesForHorizon` 787 →
  `PerceptionApi.horizonFor`) and as a view scope (`resolver.ts` ~l.730
  `candidatesForScope`). Reserved list at ~l.173. `world` refused.
- `:members` expands a `Warren` only (`flatMapMembers`, instanceof).
- **23 views scope to `online`**: banking/bank, banking/pay,
  governance/office, social/group, social/profile, civics/title,
  social/whisper, social/dm, perception/scry, author/goto, author/wizard,
  banking/house, social/react, social/contacts, author/pack, social/party,
  social/shout, social/say, social/introduce, and the Duncan Hall
  lease/unlease/provision/unprovision views.
- **The affordance selector** `verb@source`: `S/platform/idea/api/CommandLineLogic.ts`
  — the verb token splits at its first `@` past index 0 (~l.295,
  `parsePipelineImpl` l.370); `ParsedCommand.scope`; dispatcher
  `CommandGiver.matchAffordances` (command-routing.md § verb@source);
  alias expansion re-emits `${verb}@${scope}` (shell-alias.md).
- `~` today: `S/platform/idea/api/SourceTreeLogic.ts:128,167` treats `~` /
  `~/x` as the shell home in path args (not MQL).
- Player identity: an Avatar's identity path is
  `/platform/agent/Avatar/<playerId>` (`S/lib/character/Avatar.ts`).
- Notify refs: `S/platform/idea/cmd/social/NotifyControllerBase.ts:128`
  `normalizeRef` — `contacts:<me>:<word>`, `managed:`, `mql:` strings.
- Contacts: `S/lib/social/Contacts.ts` (`ContactEntry` on the avatar's
  `_contacts`, owner-only privacy).

## 3. The matchers (Stage C) — the census

~71 entity-set matchers, ~14 exact-key lookups, ~10 `.raw` re-reads,
19 word rules. File:line for each is in one-resolution-rule-slate § 6
(the ledger) and below by family; each family's destination is § 7.

- **Maritime**: `C/transport/src/idea/Harbor.ts:218 quayNamed, :232
  isRoadsWord, :529 shipNamed`; `C/transport/src/thing/HullBook.ts:300
  answersTo`; `S/platform/thing/CharterBook.ts:79 shipFor, :111 answersTo`;
  `S/lib/expanse/Hailable.ts:47` + `HailController.ts:44,63` (→ signalling
  slate, NOT this build); `S/platform/idea/ExpanseNode.ts:212 answersTo`,
  `:96 namesRiver`, via `S/lib/expanse/Expanse.ts:304 nodeByKeyword`;
  `C/water/src/idea/WatercourseCatalogue.ts:1509 landingNamed`;
  `S/platform/idea/ShipRegister.ts:168 entryNamed, :132 slugOf`;
  `C/transport/src/idea/LaneCatalogue.ts:250 placeNamed, :297, :320 laneOf`;
  `C/transport/src/thing/Boat.ts:275 paddleBy` (fixed vocab);
  `S/lib/location/HaulOut.ts:126 loadNamed`; `S/lib/spatial/Line.ts:265
  personWithinReach`.
- **Retail**: `S/lib/retail/Stock.ts:434 lineForWord, :529 pricedKeyFor,
  :407 resolveBuy`; `S/lib/retail/HeldGoods.ts:219 resolveHeld`;
  `S/platform/idea/cmd/retail/BuyController.ts:55` (`counter.raw` sniff);
  `OrderController.ts:60` / `OrderWordedController.ts:34` (first token) →
  `S/platform/thing/Tariff.ts:282 serviceFor`; `S/lib/commerce/Menu.ts:113`;
  `S/platform/idea/api/CraftingLogic.ts:869 resolveBrandKey`;
  `S/lib/storage/Store.ts:1315 matchesGood`. ⭐ retail.md: *"the shelf is
  always instances"* — `Stock` is a `Vessel` of real goods topped to par.
- **Crafting**: `S/platform/idea/RecipeCatalogue.ts:103 findByKeyword,
  :167 carvingPlanFor`; `S/lib/craft/Recipe.ts:840 matchesKeyword`;
  `CarveController.ts:83` raw; `S/lib/mould/Mould.ts:1075`,
  `S/lib/material/Greenware.ts:211` (fixed carve words);
  `C/trade-carpentry/src/lib/PatternStock.ts:54 metalNamed`;
  `FitController.ts:85,157,216`; `CraftingLogic.ts:4738 partInReachFor`;
  `S/lib/craft/FormSpec.ts:145 FormGrammar.parse`;
  `C/trade-forestry/src/thing/Billet.ts:67`; `S/lib/craft/Butcherable.ts:292`
  (clones an exemplar to read keywords); `C/trade-forestry/src/lib/Stand.ts:322
  speciesNamed`; `S/platform/thing/Rope.ts:770 makeKnot`.
- **Ground**: `C/trade-mining/src/lib/Working.ts:1024 faceNamed, :580
  sampleFace` (reversed `includes`); `C/trade-mining/src/idea/reading/GradeReading.ts:189`
  (reversed); `C/trade-quarrying/src/lib/OpenWorking.ts:383,813`;
  `C/trade-mining/src/thing/ClaimsRegister.ts:185`;
  `C/water/src/thing/IceSheet.ts:157`; `C/trade-ranching/src/idea/HerdRegistry.ts:367`;
  `C/trade-ranching/src/idea/cmd/ranching/MoveController.ts:136`;
  `C/residence/src/idea/PlatBook.ts:377`.
- **Social / catalogues**: `CallController.ts:162` (→ the animal decides,
  one rule); `S/lib/archetype/Archetype.ts:692`; `S/lib/social/Group.ts:193`;
  `ContactsRemoveController.ts:24–42`; `S/platform/idea/ChannelCatalogue.ts:219`;
  `S/platform/idea/SubjectCatalogue.ts:130`; `SoulCatalogue.ts:163,175,211`;
  `PartyLogic.ts:568,615,632`; `PlayerLogic.ts:229 findAvatarByName`;
  `EmploymentLogic.ts:450 findOrganizationImpl` (+ needleOf 409);
  `RecordControllerBase.ts:79`; `S/lib/slot/Wardrobe.ts:124`;
  `S/lib/augmentation/AetherHost.ts:244,220`; `DocumentLogic.ts:919
  callUpImpl` (substring); `S/platform/idea/HelpCatalogue.ts` (search
  stays a search); `S/platform/idea/ReadingCatalogue.ts:91`;
  `S/platform/idea/SpellCatalogue.ts:99` (holds `SpellDescriptor`s);
  `S/platform/idea/AddressRegistry.ts:188`; `MapController.ts:85`;
  `RouteController.ts:739,794,826`; `TeleportController.ts:385` +
  `C/tpa/src/lib/FastTravel.ts:425`; `GetController.ts:80`;
  `S/lib/vitals/Vitals.ts:695`; `CockpitTerminalController.ts:89`;
  `WhoController.ts:94` (search stays).
- **Exact keys**: `S/lib/governance/Office.ts:93`, org paths in clock/
  job apply/job quit/house appoint, position keys, `OperateController.ts:71`,
  `PrescribeController.ts:63`, `WalletUseController.ts:42`,
  `GroupControllerBase.ts:79`, `NotifyControllerBase.ts:128`,
  `LaneCatalogue.ts:320`.
- **`.raw` re-reads**: buy, carve, fit, shape, fell, teleport, get, dig
  (`WorkedActController.ts:101`), sample (`SampleController.ts:50`), cut.
- **Durations**: `S/platform/idea/cmd/retail/RentController.ts:116 daysOf`,
  `FireController.parseHoldS` (~l.91), `S/api/stream.ts:239 parseDuration`.
- **Kinds of entry** (classification): Ideas already keyworded —
  ExpanseNode, Ship (Structure: Visible+Named+Perceptible), Material
  (Perceptible, `S/lib/material/Material.ts:87`). Ideas with NO keywords —
  Spell (`S/platform/idea/magic/Spell.ts:147`, catalogue of descriptors),
  Reading (`S/lib/instrument/Reading.ts:213`, live roster), Condition
  (`S/platform/idea/Condition.ts`, live), Locality (`S/platform/idea/Locality.ts:130`,
  own name), Lane (`C/transport/src/idea/Lane.ts:113`), App
  (`S/platform/idea/App.ts:25`), Organization/Business (own `name`,
  `S/lib/employment/Organization.ts:265`; found by `findByMixin`), Species,
  Brand (`S/platform/idea/corpo/Brand.ts:58` Named; CorpoCatalogue holds
  `BrandDescriptor`s, `S/platform/idea/CorpoCatalogue.ts:171–180`).
  Precedent for "Perceptible Idea + live catalogue": Material +
  `S/platform/idea/MaterialCatalogue.ts:54` (`warm()` 186). ⛔ `NamedMixin`
  is PROPER NAMES ONLY (`S/lib/description/Named.ts` header) — never the
  keyword vehicle.
- Collection records: `Channel` (`Collections.Channels`, unique name),
  `Subject` (`forum_subjects`), `Group` (`Collections.Groups`),
  `PartyRecord` (`Collections.Parties`, unique crew name).
- In-reach Stuff the person seed already covers: installed apps
  (`person` includes attunement-hosted apps — mql-grammar.md).

## 4. Conventions that bind this build

CLAUDE.md § Module Categories (no new category, no exported helper; a
pack has no Api/logic singleton); the Api ↔ logic split; module scope
declares; `lint:family` derived (every gate); ratchet ceilings may fall,
never rise without a caller audit; `MqlApi` is resolveOne + resolveMany
only (memory); one view one word; no migrations (dev data droppable);
game clock only; NamedMixin proper names only; load on use, never boot;
refuse/skip/throw.
