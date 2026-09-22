# Slate compaction ledger — batch: narrative

Agent scope: `docs/slates/builds/eternal-university-narrative-slate.md`.
No subsystem docs in my insert-list (none assigned) — any graduation
goes to Handoff, verbatim, for the coordinator to place.

---

## docs/slates/builds/eternal-university-narrative-slate.md — 1072 → 1055 · Status UNBUILT → UNBUILT

This is a story bible for an entirely unauthored arc ("An Honest Count").
Verified against code: no census/enumerator/deduction-board mechanic
exists anywhere in `packages/server/src/mud` or `packages/content`
(grep for `census`, `enumerator`, `deduction` turns up only unrelated
hits — `EmptyHolderCensus` is a residency-sweep test, not the civic
census); no conviction-voting code exists; none of the named characters
(Dunny/Akhtar, Wren, Theo Brandt, Halvers) or the murder/mystery content
appear in `packages/content` — the only hits are the slate's own sibling
design docs under `docs/staging/eternal-university/`, which are staging
*design* docs, not shipped game content. So almost the entire body is
genuinely UNBUILT and stays verbatim, per the "when in doubt, keep" rule.

One paragraph was SUPERSEDED by shipped code:

### Superseded — cut
- `§14` "Forensics is a learnable discipline — it reads the mortality
  model backwards." paragraph (25 lines: the What-the-model-supports
  bullet list of Thermal/toxicology/digestion/reserves/banded-conditions,
  plus the "Honestly thin today... trauma/wound pathology... isn't there
  yet" caveat and the play-loop close) — by
  `docs/subsystems/mortality.md § ⭐⭐ Forensic examination — analyze
  postmortem`. The consequence build (MR!254) shipped `analyze postmortem`
  (`trade-medicine` pack, `AnalyzePostmortemController`): a
  readability-gated reader that **does** infer cause of death from wounds
  (`ceil(readability × wounds)` of the trauma list, worst first),
  competence-tiered (mechanism at `competent`, inferred cause at
  `proficient`, time-since-death at `expert`), backed by a graded
  `forensics` Discipline (`ActSignature`, `specializes: [medicine]`). This
  directly contradicts the slate's "detailed trauma/wound pathology...
  isn't there yet" claim — the wound-based cause inference is exactly
  that pathology reading, now shipped. Left a 6-line pointer in its place
  noting what shipped and clarifying that the arc's own use of forensics
  (the triangulation, the morgue-as-seam, the corpse-laundering plot) is
  still this slate's unbuilt design, distinct from the underlying
  mechanism.

### Kept (UNBUILT) — everything else
All of §0–§13, §14 (minus the one cut paragraph), §15–§17 stay verbatim:
the thesis, the un-genred reconciliation, the player's position, the
campus-as-polity table, the allegory-you-can-vote-on design, the census
civic-spine design (§6 — genuinely unbuilt, verified: no census code),
the deep-engine/AI-synchronicity thesis (§7), the aether's one
load-bearing property (§8 — verified NOT stated in
`docs/subsystems/augmentation.md` or `comms.md`; this is a
narrative-only invented lore fact, not a restated shipped decision), the
crime structure (§9), the victim (§10), the killer (§11), the circle/cast
(§12), the census-form-as-allegory (§13), the rest of the investigative
geography incl. the morgue/corpse-laundering plot (§14), the five
resolved structural forks (§15 — these are *narrative* decisions, not
subsystem decisions; nothing to graduate), the dependencies/deferrals
list (§16 — already a compact, correctly-marked list of shipped vs.
unbuilt substrate; nothing to further compact), and the live threads
(§17, including the roommate design, verified against
`docs/subsystems/residence.md` which lists "the roommate half" as an
open, unbuilt attach point, confirming it hasn't shipped).

### Uncertain — kept
(none)

### Handoff (belongs in a doc outside my list)
(none — no graduations; the one shipped-substrate hit was SUPERSEDED, not
SHIPPED·UNDOCUMENTED, since mortality.md already documents the decision
in more current/accurate form than the slate did)

### Judgment call — the double status block
The file opens with **two** status-shaped blockquotes: the canonical
`Status: UNBUILT` / `Left:` / `Size:` block (lines 3–16, stamped by the
`720d9db06` backlog-sort pass), immediately followed by an older
`> **Status: story bible, first pass.**` narrative block (lines 18–39)
that predates it. Per the pilot calibration ("one status block... cut
the rest as history") this looks like the textbook case for cutting the
old block outright. I did **not** cut it, because unlike the pilot's
examples (bare "Status: sketch" stamps with no unique content), this
block carries content found nowhere else in the file: the three-way
ownership split with sibling slates (*this* slate owns story/method/
reusable-engines, `eternal-university-slate` owns the place,
`onboarding-slate` owns the journey mechanics) and the Provenance note
(which characters are provisional, which names are canon-borrowed —
load-bearing context for the many `(provisional)` tags used throughout
the body). Since it doesn't contradict the canonical block (both agree
nothing is built) and losing the ownership-split framing would be a real
information loss with no paragraph-level way to salvage just that
sentence without rewriting, I kept it whole under "when in doubt, keep."
**Flagging for the coordinator** in case the batch wants a consistent
call across all double-status-block slates — this is a case where the
old block is not pure history.

### Finding — cosmetic broken-looking link text (not fixed, not a cut)
Two links' **display text** still reads `../deferred-rpg/...` (lines 343,
881) even though the deferred-rpg directory was dissolved
(`720d9db06`). The link **targets** are already correct relative paths
(`./capability-magic-slate.md`, `./alignment-religion-slate.md`,
resolving under `docs/slates/builds/`, both confirmed present) — so
these are not broken links, just stale-looking display text. Left as-is:
not a cut, not in scope for this pass's cut-only mandate.

### Status block
- Left: unchanged — every item in the canonical block's `Left:` list
  still corresponds to a section present in the body (the forensics-
  discipline item in "the investigative geography (forensics discipline,
  the morgue, corpse-laundering)" still applies: the underlying mechanism
  shipped, but the arc's narrative use of it — what this slate is
  actually tracking — is still fully unbuilt).
- Size: unchanged — "a build" (no scope reduction; one superseded
  paragraph out of ~1055 lines does not change the sizing).
