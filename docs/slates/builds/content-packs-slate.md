# Content packs slate — the trade as the unit, and seeding an economy backwards

> **Status: PARTIAL** — the pack substrate + 47 shipped packs
> → [content-packs.md](../../subsystems/content-packs.md)
> **Left:** the unbuilt trades of the Part 6 roster (butchery · fishing ·
> foraging · quarrying · carpentry · tanning · pottery & glass ·
> chemistry/pharma · papermaking & printing · masonry · repair ·
> sanitation · funerary · education · advocacy · journalism · security ·
> cleaning & laundry · pest control · insurance · real estate ·
> performance) · the review-tier claim + its detectors (Part 1) · the
> producer-without-consumer completeness check (Part 3) · scale variants /
> install parameters + the provisioning prompt (Part 4, A10.6, A10.7) ·
> `requires.policy` (Part 9) · document search (Part 9) · the verb-scope
> announcement + the scoped-verb selector syntax (Part 9) ·
> localities-as-compositions (Part 6) · the npm repo split (A10.1) ·
> staged installs (A10.10) · the media kind (A20) · position defs + the
> proto-industry adoption lifecycle (A19) · contract forms (A16.4) ·
> cross-pack reference validation, the cross-pack exits rule, the overlay
> kind + scheduled uninstall (A12.3) · tree-qualified narrowing policies,
> the source-write consult + git hooks (A28) · the pack watcher (A32.1) ·
> eternal steel's home (A25) · path-addressed mixins, held in reserve
> **Size:** a build

**Captured 2026-08-04.** The session opened on version control and
turned into economics:

> **User: "we rejected any kind of version control on our own mongo
> collections (except the wiki) which I think is fine, but there is a
> sort of conversation that has to happen around some content changes. I
> think I want to solve this through content packs… which means almost
> all of our seeding is going to move to content packs and the platform
> will ship clean."**

And the correction that set the shape of everything after it:

> ⭐⭐⭐⭐⭐ **User: "your 'tier 1 ambient life' is really just the economy
> running many different industries… most of the pressure I want to
> solve here is standing the economy up. The CB right now is just minting
> value on demand and keeping a record of the deficit. That's not a real
> solution… this isn't an economy session it's a content pack session.
> But the economy basically is the game."**

Related: [content-packs.md](../../subsystems/content-packs.md) (**the
shipped substrate — manifest, reconcile-by-stamp installer,
`sourcePack`**), [pack-seams-slate](../tails/pack-seams-slate.md) (**how two
packs articulate — *the annex knows the host, the host never knows the
annex*; do not re-derive it here**),
[vocations.md](../../vocations.md) (the demand test),
[parcel.md](../../subsystems/parcel.md) (title, and the invariant Part 7
protects), [balance-slate](./balance-slate.md) (review tiers ride its
reserved-matter cut), [studio.md](../../subsystems/studio.md)
(blueprints — the composition precedent),
[economy-slate](./economy-slate.md),
[retail-slate](./retail-slate.md),
[livelihood-slate](./livelihood-slate.md).

---

# Part 1 — A pack is a unit of REVIEW

The motivation was never packaging. It was that **some content changes
deserve an argument**, and Mongo collections cannot host one. Git can.
So:

> ⭐⭐⭐⭐ **Mint a pack wherever a diff deserves an argument** — not
> wherever content happens to be related.

That is a governance criterion, and it beats the obvious alternatives
(group by subsystem, group by place) because it tracks **blast radius**.
Which means it maps directly onto the reserved-matter cut
[balance-slate](./balance-slate.md) already made:

| Review tier | Touches | Who argues |
|---|---|---|
| **cosmetic** | prose, dressing, props, names | nobody — merge it |
| **local** | one locality's rooms, NPCs, shops | that locality's committee |
| **systemic** | recipes, encounter tables, wages, vocations | whoever owns the ledger it mints into |
| **constitutional** | closed vocabularies, parameters, anything minting to a global ledger | the legislature |

⭐ **The manifest should declare its tier, and the installer should check
the claim.** A pack claiming `cosmetic` that ships a `class:` field is
lying, and that is mechanically detectable — the code-naming field set
already exists (`CodeNamingFields.FIELDS`).

---

# Part 2 — The cut is a TRADE, and it is vertical

> *Cut 2026-09-18 (slate compaction) — superseded by A13 (industry ≠ venue), itself shipped as trade packs + venue packs → [content-packs.md](../../subsystems/content-packs.md) § The shipped packs, § The requires phase (the `/trade/<industry>` root). The *ambient life* rule graduated to § The shipped packs (*a trade pack ships its own people*).*

---

# Part 3 — ⭐⭐⭐ Seed the economy BACKWARDS, from the sinks

> *Cut 2026-09-18 (slate compaction) — the demand-first roster shipped (cooking · baking · farming · fuel · textiles · tailoring · medicine · haulage · ranching …); the demand test is [vocations.md](../../vocations.md); the shipped set is [content-packs.md](../../subsystems/content-packs.md) § The shipped packs.*

## The completeness rule that falls out

> ⭐⭐⭐ **A trade pack is complete when its output has a consumer —
> inside the pack, or as a declared dependency.** A pack that only
> produces is flagged at install.

This makes `dependsOn` **economically meaningful** rather than
decorative, and it is the same test
[vocations.md](../../vocations.md) already applies — *a vocation exists
iff there is unmet demand.* The register was right; it was never wired to
the packaging.

> *Cut 2026-09-18 (slate compaction) — closed: `trade-farming` (wheat) → `trade-milling` → `trade-baking` (dough · flatbread · lean-loaf).*

---

# Part 4 — Trade ⊗ locality: the tension, and where the seam falls

> *Cut 2026-09-18 (slate compaction) — shipped as the trade/venue split → [content-packs.md](../../subsystems/content-packs.md) § The requires phase (*what a trade introduces … where it is practised is a venue under `/world/`*), § The shipped packs (hearthworks: every station a `props:` reference to a trade's row). Crowd vs cast → [identity.md](../../subsystems/identity.md) (the `Extra`/`Cast` rungs). The showroom shipped in a different shape: a trade's working floor ships INSIDE the trade pack (the still-house, the Wharfside mill), not as a sibling venue pack.*

## Reconcile, don't copy

A venue declaration is **a reference plus local parameters**, never a
snapshot of the kit — so a trade update reaches every venue at the next
reconcile, which is how the shipped installer already works.

⚠ **The failure this must survive:** a trade adds a required fixture that
small premises cannot fit. So a venue declares its **scale**, and the
trade ships **named variants** (`stall` / `shop` / `works`). An
open-ended footprint parameter would make every trade re-implement the
same fitting logic.

> *Cut 2026-09-18 (slate compaction) — shipped → [content-packs.md](../../subsystems/content-packs.md) § The shipped packs (*Packs seed, they do not own*; `PackLogic.venue-ownership.test.ts`), § The three-way reconcile.*

---

# Part 4b — How a pack and a parcel actually wire together

> *Cut 2026-09-18 (slate compaction) — shipped → [content-packs.md](../../subsystems/content-packs.md) § The requires phase (claims granted by `ParcelApi.grant`, the coverage gate, the bounded `skip-sold` reconcile — CPS:308 was this section), [access.md](../../subsystems/access.md) (`canAtPath`, the document tree's gate since wave 2), [parcel.md](../../subsystems/parcel.md) (landless title over the path tree), [chattel.md](../../subsystems/chattel.md). The judiciary-is-`subdivide`+`transfer` example is handed off to parcel.md in the compaction ledger.*

---

# Part 5 — Tests: the dependency direction is the design

> *Cut 2026-09-18 (slate compaction) — shipped: `lint:test-content` + `test-content-allowlist.txt` (the shrinking allowlist), synthetic `/test/**` fixture packs written by `PackLogic`'s `pack-harness.ts`, per-pack vitest suites → [content-packs.md](../../subsystems/content-packs.md) § Tests travel with the code, [testing.md](../../testing.md).*

---

# Part 6 — The roster (a starting list)

Grouped by position in a chain. ⭐ marks the ones nobody has written down
— several are **sink** trades, which is where the leverage is.

**Answering a shipped sink — build these first, they close loops
immediately**
baking · brewing · butchery · ⭐ **fuel & firewood** · ⭐ **clothing &
tailoring** (thermal) · ⭐⭐ **repair & maintenance** (`Durable` makes this
*permanent* demand, and almost nobody designs it) · medicine ·
sanitation · ⭐ **funerary** (mortality ships; death has no industry)

**Extraction** — farming ✅ · ranching · mining · forestry · fishing ·
foraging · quarrying · water

**Transformation** — milling · smithing · carpentry · tanning · pottery &
glass · textiles · chemistry/pharma · ⭐ **papermaking & printing** (the
press has no physical substrate today) · masonry

**Services** — retail ✅ · banking ✅ · haulage · hospitality ✅ ·
education · advocacy · journalism · security · cleaning & laundry ·
⭐ **pest control** · insurance · real estate · ⭐ **performance &
entertainment**

## Non-trade packs that still need to exist

- ⭐ **generic objects** — *"stuff any virtual world needs"* (user's
  call): doorknobs, buckets, crates. Explicitly **outside** every chain,
  and framed as **scaffolding that trades progressively replace**, so it
  shrinks rather than becoming the junk heap where anything unowned
  lands.
- **localities** — Terminus, Saxonberg, Eternal University, Hinkley
  Hills, the lounge, newbie-wilds. ⭐ **These become compositions**: not
  52 files of stuff, but *a manifest of which trades operate here, at
  what scale.* Much smaller, far more reviewable, and it makes a second
  city cheap.
- **substrate** — `base-library` ✅, `species-and-names` ✅, body-plans,
  ⚠ **conditions & afflictions** (the mortality build shipped with *no
  Condition Idea live anywhere* — a missing pack, not a missing feature).
- **test fixtures** (Part 5).

## Deferred but named, so they are not re-derived later

Norms & moderation (⭐ the thing every adopting community must change) ·
localization (⭐ a *text* game — uniquely tractable) · accessibility ·
theme/branding · scenario modules · calendar & festivals · onboarding ·
rules variants · starting-parameter sets · narrative voice · total
conversions.

---

# Part 7 — Ships clean, and the two things that must never be packs

> *Cut 2026-09-18 (slate compaction) — shipped: structure vs authority is the requires phase (a pack CLAIMS, `ParcelApi.grant` GRANTS; NPC-only memberships); the acceptance criterion is the platform-only e2e (`SAXONBERG_PACKS=platform`) → [content-packs.md](../../subsystems/content-packs.md) § The requires phase, § Pack zero. The 2026-08-04 inventory is history: `seeds/` is gone and every row comes from one of 47 packs.*

---

# Part 8 — What the substrate still needs

> *Cut 2026-09-18 (slate compaction) — gaps 1 · 2 · 4 · 5 · 7 shipped ([content-packs.md](../../subsystems/content-packs.md) § Who may run it, § Discovery, § The flat-key uniqueness check, § The requires phase, § The shipped packs); 3 (versioning) and 6 (uninstall) are named in its § Deferred; 8 (the tier claim) stays open in Part 1.*

---

# Part 9 — Replacing the seeders

> *Cut 2026-09-18 (slate compaction) — history + shipped: `SeederManager` and every seeder are deleted; structure vs authority is the requires phase → [content-packs.md](../../subsystems/content-packs.md) § The requires phase.*

## Requirements, and a checklist that DERIVES

```yaml
requires:
  groups:
    - name: bakers-guild
      purpose: who may operate a bakery here
  title:
    - extent: /trade/baking
  policy:
    - at: <extent>/law/.policy      # see branch-policy-slate
```

Install creates the empty structure and **never blocks**. `pack provision
<id>` walks whatever is still unfilled — at install, or a week later.

- ⭐ **The checklist derives on read, never stored.** *"What is
  unfulfilled?"* is a query, not a to-do list that can drift. Same house
  pattern as competence, wounds and the roll.
- ⚠ **Unfilled must be a legal world state.** An empty guild is a *fact*,
  not an error (never-half-grown). Content whose requirement is unmet is
  **inert and visibly so**, never broken.

> *Cut 2026-09-18 (slate compaction) — shipped → [content-packs.md](../../subsystems/content-packs.md): pack zero installed by bootstrap (§ Boot); typed contributions as one `KindStrategy` per kind with a per-kind reconcile policy (§ The installer, § The per-kind reconcile policy — three-way · merge-missing · CAS); the wiki as the CAS kind; `emotes`/`recipes`/`name_banks`/`blueprints` collapsed into `documents` with kind-scoped unique partial indexes (§ `DocumentKinds`); *storage is the store, search is a catalogue* graduated to § `DocumentKinds`.*

### Keeping the store general-purpose

> *Cut 2026-09-18 (slate compaction) — `DocumentKinds` is the closed, platform-edited vocabulary (§ `DocumentKinds`); a pack declaring a kind (`requires.kinds:`) is named in § Deferred.*

⭐ **Document search is coming regardless.** The wiki, law and
publications all want find-by-content and none of them fits in memory.
**Emotes merely surfaced it first** — which argues for solving it rather
than granting emotes a collection as a one-off that would have to be
undone.

> *Cut 2026-09-18 (slate compaction) — shipped: `aliases` retired for `searchTerms` → [emotes.md](../../subsystems/emotes.md); the generalized rule (*a word occupies the global verb namespace only if it is the primary name of a distinct act*) is handed off to command-spec.md in the compaction ledger.*

## ⭐⭐ The verb namespace — and packs SHOULD ship verbs

> **User: "we do want packs to ship verbs. Collisions should be
> infrequent provided good governance but they'll happen… scoping verb
> affordances so very few verbs hang on universals like 'self'. And then
> providing an enhancement to our CLI that lets you provide an MQL query
> to scope your command to."**

> *Cut 2026-09-18 (slate compaction) — documented: emotes as the fallback ([emotes.md](../../subsystems/emotes.md)); `scope:` vs `RecencyBucket`, recency as the resolution → [command-routing.md](../../subsystems/command-routing.md) § Affordance attribution.*

### So what is missing is narrower than it first appeared

Two gaps, both small:

1. ⚠ **It is invisible.** Nothing says which affordance fired or why.
   Same command, different result, no explanation — the `$PATH` problem.
2. **It is unoverridable.** When recency picks wrong there is no way to
   say *"no, the other `shake`."*

**The scope machinery is not missing. The ANNOUNCEMENT and the OVERRIDE
are.**

### ⭐⭐⭐ And the override is a filter on a field that already exists

`_runChain` already does:

```js
const matches = this.getAffordances().filter(a => a.command.hasVerb(parsed.verb));
```

and `Affordance` is already `{ command, source, bucket }` — matching is
done on affordances *"so each matched definition arrives paired with its
resolved affording source."*

> **The disambiguator is one more `.filter()` on `source`.** No new
> resolution engine, no scope chain to build, no YAML change.

⭐ **Which satisfies the "any command must be able to express it"
constraint by construction** — it runs *before* verb dispatch, on a list
every command already produces. It is a property of the **dispatcher**,
not a per-verb capability.

### ⭐⭐⭐⭐ The rule that makes collisions non-fatal

> **Every afforded verb has an explicit, always-unambiguous form. The
> bare word is SUGAR that resolves by scope and YIELDS on conflict.**

A collision is then never an error and never a governance failure — just
a case where the sugar does not apply. **Much better than "collisions
must be prevented,"** which does not scale past a few dozen packs.

### The disambiguation syntax — criteria, not a pick

*(User: "the syntax for this is up for debate but it's scoped
somewhere.")* Four constraints:

1. **Parseable without backtracking** — the scope must be identifiable
   *before* verb resolution ⇒ argues for a prefix or sigil over a
   trailing clause
2. **No collision with MQL's own operators** (`:` is taken by predicates)
   **or with prepositions used as real arguments** (`with`, `at`, `on`
   are live)
3. **Round-trips through `format()`** — the tokenizer already guarantees
   this and it should not be special-cased
4. ⭐⭐ **The client emits it.** Every clickable previews its command, so
   the disambiguated form is mostly **machine-written**

⭐ **Constraint 4 is the decisive one and it lowers the stakes:
unambiguity beats elegance**, because the common path is a button that
already knows which object it came from. Typing it is the power-user
fallback, not the default experience.

⚠ `shaker.shake` reads instantly to a technical audience and satisfies
1–3, but **check `.` against MQL's chain operators** before adopting it.

> *Cut 2026-09-18 (slate compaction) — superseded by the code: `lint:verb-collisions` REFUSES two views claiming one verb (a shipped `watch` collision had shadowed silently); reporting was the weaker policy.*

### The addition, concretely

| | |
|---|---|
| a **parse position** for the selector — before the verb, so no backtracking | new |
| **MQL evaluated against `reachable`** → a source set | reuse |
| `matches.filter(a => sources.has(a.source))` | **one line** |
| ⭐⭐ a **`Note` naming which affordance resolved** — *always*, not only on ambiguity | new, and **the higher-value half** |

> ⭐⭐⭐ **Recency is a fine policy and a terrible secret.** If the
> envelope says *"`shake` → the cocktail shaker"* every time, most
> disambiguation never needs typing — and when it does, the player
> already knows the vocabulary because they have been reading it.

⭐ **Nothing here proposes changing the buckets.** They are categorical
by design, recency does the ordering, and that division looks right —
leave both alone.

> *Cut 2026-09-18 (slate compaction) — all four steps shipped (waves 2 · 3 · 4a/4b) → [content-packs.md](../../subsystems/content-packs.md) § History.*

# Open questions

1. **Is a trade one pack, or a pack per business?** *Leans trade =
   pack, business = an instance a locality declares* — otherwise every
   new shop is a repo.
2. **Do trades declare scale variants, or does the locality pass a
   footprint?** *Leans named variants* (`stall`/`shop`/`works`).
3. ⚠ **What happens on reconcile when a declared venue has been
   player-modified?** Skip, warn, or diff-and-ask. **Decide before the
   first pack ships.**
4. **Does `seeds/obj` (576 files) split by trade, or is there a residual
   shared library?** Some of it is genuinely cross-trade (containers,
   doors); most is probably somebody's kit.
5. **Is the review tier self-declared or derived?** *Leans declared, with
   the installer refusing a pack whose contents exceed its claim.*
6. **Does the fixture pack ship with the engine or as a real pack?**
   *Leans a real pack the engine's CI installs* — it then dogfoods
   install/uninstall.
7. **Are the 80 "content the tests reach into" cases given synthetic
   replacements, or do those tests become pack tests?** Probably both —
   `DormResidence.test.ts` is arguably a *residence pack* test that is
   currently misfiled.
8. **Is `lint:test-content` CI-gating from day one?** *Leans warn-only*,
   or nothing merges for a month.
9. **What is the first trade to build end-to-end?** Baking, per Part 3 —
   but it needs milling and farming beneath it, so the real question is
   how much of the chain ships as one build.

---

# Addendum 2026-08-20 — the installer session

## A10.1 — The repo split is LAST, and it is not submodules

Not generic submodule FUD — a project-specific one. This repo's most
expensive scar is *one branch, two working trees, one ref store* (the
2026-08-02 deletions, CLAUDE.md § Worktrees). Submodules reproduce that
shape by construction: `git worktree add` does not init submodules, and a
submodule's gitdir lives under the superproject's common dir — four
worktrees × N packs is N×4 detached checkouts sharing a ref store. And
rule 4 (*unpushed work is the only kind you can lose*) multiplies:
superproject pins a SHA, push the parent, forget the child, the pointer
dangles.

⭐ **The seam that costs nothing already exists**: packs are discovered by
npm package name (`@saxonberg/content-*` in server's `package.json`,
resolved via `require.resolve`). That seam does not care where the files
physically live. Separate GitLab repos publishing to the GitLab npm
registry, pinned by version, `link:` for the dev loop — and `pack.yaml`'s
inert `version` becomes load-bearing as the npm version.

⭐⭐ **And the ordering argument beats the mechanism argument: you cannot
cut repos along a seam you have not drawn.** 227 seeds are referenced by
nothing, the trade cut is not made, `seeds/obj/` is full of platform
singletons. Splitting repos first freezes a wrong boundary in the most
expensive medium there is. Repo split = a late step, after Part 9's
migration order completes.

> *Cut 2026-09-18 (slate compaction) — A10.2–A10.5 shipped → [content-packs.md](../../subsystems/content-packs.md) (*The DB is a cache of the packs*; `pack resolve --export` as the round-trip; § The per-kind reconcile policy; § The three-way reconcile; the per-collection policies generated from `src/schema/*.yaml`; `BlueprintCatalogue.rebuild()`).*

## A10.6 — Parameterization IS the venue (closes open question #2)

> **"packs can inform [the installer] as to what kinds of configuration
> and parameterization is needed."**

Q2 asked *do trades declare scale variants, or does the locality pass a
footprint?* With an installer that takes parameters it stops being
either/or: the trade pack declares its **parameter schema** (`locality:`,
`scale: stall|shop|works`, `wage:` …) and installing it *somewhere* is
supplying the answers.

> ⭐⭐ **The pack is the program; the install parameters are the venue.**
> One repo per trade, many installs, no repo-per-shop.

⚠ The Helm rule, written down now: **the three-way baseline is the
RENDERED output (post-parameters)** — otherwise every parameterized row
reads as operator divergence on the next upgrade.

## A10.7 — The installer is a procedure, not an application

Resist building an installer *app*. The house has the pieces:

- **`requires:` + parameters → one derived checklist** — *what is
  unfulfilled?* stays a query, never a stored to-do (Part 9's rule,
  extended to parameters).
- **`pack provision <id>` walks it via `PromptApi`**
  (choice/confirm/text/mqlObject) — prompting per item, recording
  answers into the install record. That IS the installer UI, in-world,
  ~zero new surface.
- **Install never blocks.** Unanswered parameters are a legal world
  state (never-half-grown): the venue sits inert and *visibly* so.

> *Cut 2026-09-18 (slate compaction) — A10.8 superseded by A31 and then wave 3: `pack` is gated on title over `/compact/executive`, never a wizard check → [content-packs.md](../../subsystems/content-packs.md) § Who may run it. A10.9 shipped as written: restart is the universal go-live (§ Runtime).*

## A10.10 — No companion webapp: stage in-game, apply at boot

> *Cut 2026-09-18 (slate compaction) — the no-companion-app decision graduated to [content-packs.md](../../subsystems/content-packs.md) § Runtime — the `pack` verb.*

The shape that gets everything the companion app promises, in-process:

1. **`pack install` / `pack provision` run in-game, gated, and STAGE** —
   authority checked where the machinery lives, requirements walked,
   answers recorded, a staged-install intent written. Nothing goes live.
2. **Boot applies staged installs** in the pre-`loadHooks` window where
   the installer already runs and nothing is live. requires-kernel + the
   three-way reconcile run there; a failing pack marks its staged
   install failed and the server boots **without** it, loudly — ⚠ **an
   install must never be able to brick the boot.**
3. **Restart is REQUESTED, not performed** — clean exit; the supervisor
   that already owns lifecycle brings it back. "The installer owns
   server lifecycle" collapses to "the installer may ask for a restart."

Staged-but-not-applied is a visible, resumable state — and *what is
staged / failed / awaiting provision* is the derive-on-read checklist
again. The ops **screen** rides the CMS (the adjacent web surface with
attribution already solved): a pack panel is a view over `pack status`,
not a new app. ⭐ The separate-app instinct becomes right at a scale we
do not have: multi-node, or operators who genuinely must not hold game
logins. Neither is foreclosed by doing it in-process now.

> *Cut 2026-09-18 (slate compaction) — A10.11 shipped: the deployment manifest (root `package.json`) is the decision, `pack_installs` the ledger → [content-packs.md](../../subsystems/content-packs.md) § Discovery, § The install record.*

---

# Addendum 2026-08-20 (2) — the boot audit, the collection buckets, and the subject resolution

> *Cut 2026-09-18 (slate compaction) — A11.1–A11.4 history + shipped: every seeder deleted, the code manifest gone, `boot[]` in the pack that ships the row, the per-collection policies generated from `src/schema/` → [content-packs.md](../../subsystems/content-packs.md) § The boot union, § History (wave 3); [persistence.md](../../subsystems/persistence.md) § Collections.*

## A11.5 — How a pack expresses each bucket

> *Cut 2026-09-18 (slate compaction) — shipped → [content-packs.md](../../subsystems/content-packs.md) § Content-kind dispatch, § `DocumentKinds` (*a pack cannot declare a new kind* — the closed vocabulary is the allowlist), § The requires phase.*

**The abstractions that survive (three, and no more):**

1. **One installer, typed kinds** — nothing in the nine seeders needs
   more than the six models + `boot-instances`.
2. **One lifecycle sequencer** for job 4: subsystems declare
   warm/activate with `dependsOn`; the topo-sort `BootstrapManager`
   already owns runs them. The ordering constraints currently living in
   comments ("banking before employment") become data. Keep a single
   explicit registration list — one line per subsystem — but let
   dependencies, not list position, carry the order.
3. **Rebuild commands** for the derived-cache row — the `warm()`s mostly
   exist; they need a *forced* variant and a name.

> *Cut 2026-09-18 (slate compaction) — A11.6/A11.7 shipped: the `subject` kind, archive-never-reap → [content-packs.md](../../subsystems/content-packs.md) § Content-kind dispatch, § The per-kind reconcile policy (vanish policies).*

---

# Addendum 2026-08-21 (3) — two packs en toto: the requirements drill-down

Context: the three-tier pack roster (ship-now carve / slate-implied /
imagined-but-supported) was drawn in-session; tier 1 ≈ the 3 shipped
packs + pack zero + substrate packs (conditions, body-plans,
generic-objects) + institutions (compact, corpo) + 8 locality packs +
wiki-starter. The tier-3 audit found exactly two unplanned substrate
gaps: an **overlay kind** (localization annotating rows another pack
owns — breaks one-stamp-per-row) and **scheduled uninstall**
(festivals). This addendum is the tier-1 drill-down.

> *Cut 2026-09-18 (slate compaction) — the two bills are history: hearthworks re-cut into `trade-smithing` + `trade-cooking` + the `hearthworks` venue pack (pure data), `eternal-university` a capability pack with its `src/` → [content-packs.md](../../subsystems/content-packs.md) § The shipped packs, § History (waves 4a/4b, wave 5). requires-kernel resolves `behaviors[].brain` (`PackLogic.brainsNamedBy`).*

## A12.3 — The requirements shopping list

What the two bills demand of the substrate, deduped — **this section is
the hand-off**:

1. **Typed contribution kinds** (A10/A11 roster) with per-kind
   reconcile; the install record (three-way) underneath.
2. **requires-kernel widened** to `behaviors[].brain` (+ controller
   paths for capability packs).
3. **Cross-pack reference validation** — recipe outputs, exits,
   `banksAt` targets: resolve against the install set + `dependsOn`;
   dangling-pointer policy (loud, named).
4. **boot-instances kind** + answering the hearthworks standup question
   (how do Business + cast go live today — find it, fold it in).
5. **`requires:` block**: groups, title — plus ⭐ **provision items for
   agent membership** (declared agency, title-holder confirms).
6. **Tier detectors**: code-naming fields ⇒ ≥ local; wage/mint
   touchpoints ⇒ ≥ systemic.
7. **The pack ladder**: data / capability / mod — declared in the
   manifest, enforced at install (a data pack whose `class:` resolves
   under its own namespace is lying).
8. **The accumulation firewall**: installer structurally unable to
   touch `holder_snapshots` / chattel / furnishing overlays; organizer
   deletes archive, never reap (A11.7).
9. **Cross-pack exits**: declaring side owns them;
   `DeferredDestinationExit` is the mechanism; state it as the rule.
10. **Test migration lane**: pack tests travel; kernel-tree tests get
    ugly fixtures; `lint:test-content` starts warn-only with these four
    files as the first shrinking allowlist.
11. **Genericize the hearthworks three** (menu-board to kernel;
    SealedCellar via composition) so the first trade pack ships
    pure-data — the third-party format proven on day one.
12. **Deferred with a name**: parameterized venues (the showroom is the
    venue until a trade has a second one); the overlay kind; scheduled
    uninstall.

⭐ **The two packs were chosen to be exhaustive, and they were**: every
row in the shopping list traces to a concrete file in one of the two
bills — nothing here is speculative substrate.

---

# Addendum 2026-08-21 (4) — ⭐⭐⭐ industry ≠ venue

> *Cut 2026-09-18 (slate compaction) — shipped: industry packs at `/trade/<industry>`, venue packs under `/world/` → [content-packs.md](../../subsystems/content-packs.md) § The requires phase, § The shipped packs. Position DEFINITIONS as a document kind did not ship — see A19 below.*

## A13.3 — The materials faultline

> **Base-library holds what GENERIC content names; an industry ships
> what it INTRODUCES to the chain.**

Wood stays universal not because it is common but because
generic-objects and scenery name it — crates are wooden in worlds with
no forestry. Hematite ships with mining because nothing outside
mining's chain says the word. ⭐ **Mechanically checkable** (the topics-
gate shape): a base-library material referenced only by one industry's
content is misfiled; an industry material referenced by generic content
has graduated.

⭐⭐ **And the split itself dissolves the "don't ship ore everywhere"
worry**: an industry pack with no venues declared is inert vocabulary —
rows, no rooms, no NPCs, nothing observable. Smithing `dependsOn`
mining for its ore words; nobody gets a mine unless a locality declares
one. **The dependency became cheap the moment the venues left it** —
and the ore existing as a word is what lets a market import it before
anyone digs locally.

> *Cut 2026-09-18 (slate compaction) — shipped: `archetype.materialize()` derives the test venue (`trade-hospitality`'s `menu.test.ts`) → [content-packs.md](../../subsystems/content-packs.md) § Content-kind dispatch (the archetype row).*

---

# Addendum 2026-08-21 (5) — the archetype, settled in three questions

> *Cut 2026-09-18 (slate compaction) — shipped: the `archetype` document kind, `describe()` the derived floor, `materialize()` the test venue, no runtime enforcement, no `ArchetypeApi` → [content-packs.md](../../subsystems/content-packs.md) § Content-kind dispatch; the industry namespace closed by A15 (`/trade/`).*

---

# Addendum 2026-08-21 (6) — the `/trade/` root

> *Cut 2026-09-18 (slate compaction) — shipped (wave 4a): `/trade/<industry>` is an industry pack's root and title claim; the layout sketched here was superseded by the path pattern (`<root>/<branch>/`, controllers at `idea/cmd/`) → [content-packs.md](../../subsystems/content-packs.md) § The requires phase, § History (*The path pattern*); CLAUDE.md § The five namespace axes.*

---

# Addendum 2026-08-21 (7) — the standup mystery, SOLVED: the world is lazy

> *Cut 2026-09-18 (slate compaction) — the lazy trio is shipped, deliberate substrate → [employment.md](../../subsystems/employment.md) (derived lazy standup), [boundary.md](../../subsystems/boundary.md); the boot union's two roles are the narrowed eager set → [content-packs.md](../../subsystems/content-packs.md) § The boot union. *An unvisited venue mints nothing* is handed off to employment.md in the compaction ledger; hearthworks' inbound exit is named in § Deferred.*

---

# Addendum 2026-08-21 (8) — the hearthworks re-cut, file-per-artifact, and the energy sketch

> *Cut 2026-09-18 (slate compaction) — shipped: the three-pack re-cut (waves 4a/4b), one file per recipe/emote/page, introduces-vs-commons (*the generic drain rule*) → [content-packs.md](../../subsystems/content-packs.md) § The shipped packs, § Content-kind dispatch, § History.*

## A16.4 — The energy industry, sketched (the service-industry stress test)

> *Cut 2026-09-18 (slate compaction) — the energy trade shipped as `trade-fuel` (the charcoal clamp, `char`, the `colliery` Discipline; the metal chain) — without the contract forms, which stay open below.*

⭐⭐⭐ **The discovery: blank contract forms are a new artifact type.**
The `contracts` collection stays never-seeded (executed contracts are
player record), but the FORM — the standard provisioning clause set —
is authored content, same relationship as recipe-to-crafted-item.
Shipped as documents. It will recur: **freight, insurance, and credit
are all form-shaped trades.**

Why it matters even unbuilt: energy is the first

---

# Addendum 2026-08-21 (9) — the install record's shape, and the collision surface

> *Cut 2026-09-18 (slate compaction) — shipped → [content-packs.md](../../subsystems/content-packs.md) § The install record (`pack_installs`, body beside hash), § The flat-key uniqueness check, § Runtime — the `pack` verb (`--dry-run` · `status` · `diff` · `resolve --take-pack | --keep --pin | --export` · `pin`/`unpin`).*

---

# Addendum 2026-08-21 (10) — the export census, and verbs move to the document tree

> *Cut 2026-09-18 (slate compaction) — the census is history; command views are the `command-view` document kind at their fractal paths, store-only, `controller:` wizard code trust → [content-packs.md](../../subsystems/content-packs.md) § Content-kind dispatch (*Command views*). The media box was decided in A20 below.*

---

# Addendum 2026-08-21 (11) — magic is a tag; the residue closes

> *Cut 2026-09-18 (slate compaction) — shipped: `arcana` (the substrate, a capability pack) + `arcane-library` (the commons catalog); spells ride their carriers; the catalogues warm by class → [content-packs.md](../../subsystems/content-packs.md) § The capability rung (*Two rules the rung applies to magic*), § The shipped packs.*

---

# Addendum 2026-08-21 (12) — media: content ships assets; generation is an AUTHORING act

**Decided 2026-08-21, closing the last open box.**

> **User: "image generation would be handled on the content authoring
> side, if for nothing else than we need them to use their own token
> budget. maybe we'll hook up api keys in CMS but either way I'd think
> content ships assets. delivery of those assets into s3 is a separate
> thing."**

This reverses the derive-at-runtime reading of `MediaAsset`. The
economics decide it: runtime generation puts every operator on the hook
for tokens + an external AI dependency; authoring-time generation puts
the cost with the creative control — and deployments become hermetic
(the self-hosting/AGPL story).

- **The pipeline is an AUTHORING TOOL, not a runtime service.**
  MediaAsset's deterministic-regenerate machinery (prompt + model +
  params; staleness on model bump) is the *author's* re-render loop —
  eventually in the CMS with the author's own API keys.
- ⭐ **Packs ship bytes AND receipts.** The image travels with its
  provenance (prompt/model/params): the receipt keeps regeneration
  deterministic for the author and gives review its textual half (and
  MRs render images — art is reviewable).
- ⭐⭐ **Two-step delivery.** The installer reconciles `media_assets`
  ROWS (three-way, like every kind); **byte delivery to the bucket is a
  separate transport step** — made safe by **content-addressed keys**
  (bucket key = hash of bytes): idempotent sync (upload missing keys),
  free dedupe, no staleness (new art = new key, the row repoints), and
  rows-before-bytes degrades to a visible broken image fixed by
  re-running the sync, never corruption.
- Repo weight: binaries in pack repos — git-LFS is the standard answer
  once packs split repos; illustration-scale assets are tolerable
  meanwhile.
- `media_assets` therefore leaves the derived-cache row of the A10.3
  table: the rows are a **reconciled** kind; the bucket is a mirror of
  pack bytes.

---

# Addendum 2026-08-21 (13) — position defs: identity vs economics, and proto-industries

**Decided 2026-08-21** (drill #1 off the units index).

- **The industry owns what a smith IS**: key, default label, and the
  **conferral bundle** (which mixins/verb surfaces on-shift grants).
  Conferral is capability-granting — never venue-authorable (a venue
  minting conferrals is content minting capability). Own file per
  position (`/trade/smithing/positions/smith.yaml`): a conferral change
  deserves its own diff.
- **The venue owns the economics and the people**: wage rate, schedule,
  roster. Its Business references the def by path. ⭐ The systemic-tier
  detector (money) is now ALL venue-side; the capability side is all
  industry — the tier analysis cleans up for free.
- ⭐⭐ **Venue-local positions are free and legal — and they are
  PRE-industry, not industry-less** (user: *"if you ask a bouncer what
  industry they work in, I bet they'd say security… I don't think me
  finding industries for your examples precludes venue-local positions…
  maybe even that's the model for how proto-industries are formed."*).
  What bouncer/greeter share is low conferral-NEED, not missing
  industry. Rule: **anyone can define a position that confers nothing;
  only an industry can define one that confers.**
- ⭐⭐⭐ **The proto-industry lifecycle: local → common → claimed.**
  When `/trade/security` later ships `bouncer`, existing venue-local
  bouncers are ADOPTED (the installer's adopt-don't-wipe move, applied
  to labor): venue keeps wage/schedule/person, position gains its
  conferral. Matching by the def's **`claims:` key list** (exact-string
  is fragile), and the venue may DECLINE (a venue that meant something
  different isn't conscripted).
- ⭐⭐ **Proto-industries become OBSERVABLE**: "how many venues invented
  a position called bouncer, at what wage" is a query over live
  Business rows — the vocations register's gap-finding gains an
  empirical instrument, and the prevailing venue-local wage is the new
  pack's calibration data. The demand test runs itself.

---

# Addendum 2026-08-21 (14) — the subject file (drill #2)

> *Cut 2026-09-18 (slate compaction) — shipped: the `subject` kind (`audience:` → a required group, surfaces à la carte, flat-key on effective names, archive-never-reap) → [content-packs.md](../../subsystems/content-packs.md) § Content-kind dispatch (*Subjects*). ⚠ No pack yet authors a maintainers subject; the platform ships `chat`/`global`/`help` only.*

---

# Addendum 2026-08-21 (15) — eagerness: a boot manifest with reasons (drill #3)

> *Cut 2026-09-18 (slate compaction) — shipped as the boot union: `boot[]` per pack, `role: sync-read | producer`, mandatory `reason`, the code manifest deleted → [content-packs.md](../../subsystems/content-packs.md) § The boot union.*

---

# Addendum 2026-08-21 (16) — the pack fence, and staffing at install

> *Cut 2026-09-18 (slate compaction) — shipped: the NPC-only membership fence, staffing at `sync` (*You, or who?*), maintainer routing with the executive as fallback, no `isWizard` in the pack path → [content-packs.md](../../subsystems/content-packs.md) § The requires phase, § Staffing and routing, § Who may run it.*

---

# Addendum 2026-08-21 (17) — the two renames: `content` and `/world/`

> *Cut 2026-09-18 (slate compaction) — shipped: the `content` collection (wave 0), the `/world/` root (wave 4a) → [content-packs.md](../../subsystems/content-packs.md) § History.*

---

# Addendum 2026-08-21 (18) — archetypes: the code bill, and the author experience

> *Cut 2026-09-18 (slate compaction) — shipped: `describe()` aggregates, `materialize()` generates the test venue, predicates never written; the deposit fork resolved in the mining build (a seeded field — [mining.md](../../subsystems/mining.md)). *Clone-and-compose, never inherit* graduated to [content-packs.md](../../subsystems/content-packs.md) § The capability rung.*

---

# Addendum 2026-08-21 (19) — the mining drill: the litmus passes, and three bends

> *Cut 2026-09-18 (slate compaction) — shipped: the kernel build first, then `trade-mining` as data (the Deposit field, MineWarren, `hew`/`drive`/`sink`/`raise`/`shore`/`stake`) → [mining.md](../../subsystems/mining.md); salt now ships as `trade-cooking`'s pantry material.*

⚠ **Eternal steel is not industry data** — a finite conserved salvage
tier (found, never smelted); a pack row would make the apex material
mintable by reconcile. It rides the census-gated-distribution pattern
(magic-items precedent) as WORLD content with a fixed census — home it
explicitly in requirements.

---

# Addendum 2026-08-21 (20) — the socket/furniture rule, and the hospitality cut

> *Cut 2026-09-18 (slate compaction) — shipped: pack zero ships the landing shell + the lounge pack's `defaultStartLocation`; `trade-hospitality` is the third industry → [content-packs.md](../../subsystems/content-packs.md) § Pack zero, § The shipped packs. The razor graduated to § Pack zero.*

---

# Addendum 2026-08-21 (21) — the substrate-vocabulary doctrine; the Compact is platform

> *Cut 2026-09-18 (slate compaction) — shipped: conditions ride pack zero (`platform/idea/Condition/**`), body plans ride `species-and-names`, the Compact's institutions are the platform's, corpos are packs → [content-packs.md](../../subsystems/content-packs.md) § The shipped packs. The doctrine graduated to § Pack zero.*

---

# Addendum 2026-08-24 (22) — access across the three trees

**Decided 2026-08-24.** How grants, committees, and packs intersect
the source / content / document trees.

## A28.1 — One trie for OWNERSHIP; tree-qualified PERMISSIONS

- **One ownership fact.** The parcel trie is the single registry for
  all three trees — the mirror convention means they share one
  mud-rooted path namespace, so a title over `/trade/smithing` is one
  extent, one chain-of-title, one subdivide. Never three registries.
- ⭐⭐ **But what a title MEANS is tree-qualified** (user's catch: *"you
  might need to apply different permissions to the same path of
  different trees"*). `AccessApi.can` answers action-shaped questions —
  `write-template` / `write-document` / `write-source` against the
  same path. Defaults: owner holds all three; divergence via:
  1. **Narrowing policies with a tree dimension** — the `.policy`
     document at an extent (branch-policy: `writers` NARROWS never
     widens) can set different writer sets per tree. Same path, three
     writer sets, one owner, no second registry.
  2. ⭐⭐ **The commerce asymmetry, a RULE not a config**: parcel
     transfer conveys content+document rights; **source-write rights
     never ride a transfer** — they follow maintainership (code trust
     never flows through a sale — the agency rule). Rare by
     construction (commercial extents have no source mirror;
     capability extents aren't for sale); stated so the rare case
     fails safe.

## A28.2 — The grant ladder (subdivision is delegation)

State (covering title) grants the extent at install (the ceremony,
A10.8/A22.3) → the maintainers committee **subdivides** its extent
among teams with the same gated primitive (the trie recursion IS the
delegation model) → **narrowing policies** below subdivision
granularity → **group roles** for the last mile. Every rung restricts;
nothing down-tree widens.

## A28.3 — Source writes: the trie ANDs the wizard axis

> **User: "all writes are going to go through the write command… we
> just need source trees to express permissions that the write command
> respects (or the api that the write command uses)."**

- **The game is the permission system, for source like everything
  else.** `SourceTreeApi`'s write path (and the CMS save path)
  consults `can(giver, 'write-source', path)`: **title covering the
  path AND `isWizard`**. The trie answers WHERE; the axis answers WHAT
  KIND. Wizardness stays exactly one thing (TS), checked alongside
  jurisdiction, never instead of it. A wizard without title cannot
  touch the lounge's source; a non-wizard maintainer edits its YAML
  but never its classes.
- **Git is transport and history, never the fine-grained enforcer.**
  Repo permissions carve at PACK lines only (whole-repo membership ≈
  maintainers, hand-maintained, drift-tolerable — the in-game trie is
  the real enforcer, so the two-membership problem shrinks to coarse
  correspondence). Today's shell-based development bypasses the
  in-game path — acknowledged as the current mode, not a hole to plug
  now.
- **Deferred, named**: server-side hooks rejecting commits that touch
  paths the committer lacks title to, and the authentication that
  binds a commit to a game identity (anti-spoofing — the hard part is
  the identity binding, not the hook).

**Build items**: `DocumentLogic` → `ParcelApi` repoint (the known Part
4b gap) + the `SourceTreeApi`/CMS write-path consult — the two halves
of "all three trees resolve through one ownership registry."

---

# Addendum 2026-08-24 (23) — the graduation audits (lounge + eternal, 28 classes)

> *Cut 2026-09-18 (slate compaction) — applied: wave 4b's graduations and wave 5's `eternal-university` pack (`DormThemes` a `SingletonMixin` Idea in its `src/`) → [content-packs.md](../../subsystems/content-packs.md) § History, § How a pack EXPOSES something; the authorable-composition bridge and the second-consumer rule are in § Deferred and § The capability rung.*

---

# Addendum 2026-08-25 (24) — the wave ordering

> *Cut 2026-09-18 (slate compaction) — history: waves 0–4b shipped as ordered; wave 5 homed eternal, terminus, hinkley-hills → [content-packs.md](../../subsystems/content-packs.md) § History.*

---

# Addendum 2026-08-25 (25) — offices are heads; committees are hands

> *Cut 2026-09-18 (slate compaction) — shipped: an office may own a managed group (`{ kind: 'office' }` — [grouping.md](../../subsystems/grouping.md)); `pack-installers` folded into the executive; `requiresWizard` left `pack` → [content-packs.md](../../subsystems/content-packs.md) § Who may run it. The heads/hands doctrine is handed off to governance.md in the compaction ledger.*

---

# Addendum 2026-08-25 (26) — the post-refactor dev loop, and the three test rings

**Captured 2026-08-25**, answering: *what does developing content feel
like after the refactor?* — the payoff the program is priced against.
(User: *"anything to reduce the amount of time running tests takes,
that's the #1 time sink in our development workflow now."*)

## A32.1 — The hot pack (dev loop)

- **A pack WATCHER, dev-only, on the `CompileWatcher` precedent**:
  watch `packages/content/*/content/**`, debounce, fire the same
  `PackApi.sync(packId)` the verb runs. Save YAML in the IDE → the
  reconcile applies → the rehydrate tail pushes it live. Symmetric
  with `tsx watch` for code. ⭐ **The three-way machine is what makes
  auto-sync SAFE**: live-world divergence surfaces as a conflict
  instead of being stomped (in dev you're usually the only writer —
  the silent-apply cell).
- **Bidirectional**: iterate in-game/CMS instead → `pack resolve
  --export` writes the live edit back to the file. Either end can be
  the editor; git always ends up with the truth.
- ⚠ **Fields hot, structure warm, never confusing about which**: hot
  sync covers field edits; structural changes (new rooms, `populates:`
  on stood-up rooms) need a re-fault or a restart — restart stays the
  universal go-live, and dev restarts are cheap + self-cleaning.
- Not wave-1 scope; a small standalone item whenever resync friction
  first annoys.

> *Cut 2026-09-18 (slate compaction) — shipped: per-pack vitest suites, `test:near` routing, `packages/content/` excluded from the source check → [content-packs.md](../../subsystems/content-packs.md) § Tests travel with the code, [testing.md](../../testing.md).*

---

# Addendum 2026-08-25 (27) — capability packs: code ships IN the pack, and sync is one interface

> *Cut 2026-09-18 (slate compaction) — shipped as the capability rung: `src/` in the pack, the class-source table, `dependsOn` derived from `package.json`, `pack sync`'s hot-swap tail, `status`'s *restart owed*, the `exports` map as the import profile → [content-packs.md](../../subsystems/content-packs.md) § The capability rung; the third-party trust story is in § Deferred.*

---

# ⛔ The pack exposure gap — one cause, three symptoms (2026-09-14)

> *Cut 2026-09-18 (slate compaction) — the three symptoms are resolved (below) and the axes answered → [content-packs.md](../../subsystems/content-packs.md) § How a pack EXPOSES something.*

## ⭐⭐⭐ RESOLVED (2026-09-14) — federate the VALIDATION, not the addressing

> *Cut 2026-09-18 (slate compaction) — BUILT (`784268db1` + `c7bf52e0c`): `MixinApi.isDeclaredMixin` at discovery, `static _mixinRefusal`, `lint:mixin-names`, `AnyMixinName`, `DormThemes` as a singleton → [content-packs.md](../../subsystems/content-packs.md) § How a pack EXPOSES something. The reserve option is kept below because that section points here.*

### ⚠ Why NOT path-addressed mixins — the option held in reserve

The user's original design intent was a path lookup
(`/trade/haulage/lib/ShipmentDesk`) rather than a reserved name in one
namespace, consistent with how template paths, module ids and
`classFileOf` already work. The diagnosis is right — **mixins are the
last flat reserved namespace in a codebase that path-normalised
everything else** — but the rewrite is declined for one specific reason:

⭐⭐ **A type predicate cannot be path-addressed.** `isContainer(o): o is
Stuff & Container` must NAME its type; a TS predicate cannot be generic.
There are 156 such predicates and they are irreducible (same wall as
`MixinApi`'s 175 statics). `hasMixinAtPath('/x/y')` returns `boolean`,
not a narrowing — so you either lose compile-time narrowing, which is the
best property of this mixin system, or you run predicates AND paths,
which is two systems for one concept: exactly the complexity creep the
lint family exists to prevent.

Secondary: discoverability inverts. `MixinApi.isCon⇥` finds
`isContainer`; `/platform/lib/spatial/Container` requires already knowing
the tree.

⭐ **The trigger to revisit, written down so it is not re-argued from
scratch: two packs collide on a `_mixinName`.** At that point the flat
namespace has actually broken and paths are right. `lint:mixin-names`
(step 3) is what will tell us the day it happens.
