# The mortal vessel — selfhood, death, recovery & moderation (working slate)

> **Status: design-phase, deferred-rpg.** The *architecture of selfhood* on
> the platform: the split between the enduring participant and the mortal
> body, and everything that operates on the body — severe injury, death,
> recovery, rebirth, and moderation. Driven by the death-and-recovery
> interrogation off [combat-experience-slate.md](./combat-experience-slate.md);
> combat only *produces the death event*, this slate owns the consequence.
> It straddles the platform line — the function-over-form rule and the
> moderation model are platform-fundamental, the death arc is game design —
> which is exactly why it needs its own home. Nothing here is a build.

The one-sentence thesis: **the participant is inviolate, the vessel is
mortal, and everything the world does to your body — wound it, kill it,
jail it — operates on a re-mintable vessel while your civic and social
personhood survives untouched.** Function over form, because we are a
platform first.

---

## Thesis 1 — The three-layer self

A "player" is three layers, and the platform already half-models them:

- **The Participant / Citizen** — the enduring platform identity: the
  account, the voter, the chat voice, the audience member, the forum
  poster, the property owner, the office-holder. Never injured, strangled,
  unconscious, or dead. This is the `User` / `Login` / `Interactive` /
  connection layer and the **shared-not-wrapped client frame**
  (`ConnectionIndicator` / `AccountMenu`) that persists no matter what is on
  the world pane.
- **The Vessel / Body** — the mortal embodied avatar in the physical sim:
  vitals, trauma, poise, location, loadout. Disposable, re-mintable. What
  combat acts on. The `Avatar` / `Character` / vitals layer.
- **The Shade** — the interstitial self *between* vessels: a Participant
  with no body. The Hades layer; the answer to "what and where are you
  while the corpse is processed."

The split is not new architecture — it is the existing
`Login`↔`Interactive`↔`Avatar` handoff ([connection.md], [state-model.md])
named and made load-bearing.

---

## Thesis 2 — Function over form (the platform rule)

**Platform functions attach to the Participant and are never severed by
physical-layer state.** The diegetic simulation is a layer you are
*embodied into*, not the ground of participation. The honest line:

- **Embodied acts** (require a working vessel): say/shout/whisper across a
  room, emote, fight, work, carry, move, hold your body's belongings.
  Strangling you *does* stop these — the fiction working.
- **Platform acts** (ride the Participant, always available): chat with the
  livestreamer, vote, post/read forums, DM, watch the stream, be present as
  audience, hold property and office.

So being strangled means you can't shout across the tavern — but you are
still fully in the livestream chat and can still vote. Not immersion-
breaking once **legible**: you are the *audience/citizen* in that moment,
not the fighter, and the client already models it — the **world pane goes
dark/spectator, the platform frame stays lit**. Losing your vessel dims one
view; it never logs you out.

This puts the stakes of death in the right place: death costs you your
**embodied agency** — physical presence, in-world productivity, your body's
belongings, and the price of rebirth. Heavy. It never costs you your **seat
as a person.** Death is real without being disenfranchising. (This is where
*function must win over form* — we lean into platform strengths.)

---

## Thesis 3 — Governance integrity *and* law enforcement (two jobs)

"You cannot disenfranchise someone by knocking them out" is a hard
**integrity floor**: governance (voting, conviction, office) attaches to
the Participant, so no physical act touches it. (The enfranchisement anchor
from the influence work — the *citizen* is the enfranchised unit, the
vessel merely its avatar.) But embodied assault is still a crime the
consequence web discourages. Two mechanisms, different jobs: the physical
attack **cannot** sever function (integrity), **and** attempting it is
blameable (blame ledger → guards → courts). Integrity is the unbreakable
floor; law enforcement is the deterrent on top.

---

## Thesis 4 — Moderation as diegetic capability-state

Old world: ban = can't log on (pure exclusion — unrehabilitative, Sybil-
porous). New world we can do better, and it is the *same* architecture:

**A moderation action is a capability revocation on the Vessel/Participant,
enforced by call-security** — the exact gate governing wizard/author/office
powers. A muted player has `Vocal` revoked; a restricted player loses
verbs; a **jailed** player is confined to a zone (a parcel they cannot
leave). Moderation-as-capability-state, not moderation-as-connection-kill.

The spectrum:

- **Hard exclusion** (the account is gone) — the nuclear floor; still exists
  for genuine malice / bots / legal.
- **Diegetic constraint** (prison / probationary sandbox) — the innovation:
  present, but embodiment confined to a designed space **with a path out**
  — a *rehabilitative recovery arc*. Serve time, demonstrate reform (a
  behavior gate), be released to full embodiment.
- **Soft restriction** (mute, limited verbs) — the minor-offense slap.

The rehabilitative middle is the point: punishment becomes a *designed
experience that reforms*, **adjudicated** (the courts / jury-pool primitive
— a sentence, not a whim), and **scalable on the same recovery-cost dial**
as physical injury. It keeps an engaged-but-misbehaving player inside the
system where reform can happen, instead of bouncing them to a new account
angrier.

---

## Thesis 5 — The unification: prison ↔ Hades are one pattern

A **dead** player and a **jailed** player are the same architectural state:
**a Participant whose Vessel is unavailable, occupying a liminal diegetic
space with a designed path back to full embodiment.** Death-recovery and
punishment-rehabilitation are *one substrate*:

- The **underworld** (vessel lost to death) and the **prison** (embodiment
  suspended by sanction) are siblings — constrained spaces occupied while
  the normal body is off the table.
- Both are **recovery arcs** with a path out (the recovery-as-its-own-arc
  principle — one applied to *mortal* injury, one to *social/moral* injury).
- Both preserve the Participant (still a citizen/audience) while restricting
  embodied agency.

**Build the liminal-space + path-to-re-embodiment substrate once; death and
prison are two skins on it.**

---

## Thesis 6 — The death arc

The three orthogonal axes (from combat-experience): the **arc** is
invariant (same dramatic shape regardless of stakes); the **stakes = the
recovery cost** (you do not set abstract stakes, you set how costly the
recovery is — a bruise recovers in minutes, a maiming in weeks, death is
the longest arc); the **recovery is its own dramatic arc** (the falling
action the climax seeds — defeat *starts* a story). Death is simply the
**longest recovery arc**: not permadeath (kills engagement), not free-
respawn (no stakes) — severe, costly, diegetic, recoverable.

Answering the two questions:

- **What/where are you while the corpse is processed?** You revert to the
  **Shade** — a pure Participant, bodiless, in the **interstitial**
  (underworld/between). *Not offline*: still in chat, still a voter, still a
  citizen — but you cannot *act* in the physical world (no fighting,
  earning, producing, owning-new, room presence). That diminishment is
  deliberate: the interstitial should be a place you want to *leave*, so
  there is a pull back to embodiment (nobody should prefer to live as a
  shade). Two clocks run in parallel — the **world** processes your corpse
  (the coroner economy, decay, the reset sweep) while **you** experience the
  interstitial; rebirth rejoins them.
- **When the body comes, what narrative shape?** The **escape-from-Hades**
  template, *dialable* (see Thesis 7). Its beats: **the passage** (from a
  trivial "you surface at the temple" up to a full Orpheus quest); **the
  mint** (a **patron/altar/church grants the new vessel** — the existing
  altar/sacrifice/patron lore is the diegetic engine; the *terms* of the
  mint are the recovery cost: a debt, a favor, a mark, a diminished
  vessel); **the re-embodiment shape** (restored-at-the-temple → a fresh
  unmarked vessel → a scarred vessel far away carrying a debt). *Which power
  you are under* shapes it — a harsh patron, a brutal rebirth; a gentle one,
  a soft landing.

Shape: **death → Shade in the interstitial (Participant intact) → the
passage → re-embodiment (patron mint, terms = recovery cost).**

---

## Thesis 7 — The passage is opt-in at thresholds; recovery scales with richness

The depth of the death-passage is **not imposed — it is opted into at
thresholds**, and the *recovery reward scales with the richness of the
experience you take on.* Two sides of one dial:

- **The imposed penalty is a floor** — the minimum diminishment of a plain
  death (a quick, cheap surfacing with the standard cost). You are **never
  forced into a quest**; the default is lightweight.
- **You can elect a richer passage** at successive thresholds — a trial, a
  bargain, a full escape-from-Hades journey — and **the fuller the arc you
  undertake, the fuller the restoration you earn**: less diminishment,
  restored standing, a better vessel, perhaps a boon. Opting into depth
  *converts penalty into a rewarded arc.*

This makes death-recovery an **engagement opportunity, not merely a
penalty** — you can turn your death into a story and be *rewarded for the
richness of the telling*, which is dead-on for the reward-roleplay /
emotional-weather / participation-not-hoard doctrine (rich engagement pays,
grinding does not). The floor keeps death meaningful; the opt-in ceiling
makes it playable content instead of a punishment timer. Depth is a
*choice with a payoff*, tunable per patron/realm.

---

## Thesis 8 — PC vs NPC recovery are different animals

- **PC** — an open-ended, player-driven recovery arc through this substrate
  (Shade → opt-in passage → patron mint). The player *lives* the arc.
- **NPC** — cycles at the **narrative level, predictably**, not through the
  shade/rebirth path. A named NPC's death can be *permanent within its
  story* (the villain falls at the climax — that *is* the story) while the
  *narrative* cycles for the next player. Two tools: **convergent** cycling
  (authored, dynamic — divergent paths reconverge to a consumable state by a
  varied path: the village heals, a successor takes the role) and **hard
  reset** (the residency reset sweep + re-clone — act 1, scene 1).
  Generic/populated content cycles at the *ecology* level; named/carved
  content cycles at the *narrative* level; neither resurrects the character.
  (See combat-experience Thesis on aftermath/cycling.)

---

## Deferred / boundaries (named at their sites)

- **Adjudication** — the courts / jury-pool primitive that turns a ban into
  a *sentence* (see the courts-judiciary work). This slate assumes it.
- **The patron-mint economy** — what a rebirth *costs* and who grants it;
  routes through the altar/sacrifice/patron lore. Its own design.
- **The coroner / scrapper / animal-control labor economy** — the world-side
  corpse/scrap processing (aftermath cycling as *jobs*, the employment
  engine + material economy); combat-experience owns the framing.
- **The interstitial content** — what the Shade actually experiences; the
  escape-from-Hades set-pieces.
- **Permadeath** — the opt-in extreme end of the recovery-cost dial.
- **Combat's boundary** — combat produces the *death event* only; the vessel
  is unmade there, everything downstream is this slate.

---

## Cross-references

- [combat-experience-slate.md](./combat-experience-slate.md) — the arc ⊥
  stakes ⊥ recovery decomposition, the aftermath fan-out, layered player-
  labor cycling, narrative-level NPC cycling. This slate is its death/
  selfhood consequence.
- [combat-slate.md](./combat-slate.md) — the mechanism that produces the
  death event (two-stage death, the coup).
- [../../subsystems/connection.md](../../subsystems/connection.md),
  [../../subsystems/state-model.md](../../subsystems/state-model.md) — the
  `Login`↔`Interactive`↔`Avatar` handoff the participant/vessel split names.
- [../../subsystems/call-security.md](../../subsystems/call-security.md) —
  the capability-revocation gate that enforces moderation-as-state.
- [../../subsystems/vitals.md](../../subsystems/vitals.md),
  [../../subsystems/harm.md](../../subsystems/harm.md) — the vessel's injury
  substrate; the death seam.
- [../../subsystems/residency.md](../../subsystems/residency.md) — the reset
  sweep (corpse/NPC hard-reset cycling).
- The altar/sacrifice/patron lore and the courts/jury-pool primitive — the
  diegetic engines for the mint and the sentence (design memories, not yet
  subsystem docs).
