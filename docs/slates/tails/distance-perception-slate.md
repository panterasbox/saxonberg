# Distance-perception slate (perception tail)

**Captured 2026-07-28**, out of the demo-content requirements
session (Limbo Lane's water/landmark vistas forced the question).
The problem: rooms have no fixed spatial relation beyond exits —
and even that is only contiguous inside a zone — so everything
"seen at a distance" today is hand-painted prose that can rot
silently (the Duncan steps described a quad that didn't exist;
every water view and building face is one refactor away from the
same). This slate captures the wanted abstraction; nothing here is
committed to a build.

Seeding facts (verified in source, 2026-07-28):

- The field-modality walks (vision / sound / smell) already cross
  exits: `MAX_HOPS = 2`, `EXIT_TAU = 1.0` (open exits pass at full
  amplitude), Door/Window participate via per-modality Conduits.
  Adjacent-room sources appear in `listen` with attribution today.
- `sense` auto-fires **on entry** — one room too late for danger.
- The crossing's clock tower is the one live vista: a bespoke
  `/obj/Crossing.getDetail` override appending the world clock's
  reading to an authored `tower` detail (the drift-reveal). Works;
  not a pattern.
- `ScryableMixin` + the perceiver split are shipped — the
  privileged remote view exists.

## The four patterns

1. **Vista references (landmark at distance).** A `Detail` entry
   that *references* a remote Stuff (Pattern C resolve-on-read,
   per ref-shapes) and composes authored framing prose with the
   subject's live face — generalizing the clock-tower hack into a
   declarative authoring form. State-bearing landmarks read live;
   pure scenery stays plain prose. Open questions: what face does
   the subject expose for distant viewing (a `distantDescription`
   on Visible? the full presentation?); reciprocal authoring
   (does the tower know it's seen?); staleness when the subject
   moves/destructs (resolve-on-read degrades honestly to the
   framing prose alone).

2. **Bounded peek (mundane).** `look <exit>` / peek: render the
   adjacent room viewer-aware through the exit, gated on aperture
   (open door / window / transparency), light at the far end, and
   concealment bands — honest-fog holds, hidden stays hidden.
   **One hop only.** Rides the existing viewer-aware look
   pipeline pointed at a remote scope; the Shadow seam applies
   unchanged.

3. **Privileged reach.** Two-plus hops, or across zone
   boundaries, is scry territory (shipped). The design question
   is what buys the privilege — magic faculty, augment,
   instrument — and whether there are tiers (adjacent-zone
   cheap, anywhere expensive). Deliberately unresolved here.

4. **The danger-sense baseline** (the floor — user, 2026-07-28:
   "at the very least you need to be able to sense danger before
   you move into a room"). Cheapest honest version needs no new
   physics: `look` (or the exit rendering) annotates exits from
   the walks the substrate already runs — "from the north:
   something snarling." Push what is currently pull. Interacts
   with stealth by design: an ambusher who beat the concealment
   check stays unannounced (that is the point of ambush), so the
   baseline surfaces *unconcealed* danger only.

## Interim authoring rule (adopted now, in the demo-content build)

Until pattern 1 exists: **vista details describe durable facts
only** — water, stone, the fixed face of a building — never
dynamic state (occupants, weather-dependent looks, time-dependent
state). The clock tower remains the sanctioned bespoke live-read.
This is recorded as a constraint in
[demo-content-requirements.md](../../requirements/demo-content-requirements.md).

## Cross-references

- [subsystems/senses.md](../../subsystems/senses.md) — the walks,
  `EXIT_TAU`/`MAX_HOPS`, conduits, the Wave-2+ deferred list this
  tail extends
- [subsystems/perception.md](../../subsystems/perception.md) —
  viewer-aware queries, the Shadow seam, honest-fog
- [subsystems/perceiver.md](../../subsystems/perceiver.md) —
  look/scry/locate, ScryableMixin
- [subsystems/concealment.md](../../subsystems/concealment.md) —
  bands, the honest-fog seams the peek must respect
- [subsystems/ref-shapes.md](../../subsystems/ref-shapes.md) —
  Pattern C resolve-on-read (the vista-reference shape)
- [subsystems/boundary.md](../../subsystems/boundary.md) —
  Door/Window, the conduit seams
