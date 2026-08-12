# Honest chrome — implementation plan

Build B of three in client-rebuild Wave 1. Read
`docs/requirements/honest-chrome-requirements.md` in full first — this plan is
*how*, not *what*, and does not restate its decisions. Three were settled with
the user explicitly and are closed: **nine shelf rows**, **`MAKE` hatched on
level grounds**, **the top bar is a full rebuild**. A fourth was closed during
planning: **the read-only indicator is cut** — do not design a substitute.

Also read `CLAUDE.md` §§ Worktrees, Module Categories, Export discipline, Go
Through the API Layer, Instanceable lives in `obj/`; and
`docs/subsystems/client-shell.md` (§ The honest-state primitives),
`cockpit.md`, `mql-subscription.md`, `inspection-pane.md`,
`message-rendering.md` § The custom-property colour layer.

Design surface (reference art, not diffable): `Global Chrome.dc.html`,
`CONVENTIONS.md`, `Unbuilt States.dc.html`.

**Build A shipped the primitives with no consumer. B is the consumer.** After
this build the desktop chrome is real: a rebuilt top bar, a nine-row shelf that
is honest about six of its rows, a status bar that makes "the command line is
never silent" true, and one server pane feeding the whole thing.

---

## Grounding (facts established by investigation — do not re-verify)

### The server side of the shelf

**The pane catalogue widening is a type change, not a plumbing change.**
`packages/server/src/mud/lib/connection/Panes.ts:47` declares
`readonly fields: 'ref' | 'detail'`, and `MqlSubscriptionRegistry.ts:325` reads
it as `resolveFieldSet(pane ? pane.fields : req.fields)`.
`resolveFieldSet` (`api/mql-subscription.ts:128-135`) **already accepts a
`FieldSet` (`readonly string[]`) and returns it unchanged**. So widening
`PaneDefinition.fields` to `FieldSet | FieldAlias` and giving the `self` entry
an explicit list requires **no change to the subscribe path at all**. The
import is `import type { FieldAlias, FieldSet } from '../../api/mql-subscription'`
— type-only, therefore erased, therefore no cycle. `lib/spatial/Container.ts:51`
already imports `REF_FIELDS` from that module at *runtime*, so the direction is
established precedent.

**Neither alias carries standing.** Confirmed verbatim at
`api/mql-subscription.ts:107-125`:
`REF_FIELDS = ['displayName','quantity','primaryKeyword']`; `DETAIL_FIELDS`
adds `shortDescription, longDescription, illustration, details, bulkMaterial,
mass, contents, exits`. Both are object-description sets.

**The vocabulary lives in two places and they are asserted equal.**
`packages/types/src/index.ts:828` — `export type PaneId = "inspect" | "location"`;
`:831` — `export const PANE_IDS: readonly PaneId[]`.
`api/__tests__/pane-catalogue.test.ts:86` asserts
`Object.keys(PANES).sort() === [...PANE_IDS].sort()`, plus non-empty
`query`/`label` for every id. Adding `self` therefore touches **three** places
and the test catches any two-of-three.

**`me` is a real MQL seed.** `api/mql/types.ts:281` —
`PronounName = 'me' | 'here' | 'it' | 'them' | 'him' | 'her'`;
`resolver.ts:718-722` documents `me` and `here` as pronoun seeds deliberately
kept out of `NAMED_SEED_KEYWORDS` (they are fixed-pool seeds, resolved as
seeds, not mid-chain filters). `location`'s pane already proves the pattern
with `here`.

### `Avatar`'s live self-figures — five, not three, from three declaration sites

`subscribableFields` is collected **up the prototype chain**
(`collectSubscribableFields`, `api/mql-subscription.ts:140`), so the concrete
class's own static is only part of the story. `Avatar` composes
`ShelledCharacter → Character → AdvancementMixin` and `LoadBearingMixin`.

| Field | Declared at | `read` returns | Wire shape after `JSON.stringify` |
|---|---|---|---|
| `playStanding` | `obj/Avatar.ts:303` | `{ band: Band }` — a **class instance** | `{ band: { name: "nascent" } }` |
| `makeStanding` | `obj/Avatar.ts:323` | `{ band: Band }` | `{ band: { name: "…" } }` |
| `renown` | `obj/Avatar.ts:331` | `{ value: number }` | `{ value: 0 }` |
| `practisingCompetence` | `lib/advancement/Advancement.ts:110` | `{ discipline: string, band: CompetenceBandName }`, or `null`, or `undefined` | `{ discipline: "metalwork", band: "…" }` |
| `competenceDigest` | `lib/advancement/Advancement.ts:120` | `{ disciplines: [...] }` | — |
| `borneBurden` / `carryCapacity` / `loadRatio` | `lib/encumbrance/LoadBearing.ts:184` | — | **out of scope** (requirements § Surface decisions) |

⚠ **Three shapes, one of which is an accident.** `Band`
(`lib/standing/Band.ts:46`) is a value class whose only public member is
`readonly name: BandName`, so `JSON.stringify` emits `{name: "…"}` — a shape
nobody designed and no test asserts as a wire contract. `practisingCompetence`
already returns its band as a **plain string** (`CompetenceBandName`,
`api/advancement.ts:51`). See **D3**.

**All four live figures re-resolve, and their producers already poke.**
The standing descriptors declare `durableKey`, not `changes` — a deliberate
correction recorded at `Avatar.ts:289-299` (a `changes` source indexes under
`null` and never fires). The pokes exist:
`obj/api/ConsumerLogic.ts:131` (play), `ProducerLogic.ts:120` (make),
`RenownLogic.ts:92` (renown), `AdvancementLogic.ts:136,165` (competence) all
call `MqlSubscriptionApi.notifyDurableSubject`. So a live shelf figure will
actually move without a reconnect. ⚠ The one link not verified is whether the
registry's durable index is keyed off *the subscription's field list* — see
**F1**.

**Self-only is enforced at the descriptor.** `Avatar.ts:114` —
`standingSubject` returns `undefined` unless `viewer.stuffId === stuff.stuffId`;
`Advancement.ts` uses the parallel `competenceSubject`. `projectFields`
(`api/mql-subscription.ts:284-312`) **omits** any field whose `read` returns
`undefined`. The self pane needs no permission logic of its own.

### The cockpit verb

`cockpit` is one host verb with five subcommands, each declaring its own
`controller:` (`cmd/shell/cockpit.yaml`). Subcommands are **one level deep
framework-wide**; anything deeper rides positional slots and dispatches inside
the controller (`StyleController.ts:62-78` states the rule; `styleSub`/`a`/`b`/`c`).

The closest exemplar for `shelf` is **`cockpit pane`**, not `style`: same
`list` / verb / `<id>` shape, two positional slots (`action`, `paneId`,
`cockpit.yaml:187-193`), an unknown-action refusal naming the known set
(`CockpitPaneController.ts:56-62`), and `MessageApi.scene(...).topic('shell.control')
.tags(['control:pane']).toSelf(...)` for output. Its cost is exactly four
artifacts: a YAML `subcommands:` block, a controller in
`obj/command/shell/`, a two-line seed
(`seeds/obj/command/shell/CockpitPaneController.yaml` is literally
`class: …` + `data: {}`), and a `clientStateSchema` entry.

**The clientState keyspace is a schema list on a mixin, not a new module.**
`lib/connection/HasInteractive.ts` declares every `cockpit.*` key inline with a
`defaultValue`, a prose `description`, an optional `transient: true` and a
`validator` (`cockpit.layout` :274, `cockpit.mode` :288, `cockpit.arrangements`
:311, `cockpit.savedArrangements` :335, `cockpit.inputModes` :387,
`cockpit.watch` :415). `cockpit.shelf` joins that list. Vocabulary constants are
imported from `@saxonberg/types` (`LAYOUT_NAMES`, `COCKPIT_MODES` already are).

⚠ **`api/__tests__/cockpit-verb.test.ts:80` asserts the subcommand list
exactly** — `expect(cockpit!.getSubcommandNames().sort()).toEqual(['cli',
'layout','mode','pane','style'])` — and asserts each subcommand's controller
path, and binds each one through the real parser. **Adding `shelf` requires
editing this test.** It is a *cockpit-verb* test, not one of the three
reconnect-machine tests the requirements freeze; see **F3**.

### The client as it stands

| Fact | Detail |
|---|---|
| `Frame` | `components/frame/Frame.tsx`, 95 lines: a flex row of `ConnectionIndicator` · `AccountMenu` · `ViewsMenu` (conditional) · `Spacer` · Settings button. Rendered **once**, in `App.tsx:621`, above the layout registry — so it is already "every mode" |
| `ConnectionIndicator` | Returns `null` when `link === 'connected'`; amber `Reconnecting…` / red `Disconnected` otherwise. **56 lines, no props, store-driven** |
| `AccountMenu` | The identity chip (`Portrait` + name + guest tag + `▾`) *and* its dropdown, one component. Renders `null` with no `auth.player` |
| `ConnectionState` | `@saxonberg/types:2594` — `{ link, isConnected, socketId, sessionId, error }`. **Five fields, all required** |
| `store.setConnected` | `store/index.ts:1204` — builds a **complete** `connection` object literal (:1224) |
| `store.setDisconnected` | `:1266` — likewise (:1277) |
| `GhostCommandLine` | `components/GhostCommandLine.tsx`, 73 lines. **One store consumer** (`ghostPreview` + `ghostFlash`), **two render sites**: `App.tsx:652` (bottom of `AppContainer`, i.e. already a global footer strip *below* the content row) and `CharGenStage.tsx:918` |
| Preview plumbing | `App.tsx:496` `handleCommandPreview` (with a one-tick deferred restore so a leave→enter sweep doesn't flicker) and `:516` `handleCommandClick` (sends, then `flashGhost('› …')`). Passed down as `onCommandPreview` / `onCommandClick` |
| Subscription call sites | Exactly two, both in `InspectionPane.tsx:432-433`: `subscribeMql({ pane: 'inspect' })` / `{ pane: 'location' }`, handlers registered in the same `useEffect`, torn down on unmount. **Nothing reads a standing field** |
| Reconnect-aware subscribe | `services/websocket.ts:615` holds the spec and re-issues on every `connection-established`; `:633` `unsubscribe` removes the bookkeeping. Guarded by `websocket.test.ts:337-485` |
| Single-cardinality deltas | `InspectionPane.tsx:500-535` documents the trap: a `one` subscription's slot replacement arrives as a single `replace` keyed by the **new** stuffId; the generic `applyChanges` appends a second record instead of replacing |
| clientState mirror | `websocket.ts:487` handles `client-state-update` → `setLocalClientState`; `App.tsx:260` reads `clientState['cockpit.layout']`. Same pattern for `cockpit.shelf` |
| `Figure` | `components/ui/Figure.tsx`, 200 lines. Required discriminated `figure` prop; `card`-shaped: `Label` div, `Value` div, `Band`/`HatchBand`, `Reason` div. Emits `role="group"`, an `aria-label` carrying the reason in words, and **`data-figure-state`** |
| `tokens` | `components/ui/tokens.ts` — **no `fgDim` key**, though `fg-dim` is a `GROUND_ROLE` defined by all three themes and already classified as a floor-clearing `TEXT_ROLE` in `contrast.test.ts:71-89`. Adding `tokens.color.fgDim = SX['fg-dim']` needs no new role and passes all four guards unchanged |
| Guards | `noHexLiterals` (bans hex + `rgb(`/`hsl(` without a `var(` arg + bare named colours, outside `themes/`), `customProperties`, `contrast` (over `GROUND_ROLES`, with a totality gate), `oneColourSource` (every `tokens.color.*` / `tokens.palette.*` / `tokens.brand.*` value must match `var(--sx-<role>)`) |
| Client typecheck | `packages/client/tsconfig.json` — `"include": ["src/**/*"]`, so **tests are typechecked** by `build:types`. `packages/types` is `composite: true` but its `package.json` `main`/`types` point at `src/index.ts` |
| e2e | `e2e/tests/*.spec.ts`, helpers `openWorldAs` / `runCommand` / `commandInput`; `theme.spec.ts` is the freshest exemplar. Not in `pnpm test` |

### ⚠ The three constraints that shape the client work

**1. `connectionLink.test.ts` typechecks a whole `ConnectionState` literal.**
`store/__tests__/connectionLink.test.ts:11-20` does
`useStore.setState({ connection: { link, isConnected, socketId, sessionId, error } })`
with no other keys. Because the client's `tsc` includes `src/**/*`, **any
required new field on `ConnectionState` breaks this frozen test's typecheck** —
it would pass `vitest` (esbuild strips types) and fail `build:types`, which is
the worst possible failure shape. See **D5**.

**2. `ConnectionIndicator.test.tsx` pins "silent when connected".**
`components/__tests__/ConnectionIndicator.test.tsx:13-17` renders the component
in isolation and asserts `container.firstChild === null`. **The bar's
always-visible connection chip therefore cannot be `ConnectionIndicator`
grown.** See **D6**.

**3. jsdom does not substitute `var()`** (measured in Build A, recorded in
`message-rendering.md`). Every assertion about a *resolved* colour is e2e-only.
Unit tests assert `data-figure-state`, text, `aria-label` and dispatched
commands — never a computed colour.

### The read-only indicator: confirmed unimplementable, and cut

Recorded here so the investigation is not repeated. The only read-only
principal is the livestream broadcast feed;
`docs/subsystems/livestream.md:48` — the broadcast connection *"has no
`Interactive` at all"*, is registered straight with `BroadcastFeed` as a pure
push target, and is absent from the connection registry. It never receives
`connection-established`, so **no flag on that payload could reach it**.
`grep -rn "broadcast\|stream-state" packages/client/src` returns **nothing** —
the React client has no concept of the feed and does not even handle the
`stream-state` envelope. `.env.example:7` refers to *"the overlay's
`VITE_BROADCAST_TOKEN`"*, an overlay client that does not exist in this repo.
The requirements now record this as a non-goal. **Do not build a substitute.**

---

## Decisions

### D1 — The `self` pane carries only what the shelf renders — and `makeStanding` is not on it

```ts
// lib/connection/Panes.ts
self: {
  label: 'your own figures',
  query: 'me',
  cardinality: 'one',
  fields: ['playStanding', 'renown', 'practisingCompetence'],
},
```

No dependency flags: these figures wake through `durableKey` pokes, not through
focus or location, and declaring a flag that nothing needs is the inverse of
the `HOLD_WAKES_ON` lesson.

⭐ **`makeStanding` is deliberately absent from the field list.** The
requirements' sharpest decision is that a figure whose *level* is wrong cannot
be rendered. The strongest form of that is not "receive it and decline to
render it" — it is **never putting it on the wire**, so the number is not
sitting in the client store waiting for the next builder to find it and wire up
the "missing" row in one line. `MAKE`'s hatch becomes structural rather than a
matter of client discipline. The alternative (request it, refuse to render)
loses precisely because it makes the wrong thing easy.

### D2 — The shelf's *ids* are shared vocabulary; its *honesty copy* is client-side

`ShelfRowId` + `SHELF_ROW_IDS` + `DEFAULT_SHELF` go in
`packages/types/src/index.ts`, immediately beside `PaneId` / `PANE_IDS` and
shaped exactly like them: the server validates against the list, the client
picks from it. `packages/types` is outside `src/mud/`, so no module category is
invented and **no new server module is created** — which the constraints
forbid without sign-off.

The *catalogue* — label, description, live-or-hatched, and the hatch reason —
stays **client-side**, in `components/frame/Shelf.tsx`. This is not laziness,
it is the correct owner: **hatched-ness is a property of the client's wiring,
not of the server's capability.** The server cannot know that the client
declined to render `COIN`; only the client knows which of the fields it
receives it actually paints. Putting the reasons server-side would require the
server to model the client's build state, which is a second source of truth for
something only one side observes.

The consequence is **D8**: `cockpit shelf list` reports pinned-ness, not
honesty state.

### D3 — Normalize the two influence descriptors to a plain band name

`Avatar.ts` — two one-line edits:

```ts
return { band: InfluenceApi.bandOf(key, 'consumer').name };            // playStanding
return { band: InfluenceApi.standingForHost(stuff, 'producer').band.name }; // makeStanding
```

Three reasons, in order of weight:

1. **Uniformity across the live rows.** `practisingCompetence` already puts its
   band on the wire as a plain string. Two of the three shapes agree; the
   influence pair is the outlier.
2. **The client must not depend on a value-object's incidental JSON shape.**
   `{ band: { name } }` is what `JSON.stringify` happens to do to a class whose
   one public member is `name`. Nothing designed it, no test asserts it as a
   wire contract, and `Band` has a `toString()` that someone will "helpfully"
   reach for later.
3. **A freshly-minted class instance on every re-resolve is a diffing hazard.**
   `bandOf` returns `new Band(...)` per call, so an identity-based field
   comparison in the subscription differ would report a change on every
   re-resolve. A string cannot. ⚠ Unverified — see **F2**; the normalization
   makes the question moot either way, which is itself an argument for doing it.

Cost: two assertion edits in
`obj/__tests__/Avatar.standing-split.test.ts:116-124` (`viaField.band.name` →
`viaField.band`). That file is **not** in the frozen set, and the edited
assertion is exactly as strong. `Avatar.standing.test.ts`'s
`typeof out[f] === 'object'` still holds (`{band: 'nascent'}` is an object) and
its `/trait|disposition|personality/` name guard is untouched.

⚠ The alternative — client reads `rec.playStanding?.band?.name` — is a real
option and is one edit smaller. It loses on all three counts above. **This is
flagged (F5) rather than assumed.**

### D4 — Wire-to-`FigureState`, per row, with the ambiguous zero going to `empty`

The client declares the record shape it expects and one mapping per live row.

```ts
// packages/types — the wire contract, made explicit
export interface SelfFigureRecord {
  stuffId: string;
  playStanding?: { band: string };
  renown?: { value: number };
  practisingCompetence?: { discipline: string; band: string } | null;
}
```

| Row | Wire | `FigureState` |
|---|---|---|
| `PLAY` | `{ band: 'dormant' }` | `live`, value `dormant` — a band floor is a real derivation, not an absence |
| `PLAY` | key absent | `empty`, reason *not resolved for this session* |
| `RENOWN` | `{ value: n }`, `n !== 0` | `live`, value `String(n)` |
| ⭐ `RENOWN` | `{ value: 0 }` | **`empty`**, reason *no renown recorded yet* |
| `SKILL` | `{ discipline, band }` | `live`, value `` `${discipline} · ${band}` `` |
| `SKILL` | `null` | `empty`, reason *nothing being practised* |
| `SKILL` | key absent | `empty`, reason *the transcript fold has not landed yet* |

⭐ **Why `renown: 0` is `empty` and not `live`.** `RenownApi.renownOf`
*"returns the neutral 0 for a non-materialized scope"* (`api/renown.ts:107`) —
so on the wire, "measured and found neutral" and "never materialized" are the
**same bytes**. `CONVENTIONS.md` #1 defines `empty` as exactly this case: *"a
real zero — `—` plus a reason"*. Printing `0` as a live figure would assert a
measurement the payload cannot distinguish from its own absence, which is the
convention's own failure mode one level down from a fake.

⚠ **Consequence, and it is visible:** on a fresh character the shelf reads
`PLAY dormant` · `RENOWN —` · `SKILL —` · six `╌╌`. That is the honest picture
and it is what a demo screenshot will show. Flagged (**F11**) because it is a
judgement call about the product's first impression, not a technical one.

### D5 — `connectedAt` is an **optional** field on `ConnectionState`, and the popover says "this connection"

```ts
export interface ConnectionState {
  link: "connected" | "reconnecting" | "dropped";
  isConnected: boolean;
  socketId: string | null;
  sessionId: string | null;
  error: string | null;
  /** Epoch ms this socket was established. Absent before the first
   *  connection and after a drop — there is no duration to report. */
  connectedAt?: number;
}
```

`setConnected` adds `connectedAt: Date.now()` to its literal; `setDisconnected`
omits it (its literal is complete, so the key simply disappears).

**Optional, not required, and the optionality is load-bearing**: it is what
keeps `connectionLink.test.ts:11-20` compiling **unmodified** under
`build:types`. It is also honest — before the first connection there is no
timestamp, and a `0` or `null` sentinel would be a value standing in for an
absence.

**Rejected: a sibling store field outside `connection`.** It would also
typecheck, but it splits one concept across two slices, and Build C needs the
same value on mobile. The optional field says what it is and lives where it
belongs.

⭐ **The popover row is labelled "this connection", not "session".** A
successful reconnect issues a fresh `connection-established`, so the timestamp
resets — and rather than papering over that with a fake continuous session
clock, the label names what is actually measured. This is the same move as
hatching `MAKE`: the honest fix for a figure at the wrong level is to correct
the claim, not the number.

The ticking is a `useEffect` interval **inside the popover, only while open** —
never a global 1 Hz re-render of the bar.

### D6 — `ConnectionIndicator` is preserved and **composed**, not grown

`ConnectionChip` (new, `components/frame/ConnectionChip.tsx`) is the bar's
always-visible connection surface: a dot, a label, a detail, and the popover.
Its unhealthy vocabulary is **delegated**:

```tsx
{link === 'connected'
  ? <><Dot $tone="good" /><span>connected</span></>
  : <ConnectionIndicator />}
```

- `ConnectionIndicator.tsx` is **not touched**, so
  `ConnectionIndicator.test.tsx` passes unmodified — the requirements' bounding
  constraint, satisfied by construction rather than by care.
- There is exactly **one** rendering of "Reconnecting…" / "Disconnected" in the
  tree; the chip owns the healthy state only, so the two cannot disagree.
- No dot is drawn twice: the chip's own dot renders only in the connected
  branch; `ConnectionIndicator` brings its own in the other.

The rest of the reconnect machine — `ConnectionState`, `setDisconnected`, the
link vocabulary, backoff, `ReconnectBanner` — is **presentation-only** work.
If a reconnect test needs to change, that is the signal that behaviour moved.

### D7 — `Figure` gains a `variant`; the union is untouched

```ts
export interface FigureProps {
  label: string;
  figure: FigureState;
  fill?: number;
  /** `card` (default) — the Build A block. `chip` — a 30px horizontal
   *  shelf entry. `row` — full-width label-left / value-right. */
  variant?: 'card' | 'chip' | 'row';
  className?: string;
}
```

- `card` stays the default, so **`Figure.test.tsx` passes unmodified**,
  including its `@ts-expect-error` compiler assertions.
- `chip` is the shelf entry: label and value on one 30px line, the band
  suppressed, and the reason carried by `title` + the existing `aria-label`
  (which already says *"not wired — <reason>"* in words).
- `row` is the connection popover: label left, value right, reason visible
  beneath.

**Why a variant and not a second component or a `styled(Figure)` override.** A
second component reopens the `<span>{n}</span>` hole the union was shaped to
close — the constraint is *no shelf row may print a value outside `Figure`*,
and the moment there are two ways to render a figure there are three. A
`styled(Figure)` override with descendant selectors would put the primitive's
internal DOM shape in the consumer's hands, so a refactor of `Figure` silently
breaks the shelf's layout with no type error. A variant enum keeps every
rendering decision inside the one module that owns the convention.

⚠ Modifying a Build A primitive is a deliberate act, flagged as **F10**.

### D8 — `cockpit shelf` mirrors `cockpit pane`, and reports pinned-ness

```
cockpit shelf list            what is on the shelf, and what is not
cockpit shelf pin <row>       add it, at the end
cockpit shelf unpin <row>     take it off
```

Two positional slots (`action`, `row`), dispatched in the controller, unknown
action and unknown row each refused in the machine voice naming the known set —
the `cockpit style theme default` precedent, implemented the way
`CockpitPaneController.ts:56-62` implements it.

`list` prints each of the nine rows as `pinned` / `—`, **not** live/hatched:
per **D2** the server does not know which rows the client painted, and a verb
that printed a guess would be exactly the kind of confident wrong answer this
build exists to eliminate. ⚠ The AC's word "state" is ambiguous — see **F8**.

`CockpitController`'s bare report gains one line, `shelf   <n> of 9 pinned`,
because that report's whole claim is that it answers "how is my cockpit set up
right now" in one view.

### D9 — `cockpit.shelf` defaults to **all nine rows**

```
key:          cockpit.shelf
defaultValue: DEFAULT_SHELF        // all nine, in catalogue order
validator:    an array of strings, every entry in SHELF_ROW_IDS, no duplicates
transient:    no — a preference, like cockpit.layout
```

**Why all nine and not the art's five** (`['play','renown','status','clock',
'online']`). Two reasons. The AC says *"the shelf renders nine rows"* — with a
five-row default that assertion would be testing a non-default state, which is
the weaker test. And the build's ⭐ claim is that *the shelf is mostly hatched
by construction, and that is the convention working* — a claim that is
invisible on first login if six of the nine are unpinned by default. Flagged
(**F9**) as a reversible one-constant decision.

### D10 — `GhostCommandLine` becomes `StatusBar`, and there is exactly one of it

`components/GhostCommandLine.tsx` is `git rm`'d; `components/frame/StatusBar.tsx`
replaces it. Both existing render sites (`App.tsx:652`, `CharGenStage.tsx:918`)
render `StatusBar` instead.

**Char-gen keeps a preview surface**, and must: it renders affordances that
send commands, and the axiom the bar advertises does not switch off during
intake. The two sites are **mutually exclusive phases** — `App()` is a `switch`
with early returns per phase, so `char-gen` and `in-world` can never both be
mounted. "Exactly one preview surface" is therefore true at every instant, and
the test asserts the *structural* version of it: exactly one module in
`src/**` renders the preview, and `grep`ping the source for a second
`ghostPreview` consumer finds none (there is exactly one today).

The relocation is smaller than it sounds — `GhostCommandLine` is **already**
rendered at the bottom of `AppContainer`, below the whole content row, so it is
already a global footer. What changes is its shape (the art's two-region bar: a
`flex:1` ellipsizing left region for the preview, a `flex:none` right region),
its at-rest copy, and its home in `frame/` beside the other chrome.

### D11 — The bar's composition, and what must survive the rebuild

```
[ seal ] [ ConnectionChip ] │ [ AccountMenu ] │ [ ─────── Shelf (flex:1, wraps) ─────── ] [ ViewsMenu ] [ Settings ]
```

- **Identity and connection sit left**, together, because the requirements say
  they are *"the two things that must be true at a glance whatever else was
  removed"* and the art's `who` chip is at the left. ⚠ The requirements also
  say *"the account menu at the right"*; `AccountMenu` is one component that is
  both the identity chip and its dropdown. Flagged (**F6**).
- **`ViewsMenu` and the Settings affordance survive.** Neither is mentioned in
  the requirements, and the mode switcher / `cockpit.layout` migration is an
  explicit Wave 4 non-goal — so a "full rebuild" that dropped them would
  regress two shipped surfaces. They keep the right-hand cluster the art gives
  to the notification bell, which is **not built, not hatched, not
  placeholdered**.
- The shelf takes `flex: 1; flex-wrap: wrap; row-gap` — **wraps, never
  scrolls**, so nothing pinned is ever out of sight.
- The seal is white-on-red with a red border, which is `--sx-red` / `--sx-white`,
  the two official colours, and `red` is exempt from the contrast floor for
  exactly this reason. Read them through new `tokens.color` aliases if needed
  (`oneColourSource` requires the alias to be a `var(--sx-<role>)` reference;
  `contrast.test.ts` already classifies `red` and `white`).

### D12 — The shelf owns its own subscription, like the pane does

`Shelf.tsx` opens `subscribeMql({ pane: 'self' })` in a `useEffect`, registers
`mql-subscription-result` / `-delta` handlers in the same effect, and
unsubscribes on unmount — byte-for-byte the shape `InspectionPane.tsx:425-555`
established. No new service layer, no second registry.

Results land in a store slice (`shelfFigures: SelfFigureRecord | null`,
`setShelfFigures`) rather than component state, so tests can drive the shelf
with `useStore.setState` without a socket, exactly as the pane tests do.

⚠ **The single-cardinality delta trap applies.** `self` is `cardinality: 'one'`,
so a delta arrives as one `replace`/`update`/`remove` keyed by stuffId and the
generic `applyChanges` would append rather than replace — the bug
`InspectionPane.tsx:500-513` documents at length. The shelf's reducer follows
the location handler's bypass, and a test drives an `update` delta specifically.

### D13 — One MR, seven commits, server first

One branch (`build/honest-chrome` → `master`), one MR. A stack does not help:
the client's first phase cannot be driven without the server pane existing, and
the shelf cannot be composed into the bar before it exists.

---

## Phase 1 — The `self` pane

The whole client build depends on this existing, and it is the cheapest phase
to be wrong about.

### Files

- `packages/types/src/index.ts` — `PaneId` gains `"self"`; `PANE_IDS` gains
  `"self"`; the `PaneId` TSDoc's *"the vocabulary is deliberately SMALL and
  grows with real consumers"* note gets `self`'s consumer named (the shelf).
  Add `SelfFigureRecord` (D4) beside `StuffRefRecord` / `StuffDetailRecord`.
- `packages/server/src/mud/lib/connection/Panes.ts` — `PaneDefinition.fields`
  becomes `FieldSet | FieldAlias` (type-only import from
  `../../api/mql-subscription`); the `self` entry per **D1**. Extend the
  file-head comment: the catalogue now carries a pane whose field list is
  explicit, and why (neither alias carries standing).
- `packages/server/src/mud/obj/Avatar.ts` — the two `Band` → `.name`
  normalizations (**D3**), each with a one-line comment saying the wire carries
  a band **name**, not a serialized value object.

### Tests

- `api/__tests__/pane-catalogue.test.ts` — the existing totality assertion picks
  up `self` for free once all three lists agree. Add:
  - `PANES.self.query === 'me'`, `cardinality === 'one'`, and
    `fields` is an **array** containing exactly
    `['playStanding','renown','practisingCompetence']` — ⭐ and a comment saying
    `makeStanding` is absent **on purpose** (D1), because the next person to
    read this list will assume an omission.
  - open the `self` pane through `handleSubscribe` in the existing harness and
    assert the first envelope is not an error and the projected record carries
    `playStanding` (the harness already builds an `Avatar` + `Interactive`).
  - a second avatar subscribing sees **no** standing keys (self-only, through
    the real pane rather than through `projectFields` directly).
- `obj/__tests__/Avatar.standing-split.test.ts:116-124` — `viaField.band.name`
  → `viaField.band`. **The only edit in this phase to an existing assertion.**
- ⚠ **F1's verification happens here**, before anything relies on it: assert
  that a `notifyDurableSubject` poke against the avatar's template path marks
  the `self` subscription dirty and produces a delta. If it does not, the shelf
  is a static snapshot and the plan changes — see the flag for what to do.

```
pnpm --filter @saxonberg/server test src/mud/api/__tests__/pane-catalogue.test.ts \
  src/mud/obj/__tests__/Avatar.standing-split.test.ts \
  src/mud/obj/__tests__/Avatar.standing.test.ts
pnpm --filter @saxonberg/types build
```

`git commit`: `feat(server): the self pane — one subscription for the shelf's own figures`

---

## Phase 2 — `cockpit shelf` and the `cockpit.shelf` key

### Files

- `packages/types/src/index.ts` — `ShelfRowId` (the nine, `TRAIT` **absent**),
  `SHELF_ROW_IDS`, `DEFAULT_SHELF`. TSDoc shaped like `PaneId`'s: the server
  validates against it, the client picks from it; and ⚠ **why `trait` is not in
  the union** — a comment at the vocabulary, because that is where a future
  contributor would add it.
- `packages/server/src/mud/lib/connection/HasInteractive.ts` — the
  `cockpit.shelf` schema entry per **D9**, with a prose `description` in the
  style of its neighbours and a validator that rejects a non-array, an unknown
  id, and a duplicate.
- `packages/server/src/mud/cmd/shell/cockpit.yaml` — the `shelf:` subcommand
  (controller, description, help, examples, `action` + `row` args), plus a line
  in the host verb's `help:` block beside `cockpit style <sub> …`.
- `packages/server/src/mud/obj/command/shell/CockpitShelfController.ts` — new.
  Named for the `CockpitPaneController` precedent (a generic cockpit noun takes
  the prefix). `list` / `pin` / `unpin`; commit via
  `setClientState` → `save()` (guarded `instanceof Avatar`, the
  `StyleController.commit` pattern, non-fatal save rejection) →
  `pushClientStateUpdate`; refusals via `context.note({ kind:
  'controller-rejected', … })`.
- `packages/server/src/mud/seeds/obj/command/shell/CockpitShelfController.yaml`
  — two lines, copying its sibling.
- `packages/server/src/mud/obj/command/shell/CockpitController.ts` — the
  one-line `shelf` row in the bare report (**D8**).

### Tests

- **New** `obj/command/shell/__tests__/CockpitShelfController.test.ts`,
  following `StyleController.test.ts`'s shape:
  `pin` writes and pushes; `unpin` removes; `pin` twice does not duplicate;
  an unknown row refuses **naming the known rows**; `pin identity` /
  `pin connection` refuse the same way (⭐ the AC's "cannot be unpinned",
  asserted from the direction a player would actually attack it);
  `list` prints all nine with pinned-ness.
- ⚠ `api/__tests__/cockpit-verb.test.ts` — **edited**: `shelf` joins the
  subcommand list at :80, its controller path is asserted at the same place its
  five siblings are, and a binder case is added beside `binds the cockpit pane
  override` (`cockpit shelf pin play` → `action='pin'`, `row='play'`;
  `cockpit shelf` → both undefined). This is the *only* test-editing this build
  does outside its own new files, apart from Phase 1's one-line shape change.
  **It is not one of the three reconnect tests the requirements freeze** — see
  **F3**.

```
pnpm --filter @saxonberg/server test src/mud/obj/command/shell/__tests__ \
  src/mud/api/__tests__/cockpit-verb.test.ts
pnpm --filter @saxonberg/server lint:gates lint:instanceable
```

`git commit`: `feat(server): cockpit shelf — server-authoritative pinning on cockpit.shelf`

---

## Phase 3 — The status bar, and one preview surface

Before the shelf, because the shelf's pin affordances preview into it and its
tests assert that.

### Files

- `packages/client/src/components/ui/tokens.ts` — add
  `fgDim: SX['fg-dim']`, with the three-level hierarchy named in the comment
  (`fg` → `fgDim` → `fgMuted`). No new ground role; all four guards pass
  unchanged.
- **New** `packages/client/src/components/frame/StatusBar.tsx` — the art's
  footer: `flex:1` ellipsizing preview region (mono, accent while previewing,
  `fgMuted` at rest) + a `flex:none` right region. At rest the left region
  carries the teaching hint the ghost line already carries; the right region
  carries **`click to send`** while previewing and **nothing** at rest — ⚠ the
  art's at-rest right text is `here:forge · 1,240 frames`, two figures with no
  source; rendering them would be the exact violation this build is about. Keep
  the flash behaviour and its 900 ms auto-clear verbatim.
- `packages/client/src/components/GhostCommandLine.tsx` — `git rm`.
- `packages/client/src/App.tsx` — import + render `StatusBar`.
- `packages/client/src/components/CharGenStage.tsx` — same swap at :45 / :918.

### Tests

- **New** `components/__tests__/StatusBar.test.tsx`:
  at rest shows the hint and no command; `setGhostPreview('look anvil')` shows
  the verbatim command **and** `click to send`; `setGhostPreview(null)`
  restores; `flashGhost('› look anvil')` shows the flash and clears.
  ⭐ Drive it through the store rather than props, because that is what the
  affordances actually do.
- **New** in the same file: the one-surface guard — read `src/` off disk
  (`node:fs`, the `globalFonts.test.tsx` precedent) and assert exactly one
  module reads `s.ghostPreview`, and that no module imports
  `GhostCommandLine`. *Two places showing what a click would send is worse than
  none, because they can disagree* — so assert it rather than remember it.

```
pnpm --filter @saxonberg/client test
```

`git commit`: `feat(client): the status bar — one preview surface, browser-style`

---

## Phase 4 — The shelf

### Files

- `packages/client/src/components/ui/Figure.tsx` — the `variant` prop (**D7**).
  `card` unchanged; `chip` horizontal, band suppressed, reason via
  `title` + the existing `aria-label`; `row` full-width with a visible reason.
- `packages/client/src/components/ui/index.ts` — no new export needed
  (`FigureProps` is already exported); update the module comment to name the
  shelf as the first consumer, retiring the "ships with no consumer" note.
- **New** `packages/client/src/components/frame/Shelf.tsx` — the catalogue, the
  subscription, the rows, and the `＋ widget` menu.

```ts
type HatchReason = 'level' | 'unexposed' | 'not-self';

const HATCH_COPY: Record<HatchReason, string> = {
  level:      'account arithmetic unbuilt — Make is account-level, and the account roll-up is not built',
  unexposed:  'no subscribable field yet',
  'not-self': 'not a figure about you — a world figure, which the self pane cannot carry',
};

const SHELF_CATALOGUE: readonly ShelfRow[] = [
  { id: 'play',   label: 'PLAY',   desc: 'influence · earned by living in the world', source: 'live' },
  { id: 'renown', label: 'RENOWN', desc: 'how widely you are known, and for what',    source: 'live' },
  { id: 'skill',  label: 'SKILL',  desc: 'the competence you are practising',         source: 'live' },
  { id: 'make',   label: 'MAKE',   desc: 'influence · earned by building',            source: 'level'     },
  { id: 'coin',   label: 'COIN',   desc: 'what you are carrying',                     source: 'unexposed' },
  { id: 'status', label: 'STATUS', desc: 'the note others see beside your name',      source: 'unexposed' },
  { id: 'time',   label: 'TIME',   desc: 'in-world clock and phase',                  source: 'not-self'  },
  { id: 'online', label: 'ONLINE', desc: 'how many people are on',                    source: 'not-self'  },
  { id: 'docket', label: 'DOCKET', desc: 'open measures you may vote on',             source: 'not-self'  },
];
```

⭐ **The reason is derived from a category, not typed per row.** This is the
`contrast.test.ts` totality-gate pattern: a row must be *classified*, the three
categories are three strings in one table, and a test asserts the three are
pairwise distinct. A per-row free-text reason decays into the generic one the
first time somebody copies a neighbouring line — which is precisely the decay
the requirements' ⭐ acceptance criterion is defending against.

- `packages/client/src/store/index.ts` — `shelfFigures: SelfFigureRecord | null`
  + `setShelfFigures` / `mergeShelfFigures`.

### Tests — `components/frame/__tests__/Shelf.test.tsx`

Every AC in the requirements' **The shelf** block, one test each:

- nine rows render; **`TRAIT` is absent by name** (assert `queryByText(/TRAIT/)`
  is null **and** that no `SHELF_ROW_IDS` entry matches
  `/trait|disposition|personality/i` — the client-side twin of S1's guard, so a
  catalogue edit trips the same wire the server does);
- with a store-set `shelfFigures`, `PLAY` / `RENOWN` / `SKILL` render `live`
  values (`data-figure-state="live"`);
- the other six render `data-figure-state="unwired"` and **no digit appears in
  any of them** (regex the rendered subtree);
- ⭐ `MAKE`'s reason contains *account* and does **not** equal either other
  category's string;
- ⭐ the three category strings are pairwise distinct, and every row's category
  is the one the requirements' table assigns (a table-driven `it.each`);
- every row emits `data-figure-state` — assert the count is 9 **and** that the
  shelf's text content outside those groups contains no digits (the
  "no value outside `Figure`" AC, asserted structurally);
- the shelf container computes `flex-wrap: wrap` and **not** `overflow: auto`
  (styled-components class assertion, not a resolved colour — jsdom-safe);
- clicking a catalogue entry calls `onCommandClick('cockpit shelf pin coin')`
  and **does not** mutate `clientState['cockpit.shelf']` locally;
- hovering a catalogue entry calls `onCommandPreview` with the same string —
  ⭐ assert *preview equals send*, since that is the axiom, not two separate
  behaviours;
- a `one`-cardinality `update` delta merges rather than appending (**D12**).

```
pnpm --filter @saxonberg/client test
pnpm --filter @saxonberg/client build:types
```

`git commit`: `feat(client): the widget shelf — nine rows, three live, six honestly hatched`

---

## Phase 5 — The top bar

### Files

- **New** `packages/client/src/components/frame/ConnectionChip.tsx` — the
  always-visible chip (**D6**) and its popover: three `Figure variant="row"`
  entries — *this connection* `live` (**D5**), *round trip* `unwired` (reason:
  nothing measures it; needs a ping/pong), *frames behind* `unwired` (reason:
  nothing measures it; needs a server sequence number) — plus the art's
  justifying copy, which earns its place because it explains why the surface is
  honest rather than green.
- `packages/client/src/store/index.ts` — `connectedAt` set in `setConnected`,
  absent in `setDisconnected`.
- `packages/types/src/index.ts` — the optional `connectedAt` on
  `ConnectionState`.
- `packages/client/src/components/frame/Frame.tsx` — rebuilt per **D11**.
- `packages/client/src/components/frame/ConnectionIndicator.tsx` — **not
  touched**.
- `packages/client/src/App.tsx` — `Frame` gains nothing new; `onCommandClick` /
  `onCommandPreview` are already threaded (`:621`).

### Tests

- **New** `components/frame/__tests__/ConnectionChip.test.tsx`: connected →
  the chip is visible and `ConnectionIndicator`'s vocabulary is absent;
  `reconnecting` → the chip is visible and shows the indicator's text (once);
  popover open → duration is `live` and formats `2h 14m` from a fixed
  `connectedAt` with a faked clock; the other two rows are `unwired` **with
  their reasons**; with `connectedAt` absent the duration row is `empty`, not a
  fabricated `0m`.
- **New** `components/frame/__tests__/Frame.test.tsx`: the bar renders the
  connection chip and the identity chip **regardless of `cockpit.shelf`** — set
  `clientState['cockpit.shelf'] = []` and assert both survive (⭐ the AC's
  "cannot be unpinned", asserted from the state a player could actually reach);
  `ViewsMenu` and the settings affordance still render with their props.
- ⚠ **Re-run the three frozen files and confirm zero diffs**:
  `store/__tests__/connectionLink.test.ts`,
  `components/__tests__/ConnectionIndicator.test.tsx`,
  `services/__tests__/websocket.test.ts`. `git status` must show them
  unmodified. **If one needs changing, stop** — behaviour moved where only
  presentation should have.

```
pnpm --filter @saxonberg/client test
pnpm --filter @saxonberg/client build:types     # ⚠ the real typecheck
git status --short packages/client/src/store/__tests__ \
  packages/client/src/components/__tests__ packages/client/src/services/__tests__
```

`git commit`: `feat(client): the civic top bar — identity, connection, and the shelf`

---

## Phase 6 — Driven, not just green

Two ACs say so explicitly, and both are about things the suite structurally
cannot see (jsdom substitutes no `var()`; a controller test skips the binder;
`useStore` is not a socket).

**6a — `e2e/tests/shelf.spec.ts`** (following `theme.spec.ts` / `cockpit.spec.ts`,
`openWorldAs` + `runCommand`):

```
open world
# the shelf is there and is honest
expect nine [data-figure-state] groups in the bar
expect exactly three of them to be state="live"
expect no digit inside any state="unwired" group
# pinning is a real command, and it survives a reconnect
runCommand('cockpit shelf unpin coin');  expect eight groups
page.reload();                           expect eight groups   # ⭐ server-authoritative
runCommand('cockpit shelf pin coin');    expect nine
runCommand('cockpit shelf pin nonesuch') # refuses in the machine voice,
                                         # naming the known rows
```

**6b — `e2e/tests/status-bar.spec.ts`** — the AC that names the browser:

```
hover a clickable identity tag in the transcript
read the status bar's text            → T
click the same tag
assert the command that was SENT      === T     # preview equals send, verbatim
mouse-leave                            → the bar restores
```

Capture the sent command by reading the echo frame the server returns, not by
spying on the client — the point is that the *server* received what the bar
promised.

**6c — the manual drive.** With `pnpm dev`, in all three themes: the bar at
1440px and at ~900px (the shelf must **wrap to a second row**, never scroll or
clip); the connection popover open, then kill the server and watch the chip go
amber then red with the popover still honest; hover several adjacent
affordances quickly (the deferred restore must not flicker); char-gen's status
bar; the `＋ widget` menu's nine rows with their reasons legible.

`git commit`: `test(e2e): drive the shelf, the pin command and preview-equals-send`

---

## Phase 7 — Docs

- **`docs/subsystems/client-shell.md`** — the load-bearing one.
  - § *The frame* → rewritten as **The top bar**: the composition (D11), what
    is left-anchored and why, that `ViewsMenu` + settings survive, and that the
    notification bell is **not built, not hatched, not placeholdered**.
  - New § **The widget shelf**: the nine-row catalogue table with each row's
    state; ⭐ **the three hatch categories and why they are three** (the
    account-level gap, the unexposed-field gap, the not-about-you gap) —
    including that `TIME`/`ONLINE`/`DOCKET` are structurally unreachable from a
    self-scoped pane, so the next builder does not go looking in `Avatar`; the
    `＋ widget` menu; that pinning is a command.
  - New § **The status bar**: the relocation, the one-surface rule and its
    guard, and that the art's at-rest right-hand figures were declined for
    having no source.
  - § *The honest-state primitives* — retire the ⚠ *"ships with no consumer"*
    note and name the shelf; add the `variant` axis.
  - ⚠ Record the **cut read-only indicator** with its rationale, so the slate's
    Build B line is not later read as an unmet promise.
  - Record `LoadBearingMixin`'s three live self-fields as *known, deliberately
    not on the shelf* — the catalogue is the art's, and widening it is a design
    decision.
- **`docs/subsystems/cockpit.md`** — `cockpit shelf` joins the subcommand
  table; `cockpit.shelf` joins the clientState keyspace section beside
  `cockpit.inputModes`; note that it is **persistent**, unlike
  `inputModes`/`watch`, because a shelf is a preference and not session
  routing.
- **`docs/subsystems/mql-subscription.md`** — the `self` pane, the widened
  `PaneDefinition.fields` (and that the subscribe path already supported it),
  ⭐ **why `makeStanding` is not on the field list**, and the band-name
  normalization as the wire contract.
  `inspection-pane.md` gets a one-line pointer: it is no longer the only
  consumer of the pane catalogue.
- **`docs/slates/builds/client-slate.md`** § 7.1 — Build B shipped; the
  read-only indicator recorded as cut with a pointer to the requirements.
- **Not touched**: `CLAUDE.md`, `docs/workflow.md`, `roadmap.md`,
  `launch-worklist.md` (index files — swept, not raced, per CLAUDE.md
  § Worktrees rule 5). `docs/design_handoff/**` is reference art and is never
  edited.

`git commit`: `docs(client-shell): the top bar, the shelf and its three hatch categories, the status bar`

---

## Ordering, and why this order and not another

```
1 self pane → 2 cockpit shelf → 3 status bar → 4 shelf → 5 top bar → 6 driven → 7 docs
```

- **Server before client**, both phases, because the client's first phase
  cannot be *driven* (6a/6b) against a pane and a verb that do not exist, and
  because Phase 1 is where **F1** gets answered — the flag that could change
  the client design. Discovering a static shelf in Phase 4 costs a rewrite;
  discovering it in Phase 1 costs a decision.
- **Pane before verb** — the verb's `list` output names rows that only mean
  something once the pane can answer for them, and the pane is the riskier of
  the two.
- **Status bar before shelf** — the shelf's pin affordances preview into it,
  and Phase 4's tests assert preview-equals-send. Building the shelf first
  would mean writing those assertions against a component about to be deleted.
- **Shelf before top bar** — the bar composes the shelf. The reverse order
  needs a placeholder in the bar for one commit, and a placeholder in this
  build of all builds is a bad joke.
- **Driven after the client, before the docs** — the docs describe behaviour,
  and 6c is where the wrap-not-scroll and the flicker-free restore are actually
  observed. Writing the doc first documents an intention.

Every phase leaves the branch green, and every phase's commit is individually
buildable in the order given.

## Test cadence

⚠ **`pnpm test:near` is server-only** (`packages/server/scripts/test-near.ts`),
so it selects almost nothing on a build that is ~65% client. The mid-build loop:

```bash
pnpm --filter @saxonberg/client test            # whole client suite; fast, jsdom
pnpm --filter @saxonberg/server test <named>    # phases 1–2; a YAML edit selects nothing,
                                                # so name cockpit-verb.test.ts explicitly
pnpm --filter @saxonberg/types build            # after any types edit — composite project
```

⚠⚠ **`vite build` does NOT typecheck.** esbuild strips types without checking
them, so a `tsc` error can ship a green `pnpm build`. The real check is
**`pnpm --filter @saxonberg/client build:types`** (plain `tsc`, `include:
["src/**/*"]`, so it covers the tests too — which is the *only* thing that
catches D5's `ConnectionState` hazard). Run it at the end of every client
phase, not just before the MR.

⚠ **jsdom substitutes no `var()`.** No unit test may assert a resolved colour;
every such claim is e2e (Phase 6).

Then, once, before opening the MR:

```bash
pnpm test          # the full suite, ONE run
pnpm lint
pnpm e2e           # its own CI stage; not in `pnpm test`. Server + client up
```

⚠ **Do not play the CI gate.** Pipelines stay blocked; the local runs above are
the gate, and the MR body says which ones were run and what they said.

## Worktree discipline

`./tools/wt-status` first, before touching a file. **Stage by name — never
`git add -A`.** Phase 3 deletes exactly one file (`GhostCommandLine.tsx`), well
under the hook's ten-file threshold, so no `SAXONBERG_ALLOW=1` is needed; if
any phase approaches ten deletions, stop and find out why rather than setting
the flag. **Push every turn.** Merge only through the GitLab MR.

---

## ⚠ Flags — underspecified, unimplementable as written, or unverified

Nothing below is silently substituted. These become the MR's open review
questions.

| # | Flag | Minimal alternative / decision needed |
|---|---|---|
| **F1** | ⚠ **UNVERIFIED: is the durable-key index built from the *subscription's* field list?** The read of `MqlSubscriptionRegistry.ts:595-720` was blocked and not retried. Everything about a *live* shelf rests on it: the descriptors declare `durableKey`, the four producers call `notifyDurableSubject`, but the code that indexes a subscription under a durable subject was not seen. | **Verify in Phase 1, before anything relies on it**: in the pane-catalogue harness, open the `self` pane, call `MqlSubscriptionApi.notifyDurableSubject(avatar.getTemplatePath()!)`, drain (`_drainScheduledForTesting`), and assert a delta envelope arrives. **If it does not fire**, the likely cause is that the index is keyed off descriptors *reachable from the projected fields* and the pane's explicit list is not consulted — in which case the minimal alternative is to keep the shelf correct-but-static for this build (it re-resolves on reconnect and on any other wake), render the three live rows from the initial result, and raise the indexing gap as its own ticket. **Do not "fix" the registry inside a chrome build.** |
| **F2** | ⚠ **Related and also unverified: how does the differ compare field values?** If it is identity-based, a descriptor returning a freshly-minted object on every read produces a spurious delta per re-resolve. | **D3 makes it moot for the two influence fields** (a string compares by value under any scheme). `practisingCompetence` returns a fresh `{discipline, band}` object per read and would still be exposed if the comparison is identity-based — check it in the same Phase 1 test by poking twice with no underlying change and asserting **one** delta, not two. |
| **F3** | ⭐ **`api/__tests__/cockpit-verb.test.ts:80` asserts the subcommand list exactly, so adding `shelf` REQUIRES editing it.** This must not be read as violating the requirements' freeze. | The freeze covers **three named files** — `store/__tests__/connectionLink.test.ts`, `components/__tests__/ConnectionIndicator.test.tsx`, `services/__tests__/websocket.test.ts` — because they are the guard on the *full-bar-rebuild* risk. `cockpit-verb.test.ts` is a server verb-registry test with no relationship to the reconnect machine, and it is *designed* to fail when the subcommand set changes: that is its job. The edit is additive (a sixth entry, a sixth controller assertion, a binder case). **Make the distinction explicit in the MR body** so a reviewer does not read a legitimate edit as a broken promise. |
| **F4** | **`ConnectionState` gains a field, and `connectionLink.test.ts` builds a complete literal.** A *required* field breaks that frozen test's typecheck — and only under `build:types`, since vitest strips types without checking them. | **D5**: `connectedAt?: number`, optional. Also honest (no timestamp before the first connection). Alternative — a store field outside `connection` — also compiles but splits the concept and Build C needs it too. Needs a nod that a `?` in a shared type is acceptable as the mechanism. |
| **F5** | **`playStanding` / `makeStanding` put a `Band` class instance on the wire**, which `JSON.stringify` renders as `{ band: { name: "…" } }` — a shape nobody designed. | **D3** normalizes to `{ band: 'nascent' }`, matching `practisingCompetence`'s already-plain band. Cost: two source lines and two assertion edits in `Avatar.standing-split.test.ts` (not frozen; equally strong after). The alternative — the client reads `.band.name` — is one edit smaller and pins the client to an accident. **Sign-off wanted before Phase 1**, because it touches S1's wire (which has zero consumers today, which is exactly why now is the cheap moment). |
| **F6** | **The art and the requirements disagree on where identity sits.** `Global Chrome.dc.html` puts the `who` chip at the **left**, beside connection; the requirements say *"the account menu at the right"*. `AccountMenu` is one component that is both the identity chip and its dropdown. | **D11** puts it left, on the requirements' own stronger sentence — *"the two things that must be true at a glance"* — and leaves the right cluster to `ViewsMenu` + settings. If the intent was a split (identity chip left, account actions right), that is two components and a second identity rendering; say so before Phase 5. |
| **F7** | **"Each with its reason" in a 30px chip.** The shelf row has no room for a visible reason line; the art's `.wg` carries only `title`. | Chip renders the reason in `title` **and** in the `aria-label` `Figure` already emits (*"not wired — <reason>"*, so a screen reader gets it in words), and the `＋ widget` catalogue menu renders every row's reason as **visible text**. The AC's test asserts the reason via `aria-label`, which is the accessible name — the strongest available reading. Confirm this satisfies "with its reason". |
| **F8** | **"`cockpit shelf list` prints the catalogue with each row's state" is ambiguous** — pinned/unpinned, or live/hatched? | **D8** prints pinned-ness, because per **D2** the server does not know which rows the client painted and a verb printing a guess is a confident wrong answer. If live/hatched was meant, the honesty vocabulary must move server-side, which needs a catalogue module in `lib/connection/` — **a new server module, requiring sign-off**, and a server that models the client's build state. Recommend as planned. |
| **F9** | **The default shelf is unspecified.** The art defaults to five of ten. | **D9** defaults to all nine, so the AC's nine-row assertion tests the default state and the build's ⭐ claim is visible on first login. One constant to change if the five-row default is preferred — but then the nine-row AC needs restating as "the catalogue holds nine". |
| **F10** | **`Figure` — a Build A primitive shipped one commit ago — gains a `variant` prop.** | **D7**. `card` remains the default, so `Figure.test.tsx` (including its `@ts-expect-error` compiler assertions) passes unmodified. The alternatives are a second component (reopens the `<span>{n}</span>` hole the union closed) or `styled(Figure)` descendant overrides (puts the primitive's DOM shape in the consumer's hands, breaks silently with no type error). Being the first consumer *is* how a primitive learns what it needs. |
| **F11** | ⭐ **`renown: 0` is ambiguous on the wire, and the honest reading makes a fresh shelf look empty.** `RenownApi.renownOf` returns *"the neutral 0 for a non-materialized scope"*, so "measured neutral" and "never materialized" are the same bytes. **D4** renders `0` as `empty` with a reason. Consequence: a fresh character reads `PLAY dormant · RENOWN — · SKILL — ·` six `╌╌`. | This is a product-impression call, not a technical one. The alternative — render `0` as `live` — asserts a measurement the payload cannot distinguish from its own absence, which is the convention's failure mode one level down. If the demo needs figures, the convention's own preference order #3 applies: **seed the world so the real endpoint answers**, which is a content task, not a client one. |
| **F12** | **`GhostCommandLine` has two render sites**, and the requirements demand exactly one preview surface. | **D10**: the component is deleted and both sites render `StatusBar`; the sites are mutually exclusive phases (`App()` early-returns per phase), so one surface is live at every instant. Char-gen **keeps** a preview surface, and must — it renders command-sending affordances. Guarded structurally by a source-scan test (one `ghostPreview` consumer), not by memory. |
| **F13** | **The art's at-rest status-bar right region shows `here:forge · 1,240 frames`** — two figures with no source. | Rendered as **nothing** at rest, `click to send` while previewing. Building them would be the exact violation this build exists to demonstrate against, in the surface that advertises the claim. Recorded so the omission reads as a decision. |

**Not planned, deliberately:** no new server module, no new exported free
function, no new `eslint-disable`, no new module category. The server side is
one new controller + its two-line seed (both squarely inside existing
categories, mirroring `CockpitPaneController`), one `clientStateSchema` entry,
one YAML subcommand block, two type-widening edits and two one-line descriptor
normalizations. The shared vocabulary lands in `@saxonberg/types`, beside
`PANE_IDS`, precisely so that no new server module is needed. **If anything
during the build seems to need one, stop and get sign-off** — the lint failing
is the intended tripwire.

---

## Critical files

- `packages/server/src/mud/lib/connection/Panes.ts`
- `packages/server/src/mud/lib/connection/HasInteractive.ts`
- `packages/types/src/index.ts`
- `packages/client/src/components/frame/Frame.tsx`
- `packages/client/src/components/ui/Figure.tsx`
