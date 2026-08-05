# Presence-vs-hollowing slate (working doc) — is anyone home?

> **Status (2026-07): named, not designed — spun out of the magic-items walk.**
> A candidate new substrate: **experiential presence vs. hollowness as a physical
> state of an agent** — *is there an experience here, or is this animate-but-no-one?*
> It is the **literal physical shadow of the cosmology** (Good = serves
> experience; Evil = the hollowing). Two independent item consumers converged on
> it from opposite ends, which is why it's worth a slate rather than a footnote.

See also:
[story-bible.md](../../story-bible.md) §Evil — the hollowing / §Alignment
(**the canon**: Good = presence/recognition; Evil = *"the erasure of the line
between person and thing,"* capture, the Feed, *"a world that runs perfectly and
contains no one"*) · the build-1 `alignment-slate.md` (the moral-gravity axis —
**kept distinct**: alignment is *derived, non-mechanical, undetectable*; this is
the *physical, perceivable* layer) · [magic-items-slate](../tails/magic-items-slate.md)
(where this surfaced — sanctity/holy water + ESP) ·
[vitals.md](../../subsystems/vitals.md) (`getConsciousness` — *adjacent but
distinct*, below) · [belief.md](../../subsystems/belief.md) (the *person↔thing
line*; recognition) · [senses.md](../../subsystems/senses.md) /
[perception.md](../../subsystems/perception.md) (`VerbalESPModality` /
`EmotiveESPModality` — the perception consumer).

---

## The thing to model

A per-agent axis: **present** (an experiencer is home) ↔ **hollow** (animate, but
no one is home — the optimizer's soulless vessel, the hollow-passing-as-alive).
Three hard constraints, straight from the canon:

- **Keys on is-anyone-home, NOT substrate.** Synths / clones / androids are
  *present* — mundane living people. *"'Constructs are evil' is reskinned
  bigotry."* The axis is presence, never material.
- **NOT moral valence.** A *captured person* still has an experience → present.
  Evil-as-principle (capture) is **undetectable by design** and lives on the
  separate, non-mechanical alignment axis. This substrate is only the **physical
  residue**, not the morality.
- **Only the *manifest* hollow is legible.** The masterwork forgery whose
  hollowness is precisely undetectable stays undetectable — *"you can't tell,
  including about yourself."* This substrate must bite the crude hollow (legibly
  empty) and stay **silent on the deep forgery**, or it guts the discernment
  thesis alignment is built around.

## Why it exists — two consumers from opposite ends

The build-signal is that two unrelated item features both need it:

- **Sanctity / holy water *reacts* to the hollow** — a consecrated instrument of
  presence disrupts the animate-but-no-one (a nature-conditional effect reading
  this state). See [magic-items-slate](../tails/magic-items-slate.md) §Sanctity.
- **ESP *fails to perceive* the hollow** — `VerbalESP`/`EmotiveESP` sense
  mind-activity = they sense *presence*; a hollow emits nothing, so it reads as
  **absence**. One reacts to it, the other can't see it — both key on the same
  axis.

## The architectural seam

The latent seam already exists as a **compile-time class composition**:
**`Agent` (experiencer / agency) ⊥ `Creature` (body)**, fused into `Character`.
The hollow is *a Creature whose agency is absent/empty*; presence is *agency
home*. Today that split is class structure, not a runtime state — which is the
gap. Two shapes to weigh:

- **(a) A runtime state on the agent** — a `presence` flag/degree (a `Condition`,
  or a mixin field). Cheap; enough for the two known consumers; the manifest
  hollow is a marker. **Likely v1.**
- **(b) Reify the inhabitant↔vessel relation** — a person *inhabits* a body as a
  runtime relation (not a fused class). Big, but it would *also* unlock
  **possession, polymorph-as-vessel-swap, death-as-departure, astral/remote
  presence** — several deferred features point here. The contrast noted in the
  magic-items walk: **polymorph is easy *because* body is fused to identity; this
  substrate is hard for the same reason.** Reification is the expensive,
  high-leverage version.

## Distinct from consciousness (important)

Not `getConsciousness`. An unconscious person is **present-but-asleep** (someone
is home, the lights are off); a hollow is **awake-but-no-one** (the lights are on,
nobody home). Vitals' consciousness is a *state of the present*; hollowness is
*the absence of a someone to have states*. Adjacent, orthogonal.

## Relationship to alignment (kept clean)

This is the **physical/perceivable** layer; alignment (moral gravity) is the
**derived/moral/non-mechanical** layer. Same relation as BUC↔sanctity: orthogonal
engine axes, coupled only through lore/content. Alignment stays a private mirror
on persons; presence-hollowing is a world-legible property of bodies. A player is
**always present** (Good floor) → never hollow → this is an **NPC/content
property**, which also makes any reactive item (holy water) safe by construction.

## Open questions

- **Binary or degree?** Fully hollow vs. partially-hollowed (mid-capture)?
- **Is presence *drainable*?** Mara *"hollows the present"* — unholy water /
  the Feed as a **present→hollow transition** (a condition that erodes
  recognizability). If so, the transition is itself a consumer.
- **Who perceives it?** ESP + the attuned/priest reader dial + the sacred
  instruments — the same in-between-reader question alignment already has.
- **State vs. reified relation** — (a) vs (b) above; the whole scope pivots here.

## Deferred

- The **reified inhabitant↔vessel** model (possession / vessel-swap / departure).
- **Partial/graded** hollowing and the present→hollow *transition* dynamics.
- Any **combat/necromancy** content that produces hollows at scale (a hollow
  bestiary) — waits on combat + a spawn source.
