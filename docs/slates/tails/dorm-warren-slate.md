# Dorm Warren — the room as authoring on-ramp (slate)

> **Status: PARTIAL** — the dorm shipped (DormWarren/DormRoom, Katie,
> `provision`, the vocation theme overlay + `remodel`, D1 multi-instance
> persistence) → [residence.md](../../subsystems/residence.md)
> **Left:** the bounded mixin-field editor + the dorm tier filter · the
> CMS-inspectable lesson rung · the roommate NPC half (the two
> expression-slots, the soul/roots field sources, its trait tracking) ·
> hand-authored custom prose (+ the absorbed prose-on-owned-items seam: a
> `PROSE_FIELDS` allowlist over the spine, on a good) · the sealed/frozen
> room · community-authored themes · the private tier's room-level
> customization (the biome bloom)
> **Size:** a wave

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

- *Uniform `DormRoom` template, Warren-budded off Katie's manifest —
  shipped → [residence.md § The elastic building](../../subsystems/residence.md#the-elastic-building--dormwarren)
  + § Provisioning.*
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
- *Storage — superseded by the code: a room's state persists through the
  `(scope, key)` spine into `holder_snapshots`, not a document-tree
  per-player doc → [residence.md § D1](../../subsystems/residence.md#d1--the-multi-instance-persistence-model).*

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

### The theme roster

*Superseded by the code: the launch set is by VOCATION (miner · farmer ·
nautical · merchant · medic · military · scholar), picked from Katie at
move-in per ROOM; genres are the holodeck's job →
[residence.md § The shell personalization](../../subsystems/residence.md#the-shell-personalization-theme-overlay).
The seven-genre table is in git.*

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

*The bed, the theme bundle and the per-player document sketched here
shipped in a different shape — a real `Bed` Stuff at
`/world/eternal/duncan-hall/thing/bed`, prose-only theme bundles in
`dorm-themes.yaml` applied by fixture role, and `holder_snapshots` in
place of a document-tree doc →
[residence.md § The shell personalization](../../subsystems/residence.md#the-shell-personalization-theme-overlay)
+ § D1. What follows is the unbuilt half.*

The tier filter — the only thing that makes it "bounded":

```yaml
# /world/eu/DormRoom — which mixin-fields a DORM lets a player set (and to what)
editable:
  "*":                               # any slot object on your half
    Visible:     [short, long]
    Detailed:    [details]           # describe existing sub-features
    SmellSource: [smell]
    SoundSource: [sound]
    AmbientLit:  [light]
    Tangible:    { material: [ /stuff/idea/material/wood/**, /stuff/idea/material/textile/** ] }  # value-bounded
  # NOT here: Atmospheric (room biome → apartment tier); composing new mixins (sandbox)
```

End to end: **the object's mixins define the surface, the theme is a field-bundle,
your doc is a field-diff, the tier is the filter** — and the CMS shows all of it
(`from: theme` grayed, yours highlighted), the same editor you'll get unfiltered
in your sandbox.

## Absorbed from residence-ladder-design-pack — Deferred seams: prose-on-owned-items personalization

*Moved here verbatim by the 2026-09-21 cluster pass from the ladder pack's
"⭐ Deferred seams, salvaged from the retired apartment plan" list. It is
the owned-goods half of the custom-prose item this slate's `Left` already
names ("hand-authored custom prose") — the same deferral
[residence.md § Deferred](../../subsystems/residence.md) records as *"the
owned-goods personalization (prose at craft/buy) is the chattel path."*
Chattel has since shipped ([chattel.md](../../subsystems/chattel.md)), so
its last sentence's precondition is met; the `PROSE_FIELDS` allowlist it
names is the shipped `PROSE_SETTERS` allowlist's shape, applied to a good
rather than a room's fixtures.*

- **Prose-on-owned-items personalization** (DECISION D5 in requirements) — the
  whole-document write on an item's expressive prose fields; attaches at a
  `PROSE_FIELDS` allowlist + the spine (instance state, carried free). Needs
  chattel (this build) first.

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
2. **The genre/theme roster** — *superseded:* shipped as the vocation set,
   picked from Katie per room →
   [residence.md § The shell personalization](../../subsystems/residence.md#the-shell-personalization-theme-overlay).
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
  [cms-slate](../builds/cms-slate.md)).
- **The document tree** — *superseded:* per-player room state rides
  `holder_snapshots` (D1), not the document tree →
  [residence.md § D1](../../subsystems/residence.md#d1--the-multi-instance-persistence-model).
- **The mixin library** — *shipped* (≈100 mixins); it **is** the decoration
  palette and grows for free.
- **Traits, Carries** — *shipped / designed* (the soul source).
- **The proc-gen roommate pipeline** — §17.H / llm-content territory; the NPC-half
  generation rides it.
- **The private-housing + sandbox tiers** — *shipped:* the let unit
  ([holding.md](../../subsystems/holding.md)) and the holodeck
  ([sandbox.md](../../subsystems/sandbox.md)); the whole-room biome and the
  filter widening are still this slate's (see *The tier filter*).

## Cross-references

- [location.md](../../subsystems/location.md) (Warren) ·
  [templates.md](../../subsystems/templates.md) (template + seed data) ·
  [mixins.md](../../subsystems/mixins.md) (the palette) ·
  [cms.md](../../subsystems/cms.md) / [cms-slate](../builds/cms-slate.md) (the
  schema-driven editor) · [char-gen.md](../../subsystems/char-gen.md) (the
  bounded-draft precedent).
- [eternal-university-narrative-slate.md](../builds/eternal-university-narrative-slate.md)
  §17.H (the roommate; the who-counts domestic).
- Staging: `eternal-university/experiences/sealed-room.md` (Dunny's frozen room),
  `eternal-university/npcs/property-manager.md` (Katie's manifest = the allocator
  face), and the cast Carries (the soul source).
- [species-expansion-slate](../tails/species-expansion-slate.md) (the proc-gen NPC's
  species/persona feeds their half).
