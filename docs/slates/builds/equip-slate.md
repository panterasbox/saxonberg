# Equip slate — one verb for getting kitted out, and dressing costs time

**Captured 2026-09-04**, out of the textiles build's covering work. It
started as an interface complaint and turned into a question about who
holds the engine's knowledge:

> **User: "I don't love the wear interface. I kinda want an 'equip' or
> 'outfit' verb or something similarly named that maybe takes options or
> subcommands and does both wearables and wieldables all in one go. what
> do you think of that? what would it look like? we still probably want
> like saved outfits? not sure if that's actually necessary unless we're
> equipping directly from storage, the reason being is I dont expect most
> players to carry more than one set of armor since its so heavy, so
> there probably wouldn't be much ambiguity there in actuality"**

One decision was taken in the same conversation and is recorded below as
settled rather than open:

> **User: "yeah dressing should cost time"**

> **Status: BUILT, on `design/textiles` (MR !236).** The one open fork
> — alias vs orchestrator — was settled against this slate's own
> recommendation; see *"The old words stay their own verbs"* below.

Related: [slot.md](../../subsystems/slot.md) (**the shipped substrate —
read it first**: `Slotted`/`Slottable`, `accepts`, capacity),
[embodiment.md](../../subsystems/embodiment.md) (`Wearable`/`Wieldable`,
per-body-plan `slotClaims`, multi-slot atomicity),
[textiles.md](../../subsystems/textiles.md) (**the covering ladder this
slate exists to hide** — `wornStack()`, `depthOf`, `wouldLayerViolate`,
derived `clo`, the fit stamp),
[activity.md](../../subsystems/activity.md) (engagements, the four slots,
the `AbortReason` vocabulary),
[combat.md](../../subsystems/combat.md) (the hand-slot economy and
`fight draw`), [encumbrance.md](../../subsystems/encumbrance.md) (why
nobody carries two sets of mail),
[command-spec.md](../../subsystems/command-spec.md) (`subcommands:` +
`fallthrough:`), [furnishing.md](../../subsystems/furnishing.md) (the
wardrobe is shipped furniture).

---

# ⭐⭐ The finding: the ladder is engine knowledge the player reproduces by hand

The shipped `wear` help says it plainly:

> *"You can layer — a coat over a shirt is fine, and which of them goes
> on first is your call — but a light thing will not go on OVER a heavy
> one."*

That sentence describes the covering ladder — `depthOf`, the layer
bands, `wouldLayerViolate` — which the engine knows exactly and the
**player has to rediscover one refusal at a time.** Shirt, gambeson,
hauberk, surcoat is not a preference; it is a fact about the model, and
the interface currently makes getting it wrong the player's problem.

⭐ **That, and not keystroke count, is the argument for the verb.** An
`equip` that sorts inside-out is not sugar over four commands; it is the
verb that owns an ordering problem presently dumped on the person least
equipped to solve it. `unequip` peels the other way, outermost-first,
for the same reason.

Everything else in this slate is downstream of that.

# What ships today

| verb | scope | notes |
|---|---|---|
| `wear <thing>` | `inventory` | `requires: WearableMixin`; fit + ladder refusals |
| `wear set <name>` / `--save` / `wear sets` | `inventory` | the wardrobe stanza (textiles A7) |
| `wield <thing>` | `inventory` | `requires: WieldableMixin`; also `requiresConscious` |
| `remove` / `doff` | `inventory` | |
| `unwield` | `inventory` | |

Four verbs for one intention, and **`scope: inventory` with
`mustBeInInventory` throughout** — which is the constraint that quietly
makes the saved-set feature feel pointless (below).

# The shape

```
equip                          everything you carry, inside-out
equip <thing>                  one thing into its slot — worn or wielded, whichever it is
equip <thing> from <where>     reach into a container you can see
equip set <name>               a saved set, innermost first
equip set <name> --save        remember what you have on right now
equip set <name> from wardrobe
equip sets                     list them
unequip [<thing>]              outermost-first; bare = strip
```

Structurally this is `subcommands: {set, sets}` + `fallthrough: true` —
**the shape `wear` already has** — so most of it is a rename plus two
behaviours: **bare `equip`**, and **`from`**.

## ⭐⭐ The old words stay their own verbs — SETTLED, against the first recommendation

This slate originally recommended aliasing: `wear` · `wield` · `remove`
· `doff` · `unwield` folding into `equip` / `unequip`, on the `examine`
→ `look` precedent, with the target arg widening to the alternation
`WearableMixin|WieldableMixin`. **It was built that way and then
reversed**, on the user's call:

> **User: "keep the verbs distinct"**

⭐ **The cost the slate had flagged as acceptable turned out to be the
decisive one.** *"`wear sword` becomes legal"* is not a wording problem:
an arg that admits both mixins **cannot refuse either**, so a refusal
that today is the ARG's — a grammar error, raised before any controller
runs — either becomes a hand-rolled rule inside the controller or
becomes nothing at all. The alternation deletes a check rather than
relocating it.

**What ships: six views, two controllers.** `equip` / `unequip` are
orchestrators; the four precise verbs keep their own narrow `requires:`
and their own `required: true` target. All six point at
`EquipController` / `UnequipController`, because **what differs between
the words is the GRAMMAR and not the act** — the fit gate, the covering
ladder, the slot claim and the timing are one implementation, and
duplicating a controller per verb duplicates all of it.

⭐ A consequence worth naming: **the invoked verb becomes real input.**
A gauntlet is wearable and wieldable both, and only the word the player
typed says which they meant. `wear gauntlet` puts it on, `wield
gauntlet` takes it up, bare `equip` prefers the worn reading, and the
fit/ladder gates apply to the worn reading alone.

# ⭐ Naming: `equip`, not `outfit`

**`outfit` is taken, and taken as a noun this world leans on.** A
producer business IS an outfit — `/trade/farming/idea/farm-outfit`,
`/trade/distilling/idea/crowsfoot-outfit`, `pantry-outfit`,
`bottling-outfit`. A verb by that name would collide with an established
piece of vocabulary in the same breath as clothing, which already has
`livery` for the employer-provided sense. `equip` is unambiguous and
carries no other freight.

# ⭐⭐ Dressing costs time — settled, and what it drags in

An engagement, not an instant act. The consequences are most of the
interesting design here.

**What it claims.** `hands`, the slot `ManualBuildController` already
takes for craft acts. Dressing leaves your voice free (you can talk
while you are pulling a hauberk on) and that matters for the same reason
spinning does.

**Where the duration comes from.** DERIVED, not authored per garment —
the build's own doctrine, the way `clo` is derived rather than authored.
Mass and construction give it: a linen shirt is seconds, a mail hauberk
is minutes, and the number falls out of what the thing IS. A settings
dial scales the whole ladder rather than a `donSeconds` on every row.

**⭐⭐ You cannot armour up in an ambush.** That is the payoff and it is
worth naming as the point rather than a side effect. The whole
consent/poise shape of combat assumes you arrived as you are, and this
is what makes arriving-as-you-are a decision.

**⭐ Half-dressed is already a coherent state.** An engagement that
aborts mid-`equip` leaves the covering stack with fewer layers on it —
which the model handles today with no new state at all, because the
stack is just a stack. Interruption is free. That is a strong signal the
shape is right.

**⚠ It changes existing behaviour.** `wear <thing>` is instant today and
would stop being. That is a real migration note for anything that
assumes a single `wear` completes synchronously — the wardrobe stanza,
`equip` itself when it chains, and any NPC beat that dresses. The
`weaves` brain's lesson applies verbatim: **craft acts are engagements,
so a beat does one per beat**, and a dressing NPC will need the same
discipline.

**Removal costs time too**, and that is where it bites hardest: heavy
armour in deep water, or a burning building. Worth checking against
[mortality.md](../../subsystems/mortality.md) before it ships, not
after.

# Saved sets: right about armour, wrong about clothes

The user's reasoning holds exactly as far as it goes — armour is heavy,
[encumbrance](../../subsystems/encumbrance.md) means nobody carries two
sets, so there is no ambiguity for a set to resolve.

**But sets were never for disambiguation. They are for recall from
storage**, and two things move the conclusion:

1. **Clothes are not armour.** They are light, a player will own
   several, and the impression/conspicuity layer (textiles A9) is
   entirely about what you are wearing socially. Variety pressure lives
   there, not in the armour slot.
2. **They live in a wardrobe** — shipped furniture, on the general
   store's list at 34. And `wear` is `scope: inventory` +
   `mustBeInInventory`, so **you cannot equip from storage at all**
   today. Six `get`s before you can dress is precisely what makes the
   saved set feel like machinery for nothing.

⭐ **So `from <container>` is the only genuinely new capability in this
slate, and it is the one that makes sets earn their keep.** The sets
themselves already exist; keeping them costs one subcommand line.

**Recommendation: keep them, demote them.** Bare `equip` is the main
path; sets become the wardrobe convenience they were always for.

# The skip report

Bare `equip` will always skip something — a garment cut for another
body, a full slot, a second two-hander. **Silently omitting it is worse
than any refusal**, so the act emits two things: what went on, and what
did not and why.

One scene, not N. A player dressing in six pieces must not spam the room
with six lines, and the response envelope is where the per-item detail
belongs. *(Called this way in the absence of a preference; it is cheap
to flip.)*

# Open questions

- **Resume or restart?** An `equip` interrupted after three of six
  layers — does the next one pick up, or start over? Picking up is
  kinder; starting over makes interruption cost something. Leaning
  pick-up, because the stack already records where it got to.
- **A hasty option.** `--fast` for less time and a penalty (a strap
  missed, a band's worth of protection lost) is tempting and probably
  not v1.
- **Does armour want a second pair of hands?** Historically it did.
  `equip` naming a helper is a good social beat and an obvious later
  wave, not this one.
- **Does `equip` reach a worn container?** Pulling a spare knife from
  your own belt pouch is a different scope question from reaching into
  the wardrobe across the room.
- **`unequip` bare = strip.** Convenient and a griefing shape if it is
  ever forceable by anything but the wearer. It must not be.

# What this deliberately does NOT ship

- **No new slot vocabulary.** `body` / `hands` / `attention` / `voice`
  is closed and this needs nothing from it.
- **No change to the ladder itself.** `equip` READS `depthOf` and sorts;
  it does not get a vote on what layers over what.
- **No auto-buying, no auto-repair, no loadout templates from a shop.**
  A set is a thing you saved, never a thing the world suggests.
