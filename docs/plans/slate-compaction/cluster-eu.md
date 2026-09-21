# Cluster-merge pass — Eternal University campus / first login

Branch `design/slate-cluster-merge`. Procedure:
`.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass. Files in
scope (line counts at the start of this pass):

- `docs/slates/builds/eternal-university-slate.md` (510)
- `docs/slates/builds/campus-grounds-slate.md` (731)
- `docs/slates/builds/demo-slate.md` (94)
- `docs/slates/builds/onboarding-slate.md` (400)
- `docs/slates/builds/acquisition-slate.md` (181)
- `docs/slates/builds/eternal-university-narrative-slate.md` (1055)

Prior ledgers consulted: `char-gen.md` (onboarding's compaction — the
journey + curriculum table already cut as SUPERSEDED, the Limen-vs-need-fired
tension flagged) and `credential.md` (acquisition's compaction). Shipped
references read: `docs/subsystems/char-gen.md`, `residence.md`,
`client-shell.md`, `fasttravel.md`, `location.md`;
`docs/staging/eternal-university/**` is staging design, not shipped content.
No worktree is running a campus / onboarding build (`git worktree list`:
economic-bootstrap · fishing · treatment · one detached), so nothing is
handed to a build's sweep.

## Canonicals — per SUBJECT (the residence-cluster precedent)

The six files are not six drafts of one design; they are four subjects that
share a place, plus a story bible and a demo build-list. The files' own
authority statements decide it:

- **`acquisition-slate.md` is canonical for the FIRST-LOGIN ROUTE** — its
  own heading reads *"supersedes the onboarding slate's route"*; the
  onboarding slate's status block and its `### The campus journey` already
  concede it; the EU place slate's See-also says *"Onboarding owns the
  journey mechanics; this slate owns the place"*, which transits to
  acquisition for the route.
- **`onboarding-slate.md` is canonical for the JOURNEY MECHANICS that are
  not the route** — Dr. Limen (~110 lines of design; acquisition carries
  only a ruling and an open item that name "the Limen build" as elsewhere),
  the `onboarded` flag + lounge-exit routing, the wayfinding signs, the
  scoped-authoring on-ramp, the private-house nudge. Nobody names another
  authority for these and it carries the larger remaining design.
- **`eternal-university-slate.md` is canonical for the PLACE** — feel,
  topology, the v1 roster, the campus-services pattern; `campus-grounds`
  and the narrative slate both say so outright.
- **`campus-grounds-slate.md` is canonical for the ACADEMIC GROUNDS** — labs,
  archive, field sites, teaching rooms, eatery; its own framing: *"this
  adds the academic buildings it left out"*, and its § What this slate does
  NOT cover hands feel/topology/Quad back to the EU slate.
- **`eternal-university-narrative-slate.md`** — the story bible. Its older
  status block is the cluster's own three-way ownership statement (*this
  slate owns the story, the method, and the reusable engines; the EU slate
  owns the place; onboarding owns the journey mechanics*). KEEP entirely.
- **`demo-slate.md`** — a demo build-list, a thematic neighbour, not a
  duplicate: its only University touch (item 3, the conferral-ceremony
  beat) is designed by no cluster file. KEEP entirely, untouched.

Consequence: the EU place slate is canonical for the place **and a
secondary** to acquisition for the route (its `## Worked scenario — first
login onto campus` is the OLD route) and to campus-grounds for the academic
hall (its roster bullet + Open Q 7). Acquisition is canonical for the route
**and a secondary** to onboarding for the Limen build (one Open-items bullet
+ one `Left` token). Every heading of every file appears in the tables
below, the canonicals' included.

## ⚠ The tension — flagged, NOT resolved (per the coordinator)

Onboarding § Dr. Limen designs a **proactive checklist**: *"Two modes,
keyed on the `onboarded` flag"* — proactive while `onboarded == false`,
reading three `PropertiedMixin` progress flags (`onboarding.enrolled`,
`.keyed`, `.implantDemo`) flipped by the station-keeper services.
Acquisition § The first-login journey v2 says *"Week one is the itinerary,
need-fired, no checklist … Onboarding dissolves; Limen goes quiet"*, and
its Rulings add *"No NPC DMs shoved at newcomers … Limen's first contact is
at campus entry, after Gus. Hard requirement on the Limen build: replying
to Limen's DM must work."* The `.implantDemo` flag also names the
Health-Center demo-augment beat that acquisition retired. Both versions are
left standing in their owners; requirements reconciles. Rows below that
touch it are marked **⚠ TENSION**.

## eternal-university-slate.md — 510 → 513 · canonical for the PLACE; secondary to acquisition (route) and campus-grounds (academic hall)

Read whole. Two DUPLICATE cuts + one MOVE out; net +3 lines because the
pointers name what moved where and the status block gained a two-line note.
Not retired — the body is its own subject.

| heading | outcome |
|---|---|
| status block | re-stamped: `Left` drops *the academic hall* (→ campus-grounds Part 8) and *the first-login journey* (→ acquisition § journey v2); a dated note in the Status line says so |
| framing + *The load-bearing decisions* 1–6 | KEPT (spine; decision 5 names "the journey" as part of the one drop — a composition claim, not the route) |
| *See also* | KEPT. ⚠ Two bullets carry stale clauses — the onboarding bullet's *"(signs + greeter + demo-augment + learn-by-doing)"* and the augmentation bullet's *"the Health Center issues the demo augment on the journey"* — the demo augment was retired by acquisition. Left in place (spine; not open design); coordinator note below |
| `## Principle` | KEPT |
| `## The north-star — why Eternal City` (+ `### The two pillars` · `### The synthesis` · `### The authoring craft`) | KEPT — doctrine, this slate's own |
| `## Lore grounding (the deep history)` | KEPT. ⚠ Contains the stale clause *"(it installs the TPA implant-update on the onboarding journey — see onboarding-slate.md)"* inside a paragraph that is otherwise live lore (attunement mastered here; the Chapel). Paragraph granularity — left; coordinator note |
| `## The surround — the city past the gates (deferred)` | KEPT (already carries its own superseded/resolved pointers to holding.md) |
| `## The model — the v1 campus` → `### Topology` | KEPT |
| `### The v1 roster` — every bullet but one | KEPT. ⚠ The *Health Center* bullet ("the demo-augment install on the journey") and the *Walkways* bullet ("signs + greeter + the clinic stop") each carry a retired clause inside a live bullet; left, coordinator note |
| `### The v1 roster` — **An academic hall** bullet | **DUPLICATE → campus-grounds-slate Part 8** (pointer left); its one differing detail — *texture + future hook, no lessons in v1* — **MOVED verbatim → campus-grounds-slate § Absorbed from eternal-university-slate** |
| `### Campus services — the pattern` | KEPT |
| `### Duncan Hall — the dorm` | KEPT (already pointered to residence.md / holding.md / dorm-warren-slate by compaction; the roommate paragraph defers to dorm-warren-slate, which the residence cluster owns — out of this cluster) |
| `### Dorm-room customization — the Detail schema` | KEPT (a superseded pointer) |
| `### Prose & the mood-board` | KEPT |
| `## Worked scenario — first login onto campus` | **DUPLICATE → acquisition-slate § The first-login journey v2** (15 lines cut, 10-line pointer left). Detail audit: greeter NPC → resolved in acquisition step 3 (Gus); signs → onboarding's `Left` (not dropped); Health Center demo augment → retired by acquisition (not open design); registrar sought later → acquisition step 4; "two anchor hops, the rest walked" → this slate's § Topology. Nothing to MOVE |
| `## Open questions / forks` Q1–6, 8–11 | KEPT (Q1, Q9 are resolved pointers already). Q5 *Guide wristcomp vs signs + the greeter — "(Shared with onboarding-slate)"* — not a duplicate: onboarding carries no wristcomp question; the greeter half is resolved (Gus); left as-is |
| `## Open questions / forks` **Q7** (education-vertical content surface) | **DUPLICATE → campus-grounds-slate Part 8 / Open Q 13** (pointer left); text **MOVED verbatim** alongside the roster bullet |
| `## Build order` | KEPT. The *v1 one-drop* paragraph lists "the first-login journey" and "Health Center (clinic)" as components — a composition statement, kept whole; the *Wave 2+* paragraph's "academic hall becomes a real education-vertical content surface" is now campus-grounds' concern but sits in a mixed paragraph — kept |
| `## What this slate does NOT cover` | KEPT. Its onboarding bullet ("signs, greeter, demo augment, scoped authoring → onboarding-slate") predates the route's move to acquisition — the pointer left at § Worked scenario carries the split now |
| `## Once shaped into formal requirements` | KEPT. ⚠ Its Tests bullet still says *"the demo augment installs at the Health Center"* — retired; a mixed bullet, left, coordinator note |

### Status block
- Left: … `· the academic hall · the first-login journey ·` … → both dropped
  (owned elsewhere, see the Status note); the other eleven items unchanged.
- Size: a build → a build (the Quad, the gate, services, the store, the
  clinic, the terminals, Duncan Hall's tail, the biome leaf, the prose pass
  are still one content drop).
- Status: PARTIAL → PARTIAL.

## campus-grounds-slate.md — 731 → 746 · canonical for the ACADEMIC GROUNDS; secondary to the EU slate for feel/topology

Read whole. Nothing duplicated the EU slate's open design — every overlap
is a citation (*"the campus is the first content a player walks into
(eternal-university-slate)"*, § NOT cover's hand-back of feel/topology/Quad)
or a shipped pointer (Duncan Hall). Gains one labelled MOVE (15 lines).

| heading | outcome |
|---|---|
| status block | KEPT (unchanged — `Left` already names *the lecture hall + seminar room and the walkable study.com demo*, which is what the moved bullet is about) |
| framing · provenance · *Sits on / amends* | KEPT |
| `## Part 0 — How the roster gets picked` | KEPT |
| `## Part 1 — The roster, tiered` (+ `### Build` · `### Build, on a different justification` · `### Bind, do not author` · `### Do not build`) | KEPT |
| `## Part 2 — The university owns them` | KEPT |
| `## Part 3 — Access by enrollment` (+ `### Retention by obligation` · `### The ecosystem`) | KEPT |
| `## Part 4 — The conflict with the college slate` (+ `### On "the course gates nothing"` · `### On tuition`) | KEPT (college-slate is out of cluster) |
| `## Part 5 — The teaching field sites` (+ `### The difficulty ramp` · `### The three sites`) | KEPT |
| `## Part 6 — The archive` (+ `### The mechanic` · `### Spellbooks` · `#### The guild question` · `#### Where each grid piece lives` · `#### The spellbook principle`) | KEPT |
| `## Part 7 — The combat facilities` (+ `### The derivation` · `### What they can actually be`) | KEPT |
| `## Part 8 — The teaching rooms` (+ `### The room roster` · `### It completes a designed-but-unbuildable sequence` · `### Three curriculum findings`) | KEPT; **gains `### Absorbed from eternal-university-slate — the v1 roster's "An academic hall" bullet + Open question 7`** (verbatim, labelled, 15 lines incl. the framing sentence that says why it differs) |
| `## Part 9 — The eatery` (+ `### The finding` · `### On campus it closes a second teaching chain` · `### Room and board` · `### Mealtimes are soft congregation` · `### It is cheap`) | KEPT |
| `## Part 10 — The rest of the grounds` | KEPT. Note: its last bullet says the lecture hall is *"already specified by the college slate; this slate does not redesign them"* while Part 8 sites it — an internal inconsistency of the slate's own, not a cluster duplicate; untouched |
| `## Open questions` 1–17 | KEPT |
| `## What this slate does NOT cover` | KEPT |

### Status block — unchanged (Left · Size · Status all as before).

## acquisition-slate.md — 181 → 190 · canonical for the FIRST-LOGIN ROUTE; secondary to onboarding for the Limen build

Read whole. One DUPLICATE (an Open-items bullet + the matching `Left`
token); the pointer is long because it carries the ⚠ TENSION in the slate
itself, where requirements will find it. Not retired.

| heading | outcome |
|---|---|
| status block | re-stamped: `Left` drops *Dr. Limen* (→ onboarding § Dr. Limen), with a parenthetical saying this slate keeps its rulings on the build |
| framing (*Captured 2026-07-28 …*) | KEPT |
| `## The doctrine (three rules)` | KEPT (rule 2 names *"Limen's nudges"* as a discovery layer — a citation, not the Limen design) |
| `## Rulings (2026-07-28, all user-decided)` | KEPT — all six bullets are this slate's. **⚠ TENSION**: the last bullet (*no NPC DMs at newcomers; Limen's first contact at campus entry post-Gus; replying to Limen's DM must work*) is a requirement ON onboarding's Limen build that onboarding's § Dr. Limen does not state; it is one paragraph with a route ruling, so it stays here and the pointer under § Open items names it |
| `## The rosters` | KEPT |
| `## The first-login journey v2 (supersedes the onboarding slate's route)` | KEPT — the canonical route. **⚠ TENSION**: *"need-fired, no checklist … Onboarding dissolves; Limen goes quiet"* vs onboarding's two-mode flag model; not resolved |
| `## Open items` — government quarter · pricing · `presentsKey` depth · onboarding-slate reconciliation | KEPT (the reconciliation item IS the tension marker; kept) |
| `## Open items` — **The Limen build (brain, seat, the reply contract)** | **DUPLICATE → onboarding-slate § Dr. Limen — the Orientation guide** (onboarding's `Left` already reads *"Dr. Limen (seat, model-backed brain, the reply contract)"* — the same three nouns). Struck through with a pointer that also names the tension |
| `## Cross-references` | KEPT |

### Status block
- Left: `forums leaving the default loadout · the payment credential
  required at hire · the conferral certificate · Dr. Limen · the journey-v2
  route` → same minus *Dr. Limen* (+ the parenthetical).
- Size: a build → a build (the loadout change + the hire gate + the
  certificate record + the route content are still a cycle).
- Status: PARTIAL → PARTIAL.

## onboarding-slate.md — 400 → 400 · canonical for the JOURNEY MECHANICS; secondary to acquisition for the route

Read whole. **No cut and no move**: the char-gen compaction already turned
its route (`### The campus journey`), its curriculum table and its build
order into pointers at acquisition / demo-content-requirements, so nothing
here duplicates acquisition's open design any more. Untouched on disk.

| heading | outcome |
|---|---|
| status block | KEPT (unchanged). ⚠ The second blockquote's *"Katie's handover digitizes as a `dorm-key` wallet record"* is stale against the credential ledger's finding (both a wallet entry AND a physical `Key`, via `Lock.issueKeyTo`) — a compaction-authored pointer, not design; coordinator note |
| framing · *The load-bearing decisions* 1–4 | KEPT. Decision 1's *"installing the demo augment is learning implants"* is a retired beat inside a live paragraph; left |
| *See also* | KEPT (its augmentation bullet — *"the demo augment (teaches the install/acquire flow on the journey)"* — is stale, same class; left) |
| `## Principle` | KEPT |
| `## The flow` | KEPT (spine; the diagram box still says *demo augment* — the char-gen ledger already flagged it) |
| `### The lounge` | KEPT (a shipped pointer) |
| `### Lounge-exit routing (the one small engine bit)` | KEPT — this slate's own (the `onboarded` flag); no acquisition counterpart |
| `### The campus journey (first login)` | KEPT — paragraph 1 is already the pointer to acquisition § journey v2 (DUPLICATE, previously pointered); paragraph 2 (the private-house nudge) is this slate's own |
| `### The dorm + customization (the climax)` | KEPT — acquisition's step 6 defers here (*"the scoped-authoring climax, unchanged"*) |
| `## Dr. Limen — the Orientation guide` | KEPT — **canonical**. **⚠ TENSION** with acquisition (see the flagged section above): the two-mode `onboarded`-flag model and the three progress flags (`.implantDemo` names the retired demo-augment beat) vs *need-fired, no checklist; Limen goes quiet*. Also its last paragraph (*Limen vs. the greeter — lean: keep both*) is superseded by acquisition's Gus ruling, which the slate's own Open-questions section already records as resolved — paragraph kept whole |
| `## The curriculum + location mapping (session — 2026-06-08)` | KEPT — the two caveat paragraphs are doctrine (task-vs-lesson, world-first); the table is already a pointer |
| `## What this reveals (the new system)` | KEPT |
| `## Open questions / forks (minimal)` | KEPT |
| `## Build order` | KEPT (already a pointer to acquisition's sequencing) |
| `## What this slate does NOT cover` | KEPT |
| `## Once shaped into formal requirements` | KEPT (the char-gen ledger's Uncertain note on its Tests bullet still applies) |

### Status block — unchanged (Left · Size · Status all as before).

## demo-slate.md — 94 → 94 · a thematic neighbour, not a duplicate

Read whole. Untouched on disk. No heading duplicates any cluster file's
open design; the file is a demo build-list whose one University touch is
the conferral-ceremony beat, which no cluster file designs (acquisition's
roster row *conferral certificate → the registrar* is the credential, not
the ceremony; `demo-content-requirements.md` unit 11 is a requirements doc,
out of scope).

| heading | outcome |
|---|---|
| status block | KEPT |
| framing (*Capture doc 2026-07-28 …* + the organization note) | KEPT |
| `## The demo cluster (blocks filming; …)` items 1–7 | KEPT (item 3, the threshold-ceremony beats incl. the conferral ceremony *"where in the University it lands"*, is the only campus-touching item; nothing to point it at) |
| `## Adjacent backlog (lens-pass implications …)` | KEPT |
| `## Held decisions this list waits on` | KEPT |

## eternal-university-narrative-slate.md — 1055 → 1055 · the story bible; KEEP entirely

Read the headings, both status blocks, § 16 and § 17.H, and grepped every
reference to the cluster (lines 23–24, 169, 1049–1050 — all citations of
the place slate / the journey slate as *owners*, none a copy). Untouched on
disk. Tabled at the `##` level as instructed.

| heading | outcome |
|---|---|
| status block (canonical) + the older *Status: story bible, first pass* block | KEPT — the older block is the cluster's three-way ownership statement (story / place / journey mechanics); two blocks stand deliberately |
| `## 0. The one-paragraph pitch` | KEPT |
| `## 1. Thesis: the killing is the on-ramp, transformation is the story` | KEPT |
| `## 2. The un-genred reconciliation` | KEPT (argues *from* the EU slate's north-star; a citation) |
| `## 3. The player's position: Encyclopedia Brown` | KEPT |
| `## 4. The campus as a polity in miniature` | KEPT (l.169 cites onboarding-slate for the campus walk) |
| `## 5. The real payload: allegory you can vote on` | KEPT |
| `## 6. The civic spine: the census` | KEPT |
| `## 7. The deep engine + the AI synchronicity` | KEPT |
| `## 8. The aether — the one load-bearing property` | KEPT |
| `## 9. The crime: a serial pattern, told in three tiers` | KEPT |
| `## 10. The victim: Dunny Akhtar` | KEPT |
| `## 11. The killer + the panic` | KEPT |
| `## 12. The circle — your "powers," distributed` | KEPT |
| `## 13. The census form as authorable allegory` | KEPT |
| `## 14. The investigative geography` (+ `### The corpse-laundering`) | KEPT |
| `## 15. Decisions (resolved 2026-06-27 — names still open)` | KEPT |
| `## 16. Dependencies & deferrals` | KEPT |
| `## 17. Live threads (exploratory — not yet canon)` | KEPT. ⚠ Cross-cluster note: § 17.H's *procedural NPC roommate — never two real players* sits against the EU slate's Duncan Hall roommate-pairing paragraph (already deferred to `dorm-warren-slate`, the residence cluster's canonical for room design). Story vs substrate; not a duplicate of open design in this cluster; flagged only |

## Coordinator notes

1. **The ⚠ TENSION** (proactive checklist vs need-fired) is now visible in
   both owners: onboarding § Dr. Limen (unchanged) and acquisition § Open
   items (the struck-through Limen bullet's pointer). Not resolved.
2. **Stale demo-augment / Health-Center clauses inside live paragraphs**,
   left because the skill cuts at paragraph granularity: EU slate — See-also
   (onboarding + augmentation bullets), § Lore grounding, § The v1 roster
   (Health Center, Walkways), § Once shaped (Tests bullet); onboarding slate
   — decision 1, See-also (augmentation bullet), § The flow diagram. A
   requirements pass over the route should drop them in one sweep; the
   route's owner (acquisition) already states the retirement.
3. **onboarding-slate's second blockquote** says Katie's handover digitizes
   as a wallet record; the credential ledger found the shipped mechanism is
   wallet entry + physical `Key`. Compaction-authored pointer text; one
   clause.
4. **No file retired, no link re-pointed.** All six keep their own subject;
   `docs/slates/README.md` / `roadmap.md` entries stand. The staging tree
   (`docs/staging/eternal-university/arrival-quad.md`, `campus-map.md`,
   `lore-integration-pass.md`) links the EU slate by file, not by anchor —
   nothing broke.
5. Out-of-cluster overlap for a later pass: the EU slate's roommate
   paragraph ↔ `dorm-warren-slate` (residence cluster) ↔ narrative § 17.H.
