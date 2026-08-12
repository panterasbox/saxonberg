# Client shell — frame, start screen, guest & connection-loss

> **This documents a *client* subsystem.** Most of `docs/subsystems/`
> describes the server engine; this one covers the React client's
> top-level shell — the frame primitives, the plain-UI start screen, the
> anonymous-guest path, the portrait, and the connection-loss state
> machine. Its server-side touchpoints (the guest principal, the portrait
> resolver, the don't-flush seam) are noted where they cross the wire.
> Seeded by [client-shell-slate.md](../slates/tails/client-shell-slate.md);
> built per `docs/requirements/client-shell-frame-requirements.md`.

## The top bar

`components/frame/Frame.tsx`. One row, rendered once above the layout
registry, so it is present in every mode:

```
[seal] [ConnectionChip] │ [AccountMenu] │ [──── Shelf (flex:1, wraps) ────] [Views] [Settings]
```

**Identity and connection are anchored LEFT, together**, because they
are *the two things that must be true at a glance whatever else was
removed* — you are logged in as somebody, and the bus is alive. The
shelf is everything else, and everything else is negotiable.

⭐ **Identity and connection cannot be unpinned — not by a rule, but
because they are not shelf rows at all.** `cockpit shelf unpin identity`
refuses with *unknown shelf row*, which is a stronger guarantee than a
protection rule somebody could edit away.

The components:

- **`ConnectionChip`** — the always-visible connection surface, and the
  popover behind it. See § *The connection popover* below.
- **`ConnectionIndicator`** — unchanged, and **composed rather than
  grown**. It is silent when `connected` (renders `null`), which is
  exactly why it could not become an always-visible chip; the chip owns
  the healthy state and *delegates* the unhealthy vocabulary to it.
  Three things follow by construction: the indicator's own test passes
  unmodified, there is exactly ONE rendering of "Reconnecting…" /
  "Disconnected" in the tree, and no dot is drawn twice.
- **`AccountMenu`** — a dropdown off the identity label (portrait +
  name), state-polymorphic over the connected identity: a real character
  gets *Switch character* (a reconnect → roster, account stays signed
  in) + *Sign out*; a guest gets *Sign in to save* + *Sign out*. The two
  exits are distinct — leaving the world ≠ ending the account.
- **`Portrait`** — the small avatar image; renders `player.portraitUrl`
  with an initials fallback when the URL is empty (the server's "no
  image" sentinel) or fails to load. No broken-image icon ever shows.
- **`Shelf`** — the widget shelf. Its own section below.
- **`ViewsMenu` + Settings** — both **survive** the rebuild. Neither is
  named in the honest-chrome requirements, and migrating the frame off
  `cockpit.layout` is an explicit Wave 4 non-goal, so a "full rebuild"
  that dropped them would have regressed two shipped surfaces.
- **The seal** — white on red with a red border, through
  `tokens.color.seal` / `sealInk`. This is the surface `--sx-red` was
  reserved for: the official colour is usable at its 2.66:1 *because*
  it carries white separation, and it stays background/border only, so
  "red never touches blue" holds and `tokens.color.danger` still
  resolves to `ember`.

⚠ **The notification bell in the reference art is not built, not
hatched, and not placeholdered**, and `Frame.test.tsx` asserts its
absence. What belongs in a notification tray is whatever the receiver
*said* they wanted — which wants `NotifyPolicy` / `NotifyRule` read
first — so a stub would be an interface promising a model that does not
exist. That is the same failure the honesty convention prevents, one
level up: not a fake figure but a fake capability.

⚠ **Identity sits left, against one sentence of the requirements.** The
requirements say "the account menu at the right"; the reference art puts
the `who` chip at the left, beside connection. `AccountMenu` is one
component that is *both* the identity chip and its dropdown, so it
cannot be in two places. The left reading wins on the requirements' own
stronger sentence (the "two things that must be true at a glance"). If a
split was intended — identity chip left, account actions right — that is
two components and a second identity rendering, and it is a design call.

**Shared primitives, not a shared `Frame` across surfaces** — the start
screen composes the same primitives into its own full-screen layout; a
single cross-surface `Frame` wrapper is deferred until a third surface
(CMS, public) makes the real commonality visible.

## The widget shelf

`components/frame/Shelf.tsx`. The player-pinned row of figures across
the top bar, and **the first consumer of the honest-state primitives**.

⭐⭐ **Three of the nine rows have a live server read and six do not, so
the shelf is mostly hatched by construction.** That is not a shortfall
to apologise for — it is the convention working. A shelf showing nine
confident numbers would be lying about six of them.

| Row | State | Category |
|---|---|---|
| `PLAY` | **live** | `playStanding` |
| `RENOWN` | **live** | `renown` |
| `SKILL` | **live** | `practisingCompetence` |
| `MAKE` | hatched | `level` |
| `COIN` | hatched | `unexposed` |
| `STATUS` | hatched | `unexposed` |
| `TIME` | hatched | `not-self` |
| `ONLINE` | hatched | `not-self` |
| `DOCKET` | hatched | `not-self` |
| ~~`TRAIT`~~ | **never** | see below |

### ⭐ The three hatch categories, and why they are three

The reasons are three distinct claims and must not collapse into one.
They tell the next builder **where to look**, and a single generic "not
wired" erases exactly that:

1. **`level` — the account gap** (`MAKE`). The value EXISTS and its
   *level* is wrong. `Avatar.makeStanding` returns a real band, but
   *Make* is an account-level stock (`STOCK_LEVEL`) and the account
   arithmetic is deliberately unbuilt, so the number answers
   per-character for a per-person claim. **A figure whose level is wrong
   is not a figure you can render** — the honesty rule applies to the
   level, not only to the value. This is the one row where hatching
   hides a real number, which is why its reason string is load-bearing
   and separately tested. It unhatches the day the account roll-up
   lands.
2. **`unexposed` — the missing field** (`COIN`, `STATUS`). Genuinely
   figures about you, simply not on the wire. A one-field addition
   unhatches each.
3. ⭐ **`not-self` — the wrong scope** (`TIME`, `ONLINE`, `DOCKET`).
   These are **world** figures. The `self` pane structurally cannot
   carry them *no matter what is added to `Avatar`*; they need a
   different source — a world-scoped pane, or a different subscription
   entirely — and that is a design conversation, not a field addition.
   Recording the distinction is the point: a reason saying "no
   subscribable field yet" would send the next builder into `Avatar`
   looking for something that can never be there.

The reason is derived from a **category**, not typed per row — the
`contrast.test.ts` totality-gate pattern. A row must be *classified*,
the three categories are three strings in one table, and a test asserts
they are pairwise distinct. A per-row free-text reason decays into the
generic one the first time somebody copies a neighbouring line.

### ⚠⚠ `TRAIT` is permanent, not deferred

The reference art lists it. The psychology vocation rests on self-other
asymmetry, and a pinned always-on readout of your own personality is the
stat sheet that makes the therapist unnecessary. `ShelfRowId` omits it,
the server's guard forbidding subscribable field names matching
`trait|disposition|personality` stands unmodified, and `Shelf.test.tsx`
asserts its absence by name — the client-side twin of the same wire.

### What is deliberately NOT on the shelf

`LoadBearingMixin` contributes three MORE live self fields —
`borneBurden`, `carryCapacity`, `loadRatio` — that the catalogue does
not list. The catalogue is the reference art's, and widening it is a
design decision. **The shelf's live set is limited by the catalogue,
not by the wire.**

### The `＋ widget` menu, and pinning

Clicking a catalogue entry sends `cockpit shelf pin <row>` /
`unpin <row>` and mutates nothing locally; the server writes
`cockpit.shelf` and pushes it back. Hovering previews the identical
string in the status bar — the same constant, so preview and send cannot
drift into two call sites that merely agree today.

The 30px chip has no room for a visible reason line, so the reason rides
`title` **and** the `aria-label` `Figure` already emits (*"not wired —
&lt;reason&gt;"*, in words, so a screen reader gets it). The `＋ widget`
menu is where every row's reason is **visible text** — the chip is the
compact face of the same fact, never the only place it appears.

The shelf takes `flex: 1; flex-wrap: wrap` — **wraps, never scrolls**.
Nothing pinned may be out of sight; a horizontally scrolling shelf hides
figures behind a gesture, which is the same failure as not rendering
them. Driven at 900px in `e2e/tests/shelf.spec.ts`.

### The subscription

One `self` pane, opened by name in a `useEffect` and torn down on
unmount — the shape `InspectionPane` established, with no new service
layer and no second registry. Results land in the store
(`shelfFigures`) rather than component state, so tests drive the shelf
without a socket.

⚠ **The single-cardinality delta trap applies.** `self` is
`cardinality: 'one'`, so a slot replacement arrives as one `replace`
keyed by the NEW stuffId and the generic `applyChanges` would append a
second record; an `update` carries only what changed and must MERGE.
The location handler's bypass is followed. See
[mql-subscription.md](./mql-subscription.md).

## The status bar

`components/frame/StatusBar.tsx` — the global footer, and the surface
that makes *the command line is never silent* true rather than
aspirational. `CONVENTIONS.md` #5, and § 3.5's axiom: **every click
sends a command, and the interface shows which.**

It replaced `GhostCommandLine`, which is deleted. The relocation was
smaller than it sounds — the ghost line already sat at the bottom of
`AppContainer`, below the whole content row, so it was already a global
footer. What changed is its shape (a `flex:1` ellipsizing preview
region, a `flex:none` right region), its at-rest copy, and its home in
`frame/` beside the other chrome.

⚠ **Exactly one preview surface, guarded structurally.** Two places
showing what a click would send is worse than none, because they can
disagree — and a disagreement here does not merely look wrong, it
discredits the one claim the surface exists to make. So
`StatusBar.test.tsx` scans `src/` and asserts exactly one module reads
`ghostPreview` and nothing imports the retired component. A second
consumer fails the suite the moment it is written.

Two RENDER sites remain and both are correct: `App` (in-world) and
`CharGenStage`. They are mutually exclusive phases — `App()` is a switch
with an early return per phase — so exactly one bar is mounted at any
instant. **Char-gen keeps a preview surface and must**: it renders
affordances that send commands, and the axiom does not switch off during
intake.

⭐ **The art's at-rest right region reads `here:forge · 1,240 frames`,
and neither figure is rendered.** Nothing measures a frame count, and
`here:` would be a location readout with no subscription behind it. The
right region carries `click to send` while previewing and nothing at
rest. Painting two invented numbers in the surface that advertises that
the interface tells the truth would be the joke this build is not
making.

## The connection popover

`ConnectionChip`'s expansion — three readings, of which one has a
source:

| Row | State | Why |
|---|---|---|
| this connection | **live** | derivable from a connect timestamp; no server work, no new wire field |
| round trip | hatched | nothing measures it — needs a ping/pong |
| frames behind | hatched | nothing measures it — needs a server sequence number |

Adding a ping/pong and a frame sequence is real protocol work with its
own failure modes and belongs in its own build, not smuggled into a
chrome pass. The popover's own copy is what earns it a place — *a
dropped socket in a MUD costs you whatever you were mid-way through* —
and the honest version of that surface says which of its three readings
it can stand behind.

⭐ **The duration row says "this connection", not "session".** A
successful reconnect issues a fresh `connection-established`, so
`ConnectionState.connectedAt` resets. Rather than paper over that with a
fake continuous session clock, the label names what is actually
measured. Same move as hatching `MAKE`: the honest fix for a figure at
the wrong level is to correct the *claim*, not the number. With no
`connectedAt` at all the row is `empty` with a reason — never a
fabricated `0m`.

`connectedAt` is an **optional** field on `ConnectionState`, and the
optionality is load-bearing twice. Practically: `connectionLink.test.ts`
builds a complete `ConnectionState` literal and the client's `tsc`
includes its tests, so a required field would break a frozen reconnect
test under `build:types` while still passing `vitest` — the worst
failure shape there is. Honestly: before the first connection there is
no timestamp, and a sentinel would be a value standing in for an
absence.

The ticking is a `useEffect` interval **inside the popover, only while
open** — never a global 1 Hz re-render of the bar.

⚠ **The reconnect machine itself is untouched.** `ConnectionState`,
`setDisconnected`, the link vocabulary, backoff and `ReconnectBanner`
are presentation-only work in this build, and the three guard files
(`connectionLink.test.ts`, `ConnectionIndicator.test.tsx`,
`websocket.test.ts`) plus `ConnectionIndicator.tsx` show **zero diffs**.
If one of them ever needs changing to accommodate the bar, that is the
signal that behaviour moved where only presentation should have.

## ⚠ The read-only mode indicator: cut, not deferred

The client-slate's Build B line named a read-only mode indicator. It was
**cut during planning because it has no source**, and this is recorded
so the line is not later read as an unmet promise.

The only read-only principal in the system is the livestream broadcast
feed, and [livestream.md](./livestream.md) records that the broadcast
connection *"has no `Interactive` at all"* — it is an out-of-band socket
for overlays, registered straight with `BroadcastFeed` as a pure push
target and absent from the connection registry. It never receives
`connection-established`, so no flag on that payload could reach it, and
`packages/client` has no reference to the feed at all. Nor is there a
read-only `CockpitMode`: `watch` is a mode, but a watching player holds
a full `Interactive` and can act.

So the indicator would have had nothing to indicate. Building one would
have meant inventing a read-only session state to justify a chip — the
interface leading the model, which is how a surface ends up asserting
something the server cannot back.

⚠ If a read-only React session is genuinely wanted — a spectator link, a
shared-screen mode, a suspended account that can read but not act — that
is a real feature with server work and wants its own requirements.

## The start screen (pre-world, plain UI)

`components/StartScreen.tsx` renders the `unauthenticated` phase — no
diegetic metaphor (the lounge is the first room; this is just the app's
start screen). It offers a **data-shaped provider list** (Google live; a
rendered-but-inert Twitch slot — the auth-providers slate wires it
later), a co-equal **Play as guest** button, and a **dev-only** no-OAuth
login (`import.meta.env.DEV`). Logout returns here (a real logged-out
state, never a reload to a dead page).

## Anonymous guest

A guest is **anonymous** (button on the logged-out screen) and **wholly
ephemeral**. Two orthogonal axes, deliberately not conflated:

- **Authentication (session/account axis)** — `POST /auth/guest`
  (`services/auth/GuestAuthRoutes.ts`) establishes an *anonymous*
  principal `anon:<nanoid>` (`User.ANONYMOUS_PREFIX`) via `req.login`.
  The WS upgrade gate is **unchanged** — it sees a valid
  `passport.user.id`. `Application.handleUserConnect` recognizes the
  prefix and builds an ephemeral, never-saved `User` (`user.anonymous =
  true`) instead of a Mongo lookup. The single admission gate is
  `GuestAuthRoutes.mayMintGuest` — flip it to demote guests to
  post-sign-in if abused.
- **Guest-ness (character axis)** — `Avatar.isGuest`. `Login.enter` is
  the **one** place the policy "anonymous session → mint a guest avatar"
  lives; the build itself is `Login.mintRandomGuestAvatar` (private),
  which reads the char-gen rosters + sex-set rule from `EnrollController`
  (`loadConfig` / `validSexSet`) so the guest and char-gen paths agree.
  Every pick is **randomized** — a random species, a random
  **non-intersex** sex, a random aspiration (→ bio + themed outfit) —
  pronouns are always **they/them**, the name is the reserved-word guest
  name, and the avatar spawns in the lounge (the seed's `startLocation`).
  Every guest *behavior* keys off the avatar's `isGuest`, never the
  session.

Guest lifecycle:

- **Minted on Enter** (not page-load). The build forks a **unique
  per-guest transient template** (`/obj/Avatar/guest-<nanoid>`) from the
  seed, overlaying the random picks, clones it, then **deletes the
  template** immediately — guests persist nothing, and the live avatar is
  independent of it. The unique path also means no two guests ever clone
  the same path, so there's no seed-clone concurrency hazard (no
  serialization needed).
- **Recognizable, non-impersonable.** The name is the reserved word
  (`Login.GUEST_RESERVED_WORD = 'Guest'`) + a NameBank-drawn
  distinguisher ("Guest Mallow") drawn only from the real `common`
  `NameBank` (an unseeded bank degrades to a bare "Guest", never a
  fabricated surname) — so guest-ness rides every attributed line
  (speech/emote/look), where a UI badge can't reach. The reserved word is
  on the char-gen `enroll` name denylist
  (`EnrollController.isReservedName`, which imports it from `Login`) so a
  real player can't impersonate a guest. Exact-word only; fuzzy/homoglyph
  is out of scope.
- **Persists nothing.** `Avatar.save()` short-circuits for guests (the
  single guard covering autosave, onDestruct, and the client-state
  don't-flush seam in `backend/inbound/clientState.ts`); autosave never
  starts.
- **Reaped on disconnect.** `Avatar.onLinkdead` destructs a guest
  immediately (no reconnect window — there's nothing to resume). The
  client routes a dropped guest to the start screen.

## Portrait — one method on the connection layer

Portrait resolution lives on **`HasInteractiveMixin.getPortraitUrl()`** —
the connection layer, present on both pre-world `Login` and in-world
`Avatar` — so the account photo is available from the moment of
connection. It is **one method**, not an Api (no `DescribeApi`
addition — that Api is being end-of-lifed; presentation resolves on the
host):

1. the `identity.portrait` **setting** (declared on `PersonaMixin`;
   `resolveSetting` returns `''` on an Avatar with it unset, `undefined`
   on a Login — both fall through), else
2. the connected account's Google photo (`Interactive.getUser()` →
   `googleProfileId` → `GoogleProfile.photoUrl`), else
3. `''` — the empty sentinel; the client renders a generated initials
   placeholder.

The account photo is **never written into the setting** (that would
freeze it stale); resolution is read-time only. The resolved URL rides
`ConnectionEstablishedPayload.player.portraitUrl`.

## Connection loss (linkdead) on the client

The spine: the server does **not** reap a real avatar on linkdead
(`Avatar.onLinkdead` just emits an event), so a real user can reconnect
any time and resume — be generous, preserve context. A guest is reaped,
so it has nothing to resume.

- **Three link states** on `connection.link`. `setConnected` →
  `connected`; a drop → `reconnecting`; give-up → `dropped`.
- **Exponential backoff over ~60s** (`services/websocket.ts`:
  `1·2·4·8·16·30·30s`, replacing the fixed 5×2s) so users ride straight
  through a server restart without acting.
- **Command send is disabled while down, never queued** (`CommandBar`
  reads `connection.link`; a buffered command replayed into a resumed
  world is a foot-gun).
- **On give-up (real user):** `ReconnectBanner` shows over the preserved
  cockpit; its button (`websocketClient.reconnectNow()`) resets the
  backoff and resumes. Never a silent bounce to a dead page.
- **Routing to the start screen** — the two cases with nothing to
  resume: an unauthenticated session (re-auth needed) and a **dropped
  guest** (avatar reaped; the store also clears identity).
- A **successful reconnect is seamless** — subscriptions already
  re-issue on `connection-established` and welcome-scene-on-reconnect is
  already suppressed; the client re-enables input and clears the banner.
- **Intentional teardown** (logout / leave-world) sets
  `intentionalDisconnect` so `onclose` skips auto-reconnect — the caller
  drives the phase itself.

## The honest-state primitives

`components/ui/Figure.tsx` + `UnbuiltGround.tsx` — the shared primitives
for the one convention that cuts across every surface that shows a
number (`docs/design_handoff/CONVENTIONS.md` #1):

> **Never render a figure the server did not send**, including "just for
> now."

The demo wipes nightly, which buys latitude on *persistence* and none on
*figures*: a plausible fake is indistinguishable from a bug, and this
product's central claim is that its numbers are real. Three states must
look nothing alike:

| State | Rendering | Reason shown |
|---|---|---|
| `live` | a number. no decoration. the only state that shows one | none — a live figure has nothing to explain |
| `empty` | `—` in the muted foreground | **yes** — a real zero deserves a reason |
| `unwired` | hatched ground, dashed border, `╌╌` where the value goes | **yes** |

⭐ **The union is the deliverable.** One component with a *required*
discriminated `figure` prop, not three components and not an optional
`value`:

```ts
export type FigureState =
  | { readonly state: "live";    readonly value: string }
  | { readonly state: "empty";   readonly reason: string }
  | { readonly state: "unwired"; readonly reason: string };
```

You cannot render a figure without naming its state; `empty` and
`unwired` cannot omit their reason; and **`unwired` has no `value` field
at all**, so the convention is enforced by the type checker rather than
by vigilance at every call site. Three separate components would leave
`<span>{n}</span>` as the path of least resistance — and the fourth
state the convention warns about, a plausible fake, is exactly what the
path of least resistance produces. `Figure.test.tsx` asserts the
compiler's refusal with `@ts-expect-error`; CI enforces it through the
client's `build:types` job.

Tokens: `hatch` / `hatchStrong` for the 135° stripe, `info` for the
`╌╌`, `fgMuted` for the `—` and the reason, `accent` for a live value.

Two decisions worth keeping:

- ⚠ **No stamp.** The reference art's `live` / `empty` / `not wired`
  chips are documentation labels for its three example cards; the
  convention's own wording is "a reason, **not a stamp**". The hatch is
  the stamp and the reason is the words.
- ⚠ **No `color-mix(in oklab, …)`**, which the reference art uses
  throughout. `hatch` / `hatchStrong` are precomputed per ground —
  a marble hatch is not an ink hatch lightened, mixing against a
  transparent stop composites over whatever is behind, and precomputing
  makes each theme state what its hatch actually looks like. It is also
  readable in jsdom, so the hatch is testable rather than intended.

Accessibility carries the honesty to a screen reader, to which a dashed
border is invisible and `╌╌` is noise: `role="group"` plus an
`aria-label` that says "not wired" / "none" in words, with the reason.

**Two carve-outs, neither belonging to these components.** *Prose never
hedges* — a room description carries no engineering stamp, because
breaking the fiction to report an engineering fact is the wrong trade in
the one place the game is supposed to be a world; if a thing cannot be
described yet, it is not in the room yet. And *commands refuse honestly*
in the machine voice (`cockpit style theme default` naming the three it
does know), not through a hatched widget.

### The `variant` axis

`Figure` carries a layout axis orthogonal to its state union:

| Variant | Shape | Used by |
|---|---|---|
| `card` (default) | label over value over band, with a visible reason | the original Build A block |
| `chip` | one 30px line, band suppressed, reason via `title` + `aria-label` | the widget shelf |
| `row` | full-width, label left / value right, reason beneath | the connection popover |

⚠ **A variant enum, not a second component and not a `styled(Figure)`
override.** A second component reopens the `<span>{n}</span>` hole the
union was shaped to close — the constraint is that no shelf row may
print a value outside `Figure`, and the moment there are two ways to
render a figure there are three. A `styled(Figure)` override with
descendant selectors would put the primitive's internal DOM shape in the
consumer's hands, so a refactor of `Figure` would silently break the
shelf's layout with no type error. `card` stays the default, so
`Figure.test.tsx` passes unmodified including its `@ts-expect-error`
compiler assertions.

⭐ **The widget shelf is the first consumer**, and being that consumer
is how the primitive learned it needed the variant axis at all. (The
prior note here read "ships with no consumer" — the accepted Wave 1 risk
that a primitive with no consumer can drift. Build B closed it.)

## What this build does NOT add

- **No client-side persistence / localStorage.** Everything that matters
  is server-authoritative behind the session cookie; nothing in scope
  needs persistence the cookie doesn't provide. The pre-auth /
  device-local tier is a real future concept (per-device perf toggles, a
  pre-auth theme cache) **deferred to the slate** with no v1 content.
- Search, mode switcher, the public read-only surface, the declarative
  mode/manifest model, author mode / CMS — all later cycles (see the
  client-shell slate).

## History

- **Guest build homed on `Login`** (MR !54 review): the randomized
  guest-avatar build started life as `EnrollController.mintRandomGuestAvatar`
  (next to the char-gen `commit` it mirrors) but moved onto `Login` — the
  guest-mint site — reading the rosters + `validSexSet` back from
  `EnrollController` via a lazy import. In the same pass the
  `GUEST_RESERVED_WORD` + guest-name generation moved from `Avatar` to
  `Login`, the hardcoded guest-surname fallback list was deleted (real
  `common` NameBank only), and `PRONOUN_LABELS` was colocated with the
  `Pronouns` enum in `@saxonberg/types`.
