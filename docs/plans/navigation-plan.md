# Navigation card — implementation plan

The Explore panel's docked card becomes **the zone navigation card**: a
drawn map of the zone you are in, the ways from here, and the card's
sections widest to narrowest, every mark explained by a tooltip — all
drawn from the copy of your own map and the seven where-you-are sections
the server already pushes. Executes
[navigation-requirements](../requirements/navigation-requirements.md)
(AGREED 2026-11-20). **Kind:** client. **Leads from:** content (the server
half shipped in navigation-server, MR !595). **First consumers:** the
Sunken Delve, the lounge and Dave's Bar, Rejection and Hearts Delight, the
Hush, the Hesper.

⚠ **Read § Risks & opens first.** The grounding found six places where the
requirements' premise (*"the server half shipped; the one content change is
a name"*) does not hold in the code. Each is named there under
**⚠ REQUIREMENTS**, with the smallest touch that makes the drive possible.
None is absorbed silently; W0 carries the ones this plan recommends, and
one (W8) was the owner's call — **approved 2026-11-20**, with the `nav.card` schema entry and season-plus-daylight as *time* (§ Owner's rulings).

## Grounding

Verified by opening the file, at `a074e0c11` (origin/master `4070745a2` +
the requirements commits). Paths are from the repo root.

### The client today

- **The docked slot.** `packages/client/src/layouts/ModeStage.tsx`:
  `CONFIG.explore = { panel: "navigator" }`; the panel docks the card whose
  `cardId === "map"` (`navigator = placeable.find(c => c.cardId === "map")`)
  and renders it `<Card docked>`. `Panel` is a flex column,
  `width: ${tokens.width.panel}rem`, `overflow-y: auto`, with a
  `panel-collapse` toggle (`setModePanelOpen(false)`; `modePanelOpen` is
  in-memory, `store/index.ts`).
- **The panel collapses for a column.** `usePanelOpen()` in `ModeStage.tsx`:
  `open = want && units.withPanel >= 1` — the panel closes whenever no card
  column fits beside it.
- **Width.** `components/ui/tokens.ts`: `width.panel = 15`, `rail 3.5`,
  `measure 44`, `unit {min 22, max 28}`, `gap 0.75`; tiers `phone 47.5 ·
  narrow 68.75 · feed 103.125 · workspace 143.75` (rem).
  `lib/style/useWidthTier.ts` `unitsFor(rem, panelOpen)` =
  `floor((rem − rail − panel? − measure) / (unit.min + gap))`; its table is
  pinned in `lib/style/__tests__/useWidthTier.test.ts`.
- **The text navigator.** `components/cards/CardBodies.tsx`
  `NavigatorCardBody` → `whereaboutsOf(navSections)` →
  `components/cards/NavigatorBody.tsx` (256 lines): crumbs from
  `localities.chain` (the live world), a 3×3 rose of in-zone exits, an
  up/down row, a **"Leaving this area"** list of `crossesZone` exits, an
  **"Outside"** block (weather, season, daylight) and **"Whose ground"**.
  Test ids in use by other walks: `navigator`, `nav-crumbs`,
  `nav-jurisdiction`, `nav-exit-<direction>` (a window's arm is
  `disabled`), `change-mark-nav:ways`
  (`e2e/tests/navigation-server-walk.spec.ts`,
  `e2e/tests/boundary-walk.spec.ts`).
- **Your knowledge on the client.** `store/navSlice.ts`: `navSections`
  (replaced one section at a time) and
  `mapCopy: Record<"<locality>|<claim key>", { locality, claim: WireClaim }>`
  (snapshot overwrites, a change replaces one claim). The file's own header
  says the copy *"is held and rendered by nothing yet"*. Both are slices of
  the one zustand store (`store/index.ts`, `createNavSlice`). There is **no
  selector layer** anywhere in the client.
- **The subscriptions.** `services/websocket.ts` `openNavigation()` opens
  `SUBSCRIPTION_SOURCES.whereabouts` and `.mapCopy` once per session and
  replays them on every connection; `applySessionSubscriptions` feeds the
  slice and calls `noteSurfaceChange("nav:<section>", causes)`.
- **Notes.** `dispatch-response` envelopes carry `outcome.notes`;
  `applyPromptSideEffects` is the only reader (for `prompt-refresh`).
  **Nothing handles `route-plan`.**
- **Remembered client state.** `store/cardViewActions.ts` is the pattern:
  `setLocalClientState(key, v)` + `websocketClient.sendClientStateWrite(key, v)`.
  The server refuses a key no schema declares
  (`packages/server/src/mud/lib/connection/ClientState.ts`
  `setClientState` throws *unknown key*); the keys are declared in
  `packages/server/src/mud/lib/connection/SaxonbergClient.ts`
  `clientStateSchema` (`console.tabs`, `cards.views`, `cockpit.*`, …).
  A guest's writes stay in session memory
  (`packages/server/src/backend/inbound/clientState.ts`). `localStorage` is
  used by one thing only: `CommandBar` history.
- **Tooltips.** `components/tooltip/Tip.tsx` (`<Tip tip={doc|spec}>`,
  clones handlers onto its child), `useTip.ts`, `useFloat.ts`,
  `TooltipLayer.tsx`; `components/doc/docs.ts` builders (`controlDoc`,
  `thingDoc`, `wayDoc(dir, command, {to, through})`, …);
  `services/tooltipSource.ts` — three sources only: a live thing
  (`mql-query`, reach- and light-gated), a help term, a wiki term.
  `TooltipSource = 'seen' | 'help' | 'wiki' | 'client'`
  (`packages/types/src/index.ts`; its comment says the navigation build adds
  `walked` / `told`). `TooltipDoc` blocks: header · facts · prose · image
  (a media key) · spoilers · hint · command · miss.
- ⛔ **No native hover text.** `src/__tests__/noNativeTitle.test.ts` holds
  `title=` **and `<title`** at ceiling 0 across `src/` — an SVG `<title>`
  child fails the gate.
- **The affordance radial.** `store/affordanceSlice.ts`
  `openRadial({ stuffId, displayName })`; the gestures (right-click, a
  450 ms mouse hold) are inline in `components/ui/EntityName.tsx`; a touch
  tooltip sheet's *actions* button opens it (`TooltipLayer.tsx`).
- **Icons.** `components/ui/icons/iconMap.ts`: ten Lucide icons (card
  controls, four branch placeholders); no direction, elevation or way-state
  glyph. `lucide-react 0.454.0` is the only icon dependency.
- **The status bar.** `components/frame/StatusBar.tsx` renders three
  regions: the command preview (`ghost-line`), `status-bar-action`, and the
  tray. ⚠ `client-shell.md` says it also carries the shelf
  (`status-shelf`); the file does not. A guard test asserts exactly one
  module reads `ghostPreview`. The phone shell has no status bar.
- **Commands from clicks.** `components/cards/clickTarget.ts`
  `lookCommand(stuffId, keyword, mode)` (`look <word>` or `look #<id>`).
- **Client dependencies** (`packages/client/package.json`): react,
  zustand, styled-components, `@floating-ui/react-dom`, lucide-react,
  monaco, nanoid, yaml. No d3, no graph library. Tests: vitest + jsdom
  (`vitest.config.ts`), colocated `__tests__/`.

### The wire (`packages/types/src/index.ts`)

- `WireClaim`: `key`, `kind` (`place | edge | band | locality`), `place`
  (`TaggedPath`, or a bare **address** for a locality claim), `label`,
  `name`, `keywords`, `group`, `dir`, `to` / `toLabel`
  (`TaggedPath | null`), `channel` (six), `conditional`, `state`
  (`WayState`), `government`, `localityKind`, `at?: WirePosition`
  (`zone: TaggedPath`, `x y z`, `level`, `line`, `geo`, `reckoned`, …),
  `firstSeen`, `lastSeen`.
- `WayRecord`: `direction`, `state`, `crossesZone`, `destination?`,
  ⭐ `boundary?: { stuffId, name, primaryKeyword? }`. `NavWay` adds
  `oneWay`, `muffled`, `needs`, `lengthM`, `opening`,
  `facts?: Record<string, string | number | boolean>`,
  `take?: { ok: true; unseen? } | { ok: false; gate; reason; works? }`.
- Sections: `ZoneSection { id?: TaggedPath; kind?: grid|sphere|chart|water;
  cellSizeM?; label? }` · `LocalitiesSection { chain[{name, address, kind?,
  government?}], ship?, outer?: Lie, jurisdiction[] }` · `HorizonSection
  { atSea, things[{stuffId, name, landmark, glance?{point?, closeBy?,
  roughMiles?}}], traffic }` · `BuildingSection { name?, storey?, storeys?,
  entrance?, heightM?, landmark?, titleSold?, landed? }` · `PlaceSection
  { stuffId, name, at?{x,y,z}, light?, dark?, openSky?, weather?, season?,
  daylight?: day|night, water?, staged?, crowd?, lowCeiling?, elevationM?,
  searched?, found? }` · `YouSection { pace?, posture?, hands?, freeHands?,
  load?, bars?, light?, mount?, led?, cart?, fighting? }`.
- `RoutePlanNote { kind: 'route-plan'; to; plans: WireRoutePlan[] }`;
  `WireRoutePlan { nodes[{place: TaggedPath, name}], legs[{from, to, dir,
  minutes, conditional}], cost, assumptions[{kind, leg, text}],
  leastCertain }`.

### The server, as it bears on the card

- **Claims are filed by Locality, or not at all.**
  `packages/server/src/mud/lib/location/Cartographer.ts` `recordPerceived`:
  `const locality = await this.claimLocalityOf(…); if (!locality) { await
  this.recordSea(…); return; }` — a place no Locality covers writes **no
  claim**; `recordTraversal` and `recordArrival` return the same way.
- ⚠ **The Sunken Delve is covered by no Locality.**
  `packages/content/newbie-wilds/content/world/newbie-wilds/delve.yaml`
  (a `CartesianZone`, `cellSize: 3.0`) declares no `address:` and no Delve
  room declares `_address`; its neighbors do (`crossroads/treeline.yaml`
  `_address: last-counted-mile/treeline`; every steading room). The
  navigation-server slate's drive record says the same: *"the Delve is
  pitch black past its mouth and covered by no Locality (so a walk there
  writes nothing, rightly)"*. `address` is a `SpatialZone` field
  (`lib/zone/SpatialZone.ts` `fieldMeta`), read by
  `AddressLogic.resolveAddressString`'s zone fall-through; `rejection.yaml`
  and `lounge.yaml` are the precedent (`address: terminus/rejection`,
  `address: lounge`).
- **What a look and a walk write.** A lit `look` writes ONE place claim (the
  place you stand in, `seen`) and one edge claim per obvious exit with
  `to: null` and `toLabel` = the far row's path — **never a claim about the
  far place**. A walk writes a `walked` edge (with `to` when the far place
  has a durable handle) and a `walked` place claim for where you arrive. A
  **dark** `look` writes nothing (`PerceptionLogic.observePlace`). A
  `search` re-records every obvious exit on channel `searched`
  (`SearchController`). Edge claims carry no position of their own and no
  `crossesZone`.
- **The growth key** (`NavigationLogic.keyOf`): `kind | place | dir |
  toLabel | channel | where | toldBy | state | via | reckoned` — so one
  `(place, dir)` holds several claims (seen, walked, searched; shut then
  locked), and nothing is ever removed.
- **Position.** `Place.mapSubject()`: `at.zone` = the zone's identity path
  (a copy's minted zone) else its template path; a Cartesian place adds
  `x y z` and `level = z`. `Perceiver.zoneSection` sends the same string as
  `zone.id.path`. North is +y (the Delve: vestibule `0,0,0`, corridor-1
  `0,1,0` reached by `north`).
- **Localities.** `Perceiver.localitiesSection` builds `chain` from the
  **live** `AddressApi.coverageChainOf` — name, address, kind, government
  for every covering Locality, whether or not you hold a claim for it.
  `Cartographer.recordLocalities` writes a `kind: 'locality'` claim per
  covering Locality (place = address, name, government, localityKind) the
  first time a lit perception sees the chain change.
- **A way's verdict.** `lib/boundary/Exit.ts` `wayFor(viewer)` →
  `takeFor`: `LocomotionApi.canTraverseExit(…, { probe: true })`, the
  breakaway refusal, the water veto. Boundary facts by composition
  (`aspect: 'way'`): `state`, `opening`, `swingsShut` (`Boundary.ts`),
  `locked`, `keyHeld` (`Lockable.ts`), `freeHere` (`platform/thing/Door.ts`).
- **`route`** (`platform/idea/cmd/movement/RouteController.ts`,
  view `packages/content/platform/content/platform/cmd/movement/route.yaml`):
  the destination is a **keyword**, optionally led by an address fragment;
  an ambiguous one prompts; `#<stuffId>` works only for a loaded room. No
  form takes a path. It emits the `route-plan` note in both its single-plan
  and its two-plan answer.
- **`map <locality>`** exists (`cmd/perception/map.yaml`, `opens_card: map`).
- **No round trip describes a Locality.** The inbound table
  (`backend/inbound/index.ts`) has `mql-query`, `affordance-resolve`,
  `wiki-excerpt`, `client-state-write` and the subscription ops; nothing
  returns a Locality's seats and holders, the viewer's residency, or a
  forecast. `GovernmentApi.residentOf`, `getGovernment` and
  `WeatherApi.forecastFor` exist as server reads.
- **No clock on the wire** beyond `PlaceSection.season` and
  `daylight: 'day' | 'night'`.
- **Guests keep no map** (`MapCopySource.openSubscription`: an empty copy).

### Content the drive names

- Delve rooms (`…/newbie-wilds/delve/`): `vestibule` (0,0,0; `north`,
  `south` out to the treeline — the one cross-zone way), `corridor-1`
  (0,1,0; a **hidden** `northeast` to the vault), `corridor-2` (0,2,0; a
  **hidden** `down` with `media: [vertical]`), `corridor-3` (0,3,0;
  `southeast` to the vault — the plain diagonal), `vault` (1,2,0),
  `pit-below` (0,2,−1; `up`). `hidden-cache.yaml` is a concealed **Thing**
  (a pouch), not a place or a way. There is no "crack".
- The lounge: `saxonberg-lounge/content/world/lounge/location/bar.yaml`
  carries the hidden `north` way to `office.yaml`. **No door object exists
  in the lounge pack.**
- Doors that exist: the wharfside bank's named way `pumphouse` through a
  **locked** door (`terminus/…/wharfside/thing/pump-house-door.yaml`; the
  boundary walk and the navigation-server wire drive both stand on it), the
  campus gate (locked), Duncan Hall's front doors, the foundry yard door, a
  window west of the glazier's hut.
- **A way that refuses you:** the steading yard's `east` into the cottage,
  `opening: { width: 0.9, height: 1.4 }`
  (`…/newbie-wilds/steading/yard.yaml`); the navigation-server wire drive's
  step 6a proves `take.ok === false` standing, `take.works.command` ends
  `east`, and running it goes through.
- Tracks: `kind: /platform/idea/exits/track` in
  `rejection/…/location/seep-hollow.yaml`, `hillside.yaml`,
  `fringe-claim.yaml`; Rejection's zone has `cellSize: 10.0` and rooms many
  cells apart (seep-hollow `18,10,0`, hillside `0,2,0`).
- The two Terminus rows:
  `packages/content/platform/content/platform/idea/Locality/terminus.yaml`
  (`_address: terminus`) and `terminus-city.yaml`
  (`_address: terminus/city`, `name: Terminus`). The city row's own comment
  says the departures board label *"must stay Terminus"*; the board reads
  the covering Locality's name.
- The Hush: `rejection/…/rejection/hush.yaml`, a `SphericalZone`. The
  Hesper: `terminus/…/terminus/hesper.yaml`, `hesper/deck.yaml`,
  `hesper/structure.yaml`.

### Tests that already stand

- `packages/wire/tests/navigation-server.dirty.wire.test.ts` proves, over
  the socket: the copy holds a walked place with zone, cell and level (2);
  ways arrive with state, every path tagged (3); a second character
  receives nothing of it (5); a locked way refuses in the verdict's words
  (6, 6a); the route plan as data (7); the locality claim on a first visit
  (8); the ship crumb (10); a dark look writes nothing (14); a second
  session holds the same copy (18); the firewall (19); a restart loses and
  doubles nothing (17). Harness: `Session`, `NavClient`, `restartWorld`
  (`packages/wire/src/harness/`).
- `e2e/tests/helpers.ts`: `openWorldAs(browser, handle, { startLocation })`
  (a minted, non-guest session), `runCommand`, `tipText` (reads a tooltip
  by **focus**, because a hover races the card feed). No e2e spec restarts
  the world.

## ⭐⭐ New substrate

**On the server: no new class, mixin, Api, hook, registry, document kind or
collection.** The whole list, each against the
[map-slate reuse ledger](../slates/client/map-slate.md) (rewritten
2026-11-20):

| # | item | where | ledger row |
|---|---|---|---|
| 1 | **the knowledge views** — pure selectors over `mapCopy` + `navSections` | `client/src/store/navSelectors.ts` | *your knowledge on the client* — **reuse**, read through selectors; the selector layer itself is **genuinely new** (searched: `store/` has none; `client-knowledge-model-slate` § Selectors are the only way in asks for it) |
| 2 | **the map renderer** `ZoneMap` | `client/src/components/nav/ZoneMap.tsx` | *the drawn map* — **genuinely new** (no SVG renderer, no map component; searched `components/**` for `<svg`, `viewBox`) |
| 3 | **the card and its section frame** `NavCard`, `NavSection`, `useFillHeight` | `client/src/components/nav/` | *the docked slot* — **replaces** `NavigatorBody`; CardId `map` and the slot kept |
| 4 | **the ways** `Ways` (rose · list · preview strip) | `client/src/components/nav/Ways.tsx` | *a way's state* — **reuse** `NavWay` / `take`; no client rule decides |
| 5 | **the session's route** `navSlice.routePlan` + the note's side effect | `store/navSlice.ts`, `services/websocket.ts` | *routing on your map* — **reuse** the note; the handler is the missing consumer |
| 6 | **`nav.card`** — a client-state key (sections set by hand, lenses on) | one schema entry in `server/…/connection/SaxonbergClient.ts`; a writer beside `cardViewActions.ts` | *section open/closed memory* — **reuse** the client-state mechanism (`cards.views` is the precedent) |
| 7 | **`TooltipSource`** gains the six map channels; **`TooltipDoc.zoneThumb`** block | `packages/types/src/index.ts`, `components/doc/blocks.tsx` | *tooltips* — **extend**; the type's own comment reserves the channels |
| 8 | **document builders** `placeDoc`, `edgeDoc`, `crumbDoc`, `levelDoc`, `sectionDoc`, `lensDoc`, `sightingDoc`, `zoneDoc`; `wayDoc` grows | `components/doc/docs.ts` | *tooltips* — new builders **join `docs.ts`** |
| 9 | **direction, elevation and way-state icon names** | `components/ui/icons/iconMap.ts` | *direction glyphs* — **extend** the one icon map |
| 10 | **`useRadialGestures`** — the right-click / hold gesture, lifted out of `EntityName` so a way entry shares it | `components/ui/EntityName.tsx` → `components/ui/useRadialGestures.ts` | *a way's acts* — **reuse**; an extraction, not a second gesture |
| 11 | **the status bar's outdoors region** | `components/frame/StatusBar.tsx` | *the status bar* — **extend** |
| 12 | **`tokens.width.panel = 22`** and the panel rule | `components/ui/tokens.ts`, `useWidthTier.ts`, `ModeStage.tsx` | *the panel width* — **change** |
| 13 | **the Delve's `address:`** — one zone field value | `newbie-wilds/…/delve.yaml` | not in the ledger — ⚠ REQUIREMENTS 1 |
| 14 | *(W8, approved by the owner 2026-11-20)* a Locality one-shot for the crumb's civic facts | server | not in the ledger — ⚠ REQUIREMENTS 3 |

**Generalized, so the specific one goes (P1 ⭐):** `NavigatorBody.tsx`,
`whereaboutsOf` and the `Whereabouts` / `WhereaboutsExit` types in
`navSlice.ts` are **deleted** in W4 — the selectors replace them; nothing
keeps reading the old shape. The ledger's last row (the old navigator's
outdoors / jurisdiction / leaving list) is the **move** W3–W4 perform.

### P9–P14, per item

| # | P9 predictable from the def and help | P10 metadata is a Document | P11 no caller branches on the destination | P12 no synonym | P13 on the thing its header says | P14 nothing moves or decides invisibly |
|---|---|---|---|---|---|---|
| 1 views | n/a — reads only; runs no command | no table: derived from claims on read | n/a | no second model: views over the one copy | `navSelectors` header: *views over your map's copy* — nothing else goes in it | derives, never stores; a view never corrects a claim |
| 2 `ZoneMap` | every click sends a real command, previewed in the status bar first | n/a | draws by claim kind and position only; never asks what a place IS | one renderer; the thumbnail is the same component | *draws a `ZoneView`* — no data reads inside it | no auto-pan, no auto-zoom; *me* is a button |
| 3 frame | n/a | the section order is a constant in the component, read by nothing else | n/a | — | `NavSection`: *one summary line that opens* | ⚠ filling opens and folds sections by itself — by the requirements' own rule, visible, and never touching a section the player set (D8) |
| 4 `Ways` | a click is `go <direction>`, whatever the state; the tooltip says what trying will do | n/a | never branches on door / window / gate: state and `take` are the server's | no client verdict beside `take` | *the ways from here* | one click moves you; the preview strip holds nothing clickable |
| 5 route | `route to …` is typed or clicked; the plan drawn is the note that command returned | n/a | n/a | the note is the plan; no second planner | `navSlice`: *your map and where you are* — the session's plan is of the map | drawn only after a `route` ran; a new plan replaces it |
| 6 `nav.card` | n/a — interface state, no command | a client-state key, the shipped home for interface memory (not a vocabulary) | n/a | no second store (`localStorage` not used for it) | `SaxonbergClient`: *this client's keys* | written only by the player's own toggle |
| 7 types | n/a | n/a | n/a | the six channel words ARE the map's; none renamed | `TooltipSource`: *where a fact came from* | — |
| 8 builders | a doc's `command` is what the click runs | n/a | `wayDoc` assembles one block per fact key; an unknown key is a plain row | each subject has ONE builder | `docs.ts`: *pure functions to a TooltipDoc* | a builder adds no fact its input lacks |
| 9 icons | n/a | the icon map is the one table by design | n/a | names in our vocabulary (`dir.north`), not Lucide's | `iconMap` | an unmapped name falls back visibly |
| 10 gestures | the menu lists real verbs from `affordance-resolve` | n/a | the same gesture on a thing and on a way's boundary | one gesture implementation | *the "tell me about this" gesture* | opens a menu; runs nothing |
| 11 outdoors | n/a | n/a | n/a | — | the bar: *the interface shows which* + what every mode sees | reads the place section; absent when the section is |
| 12 width | n/a | n/a | n/a | — | `tokens.width` | ⚠ the panel no longer closes itself for a column (the owner's decision) |
| 13 address | n/a | a field value on an authored row | n/a | — | the zone's own `address` field | ⚠ joins the Delve to the Last Counted Mile for everything address-derived (see Host placement) |

## Owner's rulings at plan review (2026-11-20)

All three of the plan's leans were taken:

1. **W8 is built** — the inbound one-shot for a Locality's seats and
   holders, resident or visitor, and forecast, answering only for a
   Locality the asker holds a claim for. The build amends W8 in place with
   its files, gate and P-lines before writing it, and step 24 asserts all
   of it.
2. **`nav.card` is a client-state schema entry** (D9), not `localStorage`.
3. **"Time" on the status bar is season plus day or night** — no clock
   hour is on the wire, and none is added in this build.

## Plan-level decisions

### D1 — One SVG renderer, no new dependency
`ZoneMap` is one React component returning one `<svg>`; it takes a
`ZoneView` (D2) and draws it. **No d3-zoom, no graph library**: the
requirements fix zoom at three steps and there is no free pan, so the
`viewBox` is computed, not dragged.

- **`viewBox` in cell units**, y flipped (north is +y in the world, down in
  SVG): a place at `(x, y)` draws centered at `(x, −y)`. Every stroke
  carries `vector-effect="non-scaling-stroke"`.
- **Layers, bottom to top** — each a `<g data-layer="…">`, so a lens is an
  overlay and never a second renderer: `edges` · `places` · `glyphs` (up /
  down corners) · `stubs` (openings, ways out of the zone) ·
  `lens-boundaries` · `lens-refusals` · `lens-frontier` · `lens-route` ·
  `ticks` (horizon) · `here`.
- **Mark size.** A place is a rounded rect `0.8` of a cell — but never
  smaller on screen than about `1/24` of the view's width, so a sparse zone
  (Rejection: rooms many cells apart) still reads at *whole zone*. The mark
  size is a function of the viewBox, computed once per render.
- **Accessibility and the tooltip gate.** No `<title>` (the gate forbids
  it). Every mark is a `<g role="button" aria-label="…" tabIndex={-1}>`
  wrapped in `<Tip>`; the `<svg>` itself is one tab stop
  (`tabIndex={0}`) and the arrow keys move a roving focus among marks,
  Enter clicks. (`tabIndex={-1}` keeps marks focusable by the e2e helper's
  `locator.focus()`.)
- **House style.** Colors are existing semantic tokens (`tokens.color.fg`,
  `fgMuted`, `accent`, `border`, `warning`, `danger`, `amber`); add a
  `map.*` token only where no semantic one fits. No parchment.
- **The thumbnail** (D12) is `<ZoneMap thumbnail>`: the same component at
  *whole zone*, no handlers, no tooltips, fixed 96 px.
- A zone whose `kind` is not `grid` draws nothing: `NavCard` shows *no map
  for this kind of space yet* (`data-testid="nav-no-map"`) in its place.

### D2 — Every read is a view over the copy: `navSelectors.ts`
Pure functions; the only readers of `mapCopy` outside the slice. Memoized
on the `mapCopy` object's identity (a `WeakMap<mapCopy, index>`; the slice
replaces the object on every change), so a burst of claims costs one
re-index and components subscribe with `useStore(s => s.mapCopy)`.

`zoneView(mapCopy, zonePath): ZoneView` — `zonePath` is
`navSections.zone.id.path`, matched against `claim.at.zone.path`. ⚠ Paths
are used as **keys only**, never displayed (client-knowledge-model-slate:
*keys are not display*); no test id or DOM attribute carries one.

- **Places.** Group `kind: 'place'` claims by `place.path`. A place is
  **placed** when any of its claims has `at.x`/`at.y`; its cell is the
  latest such claim's. **Tier:** `walked` if any claim's channel is
  `walked`; else `known` (seen · searched · told · charted · published).
  Its sources are every claim, kept with their dates for the tooltip.
- **Unplaced.** A place claim with no cell whose `CopyClaim.locality` is one
  of the addresses in `localities.chain` is listed under the zone section as
  *known, not yet placed* (`nav-unplaced`). No migration, no guess.
- **Edges.** Group `kind: 'edge'` claims by `(place.path, dir)`; drawn only
  when the source place is placed on the level shown.
  - **Last known state** = the `state` of the claim with the latest
    `lastSeen`; the others are the edge's history (tooltip only).
  - **Far end.** If some claim has `to` and that place is placed in this
    zone → a link between the two cells' real positions. If the far place
    is placed in **another** zone → a stub with the *leaves the zone*
    marker. Otherwise (`to: null`, or unplaced) → **an opening**: a
    half-cell stub in the direction, ending in `?` (tier 3).
  - **Conflict.** Two claims for one `(place, dir)` with different
    `toLabel` → both drawn, the second offset, with a badge; the tooltip
    lists both with their dates. Nothing is tidied away.
  - **Stale.** The place's latest *look* is the max `lastSeen` over its
    place claims on `seen` or `searched`; an edge group whose own max
    `lastSeen` is older draws dotted and says *not seen when you last
    looked* (location-graph.md § Two shapes of disagreement).
  - **Found by searching.** The edge group's earliest claim (min
    `firstSeen`) is on channel `searched`.
- **Geometry by direction.** One constant `DIRECTION_VECTORS` (eight
  compass words → `[dx, dy]`; `up` / `down` → a level step). An orthogonal
  link runs edge to edge; a **diagonal** runs corner to corner; where two
  diagonals cross in one gap each is drawn with a background-colored casing
  under its stroke, so the later one reads as passing over. An edge whose
  ends are **not adjacent** (`|dx| > 1` or `|dy| > 1`) is a **track**: one
  long dashed link along its real bearing. `up` / `down` draw as a corner
  glyph on the cell (▲ / ▼ / both), styled by state. A direction with no
  vector (`out`, `gate`, `pumphouse`) is a **named** way: a small tab on
  the cell's lower edge, one per name.
- **Levels.** `levels` = the distinct `at.level` among placed claims;
  `extent` = their bounding box per level. Both are what you have found,
  never the zone's.
- **Counts** for the zone section: walked, known, openings not taken, the
  oldest claim relied on.

`crumbsView(mapCopy, localities)`, `placeKnowledge(mapCopy, placeAt)`,
`localityKnowledge(mapCopy, address)` and `boundariesView` (D11) live in the
same file. All are unit-tested from claim fixtures with no DOM.

### D3 — You, and what "neighbor" means
*Here* is `navSections.place.at` in the zone `navSections.zone.id`. A place
mark is a **neighbor** when a way in `navSections.ways.ways` leads to it:
its direction's vector from *here* lands on that cell, or (a track, a named
way) an edge claim from here in that direction names it as `to`. Clicking a
neighbor sends `go <that way's direction>` through `onSendCommand` (echoed,
previewed on hover). An opening's stub from here does the same.

When the place you stand in holds no claim (a lounge satellite: no durable
handle, so nothing is written) the map keeps drawing the zone you know; the
edge you came by — a `walked` edge with `to: null` — draws as *a space
through this door, shape unknown*, and *here* is drawn on that stub.

### D4 — Three zoom steps, by hops
`whole zone` fits every placed mark on the level shown (plus a margin).
`nearby` fits *here* and everything within **two** edges of it (never less
than 5 × 5 cells). `close` fits *here* and its neighbors (never less than
3 × 3) and is the only step that draws place **names** on the marks; corner
glyphs drop out at *whole zone* when a cell is under about 10 px. Hops, not
a fixed cell window, so a dense delve and a sparse hill both fit. The wheel
and a pinch move between the steps; **me** selects your level and returns to
following you. Zoom and the level shown are component state — they reset
when the zone changes and are not remembered (the requirements remember
sections only).

**The level control** renders only when `levels.length > 1`; it lists the
levels you know, yours marked, and choosing one shows that level.

### D5 — A distant click draws a route; the plan is the note
- A click on a place that is not a neighbor sends
  **`route to <keyword>`**, composed from the claim: the first of its
  `keywords` that no other known place in the same Locality document shares;
  failing that its first keyword (the verb then prompts *which?* — its own
  shipped behavior); led by the last segment of `group` when the claim has
  one (`route to lot-123 kitchen`). A place with no keyword is not
  clickable and its tooltip says why. ⛔ Never a path in a command (a path
  is a spoiler, and the status bar previews the command).
- `services/websocket.ts` gains one side effect beside
  `applyPromptSideEffects`: a `dispatch-response` note of kind
  `route-plan` → `store.setRoutePlan(note)`. `navSlice.routePlan` is
  session-only (not client state; cleared at logout with the slice), so a
  typed `route to …` draws exactly as a click does.
- **The route layer** draws `plans[0]` (and `plans[1]`, dashed, when the
  verb returned two — *you are shown both*): each leg whose two ends are
  placed on the level shown is a highlighted link; the leg at
  `leastCertain` carries a `?` badge whose tooltip is that leg's
  `assumptions` text. Legs off this zone or level are not drawn; the lens
  tooltip says the route continues beyond what is shown.

### D6 — The ways: every state is the server's
`Ways.tsx` reads `navSections.ways.ways` only.

- **The rose** — ten arms, always all ten: the eight compass points, up and
  down. An arm with no way is **dim** and inert (*no way you know of*). **The
  list** — every way whose direction is not one of those ten, by its own
  direction word, nothing written over it.
- **State, first match wins** — `state === 'window'` → the eye (inert:
  `disabled`, as today) · `'locked'` → red ✕ · `'shut'` → gold ·
  `take.ok === false` and `needs` or `take.works.mode` → the mode glyph ·
  `take.ok === false` → **amber** · `take.unseen` → open, marked *as far as
  you know* · else open. **`crossesZone`** adds the *leaves the zone* marker
  to any of them. There is no client rule: amber is `take`.
- **A click** on any arm or name but a window sends `go <direction>` —
  what trying would do — and the tooltip says what that is (`take.reason`,
  and `take.works.command` named as what would work). One click; no
  select-then-confirm.
- **The preview strip** (`nav-preview`) under the section shows, while the
  pointer or focus is on an entry: where it leads (D10's rule), what stands
  in it (`boundary.name`), its state. Local component state; nothing in it
  is clickable; it does not read or write `ghostPreview` (the status bar
  still previews the command through `onCommandPreview`).
- **The menu.** An entry whose way has `boundary` gets `useRadialGestures(
  boundary.stuffId, boundary.name)` — right-click and a mouse hold open the
  affordance radial on the boundary, exactly as on any thing; on touch the
  tooltip sheet's *actions* button does. ⭐ **No wire addition is needed**:
  `WayRecord.boundary.stuffId` is already sent. A way with no boundary has
  no menu.
- Test ids `nav-exit-<direction>` are kept on arms and names alike, so
  `boundary-walk.spec.ts` and `navigation-server-walk.spec.ts` keep reading
  them.

### D7 — The card's sections
`NavCard` renders, in this fixed order, each through `NavSection` (its
`ChangeMark surface="nav:<section>"` kept from today):

| # | section | source | always open | summary line | absent when |
|---|---|---|---|---|---|
| 1 | you are here | `place.name` | yes (small) | — | never |
| 2 | in the world | D10 | no | the crumbs on one line | no crumb |
| 3 | the zone + **the map** | `zone`, `place.at`, `localities.jurisdiction`, D2 | the map yes; the zone's detail no | label · `x: y: z:` (z stressed) | no `zone` section |
| 4 | the horizon | `horizon` | no | *Horizon · the lighthouse NE 2 mi · 2 sails* | no things and no traffic |
| 5 | the structure | `building`, `localities.ship`/`outer` | no | *The Counting-house · floor 1 of 3* | `building` null and not aboard |
| 6 | the ways | D6 | yes | — | never |
| 7 | the place | `place`, `placeKnowledge` | no | *Place · dark · walked 3 days ago* | never |
| 8 | you | `you` | no | *You · walking · light load · lamp lit* | no `you` section |

The lens row (D11) sits directly under the map. Details:

- **Zone:** `zone.label` (never its path: the path rides the tooltip's
  spoiler block), the coordinates, *who keeps it* = `jurisdiction` names
  innermost first (`nav-jurisdiction` kept), cell size, extent and levels
  **known**, walked against known, the sources. *The rules in force* (epoch
  covenant, suppression) are **not on the wire** → absent.
- **Storeys, never z:** *floor N of M* is `building.storey + 1` of
  `building.storeys`. `entrance` beyond `{ here: true }` is absent until the
  server computes it.
- **Aboard:** the structure section reads the building section (her decks
  are its storeys) and `localities.outer` (*made fast at …* · *on the … at
  km …* · *at sea*); the zone section shows the two positions — you on her
  decks (`place.at`), her in the world (`outer`). The reckoning is `course`'s
  and is not shown.
- **Place:** light / dark, open sky or roofed, water, crowd, elevation
  (shown apart from z), and what your map knows of it (first walked, last
  seen, sources, disagreements — from the copy). `searched`, `found` and
  `staged` are not computed by the server → absent. A click on the summary
  sends `look` (the room's inspection card comes forward).
- **You:** pace, posture, load, the light you carry, mount; `bars` and a
  fight's `breakaway` as the lines they are.
- **Clicks:** a horizon sighting → `lookCommand(stuffId, undefined, mode)`;
  the structure → `look <its name, escaped>`.

### D8 — Fill the height: a pure rule and a thin measurer
`fitSections` is a pure function in `useFillHeight.ts`:

```
fitSections({ order, userSet, needs, available, used }) → { open: Set, next: 'open:<name>' | 'fold:<name>' | 'settled' }
```

- A section the player **set** (`userSet[name]` = `'open' | 'closed'`) is
  never touched.
- Among the untouched, in order: while free space remains, open the next
  whose known need fits (or whose need is unknown and at least four lines
  are free). When the content overflows, fold the **last** auto-opened one
  and record what it needed, so it is not retried until that much is free.
  Only when every optional section is a summary line and it still overflows
  does the panel scroll; a summary line truncates with its full text in its
  tooltip.
- The hook measures with one `ResizeObserver` on the card and one on its
  content (`available = clientHeight`, `used = scrollHeight`) and applies
  one `next` per layout pass. Each section's need is learned by one trial,
  so the loop settles; a width change clears the learned needs.

jsdom has no layout, so the **rule** is unit-tested with numbers and the
**behavior** is the browser walk's step 19.

### D9 — What the card remembers: `nav.card`, a client-state key
`{ sections: Record<string, 'open' | 'closed'>, lenses: string[] }`,
written by a small action module `store/navCardActions.ts` in the shape of
`cardViewActions.ts` (optimistic `setLocalClientState` +
`sendClientStateWrite`). It needs **one schema entry** in
`SaxonbergClient.ts`'s `clientStateSchema` (default `{ sections: {},
lenses: ['frontier', 'route'] }`, an object-shape validator), because the
server refuses an undeclared key. This is the mechanism every remembered
layout choice already uses, it survives a reload **and** a second device,
and it is no new collection and no new field (`_clientState` exists).
✔ A server-file touch in a client build — **approved by the owner 2026-11-20** over `localStorage` (⚠ REQUIREMENTS 4).

⚠ The seeding-clobber lesson (`cardViewActions.ts` header): the card writes
**nothing** on mount. An absent key means *untouched*; only a player's
toggle writes.

### D10 — The breadcrumb reads your map; the section supplies the order
`crumbsView` walks `localities.chain` (outermost first) for its **order and
addresses only**, and for each address looks for a `kind: 'locality'` claim
in the copy (`claim.place === address`). A claim → the crumb shows **the
claim's** name. No claim → the crumb is unnamed (*a place you have not
learned*), with a tooltip that says so. Aboard, `localities.ship.name` is
the last crumb. The crumbs stop one short of the place; the shipped
de-stutter (*The Lounge › the lounge* shows once) is kept.

- **A click** on a named crumb sends `map <address>` (the build confirms in
  W5 that `MapController` matches an address; else the claim's name).
- **Where a way leads** uses the same honesty: the edge claim's `to` →
  that place's claim name, with source and date; else the section's
  `destination` (you can see it from here), marked `seen`; else *unknown*.
- ⚠ The live name still **travels** in `localities.chain[].name` for a
  Locality you hold no claim for; the client does not show it. Tightening
  the wire is a server change this plan does not make — ⚠ REQUIREMENTS 5.

### D11 — Four lenses, four channels
One row of toggles under the map (`nav-lens-<name>`), state in `nav.card`.
Default on: `frontier`, `route`.

| lens | channel it owns | drawn from |
|---|---|---|
| frontier | the stub's end marker | every opening (D2) on the level shown |
| route | the line overlay | `navSlice.routePlan` (D5) |
| refusals | the edge's midpoint ring | edges whose last known state is `locked` or `shut` |
| boundaries | the cell border | `boundariesView`: each placed place → its claim's Locality document → the nearest covering `locality` claim's `government`; a border where two adjacent cells differ, and on a stub that leaves the zone |

A way's own state marker (door, lock, window) is always drawn — the
refusals lens rings what you saw refuse you across the zone; it is not what
makes a locked door red. A lens with nothing to draw says so in its
tooltip.

### D12 — A tooltip on every mark, composed from what you know
New builders in `docs.ts`, each the only path from its subject to a
document, each fed by a D2 view:

- `placeDoc` — name, tier, every source with its date (`source` = the
  claim's channel; `at` = `lastSeen`), disagreements, the hint (*click — go
  north* / *click — draw the route*) and the `command`; the path as the one
  spoiler block (`PATH_LABEL`).
- `edgeDoc` / the grown `wayDoc` — the command; where it leads (D10); what
  stands in it; then ⭐ **one block per fact key** from `NavWay.facts`
  (`state`, `opening`, `swingsShut`, `locked`, `keyHeld`, `freeHere` get
  worded rows; **any other key renders as a plain fact row**, so a pack's
  portcullis shows with no client change); one-way, muffled, *found by
  searching*, a track's length (`lengthM` from here; elsewhere `≈` the
  cells' distance × `zone.cellSizeM`); what stops you (`take.reason`) and
  what would work. For a way out of the zone: the far place and Locality as
  your map knows them, and `zoneThumb` when the copy holds placed claims in
  that zone.
- `crumbDoc` — the name, when you first came and how (the claim's
  `firstSeen`, channel), how much of your map lies there (claims whose
  document address is under it), its government and kind **from the claim**.
  Seats and holders, resident or visitor, weather and forecast have no
  source — ⚠ REQUIREMENTS 3.
- `levelDoc`, `lensDoc`, `sectionDoc`, `sightingDoc`, `zoneDoc`,
  and `controlDoc` (existing) for zoom and *me*.

`TooltipSource` gains `walked · searched · published · charted · told`
(`seen` exists). `TooltipDoc` gains `zoneThumb?: { zone: string; level:
number }`, rendered by `blocks.tsx` as `<ZoneMap thumbnail>`. ⛔ No builder
emits a button; opening, unlocking and looking through are the menu's (D6).
Terms inside a tooltip's prose are ordinary `help` / `wiki` links, which
nest by the shipped rule.

### D13 — Outdoors on the status bar
`StatusBar` gains one region (`status-outdoors`) left of the tray, reading
`navSections.place`: `weather`, `season`, `daylight`. Absent when the
section has none. It does not read `ghostPreview` (the single-reader guard
stays true). ⚠ *Time* is season and day or night — no clock hour is on the
wire (⚠ REQUIREMENTS 6). The phone has no status bar; the phone surface is
not designed here.

### D14 — 22 rem, and the panel stays
`tokens.width.panel = 22`. `usePanelOpen()` becomes
`open = want && tier !== 'narrow'` (the phone has its own shell) —
`units.withPanel` no longer decides. `unitsFor` is unchanged in form; its
pinned table moves:

| CSS px | 1280 | 1366 | 1440 | 1536 | 1728 | 1920 | 2048 | 2560 |
|---|---|---|---|---|---|---|---|---|
| columns, panel open (was) | 0 (0) | 0 (1) | 0 (1) | 1 (1) | 1 (2) | 2 (2) | 2 | 3 (4) |
| columns, panel shut | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 |

2048 px is the owner's 2560 at 125%: two columns; 2560 at 100%: three —
the requirements' numbers. ⚠ Below 1476 px the open panel leaves **no** card
column (cards become the glance strip of chips) — Risks 2. The card fills
the panel: the docked `Card` and `NavCard` are `flex: 1; min-height: 0`.

### D15 — Content touches
- `delve.yaml` gains `address: last-counted-mile/delve` (⚠ REQUIREMENTS 1).
- `terminus-city.yaml`: `name: Terminus City`; its comment's *"must stay
  Terminus"* is rewritten. Before the commit, grep `packages/content`,
  `packages/server/src`, `packages/wire`, `e2e` and `packages/rodney` for
  the city's name on a departures board or in an address lookup
  (`AddressPlace.test.ts`, `terminus/src/__tests__/destination-naming.integration.test.ts`,
  `navSlice.test.ts` are known readers of the word) and fix each (review
  question B4).

### D16 — What is deleted
`components/cards/NavigatorBody.tsx`; `whereaboutsOf`, `Whereabouts`,
`WhereaboutsExit` in `navSlice.ts`; `NavigatorCardBody` in `CardBodies.tsx`
becomes a three-line mount of `NavCard`. `navSlice.ts`'s header comment
(*"rendered by nothing yet"*) is rewritten.

## ⭐⭐ Host placement

A client build composes no mixin; the placements that can be wrong are
*which store holds which state* and the two touches outside the client.

| what | host | what it claims about everything else on that host |
|---|---|---|
| the copy, the sections | `navSlice` (unchanged) | — |
| the session's route plan | `navSlice.routePlan` | every session has at most one latest plan; it is of your map, so it sits with the map. Not client state: a plan is a hypothesis about now, and must not come back after a restart as if it were current |
| zoom step, level shown, the hovered way | `NavCard` component state | per mount; resets on a zone change. Nothing else reads them — no slice |
| sections set by hand, lenses on | `nav.card` on the Avatar's `_clientState`, declared in `SaxonbergClient.clientStateSchema` | every player body carries the key. ✔ Every player has exactly one navigation card (requirements: *one card per player*), so every host means it; a guest's stays in session memory by the shipped rule |
| the selectors | `store/navSelectors.ts` | read the store, own no state |
| the `zoneThumb` block | `TooltipDoc` | every document may carry it; one builder does today. Same standing as `image` (one optional block of the document vocabulary); it is content, so it belongs in the document, not in a tooltip-only prop — the card container could show it too |
| the map channels | `TooltipSource` | every fact row may name a map channel — true of any fact that came from your map |
| outdoors | `StatusBar` | every mode's bar shows it — the requirement |
| `address: last-counted-mile/delve` | the Delve's **zone** row | every room in the Delve resolves to the Last Counted Mile: weather lean, renown scope and residency derive as they do for the treeline and the steading beside it. No government (`last-counted-mile` declares none), so jurisdiction does not change. ✔ The row's own header already calls the Delve *"a sub-area of the newbie-wilds locality"* |

**Guard test:** nothing above needs a guard that re-narrows its host.
**Quiet-default test:** `zoneThumb` is the one optional member most hosts
leave empty; kept for the reason in its row, and the alternative (a
tooltip-only side channel) would break *two containers, one content*.

**Deliberately NOT moved:** the copy stays a slice of the one store
(client-knowledge-model-slate leaned to a store of its own for render
isolation). Components subscribe to `mapCopy` alone, so a burst of claims
re-renders only the card; a separate store is a refactor with no measured
need — Deferred seams.

## Convention conformance

Checked at plan time against `CLAUDE.md` and the files named.

- **Module categories.** No file is added under `packages/server/src/mud/`
  and none in a pack's `src/`. The one server edit is a schema entry in an
  existing file. Client files follow the client's own layout
  (`components/<area>/`, `store/`, `services/`); `components/nav/` is a new
  area folder holding five cohesive files.
- **`props:` / `cast:`** — no row gains a designation. **Locations, not
  rooms** — client identifiers say `place` (`placeDoc`, `nav-place-…`);
  player-facing words follow the requirements.
- **Namespace axes** — no new root; the Delve's address sits under the
  existing `last-counted-mile` Locality.
- **Module scope / import boundary / verbs on objects** — no mudlib code.
  **No new verb, no view key, no `isWizard`, no migration, no collection.**
- **American English** — *neighbor*, *color*, *center* in every new name.
- **P3 refuse / skip / throw.** No zone section → the map area says *where
  you are is not known yet*; a non-grid zone → *no map for this kind of
  space yet*; a claim with no cell → listed unplaced; a place with no
  keyword → not clickable, and says why; a `route-plan` note with no plans →
  ignored with a console warning; a rejected `nav.card` write → the server's
  shipped warning, the local state stands for the session.
- **P4 no duck typing.** Every read is a typed wire shape. `NavWay.facts`
  is declared shapeless on purpose and is rendered generically, not probed.
- **P5 the model decides.** State and `take` are the server's; the client
  renders them and sends `go`. No client-side gate.
- **P6 persistence.** Nothing new persists but `nav.card`, on the existing
  `_clientState` field, by the player's own act.
- **P7 load on use.** No boot entry, no fetch at session start beyond the
  two subscriptions already opened; views compute on read.
- **P8 names.** `NavCard` (the card), `ZoneMap` (what it draws), `Ways`,
  `navSelectors`; the CardId stays `map`.
- **Gates this build must pass:** `packages/client` eslint and vitest —
  above all `noNativeTitle` (ceiling 0), the `StatusBar` single-reader
  guard, `chromeComposition`, `useWidthTier`'s table; `packages/types`
  build (rebuild `types/dist` before typechecking either side);
  `pnpm -C packages/server lint:family` after W0 (`lint:locations` reads the
  Delve row, `lint:instanceable` the Locality row).

## Waves

Each wave ends at a commit and leaves a running world on which the owner
can look at it (`pnpm dev`, a non-guest character, `map`). Every wave is
gated by `pnpm test:near`, `pnpm -C packages/client test` for the touched
files, the client lint, and — W0 only — the server lint family.

### W0 — Foundation: the knowledge is there, and readable
*Implements D2, D9 (server half), D15.*
- `delve.yaml`: `address: last-counted-mile/delve`.
- `terminus-city.yaml`: `name: Terminus City`; the B4 grep and its fixes.
- `SaxonbergClient.ts`: the `nav.card` schema entry.
- `store/navSelectors.ts` + `store/__tests__/navSelectors.test.ts`:
  `zoneView` (tiers, placed / unplaced, edges, far ends, conflict, stale,
  found-by-searching, diagonals, tracks, named ways, levels, extent,
  counts) from claim fixtures.
- `packages/wire/tests/navigation.dirty.wire.test.ts` begun: a character
  walks the Delve and the copy holds its places with zone, cell and level,
  filed under `last-counted-mile/delve`; a second character holds none of
  it; `nav.card` round-trips.
- **Acceptance:** the wire steps pass on a fresh world; the navigator's
  crumbs read *Terminus › Terminus City*; `navigation-server.dirty` still
  passes (its step 14 stands in the Delve).
- **Commit:** `build(navigation W0): the Delve files claims, Terminus City, the views over your map`

### W1 — The plain map, at 22 rem
*Implements D1, D3 (here), D4, D14.*
- `components/nav/ZoneMap.tsx`; `components/nav/NavCard.tsx` as a shell:
  the map on top, **today's text navigator unchanged beneath it** (so
  nothing is lost between waves); `CardBodies.tsx` mounts `NavCard`.
- Places in two tiers, openings, links, diagonals with the crossing break,
  tracks, corner glyphs, named-way tabs, *here*, the level control, the
  three zoom steps and *me*, the unplaced list, the non-grid placeholder.
- `tokens.width.panel = 22`; `usePanelOpen`; the `useWidthTier` table.
- Tests: `ZoneMap.test.tsx` (marks and layers from a `ZoneView` fixture;
  the level control absent at one level; no `<title>`);
  `useWidthTier.test.ts` updated; `e2e/tests/client-surface-layout.spec.ts`
  re-read against the new panel rule.
- **Acceptance (running world):** walk the Delve with a lamp — the
  vestibule solid, each walked room solid, the diagonal corner to corner,
  the level control appearing after the pit; Rejection's tracks long and
  dashed at *whole zone*; the Hush shows the placeholder.
- **Commit:** `build(navigation W1): the map drawn from your own claims; one 22 rem panel`

### W2 — The map is how you move
*Implements D3 (clicks), D5.*
- Neighbor and opening clicks → `go <direction>`; distant clicks →
  `route to …`; hover previews the command.
- `websocket.ts` route-plan side effect; `navSlice.routePlan`; the
  `lens-route` layer (always on until W6 gives it a toggle).
- Tests: the command composition (unique keyword, group prefix, no
  keyword); `navSlice` route plan; the route layer from a plan fixture.
- **Acceptance:** click a neighbor — `go north` echoes and the map follows;
  click the vault from the vestibule — the route draws, its least certain
  leg marked, nobody moves; `route to vault` typed draws the same.
- **Commit:** `build(navigation W2): click to go, click to route; the plan drawn`

### W3 — The ways
*Implements D6; icons (substrate 9); gestures (10).*
- `components/nav/Ways.tsx` replaces the old rose, the up/down row and the
  *Leaving this area* list inside the shell; `iconMap.ts` gains the
  direction, elevation and way-state names; `useRadialGestures` is lifted
  out of `EntityName` (which then calls it).
- Tests: every state from `NavWay` fixtures (window inert, locked, shut,
  mode, amber, unseen, dim, the leaving marker); the preview strip holds no
  button; a boundary entry opens the radial on right-click.
- ⚠ Verify in this wave that `affordance-resolve` on a door answers `open`
  / `unlock` (the boundary walk implies it; this plan did not open the
  resolver).
- **Acceptance:** at the steading yard `east` is amber and says what would
  work; at the bank `pumphouse` is red and listed by its own name;
  right-click a shut door → *open*.
- **Commit:** `build(navigation W3): the rose and the named ways, every state the server's`

### W4 — The sections, the glance rule, the filled height
*Implements D7, D8, D9 (client half), D13, D16.*
- `NavSection.tsx`, `useFillHeight.ts`, `components/nav/sections.tsx`
  (zone header, horizon + the map's edge ticks, structure, place, you),
  `store/navCardActions.ts`.
- The status bar's outdoors region lands **in this wave**, because this
  wave removes *Outside* from the card.
- Delete `NavigatorBody.tsx`, `whereaboutsOf` and its types.
- Tests: `fitSections` (order, last-first fold, a set section untouched,
  the learned need); each section's absence; the storey line; aboard;
  `StatusBar` outdoors and the single-reader guard.
- **Acceptance:** shrink and grow the window — sections fold last first and
  open in order; close one by hand, reload, it is closed; the bar shows the
  weather; the zone section says who keeps the ground.
- **Commit:** `build(navigation W4): the card widest to narrowest; it fills the window and remembers`

### W5 — The breadcrumb is yours
*Implements D10.*
- `components/nav/Crumbs.tsx` over `crumbsView`; the click; the ship crumb.
- Tests: named from a claim, unnamed without one, the de-stutter, aboard.
- Wire: step 16 — the locality claim arrives on a first visit and a second
  character holds none.
- **Commit:** `build(navigation W5): the crumbs read your map`

### W6 — The lenses
*Implements D11.*
- The lens row, the four overlay layers, `boundariesView`, lens state in
  `nav.card`.
- Tests: each layer from fixtures; all four on at once draw on four
  channels.
- **Commit:** `build(navigation W6): frontier, route, refusals, boundaries`

### W7 — A tooltip on every mark
*Implements D12.*
- `packages/types`: `TooltipSource`, `zoneThumb`; the builders; the block;
  `Tip` on every place, edge, stub, level button, zoom control, crumb,
  lens toggle and mark, section summary, horizon sighting and tick.
- Tests: each builder from fixtures (sources and dates present; an unknown
  fact key becomes a row; no builder output contains a button); the
  thumbnail block.
- **Commit:** `build(navigation W7): every mark says what it is and how you know`

### W8 — The crumb's civic facts *(approved by the owner, 2026-11-20)*
*Built (⚠ REQUIREMENTS 3 resolved: build it).* One inbound one-shot in the shape of `wiki-excerpt`
(`backend/inbound/`, answered through `GovernmentApi` and `WeatherApi`
reads that exist) returning seats and holders, resident or visitor, and the
forecast for a Locality **the asker holds a claim for** — refused
otherwise, so it cannot be used to learn a place you have not been. The
build amends this wave in place with its files, gate and P-lines before it
writes it.

**Amended at build time (before writing it):**

- **Files.** `packages/types/src/index.ts` — `LocalityFactsMessage`
  (`locality-facts { requestId, address }`), `LocalityFactsResultEnvelope`
  (`locality-facts-result { requestId, address, facts }`) and
  `LocalityFacts { government?, seats[{ seat, holder }], resident,
  forecast? }`, both added to the envelope unions beside the wiki's.
  `packages/server/src/backend/inbound/locality.ts` — `handleLocalityFacts`,
  registered in `inbound/index.ts` (the README's rule: a new substrate is a
  new file). Client: `websocketClient.localityFacts(address)` beside
  `wikiExcerpt`; the crumb's tooltip is a `TipSpec` with `resolve`, so the
  request goes only when the tooltip opens.
- **The gate.** The asker's own map is read (`NavigationApi.readMap` with
  the holder's identity key, prefix = the address) and the answer is
  `facts: null` unless it holds a `kind: 'locality'` claim whose place IS
  that address — one answer for *no such place* and *a place you have not
  been*. A guest holds no map, so a guest is always answered `null`.
- **What it says.** The government is `GovernmentApi.governmentAt(address)`
  (the most-local one there); its seats are `seatsOf`, each holder named by
  live presentation when loaded, else *someone* — ⛔ never a path tail (the
  `government` verb's fallback would put an identity on the wire);
  `resident` is `residentOf(viewer)` holding that government's key. The
  **forecast is where you stand**: every crumb is a Locality covering
  where you stand, and weather is a field over places, so
  `WeatherApi.forecastFor(the viewer's place)`'s next segment, in the
  section's own weather words. No new Api, no new class.
- **P-lines.** P9 — a read, no command; the tooltip says what it shows.
  P10 — nothing stored. P11 — the client renders the facts generically
  (`crumbDoc` rows). P12 — one reader of the seats (the Api's). P13 —
  `inbound/locality.ts`: *a Locality's civic facts, for a crumb you hold*.
  P14 — nothing is learned or written by asking; a refusal is silent
  (`null`), never a reason.

### W9 — The drive files, complete
- `packages/wire/tests/navigation.dirty.wire.test.ts` finished (steps 16,
  17, 20 and the knowledge behind 1–8).
- `e2e/tests/navigation-walk.spec.ts`: every step of the blocking drive.
- `navigation-server-walk.spec.ts` and `boundary-walk.spec.ts` re-read
  against the new card (the kept test ids should hold).
- **Commit:** `drive(navigation): the wire drive and the browser walk`

Code-complete is W8. The MR opens READY then; the full suite, the
blocking drive and the walk run once, alongside review.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| the card exists | `map` (`opens_card: map`) births it — the one birth path; nothing new | the Explore panel docks CardId `map` | — | the two subscriptions open at session start (`openNavigation`) | none |
| the map draws | — | `ZoneMap` in `NavCard` | `mapCopy` filtered by `zone.id.path`; ⚠ empty for a place no Locality covers (hence the Delve's address) and for a guest | on the copy's snapshot | — |
| click to move | `go <direction>` | a neighbor mark, an opening, an arm, a name | `ways.ways[].direction` | — | `go`'s own |
| click to route | `route to <keyword>` | a distant mark | the claim's `keywords` / `group`; ⚠ a claim with no keyword is unreachable by click, and says so | the `route-plan` note → `routePlan` | the verb prompts on ambiguity |
| a door's acts | `open`, `unlock`, `look` — from `affordance-resolve` | right-click / hold / *actions* on an entry with `boundary` | `WayRecord.boundary.stuffId` | resolved per open | the radial's |
| a crumb's view | `map <address>` | a named crumb | the `locality` claim | — | ⚠ confirm the arg matches an address (W5) |
| the card remembers | — | a section's toggle, a lens toggle | `nav.card`; ⚠ **fails closed and silent** without its schema entry (the server only warns) — W0's wire step proves the round trip | the client-state snapshot at session start | the entry's validator |
| outdoors | — | the status bar | `place.weather / season / daylight` | — | — |

## Acceptance-criteria coverage

| acceptance criterion | waves |
|---|---|
| a map of the zone, from your own knowledge, three tiers told apart | W0, W1 |
| a neighbor click moves you; a distant click draws the route | W2 |
| diagonals, tracks, three zoom steps; the level control only past one level | W1 |
| every direction and every named exit in its state; *not for you* ≠ *no way*; leaving marked | W3 |
| a shut or locked door opened or unlocked from its menu; no tooltip button | W3, W7 |
| sections widest to narrowest; absent when empty; fills and folds; a set section stays | W4 |
| the zone section describes the zone as you know it, never more | W0 (views), W4 |
| a hidden way is absent until found | W1 (the copy never holds it; nothing to build — the walk asserts it) |
| the breadcrumb is your own | W5 |
| the four lenses work together | W2 (route), W6 |
| every mark has a tooltip with sources | W7 |
| weather and time on the status bar | W4 (⚠ time = season and day or night) |
| the panel is the same width in every mode | W1 |
| restart, reconnect, second device: the same map | W0 + W9 (wire); the walk reloads and opens a second context |
| two players, two maps | W0 (wire), W9 (walk) |

Unmapped: none. **Partly met as written:** the crumb tooltip's seats,
residency and forecast (W8, approved).

## Test & gate strategy

**Unit (vitest, jsdom):** the selectors, `fitSections`, the command
composition, every builder, `ZoneMap` and `Ways` from fixtures, the status
bar region, the width table. The selectors carry the build's logic and are
tested with no DOM.

**The wire drive** — `packages/wire/tests/navigation.dirty.wire.test.ts`
(dirty: it mints characters and restarts the world; run on this worktree's
own `WIRE_PORT`, testing.md § Each worktree owns a `WIRE_PORT`). It asserts
what the client **received**: the knowledge is right before any pixel is.

**The browser walk** — `e2e/tests/navigation-walk.spec.ts`. Tooltips are
read with `tipText` (focus, not hover); every SVG mark is focusable for
that reason (D1). The walk never logs in as a guest (a guest holds no map).

| step | pace | wire | browser | note |
|---|---|---|---|---|
| 1 enter the Delve | instant | ✔ claims filed, positions | ✔ | needs W0's address |
| 2 `look` | instant | ✔ edge claims, `to: null` | ✔ | ⚠ a look writes openings, not far rooms (REQUIREMENTS 2) — asserts openings and the frontier marks |
| 3 click a neighbor | instant | — | ✔ | |
| 4 the diagonal | instant | — | ✔ | corridor-3 `southeast` → vault |
| 5 down to the pit, the level control | instant | ✔ two levels in the copy | ✔ | `down` is hidden: `search` in corridor-2 first, then it lights |
| 6 the dark pit | instant | (navigation-server 14) | ✔ | put the lamp out |
| 7 found by searching | instant | ✔ a `searched` first claim | ✔ | corridor-1's hidden `northeast` (the "cache" is a Thing) |
| 8 distant click, `route to` | instant | (navigation-server 7) | ✔ | |
| 9 zone and place sections | instant | — | ✔ | |
| 10 hover every exit | instant | — | ✔ | preview strip read by focus |
| 11 hidden door; shut, locked; menu | instant | — | ✔ | the bar's hidden `north`; the doors are the bank's `pumphouse` (locked) and a shut door from the boundary walk — the lounge has none |
| 12 a way refuses you | instant | (navigation-server 6a) | ✔ | the steading's low door: amber standing, clears stooped |
| 13 occupancy rooms | instant | — | ✔ | |
| 14 a track; horizon | instant | — | ✔ | Rejection |
| 15 levels; floor N of M | instant | — | ✔ | Hearts Delight |
| 16 first visit; unnamed for another | instant | ✔ | ✔ | |
| 17 two players, two maps | instant | ✔ | ✔ | two contexts |
| 18 all lenses; every tooltip | instant | — | ✔ | |
| 19 fold, fill, remember | instant | ✔ `nav.card` | ✔ | `setViewportSize`; reload |
| 20 restart; second browser | short · staged | ✔ `restartWorld` | ✔ reload + a second context | ⚠ no e2e spec restarts the world; the restart itself is the wire's |
| 21 status bar; who keeps the ground | instant | — | ✔ | |
| 22 the Hesper | instant | (navigation-server 10) | ✔ | |
| 23 the Hush | instant | — | ✔ | |
| 24 the Terminus City crumb | instant | ✔ the claim's name | ✔ | ✔ seats, holders, residency, forecast (W8) |
| 25 22 rem at 2048 px; forum mode | instant | — | ✔ | a 2048 px viewport is 2560 at 125% |

**Blocking drive:** all 25 (none is a span). **Soak drive:** none. **Staged
twins:** none needed. The walk needs a lit lamp for steps 1–5 (the Delve is
pitch black past its mouth): the spec stages one with the harness before
step 1 (the safety lamp row exists at
`packages/content/trade-mining/content/trade/mining/thing/safety-lamp.yaml`;
the build picks the lamp and the staging call) — a staged prop, the
assertions stay `player`.

**B2 — every checkpoint can fail:** each walk assertion names a mark by test
id and a state by attribute (`data-tier`, `data-state`), never *"the map is
visible"*; make each fail once before trusting it.

**Gates:** as § Convention conformance. ⚠ `pnpm test` runs at code-complete
and at `/finalize`, nowhere between; every wave is `test:near` + the
client's vitest + the lints.

## Risks & opens

### ⚠ REQUIREMENTS — where the premise does not hold

1. **The Delve writes no claims today.** No Locality covers it, and the
   cartographer files nothing for an uncovered place — so drive steps 1–8
   and 17 would draw an empty map. The requirements say the one content
   change is a name. **This plan adds one line** (`address:
   last-counted-mile/delve`, W0) and says what it claims (Host placement).
   The alternative — filing uncovered places somewhere — is a server design
   change and is not proposed.
2. **Drive premises that are not in the content.** Step 2: a `look` records
   the ways out as openings, never the rooms beyond, so nothing *appears
   outlined* from a look; the outlined tier is reached by `told`,
   `charted`, `published`, or a place seen without walking in. Step 5: the
   Delve's `down` is hidden until searched. Step 7: the "cache" is a hidden
   Thing; the hidden **ways** are corridor-1's `northeast` and corridor-2's
   `down`. Step 11: the lounge has no door; shut and locked doors are in
   Terminus. Step 12: there is no "crack"; the steading's low door refuses a
   standing body. The test table above drives the real content. **The
   product is unchanged; the script's nouns are.** The owner may want the
   requirements' drive reworded to match.
3. **The crumb tooltip's seats and holders, resident or visitor, and
   forecast have no source.** They are in no section, no claim and no
   existing round trip. The requirements rule *absent, never guessed*
   covers it — but step 24 asserts them. W8 holds the smallest server
   addition, **for the owner to approve or decline**.
4. **Remembering needs a server schema entry** (`nav.card`, D9). One
   declaration in an existing file; no state machinery. The no-server-touch
   alternative is `localStorage` — per device, so step 20's second browser
   would not share it, and it would be the first layout state kept outside
   the client-state mechanism. **The owner chose the schema entry (2026-11-20).**
5. **The live Locality name still travels** in the `localities` section for
   a Locality you hold no claim for; the crumb does not show it (D10). If
   the wire itself must be silent, `Perceiver.localitiesSection` has to
   read your claims — a server change this plan does not make.
6. **No clock hour is on the wire.** *Time* on the status bar is season and
   day or night. Likewise absent because the server does not send them: the
   zone's rules in force, a building's way out beyond *here*, `searched` /
   `found` / `staged` on the place, a remote way's door name, whether a
   remote unwalked way leaves the zone.

### Risks

1. **Terminus City on the departures board.** The board labels a
   destination by its covering Locality's name, and the city row's comment
   says the label must stay *Terminus*. The rename changes it. The
   requirements decided the rename; this is its visible consequence — say so
   in the MR.
2. **The 22 rem panel below 1476 px.** At 1280–1475 CSS px (a 1920 screen
   at 150% is 1280) the open panel leaves no card column, so a `look` card
   is a chip until the player collapses the panel. Today the panel closes
   itself there. The owner decided the width *"with his own caveat"*; this
   is the caveat in numbers.
3. **Found by searching can read too broadly.** It is derived (the edge's
   first claim is `searched`). In a room never looked at in the light, a
   search is the first record of **every** way there, so all of them read
   *found by searching* — true of your knowledge, loose as a statement about
   concealment. A server flag would be exact (navigation-server-slate).
4. **Filling the height can oscillate** if a section's height depends on
   whether its neighbor is open. D8 learns each need once and clears on a
   width change; if the walk shows flicker, fold-only-on-overflow with no
   re-open until a resize is the fallback.
5. **Hover races.** The card column moves; tooltips in the walk are read by
   focus. A mark that cannot take focus cannot be asserted.
6. **The phone.** The same `NavCard` body renders wherever the `map` card
   does; nothing here designs the phone's surface, and the phone has no
   status bar for outdoors.
7. **A place with no keyword** cannot be routed to by a click. Shipped
   places bank keywords at perception; a `published` stop's claim has none.
8. **Sibling builds.** The requirements say no sibling touches the card,
   the map or the sources; re-check `git worktree list` branches before W0.

### Stop and ask, rather than guess
- If `map <address>` does not match an address and the name is ambiguous.
- If a door's radial does not offer `open` / `unlock` (W3) — that is an
  affordance gap on the server, not something the card may paper over.
- If W0's address makes any Delve test assert differently for a reason
  other than *claims are now written*.

## Deferred seams

Each leaves as a slate entry at the sweep; none is a stub in the code.

- **The movement block, walking to a distant place** → step-beat-slate. The
  attach point is a section slot under *you are here* in `NavCard`'s order.
- **Trail, notes and pins, prices seen, freshness bands, a recent list** →
  map-slate § Lenses (*your map grows*). Each is a new selector and a new
  lens layer; no renderer change.
- **Small and large sizes; charts for spheres and expanses; the room view;
  illustrated maps** → map-slate § The card's sizes. `ZoneMap` takes a
  `ZoneView`; a chart is a second view kind, not a second renderer.
- **The atlas** → atlas-slate; it reads the same selectors.
- **Server fields the card leaves absent** (REQUIREMENTS 6, Risks 3, the
  wire's Locality name) → navigation-server-slate § Left after the first
  pass.
- **A knowledge store of its own** → client-knowledge-model-slate
  § Performance, with the note that the selector layer now exists.
- **Lenses as instruments, the situational lens** → map-slate § Lenses.
- **The Explore card in other modes; the phone's surface** → card-sizes-slate.
- **`client-shell.md` says the status bar carries the shelf; the file does
  not** → a doc correction at the sweep.

## Critical files

Read first, in this order:

- `docs/requirements/navigation-requirements.md`
- `docs/slates/client/map-slate.md` — § The whole card, § Diagonal exits,
  § What the boundary build settled, § Reuse ledger for the plan
- `docs/subsystems/tooltips.md`, `subscription.md` (§ Where you are and
  your map), `location-graph.md` (§ A player's map, § What a claim knows),
  `client-shell.md` (§ Width tiers, § The status bar)
- `packages/types/src/index.ts` — `WayRecord` … `NavSections`,
  `RoutePlanNote`, `TooltipDoc`
- `packages/client/src/store/navSlice.ts`, `services/websocket.ts`
  (`openNavigation`, `applySessionSubscriptions`, `applyPromptSideEffects`)
- `packages/client/src/layouts/ModeStage.tsx`,
  `lib/style/useWidthTier.ts`, `components/ui/tokens.ts`
- `packages/client/src/components/cards/NavigatorBody.tsx`,
  `CardBodies.tsx` (the `map` branch)
- `packages/client/src/components/tooltip/Tip.tsx`, `useTip.ts`,
  `components/doc/docs.ts`, `blocks.tsx`
- `packages/client/src/components/ui/EntityName.tsx`,
  `store/affordanceSlice.ts`, `store/cardViewActions.ts`
- `packages/client/src/__tests__/noNativeTitle.test.ts` (the gate that
  forbids an SVG `<title>`)
- `packages/server/src/mud/lib/location/Cartographer.ts`,
  `lib/description/Perceiver.ts` (`navigation`, the section readers),
  `lib/boundary/Exit.ts` (`wayFor`, `takeFor`),
  `lib/connection/SaxonbergClient.ts` (`clientStateSchema`)
- `packages/content/newbie-wilds/content/world/newbie-wilds/delve.yaml` and
  `delve/`, `steading/yard.yaml`;
  `packages/content/platform/content/platform/idea/Locality/terminus-city.yaml`
- `packages/wire/tests/navigation-server.dirty.wire.test.ts`,
  `packages/wire/src/harness/nav.ts`; `e2e/tests/helpers.ts`,
  `e2e/tests/navigation-server-walk.spec.ts`, `tooltips-walk.spec.ts`

## Build log *(for the reviewer who has forgotten)*

### Decisions the build made (D17–)

- **D17 — A far side is joined by the row path a look recorded.** An edge
  claim from a `look` has `to: null` and `toLabel` = the far row's path;
  a singleton place's handle IS its row path, so `to ?? toLabel` matched
  against a place your map holds is the same join the server's planner
  makes (`KnowledgeGraph.fromClaims`). Without it every way seen from a
  walked room drew as an opening even when its far room was walked.
  A link seen from both ends draws once, in its latest state.
- **D18 — A way you cannot take in your own mode names the mode that
  works, as data — only if trying it would get you through** (a server
  fix the drives found, corrected once). `Exit.takeFor`, after an
  `exitMode` refusal, probes the way's own mode (`canTraverseExit`, the
  probe `go` asks) and only on a yes sends `works: { mode, command }`
  (`climb down`). The first cut put `works` in the gate itself and the
  browser walk caught it lying: with the pit sprung and no rope at the
  lip, the card offered `climb down` and the game answered *"I don't
  understand 'climb'"*. The refusal's words are unchanged.
- **D19 — No ages on the card.** Claims are stamped in GAME time
  (`NavigationApi.mapNow` = the world clock) and the client holds no game
  "now", so *walked 3 days ago* cannot be said honestly. The card lists a
  place's sources in the order learned, without an age. (A game "now" on
  the wire is the attach point — navigation-server-slate.)
- **D20 — The card fills the height of the panel it is docked in** — the
  nearest scrolling ancestor — rather than threading flex through `Card`
  (whose `ChangeMark` wrapper breaks a flex chain). Overflow = the panel's
  `scrollHeight − clientHeight`.
- **D21 — The Delve's claims file under `last-counted-mile`**, the
  covering Locality's document; `last-counted-mile/delve` is the zone's
  address, not a Locality.
- **D22 — The wire drive's light is the general store's torch**, cloned
  with a seat over `/world/terminus` (the clone gate is the ROW's title; a
  lantern clones empty of oil; a seat over `/trade/mining` is refused —
  an organization holds it).

### Waves

- **W0 ✅** `58e100b5c` — the Delve's address, Terminus City (the board
  test and comments follow), `nav.card`, `navSelectors`, the wire drive
  begun.
- **W1 ✅** `46f7308d5` — `ZoneMap`, `MapArea`, the 22 rem panel (it no
  longer closes itself for a column; only a narrow window drops it).
- **W2 ✅** `03aab7f2e` — click to go / route; the route note drawn.
- **W3 ✅** `23f9aea1f` — `Ways`, `useRadialGestures`, the icon names;
  `wayLeadsTo`. ✔ The plan's stop-and-ask check: the bank's locked
  `pumphouse` door's radial offers `unlock` and `open` (wire step 11).
- **fix** `7ac294907` — D18, and the drive's first seven steps green on a
  fresh world. ⚠ The Delve's traps are real: corridor-1's dart springs,
  corridor-2's pit drops a walker to `pit-below` (that is how step 5
  reaches level −1); on a kept world they stay sprung, so the step falls
  back to `search` and `climb down`.
- **W4 ✅** `951e2eef7` — the eight sections, `fitSections`, `nav.card`
  actions, the crumbs, the status bar's outdoors; `NavigatorBody` and
  `whereaboutsOf` deleted; the navigation-server walk reads the new card
  (it opens the two sections it reads, since the card may fold them).

- **W5 ✅** `04114dc6d` — the crumbs component landed with W4; W5 is the
  wire step: a first visit to the bank writes *Terminus* and *Terminus
  City*, the chain is the crumbs' order, a stranger holds neither.
- **W6 ✅** `e737db4c0` — `LensRow`, `boundariesView` (from YOUR locality
  claims' governments), four channels drawn together; `lensDoc` says when
  a lens has nothing to draw.
- **W7 ✅** `19f539fa5` — `TooltipSource` gains the map channels;
  `TooltipDoc.zoneThumb`; `placeDoc`, `edgeDoc`, `crumbDoc`, `levelDoc`,
  `sectionDoc`, `sightingDoc`, `zoneDoc`, `wayDoc` grown; a tooltip on every
  mark, the horizon's ticks on the map's edge.
- **W8 ✅** — `locality-facts` (see the amended W8 above). **D23 — the
  crumb's "forecast" is the sky's tell where you stand** (`skyReadFor`:
  the cloud form, and *a front may be moving in* when it presages one),
  never the procedural forecast: a glance must not do the weather
  reading's job (lens 1). A seat holder not loaded is *someone* — never a
  path tail.
- **W9** — `e2e/tests/navigation-walk.spec.ts` written; the wire drive
  carries steps 1, 2, 5, 7, 11, 16/24, 17, 19, 20.

## Drive record

**Wire drive** — `packages/wire/tests/navigation.dirty.wire.test.ts` on
build-2's own world (`WIRE_PORT=2013`), 2026-11-20:

| step | result | what it read |
|---|---|---|
| 1 into the Delve | ✔ | vestibule `walked` + `seen`, zone `/world/newbie-wilds/delve`, cell 0,0, level 0, filed under `last-counted-mile` |
| 2 a look | ✔ | `north`, `south` edges, `to: null`; no far room written |
| 5 the pit | ✔ | corridor-2's trap drops the walker; levels {0, −1}. On a kept world (sprung): `search`, the way down refuses *"you'll have to climb"* with **no** `works` (nothing to climb by), the walker staged with `goto` |
| 7 found by searching | ✔ | corridor-1 `northeast`, first claim `searched` |
| 11 the locked door | ✔ | `pumphouse` `locked`, boundary *the pump-house door*; its radial offers `unlock` and `open` |
| 16 / 24 first visit; civic facts | ✔ | locality claims *Terminus*, *Terminus City*, *Wharfside*; Terminus City: the City of Terminus, Magistrate *Odile*, three vacant seats, visitor, sky *stratus*; `null` for a stranger and for `narnia` |
| 17 two maps | ✔ | a second character holds none of the Delve |
| 19 remembers | ✔ | `nav.card` back on a second session's connection |
| 20 restart | ✔ | copy 36 → 36, nothing doubled |

**Found by the drives, fixed on the branch:** D18 (twice — the first cut
offered `climb down` with nothing to climb by); the map's edges had no
hit area (a straight line is a zero-width box); a way's hit band took a
place's click (layers reordered).

**Browser walk** — `e2e/tests/navigation-walk.spec.ts`: **4/4** (the
Delve: walked tier, openings and the frontier, an opening clicked is
`go`, the pit and the level control, a distant click draws the route
and nobody moves, found by searching, tooltips and the preview strip;
the bank's locked door and its radial, Terminus City's crumb tooltip
with visitor; the steading's low door; a track at whole zone, the
Hesper, the Hush's placeholder; 22 rem at 2048 px, fill and fold,
a hand-set section across a reload, two players two maps).

**Full suite** (`tools/suite`, at code-complete): all 56 packages pass (42 min). **`lint:family`**: 118/118 after one fix (client fixtures moved to `/test` paths).

**Soak drive:** none — every step is `instant` or `short`.

### The sweep's run (2026-11-21, after the last review change)

Master merged in (`f978e299c`), the worktree's database dropped, one
fresh world on `WIRE_PORT=2013`, both navigation drives against it.

- **First run — 4 red.** The card drive's step 20: the walker, wounded
  by corridor-1's dart, bled out across the restart and came back a
  SHADE with an empty copy — `keepsMaps` asked `shouldPersist()`, which a
  shade answers false (a pre-existing defect, not this branch's:
  master has the same rule). The `navigation-server` drive's steps 2, 3
  and 19: red on master since the tooltips build moved paths on the wire
  to spoiler level 2; the harness and step 2 still required 1.
- **Fixed** (`5e9f1b754`): `ShadeAvatar.keepsMaps` answers by the
  identity; the harness accepts any spoiler level as a tag.
- **Second run, fresh world — green.** `navigation.dirty.wire.test.ts`
  **10/10** (the walker died again across the restart; the copy came back
  whole — the fix exercised, not dodged); `navigation-server.dirty.wire.test.ts`
  **17/17**.
- **Audit fixes** in the same sweep (`365bd7c02`): a guest's session map
  freed with the guest; directions compared in long form; lens counts on
  the level you stand on; one failed seat-holder lookup no longer blanks
  the crumb tooltip; dead code from review iteration removed.
- **The browser walks**, on a fresh world after the drives: first pass
  red on what review had changed (the zone section, the preview strip,
  coordinates now behind the grid) and on the clock (night: the track's
  seep is only dim). The walk found one real defect — **a tooltip opened
  by focus was closed 300 ms later by the previous stack's grace timer**
  (`openTipNow` now cancels it; `f83df37f2`, with a regression test proved
  red). Final: `navigation-walk` **4/4**, `navigation-server-walk` **2/2**,
  `tooltips-walk` **5/5** (wide viewport — the 22 rem panel, D14).
