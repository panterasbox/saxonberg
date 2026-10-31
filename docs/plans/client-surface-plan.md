# Client surface — implementation plan

Executes [client-surface-requirements.md](../requirements/client-surface-requirements.md)
(agreed 2026-10-30). **Kind:** client. **Leads from:** kernel — the
server's `look` and the client. One build in eight waves; the three
privacy leaks (#103 #104 #105) are W0. The MR closes the 23 issues the
requirements list under *Scope*. Dev databases are dropped; nothing
migrates. `pnpm test` runs once before the MR opens and once at
`/finalize`; between, `pnpm test:near` + every touched pack's vitest +
`lint:family`. The blocking drive is the requirements doc's wire drive
(a wire file) plus its browser walk (Playwright render specs); there is
no soak drive.

What is built, in one paragraph: `look` leaves the server as **segments**
(shape × source) riding the card envelope beside the unchanged terminal
text; the card registry grows **placement, size, roles and per-card
liveness**, every change to it a `cockpit card` command and a saved
arrangement; a **terminal becomes a card kind** with its own bar and
prompt slot; the client is re-laid out on **rem width classes** with a
rail, a status bar + tray, a terminal column capped at 42rem, a card
area that is a feed at one unit and a workspace at more, and an
**inspection card rendered from the segments** with a source gutter; the
**phone** gets chat-first, explore with a button bar, and watch. Nothing
new in any pack.

---

## Grounding

Verified 2026-10-30 on `reqs/client-surface` (`d88f0df08`) by opening
each file. Line numbers are current at plan time.

### The server `look` path

- `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`
  (769 lines). `execute` :69–105 dispatches `lookInto` :108 /
  `lookAtDetail` :129 (not carded) / `lookAtLocation` :171 /
  `lookAtTarget` :589.
- `lookAtLocation`: `preloadForSenseGate` :201, band :202,
  `visibleContents` :211–221, body = `Mml.location(location)` +
  `getMarkupLong(actor)` :295–301 (no sense filter beyond `look`'s
  default), puddle :304, `EmploymentApi.noticesAt` :328,
  `learnSurroundings` :336, `formatExits` :339 (`── Obvious exits:`),
  `── You also see:` :345–399 (occupants via `composeOccupants` or
  `Mml.actor(o, { form: 'presence' })`; items resolved eagerly with
  `Mml.fromMarkup(Mml.list(...).toString())`), hints :409–424. Emission:
  `CardApi.open(context, 'subject', { prose: body, subjectId })` :435,
  then SEPARATE uncarded `sense.survey` scenes: light band :448–454,
  tint :463–466, the body with `meta({ carded })` :468–473, one scene per
  notice :479–484.
- `lookAtTarget`: not-Visible refusal :602, `learnIdentityOf` :617, body
  :626 (`\n${Mml.actor(target)}\n\n${getMarkupLong}\n`), Placing lists
  :632–646 (uncapped, heading from the `Placement` row), `── Owned by
  ${holder.getPresentation()}` :650–659 (viewer-blind), screen :665–668,
  Wearing/Holding/In it via `PerceptionApi.visibleContentsOf` with
  `LOOK_INLINE = 4` :674–692, glance + hints :700–722, `CardApi.open` +
  carded scene :725–732.
- ⚠ Bug (slate 9): every `──` section after the first is composed
  `${body}── …` with no `\n` (:644, :657, :667, :686–687).
- `SenseController.ts` location branch :177–243: `getMarkupLong(actor,
  { filter: sensorium })`, exits, `── You also see:` with `Mml.actor`,
  then `CardApi.open('subject')`. No band, tint, notices, puddle, hints,
  occupant presence form. Arrival forces THIS verb:
  `Mobile.autoSenseOnArrival` `lib/spatial/Mobile.ts:610–619`
  (`forceCommand('sense')`), reached from `Mobile.ts:559,:1120`,
  `lib/character/Avatar.ts:940`, `GotoController.ts:119`.

### The augmenter fold

- `MarkupAugmenter = (text, host, viewer, opts?) => string`
  `api/mml.ts:129–134`; `AugmentOpts { filter? }` :151–153;
  `augmentMarkupImpl` :187–203 runs `escapeUnknownTags` then folds the
  flat list; `Mml.augment` :862–869.
- `MixinApi.getAllMarkupAugmenters` `api/mixin.ts:2418–2448` walks the
  constructor chain, keeps each level's own `markupAugmenters`, flattens
  root→leaf, **and drops which level contributed which function**.
- `Visible.getMarkupLong(viewer, opts)` `lib/description/Visible.ts:354–361`
  = `Mml.augment(this.getLongFor(viewer), this, viewer, opts)`.
- 46 augmenter functions on 42 hosts. Three do not append a paragraph:
  `wrapDetailKeysAugmenter` (wraps, `lib/description/Detailed.ts:301,:945`),
  `senseStripAugmenter` (strips, `Visible.ts:174,:391`),
  `titleLineAugmenter` (same-paragraph append, `lib/chattel/Chattel.ts:133,:147`).
  One appends with a single `\n` (`lib/metabolism/NutritionLabel.ts`). The
  other 42 append `\n\n<line>`, e.g. `assemblyAugmenter`
  `lib/craft/Assembled.ts:448–455` ("It is one piece." when
  `isOnePiece()`), `verdictAugmenter` `platform/thing/GradedReceptacle.ts:42–47`
  (gated only on `isCrafted && maker !== ''`), `combatStateAugmenter`
  `lib/combat/Combatant.ts:648–662` (true `poise.band()`, ignores
  `_viewer`), `bulkContentsAugmenter` `lib/bulk/Bulkable.ts:1317–1362`
  (viewer-aware; says "It holds X." / "The <kind> is empty." / a gas level
  word, no liquid level word, no seal state).
- `CraftVessel.getLong()` `platform/thing/CraftVessel.ts:344–373` overrides
  the viewerless `getLong` and bakes `renderVerdict()` into it.
  `Crafted.renderVerdict()` `lib/craft/Crafted.ts:256–263` →
  `resolveMakerName` :42–50 → `getPresentation()` (viewer-blind).

### Cards

- `CardApi.open` `api/card.ts:93–130`: throws unless the verb's YAML
  declares `opens_card` (`look.yaml:9` does); falls back to the giver's
  connections when the command was forced.
- `CardRegistry.open` `platform/idea/CardRegistry.ts:297–462`: stacks by
  default, `singleton` dedupes by key :307–327; `prose:
  opts.prose.toString(holder)` :366; a live mql card subscribes with
  `subscriptionId = instanceId`, `subjectId`, `silent: true` :378–410;
  `demoteLive` :435 (impl :781–800: every other card of that kind loses
  its subscription and gets `card-touched { live: false, takenAt }`);
  `card-opened` :444–460. `applyArrangement` :605–660 closes unnamed
  (`rearranged`), skips subject cards. `subjectKindOf` :205–210
  (`instanceof Place | Agent | Idea`). Sweep `SWEEP_INTERVAL_MS` :221.
  Server `CardState` :97–140 (no size, position, minimized, role).
  `CardOpenOptions` :147–164 (`key, subjectId, promptId, title, prose:
  Mml, pinned, payload`).
- `Interactive` `platform/idea/Interactive.ts`: `pushCard` :299,
  `touchCard` :304, `setCardPinned` :313, `closeCard`, `listCards`,
  `applyCardArrangement` :337, `cancelAllCards` :353 (on disconnect —
  cards are per-Interactive, in memory). `SaxonbergClient.openArrangement`
  `lib/connection/SaxonbergClient.ts:874–881` applies the active mode's
  arrangement on a fresh session.
- Catalogue `lib/connection/Cards.ts`: `CardDefinition` :119 (`label,
  source, pinnedByDefault, live, command, noProse?, singleton?`);
  `subject` row :215–229 (`'$subject'`, `fields: 'detail'`,
  `needsSubject`, `live: true`). `CardSource` kinds: `mql` | `payload`
  (`producer`) | `client` | `prompt`.
- `CardId` `packages/types/src/index.ts:1014–1025` (subject, who, news,
  wiki, help, prompt, cms, git, studio, stock, survey); `CardPayload`
  :1225–1230 (roster, releases, wikiPage, helpTopic, survey);
  `CardOpenedEnvelope` :1340–1387; `CardTouchedEnvelope` :1390–1410
  (`live?, takenAt?, title?, prose?, result?, payload?`);
  `StuffDetailRecord` :1674–1700 (`illustration?: string`, `mass?`,
  `contents?`, `worn?`…). `ArrangementSpec { cards: string[] }` :3216.
- `DETAIL_FIELDS` `api/mql-subscription.ts:120–137`; `projectFields`
  :318–342 re-points only `displayName` through `describeFor(viewer)`;
  `collectSubscribableFields` :153–165 walks root→leaf and **the last
  descriptor of a name wins** (a leaf-side mixin shadows a root-side one).
- Birth-path gate: `api/__tests__/card-birth-path.test.ts` asserts the
  mint sites by name (:143–174), every `opens_card:` names a real card
  (:197–238), the one client writer is `components/cards/useCardFeed.ts`
  (:301), and every `CardId` is minted by a command or an arrangement
  (:321–363). **Every new card kind and mint site is an edit here.**
- `cockpit card` `platform/idea/cmd/shell/CockpitCardController.ts`:
  `CARD_ACTIONS = ['list','pin','dismiss','auto']` :34, echo on
  `shell.control` tagged `control:card` :126–132, refusals
  `controller-rejected` with reasons :123. YAML
  `packages/content/platform/content/platform/cmd/shell/cockpit.yaml`
  :188–196 (`action`, `cardId` positionals). `cockpit layout save`
  `LayoutController.ts:129–187` captures `[...new Set(open.map(cardId))]`.
  `cockpit mode` `CockpitModeController.ts:111–121` applies the
  arrangement server-side.
- Client state schema `SaxonbergClient.ts` static `clientStateSchema`
  :181 (`cockpit.layout` :328, `cockpit.mode` :343, `cockpit.arrangements`
  :365, `cockpit.savedArrangements` :393, `cockpit.inputModes` transient
  :441, `cockpit.watch` transient :475, `cockpit.shelf` :549).
  `ClientStateSchemaEntry` `lib/connection/ClientState.ts:51–62`
  (`key, defaultValue, description?, validator?, transient?`). The client
  writes any schema key through `backend/inbound/clientState.ts:31`
  (validation inside `setClientState`). `perFactor` / `perKind`
  `lib/shell/Environment.ts:80–107`.
- Input mode: `CommandGiver.ts:666–685` prepends
  `cockpit.inputModes[barId]` only for a real bar submission;
  `backend/inbound/command.ts:42–54` reads `barId` off the wire.

### Privacy

- `Container.ts` `contents` descriptor `lib/spatial/Container.ts:366–391`
  — filters by `perceives`, worn, Adornment, Visible; **no "another
  person" rule**. `PerceptionLogic.visibleContentsOf`
  `platform/idea/api/PerceptionLogic.ts:573–610` is the one rule
  (`person = target.isAgent() && MixinApi.isSlotted(target)`; pockets
  only when `own`).
- `Tangible` `mass` descriptor `lib/material/Tangible.ts:250–256` sends
  the raw kg to any viewer.
- Corpse mint `platform/idea/api/ConditionLogic.ts:847–873`: keywords
  copy the dead's own (`body.getKeywords()`), `shortDescription: body of
  ${body.getPresentation()}` — the true name, baked. `Corpse`
  `platform/thing/Corpse.ts:119,:130` composes `OrganismMixin` and has
  `fieldMeta` for `conditionAtDeath`, `takenTissues`, `takenLines`.
- `BeliefStore` `lib/belief/BeliefStore.ts:744–773`: `learnIdentityOf`,
  `knownNameOf(identityPath)`, `recognizes(subject)`, `knowsTrueTypeOf`.
  `Stuff.describeFor(viewer, form)` `lib/stuff/Stuff.ts:277–286` →
  `RecognitionLogic.describe` (`canSeeGate` → "something"; recognition
  for persons only :396–430; `presence` form = baseline + `StatusMixin`
  status :259–265,:505).
- Combat fog: `CombatFog.perceive(trueBand, sharpness, feinting, config)`
  `lib/combat/CombatFog.ts:63–81`; the only viewer path is
  `perceiveImpl(actor)` `CombatLogic.ts:5538–5562` (own opponent,
  `sharpnessFor(state)` :1074–1083 memoized on the combatant's state;
  `competenceBand` comes from `bandFromOpts` :1354–1364, `"untrained"`
  when the opener supplied none). **No path exists for a bystander.**
- `VisionModality.canSee` `platform/idea/modalities/VisionModality.ts:285–348`
  lifts `env` to the room only when env is the viewer :334–338 or an
  open non-Place container :339–344. A worn item on ANOTHER person is
  judged by the light inside that person → "something" (#90).
  `Attired` `worn` descriptor `lib/slot/Attired.ts:552–571` filters by
  `perceives` then projects `REF_FIELDS` (whose `displayName` runs
  `describeFor` → `canSeeGate`).
- MQL: `#<stuffId>` lexes as `HashId` (`api/mql/lexer.ts:16–18`), parses
  at `parser.ts:227,:328`, resolves at `resolver.ts:390–393` by
  `StuffApi.findById` with **no perception gate** on the player path
  (`requireGiver` :416–428 lists it among the viewer-free seeds).
  `nameOf(stuff) = getPresentation()` :1800 and `keywordsOf` :1804 are
  viewer-blind — a living stranger IS addressable by true name today
  (outside this build; recorded under Risks).
- Affordances `platform/idea/api/CommandLogic.ts:2080–2143`: `seen` keyed
  on verb :2111–2116, iteration order = `viewer.getAffordances()`, so the
  target's own `fromTarget` entry is skipped when an actor-sourced entry
  for the same verb comes first (slate bug 5). Client shows only
  `source === 'subject'` (`CardBodies.tsx:541–542`).

### Presence facts available today

`StatusMixin.getStatus()` `lib/status/Status.ts:97`; `Posed.getPosture()`
`lib/character/Posed.ts:113,:201`; `Engaged.getEngagements()`
`lib/activity/Engaged.ts:138`; `HasInteractive.isLinkdead()`
`lib/connection/HasInteractive.ts:181`. Nothing composes them into a line.

### Help / mixin summaries

`HelpCatalogue.ts:453–476`: a `mixin.<Concept>` topic's summary is the
first conferred member's TSDoc; `mixinConcepts()` :685 = `Mixins` minus
the suffix; `renderMixinBody` :938. `scripts/project-author-surface.ts`
emits `consumer` members with `face: cls.name` :835–846 and no
mixin-level entry (the factory function's TSDoc is not projected).

### Illustration

`Visible.ts:214–223` projects `illustration` (bare key); `getIllustration`
:296; no shape anywhere. `CharGenStage.tsx:174–188` `Plate`
`aspect-ratio: 3 / 4`, `object-fit: cover`. `CardIllustration`
`CardBodies.tsx:116–124` center-crops.

### The record layer

`Avatar.handleMessage` `lib/character/Avatar.ts:1433–1454` is the one
producer (`RecordApi.record`, guests skipped). `RecordLogic.record`
:215–250 stores `topic, body, tags, at, seq` — **tags verbatim**; no
`meta`, no `payload`. Schema `src/schema/player_frames.yaml`. A chat frame
carries the channel as `meta.channelId` + `payload.channelName`
(`ChatController.ts:125–141`); the client copies `payload.channelName`
onto `Frame.channelName` (`App.tsx:527–531`, `store/index.ts:278–283`).
So a backfilled chat frame has no channel today.

### Client

- `App.tsx` (879): `useIsCompact` :262, `visibleFrames` :374–434 (facets,
  mutes, `cardedFrameIsCovered` :421–426), `sendCommand(text, barId?)`
  :594, `Frame`/`MobileFrame` switch :815–837, `ContentRow` +
  `SettingsPanel` docked :841–845, `StatusBar` desktop-only :867,
  `CommandSheet` :872.
- `layouts/modes.ts`: `MODE_REGISTRY` :49–58 (play→WorldLayout,
  chat→ForumLayout, watch→viewer/streamer, build→BuilderLayout; no
  govern), `FLOOR = "play"` :74, `resolveMode` :88–124 returns
  `fallbackFrom` that nothing renders.
- `components/frame/Frame.tsx` :116–144: `Bar data-testid="top-bar"`
  (Seal, ConnectionChip, AccountMenu, Shelf, ViewsMenu, Settings
  button). `Shelf.tsx` labels :123–183 (PLAY, RENOWN, SKILL, BODY, MAKE,
  COIN, STATUS, TIME, ONLINE, DOCKET). `SettingsPanel.tsx:28` is an
  `aside` docked in `ContentRow`. `MobileFrame.tsx`, `StatusBar.tsx`,
  `CommandSheet.tsx`, `ViewsMenu.tsx` (builds `cockpit mode <m> <arr>`).
- Layouts: `WorldLayout.tsx` (TabStrip → Terminal → FilterDrawer → phone
  InlineStack + PinnedChipRow → PromptStrip (only here) → CommandBar
  `world` → RightColumn + CardFeed → RadialOverlay); `ForumLayout.tsx`
  (SubjectShell + `ChatSurface` — a bespoke log over
  `frames.filter(channelName)` `components/social/ChatSurface.tsx:137–143`,
  not `<Terminal>`); `BuilderLayout.tsx`; `LivestreamPanels.tsx`.
  `layouts/primitives.ts` (`Cockpit`, `LeftColumn` flex:1 uncapped,
  `SideColumn` = `tokens.rail`). `layouts/types.ts` `LayoutProps` :1–73.
- `components/ui/tokens.ts` :195–223: `ratio.focal` unused,
  `breakpoint.compact: "760px"` the only breakpoint;
  `lib/style/useIsCompact.ts:33–35` `matchMedia((max-width: 760px))`.
  `CardFeed.tsx:58–60` fixed `360px`; `Terminal.tsx:33` no max-width,
  :137–141 scrolls to bottom on every frame; font-size 14px :39.
- `store/index.ts`: `Frame` :227–300; `appendFrame` :1658–1694
  (uncapped); prompts are GLOBAL — `pushPrompt` :1535–1560 sets one
  `activeSlot`; `CommandBar.tsx` :457–462 reads
  `cockpit.inputModes[barId]` (per bar already) but :478–497 every bar
  renders the global prompt slot; `submitActive` :588–626 drops typed
  text against a `choice` prompt and ignores Enter on `mql-object`.
  `PromptStrip.tsx` is rendered only by WorldLayout.
- `store/cardFeedSlice.ts`: `CardState` :62–126, `MAX_CLOSED = 3` :135,
  `visibleCards` :192, `cardedFrameIsCovered` :244, `orderCards` :257.
  `types/index.ts` `ConsoleTab { name, muted, facets? }` :2821–2835;
  `DEFAULT_VIEWS` (Aether) :2900–2916; `facetFilterPasses`
  `components/FacetFilterPanel.tsx:69`.
- `components/cards/CardBodies.tsx` (1916): `MIXIN_LINE = 3` :204,
  `HERE_SHOWN = 5` :207, `Overflow` :210, `ActionRow` :526–572 sends
  `${verb} ${keyword}` :555, `HereList` :827 / `PlacedList` :886 /
  `WornList` :946 send `look ${primaryKeyword}`, `CardBody` dispatch
  :1072–1085 (payload → prompt → `CLIENT_BODIES` cms/git/studio → Mql),
  inspection body :1414–1505, `Label` uppercase ~:135. `Card.tsx`
  `pinAction` :174–179 (`cockpit card pin|auto`), dismiss :199.
  `useCardFeed.ts:171–179` registers the four card envelopes +
  `mql-subscription-delta`. `GutterStripe.tsx:122` `colorForTopic`
  (FNV-1a hue over `var(--sx-stripe-*)`) — reusable for the card gutter.
- `websocket.ts` :648 handles `client-state-update`; :1181–1186 reads
  `result` off `card-opened` / `card-touched` into the stuff registry.
- Tests: client vitest + jsdom + RTL (`layouts/__tests__`,
  `cards/__tests__`, `components/__tests__`, `chromeComposition.test.tsx`,
  `noHexLiterals`, contrast). `e2e/playwright.config.ts:41` one project
  (Desktop Chrome); specs `cockpit`, `views`, `tabs`, `panes`, `inspect`,
  `status-bar`, `arrival`, `mobile-chrome` (PHONE 390×844, NARROW
  320×640), `shelf` (uses `setViewportSize` :178,:232), `theme`;
  `helpers.ts` exports `mintSession`, `enterWorld`, `runCommand`,
  `openWorldAs`, `openWorldAsFounder`.
- The `play` mode name: `types/index.ts` `CockpitMode` :3083,
  `COCKPIT_MODES` :3095, `DEFAULT_COCKPIT_MODE` :3102,
  `COCKPIT_ARRANGEMENTS` :3115, `SHIPPED_ARRANGEMENT_CARDS` :3150,
  `LEGACY_LAYOUT_MIGRATION` (world→play) :3173; client `modes.ts:52,:74`.
  ⚠ NOT renamed: `ShelfRowId "play"` (types :1071,:1084,:1117;
  `Shelf.tsx:122,:292`), the character-select verb `play <playerId>`
  (`cmd/charactergen/play.yaml`, `Login.ts:16`, wire `session.ts:379,:457`,
  `TestHooks.ts`).

### The wire harness

`packages/wire/src/harness/session.ts`: `Session.open(handle, {
startLocation?, wizard?, parcels? })` :288–317, `openAtRoster` :337,
`cmd(text)` :620 → `CommandResult { status, notes, text, said() }` :85,
`query/queryOne/subscribe`, `awaitPrompt/answerPrompt`. **`receive`
:487–565 drops every non-message envelope** (:550 `if (type !== null)
continue`) — `card-opened/touched/pinned/closed` and
`client-state-update` never reach a test — and keeps only `frame.body`
:563 (no topic, meta, payload). `world.ts` helpers: `advanceWorldClock`
:178, `nourish` :242, `dress` :270, `hand` :310, `pinWeather` :452.
Multi-player = one `Session` each (`tests/identity.dirty.wire.test.ts`).
Dave's Bar = `/world/lounge/location/bar`.

### Composition facts that constrain host placement

- `lib/creature/Creature.ts:154` composes `ContainerMixin` OUTSIDE
  `OrganismMixin` :206, so a Container-level descriptor shadows an
  Organism-level one of the same name. `Corpse.ts:119` and
  `platform/thing/Plant.ts:53` also compose `OrganismMixin` — **Organism
  is not "a person"**; the person predicate is
  `target.isAgent() && MixinApi.isSlotted(target)` (`PerceptionLogic.ts:584`).
- `SealableMixin` composes on `Door`, `Window`, `Chest`, `Barrel`, `Vat`,
  `Icebox`, `Bottle`, `Flask` and `lib/Bistate.ts` — a seal-state
  augmenter on Sealable would speak for doors.

---

## Plan-level decisions

### D1 — Segments are derived by DIFFING the fold; no augmenter changes

**Question.** Change the 46 augmenters' return type, diff the fold per
augmenter, or tag at collection?

**Choice.** Diff the fold, with the level tagged at collection. The 46
functions keep their `(text, host, viewer, opts) => string` contract.

- `MixinApi.getMarkupAugmenterLevels(ctor): AugmenterLevel[]` beside
  `getAllMarkupAugmenters` (`api/mixin.ts`), root→leaf, each level
  `{ source: SegmentSource, fns }`. A level whose class owns
  `_mixinName` is `{ kind: 'mixin', name: <name minus 'Mixin'> }`;
  otherwise `{ kind: 'class', name: ctor.name }` (Weapon, Character,
  CraftVessel, GradedReceptacle…). `getAllMarkupAugmenters` is
  reimplemented over it so there is one walk.
- `Mml.augmentSegmented(text, host, viewer, opts): { text, segments }`
  beside `Mml.augment` (`api/mml.ts`), which becomes
  `augmentSegmented(...).text` — one fold, so terminal and card cannot
  diverge. Per function: `before → after`.
  - `after === before`: nothing recorded (quiet).
  - `after.startsWith(before)`: the suffix, trimmed of leading
    whitespace/newlines, is a `state` segment with that level as its
    source (this covers the 42 paragraph appends, NutritionLabel's `\n`
    append and Chattel's same-paragraph append).
  - otherwise (Detailed's wrap, Visible's strip — a TRANSFORM): the
    accumulated text is re-split: each already-recorded `state` text is
    searched for in `after` as a contiguous run; if every one is found,
    the prose segment takes the remainder and the level is added to the
    prose segment's `sources`; if any is not found, all segments collapse
    into one prose segment carrying every source so far. Deterministic,
    and `text` is always the final `after` — byte-identical to today.
- `ProseSegment = { shape: 'prose' | 'state'; sources: SegmentSource[];
  text: string }`; `LookSegment` adds `'list' | 'notice'`, optional
  `heading`, and `items?: SegmentItem[]` (`{ stuffId, label, keyword,
  count }`) for list chips. Both types live in `@saxonberg/types` beside
  `CardOpenedEnvelope`.
- `Visible.getLongSegments(viewer, opts): ProseSegment[]` on
  `VisibleMixin` beside `getMarkupLong`, which is reimplemented as the
  joined text of the same call.
- `LookController` builds `segments: LookSegment[]` in step with `body`
  (one push per `body = Mml.compose…` site) and passes them to
  `CardApi.open(..., { prose: body, segments, subjectId })`. The
  terminal frame is unchanged except for the `──` newline fix.

**Where segments ride.** `CardOpenOptions.segments?: LookSegment[]` →
server `CardState.segments` → `card-opened.segments?` and
`card-touched.segments?` (a rebind or a re-look replaces them). Not on
the frame: a frame is a line of transcript and the record layer stores
no payload. The terminal renders the body string exactly as today.

**Reasoning.** 46 call sites are a sweep with no product value; the
contract *"an augmenter appends"* is already how 43 of 46 behave, and
the three transforms are handled by a rule rather than an exception. One
fold means AC 6 (card = terminal, line for line) is literal.

### D2 — Controller lists and the room's separate scenes are segments with a `look` source

Each `──` line is a `list` segment: `heading` is the printed heading
("On it" from the `Placement` row, "Owned by", "Wearing", "Holding", "In
it", "Obvious exits", "You also see"), `sources = [{ kind: 'look', name:
<heading> }]`, `items` the chips. The screen line is a `state` segment
with source `{ kind: 'look', name: 'Screen' }`; hints and the glance line
are `notice` segments (`look:Hints`). For the room, the light band, the
tint and each help-wanted notice are `notice` segments ON THE CARD while
the terminal keeps emitting them as their own uncarded scenes exactly as
today (AC 6 holds: every one of those lines is printed). The puddle line
is a `state` segment sourced `look:Floor`. The card header carries
Perceptible and Containable/Addressable — the client derives those from
the composition list, not from a segment.

**Identical things group in the list segment, server-side.** Group key =
`getTemplatePath()` + (Bulkable ? the interior bulk material path : "").
A group of ≥ 2 renders as `N <plural stem>` in the text
(`NounPhrase.withCount(count, plural)` `lib/description/NounPhrase.ts:120`
with `GrammarApi.pluralize(stuff, singular)` `api/grammar.ts:236`) and carries
its member items so the card expands in place (#71, #76). The uncapped
Placing list is capped by grouping, not by a number. The
`LOOK_INLINE = 4` summary for Wearing/Holding/In it stays (the ledger is
`inventory`).

### D3 — A bystander reads a fight at the untrained floor, a participant at their own sharpness

`CombatApi.readingOf(viewer, target): CombatReading | null` (two-object
read, the `PerceptionApi.perceives(viewer, target)` shape) forwarding to
`CombatLogic.readingOfImpl`: `sessionFor(target)`; if `viewer` holds a
state in the SAME session, `sharpnessFor(viewerState)`; otherwise
`Sharpness.resolve({ competenceBand: 'untrained' }, sharpnessConfig())`.
Band through `CombatFog.perceive(trueBand, sharpness, feinting,
fogConfig())`; flags and `down` pass unfogged (they are visible acts).
`combatStateAugmenter` uses it with the `viewer` it already receives. A
participant looking at their opponent gets exactly what the `fight`
status line gives (`perceiveImpl`), which is "the same fog as the fight's
narration".

**Reasoning.** The augmenter is synchronous; the viewer's lived combat
band is `competenceBandFor()` and async. A bystander's trained eye is a
real seam and leaves as a slate line (Deferred seams). The floor is
honest: it under-reads toward steady and never over-reads.

### D4 — Liveness is per card: placed and role cards hold a subscription, flowing cards are snapshots

`CardState.live` becomes a per-instance fact: `def.live && (placed ||
role !== undefined)`. A subject card opened by `look` is a snapshot
(`takenAt`, one-shot `resolveSubjectBound`); `cockpit card place` /
`pin` / `move` (anything that makes it placed) subscribes it (silent
`handleSubscribe` with its `subjectId`, then a `card-touched` carrying
`live: true` and the fresh `result`); `unplace` / `auto` / `close`
cancels. The `here` role card is always live. `demoteLive` and the
newest-holds rule are deleted. Cost bound: `MAX_PLACED_CARDS = 12` per
Interactive; `place` past it refuses `controller-rejected
{ reason: 'too-many-placed' }` with the count.

### D5 — Placement state lives on the server CardRegistry; an arrangement records it in units

Server `CardState` grows `size: WidthClass` (`'line' | 'unit' | 'medium'
| 'full'`), `placed?: { col: number; row: number }` (units, never
pixels), `minimized: boolean`, `role?: 'here' | 'primary'`. Every card
envelope carries them; a new `card-arranged { instanceId, size, placed?,
minimized, pinned, live }` envelope reports each change. The client is a
renderer: its width tier decides how many unit columns fit; a `placed.col`
beyond the fit folds into feed order by `(col, row)` — deterministic and
stateless on the client. **Flowing cards have no server position**; the
feed/workspace order is `openedAt`/`lastTouchedAt` (the client already
has them).

`ArrangementSpec` becomes `{ cards: ArrangementCard[] }`,
`ArrangementCard = { cardId, size?, placed?, minimized?, pinned?,
terminal?: { filter: TerminalFilter; inputMode?: string; primary?:
true } }`. `cockpit layout save` captures all of it from `listCards()`;
`applyArrangement` opens each with its placement and, for a terminal
card, sets `cockpit.inputModes[<its barId>]`. Reconnect: cards stay
per-Interactive in memory; a new Interactive gets the ACTIVE arrangement
via `openArrangement`, so a saved workspace survives and an unsaved one
does not — the same as today, and `cockpit layout save` is the player's
answer. No migration: the type changes, dev DBs are dropped.

### D6 — A terminal is a `payload` card; the primary is a role; prompts are per bar

- `CardId` gains `'terminal'`; `CardPayload` gains `{ kind: 'terminal';
  filter: TerminalFilter; barId: string; primary: boolean }`;
  `TerminalFilter = { view?: string; channel?: string; muted?: string[];
  facets?: FacetFilter }` — the view vocabulary is the shipped
  `console.tabs` (`ConsoleTab`), so the tab strip's views become filters
  with no new vocabulary. `barId` IS the card's `instanceId`, so the
  shipped per-bar `cockpit.inputModes` machinery is per terminal card by
  construction.
- The primary is `role: 'primary'`; `openArrangement` mints it when the
  arrangement names none; `close`/`minimize` on it refuse
  (`primary-terminal`).
- New subcommand `cockpit terminal <view|#channel> [--beside]` (retarget
  the primary's filter, or open a new terminal card beside it) and
  `cockpit terminal primary <card>`; controller
  `platform/idea/cmd/shell/CockpitTerminalController.ts`.
- **#97**: `PromptEnvelope` gains `barId?` stamped from
  `context.barId`; the client store keeps `activeSlotByBar` (a prompt
  from an un-barred command — an affordance click — attaches to the
  primary's bar). Each terminal card renders its own `PromptStrip` and
  `CommandBar` reading its own slot. `submitActive` for a `choice` prompt
  with non-numeric text falls through to `submitBase` on that bar
  (typed commands are never swallowed).
- **Backfill filtering**: `ChatController` tags each channel frame
  `channel:<handle>` beside the existing meta/payload; the record layer
  stores tags verbatim, so a terminal card's channel filter reads
  `tags` first and `channelName` second and backfilled frames filter
  correctly. No schema change (`player_frames.yaml` untouched).
- `ChatSurface` retires; chat mode is a primary terminal card filtered
  to the channel plus a `channels` panel card (the existing channel list
  component rehomed as a card body, `kind: 'client'`).

### D7 — Card links address by `#<stuffId>`, and the seed is perception-gated

- `resolver.ts:390–393`: the `stuffId` seed returns a match only when
  `ctx.commandGiver === null || PerceptionApi.perceives(giver, found)`.
  No new seed (the grammar stays small); the seed stops being
  "authoring-tier and ungated" and the card-surface doc's prohibition is
  lifted by this change.
- Client links (`HereList`, `PlacedList`, `WornList`, `ActionRow`, exit
  chips, segment chips) send `<verb> #<stuffId>`; the chip's label stays
  the keyword; the status bar previews the real command.
- **Slate bug 5**: `resolveAffordancesImpl` iterates the target's own
  affordances first (`[...viewer.getAffordances()].sort(fromTarget
  first)`), so a verb both the subject and the actor offer is attributed
  to the subject.

### D8 — `cockpit card` grows eight actions and one envelope

`CARD_ACTIONS = ['list', 'pin', 'unpin', 'dismiss', 'auto', 'close',
'grow', 'shrink', 'minimize', 'restore', 'move', 'place', 'unplace']`.
`unpin` is an alias of `dismiss` (stop pinning; ages out); `close` closes
now (reason `dismissed`); `grow`/`shrink` step the width class (unit ↔
medium ↔ full; a terminal card may also be `line`); `move <card> <col>
<row>` sets `placed` (insertion: the column's cards below shift down);
`place`/`unplace` set and clear `placed` without moving; `minimize` /
`restore` toggle the tray. Every action echoes on `shell.control` tagged
`control:card` as today and pushes `card-arranged`. Medium and full hold
one card each: growing B to the slot A holds returns A to its previous
size (the registry remembers `sizeBefore`). Refusals: `unknown-card`,
`primary-terminal`, `too-many-placed`, `role-card` (a role card cannot
be closed or unplaced; `here` is closed only by the registry when the
subject is gone).

### D9 — Width classes and tiers are rem tokens read by one hook

`tokens.width` (rem): `rail: 3.5`, `panel: 15`, `unit: { min: 22, max:
28 }`, `measure: 44`, `textMeasure: 42`, `gap: 0.75`, `strip: 8.25`.
`tokens.tier` (rem thresholds from the slate's table): `phone: 47.5`
(760px), `narrow: 68.75`, `feed: 103.125`, `workspace: 143.75`.
`lib/style/useWidthTier.ts` replaces `useIsCompact` as the one reader:
`{ tier, remWidth, units, panelFits }` from `matchMedia` queries written
in rem (so zoom is a breakpoint) plus a `resize` read of
`innerWidth / rootFontSize` for the unit count. `useIsCompact` stays as
`useWidthTier().tier === 'phone'` so the hundred call sites do not churn.
Layouts compose from four regions in one `ModeStage` component: `Rail`
(chrome) · `Panel` (a region of cards, accordion) · `TerminalColumn`
(medium slot above the primary) · `CardArea` (feed or workspace by
`units`), with the `StatusBar` (tray at its right) below. `MODE_REGISTRY`
keeps a per-mode entry, but each entry is a config (`panelCards`,
`defaultFilter`, `mediumSlot`) rendered by `ModeStage`, not a layout
component. `WorldLayout`, `ForumLayout`, `BuilderLayout` retire;
`LivestreamPanels` keeps the streamer deck as a card body and the viewer
layout becomes the watch config (video in the medium slot, stream chat a
unit terminal card).

### D10 — The small decisions

- **#89 mixin summaries.** `project-author-surface.ts` emits a `mixins:
  { name, summary }[]` section from the TypeDoc reflections of the
  exported `*Mixin` factory functions (their TSDoc first paragraph).
  `HelpCatalogue` prefers it over the first-member fallback. The card's
  gutter hover fetches `help` for `mixin.<Name>` through the REST help
  API (`api/help.ts`) and caches per session.
- **#74 presence line.** `lookAtTarget` adds a `state` segment sourced
  `look:Presence` for `target.isAgent()`: status (`StatusMixin`), posture
  when not `standing` (`Posed`), the engaged activity types
  (`Engaged.getEngagements()`), `away` when `isLinkdead()`. Composed in
  the controller from existing methods; no new mixin.
- **#90 VisionModality.** One more lift at `VisionModality.ts:339`:
  when `env` is a person (`env.isAgent() && MixinApi.isSlotted(env)`),
  `env = env.getContainer() ?? env` — a worn or held thing is seen in
  the light its wearer stands in.
- **Quiet at the source.** `assemblyAugmenter` returns `text` unchanged
  when `isOnePiece()` (the `fit` refusal already explains itself).
  `CraftVessel` moves the verdict out of `getLong()` into a class-level
  `static markupAugmenters = [vesselVerdictAugmenter]` (viewer-aware, so
  "Made by" can be `describeFor(viewer)`); both it and
  `GradedReceptacle.verdictAugmenter` are quiet when the vessel's
  interior is empty and the host is not soiled — a never-used glass says
  nothing.
- **Liquid level word + seal state.** `bulkContentsAugmenter` says the
  level in words off the fill fraction (`full` · `nearly full` · `about
  half` · `a finger` · `dregs`) and, when the host is Sealable, `sealed`
  / `open` — gated on `MixinApi.isVesselKind(host)` so the rule never
  speaks for a door (Sealable's hosts include `Door` and `Window`).
- **Arrival runs `look`.** `Mobile.autoSenseOnArrival` →
  `autoLookOnArrival`, `forceCommand('look')`; four call sites renamed.
  `look.yaml`'s `default: "$focus"` resolves to the room after
  `clearFocus()` exactly as `sense` does. `SenseController`'s location
  branch is untouched (a typed `sense` keeps its sensorium filter).
- **`illustrationShape`.** `VisibleMixin` field `illustrationShape?:
  IllustrationShape` (`'wide' | 'tall' | 'square'`, `fieldMeta
  authorable`), `getIllustrationShape()` = the field ?? the branch
  default computed from the host's own branch predicates
  (`Stuff.isPlace()` `lib/stuff/Stuff.ts:1339` → wide, `isAgent()` :1312
  → tall, else square); a
  `subscribableFields` descriptor `illustrationShape` beside
  `illustration`; `DETAIL_FIELDS` += `illustrationShape`;
  `StuffDetailRecord.illustrationShape?`. No `MediaAsset` change (the
  generator is a non-goal).
- **CharGenStage** plate `aspect-ratio: 4 / 5`, `object-fit: contain`.
- **`play` → `explore`.** `CockpitMode`, `COCKPIT_MODES`,
  `DEFAULT_COCKPIT_MODE`, `COCKPIT_ARRANGEMENTS`,
  `SHIPPED_ARRANGEMENT_CARDS`, `LEGACY_LAYOUT_MIGRATION` (`world →
  explore`), `cockpit.yaml` prose and validator strings, client
  `modes.ts`, the tests listed in Grounding. `ShelfRowId 'play'` and the
  `play <playerId>` verb are NOT renamed.
- **Chrome.** `Frame.tsx` becomes `Rail.tsx` (vertical: the mode icons
  send `cockpit mode <m>`; collapsed-panel card icons; the you-corner =
  `AccountMenu` + a settings icon). `StatusBar` gains the tray (minimized
  cards, restore previews `cockpit card restore <card>`) and the shelf
  figures move onto its left with plain labels (#77: Where · Standing ·
  Skills · Body · Making · Money · Status · Time · Who's on · Docket).
  `ViewsMenu` retires into the rail. `SettingsPanel` becomes the body of
  a `settings` card (`kind: 'client'`, singleton, pinned) opened by the
  shipped `settings` verb (`opens_card: settings`); the you-corner's
  settings icon sends `settings`. A mode with no layout renders
  `fallbackFrom`: "govern isn't laid out yet — showing explore".
- **#59.** `setConnectionPhase` clears `ghostPreview`; `CharGenStage`
  stops mounting its own `StatusBar`.
- **#54.** `Terminal` auto-scrolls only when the viewport was at the
  bottom (within one line) before the append; otherwise shows a "new
  lines ↓" chip that scrolls on click.
- **#50.** A `look` at a subject that already has an open subject card
  TOUCHES it (bring forward, replace prose/segments/result) instead of
  stacking — the registry keys subject cards on `subjectId` while open.
  Closed husks become Recent-trail chips (`MAX_CLOSED` is the trail's
  cap: two lines then "+N").
- **#53/#92 the `here` role.** `CardRegistry.open` for a subject whose
  `subjectId` is the viewer's current container stamps `role: 'here'`;
  when a `here` card exists it REBINDS (new `subjectId`, re-subscribe,
  `card-touched` with `subjectId`, `title`, `subjectKind`, `prose`,
  `segments`, `result`) — never a second room card. The client's
  "back to the room" is the `here` role card itself; the explore panel's
  first card is the `here` card at panel width.

### Build decisions (B1…) — made during the build, not by the plan

- **B1 — no placed-card cap.** `MAX_PLACED_CARDS = 12` (D4) is dropped: a
  bare count with no author is the harshest rule there is (values /
  governance lens), and the screen's unit slots are the natural limit. No
  `too-many-placed` refusal.
- **B2 — the combat read lives on the combatant, not the Api.**
  `Combatant.combatStateLineFor(viewer)` → `CombatLogic.combatStateLineFor`
  (gated `CombatantCallers`) instead of `CombatApi.readingOf(viewer,
  target)` — the plan's own fallback, taken up front because the
  augmenter already holds the host and `lint:object-verbs` holds Api
  statics with a world-object first parameter at zero. You read your OWN
  poise unfogged.
- **B3 — the quiet verdict gate landed in W0** with the verdict's move
  into `vesselVerdictAugmenter` (it is two lines beside the move). "Used"
  = interior bulk present OR `Serviceable.isSoiled()`.
- **B4 — `look <thing>`'s body no longer ends in a newline**; every
  section opens with `\n── `, so the first and the tenth join the same
  way (slate bug 9).
- **B5 — a corpse's name is carried as `ofIdentityPath`** (persistent
  field) and told by `Corpse.describeFor` only where the base answer is the
  plain stranger presentation (sight, a label still win). An animal's
  corpse keeps its public name in the stem.
- **B6 — `Tangible`'s `mass` read states the person rule inline.**
  Importing `PerceptionApi` from `lib/material/Tangible.ts` closed an
  import cycle through `Thing` (three suites failed to load); the read
  states `isAnotherPerson`'s three-clause rule with a comment, and
  `mql-subscription.privacy.test.ts` pins that the two agree.
- **B7 — one fold per look: `Visible.getSegmentedLong(viewer, opts)`
  returns `{ text, segments }`** instead of the plan's
  `getLongSegments(): ProseSegment[]`, so `LookController` folds once and
  the terminal text and the card segments come from the same call.
- **B8 — the prose segment's source is `mixin:Visible`** (the authored
  description); a transform that keeps earlier state lines intact joins
  the prose's sources, one that rewrites them collapses everything into
  one prose segment. State segments are trimmed; the card joins them with
  a paragraph break.
- **B9 — a list segment's `text` is the whole printed line** (`── You also
  see: …`), the chips ride `items`; a group's text is the count form
  (`3 bottles of gin`) with no ref tag, its members ride `items[].members`.
  A person never groups.
- **B10 — the presence line reads `Now: <status>, <posture>, <activity>,
  away.`**; an activity is the engagement's `type` written as words.
- **B11 — pinning is attention: a pinned card of a live kind is live.**
  `wantsLive = def.live && (placed || role || pinned)`. D4 listed `pin`
  among the acts that subscribe; reading it as "pin makes it placed"
  would have given pin a position, which it does not have.
- **B12 — `place` with no position goes to the bottom of column 0**;
  `move` takes an explicit `<col> <row>`. `close` on a role card and
  `minimize` on the primary refuse by name.
- **B13 — subject cards are keyed on `subjectId` while open (#50)**, so
  the shipped "a/b/a is THREE cards" and "look lamp / look brass lamp
  are TWO cards" tests were rewritten to the new identity: one card per
  subject. The room card is the `here` role and REBINDS on a look at
  the new place (AC 4).
- **B14 — an arrangement never records the subject/here card** (a moment,
  not a workspace), and `applyArrangement` re-shapes a card already up
  rather than reopening it.
- **B15 — the primary terminal is ensured only on a MODE entry**
  (`applyArrangement(cards, primaryFilter)` from `openArrangement`,
  `cockpit mode`, `cockpit layout`); a bare card re-arrange touches no
  terminal. Each mode's default filter is `MODE_PRIMARY_FILTER` in types
  (chat → the `Chat` view, the rest everything). No shipped arrangement
  names `terminal`.
- **B16 — a terminal's `barId` is minted (`bar-<uuid>`), not its
  `instanceId`** — the payload is built before the instance exists, and
  a separate id is just as stable across retargets.
- **B17 — terminal cards are filtered out of the card feed until W5**,
  when the terminal column renders them; the layouts' own `<Terminal>`
  stays the primary's renderer meanwhile.
- **B18 — the shelf's words (#77)**: Standing · Known · Skills · Body ·
  Making · Money · Status · Time · Who's on · Docket (the plan's list had
  a "Where" no shelf row is). Title case; the figure keeps its engraved
  display style.
- **B19 — #59 is fixed by clearing the preview on every phase change**;
  char-gen keeps its own status bar (the phases are exclusive, so one bar
  is ever mounted, and intake renders command-sending affordances).
- **B20 — prompts are per bar on the client** (`activeSlotByBar`,
  `primaryBarId` registered by the primary `CommandBar`); `activeSlot`
  mirrors the last bar that moved for the readers that predate it. Typed
  text at a choice or mql prompt is sent as a command.
- **B21 — W3 lays out `explore` only; chat, watch and build keep their
  shipped layouts inside the new chrome** (rail + status bar) until W5
  converts them, so each wave lands. Below the phone tier `ModeStage`
  renders the shipped phone surface until W6.
- **B22 — the card area's capacity is read from the window's height**
  (a unit card's minimum ≈ 10rem); displacement takes the stalest
  unprotected flowing card by touch, never the newest. "Stalest" is pure
  time (the slate's open question, decided for predictability).
- **B23 — a feed moves a RE-RUN card to the bottom** (`touchedAt`, set
  when a `card-touched` carries a body); a liveness flip is not a touch.
  Husks and displaced cards ride the Recent trail; a trail chip re-runs
  the card's command.
- **B24 — the rail's mode buttons are words, not glyphs** (a rail of
  initials is a quiz); `ViewsMenu` survives only in the phone's account
  menu until W6.

---

## ⭐⭐ Host placement

No new mixin and no new class is introduced. Every addition sits on an
existing host; the claim each makes is stated.

| addition | host | what composing it claims |
|---|---|---|
| `getLongSegments(viewer, opts)` | `VisibleMixin` | every describable thing can say which interface said which line — true by construction (the fold already runs on every Visible) |
| `illustrationShape` field + `getIllustrationShape()` + `illustrationShape` descriptor | `VisibleMixin` | every illustrated thing has a shape; the default is derived from the branch predicate, so no override per branch and no guard |
| `vesselVerdictAugmenter` (class static) | `CraftVessel` | a craft vessel's verdict is a state line, not part of its authored prose; viewer-aware |
| quiet gate (empty + unsoiled) | `vesselVerdictAugmenter`, `GradedReceptacle.verdictAugmenter` | a verdict is read off a used vessel; an unused one says nothing |
| level word + seal word | `bulkContentsAugmenter`, gated `isVesselKind` | the vessel kind decides that a seal is worth a word; Sealable alone would speak for doors |
| `renderVerdict(viewer?)` | `CraftedMixin` | "Made by" is a name, and a name is per viewer |
| `readingOf(viewer, target)` | `CombatApi` → `CombatLogic` | a two-object perception read, the `perceives(viewer, target)` shape; the session is the logic singleton's to read |
| `ofIdentityPath`, `ofStem` fields + `describeFor` override | `Corpse` | a corpse names its dead per viewer; `Corpse` is the Thing-branch twin and the only class that is "the body of" somebody |
| `contents` descriptor rule | `ContainerMixin` (existing descriptor) | delegates to `PerceptionApi.visibleContentsOf` — the one rule `inventory` and `look` already read; no new host, and the person predicate stays in `PerceptionLogic` |
| `mass` descriptor rule | `TangibleMixin` (existing descriptor) | reads `PerceptionApi.isAnotherPerson(viewer, host)`; a living body's weight is read by a scale, never by a look |
| `isAnotherPerson(viewer, target)` | `PerceptionApi` → `PerceptionLogic` | the person predicate `visibleContentsOf` already holds, named once |
| `size`, `placed`, `minimized`, `role`, `live`, `segments`, `sizeBefore` | server `CardState` (`CardRegistry`) | a card's shape and place are the registry's — "only a command changes which cards are up" |
| `terminal` card, `settings` card | `Cards.ts` catalogue | a terminal is a card; settings are a card |
| `TerminalFilter`, `ArrangementCard`, `LookSegment`, `IllustrationShape`, `WidthClass`, `card-arranged` | `@saxonberg/types` | wire vocabulary |
| `channel:<handle>` tag | `ChatController` scenes | a channel frame says its channel in a field the record stores |
| `barId` on `PromptEnvelope` | `PromptApi` / `PromptLogic` push | a prompt belongs to the bar that asked |
| `CockpitTerminalController` | `platform/idea/cmd/shell/` | a controller, in its category |
| `useWidthTier`, `ModeStage`, `Rail`, `RecentTrail`, `CardArea`, `TerminalCardBody`, `InspectionBody`, `Gutter`, `QuietRow`, `ChipList`, `IllustrationPlate`, phone shells | `packages/client/src` | client components; no server category |

⭐ The test applied: the only narrowing guard in the build is the person
predicate, and it is not a guard on a mixin's host set — it is a
perception rule that already exists (`PerceptionLogic.ts:584`) and is
reused, never re-stated. The level/seal words are gated on
`isVesselKind`, which is the vessel subsystem's own category, not a
re-narrowing of Sealable.

---

## Convention conformance

Checked at plan time against `CLAUDE.md`:

- **Module categories.** New server files: one controller
  (`CockpitTerminalController.ts`), nothing else. No free helper, no new
  `lib/` module, no new Api. Every new static goes on an existing Api
  (`MixinApi`, `Mml`, `CombatApi`, `PerceptionApi`), every new behavior
  on the owning class.
- **Verbs on objects.** `readingOf(viewer, target)` and
  `isAnotherPerson(viewer, target)` are two-object reads of the
  `PerceptionApi.perceives` shape; `lint:object-verbs` (first parameter a
  world object) is checked in W0 — if the census refuses the shape, the
  read moves onto `CombatantMixin` as `combatReadingFor(viewer)` and the
  Api forwards to it.
- **Api ↔ Logic.** `CombatApi.readingOf` → `CombatLogic.readingOfImpl`;
  `PerceptionApi.isAnotherPerson` → `PerceptionLogic`. `CardApi` →
  `CardLogic` → `CardRegistry` unchanged in shape.
- **Import boundary** (`lint:imports`): nothing outside `src/mud/` is
  imported from the mudlib; the `mixins` section of the author surface
  is a build script's output read by `HelpCatalogue` through the existing
  `author-surface.json` path.
- **Module scope declares.** New constants are pure values; the controller
  registers through the existing dispatch.
- **No `.js` imports. American English** in every new identifier, string
  and doc line (`color`, `gray`, `center`).
- **`props:` / `cast:`** — no content rows change. **Locations, not
  rooms** — no place rows change. `<root>/<branch>/` — the one new
  controller mirrors `/platform/idea/cmd/shell/CockpitTerminalController`.
- **Closed vocabularies** (`lint:closed-vocabularies`): `CockpitMode`
  (rename), `CardId` (+2), `CardPayload` (+1), `CardCloseReason`
  (unchanged), `WidthClass` (new, closed), `IllustrationShape` (new,
  closed).
- **Schema** (`lint:schema`): no collection changes.
- **Topics** (`lint:topics`): no new topic; card echoes stay on
  `shell.control`.
- **Verb collisions** (`lint:verb-collisions`): no new verb — `cockpit
  terminal` is a subcommand; `settings` exists.
- **Lint gates this build must pass**: the whole derived roster
  (`pnpm -C packages/server lint:family`), and by name the ones it
  touches: `lint:imports`, `lint:module-scope`, `lint:instanceable`,
  `lint:mixin-names` (no new kernel mixin), `lint:object-verbs`,
  `lint:lib-statics`, `lint:thin-forwarder`, `lint:closed-vocabularies`,
  `lint:arg-kinds` (the `cockpit.yaml` args), `lint:envelope`,
  `lint:topics`, `lint:test-bootstrap`, `lint:test-content`,
  `lint:drive-scripts`, `lint:untitled`, `lint:unconsumed-seams`, plus
  the client's ESLint, `noHexLiterals` and contrast specs, and
  `card-birth-path.test.ts`.

---

## Waves

Every wave lands green on `pnpm test:near` + `lint:family` + the client's
vitest, and ends at one commit `build(client-surface W<n>): …`. Waves
W0–W2 are server-led (the client keeps compiling); W3–W6 are client-led;
W7 is the drive and the docs.

### W0 — Privacy on the wire, and the harness that can see it

> ✅ **Done** (build). Pockets, mass, maker and corpse names, combat fog
> (B2), the person light lift, target-first affordances, the `#id` gate,
> the harness rings (`envelopesOf`, `lastCard`, `awaitEnvelope`,
> `framesOf`). The `── ` newline rides B4. Surprise: the `Tangible`
> import cycle (B6). test:near 495/498 → 498/498 after B6; lint:family
> 85/85.

**Goal.** #103, #104, #105, #90; the `──` newline; the affordance order;
the `#id` gate; a wire harness that captures envelopes. Drive steps 5–8
pass at the end of this wave.

**Implements** D3, D7, D10 (#90), the privacy half of the requirements.

**Files.**
- `packages/server/src/mud/api/perception.ts` + `platform/idea/api/PerceptionLogic.ts`:
  `isAnotherPerson(viewer, target)`; `visibleContentsOf` reads it.
- `lib/spatial/Container.ts:366–391`: the `contents` read becomes
  `visibleContentsOf(viewer, host)` → `held` + `carried` (worn stays
  Attired's; the Adornment/Visible/perceives filters and
  `getLooseContents` are applied to that set as today).
- `lib/material/Tangible.ts:250–256`: `mass` read returns `undefined`
  when `isAnotherPerson(viewer, stuff)`.
- `lib/craft/Crafted.ts:42–50,:256–263`: `renderVerdict(viewer?)`,
  `resolveMakerName(maker, viewer?)` → `describeFor(viewer)`;
  `platform/thing/GradedReceptacle.ts:42–47` passes `_viewer`;
  `platform/thing/CraftVessel.ts:344–373` moves the verdict into a
  class-level augmenter (the quiet gate lands in W1, the viewer here).
- `LookController.ts:650–659`: `holder.describeFor(actor)`; :644, :657,
  :667, :686–687: `\n── …`.
- `platform/thing/Corpse.ts`: `ofIdentityPath: string`, `ofStem: string`
  (`fieldMeta` persistent for honesty, like `takenTissues`),
  `override describeFor(viewer, form)`: `the body of ${viewer is a
  BeliefStore && knownNameOf(ofIdentityPath) ?? ofStem}`.
  `ConditionLogic.ts:847–873`: mint with `ofIdentityPath =
  body.getIdentityPath()`, `ofStem = body.describeFor(undefined)` through
  the `handle` form (the stranger stem), `shortDescription: body of
  ${ofStem}`, and keywords = `body/corpse/carcass` + the dead's keywords
  MINUS its name words (`Named.getName/getFullName` tokens).
- `api/combat.ts` + `platform/idea/api/CombatLogic.ts`: `readingOf`;
  `lib/combat/Combatant.ts:648–662` uses it.
- `platform/idea/modalities/VisionModality.ts:339`: the person lift.
- `platform/idea/api/CommandLogic.ts:2104–2116`: target-sourced first.
- `api/mql/resolver.ts:390–393`: the perception gate on `#id`.
- `packages/wire/src/harness/session.ts:487–565`: `receive` keeps every
  non-message envelope in `envelopes: AnyEnvelope[]` and every message
  frame in `rawFrames: { topic, body, meta, payload }[]` (rings of 500);
  new methods `envelopesOf(type)`, `lastCard(type)`, `framesOf(topic)`,
  `clearCaptures()`; `cmd()` clears both rings as it clears `proseFrames`.
- Tests: `lib/spatial/__tests__/Container.test.ts` (a stranger's
  `contents` are held only; own contents full), `lib/material/__tests__`
  (mass absent for another person), `lib/craft/__tests__` (verdict names
  per viewer), `platform/thing/__tests__/Corpse.test.ts` (known /
  unknown name; name keyword not bound), `lib/combat/__tests__/CombatFog`
  + `CombatLogic` (bystander band steps toward steady; participant
  matches `perceive`), `VisionModality.test.ts` (#90),
  `CommandLogic` affordance order, `api/mql/__tests__` (`#id` of an
  unperceived thing resolves to nothing for a player; still resolves in
  system mode).

**Acceptance.** `lint:family` green; `lint:object-verbs` census
unchanged; `card-surface.md`'s `#id` prohibition paragraph updated to
the gate. Commit `build(client-surface W0): privacy on the wire — pockets,
mass, names, fog; the harness captures envelopes`.

### W1 — `look` as segments, the quiet lines, presence, grouping, shape, arrival

> ✅ **Done** (build). `MixinApi.getMarkupAugmenterLevels`,
> `Mml.augmentSegmented` (`augment` = its `.text`), `Visible.getSegmentedLong`
> (B7), `illustrationShape` with branch defaults, `card-opened/touched
> .segments`, the look segment builder in both branches (B8–B10), grouping,
> presence, level/seal words (`isVesselKind`), quiet one-piece, arrival
> forces `look` (`autoLookOnArrival`). The quiet verdict landed in W0 (B3).
> test:near 545/545 after the DETAIL_FIELDS list test; lint:family 85/85.

**Goal.** The server says each line's shape and source; the two quiet
lines go quiet; the presence line, the level/seal words, grouping, the
illustration shape and arrival-by-`look` land. Drive steps 1–4 pass. The
client still renders the old body (the card shows the records as today;
segments are on the wire, unread until W4).

**Implements** D1, D2, D10 (#74, quiet, level/seal, arrival, shape).

**Files.**
- `packages/types/src/index.ts`: `SegmentSource`, `ProseSegment`,
  `LookSegment`, `SegmentItem`, `IllustrationShape`; `CardOpenedEnvelope`
  / `CardTouchedEnvelope` `+ segments?`; `StuffDetailRecord
  .illustrationShape?`.
- `api/mixin.ts`: `getMarkupAugmenterLevels`; `getAllMarkupAugmenters`
  over it. `api/mml.ts`: `augmentSegmented`; `augment` over it.
- `lib/description/Visible.ts`: `getLongSegments`, `getMarkupLong` over
  it; `illustrationShape` field, `getIllustrationShape`, descriptor;
  `api/mql-subscription.ts` `DETAIL_FIELDS += 'illustrationShape'`.
- `LookController.ts`: the segment builder beside `body` in both
  branches; presence segment (`look:Presence`); grouped list segments
  (`NounPhrase.withCount` + `GrammarApi.pluralize`);
  `CardApi.open(..., { segments })`. `api/card.ts` / `CardRegistry.ts`:
  `CardOpenOptions.segments`, `CardState.segments`, the envelope.
- `lib/craft/Assembled.ts:448–455`: no "one piece" line.
  `CraftVessel`/`GradedReceptacle` augmenters: the empty-and-unsoiled
  gate. `lib/bulk/Bulkable.ts:1317–1362`: level word + seal word under
  `isVesselKind`.
- `lib/spatial/Mobile.ts:610–619` + the four callers: `autoLookOnArrival`.
- Tests: `api/__tests__/mml-augment-segments.test.ts` (append, wrap,
  strip, inline, transform-with-prior-state, collapse; `text` equals
  `Mml.augment` on the same input for every fixture), `mixin` levels
  (mixin vs class naming), `LookController.test.ts` (segment order
  equals the body's line order; band/tint/notices present as `notice`
  segments; `── Owned by` on its own line; presence line; grouped
  Placing list with 14 identical bottles → one group item of count 14),
  `Visible` shape default per branch, `Bulkable` level words,
  `Assembled` quiet, `Mobile` arrival forces `look`.

**Acceptance.** `card-birth-path.test.ts` green (no new mint site: the
same `CardApi.open` calls). Commit `build(client-surface W1): look
arrives as segments; quiet lines, presence, grouping, shape, arrival`.

### W2 — The card registry: roles, placement, actions, liveness, arrangements

> ✅ **Done** (build). `CardState` grows `live` (per instance), `size`,
> `sizeBefore`, `placed`, `minimized`, `role`; `demoteLive` is deleted;
> `arrange()` behind `Interactive.arrangeCard` and `cockpit card
> close|grow|shrink|minimize|restore|move|place|unplace|unpin`; the
> `card-arranged` envelope; arrangements are `ArrangementCard[]`
> (validated in `SaxonbergClient`); `cockpit layout save` records shape
> and place. No cap (B1). Client store mirrors the new fields and
> `card-arranged`. Decisions B11–B14.

**Goal.** Only a command changes which cards are up, and where. Drive
steps 10–11 pass.

**Implements** D4, D5, D8, D10 (#50, #53/#92).

**Files.**
- `packages/types/src/index.ts`: `WidthClass`, `CardPlacement`,
  `CardRole`, `card-arranged` envelope, `ArrangementCard`,
  `ArrangementSpec { cards: ArrangementCard[] }`; `card-opened` /
  `card-touched` += `size, placed?, minimized, role?, live` (live already
  on opened; now per instance), `card-touched` += `subjectId?,
  subjectKind?, segments?`.
- `platform/idea/CardRegistry.ts`: `CardState` fields; `open` keys an
  open subject card on `subjectId` (touch, not stack); the `here` role
  (stamp + rebind); per-card liveness (subscribe on place/pin, cancel on
  unplace/close; `resolveInto` honors `subjectId` for the one-shot);
  `demoteLive` deleted; `arrange(interactive, ref, change)` with the
  refusals in D8; `MAX_PLACED_CARDS`; medium/full single occupancy with
  `sizeBefore`; `applyArrangement` opens with placement and terminal
  state (the terminal half of this lands in W2b but the spec shape lands
  here); `listCards` returns the new fields.
- `platform/idea/api/CardLogic.ts`, `platform/idea/Interactive.ts`:
  `arrangeCard`, `placedCount`.
- `platform/idea/cmd/shell/CockpitCardController.ts` + `cockpit.yaml`
  :188–196: the actions (`move` takes `col row` positionals; `arg-kinds`
  lint). `LayoutController.ts:129–187`: save captures `ArrangementCard`s.
- `lib/connection/SaxonbergClient.ts:393–437`: the
  `cockpit.savedArrangements` validator accepts the new shape.
- Client (minimal, to keep green): `cardFeedSlice.ts` `CardState` gains
  the fields and `handleArranged`; `useCardFeed.ts` registers
  `card-arranged`; `card-birth-path.test.ts`'s client-writer assertion
  unchanged.
- Tests: `CardRegistry.test.ts` (touch-not-stack by subject; `here`
  rebinds and never opens a second; placed → live, unplaced → snapshot
  with `takenAt`; `MAX_PLACED_CARDS`; grow/shrink single occupancy;
  arrangement round trip restores size/placed/minimized/pinned);
  `CockpitCardController.test.ts` (each action echoes on `shell.control`
  and refuses with its reason); `LayoutController.test.ts`.

**Acceptance.** `cockpit layout save w; cockpit layout w` reproduces
the set, in a unit test over the registry. Commit `build(client-surface
W2): the registry owns placement — roles, actions, per-card liveness,
arrangements in units`.

### W2b — Terminal cards, per-bar prompts, the settings card, `explore`

> ✅ **Done** (build). `terminal` + `settings` cards; `cockpit terminal
> <view|#channel> [--beside]` / `primary <card>`
> (`CockpitTerminalController`); the registry's `openTerminal`,
> `showInTerminal`, `setPrimaryTerminal`, retarget, input-mode restore;
> `PromptEnvelope.barId`; `channel:<name>` tags on every channel frame;
> `play` → `explore` (with a refusal that names it); `Aether` → `Chat`.
> Decisions B15–B20. The chat tag has no unit test (no `postToChannel`
> test exists) — the W7 wire drive asserts it.

**Goal.** A terminal is a card kind with its own bar; prompts belong to a
bar; `play` is `explore`; settings are a card. Drive step 19's wire half
(two bars, two prompt slots) passes.

**Implements** D6, D10 (`explore`, settings card).

**Files.**
- Types: `CardId += 'terminal' | 'settings'`, `CardPayload += terminal`,
  `TerminalFilter`, `PromptEnvelope.barId?`, the `CockpitMode` rename and
  its five tables, `DEFAULT_VIEWS` "Aether" → "Chat" (#75).
- `lib/connection/Cards.ts`: `terminal` (`payload`, `pinnedByDefault:
  true`, `live: false`, `command: 'cockpit terminal <view>'`), `settings`
  (`client`, singleton, pinned, `command: 'settings'`).
  `SHIPPED_ARRANGEMENT_CARDS`: every mode's default names a primary
  terminal (`explore` → everything; `chat` → the default channel;
  `watch` → the game terminal + a stream-chat terminal; `build` → cms,
  git, studio + a diagnostics-filtered primary).
- `platform/idea/cmd/shell/CockpitTerminalController.ts` + `cockpit.yaml`
  (`terminal` subcommand); `CardRegistry.openTerminal`, `retargetPrimary`,
  `setPrimary`; `openArrangement` mints the primary when absent; the
  `primary-terminal` refusal on close/minimize.
- `platform/idea/api/PromptLogic.ts` builds the envelope at :144 (the
  push; "a prompt remembers who asked" :146) and :372/:386: stamp
  `barId` from the originating `CommandContext.barId`, threaded through
  the `PromptApi` call shape.
- `platform/idea/cmd/social/ChatController.ts:125–141`: `.tags(['channel:' + handle])`.
- `packages/content/platform/content/platform/cmd/shell/settings.yaml`
  gains `opens_card: settings`;
  `platform/idea/cmd/shell/SettingsController.ts` opens the card
  (`CardApi.open(context, 'settings')`) beside its report.
- `card-birth-path.test.ts`: the mint-site set (+ `CockpitTerminalController`,
  the settings controller, `openArrangement`'s primary), the
  `opens_card` set, the arrangement-born set.
- The rename's test list from Grounding; `cockpit.yaml` prose; the
  `SaxonbergClient.ts` comments; client `modes.ts` keys.
- Client (minimal): the store's `activeSlotByBar`, `pushPrompt` keyed on
  `entry.barId ?? primaryBarId`; `CommandBar` reads its own slot;
  `submitActive` falls through on a non-numeric `choice` draft.
- Tests: `CockpitTerminalController.test.ts` (retarget, beside,
  primary, refusal), `CardRegistry` terminal cases, `PromptLogic` barId,
  `ChatController` tag, client `CommandBar.test.tsx` (two bars, one
  prompt, the other bar's Enter sends a command).

**Acceptance.** Wire: `cockpit terminal #general --beside` opens a
second `terminal` card whose `payload.barId` differs; a `prompt`
envelope carries the asking bar. Commit `build(client-surface W2b):
terminals are cards; prompts are per bar; play is explore; settings is a
card`.

### W3 — The client geometry: tiers, regions, chrome, the card area

> ✅ **Done** (build). `tokens.width` / `tokens.tier` (rem);
> `useWidthTier` (+ the slate's table as a test); `useIsCompact` in rem;
> `Rail` (modes, panel icons, you-corner, `settings`); the status bar
> carries the shelf (plain words, B18) and the tray; `ModeStage` (panel
> with the `here` card, terminal column with the medium slot, card area,
> full stage with the terminal strip and chips); `CardArea` over the pure
> `arrangeCards` (feed/workspace, displacement, trail, overflow, drag →
> `cockpit card move`); `Card` controls as commands, cut to fit; the
> terminal's 42rem measure and stick-to-bottom chip (#54); the fallback
> notice; `Frame.tsx` retired. Decisions B21–B24. The render spec
> `client-surface-layout.spec.ts` is written; it runs at W7.

**Goal.** The layout fits the window. Browser steps 12–15, 21, 22 pass
(22's "tab views are filters" completes in W5).

**Implements** D9, D5 (render side), D8 (controls), D10 (chrome, #54,
#55, #59, #77, govern notice).

**Files.**
- `components/ui/tokens.ts`: `width`, `tier`; `breakpoint.compact`
  retired in favor of `tier.phone` (same 47.5rem).
- `lib/style/useWidthTier.ts` (new), `useIsCompact.ts` (wrapper).
- `layouts/ModeStage.tsx` (new), `layouts/regions/{Rail,Panel,TerminalColumn,CardArea,RecentTrail}.tsx`
  (new), `layouts/modes.ts` (configs; `resolveMode` unchanged;
  `fallbackFrom` rendered as the notice), `layouts/primitives.ts`
  (`LeftColumn` → `TerminalColumn` with `max-width: tokens.width.measure`
  rem and the 42rem text measure; `SideColumn` retired).
- `components/frame/Rail.tsx` (new; `Frame.tsx` retired; `data-testid`
  `nav-rail`), `StatusBar.tsx` (shelf figures left with the new labels,
  tray right; `data-testid="tray"`), `Shelf.tsx` labels (#77, title case),
  `ViewsMenu.tsx` retired, `AccountMenu.tsx` (you-corner; settings sends
  `settings`), `MobileFrame.tsx` (kept for W6).
- `components/Terminal.tsx`: the 42rem measure on the text column, the
  stick-to-bottom scroll + "new lines" chip, the strip variant (3–4
  lines) for full.
- `components/cards/CardArea.tsx` (new): feed (one unit) vs workspace
  (2+ units) from `useWidthTier().units`; placed cards by `(col, row)`
  with the rightmost column folding into feed order when it does not
  fit; flowing cards by touch; compress → displace (oldest touch, unpinned,
  flowing, not role/owed) → spill → overflow (one scrolling surface); the
  Recent trail (displaced chips say `displaced by <cmd>`); drag =
  insertion only → sends `cockpit card move <card> <col> <row>`; medium
  slot in the terminal column; full takes the stage with the terminal
  strip at the column's x and the other cards as chips.
- `components/cards/Card.tsx`: controls send the D8 commands (grow,
  shrink, minimize, close, pin/unpin); header never scrolls; the body is
  cut bottom-up at unit with "Cut to fit … larger ▸" (the image
  collapses first — W4 adds the image).
- `store/cardFeedSlice.ts`: `handleArranged`; `orderCards` split into
  `placedCards` / `flowingCards`; `MAX_CLOSED` → the trail; the stale
  doc comment at ~:249 fixed.
- `App.tsx`: one `ModeStage`; `SettingsPanel` no longer docked (it is a
  card body now); `setConnectionPhase` clears `ghostPreview`;
  `CharGenStage.tsx` drops its own `StatusBar`.
- Tests (vitest+RTL): `useWidthTier.test.ts` (each slate row → units,
  at 100%, 125%, 150% root font), `CardArea.test.tsx` (feed vs workspace;
  placed survives a narrow-and-back; displacement picks oldest touch;
  role/pinned/placed never displaced), `Terminal.test.tsx` (measure;
  scroll rule), `chromeComposition.test.tsx` (no top bar; one status
  bar; rail present), `modeResolution` (fallback notice text).
- Render (Playwright, new `e2e/tests/client-surface-layout.spec.ts`):
  viewports 1280×720, 1440×790, 1536×864, 1728×1117, 1920×970, 2560×1440
  × device scale 1 / 1.25 / 1.5 (`page.setViewportSize` + CSS zoom via
  `document.documentElement.style.zoom` is unreliable — emulate zoom by
  setting the viewport to the CSS width the slate's table names); assert
  column count (`[data-testid=card-column]`), terminal text width ≤ 42rem
  + padding, `document.documentElement.scrollWidth <= clientWidth`.

**Acceptance.** AC 1 (the six widths), AC 2 (placed returns), the
`govern` notice, no top bar. Commit `build(client-surface W3): the
window fits — rem tiers, rail and status bar, feed and workspace`.

### W4 — The inspection card renders the segments

**Goal.** The card says exactly what `look` said. Browser steps 16–18
pass; #51, #69, #71, #76, #89, #91 close.

**Implements** D1/D2 (render), D7 (links), D10 (#89, shape, CharGen).

**Files.**
- `components/cards/InspectionBody.tsx` (new; replaces the inspection
  branch of `CardBodies.tsx:1414–1505`): header (title, Perceptible +
  Containable/Addressable stripes, the branch letter), the image plate
  by shape (`IllustrationPlate.tsx`: wide spans the card; tall/square
  sit beside the prose at unit; larger at medium; never `object-fit:
  cover`), then the segments in order — `prose` with detail words as
  breadcrumb drill-ins, `state` as a paragraph, `list` as `ChipList`
  (groups expand in place; a chip sends `look #<id>`), `notice` as a
  notice row — each with `Gutter` (3px stripe, `colorForTopic(source
  name)`, solid for `mixin`, dotted for `class`/`look`; several stripes
  for several sources), then `QuietRow` ("N quiet interfaces ▸" =
  composition minus the sources that spoke minus the header's two,
  expanding in place; a quiet interface's hover may show its help
  summary's "how you'd find out" line), then `ActionRow` (sends `<verb>
  #<id>`). Hover on a stripe: the interface name, its summary (`help`
  REST, cached), what it said; click: a popover with help, the deeper
  look (`look #<id>` / `measure #<id>` opens its own card), copy.
- `CardBodies.tsx`: `Label` sentence case (#69); `HERE_SHOWN`/`Overflow`
  retired for the subject body (other bodies keep them); `DetailTrail`
  shows the drill command; `handleProseClick` sends `look #<id> <detail>`.
- `components/cards/Card.tsx`: cut order — image first, then the lowest
  section.
- `CharGenStage.tsx:174–188`: 4:5, contain.
- `scripts/project-author-surface.ts` + `HelpCatalogue.ts:453–476`: the
  `mixins` section (#89); `api/help.ts` unchanged.
- Tests: `InspectionBody.test.tsx` fed a captured `card-opened` fixture
  for each specimen (pint, gin, back-bar, knife, corpse, Dave, the bar)
  — asserts every segment text appears once, in order, with its stripe
  kind; the quiet row's count; grouping expands; the image plate's
  aspect per shape; no `object-fit: cover`. `HelpCatalogue.test.ts`
  (mixin summary from the factory TSDoc). `inspect.spec.ts` (render):
  hover names Bulkable; the detail opens behind the breadcrumb with its
  command in the status bar.

**Acceptance.** AC 6 (card = terminal; proved by the fixture test over
the same envelope the terminal rendered), AC 9 (links name one thing),
AC 10 (no crop). Commit `build(client-surface W4): the inspection card is
look, by source`.

### W5 — Terminal cards, chat and watch on the client

**Goal.** Every terminal is a card; chat has a terminal; watch is laid
out. Browser steps 19–20 and the rest of 22 pass.

**Implements** D6 (render), D9 (chat/watch/build configs).

**Files.**
- `components/cards/TerminalCardBody.tsx` (new): a `<Terminal>` over
  `frames` filtered by the card's `payload.filter` (view → `console.tabs`
  facets/mutes; channel → `tags` then `channelName`), its own
  `CommandBar barId={instanceId}` and `PromptStrip` for that bar; at
  `line` width a ticker (last line + unread); the primary is the
  terminal column's resident and cannot close.
- `layouts/modes.ts` configs: `chat` (primary filtered to the active
  channel; panel = `channels` card; picking a channel sends `cockpit
  terminal #<channel>`; "open beside" = modifier-click → `--beside`; a
  channel already open is marked and focuses its card), `explore`
  (primary everything; panel = the `here` card), `watch` (medium slot =
  the video; stream chat = a unit terminal card filtered `speech.relay` +
  `stream-chat` tags; the streamer deck a card body), `build` (two
  measure-width terminals when the panel is shut).
- Retire: `TabStrip.tsx` (its editor becomes the terminal card's filter
  chip + `FilterDrawer`), `ChatSurface.tsx`, `SubjectShell.tsx`'s log
  half, `WorldLayout.tsx`, `ForumLayout.tsx`, `BuilderLayout.tsx`;
  `LivestreamPanels.tsx` keeps `TunedRail` and `StreamerDeck` as card
  bodies.
- `App.tsx:374–434`: `visibleFrames` becomes per-card filtering inside
  `TerminalCardBody` (mutes/facets/carded/reaction rules move with it;
  `cardedFrameIsCovered` unchanged).
- Tests: `TerminalCardBody.test.tsx` (filter by view, by channel from
  tags, backfilled frame with only a tag filters), store prompt-per-bar
  tests, `tabs.spec.ts` + `views.spec.ts` rewritten to filters,
  `panes.spec.ts` for watch.

**Acceptance.** AC 5. Commit `build(client-surface W5): every terminal is
a card; chat has a terminal; watch is laid out`.

### W6 — The phone

**Goal.** Chat first; explore with a button bar; watch; every card
reachable. Browser step 23 passes.

**Files.** `components/phone/{PhoneShell,ChannelDrawer,HereDrawer,ModeTabs,TargetChip,SuggestionStrip,ReplyChip,LinePressMenu,ButtonBar,CardSheet}.tsx`
(new); `MobileFrame.tsx` retired into `PhoneShell`; `MobilePlaySurface.tsx`
(`PinnedChipRow` becomes the placed-card chips; `InlineCard` = the unit
class, tapping opens `CardSheet` at stage with the terminal strip);
`CommandSheet.tsx` kept (long-press entries name their command through
it); `useWidthTier` `tier === 'phone'` selects `PhoneShell` in
`ModeStage`. Chat default on phone: `DEFAULT_COCKPIT_MODE` stays
`explore` server-side; the phone shell's first render sends nothing and
shows chat when `cockpit.mode` is unset — ⚠ a client-side default is a
viewport fact, which the server cannot know (`cockpit.formFactor` rule);
it is recorded in the mode config, not written to client state.
`ButtonBar`: exits first (from the `here` card's `exits`), then the top
three subject affordances, "⋯" opens the commands card. The tray lives
in the drawer; no status bar.

**Tests.** `mobile-chrome.spec.ts` (PHONE and NARROW: chat default, the
two swipes, long-press menu shows commands, explore button bar order, a
card opens inline then as a sheet with a strip), `PhoneShell.test.tsx`.

**Acceptance.** AC 11. Commit `build(client-surface W6): the phone —
chat first, explore with a button bar, watch`.

### W7 — The drive, the docs, the issues

**Goal.** The blocking drive runs and is recorded; the subsystem docs say
what shipped; the MR text closes the 23 issues.

**Files.**
- `packages/wire/tests/client-surface.wire.test.ts` (steps 1–11; step 7
  stages a death with the founder's `eval` as the identity wire test
  does; step 8 opens combat between A and an NPC as `combat` wire tests
  do; the second/third players are their own `Session`s in Dave's Bar via
  `startLocation`).
- `e2e/tests/client-surface-layout.spec.ts`, `inspect.spec.ts`,
  `tabs.spec.ts`, `views.spec.ts`, `panes.spec.ts`, `mobile-chrome.spec.ts`,
  `status-bar.spec.ts`, `cockpit.spec.ts` (steps 12–23).
- Docs: `docs/subsystems/card-surface.md` (placement, roles, per-card
  liveness, the segments, the `#id` gate, the trail), `cockpit.md`
  (`explore`, the card actions, `cockpit terminal`, arrangements in
  units), `client-shell.md` (rail, status bar + tray, the phone shapes,
  tabs → filters), `record-layer.md` (the `channel:` tag),
  `message-rendering.md` (segments), `perception.md` (`isAnotherPerson`,
  the person lift), `combat.md` (`readingOf`), `mortality.md` (the
  corpse's per-viewer name), `presentation.md` (count form in lists),
  `media.md` (`illustrationShape`), `help.md` (mixin summaries).
  `CLAUDE.md` map blurbs are ONE line each; expand the docs, not the
  blurbs.
- Slates: `carded-prose-slate.md` retires (superseded); `card-sizes-slate.md`
  compacts its revised sections (⟲); `client-surface-slate.md` → BUILT
  with the ledger; the deferred seams below are written as slate lines.
- The drive record appended to this plan.

**Acceptance.** The wire file passes against a booted world; the render
specs pass on Desktop Chrome; the drive record is in this doc with the
run's output. Commit `build(client-surface W7): drive, docs, slates`.

---

## Reachability wiring

Each new capability, the five links, and where each is closed.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| segments on the card | `look` (exists) | — | `card-opened.segments` from `LookController` (W1) | none | `look.yaml` unchanged (`greedy: true`, `default: $focus`) |
| `#id` links | every verb with an object slot | the card chips send it (W4) | the resolver gate (W0) | none | `greedy` verbs still take `#id` as the first token — verify `look #id` on the drive |
| `cockpit card <action>` | `cockpit card` (exists) | `Card.tsx` controls (W3) | `CARD_ACTIONS` + `cockpit.yaml` args (W2) | none | `move` needs two numeric positionals — `lint:arg-kinds`; a missing arg refuses with `missing-arg`, never silently |
| `cockpit terminal` | new subcommand (W2b) | channel list, "open beside", the rail (W5) | `cockpit.yaml` + controller | none | a view name that is not in `console.tabs` and not a `#channel` refuses `unknown-view` |
| `terminal` / `settings` cards | `cockpit terminal` / `settings` | — | `Cards.ts` rows; `SHIPPED_ARRANGEMENT_CARDS`; `card-birth-path.test.ts` sets (W2b) | `openArrangement` mints the primary at enter | — |
| `here` role | arrival `look` / `look` | — | `CardRegistry.open` stamps it (W2) | none | — |
| per-bar prompts | — | — | `PromptEnvelope.barId` (W2b) | none | an un-barred prompt attaches to the primary — never dropped |
| `illustrationShape` | — | — | `DETAIL_FIELDS` + the descriptor (W1) | none | an authored value outside the closed set refuses at the setter (`lint:closed-vocabularies`) |
| `readingOf` | `look` (augmenter) | — | `combatStateAugmenter` (W0) | none | — |
| mixin summaries | `help mixin.<X>` | gutter hover (W4) | `author-surface.json` `mixins` (W4) — regenerated by `pnpm docs` at build; `HelpCatalogue` falls back to the member summary when absent | — | — |
| `channel:` tag | `chat` (exists) | — | `ChatController` (W2b) | none | — |
| explore | `cockpit mode explore` | the rail (W3) | the five type tables (W2b) | — | `cockpit mode play` refuses `unknown-mode` and names `explore` |

⚠ The silent failures this table exists for: a `CardId` not in
`SHIPPED_ARRANGEMENT_CARDS` and not minted by a verb fails
`card-birth-path.test.ts` at W2b, not at the drive; a `cockpit.yaml` arg
with no default and a required flag fails closed and SILENT
([instrumentation.md]) — every new positional is `required: false` with
the controller refusing by name.

---

## Acceptance-criteria coverage

| AC | wave(s) | proof |
|---|---|---|
| 1. six widths, ≤ ~90 ch, no horizontal scroll, at 125/150% | W3 | `useWidthTier.test.ts` + `client-surface-layout.spec.ts` (step 12) |
| 2. placed returns after any resize | W2 + W3 | `CardArea.test.tsx`; step 13 |
| 3. every change is a command; recall reproduces | W2 | `CardRegistry.test.ts`, `CockpitCardController.test.ts`; wire step 10 |
| 4. moving never adds a second room card | W2 | registry test; wire step 11 |
| 5. chat has a terminal; own bar + mode; primary cannot close | W2b + W5 | `TerminalCardBody.test.tsx`; wire 19 (bars), browser 19 |
| 6. card = terminal line for line, by source | W1 + W4 | `LookController.test.ts` (segment order = body order), `InspectionBody.test.tsx` over the same envelope; wire 1–4, browser 16 |
| 7. no pockets, mass, unknown name; fog | W0 | the W0 unit tests; wire 5–8 |
| 8. arrival shows the room as `look` | W1 | `Mobile` test; wire 1 |
| 9. a card action names exactly its thing | W0 + W4 | resolver gate test; wire 9 |
| 10. no crop or stretch; per shape | W1 + W4 | `IllustrationPlate.test.tsx`; browser 18 |
| 11. phone: chat, explore, watch usable; every card reachable | W6 | `mobile-chrome.spec.ts`; browser 23 |
| 12. the 23 issues close, each observably | W0–W6 | per issue: #55 W3 · #54 W3 · #49 W4 · #97 W2b/W5 · #53 W2 · #92 W2 · #50 W2/W3 · #76 W1/W4 · #91 W0/W4 · #51 W4 · #89 W4 · #90 W0 · #74 W1 · #69 W4 · #71 W1/W4 · #84 W2b/W3 · #75 W2b · #77 W3 · #59 W3 · #52 W1 · #103 W0 · #104 W0 · #105 W0 |

Unmapped: none. The requirements' "Collisions" are covered: the back-bar
(D2 grouping), the house tablet (the screen segment), the privacy change
for every person (W0), saved arrangements (D5), the watch overlay (W5
keeps `speech.relay` frames in the stream-chat terminal card), char-gen
4:5 (W4), the forum and CMS as today's cards (untouched), the tray word.

---

## Test & gate strategy

- **Unit (vitest).** Every server decision above has a named test beside
  its file; the segment fold has a fixture per augmenter shape and an
  equality assertion against `Mml.augment`. The client's `InspectionBody`
  is tested over CAPTURED envelopes (W1's wire run writes the specimen
  fixtures to `packages/client/src/components/cards/__tests__/fixtures/`),
  so AC 6 is proved on the same bytes.
- **Wire (`packages/wire/tests/client-surface.wire.test.ts`).** Steps
  1–11, all `instant` except 7 (`short`: a death staged by `eval`, under
  an hour of game time). Player assertions: 1–4, 9–11; staged: 5–8. Every
  step's assertion channel is the envelope or `envelopesOf('card-opened')`
  — never prose for an outcome; `said()` only where the fact's only
  observable is a line (the `──` newline, the presence line), counted.
- **Render (Playwright).** Steps 12–23 on Desktop Chrome (the shipped
  project) plus the phone contexts `mobile-chrome.spec.ts` already
  defines. ⚠ `testing.md § The e2e suite is RED on master` — validate the
  instrument first: run the existing `cockpit.spec.ts` against the booted
  stack before trusting a new red.
- **Blocking drive** = steps 1–23. **Soak drive** = none (no step moves
  the clock past an hour). Staged twins: none owed.
- **The two full-suite moments.** `pnpm test` before the MR opens
  (code-complete = after W6) and at `/finalize`. Between: `pnpm
  test:near`, `pnpm -C packages/client test`, `pnpm -C packages/server
  lint:family`, and the client ESLint.
- **Gates by name** — see Convention conformance.

---

## Risks & opens

**Needs the owner** (decided here so the build does not stop; flagged so
it can be overturned in review):

1. **D7 — `look #c3f9a…` is what the status bar previews** for a card
   link. It is exact and learnable (the grammar already has it), but it
   is not what a player would type for a stool. The alternative — an
   ordinal — is order-dependent and was rejected by the requirements'
   "never the first match". If the owner would rather hide the id form,
   the chip can preview the keyword and SEND the id, which breaks "every
   clickable previews what it sends"; I did not do that.
2. **D3 — a bystander reads a fight at the untrained floor**, because the
   augmenter is synchronous and the lived combat band is async. A trained
   bystander's sharper eye is left as a seam.
3. **D5 — an unsaved workspace does not survive a reconnect** (cards are
   per-Interactive in memory, as today); the active SAVED arrangement
   does. The requirements say "recalling an arrangement restores it",
   which this meets.
4. **D10 — chat is the phone's default by a client-side rule**, not a
   stored mode, because the server cannot know a viewport
   (`cockpit.formFactor` was refused for that reason). A phone player who
   types `cockpit mode explore` is honored for the session.

**Findings outside this build** (recorded, not fixed):

- **A living stranger is addressable by true name.** MQL's
  `nameOf`/`keywordsOf` are viewer-blind (`resolver.ts:1800–1806`), so
  `look mara` works for a player who has never met Mara. The corpse case
  is fixed here (the corpse never carries the name keyword); the living
  case is a belief/MQL finding → a slate line under the belief subsystem.
- The `look`/`sense` two-gates disagreement (`LookController.ts:375–392`)
  is why items are resolved eagerly; segments keep that resolution.
- `#86` (player-typed MML on the wire) is ahead of this build and not
  waited on.

**Risks:**

- **`lint:object-verbs`** may refuse `readingOf(viewer, target)` even
  though `perceives(viewer, target)` exists; the fallback (a method on
  `CombatantMixin`) is named in Convention conformance.
- **`resolveInto` for a one-shot `needsSubject` card** (D4) — today the
  static path never resolves a subject-bound query; the build must add
  the one-shot `resolveSubjectBound` call and test it.
- **The prompt envelope's `barId`** depends on the originating
  `CommandContext` reaching the prompt push; if a controller prompts
  from a scheduled continuation with no context, the prompt attaches to
  the primary (the fallback is designed, not accidental).
- **Playwright zoom.** Browser zoom cannot be set by the API; the render
  spec emulates each slate row by its CSS width, and the 125%/150% cases
  are the same CSS widths (1536 and 1280). The AC is stated in CSS
  pixels, so this is the AC.
- **The e2e suite is red on master** (testing.md); the new specs are
  judged against a validated instrument.
- **Size.** W3–W5 retire five layout files and the tab strip; each wave
  is landable because the old components are deleted only in the wave
  that replaces them, and `MODE_REGISTRY` keeps rendering whatever is
  registered.

---

## Deferred seams

Clean attach points, each leaving as a slate line (none lives in this
plan after the sweep):

- **A trained bystander's combat eye** — `CombatLogic.readingOfImpl`
  takes the viewer's sharpness as one number; an async pre-resolve at
  `look` time (the controller already awaits) can supply the lived band
  → combat slate.
- **The navigator role card** — `CardRole` has room for `'navigator'`;
  the explore panel's second card → card-sizes slate.
- **Per-mixin wording** — each augmenter's text is its own; the gutter
  shows it as is → client-surface slate § "What each mixin says is left
  to the build" (already there).
- **Thumbnails and the generator's crop at creation** →
  illustration-slate.
- **Forum / CMS split into cards; the govern layout; branch card bodies**
  → card-sizes slate (unchanged).
- **The living-stranger name leak in MQL** → a new line on the belief
  subsystem's slate (named above).
- **Pop-out windows; the streamer deck's future** → broadcast-ready
  slate.

---

## Critical files

Read first, in this order:

1. `docs/requirements/client-surface-requirements.md` — the product scope.
2. `docs/subsystems/card-surface.md` §§ One birth path · Two axes ·
   Subject-bound subscriptions · The wire · Reconnect behavior.
3. `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`
4. `packages/server/src/mud/api/mml.ts` (:125–210, :862–869) and
   `api/mixin.ts` (:2418–2448).
5. `packages/server/src/mud/platform/idea/CardRegistry.ts` and
   `lib/connection/Cards.ts`.
6. `packages/types/src/index.ts` — `CardId`, `CardPayload`,
   `CardOpenedEnvelope`, `CardTouchedEnvelope`, `ArrangementSpec`,
   `CockpitMode` and its tables, `ConsoleTab`, `MessageFrame`.
7. `packages/server/src/mud/api/__tests__/card-birth-path.test.ts`.
8. `packages/server/src/mud/platform/idea/api/PerceptionLogic.ts:573–610`,
   `lib/spatial/Container.ts:366–391`, `lib/material/Tangible.ts:250–256`,
   `platform/idea/api/ConditionLogic.ts:847–873`, `platform/thing/Corpse.ts`,
   `lib/combat/Combatant.ts:648–662`, `platform/idea/api/CombatLogic.ts:1074–1083,:5538–5562`,
   `platform/idea/modalities/VisionModality.ts:285–348`.
9. `packages/client/src/App.tsx`, `layouts/modes.ts`,
   `components/ui/tokens.ts`, `lib/style/useIsCompact.ts`,
   `store/cardFeedSlice.ts`, `store/index.ts` (:227–300, :1535–1560),
   `components/CommandBar.tsx` (:455–500, :586–628),
   `components/cards/CardBodies.tsx` (:1414–1505),
   `components/cards/Card.tsx`, `components/GutterStripe.tsx:122`.
10. `packages/wire/src/harness/session.ts` (:487–565, :620–700),
    `packages/wire/tests/identity.dirty.wire.test.ts`,
    `e2e/tests/mobile-chrome.spec.ts`, `e2e/tests/helpers.ts`.
11. `docs/design/client-surface/README.md` and the comps it lists (serve
    the folder; open `Main.dc.html`, `Inspect.dc.html`,
    `Terminals.dc.html`, `Phone.dc.html`).
12. `docs/testing.md` §§ Two tiers · Attach or own · A drive is BORN a
    wire file; `docs/workflow.md § No merge waits on the clock`.

---

## Drive record

*(appended at build time)* — the output of running the requirements
doc's blocking drive (`packages/wire/tests/client-surface.wire.test.ts`
steps 1–11 and the render specs for steps 12–23) against the running
game: the run, the count, what each failure was. No soak drive.
