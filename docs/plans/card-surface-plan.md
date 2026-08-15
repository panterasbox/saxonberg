# The card surface — implementation plan

**Scope:** [card-surface-requirements.md](../requirements/card-surface-requirements.md)
(closed, 13 decisions, 23 acceptance criteria). Branch
`build/card-surface` off `master`. One branch; the A → B → C
**sequence** inside it is a dependency order and is enforced by the
phase table below.

**Read first:** the requirements; `CLAUDE.md` (Module Categories, the
Api↔logic split, the lint family);
[inspection-pane.md](../subsystems/inspection-pane.md) (what exists
today); [cockpit.md](../subsystems/cockpit.md);
[client-shell.md](../subsystems/client-shell.md);
[mql-subscription.md](../subsystems/mql-subscription.md);
[residency.md](../subsystems/residency.md);
[shell-environment.md](../subsystems/shell-environment.md);
[testing.md](../testing.md).

---

## 0 · Findings that change the shape — read before phase 2

Six things the requirements assume that the tree contradicts. None
re-opens a decision; each is *how*, reported rather than silently
substituted.

**0.1 — The catalogue cannot be MQL-only.** Decision 7 says `who` /
`news` / `wiki` become "catalogue rows — a query, a default
pinned-ness, a liveness flag, a field set". MQL speaks **Stuff**. The
roster is `RosterRow[]` (`SocialApi`), releases are `Release` Documents
(`PressApi.recent`), a wiki page is a `WikiPagePayload`, help is a
`HelpTopic`, and CMS/git/studio are REST surfaces. `CardDefinition`
therefore needs a **source axis** — `mql` | `payload` | `client` — or
three of the ten shipped rows are unbuildable as written. This is the
single largest structural addition in the plan; everything else in
decision 7 stands unchanged.

**0.2 — `self`, `location` and `inspect` are not cards.** The pane
catalogue currently holds three chrome subscriptions. `inspect` and
`location` die with `InspectionPane.tsx` (decision 1 retires the focus
signal; the detail trail already lives on the card body in
`PaneBodies.tsx`). `self` survives as the widget shelf's subscription
and must **leave the card catalogue** — it has no pinned-ness and no
lifetime, and forcing it to declare them would make the required-fields
gate (AC 2) meaningless. It becomes `SHELF_SUBSCRIPTION` in the same
module, explicitly not a card.

**0.3 — ✅ VERIFIED: `examine` is a verb synonym, not an alias.**
`look.yaml` declares `verbs: [look, l, examine, exa]`. `expandAliases`
never sees it. The dedup row *`examine a` / `look a` → one card*
therefore needs **verb canonicalisation to `command.verbs[0]`** *in
addition to* `expandAliases` + `CommandLineApi.format()`. Both rungs,
or acceptance criterion 3 fails.

**0.4 — the sweep must be a clock, and that does not contradict
`inspection-pane.md`.** The doc's rule is that a **hold** must not ride
a timer, because a hold is a fact about the world and a clock and the
world disagree. A relevance window is a fact about **time**, which is
the husk-TTL argument (*"the one legitimate duration in the pane
model"*) generalised. The rule that survives is *there is exactly one
clock* — so the client's `window.setInterval` husk sweep in
`usePaneFeed` is **deleted** in the same phase the server sweep lands,
or the build ships two.

**0.5 — ✅ VERIFIED: `who` does not emit `shell.result`.**
`WhoController`'s `TOPIC` is `act.deed` ("identity-family self/social
readout — reuse, don't invent a topic"). The filter keyed on
`shell.result` (decision 10) would not catch it. Recommendation:
**retopic `who` to `shell.result`** — it is a structured command result
and the topic exists, so the comment's concern is satisfied. Phase 8
carries a per-card topic audit; any card whose prose frame is on
another topic is either retopic'd or recorded as deliberately
unfiltered.

**0.6 — `SHIPPED_ARRANGEMENT_PANES` is keyed by mode alone.**
Client-slate § 7.16 item 4 left this open because *"re-keying an empty
map is churn"*. This build fills it, so the churn argument expires:
`watch` ships two arrangements (`viewer`, `streamer`) and one list
cannot express them. Re-key to
`Record<CockpitMode, Record<string, readonly CardId[]>>` in phase 7.

**Also recorded, not a blocker:** dedup on the normalized command means
`look lamp` and `look brass lamp` are **two cards about one thing**.
That is decision 6 read literally and it is the right trade (identity
is what you typed); it is stated here so it is a knowing cost rather
than a bug report.

---

## 1 · Phases

Each phase is independently committable. Each states what it depends
on.

| # | Phase | Depends on | Commits |
|---|---|---|---|
| 1 | **The rename** — `pane` → `card`, all tiers, zero behaviour | — | 3 |
| 2 | **The card substrate** — catalogue, registry, two axes, dedup, the sweep | 1 | 2–3 |
| 3 | **The command→card seam** — `opens_card`, `CardApi.open`, the source guard | 2 | 1–2 |
| 4 | **The client feed consumes the mechanism** — new envelopes, store, wiring hoist | 2, 3 | 2 |
| 5 | **The switcher dies; who/news/wiki become cards** | 4 | 2 |
| 6 | **Named views over the card feed** | 4 | 1 |
| 7 | **Wave 7 — the authoring cards** | 5 | 2–3 |
| 8 | **The terminal filter + the form-factor override** | 4 | 2 |
| 9 | **The residue sweep** | 5 | 3–5 |
| 10 | **Docs + the driven verification** | all | 1–2 |

6, 7, 8 and 9 are independent of each other and may interleave freely.

---

## 2 · Phase 1 — the rename

**Non-negotiable: this lands first, in its own commits, before any
behaviour change.**

Measured on the tree (not the requirements' estimate): **1,968
occurrences of `pane` (excluding `panel`) across 134 files** — 72
server, 61 client, 1 types; **97 non-test files**; 8 YAML files; **657
doc hits**.

### 1a — `refactor(card): rename pane → card across types, server, client and tests`

Atomic, because `pane` is a **wire field** and the three packages must
agree. Mechanical apart from the three things called out below.

The mapping:

| From | To |
|---|---|
| `PaneId` / `PANE_IDS` | `CardId` / `CARD_IDS` |
| `PaneHold` / `PANE_HOLDS` | `CardHold` / `CARD_HOLDS` *(deleted in phase 2)* |
| `PaneReleaseReason` | `CardCloseReason` |
| `PaneDefinition` / `PANES` / `PANES_BY_NAME` | `CardDefinition` / `CARDS` / `CARDS_BY_NAME` |
| `lib/connection/Panes.ts` | `lib/connection/Cards.ts` |
| wire field `pane` (subscribe + result envelopes) | `card` |
| `setPanePinned` / `listPanes` / `applyArrangement(panes)` | `setCardPinned` / `listCards` / `applyArrangement(cards)` |
| `SHIPPED_ARRANGEMENT_PANES` | `SHIPPED_ARRANGEMENT_CARDS`; `ArrangementSpec.panes` → `.cards` |
| `paneFeedSlice.ts`, `PaneCardState`, `paneCards`, `openPaneCard`, `setPaneRecords`, `releasePane`, `closePaneCard`, `paneFeed`, `pinnedPaneCount`, `clearPanes` | `cardFeedSlice.ts`, `CardState`, `cards`, `openCard`, `setCardRecords`, `closeCard`, … |
| `usePaneFeed.ts` / `PaneFeed.tsx` / `PaneCard.tsx` / `PaneBodies.tsx` | `useCardFeed.ts` / `CardFeed.tsx` / `Card.tsx` / `CardBodies.tsx` |
| `PANE_KIND_BY_ID`, `PANE_LABEL`, `PaneKind` | `CARD_KIND_BY_ID`, `CARD_LABEL`, `CardKind` |

**Three things that are not mechanical:**

1. **`panel` must not be touched.** 146 `panel` + 56 `Panel`
   occurrences (`CmsGitPanel`, `StudioPanel`, `FacetFilterPanel`,
   `PanelNote`, `PanelHeading`). Use `grep -P 'pane(?!l)'`, never a
   bare `s/pane/card/`.
2. **`paneLastResult`, `paneBodyPainted`, `paneBreadcrumb*`,
   `paneDetailPath`, `paneDoorContext`, `paneFocusFragment`** belong to
   `InspectionPane` and are **deleted** in phase 4, not renamed. Rename
   them anyway in 1a (so 1a stays a pure rename and the tree compiles)
   and delete in phase 4; do not try to save a step by deleting early.
3. ⚠ **The panes that are not cards.** AC 18 admits no `pane`
   identifier in `src`, but `SettingsPane`, `SocialNotificationsPane`,
   `LivestreamPanes`, `CmsDiagnosticsPane`, `summonedPane` / `openPane`
   / `closePane`, `socialPaneOpen` are the **summoned-overlay tier**
   (cockpit.md § *The summoned-pane tier*), not feed cards. Renaming
   them to `*Card` would be a lie. **Decision the build makes and
   records:** they take the word already in use for a docked non-modal
   surface — `SettingsPanel`, `SocialNotificationsPanel`,
   `LivestreamPanels`, `CmsDiagnosticsPanel`, `summonedPanel` /
   `openPanel` / `closePanel`, `socialPanelOpen` — and cockpit.md's
   section becomes *The summoned-panel tier*. This is the one place the
   rename is a naming judgement rather than a substitution; it is
   called out here so a reviewer sees it as a decision.

`rightPane` / `setRightPane` are **deleted** in phase 5 with the
switcher; rename in 1a, delete there.

### 1b — `refactor(card): cockpit card, and the seeded controller`

Player-visible, so a reviewer reads it slowly rather than skimming it
as churn:

- `mud/cmd/shell/cockpit.yaml` — the `pane:` subcommand becomes
  `card:`; help text, the four usage lines and all three
  `examples[].cmd` rewritten. **`cockpit pane` must stop being
  accepted** (AC 18) — there is no alias.
- `obj/command/shell/CockpitPaneController.ts` →
  `CockpitCardController.ts`, and `model.paneId` → `model.cardId`; the
  "usage: cockpit card &lt;action&gt; &lt;card&gt;" and "no open card
  '&lt;id&gt;'" strings.
- `seeds/obj/command/shell/CockpitPaneController.yaml` →
  `CockpitCardController.yaml`. ⚠ **`SeederManager` is insert-only and
  `domain` is `keep` in `ResetPolicy`** — the old row survives forever
  and becomes exactly the *"stale rows warn every boot"* junk of
  residue item 8. The commit message carries the dev-DB step
  (`db.domain.deleteOne({path:
  '/obj/command/shell/CockpitPaneController'})`) and phase 9 closes the
  general case.
- `cmd/stream/watch.yaml`, `cmd/stream/tune.yaml`,
  `seeds/obj/Topic/shell.control.yaml`,
  `seeds/domain/eternal/duncan-hall/lobby.yaml`, `config/char-gen.yaml`,
  `seeds/obj/Discipline/melee-combat.yaml` — prose occurrences only.

**Gates to re-run after 1b:** `pnpm lint:instanceable` (the
controller's template path moved), `pnpm lint:gates` (any `FromModule`
naming the old module), `pnpm lint:topics`, `pnpm lint:module-scope`,
`pnpm lint:imports`.

### 1c — `docs(card): inspection-pane.md → card-surface.md`

`git mv docs/subsystems/inspection-pane.md
docs/subsystems/card-surface.md`, then the mechanical term swap across
657 doc hits. **The rewrite is phase 10** — 1c changes words, not
claims. CLAUDE.md's map line is **swept, not raced** (CLAUDE.md §
Worktrees rule 5): leave it to phase 10's doc commit.

### Tests

No new tests. `pnpm test` is **not** run for phase 1 alone —
`pnpm test:near` over `packages/server/src/mud/api/__tests__` and
`packages/client/src/components/panes/__tests__` plus `pnpm build` is
the gate. Test files rename with their subjects (`pane-holds.test.ts` →
`card-holds.test.ts` etc.); they are deleted or rewritten in phase 2, so
do not invest in them here.

---

## 3 · Phase 2 — the card substrate

**Depends on:** phase 1. **This is the load-bearing half; nothing after
it can start.**

### 2.1 The catalogue — `lib/connection/Cards.ts`

*Module category: **Named value-object / vocabulary / registry** in
`lib/<subsystem>/` — the existing home, renamed, not a new category.*

```ts
/** A card's content source. See plan finding 0.1. */
export type CardSource =
  | { kind: 'mql'; query: string; cardinality: 'one'|'many';
      fields: FieldSet|FieldAlias; subject?: 'required' }
  | { kind: 'payload'; producer: CardPayloadKind }   // roster | releases | wikiPage | helpTopic
  | { kind: 'client' };                              // the client fills it from its own transport

export interface CardDefinition {
  readonly label: string;
  readonly source: CardSource;
  /** ⚠ REQUIRED, both of them — AC 2. */
  readonly pinnedByDefault: boolean;
  readonly live: boolean;
  /**
   * The command that produces this card. It IS the dedup key for a
   * server-pushed card, and it is what `refresh` re-issues.
   * `<subject>` is filled from the subject's primaryKeyword at open.
   */
  readonly command: string;
  /** Declares this card cannot degrade to prose (decision 9). */
  readonly noProse?: boolean;
}

export const CARDS: Readonly<Record<CardId, CardDefinition>> = { … };
```

`Record<CardId, CardDefinition>` with **required** `pinnedByDefault` /
`live` is the `COLLECTION_POLICIES` trick: a new `CardId` without a
decision is a compile error (AC 2). A test asserts
`CARD_IDS.length === Object.keys(CARDS).length` **and** prints the
count (`expect(rows).toBe(N)`) — per testing.md, a guard that can pass
by matching nothing is not a guard.

The shipped rows:

| id | source | live | pinned | command | prose |
|---|---|---|---|---|---|
| `subject` | mql `$subject`, `detail`, subject required | ✗ | ✗ | `look <subject>` | `look` prose |
| `place` | mql `here`, `detail` | ✗ | ✓ | `look` | `look` prose |
| `who` | payload `roster` | ✗ | ✗ | `who` | `WhoController` (see 0.5) |
| `news` | payload `releases` | ✗ | ✗ | `press` | `PressController` |
| `wiki` | payload `wikiPage` | ✗ | ✗ | `wiki <slug>` | `WikiController` |
| `help` | payload `helpTopic` | ✗ | ✗ | `help <topic>` | `HelpController` |
| `prompt` | prompt (`promptId`) | n/a | ✓ auto-release | — | the prompt strip |
| `cms` | client | ✗ | ✓ | `cms` | `noProse` |
| `git` | client | ✗ | ✓ | `git` | `noProse` |
| `studio` | client | ✗ | ✓ | `studio` | `noProse` |

`SHELF_SUBSCRIPTION` (the `self` spec) sits in the same module under its
own name with a comment saying it is **not** a card (finding 0.2).

⚠ **`place` keeps its row and its key is `look`.** Nothing runs `look`
on arrival, so dropping it leaves an empty feed at login. Giving the
arrangement-pushed card the key of its own refresh command means bare
`look` **touches `place`** rather than minting a duplicate — which is
decisions 4 and 6 composed, and it retires the *"the focus card must
not FLASH"* special case structurally rather than by a duplicate check.

### 2.2 The card set — three files, three existing categories

| File | Category | Why |
|---|---|---|
| `mud/api/card.ts` — `CardApi` | **Api** | The gated forwarding shell; ends `SecurityApi.decorateApiClass(CardApi)` |
| `mud/obj/api/CardLogic.ts` | **Api logic singleton** | Registers at `/obj/api/card`; methods gated `FromModule('/api/card#CardApi')` |
| `mud/obj/CardRegistry.ts` | **Stuff class (instanceable → `obj/`)** | Holds the mutable per-Interactive card set so `CardLogic` stays hot-reloadable — exactly the `MqlSubscriptionRegistry` shape and rationale |

**The structural call, stated:** the card set does **not** live inside
`MqlSubscriptionRegistry`. `inspection-pane.md` argued *"the pane set IS
the existing subscription registry, and there is no second registry to
drift"* — that argument rested on every pane being a subscription. After
decision 3 most cards are static and prompt cards never were, so the
identity is broken and keeping them fused would put non-MQL state in the
MQL substrate. The drift risk moves to *card ↔ its subscription handle*,
and is closed by making the card **own** the handle:
`instanceId === subscriptionId`, every teardown goes through
`CardLogic.close`, and a test asserts zero orphan subscriptions after
closing every card. (Alternative recorded: fuse them anyway. Rejected
for the reason above.)

`CardState` (server):

```ts
interface CardState {
  interactive: Interactive;
  instanceId: string;      // server-minted; IS the subscription id when live
  cardId: CardId;
  key: string;             // the normalized command — the identity
  pinned: boolean;         // effective; catalogue default ⊕ player override
  openedAt: number;
  lastTouchedAt: number;   // the relevance window reads this
  takenAt: number;         // when the content was resolved — the honesty stamp
  subjectId?: string;
  promptId?: string;
  subscriptionId?: string; // live cards only
  lastResult: RecordValue[] | CardPayload;
}
```

`CardApi` surface: `open(ctx, cardId, opts)` ·
`push(interactive, cardId, opts)` (arrangement/login) ·
`touch(interactive, key)` · `setPinned(interactive, ref, pinned)` ·
`close(interactive, instanceId, reason)` · `list(interactive)` ·
`sweep()`.

### 2.3 Dedup and the key

`CardLogic.normalizeKey(ctx)`:

1. `ShellApi.expandAliases(parsed, giver)` — the player's own aliases
   (`expansion.expandedText` when present).
2. **Canonicalise the verb to `ctx.command.verbs[0]`** — finding 0.3,
   this is what makes `examine a` and `look a` one card.
3. `CommandLineApi.format(parsed)` — the round-trip canonical text.

`open` looks the key up in the interactive's set. Found → `touch`:
bring forward (unpinned only — **a pinned card holds its position**),
reset `lastTouchedAt`, re-resolve if static, emit `card-touched`. Not
found → mint.

Tests (table-driven, straight off decision 6): `who`/`who` → 1 ·
`who`/`who --wizards` → 2 · `look a`/`look b`/`look a` → 2 with `a` in
front · `examine a`/`look a` → 1. **Assert the composed key against the
parser**, never against a literal (testing.md check 1).

### 2.4 The sweep — where it lives, and why it is not a second clock

`CardRegistry.sweep()`, installed **once** by `CardLogic.boot()`
through `ScheduleApi.recurring` (never a bare `setInterval` — CLAUDE.md's
antipattern table), following `ResidencyLogic`'s installed-sweep shape:

```
for interactive, card in cardSet:
  if card.pinned: continue                    # pinned is the whole lifetime axis
  if now - card.lastTouchedAt < windowMs: continue
  close(card, 'aged-out')                     # → card-closed, which the husk renders
```

- **One sweep for the whole set, not a timer per card** (AC 8). A test
  asserts no `schedule`/`setTimeout` handle is created per card open.
- **Server-owned**, so `cockpit card list` and the client agree
  (decision 2).
- **The client's `window.setInterval` husk sweep is deleted in phase
  4** — see finding 0.4. A second clock is the failure, not the sweep.
- Window: one setting `cards.window` on the same schema tier as the
  other shell settings (default ~10 min), sweep cadence ~30 s. The
  cadence is not the window; a coarse sweep with a fine window is the
  residency shape.

### 2.5 Prompt cards

`CardApi.push(interactive, 'prompt', { promptId })` from the prompt
push path; the card opens **pinned**. `PromptLogic.cleanup` →
`MqlSubscriptionApi.notifyPromptSettled` gains a sibling call
`CardApi.notifyPromptSettled`, which closes the card with reason
**`answered`**. The body is **not** on the card: the client already
holds one prompt model (the prompt queue) and the card joins it by
`promptId` — one prompt model, and the feed reads it.

The `unanswered` hold, `holdSubject` and `HOLD_WAKES_ON` are
**deleted** — the guarantee moves onto the pinned axis exactly as
decision 2 says.

### 2.6 What phase 2 deletes from `MqlSubscriptionRegistry`

`hold` / `holdSubject` / `holdAnchor` / `pinned` / `paneId` /
`subjectId` on `SubscriptionState`; `evaluateHold`; `anySubject`;
`emitReleased`; `setCardPinned`; `emitPinState`; `applyArrangement`;
`listCards`; `HOLD_WAKES_ON`; `resolveSubject` **moves** to `CardLogic`
(with its perception-gate comment intact — that comment is load-bearing
security, not decoration). `notifyPromptSettled` stays only if a
subscription still needs it after the move; otherwise it goes too.

### Tests for phase 2

`packages/server/src/mud/api/__tests__/`:

- `card-catalogue.test.ts` — totality, required fields, count asserted.
- `card-identity.test.ts` — the dedup table (2.3).
- `card-lifetime.test.ts` — unpinned ages out **and the close carries a
  reason**; pinned does not; ordering (unpinned to front, pinned holds
  position).
- `card-sweep.test.ts` — one recurring handle, no per-card timer; drive
  the scheduler, never call `sweep()` by hand.
- `card-prompt.test.ts` — **settle the prompt and assert the card
  closed.** ⚠ **No `refresh*` / `drain*` helper anywhere in the file**
  (AC 5); a reviewer greps for one.
- `card-static-vs-live.test.ts` — a static card resolves once and stamps
  `takenAt`; a live card gets no refresh control and **is tested by
  performing the world change and asserting the consequence**
  (constraint § *derive-on-read*).
- `card-subscription-orphans.test.ts` — close every card, assert
  `_getRegistrySize() === 0`.

---

## 4 · Phase 3 — the command→card seam

**Depends on:** phase 2.

### The declaration

Command YAML gains `opens_card:` on the verb view and on a subcommand:

```yaml
verbs: [who]
controller: /obj/command/social/WhoController
opens_card: who
```

Validated in `CommandApi.validateCommandView` against `CARD_IDS` at
load, so a typo fails at boot rather than at runtime — the same posture
as the lint family. `opens_card` is a **view-level** declaration, not a
phase effect, so it does not go through `PhaseEffect`.

### The push

Always `CardApi.open(ctx, cardId, opts?)`, called **from the
controller** — because only the controller knows the resolved operand
(`look`'s target, `wiki`'s slug, `help`'s topic). The YAML declaration
is the **gate**, not decoration: `CardApi.open` reads `ctx.command` and
**throws if the running command's view did not declare that card**. So
the vocabulary is declarative and greppable, and the call site is where
the subject is known.

Controllers touched in this phase: `LookController` (`subject`, and bare
`look` → `place` via the shared key), `WhoController`,
`PressController`, `WikiController`, `HelpController`. Phase 7 adds
`cms` / `git` / `studio`.

⚠ **`look` still stacks** — attention-stacking survives, as something
`look` **declares** rather than something the client infers.

### The source guard (AC 1)

`packages/server/src/mud/api/__tests__/card-birth-path.test.ts` scans
`packages/client/src` and `packages/server/src` and asserts:

- **zero** client-side card mints (no client code writes into the card
  slice except from a `card-*` envelope handler);
- every server-side mint is `CardApi.open` / `CardApi.push`;
- `MqlSubscribeMessage` carries no `card` field (see § 12) — **the
  client cannot open a card at the wire level**, which is a stronger
  guarantee than a grep.

Assert the number of call sites found (`expect(sites.length).toBe(N)`),
per testing.md's *a guard can pass by matching nothing*.

---

## 5 · Phase 4 — the client feed consumes the mechanism

**Depends on:** 2, 3.

### 4a — store + wiring

- `store/cardFeedSlice.ts` rewritten: `cards` keyed by `instanceId`;
  `pinned` boolean; `takenAt`; `key`; feed order = pinned block
  (stable, by `openedAt`) then unpinned newest-touched-first. Delete
  `expireHusks`' interval caller and the husk-TTL logic (**the server
  sweep owns it now**); keep the husk *rendering* (fade, reason,
  `lastTitle`, body cleared) unchanged — decision 2 says the husk model
  carries over.
- **Delete the focus-inference effect** in `useCardFeed.ts` (the
  `focusStuffId` `useEffect`) and `openSubjectPane`. This is decision
  1's actual retirement.
- **Delete `InspectionPane.tsx`, `useInspectionSubscriptions`,
  `store/inspectionPane` slice** and their tests; the detail trail
  already lives in `CardBodies.tsx`.
- **Hoist the wiring** from `WorldLayout` to `App.tsx`'s `in-world`
  branch: `useCardFeed()` runs above the mode registry so **every**
  layout gets it, not just `play`. This is the third occurrence of the
  *wiring-at-the-layout* bug (`inspection-pane.md` § *The wiring lives
  at the LAYOUT*, client-shell's mobile-bar `self` subscription); phase
  7 needs cards in `build`, so hoisting is not optional. A test asserts
  the hook is called at a component that renders at both form factors —
  **spy the transport, do not seed the store** (testing.md § *Test the
  WAKE*).

### 4b — the card's controls

- **Static cards render `takenAt` and a refresh control; live cards
  render neither** (AC 6). The refresh control's label and preview are
  the card's `key`, and clicking sends it through `onCommandClick` (the
  affordance path, so the phone's command sheet intercepts it).
- Pin sends `cockpit card pin|dismiss|auto <cardId>`; the pinned state
  is still **mirrored from the server**, never set optimistically.
- Husk keeps only `close`.

**Tests:** `CardFeed.test.tsx` (ordering incl. pinned-holds-position),
`Card.test.tsx` (refresh present iff static; absent on husk; timestamp
rendered), `cardFeedSlice.test.ts` (touch → forward + `takenAt` bump).
Plus one **wire** test: hand a real `card-opened` envelope shape from
`@saxonberg/types` to the handler, not a hand-built object.

---

## 6 · Phase 5 — the switcher dies; who / news / wiki become cards

**Depends on:** 4.

**Deleted:** `PaneSwitch` + `PaneTab` + `PaneSlot` in
`WorldLayout.tsx`; `rightPane` / `setRightPane` in the store;
`WhoPane.tsx`, `NewsTickerPane.tsx`, `WikiPane.tsx` and their tests. The
right column renders `CardFeed` and nothing else (AC 9).

**Salvaged, not deleted:** the row-rendering knowledge. `WhoPane`'s
recognized/stranger styling and status badge, `NewsTickerPane`'s
pin-first release rows and expand, `WikiPane`'s outline + sections
become **card bodies** in `CardBodies.tsx`, selected on `cardId`. What
dies is the pane *shell*, its 360px chrome, its own data path and its
tab.

**Server:** three `payload` producers on `CardLogic`, each forwarding to
the Api that already owns the read — `SocialApi` (roster),
`PressApi.recent` (+ the archive REST stays for *load older*),
`WikiApi` (page). No new read Apis. The `self.group` /
`publication.press` frame handlers stay (they are pushes, and the card
re-reads on refresh); the **store slices those panes read from**
(`roster`, `feed`) stay too — they are subsystem state, not pane state.

**Wiki + forum search (AC 14):** the search box sends
`recall --scope wiki <terms>` / `recall --scope forums <terms>` — a real
command, previewed exactly as sent. Delete the
`"╌╌ no search port yet"` string and add a **test that greps the client
source for it**, per the retired-string precedent.

---

## 7 · Phase 6 — named views over the card feed

**Depends on:** 4. Independent of 7, 8, 9.

Mirror the terminal's `TabStrip` / `consoleActions.ts` exactly:
`cards.views` + `cards.activeView` clientState keys, `All`
locked/unstored/undeletable (it is the *absence* of a filter), views
filter on **card kind** (`cardId`).

⚠ **The seeding clobber (AC 11).** `console.tabs` shipped a bug where
absent read as *first run*, so a layout mounting before the connection
payload wrote ship defaults over saved views. `WorldLayout` fixed it by
keying the seeding effect on
`Array.isArray(clientState['console.tabs'])`. Do the same here **and
write the regression test the original never had**: mount before the
payload, assert nothing was written; deliver a payload with saved
views, assert they survive.

---

## 8 · Phase 7 — the authoring cards

**Depends on:** 5.

- **Net-new verbs:** `cms` and `studio` (`mud/cmd/author/cms.yaml` +
  `obj/command/author/CmsController.ts`; same for studio) — *Command
  YAML* + *Controller*, both existing categories. `git` and `help` and
  `errors` already exist and gain `opens_card:`.
- Four `client`-source rows: `cms` (explorer + Monaco + editor), `git`
  (`CmsGitPanel`), `studio` (`StudioPanel`), `help` (**net-new client
  surface**; the REST help API ships).
- Each declares **`noProse: true`** (AC 12) — and phase 8's filter must
  honour it: a `terminal`-only setting **must not** suppress an
  authoring card, or Monaco silently disappears.
- **Fill the arrangements** (AC 13), re-keyed per finding 0.6:
  `build.default = ['cms','git','studio']`, `chat.default = ['who']`
  (+ the Wave 6 forum surfaces), `watch.viewer` / `watch.streamer`
  distinctly.
- **Apply the arrangement on login**, not only on `cockpit mode` /
  `cockpit layout`. Today `applyArrangement` is called from those two
  controllers alone; without this a player who logs into `build` sees
  nothing.
- `BuilderLayout` / `ForumLayout` / the livestream layouts render
  `<CardFeed>` in their rail. The **wiring** already runs (phase 4's
  hoist); this is placement only.

---

## 9 · Phase 8 — the terminal filter and the form-factor override

**Depends on:** 4. Independent of 6, 7, 9.

### The setting

`shell.result` on `EnvironmentMixin`'s `static settings`
(`lib/shell/Environment.ts`, beside `shell.interpolate-vars` and
`prompt.format`): `SettingTypes.String`, default `'card'`, validator
over `card | terminal | both`.

### The suffix rung (decision 11, AC 16)

`ShellApi.resolveSetting<T>(host, key, factor?)` →
`ShellLogic.resolveSetting`:

1. stored override at `<key>.<factor>` (when `factor` given);
2. stored override at `<key>`;
3. the schema entry's `default`.

The schema entry gains `perFactor: true`, and `setSetting` accepts
`<key>.<factor>` **only** for an entry that declares it — that is what
makes it *one key with an optional override* rather than two mandatory
keys. Form factors are a two-value vocabulary in `@saxonberg/types`
(`desktop | mobile`). Tests: one per rung, plus *unset override falls
through*, plus *`settings set shell.result.mobile` on a non-`perFactor`
key throws*.

### Reaching the client

The server cannot know the viewport, so it ships **both** and the client
picks — the `cockpit.shelf` split, restated:

- `connection-established` payload gains
  `resultDisplay: { desktop, mobile }`, resolved by
  `ShellApi.resolveSetting` — the `reactionPrefs` precedent, same file
  (`Avatar.ts`).
- `SettingsController` pushes
  `client-state-update { key: 'shell.result', value: {desktop, mobile} }`
  on write, so it takes effect without a reconnect. The `social.rules`
  projection is the precedent.

### The filter

One clause in `App.tsx`'s `visibleFrames` predicate: drop
`topic === 'shell.result'` when the effective value is `card`.
`terminal` suppresses the **card** instead — **except** where the card
declares `noProse` (phase 7). `both` renders both.

### AC 17 — equality, not two copies of the words

**The card carries the prose the controller already emitted.**
`card-opened.prose` is the same MML string as the frame; the terminal
renders the frame, the card renders `prose` in `terminal` mode. The test
asserts `frame.body === card.prose` — literal equality of one payload,
never the words twice. This is also what makes `terminal` a first-class
mode cheaply: the prose is not a new renderer, it is the rendering
players already read.

⚠ **Phase 8 must produce a per-card prose audit** — for each of the ten
rows, name the frame and topic it degrades to (see finding 0.5; `who`
retopics, `wiki`'s page rides `publication.wiki` and its result rides
`shell.result`). Any row with no prose frame is either given one or
declares `noProse`. **A row that silently has neither is the failure
mode.**

---

## 10 · Phase 9 — the residue sweep

**Depends on:** 5. Independent otherwise. One commit per item.

1. **Wiki + forum search** — closed in phase 5 (AC 14).
2. **The action row.** ⭐ Smaller than the requirements feared:
   `resolveAffordancesImpl` **already computes
   `const fromTarget = affordance.source === target`** at
   `CommandLogic.ts:1612` and uses it as a *filter* — but never carries
   it onto the entry, so nothing downstream can tell the two apart.
   Carry it: `AffordanceEntry.source: 'subject' | 'actor'`, and the
   card's action row renders `source === 'subject'` only.
   `cast · defend · destruct` are actor-sourced and vanish by
   construction; a noticeboard's `read` (from its own
   `commandContributions`) stays. **Still the item most likely to need
   its own decision** — see risk (a).
3. **The radial needs a `stuffId`.** Transcript nouns emitted through
   identity-less MML tags carry none (S2 identity-tag residue). Scope:
   find the emitters that use bare `<item>`/`<name>` without `stuff-id`
   and route them through `Mml.thing` / `Mml.actor`, which stamp it.
   Bounded by a grep; if it exceeds a handful of emitters, record it and
   move on rather than opening the tag vocabulary.
4. **`chat on` does not wake an open rail.** Firing from
   `SubjectCatalogue` was tried and reverted (breaks persist-then-fire).
   The seam that now exists is the card: `chat on` **opens/touches a
   card**, and the card push is the wake. If that does not fit the rail,
   leave it recorded — do not re-try the reverted seam.
5. **`HERE` rows render `something`.** ⚠ **The requirements' framing
   does not match the tree** — see risk (b). Investigate by driving
   before writing code.
6. **The prompt strip was never fired live** — verification debt, closed
   by phase 10's driving script.
7. **Four stale `blueprints` rows.** The warning is
   `BlueprintSeeder.#deriveSkeleton` over `domain.distinct('class')`
   with an unresolvable class. `domain` is `keep` and the seeder is
   insert-only, so these never age out — **and phase 1b adds one**. Fix:
   make `BlueprintSeeder` **reconcile** — drop `blueprints` rows whose
   backing class no longer resolves (blueprints are derived and
   regenerable, so deleting them is safe) — and log the orphan `domain`
   rows with the exact `deleteMany` rather than deleting them
   automatically (CMS-authored templates live in `domain` and there is
   no discriminator; `ResetPolicy` already records this).

---

## 11 · Phase 10 — docs and verification

- `docs/subsystems/card-surface.md` **rewritten** (AC 20): the one birth
  path, the two independent axes, dedup, the sweep, the husk model, the
  catalogue's three sources, what the client owns. **Its *What ships
  unbuilt* list is rewritten against the tree** — mobile responsiveness
  and the tab strip both shipped and are still listed as unbuilt.
- `cockpit.md` (`cockpit card`, the summoned-**panel** tier,
  `applyArrangement`'s rules, the arrangement-on-login addition),
  `client-shell.md`, `shell-environment.md` (the suffix rung),
  `cms.md`, `help.md`, `git-workflow.md`, `studio.md`,
  `mql-subscription.md` (the catalogue left it), `record-layer.md`
  (`recall --scope` wired), `residency.md` (a second installed sweep,
  cross-referenced).
- **CLAUDE.md's map line renamed — one line, in this commit, swept not
  raced.**
- `client-slate.md` § 7: Wave 7 shipped, residue closed, § 7.16 item 4
  closed by the re-key.
- **`docs: retire the card-surface plan and requirements` is the
  *sweep*'s job, not this build's** (workflow.md § 5).

---

## 12 · The wire and type changes, consolidated

`packages/types/src/index.ts` is the whole surface.

**Phase 1 (rename only):** `PaneId`→`CardId`, `PANE_IDS`→`CARD_IDS`,
`PaneHold`→`CardHold`, `PANE_HOLDS`→`CARD_HOLDS`,
`PaneReleaseReason`→`CardCloseReason`, `MqlSubscribeMessage.pane`→`.card`,
`MqlSubscriptionResultEnvelope.pane`→`.card`,
`SHIPPED_ARRANGEMENT_PANES`→`SHIPPED_ARRANGEMENT_CARDS`,
`ArrangementSpec.panes`→`.cards`.

**Phase 2 — the vocabulary:**

```ts
export type CardId =
  | 'subject' | 'place' | 'who' | 'news' | 'wiki'
  | 'help' | 'prompt' | 'cms' | 'git' | 'studio';
export const CARD_IDS: readonly CardId[] = [ … ];   // total, asserted

export type CardCloseReason =
  | 'answered'    // a prompt card settled
  | 'aged-out'    // the relevance window lapsed — states its reason (AC 4)
  | 'dismissed'   // the player dropped it
  | 'rearranged'  // the workspace changed, not the world
  | 'gone';       // a live card's subject stopped existing
```

**Deleted:** `CardHold` / `CARD_HOLDS` (all five values —
`unanswered`'s guarantee moves onto `pinned`), the four spatial close
reasons (`left`, `departed`, `out-of-reach`, `dropped`),
`MqlSubscriptionReleasedEnvelope`, and on `MqlSubscribeMessage`:
`card`, `subject`, `hold`, `holdSubject`. On
`MqlSubscriptionResultEnvelope`: `card`, `hold`, `pinned`, `pushed`.

**Added — `MqlSubscribeMessage.chrome?: 'self'`.** ⭐ The client can no
longer name a card at the wire level; it can name exactly one chrome
subscription. That is AC 1 enforced by the protocol rather than by a
grep.

**Added — the card envelopes:**

```ts
export interface CardOpenedEnvelope {
  type: 'card-opened';
  frameId: number;
  instanceId: string;        // server-minted; IS the subscription id when live
  cardId: CardId;
  key: string;               // the normalized command: identity + what refresh sends
  live: boolean;
  pinned: boolean;
  takenAt?: number;          // static only — the honesty stamp (AC 6)
  title?: string;
  subjectId?: string;
  promptId?: string;
  prose?: string;            // the MML the controller emitted; absent when noProse
  result?: (StuffRefRecord | StuffDetailRecord)[];   // mql source
  payload?: CardPayload;                             // payload source
}

export interface CardTouchedEnvelope {
  type: 'card-touched'; frameId: number; instanceId: string;
  takenAt?: number; result?: …; payload?: …;
}

export interface CardClosedEnvelope {
  type: 'card-closed'; frameId: number;
  instanceId: string; reason: CardCloseReason;
}

export interface CardPinnedEnvelope {
  type: 'card-pinned'; frameId: number;
  instanceId: string; pinned: boolean;
}

export type CardPayload =
  | { kind: 'roster';    rows: RosterRow[] }
  | { kind: 'releases';  rows: ReleaseRow[] }
  | { kind: 'wikiPage';  page: WikiPagePayload }
  | { kind: 'helpTopic'; topic: HelpTopicPayload };
```

**Deltas for live cards keep riding `mql-subscription-delta`**, because
`instanceId === subscriptionId` by construction — no new envelope and no
join table.

**Also:** `SHIPPED_ARRANGEMENT_CARDS` re-keyed to
`Record<CockpitMode, Record<string, readonly CardId[]>>` (finding 0.6);
`AffordanceEntry.source: 'subject'|'actor'` (phase 9);
`ConnectionEstablishedPayload.resultDisplay` (phase 8);
`FormFactor = 'desktop'|'mobile'`.

**No migration ships** (AC 19). `cockpit.arrangements` lives on
`holder_snapshots`, which `ResetPolicy` wipes nightly, so a stored
arrangement survives at most one night — the same argument that retired
the Wave 6 `ordered`/`open` migration. ⚠ The **`domain`** collection is
a different animal (`keep`, insert-only seeder) and is handled by phase
1b's dev-DB step + phase 9 item 7.

---

## 13 · The retirement list

Deletions are the majority of this build. Planned as deliberately as the
additions.

**Server**

- The five holds: `CardHold`, `CARD_HOLDS`, `HOLD_WAKES_ON`,
  `evaluateHold`, `anySubject`, `holdAnchor`, `holdSubject`,
  `emitReleased`, `MqlSubscriptionReleasedEnvelope` and its four spatial
  reasons.
- Pane state on `SubscriptionState`; `setCardPinned` / `emitPinState` /
  `listCards` / `applyArrangement` **move** to `CardLogic` (not deleted
  — relocated, and the relocation is the reviewable act).
- `mql-subscription.pane-holds.test.ts`, `pane-holds.drive.test.ts`,
  `pane-arrangement.test.ts`, `pane-catalogue.test.ts` — rewritten as
  `card-*` against the new mechanism, **not** ported.

**Client**

- `PaneSwitch`, `PaneTab`, `PaneSlot`, `rightPane` / `setRightPane`.
- `WhoPane.tsx`, `NewsTickerPane.tsx`, `WikiPane.tsx` + their three test
  files (bodies salvaged into `CardBodies.tsx`).
- `InspectionPane.tsx`, `useInspectionSubscriptions`, the
  inspection-pane store slice (`paneBodyPainted`, `paneLastResult`,
  `paneBreadcrumbRoot`, `paneBreadcrumbTrail`, `paneDetailPath`,
  `paneDoorContext`, `paneFocusName`, `paneFocusFragment`),
  `applyOutgoingCommandToPane` in `App.tsx`,
  `store/__tests__/inspectionPane.test.ts`.
- The focus-inference effect and `openSubjectPane` in `useCardFeed.ts` —
  **decision 1's actual retirement**.
- The client husk `setInterval` and its TTL constant.
- The `"╌╌ no search port yet"` string (and a test that greps for it).

**Vocabulary**

- `cockpit pane` (not aliased — it must be refused).
- The catalogue rows `inspect` and `location`.
- Paint/clear as a *policy*: with the focus signal gone there is no
  cleared body to paint. The lesson it taught (*focus is a pointer;
  look is the verb that paints*) is now taught by `look` minting a
  card, which is stronger.

---

## 14 · How `pushed: true` generalizes

Today `applyArrangement` mints `srv-<pane>-<uuid>` handles and sets
`pushed: true` on the result envelope, and the client adopts a card
**only** for a handle it does not know **and** that flag (the inference
was tried twice and was wrong twice).

After this build the flag disappears **because the distinction it drew
disappears**: the client never opens a card, so *every* `card-opened` is
a push and there is nothing to distinguish. What generalizes is the
**cause**, which moves onto `key`:

| Cause | `key` | Example |
|---|---|---|
| a typed command | the normalized command | `who`, `look brass lantern` |
| an arrangement (mode switch / login) | the definition's own `command` | `place` → `look`; `cms` → `cms` |
| a prompt push | the definition's `command` + `promptId` | the prompt card |

So an arrangement-pushed `place` and a typed bare `look` collide **on
purpose** — that is the dedup doing its job, and it is what retires the
*focus card must not FLASH* special case.

---

## 15 · Risk register

**(a) The action row — the item most likely to need its own decision.**
The residue table says `AffordanceEntry` cannot tell *the actor can
always do this* from *this subject affords it*. **It can, and nearly
does:** `resolveAffordancesImpl` computes
`fromTarget = affordance.source === target` (`CommandLogic.ts:1612`) and
uses it to filter, but never carries it onto the entry. Carrying it as
`AffordanceEntry.source` is a two-line change. **The remaining risk is
not mechanical but editorial:** for an ordinary lamp with no
`commandContributions` the subject-afforded set is *empty*, so the row
is absent on most cards — which is correct per *a section that does not
apply is absent, not hatched*, but may read as the feature not shipping.
The decision that may still be needed: whether a small set of
high-value actor verbs (`get`, `drop`, `open`) earns a place beside the
subject-afforded ones, which is the "guess dressed as a recommendation"
the original note refused. **Mitigation:** ship `source` (server truth,
no guess), render the row only when non-empty, and put the editorial
question in front of the user with real screenshots from the driving
session rather than deciding it in code.

**(b) The `HERE` rows / `something` gate — the requirements' framing
does not match the tree.** The requirements say two visibility gates
disagree: `Container.contents` keeps the child on
`PerceptionApi.perceives`, then `projectFields` re-points `displayName`
through `RecognitionApi.describe`, whose `canSeeGate` says no. **What
the tree actually shows:** `perceives` is the **concealment** gate (is
it hidden from you) and `canSeeGate` is the **light** gate
(`VisionModality.canSee` → band vs `REQUIRED_BAND_FOR_DETAIL`). They
answer different questions, and `LookController` applies **exactly the
same pair**. **The card and the prose already agree**; both would say
`something` in the same conditions. So the likely defect is not gate
arbitration but the **light band of ordinary rooms** — which is a
light-model bug, not a perception call. **Mitigation:** the first act of
phase 9 item 5 is to drive it and read the band at the room the report
came from. If lit rooms also render `something`, fix the light seeding
and record that the "two gates disagree" framing was wrong. If the gates
genuinely disagree, the call to make is *the card lists what `look`
lists* — one definition, two renderings, asserted equal.

**(c) The prose rendering for `terminal` mode — flagged as the single
largest cost, and it is smaller than feared, conditionally.** Every card
in the catalogue is born of a command whose controller **already renders
prose to the terminal**. If the card carries that same MML as
`card-opened.prose`, there is **no second prose renderer**, `terminal`
mode is first-class for free, and AC 17's equality is literal rather
than aspirational. **The risk is the conditional:** three things can
break it — (i) a card whose prose frame is on a topic the filter does
not cover (`who` on `act.deed` — finding 0.5); (ii) a card whose content
the controller renders only partially (the wiki page rides
`publication.wiki`, not the result frame); (iii) the authoring cards,
which have no prose at all and are protected only by `noProse`.
**Mitigation:** phase 8 does not ship until the per-card prose audit
table is filled in, one row per `CardId`, naming the frame and topic. A
blank row is a stop.

**(d) The rename's blast radius against a live dev DB.**
`SeederManager` is insert-only and `domain` is `keep`, so every renamed
seeded template leaves an orphan row that warns at every boot forever —
the same shape as the residue this build is closing. Phase 1b carries
the DB step; phase 9 makes the boot warning actionable.

**(e) Two structures where there was one.** The card set now owns
subscription handles it did not create. Mitigated by
`instanceId === subscriptionId`, one teardown path, and an orphan-count
test — but it is the drift `inspection-pane.md` warned about, arriving
by a different door.

**(f) `terminal` mode on a phone.** Decision 11's payoff is that mobile
may default to filtering `shell.result` out of the terminal. Note the
direction: on a phone the card feed is **inline in the transcript**, so
`card` mode and `terminal` mode occupy the *same column*. Verify at
390×844 that `both` is not simply the same content twice in one scroll —
if it is, that is a finding for the user, not a bug to paper over.

---

## 16 · Verification plan — driving, at both form factors

**A green suite means the client is self-consistent, not that it
works** — and in this program a green suite has now missed a wiring
defect (the mobile bar's `self` subscription), a wire defect (the
subject rail's silently-dropped scope kind) and a parser defect (the `;`
sigil in the reaction command). Three failures, three different layers,
one suite that was green through all of them. This build is verified by
driving before it is called done (AC 23).

**Setup:** `pnpm dev`, Chrome DevTools MCP, a real touch pointer for the
phone pass. Two viewports: **1440×900** and **390×844**. Take a
screenshot at every numbered step; the console must be clean of errors
at the end of each pass.

**The script, run at both sizes:**

1. **A command opens a card.** Type `who`. A `who` card appears at the
   top of the feed (desktop: the right column; phone: inline, in causal
   position after the frame that caused it). It shows a **timestamp**
   and a **refresh** control.
2. **Dedup on re-issue.** Type `who` again → still **one** card, brought
   forward, timestamp updated. Then `who --wizards` → a **second** card.
   Then `look` at two different things and re-look at the first → two
   cards, the first in front.
3. **`examine` is `look`.** `examine <thing>` then `look <thing>` → one
   card.
4. **Refresh re-issues.** Click the `who` card's refresh; the status bar
   preview reads exactly `who` (desktop) / the command sheet names `who`
   (phone); the timestamp advances.
5. **An unpinned card ages out and states its reason.** Shorten
   `cards.window` via `settings set`, wait past the sweep, watch the
   card fade to a husk reading its reason and keeping its name.
6. **A pinned card survives.** `cockpit card pin place`, wait past the
   window; it stays and its header says *held by you*.
7. **A prompt card holds until answered.** Trigger a prompt; the card
   opens **pinned**; wait past the window (it does not go); answer it;
   it closes with `answered`. ⭐ This also closes the residue item *the
   prompt strip was never fired live*.
8. **A live card wakes without a refresh.** Open the one live card in
   the catalogue, change the world, assert the card changed **without
   touching refresh** — and confirm it renders **no** refresh control.
9. **Named views.** Create a view, filter to one card kind, rename it,
   delete it; `All` cannot be deleted. Reload the page and confirm the
   views survived (the clobber case).
10. **An authoring card.** `cms` → the editor card opens in the feed
    with Monaco alive; `git`; `studio`; `help <topic>`.
11. **`build` mode has cards.** `cockpit mode build`, reload, log back
    in — the arrangement is applied on login and the cards are there.
12. **The terminal filter.** `settings set shell.result terminal` → the
    `who` frame renders in the transcript, the card does not appear,
    **and the CMS card still does** (`noProse`). `both` → both, and they
    say the same thing. `card` → back to the default.
13. **The form-factor override.** `settings set shell.result.mobile
    terminal` with `shell.result` left at `card`: the desktop pass shows
    cards, the phone pass shows terminal — **without any second
    command**.
14. **Wiki search.** Search from the wiki card; the command previewed is
    `recall --scope wiki <terms>`; results arrive.
15. **The switcher is gone** and the right column shows only the feed;
    at 390px the page does **not** scroll sideways (the fixed-width
    trap), and the command sheet and shelf screen are reachable.

**Suite discipline:** `pnpm test:near` is the loop. **One** full
`pnpm test` before opening the MR, after checking
`git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$)'` — a
green run stays valid until source changes.

---

## 17 · Acceptance-criteria map

| AC | Phase | Where |
|---|---|---|
| 1 no client inference; source guard | 3, 4 | `card-birth-path.test.ts`; `chrome?: 'self'` is the wire-level guarantee |
| 2 required pinned + liveness | 2 | `Record<CardId, CardDefinition>`, `card-catalogue.test.ts` |
| 3 normalized command as identity | 2 | `card-identity.test.ts` (the decision-6 table) |
| 4 unpinned closes **with a reason**; pinned does not | 2 | `card-lifetime.test.ts` + drive step 5/6 |
| 5 prompt card pinned → auto-release | 2 | `card-prompt.test.ts`, **no refresh helper in the file** |
| 6 timestamp + refresh on static; none on live | 4 | `Card.test.tsx` + drive step 8 |
| 7 refresh re-issues through the command bus | 4 | `Card.test.tsx` + drive step 4 |
| 8 sweep, no per-card timer | 2 | `card-sweep.test.ts` |
| 9 `PaneSwitch` deleted | 5 | `WorldLayout.test.tsx` |
| 10 who/news/wiki from the catalogue | 5 | catalogue rows + payload producers |
| 11 named views; `All` unstored; clobber test | 6 | `cardViews.test.ts` |
| 12 CMS/git/studio/help as cards, `noProse` | 7 | catalogue + `card-catalogue.test.ts` |
| 13 build/chat/watch non-empty | 7 | `SHIPPED_ARRANGEMENT_CARDS` re-keyed |
| 14 wiki + forum search wired; string gone | 5 | the grep test |
| 15 `card`/`terminal`/`both` | 8 | `resultFilter.test.tsx` |
| 16 `<key>.<factor>` → `<key>` → default | 8 | `resolveSetting.factor.test.ts`, one per rung |
| 17 the two renderings are **equal** | 8 | `frame.body === card.prose` |
| 18 no `pane` in src; `cockpit pane` refused | 1 | the rename + a source grep test |
| 19 no migration; the doc says why | 12 | `card-surface.md` |
| 20 `card-surface.md` replaces `inspection-pane.md` | 1c, 10 | rename then rewrite |
| 21 the seven docs + CLAUDE.md's map line | 10 | one commit, swept not raced |
| 22 client-slate § 7 records Wave 7 | 10 | |
| 23 driven at 1440×900 and 390×844 | 10 | § 16 |
