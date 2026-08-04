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
early one — it is the [wiki-as-course-commons](./wiki-slate.md) surface,
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

⚠ **Open:** is `emotes`' `aliases` multikey index actually *used*, or does
`SoulCatalogue` resolve aliases from memory? If memory, emotes collapse
cleanly and there is no outlier. If live, emotes are the worked
counterexample for *"needs its own indexing schema"* — useful either way.

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
