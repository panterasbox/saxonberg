# Content-pack units index — the shippable units and their apply strategies

**Started 2026-08-21**, out of the pack-installer design session
([content-packs-slate](./content-packs-slate.md), addenda A10–A18).
This is the WORKING INDEX for the pack-by-pack drill-down: every
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
| **template** | `obj/**.yaml` (fractal under any root) | `domain` | 3-way reconcile-replace; lazy go-live (the fault-in trio) or `restoreFromTemplate` on sync; delete row on vanish; requires-kernel on `class:`/`hydratorClass:`/`brain:`; code-naming fields wizard-gated | ✅ +🔨 3-way |
| **material** | `obj/material/**` | `domain` | template strategy + introduces-vs-commons placement rule (A16.3) + closed-vocabulary lint | ✅ |
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

Counts are from the 2026-08-21 audits; ⚠ marks packs not yet drilled.

| Pack | Units it ships |
|---|---|
| **pack zero** (platform) | templates: ~216 controller templates · 32 marshallers · 11 LocomotionModes · 7 modalities · Avatar · void/home · 37 Topics + 41 Disciplines (amendment-tier) — command-views: ~200 — subjects: Help/Global/Chat — settings defaults — boot-instances: ~37 registries/catalogues — requires: 4 tag groups + core parcels — NO code (its code IS the kernel: pure data pack) |
| **base-library** ✅ | materials · biomes (templates) · quantity tables |
| **species-and-names** ✅ | species/clade templates · name-banks |
| **arcane-descriptors** ✅ | descriptor-banks |
| **conditions-and-afflictions** ⚠ | ~15 Condition templates; drill: boot-instance vs lazy, harm-vertical deps |
| **body-plans** ⚠ | BodyPlan templates; drill: species-pack seam |
| **generic-objects** ⚠ | ~70 goods/props templates + room archetypes + orphan recipes; the SHRINKING commons |
| **expression** ⚠ | starter emotes (flat-key exemplar); post-collapse documents |
| **arcane-library** ⚠ | starter spellbook · generic magic items; the shrink guard (A18.11) |
| **compact** ⚠ | /compact templates · PressBoard boot-instance · realm/city Locality+Government rows · state subjects; drill: swappability |
| **corpo** ⚠ | 5 corpo templates + boot-instances · brand data; drill: banking seam (goodkin) |
| **wiki-starter** ⚠ | 4 wiki pages (CAS exemplar) |
| **smithing** 🔨 | 5 recipes · anvil/whetstone/ingot templates · smith position def ⚠ · smithy archetype |
| **hearth-cooking** 🔨 | 2 recipes · food stock (interim) · cook position def ⚠ · kitchen archetype |
| **hearthworks (venue)** 🔨 | 4 room templates + adornment · Business template · 2 NPC templates · menu contents · requires.title · ⚠ the inbound exit |
| **lounge** ⚠ | 27 templates · scripts · Business (Dave's Bar) · terminal boot-instance; drill: first locality conversion |
| **eternal-university** ⚠ | 35 templates · 7 controllers + 14 TS (CAPABILITY pack) · requires: group+title · provision: Katie · dorm-warren boot-instance · civics rows; drill: the capability exemplar |
| **terminus** ⚠ | 52 templates · counting-houses/general-store/Hinkley; drill: retail+banking seams |
| **newbie-wilds** ⚠ | 21 templates; drill: onboarding deps |
| **practicum / moor / substation** ⚠ | 7 / 4 / 4 templates; drill: small-pack format floor |

---

# Part C — The strategy interface (what every unit type must answer)

The per-kind dispatch in the installer IS a strategy; these are its
slots. **A unit type with an unanswered slot is not shippable:**

1. **TARGET** — which collection / RAM table / bucket / procedure?
2. **APPLY** — reconcile-replace · merge-missing · CAS-submit ·
   ensure-structure · load · byte-sync?
3. **KEY + COLLISION CLASS** — path-carved (title arbitrates) ·
   flat-key (install-time uniqueness check) · n/a?
4. **DELETE DIRECTION** — delete · archive-never-reap ·
   pin-respecting · never (the firewall)?
5. **GO-LIVE** — lazy fault-in · re-hydrate · cache-invalidate ·
   reboot-only?
6. **GATES** — requires-kernel · code-naming fields · tier detectors ·
   flat-key checks · none?

---

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
