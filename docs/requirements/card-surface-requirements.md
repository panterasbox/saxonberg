# The card surface — requirements

The last client wave. It does four things that only make sense
together: it gives **every** card in the product one birth path, one
lifetime rule and one identity; it turns the right column from a tab
switcher into a feed of those cards; it builds the authoring surfaces
(CMS, git, studio, help — Wave 7) as cards rather than as a second
switcher; and it renames `pane` to `card` throughout, which is the word
the code had already drifted to (`PaneCard.tsx`).

Seeded by [client-slate.md](../slates/builds/client-slate.md) § 7 (Wave
7, plus the residue §§ 7.16–7.17 record). The live reference for what
exists today is
[inspection-pane.md](../subsystems/inspection-pane.md),
[cockpit.md](../subsystems/cockpit.md) and
[client-shell.md](../subsystems/client-shell.md).

> ⭐ **The governing sentence, and it is a deflation.** *A card is a
> container for structured content, separate from the unstructured
> message feed in the terminal.* It is not a lifetime system, not a
> liveness system and not a layout system. Everything below exists to
> make it that and nothing more — most of this build **deletes**
> mechanism rather than adding it.

---

## Goals

- **One birth path.** A card exists because a **command** caused the
  server to push it. The client no longer infers a card from a changed
  query result.
- **One lifetime axis.** A card is **pinned** or it is not. Unpinned
  cards scroll away and close on a relevance window; pinned cards stay
  until dismissed.
- **Liveness is orthogonal and opt-in.** A card is static by default —
  resolved once, stamped with when — and subscribes only when its
  catalogue entry says it should. Today every card is a subscription;
  after this build most are not.
- **One identity.** A card is identified by the **normalized command**
  that produced it, so `who` twice is one card and `look a` / `look b` /
  `look a` is two.
- **The right column is a feed of cards and nothing else.** The
  `Inspect · Who's Online · News · Wiki` switcher is gone; those three
  surfaces become catalogue cards.
- **Named views over the card feed**, the way the terminal already has
  named views over frames.
- **The authoring surfaces are cards** — CMS editor, git panel, studio
  composer, and a help card that does not exist client-side today.
- **A player-controlled terminal filter** for structured command
  results, with an optional per-form-factor override.
- **`pane` is called `card`** everywhere: types, catalogue, wire, verb,
  docs.
- **The shipped-wave residue is swept** (§ *Residue* below), so no wave
  closes leaving a hatch whose stated reason is false.

## Non-goals

- **The held-commands offline queue.** Cut in Wave 1C with a written
  reason (ordering, expiry, replay-safety are a real feature). Stays
  cut.
- **A notification tray.** Cut in Wave 1C; `NotifyPolicy` /
  `NotifyRule` must be read before any UI is designed, per
  [social-graph.md](../subsystems/social-graph.md).
- **Durable clips + attestation.** Deferred by the handoff and by
  § 4.3; stays deferred to the attestation slate.
- **Lounge content** (pizza-as-tally, waiter, order console, departures
  board) — the lounge-revisit slate.
- **Filter views keyed on facets rather than topic paths.** Wave 4
  found the blocker and it is not in the filter: `speech.vocal` and
  `speech.channel` carry **identical facets**, so no combination of the
  three axes separates the room from the network. That is a gap in the
  S2 taxonomy and belongs to a taxonomy build. Card and frame views
  stay path-keyed here.
- **`item` / `object` collapsing to `thing`** (slate open question 3)
  and **the `mx` digest width** (question 4). Both are Track A/B
  vocabulary questions, unrelated to cards.
- **A live `who`.** See § *`who` ships static* — the presence wake it
  would need does not exist, and the decision is to not need it.

---

## Surface decisions

### 1 · A command opens a card; nothing else does

**Question.** Cards today are born when the client notices that the
standing `inspect` subscription's first result changed. Is that the
model?

**Decision.** No. **The server pushes a card because a command said
so.** The client's focus-watching effect in `usePaneFeed` retires.

**Reasoning.** The current mechanism is a client-side inference from a
changed query answer — the code says so: *"the `inspect` subscription
is the SIGNAL, not the card."* Three consequences make it untenable for
this build: a command like `who` has no way to open a card at all; the
server cannot assign a lifetime to something it does not know exists;
and the Wave 7 surfaces have no focus change to hang off. It also
settles slate § 4.4's *"does the client read an arrangement and open
the named panes itself?"*, which was never decided — it was settled by
implementation, one hook at a time, in the client's favour.

**The seam already exists.** `applyArrangement` pushes cards from the
server today, with an explicit `pushed: true` on results so the client
does not have to infer. This build generalizes `pushed` from *a mode
switch pushed this* to *a command pushed this*.

⚠ Attention-stacking survives — `look` still stacks a card for each
thing you look at. It becomes something `look` **declares** rather than
something the client infers.

### 2 · Pinned or unpinned; that is the whole lifetime

**Decision.** One boolean. Unpinned cards scroll out of view (still
scrollable) and **close on a relevance window since last touched**.
Pinned cards stay until dismissed. The catalogue declares the default
per card; the player overrides in both directions.

**What this retires.** The four *spatial* holds — `here`, `present`,
`inReach`, `carried` — and with them the requirement that every hold
install a dependency to wake it. A world-condition hold buys precision
(the card closes the moment you leave the room rather than eventually)
and costs a wake per hold. The trade is accepted: you can scroll back,
and the card ages out.

**⚠⚠ What this does NOT retire: `unanswered`.** The five holds are not
symmetric. Four are spatial; `unanswered` is a pending **command**, and
it is the one the design leans on — *nothing that is still actionable
ever leaves*. A prompt card that timed out while still owing a reply is
precisely the failure the hold model was built to prevent.

**Resolution:** a prompt card **opens pinned and auto-releases when
answered**. Same guarantee, expressed on the one axis, with no hold
vocabulary. The auto-release rides `PromptLogic.cleanup` →
`MqlSubscriptionApi.notifyPromptSettled`, which already exists and
already exists *because* a prompt pane was otherwise immortal.

**⚠ A released card keeps stating its reason.** *"A card that vanishes
without a reason reads as a bug, and the player cannot tell a rule from
a defect."* Timing out is a reason and must be said. The husk model
(fade, state the reason, clear the body, keep `lastTitle`) carries over
unchanged.

**Implementation shape (constraint, not design):** a periodic sweep
evicting the cold tail, not a timer per card — the pattern
[residency.md](../subsystems/residency.md) already uses for object
self-eviction. Server-owned, so `cockpit card list` and the client
agree.

### 3 · Liveness is a separate, opt-in property

**Decision.** A card is **static by default** and **live by
declaration** in the catalogue. Static means: resolved once, no
subscription, **stamped with when it was taken**.

**Reasoning.** Every card today is an MQL subscription. Liveness is the
exceptional claim, not the default, and making it the default is the
expense. Crucially, liveness has **no bearing on pinnability** — the
two axes are independent, and all four combinations are meaningful.

**⚠ The honesty rule that makes this safe.** A static card that looks
live is a lie. Static cards show their timestamp and carry a refresh
control; live cards do not need one. This is the
[client-shell.md](../subsystems/client-shell.md) honest-state
convention applied to a new axis.

### 4 · Refresh re-issues the normalized command

**Decision.** Refresh is not a new concept and not an API — it
**re-sends the command that produced the card**, through the ordinary
command bus. This is already exactly what the shipped refresh button
does (`look`); the build generalizes it from one verb to whatever
command minted the card.

**⚠ Refresh belongs on static cards.** On a *live* card a refresh
button is a bandage over a wake that does not fire, and — worse — it is
how nobody finds out. That failure is already on the record: a `here`
pane was immortal through **eleven passing tests**, because every test
called `refreshForInteractive` by hand. Live cards therefore carry no
refresh control, and any test for a live card performs only the world
change and asserts the consequence.

### 5 · `who` ships static

**Question.** Should the `who` card be live?

**Decision.** No — static, with a timestamp and a refresh.

**Reasoning.** The dependency vocabulary is `focusDependent`,
`locationDependent`, and the `durableKey` poke channel the `self` card
uses. **Nothing wakes on connect or disconnect.** A live `who` would
therefore resolve once and then be permanently wrong while looking
exactly like it worked — the immortal-pane shape again. Building a
presence wake means every login poking every open `who` card, which is
real cost for a list the player can refresh in one click. Static is
both cheaper and honest.

### 6 · A card's identity is its normalized command

**Decision.** Dedup key = the command that produced the card,
normalized through the existing `CommandLineApi.format()` round-trip
and `expandAliases`.

| Sequence | Result |
|---|---|
| `who`, `who` | **one** card, brought forward |
| `who`, `who --wizards` | **two** cards — different command, different content |
| `look a`, `look b`, `look a` | **two** cards; the third brings `a` forward |
| `examine a`, `look a` | **one** card — `examine` is a `look` alias |

Re-issuing does three things at once: brings the card forward, resets
its relevance window, and re-runs it if static.

**Ordering.** Unpinned cards reorder to the front on re-issue — the
feed is newest-touched-first. **Pinned cards hold their position**; a
pinned card that jumps around is worse than one that sits still.

This generalizes the shipped per-subject rule (*"re-looking at
something you already have a live card for brings it back into view
rather than stacking a second identical card"*) from subject cards to
the whole catalogue.

### 7 · The right column is a feed; the switcher dies

**Decision.** `PaneSwitch` and its four tabs are removed. The right
column renders the card feed and nothing else. `WhoPane`,
`NewsTickerPane` and `WikiPane` stop being hand-written client surfaces
with their own data paths and become **catalogue rows** — a query, a
default pinned-ness, a liveness flag, a field set.

**Reasoning.** Only `Inspect` was ever the feed. The other three were
client-owned surfaces in a switcher *because* the only way a card got
born was a focus change, and none of them is one. Decision 1 removes
that constraint, so the switcher has no remaining justification — and
leaving it would mean Wave 7's surfaces get built into it and then
rebuilt.

### 8 · Named views over the card feed

**Decision.** A filter strip over the card feed, mirroring the
terminal's `TabStrip`: `All` locked and unstored (it is the *absence*
of a filter), every other view the player's to create, rename, edit and
delete. Views filter on **card kind**.

**⚠ It must not repeat the seeding clobber.** `console.tabs` shipped a
bug where an absent key read as *first run*, so a layout mounting
before the connection payload landed wrote ship defaults over saved
views. The card views take their own `clientState` key and must
distinguish *absent* from *not yet arrived*.

### 9 · The authoring surfaces are cards (Wave 7)

**Decision.** CMS editor + explorer + Monaco, the git panel, the studio
composer, and a **help card** (net-new client-side; the REST surface
ships) are catalogue cards, opened by commands, living in the same
feed.

**⚠ They declare that they have no prose rendering.** See decision 10 —
a Monaco editor cannot degrade to the terminal, and without the
declaration a `terminal`-only filter setting would silently break the
authoring surface.

**⚠ `build` and `govern` modes open no cards today.**
`SHIPPED_ARRANGEMENT_PANES` is `{chat: [], play: ['place'], watch: [],
build: [], govern: []}` — sparse on purpose, because *"pre-filling them
here would be sizing a vocabulary to a mockup."* This build fills
`build` (the authoring cards) and `chat` / `watch` (the Wave 6
surfaces), which is the wave that was supposed to.

### 10 · The terminal filter is a FILTER, not a placement

**Question.** When a command produces structured content, does it also
render in the terminal? This recurs at every verb, so it is a dial.

**Decision.** A **filter**: the server still sends the frame, the
client does not render it. One setting keyed on the **topic**
`shell.result`, which every structured command result already carries
(office, errors, stream, watch, tune, government, group, focus, eval,
clone, …). Values: `card` (default) · `terminal` · `both`.

**Reasoning for filter over placement.** Placement (the server declines
to send) saves the wire, but the frame then never reaches the frame
store and **`recall` cannot find it**. Filtering keeps your `who`
history searchable while keeping it out of sight. The setting is the
default; a named view is the per-session override.

**⚠ `both` is the two-copies-of-one-sentence shape** — two renderings
of one payload that can drift. It is a legitimate player choice, and it
must be built the way that lesson prescribes: **assert the two
renderings are equal**, never assert the words twice.

**⭐ `terminal` is a first-class mode, not a fallback.** MML renders
markdown, inline wiki and spoiler tags, so a player who wants one
scrollback is well served — which means the prose rendering of a card's
content must be a real rendering. This is the single largest cost in
the build.

### 11 · The form-factor override

**Decision.** **One key with an optional per-form-factor override**,
not two mandatory keys. A player who wants the same behaviour
everywhere sets one value; two independent keys guarantee eventual
silent drift.

**⚠⚠ This does not break the no-`cockpit.formFactor` rule, and the
requirements say so deliberately.** That key was never built because
*the server cannot know a viewport, so such a key would be a fake
fact*. Two **stored preferences** assert nothing about which is in
force: the server owns what is shown, and the client — which genuinely
knows its own viewport — picks. Same split as `cockpit.shelf`.

**⚠ Cost, stated up front:** the settings "chain" today is a
prototype/mixin chain resolving **schema defaults**, not a key-suffix
fallback. `<key>.mobile` → `<key>` → default is new resolution code in
`ShellApi.resolveSetting`. Small, but not free.

The payoff is that the **defaults** may differ: on a phone every row
the chrome takes is a row the feed loses (Wave 1C's governing
sentence), so mobile may ship filtering `shell.result` out of the
terminal while desktop ships showing it.

### 12 · `pane` → `card`

**Decision.** Rename throughout: `PaneId` → `CardId`, `PaneDefinition`
→ `CardDefinition`, `Panes.ts` → `Cards.ts`,
`SHIPPED_ARRANGEMENT_PANES`, the wire field `pane`, the `clientState`
keys, `usePaneFeed`, `PaneFeed`, and the doc
`inspection-pane.md` → `card-surface.md`.

**It reaches the player.** `cockpit pane list | pin | dismiss | auto`
is a typed subcommand with help text and examples; it becomes `cockpit
card …`.

**⭐ No migration.** `holder_snapshots` is `wipe` in `ResetPolicy`, so
stored `cockpit.arrangements` survive at most one night — the same
argument that retired the Wave 6 `ordered`/`open` migration. Per
[persistence.md](../subsystems/persistence.md) and `SeederManager`'s own
scope note, a bootstrap migration is not the answer.

Size: ~1,500 occurrences across ~123 non-test source files plus tests,
YAML and ~540 in docs. Mechanical apart from the wire field, the verb
surface and the `CardId` values.

### 13 · Residue swept

Shipped waves left these, and they close here:

| Item | What |
|---|---|
| ⭐ **The wiki search hatch is false** | `WikiPane` renders *"╌╌ no search port yet"* citing Track C's audit — but `recall --scope wiki` shipped in MR !195, which merged **before** Wave 6 built on top of it. The hatch was written from a stale table rather than the tree. Wire it; the same for `recall --scope forums`. |
| **No card-level action row** | Shipped showing `cast · defend · destruct` on everything, because `AffordanceEntry` cannot distinguish *the actor can always do this* from *this subject affords it*. Needs the resolver to mark subject-afforded verbs. ⚠ The item in this build most likely to prove it needs its own decision. |
| **The radial needs a `stuffId`** | Transcript nouns emitted through identity-less MML tags carry none — S2 identity-tag residue. |
| **`chat on` does not wake an open rail** | Firing from `SubjectCatalogue` was tried and reverted (breaks persist-then-fire). Needs a different seam. |
| **`HERE` rows render `something`** | Two visibility gates disagree: `Container.contents` keeps the child on `PerceptionApi.perceives`, then `projectFields` re-points `displayName` through `RecognitionApi.describe`, whose `canSeeGate` says no. Pre-existing; which gate is authoritative is a perception/light call this build must make. |
| **The prompt strip was never fired live** | Verification debt, not code. Decision 2 makes prompt cards load-bearing, so it must be driven. |
| **`inspection-pane.md` § *What ships unbuilt* is stale** | It still lists mobile responsiveness and a tab strip as unbuilt; both shipped. Rewrite with the doc. |
| **Four stale `blueprints` rows warn every boot** | Dev-DB junk pointing at modules that do not exist. |

---

## Constraints

- **Nothing is pure client.** The card set is server-owned: birth,
  identity, lifetime and the sweep. The client owns disclosure — which
  form-factor override applies, how a card is laid out. See
  [client-shell.md](../subsystems/client-shell.md).
- **Every clickable previews exactly what it sends.** Card controls,
  filter views and the authoring surfaces included. A refresh control
  previews the command it re-issues.
- **The client supplies an identity, never a query.** A card names a
  catalogue entry (and a `stuffId` where it takes a subject); the
  server owns the query. ⚠⚠ A subject card resolves by direct lookup
  **behind the perception gate**, never via an `#<stuffId>` MQL seed —
  that seed is authoring-tier and ungated, so a card built on it would
  answer for anything whose id the viewer had ever seen on a frame.
- **A new card cannot ship without choosing its lifetime.** The
  catalogue is a `Record<CardId, CardDefinition>` with **required**
  pinned-by-default and liveness fields — the `COLLECTION_POLICIES`
  trick from `ResetPolicy`, failing closed at build time. This is what
  makes "strict taxonomy" enforceable rather than aspirational.
- **A derive-on-read answer is dead unless something invalidates it.**
  Any test for a live card performs only the world change and asserts
  the consequence. A `refresh*` / `drain*` helper in every case of a
  file is the smell.
- **A green suite means the client is self-consistent, not that it
  works.** Per [testing.md](../testing.md): a client-side test proves
  neither the wire nor the parser, and a component test at jsdom's
  default width says nothing about a phone. **This build is verified by
  driving, at both form factors**, before it is called done.
- **Module categories are fixed.** The card catalogue, the sweep and
  the settings resolution all have existing homes; no new module
  category is invented without sign-off (CLAUDE.md § Module
  Categories).
- **`pnpm test` is ~15 minutes.** One full run when source has
  changed; `test:near` is the loop.

---

## Acceptance criteria

**The mechanism**

1. No card is opened by client-side inference. A source guard asserts
   no card is minted outside the server-push path.
2. Every catalogue entry declares pinned-by-default and liveness;
   omitting either fails the build.
3. A card opened by a command carries the normalized command as its
   identity; `who`/`who` yields one card and `look a`/`look b`/`look a`
   yields two, covered by tests.
4. An unpinned card closes on its relevance window **and states the
   reason**; a pinned card does not close.
5. A prompt card opens pinned and auto-releases when answered — tested
   by settling the prompt, with **no manual refresh anywhere in the
   file**.
6. Static cards render a timestamp and a refresh control; live cards
   render no refresh control.
7. Refresh re-issues the normalized command through the command bus.
8. Card eviction runs as a sweep; no per-card timer exists.

**The surfaces**

9. `PaneSwitch` is deleted; the right column renders only the feed.
10. `who`, `news` and `wiki` resolve from the catalogue, not from
    hand-written client data paths.
11. Named views filter the card feed; `All` is unstored and
    undeletable; an absent views key is distinguishable from one that
    has not arrived, with a test for the clobber case.
12. CMS, git, studio and help open as cards; each declares it has no
    prose rendering.
13. `build`, `chat` and `watch` resolve a non-empty arrangement.
14. Wiki search and forum search are wired to `recall --scope`; the
    "no search port yet" string is gone and a test greps the client
    source for it, per the retired-string precedent.

**The setting**

15. `shell.result` filtering honours `card` / `terminal` / `both`.
16. The per-form-factor override resolves `<key>.<factor>` → `<key>` →
    schema default, with tests for each rung.
17. Under `both`, a test asserts the card rendering and the terminal
    rendering are **equal** — not that each contains the expected
    words.

**The rename**

18. No `pane` identifier remains in `packages/{server,client,types}/src`
    outside comments quoting history; `cockpit card` is the verb and
    `cockpit pane` is not accepted.
19. No migration ships; the doc records why.

**Docs**

20. `docs/subsystems/card-surface.md` replaces `inspection-pane.md`,
    covering the unified mechanism, the two axes, dedup and the sweep;
    its *What ships unbuilt* list is rewritten against the tree.
21. `cockpit.md`, `client-shell.md`, `shell-environment.md`, `cms.md`,
    `help.md`, `git-workflow.md` and `studio.md` updated; CLAUDE.md's
    map line renamed (one line, swept not raced).
22. `client-slate.md` § 7 records Wave 7 shipped and the residue
    closed.

**Verification**

23. Driven live at 1440×900 and 390×844 with a real touch pointer,
    covering: a command opening a card, dedup on re-issue, an unpinned
    card ageing out with its reason, a pinned card surviving, a static
    card's refresh, a prompt card holding until answered, the named
    views, an authoring card, and the terminal filter at both settings.

---

## Sizing — surfaced, not decided

⚠ **This is materially bigger than Wave 6**, which was itself
under-estimated as "almost pure client". Honest shape:

| Sub-build | What | Why the boundary |
|---|---|---|
| **A — the rename** | `pane` → `card`, all tiers | Mechanical, zero behaviour, reviewable in one pass. Landing it alone means every later diff reads as design rather than as churn. |
| **B — the mechanism** | server-push birth, the two axes, dedup, the sweep, prompt-pinning; the switcher dies; who/news/wiki become cards | The load-bearing half. Nothing else can be built until cards have one birth path. |
| **C — authoring + the filter** | Wave 7 cards, named views, the `shell.result` setting + override, the residue sweep | Depends on B's catalogue; independent of each other. |

Wave 1 was cut into three builds for exactly this reason and the
boundaries held. **Recommend the same cut**; the alternative is one
branch large enough that a review cannot see the design through the
rename. The decision is the user's — the requirements above are the
full scope either way.

---

## Cross-references

- **Seeding slate:** [client-slate.md](../slates/builds/client-slate.md)
  § 4.4, § 7 (Wave 7), §§ 7.16–7.17
- **Live reference for what exists:**
  [inspection-pane.md](../subsystems/inspection-pane.md),
  [cockpit.md](../subsystems/cockpit.md),
  [client-shell.md](../subsystems/client-shell.md),
  [mql-subscription.md](../subsystems/mql-subscription.md)
- **Touched subsystems:**
  [shell-environment.md](../subsystems/shell-environment.md) (the
  setting), [cms.md](../subsystems/cms.md),
  [help.md](../subsystems/help.md),
  [git-workflow.md](../subsystems/git-workflow.md),
  [studio.md](../subsystems/studio.md),
  [record-layer.md](../subsystems/record-layer.md) (`recall --scope`),
  [residency.md](../subsystems/residency.md) (the sweep pattern),
  [prompt.md](../subsystems/prompt.md) (prompt-card pinning),
  [command-parsing.md](../subsystems/command-parsing.md)
  (`format()` normalization for dedup)
- **Constraining:** [testing.md](../testing.md),
  [antipatterns.md](../antipatterns.md),
  [persistence.md](../subsystems/persistence.md) (why no migration)
