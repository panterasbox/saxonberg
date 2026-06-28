# Onboarding slate (working doc)

> **Status: flow set, mostly content.** The new-player journey after
> char-gen: land in the lounge → fast-travel to campus → a learn-by-doing
> journey → your dorm → learn to customize it. Almost entirely authored
> content over existing verbs; the new *systems* it needs are **scoped
> personal authoring** (every player authors their own space) and the
> **Orientation guide** (Dr. Limen — an implant-reachable guide NPC + a
> few onboarding-progress flags + a model-backed brain).

Working slate for **onboarding** — getting a freshly-enrolled player from
the intake into the world and competent in it, *diegetically and by
doing*, ending with the on-ramp to content authoring (your dorm).

The load-bearing decisions:

1. **Learn by doing the real game — no tutorial mode.** Following signs
   *is* learning to move; the walk *is* learning the world; installing
   the demo augment *is* learning implants; customizing the dorm *is*
   learning to author. The educational thesis, applied to onboarding.

2. **The lounge is a disconnected social landing — not a classroom.** A
   self-contained mini-zone (no foot exits), the universal **login
   landing**, social, with a bar. You arrive, can talk immediately (the
   implant's issued), and **teleport** onward. A **returnable social hub**
   (both-direction terminal — see fast-travel).

3. **Onboarding happens on campus, first-login only.** From the lounge
   you fast-TP to the campus entry; the journey (signs + greeter NPC)
   runs once. Returning players skip it.

4. **It ends at the dorm, teaching authoring.** The journey's last step:
   arrive at the dorm lobby → walk to your room → **customization** = the
   in-game author/workspace shell pointed at your own space. **Everyone
   authors, starting with their room.**

See also:

- [docs/subsystems/char-gen.md](../../subsystems/char-gen.md) — hands off here
  (you spawn in the lounge post-intake).
- [docs/slates/fast-travel-slate.md](../tails/fast-travel-slate.md) — the lounge
  and the dorm **lobby** are terminals; the lounge-exit + home-routing
  ride this network.
- [docs/slates/scoped-authoring-slate.md](../builds/scoped-authoring-slate.md) —
  **the dorm-customization on-ramp**: the safe, ownership-scoped
  authoring the final step teaches (the (policy, validator) model, the
  player GUI).
- [docs/subsystems/shell-author.md](../../subsystems/shell-author.md) /
  [docs/subsystems/shell-workspace.md](../../subsystems/shell-workspace.md)
  — the **author/workspace shell** (`write`/`cat`) scoped authoring sits
  on; the wizard front-end.
- [docs/slates/access-slate.md](../tails/access-slate.md) — scoped authoring is
  gated by ownership (you author what's yours).
- [docs/slates/augmentation-slate.md](../tails/augmentation-slate.md) — the
  **demo augment** (teaches the install/acquire flow on the journey).
- [docs/slates/comms-slate.md](../tails/comms-slate.md) — the **implant
  transport** Dr. Limen reaches you over (the remote-NPC pattern);
  attribution is why a private nudge is unmistakably *from* Limen.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) /
  language — **signs** are Readables (wayfinding); a route map is layout.
- [docs/slates/npc-dialogue-slate.md](../tails/npc-dialogue-slate.md) — the
  greeter NPC.
- [docs/subsystems/connection.md](../../subsystems/connection.md) — login
  spawns you in the lounge.
- [docs/design-philosophy.md](../../design-philosophy.md) — learn-by-doing;
  liberal diegesis.

---

## Principle

1. **Learn by doing the real game** (no tutorial instance/mode).
2. **The lounge is a social landing**, not a teaching space.
3. **Onboarding is on campus, first-login only.**
4. **It culminates in *authoring your own space*** — authoring is a
   first-class early experience, not a power-user secret.

---

## The flow

```
intake ─▶ LOUNGE (social landing, bar, login spawn, teleport hub)
            │  fast-travel
            ├─ first login ─▶ campus entry ─▶ journey (signs + greeter,
            │                                  learn-by-doing, demo augment)
            │                                  ─▶ dorm LOBBY ─▶ walk to room
            │                                  ─▶ customization (scoped authoring)
            └─ returning ───▶ home: the dorm LOBBY (+ registered terminals)
                                     ─▶ walk to room
```

### The lounge

A disconnected mini-zone (no foot exits — you arrive by login, leave by
its terminal), social, with a bar, where **everyone materializes on
login**. Talk immediately (implant issued). It's the global social
crossroads *by construction* (everyone passes through). The terminal is
both-direction (you can fast-TP back to socialize).

### Lounge-exit routing (the one small engine bit)

Where you go on leaving depends on two pieces of per-character state:
- an **onboarded flag** (first-time → campus entry; else → home), and
- a **home / recall location** (your **dorm lobby**, once onboarded).

This is just the lounge terminal's state-routed destinations (fast-travel
slate). Returning players land in the lounge then route home (land-and-
choose, or auto after a beat — fork).

### The campus journey (first login)

Diegetic and learn-by-doing: **Dr. Limen** (the Orientation guide — see
its own section below) is the voice that threads the journey; **signs**
carry the spatial wayfinding (following them teaches movement); the walk
teaches the world; and a **clinic on the route** demos installing a
**small demo augment** (teaching the implant-acquisition flow with
something low-stakes). No mode, no dump — the real verbs. Limen carries the
*objective list* ("what now"); the signs carry *which-way*; an embodied
**greeter** (lean: kept) is the first face at the gate.

The **private house suggestion** rides Limen — the one affiliation axis that
touches onboarding (read from your profile) — but **joining is opt-in**: you
research and choose, and your real-world origin (school/state) never leaks
(a private, attributed nudge ≠ exposure; the abstract many-to-one house
anonymizes). See [affiliation-slate.md](../deferred-rpg/affiliation-slate.md).

### The dorm + customization (the climax)

The journey ends at the **dorm lobby** (a terminal — public
infrastructure) → **walk to your room** (free local-navigation practice)
→ **customization**: the author/workspace shell pointed at your own
space. This is the content-authoring on-ramp, given to *every* player.

---

## Dr. Limen — the Orientation guide

> The continuous voice of the first-login journey: a real **guide NPC**
> (not a coach that follows you, not a faceless help overlay) — the
> campus's **Orientation intelligence**, reached over your implant. Rich
> enough to carry the journey; bounded enough to go quiet the moment
> you're a student.

**What it is — a brain wired into the college's hardware.** Not software on
your implant (that reads as bloatware — the implant is *your* universal
device, like a phone; the college doesn't get to preload itself into your
head), not a flesh-and-blood advisor, not a disembodied "system." A
**preserved brain plumbed into the college's own machinery** — the *Old
World Blues* Think Tank lineage (brilliant, institutional, been-here-too-
long-and-gone-a-little-strange), played **benign**: the Tank brain that's
actually warm. Continuity, not genre-intrusion — the campus already runs on
brain-and-body tinkering (the *Dr. Frankenstein's Body Shop* → Health
Center lineage, the implants, the augments). A brain at the welcome desk
fits the canon.

**Where it lives — a physical seat on campus.** It's wired *in*; it doesn't
move. It has a console, a room you could go stand next to (exact home TBD:
admin building / a welcome center / a literal humming machine). College
hardware, on campus, college-owned.

**How it reaches you — you connect; it doesn't colonize.** It rides your
implant the way you reach any remote service over it (the comms-slate
**implant transport**, the remote-NPC / dispatcher pattern) — *not* by
living on your device. The institution reaches you while you're its
student; nothing is installed in your head. The boundary is load-bearing:
**the college reaches you; it does not inhabit you.** It hails you
proactively on arrival; you can query it any time ("what now," "how do I
X").

**Two modes, keyed on the `onboarded` flag.**
- **Proactive** (`onboarded == false`) — welcomes you, threads the journey,
  nudges. The continuous guide-voice.
- **Reactive** (always) — the **help system**: you ask, it answers. Once
  you're oriented it **recedes** to reactive-only.
- This *is* the returner case: a non-newbie isn't skipping a tutorial —
  Orientation has simply gone quiet for them. Orientation's over; help
  persists. (Same `onboarded` flag also drives lounge-exit routing — one
  flag, two consumers.)

**How it knows your progress — records, not perception.** It does **not**
scry you (scry is remote *vision* — it would see a room, not whether you've
enrolled, and watching every freshman is the creepy version of this
character). It reads the **college's own records** — the institutional
state you generate by *transacting* with the college: you enroll → the
registrar logs it → Orientation (same campus system) sees the record. It
knows your **milestones, not your footsteps** — can't see you trip on Limbo
Lane, doesn't track your position, can't tell you're lost unless you
**ask**. That bound is the feature: it keeps Orientation on the right side
of the privacy line (records of your dealings with the institution, never
surveillance of your person — the line the affiliation slate draws around
your origin staying private).

**The state it reads — onboarding-progress (instance #1, kept concrete).** A
few **`PropertiedMixin` flags on the avatar** (`onboarding.enrolled`,
`.keyed`, `.implantDemo`, + the derived `onboarded`), **written by the
station-keeper services** (enrolling flips `enrolled`, Housing flips
`keyed`, the clinic flips `implantDemo`) and **read by Orientation via
event subscription** (the mql-subscription / `EventApi` bus — *notified* on
a flip, not watching). **Narrated** as "the college's records," but the
bytes live on the player — no separate institutional database in v1, a thin
fiction-wrap over the same data. This is **not** a quest engine and **not**
the [chronicle](../../subsystems/chronicle.md) identity ledger (which has
shipped; the advancement/gamification layer it will feed remains deferred
game-design). It's the first concrete instance the eventual objective/trace
system will generalize from; v1 stays three booleans and a subscription,
forward-compatible. *Resist building the framework off N=1.*

**The brain — model-backed, and diegetically honest about it.** It *is* an
AI/brain in the fiction, so a model brain isn't a costume — it's what the
thing is (the clean home for the "make it a real bot, we have the models"
instinct). **Hybrid**: an authored **character bible** (voice, guardrails,
the threshold whimsy) performs, while the **load-bearing facts** — your next
errand, where the Registrar is — are **injected from real state**, never
hallucinated. It **never tests comprehension**: it nudges, it is fully
dismissible, an informed player ignores it and blows through (gate on
tasks, never on lessons).

**Voice & identity — Dr. Limen** (working pick; pronoun **they/them**).
Reads as a real emeritus's surname; *limen* is Latin for **threshold** —
the campus threshold it meets you at, the **liminal** (rhyming with Limbo
Lane), and the perceptual **limen** (the sensory threshold the implant
crosses to speak *subliminally*, beneath the senses — comms' "bypassing the
sense organs"). A name that reads plain at face value and rewards a second
look, in the Think Tank's topology-pun register. Register: brilliant,
institutional, fond-but-uncanny — a thing that has welcomed ten thousand
freshmen and has *Opinions*.

> *"Dr. Limen. Don't look around for me — I'm three buildings over, in a
> jar, quite comfortable, thank you. You're standing at the threshold; I
> am, in the technical sense, the threshold. We're going to get along.
> Now — there's the sky. Try not to ask about it yet."*

*Temperature alternates considered:* **Dr. Ambrose** (warm-human; reuses
the EC `ambrose` — an old mind persisted into this world), **Dr. Ø**
(cold-deadpan, the institution-forgot-who register). Backstory deliberately
**murky** — "Limen" may be the post, not the person; nobody's sure who went
in. You don't need to decide who the brain *was* to know who they *are*.

**Limen vs. the greeter — the two honest halves.** Limen is the *remote,
system, traveling voice*. A separate **embodied local greeter** — the
*first person* you meet, a body at the gate — is the warm human face. They
were always two different entities; the design only cohered once we stopped
making one do both jobs. *Lean: keep both* (the greeter hands you off —
"the campus'll talk you through the rest; try not to argue with it"). Open
if you'd rather Limen *be* the whole welcome and drop the gate-person.

---

## The curriculum + location mapping (session — 2026-06-08)

Two caveats first:

**Client teaching is preliminary; the terminal already has the whole world.**
The cockpit (pane / focus / click-to-explore / breadcrumb / scrollback) is
client UI we haven't built — so teaching *those* is tentative, deferred to
when the client exists. But the **terminal exposes the entire server state via
commands**, so every *world/server* concept (movement, perception, comms,
manipulation, ontology, authoring) is real and teachable **now**,
interface-agnostic. The cockpit is a richer view on the same state; its
affordances layer on later. So today's teachable spine is **world-first**, not
cockpit-first.

**Teaching is ambient and skippable — gate on *tasks*, never on *lessons*.**
Players arrive with wildly different prior knowledge (long lounge time, other
players, prior exposure), so onboarding must let them **skip what they know.**
This falls out of learn-by-doing: the "lessons" are **opt-in nudges** (signs,
NPC offers, optional prompts) layered over the **real tasks** — an informed
player ignores the nudges and blows through the errands; a newcomer follows
them, same path. **Required = only the tasks** (finish enrolling, get your
room); *never* gate progress on "completing a lesson." Help is on-demand.

### The curriculum (C = core / S = secondary / D = defer)

- **A. Cockpit *(client — preliminary)*:** pane+focus · breadcrumb ·
  click-to-explore · command bar+verb grammar · scrollback — all **C** *but
  client-dependent* (taught when the client exists; terminal exposes the same
  via commands).
- **B. Perceiving:** look **C** · sense (gestalt, auto-on-arrival) **C** ·
  details **C** · single senses (smell/listen/feel/taste) **S** · light/dark **S**.
- **C. Moving (3-axis grid):** go/exits (planar) **C** · **verticality —
  up/down/climb/stairs/floors/elevator C** · doors/boundaries **C** · here +
  zone (the sky-flip) **C** · locomotion modes (walk/climb/swim/fly) **S**.
- **D. Ontology:** container/containment **C** · agent-vs-object (animacy)
  **C** · slot **S** · state/properties **S**.
- **E. Acting:** take/drop **C** · wear/remove **C** · open/close **C** ·
  put/give **S** · posture (sit/stand/lie/kneel) **S**.
- **F. Comms:** say **C** · tell/DM **C** · emote (ESP) **C** · channels **S** ·
  whisper/shout **S**.
- **G. Finding:** find/locate (MQL) **S**.
- **H. Making it yours:** author your space (the dorm) **C**.
- **I. Tuning:** settings/aliases/style **D** (pointed-at, never drilled).

### Location → Core-concept mapping

| Location | Teaches (core) |
|---|---|
| **Arrival** | **look · sense** (auto-on-arrival) **· zone** (breadcrumb root flips; the sky reveal) |
| **Quad / spine + walkways** *(the journey)* | **go/exits** (signs) **· verticality intro** (a staircase/"go up") **· doors/open · agent-vs-object** (greeter + objects) **· details** (examine) **· take · comms** (say/tell/emote — talk to the greeter/NPCs). *The richest teaching space — must be content-curated, not corridor.* |
| **Student Services** | the service/prompt flow (+ tasks: major, name, housing) |
| **Health Center / clinic** | **capability/augment** (the demo-augment install) |
| **Campus Store / outfitter** | **wear / slots** (+ appearance, shopping) |
| **Chapel** | *(opt-in: deity; not core-teaching)* |
| **Duncan Hall** (lobby → room) | **verticality** (elevator/stairs/floors — the *real* lesson) **· containment · authoring** (the climax) |
| **Academic hall** | future hook (no v1 teaching; lessons later) |
| *(cockpit affordances)* | pane/focus/click/breadcrumb/scrollback — **preliminary**, taught via the client when built; ambient throughout |

Every Core concept has a home; the **journey carries the bulk of the
world-basics** (so it's content-rich, not corridor), and the **dorm teaches
verticality + authoring in one climb.**

## What this reveals (the new system)

**Scoped personal authoring** *(the big one).* "Customize your dorm"
means **every player can author their *own* space** — describe it,
decorate it, place things, eventually build — **gated by ownership**
(access/capability: you author what's yours). It ties together the
**author/workspace shell + homedir-as-room (housing) + access** (control-
over-your-space), and democratizes authoring (not a wizard-only power).
Its own future slate; v1 is light (describe/decorate).

Smaller content patterns it surfaces:
- **Wayfinding / signs** — Readables that direct (ties Readable +
  language + spatial directions); they teach movement diegetically.
- **The Orientation guide (Dr. Limen)** — an implant-reachable guide NPC
  riding existing substrate (comms transport, the event bus, a model-backed
  brain) + **onboarding-progress state** (a few PropertiedMixin flags,
  station-keeper-written, Limen-read). The journey's continuous voice and
  its reactive-help afterlife; *not* a quest engine (instance #1, kept
  concrete). Full design in *Dr. Limen — the Orientation guide* above.
- **The lounge landing + routing** — the login-spawn social pocket + the
  state-routed exit (shared with fast-travel).
- **The demo augment** — a low-stakes implant for the install lesson.

Almost everything else (lounge, bar, campus entry, signs, greeter, path,
dorm) is **authored content** over existing verbs (move, read, talk,
install, the author shell).

---

## Open questions / forks (minimal)

1. **Scoped personal authoring scope in v1** — *Lean light*: describe/
   decorate + basic placement of your dorm; deeper building later. (The
   one real *system* question.)
2. **Returners: land-and-choose vs auto-teleport home?** *Lean: land in
   the lounge, then a quick affordance (or auto after a beat) home* — so
   the social touchpoint exists without being a chore.
3. **Lounge "waiting" mechanical or just a lobby?** *Lean: just a social
   lobby (no gating).*
4. **The guide — Dr. Limen + a local greeter, or Limen alone?** The
   Orientation guide (Limen) is now a designed, load-bearing element (see
   *Dr. Limen — the Orientation guide* above), not optional flavor. Open
   fork: keep a separate embodied **greeter** as the first face at the gate
   (*lean: yes — the two honest halves*), or let Limen be the whole welcome.
   Signs carry spatial wayfinding either way.

---

## Build order

**Wave 1 — landing + routing + the dorm payoff.** The lounge (zone +
login spawn + bar) + the lounge-exit routing (onboarded-flag + home/
recall = dorm lobby); arrival at the dorm lobby → room; the
**scoped-personal-authoring** on-ramp (light: describe/decorate).

**Wave 2 — the campus journey.** Campus entry + the signs/wayfinding +
**Dr. Limen** (the Orientation guide: an implant-reachable NPC, the
onboarding-progress flags with station-keeper writes + Limen's event
subscription, the model-backed brain) + the optional embodied greeter +
the demo-augment clinic stop; the learn-by-doing path.

**Wave 3+ — depth.** Richer authoring (build); a fuller campus; richer
onboarding beats as content grows.

---

## What this slate does NOT cover

- **Char-gen intake** → [docs/subsystems/char-gen.md](../../subsystems/char-gen.md).
- **The fast-travel network** → [fast-travel-slate.md](../tails/fast-travel-slate.md);
  the lounge/lobby terminals + routing ride it.
- **The author/workspace shell internals** → shell-author/shell-workspace;
  scoped personal authoring *consumes* them.
- **Housing tiers** (freshman dorm → upperclass homedir) — the Eternal
  University content area owns the housing roster; this uses the dorm.
- **The economy** — the demo augment/clinic is comped; no fees.

---

## Once shaped into formal requirements

This slate boils down to:

- **Learn-by-doing, diegetic** onboarding (no tutorial mode).
- The **lounge** (disconnected social login-landing, bar, returnable
  hub) + the **lounge-exit routing** (onboarded-flag + home/recall = dorm
  lobby).
- The **first-login campus journey** (Dr. Limen the Orientation guide +
  signs/wayfinding + the optional embodied greeter + the demo-augment
  install lesson), ending at the dorm lobby → room.
- **Scoped personal authoring** as the customization on-ramp (author
  shell + homedir + ownership-gated access), light v1.
- Tests: login spawns in the lounge; first-login routes to campus +
  runs the journey; returning routes home (dorm lobby) and skips it;
  following signs moves you; the station-keeper services flip the
  onboarding-progress flags and Limen reads them to answer "what now";
  Limen recedes to reactive-only once `onboarded`; the demo augment
  installs; a player can author their own dorm but not others'.

Scoped-authoring depth (building), the fuller campus, and richer beats
wait for later waves and the housing content.
