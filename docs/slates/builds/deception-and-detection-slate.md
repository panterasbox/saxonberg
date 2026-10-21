# Deception & detection slate — the actor, the mark, the part; suspicion; clues; the detective

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of the
> privacy conversation. The **mechanics of masquerade** are the
> [privacy slate](./privacy-slate.md) § 8 (belief v2); this slate is what *reads* them:
> who is fooled and how the engine shows it, how evidence reaches a player, what authors
> author, and the detective. What ships: per-viewer belief and the targeting gate
> ([belief.md](../../subsystems/belief.md)); one renown schema for players and NPCs, with
> dossier-seeded claims ([renown.md](../../subsystems/renown.md),
> [identity.md](../../subsystems/identity.md)); **susceptibility** designed as the authored
> NPC knob (*"how easily this NPC is swayed … lives on the NPC, never on the player"*);
> dirt by kind and site ([cleanliness.md](../../subsystems/cleanliness.md)); the forensics
> and awareness Disciplines.
> **Left:** the three-party table · NPC suspicion as behavior · the player mark's graded
> rendering · clues as derived traces read at competence · the author's division of labor
> · the detective · the who's-who (before any full cast manifest) · the unforgeable person
> marker · the griefing layers as dials
> **Size:** a build

## 0. The stance that keeps it subjective **[DECIDED]**

The owner: *"it's a very subjective experience … we can't just make decisions for the
player; we have to create a model that exhibits a certain level of suspicion, and that
suspicion is detectable on some variable spectrum based on the player's ability to decode
the game's responses."*

**The engine never decides what anyone concludes.** It does two things only — **derives
evidence** (what is perceivable, at the detail the perceiver's competence resolves) and
**models NPC suspicion** (NPCs are the game's characters, so their beliefs are the engine's
to simulate). **Players are never told a verdict** — they get evidence and NPCs' behavior,
and decide. The engine must not do the player's job.

## 1. ⭐⭐⭐ The three parties **[DECIDED — the owner's axis]**

*"There's 3 parties: the actor, the mark, and the part they're playing which may be an
actual third party or a fiction. Any one of these parties can be an NPC or a player and the
experience is way different depending on which combination is playing out."*

The part has **three kinds**: **a specific person** (a Cast NPC or a player), **a role** (a
guard, a priest, an officer — checked against role markers: the uniform, the papers, and
whether the mark knows every holder of the role), **a fiction** (an invented individual).

The decisive split is **the mark**: an **NPC mark** → the engine *simulates belief*; ⭐ a
**player mark** → the engine controls only **what they perceive** — a rendering that degrades
with the disguise's fidelity against their discernment (*"Augie"* · *"Augie, though his voice
is wrong"* · *"someone in Augie's apron"*) — and the human decides.

| actor | mark | part | what the engine does | notes |
|---|---|---|---|---|
| ⭐ **player** | **NPC** | **NPC person** | simulates the mark's belief: does M know R, fidelity vs discernment, **where R actually is** | **the primary use case** (the owner) |
| player | NPC | role | role markers; whether M knows every holder | impersonating a guard |
| player | NPC | fiction | plausibility against the setting, consistency | the persona |
| player | **player** | NPC | graded rendering only | |
| player | player | fiction | renders the persona's name (its own referent) | pure roleplay |
| player | player | player | rendering; ⭐ the aether gives you away | the griefing case (§ 7) |
| ⭐ **NPC** | **player** | NPC, role, fiction | renders the authored deception; **traces and inconsistencies to find** | **the authored con man — the mystery's engine** |
| NPC | NPC | any | background drama | authored, not simulated — expression is inelastic |
| NPC | any | **player** | the doppelgänger | § 7 |

### ⭐⭐ The primary case — a player as an NPC, to an NPC

- **The actor can only impersonate someone they know** — the part resolves through the
  actor's own memory (you learned Augie's name and face). No global search.
- **Whether the mark knows R** — by following references from the mark's side: coworkers
  (the employment roster lists its assignees), household (lineage), locality (R's renown in
  the mark's scope). Familiar people check harder.
- ⭐ **Where R actually is** — NPCs have rosters, so R is somewhere now: claim to be the
  bartender in the market at noon and anyone who just left Dave's Bar, where he is on shift,
  knows. If R walks in, you are done.
- **The check** — fidelity against discernment (privacy § 8) × **susceptibility** × the
  plausibility prior (§ 2).

## 2. ⭐⭐ NPC suspicion — a graded signal, shown as behavior **[DECIDED]**

The owner: *"if someone walks in and introduces themselves as the president, I wouldn't just
automatically believe them. But if someone came in and said their car broke down and their
name is Sergio Knight I might think 'that doesn't sound like a real name' but I'd otherwise
take their word for it … and really that's just renown."*

- **The prior — checkability and plausibility.** ⭐ **How checkable a claim is depends on how
  many people know the referent — renown**, per scope: a famous claim is checked by a room
  full of people who know the face, and draws scrutiny; an obscure name cannot be checked,
  only judged plausible — accepted unless something is off.
- **The evidence** — mismatches with what this NPC remembers or knows.
- **The temperament** — ⭐ **susceptibility**, already designed as the authored NPC knob
  (trusting to judgmental); trait's cynicism axis beside it.
- **The output — never a number**, shown as **behavior**: a probing question, a glance at your
  boots, a guarded tone, a refusal, a quiet word to the constable. **Decoding it is the
  player's skill**; the player's awareness competence can make the cues plainer.

## 3. ⭐⭐⭐ Clues — always there, read at competence **[DECIDED]**

Clues are not delivered; **they exist**, as traces derived from shipped state, found by
looking, at the detail competence resolves ([instrumentation.md](../../subsystems/instrumentation.md)):

- ⭐⭐ **Dirt on the boots** — cleanliness models dirt **by kind and site**: a novice sees
  *"mud on his boots"*; a trained eye *"red clay — the Delight's brickfield."* Sherlock
  Holmes's method, derived.
- Smoke or tallow on clothes (smell); blood (harm, cleanliness); wear on hands matching a
  trade, or not; a tan line; footprints on a soft floor (the ground's kinds).
- **Forensics and awareness are already Disciplines** — the detective's eye is competence
  resolving detail, never a quest marker, and never the engine solving it.

## 4. ⭐⭐ What authors author, and what the engine derives **[DECIDED]**

The owner: *"this is where we really need to think about what content authors are actually
going to want for their narrative design."*

| an author wants to… | they author | the engine derives |
|---|---|---|
| set up a mystery | **the true history** — who did what, where — as deeds | the traces those deeds leave |
| give characters secrets | ⭐ **the dossier** — *"seeded evidence carrying the `claim` marker"* | what each NPC believes and will say |
| plant red herrings and liars | **false claims**, or a character with a motive to lie | the inconsistency between claim and trace, for whoever looks |
| pace the reveal | **where evidence sits** — the locked drawer, the witness who talks only at night | access, through locks, schedules and trust |
| the payoff | the accusation scene | the court judges **evidence presented**, never the kernel's truth (A15) — wrongful convictions are possible, and honest |

⭐ The identity doc already holds the persona-inconsistency rule: *"a character written as
skilled who then plays badly reads as somebody whose reputation exceeds them, which is a
true thing about people."*

## 5. The detective **[DECIDED]**

**Private** (hired — contracts and gigs) and **public** (the police detective,
[policing-slate](./policing-slate.md)). The work: collecting evidence with **custody**
(chattel's chain of title); analysis (instruments, the [microscope](./optics-slate.md),
later fingerprints); interviews (dialogue); the accusation and the court. Bogart, *The
Mentalist*, *Psych* — the same mechanics, different styles; the cold reader is the observant
detective turned performer.

## 6. ⭐⭐ The who's-who before a cast manifest **[LEAN]**

The owner floated **a cast manifest** — like `location_graph`, a cached server-side projection
of content, *"an index of all NPCs by name."* Tested against *load on use, never search* (a
reverse question means the reference points the wrong way): **the common case needs no
index** — the part resolves through the actor's memory, familiarity follows references from
the mark. A by-name index is needed for two things only:

1. **Claims about people the actor never met** — *"I'm the President"*: ⭐ titles resolve
   through **offices** (the seat names its holder — a forward reference); famous names through
   **renown's top figures per scope**, a bounded **who's-who**.
2. **Authoring tools** — the CMS listing the cast.

Start with forward references plus a who's-who; build a full manifest only if a consumer
proves it. Whatever is built carries the location graph's **firewall — it never reaches a
client**; players learn names only through belief.

## 7. ⭐⭐ Impersonating players — the griefing layers, as dials **[DECIDED as tunables]**

The owner: *"if [NPCs impersonating players] is in then [players impersonating players] is in
probably, because you could just create a mercenary who you can hire to impersonate the
player … that's a griefing vector … just make it something we can tune later."*

1. ⭐⭐⭐ **The person marker can never be disguised** (an invariant) — card-sizes' most
   important fact; presentation's *"that a weaver is a player is not the secret; which player
   is."* An NPC (the hired mercenary) **never passes as a player to a player**; it fools only
   NPCs. A player impersonating a player still shows a person marker — the deception is
   *which*.
2. **Verification is cheap** — one `tell` to the real person settles it (*verify through a
   channel you already trust* — a real lesson).
3. **The record never lies** — disguised acts go to the actor's chronicle, renown and
   accountability; the impostor damages only regard, which exposure corrects.
4. **Dial — the impersonated player is told** (meta, out of the fiction): *"your character was
   impersonated near the docks today"*, escalated when it moved money or goods. **Default
   on.**
5. **Dial — consent for spy games** — a player may opt in to being impersonated, turning the
   notices off. **Default off.**
6. **Manual enforcement** — impersonation used to harass is a Compact conduct violation
   (evidence: the engine's log of who presented as whom; never costumed in the fiction).

## 8. The lens pass

1. **Pedagogy** — recognition, plausibility and base rates; trace evidence (soil, wear,
   smell); chain of custody; verification by a trusted channel.
2. **Expression** — ⭐ the author's mystery (§ 4); personas and cons as content.
3. **Immersion** — the guarded glance, the red clay on the boot. **Participation** — the
   detective, the con artist, the informer, the forger, the gullible and the shrewd.
4. **Values** — the wrongful conviction; impersonation's harm to regard; trust.
5. **Continuity** — the eye → the microscope → fingerprints → forensics labs; the same act of
   looking closely.
6. **Economy** — the private detective's fee; the forger's trade; the con's take.
7. **Governance** — the court judges evidence (A15); fraud; the griefing dials; the warrant
   ([privacy](./privacy-slate.md) § 9).

## 9. Open

1. **The suspicion behaviors** — the closed list an NPC brain can show.
2. **The player mark's rendering** — the bands between *"Augie"* and *"someone in his apron."*
3. **Familiarity by reference** — exactly which references count (roster, household,
   locality).
4. **The who's-who** — its bound per scope.
5. **The dials' owners** — operator or polity.
