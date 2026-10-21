# Ch 5 (re-record) — "Governing is shipping software"

> **Re-record sequence** (see [rerecord-outline.md](./rerecord-outline.md)) — the
> deep-dive expansion of Ch 1's ⑤ "three branches build it." Content source:
> [chapter-4.md](./chapter-4.md) (old Ch 4). **Its own video in the playlist.**
> **Register: plain explainer** — mechanism first, no sales pitch; narrator
> scrubbed. Voice: assert-don't-defend, no grievance, terse.
>
> **Opens on:** "who actually builds and enforces all this — the founder?"
> **Closes:** the branches are the dev lifecycle of a live system; power to ship is
> held by confidence, checked by review. Hands to Ch 6 (the record — how do you know
> it's honest?).
> **No LLM in this chapter** (named once, in Ch 4). Mostly **designed, not built**
> (full republic population-deferred) — keep high-altitude; narrate the model, don't
> imply it's live.

## Narration (draft — plain explainer)

**[1 — the three branches; the executive makes it real]**
A decision is just words until something changes — the rule has to start running.
Turning a decision into a running system is what a government's branches do, and here
they line up like building software: someone says what should happen, someone builds
and runs it, someone checks the build. Decide, build, check. The **legislature**
decides — the crowd from before, weighed three ways — and what it writes is
*requirements:* the what and the why, never the how. The branch that takes those
requirements and makes them real — that builds the world and enforces the law — is
the **executive**. It's where the law becomes running code.

**[2 — the executive, and the power of code]**
Every government enforces its laws through institutions — officers, agencies,
inspectors — using the tools they have, always after the fact. This one still needs all
of that. But it has one power no real government has: the world itself is made of code,
so a law can be enforced by the machine directly — written into the world so that it
simply holds.
You can't walk through a wall; you can't spend money you don't have. Nothing catches you
after the fact — it just can't happen. And in a world made of code, the people who can
*write* it hold a power the rest don't: they can reach in and make that rule a function of the world's physical reality. It makes them not just executives but makes them **wizards** — and that ability is the force behind everything the
machine enforces here.

**[3 — the maxim, and the human half]**
That power comes with one maxim: **what can be enforced by code, shall be enforced by
code.** And here's why it's worth doing: when the machine enforces a rule, it enforces it
the same way for everyone, every time — no discretion to bend it, no official to bribe,
nothing hidden. Uniform, incorruptible, transparent, in a way no human enforcer can be.
So wherever a rule *can* be written into the world, it is — and it's out of anyone's
hands. But not every rule reduces to code. Other work takes ongoing human judgment:
running the central bank and setting monetary policy as the economy moves; spotting a new
exploit and shutting it down the moment it appears; handling a crisis no rule anticipated.
That work stays human. Code handles the mechanical; people handle the rest.

**[4 — the executive is the administration]**
So the executive isn't just its engineers — it's the whole administration: the people
who run the place day to day, handling the human half, all bounded by the law and open
to review. The engineering sits inside that. A wizard writes and runs code on their own
authority — and who becomes a wizard is the prime minister's to grant. So the head of
the executive isn't whoever codes best; it's whoever's trusted to decide whose hands a
live world is safe in. And the prime minister is **the legislature's to elect** — holding
the job only as long as the chambers back them, the way a parliament keeps or replaces
its head. Whoever holds the legislature, then, holds the executive.

**[5 — the judiciary checks both, by lot]**
The third branch, the judiciary, checks both kinds of work. When the executive ships
a change, a panel verifies it does what the law asked — for a precise rule, a quick
test; for a broad one, real work: reading the code, running it, sometimes
investigating whether the build delivers what was promised. It's code review, for
whether the *law* came true — and it's deliberated, argued in the open like any
proposal. When the executive made a human call instead, the same panel hears the
appeal: was it fair? And the judiciary is built on a single idea: there's
**no judge's seat to appoint** — a chosen judge is a captured judge. Instead every
panel is drawn **by lot** from the citizens — anyone past a **seniority bar** for the
fairness calls, the code-literate among them for the technical ones — so influence and
reputation count for nothing, and there's no bench to lobby or pack. And when a build
falls short, the court doesn't write the fix; it
says exactly where it misses, and the executive decides how to close the gap. The
court judges; the executive builds; neither does the other's job.

**[6 — synthesis + hand forward]**
So the legislature decides, the executive makes it real — coding what it can, handling
the rest by hand — and the people check all of it. But the executive writes the code,
and the code is what writes the record: every vote, every law, every verdict logged
by a program the executive controls. What stops them from writing code that lies —
and how would anyone know? That's next.

**Kickers:** "what can be enforced by code, shall be enforced by code" · "code enforces
the same for everyone — no discretion to bend it, no one to bribe, nothing hidden" · "in a
world made of code, the ability to write it makes you a wizard" · "code handles the
mechanical; people handle the rest" · "the legislature writes requirements, never the how" · "code review, for
whether the law came true" · "the court judges; the executive builds; neither does the
other's job."

## Visual cue sheet

Corner default; **no-face** for the split + pipeline + branch builds. Client never
shown. (Carried from `chapter-4.md`.) Frames = the beat-tagged `CH5` list in
`slide-generator.py`; `ch5-07-wizard` wording synced 2026-07-28 to the rerecorded
Beat 2 ("not just executives — wizards" / "the rule becomes part of the world's
reality").

- **1 — corner.** A decision sitting as inert "words on a page," then a nudge: it has
  to *run*.
- **2 — hero, no-face.** The **code/human split** — a fork: the codeable side flows
  into self-running gears (auto, uniform, everyone); the human side is a person making
  the calls, drawn as the *larger* half.
- **3 — hero, no-face.** The **lifecycle pipeline** (**Mermaid**): decide → build →
  check = legislature → executive → judiciary; plus the legislature's output at three
  sizes (broad principle / "nerf NPC −10" / an exact rule).
- **4 — no-face.** The executive as a whole **administration** — people/institutions,
  with "engineering" as one box among many; a wizard writing+running code on their own
  authority, and the **PM as the grantor** of who becomes one. Small inset: the
  **legislature elects the PM** (an arrow from the chambers to the exec head) — *hold
  the legislature, hold the executive.*
- **5 — no-face.** The judiciary's two faces: verification (code review + test +
  investigate; ✓ conforms / ✗ diagnostic remand, "here's where it misses") deliberated;
  + the appeal of a human call. **No seat/bench** (a struck-out judge's chair); instead
  a **jury drawn by lot** from the citizenry **past a seniority bar** — nothing to lobby
  or pack.
- **6 — corner.** Synthesis — *legislature decides · executive makes it real · people
  check* — then the hand-forward: the executive writes the code, and the code writes
  the *record* → can they write code that lies? → Ch 6.

## Notes

- **⚠ The WHY behind the maxim (Beat 3) — the load-bearing reason, keep it explicit.**
  "What can be enforced by code, shall be" *because* code enforces **uniformly, incorruptibly,
  and transparently** — the same for everyone, every time; no discretion to bend it, no one
  to bribe, nothing hidden; in a way no human enforcer can be. That's the whole point of
  taking a rule out of human hands. Don't state the maxim without the reason.
- **⚠ No empirical-proportion claims (nobody's run this).** Cut "most of governing is people"
  (Beat 2), "it's the larger one" (Beat 3), "most of what they do" (Beat 4) — 2026-07-17.
  We don't know what "most of" anything is. Say *what exists* (the human half, the machine
  half), never *how much*.
- **⚠ "WIZARD" — use it exactly as an IDENTITY statement, ONCE, never as a job category.**
  The 2026-07-17 correction: the executive is **NOT** "officers and wizards" as two halves.
  It's **mostly officers** — human institutions/administration, using the tools (Beat 4);
  its *one* special power (enforcing through the machine, Beat 2) is **enabled by** wizards.
  - **What "wizard" means (specific):** in-game, a player who can **author + run TypeScript**
    (the code-trust axis, `isWizard`). Word history: MUD wizards (world-authoring admins);
    and **Gabe Newell's framing** — in a digitized world, the people who can *write code* are
    "like wizards" vs. those who can't, because code confers world-shaping power (whether it's
    this game or your smart fridge). LLMs now write the code *for* you, but the coder /
    non-coder line still confers the "magic."
  - **How to use it:** the Newell way — *"it makes them wizards"* — a statement about
    **identity/capability**, not a role in the org chart. **Use it once** (Beat 2). Beat 3
    reverted from "the wizard half" to "that power" so the word isn't overused.
  - **Open question (musing — NOT in the video):** can wizards and non-wizards "play" as
    equals, or do wizards occupy a spot that's purely **labor**, so treating them as
    *consumers* signals an imbalance? Unresolved; doesn't affect this video.
- **Register:** plained from `chapter-4.md` — cut the reveal framing ("here's where
  governance quietly dies," "the folks who check the work are just the folks") and the
  hype; kept the mechanism kickers.
- **⚠ Beat 4 — how wizardhood is conferred (2026-07-17 rework).** The load-bearing
  facts: a **wizard** writes and runs code **on their own authority**; **who becomes a
  wizard is the PM's to grant**; so the head of the executive is defined by *trust*
  (who's safe with a live world), not coding skill. **In-runtime mechanism** (jargon
  kept OUT of narration): PM → confers **archwizard** → archwizards confer **wizard**.
  The **confirmation step is a tunable dial** (grant-only vs. legislature-confirmed) —
  deliberately left vague in the voiceover; don't commit the video to one. **Cut for
  good:** "without ever writing a line" (over-literal), "its head is more than an
  engineer" (telling, redundant with the description), the territory/fiefdom line.
- **This chapter carries the branch mechanics Ch 7 calls back to.** Beat 4 establishes
  the **PM is the legislature's to elect** (parliamentary → *hold the legislature, hold
  the executive*); Beat 5 establishes the **judiciary has no seat** — juries drawn by
  lot from citizens **past a seniority bar**. Both were added here (2026-07-15) so Ch 7
  Beat 5 can *apply* them to the founder (2-of-3 → PM; max-tenure founder → pool of one)
  as a **callback**, not re-exposition. Keep the *how* here; keep the founder *application*
  in Ch 7. Canonical sources: cooperative-slate §§ *How the PM is chosen* / *How the
  judiciary is staffed*; draft-constitution Art V–VI.
- **⚠ Deliberately OUT of Beat 5 (2026-07-17): jury panel size + the active-pool draw.**
  Beat 5 gives the *principle* (checks both, drawn by lot, no seat to capture) and stops.
  Two design details stay out of narration: (1) **minimum panel of ~3** — a *tunable
  parameter*, so it belongs in **Appendix A**'s Schedule of Parameters, not the explainer
  (naming "3" also invites "why 3?"); (2) **don't draw inactive players / opt-in pool** —
  an implementation guard against "a juror who's AFK is useless." Kept out because Beat 5
  never raises "juries are a job," so answering it would mean *introducing* the doubt first
  (the anti-defensive rule). Design home: cooperative-slate § *How the judiciary is staffed*;
  parameter home: Appendix A.
- **⚠ Trimmed: the property / build beat** (old chapter-4 Beat 5 — "make is real: you
  build the world, and what you build is *property*, not politics; the executive can
  oversee but not seize"). **PLACED 2026-07-16: the full property guarantee landed in
  Appendix B ("The Land") Beat 1 (due-process, not exclusion).** The old "functional,
  not territorial / no fiefdoms" line was **cut from Beat 4 entirely (2026-07-17)** — it
  answered a question no one asks here, and it brushes against property (code-as-property
  is Appendix B's to establish, not Ch 5's). Nothing about territory belongs in this
  chapter now.
- **Tense honesty:** mostly designed, not built (full republic population-deferred);
  the argument-map/deliberation is built, the branches are the model. Narrate the
  design; don't imply the republic is live.
- **No LLM** — named exactly once in the whole playlist (Ch 4).
- **Tracked [OPEN] design questions** (out of the video, real governance TODOs):
  change-authorization (policy vs. delegated maintenance); the judiciary↔executive
  remand loop (diagnostic-not-prescriptive; round limits open); compute allocation
  (earned-allowance vs. legislated-budget vs. hybrid — the firewall rules out a cash
  market). See `chapter-4.md` § Notes.
