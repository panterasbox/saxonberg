# Cluster-merge ledger — senses

Pass: slate cluster-merge (after compaction), per
`.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass.
Branch `design/slate-cluster-merge`, 2026-09-21.

**Scope: duplicated OPEN design only.** Thematic neighbours are not a
cluster; a file that merely cites another is touched only to re-point a
link.

## Files read whole

| file | lines | headings |
|---|---|---|
| `docs/slates/tails/senses-slate.md` | 766 | 35 |
| `docs/slates/tails/distance-perception-slate.md` | 96 | 3 |
| `docs/slates/tails/scope-modality-slate.md` | 176 | 9 |
| `docs/slates/tails/language-slate.md` | 464 | 32 |
| `docs/slates/tails/spoiler-slate.md` | 221 | 12 |

Shipped references consulted: `docs/subsystems/senses.md` (§ Single-sense
verbs — *`--peek` not yet supported*; § What's NOT in this build — the
Wave-2+ deferred list), `perception.md`, `perceiver.md`, `concealment.md`,
`ranged.md` (§ Cross-room fire — *sight may cross a vista; combat may not*),
`comms.md` § Deferred (*Language gating … routes to the language slate*),
`wiki.md`; `docs/slates/builds/legibility-slate.md` (grepped for peek /
vista / danger / transparent / container / modality — none of this
cluster's open items are in it beyond the `sense`→`look` cut the senses
slate already records); `docs/plans/slate-compaction/cluster-chat.md`
(the chat pass's ruling: **comms-slate owns language-on-the-implant,
language-slate owns comprehension**, neither merged).

No build worktree runs from any file in this cluster (`git worktree
list`: economic-bootstrap · fishing · treatment · one detached).

## Canonical

**`senses-slate.md`** — the largest remaining design by an order of
magnitude, and the file the others name as the substrate they extend
(distance-perception's cross-references: *the Wave-2+ deferred list this
tail extends*; spoiler's *See also*: *the percept revelation-condition
model this extends*). Not a stub.

## Finding

The cluster is **four thematic neighbours around one canonical, not four
duplicates of it.** Every open item in the four secondaries is the
secondary's own subject — reach across exits, MQL scope per modality,
language comprehension, secret-gating — and appears nowhere in the senses
slate's body. Two one-line MENTIONS in the canonical name an item whose
design lives in a secondary (or in comms-slate, outside the cluster); those
two lines are the whole overlap, and they are resolved by pointer edits in
the canonical, not by moves.

## Canonical edits — `senses-slate.md` (766 → 772 lines)

Two pointer edits and one `Left` re-stamp; no section moved in or out,
no body paragraph changed.

| where | edit | why |
|---|---|---|
| status block `Left` | **cut** `the verbal channel's language gate` | the same open item is carried by two other slates: comms-slate § Implant family (*Language still applies*, lean (ii) — the transport half; ruled the owner by the chat cluster pass) and language-slate § Layer 5 (comprehension). Three files carried one item; the senses slate's version was a mention, never a design. The ESP table cell (*language-gated*) and the § What this stresses bullet stay in the body — they describe the channel, not the backlog. |
| § Open questions Q11 | **+ pointer** naming comms-slate § Implant family and language-slate § Layer 5 as the design's owners | the sentence already said *still unbuilt — comms.md § Deferred*; the reader now finds the open design. |
| § Single-sense verbs | **+ pointer** to distance-perception-slate § The four patterns (pattern 2) after the existing `--peek` one-liner | the canonical's one-liner (*`--peek` still land per content demand*) is a mention of an item whose design lives in the secondary. The design stays where it is (KEPT, below); the canonical now says so instead of looking like the owner. |

**Status block after:** Status PARTIAL (unchanged) · Left: one item
fewer (24 → 23 `·` separators; the language gate leaves, every remaining
item still has its body section) · Size: a build (unchanged).

---

## `docs/slates/tails/distance-perception-slate.md` — 96 → 96 · UNBUILT → UNBUILT (unchanged)

Verdict: **KEPT whole.** Nothing in it is duplicated in the canonical.
The canonical's only touch-point is the `--peek` mention (now
re-pointed). The four patterns are the `look`-across-exits surface, not
channel physics; the senses slate's body has no vista, peek, privileged
reach or danger-sense design.

### Conservation table

| secondary heading | outcome |
|---|---|
| *(title + status block + framing + seeding facts, lines 1–33)* | KEPT — spine |
| `## The four patterns` (1 vista references · 2 bounded peek · 3 privileged reach · 4 danger-sense baseline) | KEPT — the secondary's own. Canonical carries only *`--peek` … land per content demand* (senses.md § What's NOT in this build says the same); no design there to be a duplicate of. Canonical now points here for pattern 2. |
| `## Interim authoring rule (adopted now, in the demo-content build)` | KEPT — its own; recorded as a constraint in `demo-content-requirements.md`, not in the canonical. |
| `## Cross-references` | KEPT — spine |

### For the coordinator

- ⚠ One **stale seeding fact**, left as is (the cluster pass moves and
  cuts duplicates; it does not correct): *"`sense` auto-fires on entry —
  one room too late for danger."* `sense` is cut by legibility-slate
  § Part D; `look` is the arrival verb. The point (arrival is one room
  too late) survives the rename; the verb name does not.
- `ranged.md` § Cross-room fire already states *sight may cross a vista;
  combat may not* — a shipped constraint pattern 1 will have to honour.
  Noted, not inserted (senses/ranged docs are not in my write list and
  it is a constraint on an UNBUILT item, not a graduation).

---

## `docs/slates/tails/scope-modality-slate.md` — 176 → 176 · PARTIAL → PARTIAL (unchanged)

Verdict: **KEPT whole; untouched.** Not a duplicate of anything in the
canonical — it is an MQL / command-routing design (a verb's target
scope per modality; container permeability per modality; transparent
containers; the modality-general feasibility validator). The word
*modality* is the only thing it shares with the senses slate; the
shipped `Modality` singletons are the substrate both consume. It does
not even cite the senses slate. Compacted 2026-09-19
(`docs/plans/slate-compaction/mql.md`); its status block already
matches its body.

### Conservation table

| secondary heading | outcome |
|---|---|
| *(title + status block + surfaced-by/touches/sequencing block)* | KEPT — spine |
| `## The premise` | KEPT — its own (the `tally`-through-glass and cake-in-a-bag cases) |
| `## Principle 1 — modality-scoped scope, per-modality permeability` | KEPT — its own; no counterpart in the canonical |
| `### The scope logic is used two ways` | KEPT — its own |
| `## Principle 2 — resolution ≠ feasibility (you can't assume anything)` | KEPT — already a shipped-pointer stub from compaction |
| `## What this needs built (the surface)` | KEPT — its own (the four bullets are its `Left`) |
| `### Likely already-there vs. gap (verify at planning)` | KEPT — its own |
| `## Consumers (why it's foundational, not a clipboard appendix)` | KEPT — its own |
| `## Sequencing — "on its own, or wait until we need it?"` | KEPT — its own |
| `## Open questions` (Q1–Q4) | KEPT — its own; none of the four is asked in the canonical |

---

## `docs/slates/tails/language-slate.md` — 464 → 464 · PARTIAL → PARTIAL (unchanged)

Verdict: **KEPT whole; untouched.** Language is its own subject. The one
genuinely shared open item — *the verbal channel's language gate* — was
carried by the **canonical** as a `Left` mention with no design behind
it, so the cut fell on the canonical's `Left` (above), with a pointer to
this slate's § Layer 5 and to comms-slate § Implant family. Consistent
with the chat cluster's ruling (`cluster-chat.md`: comms owns
language-on-the-implant, language-slate owns comprehension, pointer
only).

### Conservation table

| secondary heading | outcome |
|---|---|
| *(title + status block + 2026-08-08 audit block + framing + See also)* | KEPT — spine |
| `## Principle` | KEPT — its own |
| `## Layered design` | KEPT — its own |
| `## Layer 1 — `Language` singleton` · `### v1 roster` · `### Property axis` · `### `common` is special` | KEPT — its own (⚠ the `/lib/language/<name>` rows must move — already flagged in its own `Left`) |
| `## Layer 2 — NPC speaker tag` · `### Open question: does `Vocal` actually own this?` | KEPT — its own |
| `## Layer 3 — Readable tag` | KEPT — shipped-pointer stub from compaction |
| `## Layer 4 — Character proficiency` · `### Proficiency values` · `### Defaults via Species` · `### `common` is implicit` | KEPT — its own. (The canonical's *organ on `BodyPlan`* pattern is a different field; `BodyPlan.nativeLanguages` is not a duplicate of it.) |
| `## Layer 5 — Render gate` · `### Speech gate (NPC utterances)` · `### Read gate (Readable text)` · `### Partial-comprehension extension (deferred)` | KEPT — its own. **This is the design the canonical's `Left` item pointed at without carrying**; the canonical now cites it (Q11). |
| `## The `read` verb` | KEPT — shipped-pointer stub from compaction |
| `## Pedagogical surfaces` · `### Real languages as in-game Readables` · `### Register-tagged English content` (superseded stub) · `### Translation tools as content` | KEPT — its own |
| `## What ships in this slate` | KEPT — spine |
| `## Open questions` Q1 · Q2 · Q3 · Q4 · Q5 · Q6 (superseded stub) · Q7 | KEPT — its own. ⚠ **Q2 (player speech opting into the gate; lean *yes, deferred*, default player utterances language-null) sits against the canonical's ESP table, which reads the verbal ESP channel (DM, chat) as *language-gated*, and against comms-slate's lean (ii).** Not a duplicate — a **tension** between three slates on whether player-to-player text is ever language-gated; left for requirements, recorded here so it is inherited as a question, not a premise. |
| `## What this slate does NOT cover` | KEPT — spine (*Player-to-player speech … not language-gated* is the same tension as Q2) |
| `## Once shaped into formal requirements` | KEPT — spine |

---

## `docs/slates/tails/spoiler-slate.md` — 221 → 221 · PARTIAL → PARTIAL (unchanged)

Verdict: **KEPT whole; untouched.** Its own subject (secret tags,
reveal conditions, server-side fact-gating, the choice-guard outside the
wiki). It *extends* the percept revelation-condition model, which is
shipped substrate (perception.md § The three layers), not an open item
in the canonical; no senses-slate section describes a reveal condition,
a role gate or a choice-guard.

### Conservation table

| secondary heading | outcome |
|---|---|
| *(title + status block + the four load-bearing decisions + See also)* | KEPT — spine |
| `## Principle` | KEPT — its own |
| `## The model` · `### Content marks secrets + their reveal condition` · `### Server-side fact-gating (the enforcement)` · `### The player choice-guard (opt-in)` · `### Role-conditioned reveals` | KEPT — its own |
| `## Assessment integrity — flagged, *not solved here*` | KEPT — its own (owned elsewhere, flagged) |
| `## What this reveals / needs` | KEPT — its own |
| `## Open questions / forks` Q1 (confirmed) · Q2 · Q3 (resolved-by-wiki stub) · Q4 · Q5 | KEPT — its own |
| `## Build order` | KEPT — its own |
| `## What this slate does NOT cover` | KEPT — spine |
| `## Once shaped into formal requirements` | KEPT — spine |

### For the coordinator

- Its *See also* first bullet points at `senses-slate.md` for *the
  percept revelation-condition model this extends*. That model is no
  longer in the senses slate (compaction sent it to perception.md § The
  three layers and card-surface.md); the link is live but leads to a
  file that lacks the section. A one-line re-point to perception.md
  would fix it; left alone because it is a stale cite in a KEPT file,
  not a duplicate, and the sweep can take it.

---

## Retirements

None. No secondary lost a KEEP section, so no file is deleted and no
inbound link needs re-pointing.

## Net

| file | before | after | Status | Left | Size |
|---|---|---|---|---|---|
| senses-slate.md (canonical) | 766 | 772 | PARTIAL | −1 item (the language gate → comms-slate / language-slate) | a build (unchanged) |
| distance-perception-slate.md | 96 | 96 | UNBUILT | 4 (unchanged) | a wave |
| scope-modality-slate.md | 176 | 176 | PARTIAL | 4 (unchanged) | a wave |
| language-slate.md | 464 | 464 | PARTIAL | 8 (unchanged) | a wave |
| spoiler-slate.md | 221 | 221 | PARTIAL | 6 (unchanged) | a wave |

## Decisions the coordinator may want to make

1. **Whether to fold distance-perception into senses anyway.** The
   skill's rule says no (nothing duplicated → not a cluster); the
   coordinator's brief called senses *the likely canonical for
   perception physics*. If one perception file is wanted, the whole of
   distance-perception moves verbatim under `## Absorbed from
   distance-perception-slate — The four patterns` (+ the interim rule)
   and the tail retires; it is a clean 60-line move. Inbound links to
   re-point if so (verified by grep, index files excluded):
   `docs/requirements/demo-content-requirements.md`, the canonical's new
   § Single-sense verbs pointer, and the compaction ledger
   `unlinked-9.md` (history — leave). I did not do it: the item is
   `look`-surface, not channel physics, and it has its own honest stamp.
2. **The player-speech language-gate tension** (language Q2 ↔ senses ESP
   table ↔ comms lean (ii)) — three slates, one unasked question:
   *is player-to-player text ever language-gated?* Belongs in whichever
   requirements session opens first (comms or language).
