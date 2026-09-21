# Content-pack units index — the shippable units and their apply strategies

> **Status: PARTIAL** — the installer, the reconcile strategies, the
> closed `DocumentKinds` vocabulary, `requires` groups/title, the boot
> manifest, wiki CAS, the capability rung and the seeder retirement all
> shipped → [content-packs.md](../../subsystems/content-packs.md)
> **Left:** the media-asset unit (byte sync + receipt pairing) · the
> position-def unit (A19) · the contract-form unit · `requires.kinds:` ·
> `requires.office` · the manifest tier claim + its check · manifest
> version + `dependsOn` validation · runtime install/uninstall +
> marketplace · the repo split
> **Size:** a wave

**Started 2026-08-21**, out of the pack-installer design session
([content-packs-slate](../builds/content-packs-slate.md), addenda A10–A18).
(Names reflect the A17 renames: the template collection is `content`,
the place root is `/world/`.) This is the WORKING INDEX for the
pack-by-pack drill-down: every
shippable unit type, the strategy by which it applies to the platform,
and the per-pack table of contents. **A cell marked ⚠ OPEN is a
conversation not yet had** — the drilling agenda, kept honest.

> The frame (user): *"this whole thing is about version control."* A
> unit = ONE FILE = one version history (A16.2). The strategy is how a
> versioned artifact becomes platform state — and every unit type must
> answer the same six questions (Part C).

---

# Part A — The unit-kind registry

Status: ✅ shipped · 🔨 designed this session · ⚠ OPEN (format/mechanics undecided)

## Data units (installer-carried → Mongo)

| Unit | In the pack | Applies to | Apply strategy | Status |
|---|---|---|---|---|
| **template** | `obj/**.yaml` (fractal under any root) | `content` | 3-way reconcile-replace; lazy go-live (the fault-in trio) or `restoreFromTemplate` on sync; delete row on vanish; requires-kernel on `class:`/`hydratorClass:`/`brain:`; code-naming fields wizard-gated | ✅ +🔨 3-way |
| **material** | `obj/material/**` | `content` | template strategy + introduces-vs-commons placement rule (A16.3) + closed-vocabulary lint | ✅ |
| **document** (generic) | `documents/**.yaml` | `documents` | 3-way reconcile; path-keyed; per-kind indexes only when the kind is DECLARED | 🔨 |
| **script** | `scripts/*.script` | `documents` {kind: script} | document strategy; source text verbatim | ✅ (ScriptSeeder → migrate) |
| **recipe** | `recipes/*.yaml` | `documents` {kind: recipe} (post-collapse) | document strategy + FLAT-KEY check (`recipeId`) at install; consumed by crafting engine | 🔨 collapse |
| **emote** | `emotes/*.yaml` | `documents` {kind: emote} (post-collapse) | document strategy + flat-key check (verb — THE uncarvable namespace) | 🔨 collapse |
| **name-bank** | `name-banks/*.yaml` | `name_banks` → documents | reconcile by bank key; cache clear on sync | ✅ → 🔨 collapse |
| **descriptor-bank** | `descriptors/*.yaml` | `descriptor_banks` | reconcile; `lint:descriptors` disjointness | ✅ |
| **blueprint (curated)** | `blueprints/*.yaml` | `documents` (post-collapse) | document strategy; the DERIVED skeleton is a cache, never shipped | 🔨 split |
| **command-view** | `cmd/**.yaml` at fractal paths | `documents` {kind: command-view} | document strategy + code-naming gate on `controller:`/`validators:` + command-cache invalidation hook | 🔨 A18.2 |
| **archetype** | `archetypes/*.yaml` | `documents` {kind: archetype} | document strategy; effective archetype DERIVES on read (recipes+positions+residue); zero runtime readers | 🔨 provisional (A14) |
| **contract form** | `forms/*.yaml` | `documents` {kind: contract-form} | document strategy; executed contracts stay player record | 🔨 sketched (A16.4) |
| **position def** | `positions/*.yaml` (own file — a conferral change deserves its own diff) | `documents` {kind: position} | industry owns IDENTITY + CONFERRAL (capability-granting, never venue-authorable); venue's Business references by path and owns ECONOMICS + PEOPLE (wage, schedule, roster). Venue-local conferral-free positions are FREE (pre-industry labor); graduation = ADOPTION via the def's `claims:` key list, venue may decline. Proto-industries observable: same key across venues = gap-finding data + wage calibration | 🔨 A19 |
| **subject** (organizer bundle) | `subjects/*.yaml` | `forum_subjects` + surfaces (one file → Subject + board/channel à la carte, one `groupRef`) | name + optional `audience:` (a required group — the MAINTAINERS subject is the primary case, explicit never implicit) + surface flags; defaults derive names; flat-key check on EFFECTIVE names; delete = archive-never-reap | 🔨 A19/14 |
| **wiki page** | `wiki/**.md`? | `wiki` | CAS-SUBMIT (the rev token; three-body conflict, human resolves); base-rev in install record | 🔨 |
| **settings defaults** | `settings/*.yaml` | `app_settings` | MERGE-MISSING (seed-missing model; AppSettingsSeeder is the reference impl) | ✅ pattern |
| **media asset** | `assets/**` (bytes) + receipt yaml | `media_assets` rows + bucket | rows: 3-way reconcile; bytes: SEPARATE idempotent sync, content-addressed keys (A18/12); receipt (prompt/model) ships with bytes | 🔨 A12 |

## Non-Mongo units

| Unit | In the pack | Applies to | Apply strategy | Status |
|---|---|---|---|---|
| **quantity table** | `quantity/*.yaml` | RAM (no Mongo — cache degree zero) | `loadTagTables` at boot; `reloadTagTables` diff-apply on sync | ✅ |
| **boot manifest** | `boot:` section / `boot.yaml` — ONE deliberate list per pack, never a per-file flag (friction is the feature) | the boot sequencer | clone at boot pre-traffic; every entry tagged `role: sync-read | producer` + prose reason; installer reports eager counts; pack zero rides the same mechanism (platform-slice replacement is the driver); content defaults to LAZY + reconcile-on-read | 🔨 A19/15 |
| **TS module** | `src/**` (capability packs only) | module registry via npm | package management; wizard code-trust review; classes resolve under the pack's OWN namespace (checkable) | 🔨 ladder (A12.2) |
| **verb view (capability)** | rides command-view above post-A18.2 | — | (mechanism 4 collapsed into documents) | 🔨 |

## Structure & authority units (procedure-mediated — never raw rows)

| Unit | In the pack | Applies to | Apply strategy | Status |
|---|---|---|---|---|
| **requires: group** | `pack.yaml` / `requires.yaml` | `groups` | ensure-EXISTS (empty); membership only via provision/procedure | 🔨 |
| **requires: title** | same | `parcels` | claim → title check on covering parcel → gated subdivide; reconcile bounded by CURRENT title | 🔨 Part 4b |
| **requires: office** | same | (offices are code/content; holders never) | ensure-exists; seats filled by procedure only | 🔨 |
| ~~provision item~~ **staffing at install** | (no schema — demoted) | derived checklist | ⭐ THE PACK FENCE: a pack never declares authority over anything it doesn't ship (NPC-in-own-group = content, checkable; human ids/foreign groups refused). Human seats: derive-from-structure checklist; first-fill at install (ops chief; default = installing principal), self-governance after; diagnostics route maintainers-first, ops-fallback | 🔨 A22 |
| **kind declaration** | `requires.kinds:` | document-store indexes | platform-shaped act: declares a new document kind + indexable fields; creates indexes | ⚠ mechanics |
| **manifest** | `pack.yaml` | discovery/ordering | id · version (npm-load-bearing at repo split) · dependsOn (topo) · tier claim (checked: code-naming ⇒ ≥local; wage/mint ⇒ ≥systemic) | ✅ +🔨 tier |

---

# Part B — Per-pack table of contents (tier 1, ~20 packs)

> *Cut 2026-09-18 (slate compaction) — history: every tier-1 pack listed here shipped or was killed as recorded; the live roster (47 packs) is [content-packs.md](../../subsystems/content-packs.md) § The shipped packs.*

---

# Access across the trees (A28, 2026-08-24)

One parcel trie owns all three trees (shared path namespace);
permissions are TREE-QUALIFIED actions (`write-template` /
`write-document` / `write-source`) — divergence via narrowing policies
with a tree dimension; source ANDs the wizard axis; parcel transfer
never conveys source-write (maintainership does); git = pack-repo
granularity only; the write command is the enforcer.

# Part C — The strategy interface (what every unit type must answer)

> *Cut 2026-09-18 (slate compaction) — shipped as the module-private `KindStrategy<F>` — target, record key, db-key query, rendered row, hash preimage, go-live side effect, `flatKeyOf` — one `computeKindPlan` + one `applyKindPlan` → [content-packs.md](../../subsystems/content-packs.md) § The installer.*

---

# The wave ordering (A30, 2026-08-25)

> *Cut 2026-09-18 (slate compaction) — history: waves 0–4b shipped as ordered, wave 5 in progress → [content-packs.md](../../subsystems/content-packs.md) § History.*

# The drilling agenda (the ⚠ cells, gathered)

1. **subject file schema** — how organizers (board/channel) are
   declared inside the subject file
3. **boot-instance declaration syntax** — flag on the template vs a
   pack-level list
4. **provision item schema** — how declared agency is expressed
5. **kind declaration mechanics** — how a pack declares a new document
   kind + indexes
6. **media receipt format** — the bytes+receipt file pairing
7. Then the ⚠ packs of Part B, one at a time — conditions, body-plans,
   generic-objects, expression, arcane-library, compact, corpo,
   lounge, eternal-university, terminus, newbie-wilds, the small three
