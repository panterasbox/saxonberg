# trade-apiculture

The apiculture trade — ⭐⭐ **the first RGO whose reservoir is somebody
else's land.**

A colony is the organism: not a herd of insects you draft one from, but a
single living thing with a strength, a queen, stores and a temper, kept in
a box whose walls decide how much honey a winter costs. What it eats is
the bloom within about an hour's flight of where it stands, so two keepers
on one valley find each other out with no ledger telling them; and what it
leaves behind is a fruit set on trees it does not own.

## What is here

- `src/lib/Colony.ts` — `ColonyMixin`: the population, the winter
  equation, swarming, absconding, starvation, and the sting. Read-triggered
  and sync, shaped after the growth model.
- `src/thing/Hive.ts` — a colony in a box. A `Vessel` composing
  `AtmosphericMixin` for the envelope arithmetic, plus the taps, the
  handling, the lid, the forage census and `Splittable`.
- `src/thing/Colony.ts` — bees with no box: a swarm, a nucleus, a split.
- `src/thing/{HiveBox,Frame,Smoker}.ts` — a super, a frame, a smoker.
- `src/idea/cmd/apiculture/RobController.ts` — the trade's **one** verb.

## What it does NOT ship

Everything else is the platform's: you `open` a hive, `put` a nucleus or a
super in it, `split` a strong colony, `handle` it to read it, `ignite` a
smoker, and `make` honey out of comb two different ways.

⭐ **And nothing in Heart's Delight keeps bees.** The valley has an
apiary-shaped hole in it and a grower who would be better off if somebody
filled it; the kit is Terminus's general store's, ten minutes up the road.
That vacancy is deliberate — a beekeeper is a second party on land they do
not own, and you cannot be a second party to a farm that keeps its own
hives.
