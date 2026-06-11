# EU campus — districts & roads (staging)

> **Status:** being designed live. The v1 campus layout — districts, the
> road network, and the road prose. Roads come **from Eternal City** (names
> kept); prose is the **EC original *updated*** — aesthetic preserved,
> language improved (not a rewrite). EC map is **not** replicated (its
> central kill-zone Heart is rejected); the campus is its own layout.
> See [eternal-university-slate](../../slates/builds/eternal-university-slate.md).

## Districts (v1)

1. **The Gate (Arrival)** — campus side of Gus's gate; the **sky-flip** (the
   sourceless EU sky vs. Terminus's ordinary one). First-impression room.
   Teaches look / sense / zone. *Terminal #1.* (EC rhyme: Eternal Way's fog
   "thins west into the TPA Terminal" — that terminal is this gate.)
2. **The Academic Core** — organized around **the Quad** (central green,
   orienting landmark + the whimsical statue). Services & halls cluster here.
   Where the journey's richness lives (NPCs, examinables, the greeter).
3. **The Residential Quarter** — Duncan Hall (+ future dorms), a real walk
   away, *nowhere near the Quad*. Verticality + authoring climax.
   *Terminal #2 (Duncan lobby).*

## Road network (v1)

```
   [Gus's gate] ──→ THE GATE (Arrival)
                         │
                    Eternal Way            ← the grand spine
                         │
                    ┌─ THE QUAD ─┐         ← hub junction (optional terminal)
              Silver Street     Limbo Lane
            (academic core)         │
                            RESIDENTIAL QUARTER
                              (Duncan Hall)
```

3 named roads + the Quad. Hub-and-spoke (the Quad is the junction).
**Verticality = Duncan Hall's elevator/floors** (no EC road is vertical;
"Ascending Road" is *not* an EC road — phantom). A staircase *feature* on the
journey can give an earlier verticality nudge.

## The roads (EC aesthetic preserved, prose updated)

### Eternal Way — the entrance spine (Gate → Quad)
*EC signature:* wide central artery; a **mystery fog hovering inches above
the pavement that hides the road's true composition** (won't fan away — "a
complete mystery… Weird-ass"); something unseen slithers across your legs;
deadpan whimsy. *(Source: rooms 015/019/031/035/036/037.)*

> Eternal Way runs wide and dead-straight from the gate into the green — the
> spine the whole campus hangs off. A pale mist lies a few inches above the
> pavement and refuses to lift; fan at it and it only stirs, sluggish, then
> settles back over whatever the road is made of. Nobody's ever gotten a
> clean look at the surface underfoot — the Way keeps its own composition to
> itself, and has, apparently, forever. Every so often something you can't
> see slides across your shins as you wade through it. Overhead, the light
> owns no source it'll admit to: simply, evenly, *wrongly* bright. West, the
> fog thins toward the terminal you arrived through; ahead, it thickens
> toward the Quad.

### Silver Street — the academic core street (off the Quad)
*EC signature:* **mirror-polished silver metal-plate paving** whose
**footsteps ring/reverberate and are "lost in the atmosphere"** (never quite
silent). Commercial in EC (clothing store "PC&A" ≈ our Campus Store; a bank).
*(Source: rooms 008–012.)*

> Silver Street runs off the Quad, tiled wall to wall in a metal polished to
> a long mirror — silver, or close enough nobody's bothered to argue. Every
> footfall rings off the plates, a clear low note that lifts and gets lost
> somewhere overhead, so the street is never quite silent, even empty. The
> campus's working halls line it — clinic, store, chapel — their doors
> opening onto the ringing.

### Limbo Lane — the residential lane (core → Residential Quarter)
*EC signature:* an **odd PINK material — soft, rubbery, spongy, faintly
glowing — that springs/compresses underfoot** ("the road pushes and pulls to
your every step"). *Limbo* = liminal, fitting the core→residential
transition. (EC hosted weird shops here incl. "Anarchy Interdimensional" —
shelved; residential for us.) *(Source: rooms 016/020/022–024/027/028.)*

> An odd pink material paves Limbo Lane — soft, rubbery, faintly aglow — and
> it springs underfoot: each step sinks the road and the road pushes back, so
> you bounce a little whether you mean to or not. It's the quiet way out of
> the core. Silver Street's ringing falls away behind you, and Limbo Lane
> carries you, gently springing, toward the Residential Quarter and the
> dorms.

### The Quad — the hub (not a street)
The central green; the orienting landmark + whimsical statue; buildings front
it directly. Strange finish TBD (wrong-green grass; light that never matches
the hour). Optional terminal #3.

## Prose method (for the rest)

**Pull → polish → adapt.** Grep the road name in `docs/eternal/room*.c`, read
the originals, **keep the aesthetic, improve the language, adapt the
endpoints** to the campus (gate/terminal, the Quad instead of EC's Heart, the
sourceless sky over the EC ground-finish). Never invent the finish — it comes
from the source.

## Road affixes (decided — EC names kept verbatim)

Considered swapping to campus-pedestrian affixes (Walk / Mall / Path / Lane /
Close / Court / Row / Green …), but **kept the EC names as-is**: "**Way**" is
campus-fine (a *way* is a route/path, and "the Eternal Way" carries a
mythic/processional double-meaning that suits the campus *better* than
"Walk"); "**Lane**" is fine; "**Street**" (Silver) leans slightly urban but is
iconic and keepable. Only **"Drive" / "Road"** in the growth roster (Dimension
Drive, Tanelorn/Old Road) read as car-roads — *optional* softenings for later.
v1: no change.

## Floors (the ground) — real materials

A floor's **material *is* the road's strange-material signature**: Silver's
**ringing mirror-metal**, Limbo's **springing pink**, Eternal's
**unknowable-stuff-under-fog**. Model floors with real materials and the road
prose becomes the *actual modeled ground*, with behavior falling out (metal
rings, spongy springs, wet slips).

**Model:** a floor = an **Adornment** composing **`Tangible` (material) +
`Surfaced` (things rest on it) + `Postured` (sit/lie)**, authored per-Location.
This **generalizes the posture-slate's floor adornments** ("modelled and
forgot") from posture-only to **the room's real material ground** (description
+ posture + on-placement + material-behavior). **Not a full Stuff per room**
(residency cost; a floor is a fixed feature, not a manipulable object) —
Adornment is the right weight; full Stuff only if a specific floor must be
picked up/moved (rare).

**Every room? Almost.** Most rooms have a floor (solid ground + material);
**water/air/void rooms substitute the biome *medium*** (air/water/vacuum,
already modeled — you swim/fly/float, no floor). The universal is "the ground
*or* medium you're in/on": floor by default, medium for the exceptions.

**Eternal Way bonus:** a real material underfoot that the **fog conceals**
(perception-gated) — the "can't see what it's made of" joke becomes real (the
material exists; you just can't perceive it).

## Growth roster (real EC roads, waiting)

**Glass Way · Infinity Way · Dimension Drive · Tanelorn Road · Old Road ·
Dark Alley** — for the perimeter loop, future districts (athletics, the road
to the city gate), and the seedier edges as the map grows. (EC color-bleed to
restore later: Glass Way casts **green-tinted light** onto Eternal Way.)
