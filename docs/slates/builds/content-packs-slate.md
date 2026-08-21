# Content packs slate — the trade as the unit, and seeding an economy backwards

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

> **Status: design conversation, captured. Not requirements. The
> measurements in Part 7 are real; the roster in Part 6 is a starting
> list, not a commitment.**

Related: [content-packs.md](../../subsystems/content-packs.md) (**the
shipped substrate — manifest, reconcile-by-stamp installer,
`sourcePack`**), [pack-seams-slate](./pack-seams-slate.md) (**how two
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

## ⭐ The test that decides every packaging question

> **A pack that installs and changes nothing observable is the wrong
> cut.**

A *horizontal* pack — `props`, `recipes`, `npcs`, `ambience` — does
nothing on its own. Standing up baking would mean touching six of them,
and each is individually inert. A **trade** pack ships the whole vertical
slice: ingredients, tools, recipes, workspace fixtures, the worker, the
job definition, the wage, the goods that leave, and the smells that come
off it. Install it and **a bakery exists**.

## The vocabulary this settles

| Term | Is |
|---|---|
| **trade** | ⭐ **the pack** — the smallest thing with its own tools, materials, verbs, workspace and product. *Baking* is a trade; *food* is not |
| **vocation** | a **role inside** a trade — what it employs, one layer down from packaging |
| **chain** | the **`dependsOn` graph** across trade packs (farm → mill → bakery). Not a pack of its own |
| **venue** | an **instance**, declared by a locality (Part 4) |

## ⭐⭐ And "ambient life" is not a category

The user's correction, which deleted a whole tier of an earlier draft:

> **Ambient life is not dressing — it is the observable output of
> industries running.** The baker at 5am, the smell of bread, the cart on
> the street.

You do not author atmosphere. **Atmosphere is what an economy looks like
from outside**, so every trade pack ships its own — and dressing then
arrives *with a reason* instead of being sprinkled on.

---

# Part 3 — ⭐⭐⭐ Seed the economy BACKWARDS, from the sinks

The load-bearing finding, and it is a content observation rather than an
economy redesign — which is what keeps it in scope.

**The CB mints on demand because money enters through wages and never
leaves.** The instinct is to add production — more craftables, more
resources — which makes it strictly worse: *supply without demand is a
faucet with extra steps.*

But look at what already ships:

| Shipped mechanic | What it destroys, continuously | Industry attached |
|---|---|---|
| **metabolism** | food, drink | ❌ |
| **thermal** | fuel, warmth, clothing | ❌ |
| **`Durable`** (crafting) | tools, gear — everything wears | ❌ |
| **harm / mortality** | health, bodies | ❌ |
| **encumbrance** | haulage capacity | ❌ |
| **sanitation** | waste removal | ❌ |

> ⭐⭐⭐⭐⭐ **The sinks are built. The industries that feed them are not.**
> The engine already destroys value every tick — hunger, cold, wear,
> injury — and nobody is selling the replacement.

So the seeding strategy is **demand-first, not supply-first**: for each
shipped mechanic that continuously consumes, author the trade that
answers it. Money then leaves through consumption *because the simulation
is already taking it*, and the CB stops being a faucet **without anyone
redesigning the CB**.

## The completeness rule that falls out

> ⭐⭐⭐ **A trade pack is complete when its output has a consumer —
> inside the pack, or as a declared dependency.** A pack that only
> produces is flagged at install.

This makes `dependsOn` **economically meaningful** rather than
decorative, and it is the same test
[vocations.md](../../vocations.md) already applies — *a vocation exists
iff there is unmet demand.* The register was right; it was never wired to
the packaging.

⭐ **First chain to close: grain → flour → bread → eaten → hungry
again.** Every link is a shipped mechanic and it is the shortest loop
that actually closes.

---

# Part 4 — Trade ⊗ locality: the tension, and where the seam falls

> **User: "we also need packs for terminus and the municipalities and
> such that the businesses slot into. Those aren't trades. There's going
> to be a tension between 'this venue is part of this trade content pack'
> and 'the venue cross cuts and is part of a locality content pack'."**

## The tension dissolves — they never write the same paths

> ⭐⭐⭐⭐ **The trade owns the kit. The locality owns the premises. The
> venue is a DECLARATION that references the trade, never a copy of it.**

`/trade/baking/**` belongs to the trade. `/domain/terminus/third-street/
marchettis` belongs to Terminus, and *names* the trade. No collision by
construction — and the review question answers itself: *"all bakeries get
a proofing cabinet"* is a trade diff; *"Marchetti's closed"* is a
Terminus diff.

⭐ Note this satisfies **pack-seams' directional rule for free**: the
locality is the *annex* (it knows the trade), the trade is the *host* (it
knows no locality). A trade is complete with zero localities installed.

| | Trade pack | Locality pack |
|---|---|---|
| kit — oven, counter, racks, slots, affordances | ✅ | |
| operation — recipes, wages, shifts, hours, positions | ✅ | |
| roles — what a baker *is* | ✅ | |
| premises — rooms, geometry, exits, address, parcel, storeys | | ✅ |
| identity — name, sign, owner, why it is here, its rivalry | | ✅ |
| scale/variation — stall vs. shop vs. works | | ✅ *(as a parameter)* |

## ⭐ Crowd vs. cast — the NPC split

Trades ship NPCs (user's call), and the existing doctrine does the work:

> **The trade ships the CROWD. The locality carves the CAST.**

The trade supplies a generic occupant who bakes, keeps hours and behaves
like a baker. A locality may **promote** that to Marchetti — named, with
dialogue, history, a grudge. Consistent with *NPCs are expensive carves,
just-in-time* and *derive the crowd / simulate the cast*; nothing new is
invented.

## ⭐⭐ Every trade pack ships a SHOWROOM

The rule that keeps trades honest: a trade must install into **its own
extent, working, with no locality present** — one functioning bakery you
can walk into and bake in, at `/trade/baking/showroom`.

Three things fall out, all valuable:

1. it satisfies *"install it and something changes"* **independently**;
2. it is the **test fixture** — pack CI installs it and runs the chain
   (Part 5);
3. ⭐ it is the **review artifact** — a reviewer walks the showroom
   instead of reading a YAML diff, which is *the entire reason* this
   moved to git.

Localities never use the showroom instance; they declare their own.

## Reconcile, don't copy

A venue declaration is **a reference plus local parameters**, never a
snapshot of the kit — so a trade update reaches every venue at the next
reconcile, which is how the shipped installer already works.

⚠ **The failure this must survive:** a trade adds a required fixture that
small premises cannot fit. So a venue declares its **scale**, and the
trade ships **named variants** (`stall` / `shop` / `works`). An
open-ended footprint parameter would make every trade re-implement the
same fitting logic.

## ⚠⚠ The hard one: packs SEED, they do not OWN

Venues are ownable. A player buys the bakery, renames it, refits it. If
the locality pack keeps *asserting* Marchetti's, the next reconcile
stomps them.

> ⚠⚠ **A pack declaration is an INITIAL CONDITION, not a continuing
> assertion — for anything a player can own.**

The installer must distinguish *"this has never existed"* from *"this
exists and has since been played with,"* and leave the second alone.
Same shape as the persistence spine's split between authored templates
and `holder_snapshots`, but **not currently a pack-level concept**, and
it must be decided *before* the first pack ships rather than after
somebody loses a shop.

---

# Part 4b — How a pack and a parcel actually wire together

> **User: "the path needs to be by convention but the actual wiring needs
> to be more explicit, especially since parcels can be carved up
> however."**

## ⭐⭐⭐⭐ The distinction that governs all of it

> **The path is a CONVENTION, for humans. The parcel trie is the FACT,
> for the engine. When they disagree the trie wins — and disagreement is
> the FEATURE, not an error.**

## ⭐⭐ You never wire the convention. You decline to carve.

`ownerOf('/domain/terminus/law/ordinance-3')` walks the coverage trie,
finds `/domain/terminus` by longest prefix, and returns the locality's
committee. **Nobody declared "law belongs to the locality."** It falls
out of there being no carve-out beneath it.

Which makes the constitutional move a *parcel operation*:

> ⭐⭐⭐ **An independent judiciary is `subdivide /domain/terminus/law` +
> `transfer` to the court.** The arrangement is not modelled, declared or
> special-cased — it is two calls that already exist, and every downstream
> gate follows automatically because they all read the same trie.

That is the federalism-is-the-longest-prefix-walk finding
([balance-slate](./balance-slate.md)) doing real work.

## The install flow, explicitly

```
1. MANIFEST declares what it claims — never who owns it
     claims:  [/domain/terminus/gray]
     requires: { groups: [gray-committee], policy: <extent>/law/.policy }

2. PRECONDITION — the installing actor must hold title to the covering
   parcel of every claim.  ownerOf('/domain/terminus/gray') must be them.
     ⇒ you can only install into ground you already own

3. TITLE — the installer calls the gated ParcelApi.subdivide, the same
   path the verb uses. Owner INHERITS from the parent.
     ⚠ the pack never writes a parcels row. It CLAIMS; the registry GRANTS

4. CONTENT — writes are REFUSED outside a claimed extent
     ⇒ a trade pack cannot drop a document into someone's law branch

5. CHECKLIST — unfilled requirements derive on read and stay visible
     the group exists but is empty; the policy is absent; title may move later
```

⭐ **Step 4 is what makes a claim mean anything.** A pack may write only
inside what it claimed, and may claim only inside what you own. Two
checks, both against the trie already in memory.

## ⚠⚠ Reconcile is bounded by CURRENT title, not the original claim

Parcels get carved after install — that is the whole point of owning
land. So when the installer next reconciles a path whose nearest parcel
is no longer the pack's owner, **it skips it.**

> **Selling part of your district partially uninstalls the pack from
> it.** Correct, diegetically sensible, and it needs no new rule — it is
> the same `ownerOf` walk, run again later.

This is the seed-vs-assert rule (Part 4) with title as the signal rather
than player-modification, and the two want the same implementation.

## The three trees, as of the 2026-08-04 audit

| Tree | How ownership resolves |
|---|---|
| **template** | ✅ parcels cover extents directly — the real model |
| **documents** | ⭐ **already the same namespace** (`/domain/terminus/law/…` nests under the locality). ⚠ But `DocumentLogic.gateMutation` still uses the pre-0a `resolveZoneForPath` → `canMutateZone`, falling to `can(…, null)` → `core`. **It never got repointed onto `ParcelApi` when `AccessRegistry` did.** |
| **source** | mapped by the *backing-class path mirrors template path* convention via `resolveSourceFolderZone` — genuinely a different namespace, so the mapping earns its keep |

⭐ **The blocker on the document repoint is small:** `AccessApi.can` takes
a **Stuff**, and documents are not Stuff. `can` internally resolves
resource → zone → templatePath → `ownerOf(path)`, so documents need to
**enter that chain one step later** — a path-shaped sibling to `can`.
Doing it deletes the `core` fallback from a third place.

### ⭐⭐ `/compact` is not an exception — landless parcels already ship

> **User: "the `/compact` branch is both a parcel and a namespace owned by
> the compact. They just don't use any land. But they own documents and
> ideas and maybe even things."**

An earlier draft called this the one root that would not fit and punted it
to build-1. **Wrong — the shape already exists.** parcel.md:

> *"⚠ `wild` admits nothing, and that default is load-bearing. Most rows
> in this collection are **not ground at all** — `/studio`, `/obj/lounge`
> and the `/obj/…` roots are **path-branch titles over the template
> tree**, and they all answer `wild`."*

So `/compact` is the same shape as `/studio`: `area: 0`, use inheriting to
`wild`, owner the Compact. Which generalizes the whole model:

> ⭐⭐⭐ **A parcel is TITLE OVER AN EXTENT OF THE PATH TREE. Land is one
> thing you can hold there — not what a parcel IS.**

That is why the trie needs no per-namespace logic: documents, templates
and publications are all extents, and *ground* is the special case that
additionally carries `area`, `storeys` and a `landUse`.

⚠ **"Maybe even things" is the seam between the two ownership systems**,
and it is worth not blurring:

| The Compact owns… | Mechanism |
|---|---|
| a **branch** — documents, Ideas, template definitions | **parcel title** over the extent |
| a specific **instance** — the mace of office, one particular chair | ⭐ **chattel** (`_chattelId`, its own chain of title) |

A Thing sitting in a room the Compact does not own is *chattel* the
Compact holds, not evidence that parcels need to cover instances. Keep
them apart or `ownerOf(path)` starts wanting to answer questions about
objects that move.

## What does NOT change

⚠⚠ **A pack still never declares title.** Multi-extent claims make a
pack's reach *wider*, so the invariant matters more, not less: **the pack
CLAIMS, the gated registry GRANTS.** `parcels.yaml` stays a platform
seed, and the supply-chain-spoof reasoning in parcel.md is exactly why.

---

# Part 5 — Tests: the dependency direction is the design

> **User: "a lot of our current seeding is just there for our tests and I
> want to get all that shit out of there… ideally other content packs
> would be providing all that stuff."**

## ⚠ The measurement inverted the premise

Only **39** seed templates are genuine test scaffolding. The real number
is the other one:

> ⚠⚠ **106 test files make 663 references to `/domain/**` paths.**
> `persistence-spine.test.ts` alone names world content **138 times.**

**The seeds are mostly real content; it is the tests that reach into the
world.** So the fix is not relocating fixtures — it is severing a
dependency.

## ⚠ And engine tests must NOT consume content packs

The one place the session's instinct needs inverting. If
`persistence-spine.test.ts` loads the baking pack, a content author
editing a bakery can redden the engine build — and the test stops testing
the engine and starts testing content.

> ⭐⭐⭐ **Dependency direction is the whole design: engine tests depend
> on NOTHING. Pack tests depend on the engine. e2e depends on
> everything.** Only the last is allowed to break when content changes,
> and that is precisely its job.

| Tier | Fixture | Breaks when |
|---|---|---|
| **engine / unit** | constructed in-test, or a synthetic fixture pack | the engine breaks |
| **pack** | ⭐ **its own showroom**, shipped with the pack | that pack breaks |
| **e2e** | real packs, composed | the integration breaks — as intended |

## ⭐ Make the fixture pack ugly on purpose

`/test/widget`, `/test/room-a`, `/test/container-b` — **not** a plausible
tavern.

> **A fixture that looks like content becomes content.** That is exactly
> how Duncan Hall's dorm fixtures ended up load-bearing for the
> persistence suite.

Name them so nobody is tempted to use them in the game and nobody feels
licensed to make them nice.

## The tripwire

The codebase already enforces boundaries with scripts (`lint:gates`,
`lint:imports`, `lint:module-scope`); this is the same shape:

> **`lint:test-content` — no test outside a pack or `e2e/` may name a
> `/domain/**` path.**

663 violations today, so it lands **warn-only with an allowlist that only
shrinks** — which converts *"we should really fix this"* into a number
that goes down.

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

## ⚠⚠ Title and membership are never content

If *"almost all seeding moves to packs"* is taken literally it breaks a
shipped invariant. `config/parcels.yaml` and `config/groups.yaml` are
**access-check data**, and parcel.md's governing invariant exists
*precisely* because content-declared ownership "would be a supply-chain
spoof" in a pack future.

> **A pack may CLAIM an extent; only the gated registry may GRANT it.**

## The acceptance criterion

> ⭐ **A Saxonberg with zero packs installed boots, accepts a login, and
> presents an empty world without erroring.**

Concrete, almost certainly false today, and the honest test of whether
the platform/content line is real.

## The inventory, measured 2026-08-04

| | |
|---|---|
| in packs | **2 packs, 82 yaml** (`base-library`, `species-and-names`) |
| in the platform | **758 seed templates** + 9 `config/` singletons |
| `version` / `dependsOn` | present, **inert** — *"nothing reads/enforces it"* |

Seed templates by who references them:

| | |
|---|---|
| 213 | engine code only |
| 116 | tests + engine code |
| 83 | reached only via other seeds |
| 80 | tests + other content |
| 39 | test-only, nothing else |
| ⚠ **227** | **referenced by nothing at all** |

⚠ **The 227 are an AUDIT list, not a delete list** — some are surely
reached dynamically (directory cloning, shop stock, MQL at runtime). That
uncertainty is the point:

> ⭐⭐ **The migration is also the inventory.** When every seed must
> belong to a pack, an orphan has nowhere to go — you either home it or
> drop it. Nothing forces the question today, so 227 files sit in a state
> where nobody can say whether they are live.

---

# Part 8 — What the substrate still needs

| # | Gap | Note |
|---|---|---|
| 1 | ⚠⚠ **`PackLogic` bypasses the `saveTemplate` code-field gate** — it writes `PersistApi.save` directly | Fine while `pack` is wizard-gated and every pack is yours. **The moment packs are the distribution mechanism, that bypass IS the supply-chain attack surface.** Highest priority |
| 2 | **Dependencies** — the field is inert | resolution order + cycle detection |
| 3 | **Versioning + migration** | what happens to instances cloned from a template a pack update changes |
| 4 | ⭐ **Conflict & layering** | two packs claiming one path needs an explicit override model, not last-writer-wins |
| 5 | ⭐⭐ **Pack ↔ parcel fusion** | *a pack declares the extent it claims; installation requires title to it.* Makes "who may install this" answerable and stops a pack squatting another's paths |
| 6 | **Uninstall**, not just reconcile | |
| 7 | ⚠⚠ **Seed-vs-assert** (Part 4) | the player-owned-venue problem |
| 8 | **Tier declaration + enforcement** (Part 1) | |

---

# Part 9 — Replacing the seeders

> **User: "I want to get completely rid of SeederManager if I can and
> replace it with content packs in its entirety, with the exception of
> whatever content is actually platform level like certain groups
> existing. So there does need to be some level of platform seeding, but
> hopefully it runs the same logic as content pack installation."**

## What exists (audited 2026-08-04)

Bespoke code paths for *"put this YAML in that collection"*:
`SeederManager` (walks `mud/seeds/` → `domain`), plus `Group`, `Parcel`,
`Emote`, `Channel`, `Recipe`, `Blueprint`, `AppSettings` and `Script`.

⚠ **Make that TEN — build-2's wiki added `WikiSeeder` + `config/wiki-
pages.yaml` (starter articles) while this audit was being written.** That
is the sequencing pressure stated as a fact: **new seeders keep arriving
until the pack path exists**, because a seeder is currently the only way
to ship starting content. Every build pays the tax and the migration
grows.

⭐ **And `SeederManager`'s own header makes the case for the migration:**

> *"Insert-only by design… the dev workflow for 'I changed the seed YAML'
> is `db.domain.deleteOne({path}); restart`."*

> **The pack installer already reconciles. SeederManager cannot.** This is
> an upgrade on the axis you feel daily, not a lateral move.

⚠ **Only `ScriptSeeder` touches the `documents` collection at all**, and
narrowly — lounge `.script` files at `/domain/lounge/scripts/<name>`.
**There is no general document seeding**, which build-1's publications
work will need.

## ⭐⭐⭐ Structure vs. authority — the rule that shrinks the exception list

> **A pack declares STRUCTURE. It never declares AUTHORITY.**

| Structure — a pack may declare it | Authority — only a gated procedure grants it |
|---|---|
| this group **exists** | who is **in** it |
| this extent is **claimed** | who holds **title** |
| this office **exists** | who **sits** in it |

So *"what has to stay platform-level?"* is **almost nothing**. Membership,
title and seats were never content — `parcels.yaml` and `groups.yaml` do
not stay behind because they are special seeds, they **stop being seeds**.

⭐ That also retires the awkward part of `config/groups.yaml`: the four
tag-like groups become *requirements* the platform declares, and
`WIZARD_PLAYER_IDS` stops being a separate mechanism — **it is the first
invocation of the fulfillment procedure.**

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

## One installer; the platform is pack zero

> **Same logic, different authority.** The `platform` pack installs
> through the identical reconcile path, but it is installed **by
> bootstrap**, not by the `pack` verb.

Trust is a property of **provenance, not format** — the narrow-entry
pattern already used everywhere. ⭐ And it means the platform pack
dogfoods the installer on **every boot**, so the path third-party content
will use is the most-exercised code in the system.

## ⚠ The installer has to grow typed contributions

Six seeders write **non-`domain` collections**. So a pack stops being "a
tree of templates" and becomes **a set of typed contributions**, with the
installer dispatching per kind — and **each kind needs its own reconcile
semantics.**

> ⚠⚠ **The seed-vs-assert rule (Part 4) generalizes to every contribution
> kind.** A pack update must not stomp an `app_settings` value an operator
> tuned, for the same reason it must not stomp a bakery a player bought.

`sourcePack` gives provenance but **not modified-since**. Cheapest honest
version: compare against what the pack last installed and skip anything
that has diverged — ⭐ **loudly**. Silent skips are how you spend an
afternoon wondering why a pack update did nothing.

### ⭐⭐⭐ The wiki shows the general rule — and already implements it

The wiki is the one collection the project deliberately gave version
control to (*user, opening this session: "we rejected any kind of version
control on our own mongo collections **except the wiki**"*), and that
turns out to answer the reconcile question rather than complicate it.

From [wiki.md](../../subsystems/wiki.md) (⚠ **build-2's, MR !166 — not on
master yet, so this link dangles until it merges**): `wiki` holds current
state, **`wiki_revisions`** is append-only, and —

> *"`rev` is a **compare-and-swap token**. An edit submits the rev it was
> based on; a mismatch is rejected with all three bodies and **no
> auto-merge**, because a machine-merged paragraph reads as somebody's
> writing and is nobody's."*

⭐⭐ **So a pack update to a wiki page needs no special seed-vs-assert
logic at all.** It submits an edit with the rev it shipped against; if a
player has since edited, it is **rejected with a three-body conflict a
human resolves.** Not stomped, not silently skipped — surfaced.

> ⭐⭐⭐⭐ **Reconcile semantics should follow whether a contribution kind
> has a revision token.**
>
> | kind has CAS/`rev` | submit the edit; let the collection's own conflict machinery fire |
> | no CAS | compare-and-skip against what the pack last installed, **loudly** |

And the wiki's own justification generalizes to the whole installer: **a
pack silently merging into authored content has exactly the problem that
line names** — the result reads as somebody's writing and is nobody's.
Which is the argument for *skip and warn* over *merge* everywhere the CAS
token is missing.

⚠ **A wiki pack is therefore its own contribution kind**, and a good
early one — it is the [wiki-as-course-commons](../tails/wiki-slate.md) surface,
its contributors are writers rather than programmers, and the conflict
story is already built.

## ⭐⭐⭐ Several of those collections are documents wearing a collection

> **User: "emotes all live under lib, as well as name banks and anything
> else that's parcel scoped, doesn't cross boundaries, and doesn't need
> its own indexing schema."**

⚠ **An earlier draft of this conversation suggested closing the
`/lib/`-documents carve-out. Wrong — it is a real, populated category.**
And the rule above supplies the **third sort test**, the one that is
actually checkable, completing legal-code-slate's *"collections cut
across jurisdictions and are queried by system; the tree is place / owner
/ division of labor."*

| | Storage | When |
|---|---|---|
| **own collection** | a dedicated collection | crosses jurisdictions · queried by system · **needs real indexes** — ledgers, events |
| ⭐ **document at a parcel-scoped path** | `documents` | owned · local · **path-keyed is enough** — emotes, name banks |
| **template** | `domain` | instanceable content |

⚠ **The code does not agree yet.** `Collections.ts` carries
`Emotes = 'emotes'` and `NameBanks = 'name_banks'` as their own
collections, seeded by `EmoteSeeder` and the species-and-names pack.

### The index measurement (2026-08-04) settles it

| collection | indexes it actually declares |
|---|---|
| `name_banks` | unique on `key` |
| `recipes` | unique on `recipeId` |
| `blueprints` | unique on `blueprintId` (+1) |
| `emotes` | unique on `verb`, **plus `aliases`** |

> ⭐⭐⭐ **Three of four have exactly one index — unique on their natural
> key — which is precisely what the path-addressed document store already
> provides.** By the sort rule's own third test, they are documents
> wearing a collection.

⭐ **Which shrinks this whole migration:** the typed-contribution work is
**fewer than nine kinds**, because several of those collections should
not exist. Each collapsed kind inherits the document store's reconcile
semantics — **one implementation instead of four.**

## ⭐⭐ Storage vs. search — the false dichotomy

> **User: "indexable also probably means searchable, and I do think we
> want searchable emotes. So either we need to be more liberal about what
> gets its own collection, or a better model for searching documents…
> documents is very general purpose right now."**

Both horns are avoidable, because **storage and search are different
jobs**:

> **Storage is the document store. Search is a CATALOGUE over it.**

That is already the house pattern, used at least five times —
`SoulCatalogue`, `TopicCatalogue`, `ChannelCatalogue`, the harvested help
catalogue, Studio's blueprint catalogue. Each is a **derived, in-memory,
rebuildable projection shaped for its own queries**. So *searchable
emotes* needs `SoulCatalogue` to be the search surface, not emotes to
have a collection.

⚠ **The honest limit is cardinality, not principle.** Hundreds of emotes
in memory is free; a large prose corpus is not.

### ⭐⭐⭐ And where a catalogue cannot serve: kind-scoped indexes, not more collections

> **`{kind: 1, verb: 1}` in the one `documents` collection gives emotes
> exactly the index they have today — including the unique constraint —
> inside the shared store.**

Per-kind indexing **without** per-kind collections. It also dissolves the
strongest argument those four collections had: `unique on {kind, key}` is
the same guarantee as `unique on key` in a dedicated one.

### Keeping the store general-purpose

The worry is right — the document store is valuable *because* it is where
authors persist things of their own design. So two tiers **inside** it:

| | |
|---|---|
| **declared kinds** | the platform or a pack registers the kind + its indexable fields → indexes, and usually a catalogue |
| **free-form** | author-designed, path-keyed only, no indexes, no search beyond prefix |

⭐ **A kind graduates from free-form to declared when somebody needs to
search it** — open by default, structured only where earned.

⚠ **Declaring a kind creates database indexes**, so it is a
platform-shaped act, not something an author does at runtime. That makes
it a pack **`requires:`** entry — the same structure-vs-authority split as
groups and title.

⭐ **Document search is coming regardless.** The wiki, law and
publications all want find-by-content and none of them fits in memory.
**Emotes merely surfaced it first** — which argues for solving it rather
than granting emotes a collection as a one-off that would have to be
undone.

### ⭐⭐ RESOLVED — kill emote aliases, and the outlier disappears

> **User: "I hate emote aliases, the namespace is crowded enough as it
> is."**

Better than the answer the open question was fishing for. `emotes.md`
confirms aliases are **dispatchable** — *"the map is keyed by canonical
verb AND by every alias"* — so every alias consumes a word in the
**global verb namespace**, which is the one namespace nobody can carve.

⭐⭐⭐ **And the personal mechanism already ships.** `AliasMixin`
([shell-alias.md](../../subsystems/shell-alias.md)) is per-character,
verb-position, persistent or session-scoped:

> **Emote aliases are a GLOBAL solution to a PERSONAL problem, and the
> personal solution already exists.** Someone who wants `hi` to mean
> `wave` types `alias hi wave` and consumes nobody else's namespace.

⭐ **Discoverability survives by demotion, not deletion:** keep the
alias words as **catalogue search terms**, not dispatchable verbs. That
is exactly the storage-vs-search split above — `SoulCatalogue` matches
`hi` and offers `wave`; the dispatcher never binds it.

**Consequences:** the `aliases` multikey index goes away ⇒ **`emotes`
declares one index, unique on its natural key** ⇒ it collapses into the
document store with the other three. ⭐ **No outlier at all.**

⚠ Migration: existing aliases either drop or get promoted to real emotes
— a content decision per row, not a mechanism.

### ⭐⭐⭐ The rule this generalizes to

> **A word occupies the global verb namespace only if it is the PRIMARY
> NAME OF A DISTINCT ACT.** Synonyms belong to the catalogue;
> preferences belong to per-character aliases.

## ⭐⭐ The verb namespace — and packs SHOULD ship verbs

> **User: "we do want packs to ship verbs. Collisions should be
> infrequent provided good governance but they'll happen… scoping verb
> affordances so very few verbs hang on universals like 'self'. And then
> providing an enhancement to our CLI that lets you provide an MQL query
> to scope your command to."**

### ⚠ First, a correction: emotes are already the FALLBACK

An earlier draft here called the verb namespace *"the scarcest shared
resource in the game, with no carve-out mechanism, because unlike paths
it is flat."* **Overstated.** From
[emotes.md](../../subsystems/emotes.md):

> *"when the affordance verb-match list (`getAffordances()` filtered by
> verb) comes back **empty**, the router checks `MixinApi.isSoul(speaker)`
> and consults `SoulApi.resolve(parsed.verb)`."*

⭐⭐ **Emotes only get a word when nothing affords it.** An
ever-expanding catalogue can never shadow a pack's verb — it fills gaps.
And two explicit forms already ship: the `:wave` / `;wave` prefix
dispatch, and `cmd/social/emote.yaml`.

**So the problem is narrower than stated: affordance ↔ affordance.** Two
objects in reach both affording `shake`.

### ⭐⭐⭐ And the namespace is not inherently flat

> **It is flat only because almost everything currently hangs off the
> UNIVERSAL scope.** Scoping affordances off `self` is therefore *the
> actual fix* rather than a mitigation; MQL disambiguation handles the
> residue.

⚠⚠ **Two things called "scope" — do not conflate them** (an earlier draft
here did):

| | governs | declared |
|---|---|---|
| **`scope:`** — `$focus` · `inventory` · `peers` · `reachable` | where MQL searches for a verb's **ARGUMENTS** | per-verb, in YAML, by the author |
| **`RecencyBucket`** — `self` · `inventory` · `environment` · `peers` | which **AFFORDANCE** provides the verb | never — it is runtime state |

### ⭐⭐⭐⭐ How affordance collisions resolve TODAY: recency

`RecencyBucket` carries the comment *"categorical metadata, **not
ordering**."* The ordering is the stack: `getAffordances()` walks
`_commandStack` **top-down**, so **the most recently pushed source
wins**. Two objects affording `shake` → whichever you most recently dealt
with.

⭐ **That is a good heuristic, and it explains why this has not bitten
yet.** *"The thing I was just handling"* is how people actually think.
Nothing here is broken.

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

### Packs declare their verbs — to REPORT, not to prevent

> **Warn, do not refuse.** *"This pack's `shake` will be ambiguous with
> the cocktail shaker when both are in reach."* Under the scope model
> that is information, not an error.

It also gives manifest review something concrete: a **cosmetic-tier pack
shipping verbs is already a tier violation** (Part 1), and now it is
visible in the diff.

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

## Migration order

0. ⭐ **Collapse the documents-wearing-a-collection kinds** (`name_banks`,
   `recipes`, `blueprints`, probably `emotes`) into the document store
   with `{kind, key}` indexes — **fewer kinds to teach the installer, and
   one reconcile implementation instead of four**
1. **Typed contributions + per-kind reconcile** — everything waits on it
2. **`requires:` + derived checklist + `provision`** — unblocks
   groups/title/offices/policies/**kind declarations**
3. **The platform pack**, installed by bootstrap → delete `SeederManager`
   and the rest
4. **Split `seeds/` into trade and locality packs** — the long tail, now
   safe to do incrementally

⭐ **Step 3 is where "the platform ships clean" becomes true and
testable, and it can land well before step 4 finishes.**


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

**Captured 2026-08-20.** The session opened on the repo split
(submodules?) and "every collection needs a seeding model instead of the
patchwork," and turned into the installer:

> **User: "installing content packs is like a duty for an ops person and
> we probably want like an actual installer or something that packs then
> can inform as to what kinds of configuration and parameterization is
> needed. this also handles the database authority problem hopefully by
> having some sorta rules-based thing as to what a re-install is/means."**

This addendum answers open questions **#2** and **#3**, and disposes of
Part 8 gap **#1** (the `PackLogic` gate bypass) by changing what install
*is*. Status: design conversation, captured. Not requirements.

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

## A10.2 — The sentence that governs DB authority

> ⭐⭐⭐ **The DB is a cache of the packs for everything a pack ships, and
> the system of record only for what players did.**

The corollary that keeps version control honest: for pack-owned paths
there is **no DB-authoritative edit**. The round-trip is
**export → file → commit → MR**, never "the DB wins." A CMS edit to a
pack-owned template is an *export candidate that reconcile will
surface* — see the state machine below, which is what makes that safe
instead of silently lossy.

## A10.3 — The closed set of seeding models (~6, not per-collection)

"Every collection needs a seeding model" resolves to **six models**, not
fifty policies. Against `Collections.ts`:

| Model | Truth | Collections |
|---|---|---|
| **reconciled** — file is truth | file | `domain`; the kinds that collapse into `documents` |
| **seed-missing** — pack seeds, operator owns after | DB | `app_settings`, `world_state` |
| **structure-only** — existence from the pack, authority from a procedure | split | `groups`, `parcels`, `office_holders` |
| **CAS-merged** — has a rev token; conflicts surface | both | `wiki` (+`wiki_revisions`) |
| **never seeded** — empty is correct | DB | every ledger + `*_events`, `users`, `beliefs`, `chronicles`, `transcripts`, `player_frames`, `holder_snapshots` |
| **derived cache** — rebuilt, never seeded | neither | `renown`, `participation`, `producer`, `bank_accounts`, `bank_supply` |

⭐ **The last row is what the patchwork hides**: a derived cache needs a
REBUILD command, not a seeder — conflating the two is how a stale cache
survives a reboot looking authoritative. ⭐ Acceptance test for the
vocabulary itself: every collection lands in exactly one row with no
residue. Three needing special pleading = the vocabulary is wrong.

## A10.4 — ⭐⭐⭐ The install record: three-way reconcile

Today's reconcile is **two-way** (pack file vs. DB row), which cannot
distinguish *the pack changed this* from *someone with authority changed
this* — the reason Part 9 hand-waved "compare against what the pack last
installed" and flagged `sourcePack` as provenance-but-not-modified-since.

An installer has a natural artifact that fixes this: a per-pack
**install record** — pack id, version, the parameter answers, and a hash
of each row *as installed*. Reconcile becomes **three-way** and the
"rules-based thing as to what a re-install means" becomes a small state
machine instead of policy prose:

| pack file | DB row | action |
|---|---|---|
| unchanged | unchanged | nothing |
| changed | unchanged since install | update, silently |
| unchanged | diverged | keep the DB — authority did that |
| changed | diverged | ⭐ **conflict — surface it, never merge** |

Same machine for the operator-tuned setting, the player-modified bakery,
and the wiki page — except the wiki carries its own CAS token, so there
the installer *submits the edit* and the wiki's three-body conflict
machinery fires (§ the wiki shows the general rule). The install record
is what every other kind was missing to get the same honesty.

**This CLOSES open question #3** (reconcile vs. a player-modified
venue): both-changed → conflict, surfaced, human-resolved. Skip-and-warn
was the two-way approximation; three-way makes it exact.

## A10.5 — Reconcile policy is a property of the KIND, never the pack

If a pack could declare `replace` over `app_settings`, a pack update
stomps what an operator tuned — seed-vs-assert, opted into by the party
that benefits. The kind's owner (the platform) declares the reinstall
semantics for that kind; a pack may choose a **gentler** policy than the
kind allows, never a stronger one.

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

## A10.8 — Ops is an OFFICE, and install is a gated procedure

*"A duty for an ops person"* resolves to an office, not a person
(check-offices-never-the-founder). "May this principal install this pack
here" decomposes into three checks that all exist or are slated:

| check | machinery |
|---|---|
| holds the ops seat | `holdsOffice` (governance) |
| title to the claimed extent | pack ↔ parcel fusion (Part 8 gap #5) |
| review tier vs. manifest claim | the Part 1 tier table — cosmetic installs freely, systemic needs the ledger's owner, constitutional needs the legislature |

⭐⭐ **The installer is the one place those three compose — which
DISPOSES of Part 8 gap #1** (the `PackLogic` `saveTemplate` bypass): the
bypass was tolerable while `pack` was wizard-gated and every pack was
ours; the fix is not re-routing writes but making install a **gated
procedure with a named principal**, so provenance is checked at the door
instead of per row.

## A10.9 — Reconcile ≠ go-live; hot go-live is a per-kind capability

> **User: "I'm not sure about installing content packs inside a running
> game runtime. if it works that's great but I feel like it'd at least
> want a restart."**

The shipped code already agrees. Runtime `pack sync` works for exactly
one shape — singletons-by-path with lazy re-resolve (materials, biomes) —
and the doc defers cloned content as "the harder wave." A trade pack is
*entirely* the harder wave: rooms, NPCs, fixtures, all cloned, all live,
some with players standing in them. So, written as a rule:

> ⭐⭐⭐ **Split RECONCILE from GO-LIVE. Reconcile (rows + install record)
> is always safe — nothing live reads a `domain` row until clone or
> re-hydrate. Go-live is the dangerous half, and RESTART is the universal
> go-live that works for every kind.** Hot go-live (materials, quantity
> tags, name banks) is a per-kind *capability* — an optimization, same
> per-kind shape as reconcile policy — never a requirement.

Nobody ever has to make runtime world-swapping work under players' feet
to ship a pack. The architecture has priced in the restart: one box,
deploy at standup, 502-for-~90s documented normal, and the
self-persistence spine makes restart a supported world state.

## A10.10 — No companion webapp: stage in-game, apply at boot

> **User: "…if not like a whole separate companion webapp that runs
> adjacent to the server for installation/configuration and it can own
> server lifecycle or something."**

Argued against, for one specific reason:

> ⭐⭐ **The authority model lives inside the game.** `holdsOffice`,
> title, tiers — all mudlib. A companion app either reimplements them
> (two authority models, drift guaranteed) or phones the running server
> to ask (at which point it is a UI on the game, not a separate system).
> It would also be a second lifecycle owner next to the deploy machinery
> — a category of bug already paid for once.

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

## A10.11 — Decisions in git, the ledger in Mongo

> **User (on install records): "probably mongo but co-locating them with
> the artifacts themselves might have some merit."**

Half-merit, split along a line already trusted. The record cannot live
in the *pack's* repo — a pack is one-to-many with deployments, and a
pack that records where it is installed inverts annex-knows-host. So:

| | lives in | examples |
|---|---|---|
| ⭐ **Decisions** | **git** | which packs a deployment runs (server `package.json` already IS this), parameter answers, the venues a locality declares — content someone might argue about |
| **The ledger of application** | **Mongo** | installed version, as-installed row hashes, staged/applied/failed, timestamps — per-deployment runtime state |

The wiped-DB test (the standing trap): wipe Mongo and the install
*ledger* is cheerfully reconstructible by reinstalling from the decision
files — whereas parameter answers living only in Mongo would have eaten
the venues. Decisions in git, application state in Mongo, and the DB
stays *just the DB* all the way down. (Venue declarations in the
locality's pack also means "install" trends toward *the locality pack
declares venues of trade packs* — installs all the way down, with only
the record of having installed in the DB.)

## Effect on the standing lists

- **Open question #2** — closed: named variants AND a locality footprint,
  unified as the pack's parameter schema (A10.6).
- **Open question #3** — closed: three-way state machine; both-changed
  surfaces as a conflict, never merged, never silently skipped (A10.4).
- **Part 8 gap #1** — disposed by reframing: install becomes a gated
  procedure with a named principal (A10.8).
- **Part 8 gap #3 (versioning/migration)** — advanced: npm versions via
  the registry make `version` load-bearing at the repo split (A10.1).
- **Part 9 migration order** — unchanged, with the install record +
  staged-install substrate joining step 1 (typed contributions), and the
  repo split confirmed as after step 4.

---

# Addendum 2026-08-20 (2) — the boot audit, the collection buckets, and the subject resolution

**Captured 2026-08-20, same session as the installer addendum.** The
ask: assign every collection a seeding model, define how a pack
*expresses* each, and audit `backend/` boot with intent to delete —
> **User: "I really want to get as much of that gone as possible. Maybe
> a few general abstractions if there are legitimate patterns, but this
> eager stuff has gotta go."**

Audited against `AppBootstrap.run` as of `0d25ab62c`.

## A11.1 — The boot is FOUR jobs wearing one sequencer

`AppBootstrap.run` is ~340 hand-ordered lines interleaving four jobs.
Only one of them is seeding. The dispositions differ per job — which is
what makes "delete the eager stuff" tractable:

| Job | What | Disposition |
|---|---|---|
| 1 | **Seeding** — `SeederManager` + `PackApi.install` + 9 per-collection seeders | → the installer, typed kinds; every seeder file deleted |
| 2 | **Platform wiring** — `installFrameworkWiring`, marshaller seam, `loadHooks`, `preloadAll`, MQL online-provider | stays, stays hand-ordered — the kernel booting itself |
| 3 | **Manifest clones** — 43 `bootstrap.ts` entries | split: platform registries stay (or self-declare); **content entries leave for packs** (A11.3) |
| 4 | **Warm + activate** — 6 `warm()`s, ~16 `*Api.boot()`s, relay readers, nightly reset | not seeding at all → the sequencer abstraction (A11.5) |

## A11.2 — Job 1: the eleven writers, disposed

| Seeder | Collection | Policy today | Becomes |
|---|---|---|---|
| SeederManager | `domain` | insert-only | platform pack zero, reconciled |
| EmoteSeeder | `emotes` | insert-only | reconciled (post doc-store collapse) |
| RecipeSeeder | `recipes` | insert-only | reconciled (same) |
| ChannelSeeder | `channels` | insert-only | the **subjects** kind (A11.6) |
| ScriptSeeder | `documents` | insert-only | the general **document kind** it prototypes |
| AppSettingsSeeder | `app_settings` | **merge-missing** | seed-missing — ⭐ **already the reference implementation** |
| GroupSeeder | `groups` | ensure-member | structure-only — must die in current form |
| ParcelSeeder | `parcels` | insert-only | structure-only (claims via install) |
| WikiSeeder | `wiki` | insert-only | CAS-merged |
| BlueprintSeeder | `blueprints` | two-layer | **split** — see below |

Three findings:

- ⭐⭐ **`BlueprintSeeder` (380 lines, the biggest) is two seeding models
  welded into one collection.** Layer (a) *derives* a skeleton by
  introspecting every backing class in `domain` — a **derived-cache
  rebuild wearing a seeder costume**. Layer (b), the curated YAML
  overlay, is genuine reconciled content. Split: (a) becomes
  `BlueprintCatalogue`'s rebuild; (b) becomes pack files. The seeder
  dissolves.
- ⚠⚠ **`GroupSeeder` seeds AUTHORITY** — it ensures *members* into
  groups from YAML, exactly what structure-vs-authority forbids as
  content. Its own header argues conferral-by-the-owner; but
  conferral-by-YAML-at-boot is conferral by whoever edits the file.
  This is the `WIZARD_PLAYER_IDS` → first-invocation-of-the-procedure
  case, generalized.
- ⚠ **`WikiSeeder`'s insert-only is a silent-loss policy wearing
  politeness**: a player-edited page is never stomped (good), but a pack
  *improving* a seeded page never lands either — silently. The CAS kind
  fixes both directions at once.

## A11.3 — Job 3: content in the manifest, and the inert-at-boot bug

Of the 43 manifest entries, ~37 are platform registries/catalogues. Six
are **content**: the five `/corpo/*` singletons, `/compact/press` +
`/compact/executive`, `/domain/lounge/terminal`, `dorm-warren`, and the
two Hinkley Hills singletons. Content in the engine manifest is the same
category error as content in `mud/cmd/`.

⚠⚠ And the manifest has a shadow: **reference-ideas-inert-at-boot,
three times and counting.** `MaterialApi.boot()` and
`ConditionApi.boot()` are hand-written apology steps for seeds nothing
warmed; CombatFormation has the same wound today with no apology
written. **Three mechanisms exist** for "make these rows live at boot"
— a manifest entry, a prefix expansion, a bespoke `Api.boot()` — and
the bug lives in the gaps between them.

> ⭐⭐ **So a new contribution kind: `boot-instances`** — a pack declares
> which of its template paths are cloned-at-boot singletons. The
> declaration TRAVELS WITH THE CONTENT instead of living in a central
> list a build forgets to update — which empties the content out of the
> engine manifest AND structurally kills the inert-at-boot bug for pack
> content.

## A11.4 — The 50 collections, bucketed

| Model | Collections |
|---|---|
| **reconciled** | `domain` · `name_banks` · `descriptor_banks` · `emotes` · `recipes` · `forum_subjects` · `forum_boards` · `channels` (organizer rows — A11.6) · `blueprints` *(curated layer)* · `documents` *(pack-shipped kinds)* |
| **seed-missing** | `app_settings` |
| **structure-only** | `groups` · `parcels` |
| **CAS-merged** | `wiki` (+ `wiki_revisions` as its ledger) |
| **never seeded** | `users` · 3× `*_profiles` · `parties` · `beliefs` · `chronicles` · `transcripts` · `disposition_events` · `forum_entries` · `forum_votes` · `forum_events` · `renown_events` · `participation_events` · `producer_events` · `authoring_events` · `positions` · `bank_ledger` · `parcel_events` · `chattel` + `chattel_events` · `accountability_events` · `contracts` + `contract_events` · `holder_snapshots` · `player_frames` · `diagnostics` · `media_assets` · `office_holders` · `world_state` · `documents` *(player-authored kinds)* |
| **derived cache** | `renown` · `participation` · `producer` · `bank_accounts` · `bank_supply` · `blueprints` *(derived layer)* |

The residue is instructive, not embarrassing:

- **`blueprints` lands in two buckets** — confirming two collections
  cohabiting, not a bad vocabulary.
- **`world_state`** is never-seeded: `WorldClockApi`'s zero-clock on a
  fresh DB is lazy init of runtime state, not content.
- **`office_holders`** is pure authority — sparse, absence = founder
  default — ⭐ the one collection already living the split.

## A11.5 — How a pack expresses each bucket

Five of six reduce to *files under a typed subdir; the kind carries the
reconcile semantics* (A10.5 doing its job):

| Bucket | The pack's expression |
|---|---|
| reconciled | files under the kind's subdir — the shipped model |
| seed-missing | a `settings/` defaults file; installer merges missing keys |
| CAS-merged | page files; install record holds the base-rev; installer *submits an edit* |
| structure-only | the **`requires:`** block — never rows, never members |
| derived cache | **nothing** — but an install *triggers* affected rebuilds (new classes ⇒ blueprint-skeleton rebuild) |
| never seeded | **nothing, enforced** |

> ⭐⭐⭐ **The closed kind vocabulary IS the allowlist.** There is no
> contribution kind for `bank_ledger`, so a pack physically cannot say
> it. "Can a pack write the ledger" is not a policy check that could
> regress — it is a missing noun.

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

End state: `AppBootstrap.run` ≈ *connect → install (platform pack zero +
shipped packs + anything staged) → framework wiring → sequenced
lifecycle*. Every seeder file deleted; the manifest shrunk to platform
registries or gone if those self-declare too.

## A11.6 — ⭐⭐ The subject resolution: social surfaces are CONTENT

The audit's one open cell — is a channel/board reconciled or
structure-only? — dissolved one layer down:

> **User: "by channels do you mean subjects? because those would ship
> with content packs the same way emotes do… the prototypical example is
> the narnia content pack ships with a narnia forum and a narnia chat.
> maybe even more than one, one for labor and one for consumers. I dunno
> it's up to the content pack maintainer."**

Chat already rides the forums Subject layer — a channel and a board are
both **organizers over one Subject**. Stated at that layer there is
nothing structural about it: a subject is plain content, exactly like an
emote. The Narnia pack ships `subjects/narnia.yaml` (and
`narnia-labor.yaml` / `narnia-consumers.yaml` if the maintainer wants
the chamber split), each declaring which organizers it wants — a board,
a channel, both. **One reconciled kind (`subjects`), no `requires:`
entry, no special case.** How many and how sliced is the maintainer's
call.

The "isn't a social surface authority-shaped?" worry does not survive
the rows: a standalone channel's `memberIds` is empty by design
(audience = everyone minus a future banlist) and a group-backed
channel's membership rides the Group, which structure-vs-authority
already governs. **There is no authority in the subject/organizer row to
protect.** Help/Global/Chat stop being a seeded special — they are the
platform pack zero shipping the same kind; `ChannelSeeder` dies with
nothing left behind.

## A11.7 — ⭐⭐⭐ The delete direction: archive, never reap

The one per-kind nuance the reconciled kind needs. For materials,
*stamped row whose file vanished → delete* is fine. For a subject, the
row may be untouched while the WORLD GREW AROUND IT — a Narnia forum
with three hundred player threads is not clean to drop because the
pack's next version removed the file. ⚠ The three-way record cannot
catch this (the row never diverged), so the rule is stated at the kind:

> **An organizer whose file vanishes is CLOSED/ARCHIVED, never reaped.
> Player writing is never destroyed as a side effect of a reconcile.**
> Entries stay, visibly orphaned under a closed subject; actually
> removing them is a separate deliberate act by someone with authority
> to do it.

Same spirit as the wiki's no-auto-merge line: the reconcile may retire
the container, but the contents are somebody's record. And it
generalizes — it is the slate's *packs seed, they do not own* rule
(player-*bought* venues) recurring for player-*written* accumulations,
and it will recur a third time the moment packs ship anything with a
ledger nearby. Named once:

> ⭐⭐⭐ **A pack owns what it shipped, never what accumulated around
> it.**

## Effect on the standing lists

- The **third sort test** table (Part 9) gains its worked example: the
  `subjects` kind is the doc-shaped collapse applied to three more
  collections' seed paths (`channels` + the two forum organizer rows'
  starter content), without touching their runtime collections.
- **Part 9 migration order step 0** widens: the collapse list is
  `name_banks` · `recipes` · `blueprints`(curated) · `emotes`, and the
  organizer starter content joins via the `subjects` kind.
- The **A10.3 six-model table** stands, with `blueprints` split across
  two rows and the social organizers assigned to reconciled (A11.4
  supersedes A10.3's row contents where they differ).
- New kind roster so far: domain · quantity · name-banks (shipped) +
  documents · settings · subjects · **boot-instances** + the
  `requires:` block (planned).

---

# Addendum 2026-08-21 (3) — two packs en toto: the requirements drill-down

**Captured 2026-08-21.** The ask: drill into one or two tier-1 packs and
enumerate their needs *en toto* — **the comprehensive input for the
requirements phase.** Exemplars chosen to exercise the whole surface:
**hearthworks** (the trade pack) and **eternal-university** (the
locality pack), with the trade⊗locality seam between them. Audited
against the tree at `0d25ab62c`.

Context: the three-tier pack roster (ship-now carve / slate-implied /
imagined-but-supported) was drawn in-session; tier 1 ≈ the 3 shipped
packs + pack zero + substrate packs (conditions, body-plans,
generic-objects) + institutions (compact, corpo) + 8 locality packs +
wiki-starter. The tier-3 audit found exactly two unplanned substrate
gaps: an **overlay kind** (localization annotating rows another pack
owns — breaks one-stamp-per-row) and **scheduled uninstall**
(festivals). This addendum is the tier-1 drill-down.

## A12.1 — Hearthworks: the complete bill

**Inventory (what moves):**

| What | Where today | Count |
|---|---|---|
| domain seeds | `seeds/domain/hearthworks/` | 23 (4 rooms + floor, stock props, 2 NPCs, Business, 2 menus) |
| **TS classes** | `src/mud/domain/hearthworks/` | **3** — `SmithyMenu`, `KitchenMenu`, `SealedCellar` |
| recipes | `config/recipes.yaml` | ~7 (fire-poker, cook-pot, smiths-hammer, belt-knife, leather-jerkin, toasted-ration, root-mash) |
| tests | `seeds/__tests__/business-authority.test.ts` | 1 → becomes a pack test |

**Zero inbound coupling** — no engine code references
`/domain/hearthworks`; the only inbound mentions are comments. The
cleanest pack candidate in the tree.

**The dependency graph it declares:**

- `dependsOn: base-library` — iron, firewood, hide are materials.
- `dependsOn: generic-objects` — ⭐⭐ **every recipe's `outputTemplate`
  is another pack's row** (`/obj/arms/fire-poker`, `/obj/CookPot`,
  `/obj/gear/smiths-hammer`, `/obj/armor/hide-jerkin`,
  `/obj/items/plated-dish`). Cross-pack template references are
  LOAD-BEARING from pack one — the installer needs a reference check
  (does the named path exist in the install set?) alongside
  requires-kernel, and a dangling-pointer policy.
- `dependsOn: corpo` (or the institutions pack) — `banksAt: goodkin`.
- **kernel brains** — NPCs name `/lib/behavior/introduces` /
  `idles`. ⭐ **requires-kernel must extend beyond `class:` /
  `hydratorClass:` to `behaviors[].brain`** (already a wizard-gated
  field — same field set, new check site).

**Kinds it exercises:** domain (reconciled) · recipes (reconciled,
post-collapse a documents kind) · **boot-instances** — and here the
audit hit an unresolved fact: ⚠ **nothing in `bootstrap.ts` names
hearthworks, so how do the Business + cast stand up today?** The
employment engine's boot comment assumes "the bootstrap manifest stood
up the Business + cast," but no manifest entry exists. Requirements
must answer the standup question explicitly — it is exactly the
reference-ideas-inert-at-boot shape (A11.3), and the boot-instances
kind is the answer *if* the current standup path is found and folded in.

**Requires (structure):** ⚠ **hearthworks is UNPARCELLED today** — no
title row, so its extent falls to the `'core'` owner. The pack's
`requires.title: /domain/hearthworks` is not paperwork; it is the first
real exercise of claim → gated subdivide → stamped install.

**Tier: systemic, and mechanically detectable.** `wageRate: 5`/`4` on a
24/7 roster **mints CB money at every shift settlement**. A trade pack
that ships wages ships a faucet. ⭐ The Part 1 tier-claim check gains a
second detector: code-naming fields ⇒ ≥ local; **wage/mint touchpoints
⇒ ≥ systemic** (whoever owns the ledger argues).

**The code problem, small form:** the 3 classes are the whole gap
between hearthworks and a pure-data pack. Disposition question for
requirements, likely answers: the two menus are a *general* concept
(retail already has `PricedOffer` — genericize to a kernel menu-board
class); `SealedCellar` is probably expressible as mixin composition
(Sealable + Room, a Studio blueprint). ⭐ **The test: is each class
content-specific logic, or missing kernel generality wearing a content
name?** If the latter (likely all three), hearthworks becomes the
first fully pure-data trade pack — the third-party format, proven.

**Not exercised (deliberately deferred):** parameters — hearthworks v1
ships its fixed venue, which under Part 4's vocabulary means **the
showroom IS the venue**. Parameterized installs wait for the second
venue of some trade.

## A12.2 — Eternal-university: the complete bill

The hard case on purpose — everything hearthworks dodges, this hits.

**Inventory:**

| What | Where today | Count |
|---|---|---|
| domain seeds | `seeds/domain/eternal/` | 35 (duncan-hall 17 + university-avenue 18, incl. 7 controller seed rows) |
| **TS files** | `src/mud/domain/eternal/` | **21** — 7 domain-local controllers (provision/unprovision/remodel + blow/tally/wind/adjust), `Katie.ts`, the DormWarren machinery (9), the crossing kit (4) |
| misfiled class | `obj/Gus.ts` | 1 — kernel `obj/` class hardcoding `/domain/eternal/university-avenue` paths; ⭐ refile to `domain/eternal/university-avenue/` |
| civics rows | `seeds/obj/Locality/eternal-campus.yaml`, `seeds/obj/Government/eternal-university.yaml` | 2 — the three-deep jurisdiction proof |
| group | `config/groups.yaml` `duncan-hall` | member: **the NPC katie** (agent authority) |
| parcel | `config/parcels.yaml` `/domain/eternal/duncan-hall/dorms` | owner: group `duncan-hall` |
| boot-instance | `bootstrap.ts` | `dorm-warren` |
| tests reaching in | 13 files | ⚠⚠ **four live in KERNEL trees** — `lib/behavior/crossing-ritual`, `obj/crossing-objects.smoke`, `api/command-migration`, `seeds/room-archetypes` — the inverted arrow (Part 5), live |

**Inbound seams:** terminus `arrival-gate`, counting-houses
`avenue-block`, newbie-wilds `crossroads` all link INTO eternal.
Inter-locality exits are the pack-seams rule made concrete: **the
declaring side owns the exit** (the annex knows the host); the
mechanism is `DeferredDestinationExit`, already shipped for exactly
this shape. Requirements should state it as the rule for cross-pack
exits rather than leave it convention.

**Kinds and requires it exercises beyond hearthworks:**

- `requires.groups: duncan-hall` + `requires.title:
  /domain/eternal/duncan-hall/dorms` — the structure half, straight
  from the slate.
- ⭐⭐ **Agent membership as a PROVISION item.** Katie's membership in
  `duncan-hall` is authority, so the pack cannot ship it — but the pack
  *ships Katie*. Resolution: the pack declares the agency
  (`provision: grant /npc/katie membership in duncan-hall`), and the
  installer asks the title-holder to confirm at `pack provision`. The
  GroupSeeder's ensure-member dies; the conferral survives as a
  human-confirmed checklist item. This is `WIZARD_PLAYER_IDS` → "first
  invocation of the fulfillment procedure," second instance.
- **civics as plain content** — Locality + Government rows are
  reconciled domain rows + catalogue warm; no new kind.
- ⚠⚠ **The accumulation rule, load-bearing:** dorm rooms are PLAYER
  HOMES — `(scope, key)` rows in `holder_snapshots`, furnishing estates,
  houseplants. *A pack owns what it shipped, never what accumulated
  around it* is not theory here: any reconcile/uninstall path that can
  touch dorm contents is a data-loss bug. The never-seeded collections a
  locality's content accretes (`holder_snapshots`, chattel, furnishing
  overlays) must be structurally unreachable by the installer — same
  closed-vocabulary argument as `bank_ledger` (A11.5).

**The code problem, large form — the ladder.** Seven controllers +
Katie + the warren machinery are not genericizable; they ARE the
content. So the boundary from content-packs.md ("a pack assumes
classes, a mod brings them") needs a declared ladder, and requirements
should pick it:

| Rung | Ships | Trust | Who |
|---|---|---|---|
| **data pack** | YAML only | requires-kernel + tier check | anyone (the third-party format) |
| **capability pack** | YAML + TS under its own `domain/<sphere>/` | code review = wizard code-trust; first-party only until the sandbox/signing story | us |
| **mod** | kernel changes | an MR | us |

Eternal-university is a **capability pack**: its TS travels with it
(the `domain/` tree already namespaces it), and the `class:` values
resolving under its own namespace is checkable at install. ⭐ The
alternative — grow the scripting subsystem until controllers are
expressible as data — is real but far; the ladder makes it a migration
*within* the model (capability → data), not a blocker.

**Test migration:** the 9 colocated `domain/eternal/**` tests travel
with the pack (they are pack tests misfiled only by repo). The **four
kernel-tree tests** are the real work: each needs a synthetic fixture
(`/test/…`, ugly on purpose — Part 5) replacing its reach into eternal
content. That is the concrete, measurable start of `lint:test-content`.

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

**Captured 2026-08-21, continuing the drill-down.** The user's re-cut of
Part 2's vertical trade pack:

> **User: "I'm not sure if I wanna mix venues and industries in the same
> pack. an industry is largely mechanics, not content… the actual
> specific content whether it's a mine or restaurant or farm or
> whatever, that should get delivered on its own."**

⭐ **Hearthworks itself is the proof**: it is TWO industries in one venue
(smith + cook, one roster). Venues compose industries freely — a tavern
is cooking + brewing + hospitality — so venue-as-the-pack was always
going to cross industry lines. Part 4's *trade owns the KIT, locality
owns the PREMISES* had the right instinct; this promotes it to the
packaging boundary itself.

## A13.1 — What an INDUSTRY pack ships (the trade's grammar)

- **tool + station templates** — anvil, forge, whetstone as clonables
- **recipes** — industry, never venue
- **materials it introduces to the chain** (A13.3)
- **position definitions** — what "a smith" is, which mixins it
  confers. ⚠ The **wage rate stays VENUE** — each business sets its
  own, which moves the money-faucet tier consequence (A12.1) to the
  venue side
- **venue archetypes** — "a smithy needs: forge, anvil, fuel store."
  Precedent exists: room archetypes (`seeds/obj/room/kitchen.yaml`) +
  furnishing's FurnishableRoom archetypes. The industry ships the
  archetype; a venue fills it with a place.

## A13.2 — What a VENUE pack ships

Rooms, the NPCs, the Business instance (roster, **wages**, `banksAt`),
menu *contents* (the menu class genericizes to kernel per A12.1), its
place in the world. Small, **local-tier**, arguable by a locality
committee. A venue may ship inside a locality pack (the common case) or
standalone (a flagship/showroom) — maintainer's choice; the line that
matters is industry/venue, not venue/locality.

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

## A13.4 — The observability test, amended

Part 2's test — *a pack that installs and changes nothing observable is
the wrong cut* — now applies to the **industry + one venue PAIR**,
never to either alone. An industry pack fails it by design. The
showroom stops being *in* the trade pack and becomes the **reference
venue pack shipped beside it**.

## A13.5 — ⭐⭐ Testability: derive the test venue from the archetype

The worry — an industry pack in isolation starves for test content —
resolves without authoring fixtures:

> **Materialize a synthetic venue FROM the archetype declaration** —
> the minimum rooms + stations it names — and run the industry through
> it.

Ugly-fixture-on-purpose without authoring the fixture, and it doubles
as a **completeness check on the archetype itself**: if the derived
venue cannot run the industry end-to-end, the declaration is missing
something a real venue author would also starve for. The test harness
is the first consumer of the same declaration real venues use —
derive-don't-author-twice.

## A13.6 — Effect on the standing lists

- **Part 2's vocabulary amends**: trade = industry (grammar) + venues
  (content); *"install it and a bakery exists"* holds for the pair.
- **Part 6's roster** re-reads as industry packs; each picks a
  reference venue.
- **A12.1's hearthworks bill re-cuts**: smithing industry +
  hearth-cooking industry + hearthworks-the-venue (which composes
  both). Recipes/stations/positions → the industries; Business, NPCs,
  wages, rooms → the venue. The systemic-tier detector (wage/mint)
  attaches to venues; industries are argued on what their recipes mint.
- **Open question 1 (trade = one pack or per-business?) closes**:
  industry = pack, venue = pack, business = rows in a venue pack.
- **Open question 2's parameter answer refines**: the archetype is the
  parameter schema's home — a venue *is* answers to an archetype.

---

# Addendum 2026-08-21 (5) — the archetype, settled in three questions

**Captured 2026-08-21.** The venue archetype (A13) interrogated one
question at a time. **Status: adopted provisionally** —

> **User: "I'm not entirely convinced we need this document at all, but
> let's see where it takes us. if it's something that doesn't earn its
> keep we can always cut it later."**

The cut is cheap by construction: nothing at runtime reads it (Q2/Q3),
so retiring it orphans no mechanism.

## A14.1 — Prescriptiveness: a derived floor + defaults as content

> **User: "most people just want the defaults because it's
> interoperability and immersion for free, but the best content usually
> finds a way to break the rules."**

Two artifacts, two jobs — the trap is making one serve both:

- ⭐⭐ **The floor is stated in CAPABILITIES, not furniture** — not "a
  forge" but "heat ≥ 1400K, a work surface, fuel storage" — because
  that is what the mechanics already check (`requiresHeatK` is in
  recipes.yaml today). Rule-breaking becomes legal by construction:
  the volcano-vent smithy satisfies the contract without an exemption.
- ⭐ **Most of the floor is DERIVED** from the industry's own recipes +
  positions (can't drift; the completeness check is nearly free);
  hand-authored residue covers only what mechanics can't express.
- **Defaults are CONTENT, never schema** — the copyable reference
  venue / a Studio blueprint. Defaults-as-content constrain nobody.
- The stitch: each capability slot carries a **default binding**
  (`needs: heat ≥ 1400K, default: forge`) — checker checks the
  capability; scaffold + derived test venue materialize the default.

## A14.2 — No runtime enforcement

The world never gates on archetype satisfaction — a smith with no forge
is a legal, VISIBLE state (never-half-grown), and the derive-on-read
checklist supplies all the observability enforcement would have bought.
Install/provision/test-time aid only.

## A14.3 — Home: a document; logic stays kernel

- The authored residue is a **declared document kind (`archetype`)** by
  Part 9's own sort test (one owner, no cross-system queries,
  path-keyed suffices). Not a `domain` row (never instanced; and
  reference-data-as-template is the inert-at-boot trap — a document
  read on demand has no warm step to forget). Not collection #51.
- The **effective archetype derives on read** (recipes + positions +
  residue), never stored; consumed at three cold paths (install /
  provision / test bootstrap).
- ⭐⭐⭐ **The expressiveness answer** (user: *"are you going to be able
  to express everything you need as data? I was expecting typescript
  classes with logic"*): the archetype carries ZERO logic; an
  industry's behavior lives in kernel ENGINES reading data (crafting,
  employment, fire) — no generic `Industry` class; "industry" is a
  cross-section, not an object. Roster walk: most slated industries
  are pure data over shipped substrates; the exceptions are **kernel
  gaps, not pack code** — mining/quarrying (deposit depletion),
  fishing/foraging (unowned population regrowth), brewing
  (fermentation-over-time). ⭐ **When data can't express it, the move
  is a kernel mechanism build — which is what the slates already are**
  (husbandry got built; the farm is data). A mechanism only one pack
  can use is a mechanism the next industry re-derives.
- ⭐ **The litmus is mining** — the first industry whose core loop has
  no substrate. If building it makes us want logic in the pack rather
  than a Reserve-shaped depletion mechanism in the kernel, the model
  is wrong.

## A14.4 — Restated in-session (context, not new design)

The document-tree program this rides: the user's standing intent to
**move some collections into a parcel's document tree** and let
**parcels carve the tree and dole out access along their own
boundaries** — already documented as Part 9's documents-wearing-a-
collection list (`name_banks` · `recipes` · `blueprints` · `emotes`)
plus the declared-kinds/free-form tiers; the access half is designed,
not built (`DocumentLogic` never repointed onto `ParcelApi`, the known
Part 4b gap). The archetype is one more tenant, not a special case;
install-time reads do not depend on the access work landing first.

**Still open: the industry namespace** — industries aren't places, so
what root does an industry pack's extent claim (`/industry/<x>`? squat
under `/obj/<x>`?). "Where do mining's documents live" and "what extent
does the mining pack claim title to" are the same question.

---

# Addendum 2026-08-21 (6) — the `/trade/` root

**Decided 2026-08-21.** Industries get their own top-level content
root; the four-namespaces doctrine gains its slot:

> ⭐⭐ **Industry content has no place; venue content is nothing but
> place.** `/trade/<industry>/**` is the industry pack's whole world —
> stations, archetype documents, migrated recipes — and its title claim
> is exactly its root (`requires.title: /trade/mining`), so
> `sourcePack` ↔ extent align one-to-one. Venues stay place-side under
> `/domain/…` (or a locality's extent). The same shape as
> publications-have-no-place.

**Internal layout follows the usual conventions, fractally** (user:
*"we'll still want our templates to follow usual conventions"*):

```
/trade/mining/obj/pickaxe        # instanceables under obj/ — the
/trade/mining/obj/vein-face      #   lib-vs-obj rule, recursed
/trade/mining/cmd/<verb>.yaml    # trade verbs, the domain-local
/trade/mining/command/<Name>Controller  #   precedent reused
/trade/mining/archetypes/mine    # the archetype documents (document
                                 #   tree, mirrored path)
```

- `/obj/` stays **the commons** — kernel generics + the generic-objects
  pack; "is this path core or somebody's?" stays answerable on sight.
- `/trade/` naming: the TREE word is player/author-facing
  (`/trade/smithing/obj/forge` reads); **industry/venue stays the
  packaging vocabulary**. Part 9's `requires:` example already sketched
  `/trade/baking`.
- Cost, one-time and deliberately kernel-shaped: a **sixth top-level
  branch file** (`Stuff._registerTopLevelBranch` — the sanctioned
  module-scope exception list grows by one). Minting a root SHOULD be a
  kernel-level act; this happens approximately once.
- `lint:instanceable` extends unchanged: no `/trade/**` template may
  name a `/lib/` class, and the `obj/` segment carries the
  instanceable convention inside the subtree.

Rejected: squatting under `/obj/<industry>/` (makes the commons a
landlord's district) and the split (a pack straddling two namespaces,
its title not covering its own stations).

---

# Addendum 2026-08-21 (7) — the standup mystery, SOLVED: the world is lazy

**Resolved 2026-08-21.** A12's open fact — *nothing in `bootstrap.ts`
names hearthworks, so how do the Business + cast stand up?* — traced to
its answer, and the answer revises the boot-instances kind's scope.

## A15.1 — The lazy-fault-in trio (all shipped, all deliberate)

1. **Rooms fault in on first traversal** —
   `Exit.resolveDestination()` → `StuffApi.singleton(destinationPath)`
   clones the destination room on demand (`lib/boundary/Exit.ts`).
2. **Contents + NPCs ride the room's `populates:`** — the smithy's
   seed lists the forge, ingots, menu, and the smith NPC; the clone
   cascade stands them up with the room.
3. **The Business stands up on first demand** —
   `EmploymentLogic.operatorOf` builds a reverse index
   `operatingLocation → business template path` from **every Business
   row in `domain`** (`Template.findDescendants('/')`), then
   `singletonOrClone`s the operator and runs an immediate roster tick
   so the cold venue's first customer finds a conferred maker. The
   code's own comment: *"No manifest entry, no clerk/venue standup
   hook."*

What looked like the zero-call-sites bug is not one — **the reverse
index IS the call site.** The `business-authority` test walks seed
files (shape only), which is why liveness never appears in tests; but
the liveness path exists and is the design.

## A15.2 — What this changes

- ⭐⭐ **A venue pack needs NO boot-instances declarations.** Install
  rows; the world faults it in on demand. Pack-installed Business rows
  are discovered automatically (the operator index scans all `domain`
  rows). The **boot-instances kind narrows to the genuinely eager**:
  registries, boards, warrens with sweeps — things that must exist
  *before* demand. Shopping-list item 4 resolves to "narrow the kind,"
  not "find the mechanism."
- ⭐ **An unvisited venue mints nothing** — wage settlement only runs
  for stood-up businesses, so ghost venues cause no wage inflation.
  Lazy standup is economically load-bearing, not just a perf nicety
  (and it is residency's symmetric partner: fault in on demand, evict
  the cold tail).
- ⚠ **Hearthworks is UNREACHABLE today** — no exit, no TPA node, no
  locality names it (only comments do). It stands up only via
  author `goto`. Not a bug in the lazy trio — a missing inbound seam,
  which under industry≠venue is precisely **the venue pack's job**: a
  venue ships its own reachability (an exit declared venue-side into a
  host place — annex knows host) or it is a showroom by definition.
  Hearthworks-the-venue is currently a showroom that thinks it is a
  venue.

---

# Addendum 2026-08-21 (8) — the hearthworks re-cut, file-per-artifact, and the energy sketch

**Captured 2026-08-21.** The industry≠venue cut applied to real content,
plus three decisions it forced.

## A16.1 — Hearthworks becomes three packs

| Pack | Ships |
|---|---|
| **`/trade/smithing/`** | recipes fire-poker · smiths-hammer · belt-knife · cook-pot · leather-jerkin; station templates anvil · whetstone (→ `/trade/smithing/obj/…`); stock iron-ingot · spare-ingot; the *smith* position def; archetype *smithy = heat ≥ forge-temp · striking surface · work surface · fuel store* |
| **`/trade/hearth-cooking/`** | recipes toasted-ration · root-mash; stock prime-cut · stew-meat · ration-stock · root-vegetables *(interim — see A16.3)*; the *cook* position def; archetype *kitchen = heat · pot · pantry* |
| **`/domain/hearthworks/`** (venue) | rooms (smithy · cookhouse · cellar · woodshed · forge-floor); the Business (roster, **wage rates**, `banksAt: goodkin`); the two NPCs (the CAST — the position is industry, *this* smith is venue); menu **contents**; `populates:` compositions; `requires.title`; ⚠ **the inbound exit it has never had** |

**What the cut revealed:**

1. ⭐⭐ **The fire stations were never smithing's.** Forge/Oven/Kiln/
   CookPot are fire-substrate COMMONS (`/obj/`) — smelting is the phase
   engine, not a recipe. The capability floor makes it natural: the
   archetype *requires heat*, `default: /obj/Forge`. Corollary:
   smithing's cook-pot recipe outputs `/obj/CookPot` — a commons
   template — so smithing-makes-cooking's-tools creates **no pack
   edge**. ⭐ Recipes that output commons goods are chain-neutral.
2. **Menu genericization is mostly done** — SmithyMenu/KitchenMenu are
   already thin CommerceMenu subclasses; the residue (verb-surface
   lighting?) is the actual work, and it is small.
3. ⚠ **The migration is a PATH RENAME** (`/domain/hearthworks/anvil` →
   `/trade/smithing/obj/anvil`), and now is the cheapest it will ever
   be — hearthworks is goto-only, blast radius ≈ one populates list +
   recipe station refs. ⚠⚠ The re-cut must **DELETE the orphaned
   unstamped `/domain/hearthworks/*` rows** the new packs don't adopt
   (the seeder-is-insert-only trap's farewell appearance).
4. Open: does the venue keep the proper name "Hearthworks" while the
   industries take generic names? (Lean yes — proper noun for the
   place.)

## A16.2 — ⭐⭐ File-per-artifact, across the board

> **User: "not only do we want to normalize all our paths but we also
> want to break up some of our documents e.g. recipes.yaml so each
> recipe has its own version history. that breakup needs to happen
> across the board."**

The pack-format law: **one file = one reviewable artifact = one version
history.** The domain seeds already live this way; the `config/*.yaml`
aggregates (recipes, emotes, channels, wiki-pages, blueprints) were the
anomaly — and they all die in the seeder migration anyway, so the
breakup is free if the migration does it right:
`/trade/smithing/recipes/belt-knife.yaml`, blameable, arguable in an MR
on its own. The reconcile unit and the review unit become the same
thing — which is the whole point of packs.

## A16.3 — Introduces-vs-commons (replaces interim custody)

> **An industry ships only what it INTRODUCES; goods that pre-exist any
> industry are COMMONS.**

Firewood burns in campfires with no fuel trade in sight; hides exist
wherever butchery happens — commons (generic-objects / a core-goods
flavor; the user's instinct: *"those feel like something that will come
in via like a core-materials pack"*). Industry-shipped is only the
genuinely introduced: charcoal is the energy trade's, coal is mining's.
A16.1's hearth-cooking stock rows are interim under this rule too. The
consumer-custody rule from the re-cut conversation is dead — nothing
used it yet.

## A16.4 — The energy industry, sketched (the service-industry stress test)

> **User: "I can imagine the smithy hires someone to go out and get
> coal/wood/whatever for them, or they go to a shop stocked by that
> person. still I'd keep things like energy sources shared content."**

That sentence contains the design: the trade is **two market forms**,
both riding shipped substrates —

| It ships | Rides |
|---|---|
| recipe: charcoal-burning (wood → charcoal at a clamp) | crafting + fire |
| material: charcoal (introduced; coal stays mining's, wood base-library) | materials |
| stations: charcoal clamp; a thin *fuel yard = storage + scale* archetype | commons Kiln mostly |
| positions: collier / fuel merchant | employment |
| ⭐⭐⭐ **standing contract FORMS** — "keep this fuel store above N," recurring delivery | **contracts** |
| a fuel-yard stock pattern | retail |

⭐⭐⭐ **The discovery: blank contract forms are a new artifact type.**
The `contracts` collection stays never-seeded (executed contracts are
player record), but the FORM — the standard provisioning clause set —
is authored content, same relationship as recipe-to-crafted-item.
Shipped as documents. It will recur: **freight, insurance, and credit
are all form-shaped trades.**

Why it matters even unbuilt: energy is the first
**service-and-logistics** industry — archetype nearly empty, recipes
one line, weight in market forms — proving industries are not all
crafting-shaped. The demand loop is already mechanized (FireApi
consumes Combustible: depletion → contract trigger / shop restock →
collier labors → wage), a closed loop with a shipped sink at one end
(Part 3 doctrine). Chain: forestry → fuel → every burner, mining
feeding coal from the side; v2 seam = the electricity substrate + the
grid slate (generation and wires), combustion-and-delivery the honest
v1. **Mint it when fuel depletion outpaces trivial gathering** — a
tunable fact, not a guess; design now (the form-shaped exemplar), ship
after smithing/cooking prove the format.

---

# Addendum 2026-08-21 (9) — the install record's shape, and the collision surface

**Captured 2026-08-21.** The concrete schema under the three-way
machine (A10.4), and the ops resolution controls — the user's one
stated requirement: *"my main concern is collisions and giving ops the
controls they need to resolve them."*

## A17.1 — The install record (collection: `pack_installs`)

One record per pack per deployment:

```yaml
packId: trade-smithing
version: 0.1.0            # pack.yaml version at last successful apply
appliedAt: …              # wall time
principal: bootstrap      # or the staging player
status: applied           # applied | staged | failed
failure: null             # {step, error, file} — a failed pack boots
                          #   WITHOUT the pack, loudly (A10.10)
parameters: {…}           # diagnostic COPY of render-time values;
                          #   authority stays in decision files (A10.11)
rows:                     # ⭐ the three-way baseline
  /trade/smithing/obj/anvil: {kind: domain, hash: "sha256:…"}
pins: []                  # operator-owned rows (A17.3)
sideEffects: {kinds: […]} # non-row work applied — for uninstall
```

Decisions baked in:

1. **One record per pack, not row-per-artifact** — reconcile is a
   per-pack batch; nothing queries baselines across packs.
2. **Hash the RENDERED artifact** (post-parameter canonical
   serialization — the Helm rule): `baseline == current` means
   untouched-since-install regardless of how the file got there.
3. **Its own small collection** — system state written only by the
   installer; A11.5's allowlist property demands the installer's ledger
   live where no contribution kind can reach (the `parcels`-not-in-
   `domain` reasoning).
4. **V1 = the record + the three-way machine only.** With all packs
   first-party and boot-installed, "staging" is a git commit + deploy;
   staging/parameters/provision layer on later without schema changes.
   The record pays immediately: it is what tells "we changed gin's
   density" from "an operator tuned it."
5. ⚠ **The adoption baseline**: first apply against a pre-record DB
   normalizes pre-existing divergence once (the migration bridge) —
   acceptable, but it gets a loud log line.

## A17.2 — The collision taxonomy: mostly deleted by structure

| Collision | Fate |
|---|---|
| two packs, one path | ⭐ **structurally prevented** — install requires title to the extent; two packs cannot hold one title. The parcel registry is the arbiter (the different-pack-stamp refusal stays as the belt to the title's suspenders) |
| installer vs player record | **structurally prevented** — the accumulation firewall: no kind reaches `holder_snapshots` / ledgers / entries |
| flat-KEY kinds (emote verbs, subject names, recipe ids) | **install-time refusal, loudly, before any write** — keys aren't carved the way paths are (the verb namespace is the one namespace nobody can carve), so uniqueness is checked across the install set like requires-kernel checks classes. Never first-wins, never silent |
| pack-changed AND DB-diverged | **the one genuine runtime conflict** — ops controls below |

## A17.3 — The ops resolution surface

File-per-artifact (A16.2) makes the resolution granularity exactly
right — per recipe, per room, per page:

```
pack install --dry-run <id>   # what WOULD change; nothing writes
pack status [<id>]            # applied/staged/failed · unfulfilled requires · open conflicts
pack diff <id> [<path>]       # THREE bodies: baseline / yours (DB) / theirs (pack)
pack resolve <id> <path> --take-pack   # pack wins; baseline updated
pack resolve <id> <path> --keep --pin  # DB wins AND the row becomes operator-owned
pack resolve <id> <path> --export      # DB version → candidate FILE → MR → upstream
pack pin / unpin <path>
```

1. ⭐⭐ **`--keep` without `--pin` does not exist** — keeping without
   claiming re-fires the same conflict on every future update. Keeping
   means claiming: the row pins (a per-row downgrade to seed-missing,
   the operator choosing the gentler policy — the right party),
   recorded in `pins:`, and **every future reconcile reports pinned
   rows** so pins cannot rot silently.
2. ⭐⭐ **`--export` keeps the system honest** — the A10.2 round-trip as
   a one-word verb: the divergence goes back through git and resolves
   upstream in an MR. Its existence is what stops ops pinning forever
   out of friction.
3. **Conflicts are pull, not interrupt** — diagnostics addressed to
   the ops office + `pack status` lines; install/sync never blocks (the
   unresolved artifact keeps its DB state). An open conflict is a
   legal, visible state (never-half-grown).
4. `pack diff` presents the wiki's three-body shape — same doctrine
   (*a machine-merged paragraph is nobody's writing*), same muscle
   memory, and literally the same machinery for wiki-kind
   contributions.

---

# Addendum 2026-08-21 (10) — the export census, and verbs move to the document tree

**Captured 2026-08-21.** The question: *what are ALL the mechanisms by
which a pack's exports reach the runtime?* (Roster context: ~20 tier-1
packs — 3 shipped + pack zero + 4 substrate + 2 institutions +
wiki-starter + the 8 locality trees, hearthworks re-cutting to 3.)

## A18.1 — The mechanism census (as audited)

| # | Mechanism | Carries |
|---|---|---|
| 1 | **installer → Mongo rows** | domain · documents (+ collapsed kinds) · subjects (writes 3 collections) · settings (merge-missing) · wiki (CAS submit) · descriptor banks |
| 2 | **installer → RAM, no Mongo** | quantity tag tables — `loadTagTables` reads the pack file each boot. ⭐ Cache degree zero: the purest "DB is a cache" |
| 3 | **package management → module registry** | TS (classes/controllers/brains) — capability packs; data packs only *reference* code (requires-kernel) |
| 4 | **boot-time disk scan of the package** | command YAML **views** — `preloadAll` scans `cmd/` + `domain/**/cmd/` from the source tree, never Mongo |
| 5 | **gated procedures** | `requires:` structure — never raw rows; humans grant authority |
| 6 | **triggered rebuilds** | nothing shipped — install fires the derived-cache rebuilds |

⚠⚠ **The census surfaced ONE unanswered export type: binary assets.**
`media_assets` rows exist (single gated writer) and
`Visible.illustration` → `mediaUrl()`, but a pack shipping pre-made
room art ships bytes that aren't YAML, and no mechanism carries them.
Needs either a **media kind** (pack files → `media_assets` rows +
addressable bytes) or an explicit *packs-don't-ship-art,
the-pipeline-generates-it* decision. Either is fine; it must be a
decision, not a surprise. **Open.**

## A18.2 — ⭐⭐ Decided: command views move to the document tree

> **User: "we should probably move command definitions to the document
> tree out of source."**

Collapses mechanism 4 into 1. What it buys:

1. **Verbs become installable content** — reconciled, baselined,
   `pack diff`-able like every other kind (`command-view` document
   kind).
2. ⭐⭐ **The title system covers verbs FOR FREE** — views live at the
   fractal paths (`/cmd/perception/look` pack zero ·
   `/domain/…/cmd/blow` locality · `/trade/smithing/cmd/forge`
   industry), so the parcel trie already governs who may edit them.
   Nobody designs verb-edit permissions; longest-prefix supplies them.
3. **In-game verb authoring** — the CMS edits views with the existing
   save/go-live split; a wizard iterates a verb without a deploy.

The two must-not-breaks:

1. ⚠⚠ **`controller:` (and `validators:`) are CODE-NAMING fields** —
   whoever writes the document points the verb at a module. They join
   the `class:`/`hydratorClass:`/`brain:` wizard code-trust set; the
   document kind's declared schema carries the same gate (the
   same-gate spine precedent). Miss this and "locality title governs
   its verbs" becomes "locality title governs arbitrary dispatch."
2. ⚠ **Cache invalidation needs a real hook** — a document save /
   `pack sync` re-keys the command cache for the changed view, else
   the CMS edit "succeeds" and does nothing (the dead-wire failure).

Also: the zero-packs acceptance criterion sharpens to **zero packs
besides pack zero** (with views as content, a truly pack-less boot has
no `look` — pack zero is the platform, not optional). Migration is
strangler-shaped: store-first read with disk-scan fallback that dies at
zero; **controller TEMPLATES (the 216 seed rows) stay `domain`** —
instanceable, only the view half moves.

Post-decision census: a pack's exports are **installer-carried data
(Mongo or RAM) · package-carried code · procedure-mediated structure**
— three mechanisms, media the one open box.
