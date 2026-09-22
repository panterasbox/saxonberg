# Client — cluster-merge ledger

Cluster: **client**. Files: `docs/slates/tails/client-slate.md` (208
lines) · `docs/slates/tails/client-shell-slate.md` (490) ·
`docs/slates/tails/client-cockpit-slate.md` (397) ·
`docs/slates/builds/client-audio-slate.md` (238) ·
`docs/slates/tails/connection-origin-slate.md` (170) ·
`docs/slates/tails/connection-quality-slate.md` (165). Procedure:
`.claude/skills/compact-slate/SKILL.md` § *The cluster-merge pass*.
Prior compaction passes (already done, not repeated here):
`card-surface.md` (client-slate 1205 → 208 · client-cockpit-slate
796 → 397 · client-shell-slate 665 → 490), `unlinked-6.md`
(client-audio-slate), `social-graph.md` (connection-origin-slate),
`unlinked-7.md` (connection-quality-slate). The card-surface ledger
flagged, in its *Uncertain* sections, exactly the two duplicates this
pass resolves: *"the notification tray ↔ client-cockpit-slate §
Notifications"* and *"the educational mode ↔ client-shell-slate § Modes
generalize"*.

Worktree check: no build worktree holds a client branch
(`build/economic-bootstrap`, `build/fishing`, detached, `design/treatment`)
— nothing here is a design pack a running build reads from.

**Scope check: duplicated OPEN design only.** Read all six whole. The
result is small on purpose: the three client slates each own a
different subject (client-slate = the handoff's leftovers — MML
vocabulary, engagement, the card surface's gaps; client-shell-slate =
the frame — search, the public surface, pre-auth state, the mode model;
client-cockpit-slate = the body — modes, panels, the content surface),
and after compaction only **two open items appear in two files**:

1. **the notification tray / chip** — client-slate § 7.2 (*"notifications
   — designed only as a stub …"*) ↔ client-cockpit-slate § Panel
   inventory → *Notifications (always-on)* + Open question 3;
2. **the educational mode** — client-shell-slate § *Modes generalize the
   cockpit's mode axis* (*"Educational has no mode yet (the cockpit
   slate's study/classroom)"*, and the `Left` item *the educational mode
   row*) ↔ client-cockpit-slate § Modes / § Content surface (the whole
   design).

**Canonical for both: `client-cockpit-slate.md`.** It is the file the
others name as the authority for these items — client-shell-slate's
*See also* says the cockpit slate's *"`## Modes` (World/Study/Classroom/
Tutor) … are all inside the game surface this slate wraps"* and its
Modes section defers the educational row to *"the cockpit slate's
`study`/`classroom`"*; client-slate lists both siblings as *tails* and
its own notifications sentence is a deferral, not a design. It also
carries the larger remaining design for both items (the mode catalogue,
the two layout diagrams, the content surface, the chip's row + Q3).
client-slate and client-shell-slate are NOT retired — everything else in
each is its own subject (KEPT).

**The connection pair is a name-level pair only.** connection-origin
(where you connect *from*: the gated IP read, `whois`/`locate`,
city/region, a persisted last-seen country, multi-hop XFF) and
connection-quality (how well: the three-band jitter state, the opt-in
party publish, the operator's aggregate read) carry **no common open
item**. connection-quality cites connection-origin once, as the doctrine
precedent (*country-not-IP is band-not-milliseconds*), which is a
citation, not a duplicate. Both KEPT untouched; no table needed beyond
the rows below saying so.

**client-audio-slate is its own subject.** Its only contact with the
three client slates is client-cockpit-slate § Non-goals → *"Voice /
audio output — text + visual only in v1"* — a v1 non-goal, not an open
design, and it does not cite the audio slate. Thematic neighbour; touched
nothing.

---

## docs/slates/tails/client-slate.md — secondary (208 → 208 lines)

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, *Captured 2026-08-06* framing, *Related* list | KEPT — spine. Status block re-stamped below. |
| `## 1 · Why this slate exists at all` | KEPT — client-slate's own framing (the handoff is reference art; the decisions live here). |
| `## 3 · The governing decisions` → `### 3.4` (superseded pointer) · `### 3.6` (shipped pointer) | KEPT untouched — already SHIPPED/SUPERSEDED pointers from the prior pass; not open design. |
| `### 3.7 Registers are mode-scoped, not frame-scoped` (plates) | KEPT — client-slate's own (`Left`: *§ 3.7's plates (unverified)*); no sibling carries it. |
| `## 4 · ⚠ The server work hidden inside the handoff` → `### 4.1 Track A — MML + topics redesign` | KEPT — the open MML vocabulary questions are client-slate's own; client-cockpit-slate's *Tag taxonomy* is a SUPERSEDED pointer, not a rival design. |
| `### 4.2 Track B` · `### 4.4 Track D` | KEPT untouched — shipped pointers. |
| `### 4.3 ⚠ Track C — the unwired read-APIs` (clips + attestation) | KEPT — owned by `attestation-slate` (outside this cluster); the paragraph is a pointer with the mailbox/attestation-on-a-clock rule. Not a client-cluster duplicate. |
| `## 6 · Decisions the handoff makes that are worth keeping as rules` — the struck routing bullet · the engagement bullet | KEPT — engagement patterns are client-slate's own. |
| `### ⚠⚠ One widget in the handoff's catalogue must NOT be built` (`score`/`traits` self-report) | KEPT — client-slate's own; the psychology premise is `psychology-slate`'s, outside this cluster. |
| `## 7 · Proposed wave cut` → `### ⭐⭐ 7.17 What the LIVE DRIVE found` (the coalesced *"7 people reacted"* line) | KEPT — client-slate's own. |
| `### 7.2 The program resequenced — 2026-08-13` — ¶1 (the 2.5 server build shipped) · ¶2 (the lounge cut from Wave 2) | KEPT untouched — ¶1 is shipped pointers; ¶2 is a pointer to `lounge-slate` (outside this cluster). |
| `### 7.2` — ¶3 *"Deferred, designed but not scheduled: …"* — the clips/attestation and engagement clauses | KEPT (own; owned-elsewhere pointers). |
| `### 7.2` — ¶3 — the **notifications** clause: *"notifications — designed only as a stub, and `NotifyPolicy` / `NotifyRule` should be read before the UI is designed, because what belongs in that tray is *whatever the receiver said they wanted*, not everything that happened."* | **DUPLICATE → `client-cockpit-slate.md § Panel inventory → Notifications (always-on)`** (the chip's row + Open question 3 already carry the tray/chip design there). The one differing detail — *read `NotifyPolicy`/`NotifyRule` first; the tray shows what the receiver said they wanted* — is **MOVED verbatim** into the canonical as `#### Absorbed from client-slate — § 7.2 (the notification tray)` (a blockquote of the clause, with `[…]` marking the two sibling clauses that stay here). The clause in client-slate is replaced by a one-line pointer to that subsection. ⚠ Sub-paragraph edit, deliberately: the paragraph is a semicolon list of three independent deferrals, two of which are client-slate's own; the original clause is quoted in full in this row so it is recoverable without `git show`. |
| `## 8 · Open questions` 1 · 2 · 5 (struck/answered) | KEPT untouched — resolved stubs from the prior pass. |
| `## 8 · Open questions` 3 (`item`/`object`) · 4 (`mx` digest width) | KEPT untouched — spine. ⚠ Not a cluster duplicate, but the card-surface ledger already found both answered (`KNOWN_TAGS` has `thing`, no `item`/`object`; § 4.2 says the digest was CUT) and the current `Left` deliberately omits them — flagged for the coordinator, not acted on (this pass merges, it does not compact). |

Nothing lost: every heading above is DUPLICATE (one clause, its detail
MOVED), or KEPT. Not retired — the remainder is client-slate's own.

### Re-stamp — docs/slates/tails/client-slate.md

- **Status:** PARTIAL → PARTIAL (unchanged).
- **Left:** *the notification tray (read `NotifyPolicy`/`NotifyRule`
  first) · output logging / clips / attestation (owned by
  attestation-slate) · the lounge's content half (owned by lounge-slate) ·
  the open MML vocabulary questions … · engagement patterns … · the
  `score`/`traits` self-report … · the coalesced "7 people reacted" line ·
  the card surface's tables / forms / interactive cards + view tagging ·
  § 3.7's plates* → the same list **minus the notification tray** (now
  tracked only in client-cockpit-slate). 9 → 8 items.
- **Size:** a wave → a wave (unchanged — one tracked-elsewhere item
  left; the body is otherwise the same).

---

## docs/slates/tails/client-shell-slate.md — secondary (490 → 490 lines)

### Conservation table

| secondary heading / item | outcome |
|---|---|
| Title, status block, framing paragraph (*"how the client shell is organized …"*), *See also* list | KEPT — spine. Status block re-stamped below. ⚠ *See also* still calls the CMS *"a separate tab"* — stale, already flagged by the card-surface ledger for the sweep; not touched (index-style line). |
| `## Principle` (one bus, many surfaces; no universal status block; no universal nav) | KEPT — client-shell's own thesis (a doctrine section, already so labelled by the prior pass). |
| `## Surfaces over the bus (the three front-ends)` — table + ¶ + the shipped CMS-is-a-mode pointer | KEPT — own (the public read-only surface is the open half; the CMS pointer is shipped). |
| `## Shared primitives (composition, not inheritance)` — shipped pointer + `SearchInput` bullet | KEPT — own (`SearchInput` is the search item). |
| `## Modes generalize the cockpit's mode axis` — ¶1, the shipped `COCKPIT_MODES` pointer, **its *Educational* clause** *"and *Educational* has no mode yet (the cockpit slate's `study`/`classroom`)"* + the `Left` item *the educational mode row* | **DUPLICATE → `client-cockpit-slate.md § Modes` (Mode catalogue · Mode-switching is server-driven · Study / Classroom layouts) + `§ Content surface (mode-bound)`** — the entire educational-mode design lives there and this slate's own *See also* names it as the owner. No differing detail to move: client-shell's only educational-specific content is the row's existence; the *how a mode is determined* mechanisms in ¶2 (vertical config defaults an education deploy; user-toggle RPG ↔ educational) are client-shell's Q1, not the mode's design, and stay. The clause is re-pointed in place (names the two canonical sections; *tracked only there since the cluster pass*), and *the educational mode row* is removed from `Left`. |
| `## Modes generalize …` — ¶2 (*"Held as a map of the design space …"* — mode determination spans role-gate / vertical config / context / user-toggle) | KEPT — own (Q1). ⚠ Its *"Mode-switching stays server-driven per the cockpit slate (`mode-changed` push)"* inherits the same contradiction the cockpit slate's `Left` already flags (cockpit.md § The old layout axis: *No auto-switch*; mode rides `cockpit.mode` clientState, not a push channel). Not a duplicate — a shared stale premise; requirements for either slate reconcile it once. |
| `## Search as a frame primitive` (all paragraphs: two intents, one box grouped by kind, help vs wiki, the shared reading substrate, spoiler is shell-level) | KEPT — own. Overlaps noted by the prior pass (help-slate, wiki-slate, spoiler-slate) are outside this cluster and are citations. |
| `## Pre-world is plain UI — shipped → …` | KEPT untouched — shipped pointer. |
| `## Pre-auth client state — the one tier that doesn't ride the bus` → intro + the four-category table · `### Two axes → two client tiers` · `### Guest = anonymous …` (shipped pointer) · `### Merge on login` · `### Why this section lives here` | KEPT — own (Q8 / Q9). |
| `## The public read-only surface (metrics · overlays · public docs)` → intro + the read-only SESSION box · the three consumers · `### Architecture: gather on the bus, project off it` · `### Render half vs control half` · `### Auth knob` | KEPT — own. (The prior pass's overlap note — the control half ↔ `streaming.md` / `livestream.md` — is a shipped-doc relation, not a slate duplicate.) |
| `## Declarative mode model — extract, don't pre-build` | KEPT — own. |
| `## Build order / sequencing (two parallel tracks)` | KEPT — own (mixed; the shipped bullets are already pointers). |
| `## Relationship to existing slates / what this does NOT cover` | KEPT — a scoping section that *defers* to the cockpit slate (*"Cockpit internals … all cockpit slate"*); it is the citation the canonical decision rests on, not duplicated design. Its *"state-sync slate"* bullet names the retired slate — stale wording, left (cuts only). |
| `## Open questions` 1–9 + the *Resolved in design* box | KEPT — spine, own. Q2 (*mode vs surface axis … pin the vocabulary before requirements so it doesn't collide with the cockpit's "modes"*) is client-shell's own question *about* the cockpit's vocabulary, not the cockpit's item. |
| `## Dependencies` | KEPT — spine. (Lists `mql-subscription-slate` twice — pre-existing, left.) |

Nothing lost: one clause DUPLICATE (re-pointed in place, nothing to
move), everything else KEPT. Not retired.

### Re-stamp — docs/slates/tails/client-shell-slate.md

- **Status:** PARTIAL → PARTIAL (unchanged).
- **Left:** *search as a frame primitive (Q3 …) · the public read-only
  surface (…) + a read-only session · the declarative mode model (…) ·
  mode determination (Q1) · the device-local pre-auth tier (Q9) +
  merge-on-login (Q8) · the educational mode row* → the same list
  **minus *the educational mode row*** (tracked only in
  client-cockpit-slate). 6 → 5 items.
- **Size:** a wave → a wave (unchanged).

---

## docs/slates/tails/client-cockpit-slate.md — canonical (397 → 412 lines)

### What it absorbed

- New labelled subsection under `## Panel inventory` → `### Notifications
  (always-on)`, after the chip's table row: `#### Absorbed from
  client-slate — § 7.2 (the notification tray)` — the notifications
  clause moved verbatim as a blockquote (`[…]` marks the two sibling
  clauses that stayed in client-slate), plus two parenthetical links:
  `notification-slate` (the absent-tense substrate the tray would
  render — outside this cluster, not edited) and `client-shell.md § The
  top bar` (why no bell is placeholdered). 11 lines.
- Nothing moved for the educational mode — the canonical already carried
  the whole design; the secondary's clause was a pointer.

### Re-stamp — docs/slates/tails/client-cockpit-slate.md

- **Status:** PARTIAL → PARTIAL (unchanged).
- **Left:** two items re-worded, none added or removed (12 → 12):
  - *the `study` and `classroom` modes + their diegetic `mode-changed`
    trigger (⚠ contradicts cockpit.md's no-auto-switch rule)* → same,
    + *this is the Educational row of client-shell-slate's use-case
    matrix, tracked only here since the cluster pass*;
  - *the notification chip (overlap: client-slate's tray)* → *the
    notification chip / tray (client-slate's tray rule absorbed here; the
    substrate is notification-slate)*.
- **Size:** a wave → a wave (unchanged — ~11 lines of moved text).

⚠ Internal tension left standing (pre-existing, flagged by the prior
pass): `### Always-on minimum` says *the notification chip is cut, not
deferred*, while `Left` keeps *the notification chip / tray*. They are
consistent read carefully — client-shell.md cut the **bell in the top
bar** (a permanent slot in the scarcest row) and kept the capability
reachable from the account menu (`SocialNotificationsPanel`); what is
still open is **what a tray shows** once `NotifyPolicy` / `NotifyRule`
have been read and `notification-slate`'s substrate exists. Not
reworded (cuts and moves only).

---

## docs/slates/builds/client-audio-slate.md — KEPT whole (238 → 238)

| heading | outcome |
|---|---|
| Title, status block, *Captured 2026-09-01*, *Provenance*, *Sits on / borrows* | KEPT — spine. |
| `## Part 0 — The finding: two features, and only one of them is a Spotify problem` | KEPT — own. |
| `## Part 1 — The client audio player (the substrate — build this)` | KEPT — own. Rides `display.md`'s `cockpit.watch` push; no client slate designs an audio path. |
| `## Part 2 — Why the jukebox as pictured is not buildable on Spotify` | KEPT — own. |
| `## Part 3 — The zorkmid point, conceded and bounded` | KEPT — own. |
| `## Part 4 — The embed: the one path that clears the wall (loosely)` + `### The three catches` + `### What the embed makes buildable today` | KEPT — own. |
| `## Part 5 — Open questions (the substrate)` · `## Open questions (the Spotify tier)` | KEPT — own. |
| `## Part 6 — The alternative if frame-lock or scale is required` | KEPT — own. |
| `## What this slate does NOT cover` | KEPT — own. |

No duplicate with any open item in the three client slates. The only
contact is client-cockpit-slate `## Non-goals` → *"Voice / audio output
— text + visual only in v1"*, a v1 non-goal that does not cite this
slate; thematic neighbour, nothing touched. Status block unchanged
(UNBUILT · a build).

---

## docs/slates/tails/connection-origin-slate.md — KEPT whole (170 → 170)

| heading | outcome |
|---|---|
| Title, status block, the *Partially shipped* paragraph, framing, *See also* | KEPT — spine. |
| `## Principle` | KEPT — own (the privilege split). |
| `## What it is — and isn't` | KEPT — own. |
| `## Capture — the WS-upgrade seam` (shipped summary + the multi-hop XFF caveat) | KEPT — own. |
| `## Derive — the geo lookup` | KEPT — own (shipped summary; city/region deferred). |
| `## Expose — ConnectionApi.originOf, privilege-split` | KEPT — own (the gated `ip` field + the `whois`/`locate` verb). |
| `## Open questions` (Q1 open; Q2–Q6 resolved notes) | KEPT — spine. |
| `## Build order (small, ~one cycle)` · `## What this slate does NOT cover` | KEPT — own. |

## docs/slates/tails/connection-quality-slate.md — KEPT whole (165 → 165)

| heading | outcome |
|---|---|
| Title, status block, *Captured 2026-08-05*, the user quote, *Related* | KEPT — spine. ⚠ *Related* links `cockpit-layouts.md`, which does not exist in `docs/subsystems/` (cockpit.md § The old layout axis is the nearest) — a broken link, left for the sweep (cuts only). |
| `# Part 0 — It already ships, and the posture is already right` | KEPT — shipped pointer + the framing blockquote (own). |
| `# Part 1 — The rule, and what it does not say` | KEPT — own (doctrine). |
| `# Part 2 — ⚠⚠ The hazard that is not obvious` + `## The distinction that does the work` | KEPT — own (doctrine). |
| `# Part 3 — Publish the STATE, not the NUMBER` | KEPT — own. Cites connection-origin as precedent (*country-not-IP is band-not-milliseconds*) — a citation, not the same open item. |
| `# Part 4 — Legitimate uses` | KEPT — own. |
| `# Open questions` 1–5 | KEPT — spine. |

**Pair verdict: no merge.** The two slates share a noun and a doctrine
(*capture freely, coarsen before it crosses, never persist the raw*),
not an open item — origin's `Left` is an IP read, a verb, city/region,
a persisted country and XFF hops; quality's is a band, a publish and an
ops read. Merging would put an unbuilt latency band under a
PARTIAL geo slate for no owner's benefit. Both left exactly as the
prior passes stamped them.

---

## Links

No file links to any of the six by section anchor (`…-slate.md#…`
grepped across `docs/` and `packages/`: none). Nothing retired, so no
whole-document link needs re-pointing. Files citing the three client
slates by whole-document reference (`map-slate.md`, `cms-slate.md`,
`mql-subscription-slate.md`, `prompt-stack-slate.md`, `chat-slate.md`,
`scoped-authoring-slate.md`, `reactions-slate.md`,
`author-typography-slate.md`, `message-rendering-slate.md`,
`console-filtering-slate.md`, `help-slate.md`, `wiki-slate.md`,
`interaction-philosophy.md`, `cockpit-composition.md`, `client-shell.md`,
`roadmap.md`, `README.md`) are untouched — none targets a moved clause.

## For the coordinator — cross-cluster overlaps NOT acted on (outside the six files)

- **The minimap ↔ the Navigation panel.** `docs/slates/builds/map-slate.md`
  (UNBUILT; the unlinked-5 ledger) designs a game minimap; client-cockpit-slate
  § Panel inventory → *Navigation* lists *Local sketch map* · *Compass* ·
  *Zone map* (all unbuilt) and § Non-goals says *3D rendered map — own
  project*. Same open surface in two clusters; map-slate is the larger
  design and the natural owner of the map rows, but it is not in this
  cluster. Left both; the map cluster (or the sweep) should absorb the
  Navigation rows into map-slate and leave a pointer here.
- **The tray's substrate.** `docs/slates/builds/notification-slate.md`
  (UNBUILT · a build) owns the absent-tense notification substrate; the
  client tray/chip design now sits only in client-cockpit-slate, with a
  link across. Two different layers (server substrate vs client surface),
  so not merged; when notification-slate goes to requirements its client
  surface should be read from client-cockpit-slate § Notifications.
- **"The GUI ↔ client-cockpit" / "the front door / character select".**
  Nothing in the six files duplicates a GUI or front-door item with each
  other: the front door and character select are SHIPPED pointers in
  client-shell-slate (`## Pre-world is plain UI`), and the cockpit's only
  front-door residue is the *post-intake identity verbs* item already
  flagged as contradicted by client-shell.md § Character select. Whichever
  other-cluster ledger raised these should point at client-cockpit-slate
  (the canonical) for cockpit/panel items and at `client-shell.md` (the
  doc) for the front door.
- **A working-agreement conflict, not a merge matter:**
  connection-origin-slate's open design gates the raw-IP read on
  `AccessApi.isWizard` (§ Principle, § Expose). Memory doctrine says
  *never a new isWizard check — the answer is a SEAT or no check at all*.
  Requirements for that tail should route the operator read through a
  seat (the wizard-duty / ops discipline connection-quality already cites)
  rather than the code-trust axis. Left verbatim (this pass moves and
  cuts; it does not redesign).
- **Stale spine in client-slate** (not duplication, not acted on): Open
  questions 3 and 4 were found answered by the card-surface ledger and are
  absent from `Left`; a later compaction may cut them with pointers.
