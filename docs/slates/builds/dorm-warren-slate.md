# Dorm Warren — the room as authoring on-ramp (slate)

> **Status: slate / pre-requirements.** A future build. Captures a design pass
> from 2026-06-27 (designing the EU dorm cast + the sealed room surfaced it).
> The substrate is built or building — the **Warren / MultiLocation** elastic
> graph ([location.md](../../subsystems/location.md)), templates + the clone
> pipeline ([templates.md](../../subsystems/templates.md)), the **CMS**
> ([cms.md](../../subsystems/cms.md), [cms-slate](./cms-slate.md)), traits, and
> the per-character **Carries** loadout. This slate designs the dorm-room
> *content + faculty* over it.
>
> **Why "Warren":** Duncan Hall is a Warren of **dynamically-generated** rooms,
> budded per assignment off **Katie's manifest** (the property manager is the
> diegetic face of the room allocator — see her sheet). Every player passes
> through the dorm before homesteading out to real estate later; it's the
> universal first home.

---

## The reframe: two rooms, one system, two states

You design **Dunny's room** and **your own room** *in tandem*, because **all
dorms are uniform** — one `DormRoom` template, Warren-budded per assignment. The
only difference is **occupancy state**:

- **Yours is *live*** — running room code, two live occupants driving it.
- **Dunny's is the *same template, frozen*** — cut off mid-life: his half
  preserved (the cold tea, the work), Wren's half stripped (vacated).

Designing one designs both — and that's *why* the sealed room (experience #4)
lands: it is **your own room, after a death.** Tandem makes the faculty legible
(you see it running *and* stopped) and makes the horror personal.

## The big idea: the dorm room is the first rung of the authoring ladder

char-gen → **bounded-customize your dorm room** (a fixed palette, no quota,
training wheels) → **inspect it in the CMS** (read the wiring of the familiar) →
**graduate to a sandbox + compute quota** (full authoring, the rails off). The
dorm room is the **bridge from player to author** — the cooperative's
"everyone's a contributor" thesis delivered as a *felt* progression, and it slots
**compute-as-the-real-scarcity** in at the right rung (free/bounded in the dorm;
metered only when you get a sandbox).

**The killer pedagogy — CMS-inspectable.** The first time you open the CMS, you
read the wiring of *the home you already know intimately*; then your sandbox is
the **same vocabulary, unbounded.** You learn to author by reverse-engineering
your own bedroom, so you hit the ground running.

## The faculty (the system)

- **Uniform `DormRoom` template**, Warren-budded via Katie's manifest.
- **Two expression-slots** (the two halves) — the room is a *portrait of its two
  occupants*, never static.
- **Bounded customization** — a curated palette (training wheels), not arbitrary
  authoring; the sandbox is where the rails come off.
- **CMS-inspectable, live-running code** — the wiring is a worked example, and
  "live" = the dynamic-expression engine that turns *who lives here* into *what
  the room looks like.*

## Themes — the on-ramp's first click

The gentlest entry, and the feature to build first: **a curated set of preformed
themes** you pick at **room assignment, from Katie.** You tell her the look you're
after — *space, maritime, naturalist, scholarly, minimalist, cozy, industrial…* —
and when she **moves you in, the room is already customized** with that theme's
**seed data** (its objects, decor, layout, lighting). Instant gratification: not
a blank box, a *home with a vibe*, day one. Katie is the diegetic interface
(*"what kind of room you after? got a few looks"*), which is a lovely beat for the
manifest-holder.

**The theme is *per-half*, not room-wide** (decided): you theme *your* side;
your roommate's side is themed by *their* expression (the proc-gen NPC's
generated look, or — Wren — her authored one). So the shared room visibly reads
as **two distinct people** — sometimes a cohesive blend, sometimes a charming
clash (your space deck beside their maritime bunk). *Speculative:* if your half
and theirs **match**, the room could **synergize** — the two halves resolving
into one cohesive whole (a small unlock, or just a nicer space). Since the
roommate's theme is generated, a match is either a happy accident or a quiet act
of harmony with your agent roommate (a who-counts-domestic beat, §17.H) — TBD,
and kept light.

Themes do triple duty:
1. **Instant expression** — your room looks intentional immediately.
2. **A bounded starting point** — you then tweak within the palette (theme-scoped
   options: the space theme offers space-y decor).
3. **A worked CMS example** — each theme is a clean, inspectable composition, so
   when you open the CMS your themed room *teaches* you how rooms are wired. The
   pick-a-preset → tweak → inspect → author path is the whole ladder in miniature.

## Occupant expression (the generative core — where the faculty gets designed)

The room is a portrait of its two occupants, and designing **how each kind of
figure expresses** *is* designing the faculty. The expression-channels feeding
one room:

- **Possessions** — the occupant's **Carries** / loadout populate their half.
- **Traits** — dispositions shape the room (a `Diligent` half starts tidy; a
  `Gregarious` one accretes social clutter; a `Shy` one stays spare).
- **Choice vs. generation** — the player's half is *chosen* (theme + palette);
  the NPC's is *generated.*

Four figure-types the faculty must support:

- **You (player):** explicit choice (theme + palette) + your Carries + your
  traits as defaults.
- **The proc-gen NPC roommate:** **generated** expression — the same pipeline
  that makes the agent (NameBank + species + traits, §17.H) also generates *their
  half of the room.* The room is half-authored-by-you, half-authored-by-the-
  generator.
- **Wren (first-class singleton):** **authored** expression — her carve drives
  her half; her *new* room is the test case of "authored singleton + proc-gen new
  roommate" sharing a space.
- **Dunny (departed):** **frozen** expression — his half preserved (negative
  space), the other half stripped; the cut-off-occupancy state.

So the faculty supports **choice, generation, authoring, and freeze** — carve the
expressions and the `DormRoom` template + the CMS-inspectable wiring fall out.

## The thematic payoff (keep it in view)

Your live room is **half you, half a procedural agent** — the who-counts question
made *domestic* (is your roommate's expression "real"? you live inside the
ambiguity, §17.H). And Dunny's frozen room is **your own room's possible future.**
The dorm-room faculty puts the arc's themes in the most intimate space there is —
the room you sleep in.

## Open decisions / dials

1. **The customization palette** — what's in the fixed range (layout-within-
   bounds, bedding/posters/decor, a plant, lighting, tidiness), and how
   theme-scoped it is.
2. **The theme set** — the launch list (space/maritime/…) and how extensible.
   (*Decided:* themes are **per-half**; the matching-theme **synergy** stays an
   open, light sub-question.)
3. **Trait → room rules** — the mapping from dispositions to room expression
   (the generation rules for the NPC half; the defaults for yours).
4. **How dynamic** — does the room shift over time (your state/growth, your
   roommate's mood) or only at customization?
5. **What "frozen" is, mechanically** — how Dunny's room models cut-off
   occupancy (preserved half + stripped half + the seal).
6. **CMS exposure depth** — how much of the room's wiring the first CMS view
   shows, and how it maps to the sandbox vocabulary.

## Dependencies & deferrals

- **Warren / MultiLocation** — *shipped* (the dynamic rooms).
- **Templates + clone pipeline** — *shipped* (the uniform template, seed data).
- **CMS** — *building* (the inspectability + the authoring surface; see
  [cms-slate](./cms-slate.md)).
- **Traits, Carries** — *shipped / designed* (the expression channels).
- **The proc-gen roommate pipeline** — §17.H / llm-content territory; the NPC-half
  generation rides it.
- **The sandbox + compute quota tier** — **deferred** (the full-authoring future,
  metered-compute). The dorm-room rung is the near-term, demoable on-ramp; nail
  it first, leave the sandbox for later.

## Cross-references

- [location.md](../../subsystems/location.md) (Warren) ·
  [templates.md](../../subsystems/templates.md) (template + seed data) ·
  [cms.md](../../subsystems/cms.md) / [cms-slate](./cms-slate.md) (inspectability,
  authoring) · [char-gen.md](../../subsystems/char-gen.md) (the bounded-draft
  precedent).
- [eternal-university-narrative-slate.md](./eternal-university-narrative-slate.md)
  §17.H (the roommate; the who-counts domestic).
- Staging: `eternal-university/experiences/sealed-room.md` (Dunny's frozen room),
  `eternal-university/npcs/property-manager.md` (Katie's manifest = the allocator
  face), and the cast Carries (the expression channel).
- [species-expansion-slate](./species-expansion-slate.md) (the proc-gen NPC's
  species/persona feeds their half).
