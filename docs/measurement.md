# Measurement and standard — what the platform counts, and who says what it is worth

> **Layer: the platform.** The fourth orienting doc, alongside
> [design-philosophy.md](./design-philosophy.md) (how honestly the world
> is *modeled*), [interaction-philosophy.md](./interaction-philosophy.md)
> (how a player *meets* it), and [standard-model.md](./standard-model.md)
> (what it is *made of*). This one is about what the platform is allowed
> to **count**, who is allowed to say what a count is **worth**, and what
> may be **imposed** regardless.

**Status: design constraint.** A peer of
[arcane-science.md](./arcane-science.md) (what magic may claim) and
[compact-political-science.md](./compact-political-science.md) (what the
polity may claim). It changes no mechanic. It constrains every system
that measures a person — advancement, traits, renown, participation,
influence, chronicle, faith, and every future one.

It exists to answer a question `standard-model.md` deliberately left
open. That doc's **honest edge** names the risk and defers it:

> *"Gamifying real life is behavior engineering… An honest gamification
> framework has to treat that boundary as a first-class design concern,
> not a footnote — the same way the engine refuses to lie about physics,
> it should refuse to lie about why it's rewarding you."*

This is that concern, made first-class.

⚠ **Scope.** `standard-model.md` names *two* risks. This doc answers the
first (behavior engineering). It does **not** answer the second
(sensors imply surveillance) — see [§ What this does not
cover](#what-this-does-not-cover).

---

## The question, in the form it actually arrives

Every conversation about gamifying a life ends in the same place: *whose
values are you optimizing me toward?* The standard answer —

> *"We give you the controls; you set your own incentives. We impose
> nothing."*

— is the answer **every attention company gives.** Tobacco gave it. The
feed gives it. It is not a differentiator, and worse, **it is not true**:
this platform imposes conservation of money, the good-floor, consent
gates on combat, and a code-trust lockdown, and anyone who looks will
find them.

An answer that is both false and indistinguishable from the adversary's
is not worth defending. The real answer is structural.

---

# Part 1 — The three layers

The platform separates three things that most software fuses:

| # | Layer | Who sets it | Property |
|---|---|---|---|
| **1** | **Measurement** | the engine | witnesses acts, derives quantities. Honest, auditable, **silent on worth** |
| **2** | **Valuation** | ⭐ **the subject** | the standard against which a quantity means something |
| **3** | **Imposition** | ⚠ **three different parties** — see Part 10 | the small set that applies regardless — **enumerable**, and amendable *by someone*, but not all by the same someone |

> **The engine counts. You say what counts. Someone else says what
> everyone must.**

⚠ **An earlier draft said "the polity" and "amendable," flat.** Both were
wrong, and enumerating layer 3 (Part 10) is what exposed it: a third of
it is not amendable by the polity, and some of it is not amendable at
all without destroying the platform's ability to make honest claims.
Layer 3 has **three tiers of entrenchment** — which is not a special
pleading, it is the ordinary constitutional structure the
[Compact course](./compact-political-science.md) already teaches (Art. X,
four tiers ending in eternity clauses).

Fusing any two produces a known failure. Fuse 1 and 2 and you get the
scoreboard that tells you what to want. Fuse 2 and 3 and you get a state
religion. Leave 3 empty and you get the lie above.

## The same structure, three times

This is not a religion mechanic or an education mechanic. It is the
platform's shape, and the visible systems are instances:

| | Layer 1 measures | Layer 2 values | Layer 3 imposes |
|---|---|---|---|
| **faith** | the chronicle's deeds | the precepts of a patron you declared | the good-floor |
| **education** | the transcript's evidence | what you set out to become | credential integrity |
| **standing** | renown and participation events | what you think is worth being known for | the conservation rules |

Faith is the clearest case because the gap between layers 1 and 2 has a
name: **the god you name versus the god you feed.** That gap is the
general mechanism, not a religious one.

---

# Part 2 — The differentiator is a property, not a promise

Promises do not survive scrutiny. Properties do. The distinction between
this platform and the thing it is defined against is already written in
[story-bible.md](./story-bible.md) as two saints:

> ⭐⭐⭐ **The feed measures you and hides the measurement. The mirror
> measures you and shows you.**

**Mara** — the patron of the Feed — requires that you *not* see your own
engagement curve; the business model fails if you do. **Aletheia** —
patron of the honest count — is the same measurement pointed the other
way: connection that reveals you rather than keeps you.

Same information asymmetry, opposite sign. That is checkable, not
asserted, and it yields the platform's actual commitment:

> **Any measurement the platform makes of you is one you can read.**

A derived quantity you cannot inspect the evidence for is Mara's shape
regardless of intent. This is why the ledgers are append-only and
readable, why competence derives from a transcript you can see, and why
`recordAuthoring` and the blame ledger derive rather than stamp.

---

# Part 3 — ⚠ Layer 1 is not neutral either

The honest limit, stated before someone finds it.

**Which quantities get measured at all is a value judgment.** If the
world models study hours and not sleep, it has expressed a value before
anyone declared anything. A faith can only write precepts over deed-tags
the engine emits; a life can only be gamified along axes the engine
counts. **The vocabulary underneath everyone's declared standard is
authored.**

This is [balance-slate](./slates/builds/balance-slate.md)'s point in a
different suit — *every global ledger is a currency, and the denominator
is where the design is.*

So the claim is not *"we impose no values."* It is:

> ⭐⭐ **We impose only at the level of what gets measured, we make that
> level explicit, and we put it where it can be argued about.**

Which has a concrete consequence: **the measurement vocabulary belongs
in the governed layer.** What the world counts should be amendable the
way the law is, not settled in a wizard's YAML file. *(Open — see
[§ Open questions](#open-questions).)*

---

# Part 4 — ⭐⭐ Nobody starts neutral

The second correction, and it comes from
[lineage-slate](./slates/builds/lineage-slate.md).

"You set your own incentives" implies a blank slate. There isn't one, and
pretending otherwise is both false and a worse story. You are the child
of a household; what you know you learned there, and so is what you were
taught to owe. Char-gen seeds your `equilibrium`; it does not ask you to
choose it.

> **Genotype is inherited. Disposition is learned from.** Same card, two
> mechanisms.

So the honest form of the whole pitch:

> ⭐⭐⭐ **You arrive with a standard you did not choose, an honest
> measurement of how you are living against it, and the ability to
> change it — slowly, by living differently.**

That answers the paternalism objection *better* than neutrality does,
because it does not claim a neutrality nobody has. The platform hands
you an inherited position, an honest mirror, and a costly exit. It is
also [lineage-slate](./slates/builds/lineage-slate.md)'s own line: *you
arrive with a past you did not choose and a future you do.*

---

# Part 5 — The mirror has arithmetic

[trait-slate](./slates/builds/trait-slate.md) supplies the mechanism, and
it generalizes past personality to any declared standard:

```
expressed  =  equilibrium + recent deviation
```

Two readings of one ledger at two half-lives. **Equilibrium** is who you
are — slow, expensive. **Expressed** is who you have been lately — fast,
and **mean-reverting**: absent new evidence the deviation decays and
expressed relaxes *back toward equilibrium*, not toward zero.

Four properties fall out, none of them bolted on:

1. **Falling short is a deviation, not a state.** There is no fallen flag
   to set or clear.
2. ⭐ **Redemption is free and automatic** — it is the mean reversion. The
   good-floor is not a mercy rule; it is the arithmetic.
3. ⭐ **You can grow out of your upbringing, slowly.** Sustained contrary
   behavior moves equilibrium. Leaving a standard is not a menu action;
   it happens to you and you recognize it later.
4. **Anti-farming for free:** *cheap to look different this week,
   expensive to be different.*

---

# Part 6 — What the mirror may show

Three reading rules. They are the operative part of this document.

**1. The write is visible; the value is not.** People have excellent
access to their actions and terrible access to their dispositions. You
know what you just did; you do not know what you are like. So a write may
narrate itself — *"that was a generous thing to do"* — and **never** a
magnitude or a position.

**2. Announce the surprising, not the every.** Narrate a write when it
pushes `expressed` away from `equilibrium`. Narrating everything is a nag
*and* a tutorial in farming. The line it produces —

> *You'd not have done that a year ago.*

— is, unmodified, the register conscience actually speaks in. **The
deviation is the story.**

**3. ⚠⚠ The mirror is never a gauge.** No fidelity meter, no sin counter,
no progress bar, no streak, no leaderboard over a declared standard.

> **A number converts a standard back into a score to optimize — which
> is Mara wearing vestments.**

This is the same firewall as bands-not-theta, and it protects the
psychology thesis: **you cannot read yourself; disclosure is discovery.**
A self-view may show *your recent acts* — a record of what you have been
doing, which you are entitled to — never *your position*, which you are
not.

---

# Part 7 — ⭐ The first screen is the syllabus

Character creation is the only moment when the whole system surface is
visible to someone who has learned nothing, with their full attention on
it. Treating it as a personalization screen wastes it.

> **Char-gen's job is to teach the platform's vocabulary, and every field
> is a first lesson in a system.**

Which yields a design rule sharper than any column budget:

> ⚠ **A field that teaches a lie is worse than no field.** It spends the
> player's one attentive moment mis-teaching them.

The worked case, from the [lineage](./slates/builds/lineage-slate.md)
gallery. A household's faith is shown as **name plus obligation** —
because a vocabulary is taught in pairs, and because the gloss is where
the system's nature is either taught or betrayed:

| shown | taught |
|---|---|
| *Eir — goddess of healing* | ❌ **domain.** Reads as a buff. Player arrives expecting a cleric |
| *Eir — tend the hurt* | ✅ **duty.** Reads as something asked of you |

Every player arriving from a genre RPG has the first expectation
preloaded. The gloss is imperative, always: **a thing you owe, never a
thing you get.**

---

# Part 8 — ⚠ When a standard is applied by others

Layers 1–3 describe a standard you set for yourself. A **congregation** —
or a guild, a faculty, a crew — introduces a standard applied *by other
people*, and the self-incentive argument does not cover it. Nobody else's
opinion is at stake when you set your own goal.

It needs its own justification, and there is exactly one:

> **Mutual, symmetric opt-in with cheap exit.** They declared the same
> standard, its precepts are public, and leaving costs nothing but the
> affiliation.

That makes it a club rather than a jurisdiction — and it makes two
properties **non-negotiable**: declaring is opt-in, and leaving is cheap.
If either erodes, the group becomes a coercion surface and none of this
document's defenses apply to it any more.

The related guard is already the
[skill-vs-chance lens](./lenses/skill-vs-chance.md)'s: anything that
pressures a player into a judged contest — social pressure, economic
necessity — erodes consent, and consent is what is doing the work here.

---

# Part 9 — What this forbids

A checklist, because the abstract version is easy to agree with and hard
to apply.

| Forbidden | Because |
|---|---|
| a hidden measurement of the player | Mara's defining property (Part 2) |
| a gauge on a declared standard | converts a standard into a score (Part 6.3) |
| the platform ranking players on a valuation it chose | fuses layers 1 and 2 |
| variable-ratio reinforcement — loot boxes, gacha, pity timers | the one RNG application banned on ethical rather than design grounds ([uncertainty.md](./uncertainty.md)) |
| streaks that punish absence | imposes a valuation (*continuity is good*) nobody declared |
| an imposition that is not enumerable | if it cannot be listed it cannot be amended (layer 3) |
| narrating every disposition write | teaches farming (Part 6.2) |

⚠ **A live inconsistency:** [vision.md](./vision.md) still promises
*"familiar gamification elements such as achievement tracking, badges for
accomplishments, and leaderboards."* **A leaderboard is a platform-chosen
valuation ranking players** — a layer-1/2 fusion, forbidden by this doc.
That line predates the ledger architecture and should be revisited rather
than quietly contradicted.

---

---

# Part 10 — ⭐⭐ The enumeration of layer 3

The list Part 1 asserts and owes. **An imposition is a rule that binds
regardless of what anyone declares.** The test that keeps it honest:
*could a player, an author, or the operator opt out of this by declaring
otherwise?* If yes, it is not layer 3.

Three tiers, by **who can change it** — and the tiers are what make the
"amendable" claim survivable.

## Tier A — Integrity invariants · amendable by **nobody**

The test: **violating it would let someone lie to a player, and no
version of the platform that violates it can be trusted.** These are the
eternity clauses. They are not policy choices and there is no legitimate
process for changing them.

| # | Invariant | Enforced at |
|---|---|---|
| A1 | **Monetary conservation.** Every ledger leg balances; the reserve is the only mint; ⚠ a leg may never cross currencies | the sealed `postTransaction` chokepoint; `BankTransaction` **throws** on breach ([banking.md](./subsystems/banking.md)) |
| A2 | **Ledgers are append-only.** `bank_ledger`, `chronicles`, `transcripts`, `authoring_events`, `accountability_events`, `renown_events`, `participation_events`. **You cannot edit your past** | per-collection write paths |
| A3 | **Derive, don't track.** Competence, traits, renown, standing and **culpability** are derived on read, *never a stamped stat* | [accountability.md](./subsystems/accountability.md), [advancement.md](./subsystems/advancement.md) |
| A4 | **Title is stored separately from the content it gates** | [parcel.md](./subsystems/parcel.md)'s *governing security invariant* |
| A5 | **Transfer never overwrites.** Chain of title, on parcels and chattel | `parcel_events`, `chattel_events` |
| A6 | **No aleatory resolution.** No die between a choice and its outcome | [uncertainty.md](./uncertainty.md) category 4 |
| A7 | **The principal comes from context, never a parameter.** Authorship and actor identity are derived by the gate, not passed by the caller | call-security; the `recordAuthoring` gate |
| A8 | ⭐ **Server-authoritative everything.** Nothing is pure client | the entire client-side cheat family — seeing through fog, editing state, speed — is void *in principle*, not by detection |
| A9 | ⭐ **Content-write never grants code execution.** Authoring content cannot name an executable class | the code-trust lockdown ([access.md](./subsystems/access.md)); `pnpm lint:instanceable`, `lint:gates` |
| A10 | **The preview is the outcome.** No hidden adjustment, no fudge, no thumb on the scale | analyze-preview parity; the deterministic resolution path |
| A11 | **Identity cannot be re-stamped.** `#templatePath` is hard-private, bracket-writes are runtime no-ops, the re-key seam is gated | `setTemplatePath` (ApiOnly), `_stampTemplatePath` caller-allowlist |
| A12 | **Evidence is idempotent and deduplicated.** Seeded claims apply once; replay no-ops | `TraitApi.seedClaims`, `recordOnce`, transcript dedup |
| A13 | **Transformation never creates matter.** Σ output ≤ input; short debits throw | [crafting.md](./subsystems/crafting.md) — *"lossless would break conservation"* |
| A14 | **The sandbox boundary is symmetric.** Nothing crosses into or out of a circle | the Layer-4 boundary; `pnpm lint:boundary` |
| A15 | ⚠ **The evidence firewall.** Kernel omniscience never becomes diegetic evidence | [enforcement-slate](./slates/builds/enforcement-slate.md) — *judgment call, see the audit* |
| A16 | ⭐ **Every reconcile-on-read consumer tolerates a backward clock** — re-stamp, integrate nothing | convention only; see *the clock finding* below. **Game time is NOT monotonic**, and this row is what makes that survivable |

⭐ Note what these have in common: **each is the reason some claim the
platform makes is believable at all.** Drop A1 and a fortune means
nothing; drop A2 and a chronicle means nothing; drop A3 and standing is
just a number someone set; drop A7 or A11 and provenance is a lie; drop
A8 and none of the others survive contact with a modified client. They
are not values — they are the preconditions for having values that mean
anything.

### ⚠ Audit — 2026-08-11

The first draft listed A1–A7 and was **incomplete**. Audited against
[lenses/cheatability.md](./lenses/cheatability.md), which turns out to be
an inventory of exactly this tier under a different name — its doctrine
*"you may automate your deeds; you may not forge your receipts"* is Tier
A's purpose in one line.

**Added:** A8–A15.

**Re-tiered:** the old **B6** (*code-trust is orthogonal to
content-write*) was in the wrong tier. Violating it voids **every** other
invariant — an author who can execute code can forge any record — so the
*invariant* is A9. What stays in Tier B is only the **policy** half: who
holds the wizard bit, and the fiduciary duty they owe
([wizard-duty-slate](./slates/builds/wizard-duty-slate.md)).

**Considered and not admitted:**

| Candidate | Why not |
|---|---|
| far-past reconcile guards | **deliberately inconsistent** — husbandry excludes the guard, mortality skips it. A per-subsystem policy, not an invariant |
| honest units (`Quantity<U>`) | Tier B. A wrong unit is a bug, not a forgeable claim |
| anti-grief lease / quota | policy (Tier C) |
| residency / self-eviction | operational; no claim depends on it |

### ⭐ The clock finding — checked 2026-08-11

The previous draft flagged *monotonic game time* as a possible missing
A-row. **Checked in code. It is not an invariant — game time genuinely
runs backwards — and it does not need to be one, because every consumer
already guards.**

**Where it rewinds:**

| Case | Behaviour |
|---|---|
| within a run | `anchor + realElapsed × scale`, with `reanchor()` before every `setScale`/`pause`/`resume` — no jump. ⚠ but the real source is `Date.now`, so an **NTP step backwards moves it backwards** |
| graceful restart (SIGTERM/SIGINT) | full snapshot written; resumes exactly. No rewind |
| ungraceful (crash, `kill -9`, `uncaughtException`) | **rewinds** to the last 5-minute backstop snapshot — documented and intended ([time.md](./subsystems/time.md)) |
| fresh or cleared DB | `loadOrSeed` seeds a **zero** clock while persisted stamps hold large values — the largest rewind of all |

**Why nothing breaks:** every reconcile-on-read host takes
`elapsed = now − stamp`, and on `elapsed <= 0` **re-stamps to `now` and
returns**, integrating nothing. Verified in all ten `*ClockStamp` hosts —
`Wet`, `Combustible`, `Furnace`, `Respiration`, `Metabolic`, `Thermal`,
`Growing`, `Cultivable`, `Charged`, `Caster` — plus `Vitals` at three
sites. The dying clock, which deliberately skips the linkdead *and*
far-past guards, still keeps this one, with the comment saying exactly
why:

```ts
if (dyingElapsed <= 0) continue; // clock ran backwards only
```

The worst case is therefore **lost accrual, never corruption**: an object
persisted after the last clock snapshot comes back with a future stamp,
forfeits that sliver of integration, and resumes.

> ⚠⚠ **But A16 is enforced by convention alone.** There is no base class,
> no shared helper, and no lint. A new reconcile-on-read mixin that omits
> the guard would produce silent garbage on the next crash recovery —
> a corpse warming up, a plant un-growing — and nothing would catch it.
>
> ⭐ **This is a cheap lint in the house style** (`lint:gates`,
> `lint:boundary`, `lint:instanceable`, `check-does-nothing` are all this
> shape): *any file declaring a `*ClockStamp` field must contain an
> `elapsed <= 0` guard.* Recommended, not built.

### ⚠⚠ What Tier A does not protect

The honest limit, from the same lens's *residue*:

> **A1–A15 protect the integrity of the record. They do not protect the
> uniqueness of persons.**

One human may hold many characters. Nothing in this tier prevents it, so
every per-character measurement is Sybil-exposed — which is
[the influence work](./slates/builds/reputation-slate.md)'s known open
flank, not a gap this document can close. Related: **external-credential
trust is imported, not derived** — a federated antecedent is only as good
as its issuer, and Tier A ends at the boundary.

## Tier B — Editorial commitments · amendable by **whoever ships the code**

Not the polity's to change, and not integrity either. These are choices
about what kind of thing this is. **The check on them is the AGPL-3 right
to fork** — which is the founder's only constraint, stated as such in
[wizard-duty-slate](./slates/builds/wizard-duty-slate.md).

| # | Commitment | Source |
|---|---|---|
| B1 | **Nothing may contradict real science.** One postulate, everything downstream honest | [arcane-science.md](./arcane-science.md) |
| B2 | **The good-floor.** Players are never evil; feeding evil is **drift, redeemable, not damnation** | [story-bible.md](./story-bible.md) |
| B3 | **Any measurement the platform makes of you is one you can read** | Part 2 |
| B4 | **The write is visible; the value is not — and never a gauge** | Part 6 |
| B5 | **No variable-ratio reinforcement.** No loot boxes, gacha, pity timers | [uncertainty.md](./uncertainty.md) |
| B6 | **The wizard roster stays small, and its holders owe a fiduciary duty** — the *policy* half of code-trust. ⚠ The *invariant* half is **A9**, not this | [wizard-duty-slate](./slates/builds/wizard-duty-slate.md) |
| B7 | **AGPL-3, and the right to run your own** | the licence |

> ⚠ **B7 is the tier's own enforcement.** Every other entry here is a
> promise by the people shipping the code, and a promise is worth what
> the exit costs. Fork-ability is what converts B1–B6 from assurances
> into something with a remedy.

### ⭐⭐ The platform records; it rarely forbids

Worth stating because it reshapes what "imposition" means here. B2 does
not stop you doing a terrible thing. Combat does not refuse lethal terms
against a non-consenting sentient — it **marks** them (`consented:
false`, the crime marker the blame ledger reads).

> **The imposition is almost never "you cannot." It is "it will be
> recorded, and the record derives honestly."**

That is a much lighter hand than a rule engine, and it is the same
commitment as Part 2 in a different register: the platform's power over
you is that it *counts*, and its discipline is that the counting is open.

## Tier C — Policy · amendable by **the polity**, through the Compact

The genuinely political layer — the
[amendment-library](./slates/builds/amendment-library-slate.md)'s legos.
Everything here is *meant* to change, and a build that hardcodes one of
these has made a political decision by accident.

- monetary policy — the wage rate, the reserve's mandate
- taxes and levies
- land use, zoning, the allowance cascade
- jurisdiction; what a Locality may declare
- **what constitutes a crime, and its penalty**
- office structure — seats, terms, elections, the executive veto
- free movement of goods, statutory right-of-way, full faith and credit
- disenfranchisement by inactivity
- ⚠ **the measurement vocabulary itself** — *proposed here, unresolved.*
  Part 3 argues what the world counts should be amendable the way the law
  is. It is currently Tier B by default, which is to say it sits in a
  wizard's YAML file and nobody voted for it.

## What is **not** layer 3

Frequently mistaken for imposition; all of it is layer 2 or content:

| Not an imposition | Because |
|---|---|
| your patron, aspiration, goals | declared — that is layer 2 by definition |
| a congregation's or guild's standard | mutual opt-in with cheap exit (Part 8) |
| a content pack's contents | a pack is a unit of review; installable and removable |
| trade / faith lean weights | generation bias, explicitly **never a rule** ([trade-roster](./slates/builds/trade-roster-slate.md)) |
| NPC opinion of you | derived from your acts, not imposed on them |
| competence gates on verbs | earned, and the evidence is inspectable |

---

## What this does not cover

- ⚠ **Surveillance**, the second risk in `standard-model.md`'s honest
  edge. This document governs what the platform may *do* with a
  measurement; it says nothing about what it may *collect*, what a sensor
  seam may attest, or what the model is allowed to remember.
  [mirror-slate](./slates/builds/mirror-slate.md) and
  [instrumentation-slate](./slates/builds/instrumentation-slate.md) hold
  that thread; it deserves its own peer doc.
- **Consent mechanics** as implemented — this states the requirement
  (opt-in, cheap exit), not the machinery.
- **The valuation vocabulary itself.** Which deed-tags exist is content,
  and per Part 3 arguably governed content.

## Open questions

1. ⚠⚠ **Does the measurement vocabulary belong in the Compact's governed
   layer?** Part 3 argues it should. It is the difference between
   *"wizards decide what counts"* and *"the polity does,"* and it is
   unresolved. It also decides the shape of the faith build's precept
   vocabulary.
2. ~~What is the enumeration of layer 3?~~ **Answered in Part 10**, and
   it corrected Part 1: impositions are enumerable but **not uniformly
   amendable**. ~~Is Tier A complete?~~ **Audited 2026-08-11** — it was
   not; A8–A16 were added and one entry re-tiered. The monotonic-clock
   question was **checked in code and resolved** — time is not monotonic,
   every consumer guards, and the guard became A16. Its residue is a
   recommended lint, not a design question. **Tier C's last row** —
   moving the measurement vocabulary from a wizard's YAML into the
   governed layer — remains the single largest open decision here.
3. **How is "cheap exit" verified?** Part 8 makes it non-negotiable
   without saying how a build demonstrates it.
4. **Does the reading rule survive contact with the client?** A cockpit
   pane is under constant pressure to display a number. Part 6.3 is the
   rule most likely to be eroded by UI convenience.
