# Avatar family slate — three bodies, three kinds of state, and who may write

> **Status: UNBUILT** — ✅ **except Sequencing 1, which shipped on its own
> (2026-09-30): `{ verb: 'shadow', mode: 'overlay' }` now REFUSES at both
> ends.** It was a value in the `CollectionPolicy` union that no
> collection selects and no code implements, and all three write paths
> (`dispatchSave`, `dispatchDelete`, `deleteMany`) `break`'d past it into
> the real write — so any collection set to it would have written and
> bulk-deleted **field rows from inside a circle, unstamped and
> silently**. `SchemaDoc` now rejects it at author time and the three
> paths throw `SandboxOverlayUnimplementedError`. ⭐ Building overlay
> deletes both refusals, and the four pinning tests name the exact call
> sites to change.
> **Left:** **overlay mode
> built** — `copy` first, `through` second · the **27 REFUSE collections
> triaged** (9 stand, 17 move, 1 is a write-path defect) ·
> `holder_snapshots` onto overlay, retiring `SandboxAvatar.shouldPersist()` as
> the cheat guard · `shouldPersist(): boolean` → a **per-mixin capture
> allowlist** on the epistemic/material line the fork allowlist already
> draws · a **phase axis** beside `circleScope` so ghost-written records
> are filterable · the **death spec** (`Anatomy`/`Trauma`/`CauseOfDeath`,
> captured today and read by nothing) consumed by `reembody` as a **mint
> parameter, never a merge** · `HasInteractive` split into the connection
> set + **`SaxonbergClient`** · driver state off the body · the identity
> field de-triplicated
> **Size:** a build for the overlay half (§ Sequencing 1–4), a build for
> the rest — every override this slate exists to remove is load-bearing
> until the step above it lands

**Captured 2026-09-30**, out of a design conversation that started as
*"a small cleanup of `Avatar`"* and turned out to be blocked on a
persistence model that does not exist yet. The class layering is the
**last** phase here, not the first: once persistence is a declared
allowlist and driver state has moved off the body, most of the overrides
that prompted the conversation delete themselves.

Related: [sandbox.md](../../subsystems/sandbox.md) (the policy table, the
crossing) · [persistence.md](../../subsystems/persistence.md) (the spine)
· [mortality.md](../../subsystems/mortality.md) (the shade, what survives
a new body) · [identity.md](../../subsystems/identity.md) ·
[connection.md](../../subsystems/connection.md) ·
[measurement.md](../../measurement.md) (A2, A3, A14) ·
[positioning.md](../../positioning.md) (*a different client is a
different renderer*) ·
[base-class-narrowing-slate](./base-class-narrowing-slate.md) — **this is
the Agent branch's pass**, and D1's evidence standard applies.

---

## The spine — two questions that sort every field on `Avatar`

Everything below falls out of sorting state onto three axes, and the two
questions that discriminate them are both ordinary product scenarios:

- **`su`** — permission-gated, takes a player id that is not yours, one
  driver on a different identity. *What follows the human?* → separates
  **driver** state.
- **death** — you become a shade. *What comes back?* → separates
  **identity** state from **body** state.

| | **DRIVER** — follows the human | **IDENTITY** — follows the person | **BODY** — dies with the vessel |
|---|---|---|---|
| | `HasInteractive` (the connection set) | `Contacts` · `Calendar` · `NotifyPolicy` | `Aether` (the implant is physical) |
| | client state · **the cockpit** | `PartyMember` · `SubjectSubscriber` | `Forkable` (the slices) |
| | `Focused` · `Alias` · `Workspace` | `Estate` + `escheatedAt` / `beneficiary` | `Persistable` (**the writer**) |
| | | `Author` (code-trust is the account's) | the `Character` stack |

⚠ **Three that do not sort cleanly, and they are product calls:**
**`Named`** (its own comment argues *"a body is not a somebody"* while
re-embodying obviously keeps your name); **`Wardrobe`** (the outfit names
are yours, the gear they reference goes to the corpse); and
**`Environment`**, which is genuinely split — mostly driver, except
`movement.defaultMode`, which is a body preference.

⭐⭐ **`Shell` is a driver-shaped package bolted to a body.**
46 lines, an **empty class body**, five mixins, and exactly **one
consumer**. It is not a layer; it is a name for a composition — so logic
does not go *on* it, and the honest question is whether the shell suite
belongs on the body at all. It is also the house precedent for a mixin
with one composer that exists to name a concept, which is the pattern the
rest of this slate leans on.

⭐ **And it splits the NPC question.** If "shelled" means *the full
command-line experience for a human typist*, an NPC has no business with
it — which makes **scripting a separate, opt-in package** that is not
shell-shaped. The `shell` command category (`cd ls pwd cat cp mv rm mkdir
find grep write` · `alias settings var` · `script` · `cockpit`) is
visibly three things wearing one name, and `cockpit` being in it while
its state lives on `HasInteractiveMixin` is the tell.

---

## Part 1 — the sandbox policy table

### The requirement

**A circle is a test bed for content authors, and "you just do not write
any records" makes it a partial experience** — bad for testing and bad
for playing in your own environment. Deeds and chronicles need to
*persist*, and to be *ignored by anything outside the circle*. Whether
scoped rows are cleaned up at exit is a separate question with more than
one right answer.

### The four verbs, and the fifth that does not exist

```ts
export type CollectionPolicy =
  | { verb: 'stamp' }
  | { verb: 'refuse' }
  | { verb: 'pass'; mark?: boolean }
  | { verb: 'shadow'; mode: 'skip' | 'overlay' };
```

| verb | n | disposition from circle context |
|---|---|---|
| **pass** | 11 | writes go to the real store. With `mark: true` (5 of them) the row records `circleScope` and is **never filtered** — *"what happened to you stays yours; readers may lens the mark"* |
| **stamp** | 5 | written real carrying `circleScope`; field reads exclude, circle reads **union** global ∪ own-scope; exit discards |
| **shadow / skip** | 5 | the terminal cache write no-ops; in-circle reads derive from events |
| **refuse** | 27 | throws `SandboxWriteRefusedError` |
| **shadow / overlay** | **0** | ⛔ *"specified as the labeled attach point, **not built** — no collection needs it."* |

> ⭐⭐⭐ **Every part of the requirement above reduces to that one unbuilt
> primitive, and this slate is its first consumer.**

### ⚠⚠ The live defect — overlay fails open

Both write paths read:

```ts
case 'shadow':
  if (policy.mode === 'skip') { /* no-op receipt */ }
  break;          // ← overlay lands here and falls out of the switch
```

- **`dispatchSave`** → falls through to `persistSave`: **a real field row,
  unstamped.**
- **`deleteMany`** → falls through with the **caller's unscoped filter**:
  a circle session bulk-deleting real rows.
- **reads** → `SHADOW_COLLECTIONS` derives from `verb === 'shadow'`, so
  overlay gets the field-only filter — *consistent* with those unstamped
  writes, which is what makes it invisible.
- **`discardScopeImpl`** iterates `STAMP_COLLECTIONS` only, so scoped
  overlay rows would never be swept, at exit or by the orphan sweeper.

⚠ The contrast is the point: an **unclassified** collection throws, with
a comment saying *"silence would be an escape hatch."* The
classified-but-unimplemented mode walks straight past that instinct. And
`discardScopeImpl`'s own comment claims *"**Total by construction**: the
collection list derives from the policy table"* — **it derives from one
verb**, which is the same defect shape as an enumerated lint roster:
derived-but-not-derived-enough reads as safe and is not.

⭐ **Ship the throw first, on its own.** Three switches, one line each.

### The 27 refusals, triaged

The criterion is the tree's own, from the `wiki` audit note — *"'field-
visible' is not the criterion"* — the line is **a deliberate, attributed,
append-only act by someone already authorized** versus **an unrequested
mutation of somebody else's row**. Read-side, the complement: *if a reader
forgets the filter, is the failure a wrong number or granted access?*
**Stamp fails open; overlay fails safe.**

| verdict | n | collections |
|---|---|---|
| **REFUSE stands** | 9 | `users` · `google_profiles` · `twitch_profiles` · `kick_profiles` (real-world identity) · `app_settings` · `world_state` (world configuration) · `pack_installs` (operator state) · `media_assets` (*regenerating the images costs real money*) · `descriptor_banks` (one write changes every unidentified item in the world) |
| **→ overlay**, reasoned but reasoned before overlay existed | 8 | `parcels` · `parcel_events` · `chattel` · `chattel_events` · `groups` · `office_holders` · `positions` · `producer_events` |
| **→ overlay**, never triaged | 9 | `contracts` · `contract_events` · `parties` · `channels` · `forum_boards` · `forum_subjects` · `forum_entries` · `forum_events` · `forum_votes` |
| **not a sandbox question** | 1 | `blueprints` |

⚠⚠ **Twelve of the 27 say only *"REFUSE under the sandbox."* with no
rationale** — the whole forum family, channels, parties, contracts and
both event chains. A test bed where you cannot hold a forum thread, form
a party or write a contract is the partial-experience complaint in its
most literal form, and nobody ever argued for it.

⭐ **`blueprints` is misfiled.** It is refused because *"its dedup path
**overwrites** an existing global catalogue row's name/metadata on a
signature hit — field-visible mutation, not an append."* That is a
**write-path defect**, not a sandbox policy. Fix the dedup and it is
`pass`.

### ⭐⭐⭐ Overlay is two modes, not one

**Stamp unions; overlay must override.** An append-only ledger genuinely
wants `$or: [global, own-scope]`. A *mutable row* does not — union gives
two rows for one key and the caller has to pick. What you want is *the
scoped row if one exists, else the global one*, and **Mongo cannot express
that in a single `find` filter.** That is why overlay was deferred rather
than built.

| mode | read | needs | for |
|---|---|---|---|
| **`copy`** | plain `{ circleScope: scope }`, after an eager copy at crossing | nothing — no identity key, no aggregation | small, session-scoped row sets |
| **`through`** | read-through: aggregation (`$match` union → `$sort` scoped-first → `$group` by key, `$first`) | a **declared identity key per collection**, and **tombstones** for deletes | large global registries |

> ⭐⭐ **`copy`'s read branch is *simpler* than the stamp branch it sits
> beside**, and it needs neither of the two hard things. Ship it first.

- **`copy`** covers `holder_snapshots` (the row set is *your* snapshot —
  O(1)), and plausibly `parties`, `contracts`, `contract_events`,
  `channels` and the forum family, where a circle that starts empty is
  fine and arguably better.
- **`through`** is required for `parcels`, `chattel`, `groups` and their
  event chains, because content calling `ownerOf` must see **the world's**
  titles while only *your* writes stay local. ⚠ And it owes a design for
  *"I deleted this parcel inside my circle"*, which has no representation
  when the global row is still there and still matches.

Proposed: `mode: 'skip' | 'copy' | 'through'`.

### ⭐⭐⭐ The crossing already has the hook

`SandboxLogic` line 379, immediately after the vessel is minted:

```ts
// Park the field body: presence-freeze + eviction veto + a durable
// capture so a crash-restart mid-visit can never lose real-body state.
actor.setParked(true);
await actor.save().catch(...)          // best-effort, loud failure
```

**The park capture already writes the real `holder_snapshots` row at the
moment of crossing, for a reason that is exactly copy-on-enter's
semantics** — *freeze the real body's state at the instant you leave.*

And the phases are already divided the way doctrine requires:
`forkRuntimeState` (line 359) runs **inside** `runRootGuarded(…, {
circleScope })` and is runtime-only; `save()` (line 379) runs **outside**
it, in field context, writing the real row unstamped. So Forkable's
*"slices are RUNTIME state only — never a persistence route"* is respected
by construction, and **a DB copy step beside the park capture violates
nothing.** It is a third phase in a choreography that already has two
cleanly separated ones.

⭐ Precedent for the discard: `discardScopeImpl` already ends with
`BankingApi.discardScopeOverlay(scope)` — **an overlay with its own
discard hook, already wired into the generic path.**

### What overlay changes about ownership

`holder_snapshots` is currently `{ verb: 'pass' }`, and the reasoning is
sound but was made against the wrong alternative: *"a scoped snapshot
would be a host that restores differently depending on where you stood"*
is an objection to **stamp** (two rows, ambiguous `materialize`) and does
not apply to overlay, where the circle has one store that is definitionally
the one you read while inside.

> ⛔ **Today the only thing between a wire body and your player record is
> `SandboxAvatar.shouldPersist() → false`** — one boolean on one subclass,
> guarding a collection that is explicitly **`sandbox: pass`**. Overlay
> makes the guard structural and lets the boolean go.

⚠ **A name collision waiting to bite:** `holder_snapshots` declares *"one
record per (scope, owner) — enforced unique"*, where **`scope` there is
the host scope, not `circleScope`.** Any scoped copy needs that unique
index widened, and the word already means two things in the one collection
we most want to overlay.

---

## Part 2 — persistence per body

### `shouldPersist()` is a boolean and the product needs an allowlist

The requirement is a **partition**, not a switch:

| | driver state | identity state | body state |
|---|---|---|---|
| **living body** | writes | writes | writes |
| **shade** | ⭐ writes | writes | ⛔ different physical form |
| **wire body** | ⭐ writes | ⛔ the cheat vector | ⛔ A14 |

⭐⭐⭐ **The mechanism is already sliced:** *"capture is per-mixin-composed
— a host's row holds exactly what its composed mixins contribute."* So
replace the boolean with a **per-mixin capture allowlist**, and **reuse
the line the fork allowlist already draws**: `mergeStateFrom` is
*"allowlisted by the consumer — epistemic-only for the sandbox, which is
the discard doctrine expressed as a list."*

> **One line, two mechanisms.** A shade captures `Alias`, `Environment`,
> `ClientState`, `Contacts`; never `Embodiment`, `Vitals`, `Estate`.

### The protected set is one row

The guardrail for a ghost is *do not overwrite state that needs restoring*
— and that set turns out to be a single row. `PassageController`: a shade
*"returns to the world in a new body… **carrying nothing**."*
`mortality.md`: *"almost everything survives a new body **with no carrying
mechanism at all**"*, because the ledgers are identity-keyed and
append-only (A2).

> **So the only thing a ghost could damage is the identity's
> `holder_snapshots` row.** Everything else is safe by construction. The
> guardrail is narrow enough to be structural.

### ⚠ What is actually built today

Verified, because none of it was tested:

- `ShadeAvatar.shouldPersist() → false` (*"a shade persists nothing"*),
  `startAutoSave()` no-op.
- `SandboxAvatar.shouldPersist() → false` (*"the guest gate, verbatim"*),
  `startAutoSave()` no-op.
- **Sandbox driver state already round-trips** — `SandboxLogic` forks in
  at 359 and **merges out at 456 with the epistemic allowlist**, so an
  alias made in a circle *does* come back today.
- ⛔ **Ghost driver state does not.** Death forks *in* permissively
  (`ConditionLogic:692`, so your existing aliases reach the shade), and
  **nothing calls merge on the way out.** An alias made as a ghost is lost
  at reembody.

⭐ So the ghost half is one missing merge call plus an allowlist, not an
architecture.

---

## Part 3 — provenance, and the death spec

### `PASS (mark)` already is the ghost requirement, one axis short

*"Identity-real; persists with the epistemic wire mark (`circleScope`
recorded, **never filtered**). What happened to **you** stays yours;
readers may lens the mark."* — `chronicles`, `beliefs`,
`authoring_events`, `accountability_events`, `diagnostics`.

That is the requirement verbatim, with `circleScope` where a **phase**
belongs. **Add the second axis; do not invent a mechanism.** Ghost-written
records then aggregate by default and filter on request, which is the
house pattern anyway: append, stamp provenance, derive on read.

### The death spec is captured and read by nothing

Ten fork slices exist. Seven are two-way; **three are fork-only** —
`Anatomy`, `Trauma`, `CauseOfDeath`, declared on `ConditionLogic`. They
are exactly *physical state at death*, and there is a test asserting
`forkRuntimeState(corpse, freshBody)` **is a structural no-op**.

Recovery already ships: `PassageController`'s floor route costs
`RECOVERY_RESERVE_COST = 60` (% of each biological reserve), and *"content
is free to be better than it."*

> ⭐⭐ **So the spec is captured, the recovery is parameterized, and
> nothing joins them.** The join must be a **mint parameter, not a merge**
> — you do not merge anatomy into an existing body, you *construct* a new
> one from a spec. That preserves *"material slices have no merge path
> back; there is no 'trusted mixin' escape"* and its test, and still gives
> `reembody` what it needs.

⭐ One object, three readers: the **corpse** decays it, **reembody**
recovers from it, **autopsy** reads it. That satisfies *promote at the
third consumer* on its own. It also retires `ShadeAvatar.shadeSpecies` and
`SandboxAvatar.wireSpecies`, which are the same object stashed twice by hand.

⚠ **Out of scope, named:** whether `Corpse` should move from the Agent
branch to Thing. It is `class Corpse extends Creature {}` today and
`mortality.md` calls it *"the corpse as a forensic Creature"* deliberately.
The real question is whether the forensic surface needs Creature
**anatomy** or a **record** — and a branch move belongs to the narrowing
pass, not here.

---

## Part 4 — the class layering, which is downstream of all of it

### The overrides, re-diagnosed

`ShadeAvatar` and `SandboxAvatar` are near-identical piles of the same five
overrides. Sorted honestly:

| override | verdict |
|---|---|
| `getPlayerId` · `getIdentityPath` | ⛔ **defect.** `mortality.md`'s own table says identity is *the same path* — so `playerId` / `wirePlayerId` / `shadePlayerId` are **three fields holding one value, and three overrides normalizing them back** |
| `shouldPersist` · `startAutoSave` | ⚠ an invariant (*exactly one body may write the identity snapshot*) **expressed as a negation**. Part 2 makes it structural |
| `announceSessionPresence` · `onLinkdead` | ✅ legitimately different behaviour |
| `toString` | trivial |

⚠ **Do NOT re-derive the composition as parallel sibling stacks.**
`mortality.md` chose one composition on purpose: *"the whole verb surface
has to survive losing a body, and re-deriving it as a parallel stack would
start missing verbs immediately. **Activations differ; composition does
not.**"* And the deck strengthens that reason — a verb that is *gone*
cannot refuse, which is the failure that retired verb conferral, and per
[#28](../../lenses/28-the-state-machine.md) the composition chips are a
**teaching surface**.

### ⭐ Which does not cost us the drastic feel

The product wants **ghost ↔ body to feel drastic** (losing verbs *is* the
representation) and **the sandbox to feel seamless** (the drastic moment
is coming *out*). Today the two bodies are twins; they should barely
resemble each other. And both are reachable without touching composition:

> **`AffordanceResultEnvelope.composition` already ships the *active* set**
> — *"not declared: augments, implants, species innates and on-shift
> conferral all change it at runtime."* So **deactivation already produces
> the drastic feel**: fewer chips, fewer afforded verbs, stable
> composition underneath. `ShadeAvatar.getConferredMixinNames() → ['AetherMixin']`
> is the *additive* half of that seam already in use (the "intrinsically
> attuned species"). ⭐ **What is missing is the subtractive twin** — a
> body can gain activations wholesale and can only lose them one validator
> at a time.

And if a bare *"no such command"* reads badly for a ghost, that is **prose
on the refusal**, not an architecture problem.

### `HasInteractive` is three concerns

1168 lines holding: the **connection set** (~50 — `interactives`,
add/remove/has/clear, `isConnected`, `isLinkdead`, `presenceStatus`,
`canEvict`); **client state**; and **~200 lines of cockpit** —
`getCockpitMode`, `getCockpitArrangement`, `arrangementCards`,
`savedArrangementsFor`, `validateArrangementName`, `legacyLayoutFor`,
`migratedLegacyLayout`, `getPortraitUrl`, `refreshDisplays`.

> ⭐⭐⭐ **The split test, and it is the product's:
> *it should be possible to build an entirely different client.*** Anything
> a third-party client would not need is not `HasInteractive`. **The
> cockpit needs a driver but is not one.**

⭐⭐ **And this makes a published claim structurally true.**
[positioning.md](../../positioning.md) already says *"the server is
authoritative; the client renders MML. **A different client is a different
renderer, nothing more.**"* Today cockpit layout state is baked into the
mixin that models *having a driver*, so the claim holds of the protocol
and not of the code.

`SaxonbergClient` is **a mixin** (decided). Whether it also moves into a
pack is open and decidable by one check: **a pack may ship `lib/`
substrate but never an Api or a logic singleton**, so if any of those ~200
lines needs Api surface, it stays kernel.

---

## Sequencing

1. ✅ **DONE 2026-09-30 — `mode: 'overlay'` throws.** All three write
   paths (`dispatchSave`, `dispatchDelete`, `deleteMany`) raise
   `SandboxOverlayUnimplementedError`, and `SchemaDoc.#parseSandbox`
   refuses the mode outright so the failure lands on the author at
   `gen:schema` time rather than at runtime inside a circle.
   ⭐ `PersistenceManager.sandbox-policy.test.ts` pins all three plus the
   field-context control; step 2 starts by deleting those throws, and
   that test block is the list of what has to replace them.
2. **Build `mode: 'copy'`** — the read branch, the derived partial index,
   the discard set widened past `verb === 'stamp'`, and the copy step
   beside the park capture.
3. **`holder_snapshots` → `copy`**, retiring `SandboxAvatar.shouldPersist()` as
   the cheat guard.
4. **The 17 re-tiered** — `copy` where the row set is session-scoped.
5. **Capture allowlist** replaces `shouldPersist(): boolean`, on the
   epistemic/material line.
6. **The phase axis** beside `circleScope`, and the missing merge call at
   reembody.
7. **The death spec** consumed by `reembody` as a mint parameter.
8. **`mode: 'through'`** for the registries — declared identity keys and
   tombstones.
9. **The class layering**: one identity field on a shared base, the
   `HasInteractive` / `SaxonbergClient` split, driver state off the body.

⭐ The order is not preference. **Every override this slate was started to
remove is load-bearing until the thing above it lands** — which is why the
class shuffling is last.

## Open questions

1. **`Named`, `Wardrobe`, `Environment`** — the three mixins that do not
   sort cleanly onto driver / identity / body. `Environment` is the one
   with a genuine internal split (`movement.defaultMode`).
2. **Does a shade accrue to the ledgers?** They are identity-keyed, so a
   shade writes by default today. Being dead and still earning
   participation may or may not be wanted; it is a product call and the
   phase mark makes either answer cheap.
3. **Does a dead player keep `Estate` writes** — can they change their
   will? The only identity state whose ghost-availability is not obvious.
4. **`su` and the target's UI.** Decided as *droppable*: the driver may
   want the target player's cockpit and it is not always true, so the
   first cut keeps the driver's own. Recorded so the decision is not
   re-litigated.
5. **Is `SaxonbergClient` also a pack?** Turns on whether any of the
   cockpit surface needs an Api.
6. **Does `through` need tombstones, or is delete-in-circle simply
   refused?** The cheaper answer may be good enough for a test bed.

---

## ⭐⭐ Measured 2026-09-30 — the survey behind the layering requirements

Four full-tree surveys, taken at `89c75417c` for
[agent-branch-layering-requirements](../../requirements/agent-branch-layering-requirements.md).
**Several correct this slate.** Re-take them if this sits.

### ⛔⛔ `su` DOES NOT EXIST — and it is half of this slate's method

The spine sorts state with two questions: **`su`** (*what follows the
human?* → driver) and **death** (*what comes back?* → identity vs body).

**There is no `su`.** No command view, no controller; nine plausible
synonyms checked (`become`, `possess`, `puppet`, `assume`, `inhabit`,
`impersonate`, `takeover`, `control`). Every `transferTo` call site in
the tree is `Login`, `embody`, death-into-shade, or the sandbox
crossing — all of which move **your own** sockets between **your own**
bodies. Nothing takes a player id that is not yours.

⭐⭐ **Consequence: the driver/identity line is not observable.** Death
discriminates identity from body and is shipped. Nothing discriminates
driver from identity, because one human is one account is one person —
both buckets "follow the human" and no behaviour can tell them apart.
The three-way sort is **a two-way sort plus a prediction about an
unbuilt verb**, and the survey already disagrees with this slate about
`Author`'s bucket with no way to settle it.

⭐ **The one shipped probe:** a **guest** is driver-without-identity —
`Avatar.isGuest` → `shouldPersist() → false`, a live socket with no
account to write to. Weaker than `su` (it separates *has an account*
from *is driving*), but it can fail.

**Decided for the layering build:** sort on **body vs person** (the line
death tests), leave the finer line written down here.

### ⚠ Correction — only `Contacts` round-trips, from anywhere

This slate's Part 2 says *"an alias made in a circle **does** come back
today."* **It does not.**
`SandboxLogic.ts:90` — `EPISTEMIC_MERGE_ALLOWLIST = ['Contacts']`, one
entry. `Alias`, `Environment` and `ClientState` all declare
`mergeSlice_` methods that **nothing consumes**. So *"ghost driver state
does not round-trip"* is not an anomaly to fix — **nothing else
round-trips either**, from a circle or from death.

⚠ And the mint-only material slices are **four**, not three:
`MATERIAL_FORK_SLICES = ['Vitals','Trauma','CauseOfDeath','Anatomy']`
(`Vitals.ts:144-149`). `Vitals` is the one this slate's Part 3 misses.

### The fork-slice census, complete

| slice | declared on | reachable back? |
|---|---|---|
| `Contacts` | `lib/social/Contacts.ts:144,148` | ✅ **the only one** |
| `Alias` | `lib/shell/Alias.ts:212,217` | ⛔ not allowlisted |
| `Environment` | `lib/shell/Environment.ts:274,279` | ⛔ |
| `ClientState` | `lib/connection/HasInteractive.ts:739,748` | ⛔ |
| `Presentation` | **`Avatar.ts:1590,1631`** — not on `Named` | ⛔ |
| `Embodiment` | **`Avatar.ts:1613,1622`**; `ShadeAvatar.ts:144` overrides merge | ⛔ |
| `Vitals`/`Trauma`/`CauseOfDeath`/`Anatomy` | `lib/vitals/Vitals.ts:1127+` | mint-only by construction |

⚠ The two slices that most look like mixin state — `Presentation` and
`Embodiment` — are **not mixin-owned**; they are hand-written on
`Avatar`, and `forkSlice_Presentation` copies four scalar name fields
while **skipping `alternateNames`**.

### `HasInteractive` — SIX concerns, and the cockpit is ~620 lines

This slate names three. There are six: **connection set** (~53 lines),
**client state**, **cockpit**, plus **presence** (`presenceStatus`),
**residency** (`canEvict`), **identity** (`getPortraitUrl`), **spatial**
(`refreshDisplays`), the **sandbox slices**, and a **verb surface**
(`static commandContributions`, the whole `cockpit` tree).

⚠⚠ **The "~200 lines of cockpit" counts only the methods** (860–1062 =
203). It misses **~415 lines of `clientStateSchema`** (267–681) — fifteen
entries of pure cockpit vocabulary. **True cockpit mass: ~620 of 1,168.**

**Coupling: `COCKPIT → CS → CONN`, with ZERO edges back** from either
lower layer — except one. Call sites: cockpit **24 production**, 20 of
them in three controller files plus `Avatar.enter`; CONN ~45 production
+ ~65 test + one content site (`Realtor.ts:153`); CS 14 reads / 16
writes, of which 11 and 14 are cockpit controllers.

**The hazards, in order of how silently they bite:**

1. ⚠⚠ **Fork-slice discovery is PREFIX REFLECTION**, not registration
   (`Forkable.ts:39-40` walks the prototype chain for `forkSlice_`).
   Move the pair to a mixin some host does not compose and it stops
   firing **with no compile error** — losing exactly the
   preferences-across-the-boundary behaviour it was written to fix.
2. ⚠ **`snapshotClientState` :1140/:1144 is the one CS→COCKPIT
   back-edge** — the generic snapshot hard-codes `cockpit.mode` and
   `cockpit.arrangements`. Break it and the split is acyclic; leave it
   and the two halves are a cycle. Pinned by
   `cockpit-mode-migration.test.ts:112`.
3. ⚠ **`_mixinName` is load-bearing as a STRING** — `PresenceLogic.ts:40`
   gates `FromMixin('HasInteractiveMixin', …)`, and
   `MixinApi.isHasInteractive` narrows to the **whole** interface at ~70
   sites. Whichever half loses the name costs 70 re-typings.
4. ⚠ **Splitting changes `Login`'s verb set.** `commandContributions`
   (:683-699) ships the cockpit tree from the CONN mixin; `Login`
   composes it and its own comment calls the extra verb *"harmless"*.
   A behaviour change wearing a refactor's clothes.
5. ⚠ **`Display` writes cockpit state from a world object**
   (`Display.ts:345-355, 382-387` write `cockpit.watch` and push it), so
   *"the cockpit is not a driver"* is complicated: a screen in a room
   drives it. `display.md:273` codifies the arrival hook.
6. ⚠ **`CommandGiver.ts:688` reads `cockpit.inputModes` in dispatch** —
   the cockpit keyspace is load-bearing in the command spine, not only
   the renderer.
7. ⚠ **The push channel is NOT schema-bounded** — `NotifyController:232`
   pushes `social.rules` and `SettingsController:159` pushes
   `shell.result`, neither a `clientStateSchema` entry. Any design
   assuming push keys ⊆ schema keys is wrong today.
8. ⚠ `cockpit-mode-gates-nothing.test.ts:73` **hard-codes the file
   path** in an allowlist whose comment says editing it is *"a design
   decision, not a lint fix."*
9. `clearInteractives()` and `savedArrangementsFor()` have **zero
   external callers** — two public members the split carries for nothing.

### The mixin sort — what is shared and what is furniture

**24 of the 33 mixins on the player stack have exactly ONE composer.**
Only `PostRegistration` (n=75) and `Persistable` (n=17) are real shared
substrate. Seven have exactly one non-player second composer (`Named`
→ `Cast`/`KeptAnimal`; `HasInteractive`/`CommandGiver` → `Login`;
`PartyMember` → `Mercenary`; `Hauler` → `DraftAnimal`;
`Status`/`BeliefStore` → `KeptAnimal`).

⭐ **`Shell`'s five are ALL n=1** — 46 lines, empty class
body, one consumer. The single most movable unit in the stack.

⚠ **Eight mixins hold no state at all**: `Forkable`, `PostRegistration`,
`Author`, `Advancement`, `Dispositioned`, `Soul`, `Vocal`, `Perceiver`.
`Advancement` (637 lines) and `BeliefStore` (799) are the two largest
IDENTITY mixins and **both hold zero persistent host state** — Documents
keyed on `getIdentityPath()`. That is *why* identity survives a new body
"with no carrying mechanism at all".

⚠ **`Author` is bucketed DRIVER against this slate's IDENTITY.** The
slate argues *"code-trust is the account's"* — but `Author.ts:33` is
`static fieldMeta = {}` and `:5` says *"the mixin owns no state v1."*
What it holds is three eval knobs, two `lifetime: 'session'`. The bucket
flips if permission ever lands there; today the evidence says driver.

### ⚠ `Environment` is not a split mixin — it is a shared STORE

`collectSchema` (`Environment.ts:157-186`) walks the **host's** prototype
chain, so the keyspace is a function of the composition, and **the keys
belong to nine different declaring layers** (`Environment`,
`CommandGiver`, `Workspace`, `Author`, `NotifyPolicy`, `Soul`, `Mobile`,
`Persona`, `Avatar`, plus `Combatant` off-stack). **Partitioning
`Environment` is really partitioning nine `static settings` blocks.**

**Is `movement.defaultMode` the only body key?** ⭐ **It is the only
unambiguous one, and structurally so**: it is the only key in the roster
whose resolution chain reaches into the **body plan**
(`Environment.ts:145-152`; `LocomotionApi.defaultModeFor` defers to the
bodyplan default only absent an explicit override). Three candidates
behind it: `combat.lethality`/`combat.stopCondition` (⚠ declared on
`Combatant`, which is not on this stack — the store is **not**
partitioned by composer); the **four peer-facing**
`messages.movement.*Peers` keys (how others see you move is closer to a
signature than a preference — the `*Self` four are unambiguously
driver, and nobody has drawn that line inside one eight-key family);
and `identity.portrait`, the only key already named for its bucket.

### The three that do not sort, at field level

- **`Named`** (5 fields, all persistent+authorable). The *composition
  rule* is body-shaped (`:16-19` records it being pulled off the
  creature base in 2026-09-10 because *"a wolf, a corpse, a mercenary
  and a head of stock all carried `setSurname`"*), but the *values* are
  identity-shaped. ⭐ The code already resolves this the awkward way —
  `Avatar.forkSlice_Presentation` hand-copies the four scalars **from
  Avatar, not from Named**, and skips `alternateNames`.
- **`Wardrobe`** (one field, `wardrobes: Record<string,string[]>`;
  ⚠ `persistent: true` with **no `runtimeState: true`**, unlike every
  other persistent field in the stack — check that this is intended).
  Keys are a vocabulary the person invented (identity); values are
  keywords resolved at wear time against whatever the body has. ⭐ Its
  own design note settles it: *"a saved set **survives buying a
  replacement shirt**"* and a keyword resolving to nothing is *"skipped
  with a readable line"* — **death is structurally identical to "the old
  shirt is gone."** The cheapest of the three calls. ⚠ Against: it
  currently rides the Avatar snapshot *"for free"*, so an identity
  bucketing needs a new home.
- **`Environment`** — see above; not a mixin question at all.

### ⭐⭐ `Avatar.ts` itself — six concerns, and two descendants that are twins

Nothing in this slate surveyed the class body. 1,649 lines:

| concern | members |
|---|---|
| succession/death | `escheatedAt`, `beneficiary`, `lastSeen`, `mortalArc`, `isDeceased`, `reconcileMortalState` |
| session & connection | `user`, `playerId`, `isGuest`, `sendMessage`, `handleMessage`, `handleEnvelope`, `getRoutingRules`, `onLinkdead`, `isConnected`, `announceSessionPresence`, **`enter()` — 210 lines, :901-1111** |
| persistence | `shouldPersist`, `save`, `restore`, `startAutoSave`, `stopAutoSave`, `postRegister` |
| sandbox | `parked`/`isParked`/`setParked`, **four** fork/merge slice methods |
| content | `installDefaultLoadout`, `applyStartLocation` |
| statics | **17 `self` verbs**, `settings`, `subscribableFields`, `fieldMeta`, three template-path constants |

⚠ **`EstateMixin` declares `static fieldMeta = {}` — zero fields — while
`Avatar` carries `escheatedAt` (:305,:316) and `beneficiary` (:306,:332)
as class fields.** The mixin holds the behaviour and the class holds the
state. (Its `_estate` map is transient, rebuilt by `restoreSlice`.)

**⛔ `ShadeAvatar` and `SandboxAvatar` are the same eight overrides twice:**

| ShadeAvatar | SandboxAvatar | what it is |
|---|---|---|
| `shadePlayerId` :60 | `wirePlayerId` :54 | ⛔ `Avatar.playerId` under two more names, **each a persistent field** |
| `shadeSpecies` :72 | `wireSpecies` :66 | ⛔ the same slot twice |
| `getPlayerId()` :108 | `getPlayerId()` :124 | returns the local copy |
| `getIdentityPath()` :113 | `getIdentityPath()` :129 | rebuilds `Avatar.getTemplatePath(copy)` |
| `shouldPersist()` :99 | `shouldPersist()` :120 | ⚠ the only two genuinely gated on Sequencing 5 |
| `startAutoSave()` :104 | `startAutoSave()` :136 | ditto |
| `postRegister` :74 | `postRegister` :90 | ceremony |
| `toString` :179 | `toString` :168 | trivial |

**Eight of ShadeAvatar's eleven members and eight of SandboxAvatar's ten.** Four of
the overrides exist **only to normalize a copy that should not have been
made**. Legitimately different: ShadeAvatar's `getConferredMixinNames`,
`mergeSlice_Embodiment`, `onDestruct`; SandboxAvatar's
`announceSessionPresence`, `onLinkdead`.

---

## ⭐⭐⭐ The four vessels — and the corpse is the inverse case

*Captured 2026-09-30 from the design conversation. The mechanics were
already written down ([mortality.md § The corpse](../../subsystems/mortality.md),
§ Part 3 above); **this framing was not**, and it is the thing that makes
the class question answerable.*

A player's state at any moment lives in one of four vessels, and sorting
them on two axes is what shows the shape:

| vessel | identity | material state | of record? | own clock |
|---|---|---|---|---|
| **`Avatar`** | **is** the identity | yours, live | ✅ persists, holds the `PlayerApi` slot | — |
| **`ShadeAvatar`** | borrows the real one | none — incorporeal | ⛔ | — |
| **`SandboxAvatar`** | borrows the real one | baseline mint, no gear | ⛔ | — |
| **`Corpse`** | ⛔ **none** | ✅ **stamped with yours** | ✅ (a `Creature`, cloned from a row) | ✅ its own decay machine |

⭐ **Three of the four keep your identity and discard your material
state. The corpse does the exact opposite.** That is why it never felt
like part of this family and why it kept getting filed elsewhere — it is
the same design question answered the other way round, not a different
question.

⚠⚠ **And the inversion has a live consequence: your material state at
death is written down TWICE, and the copy nobody reads is the one the
way back needs.**

- The **corpse** receives it through the gated `adoptMaterialState`
  (`ConditionLogic.ts:639`), for forensics. Decay degrades it on
  purpose — *the examiner reads signs and can be wrong; the stamp is the
  answer key.*
- The **fork slices** `Anatomy` / `Trauma` / `CauseOfDeath` capture the
  same facts separately, mint-only, **and are read by nothing** (§ Part 3).
- ⭐ **`reembody` never reads the corpse**, deliberately and correctly
  (`mortality.md:474`): a corpse decays, can be destroyed and does not
  survive a restart, so a route that consulted one would strand whoever
  came back too late — *"the bricking failure mode in a third costume."*

**So the captured spec is the only honest route back, and it is inert.**
That is Sequencing 7 (*the death spec consumed by `reembody` as a mint
parameter*) restated with the reason it cannot be shortcut by reading
the corpse instead.

### What this says about the class question

⭐ The differences between `Avatar`, `ShadeAvatar` and `SandboxAvatar` are **not
kinds of thing — they are one policy answered twice.**
`SandboxAvatar`'s own docstring enumerates what differs, and every item is
the same axis: *backed by nothing · not the registry body · identity
thread returns the REAL identity · baseline mint · reaped wholesale.*
`ShadeAvatar` is that list again plus incorporeality.

**Is this the body of record, or a stand-in for it?** That question
absorbs six of the eight duplicated overrides
(`shouldPersist`, `startAutoSave`, `getPlayerId`, `getIdentityPath`,
the reaping, `announceSessionPresence`), which is the case for an
intermediary rung **even though nothing branches above it** — the
`Holder` / `Actor` precedent from the narrowing build, where a
twin-less rung exists to name a responsibility.

```
Avatar                    abstract — a human's handle in the world
├── <the body of record>  persists · holds the PlayerApi slot · owns the estate
└── <a stand-in vessel>   never persists · borrows the identity · is reaped
    ├── ShadeAvatar             incorporeal; ends at re-embody
    └── SandboxAvatar          corporeal, circle-scoped; ends at the door
```

⚠ **The inheritance is defensible; the overrides are not.**
`SandboxAvatar.ts:5-9` gives the real reason for subclassing — *"the crossing
must preserve the whole verb surface… re-deriving it as a parallel stack
would be drift by construction"* — which argues for a **shared base**
and says nothing in favour of answering one policy on two sibling
leaves.

### Where the Avatar-only mixins fall out

Measured by whether the two vessels mention them at all:

| mixin | ShadeAvatar | SandboxAvatar | belongs on |
|---|---|---|---|
| `Calendar` · `SubjectSubscriber` · `NotifyPolicy` · `PartyMember` | 0 | 0 | **the body of record** — inherited and inert on a vessel |
| `Wardrobe` | 0 | 1 | the body of record (a shade has nothing to dress) |
| `Estate` | 3 | 1 | the body of record — it is the *succession* concern, which is why `escheatedAt`/`beneficiary` sit beside it |
| `Contacts` | 0 | 1 | ⭐ **abstract `Avatar`** — the one thing that legitimately crosses every phase, and the only two-way fork slice in the system |
| `Aether` | 3 | 2 | ⚠ contested — `ShadeAvatar` re-grants it via `getConferredMixinNames`, i.e. **activation already doing a rung's job**, and the only existing proof these differences can be data |

### The naming axis — still open

*"They are all Avatars, just for different phases of the game"* — the
word **phase** was reached for first (phases of matter, of the moon, of
a waveform) and nobody is attached to it. What the names must express is
**how the avatar is used in the game**, not what it is made of. Three
candidate axes, undecided:

- **permanence** — the one that lasts vs the ones that do not (this is
  the axis the code actually branches on today);
- **agency** — what you can do from it;
- **phase of play** — living / dead / rehearsing, with permanence
  falling out as a consequence.

⚠ `Corpse` is a fourth vessel on this picture but ⛔ **not a fourth
Avatar** — it has no identity, no driver and its own clock. Whether it
should move from the Agent branch to Thing stays the narrowing slate's
question; this table is the argument that it is *related to* the avatar
family without *being* one.

### `Login` — considered, and not renamed

Not a phase and does not join the family: **`Avatar` is your handle in
the game world, and `Login` is not in the world yet.** It is a menu
system wearing an agent because it needs the command bus; making it
`CommandGiverMixin(Idea)` instead of an Agent is arguable and low-stakes.

⭐ **The one thing it constrains:** it composes `HasInteractiveMixin`,
so whatever the connection half becomes must keep working for a thing
that is **not an Avatar at all** and deliberately composes almost
nothing. It is the test case that stops the connection mixin from
quietly becoming avatar plumbing — and the reason the `cockpit` verb
tree riding on that mixin is a real constraint on the split, not a
detail.
