# Onboarding slate (working doc)

> **Status: flow set, mostly content.** The new-player journey after
> char-gen: land in the lounge → fast-travel to campus → a learn-by-doing
> journey → your dorm → learn to customize it. Almost entirely authored
> content over existing verbs; the one new *system* it needs is **scoped
> personal authoring** (every player authors their own space).

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

- [docs/slates/char-gen-slate.md](./char-gen-slate.md) — hands off here
  (you spawn in the lounge post-intake).
- [docs/slates/fast-travel-slate.md](./fast-travel-slate.md) — the lounge
  and the dorm **lobby** are terminals; the lounge-exit + home-routing
  ride this network.
- [docs/slates/scoped-authoring-slate.md](./scoped-authoring-slate.md) —
  **the dorm-customization on-ramp**: the safe, ownership-scoped
  authoring the final step teaches (the (policy, validator) model, the
  player GUI).
- [docs/subsystems/shell-author.md](../subsystems/shell-author.md) /
  [docs/subsystems/shell-workspace.md](../subsystems/shell-workspace.md)
  — the **author/workspace shell** (`write`/`cat`) scoped authoring sits
  on; the wizard front-end.
- [docs/slates/access-slate.md](./access-slate.md) — scoped authoring is
  gated by ownership (you author what's yours).
- [docs/slates/augmentation-slate.md](./augmentation-slate.md) — the
  **demo augment** (teaches the install/acquire flow on the journey).
- [docs/subsystems/messaging.md](../subsystems/messaging.md) /
  language — **signs** are Readables (wayfinding); a route map is layout.
- [docs/slates/npc-dialogue-slate.md](./npc-dialogue-slate.md) — the
  greeter NPC.
- [docs/subsystems/connection.md](../subsystems/connection.md) — login
  spawns you in the lounge.
- [docs/design-philosophy.md](../design-philosophy.md) — learn-by-doing;
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

Diegetic and learn-by-doing: **signs** point the way (following them
teaches movement), a **greeter NPC** welcomes you, the walk teaches the
world, and a **clinic on the route** demos installing a **small demo
augment** (teaching the implant-acquisition flow with something
low-stakes). No mode, no dump — the real verbs.

### The dorm + customization (the climax)

The journey ends at the **dorm lobby** (a terminal — public
infrastructure) → **walk to your room** (free local-navigation practice)
→ **customization**: the author/workspace shell pointed at your own
space. This is the content-authoring on-ramp, given to *every* player.

---

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
4. **Greeter NPC: required or optional flavor?** *Lean: optional flavor;
   signs carry the wayfinding load.*

---

## Build order

**Wave 1 — landing + routing + the dorm payoff.** The lounge (zone +
login spawn + bar) + the lounge-exit routing (onboarded-flag + home/
recall = dorm lobby); arrival at the dorm lobby → room; the
**scoped-personal-authoring** on-ramp (light: describe/decorate).

**Wave 2 — the campus journey.** Campus entry + the signs/wayfinding +
the greeter NPC + the demo-augment clinic stop; the learn-by-doing path.

**Wave 3+ — depth.** Richer authoring (build); a fuller campus; richer
onboarding beats as content grows.

---

## What this slate does NOT cover

- **Char-gen intake** → [char-gen-slate.md](./char-gen-slate.md).
- **The fast-travel network** → [fast-travel-slate.md](./fast-travel-slate.md);
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
- The **first-login campus journey** (signs/wayfinding + greeter + the
  demo-augment install lesson), ending at the dorm lobby → room.
- **Scoped personal authoring** as the customization on-ramp (author
  shell + homedir + ownership-gated access), light v1.
- Tests: login spawns in the lounge; first-login routes to campus +
  runs the journey; returning routes home (dorm lobby) and skips it;
  following signs moves you; the demo augment installs; a player can
  author their own dorm but not others'.

Scoped-authoring depth (building), the fuller campus, and richer beats
wait for later waves and the housing content.
