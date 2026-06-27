# Experience — the city morgue (body access + the laundering audit)

> **Status:** staging design (experience carve — first pass, 2026-06-27).
> **Kind:** a *player experience* — the arc's deep-forensics setpiece
> (experience #7 in the bible's menu). This sheet owns the **access problem and
> its teaching scaffold**; the
> [eternal-university-narrative-slate.md](../../../slates/builds/eternal-university-narrative-slate.md)
> §14 owns the **corpse-laundering** payload that access unlocks, and §3 owns
> the **first-quest teaching mandate** this sheet applies.
> **Placement:** the **city medical examiner's morgue**, across Gus's gate in
> **Terminus** — the arc's first piece of *built* city geography (§15.4, now
> "a place, built in sequence"). Distinct from experience #2, which reads the
> body at the dorm scene *before* it's transported here.
> **Carves pulled in (JIT — deferred, not rostered):** a **city-ME location**
> stub; and, *carved only when the route that needs them is actually built*, a
> **complicit/hostile examiner**, a **sympathetic insider**, and the shared
> deputizing proctor (**Halvers**, an arc-wide role). Per the carve discipline,
> these are roles the routes *imply*, not a cast to build up front.
> **Target seeds:** the city-ME location + corpse/records props + the route
> wiring (access predicates, the deputization credential). Paths TBD with the
> Terminus zone scaffolding.
> **Retire when:** cemented as location + content seeds in YAML.

---

## The experience in one line

Catch the **corpse-laundering** by getting at — or routing *around* — a body in
a hostile, secured government morgue that **will not let you walk in.** Because
it's likely one of the player's first *hard* obstacles, it's also where the game
teaches that obstacles have *properties* and there's always another thread.

## The dual mandate (read this first)

This experience is governed by the bible's **first-quest teaching mandate** (§3):
the arc's opening is simultaneously a **genuine investigation** and the
**tutorial for how investigation works here.** A real ME doesn't let a student
examine a body — and we honor that completely — so the design can't be "here's
the locked door, good luck." It has to *teach the player how to make progress*
without putting it on rails. The scaffold below is how.

> **Where this sits in the ramp.** Access-literacy is introduced *gently* at the
> **sealed room** (§14 / experience #4) — an in-dorm puzzle, a known NPC
> (Katie), low stakes. The morgue is the **escalation**: same literacy, harder
> — across the gate, a hostile institution, a secured facility. By the time the
> player reaches it they've cracked one easy body (#2, the loop) and one safe
> access puzzle (#4); the morgue tests what they've learned.

## The teaching scaffold (how a first-timer makes progress)

1. **The body is the hard node on purpose.** A new player who tries to walk into
   the ME hits a locked, staffed door. That is *not* a dead end — it's the first
   beat of the lesson.
2. **NPCs narrate the affordances.** The discovery mechanism. The front-desk
   attendant (or an NPC you already know) tells you the *rule* in fiction —
   *"Family, police, or staff. You're a student. You don't come in here."* Now
   you understand the obstacle's shape. You ask "so how does anyone get in?" and
   the fiction hands you a thread — *"Get a proctor to put your name on it.
   Halvers, maybe — if he trusted you."* The same line that teaches the rule
   hands you a goal *and* a route. The immersive-sim's **properties become
   learnable, diegetic guidance** — the player discovers the route space by
   *asking*, not by reading a menu or hitting a wall.
3. **The breadcrumb is the next question, never a marker** (§13). A stuck player
   always has a thread to pull — *who signed the certificate? who was the last
   to see him alive?* The inspection pane and MQL (the magnifying glass, §3)
   surface the next query. Crucially, the **records track runs in parallel** to
   the social one (see the routes): you can't get the body, but the game
   *teaches you to pull the intake log* — so a player who bounces off "earn
   Halvers' trust" still has a thread that moves. No single route is a gate.
4. **Verbs taught in context.** Ask (dialogue), examine (perception), **query
   the records (this is where MQL gets taught as a tool)**, cross the gate
   (locomotion) — onboarding's mechanics finally given *motive* (§4).
5. **Breadth is the veteran layer, not the tutorial.** A first-timer is funneled
   down the gentlest, most-signposted route; the full route space is *discovered*
   over replays, in co-op, or by a player who wants to. What the experience is
   really teaching is **immersive-sim literacy**: read the properties, find a
   route.

## The obstacle's properties (the immsim spec — properties, not solutions)

Author these; the routes fall out of them.

- **Secured + staffed + logged** — a government facility; entries are recorded.
- **Role-gated** — staff, law enforcement, next-of-kin (for ID only), funeral
  agents (for release). A student is none of these.
- **A complicit, hostile examiner** — the office that autopsied the body and
  signed its certificate is the one that rigged the finding (§14). It actively
  resists scrutiny; it is not a neutral wall.
- **A disposal clock** — evidence has a deadline: a body is buried (release) or
  **incinerated** (routine disposal of anything unflagged — see *The place*). The
  cover-up's deadline, and its best hiding place. Cuts both ways (the
  release-window route).
- **Across the gate** — getting to Terminus at all is a small barrier (Gus's
  crossing), and quietly thematic (crossing *is* being counted in/out, §4).
- **The findings also exist as records** — the corpse is one node; the intake
  log, cold-storage temperature log, certificate, and registrar filing are
  others. This is what makes the truth over-determined (§17.G).

## The place — supply, rooms, staff, routine (the aliveness)

The morgue feels alive because **its work runs without the player** — and the
work is *real*: bodies stream in from the living game.

- **The body supply (player-generated).** The ME has a **service radius** (a
  covering locality — `AddressApi`): **sentient** beings who die anywhere in it —
  player characters out adventuring, NPCs, the roll-clock's victims — route
  *here*. The stock is fed by the world, not scripted, so the place is
  permanently, organically busy. *(Dependency, flagged: this presumes a death
  model where a dead character yields a routable corpse — permadeath vs. respawn
  — a separate, load-bearing open question.)*
- **The incinerator** — the disposal valve, and **the §14 disposal clock made
  literal.** Volume forces it: anything **not flagged for investigation** is
  routine incineration. So the cover-up's best tool is *the machine doing what it
  always does* — let an inconvenient body be "routinely" burned, no crime
  visible, just Tuesday. **Erasure by routine (§7) as infrastructure**; the
  deadline is now concrete (*race the incinerator*) and it's the perfect place to
  hide a laundering.
- **Sentient-only intake — the who-counts line at the door.** A person gets a
  certificate; an animal does not. So the desk **adjudicates personhood by
  policy, daily**, and the arc's question lives in the edge cases (a
  decommissioned synth? an uplift?). Enforced cheerfully by Pim — the thesis as
  paperwork.
- **Rooms — three you play in.** (1) **Intake / front office** — Pim's desk; the
  role-gate, the intake log (records route), where you'd present a credential.
  (2) **Cold storage** — the bodies, the current case, the release/incinerator
  exit, the refrigeration that confounds the cooling curve. (3) **The exam room /
  slab** — Vance; the autopsy; the climax. *(Plus a small records office that can
  fold into intake, and the loading dock / **intake door** — off-screen by day,
  but the **automated after-hours ingress**, so gameplay-relevant at night; see
  Hours.)*
- **Staff — two carves, the rest negative-space.**
  [Vance](../npcs/medical-examiner.md) (the wall, in back) +
  [Pim](../npcs/morgue-receptionist.md) (the gate, up front) — and their
  *contrast* is the ambient life. Everything else is flat/off-screen: couriers,
  funeral agents collecting bodies, the unseen "upstream" authority Vance defers
  to, and the real cast — the dead. Both are **day shift**; after hours the
  morgue is **unstaffed** and the front door **locked** (intake goes
  programmatic — see Hours) — except, unreliably, Vance herself.
- **The routine (the conveyor).** Intake → log → cold storage → **process**
  (examine / certify / file) → **release or incinerate**, on a roll-clock
  cadence, *independent of the player.* You always arrive **mid-stream** (§14's
  newcomer on-ramp), *interrupting* a machine busy with death — which feeds
  Vance's hostility for free (you're slowing her throughput). The relentless
  processing of persons-into-records is both the place's life and the arc's
  dread; they are the same thing (§13/§14, the dread gone ambient).
- **Hours & the day/night rhythm.** Intake is **24/7** (death keeps no hours —
  this is how the player-feed runs overnight), but **examination is day-shift.**
  After hours there is **no night NPC**: the front door stays **locked**, a
  delivered corpse reaches the **intake door**, and the rest is **programmatic**
  — logged, cased, racked in cold storage, waiting for Vance's morning queue. So
  the shifts offer *different* route-surfaces: **day = social** (charm Pim,
  deputization, records), **night = physical** (the locked, unstaffed machine —
  break in, or exploit the automated intake door cycling to accept a delivery).
  And Vance **haunts the place late** (the ghoul who runs cool and has nowhere
  better to be), so the night window is **real but unreliable** — you might find
  the wall gone, or find her alone over the stack (a strong climax staging).
  *Dial:* a reliable window (she goes home) vs. the haunt (lean: the haunt).

## The route space (each a kind of access; each costs differently; the world remembers)

- **Get deputized (earn the credential).** The §3 witness→deputized arc cashes
  out here — a proctor or city detective who's come to trust you walks you in
  the front door. Legitimate, but *earned*; a mid-arc reward, so it can't be the
  only route.
- **The front desk leaks (indiscretion, not bravery).** The receptionist
  ([Pim](../npcs/morgue-receptionist.md)) is guilelessly forthcoming — ask and
  he hands you the thread (the fast-tracked finding, the incinerator clock)
  between pleasantries, never thinking it sensitive. The "insider" route,
  reframed off the conspiratorial-ally trope. *(A warmer variant — a back-room
  conscience who actually risks something — is the road not taken; see Pim's
  sheet.)*
- **Go around the body — the records (over-determination).** The key teaching
  path: **you may not need the corpse.** The forgery is over-determined — the
  intake log, the cold-storage temperature log, the certificate's signature,
  cross-checked against the social layer ("does anyone remember them *alive*?").
  Catch the laundering on paper, never touch a body. §17.G's "the room is not a
  gate," and the parallel thread that keeps a newbie unstuck.
- **The release window (timing).** Custody *softens* as the body moves ME →
  funeral home → grave. The disposal clock is a deadline *and* an opening — reach
  the body once it's out of ME security, at the real cost that embalming/burial
  degrades the forensics.
- **Break in (force / stealth).** Loud. The world remembers, and in the §11
  spectral-evidence panic, *getting caught creeping around a corpse is exactly
  how you look like the killer.* The expensive route.
- **Forge a credential (identity) — the on-theme route.** In a census/who-counts
  world, identity *is* access, and the aether can't authenticate (§8) — so
  faking your way in is the **same crime the killer commits on the dead.**
  Counterfeiting an identity to reach a counterfeited identity; it carries a
  moral charge the other routes don't.

**Co-op falls out for free** (§10/§17.G): one player charms the insider, another
earns the credential, a third pulls the records — pooled on the Quad. The
distributed-access pattern is the multiplayer thesis made literal.

## What access unlocks (the payload — see §14)

Access is the *prize*, not the point — it confirms what the records, the
insider, and the scene already let you assemble. What the body delivers:

- **The laundering catch** — the two-track diagnostic (§14): does the body's
  biography match the *filed* identity, and does anyone remember the filed person
  *alive*? A planted/recycled corpse fails the physical track; a laundered
  erasure fails it but passes the social one. The matrix in §14 is the readout.
- **The rigged certificate exposed** — the examiner's "accident" against the
  body's own evidence.
- **The Weir confounder (#7's version of the cooling curve)** — cold storage
  changes how a body cools (`ambient K` → the curve), so the player must
  *account for the morgue's refrigeration* to back out a real timeline, and a
  body whose thermal story doesn't fit its supposed location betrays a move
  (§14). The forensics skill (advancement) scales the read, same ladder as #2.
- **The "use once" floor-drop** (§14 discipline) — the staged beat (a
  beloved-innocent whose autopsy doesn't add up) fires *once*; afterward every
  body is quietly suspect and the dread goes ambient.

## The shared case (multiplayer)

It's an MMO — *many* players investigate Dunny's death — and the arc turns that
from awkwardness into the §10 thesis (the crowd that keeps saying his name is the
**un-erasing**; the general design is the bible's §17.F). At the morgue it
surfaces concretely:

- **Pim owns it, cheerfully.** He notices the crowd (Gregarious) but not as
  suspicious (innocently Incurious): *"Akhtar! You're the fourth this week —
  popular fellow."* That one line (a) diegetically owns the swarm, (b) **leaks
  that other investigators exist** (go pool up / check the Quad), and (c) makes
  him a passive **exhaust-sensor** — the crowd asking Dunny's name *is* the
  community un-erasing him, witnessed by the one who has no idea what he's
  witnessing.
- **Vance feels the opposite.** A fast-tracked body suddenly drawing a line of
  askers is *heat* (she's Cautious) — so collective attention **pressures the
  cover-up.**
- **Residue later players can find:** the Quad **argument-map** (join a
  contestable debate-in-progress, never a walkthrough), **NPC memory** (ask Pim
  "who else has been asking?" → pointed at prior investigators / other players),
  the **recognition exhaust** of having investigated.
- **The split:** the collective layer accelerates (map, memory, case-phase); the
  **personal** layer stays earned (your own derivation, skill, standing). Hard
  rule: **no single player consumes the body or the case.**

*Dials:* the inquiry count is a flavored/capped abstraction (lean) rather than a
raw live tally (so it never reads "0" on a quiet night); the no-consumption
constraint is load-bearing.

## Cross-references

- Bible: [§14 the corpse-laundering + investigative geography](../../../slates/builds/eternal-university-narrative-slate.md),
  §3 (the first-quest teaching mandate, deputization), §17.G (immsim —
  properties-not-solutions, room-is-not-a-gate, co-op), §15.4 (the city as
  built geography), §11 (the spectral-evidence panic), §13 (ambient pressure,
  not a marker).
- Experience: [first-forensic-win.md](./first-forensic-win.md) (the easy body
  that teaches the loop; the scene-read that points here — "go see who signed
  the certificate").
- Carves: [medical-examiner.md](../npcs/medical-examiner.md) (Vance — the wall) ·
  [morgue-receptionist.md](../npcs/morgue-receptionist.md) (Pim — the gate that
  leaks) · [property-manager.md](../npcs/property-manager.md) (Katie — the
  earlier, gentler access puzzle).
- Engine: belief/regard (the insider/deputization relationships), MQL (the
  records route; the magnifying glass), advancement (the forensics ladder),
  thermal (cold-storage confounder).

## Open questions / dials

1. **The signposted-primary route for a first-timer** — which route the quest
   gently funnels a newbie down first. *(Lean: the records track + a sympathetic
   insider* — both teachable without depending on the deputization arc having
   progressed, and the records track doubles as the MQL tutorial. Deputization
   is a *reward* route, not the newbie's first option, since Halvers' trust must
   be earned and he's uncarved.)
2. **The city-ME location stub** — scope of the first build: just the
   front-desk + the cold room, or the wider office? *(Lean: minimal — the
   threshold the routes contest, plus the slab. Grow it when a later experience
   needs more of Terminus.)*
3. **Which carves, and when** — the examiner and the insider are the likely
   first carves *if* their routes are built first; defer until then (don't
   roster). Halvers is shared with the broader deputization arc.
4. **How much the player ever confirms about the bookkeeper** (§14 open) —
   proven, or inferred-but-unconfirmed to preserve §11's "you never fully catch
   it." Bears on whether the morgue audit *closes* or just *deepens*.
5. **The forged-credential route's consequences** — how hard the world remembers
   it, and whether the moral rhyme (you did a small version of the killer's
   crime) gets a later beat or stays subtext.
