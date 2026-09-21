# Onboarding slate (working doc)

> **Status: PARTIAL** — `embody` shipped →
> [char-gen.md](../../subsystems/char-gen.md); the lounge login-landing +
> bar shipped → [fasttravel.md](../../subsystems/fasttravel.md),
> [location.md](../../subsystems/location.md); Katie's dorm handover
> shipped → [residence.md](../../subsystems/residence.md). The campus
> route between the crossing and Duncan Hall did **not** ship (only
> Gus/the crossing exists — no Quad, no Eternal Way, no built path to
> Duncan Hall), and this slate's own journey/curriculum design for that
> route is **superseded** by
> [acquisition-slate.md](./acquisition-slate.md)'s "first-login journey
> v2" and
> [demo-content-requirements.md](../../requirements/demo-content-requirements.md)'s
> unit specs — see the pointers left in place of the cut sections below.
> **Left:** the `onboarded` flag + lounge-exit routing · Dr. Limen (seat,
> model-backed brain, the reply contract) + the onboarding-progress flags
> and their subscription · scoped personal authoring (the dorm
> customization on-ramp) · the wayfinding signs · the private-house
> affiliation nudge (rides Limen)
> **Size:** a build

> **Superseded** — the route details below are superseded by
> [acquisition-slate.md](./acquisition-slate.md)'s "first-login journey
> v2" (Gus absorbs the greeter role; Limen's first contact moves to
> campus entry post-Gus; Katie's handover digitizes as a `dorm-key`
> wallet record) and by
> [demo-content-requirements.md](../../requirements/demo-content-requirements.md)'s
> unit-level campus spec. The principles below (learn-by-doing, lounge as
> social landing, first-login-only, authoring climax) stand unchanged.

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
- [docs/slates/scoped-authoring-slate.md](../tails/scoped-authoring-slate.md) —
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

Shipped — see [fasttravel.md](../../subsystems/fasttravel.md) (the
login-landing terminal + the born-with floor) and
[location.md](../../subsystems/location.md) (the Lounge/Bar/GlassAlley
zone).

### Lounge-exit routing (the one small engine bit)

Where you go on leaving depends on two pieces of per-character state:
- an **onboarded flag** (first-time → campus entry; else → home), and
- a **home / recall location** (your **dorm lobby**, once onboarded).

This is just the lounge terminal's state-routed destinations (fast-travel
slate). Returning players land in the lounge then route home (land-and-
choose, or auto after a beat — fork).

### The campus journey (first login)

The journey design and the born-with-loadout / clinic beat that used to
be here are **superseded** by
[acquisition-slate.md](./acquisition-slate.md)'s "first-login journey
v2" — the Health Center/TPA-software-update beat is explicitly retired
there (no update exists; digitization is the TPA bureau's act; surgery
isn't a walk-in demo). See that slate for the current route (crossing →
gate → Eternal Way → the Quad → Limbo Lane → Duncan) and Limen's
placement in it (post-Gus, at campus entry).

The **private house suggestion** rides Limen — the one affiliation axis that
touches onboarding (read from your profile) — but **joining is opt-in**: you
research and choose, and your real-world origin (school/state) never leaks
(a private, attributed nudge ≠ exposure; the abstract many-to-one house
anonymizes). See [affiliation-slate.md](./affiliation-slate.md).

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
The cockpit (card / focus / click-to-explore / breadcrumb / scrollback) is
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

→ **Superseded** by
[demo-content-requirements.md](../../requirements/demo-content-requirements.md)'s
unit-level campus content spec (units 1–15: campus geometry, Eternal
Way, the Quad, Silver Street, Limbo Lane, Student Services, the clinic,
etc., each worked to authoring depth) and by
[acquisition-slate.md](./acquisition-slate.md)'s journey v2. Both
replace the curriculum-to-location table that used to sit here with
authored, agreed content. The **task-vs-lesson** and **world-first**
doctrine in the two caveats above still stands.

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
- ~~The demo augment~~ — retired: [acquisition-slate.md](./acquisition-slate.md)
  kills the Health-Center-as-install-lesson beat outright (no update
  exists; digitization is the TPA's; surgery isn't a walk-in demo).

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

Resolved and cut: *"Lounge 'waiting' mechanical or just a lobby?"* — the
shipped lounge is a plain social lobby, no gating mechanic (see
[fasttravel.md](../../subsystems/fasttravel.md)). *"The guide — Dr.
Limen + a local greeter, or Limen alone?"* — decided in
[acquisition-slate.md](./acquisition-slate.md): Gus formally absorbs the
greeter role; no separate greeter character.

---

## Build order

Superseded — the lounge and Duncan Hall/Katie pieces of "Wave 1" already
shipped (see the Status block), and
[acquisition-slate.md](./acquisition-slate.md) owns the sequencing for
the journey-v2 route (its "Wave 2" replacement). What remains for *this*
slate — the `onboarded` flag + lounge-exit routing, Dr. Limen, scoped
personal authoring, wayfinding signs — has no fixed wave order yet; see
**Left** above.

---

## What this slate does NOT cover

- **Char-gen intake** → [docs/subsystems/char-gen.md](../../subsystems/char-gen.md).
- **The fast-travel network** → [fast-travel-slate.md](../tails/fast-travel-slate.md);
  the lounge/lobby terminals + routing ride it.
- **The author/workspace shell internals** → shell-author/shell-workspace;
  scoped personal authoring *consumes* them.
- **Housing tiers** (freshman dorm → upperclass homedir) — the Eternal
  University content area owns the housing roster; this uses the dorm.
- ~~The economy — the demo augment/clinic is comped; no fees.~~ moot: the
  demo augment concept is retired, see acquisition-slate.md.

---

## Once shaped into formal requirements

This slate boils down to:

- **Learn-by-doing, diegetic** onboarding (no tutorial mode).
- The **lounge** (disconnected social login-landing, bar, returnable
  hub) + the **lounge-exit routing** (onboarded-flag + home/recall = dorm
  lobby).
- ~~The first-login campus journey (… the optional embodied greeter +
  the demo-augment install lesson)~~ — superseded, see
  [acquisition-slate.md](./acquisition-slate.md)'s journey v2. Dr. Limen
  and the wayfinding signs remain open design, tracked in **Left** above.
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
