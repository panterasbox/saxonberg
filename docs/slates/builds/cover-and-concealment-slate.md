# Cover & concealment slate — where you hide, what protects you, and how a searcher looks

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of the privacy
> conversation's **hiding** quadrant ([privacy-slate](./privacy-slate.md) § 6). Today `hide`
> gives a concealment band from cover × darkness × stillness, minus what you wear
> ([stealth.md](../../subsystems/stealth.md)), and `search` is broad-shallow over the room or
> narrow-deep on a container ([concealment.md](../../subsystems/concealment.md)) — but **the
> cover is the room as a whole: there is no *where***, so a searcher has nowhere to choose.
> [ranged.md](../../subsystems/ranged.md)'s roadmap lists *W2 — authored cover (directional,
> destructible, capacity-leased) · overturnable furnishings*.
> **Left:** the cover protocol answered by an object's mixins · details' light cover facet ·
> the channel split — concealment (perceptual) and protection (delivery) · search techniques
> per mixin · NPC search policy · hiding things and making hiding places · ranged cover,
> derived
> **Size:** a build

## 0. The problem **[DECIDED — the owner]**

*"Hiding needs things to hide behind or inside … if you put a barrel in a room and it's the
only thing there someone's gonna look in it because it's the only obvious hiding place."* And
then: *"if only details can be used for hiding then searching is just spamming search across
all the keywords in the room … the barrel has physics and all sorts of capabilities so hiding
in a barrel can be a specific experience … probably hiding needs to be very aware of the mixin
architecture."* And: *"ranged combat and cover — it's not hiding exactly but it probably wants
to use the same mechanics."*

## 1. ⭐⭐⭐ A hiding place is a protocol, answered by an object's mixins **[DECIDED]**

The Thing card's pattern (*each mixin with something perceivable contributes a section*,
[card-sizes-slate](./card-sizes-slate.md)) and the [machines slate](./machines-slate.md)'s
roles: any object answers the cover protocol **by what it is composed of**, each mixin
contributing its term.

| mixin | its term |
|---|---|
| **Container / Vessel** | ⭐ **fit** — interior volume against your body (the [size slate](./size-slate.md)'s envelope), and **the opening** you must pass |
| **contents** (bulk, loose goods) | a full wine barrel cannot hold you; a half-full rain barrel puts you **in water** ([underwater](./underwater-slate.md)'s water-as-state); ⭐ a hay cart's contents are cover — you hide *among* them |
| **Sealable** | lid shut: hidden from sight, ⭐ muffled for sound, cut off from smell (the dog); ⚠ **airtight means no air** — a sealed cask suffocates you ([respiration](../../subsystems/respiration.md)) |
| **material** — light and sound | ⭐ light passes by Beer–Lambert (ships): glass hides nothing, and **a thin curtain shows your silhouette to a lamp held behind it**; thick wood muffles, thin cloth does not |
| **Slotted / Postured** | *under* the bed needs clearance — you lie flat (the size slate's posture envelope) |
| ⭐ **Haulable / conveyance** | **a moving cart or barrel carries you** — the stowaway smuggled through the gate in a barrel, a real escape; the conveyance ripple moves what is inside |
| **thermal** | the icehouse hides you and chills you |
| **fire** | hay hides you, and burns |

- **Details keep a light cover facet** — for prose-only features (the rafters, the shadows),
  an authored placement (`behind`, `under`, `among`, `in` — the
  [placement](../../subsystems/spatial.md) vocabulary is row-extensible), a size it admits,
  the senses it blocks, a check cost.
- **Real objects derive** — a barrel, a wardrobe and a hay cart each feel different with no
  special case.
- **Crowds are cover** — hiding among people, numbers as concealment.
- **Your band** at a spot = the spot's cover × your stealth × darkness × stillness × what you
  wear; ⭐ **noise masks** (the privacy slate) — breathing is unheard in a loud tavern, obvious
  in a silent chapel.

## 2. ⭐⭐⭐ Concealment and cover — one query, different channels **[DECIDED — lens 1]**

A distinction soldiers are taught: **concealment hides you; cover protects you.** A curtain
conceals and does not protect; a stone wall does both; glass protects a little and conceals
nothing. So **one protocol answers per channel**, for a body positioned at a host (behind,
in, under):

- **perceptual channels** — sight, sound, smell — are **concealment**, which hiding reads;
- **delivery channels** — point, blunt, heat, through
  [materials-response](../../subsystems/materials-response.md)'s shipped attenuation — are
  **protection**, which ranged cover reads.

### Ranged cover, derived

[ranged.md](../../subsystems/ranged.md)'s W2 becomes derived, not authored:

- **directional** — you are behind the cart *relative to* the archer;
- **destructible** — the cover's material takes the wear ([assembly](../../subsystems/assembly.md),
  durable);
- **capacity** — how many bodies fit behind it (the size slate);
- **overturnable** — a table on its side is a posture change of the furnishing.

Authoring shrinks to the details; every real object is cover by what it is made of.

## 3. ⭐⭐ Search techniques, per mixin **[DECIDED]**

Because hiding comes from mixins, **so does the search** — each mixin offers techniques that
cost time and reveal through a sense:

| technique | mixin | reveals by | beaten by |
|---|---|---|---|
| **open it** | Sealable | sight | nothing, if you can open it |
| ⭐ **knock on it** | contents, mass | sound — full, empty and *a person* sound different | — |
| ⭐ **backlight it** | material, light | sight — the silhouette | thick material |
| **prod the hay** | contents | touch — and it hurts ([harm](../../subsystems/harm.md)) | — |
| **let the dog sniff** | — | smell | the sealed lid |
| **look under** | clearance | sight | darkness |

**The searcher chooses the spot and the technique**, against time; **the hider chooses the
spot**, knowing which techniques beat it — the decision space the barrel alone never had.
`search` with no target stays the shallow sweep; `search <thing>` takes a technique.

## 4. ⭐⭐ NPC searchers — a policy, never a roll **[DECIDED]**

A guard's search follows a **policy** in its brain ([behavior.md](../../subsystems/behavior.md)):
which spots first (those that fit a person, nearest first, ordered by a **seeded habit**),
which techniques, and how many before giving up (its time and diligence). Deterministic, so
⭐ **players can learn a guard's habits** — *"the night watchman never checks the rafters"* — a
discoverable pattern, the knowledge stealth play runs on.

## 5. ⭐⭐ Hiding things, and making hiding places **[DECIDED]**

- The same protocol hides **objects** — the loose floorboard, the hollow book, the brick that
  comes out of the chimney.
- ⭐ **Players make hiding places** — pry up a floorboard (a carpentry act) and the room gains a
  spot **only you know** until someone searches it; **the priest hole** built into a house
  ([construction](./construction-slate.md)). Lens 2's bespoke case with no code, and the
  [concealment-detection slate](../tails/concealment-detection-slate.md)'s *"player-placed
  concealment beyond pick-up-your-own"*.
- **The false-bottomed trunk** — a carpenter's product with a hidden compartment (assembly's
  `Chamber`).

## 6. The lens pass

1. **Pedagogy** — fit by size; which senses each material blocks; concealment vs cover; the
   knock and the silhouette.
2. **Expression** — the room's prose and furniture become its play; players make secret
   places.
3. **Immersion** — holding your breath behind the curtain; the knock on your barrel.
   **Participation** — the smuggler, the searcher, the patient guard; learned habits; the
   stowaway.
4. **Values** — the priest hole's history (hiding from persecution) against the smuggler's
   cache.
5. **Continuity** — the same spots against a lantern, a dog, then thermal sight and
   X-rays.
6. **Economy** — the false-bottomed trunk, the hidden compartment as a trade.
7. **Governance** — the warrant to search ([privacy](./privacy-slate.md) § 7); what counts as
   found (A15).

## 7. Open

1. **The protocol's shape** — one method per mixin feeding a channel vector, and how the
   terms combine.
2. **Placement words** — `behind`, `under`, `among` as Placement rows.
3. **Search techniques as verbs** — `search <thing> by knocking`, or acts of their own.
4. **The guard's policy** — the brain's spec and its seeded habit.
5. **Ranged W2** — directional cover against the band ladder.
