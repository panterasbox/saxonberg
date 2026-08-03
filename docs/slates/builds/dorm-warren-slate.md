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

char-gen → **bounded-customize your dorm room** (a filtered editor, no quota,
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
- **Bounded customization = a *filter* over the object's mixin-fields** — not a
  fixed palette of features (see *How customization works*). Customizing = setting
  the editable fields the object's composed mixins expose; the *tier* (dorm)
  filters which fields/values are allowed. The sandbox is the same editor,
  unfiltered.
- **CMS-inspectable, live-running code** — the wiring is a worked example, and
  "live" = the dynamic-expression engine that turns *who lives here* into *what
  the room looks like.*
- **Storage = hybrid (the document-tree decision, 2026-06-27).** The reusable
  **base `DormRoom` template** lives in the *template tree* (the inspectable
  wiring / the "lesson"); your **per-player customization document** lives in the
  new **document tree** (your choices, owner-scoped). The Warren buds your room by
  *cloning the base + overlaying the document* — and the `Hydrator` reuses its
  data path (a document *is* `data`). See
  [document-store.md](../../subsystems/document-store.md).

## How customization works: field-editing over the object's mixins

There is **no hand-picked list of customization "features."** Customizing an
object just means **setting the editable fields of whatever mixins it composes**
— and the **mixin library *is* the palette** (≈100 mixins; a big fraction
decorate: `Visible` descriptions, `Detailed` sub-features,
`SmellSource`/`SoundSource` scent & sound, `AmbientLit`/`LightSource` glow,
`Tangible` material, `Adornable` adornments, `Surfaced`/`Postured` usable
surfaces, `Branded` mark, `Atmospheric` air …). It **grows for free** — every new
mixin is a new way to customize, zero new features to design. Generic objects, so
**no `Named`** (a dorm bed is `a bed` via `Visible.shortDescription`, never a
proper name — see `Named.ts` IS/IS-NOT).

So the whole thing collapses to three pieces:

- **An object's editable schema is *derived from its composed mixins*** (their
  settable fields). The CMS schema-driven editor reads exactly that. The dorm room
  is a **bounded view of the universal editor**; the sandbox is the same editor
  unfiltered.
- **A theme is a cross-mixin *field-bundle*** keyed by slot — not "prose";
  *whatever fields* the genre wants to set (description + material + scent + light
  in one register). Picked from **Katie at move-in**, **per-half** (→ the
  genre-clash made domestic; matching-genre synergy kept light, §17.H).
- **A tier is a *filter*** over that field-surface — *which mixins / fields /
  values* are editable here. That is the only thing "bounded customization" means.

### The theme roster (the launch set)

Seven registers Katie offers at move-in (*"a few looks"*), each a recognizable
genre **anchored to real world content** — plus one unlock. Each *is* a
cross-mixin field-bundle (description + material + light + scent, in register):

| Theme | Register | World-anchor | A taste |
|---|---|---|---|
| **Fantasy** | high-fantasy | the species, the aether | dark wood, candles, a runebook; beeswax & cold stone |
| **Future** | sci-fi / cyberpunk | the corpos | chrome, a glowing terminal, neon underglow; a fan's hum |
| **Noir** | hardboiled detective | the murder arc | blind-slat shadow, a desk lamp, a case-board; smoke & old paper |
| **Gothic** | horror / dread | the undead cast | dark velvet, a cracked mirror, cobweb; a shut-room smell |
| **Period** | antique / old-world | the classical, dark-academia | leather & brass, an oil lamp, mahogany; old books |
| **Pastoral** | cozy / cottage | the rustic, the warm | quilts, dried flowers, a plant; woodsmoke & herbs |
| **Plain** | neorealist (no-theme) | the un-genred EU ("the dorm is a dorm") | institutional bed, a desk, a few posters, fairy lights |

**Unlock — Weird** (eldritch / aether-strange; Gus's "all eyes and angles"):
angles that don't quite meet, a window onto the wrong sky, ozone. Hardest to make
*livable* — earned, not handed out at move-in.

Curated, not the ceiling: themes are field-bundles, so **community-authored
themes** come later (a player's "synthwave" or "brutalist" bundle — the first
player-made content others consume). These seven (+ Weird) are the launch
definitive set.

### The field-value sources (what populates a half)

Genre/soul/roots aren't separate axes — they're **sources** that feed the one
field-surface, resolved **player > theme > trait-default > base**:

- **Theme** (genre) — a field-bundle across mixins, in register. The skin.
- **Soul** (traits) — trait-derived **field defaults** (a `Diligent` occupant's
  side defaults tidy; loud-signal map: diligence→tidiness, sociability→openness,
  curiosity→collection, temperance→consumables, …; the **band sets the volume**).
- **Roots / origin** (bio) — **light bio-derived homeland accents** layered
  *under* your register, **not a second theme family** (a sea-born half gets
  salt-air, driftwood, coral in the palette — *whatever register you picked*).
  Auto from bio, **not a second pick** (no paradox of choice), and **no
  completeness pressure**: accents of *whatever richness the homeland warrants*
  (maritime rich, a dull homeland gets one token). At the **apartment tier** the
  homeland **blooms into a whole biome** (below); at the dorm it stays accents.
- **You** — explicit field overrides, on top.

And the **four figures** populate that surface differently — **production cost
maps to room cost:**

- **You** — a theme **plus your own field overrides.**
- **The proc-gen roommate** — **a theme, *unmodified.*** It picks a register from
  its persona (with variety — an elf needn't get fantasy; the species-allegory
  discipline) and stops; no per-field customization. Cheap, like the agent — the
  room *is* the theme. (The never-personalized half quietly feeds the §17.H
  *dawning* that there's not-quite-a-person there.)
- **A singleton NPC (Wren)** — **bespoke**, *never* a theme off the shelf. Carved
  characters get carved rooms: a hand-authored field-set that *is* the carve
  (Wren's — boxes still unpacked, one corner made functional, the letter from
  home). A theme may seed it, but the carve overrides freely; her room is authored
  like she is.
- **Dunny (departed)** — bespoke **and frozen**: the composition paused on his
  last field-state (cold tea, the counting-notation).

### The tier filter = the housing ladder

The filter widens as privacy/ownership rises — so the housing progression *is*
the customization-power ladder (and the authoring ladder):

| Tier | Privacy | Editable surface |
|---|---|---|
| **Dorm** (shared, half/half) | your half's objects | a curated subset of object mixin-fields (some `Visible`, `Detailed`, `Smell`/`Sound`, value-bounded `Tangible`, `AmbientLit`), within allowed values. **Room-level mixins off** — the atmosphere is shared. |
| **Apartment / hotel** (private, whole-room) | the whole room | + **room-level mixins** — `Atmospheric`/biome: the occupant's **homeland blooms into an actual biome** you step into (the sea-born's underwater apartment — the gate-sky-flip on a private door), whole-room theming. |
| **Homestead / real estate** (own land) | the whole space | the **filter off** — every field, plus **composing new mixins** onto objects. The sandbox. |

The dorm is bounded *because it's shared* (you can't atmosphere a room someone
else lives in); **privacy unlocks deeper finishes; ownership unlocks authoring.**

### The code

The generic object — its composed mixins define what's customizable:

```yaml
# /domain/eu/dorm/bed
class: /lib/dorm/Bed       # = Detailed(SmellSource(SoundSource(Tangible(Visible(Thing)))))
data:
  short:    "a bed"                     # Visible      (NOT Named — generic)
  long:     "A standard dorm bed."      # Visible
  material: /obj/material/wood/pine     # Tangible
  # details (Detailed) · smell (SmellSource) · sound (SoundSource) · light (AmbientLit): unset
```

A theme — a cross-mixin field-bundle, keyed by slot:

```yaml
# /domain/eu/theme/fantasy
bed:
  short:    "a great four-poster"                              # Visible
  long:     "A four-poster, drapes the deep red of old wine."  # Visible
  details:  { drapes: "heavy velvet, dust sifting from the folds" }   # Detailed
  material: /obj/material/wood/blackoak                         # Tangible
  smell:    "beeswax and cold stone"                           # SmellSource
  sound:    "charms on the canopy tick in any draft"           # SoundSource
  light:    { glow: candle, level: dim }                       # AmbientLit
```

Your half — a sparse *field diff* (any mixin's fields):

```jsonc
// document tree · /home/p-8f2a/dorm-room
{
  "meta": { "schema": "dorm-room@1", "owner": "p-8f2a",
            "base": "/domain/eu/DormRoom", "room": "duncan-hall:r-204", "half": "left" },
  "theme": "fantasy",
  "slots": {
    "bed": {
      "long":     "Just a cot. But the quilt's the one Gran sewed.",   // Visible
      "material": "/obj/material/textile/quilt-cotton",                 // Tangible
      "details":  { "quilt": "edges gone soft, a coffee stain shaped like Ohio" }, // Detailed
      "smell":    "faintly of her house — cedar and old coffee"         // SmellSource
      // short, sound, light: untouched → the fantasy bundle's
    }
  }
}
```

The tier filter — the only thing that makes it "bounded":

```yaml
# /domain/eu/DormRoom — which mixin-fields a DORM lets a player set (and to what)
editable:
  "*":                               # any slot object on your half
    Visible:     [short, long]
    Detailed:    [details]           # describe existing sub-features
    SmellSource: [smell]
    SoundSource: [sound]
    AmbientLit:  [light]
    Tangible:    { material: [ /obj/material/wood/**, /obj/material/textile/** ] }  # value-bounded
  # NOT here: Atmospheric (room biome → apartment tier); composing new mixins (sandbox)
```

End to end: **the object's mixins define the surface, the theme is a field-bundle,
your doc is a field-diff, the tier is the filter** — and the CMS shows all of it
(`from: theme` grayed, yours highlighted), the same editor you'll get unfiltered
in your sandbox.

## The thematic payoff (keep it in view)

Your live room is **half you, half a procedural agent** — the who-counts question
made *domestic* (is your roommate's expression "real"? you live inside the
ambiguity, §17.H). And Dunny's frozen room is **your own room's possible future.**
The dorm-room faculty puts the arc's themes in the most intimate space there is —
the room you sleep in.

## Open decisions / dials

1. **The tier filter** — finalize which mixin-fields the dorm exposes and their
   value bounds (the `editable` policy); keep it small (the beginner bound + the
   CMS lesson).
2. **The genre/theme roster** — ***resolved:*** the **seven-register launch set +
   Weird-as-unlock** (see *The theme roster*), picked from Katie, **per-half**;
   matching-genre **synergy** kept light; community-authored themes later.
3. **Trait → field-default mapping** — refine the soul map and the resolution rule
   (player > theme > trait-default > base).
4. **Roots / origin, near-term** — light bio-derived homeland accents under the
   register (maritime = sea-accents, *not* a peer theme); how rich per homeland;
   the full **biome bloom** is the apartment tier, not the dorm.
5. **How dynamic** — does a half shift over time? *Lean:* the **NPC half slowly
   tracks its entrenching traits** (a living readout + a subtle clue surface), the
   **player half stays put until you tweak it.**
6. **What "frozen" is, mechanically** — Dunny's cut-off occupancy (preserved half
   + stripped half + the seal).
7. **CMS exposure depth** — how much wiring the first view shows; the
   schema-driven editor derives an object's editable schema from its mixins.
8. **The private-housing tier** — apartment / hotel (whole-room, + `Atmospheric`/
   biome — the magic-threshold room) as the **next build** after dorm-warren; the
   rung that unlocks room-level customization.

## Dependencies & deferrals

- **Warren / MultiLocation** — *shipped* (the dynamic rooms).
- **Templates + clone pipeline** — *shipped* (the uniform template, seed data).
- **CMS** — *building* (the inspectability + the authoring surface; the
  schema-driven editor reads an object's mixin-fields; see
  [cms-slate](./cms-slate.md)).
- **The document tree (the "third tree")** — **decided 2026-06-27**: the
  per-player customization document lives here, the base template in the template
  tree (the hybrid). The Warren-constituent storage standard; reuses the Hydrator.
  See [document-store.md](../../subsystems/document-store.md).
- **The mixin library** — *shipped* (≈100 mixins); it **is** the decoration
  palette and grows for free.
- **Traits, Carries** — *shipped / designed* (the soul source).
- **The proc-gen roommate pipeline** — §17.H / llm-content territory; the NPC-half
  generation rides it.
- **The private-housing + sandbox tiers** — **deferred** (whole-room biome; the
  full-authoring + metered-compute future). The dorm-room rung is the near-term,
  demoable on-ramp; nail it first.

## Cross-references

- [location.md](../../subsystems/location.md) (Warren) ·
  [templates.md](../../subsystems/templates.md) (template + seed data) ·
  [mixins.md](../../subsystems/mixins.md) (the palette) ·
  [cms.md](../../subsystems/cms.md) / [cms-slate](./cms-slate.md) (the
  schema-driven editor) · [char-gen.md](../../subsystems/char-gen.md) (the
  bounded-draft precedent).
- [eternal-university-narrative-slate.md](./eternal-university-narrative-slate.md)
  §17.H (the roommate; the who-counts domestic).
- Staging: `eternal-university/experiences/sealed-room.md` (Dunny's frozen room),
  `eternal-university/npcs/property-manager.md` (Katie's manifest = the allocator
  face), and the cast Carries (the soul source).
- [species-expansion-slate](../tails/species-expansion-slate.md) (the proc-gen NPC's
  species/persona feeds their half).
