# Narration slate — what tells you a trait moved, and why the answer is salience

**Captured 2026-08-25.** It started from the psychology vocation — you go
to a therapist to find out your traits — and turned into the question
nobody had asked:

> **User: "we also had talked about telling the player when their traits
> were being modified, just prohibiting direct read. but we never talked
> about how that's manifested. if you do something brave or generous or
> whatever, what tells you your traits are being updated?"**

> **Status: design conversation, captured. Not requirements.**

Related: [trait.md](../../subsystems/trait.md) (**the shipped substrate —
read it first**), [advancement.md](../../subsystems/advancement.md) (the
sibling ledger with the identical hole),
[psychology-slate](./psychology-slate.md) (the vocation this feeds),
[measurement.md](../../measurement.md) (Part 6 — the reading rules),
[story-bible.md](../../story-bible.md) (Aletheia / Mara; worship is a
mirror), [prose.md](../../subsystems/prose.md) (`ProseApi` — the
author-fragment machinery), [record-layer.md](../../subsystems/record-layer.md)
(`recall` — probably most of the readable-record surface),
[message-rendering.md](../../subsystems/message-rendering.md) (font-by-register).

---

# ⚠⚠ The finding that starts it: nothing writes a player's traits

Checked against `master` at `0d25ab62c`:

- `TraitApi.recordSignature` / `recordDeed` have **zero production call
  sites.** Every `recordDeed` in the tree goes to `AdvancementApi` or
  `ChronicleApi`.
- `dispositionValence` appears in **zero YAML** across all 963 seed files.
- `AdvancementLogic.ts:83` names it outright: *"The `dispositionValence`
  channel is **read-but-ignored** — the defined-but-empty lane-1 trait
  seam."*

So every player derives their traits over an **empty ledger, forever**.
`TraitsController` and `ProfileLogic` read `pronouncedFor` and get
nothing. The only live writer is `Behaved._seedDispositions`, which
stamps static `claim` rows on **14 NPCs** so their brains have something
to read — set once, never moving.

⭐ This is the *reference-Ideas-inert-at-boot* shape again: a declared
seam, a full unit-test suite that hand-constructs its inputs, and no call
site. **The substrate is not broken; it was never
connected.**

---

# ⭐⭐⭐ Traits move at authored moments, not by reactive inference

The design assumption in the room had been a reactive stream — the engine
watching acts and inferring disposition — which produced a whole
imaginary problem (narration spam, farming tutorials, suppression rules).
That premise was wrong:

> ⭐⭐⭐ **User: "I thought traits would be changed by very personalized
> bespoke experiences crafted by our content authors. It's real content,
> not just mechanics — and if it's real content then the spam worry
> should evaporate. If a player wants to play out the same narrative over
> and over again that's up to them and the content author."**

**This is not a change of direction. It is the unbuilt half of what
shipped.** `ActSignature.dispositionValence` *is* the authored channel:
typed, documented, wired through `TraitLogic`, never once authored.

## ⭐ The dials already assume it

| dial | value |
|---|---|
| `definedThreshold` (mass) | 20 |
| `entrenchedThreshold` (mass) | 60 |
| `halfLifeSeconds` | 180 game-days |
| the one authored precedent — Sloane's NPC seeds | valence **±70** |

Mass is `Σ |valence| · decay`. A single row at 70 clears `entrenched`
alone; three or four scenes at 20–30 reach `defined`. **Those numbers are
calibrated for a few heavy moments, not a stream** — against a dense
reactive feed every axis would pin at the rail inside one session.
Whoever set them was already imagining bespoke content.

The 180-day half-life fits the same way: a scene stays load-bearing for
half an in-world year and then begins to fade, which is correct *provided
more scenes keep arriving* — and that is the content author's pacing
problem, which is a legitimate one to hand them.

⚠ **The cost, owned deliberately:** this makes traits a **content axis,
not a simulation axis**. Their richness scales with authoring hours
rather than playtime, and the 17 axes stay mostly `unformed` until
somebody writes for them. That is a normal RPG trade and probably the
right one — but it is a choice, not a free lunch.

---

# ⭐⭐ The three jobs, which are not one job

The original question has three different answers and conflating them is
what made this conversation take six turns:

| job | who does it | what it delivers |
|---|---|---|
| **something happened** | the **authored moment** | the scene itself — an NPC's reaction, a described consequence |
| **you will remember it** | the **narrator** | salience |
| **what it meant** | the **therapist** | the reading ([psychology-slate](./psychology-slate.md)) |

The narrator is not a diminished therapist and not a decoration on the
scene. It has its own job, and the job is the interesting one.

---

# ⭐⭐⭐ The narrator's job is SALIENCE

Not *"a trait moved."* That is a readout, and it is the therapist's to
give. The narrator's job is to make a moment **stick**, so that when you
are sitting in a session choosing what to bring up, some acts are vivid
and most are not.

> **Narrate a moment and the player will remember it and probably
> disclose it. Stay silent and it sits in the record unremarked —
> technically available, easy to scroll past.**

⭐⭐ Which makes **salience the lever the author actually controls**, and
it is a far better lever than a valence number. The author is not tuning
how much a scene counts; they are deciding whether you will still be
thinking about it an hour later. That is what writing a scene *is*.

It also gives narration a job that survives the trait system entirely —
it is the same lever for advancement, for the chronicle, for anything a
player might later be asked to account for.

## The narrator is never embodied — already settled

The temptation is a personified voice, and the strongest reference is
BG3's narrator (Amelia Tyler), who is **intensely a person and
emphatically not an entity** — no character can hear her, she cannot be
addressed, she has no stake. Two axes that come apart: a personified
*voice* and a personified *entity*.

The story bible already settled the second, for gods generally
(`story-bible.md`, *Worship in practice*, marked **[settled]**):

> **The god never speaks — it's a current you're in.** No dialogue
> (mythic, never embodied). It answers as the gravity you feed… in
> dissonance the **mirror** — the chronicle and the honest count —
> reflects the gap back. *Recognition, not punishment.*

So Aletheia (Chaotic Good, *patron of the honest count*, goddess of
truth / **unconcealment** — Mara's exact good twin) may be what the
devout *call* the mirror. She is never its speaker. **This costs nothing
and requires no supporting content**, which is exactly why it survived
when a more elaborate "the voice is never attributed, and the world
contains factions who disagree about what it is" design did not — see
*Rejected* below.

---

# ⭐⭐ Platform owns the frame; the author owns the particulars

> ⭐⭐ **User: "I would think we'd want consistency here, with narration
> enforced by the platform, not left up to the author. Or at the very
> least give them an abstraction to plug into."**

The load-bearing reason is stronger than consistency:

> ⭐⭐⭐ **An author writing free prose will leak the magnitude, and will
> do it by writing well.** Handed `valence: 70`, a good writer reaches for
> *"something in you gave way."* Handed `valence: 20`, they write *"a
> small kindness, easily done."* Nobody did anything wrong — that is just
> craft, matching register to weight. And now the player reads magnitude
> off the adjectives.

So the platform does not own narration for tidiness. It owns it because
**band-blindness is a property no author can be asked to maintain.** The
same event at 20 and at 70 must produce the same sentence.

| author owns | platform owns |
|---|---|
| the particulars — what happened, who was there | the sentence frame |
| the axis + valence (the `ActSignature`) | topic, register, routing |
| **whether this moment narrates at all** | **the intensity register — identical prose at 20 and 70** |

## The shape: the author extends the signature, not the prose

The pattern is already everywhere in this codebase — declare structured
data, let the platform fan it out. `dispositionValence` is exactly that:
the author writes `{ disposition: generosity, valence: 30 }` and never
touches a ledger row.

Narration should ride the same declaration. The author supplies a
**fragment**, not a sentence — *"gave away the last of your water"* — and
the platform builds the line around it, emits it at `self.*` (already the
`narrative` font register, already routed), band-blind. **The author never
writes the framing words, which are precisely the words that would leak.**

⚠ **Build it ledger-shaped, not trait-shaped.** `AdvancementLogic`
narrates nothing either — it only pokes
`MqlSubscriptionApi.notifyDurableSubject` so live cards re-resolve.
Nothing tells you you got better at anything. The two ledgers already
share one `ActSignature` (trait.md's own *"instrument once"*), so hanging
narration off the signature gets both in one build; hanging it off traits
means writing it twice, in two voices, which is the thing this is for.

## ⚠ The trap: band-transition triggers

The tempting move for "platform-enforced" is to let the platform decide
*when* to fire — on `unformed → defined → entrenched`. Computable, needs
no author input, feels like the meaningful moment.

> ⚠⚠ **It is a gauge with one tick.** Announcing a band transition tells
> you your band, and a band is a value. Three announcements across a
> character's life and the player has read their own position — the exact
> thing the psychology vocation is supposed to be the only source of.

The trigger stays with the author. They are the only one who knows a
moment was load-bearing, and it is a judgment, not a threshold.
**Platform decides how it is said; author decides whether it is said.**

## The cost

Platform-owned frames means a finite set of sentence shapes, and players
will learn them. That is the real price of consistency, and it is the
same price `Mml` pays for markup. Mitigation: make the platform's
contribution **minimal** — closer to a marking than a sentence. The
author's fragment carries all the specificity; the platform contributes
only the fact that this was one of the moments, in a form that never
varies. **The less the frame says, the longer it survives repetition.**

---

# ⭐⭐⭐ Acts, never axes — the readable record

The question that closes the loop:

> ⭐⭐⭐ **User: "how does the player know what's available to reveal if
> they can't read the record?"**

The answer is already in `measurement.md` Part 6 and had been quoted
selectively:

> A self-view may show **your recent acts** — a record of what you have
> been doing, which you are entitled to — never *your position*, which
> you are not.

**You can read the record. You cannot read the derivation.** Different
objects, and the split is the true one: you know perfectly well what you
did last week; you have no idea what it adds up to.

⭐⭐ **This is not optional polish — the disclosure mechanic requires it.**
The psychology slate's load-bearing move is *"withhold the embarrassing
part → get an incomplete reading."* That is incoherent if you cannot see
what you are withholding. Blind disclosure is not a choice, it is a dice
roll. The mechanic only works because you are looking straight at the
moment you would rather not raise.

## ⚠ The one constraint that keeps it honest

> **The record shows acts, never axes.**

You see *"gave away the last of your water."* You never see that it
counted toward generosity, and never a valence. The moment the record
displays an axis label, you have read your own derivation off the tags
and the practitioner is redundant.

And act-without-axis is how memory actually works: you remember the thing
you did, not which trait it scored.

`recall` — one owner-only verb over your own frames, already built for
*half-remembering* — is probably most of this surface already.

## ⚠⚠ Two shipped surfaces already break this rule — and go live with the first authored moment

*"Acts, never axes"* is **not** a constraint this build gets to assert.
It is a **removal decision**, because two self-visible surfaces already
print a band, verified on `master` at `0d25ab62c`:

| surface | what it prints |
|---|---|
| the **`traits` verb** (`cmd/charactergen/traits.yaml`, *"Read your own defining traits"*) | `Disposition.poleLabel(...)` + **`a.band`**, per pronounced axis |
| the **`score` self-digest** (`ProfileLogic.selfDigest`, gated `isSelf`) | `digest.traits = [{ axis, band }]` |

Both are guarded by `if (axes.length === 0)`, so **today** they print
*"Your character is still taking shape."* — not because a rule protects
them, but because the ledger is empty (see the opening finding).

> ⚠⚠ **The first authored `dispositionValence` in the game is also the
> moment both leaks switch on.** There is no separate change needed and
> no test that would fail. The thing that hides them is the same thing
> that makes the trait system inert.

⭐ **This is a genuine product decision, not an oversight to sweep.**
Either the vocation is reframed around surfaces that already
self-report, or those two readouts are **withdrawn**, and withdrawing a
shipped verb is a real cost with a real conversation attached. It cannot
be settled by adding a rule to a slate.

⭐ **The distinction that already decided the sibling case** (from S1,
figures-on-the-wire): trait position was deliberately excluded from the
live standing figures, with a guard test asserting no subscribable field
name matches `trait|disposition|personality`. The reasoning — **a verb
you choose to type is an act; a pinned always-on readout is ambient** —
puts `traits` and `score` on the defensible side of that line. Which is
an argument for keeping them, and it is in tension with everything above.
Unresolved, and it is the first thing requirements must settle.

---

# ⭐⭐ "There's a fact of the matter on the record" — the objection dissolves

> ⭐⭐ **User: "the problem with my model is there's a fact of the matter
> on the record and that doesn't exist in real therapy — the only record
> is what gets disclosed in session (and even then, my therapist doesn't
> take notes)."**

Real therapy does have a fact of the matter. **It is your life.** You
actually did those things. The record exists; your therapist simply has
no access to it and never will. All they ever get is what you tell them,
filtered through what you remember and what you are willing to say.

That is exactly the game's structure. `disposition_events` is not a case
file — it is *what happened*. The practitioner never reads it; they read
the slice you disclose. **A life leaving traces is the least fictional
thing in the design.**

⭐ **The no-notes observation is worth keeping as a live option.** The
psychology slate spends real worry on the practitioner's file as a
subpoena target. A practitioner who keeps no file has nothing to leak.
That should be a choice they make, with consequences either way — and it
is a cheap, diegetic answer to a problem the slate left open.

---

# Rejected, and why (kept so they are not re-proposed)

## The informant / SOKA model

Proposed: stop hiding the position; instead show a **biased self-view**
(accurate on internal axes, self-enhancing on evaluative ones, per
Vazire's self–other knowledge asymmetry model) alongside **informant
impressions** stored in a new `IMPRESSION` realm on `BeliefStore`, with
the therapist's job becoming *gather collateral and show you the gap*.

It is well-grounded science and it removes `measurement.md`'s awkward
carve-out from *"any measurement the platform makes of you is one you can
read."*

⚠ **Rejected on scope and legibility.** It is a whole second interaction
to log, built to serve a model that is more defensible in a journal than
at a table:

> **User: "IMPRESSION is a whole other interaction to log? What exactly
> are we trying to simulate at this point?"**

The simulation target is **the session** — disclose, get a reading, the
reading is only as good as what you disclosed. That is the thing players
have actually experienced. *Kept on file:* if the practitioner's reading
ever needs a second source, this is where to look.

## The unattributed-narrator design

Proposed: the narrator's voice is never identified; the world contains
devout who say it is Aletheia and doubters who say it is just you
noticing yourself, and the game never adjudicates.

⚠ **Rejected as over-built.** It required a lot of supporting content
across several parties to make one idea legible, and a player has to
infer the whole thing to get any of it. What survives is the free part:
the voice is never embodied, which the bible already settled.

## The anti-gaming arguments

> **User: "most of your concerns about players gaming things and learning
> the mechanics I don't really share. We're building a simulation and
> you're either going to engage with that sim in good faith or you won't
> — and if you're in the latter camp, hopefully we can measure that and
> make it affect your standing."**

Struck: *"narrating everything is a tutorial in farming"* and *"cheap to
look different this week, expensive to be different"* as a design goal.
Bad-faith engagement needs no new mechanism — renown, participation and
the producer stock already measure engagement quality, and accountability
measures harm. This is `measurement.md`'s own **"the platform records; it
rarely forbids."**

⭐ **What survives is not an anti-gaming argument and should never be
restated as one.** Two of the four concerns were coherence conflicts:
authors leaking magnitude (good-faith authors defeating a rule by
writing well) and band-transition triggers (the platform making the
therapist redundant). Neither depends on a player behaving badly.

---

# ⚠ The status of B4

`measurement.md`'s B4 — *"the write is visible; the value is not — and
never a gauge"* — is **Tier B: amendable by whoever ships the code.** It
was treated as fixed for most of this conversation and it is not.

> **User: "the reason things like B4 exist is mostly pedagogical. If you
> can come up with an alternate model that's honest and educational,
> everything else is negotiable."**

**B4 stands, with its justification replaced.** The anti-gaming framing
is struck. What it rests on now is the psychology slate's own argument,
which is a claim about people rather than a guard against players:

> ⭐ **A stat sheet showing your own personality would be the
> UNREALISTIC feature.**

People are genuinely poor at self-assessment and genuinely better at
reading others. That asymmetry is why the profession exists in life, and
it is what makes the vocation honest rather than a trainer-NPC
contrivance. **Not *hide it so they can't optimize* — hide it because it
is true.**

---

# ⚠ Guardrails

| | |
|---|---|
| **acts, never axes** | the readable record shows what you did, never which axis it fed or how much. One axis label and the practitioner is redundant |
| **band-blind narration** | identical prose at valence 20 and 70. This is the platform's whole reason to own the frame |
| **no band-transition triggers** | a gauge with one tick |
| **author decides whether; platform decides how** | the author is the only one who knows a moment was load-bearing |
| **ledger-shaped, not trait-shaped** | advancement has the identical hole and shares the `ActSignature`. Instrument once |
| **the narrator is never embodied** | already settled by the bible for gods generally |
| **narration is salience, not a readout** | the moment it reports a change, it has become a bad therapist |

---

# Open questions

1. ⚠⚠ **Keep or withdraw `traits` / `score`?** The two shipped
   self-readouts above. Everything else in this slate assumes they go;
   the S1 *act-vs-ambient* distinction argues they stay. **Settle this
   first** — it decides whether the practitioner has anything to sell.
2. **What is the minimal frame?** The cost section says *closer to a
   marking than a sentence*, which is a direction, not a spec. Needs a
   concrete authored example against a real scene before it can be
   planned.
3. **Does the fragment live on `ActSignature` or beside it?** Narration
   is wanted for ledger writes that carry no disposition at all (a
   chronicle deed, an advancement conferral), so the field may not belong
   on the disposition channel.
4. **Which `self` leaf?** The root is closed (`body` `standing` `holding`
   `group`); a narration frame is none of those cleanly. `standing` is
   the nearest fit and may be wrong.
5. **Who authors the first ones?** 14 NPCs carry static `dispositions:`
   and nothing else in the world writes a disposition row. The first
   authored `dispositionValence` is also the first test that any of this
   works end-to-end.
6. **Does the practitioner's no-notes option need mechanics**, or is it
   simply a practitioner declining to write a file? *Leans the latter.*
7. **Does salience need to be visible to the author as a budget?** If
   narrating is free, everything narrates and salience stops meaning
   anything. Unresolved — and the honest version of the "spam" worry,
   restated as an authoring-discipline problem rather than a player one.
