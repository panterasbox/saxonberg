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

**[0 — what ratification fixes]**
Ratification is where a community's arrangements stop being provisional and become
permanent. What it fixes is the community's **configuration** — and the constitution keeps
that configuration in one place, a Schedule of parameters held separate from the articles,
so that the logic of the system and its settings never tangle. This appendix is a tour of
that configuration: what gets set, and how firmly.

**[1 — two kinds of setting]**
There are two kinds of thing to set. The first is **modules** — which capabilities a
community switches on. The kernel builds every tool once; a module decides whether a given
tool is bound by rules or left to the operator's discretion. Switch on due process, and
the court draws a jury of equals rather than the operator alone. Switch on an economy, and
the reserve and central bank come online. There are modules for property, for expression,
for how land is held, for term limits. Adopting one is an amendment; a community picks from
a vetted library or drafts its own.

The second is **parameters** — the numbers. Not *whether* the court draws a jury, but how
many jurors, how long they have, how many levels of appeal. Not *whether* a bill can pass,
but what share it must carry and what quorum makes the vote count. Every such value lives
in the Schedule, named once.

**[2 — how firmly each is fixed]**
The settings do not all lock the same way. Each carries a **tier** — how hard it is to
change after ratification.

Some are **eternity**: they cannot be amended at all, only left behind by forking. These
are not really dials — the separation of money from power, the co-equality of the
chambers. The floor.

Some are **amendment-tier**: set at ratification, and afterward movable only by a
supermajority of every chamber and a referendum. The long-term commitments — the vote
thresholds, the term limits, the franchise, the point at which the founder's fiat gives
way.

Some are **organic**: tunable as the community goes, by a supermajority of the affected
chamber alone. These are the game-balance values — the influence curves, the decay rates,
a bill's lifespan — meant to be adjusted against a running world, never honestly knowable
in advance.

A few are **charter**: set by the founder at the outset — the terms of the founder's own
diminishing hold.

So "the dials a community locks at ratification" is really three things at once: a floor it
cannot move, commitments it sets for the long term, and settings it keeps adjusting.

**[3 — the configuration, by area]**
Laid out by area, the configuration covers:

**Voting** — how a vote is weighted and what carries it: the passage threshold, the quorum
below which a chamber abstains, whether the threshold is measured against votes cast or
eligible weight, how long a position must be held to reach full conviction weight, and
whether the legislative clock runs in game-time or real-time.

**The executive** — the confidence required to hold the premiership, and the limit, if
any, on how long anyone may hold it.

**The judiciary** — who is drawn into a jury (the pool, from the operator alone toward full
sortition), how many, how long they have to file a case and to reach a verdict, how many
levels of appeal exist, and how long live content has to cure a fault before it goes dark.

**Legislation** — what it takes to table a bill, the support below which it lapses, how
long it may sit unpassed, and what a renewal must carry to extend it.

**Recognition** — the cap on how far renown may multiply a consumer's earned influence, and
the size of the producer merit-pay bank.

**Membership** — the participation that turns a visitor into a citizen (the franchise
itself), and the population at which founder-fiat converts to a ratified republic.

**Emergency** — how long an emergency act stands before it expires on its own, and the
terms of its after-the-fact review.

**The founder** — the matched capital and the margin that guarantee a working majority
while the founder's hold lasts.

**Land and economy** — whether private estates are permitted and how the one scarcity is
allocated (the tenure-and-compute module, the subject of Appendix B), and whether a reserve
and central bank run at all.

**[4 — presets and composition]**
Few communities set all of this by hand. Most begin from a **preset** — a bundle assembled
for a common archetype — and adjust. The **operator's table** is the default made explicit:
the court at a jury of one, no discretion surrendered — where a streamer begins. The
**creator collective** is producer-weighted, with property and expression on. The **full
republic** runs the whole apparatus. And the library **composes like a package manager**:
modules carry dependencies and conflicts — property depends on a records module, term
limits conflict with a president-for-life module — resolved when a module is adopted, in a
vetted standard tier and a community tier used at one's own risk. Adopting a module or
setting a parameter writes it into the community's constitution and into the record.

**[5 — the frame this sets]**
So ratification is where the configuration is written and locked, each setting at the
firmness its tier carries. The appendices that follow describe the areas this configuration
governs — the land and its scarcity, the courts, the economy. Each is a value on a dial set
here. The one thing with no dial is the kernel that holds the Schedule.

## Visual cue sheet

Corner / no-face throughout; explanatory schematics, flat register.

- **0 — corner.** Two panels side by side: **ARTICLES (the logic)** and **SCHEDULE (the
  configuration)**, a line marking them separate. A timeline tick: **provisional →
  [RATIFY] → committed.**
- **1 — no-face.** The two kinds of setting: a column of **MODULES** (capability switches —
  due-process / economy / property / tenure / term-limits, on or off) beside a column of
  **PARAMETERS** (numeric dials — quorum, jurors, term length, thresholds). One module
  ("due process") flipped to show it moves a knob on already-running machinery, adds none.
- **2 — hero, no-face.** The **change-tier ladder**, most-fixed at the base: **eternity**
  (locked, "fork to change") → **amendment** (set at ratification, supermajority+referendum
  to move) → **organic** (tunable by the affected chamber) → **charter** (founder-set). Each
  parameter/module tagged by its rung.
- **3 — no-face.** The **Schedule as a filled config panel**, by area (voting / executive /
  judiciary / legislation / recognition / membership / emergency / founder / land-economy),
  each row showing its value + tier badge.
- **4 — no-face.** Three **presets** (operator's table / creator collective / full
  republic) as pre-filled panels with "adjust from here" arrows; a **package-manager** inset
  — dependency arrows, one conflict mark, a standard/community tier badge.
- **5 — corner.** The whole configuration greyed as "this community's choices," over the one
  lit **kernel** box that holds the Schedule — "not on the menu."

## Notes

- **Register: descriptive** (matches Appendix B) — documentation, not advocacy.
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
- **Tense honesty:** the Schedule, the amendment library, presets, and package-manager
  composition are **designed, not built** (a small v1 slice is buildable — see the slate).
  Values are set-at-ratification / calibrated-at-launch, not fixed in the doc.
