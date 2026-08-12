# Chrome on a phone — requirements

**Build C of three** in client-rebuild Wave 1, and the one that closes
it. A shipped Wave 1 is what Wave 2 (Arrival) depends on.

Build A landed the civic ground; **B built the desktop chrome** — the
top bar, the nine-row widget shelf, the status bar, the `self` pane and
`cockpit shelf`. C is **not a responsive pass over B**. It is the
*inversion*: on a phone the shelf leaves the bar entirely, the status
bar ceases to exist, and a dropped socket takes the whole first row.

Seeded by [client-slate § 3.5 / § 3.6 / § 7.1](../slates/builds/client-slate.md).
Design surface: `docs/design_handoff/Global Chrome - Mobile.dc.html`
(panels 6A–6D), `CONVENTIONS.md`, `DESIGN-SYSTEM.md` — **reference art**,
so decisions live here and pixels stay there.

The Wave 1 cut:

| Build | Ships | Status |
|---|---|---|
| **A — civic ground** | theme-aware colour, both grounds, four voices, the honest-state primitives | **shipped** (MR !182) |
| **B — honest chrome** | desktop top bar + shelf + status bar, and its server work | **shipped** (MR !186) |
| **C — chrome on a phone** | the mobile inversion | **this doc** |

⭐ **The governing sentence, from § 3.6:** *a bar that wraps has nowhere
to wrap to.* Desktop's shelf grows a second row when you pin too much.
On a phone every row the chrome takes is a row the feed loses, and the
feed is the app. So the shelf cannot live in the bar at all — it becomes
a **pull-down**: the bar keeps the two fixed facts and one glance-line
of the player's choosing, and the rest arrives when you drag. **Same
catalogue, same order, different disclosure.**

## Goals

- **A two-row mobile bar.** Row one is the fixed facts — seal,
  connection, identity — and is never removable. Row two is the
  **glance-line**: the head of the player's own shelf, plus the grab
  handle.
- **The shelf becomes a pull-down**, rendering the same catalogue in the
  same order, **two-up** — a phone can afford height here and never
  width, so the widgets get big enough to read instead of squeezing into
  a strip.
- **A shelf-choosing screen** that treats the glance-line as the scarce
  slot it is, and the rest of the catalogue as one drag away.
- **A dropped socket claims the entire first row**, because on a phone
  you are usually not looking — and says only what is true.
- **A command sheet** replacing hover: a tap names the verbatim command
  before it sends.
- **Round-trip latency becomes a live figure**, retiring a hatch B
  shipped with an inaccurate reason.
- **Safe areas and tap targets** as a rule the layout obeys, not a
  per-component nicety.

## Non-goals

- **⛔ The held-commands queue.** The art's 6D shows *"2 commands held ·
  retry in 4 s"* and a footer reading `held› true rim · quench axle`.
  **No such queue exists** — `WebSocketClient.send()` logs an error and
  drops the message. Building one is an offline queue with ordering,
  expiry and replay-safety questions (*is `north` still the right command
  forty seconds later?*), which is a real feature deserving its own
  requirements, not a chrome build's side effect. See **Surface
  decisions** for what the dropped bar says instead.
- **⛔ The notification bell.** The art puts `◔ 3` in row one as *"never
  removable"*. B shipped it **not built, not hatched, not
  placeholdered**, with a test asserting its absence, because what
  belongs in that tray is whatever the receiver *said* they wanted —
  which wants `NotifyPolicy` / `NotifyRule` read first. Nothing about a
  smaller screen changes what is behind it. `SocialNotificationsPane`
  remains reachable from the account menu, so the capability has a home;
  it does not get a permanent slot in the scarcest row on the screen.
- **The mobile Arrival path** — front door, intake, lounge, character
  select. Wave 2, and its own `- Mobile` art files.
- **The mobile live client / play surface** — the two feeds, the pane
  feed and its hold policy, focus chain, filters and routing, prompts.
  Wave 4, which is where the feed itself is owned.
- **Reactions on mobile.** Wave 6.
- **The mode switcher, and migrating the frame off `cockpit.layout`.**
  Wave 4, unchanged from B.
- **A frames-behind figure.** Still unmeasured — no server sequence
  number — and unlike round-trip there is no existing protocol for it.
  Stays hatched.
- **Touch gesture infrastructure beyond the one pull-down.** No swipe
  navigation, no pull-to-refresh, no edge gestures.

## Surface decisions

### ⭐ The server owns what is shown; the viewport owns how it is disclosed

The one line that decides every "is this client or server" case in this
build.

`cockpit.shelf` stays server-authoritative and **identical on both
form factors** — same rows, same order, same `cockpit shelf` verb. What
the viewport decides is only *disclosure*: whether the shelf renders
inline in the bar (desktop, wrapping) or behind a pull-down (mobile,
two-up). That is § 3.6's "same catalogue, same order, different
disclosure", made literal.

⚠ **Mobile is a viewport fact and must not become a server key.** The
server cannot know a viewport; inventing `cockpit.formFactor` would be a
fake fact — the honesty failure one level up from a fake figure, and the
same one that cut B's read-only indicator. `nothing-is-pure-client`
governs **command semantics and affordances**, not physical device
facts, and none of those move here: every affordance still sends a
server command, and the client still owns zero command semantics.

Detection is a media query, and the breakpoint is a single named
constant so it cannot drift between components.

### ⭐ The glance-line is the HEAD of the shelf, not a second key

Row two shows the first **three** rows of `cockpit.shelf`; the rest
arrive on pull-down.

The alternative was a second clientState key (`cockpit.glance`) naming
the bar rows explicitly. **Rejected: two lists that must agree is the
drift this codebase repeatedly warns about** — an unpin that forgot to
update the glance key, a glance row that is not on the shelf, and a
`list` output that cannot say which is true. One ordered list has one
answer.

**The consequence is a new action.** `cockpit shelf` today only appends
(`pin`) and removes (`unpin`), so with the glance-line defined as the
head, *choosing* it means **reordering** — and there is no verb for
that. This build adds one action that moves a row to the front. It is
also a desktop improvement: shelf order has been unchangeable since B.

⚠ The count (three) is a client-side rendering decision, not a server
constraint — the server does not know how wide the bar is. A shelf
shorter than three simply shows what it has.

### ⭐ The command sheet CONFIRMS; it does not preview

Desktop hover asks *what would this send?* — there is a moment before
you commit. **On a phone there is no before: a tap is the commit.** So
the sheet is not a preview surface at all. Tapping an affordance opens a
sheet naming the **verbatim command** it affords; the player picks and
it sends.

§ 3.5's axiom is preserved and arguably strengthened — the interface
still shows which command, and still *before* it goes.

⚠⚠ **B's one-preview-surface guard survives unmodified, and stays
true.** That guard asserts exactly one module reads `ghostPreview`.
The sheet carries its own store state and does **not** read
`ghostPreview`, because "what a tap will send, pending confirmation" is
a different fact from "what a hover would send". A sheet that reused the
preview slice would trip the guard *and* would be conflating two
concepts — the guard catching it would be correct.

**No status bar on mobile.** It has no hover to report and would cost a
row the feed needs. `StatusBar` renders only above the breakpoint.

### ⭐ The dropped bar says what is TRUE, which is not what the art says

6D is the most persuasive panel in the set and the one that most
overpromises. Its argument is right: *a phone drops connection
constantly and you are usually not looking*, so the bar must not
understate it. Its **mechanism** — naming the commands it held — has
nothing behind it.

The dropped state therefore claims the whole first row and reports:

| Reported | Source |
|---|---|
| that the link is reconnecting or dropped | ✅ `connection.link`, shipped in B |
| the retry countdown | ⭐ **exposed by this build** — see below |
| a manual retry affordance | ✅ `websocketClient` already has a manual reconnect that resets backoff |
| how long since the last frame | ✅ derivable from frame timestamps |
| ⚠ **that commands sent now will not arrive** | ✅ the truth, and the honest replacement for a fake "N held" |

⭐ **That last row is the inversion worth making.** The art comforts —
*we kept your commands*. The truth is bleaker and more useful: **they
are dropped**. Telling the player their input is going nowhere is
strictly more actionable than a fabricated count of things allegedly
saved, and it is the sentence that makes the queue's absence visible
rather than silently wrong. When the queue is built, this row is what it
replaces.

**The retry countdown is exposed, not invented.** `attemptReconnect()`
already computes an exponential backoff delay (1·2·4·8·16·30·30s) and
then discards it into a bare `setTimeout` — the store only ever learns
`link: 'reconnecting'`. This is the same shape as B's
`measuredRenownOf`: **the information exists and is thrown away one
line before it leaves.** Surfacing it is not new measurement.

⚠ This touches the reconnect machine, which B froze. The change is
**additive and observational** — the backoff schedule itself does not
change, and the three guard files must still pass. If one needs
modifying, behaviour moved where only reporting should have.

### ⭐ Round-trip is WIRED, and B's hatch reason was wrong

B hatched *round trip* with the reason *"nothing measures it — needs a
ping/pong."* **That reason is inaccurate and this build retires it.**

The protocol already exists end to end:

- `websocketClient.sendPing()` sends a client timestamp.
- `backend/inbound/ping.ts` replies `pong`, and its own docstring says
  *"the cockpit needs its own ping to measure RTT … client subtracts to
  derive latency."*

What is missing is only that **nothing calls `sendPing()`** and
**nothing handles the `pong`**. So the hatch was sending the next
builder to write a protocol that was already written — exactly the
failure B's own three-category doctrine exists to prevent (*a reason
that sends you looking in the wrong place*).

⚠ **This is a correction to shipped work, not a new feature**, and it is
in scope for the same reason `measuredRenownOf` was in B: it is one
existing capability not being read, and the alternative is leaving a
wrong claim in the codebase. Scope is the caller, the handler, the store
slice, and the two consumers (mobile bar, desktop popover) — **not** a
latency history, a graph, or a health heuristic.

The figure is `live` when a round-trip has completed and `empty` with a
reason before the first one — never a fabricated zero.

### The bar's composition, and where Views and Settings go

```
row 1   [seal] [connection] [identity ▾]            ← never removable
row 2   [ GLANCE-LINE — head of the shelf ] [ ⌄ ]   ← the grab
```

⚠ **`ViewsMenu` and the Settings affordance move into the account-menu
dropdown** on mobile. They survive — dropping them would regress two
shipped surfaces, exactly as it would have in B — but neither earns a
permanent slot in a two-row bar when the identity chip is already a
dropdown that holds account actions. Presentational only: same
components, same commands, different home.

### The pull-down

Dragging the grab (or tapping it) discloses the full shelf **two-up**,
over the feed rather than displacing it. The same `Figure` primitive
renders each row — the `card` variant, since the pull-down is where a
phone *can* afford height, and `chip` exists for the bar strip.

The shelf-choosing screen (6C) presents the glance-line as its own
section — *three fit on the bar without pulling down; everything else is
one drag away* — above the full catalogue with each row's state and
reason. **Connection and identity are absent from it by design**, since
they are not shelf rows at all; `cockpit shelf unpin identity` refuses
with *unknown shelf row*, and that refusal is the guarantee.

Every affordance on that screen sends a `cockpit shelf …` command and
mutates nothing locally, unchanged from B.

## Constraints

- ⚠ **The reconnect machine's three guard files pass unmodified**:
  `store/__tests__/connectionLink.test.ts`,
  `components/__tests__/ConnectionIndicator.test.tsx`, and the websocket
  service tests. Exposing the backoff delay and handling `pong` are
  additive; if a guard needs changing, behaviour moved.
- ⚠⚠ **B's one-preview-surface guard passes unmodified.** Exactly one
  module reads `ghostPreview`. The command sheet is not a second one.
- **The honest-state primitives are the only way a figure renders.** No
  bar row, glance chip, pull-down widget or popover row may print a
  value outside `Figure` — including round-trip and the retry countdown.
- **`cockpit.shelf` remains the single source of truth for shelf
  content and order.** No parallel client list, no second key.
- **No new server module.** The reorder action is a new *action* on the
  existing `CockpitShelfController`, dispatched from its existing
  positional slots — not a new controller, and not a nested subcommand
  (one level deep, framework-wide).
- **No hex literals**; `noHexLiterals` / `customProperties` /
  `contrast` / `oneColourSource` are CI-gating and unchanged.
- **Scale**: radius 3px, spacing 4/6/9/12/16/22px, two voices on screen
  and never three. **Safe areas 62px top / 34px bottom; tap targets
  never below 44px** — `min-height`, with weight controlled by padding,
  never by shrinking the box.
- ⚠ **jsdom has no layout and substitutes no `var()`.** Every claim
  about wrapping, overflow, safe areas, tap-target size or a resolved
  colour is **e2e-only**. B's `＋ widget` menu overflowed the viewport
  and made the whole page scroll sideways, and the entire unit suite was
  blind to it — assume the same of every geometric claim here.
- **Test cadence**: the client suite for the mid-build loop; the full
  suite **once** before the MR. ⚠⚠ **Never run the full suite while the
  dev stack is up, never two at once, and always bound the workers**
  (`--maxWorkers=3 --minWorkers=1`) — the unbounded pool plus a running
  dev stack exhausted the box during B's sweep.
- **Worktree discipline**: stage by name, never `git add -A`; push every
  turn; merge only through the GitLab MR.

## Acceptance criteria

**The bar**

- Below the breakpoint the bar renders two rows; above it, B's single
  row is unchanged and a test asserts the desktop composition did not
  move.
- Row one renders seal, connection and identity, and survives an **empty
  `cockpit.shelf`** — asserted from the state a player can actually
  reach.
- Row two renders the **first three** rows of `cockpit.shelf`, in shelf
  order, and fewer when the shelf is shorter.
- ⚠ No notification bell is rendered, hatched or placeholdered, and a
  test asserts its absence — the mobile twin of B's guard.
- `ViewsMenu` and the settings affordance are reachable on mobile.

**The pull-down**

- The grab discloses the full catalogue two-up, in the same order as
  desktop, every row through `Figure`.
- Hatched rows carry their reason as **visible text** at this size, and
  a test asserts no digit appears in any of them.
- ⚠ Verified by **driving a browser**: the pull-down overlays the feed
  rather than displacing it, and neither it nor the shelf screen causes
  the page to scroll sideways at 390px and 320px.

**The glance-line and reordering**

- The new `cockpit shelf` action moves a row to the front, persists to
  `cockpit.shelf`, and **survives a reload** — driven, as B's pin was.
- An unknown row refuses in the machine voice naming the known rows.
- Reordering changes what the bar shows without any second key existing;
  a test asserts no client-side glance list is stored.
- The shelf-choosing screen sends `cockpit shelf …` on every affordance
  and mutates nothing locally.

**The command sheet**

- Tapping an affordance opens a sheet naming the **verbatim** command;
  confirming sends exactly that string, and a test asserts sheet-text
  equals sent-command.
- ⚠ Verified by **driving a browser**: tap → sheet → confirm → the
  server's own echo carries the identical string.
- ⚠⚠ B's one-preview-surface guard passes unmodified, and a test
  asserts the sheet does not read `ghostPreview`.
- No status bar renders below the breakpoint; exactly one renders above
  it.

**Dropped and waiting**

- `reconnecting` and `dropped` claim the entire first row.
- The retry countdown renders as a **live** figure from the real backoff
  delay, and a test drives the schedule rather than asserting a
  constant.
- ⭐ The bar states that commands sent now will not arrive, and a test
  asserts **no "held" count is rendered** — the queue is a non-goal and
  its absence must not read as a promise.
- Time-since-last-frame renders, and is `empty` with a reason when no
  frame has arrived yet.
- The manual retry affordance sends through the existing reconnect path.
- ⚠ The three frozen reconnect files show **zero diffs**.

**Round trip**

- A completed ping/pong yields a **live** round-trip figure in both the
  mobile bar and the desktop connection popover.
- Before the first round-trip it is `empty` with a reason — never zero.
- ⚠ B's inaccurate hatch reason ("needs a ping/pong") no longer appears
  anywhere in the codebase.
- Frames-behind remains hatched, with a reason that names what is
  actually missing (a server sequence number).

**Docs**

- `docs/subsystems/client-shell.md` updated: the mobile bar, the
  pull-down, the command sheet, the dropped-state contract, and the
  server-owns-content / viewport-owns-disclosure rule.
- `docs/subsystems/cockpit.md` updated: the new `cockpit shelf` action
  and the glance-line's relationship to shelf order.
- The held-commands queue recorded as a **cut with a named reason** in
  the slate, so 6D is not later read as an unmet promise.
- `docs/slates/builds/client-slate.md` § 7.1 records Build C shipped and
  Wave 1 closed.

## Cross-references

**Seeding slate** — [client-slate](../slates/builds/client-slate.md)
(§ 3.5 the command line is never silent, § 3.6 mobile is not desktop
with a narrower column, § 7.1 the Wave 1 cut)

**Design surface** — `docs/design_handoff/`: `Global Chrome -
Mobile.dc.html` (6A–6D), `CONVENTIONS.md`, `DESIGN-SYSTEM.md`

**Subsystem docs** —
[client-shell.md](../subsystems/client-shell.md) (the top bar, the
widget shelf, the status bar, the connection popover — all of B, which
this inverts),
[cockpit.md](../subsystems/cockpit.md) (`cockpit shelf`, the clientState
keyspace),
[mql-subscription.md](../subsystems/mql-subscription.md) (the `self`
pane the glance-line reads),
[message-rendering.md](../subsystems/message-rendering.md) (the civic
ground and token layer)

**Preceding build** — B honest chrome, shipped MR !186.
**Follow-on** — Wave 2 Arrival, which needs Wave 1 closed.
