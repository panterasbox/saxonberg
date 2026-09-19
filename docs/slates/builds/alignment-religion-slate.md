# Alignment & religion slate

> **Status: UNBUILT** — superseded 2026-07-01; a pointer stub since the
> 2026-09-19 compaction (every alignment / worship / pantheon section is
> now in [builds/alignment-slate.md](../builds/alignment-slate.md) or
> [story-bible.md](../../story-bible.md); nothing of either is code).
> **Left:** the interdependent-roles / co-op conflict model (the DRG
> lesson) — owned by no other slate
> **Size:** a build

> **⚠ SUPERSEDED (2026-07-01) by
> [builds/alignment-slate.md](../builds/alignment-slate.md).** The matured
> design lives there — two asymmetric axes, pantheon-as-legend, the mirror, and
> the `Faction` primitive. This doc is kept only for its early intuitions and
> the reconciliation history below; **design from the build slate.**

Surfaced while triaging char-gen's identity choices. Two entangled
threads: the **morality/alignment system** and **religion (worship +
deities)**. The design order is *alignment first, religion emerges from
it.*

## Alignment

*Superseded by [alignment-slate](./alignment-slate.md) § Two asymmetric
axes (the 3×3 became two asymmetric axes; the Good floor is the player
clamp on the projection), § One machine, two rosters (derived off the
chronicle, never picked), § Worship vs. alignment (drift = dissonance +
cost, never a flip).*

**Harm lives OFF the alignment grid.** The Law axis is *order ↔ freedom* (a
**stance**), not a harm-ledger — "a good killed a good → unlawful?" is a
category error. Community-health is a **mechanics problem, not a
morality-classification problem** (the **Deep Rock Galactic** lesson):

- conflict points **outward at the *other*** (= evil-as-antagonist; the
  same reason Eternal City's PvP kill-zone Heart was rejected);
- **interdependence** makes cooperation the winning play — the **aspiration
  archetypes are complementary roles** (Healer / Guardian / Builder /
  Seeker / Mentor / Founder = a DRG-style squad);
- **shared goals, reviving/help mechanics, camaraderie rituals**
  (ESP-emotes → a "Rock and Stone" salute culture).

So "no evil players" and "a DRG-quality community" are the *same design*:
everyone's on the good side, the enemy is out there, the mechanics reward
pulling together. (Conflict model = fundamentally **PvE-narrative** —
load-bearing for the eventual combat/quest/wilderness design.)

## Religion (worship + deities)

*Superseded by [alignment-slate](./alignment-slate.md) § Worship vs.
alignment — the gap is the drama (`DevotionMixin`: one professed
`patronKey` + a `tone` of devout / convert / lapsed / doubter, never power;
picked at char-gen from the Good + Neutral demigods, default
*seeking / unaffiliated*, re-declared at the Chapel on the Temple of the
Ages ruins; the dark-god arc real and legible, never a fall), § The
pantheon as legend (Mitra / Pan / Moloch + the demigod grid — the bible
renamed the high gods from Presence / Nature / Hollow), § The mirror
(the gap talks back through the world, reflection-only), and
[story-bible.md § The gods and demigods](../../story-bible.md) (*a god
here is not a being but a gravity* — never embodied). Multi-patron /
eclectic worship and whether Aletheia is pickable at creation are that
slate's Deferred items.*

## Deferred / content

- The actual **demigod roster** (content — "real demigods" is its own
  session).
- The full **morality/advancement mechanics** (favor, boons, trials — the
  capability layer; [[capability-magic]]).
- The **interdependent-roles / co-op party** design (the DRG mechanics).
- How a deity's **favor** manifests mechanically (capability earned through
  relationship).

## Connections

[chronicle](../../subsystems/chronicle.md) (alignment derives from it; the
deity reads it) · [char-gen](../../subsystems/char-gen.md) (the patron-demigod
pick) · the **aspiration archetypes** (complementary roles) ·
recognition / social-graph (the good-floor consequences) ·
[eternal-university-slate](../builds/eternal-university-slate.md) (geography =
pedagogy = morality: campus = safe Good enclave, wilderness = confront the
other) · [[capability-magic]] · the legacy *Temple of the Ages*.
