---
name: compact-slate
description: Compact one slate (or a batch) so it carries only what has yet to be built or designed — code-verified, cut-only, with every cut accounted for in a ledger. Use during the slate-compaction pass and at every /finalize sweep for the slates a build touched. Runs on Fable by project convention.
---

# Compact a slate

> **A slate carries only what has yet to be built or designed. A decision
> that shipped lives in the subsystem doc, once. If the subsystem doc
> already has it, the slate loses it. If it doesn't, the subsystem doc
> gains a compact statement of the decision and its why — never the
> conversation — and then the slate loses it.**

You are doing **bookkeeping, not editing**. The value of this pass is
that the backlog becomes an honest measure of remaining work and the
subsystem docs become the single reference for what shipped. The risk of
this pass is **silent loss of design that exists nowhere else**. Every
rule below exists to prevent that risk. When the rule and speed
conflict, the rule wins.

## Inputs

- The slate path(s) you are assigned.
- The **subsystem docs you may write to** — an explicit list. You may
  read any doc; you may **insert into only these**. A graduation that
  belongs in a doc outside your list goes to the **handoff** file
  (below), never into that doc.
- Your **ledger** file path.

## The procedure, per slate

### 1. Read the whole slate

All of it. Do not skim. Note every section heading. Note the status
block (`> **Status:** … **Left:** … **Size:** …`) — it is the claim you
are auditing.

### 2. Classify every section against the CODE, not against the slate's own claims

A slate's "✅ shipped" marker is a claim, not evidence. For each section
that describes a mechanism, **find it in the repo or fail to**:

| evidence that a thing shipped | where |
|---|---|
| a class / mixin | `packages/server/src/mud/**/*.ts`, `packages/content/*/src/**` |
| a verb | `packages/content/**/cmd/**/*.yaml` |
| a collection | `packages/server/src/schema/*.yaml` |
| content rows | `packages/content/**/content/**/*.yaml` |
| a test that exercises it | `**/__tests__/**` |
| the subsystem doc's statement of it | `docs/subsystems/<x>.md` |

Grep for the nouns the section names. Record what you found (the file
path) or that you found nothing. Then classify:

| class | meaning | action |
|---|---|---|
| **SHIPPED · DOCUMENTED** | the code exists AND the named subsystem doc states the decision (not necessarily in the slate's words) | **cut** from the slate. If the slate's remaining design refers to it, leave a one-line pointer to the doc section |
| **SHIPPED · UNDOCUMENTED** | the code exists but the subsystem doc does not carry the decision, or carries the what without the why | **graduate then cut**: INSERT a compact paragraph into the subsystem doc — the decision and its why, ≤ ~15 lines, no conversation, no "user said" — at the section it belongs in; then cut from the slate |
| **UNBUILT** | no code; the design is still open | **keep, verbatim**. Do not rewrite, tighten, or paraphrase a kept section |
| **SUPERSEDED** | the design was replaced by a later decision (another slate, a requirements doc, a subsystem doc says so) | **cut**, leaving a one-line note in the slate: *superseded by <where>* |
| **UNCERTAIN** | you cannot tell from the code whether it shipped, or whether the doc carries it | **keep**, and list it in the ledger's *Uncertain* section with what you looked for. Never cut an uncertain section |

⚠ A section may be mixed — three paragraphs shipped, one still open.
Cut at paragraph granularity, never below it. If splitting a paragraph
would be needed, keep the whole paragraph.

### 3. Cuts are cuts; inserts are inserts

⚠⚠ **The no-rewrite rule forbids PARAPHRASING a kept section. It does
not protect a section the code has falsified.** `physiology-slate`'s
layer table said four couplings were *"ALL FOUR UNREAD"* and the readers
*"designed"* sixty lines below a status block saying both shipped; the
pass saw it, wrote *"now understating what shipped — left unedited per
the no-rewrite rule"* in its ledger, and kept it. That is the
SHIPPED·DOCUMENTED case wearing a Doctrine label: **cut it with a
pointer.** Two contradicting answers in one file are worse than one
stale answer, because a reader who starts at the body believes the wrong
half — a planning agent did, four days later.

- **Never rewrite a slate.** Delete whole sections or whole paragraphs.
  Do not re-render the file from scratch, do not reflow, do not
  "improve" what stays. A wholesale rewrite silently deleted a wave's
  contents twice in this repo's history.
- **INSERT into subsystem docs; never REPLACE.** Add a paragraph (or a
  short subsection) at the right place. Do not edit existing sentences
  in a subsystem doc except to fix a statement the code proves false —
  and if you do that, the ledger says so.
- **Preserve the slate's spine**: the title, the status block, the
  framing paragraph(s) that say what the slate is for, the *See also*
  list (drop only links to things you cut), every UNBUILT section, and
  the open questions.
- **Do not touch index files**: `docs/slates/README.md`, `CLAUDE.md`,
  `docs/workflow.md`, `docs/roadmap.md`. The sweep owns those.

### 4. Re-stamp the status block

After the cuts, the status block must describe **the body that remains**:

- **Status** — `UNBUILT` (nothing shipped) · `PARTIAL` (substrate
  shipped, surface remains) · `ABSORBED` (nothing left).
- **Left** — a `·`-separated list of the named things that remain.
  **Every item must correspond to a section still in the body**, and
  every UNBUILT section in the body must be represented. If they
  disagree, the body wins — fix the list.
- **Size** — re-derived from what remains: *a build* (its own cycle) ·
  *a wave* (rides another build) · *a tail* (small, opportunistic).
  The old stamp is history, not evidence.

### 5. ABSORBED

If `Left` is empty after the pass: salvage any open questions into the
consuming subsystem doc (a short *Open* list is fine), then **delete the
slate file**. Record the deletion in the ledger with the doc that
absorbed it. A slate whose `Left` is one trivial item is still PARTIAL —
do not round down.

### 6. The ledger — every cut accounted for

Append to your ledger file, per slate:

```markdown
## <slate path>  — <before lines> → <after lines>  · Status <old> → <new>

### Cut (SHIPPED · DOCUMENTED)
- `## <section heading>` (<n> lines) — code: `<file>`; doc: `<subsystem>.md § <section>`

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## <section heading>` (<n> lines) — code: `<file>` → inserted at `<subsystem>.md § <section>` (<m> lines)

### Superseded — cut
- `## <section heading>` — by `<where>`

### Kept (UNBUILT)
- `## <section heading>`

### Uncertain — kept
- `## <section heading>` — looked for `<nouns>` in `<paths>`; found `<what>`; unsure because `<why>`

### Handoff (belongs in a doc outside my list)
- → `<subsystem>.md § <section>`: <the paragraph, verbatim>

### Status block
- Left: <old> → <new>
- Size: <old> → <new>
```

The ledger is the audit trail. A reviewer must be able to read it and
know, for every line that left the slate, where it went and why — and
recover it from git if the call was wrong.

### ⚠⚠ A slate kept back for an in-flight build is NOT compacted

When a build is in flight on a slate, the honest classification is *keep
it, this may ship next week* — and that is right. But it leaves a slate
the pass has **certified without checking**, and the certificate outlives
the exception. `physiology-slate` was compacted three minutes before the
build it was told to ignore merged; the slate then told a planning agent
weeks later that shipped work was still to build.

So an in-flight exception is a **debt, not a decision**:

1. Name it in the ledger's findings AND in the slate's status block —
   *"§ X kept pending <branch>/<MR>"* — so the next reader sees the hole.
2. **The build's own `/finalize` sweep compacts every slate it DREW
   FROM**, not just the slates it edited. A build that reads a slate and
   ships half of it has made that slate wrong; the sweep is the only
   moment anyone knows which half.
3. A slate carrying such a note is re-compacted when that build merges —
   a delta pass against the build's diff, not a redo.

⚠ The second rule is the one that actually holds, because the sweep
happens whether or not anybody remembers the slate. Rules 1 and 3 are
what make it cheap.

⚠ **Write the ledger incrementally — per slate, as each slate's cuts
land, never as one write at the end.** A wave-2 rate limit killed six
agents mid-run; two of them had already cut 660 and 1,072 lines with no
ledger written, so the whole batch was reverted and redone. An agent
that dies with a ledger dies with recoverable work; one that dies without
it dies with a patch nobody can review.

### 7. Verify before you stop

- `git diff --stat` on your files: the slate shrank, the subsystem docs
  grew by roughly what you graduated, nothing else changed.
- Every deleted heading in the diff appears in the ledger.
- The status block's `Left` and the remaining headings agree.
- No file outside your assignment is modified. **Do not commit** — the
  coordinator commits per batch after reading the ledger.

## Calibrated by the pilot (2026-09-19 — pets · external-chat-relay · lounge)

- ⚠ **Never trust a parsed "empty `Left`."** One slate wrote
  `**Left (Wave 2):**` and parsed as empty, which would have retired
  1,400 lines of live design. The key is literally `**Left:**`; fix any
  variant; and before calling anything ABSORBED, **read the body** — an
  empty stamp is a claim like any other.
- **One status block.** 184 slates carry two or three — the canonical
  one plus older narrative ones (`> **Status: sketch…`, `> **Status:
  Wave 1 SHIPPED…`). Keep the canonical block; cut the rest as history
  (they describe states that no longer hold).
- **"Shipped in a different shape" is the most common class**, not
  SHIPPED·DOCUMENTED. Adoption-by-compatibility shipped as hand-feeding
  regard; *feral* shipped as *difficult*. That is SUPERSEDED — by the
  code — and the one-line note names the doc section that describes what
  actually shipped.
- ⚠ **Kept-but-contradicted goes in Uncertain, always.** An UNBUILT
  section that now contradicts a shipped decision (the off-screen
  ladder's *Feral* vs pets.md's *difficult, not feral*) is kept verbatim
  — and the ledger's *Uncertain* entry says which shipped decision it
  contradicts, so requirements reconcile it rather than inherit it.
- **A slate whose only remainder another slate owns** becomes a pointer
  stub under the two-slates rule. Record it under *Uncertain* as
  *ABSORBED into <slate>* — the cluster pass takes it from there.
- **`Left` usually grows.** The body wins: the lounge's `Left` went from
  5 items to 11 because six open designs were in the body and
  unrepresented. That is the pass working, not a regression.

- **Answered open questions are cut with a pointer.** An *Open
  questions* entry marked resolved, whose resolution is in code and in
  the doc, is SHIPPED·DOCUMENTED like any other section: cut it, leave
  one line — *Q3 resolved: <doc § section>*. Only still-open questions
  are spine. (Wave 1 split on this; decided.)
- **Doctrine sections are kept and labelled.** A section that is neither
  shipped nor a backlog item — a thesis, a philosophy of the subsystem,
  an argument about what the design is *for* — is kept verbatim and
  listed in the ledger under a *Doctrine* heading (not *Uncertain*), so
  the coordinator can decide its home (a subsystem doc's *Why*,
  `docs/design-philosophy.md`, or the slate) in one pass rather than
  per batch. Do not add doctrine to `Left`.

## Judgment calls, decided

- **"It's good writing."** Not a reason to keep it. If it describes a
  shipped decision, the *decision* graduates and the writing goes. Git
  has the writing.
- **"The subsystem doc says it, but worse."** Cut from the slate. If the
  doc's statement is *wrong* or missing the why, that is the graduate
  case — fix by insert, note in the ledger.
- **"This shipped but in a different shape than the slate designed."**
  SUPERSEDED — by the code. Cut with a one-line note naming the doc that
  describes what actually shipped.
- **"Two slates say the same open thing."** Keep it in both for now and
  note the overlap in the ledger's *Uncertain* section. Merging clusters
  is the next pass, not this one.
- **When in doubt, keep.** An over-long slate costs nothing. A lost
  design costs a conversation nobody remembers having.

## The cluster-merge pass (after compaction)

Compaction leaves **the same open design in two files** — a slate and
its design pack, a parent and the stub the two-slates rule left, two
siblings that grew the same section. The cluster pass merges those, and
it is the one place this skill MOVES text instead of only cutting it, so
it carries a conservation rule.

**Scope: duplicated OPEN design only.** Thematic neighbours are not a
cluster. If two slates merely cite each other, touch nothing and say so
in the ledger.

Per cluster:

1. **Read every file whole.** List each file's headings.
2. **Pick the canonical owner** — the file the others name as their
   authority, else the one carrying the larger remaining design. Never
   the stub.
3. **For every section in a secondary file, one of three outcomes:**
   - **DUPLICATE** — the canonical already carries the same open item.
     Cut it from the secondary; leave a one-line pointer to the
     canonical's section. If the two versions differ in a detail, the
     detail is MOVED (below), not dropped.
   - **MOVE** — the item is open and the canonical lacks it. Cut it from
     the secondary and INSERT it **verbatim** into the canonical under a
     heading `## Absorbed from <secondary> — <original heading>` (or
     into the matching existing section, as a labelled subsection).
     Never paraphrase a moved section.
   - **KEEP** — the item is the secondary's own (not the canonical's
     subject). Stays.
4. **Retire the secondary** if nothing KEEP remains: salvage its open
   questions into the canonical, delete the file (**plain `rm`, never
   `git rm`** — a staged deletion rides into whichever sibling commit
   the coordinator makes next; the coordinator stages), re-point every
   link to it outside `docs/slates/README.md` / `roadmap.md` (those are
   the sweep's). Else re-stamp its status block to the KEEP body.
5. **Re-stamp the canonical** — `Left` gains the moved items; `Size`
   re-derived.
6. **The conservation table** in the ledger: one row per secondary
   heading — `DUPLICATE → <canonical §>` · `MOVED → <canonical §>` ·
   `KEPT`. Every heading of every secondary file must appear. A
   reviewer diffs the table against `git show` of the old file.

⚠ Do not merge a design pack into a slate that a build is currently
running from (check `git worktree list` branches) — hand it to that
build's sweep.

## The doctrine-homing pass (after the cluster merge)

Compaction labelled every kept section that is neither shipped nor a
backlog item — a thesis, a philosophy of the subsystem, an argument
about what the design is *for* — as **Doctrine**, so it could be homed
in one pass instead of per batch. The home is decided by **the status
of what the doctrine argues for**, never by how good the writing is.

| the doctrine argues for … | outcome |
|---|---|
| a mechanism that **SHIPPED**, and the subsystem doc carries the what without this why | **GRADUATE**: INSERT into the subsystem doc — verbatim or a faithful compaction (≤ ~20 lines) — as a `## Why …` section or under the existing one; then cut from the slate, one-line pointer |
| a mechanism that shipped, and the doc **already carries** the why | **DUPLICATE**: cut from the slate with a pointer |
| a **realm-level** truth whose topic a top-level doc already owns (`settlement-model.md` towns / von Thünen / the two halves / natural monopoly · `vocations.md` the demand test · `measurement.md` what may be counted · `arcane-science.md` the science · `polity-decision-register.md` a decision · `design-philosophy.md` the fidelity axis ONLY · `interaction-philosophy.md` the text medium) | **MOVE** verbatim under `## Absorbed from <slate> — <heading>` iff the doc lacks it; else DUPLICATE. ⚠ Agents do not write top-level docs — these go to the ledger's Handoff and the coordinator applies them, so two batches never insert into `settlement-model.md` at once |
| design that is **UNBUILT** | **STAYS** in the slate. It is the argument requirements will need; a reference doc must not carry the case for a thing that does not exist |
| doctrine the code or a later decision **contradicts** (⚠ in the ledger) | STAYS, with the contradiction noted beside it (usually already there under *Uncertain*) |

**No new top-level doc is minted for doctrine.** There are already three
homes (the subsystem *Why*, the topic doc, the slate); a fourth would be
where doctrine goes to be unread.

Per entry the ledger carries one row: `GRADUATED → <doc §>` ·
`DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)` · `STAYS` ·
`STAYS (contradicted)`. Every Doctrine entry of every compaction ledger
in the batch must appear.
