# Spawn-distribution slate (working doc) — the dynamic populate substrate

> **Status (2026-07): named, not designed — spun out of the magic-items walk.**
> A **weighted-table populate substrate**: the *dynamic/runtime sibling* of the
> static `populates: onto` seeding. Generic locations (and effects) draw **what
> spawns** — items **and** creatures — from a tunable distribution, with per-item
> opt-in weights and a per-location *bias-and-renormalize* overlay. Emerged from
> two consumers (BUC-state-at-spawn + create-monster) and generalizes far past
> both — it's the world-population substrate.

See also:
[magic-items-slate](./magic-items-slate.md) (the two consumers: BUC blessing
sampled at spawn; create-monster = a player-triggered spawn) ·
[content-packs.md](../../subsystems/content-packs.md) (content-as-data; the
`populates: onto` static seeding this is the dynamic sibling of) ·
[location.md](../../subsystems/location.md) (the Warren / generic locations that
populate) · [race.md](../../subsystems/race.md) /
[char-gen.md](../../subsystems/char-gen.md) (species + `NameBank` + `PersonaMixin`
+ `Login.mintRandomGuestAvatar` — the procgen-NPC mint this reuses) ·
[npc-behavior.md](../../subsystems/behavior.md) (spawned creatures get brains) ·
the "NPCs are expensive carves" + procgen⊕bespoke split (the populace is procgen;
the named cast is **outside** the table).

---

## The model — three parts

From the BUC-economy discussion, the substrate is a weighted distribution over
spawnables with three moving pieces:

- **Entity side** — **opt-in participation**: a template declares it participates
  in generic spawning, with a **rarity weight** + **eligibility** (depth / biome /
  tags). Opt-out is the default-off; an entity can also say *"spawn me here,
  balanced against the rest."*
- **Location side** — a generic location **draws from the global distribution**,
  or **opts out** entirely.
- **The clever bit — bias-and-renormalize.** A location expresses a **local bias**
  (boost a subset, or **pin** "one of these must appear") and the system **folds
  it into the global table and renormalizes** — a **weighted overlay, not a hard
  override** that would lose global coherence. (Think prior + local evidence, not
  replacement.)

## Two output kinds, one substrate

- **Items (loot).** The BUC consumer: an item is selected, then its **blessing is
  sampled** from a (tunable, maybe depth-varying) distribution — one more drawn
  axis on the roll. Generalizes to loot/treasure tables.
- **Creatures (procgen NPCs).** The create-monster consumer. Spawning a creature
  needs a **procgen-NPC generator** — compose species + traits + name + behavior +
  appearance from the distribution, **reusing char-gen's `NameBank` /
  species-dossier / `PersonaMixin` and the `Login.mintRandomGuestAvatar`
  precedent** (a randomized character mint already ships; what's missing is a
  *general reusable generator* driving that machinery programmatically). This
  generator is a **component of this slate** (the creature-output half), not a
  separate build.

**The bespoke named cast is explicitly OUTSIDE the table** — the procgen⊕bespoke
split. The carve-principle guards the meaningful few; this substrate produces the
populace.

## Static sibling — and what's new

`populates: onto` (the seeding instruction) is the **static, insert-once** form.
This is the **dynamic** form: runtime populate, respawn, on-demand spawn (a scroll
of create-monster, a re-stocked room, a wandering-population tick). Shares the
"what belongs here" question; adds tuning, respawn, and a runtime draw.

## Consumers

BUC item-spawn · create-monster · generic-location population · loot/treasure
tables · encounter tables · world fauna & populace · (later) wandering-monster
ticks. Broad enough that this is world-infrastructure, not a magic-items detail —
which is why it's spun out.

## Open questions

- **Tuning** — the "how common / how potent at each depth" the BUC walk bracketed
  as *"a different problem."* This is that problem: the depth/biome curves, the
  BUC-by-depth distribution, the rarity bands.
- **Respawn vs one-shot** — does a populated location re-fill? On what clock?
  (Economy implications — respawned loot is a faucet.)
- **Determinism / seeding** — reproducible spawns (per-locality seed, like the
  weather field) vs. fresh RNG each draw?
- **Authoring surface** — who tunes the tables (CMS?), and how the
  bias-and-renormalize overlay is authored per-location.
- **Global-table balance** — keeping the renormalized overlays coherent as many
  locations each push local biases.

## Deferred

- The full **tuning/balancing pass** (curves, bands, depth-scaling).
- **Respawn economics** (faucet/sink interaction with the conserved economy).
- **Determinism/seeding** model.
- A **hollow bestiary** or any large creature-population content (waits on combat
  + the [presence-hollowing](./presence-hollowing-slate.md) substrate for what
  the spawned things *are*).
