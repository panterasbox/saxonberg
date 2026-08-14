# The play surface — implementation plan

Wave **4** of the client rebuild: the client half of the combined build
whose server half is [record-layer-plan](./record-layer-plan.md). Read
[play-surface-requirements](../requirements/play-surface-requirements.md)
first — this is *how*, not *what*, and it does not restate its
decisions.

Also read `CLAUDE.md` §§ Worktrees, Module Categories, Export
discipline, Go Through the API Layer; and
[cockpit.md](../subsystems/cockpit.md),
[mql-subscription.md](../subsystems/mql-subscription.md),
[inspection-pane.md](../subsystems/inspection-pane.md),
[command-routing.md](../subsystems/command-routing.md),
[prompt.md](../subsystems/prompt.md), [topics.md](../subsystems/topics.md).

Design surface — **rendered, not read as text**, 2026-08-14:
`Play Surface - General`, `Explore - Two Feeds`, `Feed Routing`,
`Filters and Search`, `Prompt System`, `Mixin-Derived Affordances`,
`Mobile - Live Client`. Layout facts below were seen, not inferred.

---

## ⭐⭐ Grounding — the wave is far more client-side than the slate says

The slate calls Wave 4 "the biggest wave" and "the one that has to be
designed carefully rather than executed", written before S3 shipped.
**Investigation on 2026-08-14 found most of its hard server half already
built.** Do not re-derive this; do not rebuild it.

### Already shipped — server

| Thing | Where | State |
|---|---|---|
| `PaneHold` vocabulary (`unanswered`/`here`/`present`/`inReach`/`carried`) + `PANE_HOLDS` | `@saxonberg/types` | on the wire |
| `holdSubject` (the pending prompt id) and `holdAnchor` (the container for `here`) | `MqlSubscriptionRegistry` | built |
| **Hold evaluation and release** — `evaluateHold`, `emitReleased`, the `mql-subscription-released` frame with a reason | `obj/MqlSubscriptionRegistry.ts` | built |
| `HOLD_WAKES_ON` — each hold declares what dependency wakes it | same | built, and its lesson is recorded |
| **Pin/dismiss override in both directions** (`true` keeps a lapsed pane, `false` drops a held one, `null` = the condition decides), applied on the drain rather than inline | same | built |
| `PaneDefinition` with `query`/`cardinality`/`fields`/`hold`/`focusDependent`/`locationDependent`; server-owned MQL | `lib/connection/Panes.ts` | built |
| **`CommandApi.resolveAffordances(target, viewer)`** → `{ verbs: AffordanceEntry[], composition: string[] }`, each verb carrying `state: 'enabled' \| 'disabled' \| 'pending-operand'`, the validator's **verbatim reason**, and the field a `pending-operand` still needs | `api/command.ts` | built |
| `PromptApi.renderPromptRefresh` — renders `prompt.format` **server-side** into a `PromptRefreshNote` | `api/prompt.ts` | built |
| The five facets the filter panel needs | S2 topic corpus | built |

⭐ **`composition` is on the resolver, deliberately** — "so the menu can
label and group without a second round trip", and it is the **active**
composition (augments, implants, innates, on-shift conferral), which is
exactly why the `mx` digest was cut. The radial needs no MML change.

### Not built — and this is the wave

- **The client consumes none of it.** Nothing reads
  `mql-subscription-released`; `InspectionPane.tsx` is still one slot.
- No routing table, no facet filter panel, no radial, no prompt queue.
- No mobile shell for any of the above.
- The frame store, `recall`, the wipe — the record-layer half.

**Consequence for sequencing:** the client work leads here, unlike
Arrival. The server tasks that remain are small and named per phase.

---

## Phases

The record-layer plan's seven phases run first (its own ordering
stands). What follows is the client half. Each phase ends somewhere
demonstrable.

## Phase A — The pane feed replaces the single slot

The spine of the wave; everything else hangs off it.

`InspectionPane`'s one focus slot becomes a **feed of pane cards**,
newest→oldest, fed by the subscription events the server already emits.

**Client work**
- Store: a keyed pane collection, `opened` / `updated` / `released`
  reducers over the existing subscription frames. A released pane leaves
  with its reason; a pinned one does not leave at all.
- `PaneCard` — the shared skeleton every kind uses:
  `KIND` (mono, dim) · **name** (serif) · hold reason right-aligned
  (*"held · owes a reply"*) · pin glyph.
- Column header: `PANES  newest → oldest` with `N pinned` right-aligned.
  ⚠ `N` is counted from the pinned set, never tracked separately.
- Pin/unpin sends the real override command; it does not mutate locally.

**Server work** — none, beyond what phase B's catalogue rows add.

**Tests.** ⭐ Not "a released event removes a card" but *a pane held by
`present` disappears when its subject leaves, and one held by
`unanswered` does not* — driven through a state change, not a hand
refresh. That is the `pane-holds-need-their-wake` lesson: eleven green
tests once missed an immortal pane because all of them hand-refreshed.

## Phase B — The four pane bodies, and their catalogue rows

One `PaneCard` skeleton, four bodies. **Each new pane gets its
`Panes.ts` row in this phase** — `Panes.ts` states the rule that a row
exists for a pane the client actually opens, and this is the wave that
opens them. The record layer's feasibility survey (its phase 6) is the
input; if the survey says MQL cannot answer one, that is a finding, not
a blocker to route around.

| Kind | Body, as rendered |
|---|---|
| `FORM` | question in serif; reply options as **command buttons** (`reply axle`, `reply rim`, `reply both`); a red primary; the note *"unanswered forms pin themselves"* |
| `AGENT` | mixin chips + overflow count (`Vocal` `Employed` `Mobile` `+11`); measured label/value rows (Trade · Bearing · Hiring); action buttons (`talk tomas`, `look tomas`) |
| `INSTRUMENT` | mixin chips (`+8`); one large reading `1240 °C` with `in window` right-aligned; a gauge bar showing the window; caption `working 1150–1300 · via pyrometer` |
| `PLACE` | mixin chips (`+6`); `WAYS OUT` as exit buttons (`go north`); `HERE` as a contents list, each row carrying its own reading |

⚠ **Every value in these bodies goes through `Figure`.** The readings,
the counts, the gauge — a hatched instrument is a normal state, and a
pane that invents a number is the defect the whole convention exists to
prevent.

⚠ The mixin chip row **truncates with a count**. It teaches the
composition palette; it is not a manifest.

## Phase C — The affordance radial

Pure client. `resolveAffordances` already answers.

- **Fixed category geometry**: perception north, manipulation east,
  social west, movement south. ⚠⚠ *The geometry must not reflow to fit
  the available verbs* — muscle memory across objects is the entire
  point, and a menu that reflows has none.
- Centre chip names the object and its composition count
  (*"cast-iron anvil · thing · 6 mixins"*).
- `disabled` verbs render **dimmed with the validator's verbatim
  reason** (*"54.4 kg — too heavy to lift"*).
- `pending-operand` opens the right prompt rather than guessing — the
  entry names the field.
- Cache per `stuff-id`: a cold radial waits one round trip, warm opens
  are instant.
- ⚠⚠ **No `mx` attribute, anywhere.** Add a source-scan assertion, the
  way the retired-tag scan works — the mock shows one and it was cut.

## Phase D — Feed routing

- Four destinations: World, Attention, Channels, Diagnostics — each with
  its own frame list and **its own derived count**.
- The rule table: ordered, first-match-wins, each row a predicate over
  the envelope + a destination + `MOVE` / `COPY`, with a match count.
- ⚠⚠ **The catch-all is undeletable and says why**, in the UI, where
  the rule is: *every frame must land somewhere; without one a mistyped
  predicate silently drops output, and in a world where a frame can be
  "you are on fire", a lost message is not a cosmetic bug.*
- `MOVE` stops; `COPY` continues — which is how a tell reaches Attention
  *and* still lands in World. The legend ships with the table.

**Server work.** The predicate axes (`weight`, `topic`, `address`) must
resolve against the **shipped facet vocabulary**, not the art's. Verify
first; reconcile names in the plan, not in the component. Routing
evaluation belongs server-side with the envelope, not in the client.

## Phase E — Filters as a standing facet predicate

- Presets: `Everything`, `Quiet`, `Only me`, `No diagnostics`.
- Three axes, each chip carrying a **count derived from the frames in
  view**: ADDRESS (`direct`/`personal`/`ambient`/`broadcast`), ACTOR
  (`self`/`person`/`world`/`system`), WEIGHT
  (`consequence`/`activity`/`chatter`/`diagnostic`).
- `open as its own terminal`, and `save this set`.
- Header: `SHOWING 9 of 9` — derived from the list beside it.

⭐ The panel's own note is the design rationale and should survive into
the code: *filters run on the topic facets, not on topic strings — so
"quiet" is one rule rather than a list of sixty paths that drifts every
time a topic is added.*

## Phase F — The prompt system

- **One slot, three occupants**: at rest the server-rendered
  `prompt.format`; a foreground prompt takes the slot; everything else
  waits above it.
- The **WAITING strip**: one card per queued prompt — kind badge
  (`CHOICE` / `MQL-MANY` / `COMPOSE`), title, **the command that is
  waiting** in gold mono, elapsed + state (`22m · background · waiting`).
- ⚠ **Failure is not dismissal** — `prompt-validation-failed` leaves the
  prompt alive and the answer intact. The UI must never clear it.
- ⚠⚠ **Two cancels, and they are different verbs.** The × on a prompt is
  `prompt-cancel` (this one); `prompt cancel` on the strip is the verb
  (all of them). **The button names the command that dies** — cancelling
  rejects the awaiting command with `PromptCancelledError`, so *"cancel"*
  alone is a lie about what it does.
- The `prompt.format` bar with its token chips (`{{ focus }}`,
  `{{ posture }}`, `{{ time }}`, `{{ hp }}`).
- `opts.body` prose stays in the terminal as a `world.prompt` frame
  carrying the `promptId`, visibly tied to the slot.

## Phase G — Mode switching opens the arrangement (server-side)

The requirements' D3. Switching mode resolves the saved arrangement
server-side and pushes the pane set; the client sends one command and
renders what arrives.

⚠ This is the one place the wave adds server behaviour rather than
consuming it: S3 shipped arrangements as **storage, not behaviour** —
nothing opens or closes a pane on recall, on either side. This phase is
that behaviour.

## Phase H — The phone

Not a reflow of the above; the rule is **interleave what is causally
related, switch what is independent**.

- **Feed switcher** — `World 1077` · `Attention 2` · `Channels 12` ·
  `Diag 118`, each tab carrying its count, horizontally scrollable.
- **Panes inline in the feed** as cards, in causal position — not a
  second column, not a drawer.
- **A pinned chip row** above the command bar (`⚲ The Yard`, `⚲ your pack`).
- **The left-behind card**: a frame routed to a feed you are not
  watching leaves a bordered card in the one you are, naming the
  destination and offering `open Attention` / `reply here`.
- **The prompt sheet**: kind badge, `ASKED BY <command>` + elapsed,
  options as buttons with right-hand annotations, a red primary, and the
  footnote *"Cancelling abandons `true rim` — not just this card."*
- **Routing as a settings screen** with `+ add a rule` and
  `from a frame…` — the envelope picker, because tapping fields beats
  typing a predicate on glass.
- ⚠⚠ **Copy-to-Attention ships ON by default on a phone**, and turning
  it off states the cost. On desktop it is a convenience; here it is the
  safety net, because World may not be the feed you are looking at.

⚠ Re-check the ICB trap at 390px: a fixed-width pane inside an
overflowing document widens the initial containing block and pushes
`position: fixed` chrome off-screen. Real browser, `isMobile: true`.

## Phase I — Drive it, then re-render the mocks

⭐ Driven at both form factors before it is called done — the last three
builds each found defects this way that a green suite could not see.
Then **re-render the seven reference screens and compare by eye**, the
§ 7.15 method rule, at the END as well as the start.

## Phase J — Docs

`inspection-pane.md` (the slot becomes a feed), `mql-subscription.md`
(holds are consumed; the survey table), `cockpit.md` (arrangements gain
behaviour), `command-routing.md` (the radial's client half),
`prompt.md`, `client-shell.md`, and the slate's § 7 wave table.

---

## ⚠ Flags

1. **The `mx` digest is CUT.** The affordances mock shows
   `<thing mx="…">` as "layer 1". It does not exist and must not be
   built — client-slate § *Why the `mx` digest was cut*. Composition
   rides the resolver.
2. **The art's facet names may not equal the shipped ones.** The filter
   panel and the routing predicates both assume `address` / `actor` /
   `weight`. S2 shipped the taxonomy *after* the art. Verify before
   building either phase; reconcile in the plan.
3. **Hold evaluation exists — do not rewrite it.** The temptation is to
   build client-side hold logic because the client is where the panes
   render. The conditions are server-side facts; a client guessing at
   them is the same category error as a client guessing at affordances.
4. **`Panes.ts` rows belong to this wave, one per pane actually
   opened.** Not pre-added from the survey, and not sized to a mockup.
5. **Every count is derived.** `1,077`, `9 of 9`, `+11`, `0 pinned`, the
   per-rule and per-chip counts. A count beside a list is computed from
   that list — the rule the last sweep caught a test breaking.
6. **The command-line axiom binds hardest here.** Reactions were named
   as the place it most easily lapses, and this wave adds radial verbs,
   pane buttons, reply options, exit buttons, filter chips and routing
   rules — every one of them previews exactly what it sends.
7. **D2's behaviour change** (the client buffer becomes a cache) lands
   in the record-layer half and other waves depend on it. Flag it in the
   MR description, not only in a comment.
8. ⚠⚠ **The wipe's front-door copy fix ships in the same commit as the
   job.** A gap between them is a live lie on the front page.

---

## Critical files

| Area | Where |
|---|---|
| Pane feed store + card | `packages/client/src/components/InspectionPane.tsx` → a pane-feed module; `store/index.ts` |
| Pane bodies | new components beside it; `Figure` for every value |
| Catalogue rows | `packages/server/src/mud/lib/connection/Panes.ts` + `@saxonberg/types` `PANE_IDS` + `api/__tests__/pane-catalogue.test.ts` (three places, the test catches any two-of-three) |
| Radial | client; reads `CommandApi.resolveAffordances` |
| Routing | envelope-side server evaluation + a client rules table |
| Filters | client, over the shipped facets |
| Prompts | `components/` + the existing `PromptRefreshNote` |
| Arrangement → panes | `obj/MqlSubscriptionRegistry.ts`, the `cockpit` controller |
| Mobile | `useIsCompact`, the frame components, `CommandSheet` |
