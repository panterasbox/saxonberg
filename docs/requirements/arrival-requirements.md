# Arrival — requirements

Wave 2 of the client rebuild: **the launch path, and the one wave a
stranger sees.** Everything between a cold URL and a body — the front
door, the Articles of Enrolment, and character select — on both form
factors, built on the civic ground and honest-state primitives Wave 1
shipped.

Seeded by [client-slate](../slates/builds/client-slate.md) § 7 (wave 2)
and specified by four handoff documents: `Arrival - First 60
Seconds.dc.html`, `Arrival - Mobile.dc.html`, `Character
Select.dc.html`, `Character Select - Mobile.dc.html`.

The governing constraint is inherited, not new. Wave 1's three builds
paid for it repeatedly and it is what this wave is *for*: **a screen may
only render a claim the server can back.** Arrival is where that bites
hardest, because it is the screen a stranger judges the project on, and
the temptation to fill it with plausible numbers is at its maximum.
Where the art shows a figure with no source, this build hatches it with
a reason. Six of the shelf's nine rows hatched in Build B and that was
*the deliverable*; the same is true here.

## Goals

- **The front door is rebuilt on the civic ground** — sign-in over the
  three co-equal providers, the guest path with its honest warning, and
  the press room beside it, on desktop and phone.
- **Intake is rebuilt, and the char-gen wire payload is generalized**
  from five hardcoded option arrays to a **field list with a renderer
  discriminator**, so that adding a char-gen concept stops being a
  `types` change plus a client change. This is
  [char-gen.md](../subsystems/char-gen.md) § *The one change worth
  making now*, taken at the moment it is cheapest.
- **A species dossier row carries its reveal level on the wire**, so
  char-gen collapses what every other surface collapses.
- **Character select becomes the account's screen** — the roster reads
  the per-character figures MR C shipped and the client has never
  displayed (`lastSeen`, `playStanding`, `lastLocation`, `practice`),
  and a detail pane answers *what happened while I was gone*.
- **Make standing becomes genuinely account-level**, resolving the level
  collision Build B recorded rather than deferring it a third time. One
  formula, two entry points, no surface able to disagree with another.
- **Every arrival screen has a phone form** that is *readable and
  joinable*: someone arriving from a video can sign in, make a
  character, and reach the world.
- **Every affordance previews the command it sends**, including the
  roster's Enter control — the axiom Wave 1 established, extended to the
  screens that precede the command bar.
- **The arrival path works end to end on a phone**, which requires
  collapsing the fixed in-world rail that currently makes the document
  698px wide at 390px. Scoped to the collapse, not the feed redesign.
- **A guest can find their way to a real account**, without being
  promised their guest session converts into one.

## Non-goals

- **The lounge — both halves.** The art's lounge panel is two separate
  builds wearing one frame. Its client half (feed, presence, panes, verb
  bar) is Wave 4's play surface, and building it here would pre-empt the
  feed design Wave 4 owns. Its content half — the pizza-as-tally, the
  waiter, the order console, the departures board, the screens — is
  listed as **deferred** in
  [location.md](../subsystems/location.md) § *Deferred* ("toppings,
  matchmaking, the order console, …") and belongs to the lounge-revisit
  slate. **Wave 2 stops at the world boundary**: it delivers a player to
  a body and hands off to whatever the current client does with it.
- **`retire` / `restore` / `rename` / `appearance`.** No such verb
  exists. All four render as hatched controls naming their reason. The
  roster therefore has no way to shelve a character in this wave, and
  the art's "no slots — a character is yours permanently" copy is **not
  shipped**, because it is the justification for a control that does not
  exist yet. `rename` additionally collides with the chronicle's
  append-only identity ledger (a name is a claim on a record) and must
  not be built casually.
- **An offline-notice source.** "Since you left" has nothing behind it —
  there is no mailbox, no offline-message store, no notice queue. The
  section renders hatched. Building one is a real feature with delivery,
  expiry and `NotifyPolicy` questions and deserves its own requirements.
- **Fund (capital) standing.** `'capital'` returns a zero standing
  tagged with the stock and has no faucet. It hatches.
- **The lineage model.** This wave makes lineage *cheaper* by
  generalizing the payload; it takes no lineage design decision. See
  [lineage-slate](../slates/builds/lineage-slate.md).
- **A generic char-gen action list.** Reroll stays the existing
  `enroll name reroll` command surfaced by the text renderer — see
  decision 3.
- **Re-keying `producer_events`.** Aggregation happens on read. See
  decision 7.
- **Guest → account *conversion*.** Explicitly refused, not deferred. A
  guest is `anon:<nanoid>` with no persisted `User`, and the front
  door's own copy promises *"nothing you make is kept, nobody can find
  you again."* Building a path that carries a guest's work into an
  account would make that copy false — the honesty rule applied to a
  promise rather than a figure. What ships instead is decision 14.
- **The feed, panes and verb bar in the in-world phase.** Decision 13
  collapses the rail so the arrival path terminates somewhere usable; it
  does not redesign what is inside it. Wave 4 owns that.

## Surface decisions

### 1 · Wave 2 ends at the world boundary

The wave delivers three screens — front door, intake, character select —
and the transitions between them. The moment `session.link` arrives and
the client flips to `in-world`, Wave 2's responsibility ends.

This is a scope cut with a design reason, not only a size reason:
**the lounge panel in the art is a play-surface mock.** Its feed,
presence block, pane column and verb bar are the same components Wave 4
must design properly, and a first pass built here would be thrown away
or — worse — kept and constrain Wave 4.

### 2 · The char-gen payload becomes a field list

`CharGenStatePayload` today names every field twice: once in the
`CharGenField` closed union and again as a per-field option array
(`speciesOptions`, `sexOptions`, `pronounOptions`,
`aspirationOptions`). The client compensates with an `optionsFor(field)`
switch, a `FIELD_HEADING` record and an `ILLUSTRATED_FIELDS` set —
adapter code that exists only because the payload did not hand it a
list.

The wire becomes:

```ts
type CharGenFieldKind = 'choose-one' | 'text';

interface CharGenFieldState {
  field: string;            // no longer a closed union
  kind: CharGenFieldKind;   // which renderer to dispatch to
  label: string;            // replaces the client's FIELD_HEADING
  applicable: boolean;      // replaces "sexOptions is empty ⇒ N/A"
  options?: CharGenOption[];
  value?: string;           // the current pick, if any
  suggestion?: { name: string; surname?: string };
  hint?: string;
}

interface CharGenStatePayload {
  fields: CharGenFieldState[];
  missing: string[];
  suggestion?: { name: string; surname?: string };
  accountName?: string;
  error?: { field: string; message: string };
}
```

**The payload is derived from `EnrollController`'s existing `FIELDS`
table, not hand-assembled beside it.** That is the whole win: the table
is already the one place a field is defined, and today the wire
re-states it. Each `FieldHandler` gains `kind` and `label`; the emitter
maps the table. Adding a char-gen concept becomes **one table entry**.

`CharGenField` may remain as a server-internal key type. It leaves the
wire.

**`illustrated` is derived, not declared.** A field is illustrated iff
its options carry `image` or `dossier`. This deletes
`ILLUSTRATED_FIELDS` without replacing it with a wire field that says
the same thing twice.

### 3 · Reroll stays name-specific — deliberately

[char-gen.md](../subsystems/char-gen.md) lists reroll among the four
interactions lineage needs and this model lacks. It is not built here.

The second-variant test decides it: the only other reroll anyone has
described is lineage's *reroll a household at a cost*, and lineage does
not exist. A generic `actions` list with one real consumer is a
speculative wire concept, and the cost of adding it later is one field —
the same cost as now. Name reroll therefore stays the existing `enroll
name reroll` command, surfaced by the `text` renderer whenever
`suggestion` is present.

Recorded so it is not later read as an oversight.

### 4 · An unrecognized field must still render

The client keeps ownership of layout — screen chunking stays client-side
and no step index or field order moves to the server, preserving all
four invariants
[char-gen.md](../subsystems/char-gen.md) § *What is already right*
names.

But the chunking config is currently keyed on the closed union, and the
generalization creates a new failure mode: a server that adds a field
the client's config does not mention could **silently drop it**, and the
player would be gated by a `missing` entry for a field that never
rendered.

So: the client's grouping is a *preference over known field names*, and
**any field not mentioned by it renders anyway**, on its own screen,
using its `kind` renderer and its server-supplied `label`. A field with
an unknown `kind` renders as a hatched row naming the reason rather than
vanishing. This is the honest-state rule applied to the intake's own
extensibility, and it is what makes lineage additive in practice rather
than only on paper.

### 5 · Dossier rows carry their reveal level

`DossierSection.rows` becomes `{ label, value, spoiler? }`.

`buildDossier`'s Composition section prints `Density` and `Edible`, both
declared `spoiler: 1` on `fieldMeta`. Level 1 means *collapsed by
default, not forbidden*, so this is not a leak — but the level is
currently dropped at the char-gen boundary, so char-gen renders expanded
what every other surface renders collapsed. The renderer collapses rows
at level ≥ 1 behind a disclosure.

This is a wire-type change, not a content decision, and it puts char-gen
back inside the reveal model rather than beside it.

### 6 · Make standing aggregates by **sum**

The account is the subject. Therefore **how a person distributes their
work across bodies must not change their figure** — and sum is the only
combinator with that property. Max and mean both *penalize* making a
second character, which would make the level claim incoherent: a figure
that changes when you mint a body is not measuring the account.

Sum is also neutral against splitting, which is the anti-gaming property
worth having: there is nothing to gain by spreading authorship across
characters, and nothing to lose.

Two supporting facts:

- The scalars being summed are already **recency-decayed rates**, and a
  sum of rates is a rate — consistent with *standing is a rate, not a
  total*.
- `producer_events` appends are deduped on `{author, actor, bucket}`
  and each character is a distinct `author`, so two characters of one
  account cannot double-credit the same engagement. They credit
  separately because they are separate content.

⚠ The previous attempt at this also summed. Its three recorded defects —
split-brain, wrong cutoffs, silent downgrade — were **none of them "sum
is wrong"**, and decisions 7 and 8 address each directly.

Bands come from the **producer-configured thresholds**, never
`Band.fromScalar`'s `DEFAULT_BAND_THRESHOLDS` (defect 2).

### 7 · One formula, two entry points

```ts
InfluenceApi.standingForAccount(subjectIds: string[], stock: Stock): InfluenceStanding
InfluenceApi.standingForHost(host: Stuff, stock: Stock): InfluenceStanding | undefined
```

`standingForAccount` holds the arithmetic. `standingForHost` keeps its
role as the seam every player-facing surface reads through: for an
account-level stock it resolves the host to its account's subject list
and delegates; for a character-level stock it is unchanged.

Character select needs the same figure with **no host at all** — at
`Login` the player is not embodied — so it calls `standingForAccount`
directly with the account's subject paths. Both paths run the same
arithmetic, which is what makes defect 1 (split-brain) structurally
impossible rather than merely avoided.

`producer_events` is **not** re-keyed. Re-keying has a wrong answer
available (silently dropping the history of anyone with more than one
character); derive-on-read makes aggregation possible without it.

### 8 · Unresolved is a first-class outcome

The account resolution runs through `Avatar.getUser()`, which is
**runtime-only and unpersisted**. That is exactly what produced defect 3
— unset, the old code quietly fell back to per-character with nothing
saying so.

The fix is not to avoid `getUser()`; it is to **refuse to guess**.
`standingForHost` returns `InfluenceStanding | undefined`, and
`undefined` means *this account could not be resolved*. Every caller
handles it explicitly; the read surfaces hatch.

This copies an existing, documented precedent rather than inventing a
flag: `measuredRenownOf` already returns `undefined` for an
unmaterialized scope precisely so the client can tell *never measured*
from *measured at zero*.

⚠ **Accepted cost, recorded deliberately:** a make-standing read against
an Avatar with no loaded `User` now yields a hatched figure where it
previously yielded a number. That is a *worse-looking* screen and a
*more honest* one — the number it replaces was a per-character figure
wearing an account-level label, which is the defect this decision
exists to end.

In practice the surfaces that matter are unaffected: `profile`'s make
digest is built in `selfDigest` on a played avatar, and the shelf's
`makeStanding` field reads the viewer's own body.

### 9 · The front door renders only claims with a source

Two footer notes in the art do not survive contact with the tree.

- **"the world resets nightly / Nothing survives to tomorrow yet"** is
  **server-reported, and renders only when true.**

  ⚠⚠ This one is worth recording carefully, because the investigation
  found something larger than a copy question. **Three documents reason
  *from* a nightly wipe that is implemented nowhere** —
  [client-slate](../slates/builds/client-slate.md) § 3.1 and
  [client-shell.md](../subsystems/client-shell.md) both open a governing
  argument with *"the demo wipes nightly, which buys latitude on
  persistence"*, [message-rendering.md](../subsystems/message-rendering.md)
  leans on it to justify retiring a vocabulary without an alias, and
  [gazette-slate](../slates/builds/gazette-slate.md) records a
  requirement that bulletins survive it. There is no cron, no CI job and
  no script, and [deployment.md](../deployment.md) documents durable
  Mongo Atlas persistence.

  The wipe **will be built** — it is a small ops job and the latitude is
  genuinely worth having pre-launch — but it lands in the server build
  that follows this wave, not in it. So Wave 2 ships the *mechanism* and
  not the claim: the front door renders a reset notice **iff the server
  reports a reset policy**, and reports none today. When the wipe lands,
  the copy appears with no client change.

  This is the honest-state rule applied to a sentence rather than a
  number, and it is the pattern to prefer over hardcoding the copy now
  and hoping the job appears.
- **"it is usually quiet · You may be the only person on"** becomes a
  **live figure**: `/auth/status` gains an aggregate count of players
  currently in-world, and the note renders what is true right now. A
  static apology becomes a fact, which is strictly better copy and
  removes a claim nobody was maintaining.

The count is an aggregate only — no names, no identities — and the
endpoint is already public and already fetched by `App.tsx`.

### 10 · Arrival previews commands; it does not confirm them

Build C's command sheet confirms **every** affordance on a phone,
because a mis-tap in the world can be costly and the feed is the app.
Arrival inherits the preview half of that axiom and **not** the confirm
half: every control shows the command it sends (`sends as play maren`,
`enroll species human`), and tapping fires it directly.

The reason is that intake is a *form*. Twelve confirmation sheets to
build one character would make the honest-command convention feel like a
tax rather than a disclosure, and the acts are cheap and reversible —
every `enroll <field>` is idempotent and re-settable, which is precisely
what the world's commands are not.

`MobileFrame` and its command sheet render in the in-world phase only,
so this is a boundary that already exists in the code; decision 10 makes
it deliberate rather than incidental.

### 11 · The roster's shape follows the question, not the pane count

Desktop shows roster and detail side by side because comparison is the
point. A phone splits them into two screens, and the split is **by
question**: the list answers *who*, the detail answers *what happened
while I was gone*.

Two consequences the art draws and this build keeps:

- **A single-character account opens straight on the detail.** Most
  accounts have one character, so the list is a way-station rather than
  a destination. Desktop pre-selects the only character; phone skips the
  list entirely (with a way back to it).
- **Never-played and retired are the two states the controls branch
  on.** A never-played character shows `—` for play standing with the
  reason *never taken out*, not a zero. Retired is rendered as a state
  the roster can *display* — a character can already be absent from
  play — but no control produces or reverses it in this wave (non-goal
  2), so the retired branch ships behind whatever the server can
  actually report.

### 12 · What hatches, and with which reason

Every hatch names a reason from a real category, never a bare dash.
`Figure` hatches a value; `UnbuiltGround` wraps a card whose whole
subject is unbuilt.

| Surface | State | Reason category |
|---|---|---|
| Account **Fund** standing | `unwired` | no faucet — `'capital'` has no source |
| Account **Make** standing, unresolvable account | `unwired` | account could not be resolved (decision 8) |
| **Since you left** | `UnbuiltGround` | nothing records what happened while you were away |
| **retire / restore** | disabled + reason | no such command |
| **rename / appearance** | disabled + reason | no such command |
| The **reset notice** | absent | the server reports no reset policy |
| Play standing, never-played character | `empty` | never taken out |
| Practice, no evidence | `empty` | no practice recorded yet |
| Last location, never-played | `empty` | never taken out |

⚠ The reasons must stay **distinct claims**. Build B's three categories
(`level` / `unexposed` / `not-self`) collapsed into one string would
send the next reader to the wrong place, and Build C had to retire a
reason that pointed at the wrong place entirely — *a reason pointing at
the wrong place is worse than no reason, because it is confidently
actionable and false*. Each row above states what is actually missing.

### 13 · The rail collapses on compact — and nothing else changes

`tokens.rail.width` is `22rem`, and `App.tsx` already carries the
observation that the in-world layout's fixed rail beside the terminal
makes the document 698px wide at a 390px viewport. Build C deferred this
to Wave 4 deliberately, on the correct reasoning that Wave 4 owns the
feed.

It comes forward for one reason: **this wave's goal is that someone
arriving from a video can sign in, make a character and reach the
world**, and today that path terminates in a horizontally-scrolling
screen. An arrival that delivers you somewhere broken has not arrived.

The scope is exactly the collapse — the rail stops being a fixed column
on compact — using the same clamp Build C shipped one level up. **No
feed redesign, no pane behaviour, no filters.** Wave 4 inherits an
in-world phone view that is legible rather than one that is finished,
and is free to replace all of it.

⚠ This must be verified under `isMobile: true`. It is the same class of
failure as the ICB bug, and a narrow desktop viewport cannot see it.

### 14 · The guest gets a door, not a conversion

A guest session shows a persistent, quiet affordance back to sign-in,
whose copy states the actual terms: signing in starts a **real
character**, and the guest session is not carried over.

The alternative — carrying a guest's work into a new account — is
refused rather than deferred (non-goal above). The front door promises
that a guest keeps nothing; a conversion path would make the front door
lie, and it is a worse lie than a wrong number because the player acts
on it.

⚠ The copy must not imply the guest's character is preserved. *"Sign in
to start a character that lasts"* is the register; *"save your
progress"* is not, and there is no progress to save.

## Constraints

- **The four char-gen invariants do not regress.** Every pick is a real
  command; the server re-emits whole state; there is no current-step
  concept; `missing[]` drives gating. A client that tracks its own step
  index or knows the field order re-couples the flow and makes lineage a
  rewrite. ([char-gen.md](../subsystems/char-gen.md) § *Forward
  compatibility*.)
- **`enroll` must remain fully usable from a bare text client.** The
  payload is display; the verb is the interface.
- **The honest-state primitives are consumed, not re-invented.**
  `Figure`, `UnbuiltGround` and the reason convention ship already; this
  wave is their second consumer.
- **Compactness comes from `useIsCompact`**, the `matchMedia`
  subscription Build C shipped — never a one-shot width read.
- **The ICB trap.** Under the mobile viewport model an overflowing
  document widens the initial containing block, which `position: fixed`
  resolves against. Any full-bleed arrival surface must respect the
  shell clamp, and **jsdom cannot see this** — it has no layout. Build C
  paid for this twice.
- **Phone verification uses `isMobile: true`.** Playwright's plain
  `viewport` is a narrow *desktop* context in which the ICB failure
  cannot occur, so a spec written that way asserts a state it never
  reaches.
- **Server-authoritative.** Nothing about which providers exist, which
  fields intake requires, or what a character's standing is may be
  decided client-side.
- **No new Api per concept.** Account standing lands on the existing
  `InfluenceApi` / `InfluenceLogic` pair; there is no `AccountApi`.
- **Backticks in styled-components CSS comments terminate the template
  literal.** Wave 1 lost time to this twice.
- **Band thresholds come from AppSettings**, never
  `Band.fromScalar`'s defaults.

## Acceptance criteria

**Front door**

- Sign-in, guest and press room render on the civic ground at both form
  factors; on a phone sign-in is above the fold and the press room is
  the scroll.
- A provider the server reports as unconfigured renders disabled rather
  than dead-ending into an OAuth error.
- The press room is never awaited — the sign-in controls paint whether
  it loads, is empty, or is gone.
- The presence note renders a live count from `/auth/status`.
- The reset notice renders **only** when the server reports a reset
  policy, and a test asserts no reset copy ships while it reports none.
- A guest session shows a route back to sign-in whose copy does not
  imply the guest character is kept; a test asserts the copy.

**The phone arrival path**

- At a 390px `isMobile` viewport, the whole path — front door → intake →
  character select → in-world — is reachable and no screen scrolls
  horizontally. This is one e2e spec and it is the wave's headline
  assertion.
- The in-world rail collapses on compact; the document does not exceed
  the viewport width. Verified in a real browser, not jsdom.

**Intake**

- `CharGenStatePayload` carries `fields: CharGenFieldState[]`; the
  per-field option arrays are gone; `missing` is `string[]`.
- The payload is derived from `EnrollController`'s `FIELDS` table — a
  test adds a field to the table and asserts it appears on the wire with
  no emitter change.
- `optionsFor`, `FIELD_HEADING` and `ILLUSTRATED_FIELDS` are deleted
  from the client.
- **A field the client's grouping does not mention still renders**, and
  a field with an unknown `kind` renders hatched. Both are tested.
- `DossierSection.rows` carries `spoiler?`; rows at level ≥ 1 render
  collapsed, and a test covers the Composition section's `Density`.
- Intake is completable at 390px in one column.
- Every card click sends a real `enroll` command, visible in the command
  log, and `enroll confirm` is gated by `missing`.

**Character select**

- The roster renders `lastSeen`, `playStanding`, `lastLocation` and
  `practice` per entry — the MR C fields the client has never read.
- A single-character account opens on the detail; desktop pre-selects
  the only character, phone skips the list and offers a way back.
- A never-played character shows a reasoned `empty`, never a zero.
- The Enter control previews its command (`sends as play <id>`).
- Every row in decision 12's table renders with its stated reason, and a
  test asserts the reasons are distinct strings.
- The phone form is two screens split by question.

**Account standing**

- `InfluenceApi.standingForAccount` sums the account's per-character
  producer scalars and bands with the configured producer thresholds.
- `standingForHost` returns `undefined` for an unresolvable
  account-level read, and no caller falls back to a per-character
  figure.
- A test asserts the roster's account figure and an in-world
  `makeStanding` read for the same account **agree** — the split-brain
  defect, made into an assertion.
- A test asserts `DEFAULT_BAND_THRESHOLDS` is not used on this path.
- An account with two characters bands from the sum, and a test shows
  splitting one character's work across two does not change the figure.

**Verification**

- The build is **driven in a real browser** at both form factors before
  it is called done — Wave 1 found six bugs this way that a fully green
  suite could not see, and three of the six were structural blindness in
  the tests themselves.
- e2e specs for the phone forms use `isMobile: true`.
- `pnpm test`, `pnpm build` and `pnpm lint` are clean.

**Docs**

- [char-gen.md](../subsystems/char-gen.md) § *Forward compatibility* is
  rewritten to describe what shipped rather than what to do.
- [client-shell.md](../subsystems/client-shell.md) gains the three
  arrival screens and their phone forms.
- [influence.md](../subsystems/influence.md) § *`standingForHost` — the
  seam, and its stub* loses the stub language and records the formula,
  the two entry points and the unresolved outcome.
- The client slate's wave table marks Wave 2 shipped and records what
  was cut.

## Where this sits in the program

Decided 2026-08-13, when the remaining client program was sequenced as a
whole rather than wave by wave.

**Wave 2 is deliberately *not* maximal.** Its three screens are touched
by no other wave, and that isolation is what makes them cheap; pulling
Wave 4 material in would make both waves share components and both
slower. Cramming is not the efficiency lever here.

The lever is that **waves 6 and 7 are already almost pure client** —
their server halves shipped — while Wave 4 is not. So the wave after
this one is a **server build that batches every remaining read surface
the 23 handoff screens need**, after which the rest of the program is
client-only. It carries at least: the pane catalogue entries (the
catalogue ships **three** — `inspect`, `location`, `self` — and every
pane in the handoff needs one), `prompt.format` rendering, wiki and
forum search, the **per-player frame store** (decided yes, 2026-08-13 —
it unblocks search scope, the second-device story and "your backlog"),
and the **nightly wipe** decision 9 depends on.

Wave 2 leads because it is the demo, and because its own server work is
small and self-contained.

## Sizing note

This is comparable to Builds B and C **combined**, plus decisions 13 and
14. If it does not fit one session, the natural cut is between screens
rather than between layers:

- **A — the pre-account phase**: front door, intake, the char-gen
  payload generalization, the dossier spoiler level, the guest door, the
  reset-notice mechanism.
- **B — the account phase**: character select, account-level Make
  standing, the compact rail.

Server work leads in both halves, as it did in Build C. Decision 13 sits
in B rather than A only because A does not reach the in-world phase.

Recorded so a mid-build split is a planned boundary rather than an
improvised one.

## Cross-references

- [client-slate](../slates/builds/client-slate.md) — § 7 wave cut, § 6
  the standing-level rule, § 7.1 the Wave 1 lessons this wave inherits
- [char-gen.md](../subsystems/char-gen.md) — the intake substrate and
  its forward-compatibility analysis
- [influence.md](../subsystems/influence.md) — `STOCK_LEVEL`, the
  producer faucet, and the `standingForHost` stub this wave fills
- [client-shell.md](../subsystems/client-shell.md) — the honest-state
  primitives, the mobile bar, `useIsCompact`
- [location.md](../subsystems/location.md) — the lounge, and what of it
  is deferred
- [connection.md](../subsystems/connection.md) — the auth → `Login` →
  roster path the front door and character select ride
- [measurement.md](../measurement.md) — what the platform may count and
  who says what a count is worth
- Handoff art: `Arrival - First 60 Seconds`, `Arrival - Mobile`,
  `Character Select`, `Character Select - Mobile`
