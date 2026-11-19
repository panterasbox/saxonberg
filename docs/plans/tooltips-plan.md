# Tooltips — implementation plan

Executes [tooltips-requirements](../requirements/tooltips-requirements.md)
(AGREED 2026-11-18). **Kind:** client, with a small server part.
**Lead end:** the client. **First consumer:** every hover string, link, chip
and control the client already draws (a retrofit). One tooltip component
renders a small structured document; it nests, locks, walks back and pins by
running a command; it is fed by what the client holds, by the help rulebook,
by a gated wiki excerpt, and by a perception-gated describe of a live thing.
Seeding slate: [tooltip-slate](../slates/client/tooltip-slate.md) — its reuse
ledger is accounted for row by row in § New substrate.

Paths below are relative to the repo root. `C/` = `packages/client/src/`,
`S/` = `packages/server/src/`, `T/` = `packages/types/src/index.ts`.

---

## Grounding

Verified by opening the files, 2026-11-18, branch `build/tooltips` @ a157add4a.

### Client

- **No positioning library.** `packages/client/package.json` dependencies:
  react 18, styled-components 6, zustand 4, lucide-react 0.454.0, monaco,
  nanoid, yaml. No floating-ui / radix / tippy.
- **Hand-rolled popovers.** `C/components/GutterStripe.tsx` — `HOVER_DELAY_MS
  = 250`, `hoveringTip` + `hoverTimerRef`, an absolutely positioned
  `Tooltip` (label · topic · description · time) and a click `Popover`
  (mute/solo/new tab/mute family) closed by a window `mousedown` listener.
  `C/components/TabStrip.tsx:144` `ConfirmPopover` (delete confirmation,
  rendered at :504).
- **The glossary precursor.** `C/components/cards/InspectionBody.tsx:194-228`
  — module `summaries` Map + `useSummary(source)`: `GET
  ${SERVER_URL}/api/help/topic?id=mixin.<Name>`, `credentials: include`,
  cached for the session; read by `SourcePopover` (:361), which is opened by
  CLICKING a gutter `Stripe` (the stripe's hover is a native `title`, :260).
- ⚠ **The native hover census is 104, not ~40.** `grep -rnE '\btitle='
  C/ --include=*.tsx --include=*.ts` (tests excluded): **104 sites in 38
  files** — 66 in 30 player-facing files, **38 in 8 CMS/studio files**
  (`ComposerView` 16, `TemplateForm` 6, `CatalogueView` 4,
  `BlueprintDetailView` 4, `CmsDiagnosticsPanel` 3, `CmsEditor` 2,
  `CmsGitPanel` 2, `CmsTreeNode` 1). Largest player-facing: `CardBodies` 11,
  `Card` 7, `ReactionBar` 6. Not caught by that grep: `ui/Figure.tsx:292`
  (`{ title: ariaLabel }` spread), `PressRoom.tsx:314` (`title:` in a props
  object), `ui/icons/Icon.tsx:46` (SVG `<title>`). Of the 104, **3 are
  `<iframe title>`** (`embed/StreamEmbed.tsx:107,121,138` — an iframe's
  accessible name, not hover text) and **4 are a `title` prop on `Seal`**
  (`StartScreen:628`, `CharacterSelect:871`, `frame/Frame:117`,
  `frame/MobileFrame:254`).
- **Hover → command preview.** `C/store/index.ts:411-430` `ghostPreview` /
  `setGhostPreview`; the only reader is `C/components/frame/StatusBar.tsx:159`.
  Two guards: `frame/__tests__/StatusBar.test.tsx:126` (*exactly one module
  reads ghostPreview*, regex `\bs\.ghostPreview\b`) and
  `frame/__tests__/CommandSheet.test.tsx:100`.
- **Touch.** `C/components/social/useLongPress.ts` — 450 ms, 10 px move
  tolerance, inert for `pointerType === "mouse"`. `C/components/Terminal.tsx:307`
  puts it on the ROW (line menu, else `EmoteSheet`). A tap goes through
  `App.tsx:605` → `openCommandSheet` (`store/index.ts:443`;
  `frame/CommandSheet.tsx`, scrim `z-index: 70`).
- **Links.** `C/components/MmlRenderer.tsx`: `commandFor()` :121-151 (`exit`
  → `go <dir>`; `detail` → `look <key>`; `thing|location|player|npc` → `look
  <primaryKeyword|label>` via `stuffRegistry`), `commandForLink()` :160-170
  (`mudcmd:` → the command; `mudref:` → `look`; `mudq:` inert). Clickable
  output is a `ClickableSpan` (a `<span>`, **not focusable**) with
  `data-stuff-id`, `onMouseEnter → onCommandPreview(cmd)`, shift-click copies,
  and `title="Click to send: … · shift-click to copy"` (:595, :627).
  `Spoiler` :397-415 — one local `revealed` bit, `data-spoiler-level`, a
  native `title`; it ignores the level.
- **Chips.** `InspectionBody.tsx` `ItemChips` (:271) — `<button>` chips with
  `data-stuff-id`, `lookCommand(...)` from `cards/clickTarget.ts`. A
  `SegmentItem` (`T/:1733`) carries `stuffId · label · keyword · count` and
  **no kind**.
- **The card header** is inline in `C/components/cards/Card.tsx` (:350-372):
  `KindMark` (`cards/KindMark.tsx` — `Icon name="kind.<branch>"`,
  `KIND_NAME`) + `Title`. `InspectionBody`'s header comment: *"Nothing here
  derives a line of its own, so the card and the scrollback cannot disagree."*
- **Icons.** `ui/icons/iconMap.ts` (10 mapped names + `FALLBACK_ICON`),
  `ui/icons/Icon.tsx` — non-decorative: `role="img"`, `aria-label`, **and an
  SVG `<title>`**.
- **Images.** `mediaUrl()` in `C/config.ts`; `IllustrationShape` (`T/:1768`).
- **The wire client never sends `mql-query`.** `C/services/websocket.ts` has
  `subscribe`/`subscribeMql`/`resolveAffordances` (:869) and no one-shot
  query. The wire harness does (`packages/wire/src/harness/session.ts`
  `query()`).
- **Client state.** `connection-established.clientState` seeds the store;
  `store/index.ts:1518` copies `payload.resultDisplay` into
  `clientState["shell.result"]`; `App.tsx:260` reads it.
- **Client guard-test precedent.**
  `C/lib/style/__tests__/noHexLiterals.test.ts` — a vitest that walks `src`
  and fails on a banned pattern. Colors come only from `lib/style/themes/`.
- **Pop-out windows exist** (`cards/PopOut.tsx` `usePopOut`): a card can
  render in another `window`, so a portal must target the anchor's own
  document.

### Server

- **The one-shot query.** `S/backend/inbound/mql.ts` → `SubscriptionApi.handleQuery`
  (`S/mud/api/subscription.ts:416`) → `MqlSubscriptionRegistry.handleQuery`
  (`S/mud/platform/idea/MqlSubscriptionRegistry.ts:664`): `MqlApi.resolveMany`
  → `PerceptionApi.perceived(giver, …)` → `projectStuffInto` under
  `PerceptionApi.holdLightSteady()` → one `mql-query-result`.
- ⛔ **It is NOT gated the way the requirements assume.** Three verified facts:
  1. `#<id>` resolves **anywhere in the world** — `S/mud/api/mql/resolver.ts:395`
     is `StuffApi.findById`, by design (*"an id names the thing for everyone"*).
  2. `PerceptionApi.perceived` is **concealment + holders**, not locality and
     not light — `perceivesImpl` (`S/mud/platform/idea/api/PerceptionLogic.ts:1045`):
     lens → on your body → `holdersAdmit` (returns true at the first Place) →
     `concealmentAdmits` (true for anything not concealable).
  3. `Visible`'s descriptors are **viewer-blind** — `shortDescription`,
     `longDescription`, `illustration`, `illustrationShape`
     (`S/mud/lib/description/Visible.ts:204-248`) never ask whether the viewer
     can see. Only `displayName` is viewer-aware (`projectFields` calls
     `describeFor(viewer)`, which answers *something / someone* when vision
     fails — `RecognitionLogic.ts` `canSeeGate` + `obscured`).

  So `mql-query "#<id>" detail` today describes a thing in another town and a
  thing in the pitch dark. D3 closes both for the tooltip.
- **What does gate locality:** MQL's `reachable` seed
  (`S/mud/api/mql/scope-walk.ts:131` — attached · inventory · around · here ·
  peers · self), which is `look`'s own arg scope (`look.yaml`: `scope:
  ["$focus", "reachable"]`). A stuffId mid-chain **intersects**
  (`resolver.ts:893-901`), so `reachable:#<id>` is *this thing, if `look`
  could reach it*.
- **What reads light without writing:** `PerceptionApi.lightBandFor(viewer,
  place): { band, dark } | null` (`S/mud/api/perception.ts:740`) — *the band
  `look` renders by, read WITHOUT looking*. ⚠ `PerceptionApi.observe` is
  `look`'s moment and **writes** (tracks a person, records discoveries,
  teaches the map) — a hover must never call it.
- **Field sets.** `REF_FIELDS` / `DETAIL_FIELDS` (`subscription.ts:143,157`);
  an explicit `fields: string[]` is honored (`resolveFieldSet`). ⚠
  `projectFields` **silently omits** a name with no descriptor.
- **Kind.** `subjectKindOf(stuff)` is module-private in
  `S/mud/platform/idea/CardRegistry.ts:278` (`instanceof Place/Agent/Idea`);
  no wire record carries a kind. `Stuff` has `isAgent()/isThing()/isIdea()/isPlace()`
  (`S/mud/lib/stuff/Stuff.ts:1351-1381`) and one root descriptor,
  `displayName` (:213).
- **Paths on the wire already have a type:** `TaggedPath { path; spoiler: 1 }`
  (`T/:1353`, navigation-server D6), built at
  `S/mud/platform/idea/cmd/movement/RouteController.ts:436` and
  `S/mud/platform/idea/api/NavigationLogic.ts:1098`. No client code reads
  `.spoiler` on it.
- **Help.** `S/backend/HelpRoutes.ts` — `GET /api/help/index|kind|topic|search`,
  all through `HelpApi` (`S/mud/api/help.ts`), every read through
  `applyFilter` (:223; identity at the floor). `HelpTopic` (`T/:5625`):
  `summary`, `body` (MML), `relations`, `spoiler` (*a capability flag* — a
  flagged topic is withheld, never collapsed). `topic?id=` is id-keyed; the
  order the `help <word>` verb resolves in (verb → concept → collection → api
  topic) lives in the CONTROLLER
  (`S/mud/platform/idea/cmd/system/HelpTopicController.ts` `showFallthrough`).
- **Wiki.** No Api (`S/mud/api/` has no `wiki.ts`), no REST. The reveal gate
  is `WikiRenderer.render` (`S/mud/platform/idea/WikiRenderer.ts:127`), gated
  `RenderCallers` = `WikiControllerBase` subclasses + `FromTemplate('/platform/idea/WikiRegistry')`.
  The reader is the **acting author** (`resolveReader` :834). The per-page
  render setup (namespace zone, `spoilerDefault`, link + snippet resolvers)
  lives in `WikiControllerBase.renderBody`
  (`S/mud/platform/idea/cmd/system/WikiControllerBase.ts:148`). Resolved wiki
  links are emitted as `mudcmd:wiki <handle>` (`WikiRenderer.ts:568`).
  `Sections` (`S/mud/lib/wiki/Section.ts:99`) lists a body's sections from
  the SOURCE.
- ⚠ **The appetite numbers in the code are not the requirements' numbers.**
  The setting `wiki.spoilerAppetite` (`S/mud/lib/character/Avatar.ts:629`)
  **defaults to 0**, range 0–3. What is *1 for an ordinary player and 0 for a
  guest* is the **ceiling** (`WikiRenderer.ceilingFor` :296), and the wiki
  **clamps appetite to the ceiling** (:843) and **deletes** anything above
  the ceiling. See Risks 1.
- **A setting reaching the client has one precedent, in two controllers:**
  `SettingsControllerBase.pushResultDisplay`
  (`S/mud/platform/idea/cmd/shell/SettingsControllerBase.ts:69`), called from
  `SettingsSetController:40` and `SettingsUnsetController:27`, plus a
  `resultDisplay` field built in `Avatar.ts:1151`. `Environment.setSetting`
  (`S/mud/lib/shell/Environment.ts:470`) fires `fireFieldChange(this,
  'settings', …)` and knows nothing of the client.
  `SaxonbergClientMixin.snapshotClientState()`
  (`S/mud/lib/connection/SaxonbergClient.ts:952`) is the documented place a
  client's own resolution is applied on top of the stored keys.
- **Running a read as a holder from the backend** has a precedent:
  `ExecutionContextApi.runRoot(null, 'record.backfill', async () => {
  ExecutionContextApi.tagActingAuthor(owner); … })` (`S/mud/api/record.ts:176`).
- **One-shot request/response messages** have precedents:
  `affordance-resolve` (`S/backend/inbound/affordance.ts`), `reaction-expand`.
  Handlers register in `S/backend/inbound/index.ts` `inboundHandlers`.

### Tests

- Wire files: `packages/wire/tests/<flow>.wire.test.ts`, or
  `<flow>.dirty.wire.test.ts` + an exported `DIRTY_REASON` when the file
  cannot leave the world as it found it (`docs/testing.md` § Repeatable by
  default). A known pitch-dark place: the Seznick house bedroom
  (`packages/wire/tests/avatar-family.dirty.wire.test.ts:215`).
- Browser walks: `e2e/tests/<feature>-walk.spec.ts`; helpers in
  `e2e/tests/helpers.ts` (`mintSession`, `openWorldAs`, `openWorldAsFounder`,
  `runCommand`); `startLocation` pins a spawn.

---

## ⭐⭐ New substrate

| # | item | ledger row | reuse / new |
|---|---|---|---|
| N1 | `@floating-ui/react-dom` (client dependency) | positioning / collision / portal | **genuinely new** — searched `package.json` and `C/` for floating-ui, radix, tippy, popper: none |
| N2 | `TooltipDoc` + `TooltipHeader` · `TooltipFact` · `TooltipSpoiler` in `T/` | (slate open question 3) | **genuinely new** type; reuses `StuffKind`, `IllustrationShape`, `TaggedPath` |
| N3 | `C/components/doc/blocks.tsx` — `DocHeader`, `FactRows`, `DocProse`, `DocImage`, `SpoilerBlock`, `HintFooter` | spoiler · icons · images | **generalizes** `MmlRenderer` `Spoiler`, CharGen's veiled rows, `Card`'s inline `KindMark`+`Title`; the three specifics are replaced |
| N4 | `C/components/doc/docs.ts` — pure builders `thingDoc`, `helpDoc`, `controlDoc`, `frameDoc`, `wayDoc` | link click · images | new module; reuses `commandFor`, `lookCommand`, `mediaUrl` |
| N5 | `C/components/tooltip/TooltipLayer.tsx` (floating stack + bottom sheet) | hover timer + dismissal | **generalizes** `GutterStripe`'s tip; that tip is deleted |
| N6 | `C/components/tooltip/useFloat.ts` (position + portal + dismiss) | hover timer + dismissal · positioning | consumed by the layer, `TabStrip` `ConfirmPopover` and `GutterStripe`'s action popover — both lose their own positioning and click-outside code |
| N7 | `C/components/tooltip/useTip.ts` (the one hook every anchor spreads) | touch · hover → preview | composes `useLongPress`; never touches `ghostPreview` |
| N8 | `C/store/tooltipSlice.ts` (the stack) | — | new slice, the `affordanceSlice` / `navSlice` shape |
| N9 | `C/services/tooltipSource.ts` (resolve + cache) | glossary fetch + cache · live describe | **generalizes** `useSummary` + its `summaries` Map, which are deleted |
| N10 | `websocketClient.query()` and `.wikiExcerpt()` | live describe | the client's first `mql-query` sender; reuses the envelope types |
| N11 | `SubscribableFieldDescriptor.sense` + the one-shot's dark gate + `MqlQueryResultEnvelope.dark` | live describe (*"reuse as-is"*) | **genuinely new** — grounding found the one-shot is not light-gated; searched `subscription.ts`, `Visible.ts`, `PerceptionLogic.ts` for a per-field sense gate: none. Reuses `PerceptionApi.lightBandFor` |
| N12 | root fields `kind` and `path` on `Stuff`; `Stuff.stuffKind()` | spoiler | `stuffKind()` is `CardRegistry.subjectKindOf` **moved** (the private function is deleted); `path` reuses `TaggedPath` |
| N13 | `WikiRegistry.renderFor(page, opts)` + `WikiRegistry.excerptFor(ref)`; `Sections.lead(body)` | wiki excerpt | `renderFor` is `WikiControllerBase.renderBody` **moved** (the controller forwards); the renderer is reused unchanged |
| N14 | `WikiApi.excerpt(ref)` — `S/mud/api/wiki.ts` | wiki excerpt | **genuinely new** — the wiki has no Api; searched `S/mud/api/*` (only `RecordApi.recall('wiki')`, a search). See Risks 7 |
| N15 | wire `wiki-excerpt` → `wiki-excerpt-result`; `S/backend/inbound/wiki.ts` | wiki excerpt | new message pair; the `affordance-resolve` shape |
| N16 | `HelpApi.resolveTopic(word)`; `GET /api/help/topic?word=` | help topics | `HelpTopicController.showFallthrough`'s order **moved** onto the Api; the controller calls it |
| N17 | `SettingsSchemaEntry.client` (a setting mirrored to the client) | spoiler (*"the appetite reaches the client"*) | **generalizes** `pushResultDisplay` and the `resultDisplay` payload field, both deleted |
| N18 | setting `spoiler.appetite` (was `wiki.spoilerAppetite`) | spoiler | a rename, no second setting |
| N19 | `C/__tests__/noNativeTitle.test.ts` | native hover strings | new gate, the `noHexLiterals.test.ts` shape |
| N20 | `packages/wire/tests/tooltips.wire.test.ts`, `e2e/tests/tooltips-walk.spec.ts`, `docs/subsystems/tooltips.md` | — | the drive files and the subsystem doc |

**No new mixin, no new Stuff class, no new Idea, no document kind, no Mongo
collection, no new verb, no command-view change, no pack touched.**

Ledger rows with nothing new: **help topics** (REST reused; N16 is one move),
**hover → command preview** (untouched), **link click** (reused), **pin →
card** (reused: pin sends a command), **icons** (reused; the SVG `<title>` is
removed), **images** (reused).

### P9–P14, per item

P9 predictable from the def and help · P10 metadata is a Document · P11 no
caller branches on the destination · P12 no synonym · P13 on the host whose
header sentence it fits · P14 nothing moves, retargets or decides invisibly.
*n/a* = the question cannot arise (not a command / not metadata / not a
primitive).

| item | P9 | P10 | P11 | P12 | P13 | P14 |
|---|---|---|---|---|---|---|
| N1 library | n/a | n/a | n/a | no second positioner remains (N6 folds both popovers) | n/a | it places; it never opens or closes anything |
| N2 `TooltipDoc` | n/a | a wire value type nothing stores | one renderer for every source; no branch on who built it | not a card envelope: no `cardId`, no lifetime | types package | `pin` and `command` are stated fields, never inferred |
| N3 blocks | n/a | n/a | card and tooltip call the same block with the same props | replaces `Spoiler` + veiled rows; none left beside it | content, owned by neither container | `SpoilerBlock` opens by `level <= appetite` or one click; says which |
| N4 builders | n/a | n/a | one builder per kind of subject, chosen by the anchor's own tag | `thingDoc` is the only record → doc path | pure functions of a record | a builder adds no fact the record lacks |
| N5 layer | a tooltip runs no command; pin sends the visible one | n/a | float vs sheet chosen by pointer type, once, in the layer | — | the shell mounts one | a tooltip never mints a card; no dock/minimize/pin-in-place exists to call |
| N6 `useFloat` | n/a | n/a | n/a | the one positioner | n/a | never moves a locked tooltip |
| N7 `useTip` | hover informs; click is unchanged | n/a | n/a | additive to the existing `onMouseEnter` | n/a | never writes `ghostPreview`, never opens `CommandSheet` |
| N8 slice | n/a | n/a | n/a | not `ghostPreview`, not `commandSheet` | its own slice | an open entry's doc is frozen at open |
| N9 source | n/a | n/a | the source kind is on the anchor; the resolver dispatches once | replaces `useSummary` | services | cache TTLs are constants in one file; a miss is shown as a miss |
| N10 senders | n/a | n/a | n/a | `query()` is the existing message | websocket client | — |
| N11 `sense` + dark | no command changes; `look` untouched | n/a | the registry asks the descriptor, never the field name | no second describe path | the mixin that owns a field says which sense tells it (`Visible`) | the envelope SAYS `dark`; a withheld field is absent, never blanked |
| N12 `kind`, `path` | n/a | n/a | n/a | `stuffKind()` replaces `subjectKindOf`; `path` is `TaggedPath` | `Stuff` root: *universal identity renders* (its descriptor comment) | `path` is always sent tagged; the CLIENT collapses it |
| N13 `renderFor` / `excerptFor` / `lead` | `wiki <page>` renders exactly as before | n/a | one render setup for the verb and the excerpt | no second renderer, no second gate | the registry already reaches the renderer; `Sections` already owns source spans | the excerpt is the lead of the same gated render, cut BEFORE the gate |
| N14 `WikiApi` | n/a | n/a | n/a | not `RecordApi.recall` (search hits) | an Api is the backend's only door | takes no reader: the acting author is the reader |
| N15 `wiki-excerpt` | n/a | n/a | n/a | not a subscription (nothing is kept current) | inbound, its own file | one answer for *no page* and *nothing you may read* |
| N16 `resolveTopic` | `help <word>` resolves in the same order, from one place | n/a | controller and REST call the same static | replaces the controller's inline chain | `HelpApi` | category fallthrough stays the verb's and is not a topic |
| N17 `client` flag | `settings set` still only sets; the mirror is declared on the entry and listed by `settings describe` | n/a | `Environment` pushes for any flagged entry; no per-key code | replaces `pushResultDisplay` | `Environment` owns settings | the entry declares it; nothing is mirrored undeclared |
| N18 rename | `settings describe spoiler.appetite` says it governs the wiki and tooltips | n/a | n/a | one setting, the old key gone | stays on `Avatar.settings` (no mixin to take it; see Host placement) | — |
| N19 gate | n/a | n/a | n/a | — | client test | fails with file:line |

---

## Plan-level decisions

**D1 — Positioning: add `@floating-ui/react-dom`, nothing more.** Pinned to an
exact version (no caret), the current 2.x at install. It supplies
`computePosition` + `flip` · `shift` · `offset` · `size` · `autoUpdate`.
Interactions (hover intent, lock, focus, dismiss) are ours — the heavier
`@floating-ui/react` is **not** added. W0 verifies the license is MIT and
records version and gzipped size in the commit message; a non-MIT license is
a stop. The portal target is `anchor.ownerDocument.body` (pop-out windows).

**D2 — One document type, one set of blocks, two containers.** `TooltipDoc`
lives in `@saxonberg/types`:

```ts
export type TooltipSource = 'seen' | 'help' | 'wiki' | 'client';
export interface TooltipHeader { icon?: string; kind?: StuffKind; name: string; kindWord?: string }
export interface TooltipFact { label: string; value: string; source: TooltipSource; at?: number }
export interface TooltipSpoiler { level: 0 | 1 | 2 | 3; label: string; text: string }
export interface TooltipDoc {
  header?: TooltipHeader;
  facts?: TooltipFact[];
  prose?: string;                                  // MML
  image?: { key: string; shape?: IllustrationShape };
  spoilers?: TooltipSpoiler[];
  hint?: string;
  command?: string;                                // what a click on the anchor runs
  pin?: string;                                    // the command that opens the card this previews; absent = no pin
}
```

`TooltipSource` is the closed list this build has producers for (*walked*,
*told by* arrive with the navigation build's knowledge model — add a member
then). The server returns a `TooltipDoc` for the wiki excerpt (D4); the
describe stays record-shaped on the wire (the ledger says reuse) and the
client builds its doc with `thingDoc`. **Sharing with cards:** `Card.tsx`'s
head renders `<DocHeader>` in place of its inline `KindMark` + `Title` (the
controls stay the card's); `InspectionBody` renders `<FactRows>` and
`<SpoilerBlock>` from `thingDoc(record, kind, card.takenAt)` — the same
builder, the same blocks. The tooltip container renders the whole doc and has
**no** card controls: there is no code path that docks, minimizes or keeps a
tooltip live.

**D2a — A thing's doc out-says nothing `look` gates.** `thingDoc` =
header (kind icon, `displayName`, kind word) · prose (`shortDescription`) ·
image (`illustration`, ≤ 96 px, `object-fit: contain`) · facts: **`quantity`
only** (a stack's count, `source: 'seen'`, `at` = when taken) · spoiler (the
path, D6) · hint (*click — `<command>`*). Mass, material, contents and worn
are NOT facts here: `look` prints them under its own rules
(`PerceptionApi.isAnotherPerson` withholds a person's weight and pockets) and
the record's descriptors do not all repeat those rules. This also keeps the
card honest to `InspectionBody`'s rule — the fact strip adds no line `look`
did not say except the count the card title already shows.

**D3 — The live describe.** The client sends the existing `mql-query`:
`query: "reachable:#<stuffId>"`, `cardinality: 'one'`, `fields:
['displayName','kind','quantity','shortDescription','illustration','illustrationShape','path']`.
- *Out of reach* is MQL's: `reachable:` is `look`'s own scope, so the tooltip
  describes exactly what `look` could open a card for. An empty result is
  **"You can't see that now."**
- ⭐ **The server enforces it, not the client's query** (review of the
  draft, 2026-11-18 — *perception gates are binding*; MQL names, the act
  observes). `handleQuery` (the one-shot only) keeps a resolved subject
  only when it is in the viewer's `reachable` set — the same set `look`
  uses — whatever query text arrived; outside it the result is `[]`. A
  hand-written `mql-query "#<id>"` therefore describes nothing out of
  reach. The client is the one-shot's only sender today, so this changes
  no other caller; live subscriptions keep their current scoping (Deferred
  seams).
- *The dark* needs a server change (grounding: the one-shot is not
  light-gated). `SubscribableFieldDescriptor` gains optional `sense:
  SenseChannel`. `Visible` marks `shortDescription`, `longDescription`,
  `illustration`, `illustrationShape` `sense: 'vision'`; `Stuff`'s `path` is
  marked too (naming what a thing really is, of a thing you cannot make out,
  is the leak). In `MqlSubscriptionRegistry.handleQuery`, once per query:
  `PerceptionApi.lightBandFor(viewer, <the viewer's place>)`; when `dark`,
  fields whose descriptor declares `sense: 'vision'` are dropped from the
  projection and the result envelope carries `dark: true`. The record still
  carries `displayName` — already *something / someone* — and `kind`. The
  client renders header + *"Too dark to make out."*
- ⚠ **Live subscriptions do not read `sense`** in this build (Deferred seams).
- **Cache:** per `stuffId`, TTL 5 s, in `tooltipSource.ts`; cleared when the
  viewer's place changes (the store's whereabouts `place` section). In-flight
  requests are de-duplicated. A query that gets no answer in 3 s resolves as
  a miss (*"You can't see that now."*), never a spinner that stays.
- **Snapshot:** the resolved doc is copied into the stack entry when it
  opens; nothing writes to an open entry afterwards.
- **Open delay 200 ms** (grain) before any request is sent, so sweeping the
  scrollback sends nothing.

**D4 — The wiki excerpt: a wire request through the wiki's own gate.**
- `Sections.lead(body)` — the **opening section**: the source before the
  first heading; when the body opens on a heading, that first section's
  text. Source-level, like the rest of `Sections`.
- `WikiRegistry.renderFor(page, { body?, appetite? })` — the render setup
  moved out of `WikiControllerBase.renderBody` (zone, `spoilerDefault`,
  resolvers), which now forwards. One setup, two callers.
- `WikiRegistry.excerptFor(ref)` — `resolve(ref)` → `renderFor(page, { body:
  Sections.lead(page.getBody()) })` → `TooltipDoc { header: { name: title,
  kindWord: 'wiki page' }, prose: <gated MML>, facts: [{ label: 'from',
  value: 'the wiki', source: 'wiki', at: updatedAt }], command: 'wiki
  <handle>', pin: 'wiki <handle>' }`, or `null` for no page **or** a lead
  the gate emptied. Gated `FromModule('/api/wiki#WikiApi')`.
- `WikiApi.excerpt(ref)` forwards. It takes **no reader**: the reader is the
  acting author, as in `WikiRenderer.resolveReader` — so ceiling and appetite
  are exactly the `wiki` verb's.
- `S/backend/inbound/wiki.ts` `handleWikiExcerpt`: shape-check, then
  `ExecutionContextApi.runRoot(null, 'wiki.excerpt', …)` +
  `tagActingAuthor(holder)` (the `RecordApi` precedent), then one
  `wiki-excerpt-result { requestId, ref, doc: TooltipDoc | null }`. One
  answer for *no such page* and *nothing you may read* (the
  `affordance-error` reasoning).
- A spoiler above the reader's appetite arrives as `<spoiler level=n>` inside
  `prose`, exactly as `wiki` sends it; the client's `SpoilerBlock` shows it
  collapsed. Above the ceiling it is absent because the renderer deleted it.
- Client cache: per `(ref, appetite)`, TTL 5 min.

**D5 — The appetite: one setting, mirrored to the client by declaration.**
- Rename `wiki.spoilerAppetite` → **`spoiler.appetite`**. Same range, same
  validator, **same default (0)**, still declared on `Avatar.settings`. The
  description is rewritten to cover the wiki and tooltips. No migration: a
  stored old key is simply unread.
- `SettingsSchemaEntry.client?: true`. In `Environment.setSetting` /
  `unsetSetting`, after the store write, a flagged entry on a host that
  composes `ClientState` pushes `pushClientStateUpdate(baseKey, resolved)`
  (a `perFactor` entry pushes `{ desktop, mobile }`).
  `SaxonbergClientMixin.snapshotClientState()` adds every flagged entry's
  resolved value, so the first render has it.
- `shell.result` gets `client: true`; `pushResultDisplay` (both call sites),
  the `resultDisplay` field of `ConnectionEstablishedPayload`, its builder in
  `Avatar.ts:1151` and the copy at `C/store/index.ts:1518` are **deleted**.
- The client reads `clientState["spoiler.appetite"]` (absent → 0).

**D6 — The path.** `Stuff`'s new root descriptor `path` reads
`stuff.getTemplatePath()` → `TaggedPath`, absent when there is none. **The
template path, never `getIdentityPath()`** — the spoiler slate's words are
*"it links this thing to its row … names the code to read"*, and an identity
path would put a player's id on every viewer's wire. `TaggedPath.spoiler`
changes from the literal `1` to **`2`** (the requirements' level), at the
type and at both producers. `path` joins `DETAIL_FIELDS`, so a subject card's
record carries it and the card shows the same block. Client rule, in
`SpoilerBlock` and nowhere else: **open iff `level <= appetite`**; otherwise
collapsed under its label (*"What is this, really?"*), one click opens it for
that tooltip. The path is never clamped to a ceiling — it is never withheld.

**D7 — Pin and glossary resolution.**
- Pin = `sendCommand(doc.pin)` then close the stack. `pin` is set by the
  builder: a thing → the anchor's own `look …` command; a help term → `help
  <word>`; a wiki term → `wiki <handle>`. `controlDoc`, `frameDoc` and
  `wayDoc` set none, so their tooltips draw no pin.
- A **term** is a link whose command opens a help or wiki card: a `mudcmd:`
  href whose first word is `help` or `wiki`. That is the whole
  classification (one function in `docs.ts`), and it is why a new topic or
  page needs no code.
- Help: `GET /api/help/topic?word=<w>` → `HelpApi.resolveTopic(w)` (verb →
  concept → collection → api topic; an exact topic id, as `help mixin.X`
  passes today, resolves through the same chain — W3 verifies and keeps
  `?id=` working). `helpDoc(topic)` = header (title, kind word *help*) ·
  prose (`summary`) · facts (`from: help`) · term links from
  `topic.relations` · `pin`. `HelpTopic.spoiler` is a capability flag: a
  flagged topic the viewer may not have is a 404 → *"No help for that."*; the
  client collapses nothing.

**D8 — Gestures.**
- *Pointer:* enter → 200 ms → open at depth 0 (or depth n+1 when the anchor
  is inside tooltip n). Leaving the anchor before lock closes it. **Lock** at
  400 ms after open, or at once on Shift keydown while one is open. A locked
  stack shows the breadcrumb (one crumb per level; clicking a crumb closes
  the levels above it) and the pin (when `doc.pin`). It **does not move**.
  It closes: one level per Esc; all on a click outside; all when the pointer
  has been outside both the root anchor and every tooltip for 300 ms
  (grain — see Risks 9).
- *Keyboard:* focus opens (no delay) and locks at once; blur closes unless
  focus moved into the stack; Esc as above. ⭐ **Roving focus, not a tab stop
  per link** (review of the draft): the scrollback is ONE tab stop; arrow
  keys (↑/↓ by link, Home/End) move focus among its `ClickableSpan`s
  (`role="link"`, `tabIndex` −1 except the current one, Enter runs the
  click). Hundreds of links must not each sit in the tab order. Card chip
  rows take the same pattern.
- *Touch:* `useTip` composes `useLongPress` on the anchor and stops the
  `pointerdown` from reaching the row, so the row's long press does not also
  fire; when the hold completes it opens the **bottom sheet** (scrim, `z-index`
  above `CommandSheet`'s 70) and swallows the click that follows release. A
  tap is untouched → `CommandSheet`. In the sheet a term **pushes** (the
  sheet shows the top of the stack) with a back control; the pin and the
  breadcrumb are the same components.
- *Coexistence:* `useTip` returns handlers a site merges with its own; it
  never calls `setGhostPreview`. The status bar previews exactly as today.
- *Link grammar* (dotted term · underlined thing · boxed command) is drawn
  **inside tooltips only** (`DocProse` passes a flag to `MmlRenderer`); the
  scrollback's link style is unchanged (Risks 8). Colors are theme tokens.

**D9 — The retrofit and its gate.** Every native hover string becomes
`useTip(controlDoc(label, command?))` — a control's tooltip names what it
does and the command it runs. `Icon` drops its SVG `<title>`, keeps
`aria-label`, and a non-decorative icon carries its own tip. `Seal`'s `title`
prop is renamed `label`. `GutterStripe`'s hover becomes `frameDoc` (facts:
topic, time). `noNativeTitle.test.ts` scans `C/**/*.{ts,tsx}` (tests
excluded) for `\btitle=`, `title:` inside a JSX spread literal, and
`<title`: **census then ratchet** — W0 sets the ceiling to today's count
(104 + 3), each retrofit wave lowers it, W7 leaves it at **3** with an
allowlist of exactly `<iframe title=` (an iframe's accessible name). CMS and
studio are included: the requirements say every hover string in the client
(Risks 4).

**D10 — Tests.** § Test & gate strategy.

---

## ⭐⭐ Host placement

| new thing | host | what that claims of everything on the host |
|---|---|---|
| `kind` descriptor, `stuffKind()` | `Stuff` (root) | every Stuff is on exactly one branch — true by construction; the value differs per host |
| `path` descriptor | `Stuff` (root) | every Stuff has a template path or the field is absent. No guard, no default "none" |
| `sense` | the **descriptor**, declared by the mixin that owns the field | nothing of other fields: undeclared = told by no particular sense = never dropped. Five fields declare it |
| `dark` | the **query result envelope** | it is a fact about the viewer's place, so it is said once, not stamped on each record (P2's mirror) |
| `client` | a **settings schema entry** | nothing of other entries; two declare it. It is a declaration like `perFactor`, not a capability on hosts |
| `spoiler.appetite` | `Avatar.settings`, where it is today | unchanged. Its own comment asks for a reader-preferences mixin; this build has one setting and adds no mixin for it |
| `renderFor`, `excerptFor` | `WikiRegistry` | the registry already holds the renderer and every page read; controllers keep only I/O |
| `lead` | `Sections` | a source span, beside `list` |
| `resolveTopic` | `HelpApi` | beside `commandTopic` / `conceptTopic`, which it calls |
| tooltip stack | its own zustand slice | not `ghostPreview` (one reader, guarded), not `commandSheet` |
| blocks | `components/doc/` | owned by neither container; `cards/` and `tooltip/` both import it, neither imports the other |

No guard re-narrows any host. The one place a guard was tempting — *is this
subject a person? then drop mass* — is the reason D2a keeps those fields out
of the doc entirely.

---

## Convention conformance

- `props:`/`cast:`, locations-not-rooms, the five namespace axes: **not
  touched** — no content row, no class, no pack.
- Module categories: `api/wiki.ts` is an Api (ends
  `SecurityApi.decorateApiClass(WikiApi)`, exports the class only, declares
  `static needs` like `HelpApi`); `backend/inbound/wiki.ts` is an inbound
  handler; everything else edits existing modules. **No new category, no free
  helper on the server.**
- Module scope declares; import boundary: `api/wiki.ts` imports only inside
  `src/mud/`.
- Verbs on objects: `WikiApi.excerpt(ref)` takes a string; no Api static
  takes a world object first.
- **P3** refuse/skip/throw — an unreachable thing: empty result →
  *"You can't see that now."*; no page / no topic: said in the tooltip; a
  query error or timeout: the same miss line, never a silent empty panel; a
  malformed inbound payload: dropped, as every handler does.
- **P4** no duck typing — the client reads typed envelopes; no pack involved.
- **P5** the mixin decides — which fields are sight's is `Visible`'s
  declaration; help's resolution order moves OFF a controller; the settings
  mirror moves OFF two controllers.
- **P6** persistence — nothing new persists; the renamed setting persists as
  it did.
- **P7** load on use — `WikiRegistry` / `WikiRenderer` are reached by
  `StuffApi.singleton` on first use; no boot entry, no search.
- **P8** names — `TooltipDoc` (the requirements' word); `spoiler.appetite`
  (the slate's word, no subsystem prefix); `components/doc`.
- American English throughout (`color`, `behavior`).
- **Gates:** `pnpm -C packages/server lint:family` (in particular
  `lint:gates` — the new `FromModule` string; `lint:object-verbs`;
  `lint:imports`; `lint:module-scope`; `lint:perceived-surfaces`;
  `lint:view-keys` — unchanged views), root `pnpm lint` (export discipline on
  `api/wiki.ts`), and on the client: `noHexLiterals.test.ts`,
  `StatusBar.test.tsx` (one reader of `ghostPreview`),
  `CommandSheet.test.tsx`, `chromeComposition.test.tsx`, and the new
  `noNativeTitle.test.ts`.

---

## Waves

Each wave ends at one commit, `pnpm test:near` + the client vitest + the
lint family green. Stage files by name.

### W0 — Census, types, library ✅
> **Done (5e674a846).** floating-ui 2.1.9 (MIT, 61 KB unpacked). The census
> measured **104** once the three `<iframe title>` are recognized by their
> element and never counted, so the ratchet's floor is **0**, not 3.
> `TooltipDoc` gained `miss?: string` — the line said *instead of* content
> (*You can't see that now.*), so a miss is a document, not a special case.

- Add `@floating-ui/react-dom` (exact pin) to `packages/client/package.json`.
- `T/`: `TooltipDoc` family (D2); `WikiExcerptMessage` /
  `WikiExcerptResultEnvelope`; `MqlQueryResultEnvelope.dark?: true`;
  `StuffRefRecord.kind?: StuffKind` and `.path?: TaggedPath`. (Leave
  `TaggedPath.spoiler` for W2.) Rebuild types (`pnpm -r build` for the types
  package — a stale `dist` is a phantom error).
- `C/__tests__/noNativeTitle.test.ts` with the measured ceiling and the
  per-file census in its header.
- **Acceptance:** the gate is green at the ceiling and red when one `title=`
  is added (try it); client and server typecheck.
- **Commit:** `feat(tooltips): W0 — the document type, the positioner, the native-title census`

### W1 — The component, proven on card controls (D2, D8, D9) ✅
> **Done.** Added beside the planned modules: **`tooltip/Tip.tsx`** — `<Tip
> tip={doc}>child</Tip>` clones the child with `useTip`'s handlers merged
> over its own; it is what makes 104 sites a one-line change each (part of
> N7, not a new concept). The layer is mounted ONCE in `App.tsx` around
> whichever screen the connection phase picks (the start screen and
> character select have hover text too), not per frame. `useTip` already
> carries the long-press path (W6 wires the sites); the sheet draws when the
> stack's root was opened by touch. Unit-test lesson: React effects flush
> at the end of `act`, so a test must advance the open dwell and the lock
> dwell in two steps. Ceiling 104 → 97.

- `components/doc/blocks.tsx`, `components/doc/docs.ts` (`controlDoc`,
  `frameDoc`), `components/tooltip/{TooltipLayer,useFloat,useTip}.ts(x)`,
  `store/tooltipSlice.ts`; mount `TooltipLayer` once (desktop frame and
  `MobileFrame`).
- First consumers: `cards/Card.tsx`'s seven controls; `GutterStripe` (hover →
  `frameDoc`; its action popover and `TabStrip`'s `ConfirmPopover` onto
  `useFloat`).
- Unit tests (RTL, `components/tooltip/__tests__/`): opens after the delay;
  closes on leave before lock; locks at 400 ms and on Shift; nested child;
  breadcrumb; Esc closes one level; click outside closes all; focus opens;
  **a control's tooltip has no pin**; the layer renders no dock/minimize
  control; an open entry does not change when the slice's cache entry does;
  `ghostPreview` is still written by the hover and still has one reader.
- **Acceptance:** drive step 1 by hand; ceiling lowered by the sites removed.
- **Commit:** `feat(tooltips): W1 — one tooltip component; card controls and the gutter are its first consumers`

### W2 — Server: an honest describe (D3, D6) ✅
> **Done.** Grounding was half-wrong about `displayName`: the one-shot did
> NOT go through `projectFields`, so it sent the real name in the dark. The
> one-shot now names the subject with `describeFor(viewer)` — but ONLY the
> one-shot (`projectStuffInto(…, { dark })`); live subscriptions keep their
> viewer-blind read, because switching them moved their deltas and is a
> card-surface question, not this build's (left for the sweep's note). Reach
> is enforced in `handleQuery` by intersecting with `reachable` resolved for
> the viewer. `path` got a wake-matrix residual (static). `TaggedPath` →
> level 2 at the type, both producers, `Perceiver`'s zone id, and four test
> expectations. The `look`-in-the-dark record moves to the drive (W8): it
> needs a standing world. Seen once: `NavigationSources`' posture test
> failed in a 21-file concurrent run and passed alone and on rerun — timing,
> not this wave.

- `Stuff.stuffKind()`; `CardRegistry.subjectKindOf` deleted, its callers use
  the method. Root descriptors `kind`, `path` (`path` marked `sense:
  'vision'`).
- `SubscribableFieldDescriptor.sense`; `Visible`'s four fields marked.
- `MqlSubscriptionRegistry.handleQuery`: the dark gate + `dark` on the
  envelope. `DETAIL_FIELDS` gains `path`.
- `TaggedPath.spoiler: 2` at `T/`, `RouteController.ts:436`,
  `NavigationLogic.ts:1098`; grep `spoiler: 1` beside `TaggedPath` in tests.
- Unit tests beside the registry: lit + reachable → all seven fields; dark →
  `dark: true`, no `shortDescription`/`illustration`/`path`, `displayName`
  obscured; `reachable:#id` for a thing in another place → `[]`; a field list
  naming `kind` returns it (the silent-omit trap).
- ⚠ While here, run `look <thing>` in the dark place once and **record** what
  it prints (Risks 3). Do not change `look`.
- ⭐ Reach enforced server-side in `handleQuery` (one-shot only): a resolved
  subject outside the viewer's `reachable` set is dropped, whatever the
  query text (D3). Test: a bare `mql-query "#<id>"` for a thing in another
  place returns `[]`.
- **Acceptance:** those tests; `lint:family`.
- **Commit:** `feat(perception): W2 — a one-shot describe tells nothing sight would not; kind and path on the wire`

### W3 — Server: the glossary (D4, D7) ✅
> **Done.** `Sections.lead` became `WikiRegistry`'s private `leadOf` (over
> `Sections.list`): a new public static on a `lib/` class tripped
> `lint:lib-statics`, and its only caller is the registry. `renderFor` is
> gated to the verb's controllers; `excerptFor` and `renderFor` share one
> private `renderInContext`. The excerpt's fact is *updated <date>*
> (`source: wiki`), not *from the wiki* — the source line already says
> that. `HelpApi.resolveTopic` also resolves an exact topic id, so the
> gutter's `mixin.<Name>` lookup goes through `?word=` too.

- `Sections.lead`; `WikiRegistry.renderFor` (+ `WikiControllerBase.renderBody`
  forwards; `renderLoose` untouched); `WikiRegistry.excerptFor`;
  `S/mud/api/wiki.ts`; `S/backend/inbound/wiki.ts` + its line in
  `inboundHandlers`.
- `HelpApi.resolveTopic`; `HelpTopicController.showFallthrough` calls it;
  `HelpRoutes` accepts `?word=`.
- Unit tests: `excerptFor` at ceiling 1 / appetite 0 collapses a level-1
  spoiler, at appetite 1 leaves it open, deletes a level-2 span; equals the
  lead of `renderFor` on the whole body for the same reader; a page that
  opens on a heading; no page → `null`. `resolveTopic` order; existing help
  and wiki suites unchanged.
- **Acceptance:** tests; `lint:gates` accepts the new `FromModule`.
- **Commit:** `feat(wiki,help): W3 — a gated excerpt and one topic resolution for the glossary`

### W4 — Server: the appetite reaches the client (D5) ✅
> **Done.** The mirror lives on `Environment` (it owns settings):
> `clientMirroredSettings()` + a private push after every set / unset of a
> `client: true` entry. Resolved locally (`<key>.<factor>` own value → the
> base) rather than through `ShellApi`, to keep `lib/shell` out of an import
> cycle with `ShellLogic`. `SaxonbergClient.snapshotClientState` merges the
> mirror behind `MixinApi.isEnvironment` (a `typeof … === 'function'` probe
> tripped `lint:duck-typing`). The rename swept code, subsystem docs and live
> slates; retired plans keep the old key as history.

- Rename the setting (`Avatar.ts`, `WikiRenderer.ts` `APPETITE_SETTING`, the
  comment in `lib/material/Material.ts`, tests, and **grep
  `spoilerAppetite` across `packages/` and `docs/`** — B4).
- `SettingsSchemaEntry.client`; `Environment` push; `SaxonbergClient`
  snapshot; `shell.result` flagged; `pushResultDisplay` and `resultDisplay`
  removed end to end (server payload, `T/`, `C/store/index.ts:1518`, the wire
  harness if it reads it).
- Unit tests: set / unset a flagged setting pushes one `replace` on the
  client-state subscription; the snapshot carries both flagged keys; an
  unflagged setting pushes nothing; `shell.result` per-factor still resolves
  both answers.
- **Acceptance:** tests; a manual `settings set shell.result terminal` still
  takes effect without a reconnect.
- **Commit:** `refactor(settings): W4 — a setting declares that the client mirrors it; spoiler.appetite`

### W5 — Client: the three sources, the spoiler block, pin (D3–D7)
- `services/websocket.ts`: `query()` and `wikiExcerpt()` (request id →
  promise, the `resolveAffordances` pattern; add both message types to the
  outbound union).
- `services/tooltipSource.ts`: `thing` / `help` / `wiki` / `doc` sources,
  caches and TTLs (D3, D4), the miss lines. Delete `useSummary` and
  `summaries`; `SourcePopover` reads the help source.
- `docs.ts`: `thingDoc`, `helpDoc`, the term classifier. `SpoilerBlock` reads
  the appetite; `MmlRenderer`'s `Spoiler` and CharGen's veiled rows render
  through it (the `<spoiler level>` attribute is now honored).
- `Card.tsx` head → `DocHeader`; `InspectionBody` → `FactRows` +
  `SpoilerBlock` from `thingDoc`.
- Pin in the layer.
- Unit tests: `thingDoc` from a lit record, a dark record, an empty result;
  the path block collapsed at 0 and 1, open at 2 and 3; card and tooltip
  render identical header/facts/spoiler markup for one record; the thing
  cache serves a second hover inside the TTL without a second message and
  clears on a place change; pin sends `doc.pin` once and closes.
- **Acceptance:** drive steps 4, 5, 6, 8 by hand against a dev world.
- **Commit:** `feat(tooltips): W5 — live things, help and wiki terms, the one spoiler block, pin`

### W6 — Client: every identity link and chip; keyboard; touch (D8)
- `MmlRenderer` link and identity spans (a small component so the hook can
  run; focusable); `InspectionBody` `ItemChips`; `CardBodies` chips and
  rows; `NavigatorBody` ways (`wayDoc`) and addresses; `ui/EntityName`;
  `AffordanceRadial`; `MobilePlaySurface`.
- The bottom sheet path and the long-press routing.
- Unit tests: a link long press opens the sheet and not the row's menu; a row
  long press off a link still opens the line menu; a tap still opens
  `CommandSheet`; Tab reaches a link, Enter runs it, Esc closes; sheet push
  and back.
- **Acceptance:** drive steps 2, 3, 7, 9, 10 by hand; ceiling lowered.
- **Commit:** `feat(tooltips): W6 — every link and chip; focus and long press`

### W7 — The rest of the retrofit; the ratchet closes (D9)
- Every remaining site, player-facing then CMS/studio; `Icon` `<title>`
  removed; `Seal` prop renamed; `Figure.tsx:292`; `PressRoom.tsx:314`.
- Ceiling → 3, allowlist `<iframe title=` only.
- **Acceptance:** the gate at its floor; `pnpm --filter @saxonberg/client
  test` green; no `title` attribute in the DOM of the world view (asserted by
  the walk in W8).
- **Commit:** `refactor(client): W7 — no native hover text; the title ratchet closes at the three iframes`

### W8 — Drive, docs, MR
- `packages/wire/tests/tooltips.wire.test.ts` and
  `e2e/tests/tooltips-walk.spec.ts` (§ Test & gate strategy); make each
  checkpoint fail once on purpose (B2).
- `docs/subsystems/tooltips.md` (new); the sections this build changes in
  `client-shell.md`, `card-surface.md`, `wiki.md`, `help.md`,
  `mql-subscription.md`, `shell-environment.md`, `perception.md`. **Leave the
  `CLAUDE.md` index line to the sweep.**
- Full `pnpm test` once, at code-complete; open the MR; append the Drive
  record below.
- **Commit:** `test(tooltips): W8 — the wire checks, the browser walk, the subsystem doc`

---

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| describe a live thing | none new — the click is still `look`; the read is `mql-query` (registered: `inbound/index.ts:58`) | every anchor with a `stuffId` spreads `useTip({ kind: 'thing' })` | `kind` · `path` on `Stuff`; `sense` on `Visible` | live objects by id; nothing to load | ⚠ a field name with no descriptor is **silently omitted** — W2's test names every one of the seven |
| wiki term | `wiki <handle>` (exists) is the pin | any `mudcmd:wiki …` link, in the scrollback or in a tooltip | the page rows | `WikiRegistry` on first use, by `TemplatePaths.wikiRegistry` | ⚠ an unregistered inbound type is **dropped silently** — the wire test sends one; the `FromModule` string is checked by `lint:gates` |
| help term | `help <word>` (exists) is the pin | any `mudcmd:help …` link; a topic's `relations`; the inspection gutter | the help catalogue | already stood by `HelpApi.needs` | `?word=` vs `?id=` — both tested |
| the appetite | `settings set spoiler.appetite <0-3>` (exists) | — | the schema entry | the client-state snapshot at session entry | ⚠ an entry without `client: true` **never reaches the client** — W4's snapshot test |
| control tooltip | the control's own command | `useTip(controlDoc(…))` at every former `title=` | client-held | — | the ratchet: a control left on `title=` fails the gate |

---

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| anything with hover text shows a tooltip, never native text | W1, W6, W7 (gate N19; walk step 1) |
| every identity link and chip has a tooltip; the click is unchanged | W5, W6 |
| nests, locks, breadcrumb, Esc one level, pin by command; no pin without a command; never docked or minimized | W1, W5 |
| a tooltip never changes while open | W1 (frozen entry), W5 |
| a thing's tooltip and card show the same header, facts, spoiler block | W5 (D2, D2a) |
| a new help topic or wiki page gives its term a tooltip with no code | W3, W5 (the term classifier) |
| a live thing's tooltip never says more than the viewer perceives now | W2, W5 — as the client asks; see Risks 2 |
| a wiki tooltip shows exactly what reading the page would | W3 |
| a path is collapsed at 0–1 and open at 2+; one appetite setting | W2 (level 2), W4 (rename + mirror), W5 (`SpoilerBlock`) |
| a phone reaches every tooltip by long press, keeping tap and the row menu | W6 |
| hovering still previews the command in the status bar | W1 onward (the two existing guards stay green) |

Nothing unmapped. One criterion is met with a caveat the owner should read:
Risks 1 (drive step 5's numbers).

---

## Test & gate strategy

- **Unit (vitest):** listed per wave. Client tests sit in `__tests__`
  beside the component; server tests beside the registry / renderer / Api and
  import `test-bootstrap` where they touch the wired runtime.
- **Only the drive can prove:** real hover timing against real layout, the
  sheet on a touch viewport, that no `title` attribute survives in the
  rendered DOM, and the dark place.
- **Gates:** § Convention conformance.
- **Pace — every step is `instant`; all eleven are the BLOCKING drive; there
  is no soak drive.** No span step, so no staged twin is owed.

| step | pace | tier | where |
|---|---|---|---|
| 1 control tooltip, no native text | instant | render | walk |
| 2 scrollback thing link; status bar still previews; click opens the card | instant | render | walk |
| 3 chip in "Here" | instant | render | walk (two sessions pinned to Dave's Bar, the `multiplayer.spec.ts` way) |
| 4 nested help term, Shift lock, breadcrumb, Esc ×2 | instant | render | walk — open a help term whose topic has `relations` (pick one by `GET /api/help/topic`) |
| 5 wiki term at two appetites; over-ceiling absent | instant | render | walk — founder session writes a uniquely named page whose lead holds a `<spoiler level="1">` span and a level-3 span; **run as: collapsed at appetite 0, open at 1 and at 3; the level-3 span absent** (Risks 1) |
| 6 path collapsed at 1, one click, open at 2 | instant | render | walk |
| 7 dark place; a thing that has left | instant | render | walk — carry a thing whose link is in the scrollback into the Seznick bedroom and drop it (dark); walk out (gone) |
| 8 pin opens the card, command in scrollback, header and facts match; a control has no pin | instant | render | walk |
| 9 Tab to a link; Esc | instant | render | walk |
| 10 phone width + touch: tap → sheet; long press → tooltip sheet, push, back; row long press → line menu | instant | render | walk (`hasTouch`, a phone viewport) |
| 11 describe and excerpt gating on the wire | instant · staged | wire | `tooltips.wire.test.ts` |

- **The wire file** (`harness` `query()` plus a raw send for
  `wiki-excerpt`): (a) lit, reachable → seven fields; (b) the same thing in
  the dark place → `dark`, sight fields absent; (c) `reachable:#id` after
  walking away → `[]`; (d) excerpt vs `wiki <page>` prose for the same reader
  at appetite 0 and 1 — the same spoiler wrapping; (e) the level-3 span
  absent from both; (f) an unknown page → `doc: null`. It writes a wiki page:
  if it cannot remove what it wrote, it is named
  `tooltips.dirty.wire.test.ts` with a `DIRTY_REASON` — decide at build time
  and say which in the Drive record.
- `pnpm test` runs **once, at code-complete (W8)**, and again at `/finalize`.
  Between: `pnpm test:near`, the client vitest, the lint family.
- Use this worktree's own `WIRE_PORT` and Mongo database (`docs/testing.md`);
  do not start `dev:server` on 2010 while a sibling drives.

---

## Risks & opens

1. ~~The requirements' appetite numbers~~ — **closed: the requirements were
   corrected** (appetite defaults to 0 for everyone; 0/1 were the wiki's
   ceiling). Drive step 5 runs *collapsed at 0, open at 1+*; the default
   stays 0.
2. ~~The tooltip's honesty about reach is the client's query~~ — **closed in
   review of the draft: the server enforces reach on the one-shot (D3).**
   Live subscriptions keep today's scoping (cards rely on it) — Deferred
   seams.
3. **Live cards are not light-gated.** A subject card keeps its description
   in the dark; the tooltip will be more honest than the card until the
   deferred seam lands. W2 records what `look <thing>` prints in the dark.
4. **The retrofit is 104 sites, 38 of them in the CMS and studio** — the
   requirements said about forty. All are in scope by the requirements'
   wording; each is a one-line `controlDoc`. Say now if the CMS should wait.
5. **`TaggedPath` moves from level 1 to 2** — it rewrites navigation-server
   D6. No client reads the level yet, so nothing visible changes.
6. ~~Focusable scrollback links~~ — **closed: roving focus (D8)**, one tab
   stop for the scrollback.
7. **`WikiApi` has one static.** P1 warns about exactly this. It exists
   because the backend may only call an Api and the wiki has none; the logic
   is on the registry. If the owner prefers, the handler could call the
   registry directly — a rule exception, not taken here.
8. **The link grammar is drawn inside tooltips only.** Restyling every
   scrollback link is a change to the terminal's look nobody asked for.
9. **A locked stack closes when the pointer leaves it** (300 ms grace) as
   well as on Esc and a click outside. The requirements name the last two;
   without the first, every 600 ms hover leaves a tooltip behind.
10. **Hot files.** `T/` (`packages/types/src/index.ts`) and
    `C/store/index.ts` are edited by sibling builds (aether-devices adds a
    status-bar row; whichever merges second gives it a `controlDoc`). Merge
    master in before W8.
11. **The library's exact version, license and size are verified at W0**, not
    asserted here.
12. **A wiki excerpt is cached five minutes per (page, appetite)**; an edit
    shows on the next fetch. A tooltip is a snapshot, so this is within the
    contract.
13. **Stop and ask** if: the license is not MIT; `renderFor` cannot be moved
    without widening `RenderCallers`; removing `resultDisplay` breaks a
    reader outside the files named; the dark place cannot be reached by a
    test character.

---

## Deferred seams

- **Live projections honor `sense`** (a card loses sight's fields when its
  subject goes dark, and regains them): needs light changes to wake the MQL
  source. The attach point is the descriptor's `sense` key, already read by
  the one-shot. Leaves as a section appended to
  [spoiler-slate](../slates/platform/spoiler-slate.md) at the sweep
  (*perception on the projection seam*) — together with **live
  subscriptions honoring reach** (today a subscription keeps describing a
  subject after you leave; cards rely on it, so it is a card-surface
  decision, not this build's).
- **Fact sources `walked` / `told`, breakdowns, action buttons, map glyphs,
  one block per mixin** — the navigation build; `TooltipDoc` and
  `TooltipSource` are the attach points (already in
  [navigation-requirements](../requirements/navigation-requirements.md)).
- **A reader-preferences mixin** to take `spoiler.appetite` off `Avatar` —
  the comment at `Avatar.ts:608` already records it.
- **The link grammar in the scrollback** — a
  [message-rendering-slate](../slates/client/message-rendering-slate.md)
  question.

---

## Critical files

Read first, in this order:

1. `docs/requirements/tooltips-requirements.md`, this plan.
2. `packages/client/src/components/MmlRenderer.tsx` ·
   `components/cards/InspectionBody.tsx` · `components/cards/Card.tsx` ·
   `components/GutterStripe.tsx` · `components/social/useLongPress.ts` ·
   `components/frame/CommandSheet.tsx` · `components/frame/StatusBar.tsx` (+
   its test) · `components/Terminal.tsx` · `services/websocket.ts` ·
   `store/index.ts` (:411-445, :1518) · `store/affordanceSlice.ts` (the slice
   shape) · `lib/style/__tests__/noHexLiterals.test.ts`.
3. `packages/types/src/index.ts` (:1348 `TaggedPath`, :1712 `StuffKind`,
   :1939 `MqlQueryMessage`, :2105 `StuffRefRecord`, :2327
   `MqlQueryResultEnvelope`, :5625 `HelpTopic`).
4. `packages/server/src/mud/platform/idea/MqlSubscriptionRegistry.ts` (:664)
   · `mud/api/subscription.ts` (:143-190, :355) ·
   `mud/lib/description/Visible.ts` (:204) · `mud/lib/stuff/Stuff.ts` (:213)
   · `mud/api/perception.ts` (:740) · `mud/platform/idea/CardRegistry.ts`
   (:278).
5. `mud/platform/idea/WikiRenderer.ts` (:93-200, :296, :834) ·
   `mud/platform/idea/WikiRegistry.ts` ·
   `mud/platform/idea/cmd/system/WikiControllerBase.ts` (:136-184) ·
   `mud/lib/wiki/Section.ts` · `mud/api/help.ts` ·
   `mud/platform/idea/cmd/system/HelpTopicController.ts` ·
   `backend/HelpRoutes.ts` · `backend/inbound/{index,affordance,mql}.ts` ·
   `mud/api/record.ts` (:176).
6. `mud/lib/shell/Environment.ts` (:70-100, :470) ·
   `mud/platform/idea/cmd/shell/SettingsControllerBase.ts` ·
   `mud/lib/connection/SaxonbergClient.ts` (:952) ·
   `mud/lib/character/Avatar.ts` (:608-640, :1151).
7. `docs/subsystems/{wiki,help,subscription,mql-subscription,card-surface,client-shell}.md`,
   `docs/testing.md`, `e2e/README.md`,
   `packages/wire/tests/avatar-family.dirty.wire.test.ts` (:215),
   `e2e/tests/navigation-server-walk.spec.ts` (a recent walk).

---

## Drive record

*(appended at build time)*
