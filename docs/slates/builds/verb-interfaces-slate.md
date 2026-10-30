# Verb interfaces — no single-use verbs

> **Status: UNBUILT · opened 2026-10-18 (user, during the cleanliness MR review !380).**
> **Left:** `boil` folded into heating (immersion takes the liquid's heat) ·
> `scrub` as a manner of `wash` · `strew`'s wider uses · an audit of every
> verb for single-target narrowness · ⭐ the protocol-mixin cost (earned by
> a shared verb, presented as the verb it serves) and the three
> single-host ceramics protocols · the `requires: affords` edges.
> **Size:** a build.

## The note (user, 2026-10-18)

> *"beatcontroller is cool but is it ever going to take any target that's
> not a rug? that seems like a very very narrowly applied verb. … I do
> think 'boil' is kind of weird even though you didn't make it. Boiling
> just means heating water to 100 degrees, that's super narrow too — what
> else would you possibly boil, unless submerging something in boiling
> water is what the verb is for, but then that's a terrible verb to use."*

The rule it applies is the verb-collision ladder's first rung — **unify
behind an interface**: a verb is an ACT that many things answer, and a verb
with one possible target is a property of that target wearing a verb's
clothes.

## Done in the cleanliness MR (B46)

`beat` → **`brush`** (`beat` kept as its alias): the loose dirt out of ANY
Soilable thing, dry — a coat, a hat, a cushion, a rug beaten. The act is
`Soilable.brushOff(effort)`, each dirt kind giving up its row's
`brushLifts`. ⭐ It completes the three acts by the dirt's own nature: BRUSH
what is loose (crumbs, ash, flour, dried mud), WASH a film (grease, sweat),
BLEACH a set stain. Conferred by the `SweepingTool` rows (a clothes brush,
a carpet beater — `capability: brushing` — and a broom, worse); a floor is
swept, not brushed.

## `boil` — a temperature, not an act

Shipped by the water build (`5a8bf4a27`) as *hold a vessel at a rolling
boil* — purifying water, a build step a recipe can require — and extended
by cleanliness (`boil <cloth> in <pot>`, five minutes at a boil disinfects).

What boiling IS: water heated to its boiling point. What disinfects a
bandage is not a verb but **time in water at 100 °C**. The derivable model:

- **Immersion takes the liquid's heat.** Anything sitting in a vessel's
  liquid is held at that liquid's temperature for as long as it is in it —
  the wet-heat stamp (`Soilable.holdAtHeat(K, s, {wet: true})`) and the
  kill law — applied by the vessel's own thermal reconcile, not by a verb.
- So the bandage is `put … in pot`, the pot set on the fire (or `heat pot`),
  time passes, `get bandage`: disinfected, because it sat in boiling water.
  A copper boil-wash, a dye bath, a pot of stew with a bone in it — the same
  rule.
- `boil` survives only as `heat <vessel>` until its liquid boils (an alias
  with a target temperature), which keeps the water build's *boil the
  water* purification and its recipe-step meaning; the `boil … in pot` arm
  retires.
- ⚠ A change to the thermal/bulk reconcile (the vessel stamps what it
  holds), and the purification half is the water pack's — hence a build,
  not a review fix.

## The audit — candidates

| verb | the narrowness | the interface it belongs to |
|---|---|---|
| `scrub` | `wash` done hard (effort 3) | a manner of `wash` (`wash floor hard`) or an alias that sets the effort |
| `strew` | only floor litter | scattering a loose material over a surface: grit or salt on an icy path, sand on a spill, broadcast seed |
| `dispose` | refuse onto a midden | dumping — fine as the act it is; check it is not a `put` |
| every verb | — | the census: views whose `requires:` (or controller narrowing) admits one class or one row |

## ⭐ Bare verb shapes become protocol mixins (the underwater review, 2026-10-20)

The rule is in [mixins.md § A verb's protocol is a PROTOCOL MIXIN](../../subsystems/mixins.md):
what a verb narrows its target on is a protocol mixin (a name, a refusing
default, each host overriding), never a bare interface, so the binder can
`requires:` it, `MixinApi.isX` exists, and Studio shows it. The underwater
build converted its own (`Pullable`, `Tossable`, `TakesFish`).

**Left — the shipped bare shapes:** `Workable` / `Diggable` / `Splittable`
(the ground protocol), `Pumpable` (bellows, well, wellhead), `Tappable`
(the taps), `Cuttable`; `Reelable` goes with the reel undo
(command-taxonomy item 7). **Census then ratchet:** ~18 controllers
narrow a target by `typeof x.method === 'function'` today — count them,
hold the ceiling, drive it to zero, and let the views name the mixins in
`requires:` (each one moves an `any` off `lint:arg-kinds`).

## ⭐⭐ The cuts sweep — every cut through one protocol (the ceramics review, 2026-10-28)

The ceramics MR made its own act protocols consistent (one `ActPlan` /
`ActRefusal` / `ActOutcome`, one registered marker mixin per protocol —
`KneadVesselMixin`, `ShapeableMixin`, `CarvableMixin`, `ImpressibleMixin`,
`TurnableMixin`, `HandWorkedMixin`, `DipBathMixin`, `StrikingDieMixin`,
`FormingMixin` — a uniform null contract, `<act>PlanFor(req)`). Its survey
found the same act — cutting a thing into pieces — done by seven shipped
trades, each its own controller keyed to its own classes, none through
`Cuttable` / `CutPlanner` (the one that does is tailoring's shears):

| verb | where | how it decides today |
|---|---|---|
| `saw` | trade-carpentry `SawController` | `instanceof Bole / Billet / Sawmill` |
| `rive` | trade-forestry `RiveController` | `instanceof`; the billet arm is recipe-matched |
| `fell` (cross-cutting a bole) | trade-forestry `FellController` | the controller |
| `butcher` | trade-cooking `ButcherController` | `Species.dressOut` |
| `shear` | trade-ranching `ShearController` | the controller |
| `scribe` / `snap` / `groze` | trade-glass cold work | `instanceof Sheet` |
| `mark` / `scrape` (the ice grid) | trade-ice | the controller, ahead of `IceSheet`'s `Cuttable` |

**The build:** `Cuttable` becomes a registered protocol mixin (the target
plans a cut — a bole, a billet, a carcass, a fleece, a pane, an ice field)
and `CutPlanner` one too (the tool plans — a saw, a froe, a knife, shears,
a scribing wheel); each controller above becomes input and output only
([controllers-are-io](./controllers-are-io-slate.md)). Whether `saw` /
`rive` / `butcher` / `shear` / `scribe` stay separate verbs over the one
protocol or fold into `cut` with aliases is the collision ladder's call per
verb — the act is one; the WORDS are what players say. ⚠ The ground's
`Workable` (`split`, `dig` — `planWork` / `completeWork`) is the protocol
`Cuttable` cites as its model and is the other half of the same question:
one plan-then-complete shape, or two.

**Also left from that survey, smaller:** `carve`'s recipe path (wood parts
by recipe beside the planned carvings — the combining re-plan's naming
question, ceramics R1); glass `reheat`/`crack` and sugar `temper`/`clay`
are pack-internal `instanceof` and need nothing.

## ⭐⭐⭐ What a protocol mixin costs, and where the contract lives (the ceramics review, 2026-10-29)

The ceramics MR shipped nine new stateless mixins, eight of them protocol
mixins, and the owner asked why the project was diverging when it should
converge. *"Our entire client design and CMS and all that is based on
players understanding the mixin architecture and have a basic vocabulary
about what mixins do what and where. This is both a reason to use them and
maybe a reason to hold back given it's a single namespace. Anything that
has state needs to be a mixin … but these things that have no state and
provide no new methods on the composer, we have to ask what we're getting
out of this stuff."*

### What a mixin's NAME buys today

Almost every surface keys on `_mixinName` and registry membership, not on
state:
- the binder's `requires:` (183 slots) and its per-mixin refusal sentence;
- the inspection card's chip row (*a teaching surface*) and the radial's
  mixin count;
- Studio's palette, its search "by name or mixin", and blueprint
  signatures;
- a `mixin.<Concept>` help topic with `confers` edges;
- wiki `subject: {kind: mixin}`, MQL `[mixin.X]` and brain `requires.mixins`;
- pack federation, and `lint:mixin-names` guarding the one namespace.

A stateless protocol mixin reaches all of them. Only Studio's form fields
and persistence come from state (`fieldMeta`). So each one is a new word
that players and authors see. That is the cost.

### Rejected: an act registry (`plansAct`)

The first proposal was a central list of acts (act → view → planner
signature), declared by a static on each answering class, with
`MixinApi.plansAct(obj, act)`. ⛔ The owner rejected it: *"a centralized
list of acts … is exactly the sort of thing our command interpreter is
designed to reject … there's this other data structure we have to consult
and it's centralized and has its own vocabulary and none of that is
visible anywhere else; you just have to know it."* `commandContributions`
plus the command def is the record a person reasons about. A second
vocabulary beside it is worse than more names.

### Rejected: the view names the method (`asks:`)

A view key `asks: turnPlanFor` (what the verb calls on its target), with a
boot check. ⛔ The view would be reaching into its controller: *"that's
entirely up to the controller … feels like we're losing the idea of
encapsulation here with the whole CLI-MVC framework."* A view says what is
typed and how each slot binds. What is called on the target is the
controller's decision.

### ⭐⭐ Decided: the contract lives on the MODEL side, so the protocol mixin stays

Option 2 put the contract in the controller (`TurnController` exports
`interface Turns`, and the screw press implements it). ⛔ The owner
rejected it because it reverses the dependency: *"a mixin does name its
command views it affords and those command views name specific
controllers. So the linkage is already there. What feels wrong is jumping
over the view and pulling stuff out of its controller in the mixin … what
if the controller changes on a view? Right now a view can basically write
itself up however it wants and it won't break a mixin. It might break a
command syntax or interpretation but the models themselves are still
honest. It's just the command interpreter that suffers."*

This is [controllers-are-io](./controllers-are-io-slate.md)'s own
boundary: it must be *"very easy to write my own alternate controller for
the same verb"*. If the models depend on a controller's interface, an
alternate controller must honor it or break them. **The mixins are the
library.** A verb's contract with its target is a protocol mixin (a name,
a method with a refusing default, each host overriding), as
[mixins.md](../../subsystems/mixins.md) already says. What is left is its
COST, which splits into two smaller questions.

### 1. A protocol mixin is EARNED by a verb more than one kind of thing answers

A protocol mixin with one possible host is usually this slate's own smell:
*a verb with one possible target is a property of that target wearing a
verb's clothes.* The ceramics eight, sorted:

| protocol | hosts | verdict |
|---|---|---|
| `DipBathMixin` | dip pot, compounding tubs, glass melt | earned |
| `CarvableMixin` | mould, green ware, the carpentry pack's pattern stock (board, blank) | earned |
| `ImpressibleMixin` | mould, green ware | earned |
| `KneadVesselMixin` | compounding tub, dough trough | earned |
| `TurnableMixin` | screw press; a windlass, a capstan by its own docstring | earned once a second host lands; hold |
| `ShapeableMixin` | clay | ⚠ check the VERB: should `shape` take anything plastic (wax, dough, putty)? |
| `HandWorkedMixin` | churn | ⚠ check the VERB: is cranking a churn really `stir` / `churn` over one protocol, or the churn's own act? |
| `StrikingDieMixin` | die | ⚠ check the VERB: is a die's strike `hammer … on`'s protocol (an anvil, a die, a stake), or only the die's? |

If the verb widens, the mixin earns its keep. If it does not, the act
belongs on the one object's own surface, and the mixin goes. `FormingMixin`
(wheel, brick table, blowpipe) carries state and is not in question.

### 2. A protocol mixin is PRESENTED as the verb it serves

The vocabulary pressure comes from presentation, and can be solved
without changing the architecture. A protocol mixin says what it is (for
example `static _mixinKind = 'protocol'`, beside `_mixinName`), and the
surfaces that read names show it as the verb it serves:
- **the card:** *answers: turn · dip*, beside the noun chips (Greenware,
  Container), not in among them;
- **Studio:** grouped under "answers";
- **help:** the topic hangs off the verb (`help turn` lists who answers it).

Players keep learning verbs by typing them. The nouns stay the nouns of
state. The binder, `MixinApi.isX` narrowing and the boot-time checks keep
working unchanged.

> **The rule:** state → a mixin. A verb's contract with its target → a
> protocol mixin on the model side, earned by a verb that more than one
> kind of thing answers, and presented as the verb it serves.

⚠ This sharpens the section above (*bare verb shapes become protocol
mixins*): each of `Workable` / `Diggable` / `Splittable` / `Pumpable` /
`Tappable` / `Cuttable` must pass the earned test as it converts. A shape
with one host is a verb question first.

### Open: `requires: affords`

The owner was *"okay with it, I guess"*, but not sure the test holds every
time. A slot that declares `requires: affords` admits only a thing that
itself contributes this view. It would let a verb bind its target without
naming any mixin. Edges to probe against a dozen real verbs before
trusting it:
- **Affording is not being the target.** The cocktail shaker affords
  `strain`, but you strain the drink. A tool's verbs mostly work this way,
  so `affords` is opted into per slot, never assumed.
- **Placement.** Does `affords` mean "contributes the view at all" or
  "contributes it from where it stands"? Probably the former: the binder's
  scope already decides reach.
- **Conferred verbs.** Augments and shadows confer mixins. A thing that
  answers a verb only while buffed has to count, so the affordance read
  must include conferred contributions.
- **One view, two roles.** `carve` has a thing carved FROM (a board) and a
  thing carved ON (a pot). Both afford `carve`, so `affords` alone cannot
  tell which slot a thing belongs in. That may be fine (the planner
  decides), or those slots may need more.

It sits beside the protocol mixin, not instead of it. When the view binds
by `affords`, the controller still narrows on the protocol mixin.

**Size:** a decision for mixins.md (the earned test and the presentation
flag), the presentation change on three surfaces (card, Studio, help), the
three single-host verb checks, and the `affords` probe. The ceramics
eight stay as shipped until this rules.

