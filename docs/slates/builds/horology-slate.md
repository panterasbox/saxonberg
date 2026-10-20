# Horology slate — clocks, timers, and knowing what time it is

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of
> the gap walk. ⚠ **What ships is a prototype, not a foundation**: `Timekeeping`
> (a readable face), `MechanicalMovement` (drift as a constant `rate 0.995`, a
> mainspring), the `wind` and `adjust` verbs and the University Avenue tower
> ([time.md](../../subsystems/time.md)). The owner: *"don't put too much stock in
> this existing watch stuff. It was built with one application in mind, Gus's
> watch, and it was built long ago before lots of our other decisions were made."*
> Keep the read seam and the idea that drift is physics; re-derive the rest.
> **Left:** the 12× decisions · the clock/timer split and elapsed time on the
> instrumentation ladder · drift derived from the mechanism (escapement, grade,
> temperature, wear, motion) · the reference chain (observatory → regulator →
> time ball, noon gun, bells) · the longitude fix by chronometer · ship's time ·
> the sundial and the equation of time · local and standard time · the horology
> Discipline (making, keeping, rating) · the epoch ladder
> **Size:** a build (kernel physics + a trade + content)

## 0. The owner's frame

*"We want a real clockmaking / watchmaking discipline and we want to try and
capture the nuances of timekeeping and time tracking even though we run at 12x
and some of the interactions get a little weird."*

## 1. ⭐⭐⭐ The 12× decisions **[DECIDED]**

**All horology physics runs in game time.** A game day is two real hours
([time.md](../../subsystems/time.md) § *Why 12×*), so:

- **A pocket watch's spring runs about a day and a half — about three real
  hours.** Winding becomes a once-a-session ritual: wind your watch when you sit
  down, as a person winds it each morning. Honest, and a little nagging.
- ⭐ **The nagging is the lesson.** The nuisance motivated the inventions: the
  **eight-day clock**, and the **self-winding watch** (Perrelet, 1770s), wound by
  the wearer's motion — and [exertion](../../subsystems/exertion.md)'s movement
  ships, so a self-winding watch runs off your walking. Lens 5's ladder is driven
  by a nuisance the game makes you feel.
- **Drift shows fast.** A watch that loses a minute a game day loses it every two
  real hours: you *see* it disagree with the bells within a session — a lesson that
  takes a week at real time.
- **Seconds are a blur** — a game second is a twelfth of a real one. A seconds
  hand cannot be read as a tick, so precision lives in **timers and comparisons**,
  not in watching a hand move.
- ⚠ **The weird seam is real-time events.** A one-hour livestreamed concert
  ([performance-slate](./performance-slate.md)) spans twelve game hours, dusk to
  dawn. **Open:** accept it (*"the concert ran all night"*) or let a venue's
  fiction anchor to real time.

## 2. ⭐⭐⭐ Clocks and timers; elapsed time is a reading **[DECIDED — lens 1]**

- **A clock** answers *what time is it*. **A timer** answers *how long has it
  been*.
- **Most trades need timers**: the cook's hold for the kill
  ([spoilage.md](../../subsystems/spoilage.md)'s `holdS`), the forge's heat, the
  gunpowder fuse ([gunpowder-slate](./gunpowder-slate.md)), a steep, a proof.
- ⭐ **Elapsed time goes on the instrumentation ladder**
  ([instrumentation.md](../../subsystems/instrumentation.md): *competence resolves
  detail; the instrument sets the ceiling*):
  - **counting in your head** — a bracketed estimate that narrows with
    competence;
  - **an hourglass or a candle clock** — exact, for its one interval;
  - **a watch** — as good as its drift;
  - **a chronometer** — as good as its rating.

  Epistemic, never a roll: a cook without a timer *estimates* the hold, and a good
  cook estimates better.

## 3. ⭐⭐ Drift is derived from the mechanism **[DECIDED]**

`rate` stops being a constant. A timepiece's rate comes from what is inside it:

- **The escapement** — the epoch ladder: verge and foliot (on the order of a
  quarter-hour a day) → Huygens' pendulum (1656; seconds a day) → the lever
  escapement → Harrison's marine chronometer.
- **The maker's grade** — precision as competence, through crafting's grade
  ([crafting.md](../../subsystems/crafting.md)).
- **Temperature** — a balance spring runs slow when warm; the fix was the
  bimetallic compensation strip. Thermal state ships.
- **Wear and oil** — the oil thickens and the pivots wear, so a watch needs
  servicing: [assembly.md](../../subsystems/assembly.md)'s localized wear and
  `repair`.
- ⭐ **Motion** — **a pendulum does not work on a moving ship.** That is *why* the
  sea needed the chronometer, derivable from the ship's motion, which the
  [ships slate](./ships-and-harbors-slate.md) already models through seasickness.

All of it deterministic: drift is honest physics, never a roll.

## 4. ⭐⭐ Knowing the time comes from something **[DECIDED — lens 3a]**

**Nobody simply knows the time.** You know it from a **timepiece**; from the
**tower** and ⭐ **its bells** — it strikes the hours, heard through the shipped
hearing propagation, fainter down the street ([senses.md](../../subsystems/senses.md));
from **the sun**, read from a sundial through the celestial model; and later from
**the implant**, the aether-era timepiece time.md already anticipates.

**The reference chain.** The tower is honest because **someone keeps it**. True
time comes from **astronomy** — the observatory times star transits through the
celestial model — to a **regulator clock**, and out to the public: the **time
ball** (dropped at noon so ships in harbor can check their chronometers; Greenwich
from 1833), the noon gun, the bells, later the telegraph signal. You set your watch
**by reading** them. The clock keeper and the observatory are the vocations in the
chain.

**Ship's time** — the half-hour glass and the ship's bells (*eight bells*): the
timekeeping for the ships slate's still-open watch system.

## 5. ⭐⭐⭐ The flagship consumer — longitude **[DECIDED]**

[expanse.md](../../subsystems/expanse.md): *"a sun sight (`measure latitude`)
mends the latitude only."* There is no way to fix longitude at sea — historically,
there was none either, until the chronometer.

- **Longitude is a time difference.** Local noon by the sun against home-port time
  carried on the chronometer: **each hour of difference is 15°.**
- ⭐ **The chronometer's error becomes the fix's error.** One minute of clock error
  is fifteen minutes of arc — about fifteen nautical miles at the equator. The
  reckoning ring collapses on a longitude fix **to a width set by your clock.**
- ⭐⭐ **Harrison's insight: a clock need not be accurate, only predictable.** A
  chronometer is **rated** — its daily gain or loss measured and written in a rate
  book — and the navigator corrects for it. Measured drift can be corrected;
  unmeasured drift cannot.
- **The governance precedent** — Britain's Longitude Act (1714) offered a public
  prize for a practical method: a polity posting a prize to buy an invention, a
  mechanism the [markets slate](./markets-slate.md)'s public spending can carry.

## 6. Nuances worth capturing **[LEAN]**

- **The sundial and the equation of time** — the sun runs up to about a quarter
  hour ahead of or behind clock time across the year, so a sundial and a good clock
  honestly disagree by season. Derivable if the celestial model carries the orbit's
  shape (**open**).
- **Local and standard time** — before railways every town kept its own local mean
  time from its own sun; railway time (Britain, 1847) and standard time zones
  (1883) were institutional acts, and daylight saving is still a law people fight
  over. If the realm's localities differ in longitude, a polity may declare a
  standard (**open** — it depends on how wide the realm is).

## 7. ⭐⭐ The horology Discipline **[DECIDED]**

Three layers, as with composition:

- **Making** — a movement is an assembly built to tolerance; the maker's grade sets
  the steadiness of the rate. Parts: the escapement, the train, the balance, the
  mainspring (spring steel — the [cannery](./cannery-and-bottling-slate.md)'s
  metal-forming rung plus smithing's temper), the case, the crystal (glass), the
  jewels (gems — a gap). Brass, gold and silver cases wait on zinc, gold and silver.
- **Keeping** — servicing (clean and oil), repair, and **regulation**: adjusting
  the rate. The turret clock's keeper.
- **Rating** — measuring a timepiece's drift over days against a reference.
  ⭐ **Measurable and derivable**, and historically certified by institutions:
  observatories ran **chronometer trials** and issued certificates (Kew's "A"
  certificate). An institution certifies what the engine measures — the
  three-layer measurement pattern again.

**The epoch ladder** — sundial and water clock → hourglass and candle → verge →
pendulum → spring watch and lever → chronometer → electric → quartz → the
implant's aether time. The same `read` and the same timer act at every rung.

**First consumers** — the navigator (the longitude fix), the cook and the smith
(timers), anyone with a shift to make (the time ball and the bells).

## 8. Lens pass

1. **Pedagogy** — clocks vs timers; escapements; temperature compensation;
   predictability over accuracy; longitude as time. Decided §§ 2–5.
2. **Expression** — a maker's watch carries their mark and grade; a town's bells.
3. **Immersion** — the bells down the street; the watch that disagrees.
   **Participation** — the watchmaker, the clock keeper, the observatory, the
   navigator.
4. **Values** — whose time is the standard.
5. **Continuity** — the ladder from sundial to implant; the same read and timer.
6. **Economy** — servicing as recurring income; chronometers as dear capital; the
   prize.
7. **Governance** — standard time and daylight saving; the longitude prize;
   certification.

## 9. Open

1. **Real-time events against 12×** (§ 1).
2. **The equation of time** — whether the celestial model carries the orbit's
   shape.
3. **Standard time** — whether the realm is wide enough for local time to differ.
4. **What replaces the prototype** — the read seam kept, the drift model and verbs
   re-derived.
