# Combat tactics & engagement model (working slate)

> **Status: PARTIAL** — `CombatGraph`, the formation presets and ranged
> Wave 1's band ladder shipped → [ranged.md](../../subsystems/ranged.md),
> [combat-formations.md](../../subsystems/combat-formations.md);
> cover-as-status and the Skirmish preset are now
> [ranged-slate.md](../builds/ranged-slate.md)'s (§ Cover, § Formations)
> **Left:** the `physical` conduit channel for cross-room shots (⚠
> contradicted by ranged.md's cross-room ruling — see the compaction
> ledger) · the magic-interplay questions at `MagicLogic.deliverAt`
> (bolt vs cover · interpose · attenuation · counterspell vs cover) · a
> per-character gambit layer, only if players demand it
> **Size:** a tail

Working slate for **combat tactics**: the party-as-a-whole meta-strategy
layer, the abstract engagement model it rides, and why this — not
geometric ranged combat — is where a text game shines.

> **The combat system itself now has its own slate.** This slate's two
> theses — combat-as-engagement-graph and party-level tactic presets — are
> the *spatial* and *party-strategy* halves. The **terms/consent/blame
> frame, the loadout/affordance model, the expressive layer, and the
> moment-to-moment poise minigame** live in
> [combat-slate.md](../builds/combat-slate.md), which was written after this one and
> supersedes its "combat system itself… not yet designed" deferral. This
> slate's *engagement graph* is that slate's *threat graph*; its
> Master-Apprentice preset is validated there against the poise economy.

The starting provocation was ranged combat. The conclusion was that
ranged combat *is* possible without sub-room geometry (it's an
abstraction problem, not a coordinate problem), but it isn't where games
like this shine. Chasing the same thread the other direction — *what
does* a text/multiplayer/AI-hosted world do better than a Unity
action-RPG? — lands on coordinated, legible, social party strategy. That
reframe is the point of this slate.

See also:

- [docs/design-philosophy.md](../../design-philosophy.md) — the "How this
  lands for ranged actions" and "hiding/cover as status, not position"
  sections are the spatial groundwork this slate builds on. Cover and
  flanking are *statuses*, not coordinates.
- [docs/interaction-philosophy.md](../../interaction-philosophy.md) — text is
  serial, not parallel; the keystone that the human interface *is* the AI
  interface. Both are load-bearing for why party tactics suit this medium.

---

## Principle

1. **Combat is a relationship graph, not a coordinate space.** The atomic
   fact is "actor A is *engaged* with actor B" — a single edge between two
   actors, no position. Everything tactical (who can hit whom, who's
   protected, who's free) is a property of that graph.
2. **Codify emergent behavior; don't fight it.** Players will
   power-level, kite, and exploit. In a multiplayer world you can't stop
   them — so name it, rule it, and tune its rewards. Make them do it *by
   your rules.*
3. **Tactics are party-level presets, not per-character scripts.** One
   legible choice the party adopts, not a wall of per-actor IF/THEN
   gambits. Legibility is a text-medium requirement, not a nicety.
4. **It rides existing substrate.** Engagement framework + grouping +
   status effects + `Idea` singletons. No new geometry, no new
   coordinate model, no registry.

---

## Thesis 1 — Combat as engaged relationships (the spatial answer)

Superseded by the ranged build: the binary *locked-in-melee* status became
the four-band ladder per edge (`close · reach · near · far`), kite/close
became `fight withdraw`/`advance`, the room-size skill modifier became the
arena cap derived from real extent, and *artillery from the next room* is
ruled out of scope as load-bearing → ranged.md § Bands are relationships ·
§ The arena caps the ladder · § Opening the gap · § Deliberately out of
scope; the session is a plain N-container, not a `SustainedEngagement`
(combat.md § Cycle 2). Cover-as-status is superseded by ranged-slate.md
§ Cover — the shield's static cousin (an authored, directional,
destructible, leased object; the `cover` answer steps the placement
ladder, no hit chance). Still uniquely held here:

- **Conduit transmissivity** — already channel-keyed for light and sound;
  `physical` is one more channel for "do arrows pass through this
  doorway / window / portcullis." (See design-philosophy "How this lands
  for ranged actions.")

---

## Thesis 2 — Party tactics (the marquee feature)

Shipped as the **combat-formations build** — renamed *formation* (the
DA:O lineage and its rejection are stated there), four presets (`default`
· `focus-fire` · `vanguard` · `master-apprentice`; Skirmish/Kite and
Phalanx deferred), Master-Apprentice's reward knobs **superseded by the
emergent economy** → combat-formations.md (intro, § The `CombatFormation`
Idea, § The `command` Discipline, § Deferred, § History).

### Why this is text/social/AI-native

- **Legible** — one prose line per tactic, watched unfolding. Matches the
  serial medium instead of fighting it.
- **Social** — a party-level decision creates coordination, role
  negotiation, leadership: the social fabric the project leans on.
- **AI-native** — a mixed human+AI party can run a formation, each member
  reading the tactic and playing its role through the same command bus.
  In Master-Apprentice, *the master could be an AI tutor* — the
  "human interface is the AI interface" keystone and the education
  vertical, expressed through combat.

This is also the answer to "ranged isn't where these games shine": party
tactics is. If a combat sentence ever goes in the README or the
philosophy docs, it should be this, not arrows.

---

## Shape of the integration (sketch, not a build)

Superseded by the build → combat-formations.md: `CombatFormation` (not
`CombatTactic`) at `/platform/idea/CombatFormation/<name>`; the Party holds
the formation as a path string + `roleAssignments`; the session is a
plain N-container, not a `SustainedEngagement` (combat.md § Cycle 2);
cover is ranged-slate.md § Cover.

---

## Open questions

1. Resolved: combat shipped (combat.md).
2. Resolved — superseded: Master-Apprentice has **no reward knobs**; the
   economy is emergent (combat-formations.md § The `command` Discipline,
   § History).
3. Resolved: four presets seeded; a fifth *when content asks*
   (combat-formations.md § Deferred).
4. Resolved: interceptor roles in priority order, holders in roster
   order (combat-formations.md § The three hooks).
5. Resolved: *"solo" is not a concept* — the total resolution chain
   (combat-formations.md § The total resolution chain).
6. Resolved: NPC≈PC — the `combatant` brain is formation-aware through
   the same read (combat-formations.md § Surface).

---

## What this slate does NOT cover

- Geometric/ballistic ranged combat — refused, and shipped that way
  (ranged.md § Deliberately out of scope). The combat system itself,
  the activity framework and the party subsystem all shipped.
- **Per-character behavior scripting** (DA:O-style gambits) — deliberately
  *not* the model; party-level presets replace it. A gambit layer could
  return later if players demand per-character control, but it's not the
  v1 thesis.

---

## Once shaped into formal requirements

Superseded by the combat, combat-formations and ranged builds — every
item shipped or was replaced (combat.md § Cycle 2, combat-formations.md,
ranged.md) except the `physical` conduit (Thesis 1, above) and cover, now
ranged-slate.md § Cover.

### Magic interplay questions (banked 2026-07-23, from the magic build)

The magic core build
([magic.md](../../subsystems/magic.md))
shipped deliberately **room-scoped** — no ranged pretense — and routed
all hostile channel-delivery through one internal **`deliverAt`** seam in
the magic logic, documented as the ranged-integration point. When this
slate's ranged model is designed, that seam adopts it (offensive spells
swap one leg; spell data / resist seam / faculty untouched), and these
questions come due:

- **Bolt vs cover/dodge** — does a firebolt contest the same `Covering`
  status an arrow does, or is the cast-time interrupt magic's whole
  active gate even at range? (Lean: same cover contest — one delivery
  model, the mundane-first doctrine.)
- **Interpose / shield-facing** — the weapon build's directional shield
  cover (`InflictSpec.shieldFacing`) vs a bolt; can a bodyguard
  interpose on a ranged cast the way `defend <ally>` redirects a melee
  edge?
- **Range attenuation** — a bolt weakening with distance is both a
  balance knob and *the inquiry substrate's flagship discoverable law*
  (falloff-by-experiment). Attenuation should land as an honest function
  the moment distance exists, so the inquiry build can mark it
  discoverable. Cross-room "distance" = the conduit/transmissivity hops
  this slate already names.
- **Counterspell vs cover** — Arcana's counter (an in-flight-effect
  read) and physical cover should stay *distinct* answers to a ranged
  cast, not collapse into one dodge stat.

Enemy-side formations landed (the `combatant` brain resolves through the
same chain a player does — combat-formations.md § Surface).
