# Affiliation slate (social organization)

> **Status: PARTIAL** — the substrate shipped: the `GroupApi` facade over
> four providers (managed · MQL · contacts · party) →
> [grouping.md](../../subsystems/grouping.md)
> **Left:** House as a provider plus its char-gen touch (the near-term,
> campus-tier axis — the only design still owned by this slate); Guild
> and Corp have no remaining design of their own here — each is now a
> pointer to the slate that owns it (guild-slate.md; corpos-slate.md)
> **Size:** a wave

## The frame — one substrate, several axes

Every affiliation here rides the **[grouping facade](../../subsystems/grouping.md)**
(+ [social-graph](../tails/social-graph-slate.md) for ties, [chat](../tails/chat-slate.md)
for channels). **Don't build N systems** — build the substrate; these are
*providers/configurations* on it, differing on three dials: **source**
(vertical-fed / chosen / earned / world-given), **weight** (belonging-flavor
/ deep-system), **permanence**.

**A "club" is not an axis — it's a chat group.** The topic-based chat system
*is* the club mechanism (a "chess club" = a chat channel with members). So
clubs are dropped; the real axes are the *structured* ones below.

| Axis | What | Source | Weight | Onboarding? |
|---|---|---|---|---|
| **House** | abstract belonging bucket | vertical-fed (sorted) | belonging | **yes** (greeter suggests; opt-in) |
| **Guild** | trade/craft/art class | earned | deep (the class system) | no (deferred) |
| **Corp** | allegiance/competition overlay | world-given / joined | deep (competition) | no (deferred) |
| **Religion** | faith/deity → [alignment-religion](./alignment-religion-slate.md) | chosen | deep (deity drama) | the deity pick |

**None are pre-lounge char-gen picks.** House is the only one touching
onboarding; the rest are earned/taken in-world.

## Scope — campus-tier vs. world-tier (don't split affiliations on campus)

Affiliations are *scoped*, and the campus is deliberately kept **unified**:

- **House = campus-tier.** Lives on campus; the belonging layer + the friendly
  house-cup. Unifying (in-group cooperation + sanctioned rivalry under one
  shared roof), never divisive. Multi-campus later → houses can span campuses.
- **Guild + Corp = world-tier.** They live in the world at large, **not** on
  campus. They keep **sanctioned recruiting touchpoints** here (guild halls, a
  corp booth, a branded amenity) — courting you for the after-world — but that
  *courts* you, it doesn't *fracture* the campus into camps.
- **Religion** spans both (faith is personal, everywhere).

**Principle: don't split affiliations on campus.** The campus is the safe,
collegial *incubator* — everyone's a student together, the only campus
affiliation is the friendly house. Divisive competitive/political faction-lines
(corps) belong to the **world past the gate**. Maps onto the geography gradient
(**campus[houses] → city[corps] → wilderness**) and the prosocial thesis: the
gate that flips the sky also separates *campus belonging* from *world
competition* — you don't drop a new player into faction warfare; that's
opt-in, out in the world.

**Lifecycle it implies:** student-era = **house** (campus); graduate into the
world = **guild** (profession) + **corp** (allegiance/competition). The campus
is the unified training ground; the world is where competitive affiliations
live. (Houses may persist as alumni networks, but their home is the campus.)

## House — abstract belonging, vertical-sorted (near-term)

- **A handful of abstract buckets** (Hogwarts-style: few, not one-per-school).
  The vertical sorts **many** backgrounds → the **few** houses (**many-to-one**).
- This **mixes** backgrounds on purpose — people from different schools and
  different tests land in the same house, so house identity is *bigger than
  origin* and cross-pollinates. Few houses also make the **house cup** work
  (rivalry needs a small number of teams — the campus-scale, prosocial
  version of corp competition).
- **Onboarding touch:** the **greeter privately suggests** your house (read
  from your profile); **joining is opt-in** — you research and choose.
- **Privacy (load-bearing):** the real-world signal (school, state) **stays
  private**. Suggestion ≠ exposure (greeter→you, never broadcast), *and* the
  many-to-one abstraction **anonymizes** — your house doesn't reveal which
  school you came from. You're never auto-outed as "from WGU" / "prepping the
  CA exam."
- **Mechanics:** a grouping provider + a chapter space + members; stands
  alone (walk-ins pick or stay unaffiliated; the vertical only *sorts*).
- *Open:* the source→house **mapping** (thematic vibes vs. balanced) is
  content; whether by-test houses **sunset** after the exam (a permanence
  parameter, not a second system).

## Guild — the class system (deferred)

> **The guild design now lives in
> [guild-slate](../builds/guild-slate.md)** (2026-07-28 — the full
> institution design: chartered-not-derived domains, mysteries/calls/
> marks, vocation = discipline × livelihood, tiers, the chartered
> uniform training budget, boards, the balance ledger, the charter
> schema), which supersedes + extends
> [advancement-slate § Guilds](../builds/advancement-slate.md) + § Declared
> focus — reframed as an **institution *over* the Discipline Catalog** (map
> vs institution; no hardcoded class — guilds *are* the class system,
> emergent from membership + earned disciplines) whose core mechanic is
> **declared focus = deliberate practice** (joining declares a focus that
> makes those disciplines learn *faster* — a gradient, not the old
> unlock-*gate* — via a focus-tagged Transcript, honesty firewall intact).
> This section's "class taxonomy + ladder" sketch is superseded by that.
> The **form / join / earn** wall: you *form* a party, *join* a guild, *earn*
> standing with a corp.

## Corp — the competition overlay (deferred)

> **Settled since this sketch:** corp is a **conduct-driven multipolar
> approval *standing*, NOT a membership** (you don't *join* a corp — every
> corp regards you, moved by conduct; see
> [corpos-slate § the approval vector](../builds/corpos-slate.md), Phase 1
> shipped as the mark substrate → [corpo.md](../../subsystems/corpo.md)). The
> "joined branch" framing below is superseded — allegiance is *employment +
> the resulting standing*. The full player-axis is now **closed** in
> [corpos-slate Phase 2](../builds/corpos-slate.md): the standing-vector;
> competition over **market + prestige** (not territory — that's the polity);
> venues marked by ownership, **people by standing** (not a brand-stamp);
> prosocial-by-construction; player-founded corps deferred.

## Substrate / connections

[grouping subsystem](../../subsystems/grouping.md) (the facade; houses/guilds/corps are
providers) · [social-graph-slate](../tails/social-graph-slate.md) (ties) ·
[chat-slate](../tails/chat-slate.md) (clubs = channels) ·
[alignment-religion-slate](./alignment-religion-slate.md) (religion;
corp-competition's prosocial caveat) · [char-gen](../../subsystems/char-gen.md)
(house is the onboarding touch; aspiration→major→guild) ·
[capability-magic](./capability-magic-slate.md) (guild = the class system) ·
[eternal-university-slate](../builds/eternal-university-slate.md) (guild recruiting,
house chapters on campus).
