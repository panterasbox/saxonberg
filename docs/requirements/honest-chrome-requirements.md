# Honest chrome — requirements

**Build B of three** in client-rebuild Wave 1. Build A landed the
substrate — colour resolves from the theme, four voices, and the
`Figure` / `UnbuiltGround` primitives — and shipped it with **no
consumer**. B is the consumer. It builds the always-on desktop chrome
the civic ground was built for: the top bar, the widget shelf, and the
status bar that makes "the command line is never silent" true rather
than aspirational.

Seeded by [client-slate § 7.1](../slates/builds/client-slate.md).
Design surface: `docs/design_handoff/Global Chrome.dc.html`,
`CONVENTIONS.md` (#1 honesty, #5 the command line is never silent),
`Unbuilt States.dc.html` — **reference art**, not diffable, so decisions
live here and pixels stay there.

The Wave 1 cut:

| Build | Ships | Status |
|---|---|---|
| **A — civic ground** | theme-aware colour, both grounds, four voices, the honest-state primitives | **shipped** (MR !182) |
| **B — honest chrome** | desktop top bar + shelf + status bar, and its server work | **this doc** |
| **C — chrome on a phone** | the mobile inversion | after B |

⭐ **B is where the honesty convention stops being a primitive and
becomes a posture.** Of the reference art's shelf catalogue, **three
rows have a live server read and six do not** — so the shelf is mostly
hatched by construction. That is not a shortfall to apologise for; it is
the convention working. A shelf that showed nine confident numbers would
be lying about six of them, and the whole claim of this product is that
its figures are real.

## Goals

- **A civic desktop top bar**, rebuilt from the reference art: identity
  and connection at the left (the two things that must be true at a
  glance whatever else was removed), the widget shelf in the middle, and
  the account menu at the right.
- **The widget shelf**: a player-pinned row of figures that wraps to a
  second row rather than scrolling, so nothing pinned is ever out of
  sight. Every entry renders through `Figure`, and therefore names its
  honest state.
- **Pinning is a real command.** `cockpit shelf` with a `cockpit.shelf`
  clientState key — server-authoritative, like every other cockpit
  preference. A shelf the client owned would break the axiom the status
  bar exists to advertise.
- **A global status bar** that previews, browser-style, the command a
  hovered affordance would send. `GhostCommandLine` relocates into it,
  and the command bar is left showing only what you are composing.
- **One server pane entry feeds the shelf's self-scoped rows.** `self`
  joins the pane catalogue and `PaneDefinition.fields` widens to carry
  an explicit field list, because the shelf's live figures are all
  fields on the viewer's own Avatar.

## Non-goals

- **Everything in Build C**: the mobile bar, the pull-down shelf, the
  glance-line slot, the command sheet, the dropped-connection first row,
  safe areas and tap-target rules.
- **The `traits` widget — never.** `Global Chrome.dc.html` lists it. The
  psychology vocation rests on self-other asymmetry, and a pinned
  always-on readout of your own personality is the stat sheet that makes
  the therapist unnecessary. S1's guard test forbidding subscribable
  field names matching `trait|disposition|personality` stands
  **unmodified**, and this build adds no route around it.
- **The notification tray.** Deferred, and **not shipped as a stub** —
  `NotifyPolicy` / `NotifyRule` want reading first, because what belongs
  in that surface is whatever the receiver *said* they wanted, not
  everything that happened. The bell in the reference art is not built,
  not hatched, and not placeholdered.
- **New subscribable fields.** B wires what is already on the wire and
  hatches the rest. Adding a `coin` or `status` read would push fields
  onto the wire that nothing else has asked for, and would trade the
  convention's first real demonstration for two numbers. (`TIME` /
  `ONLINE` / `DOCKET` could not be fixed this way in any case — they are
  not self-scoped; see Surface decisions.)
- **Measuring connection health.** Round-trip and frames-behind are not
  measured anywhere today and this build does not add the measurement
  (see Surface decisions).
- **The read-only mode indicator.** Cut during planning — it has no
  source (see Surface decisions). A read-only React session would be a
  real feature with server work and wants its own requirements.
- **The mode switcher, and migrating the frame off `cockpit.layout`.**
  Wave 4. The S3 compatibility projection keeps working untouched.
- **The pane feed, hold policy, N-pane subscription set**, and the
  arrangement-recall decision. Wave 4.
- **Arrival** (front door, intake, lounge, character select) — Wave 2.
  **Forums, wiki, livestream surfaces** — Wave 6. **CMS, help, git
  panel** — Wave 7.

## Surface decisions

### The shelf ships nine rows, three live and six hatched

⚠ **Corrected after planning-phase investigation.** An earlier revision
of this section said two live and seven hatched, on the claim that
"`Avatar.subscribableFields` has exactly three names". That was wrong:
`Avatar`'s own static declares three, but **`subscribableFields` is
contributed by mixins too**, and sixteen classes across the tree declare
one. `Avatar` composes `AdvancementMixin` (via `Character`), which
declares `practisingCompetence` — *"the competence you are practising"*,
which is the art's `SKILL` row exactly. The field was there all along.

The catalogue, and the state each row is in on the day this ships:

| Row | State | Reason shown when not live |
|---|---|---|
| `PLAY` | **live** | — |
| `RENOWN` | **live** | — |
| `SKILL` | **live** | — |
| `MAKE` | hatched | account arithmetic unbuilt |
| `COIN` | hatched | no subscribable field yet |
| `STATUS` | hatched | no subscribable field yet |
| `TIME` | hatched | not a figure about you |
| `ONLINE` | hatched | not a figure about you |
| `DOCKET` | hatched | not a figure about you |
| ~~`TRAIT`~~ | **not built** | see Non-goals — permanent |

Preference order #1 from `CONVENTIONS.md` governs: *ship the surface,
hatch the value.* The layout, the copy and the pin affordance are all
judgeable without the numbers, and wiring each later is a one-line
change rather than a redesign.

⚠ The hatched reasons are **three distinct claims** and must not be
collapsed into one:

1. **"account arithmetic unbuilt"** (`MAKE`) — the value exists and its
   *level* is wrong. See below.
2. **"no subscribable field yet"** (`COIN`, `STATUS`) — genuinely
   figures about you, simply not exposed on the wire. A one-field
   addition unhatches each.
3. ⭐ **"not a figure about you"** (`TIME`, `ONLINE`, `DOCKET`) — these
   are **world** figures, not self fields, so the `self` pane
   *structurally cannot carry them* no matter what is added to
   `Avatar`. They need a different source (a world-scoped pane, or a
   different subscription entirely) and that is a design conversation,
   not a field addition. Recording the distinction is the point: a
   reason that said "no subscribable field yet" would send the next
   builder looking in the wrong place.

⚠ Also found while correcting this: `LoadBearingMixin` contributes
`borneBurden` / `carryCapacity` / `loadRatio` — three **live** self
fields the reference art's catalogue does not list. They are **not**
added here (the catalogue is the art's, and widening it is a design
decision), but the fact is worth recording: the shelf's live set is
limited by the catalogue, not by the wire.

### `MAKE` is hatched, even though the server returns a number

This is the build's sharpest decision and it goes against the easy
reading.

`Avatar.subscribableFields` has `makeStanding` and it returns a real
band. But the value is **per-character**, while `CONVENTIONS.md` #4 and
slate § 6 both hold that Make is **account-level** — it is something the
*person* does, not the character, and there is no reason to author as
one character. The server's own comment records that the account
arithmetic is deliberately unbuilt.

So the figure exists and its **level is wrong**. Rendering it plainly
would be honest about the value and silent about the claim, and the
claim is the part that matters: a player reading `MAKE 62` on a
character-scoped shelf will conclude their authoring standing is
per-character, which is exactly what the design says it is not.

**A figure whose level is wrong is not a figure you can render.** The
honesty rule applies to the level, not only to the value. `MAKE`
therefore hatches with the reason *account arithmetic unbuilt*, and
unhatches the day the account roll-up lands.

⚠ This is the one row where hatching hides a real number, so the reason
string is load-bearing — it must say *why*, not merely that it is
missing.

### The top bar is a full rebuild from the reference art

Not a restyle of the existing `Frame`. The bar gains the shelf, the mode
indicator and a connection surface with real internal structure, and
threading those through the current three-child flex row would leave the
composition the art specifies only half-expressed.

⚠ **The reconnect machine is the risk, and it is bounded by a
constraint, not by care** — see Constraints. The connection *state
machine* (`ConnectionState`, `setDisconnected`, the link vocabulary, the
reconnect banner's behaviour) is **not** in scope for rework; only its
presentation is. Its existing tests must pass unmodified.

### The connection popover: session is live, health is hatched

The art's connection chip expands to three rows. Measured against what
the client actually has (`ConnectionState` carries `link`,
`isConnected`, `socketId`, `sessionId`, `error` — and nothing else):

| Row | State | Why |
|---|---|---|
| session duration | **live** | derivable client-side from a connect timestamp; no server work, no new wire field |
| round trip | hatched | nothing measures it; needs a ping/pong |
| frames behind | hatched | nothing measures it; needs a server sequence number |

Consistent with the shelf: build the surface, hatch what has no source.
Adding a ping/pong and a frame sequence is real protocol work with its
own failure modes and belongs in its own build, not smuggled into a
chrome pass. The popover's own copy justifies existing at all — *a
dropped socket in a MUD costs you whatever you were mid-way through* —
and the honest version of that is a surface that says which of its three
readings it can actually stand behind.

### Pinning is server-authoritative, through `cockpit shelf`

`cockpit shelf` gains `list` / `pin <row>` / `unpin <row>`, persisting to
a `cockpit.shelf` clientState key beside `cockpit.mode`,
`cockpit.layout` and the rest.

Two reasons it cannot be client state. First, § 3.5's axiom — *every
click sends a command, and the interface shows which* — is advertised by
the status bar this same build introduces; a pin affordance that mutated
local state while the status bar previewed a command would falsify the
one claim the bar exists to make. Second, the cockpit keyspace is
already server-owned and a second, divergent persistence path for one
preference is drift.

⚠ The subcommand is **one level deep**. `cockpit shelf pin play` rides
positional slots inside the `shelf` subcommand exactly as
`cockpit style theme ink` does — the framework does not nest
subcommands two deep, and `StyleController` is the exemplar.

### ⚠ The read-only mode indicator is CUT — it has no source

Dropped from this build's goals, having been listed in the slate's
Build B line without a server concept behind it.

Investigation: the only read-only principal in the system is the
**livestream broadcast feed**, and
[livestream.md](../subsystems/livestream.md) records that the broadcast
connection *"has no `Interactive` at all"*. It is an out-of-band socket
for overlays — **not a state the React client's session can be in**.
`packages/client` accordingly has no reference to it. Nor is there a
read-only `CockpitMode`: `watch` is a mode, but a watching player holds
a full `Interactive` and can act.

So the indicator would have had nothing to indicate. Building one would
have meant inventing a read-only session state to justify a chip — the
interface leading the model, which is how a surface ends up asserting
something the server cannot back. That is the same failure the honesty
convention exists to prevent, one level up: not a fake *figure* but a
fake *state*.

⚠ **Flagged, not silently dropped.** If a read-only React session is
genuinely wanted — a spectator link, a shared-screen mode, a suspended
account that can read but not act — that is a real feature with server
work, and it wants its own requirements. Recorded here so the slate's
Build B line is not read later as an unmet promise.

### The shelf reads one pane, not one subscription per figure

The shelf's live figures are all fields on the viewer's own Avatar, so
they are one subscription. `self` joins `PaneId` and the `PANES`
catalogue; `PaneDefinition.fields` widens from `'ref' | 'detail'` to
accept an explicit field-name list, because **neither alias carries
standing** — `REF_FIELDS` and `DETAIL_FIELDS` are object-description
sets (`displayName`, `shortDescription`, `contents`, …) and the
subscribe path already accepts an explicit list.

⚠ This covers the self-scoped rows only. `TIME`, `ONLINE` and `DOCKET`
are world figures and are hatched precisely because no self-scoped pane
can reach them (above).

This is also the client's **first consumer of S1's wire at all**:
`packages/client` has two subscription call sites today, both
`InspectionPane` panes, and nothing reads a standing field.

### `GhostCommandLine` relocates rather than duplicating

The hover preview moves out of the command-bar area into the global
status bar. The component may be rewritten, but there must be exactly
**one** preview surface afterwards — two places showing what a click
would send is worse than none, because they can disagree.

## Constraints

- ⚠ **The reconnect machine's existing tests pass unmodified.**
  `store/__tests__/connectionLink.test.ts`,
  `components/__tests__/ConnectionIndicator.test.tsx` and the websocket
  service tests are the guard on the full-rebuild risk. If a test needs
  changing to accommodate the new bar, that is the signal that behaviour
  moved when only presentation should have.
- **S1's guard test stands unmodified** — no subscribable field name
  matching `trait|disposition|personality`.
- **The honest-state primitives are the only way a figure renders.** No
  shelf row may print a value outside `Figure`; the compiler enforces
  the state, and a bare `<span>{n}</span>` in a widget is the exact
  regression Build A's union was shaped to prevent.
- **Both carve-outs still hold**: prose never hedges, and commands
  refuse honestly in the machine voice.
- **No hex literals.** `noHexLiterals.test.ts` is CI-gating; new chrome
  reads `tokens.*` or it does not merge. Likewise every `--sx-*` a new
  surface references must exist — `customProperties.test.ts` will catch
  a typo, and `fg-dim` is already reserved for exactly this build's
  three-level text hierarchy.
- **Server-side module categories hold** for the pane entry and the
  shelf controller: no new free-floating helper modules, and the
  `XApi` ↔ `XLogic` split is not collapsed. See CLAUDE.md § Module
  Categories.
- **Scale**: radius 3px, spacing 4/6/9/12/16/22px, two voices on screen
  at once and never three. The shelf label is the engraved display voice
  (`tokens.font.engraved` at `tokens.font.label`); the value is mono.
- **Worktree discipline**: stage by name, never `git add -A`; push every
  turn. Merge only through the GitLab MR, and **do not play the CI
  gate** — pipelines stay blocked; local verification is the gate.
- **Test cadence**: the client suite for the mid-build loop
  (`pnpm test:near` is server-only and selects almost nothing on a
  client build), `pnpm test` **once** before opening the MR.

## Acceptance criteria

**The shelf**

- The shelf renders nine rows; `TRAIT` is absent, and a test asserts its
  absence by name so a future catalogue edit cannot reintroduce it.
- `PLAY`, `RENOWN` and `SKILL` render live values from a real
  subscription.
- The other six render the not-wired state — `╌╌`, hatched ground,
  dashed border — **each with its reason**, and a test asserts no digit
  appears in any of them.
- ⭐ A test asserts the three hatch reasons are **distinct** — the
  account-level gap, the missing-field gap and the not-about-you gap say
  different things, and a single generic string would erase the
  difference that tells the next builder where to look.
- ⭐ A test asserts `MAKE` is hatched **and** that its reason names the
  account-arithmetic gap, not a generic "not wired". The distinction is
  the decision; an untested reason string would decay into the generic
  one.
- The shelf wraps to a second row rather than scrolling.
- Every row renders through `Figure`. A test asserts no shelf row emits
  a value outside it.

**The command line is never silent**

- Hovering an affordance previews its verbatim command in the status
  bar; a test drives hover → preview → mouse-leave → restore.
- Exactly one preview surface exists after the relocation.
- ⚠ Verified by **driving a browser**, not by the suite alone: hover a
  clickable identity tag, read the status bar, click, and confirm the
  command sent is the command previewed.

**Pinning**

- `cockpit shelf list` prints the catalogue with each row's state.
- `cockpit shelf pin <row>` / `unpin <row>` persist to `cockpit.shelf`
  and survive a reconnect.
- An unknown row name refuses in the machine voice, naming the known
  rows — the `cockpit style theme default` precedent.
- Pinning through the UI sends the command; a test asserts the click
  dispatches `cockpit shelf pin …` rather than mutating local state.

**The bar**

- Identity and connection are present in every mode — a test asserts
  they cannot be unpinned, since they are the two things that must be
  true at a glance.
- The connection popover shows a live session duration and hatches
  round-trip and frames-behind with reasons.
- ⚠ The reconnect machine's tests pass **unmodified**.

**Docs**

- `docs/subsystems/client-shell.md` updated: the top bar's composition,
  the shelf and its catalogue, the status bar and the relocated preview,
  the read-only indicator.
- `docs/subsystems/cockpit.md` updated: `cockpit shelf` and the
  `cockpit.shelf` key join the verb's subcommand table.
- `docs/subsystems/inspection-pane.md` or
  [mql-subscription.md](../subsystems/mql-subscription.md) records the
  `self` pane and the widened `PaneDefinition.fields`.
- `docs/slates/builds/client-slate.md` § 7.1 records Build B shipped.

## Cross-references

**Seeding slate** — [client-slate](../slates/builds/client-slate.md)
(§ 3.1 honesty, § 3.5 the command line is never silent, § 7.1 the Wave 1
cut, and the ⚠⚠ `makeStanding` level note)

**Design surface** — `docs/design_handoff/`: `Global Chrome.dc.html`,
`CONVENTIONS.md`, `Unbuilt States.dc.html`

**Subsystem docs** —
[client-shell.md](../subsystems/client-shell.md) (the frame, and the
honest-state primitives this build consumes),
[cockpit.md](../subsystems/cockpit.md) (the one verb, its subcommands,
the clientState keyspace),
[mql-subscription.md](../subsystems/mql-subscription.md) (the
subscription registry the `self` pane rides),
[inspection-pane.md](../subsystems/inspection-pane.md) (the two existing
pane consumers),
[livestream.md](../subsystems/livestream.md) (the read-only broadcast
principal the mode indicator reads),
[message-rendering.md](../subsystems/message-rendering.md) (the civic
ground and the token layer this chrome is built on)

**Preceding build** — A civic ground, shipped MR !182.
**Follow-on build** — C chrome on a phone, then Wave 2 Arrival.
