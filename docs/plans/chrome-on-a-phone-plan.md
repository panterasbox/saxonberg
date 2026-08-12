# Chrome on a phone — implementation plan

Build C of three in client-rebuild Wave 1, and the build that closes it.
Read `docs/requirements/chrome-on-a-phone-requirements.md` in full first
— this plan is *how*, not *what*, and does not restate its decisions.
Five were settled with the user and are closed: **the held-commands
queue is cut**, **the notification bell is cut**, **the command sheet
confirms rather than previews**, **the glance-line is the head of the
shelf**, and **round-trip gets wired**.

Also read `CLAUDE.md` §§ Worktrees, Module Categories, Export
discipline; and `docs/subsystems/client-shell.md` (all of it — this
build inverts every section B wrote), `cockpit.md` § `cockpit shelf`,
`docs/antipatterns.md` § *A test-only capability added to the BACKEND*.

Design surface (reference art, not diffable):
`Global Chrome - Mobile.dc.html` panels 6A–6D, `CONVENTIONS.md`,
`DESIGN-SYSTEM.md`.

---

## Grounding (facts established by investigation — do not re-verify)

### The connection seams

| Fact | Detail |
|---|---|
| `ConnectionState` | `@saxonberg/types` — `link`, `isConnected`, `socketId`, `sessionId`, `error`, and B's optional `connectedAt?`. |
| ⚠ `connectionLink.test.ts:10-16` | Builds a **complete `ConnectionState` literal** and omits `connectedAt` — which compiles *only* because it is optional. **Every field this build adds must be optional too**, or the frozen test fails under `build:types` while passing `vitest`. |
| `setDisconnected` | `store/index.ts:277` — `(error?: string, link?: 'reconnecting'\|'dropped') => void`. Both params optional; the frozen websocket test calls it with 0–2 args, so a **third optional param is backward-compatible**. |
| Backoff | `websocket.ts:903 attemptReconnect()` computes `min(max, base · 2^n)` → 1·2·4·8·16·30·30s, then **discards it into a bare `setTimeout`**. The store only ever learns `link`. |
| ⭐ Ping/pong | **Already exists end to end.** `websocket.ts:371 sendPing()` sends `{timestamp}`; `backend/inbound/ping.ts` replies `pong` with a server timestamp. **`sendPing()` is never called and no client handler exists for `pong`.** There is no `setInterval` anywhere in the service. |
| `Frame.timestamp` | `store/index.ts:195` — every frame carries epoch ms, so *time since last frame* is derivable. Frames live at `store.frames` (`:502`). |

### The client as it stands

| Fact | Detail |
|---|---|
| `Frame` | `components/frame/Frame.tsx` — rendered **once**, in `App.tsx`, above the layout registry. Composes `Seal · ConnectionChip · AccountMenu · Shelf · ViewsMenu · Settings`. |
| `StatusBar` | Two render sites: `App.tsx` (in-world) and `CharGenStage.tsx`. Mutually exclusive phases. |
| ⚠ Breakpoints today | **Ad-hoc and inconsistent** — `CharGenStage.tsx` alone uses `640px` (×2) and `520px`. Nothing named, no hook, no `matchMedia` anywhere. |
| ⚠ `index.html:5` | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — **no `viewport-fit=cover`**, so `env(safe-area-inset-*)` resolves to `0px` and the requirements' 62/34 safe areas would silently do nothing. |
| Affordance clicks | `MmlRenderer` `ClickableSpan` calls `ctx.onCommandClick(cmd)` directly; `App.handleCommandClick` sends and flashes. The renderer knows nothing about viewport. |
| `cockpit shelf` | `CockpitShelfController` — positional `action`/`row`, `SHELF_ACTIONS = ['list','pin','unpin']`, refusals naming the known set. YAML already declares both slots, so a fourth action needs **no new arg**. |
| `tokens` | `radius` / `rail` / `ratio` are the existing non-colour scale keys — a `breakpoint` key fits the same shape. |

---

## Decisions

### D1 — A named breakpoint and a `useIsCompact()` hook; a JS switch, not CSS-only

`tokens.breakpoint.compact = '760px'` plus
`hooks/useIsCompact.ts` wrapping `matchMedia`.

**Why a JS switch rather than pure CSS.** The mobile bar is not a
reflow of the desktop bar — it is a different composition (two rows, a
pull-down, no status bar). CSS-only means **rendering both and hiding
one**, which puts two `StatusBar`s in the DOM and makes the
requirements' *"exactly one renders above the breakpoint"* unassertable
— the DOM would always hold two. A hook lets the unwanted half not
exist.

⚠ The hook must subscribe to `matchMedia` change events, not read once:
a desktop window dragged narrow is the cheapest way to test this build,
and a one-shot read would make that not work.

⚠ **One named constant, replacing nothing.** `CharGenStage`'s three
ad-hoc breakpoints are **left alone** — they are Wave 2's surface and
retuning intake layout is not this build's job. The constant is for new
chrome; a sweep can unify later.

### D2 — Every new `ConnectionState` field is OPTIONAL

```ts
  /** Round-trip ms from the last completed ping/pong. Absent until one lands. */
  roundTripMs?: number;
  /** Epoch ms the next reconnect attempt fires. Absent while connected. */
  retryAt?: number;
```

This is B's `connectedAt` lesson applied verbatim, and it is not
stylistic: `connectionLink.test.ts` builds a **complete literal**, so a
required field breaks a frozen test under `build:types` while still
passing `vitest` — the worst failure shape there is. It is also honest
twice over: there is no round-trip before the first pong, and no next
attempt while connected.

### D3 — The ping is a service-owned heartbeat, not a component effect

`WebSocketClient` starts a `setInterval` on `connection-established` and
clears it on close/error. **10s cadence**, plus **one immediately on
connect** so the first figure lands without a ten-second hole.

**Why the service and not the popover.** A component-owned ping would
only measure while the popover is open, so the mobile bar (which shows
the figure at rest) would have nothing, and the desktop popover would
show a number that only exists because you were looking at it. The
socket owns its own health.

The `pong` handler computes `Date.now() - payload.timestamp`… ⚠ **no**:
`inbound/ping.ts` replies with the *server's* timestamp, not the
client's. So the client must remember its own send time and subtract on
receipt. **This is the one place the existing protocol is not quite
enough**, and it is a client-side bookkeeping fix, not a protocol
change — see **F3**.

⭐ **And B's wrong reason is deleted**, not edited around:
`ConnectionChip`'s *"nothing measures it — needs a ping/pong"* comes out
of the source, the test that asserts it, and `client-shell.md`. Leaving
it while shipping the measurement would be worse than the original
error.

### D4 — `setDisconnected` gains an optional third param

```ts
setDisconnected(error?: string, link?: 'reconnecting' | 'dropped', retryAt?: number)
```

`attemptReconnect` already knows `delay`; it passes `Date.now() + delay`.
A third optional param keeps every existing call site — including the
frozen websocket test's — compiling and behaving identically. A separate
store action would also work and was rejected: it splits one transition
across two calls, and a caller that forgot the second would leave a
stale countdown ticking against a connection that is already back.

⚠ **The backoff schedule itself does not change.** This build only
reports it. If a reconnect test needs modifying, behaviour moved.

### D5 — The command sheet intercepts at `App`, so `MmlRenderer` is untouched

`App.handleCommandClick` becomes viewport-aware: below the breakpoint it
**opens the sheet** instead of sending; the sheet's confirm calls the
same send path.

Every affordance in the tree — transcript tags, shelf menu entries,
`ViewsMenu`, future panes — routes through that one handler, so this is
**one interception point for the whole app** rather than a prop threaded
into every renderer. `MmlRenderer`, `EntityName` and `Shelf` need no
changes at all.

The sheet's state is its own slice (`commandSheet: {command} | null`),
**not** `ghostPreview`. B's guard asserts exactly one module reads
`ghostPreview`; the sheet reading it would trip the guard *and* conflate
"what a tap will send, pending confirmation" with "what a hover would
send". The guard catching that would be correct behaviour.

⚠ The sheet shows **one** command, because that is what an affordance
affords today — `commandFor(node)` returns a single string.

### D6 — The glance-line is `cockpit.shelf.slice(0, 3)`

A client constant `GLANCE_ROWS = 3`, because the server does not know
how wide a bar is. Fewer than three pinned simply shows fewer. No new
key, no second list — the requirements' load-bearing decision.

### D7 — `cockpit shelf first <row>` is the reorder action

A fourth entry in `SHELF_ACTIONS`, dispatched from the **existing**
positional slots, so the YAML gains only help text and an example. It
moves the row to index 0, pinning it first if it was not pinned —
because "put this on my bar" is one intention, and making a player type
`pin` then `first` would be two commands for one thought.

Naming: `first` over `promote`/`move`, because it says the resulting
state rather than the operation, and it reads correctly in the machine
voice — *`coin` moved to the front of the shelf*.

### D8 — `CharGenStage` keeps its `StatusBar`, untouched

The viewport switch applies to the **in-world** chrome only. Mobile
intake is Wave 2 and has its own art (`Arrival - Mobile.dc.html`);
touching char-gen's layout here would be building half of that wave
blind. So the "no status bar below the breakpoint" claim is scoped to
the in-world phase, which is where the command sheet exists to replace
it. See **F1**.

### D9 — `viewport-fit=cover` is part of the build

Without it `env(safe-area-inset-*)` is `0px` and the 62/34 safe areas
are dead CSS that looks implemented. One attribute in `index.html`, and
the reason it is a decision rather than a detail is that **the failure
is silent** — the padding renders, just always to zero.

### D10 — One MR, phases server-first, dropped-state last

The dropped state depends on Phase 2's `retryAt`; the bar depends on the
viewport seam; the sheet depends on nothing but is easier to drive once
a mobile bar exists to drive it in.

---

## Phase 1 — `cockpit shelf first`

The only server work, and it unblocks the glance-line's whole story.

**Files** — `CockpitShelfController.ts` (a `first` branch + `SHELF_ACTIONS`),
`cmd/shell/cockpit.yaml` (help + example), `CockpitController.ts` (no
change — the report already counts pinned rows).

**Tests** — `CockpitShelfController.test.ts`: `first` moves a pinned row
to index 0; `first` on an *unpinned* row pins it at the front; `first`
on a row already first is a no-op that does not duplicate; an unknown
row refuses naming the known set; the action appears in the refusal's
known-action list. And `cockpit-verb.test.ts` — ⚠ **no edit needed**,
because the subcommand set is unchanged; only the *action* vocabulary
grew, and that lives in the controller.

```
pnpm --filter @saxonberg/server test src/mud/obj/command/shell/__tests__
```
`git commit`: `feat(server): cockpit shelf first — the shelf gains an order`

---

## Phase 2 — What the connection actually knows

Round-trip and the retry countdown together: both are *expose what
exists*, both touch `ConnectionState`, and both improve desktop.

**Files** — `packages/types` (`roundTripMs?`, `retryAt?` per **D2**);
`websocket.ts` (ping heartbeat per **D3**, `pong` handler, send-time
bookkeeping, `attemptReconnect` passing `retryAt`); `store/index.ts`
(`setDisconnected`'s third param, clearing both fields on connect);
`ConnectionChip.tsx` (round-trip becomes `live`; ⭐ **the wrong reason
deleted**).

**Tests** — a pong yields a `roundTripMs`; before any pong the figure is
`empty` **with a reason, never 0**; `retryAt` populates on a reconnect
attempt and clears on connect; ⭐ a guard asserting the string
`needs a ping/pong` appears **nowhere** in `packages/client/src`.
⚠ `ConnectionChip.test.ts:132` currently asserts that reason — it is
**edited**, and that is the point of the phase.

⚠⚠ **The three frozen files must show zero diffs.** Verify with
`git diff origin/master --stat` on them before committing.

```
pnpm --filter @saxonberg/client test && pnpm --filter @saxonberg/client build:types
```
`git commit`: `feat(client): measure the round trip, and report the retry`

---

## Phase 3 — The viewport seam and the mobile bar

**Files** — `tokens.ts` (`breakpoint.compact`); **new**
`hooks/useIsCompact.ts`; **new** `components/frame/MobileFrame.tsx`
(two rows: fixed facts, then glance-line + grab); `App.tsx` (choose
`Frame` or `MobileFrame`; skip `StatusBar` below the breakpoint);
`index.html` (`viewport-fit=cover`).

`MobileFrame` **reuses** `Seal`, `ConnectionChip` and `AccountMenu`
unchanged — the fixed facts are the same components, not mobile copies.
⚠ `ViewsMenu` + Settings move **into `AccountMenu`'s dropdown** on
mobile.

**Tests** — below the breakpoint the mobile bar renders and `Frame` does
not (and vice versa); row one survives an **empty** `cockpit.shelf`; row
two renders `slice(0,3)` in shelf order, and fewer when shorter;
⚠ **no notification bell**, asserted by name — the mobile twin of B's
guard; no `StatusBar` in the in-world tree below the breakpoint, exactly
one above.

`git commit`: `feat(client): the mobile bar — two fixed facts and a glance-line`

---

## Phase 4 — The pull-down and the shelf screen

**Files** — **new** `components/frame/ShelfPullDown.tsx` (the full
catalogue two-up, `Figure variant="card"`, overlaying the feed); **new**
`components/frame/ShelfScreen.tsx` (6C — the glance-line section above
the full catalogue with each row's state and reason).

Both reuse `SHELF_CATALOGUE` and `HATCH_COPY` from `Shelf.tsx` — ⚠ so
those two move to a shared module (or `Shelf.tsx` exports them, which it
already does). **The catalogue must not be duplicated**; two copies of
the hatch reasons is exactly the decay B's category table prevents.

**Tests** — the pull-down renders all nine in shelf order; hatched rows
show reasons as **visible text** and contain **no digit**; every
affordance dispatches `cockpit shelf …` and mutates nothing locally;
⚠ the shelf screen offers no `identity`/`connection` row.

`git commit`: `feat(client): the shelf pull-down, and choosing what rides the bar`

---

## Phase 5 — The command sheet

**Files** — `store/index.ts` (`commandSheet` slice); **new**
`components/frame/CommandSheet.tsx`; `App.tsx` (`handleCommandClick`
intercepts below the breakpoint).

**Tests** — below the breakpoint a click opens the sheet and sends
**nothing**; confirming sends the **verbatim** string; dismissing sends
nothing; above the breakpoint the click sends directly and no sheet
opens; ⚠⚠ B's one-preview-surface guard passes **unmodified**, plus a
new assertion that `CommandSheet.tsx` does not read `ghostPreview`.

`git commit`: `feat(client): the command sheet — a tap names its command before it sends`

---

## Phase 6 — Dropped, and waiting

**Files** — **new** `components/frame/DroppedRow.tsx`; `MobileFrame.tsx`
(row one yields to it when `link !== 'connected'`).

Reports: the link state, the retry countdown (**live**, from Phase 2's
`retryAt`), a manual retry affordance on the existing reconnect path,
time since the last frame, and ⭐ **that commands sent now will not
arrive**.

**Tests** — the row replaces the fixed facts on `reconnecting` and
`dropped`; the countdown is live and **derived**, not a constant;
⭐ **no "held" count is rendered** — a test asserting the absence of
`/held|queued|saved/i`, because the queue is a non-goal and its absence
must not read as a promise; time-since-last-frame is `empty` with a
reason when no frame has arrived.

`git commit`: `feat(client): the dropped row — what is true, not what is comforting`

---

## Phase 7 — Driven, not just green

⚠ jsdom has **no layout and no `var()`**, so every geometric and colour
claim here is e2e-only — B's `＋ widget` menu overflowed the viewport
and the entire unit suite was blind to it.

**`e2e/tests/mobile-chrome.spec.ts`**, at a real phone viewport
(390×844, and 320px for the narrow case):

```
the bar is two rows; the glance-line holds three
the pull-down overlays the feed and does not scroll the page sideways
neither the pull-down nor the shelf screen overflows at 320px
cockpit shelf first coin  → coin heads the glance-line, and SURVIVES A RELOAD
tap an affordance → sheet names the command → confirm →
    the SERVER's echo carries the identical string
kill the socket → the first row is claimed → a countdown, and no "held" count
round trip renders a real number within a few seconds of connecting
safe-area padding is non-zero under an emulated notch
```

`git commit`: `test(e2e): drive the phone chrome`

---

## Phase 8 — Docs

- **`client-shell.md`** — the mobile bar, the pull-down, the shelf
  screen, the command sheet, the dropped-state contract, and § **the
  server owns what is shown; the viewport owns how it is disclosed**.
  ⭐ Correct the round-trip entry in § The connection popover — it now
  reports a real figure, and the old reason was wrong.
- **`cockpit.md`** — `cockpit shelf first`, and the glance-line's
  relationship to shelf order.
- **`client-slate.md` § 7.1** — Build C shipped, **Wave 1 closed**; and
  the held-commands queue recorded as a cut with its reason, so 6D is
  not later read as an unmet promise.
- **Not touched**: `CLAUDE.md`, `roadmap.md`, `launch-worklist.md`
  (index files — swept, not raced).

`git commit`: `docs(client-shell): chrome on a phone`

---

## Test cadence

```bash
pnpm --filter @saxonberg/client test           # the mid-build loop
pnpm --filter @saxonberg/client build:types    # ⚠ the REAL typecheck; vite does not
pnpm --filter @saxonberg/types build           # after any types edit
```

⚠⚠ **Before the MR, once — and never concurrently.** Kill the dev stack
first (`pnpm dev:clean`), then:

```bash
cd packages/server && npx vitest run --maxWorkers=3 --minWorkers=1
pnpm --filter @saxonberg/client test
pnpm lint
```

The unbounded pool plus a running dev stack **exhausted the box during
B's sweep**. Bring dev up only for e2e, and take it down afterwards.

---

## ⚠ Flags — underspecified, or worth a nod before building

| # | Flag | Recommendation |
|---|---|---|
| **F1** | **"No status bar below the breakpoint" vs char-gen.** `CharGenStage` renders one, and mobile intake is Wave 2. Scoping the claim to the in-world phase leaves a phone in char-gen with a preview surface it cannot use (no hover) and no sheet. | **D8** — leave char-gen alone and scope the AC to in-world. The alternative is building half of Wave 2's mobile Arrival blind. Confirm the AC's rewording. |
| **F2** | ⭐ **Does a single-affordance tap deserve a confirm step?** The sheet turns desktop's one click into two taps. For an unambiguous `look anvil` that is friction. | Keep the sheet for **every** affordance. The extra tap IS the axiom (§3.5's pedagogical dividend — clicks teach the command line), and a rule with an exception for "obvious" cases is a rule nobody can predict. ⚠ But this is the most user-visible interaction decision in the build and deserves an explicit nod. |
| **F3** | ⚠ **`pong` returns the SERVER's timestamp, not the client's.** So RTT needs the client to remember its own send time; the protocol as written cannot round-trip the client clock. | Client-side bookkeeping (`#lastPingSentAt`), **not** a protocol change. Echoing the client timestamp back would be tidier and is a one-line server change — flagged because touching `inbound/ping.ts` is server work inside a client build, and B's precedent says say so out loud rather than slip it in. |
| **F4** | **The pull-down's gesture.** A real drag (velocity, rubber-banding, partial states) is a large surface. | **Tap the grab to toggle**, plus a simple downward-drag-to-open if it falls out cheaply. A full gesture system is its own build; the art's "arrives when you drag" is satisfied by an animated disclosure. |
| **F5** | **Ping cadence and cost.** 10s × every connected client is real server traffic for a cosmetic figure. | 10s is a guess. It could be 30s, or only while the popover/pull-down is open — but see **D3** for why "only while looking" makes the figure dishonest. Worth a number from you. |
| **F6** | **The breakpoint value.** 760px is a guess sitting above phone landscape and below tablet portrait. | One constant to change. ⚠ It should not match `CharGenStage`'s ad-hoc 640/520 by accident — those are a different question and are deliberately left alone. |

**Not planned, deliberately:** no held-commands queue, no notification
bell, no new server module, no new backend test seam, no widened
sandbox, no gesture library, no second shelf catalogue.

---

## Critical files

- `packages/client/src/App.tsx` (the viewport switch + the click intercept)
- `packages/client/src/services/websocket.ts` (heartbeat, pong, retryAt)
- `packages/client/src/components/frame/` (the whole mobile surface)
- `packages/types/src/index.ts` (two optional fields)
- `packages/server/src/mud/obj/command/shell/CockpitShelfController.ts`
