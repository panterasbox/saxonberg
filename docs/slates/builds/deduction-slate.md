# Deduction — the forensic-investigation quest type (sketch)

> **Status: sketch / pre-requirements.** A design pass, not a spec. Authored
> 2026-06-27 designing the EU murder arc's resolution (the Quad). Captures a
> **quest-type mechanic** + a deduction-system synthesis from prior art.
>
> **Scope discipline:** do **not** build one grand quest engine. Build a **thin
> generic quest spine** and let quest *types* bring their own mechanics. This
> slate designs **one type — forensic investigation.** Other types (fetch,
> social-negotiation, survival) would plug in different beat-meanings and
> resolutions; designing them is out of scope.
>
> **Hard line — not forums.** Investigation resolves by *demonstrated evidence*,
> not deliberation. Truth is **shown, not argued or voted.** Forums (the
> argument organizer) is for the *civic aftermath* — what the polity *does* about
> the crime — never for adjudicating *what happened.* See
> [forums.md](../../subsystems/forums.md) for that boundary.

---

## The generic quest spine (keep it this small)

A quest is a **branching narrative** with **milestones** and a **completion
condition.** The spine does not know what a milestone *means* or how completion
is judged — **the type supplies that.** Shared vocabulary only: markers exist,
branches reach them, the last one closes the quest, **threads may dangle**
(quests can complete with an unreached branch — by design).

This unifies with the scene-state-change method already adopted: **the effects
list = the milestones; the immsim pathways = the branches; over-determination =
many branches into one marker; convergence points = where branches must rejoin.**

## The forensic type: collect → assemble → reconstruct

Milestones are **findings** — *demonstrated deltas* (the "show your work"
currency), not known facts. You advance by **deriving** (`analyze` the body, the
cert, the rolls), never by asserting. The resolution is **assembly**: link
grounded findings into inferences until a conclusion **locks**, then **play back**
the reconstruction.

### Anti-spoiler — two layers, from two reference games

- **Input grounding (Golden Idol's word-bank).** You can only assert findings in
  your **casebook** — things you actually derived. A spoiler-reader's casebook is
  empty: they know the answer and can post *nothing.* Show-your-work, mechanized.
- **Cluster confirmation (Obra Dinn's batch-of-3).** A conclusion locks only when
  a *coherent cluster* of grounded links supports it — **never slot-by-slot**, so
  it can't be brute-forced by trial. You must understand the *arrangement.*

These coexist with **respect for mastery** (Outer Wilds' knowledge-as-progression):
a veteran who genuinely understands moves fast; the wall still won't accept an
*ungrounded* assertion, so speed never becomes spoiling.

### The §11 hole — a permanent empty node

The board locks everything *reachable* (method, time, cover, motive, the named
seam). The **faceless handler can't be grounded** (EU §8/§11 — an authority that
can't be authenticated). So a `theory` like *"who gave the order?"* sits **open
forever** — nothing reaches it. The case **completes with one blank**; the
reconstruction names the hand as `[unestablished]`. The thesis as a UI fact, no
special machinery — just an unreached marker.

## Scope — instance the authored case, go public only for the live stream

The resolution to the public-vs-private tension. **The content's nature decides
the board's scope**, because public collaborative deduction only has tension
where the answer is *genuinely unknown* — and on a single global wall a one-shot
mystery is unknown exactly *once* (first cohort solves it; everyone after
reenacts a finished board — trite). Three content shapes, not two:

- **Evergreen-instanced** (every party solves it fresh) → board must be
  **party-scoped** (a fresh solve needs a blank wall).
- **One-time world-event** (solved once, becomes history) → global-public works,
  but most players inherit it *solved.*
- **Regenerating stream** (new cases keep coming) → global-public stays live.

The resolution, split by job:

- **Authored cases (the Dunny murder) → party-scoped instancing.** One board,
  instanced to the investigating party. Keeps **collaborative pooling** (you
  still combine findings with friends — the multiplayer crux survives) while
  killing triteness (**your party's wall starts blank** — fresh every run). Solo
  = a board of one; co-op = pooling. The model for *every* authored forensic
  quest.
- **The global-public Quad wall → reserved for the regenerating stream.** Not one
  solved murder but a **standing homicide institution** fed by the never-ending
  kill-stream (EU §9 "the roll *is* the kill-list"; the morgue's steady corpse
  flow). Genuinely public *because* the cases are genuinely open and new —
  evergreen-via-fresh-cases, not evergreen-via-replay.

**Authored cases teach (instanced, fresh, co-op); the public board is the endgame
institution (live, evergreen).** The arc ships the first; the second is a future
system the arc *gestures at* but does not depend on.

## The synthesis (best elements, by source)

| Source | Element taken |
|---|---|
| **Golden Idol** | collected **word-bank** — assert only what you derived |
| **Obra Dinn** | **cluster/batch** confirmation — no brute-force |
| **Sherlock (Frogwares)** | **relational deduction** — pair clues into typed inferences (vs. fixed slots); **wrong/partial allowed** |
| **Ace Attorney / LA Noire** | **present-and-back** — break a cover by citing the *exact* contradiction |
| **Outer Wilds** | **auto-accreting shared knowledge map** + knowledge-as-progression |
| **Paradise Killer** | **declare readiness**, converge on partial evidence (the §11 hole's home) |
| **Batman / Ethan Carter** | the **reconstruction montage** as *reward* — never as the deduction itself |
| **Disco Elysium** → our advancement | **competence-gated derivations** — your forensic skill gates what you can `analyze` |

**One-line model:** an **auto-accreting deduction wall** (party-scoped for
authored cases, global for the live stream — see *Scope*) where you post only
**grounded findings**, **link them into typed inferences**,
conclusions **lock in coherent clusters**, covers are broken by **presenting the
contradiction**, you **declare readiness** and may finish **incomplete** (the §11
node stays empty), and a locked cluster **plays back as a reconstruction** — with
derivations **gated by forensic competence.**

## Text-native first (deduction is already text underneath)

Every graphical deduction system is a **skin over logic-of-sentences** — findings
are propositions, links are typed relations, the montage is prose. We do the
*substance* in text and own the right tools (parser, typed-edge grammar, MQL,
ProseApi). A sketch verb surface:

- **`analyze <thing>`** — derive a finding (competence-gated; our `analyze
  address`/`weather` idiom). Lands in the casebook.
- **`casebook`** — self-view (the `chronicle`/`standing`/`traits` family) of
  *your* derived findings — your word-bank. Numbered, firm/tentative.
- **`board`** (at the Quad) — the shared, live deduction wall: posted findings,
  links, **open questions**, locking theories.
- **`post <n>`** — put a grounded casebook finding on the wall (attributed).
- **`link <A> --supports|--contradicts|--implies <B>`** — typed inference edges
  (`--implies` = Golden Idol's derive-new-from-found).
- **`theory "<claim>"`** — propose a conclusion; **open** until a grounded cluster
  backs it, then **locks**.
- **`present <finding> to <npc>`** — the confrontation: cite the exact finding
  that breaks a cover → the NPC cracks → new findings drop into your casebook.
- **`reconstruct`** — on a locked cluster, generate the account as **prose**
  (ProseApi/Liquid over the linked findings) — *"Duncan died at his desk near two
  in the morning… the hand that ordered it is [unestablished]."* For an Andy-Weir,
  show-your-work, literary game, a reconstruction you can *read* beats a cutscene.

Legibility (so the CLI is playable, not opaque): **stable numbers + pronouns**
for reference (`link 2 --supports T4`), **filters as MQL projections**
(`board --open|--mine|--contradicted`), **drill-in + affordance hints**
(`board T4` shows supports/gaps).

## One command language, two surfaces

The web does **not** replace the CLI — per the standing rule (every clickable
previews its command on hover), the web board **emits the same commands** and so
*teaches* the CLI: drag a string, the command bar shows `link 2 --supports T4`.
And because the board is an **MQL-subscribed view**, it drops straight into the
existing **inspection card** (live, multiplayer-updating) and renders as the
corkboard-with-string. Same substrate: **dense-but-playable in the terminal,
spatial-and-teaching on the web.** Fifty contributors stay legible because
everyone subscribes to the live delta (no one re-reads the wall).

**The differentiator:** every deduction game listed is single-player and
graphical. The **collaborative** version was never built — partly *because*
graphics make a shared corkboard a nightmare. In **text**, a shared surface is
trivial. The medium we're "leaning into" is the one that **unlocks the
multiplayer crux.**

## Ties to existing substrates

- **Competence-gated `analyze`** → [advancement.md](../../subsystems/advancement.md)
  (forensic Disciplines gate which derivations you can attempt; bands-only).
- **Findings as knowledge** → [belief.md](../../subsystems/belief.md) /
  [chronicle.md](../../subsystems/chronicle.md) (the casebook is owned knowledge
  state; deeds vs claims provenance reused).
- **The live shared board** → [mql-subscription.md](../../subsystems/mql-subscription.md)
  + [card-surface.md](../../subsystems/card-surface.md) (the web readout for
  free).
- **The reconstruction** → [prose.md](../../subsystems/prose.md) (Liquid-templated
  prose montage).
- **The verb surface** → [command-spec.md](../../subsystems/command-spec.md)
  (YAML view + controller per verb).

## Open questions / dials

1. **Edge expressiveness** — how rich the `link` vocabulary gets (3 edges?
   weighted? confidence?) and exactly when a cluster "coheres" enough to lock.
   The Sherlock-rich vs. Obra-Dinn-legible tension. *(Lean: start with 3 typed
   edges + a simple cluster rule; expand only if play demands.)*
2. **Shared vs. per-player board.** **RESOLVED — see *Scope* above:**
   **party-scoped instancing** for authored cases (collaborative pooling without
   global triteness; solo = a board of one), **global-public reserved** for the
   regenerating live-case stream (the standing homicide institution).
3. **Wrong convergence.** How possible is a *false* lock (frame the innocent)?
   Grounding makes it hard (can't ground a false link), but the handler can seed
   plausible claims. *(Lean: possible-but-hard, with stakes — a wrong
   reconstruction is a real, recoverable outcome, not a soft-lock.)*
4. **The civic-aftermath handoff.** When (and whether) a locked case opens a
   *forums* deliberation on the response (recount / indict / reform) — the
   investigation→governance bridge. *(Defer to the forums/polity track.)*
5. **Reconstruction authoring** — is the prose montage authored per-quest
   (templated), or generated from finding-links generically? *(Lean: templated
   per-quest v1; generic later.)*

## Cross-references

- Driver / first instance: the EU murder arc — the Quad resolution
  ([eternal-university-narrative-slate.md](./eternal-university-narrative-slate.md)
  §14 evidence triangle, §8/§11 the unreachable handler) and the census form as
  the records-track **literacy primer**
  ([census-form.md](../../staging/eternal-university/experiences/census-form.md)).
- Boundary: [forums.md](../../subsystems/forums.md) (deliberation ≠ investigation
  — the civic aftermath only).
