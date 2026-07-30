# Civics (diegetic government) — requirements

The **Government** substrate: governments *inside the fiction* as
plural, authored content — the Idea, the jurisdiction resolve over the
Locality tree, derive-on-read residency, seats-as-positions, and a
thin flagship Terminus instance as the first wired consumer. Seeded by
[docs/staging/diegetic-government.md](../staging/diegetic-government.md)
(the slate-equivalent for this cycle; no `docs/slates/` entry exists).
Load-bearing subsystem docs: [address.md](../subsystems/address.md)
(Locality + longest-prefix walk), [corpo.md](../subsystems/corpo.md)
(the data-Idea/catalogue recipe), [employment.md](../subsystems/employment.md)
(Business/Position), [residence.md](../subsystems/residence.md) (the
dorm first home), [governance.md](../subsystems/governance.md) (the
*real* polity — what this substrate deliberately is **not**).

Governing premise (staging §1, settled): the metagovernment governs the
platform and is singular; diegetic governments are **content** —
mintable per locality, owned via the property bridge, enforceable only
through the six landowner powers. This build models the substrate and
the reads; it builds **no legal machinery** — that absence is
doctrine, not deferral.

## Goals

- A **`Government` data Idea** exists (pure-data leaf, the `Corpo`
  recipe: authored templates read from `template.data`, never cloned
  live), keyed by a durable `key`, carrying identity (`key`,
  `displayName`, `description`), a charter Document path, a treasury
  account reference, department references, and a seat roster —
  every field beyond identity resolving to an *existing* substrate
  (documents, banking, employment) by durable key, never by live ref.
- A **`GovernmentCatalogue` / `GovernmentLogic` / `GovernmentApi`**
  three-part split (the corpo/advancement precedent) serves the
  substrate's reads.
- **Jurisdiction is declared on the Locality**: a sparse per-Locality
  government-key field (the first realized "tier-level field" the
  address build reserved the Locality for). The jurisdiction chain over
  any scope or address is derived by the existing longest-prefix
  machinery: resolve the address, walk the covering-Locality prefix
  chain, collect declared government keys, most-local first.
  `GovernmentApi.governmentAt(...)` / a chain-returning sibling expose
  this; `null`/empty chain (off-grid, or no Locality declares a
  government) is a normal result, never a throw.
- **Residency derives on read; nothing confers it, no rows are
  stamped.** Two distinct reads:
  - `residentOf(character)` — the jurisdiction chain over the
    character's **domicile** (their home's address). Grants membership
    standing (the future franchise/petition/services hook).
  - `subjectTo(scope)` — the jurisdiction chain over **where the scope
    is now**. A visitor is subject to local law without being a
    resident. ("Citizen" is reserved for realm-tier fiction flavor —
    see the jargon standard in the staging doc.)
- A **domicile read seam** exists on the residence side: a gated read
  resolving a character's home location (v1: the player's dorm room;
  NPCs: their authored home if any). The **domicile-persists-until-
  replaced** rule is captured in the contract: losing a dwelling does
  not null the domicile — the last home stands until a new one is
  established.
- **Seats are employment positions.** A government's seat roster maps
  seat keys to (department, position) references;
  `GovernmentApi.holdsSeat(character, governmentKey, seatKey)` is the
  authority predicate (the data-driven analogue of `requiresGovernor`).
  No new seat machinery; no reuse of the code-authored Office
  apparatus.
- The **`government` verb** (one dispatch verb, universal + public,
  the `offices` precedent): bare/`list` shows the government chain over
  where you stand plus each government's roster (seats, departments,
  charter pointer); a `residency` subcommand shows your
  domicile-derived chain. Read-only in v1.
- The **first real Saxonberg address roster** is authored: a
  `terminus` root Locality and a `terminus/campus` (name flexible)
  Locality covering the existing campus/Warren content, wired so that
  dorm rooms resolve to a real address (via zone-level address or
  declared `_address`, whichever the content shape wants). The
  demonstrative `narnia/*` roster stays for tests.
- The **flagship instance**: a Terminus `Government` (the young
  retrofit administration, per the staging fiction), declared on the
  `terminus` Locality; **one department** — the Registry — as a
  Business on an authored venue room with one clerk NPC employed on
  its roster; **one seat** (the Magistrate) defined over a Registry
  position, with `holdsSeat` provable. The office-build precedent:
  substrate + exactly one wired consumer.
- A **`civics.md` subsystem doc** and the one-line CLAUDE.md map entry.
- **The committee is realized as a code concept** (the meta-layer
  half of this build's jargon). A committee is **the group holding
  parcel title over a subdivision** — derived on read from
  `ParcelApi.ownerOf`, never stored as a new kind: "all committees
  are groups" and "not all groups are committees" are both structural
  consequences. Deliverables:
  - A **`CommitteeApi`** facade (thin, derive-on-read over
    ParcelApi + GroupApi + ChatApi): `committeeOf(path)` (the
    title-holding group, `null` for player-held subdivisions),
    `isCommitteeMember(player, path)`, and the chat seam —
    `channelOf(path)` / an ensure-channel path so **committees get
    their own chat channels** (a Channel whose Subject binds the
    committee group's `GroupRef`; the group-DM→channel promotion
    path is the precedent).
  - A small public **`committee` verb** (read-only): the committee
    over where you stand (or a given path) — group, members, channel.
  - **The Terminus committee exists**: a seeded well-known managed
    Group (founder-membered, the AccessRegistry well-known-group
    precedent) holding title over the terminus subdivision, with the
    transfer recorded in chain-of-title, and its committee channel
    reachable.
- **The jargon is installed in code, not just docs**: the exported
  `COOPERATIVE_WIDE` scope sentinel becomes `COMPACT_WIDE` (the
  stored `'*'` value unchanged — no data migration) across
  renown/participation/producer standings and all importers; the
  `standing` verb's player-facing prose ("The cooperative regards
  you…") becomes "The Compact regards you…"; touched-file comments
  referencing "the cooperative build" follow.

## Non-goals

- **Any legal machinery** — statute engine, trials, arrest mechanics,
  sentencing. Permanently out of the substrate by the six-powers
  doctrine; enforcement is content built *on* existing substrates.
- **The shelter** — deferred to the Terminus city content build
  (domicile persistence makes it non-load-bearing for residency).
- **Gaol, Watch, constable behaviors** — enforcement-power content;
  lands with city content (the "fuller civic slice" explicitly not
  chosen for v1).
- **Marriage / the city registry's record kinds** — first follow-on
  consumer of the substrate + Documents; not this build.
- **Elections, appointment workflows, terms** for seats — seats are
  filled by authoring/roster mutation in v1, as offices were
  founder-default before their filling workflow.
- **Taxes, resident-only services, franchise consumption** — the
  residency reads are the hook; nothing consumes them beyond the
  verb in v1.
- **Multi-residence primary-home designation** — moot while the dorm
  is the sole home; lands with the apartment/real-estate progression
  ([residential-realestate-progression] memory / residence.md tail).
- **Terminus the city** — districts, venues, neighborhoods stay in
  staging; this build touches only the address roster + one Registry
  room.
- **Guild extraction / any `Institution` superclass** — guilds share
  parts (Business, banking, Documents, positions) when they build;
  commonality is extracted only if real duplication appears then.
- **Real-judiciary interaction** (outlawry case types, escalation
  workflows) — the courts build's concern.
- **Committee governance machinery** — voting, charters, formal
  procedures for committees. A committee's membership is managed
  through the existing `group` verb suite (it IS a managed Group);
  its authority is exactly parcel title (the access substrate,
  unchanged). This build adds only the derived identity, the reads,
  the verb, and the chat seam.
- **Renaming stored data** — the `'*'` scope sentinel value, slate
  filenames, and historical chain-of-title rows keep their bytes;
  only code identifiers, comments, and player-facing prose move.

## Surface decisions

### Two strata; the projection premise is rejected

Diegetic governments are **not** the metagovernment's diegetic face —
they are plural authored content (a new city may mint its own
government or join an existing one). The word **"polity" stays
reserved for the real metagovernment** across all docs; the diegetic
Idea is named **`Government`**, the subsystem is **civics**
(`lib/civics/`, `civics.md`). Chosen over `Polity` (invites exactly
the layer conflation this design exists to prevent) and `Regime`
(pejorative flavor).

### Jurisdiction lives on the Locality, not as claims on the Government

The staging doc left "where do claims live" open. Decided: the
**Locality declares its government** (sparse key field), the
Government carries no claims list. Reasoning: (1) **consent by
construction** — authoring a Locality is already landowner-gated
content authorship, so the property-bridge legitimacy rule ("a claim
is valid iff the landowner consents") needs no separate validation
mechanism; (2) it is precisely the "tier-level field on Locality"
pattern address.md reserved (weather's seed field is the sibling);
(3) federation and secession collapse to writing one field.
`governmentAt` derives the government→territory edge; if a reverse
index is ever needed the catalogue computes it (the corpo portfolio
precedent). Alternative rejected: claims-on-Government + a consent
check (a second mechanism doing what content authorship already does).

### Aggregation by reference; departments are Businesses

A Government is not a mixin on Stuff and does not supersede Business.
Parks & Rec and Public Safety are *separate Businesses* (one operating
unit = one roster + one P&L, venue-anchored per employment.md), owned
by one Government via reference. Budgets, wages, and treasury flows
ride banking unchanged — the **real-chokepoints integrity rule**: a
government moves money, chattel, and title only through the conserved
systems' gates.

### Residency is derived, never conferred

Modeled on real municipal residency-by-domicile: `residentOf` reads the
domicile's jurisdiction chain; `subjectTo` reads the current
location's. Domicile persists until replaced (no stateless gap;
homelessness = no dwelling, not no civic identity). Plural nested
residency (ward → city → realm) falls out of the prefix chain. NPCs
derive identically — a government of NPCs and players needs zero
membership machinery.

### Seats are positions

The real Office apparatus is code-authored, singular, and deliberately
not user-mintable — the wrong tool for diegetic seats, which must be
data, plural, and holdable by players or NPCs. A seat is a named
reference to a department position; authority checks are
`holdsSeat(...)`. The two staffs never merge: the **meta staff**
(committee: parcel owners + wizards) rides the property/code-trust
axes untouched; the **diegetic staff** (seat-holders) rides positions.

### Committee is derived from parcel title, not minted as a new kind

The committee concept ("the group administering a code subdivision" —
the jargon standard's replacement for cabal/content-group) could have
been a new Document kind, a Group flag, or a fifth GroupProvider.
Decided: **a committee is a relationship, not a thing** — the group
that `ParcelApi.ownerOf` resolves for a subdivision IS its committee.
Reasoning: (1) administration in this system *is* title (the property
bridge — access already dispatches on the title-holding owner), so a
separate committee designation would either duplicate or contradict
`ownerOf`; (2) derive-on-read is the house style and needs zero new
storage; (3) the subject/predicate constraints the user stated ("all
committees are groups, not all groups are committees") hold
structurally — a player-held subdivision simply has no committee.
Membership management is the existing `group` verb suite; authority is
the existing access substrate; the new surface is identity + reads +
the chat seam only. The meta/fiction split is preserved: committee is
a **meta** concept (it lives with access/grouping, documented there —
NOT in the diegetic Government substrate), and the `committee` verb is
filed accordingly, never under the fiction's civics category.

### Committee channels ride the existing chat substrate

"Committees get their own chat channels" adds no channel kind: a
committee channel is a persistent Channel whose Subject's `groupRef`
binds the committee's managed Group (the audience walk already routes
`GroupApi.membersOf`). The facade ensures the channel lazily; chat
remains the owner of nothing new — the committee group pre-exists, so
this is the promotion-path shape, not the `chat make` backing-group
shape.

### v1 flagship is thin by design

One real government (Terminus), one department (the Registry), one
seat (Magistrate), one clerk NPC, two real Localities. Chosen over
substrate-only (no real consumer proves nothing; the address roster
has to start sometime) and over the fuller civic slice (gaol + Watch
belong with city content, and arrest behavior deserves its own design
pass against the consent substrate).

## Constraints

- **The corpo recipe verbatim** for the Idea tier: pure-data leaf
  templates read from `template.data`, never cloned live; `key` (not
  templatePath) is every join; catalogue = data-cache singleton warmed
  via the bootstrap manifest; the mandatory Api ↔ Logic split; Api ends
  in `SecurityApi.decorateApiClass`.
- **`lib/civics/` is a new subsystem folder** (user-approved this
  cycle). Module categories only — no free-floating helpers; the
  Government Idea is the folder's one concept plus its vocabulary.
- The Locality's government field follows the **sparse tier-field
  pattern** (`_address`/weather-seed precedent): `null` costs one
  field, resolution is the Api's job, mutation goes through the
  method/hydrator surface (per-field invariants on setters).
- **Derive-on-read, no stamped rows**: no residency collection,
  no membership documents. The only persistence this build may add is
  whatever the domicile seam needs on the residence side (and prefer
  deriving from what the dorm keying already stores).
- **Gated actor-from-context**: any read taking "the acting character"
  derives it from execution context, never a caller parameter
  (`gated-api-actor-from-context`).
- **Never-throws resolution**: like the address walk, jurisdiction and
  residency reads return empty/null off-grid — no mandatory root
  government.
- Verb output follows **client-buttons-preview-command** and rides the
  response envelope; controller returns `void`.
- The address roster additions are **content templates in seeds**,
  pack-stamped per content-packs conventions if they ride a pack.
- Tests colocated in `__tests__/` siblings; Vitest.

## Acceptance criteria

- `GovernmentApi` serves: government/chain at an address and at a
  scope; `residentOf`; `subjectTo`; `holdsSeat`; descriptor getters +
  rosters. Tests cover: nested chain ordering (two nested governments
  over the demonstrative roster), off-grid → empty, unknown keys
  dropped, an NPC's residency, `holdsSeat` true/false paths.
- A Locality with no government field resolves exactly as today
  (regression: address + weather tests stay green).
- Domicile seam: a test player's `residentOf` resolves through their
  dorm room to the Terminus chain; the persists-until-replaced
  contract is asserted (or documented as structurally true while the
  dorm is irrevocable — stated explicitly in civics.md either way).
- Flagship observable in-game: standing in the Warren, `government`
  shows the Terminus government with its Magistrate seat and Registry
  department; `government residency` shows the same chain via
  domicile; the Registry room exists with its clerk NPC on shift-less
  roster (employment's minimum), and the venue's Business account
  exists.
- The two real Localities resolve: a dorm room's
  `analyze address` shows a `terminus/...` address with a covering
  Locality; `narnia/*` tests untouched.
- Committee: `committeeOf` resolves the title-holding group for a
  group-owned subdivision and `null` for a player-held one (tests
  cover both + the `'core'` state default); `isCommitteeMember` true
  for a member of the title-holding group; the **Terminus committee**
  group exists, holds the terminus subdivision title (chain-of-title
  row present), and `committee` in the Registry office shows it; the
  committee channel resolves/ensures and a committee member can post
  to it (audience = the group).
- Jargon install: `COMPACT_WIDE` compiles everywhere (`grep
  COOPERATIVE_WIDE` returns nothing), the stored `'*'` sentinel and
  existing standings rows read back unchanged (regression), and
  `standing` renders "The Compact regards you…".
- `docs/subsystems/civics.md` exists (substrate, doctrine pointers to
  the staging capture, deferred list); CLAUDE.md map gains its
  one-liner; the staging doc gains a "requirements landed" pointer;
  the committee concept is documented on the meta side (access.md
  and/or grouping.md) with a jargon-standard pointer.
- `pnpm lint`, `lint:gates`, `lint:module-scope`, and the full Vitest
  suite green.

## Cross-references

- [docs/staging/diegetic-government.md](../staging/diegetic-government.md)
  — the seeding design capture (premise, six powers, guild rhyme,
  marriage/prison cases)
- [address.md](../subsystems/address.md) — Locality, the walk, the
  tier-field seam this consumes
- [corpo.md](../subsystems/corpo.md) — the data-Idea/catalogue recipe
- [employment.md](../subsystems/employment.md) — Business/Position/
  Roster (departments + seats)
- [residence.md](../subsystems/residence.md) — the dorm home the
  domicile seam reads
- [governance.md](../subsystems/governance.md) — the real polity's
  Office substrate (the deliberate contrast)
- [banking.md](../subsystems/banking.md) — treasury/wages chokepoints
- [parcel.md](../subsystems/parcel.md) / [access.md](../subsystems/access.md)
  — the property bridge / landowner gating that makes
  Locality-declared jurisdiction consent-by-construction
