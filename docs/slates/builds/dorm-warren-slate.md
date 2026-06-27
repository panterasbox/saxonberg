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

## Genre — the theme (the on-ramp's first click)

The "theme" is **genre**, not decor-style — the world's registers: **future,
fantasy, history, neorealist** (and whatever else — noir, horror…). It's the
**aesthetic skin** of your half, and it's deeply on-brand: the whole game is
genre-*mixed* (fantasy species beside cyberpunk corpos; Gus's anecdotes of the
chosen one, god, and the future-guy all minding the same curb). Your room genre
is **which flavor of the genre-soup you bring into your own space** — a future
deck (chrome, screens, LEDs), a fantasy den (tapestries, candles, a chest), a
history room (period furnishings), a neorealist one (grounded, mundane, plain).

You pick a genre at **room assignment, from Katie** — *"what register you after?
got a few looks"* — and when she **moves you in, the room's already seeded** in
that genre (its objects, layout, lighting). Instant gratification: a *home with a
vibe*, day one; a lovely beat for the manifest-holder.

**Per-half, not room-wide** (decided): you skin *your* side; your roommate's side
is *their* genre (the proc-gen NPC's generated register, or — Wren — her authored
one). So the shared dorm reads as a **genre-clash made domestic** — your future
deck beside their fantasy bunk, the genre-mixing thesis in one room, a little
funny. *Speculative:* matching **genres** could **synergize** into one cohesive
space (a small unlock, or just a nicer whole); since the roommate's genre is
generated, a match is a happy accident or a quiet act of harmony with your agent
roommate (§17.H) — TBD, kept light.

Genre does triple duty: **instant expression** (intentional day one), a **bounded
starting point** (tweak within the genre's palette), and the **strongest CMS
lesson** — each genre is a coherent, self-contained composition (a worked example
of "how to build a future space"), exactly what you'd riff on in your sandbox,
nudging toward *authoring within a genre.* The pick → tweak → inspect → author
path is the whole ladder in miniature.

## The room as a three-axis self-portrait (genre · soul · roots)

The room is a portrait of its two occupants across **three composing axes** — and
designing how each kind of figure expresses across them *is* designing the
faculty.

**The anatomy it composes into.** A fixed shell (the Warren node — walls, window,
door, the uniform shape) split into **two halves**, each a small set of **slots**:
bed/bedding · desk · walls (posters, pinboard) · shelves/storage (books,
collections) · decor (plant, lamp, rug, lights) · lighting · floor. The palette is
*slots × options*, deliberately small (the training-wheels bound and the legible
first CMS lesson).

The three axes that fill those slots:

- **Genre (style) — *picked.*** The aesthetic register (future / fantasy /
  history / neorealist); see *Genre* above. The skin.
- **Soul (lived-in state) — *rendered from traits + Carries.*** Personality made
  spatial, layered *on top of* the genre skin (a Lazy fantasy room = candle wax
  and dropped scrolls; a Lazy future room = cables and energy-drink cans). The
  trait → room mapping for the loud-signal axes:

  | Disposition | reads as | pole → pole |
  |---|---|---|
  | `diligence` | tidiness | made/clear/ordered ↔ unmade, piles, clutter |
  | `sociability` | openness | friend-photos, a visitor's chair, door propped ↔ spare, shut |
  | `temperance` | consumables | clean ↔ wrappers, cups, a stocked stash |
  | `ambition` | aspiration | goal-board, trophies, advancement books ↔ cozy, settled |
  | `curiosity` | collection | maps, oddities, projects-in-progress ↔ bare, functional |
  | `generosity` | sharing | candy bowl, communal stuff ↔ locked, hoarded |
  | `humility` | display | modest ↔ trophies, mirrors, awards |
  | `composure` | order | serene, plants ↔ aggressive, chaotic |
  | `worldview` | tone | bright, hopeful ↔ dark, ironic, sparse |

  The **band sets the volume** (entrenched-`Diligent` = *obsessively* tidy); a
  curated **subset** of Carries renders (the displayable ones, not every pocket
  item); the other axes ride along subtly or not at all.
- **Roots (bio) — *rendered from char-gen, grows with lore.*** Where you're from,
  your history, your identity — a memento from home, a species-cultural item, an
  affiliation token, a photo (Wren's *unanswered letter from home* is the
  exemplar). **Thin today** (char-gen bio is barebones), a **seam to grow into**:
  reserve a "roots" slot or two now, fill it as the world accumulates lore — the
  room gets *more* expressive over time.

So: **genre = style, soul = personality, roots = origin** — three layers per
half, two halves per room.

**The four figures across the axes** (carving these designs the faculty):

- **You (player):** genre *picked* + soul from *your traits as overridable
  defaults* + your Carries + roots from your bio.
- **The proc-gen NPC roommate:** **generated** across all three — genre from
  persona/bio *with variety* (an elf might generate fantasy, a synth future, but
  **not deterministically** — an elf in a neorealist room is the better
  character, the same anti-essentialism discipline as the species allegory), soul
  from generated traits, roots from generated bio. You learn who they are by
  looking.
- **Wren (singleton):** **authored** — her carve *is* the spec (heads-down,
  boxes-still-unpacked, one corner made functional, the letter from home); her new
  room is the "authored singleton + proc-gen roommate" test case.
- **Dunny (departed):** **frozen** — the composition engine *paused* on his last
  state (his half a snapshot: cold tea, the counting-notation), the other half
  stripped (Wren vacated).

The faculty supports **pick, generate, author, and freeze** across the three axes
— carve the expressions and the `DormRoom` template + the CMS-inspectable wiring
fall out. "Live running code" = this composition (genre + soul + roots → the
rendered half), recomputed as things change.

## The thematic payoff (keep it in view)

Your live room is **half you, half a procedural agent** — the who-counts question
made *domestic* (is your roommate's expression "real"? you live inside the
ambiguity, §17.H). And Dunny's frozen room is **your own room's possible future.**
The dorm-room faculty puts the arc's themes in the most intimate space there is —
the room you sleep in.

## Open decisions / dials

1. **The palette** — finalize the slots (bed / desk / walls / shelves / decor /
   lighting / floor) and the per-slot options; keep it small (the beginner bound
   + the CMS lesson).
2. **The genre roster** — the launch set (future / fantasy / history / neorealist
   + ?) and how it maps to the world's genre-zones. (*Decided:* genre is the
   theme, **per-half**; the matching-genre **synergy** stays light.)
3. **Soul layering** — refine the trait → room table, and the **genre × soul**
   composition rule (how trait-driven mess sits *on* the genre skin).
4. **Roots, near-term** — one or two "roots" objects now (a home token) vs.
   waiting for richer char-gen bio.
5. **How dynamic** — does a half shift over time? *Lean:* the **NPC half slowly
   tracks its entrenching traits** (a living readout + a subtle clue surface), the
   **player half stays put until you tweak it.**
6. **What "frozen" is, mechanically** — Dunny's cut-off occupancy (preserved half
   + stripped half + the seal).
7. **CMS exposure depth** — how much wiring the first CMS view shows, and how it
   maps to the sandbox vocabulary.

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
