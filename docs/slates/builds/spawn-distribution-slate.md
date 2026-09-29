# Spawn-distribution slate (working doc) — the dynamic populate substrate

> **Status: PARTIAL** — the item half shipped as the residency **spawn
> sweep**: `SpatialZone.stocks` / `favours` / `blessingOdds`,
> template-derived candidates, draw-until-decline per region, on a
> recurring game-time cadence (not a one-shot boot fill) →
> [residency.md](../../subsystems/residency.md)
> **Left:** the creature half — a procgen-NPC generator over the NameBank
> / species dossier / `PersonaMixin` · create-monster · creature respawn
> economics · a true weighted-rarity draw with depth/biome/tag
> eligibility (shipped item half is region-scoped counts, not this) ·
> reproducible/seeded spawns · an authoring surface for the tables ·
> global-table balance across many local biases · the hollow-bestiary /
> world-fauna content waiting on this + combat
> **Size:** a build

See also:
⭐ **[discovery-slate](./discovery-slate.md) (2026-08-02) — the DESIGN layer
above this mechanism**: what the weights are actually based on, who may
tune what, and how far the substrate extends (foraging · consumables ·
creature spawn · ore as the zero-inflow case) ·
[magic-items-slate](../tails/magic-items-slate.md) (the two consumers: BUC blessing
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

## Two output kinds, one substrate

(The item half's design — opt-in participation, a location drawing from a
distribution, bias-and-renormalize — shipped as the residency spawn sweep,
in a plainer shape than sketched here: region-scoped `stocks`/`favours`
counts and overlays, not per-item rarity weights with depth/biome/tag
eligibility. See [residency.md § Zone fields the spawn sweep
reads](../../subsystems/residency.md#zone-fields-the-spawn-sweep-reads)
and [§ The sweep is a faucet](../../subsystems/residency.md). The BUC
blessing-sampling half shipped too — `rollBlessing` at mint time inside
the sweep, never in `StuffApi.clone` — see
[magic-items.md § The census](../../subsystems/magic-items.md).)

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

> ⚠ *Vocabulary is stale: `populates:` is retired — the static form is the
> `props:` / `cast:` designation (`StagedMixin`'s two once-flags,
> `templates.md` § the appliers). The item half of the dynamic form shipped as
> the recurring spawn sweep (`residency.md § The sweep is a faucet`); the
> creature half (on-demand spawn, a wandering-population tick) has not.
> ⭐ Since 2026-09-25 a `props:` entry also carries `count: N` (N
> identical clones from one line) and an `as:` key (an entry identity,
> so a child row can substitute one fixture in place instead of gaining
> a second). `count:` is props-ONLY — it throws on `cast:` and on a
> costume, because N of a person is not a thing this vocabulary should
> be able to say. A creature draw that wants multiples asks for them at
> draw time, not by inheriting `count`.*

## Consumers

BUC item-spawn · create-monster · generic-location population · loot/treasure
tables · encounter tables · world fauna & populace · (later) wandering-monster
ticks. Broad enough that this is world-infrastructure, not a magic-items detail —
which is why it's spun out.

## Open questions

- **Tuning** — the "how common / how potent at each depth" the BUC walk bracketed
  as *"a different problem."* This is that problem: the depth/biome curves, the
  BUC-by-depth distribution, the rarity bands.
- **Determinism / seeding** — reproducible spawns (per-locality seed, like the
  weather field) vs. fresh RNG each draw?
- **Authoring surface** — who tunes the tables (CMS?), and how the
  bias-and-renormalize overlay is authored per-location.
- **Global-table balance** — keeping the renormalized overlays coherent as many
  locations each push local biases.

## Deferred

- The full **tuning/balancing pass** (curves, bands, depth-scaling).
- **Creature respawn economics** (faucet/sink interaction with the
  conserved economy) — the item half's is shipped and documented (see
  above); the creature half is untouched.
- A **hollow bestiary** or any large creature-population content (waits on combat
  + the [presence-hollowing](./presence-hollowing-slate.md) substrate for what
  the spawned things *are*).
