# Appendix A (re-record) — "Ratification & the Dials"

> **Re-record sequence** (see [rerecord-outline.md](./rerecord-outline.md)) — an
> **appendix, not a chapter.** After the main series + outro; the **first** appendix,
> because it establishes the frame the others fill in: **what a community sets and locks
> at ratification.** The domain appendices (Appendix B, "The Land," etc.) describe dials
> introduced here.
> Design sources: [../governance/draft-constitution.md](../governance/draft-constitution.md)
> § **Schedule of Parameters** (the itemized, change-tiered governance dials — "the
> articles are the logic; this Schedule is the configuration") + § Art. X–XI, and
> [../slates/builds/amendment-library-slate.md](../slates/builds/amendment-library-slate.md)
> (the module / "political legos" catalog). The runtime home of many parameter values is
> `mud/config/app-settings.yaml` (the storage; the Schedule is the governance-view).
> **Its own video in the playlist — length relaxed.**
>
> **⚠ Register: DESCRIPTIVE, not persuasive** (as Appendix B). Documentation of how
> ratification and the configuration work — flat, observational, precise. No reveals, no
> slogans, no narrator.
>
> **⚠ WIP:** the roster and the amendment library are still moving; the specific
> parameters/modules will change. Re-derive from the **Schedule of Parameters** and
> `amendment-library-slate.md § The catalog` before final cut. The *frame* (configuration
> vs. logic; modules + parameters; the change-tier ladder; presets; package-manager
> composition) is the stable part.

## Narration (draft — descriptive)

**[0 — what the Schedule is]**
You have read one of these before. A lease. An employment handbook. A homeowners'
association declaration. The rules pinned to a chat server. Each has the same two layers:
the rules themselves, and the settings filled in around them.

Ratification is where a community's arrangements stop being provisional and become
permanent. What it fixes is the community's **configuration** — kept in one place, a
Schedule held separate from the articles, so that the logic of the system and its settings
never tangle.

What follows is the Schedule itself: what is actually on it, how firmly each entry is held,
and the three things that were never on it at all.

**[1 — two kinds of setting, four degrees of permanence]**
There are two kinds of thing to set, and term limits show both at once. Whether the
premiership is limited at all is a **module** — a capability the community switches on,
adopted as an amendment from a vetted library or drafted fresh. How long a term runs is a
**parameter** — a number. Zero means no limit, and a community that leaves it at zero has a
premier who may hold office for as long as the chambers keep them there.

Every entry also carries a **tier**, which measures less how hard a thing is to change than
how far it is theirs at all.

A few are **eternity**: unamendable, escapable only by forking. The separation of money from
power. The co-equality of the chambers. A record that cannot be quietly rewritten.

Most of the consequential ones are **amendment-tier** — set at ratification, and afterward
movable only by a supermajority of every chamber, a mandatory deliberation period, and a
referendum of one member, one vote. The United States installed prohibition by
constitutional amendment in 1919 and removed it by another in 1933 — the same bar, used
both ways. Amendment-tier means hard to move, not moved once.

Below those, **organic** — tunable as the community goes, by the affected chamber alone:
the values nobody can honestly know in advance.

And a few are **charter**, set by the founder before any of this. We will come back to
those.

**[2 — the legislature]**
Start where bills are decided.

A bill carries when it holds a set share of a chamber's weight: the **passage threshold**.
Below a **quorum** of active members, a chamber abstains rather than deciding on behalf of
people who are not there. A bill that nobody supports does not sit forever — there is a
floor of support beneath which it lapses, and a maximum lifespan past which it dies anyway.

Then one setting with no equivalent outside a digital polity: the **clock**. Legislative
time can run in real time or in game time. A community that runs its legislature on game
time has sessions, deliberation periods and terms that all move at the speed of the world
rather than the calendar.

And one that looks like a detail and is not. The threshold is a fraction, so something has
to sit underneath it: **votes cast, or eligible weight.** The number is identical either
way. Measured against votes cast, a chamber that does not show up abstains. Measured
against eligible weight, that same absent chamber blocks — the same number producing the
opposite constitution. The number is rarely what gets contested. The denominator is.

**[3 — the judiciary]**
The judiciary is where the two kinds sit closest together.

**Due process** is a module. Switch it on and the court draws a jury of equals; leave it off
and the operator is the court. Underneath it sit the numbers that make a jury real: how many
jurors are drawn per case, how long you must have been a member to be drawable at all, and
how many extra are drawn against the ones who never show up.

Then the clocks. How long the parties have to file. How long a jury has to return a verdict.
How many levels of appeal exist. And a module that exists because those clocks can fail: a
**speedy trial** right. Cases here run asynchronously — people file, people are drawn,
people answer when they next log in — and asynchronous justice can leave somebody accused
and unresolved indefinitely. The module puts an outer bound on it.

Two more sit in the same area. **Counsel** — whether you may be represented, which is what
turns advocacy into a profession somebody practises. And a **punishment ceiling** — the
outer limit on what any sentence may do. Permanent death, total forfeiture, confinement
without end: a community settles whether those are available before it is angry enough to
want them.

**[4 — the executive]**
The executive has one setting no community may touch. The premiership is held by the
confidence of a majority of chambers, and that is eternity-tier: a community may not make
its executive independent of its legislature.

The rest it sets. Whether officers may fix their own pay — the oldest self-dealing problem
there is, and the budget lines to do it with already exist. And **succession**: what happens
when the premier is simply gone. In an online polity that is not a thought experiment. The
head of government goes linkdead, and the rule for who acts in the meantime has to exist
before the day it is needed.

**[5 — emergency, and the founder]**
Two areas the constitution leaves explicitly open, and names anyway.

**Emergency powers**, because a polity that has none invents them under pressure. The
setting is a **sunset**: how long an emergency act stands before it expires on its own. The
safeguard is not a promise of restraint. It is a number attached to the act.

And the **founder's terms**, which are charter-tier — set before ratification rather than at
it, binding from the first dollar. Two of them carry real values instead of a blank. The
founder accrues one unit of matched influence per unit of capital funded, plus one
guaranteed unit of margin. That plus-one is the whole of the founder's structural advantage,
and it is written down where anyone can read it. Beside it sits the number that ends it: the
population at which founder fiat converts to a ratified republic.

**[6 — how the library composes]**
Modules are not picked in isolation. The library **composes like a package manager**: each
carries dependencies and conflicts — property depends on a module that keeps track of who
holds what; term limits conflict with a premier-for-life module — resolved when a module is
adopted, from a vetted standard tier and a community tier used at one's own risk. Adopting
one writes it into the constitution and into the record.

**[7 — three ways to start]**
Few communities set all of this by hand. Most begin from a **preset** — a bundle assembled
for a common archetype — and adjust. A community that starts from a preset has accepted
somebody else's answer to nearly all of it, and will argue about the rest.

The presets differ along one axis: **how much authority the operator gives up.**

The **operator's table** gives up none. The jury is a pool of one. There is no economy, no
property, no term limit, and the punishment ceiling is wherever the operator puts it. It is
the arrangement a streamer already has — written down. Writing it down is the only change.

The **creator collective** gives up some. Property and expression switch on, so what a
member builds is theirs and cannot be taken away. Weight runs to labor. The operator still
holds the executive, but no longer decides what is true.

The **full republic** gives up nearly all of it. Every module on, the chambers co-equal, the
founder's hold already lapsed. The operator is a member with a job.

All three run on the same engine and offer the same capabilities. What differs between them
is not which features exist, but where authority over them sits.

**[8 — the frame this sets]**
So ratification is where the configuration is written and locked, each entry at the firmness
its tier carries. The appendices that follow take up two of its areas in depth — the land
and its scarcity, and the limits on the operator's own reach.

Three things are not on the Schedule at all. The **kernel** that holds it is not on the menu.
The **eternity** tier is on the menu and cannot be moved, only left behind. And one kind of
number is deliberately absent: a parameter configures the machine — how many jurors, what
threshold; a **bound** constrains an outcome — how fast something may accumulate, and
measured against what. Bounds are not set at ratification. Adjusting them against a running
world is the ordinary work of the legislature, and it never finishes.

What a community configures is what remains once those three are set aside — a short list
of exclusions against a long Schedule.

## Visual cue sheet

Corner / no-face throughout; explanatory schematics, flat register.

### ⭐⭐⭐ Visual thesis: ONE object, seen seven times

Every other chapter assembles a machine from parts. **This appendix has a single object —
the Schedule — and every beat is a different overlay on it.** Nothing else is drawn.

That is not a stylistic choice; it is the argument. The appendix claims the design admits
variation, and the only way to *show* that rather than assert it is for the viewer to watch
**the same panel** get filled three different ways. If the presets were drawn as three
different diagrams they would prove nothing. Drawn as one panel with different values, they
prove it without a word.

It also satisfies the generator's standing rule — *draw a structure once where it is
established; consequences get said, not re-drawn* — more literally than any chapter does.

**The build, column by column.** The panel accretes exactly like `master(level=1..5)` in
Ch 1:

| Beat | What the panel gains |
|---|---|
| 0 | it is **assembled** — the filled-in blanks of four familiar documents lift out and become it |
| 1 | rows get **typed** (switch vs. numeral) and gain a **tier badge** column |
| 2–5 | ⭐ **the panel is READ, area by area** — each beat is a crop onto real rows |
| 6 | the module rows grow **dependency arrows** between themselves |
| 7 | it is **filled three times**, side by side |
| 8 | rows are **struck** — kernel, eternity, and a greyed BOUNDS column pushed off the edge |

### ⭐⭐ Two scales, and cutting between them is the motion

Eleven areas at readable type will not fit one 1080 frame, and pretending otherwise
produces either an illegible wall or a panel so abridged it stops reading as *long*.

> **Wide = the whole Schedule at small type — legible as a panel, not as words. It carries
> BREADTH. Crop = three to five rows at full size. It carries GRAIN.**

Beats 0, 1, 7 and 8 need the wide; **beats 2–5 are one long sequence of crops**, each
landing on the rows being named. The cut between scales is what keeps the runtime moving —
there is no second subject to cut away to, and there should not be.

⭐ **Every row named in narration must be a real row, spelled as it is in the Schedule.**
`vote.threshold_basis`, `judiciary.overdraw_factor`, `emergency.sunset_period`,
`founder.majority_margin`. Not paraphrases on screen. **The machine-readable key beside the
plain-English gloss is the single strongest evidence in the video** that this is a real
configuration and not a diagram of one — and it costs nothing, because the keys already
exist.

⚠ **The one deliberate exception** is the prohibition inset at [1] — the only frame in the
appendix that is not the panel. It earns it by being the only historical evidence in the
video, and it is small and inset rather than a replacement shot.

### Per-beat

- **0 — WIDE, corner.** Four familiar documents fanned out — **lease · handbook · HOA
  declaration · server rules** — each with its rules greyed and its *filled-in settings*
  highlighted, so the two layers read before they are named. Then the same split, formal:
  **ARTICLES (the logic)** and **SCHEDULE (the configuration)**, a line marking them
  separate. A timeline tick: **provisional → [RATIFY] → committed.** Land on the whole
  Schedule at small type — the object the next seven minutes lives inside.
- **1 — CROP, no-face.** ⭐ **One row does both jobs.** Hold on the term-limit rows: a
  **switch** (is the premiership limited at all) directly above a **numeral**
  (`exec.pm_term_limit`), with the numeral reading **`0`** and a caption *no limit*. Then a
  third column slides in from the right — the **tier badge** — and the ladder is drawn as
  that column's **legend**, not its own diagram: **eternity** · **amendment** · **organic** ·
  **charter**, with one real row pinned to each rung (`exec.confidence` · 
  `vote.passage_threshold` · `judiciary.pool_size` · `founder.majority_margin`). ⭐ ⚠ On the
  amendment rung, the small **18th (1919) → 21st (1933)** inset, an arrow out and an arrow
  back. Inset, not a cutaway; the panel stays on screen.
- **2 — CROP, no-face.** The **legislature** band: `vote.passage_threshold`, `vote.quorum`,
  `bill.survival_floor`, `bill.max_lifespan` lighting as named. Then **`clock`** alone, with
  its two values — **real time / game time** — and a small clock face running at two speeds.
  ⭐ Close on the denominator: hold `vote.threshold_basis`, dim the threshold *value*, and
  swing the basis between **votes cast** and **eligible weight** while an absent chamber
  flips from *abstains* to *blocks*. Same number above, opposite outcome below.
- **3 — CROP, no-face.** The **judiciary** band, the longest hold in the video and the one
  that proves interleaving. `judiciary.pool_size` · `tenure_threshold` · **`overdraw_factor`**
  (⭐ show the overdraw literally — twelve seats, fifteen drawn, three greyed no-shows) ·
  `filing_window` · `verdict_deadline` · `appeals_depth`, with the **due process**, **speedy
  trial**, **counsel** and **punishment ceiling** module switches sitting *in the same list*,
  not in a separate column. ⭐⭐ **That adjacency is the beat's whole argument** —
  `verdict_deadline` is a number and speedy trial is a module, and they are about the same
  worry.
- **4 — CROP, no-face.** The **executive** band. `exec.confidence` carries an **eternity**
  badge and is visibly un-clickable — the only greyed row in a lit panel. Beside it the two
  live modules: **officer pay**, **succession**. On succession, a single row: *the premier is
  linkdead* → *who acts.*
- **5 — CROP, no-face.** Two bands with **[OPEN]** stamped on them, shown as open rather than
  hidden. `emergency.sunset_period` with a bar draining to zero and the act expiring on its
  own. Then the **charter** band, ⭐ **the only rows in the Schedule carrying actual values**
  — `founder.capital_match` **1**, `founder.majority_margin` **+1** — which should be lit
  differently from every blank around them, because they are the only numbers in the video
  that are not a question. Beside them `founding.ratification_threshold`, the number that
  ends the arrangement.
- **6 — CROP, no-face.** ⭐ **Still the panel — the dependencies are drawn BETWEEN ITS
  ROWS.** Arrows arc from one module row to another; one conflict mark struck between two
  (term limits ⊗ premier-for-life). A **standard / community** badge beside each. Adopting
  one writes a line into the constitution and the record — the only place in the appendix
  anything leaves the panel.
- **7 — WIDE ×3, hero, no-face.** ⭐ **One horizontal axis: AUTHORITY RETAINED BY THE
  OPERATOR**, full at the left, none at the right. The three presets sit along it as
  pre-filled Schedule panels that expand as each is named — **operator's table** (left; a
  jury pool of **1**, almost every module off) → **creator collective** (middle; property +
  expression lit, weight to labor, executive still held) → **full republic** (right; every
  module lit, chambers level, founder rows greyed *lapsed*). ⭐⭐ **The three panels must be
  visibly the SAME panel** — same rows, same order, different values. That is the whole
  proof. ⭐ **And it now pays off four minutes of teaching**: the viewer knows what a jury
  pool of 1 means because beat 3 showed them the row. Land on all three side by side.
- **8 — WIDE, corner.** ⭐ **The three-things close, built as a subtraction.** Start on the
  full Schedule lit. Grey out the **kernel** box ("not on the menu"), then the **eternity**
  rows ("only left behind"), then a third column appears beside MODULES and PARAMETERS —
  **BOUNDS**, greyed, captioned *"not set here"* with a small forward arrow marked
  *ongoing*. What stays lit at the end **is** the community's configuration — and the shot
  should read as **mostly still lit**. ⭐ The subtraction only works if the remainder is
  visibly the larger part; three greyed items beside a long lit Schedule.

### Frames to generate

Not yet built — `slide-generator.py` carries Ch 1–7 only (99 frames, `CH1`…`CH7`). This
appendix wants **one new function** and an `APXA` list, because every frame but two is the
same object at a different level:

```python
def schedule(band=None, level=0, lit=(), fill=None, strike=())
```

| Frame | Call | Beat |
|---|---|---|
| `apxa-01-docs` | *(bespoke)* four documents, settings highlighted | 0 |
| `apxa-02-split` | articles ⟷ schedule, then the wide panel | 0 |
| `apxa-03-twokinds` | `band="exec", lit=("pm_term_limit",)` — switch above numeral, `0` | 1 |
| `apxa-04-tiers` | `level=1` + the ladder legend, one real row per rung | 1 |
| `apxa-05-prohibition` | *(bespoke inset)* 18th → 21st | 1 |
| `apxa-06-legislature` | `band="vote"` | 2 |
| `apxa-07-clock` | `band="vote", lit=("clock",)` — two clock faces | 2 |
| `apxa-08-denominator` | `band="vote", lit=("threshold_basis",)` | 2 |
| `apxa-09-judiciary` | `band="judiciary"` — modules and numbers in ONE list | 3 |
| `apxa-10-overdraw` | `lit=("overdraw_factor",)` — 12 seats, 15 drawn, 3 grey | 3 |
| `apxa-11-executive` | `band="exec", strike=("confidence",)` | 4 |
| `apxa-12-open` | `band="emergency"` + `band="charter"`, **[OPEN]** stamped | 5 |
| `apxa-13-founder` | `band="charter", lit=("capital_match","majority_margin")` | 5 |
| `apxa-14-deps` | `level=2` — arrows between module rows | 6 |
| `apxa-15/16/17-preset-*` | `fill="table"\|"collective"\|"republic"` | 7 |
| `apxa-18-presets-all` | three at once on the authority axis | 7 |
| `apxa-19-subtract` | `strike=("kernel","eternity","bounds")` | 8 |

⭐ **`fill=` is the whole evidential apparatus in one keyword argument** — three calls
differing by one string is exactly the claim the beat makes, and it makes the *same panel*
guarantee structural rather than a thing the illustrator has to remember.

⭐⭐ **`band=` is what the interleave rewrite bought.** Because the narration now walks the
Schedule by area, every middle frame is *the same call with a different band* — which is
both trivially cheap to generate and the reason the video reads as one continuous document
rather than a slideshow.

⚠ Two house constraints from the generator header: **cam keep-out** (nothing load-bearing
past `x>1500 AND y>820` — the three-panel frame at [7] runs wide and will need checking),
and **no `fill-opacity`** (ImageMagick drops it) — so "dimmed" rows must be a *colour*
change (`DIM`/`DIMB`), never transparency. Both bite this appendix harder than any chapter,
since it is nothing but dimmed and lit rows.

## Notes

- **⭐⭐⭐ RESTRUCTURED 2026-08-04 — INTERLEAVED BY AREA. The taxonomy was eating the video.**
  > **User: "I feel like there's at most a couple of minutes of real content here. I was
  > expecting to see real amendments and real params — just things straightforward enough
  > that they don't need their own video."**

  ⚠ **Measured, and correct: ~900 of 1130 words were *about* the configuration; ~170 were
  actual settings.** It was a video about a menu that never showed the menu. Modules-vs-
  parameters and the four tiers ran **two and a half minutes before a single real row
  appeared** — and both are self-evident *once you have seen real rows*, so they were
  spending the viewer's attention to teach what the examples would have taught for free.

  **The rewrite inverts the ratio** (user's call: *"interleave them"*). Modules and
  parameters are no longer taught as two categories and then illustrated; they are walked
  **together, area by area**, because that is how a community actually meets them. Six beats
  became nine; the middle four (**legislature · judiciary · executive · emergency+founder**)
  are new and are nothing but real rows.

  > ⭐⭐ **The spine that fell out of it: the Schedule is the QUESTIONS, the presets are three
  > sets of ANSWERS.** Almost no row carries a value — they read *set at ratification* or
  > *calibrate at launch*. That looked like a problem and is the structure: walk the real
  > rows so the viewer learns what is being asked, *then* fill the same panel three ways.
  > **The presets beat now lands on someone who knows what a jury pool of 1 means**, instead
  > of on someone who has been told a taxonomy.

  ⭐ **[3 judiciary] is where interleaving proves itself** and should be the longest hold:
  `judiciary.verdict_deadline` is a **number** and **speedy trial** is a **module**, they sit
  in the same list, and they are about the same worry. Two separate passes could not have
  shown that.
- **⭐ The filter applied — "no setup beyond Ch 1–7."** Selected from the real inventory (30
  Schedule rows + ~25 library entries), not invented:
  - ⭐⭐ **`clock`** (legislative time in real time or game time) — *no equivalent outside a
    digital polity*, instantly graspable, and it was **absent from every prior draft**.
  - ⭐⭐ **`judiciary.overdraw_factor`** (extra jurors drawn against no-shows) — mundane,
    which is the point: **nobody invents an overdraw factor for a pitch deck.**
  - ⭐⭐ **`emergency.sunset_period`** — turns the unexplained scary area into a concrete
    safeguard. *The parameter IS the check.*
  - ⭐⭐ **`founder.capital_match` = 1 / `founder.majority_margin` = +1** — the **only two rows
    in the entire Schedule carrying actual values.** The +1 is the most concrete moment in
    the video and Ch 7 already set it up.
  - **`exec.pm_term_limit`** (`0 = none` — a term limit is a number and zero is a dictator),
    `judiciary.tenure_threshold` (a direct callback to Ch 7's *the founder is the most senior
    citizen there is*), `amend.cooling_period`, `bill.survival_floor`/`max_lifespan`,
    `founding.ratification_threshold`.
  - **Modules:** succession (⭐⭐ *"the PM goes linkdead"* — real, faintly funny, obviously
    necessary, zero setup), punishment ceiling, speedy trial, counsel, officer pay.
  - ⚠ **Rejected as needing their own video:** the influence curves, `vote.build_period`/
    `decay_rate`, both merit rows, `bill.renewal_bar`, `abatement.cure_window`; press,
    religion, arms, and **everything requiring localities — including the 14th, which the
    slate calls "structurally the biggest."** That one is a casualty of ordering, not of
    interest, and it is the strongest argument for a localities appendix later.
- **⚠ Length: 1447 words ≈ 10.0 min @145wpm (11.1 @130)** — up from 1130, and **by far the
  longest in the series** (Ch 1 = 1004, Appendix B = 840). Deliberate: the ratio is now
  roughly **60% concrete settings**, inverted from ~15%. *A ten-minute video that is mostly
  real rows beats a seven-minute one that is mostly framing* — but this is over budget and
  should be defended or cut, not drifted into. **Cut candidates, cheapest first:** the
  prohibition/repeal inset (~28w, the only non-panel frame); [6] package-manager as a
  standalone beat (~70w — folds into [1] at a cost the user has twice declined); [5]'s
  emergency half (~60w, though it is the only place the [OPEN] areas get honest treatment). ⚠ **Over the house budget and knowingly so** — Ch 1 is 1004 and Appendix B 840, so
  **~900 words ≈ 6–7 min in five beats** is the rhythm everywhere else. A runs long because
  it is the only appendix carrying an **evidential** job rather than an explanatory one, and
  the presets beat is that evidence. *(An earlier note here read "939," a stale figure from
  before the presets split; corrected.)*
- **⭐⭐ Register pass 2026-08-04 — A is B's sibling, and B's rule governs.** Appendix B's
  brief is explicit: *no dramatic reveals, no narrator, no slogan kickers.* The presets
  rewrite had drifted persuasive. **Four lines flattened**, none of them losing payload:
  - *"The more useful question, though…"* → **"But the configuration is only half of what
    ratification settles"** — the thesis stated, not the narrator ranking questions.
  - *"Same engine. Three worlds. The difference is not features — it is where authority
    sits."* → one sentence, same content. ⭐ **The fragment triad was the clearest breach in
    the file** — B forbids exactly this shape, and the visual (three identical panels) makes
    the point without the rhythm helping.
  - *"What is worth noticing is where the arguments will actually happen"* — **cut whole**;
    it announced the denominator line instead of letting it land, and the line is stronger
    unannounced. *"The last of those is not a detail"* → the flat verb.
  - *"The list of exclusions is short. The Schedule is long."* → **"a short list of
    exclusions against a long Schedule"** — the proportion survives, the kicker cadence does
    not.

  ⚠ **Second person is KEPT** at [0] (*"You have read one of these before"*). B is strictly
  impersonal, but Ch 1–7 address the viewer throughout, and A opens the appendix set — the
  familiarity hook is the one place it earns its keep. This is the deliberate seam between
  A's register and B's.
- **⭐⭐⭐ NEW-CONCEPT AUDIT 2026-08-04 — every noun in the narration checked against Ch 1–7,
  Appendix B, *and* the draft constitution.** The question was whether A drops specialized
  systems on a viewer with no grounding. ⚠ **The finding was not what the audit was looking
  for.** Three things I expected to be gaps were correct in the constitution and *thin in
  the videos instead*; the real problem was a **list**:
  - ⭐⭐ **[3] enumerated ELEVEN areas in one breath, and that sentence was where every
    unexplained concept was hiding.** Spoken aloud, each one-word area is a promise:
    *recognition* (an opaque rename of the Schedule's **Merit**), *membership*, *emergency
    powers*, *the information rules* — plus **land and economy**. ⚠⚠ And the enumeration
    **outran its own source**: the real Schedule has **nine** sections, two of them marked
    **[OPEN]** in the constitution (Membership, Emergency); *land and economy*, *information*
    and *the operator* **are not in the Schedule at all**. The doc's own header warned
    *"re-derive from the Schedule of Parameters before final cut"* and that had not been done.
    > ⭐⭐⭐ **The fix is subtraction, not explanation.** The cue sheet already splits
    > **breadth (wide) from grain (crop)** — so the panel may show eleven areas harmlessly,
    > and the narration should never have read them aloud. It now names the five the series
    > has walked and hands **the land** and **the operator** to the two appendices that
    > actually exist (B and X). *Six unexplained concepts removed, no length added, and the
    > wide/crop design does real work instead of being contradicted by its own script.*
  - ⚠ **"property depends on a records module"** [5] — faithful to the slate (*Property may
    depend on a Records/Privacy module*) but **unsayable in this series**: Ch 6 spent a whole
    chapter making "the record" mean the tamper-evident governance archive, which Art. X §3
    makes an **eternity clause**. "A records module" therefore reads as *the record can be
    switched off.* Reworded to *"a module that keeps track of who holds what."*
  - ⚠ **"weight runs to producers"** [4] → **"to labor."** The locked spine is
    labor/capital/consumer; *producer* lives only in Ch 3's notes, and Ch 1's notes warn
    explicitly to lead with the spine, not the gloss.
  - ⚠ **"the influence curves, the decay rates"** [2] → **"how fast standing decays, how long
    a bill may sit unpassed."** *Influence* is the constitution's word; **the videos' word is
    "standing"** (23 occurrences across the narrations, vs. one stray *influence*). Both
    values are real (`influence.cap_curve`, `vote.decay_rate`, both organic ✅) — only the
    vocabulary was off, and the rewrite makes decay self-explaining rather than named.
  - ⚠ **"the reserve and central bank"** [1] → **"its treasury and central bank."** Ch 5
    establishes the central bank; *reserve* was unglossed. Art. VIII is **the Treasury**.
  - ⭐ **"eternity" gained the record.** Art. X §3 lists Article I, the firewall, co-equality,
    **and the tamper-evidence of the record**. A named only the first two — so the one
    eternity clause the series has *already spent a chapter on* was the one missing. Adding
    it costs six words and converts a new-sounding tier into a callback to Ch 6.
  - ✅ **Checked and CORRECT, against my own expectation:** *referendum* (Art. X §2 —
    supermajority of every chamber, sustained through a deliberation period, **plus a
    one-member-one-vote referendum**), *franchise* (Art. II; a Schedule section), and A's
    *eternity* examples. ⚠⚠ **In each case A is right and CH 7 IS THE THIN ONE** — Ch 7 gives
    the amendment bar as *"a supermajority across every chamber to enact — and the same to
    repeal,"* omitting both the deliberation period and the referendum. **Fix belongs in
    Ch 7, not here.** See [[audit-authored-factual-claims]]: the confident reading was wrong
    three times, and ninety seconds in the constitution settled it each time.
  - ⚠ **Left alone, flagged: "membership" vs "citizens."** Art. II distinguishes them (a
    member past the participation threshold **is** a citizen), Ch 7's narration says
    *citizens*, the locked jargon says *members*. A pre-existing series-wide tangle, not A's
    to settle.
  - ✅ **"Land use" was never in this script** — the specific fear. A says *"how land is
    held"* [1] and now hands the area to Appendix B by name. Statutory land use is
    balance-slate material and does not appear.
- **Register: descriptive** (matches Appendix B) — documentation, not advocacy. The
  prohibition/repeal beat stays inside it: it documents the mechanism working, it is not a
  flourish.
- **⭐⭐ THESIS ROTATED 2026-08-04 — the subject is the BOUNDARY OF CHOICE, not the
  settings.** The draft read as a configuration manual: articles-vs-Schedule,
  modules-vs-parameters, presets-as-distros, package-manager, kernel. All true, and it is
  the **mechanism** — but it occupied the slot where the *what-this-is-about* belongs, at
  three costs: it casts the viewer as an **operator** rather than a member; it makes politics
  sound **already solved** (a menu, when the denominator line says the opposite); and it
  implies a **setup phase that ends**, which the bound handoff contradicts.

  > **Ratification is where a community finds out how much is actually theirs to decide.**

  ⭐ The structure was already this — it *closes* on the kernel, calls eternity "the floor,"
  and now adds bounds as never-settled. **Three things sit outside the community's control
  and they are the emphatic beats; the configuration is the remainder.** That also aligns A
  with the appendix spine (*chapters are the machine; appendices are what it may and may not
  do to you*) — A is the first appendix and should establish that frame, not a different one.

  **Cost: four framing sentences.** Every worked example, both presets, the tier ladder, the
  prohibition beat and ⭐ **the package-manager beat survive untouched** (user's call — it is
  the most distinctive thirty seconds in the video).
- **Also cut**: [1] used a jury to illustrate *parameters*, which [3] then walked properly as
  a worked row. Same list twice — [1] now leads on the bill and keeps one clause of jury.
- **⭐ Revised 2026-08-04.** Four changes: a familiarity opener ([0] — the two layers are
  legible from a lease before they are named); prohibition/repeal as the concrete
  amendment-tier case ([2]); **[3] cut from 287 words to 176** — the cue sheet already
  showed all nine areas, so the narration was reading its own visual aloud, and now walks
  two rows while the panel carries the rest; and the **parameter/bound handoff** at [5].
- **⭐⭐ Parameter vs. bound** (from
  [balance-slate](../slates/builds/balance-slate.md)): a **parameter** configures the machine
  and is read by the runtime; a **bound** constrains an outcome and is checked by the sweep.
  **Only the first is set at ratification.** Bounds are the legislature's ongoing work — which
  *narrows* this appendix's scope rather than widening it, and supplies the handoff.
- **⭐ The denominator line** ([3]) is the one that gives the tour stakes: the contested
  choice is almost never the number, it is what the number is measured against.
- **Two new panel rows**, from the 2026-08-04 law-source hunt: **information** (transparency
  and classification, private association, unlink, expungement) and **the operator** (wizard
  duty, break-glass, the code-trust chain — see
  [wizard-duty-slate](../slates/builds/wizard-duty-slate.md)). ⚠ The operator row being
  absent until now was itself a statement.
- **Grounded on the Schedule of Parameters** (draft-constitution § 463) — the real,
  change-tiered dial list — *plus* the amendment-library modules. **Two-layer** framing
  (modules = capabilities installed; parameters = the numbers set) and the **change-tier
  ladder** (eternity / amendment / organic / charter) are the spine. This supersedes the
  first draft, which walked only the conceptual modules.
- **AppSettings is the storage, not the video subject.** Many Schedule "calibrate-at-launch"
  rows live in `mud/config/app-settings.yaml` (`renown.*`, `participation.*`, `producer.*`,
  `conviction.buildPeriodSeconds`, `influence.bandThresholds`, `script.*`, `banking.*`,
  `residency.*`). The Schedule is the governance-view (with tiers); the yaml is where values
  sit. Narration stays at the Schedule level.
- **This is the FRAME appendix** — establishes "these are things set at ratification," so
  each domain appendix (B = the Land; future = courts, economy) opens "this is a dial from
  Appendix A." Keep A first.
- **Ties to Ch 7:** Ch 7 established ratification + the amendment roster + "each amendment is
  a notch on the dial." This appendix is that configuration, itemized and tiered. Don't
  re-explain the *why* of ratification (Ch 7) — just the *contents* and *how firmly* each
  locks.
- **Prior-art beat available if wanted** (from the slate): the CC license chooser + package
  registries (npm/apt/Nix) as the "governance-as-config" ergonomic; ALEC model bills as the
  *caution* (pre-drafted law as a capture vector — curation + transparency the antidote).
  Left out to stay tight.
- **Tense honesty — for the EDITOR, not a viewer disclaimer.** The Schedule, the amendment
  library, presets and package-manager composition are **designed, not built** (a small v1
  slice is buildable — see the slate); values are set-at-ratification / calibrated-at-launch,
  not fixed in the doc. ⚠ **But do not hedge this in narration.** The whole series is a
  design explainer — Ch 1–7 describe a constitution that is not built either — so a
  build-state caveat here would be inconsistent with its siblings and would undersell the
  claim. *(User, 2026-08-04: "when I say proof it doesn't actually need to be built — the
  proof of the design. It's all going to get built before anyone tries to boot any of this
  up.")*
- **⭐⭐ Publishing purpose (user, 2026-08-04): A may ship shortly after the main series,
  ahead of the other appendices, because it "validates the promise of a not-one-size-fits-all
  solution with evidence."** Two consequences worth holding:
  - **What A proves is that the DESIGN ADMITS VARIATION** — demonstrable from the design
    alone, and it is the actual claim being made.
  - ⭐ **The presets are the evidence, and now have their own beat** (2026-08-04, user's
    call). Split out of the old combined [4]: presets **75s**, composition **26s**. They are
    organised on **one axis — how much authority the operator gives up** — which is the same
    dial Ch 1 closes on, so the beat pays off a thread rather than introducing one. Paid for
    by cutting [2]'s recap sentence (a restatement of the list immediately above it) and by
    [2] falling 110s → 98s.
  - ⭐ **The close must read as latitude, not restriction** — hence "the list of exclusions is
    short; the Schedule is long," and the cue-sheet note that the final shot should be
    **mostly still lit.**
