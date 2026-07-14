# Constitution Video — Working Scaffold

> **Status: structural scaffold. Language deliberately deferred.** This
> captures the *architecture* of the video — chapters, the claim each
> makes, the doubt it closes and opens, the constitutional clause it
> hangs on, and what builds it depends on. It does **not** contain final
> narration. Per the call made while designing this, the wording firms up
> only once the underlying systems exist (the argument-map first). Annotate
> as the builds land.
>
> Last structural revision: 2026-06-19.

## What this is

A chaptered video introducing the cooperative governance model — a
companion to, and a funnel toward, the full written manifesto + draft
constitution (`docs/governance/draft-constitution.md`,
`cooperative-slate.md`).

**The video is a trailer, not an explainer.** Its job is to make the
viewer *read the constitution*. If it explained everything, the document
would be redundant. **Omission is the conversion engine** — depth lives
in the doc; the video creates the itch. The one exception: a few
objections are *disqualifying* if unaddressed (Sybil-resistance for this
audience), so those get an acknowledge-and-defer beat even though the full
answer lives elsewhere.

**Secondary framing — it's a platform pitch.** We're not selling our own
instance; we're pitching infrastructure *any* community can adopt and run.
The viewer is a potential adopter ("your community could run on this"),
not a potential player.

## Audience & goal

- **Primary audience:** the governance / civic-tech crowd.
- **Preview venue:** Destiny.gg (a debate-literate political livestreamer
  community), possibly a smaller political Twitch community too.
- **Tone:** earnest manifesto.
- **Goal:** drive viewers to read the full manifesto; start an adversarial,
  high-quality feedback conversation.

## Positioning — floor, not ceiling

The platform is a **dial**, not a fixed regime: an operator can sit
anywhere from operator-fiat ("you have no rights") to full republic. What
is guaranteed *everywhere*, regardless of dial position, is the **floor**:

- the **firewall** (money never buys advantage),
- the **tamper-proof, verifiable record**, and
- the **right to fork and exit**.

Democracy is the *opportunity* the platform makes cheap and available, and
the model *rewards* opening up — but it doesn't *compel* it. The moral
claim is therefore: *every community deserves an honest floor and a real
exit; what you build above that is yours.* Founder offboarding is **our
instance's example**, not the universal thesis.

## Format

- **One video, YouTube chapter stops.** For the curated Reddit drop, a
  single upload with deep-linked chapters beats separate uploads (one URL,
  one thread, one view-count, your framing). Re-cut into standalone videos
  later when going wide.
- **On camera.** Face-cam carries the earnest register and suits a
  face-driven streamer culture.
- **No client footage** (the UI isn't presentation-ready). Diagrams carry
  the visual load. Do **not** gate the video on fixing the UI.
- **Visual craft:**
  - *Build* diagrams, don't *display* them — assemble piece by piece as you
    talk. Hand-drawn style (Excalidraw-ish) fits the anti-cheese DGG register
    and reads as *thinking*, not marketing.
  - *Two-channel rule:* audio carries the argument/reasoning; the visual
    carries the structure. Never put your script on screen as bullets.
  - *Three framing modes* — **corner/PiP over the visual is the default**;
    **no-face** (visual only) for dense builds; **full-screen face** reserved
    for intro/outro direct address (full rule in § Production pipeline →
    Framing). The cut rhythm between modes is itself an engagement tool.
  - Visual change every ~10–15s; never hold a dead slide.
- **Optional credibility anchor:** if you want an "it's real" proof without
  the ugly client, a raw artifact (the doc on screen, the data model, a CLI
  interaction) reads as *more* credible to a technical-skeptic crowd than
  polish. Raw beats slick here.

## Production pipeline

How the video gets made (applies to every chapter; Ch 1 is the worked exemplar
— see `chapter-1.md` § Assets & production):

- **Diagrams.** Hand-drawn **Excalidraw** (anti-cheese — reads as *thinking*,
  not marketing). Authored as `.excalidraw` JSON in `docs/manifesto/` → open at
  **excalidraw.com** or the **VS Code Excalidraw extension** → *Export image*
  with **Background OFF** + **3× scale** → transparent PNG.
- **Palette / conventions.** roughness 1 + Excalifont (fontFamily 1);
  **green = influence / clears**, **gray = short / empty / fell-short**,
  **red = pass-line / blocked**, **tan = duct tape (ad-hoc)**; a meter =
  light-gray capacity outline + green fill.
- **Reveal staging.** Build-ups are **cumulative state files** (state 1 ⊂ state
  2 ⊂ …) cross-dissolved on the Descript timeline; shared elements keep
  identical coordinates so dissolves don't drift. Only beats that earn it get
  staged.
- **Recording.** OBS, **on camera**, **per chapter** (continuous, a few takes),
  **improv around the full script** (lines kept intact, so the transcript still
  matches the cue sheet). Record **clean** — no overlays; protect the audio.
- **Edit.** Everything composites in **Descript**: face-cam + transparent
  diagram PNGs revealed/dissolved at the cue lines. **No client footage** —
  diagrams + face only.
- **Framing — full-screen is rare.** Three modes: **corner / PiP over the
  visual = the default** (face small, the diagram owns the frame — carries your
  presence continuously); **no-face** (diagram full-frame, voice-over) during
  dense hero builds so the visual breathes; **full-screen face** (direct
  address) reserved for the **intro and outro only** — the two genuine
  person-to-person bookends, now their own discrete segments (`intro.md` +
  `outro.md`), full-screen start to finish. Everything between them — Ch 0
  through Ch 6 — is corner/no-face. Promote a mid-video line to full-screen only
  if it truly earns a "look at me"; when unsure, stay corner. Scarcity is what
  makes full-screen land.
- **Title cards (between chapters).** A hand-drawn, full-screen **no-face** card
  between sections — ~2–3s, a punctuation beat (not a pause), aligned with the
  YouTube chapter stops. Cards are **declarative** — the chapter's *thesis*,
  asserted; never an objection or question. (The doubt-cascade stays behind the
  scenes — it surfaces only in the spoken hand-forwards, in the narrator's own
  voice.) **Locked set:**
  - Intro — **A modest proposal for gamified government** (the main video title
    card; full-screen segment `intro.md`)
  - Ch 0 — **A government in a game**
  - Ch 1 — **Three voices, none supreme**
  - Ch 2 — **Earned and spent, never owned**
  - Ch 3 — **The argument, not the crowd**
  - Ch 4 — **Governing is shipping software**
  - Ch 5 — **Don't trust — verify**
  - Ch 6 — **A dial on an honest floor**
  - Outro — **How to get involved** (full-screen segment `outro.md`; the closing
    card / bookend)
- **AI discipline — name the job + the limit, never AI-wash.** "AI will do it"
  is a wave of the hand, and a debate crowd smells it instantly. Invoke AI only
  where you can state the **specific job** *and* its **guardrail**; otherwise
  leave it out. In this video AI is named **exactly once** — Ch 3's
  deliberation-scaling (a model *suggests* claim-merges; humans confirm; it
  touches the view, never the record — "librarian, never judge"). Everywhere
  else is mechanism / code / cryptography / human judgment, *not* AI — and that
  restraint is itself a credibility signal. Reputation-measurement especially is
  a place to deliberately NOT reach for AI.

## Organizing principle — the doubt-cascade

Not the constitution's article order (that's spec/reference order) and not
the theme list (that's taxonomy). The spine is the **sequence of doubt**:
one audacious claim, then each chapter asserts the *conviction* that closes
the doubt the previous chapter raised — and, in closing it, opens the next.

- **Surface = conviction** (creed-lines, asserted not argued — it's a
  manifesto). **Engine = just-in-time objection-handling** (answer each
  doubt a beat after the audience forms it). Perfect for a debate crowd
  that's always raising the next objection.
- **Assert, don't defend.** Lead each chapter with the positive principle;
  let it *function* as the answer. Never sound reactive.
- **Cut chapters by weight, not by theme.** A thin theme is a *beat*, not a
  chapter. Don't bury novel, load-bearing ideas (the three houses, the
  record) in footnotes.

The chain, end to end:

> *one class will own it* → **three co-equal houses** → *hoard inside a
> house?* → **earned, not owned** → *loudest steamrolls debate?* →
> **structure, not popularity** → *who builds & enforces it?* → **law →
> code → review** → *how do I know the numbers are honest?* → **verify, don't
> trust** → *operator still holds power* → **the dial on a guaranteed floor**
> → **the call.**

## Framing update — supersedes the grievance frame (video-wide)

The original grievance frame above ("online self-governance keeps failing —
plutocracy or apathy") is **retired.** The audience — content community
members, plus the operators we most want to convince — isn't aggrieved, so a
"you've been wronged" opening rings false. Replace with a **positive,
operator-aimed, scale-driven frame:**

- Self-organization is an **inevitability, not a demand.** Past a certain size
  one person can't make every decision (a full-time job, then a job too big for
  anyone). Communities already self-organize ad-hoc (mods, volunteers, events,
  norms); this is **real infrastructure for what already happens**, and it's
  **better for everyone — the operator most of all** (it offloads a job that
  outgrew them). The streamer is the **customer, not the villain**: "this serves
  you," never "this checks you."
- The old failure modes (capture, demagoguery, drama) reposition as **the limits
  of duct tape at scale**, not grievances.
- **Plutocracy / the firewall** demotes from a headline disease to a confident
  aside + the crypto-reflex disarm for DGG.
- Scale is the **why behind the dial (Ch 6)**: keep whatever stake you want and
  **defer selectively** (abstain) — not all-or-nothing.

Voice: **assert, don't defend.** Chapter hinges are **curiosity** ("so how does
that work?"), not objections to rebut. Terse — recognition over explanation;
more examples, fewer words each. **All segments now have canonical files** —
`intro.md`, `chapter-0.md`..`chapter-6.md`, `outro.md` — each with narration
beats + cue sheet + notes; **those files supersede the per-segment entries
below** (kept as the index/map). Full-screen camera lives ONLY in `intro.md` and
`outro.md`; everything between is corner/no-face.

## The chapters

### Intro — A modest proposal for gamified government *(full-screen hook)*
- **Segment:** `intro.md` — full-screen, direct-to-camera cold open; the opening
  bookend to the Outro. Full-screen camera appears ONLY here and in the Outro.
- **The hook:** "a new system of government I've designed for digital
  communities… and it runs inside a game." Hard cut to Ch 0 (corner).
- **Build-dependency:** stable now.

### Ch 0 — A government in a game *(frame; corner throughout)*
- **Canonical:** `chapter-0.md` (supersedes this entry). Corner/no-face from its
  first beat — the full-screen hook moved to `intro.md`.
- **Claim:** a digital world can host a *real* government, and a game is the
  engine that makes it actually run.
- **Closes:** — (opener; picks up from the Intro cut)
- **Opens (hands Ch 1):** "it runs on money — so who gets a say, and what stops
  the biggest wallet owning it?"
- **Rides along:** the **origin** (MUDs + livestreaming); the game (MMO +
  educational core; the people run it); **why a game** — the apathy graveyard
  (DAOs / online democracies built the rules and nobody came) and *the game is
  the engine they never had*; **the record** (everything is information,
  unfakeable → seeds Ch 5); the **gaming lineage** (EVE; the difference is
  dial-compatible); the platform framing; *educated electorate = functioning
  electorate*.
- **Build-dependency:** stable now (philosophy).

### Ch 1 — Three voices, none supreme *(tricameral + firewall)*
- **Claim:** a world has three irreducible kinds of contributor — those who
  **make** it, those who **fund** it, those who **play** it — and each gets
  a co-equal voice that none of the others can buy, convert, or outrank.
- **Closes:** "the rich — or any single class — will own it."
- **Opens:** "fine, three houses — but inside a house, can't you amass and
  hoard power, or fake your way up?"
- **Anchors (provisional):** Art. I §5 *"Co-equality"*; Art. III §2 (no
  conversion between kinds); Art. IV §3 (a bill needs a **majority of
  houses** — 2 of 3).
- **The "why" (said out loud):** every creative economy is a permanent
  three-way tension — **labor, capital, audience** — and nearly all of them
  let one class capture the others (almost always capital buys out the
  makers and ignores the users). Co-equal, non-convertible houses + a
  majority-of-houses rule *force a cross-class coalition*; no class rules
  alone. It's functional/corporatist tricameralism — representation by
  *contribution type*, not geography or headcount. This is the chapter's
  spine, not a detail.
- **Firewall, folded in where it belongs:** real money earns a voice *in the
  capital house*; the firewall is what stops that voice from buying the other
  two or converting into dominance — Art. I §2 *"No money buys advantage."*
- **DGG hook:** the on-sight crypto/grift disarm — no token, money = voice,
  never advantage.
- **Build-dependency:** structure stable now; house specifics firm with the
  stake-ledger build.

### Ch 2 — Power is earned and spent, never owned *(the currency of power)*
> **Canonical draft: `chapter-2.md`.** The bullets below are updated to the
> shipped **Model B**; the file has the full narration + cue sheet.

- **Claim:** standing is **earned by contributing and held** — never banked,
  bought, or owned; you spend it as **conviction** without using it up.
  *(Model B — superseded the reservoir.)*
- **Closes:** "can't you amass / hoard / fake power within a count?"
- **Opens:** "and the debate itself — won't the loudest steamroll it?"
- **Anchors (provisional):** Art. I §3 *"Power is earned and spent, never
  owned"*; Art. I §4 *"No number is an authority."*
- **Rides along:** **standing earned & held** (Model B — *no reservoir, no cap,
  no decay-on-move*); **conferred by others** (make = others' engagement,
  author ≠ actor; play = participation others engage with) → the **Sybil
  one-liner** (*"can't mint influence from accounts you control — others give
  it, or it doesn't exist"*); **conviction = the spend** (builds on hold,
  resets on flip, full weight per issue, never depletes).
- **Cut / moved:** **reputation/renown CUT** here (one-chamber + measurement
  unsolved → exposes the softest target; the strong reputation idea is Ch 3's
  reputation-*blindness*). **Liquid delegation MOVED to Ch 6** (graduated
  participation: operators defer, citizens delegate).
- **[OPEN] throw:** the franchise / personhood gate (Art. II) — the real
  Sybil-at-scale question lives here, not in renown.
- **Build-status:** ✅ **SHIPPED (Model B).** make + play standing earned; fund
  intake pending (assumed live by publish); conviction is built substrate (Api +
  `standing` self-view verb) but **no live bills yet**.

### Ch 3 — Deciding without a mob *(deliberation)*
- **Claim:** argument is judged by its *structure*, not by popularity or
  reputation; influence touches only the final vote.
- **Closes:** "the loudest will steamroll the debate."
- **Opens:** "nice in theory — but who actually *builds and enforces* any of
  this?"
- **Anchors (provisional):** Art. III §5 *"Influence weights the vote, never
  the argument"*; Art. I §4 *"No number is an authority."*
- **Rides along (vocabulary now matches the shipped code):** a **`Board`**
  with `organizer: 'argument'` holds typed **`Entry`** nodes; the root entry
  is the **spine** (the proposal), and every claim attaches by a typed
  relation — **`supports`** (pro), **`objects-to`** (con), **`responds-to`**
  (question); a rebuttal is just a pro/con attached recursively. A
  **store/lens split**: the store is a dumb relation tree; the **neutral
  default lens** computes spine-first, valence-grouped, chronological order on
  read — *no scoring welded on*. The **⚠ open-objection badge** (an
  `objects-to` with no answering child) is the live "is this answered yet?"
  signal — dissent is structurally un-buryable because there's no ranking to
  bury it under. **Circle highlight** flags contacts for *attention*, never
  ranking. **text-as-deliberation-substrate** still rides here.
- **BUILT vs. DESIGNED — get the tense right:**
  - *Present tense, it runs:* the typed claim-graph; **reputation-blind**
    — and this is *enforced*, not aspirational (voting is literally refused on
    an argument board, entries are never vote-seeded, scores are zeroed in the
    projection — a claim a skeptic can verify); contribute-as-equals;
    dissent-as-permanent-node.
  - *Future tense, designed not wired:* **decide-by-weight.** Maturing a map
    fires a `mature` event into *no consumer* in v1; the weighted ballot is
    the deferred governance layer. Narrate "contribute as equals" in the
    present, "decide by weight" as the designed seam — don't imply the vote
    runs.
- **[OPEN] throw (new, and good bait):** the deferred **scale problems** are
  real open questions — above all **claim dedup / canonicalization** ("what
  stops 500 near-identical claims from drowning the map?"), plus
  convergence-detection and integrity-grade summarization. Perfect to hand a
  debate crowd.
- **DGG hook:** native catnip for a debate community — likely the strongest
  first hook in the teaser index; the *enforced* reputation-blindness is a
  present-tense, verifiable claim.
- **Build-status:** ✅ **SHIPPED** on `origin/master` (forums **cycle 2** —
  the `argument` organizer over the forum `Board`/`Entry` store).
  Authoritative doc: `docs/subsystems/forums.md` § "The argument organizer."
  Chapter is now scriptable; apply the tense tags above. The client is still
  never shown — describe, don't film. *(NB: this local `master` worktree is
  stale — HEAD at the 2026-06-12 auth merge; fetch to get the code locally.)*

### Ch 4 — Governing is shipping software *(the three branches)*
- **Claim:** citizens write the requirements, the executive ships the code,
  the court reviews the build — and whatever *can* be enforced by code, *is.*
- **Closes:** "who builds and enforces it?"
- **Opens:** "so whoever writes the code — the operator, the founder —
  controls everything."
- **Anchors (provisional):** Art. I §7 *"Enforcement is by code, not
  discretion"*; Art. IV §5 (law as *requirements*, not implementation).
- **Rides along:** **legislature = the spec** (requirements + intent, never
  the how); **executive = the build** (the PM is the engineering authority,
  held by confidence; programming the machine is an executive function);
  **judiciary = the greenlight** — *verification* (code review: does the
  build meet the requirement) + *appeal* (the human-judgment mirror of
  enforcement) — one async case process at every scale; enforcement-by-code
  is the default, administration stays human; **sortition** judiciary —
  juries drawn by lot, influence and reputation counting for nothing.
- **DGG hook:** "judicial review *is* code review" — genuinely original;
  governance modeled as the dev lifecycle of a live system.
- **Build-dependency:** mostly *vision* today (full republic deferred until
  population threshold). Keep high-altitude until more exists.

### Ch 5 — Don't trust, verify *(the record)*
- **Claim:** every tally, every random draw, every verdict, and the law
  itself is recorded so that *anyone* can verify it — and no operator can
  falsify it undetectably.
- **Closes:** "how do I know the numbers are honest / the rules were even
  followed?"
- **Opens:** "okay, the record's honest — but the operator still sets the
  rules and holds power. What stops tyranny?"
- **Anchors (provisional):** Art. I §6 *"The integrity of the record is
  independent of its keeper"*; Art. VII (tamper-evident, universally
  verifiable, the right to verify).
- **Rides along:** hash-chained, signed, externally anchored, replicated;
  re-derivable by any member; the **honest limit** — tamper-evidence makes
  falsification *detectable, not impossible* (Art. VII §5), so the final
  backstop is transparency + exit; **text-medium callback** (everything's
  text → trivially hashable and verifiable).
- **DGG hook:** *the one genuinely good idea from crypto — verifiability,
  "don't trust, verify" — with none of the token / speculation grift.* Pairs
  with the firewall (no coin, no cash-out).
- **Build-dependency:** substrate; firms as the archive is built.

### Ch 6 — A dial on an honest floor *(platform + exit)*
- **Canonical:** `chapter-6.md`. Corner/no-face throughout; **lands on "that's
  the design" and hard-cuts to the Outro** (the call moved out of this chapter).
- **Claim:** any community can adopt this and tune it — from operator-fiat to
  full republic — but the floor is guaranteed *everywhere*: the firewall, the
  verifiable record, and the right to fork and walk.
- **Closes:** "the operator controls the rules — so it's just benevolent
  dictatorship."
- **Opens:** → hands to the **Outro**.
- **Anchors (provisional):** Art. XI *"the structure, not the founder, is
  what is entrenched"*; Art. X §4 (the only change to an eternity clause is
  to **found anew** — fork); the eternity clauses (Art. I, the firewall,
  co-equality, record integrity, judicial egalitarianism).
- **Rides along:** **you already run a government — you call it moderation**
  (rule-of-law as a gift to the operator); kernel + amendment-library
  **"distros"**; **founder self-binding** + ratification (autocrat is a valid
  config); graduated participation; the floor = firewall + record + exit.
- **Build-dependency:** structure / philosophy stable now.

### Outro — How to get involved *(full-screen close)*
- **Segment:** `outro.md` — full-screen, direct-to-camera; the closing bookend to
  the Intro. Picks up Ch 6's hard cut and holds to the last frame.
- **The ask (state, don't sell):** honest early-stage stance (lots still to
  build, but a constitution to deliberate + a model to design against); **make /
  fund / play** — three ways to take part; take-it-for-a-test-drive. No plea, no
  founder-as-beneficiary.
- **Build-dependency:** stable now.

## Cross-cutting threads (woven, not chaptered)

- **The text medium.** Oriented in Ch 0; deeper payoff is the *unity of
  substance* — argument, vote, law (as requirements), code, and record are
  all the same kind of object: **words.** That's *why* a real polity is
  buildable here — text is legible, structurable, hashable, verifiable, and
  forkable in a way 3D assets aren't. Echo in Ch 3 (deliberation) and Ch 5
  (record). *(Could become its own short reflective chapter if desired —
  length is no longer the constraint.)*
- **"No number is an authority" (Art. I §4).** Tallies are counted; they
  never *rule.* A connective creed-line across Ch 2 (no metric rules worth)
  and Ch 3 (the vote count doesn't settle the argument — structure does).

## Distribution funnel

**Video (async depth) → Reddit post (threaded feedback) → livestream
(real-time adversarial defense).** Knowing the livestream is coming *frees*
the video: it tees up objections rather than pre-answering everything.

The Reddit post:
- **Lead with substance in the text**, not "watch my video." On a debate
  sub, a text post that makes an argument (with the video attached) vastly
  outperforms a video post with a caption.
- **Frame as "help me break this,"** not "behold my vision." Surface the
  **[OPEN]** points as questions you want torn apart — recruit the crowd as
  adversarial reviewers.
- **Chapter index with deep-links**, each teaser phrased as the *question* it
  answers (a hook, not a summary). Lead the index with Ch 3 (deliberation) —
  native catnip.
- **Disarm two reflexes early:** crypto/DAO pattern-matching (no token, money
  = voice not advantage — the firewall) and founder-grift cynicism (the
  floor-not-ceiling story + the verifiable record + exit, *not* "founders
  always give up power"). Be honest about the spectrum without leading with
  "it supports authoritarianism": lead with the floor and what the model
  rewards.
- **Be present in the thread.** A drive-by you don't defend reads as weak to
  this crowd; engaging the hardest objection directly is what earns respect.

## Coverage — deliberately doc-only

Real, but the *document's* job at full resolution; airing them in the video
dilutes rather than strengthens: the in-world economy / treasury / governed
mint; merit-pay vs. renown asymmetry; content abatement / cure orders;
emergency-powers mechanics; caretaker-governance / population-ladder
fallback; bill lifecycle minutiae (tabling / lapsing / continuing
resolutions); interpretation.
