# Duncan Hall — the dorm (staging)

> **Status:** staging design (the building's *fixed geography* — first pass,
> 2026-06-27). Sibling to [campus-map.md](./campus-map.md). The **rooms** and
> their customization faculty live in the
> [dorm-warren-slate](../../slates/builds/dorm-warren-slate.md); this sheet owns
> the **building** the rooms hang inside.
> **Retire when:** cemented as a Warren + location seeds in YAML.

---

## The frame: pinned skeleton, elastic flesh

Duncan Hall is a **Warren** of dynamically-generated dorm rooms — and it's the
concrete demonstration of the **pinned + elastic** invariant the dorm-warren
slate set: the building's **skeleton is pinned/authored** (lobby, vertical
circulation, per-floor hubs, bathrooms, common areas — they always exist), and
its **flesh is elastic/generated** (the *rooms* bud and reap off the floor-hubs
per assignment). The pinned skeleton is a handful of authored fixtures threaded
by the vertical spine; the rooms are generated between them. Most of it is
ambient / flat-on-purpose; only a few named spaces are load-bearing (below).

## Vertical circulation — three ways up, and the split matters

- **The elevator** — the main public lift (a small transit Location connecting
  floor-hubs; one or two cars). Front-of-house. *(Dial: vessel vs. transit-room
  tech.)*
- **The main stair** — public, front-of-house, off the lobby.
- **The service stair** — **back-of-house, Katie's domain, and where Dunny was
  "found"** (experience #2). That it's the *service* stair is itself a tell:
  less-trafficked, back-of-house — far easier to stage a body unseen than the
  public stair or the lift. And it **runs down past the boiler**, which is why
  it's the *warm* stairwell — grounding #2's forensic clue (*"too cold for a warm
  stairwell"* → he cooled somewhere colder and was moved here).

## Floor one — the public ground level (all pinned/authored)

- **The lobby** — Katie's station, the entrance, the **onboarding climax** (room
  assignment off her manifest), the social threshold. The bridge-troll's bridge.
- **Katie's apartment** — ground-floor, by the lobby (door half-open, kettle,
  plants; the corkboard of decades of tenants). See her carve.
- **The mailroom** — packages and post; a small ambient check-in loop.
- **The common room** — couches, a screen, the *residential* social hub
  (distinct from Dave's Bar — this is *home* hanging-out). Where the dorm's
  ambient life happens; floormates and players linger.
- **A public restroom** off the lobby.
- **The elevator + both stair bases.**

### The basement (below floor one)

Katie's **workshop**, the **boiler / mechanical core**, **storage**, the
**laundry**, and the **service-stair foot**. Back-of-house — and the quiet
maintenance-access route (the physical-access role §12 once gave Pidge, now
Katie's). The boiler here is what makes the service stair warm.

## Bathrooms

**Shared, communal, per-floor** — a bank down the hall (showers, stalls, sinks),
the classic-dorm "down the hall." That makes them a **social space**: where you
bump into floormates, notice who's around (and who *isn't*) — feeding both the
ambient life and the murder's "does anyone remember them?" layer. **All-gender**
by default: with the species diversity, the human gender-binary doesn't carry, so
it's single-stall + a communal wash area, not gendered banks (a quiet
worldbuilding beat). Plus the lobby restroom for the public floor.

## The residential floors (2+)

Each is a pinned **floor-hub** (the hallway / landing the elevator and stairs
open onto) with:

- **Elastic rooms** budding off the hub per assignment (the Warren's flesh).
- Per-floor pinned shared fixtures: the **communal bathroom** and a small
  **floor lounge** (a kitchenette, a couch).

**Dunny's floor** carries his **sealed room** (the #4 setpiece) and, off it,
**Wren's reassigned room** (the bespoke singleton room — see her carve).

## Security & access

What keeps strangers out of your room, and you out of others' — **two layers,
both anchored to Katie's manifest** (the source of truth for who lives where).

**Physical entry — the door (mundane; "the dorm is a dorm," §2).** Every room has
a plain **lockable door** (the `Boundary` / `DoorBearing` / `Sealable` substrate).
Who it opens for is an **access-control** check ([access.md](../../subsystems/access.md)
— `AccessApi.can(actor, 'enter', room)`): the authorized set is the room's
**assigned occupants** (read off the manifest), with **Katie holding master
authority** (her keys — the §14 investigation gate). Entry is **possession-gated,
low-friction**: you *have* your key and you're on the list → the door opens; you
don't `unlock` on every entry. A resident carries **one key**; **Katie carries
the keychain** (her *sound*, the building authority — the size of your key-ring is
a status marker, not a chore).

**Why physical keys at all — and why that's a feature, not a tedium tax.**
Because the aether **can't authenticate** (§8 — the same blindness the census
runs into), a door *can't recognize you*; it can only check a key. So access is a
**physical token** — losable, stealable, lendable, copyable — and *that is the
whole texture of the investigation*: Katie's key can be lent or refused, a stolen
key opens a sealed room, "who had a key" is a real question. The mundane key is
the *consequence* of the aether's blindness (**not** a magic door — the opposite),
and it's **why access is contestable** at all. The unauthorized routes — **be let
in · get a key · break in** (loud; the world remembers, §11) · **go around** (the
window) — are the §17.G immsim; the sealed room (#4) is just a special-cased
contested door.

**Editorial access — the document (owner-scoped).** Standing *inside* a room you
still can't **re-author** it: the customization document is owner-scoped (the
document-tree's gated save — see the
[dorm-warren](../../slates/builds/dorm-warren-slate.md) /
[document-store](../../subsystems/document-store.md) slates). You write only
**your** room's doc; others' you can at most inspect. Two occupants share the room
*physically* (the half-line is a social convention, not a wall — plain containment
lets a roommate touch your stuff), but each **owns their half's document.**
Physical access and editorial access are separate; the manifest feeds both.

## What's load-bearing vs. ambient

- **Load-bearing named spaces:** the **lobby** (Katie / onboarding / the
  manifest), the **service stair** (the scene, #2), and the **common room /
  bathrooms / laundry** (where the dorm breathes and where "who's really here"
  plays out — the who-counts layer at floor level).
- **Everything else is ambient / flat** — the mailroom, the public restroom, the
  generated rooms, the floor lounges. They exist to make the place real, not to
  be authored characters.

## Cross-references

- [campus-map.md](./campus-map.md) (the campus Duncan Hall sits on).
- [dorm-warren-slate](../../slates/builds/dorm-warren-slate.md) (the rooms + the
  customization faculty; the pinned+elastic Warren invariant).
- Carves: [npcs/property-manager.md](./npcs/property-manager.md) (Katie — her
  lobby/apartment/basement domain), [npcs/victim.md](./npcs/victim.md) (Dunny —
  the sealed room), [npcs/roommate.md](./npcs/roommate.md) (Wren — the reassigned
  room).
- Experiences: [experiences/sealed-room.md](./experiences/sealed-room.md) (#4),
  [experiences/first-forensic-win.md](./experiences/first-forensic-win.md) (the
  service-stair scene).

## Open questions / dials

1. **Elevator tech** — a `Mobile` vessel that traverses floor-connections vs. a
   transit-room (fast-travel-ish) vs. a Warren moving-hub. Pick at build.
2. **How many floors** — and whether the floor count is fixed or itself elastic
   (the Warren could grow floors with population, not just rooms).
3. **Gendered vs. all-gender bathrooms** — leaned all-gender (species diversity);
   confirm.
4. **Laundry / common-room placement** — basement laundry vs. per-floor; one big
   common room vs. per-floor lounges (leaned: big common room on one + small
   floor lounges).
5. **The basement as an access route** — how much it's a usable maintenance
   ingress (ties to the sealed-room immsim routes via Katie's keys).
6. **Key mechanics** — copying / lending / lost-key reissue (a Katie loop);
   physical key (leaned — stealable feeds the immsim) vs. a combination lock.
