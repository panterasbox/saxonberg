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
> `holder_snapshots` onto overlay, retiring `WireBody.shouldPersist()` as
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

⭐⭐ **`ShelledCharacter` is a driver-shaped package bolted to a body.**
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
> `WireBody.shouldPersist() → false`** — one boolean on one subclass,
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

- `Shade.shouldPersist() → false` (*"a shade persists nothing"*),
  `startAutoSave()` no-op.
- `WireBody.shouldPersist() → false` (*"the guest gate, verbatim"*),
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
third consumer* on its own. It also retires `Shade.shadeSpecies` and
`WireBody.wireSpecies`, which are the same object stashed twice by hand.

⚠ **Out of scope, named:** whether `Corpse` should move from the Agent
branch to Thing. It is `class Corpse extends Creature {}` today and
`mortality.md` calls it *"the corpse as a forensic Creature"* deliberately.
The real question is whether the forensic surface needs Creature
**anatomy** or a **record** — and a branch move belongs to the narrowing
pass, not here.

---

## Part 4 — the class layering, which is downstream of all of it

### The overrides, re-diagnosed

`Shade` and `WireBody` are near-identical piles of the same five
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
> composition underneath. `Shade.getConferredMixinNames() → ['AetherMixin']`
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
3. **`holder_snapshots` → `copy`**, retiring `WireBody.shouldPersist()` as
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
