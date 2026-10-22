# Breath control slate — breathing is passive, and a breath act takes one phase

> **Status: UNBUILT** — designed at high level 2026-10-22 with the owner, out of the
> smoking conversation ([smoking-slate](./smoking-slate.md)). What ships
> ([respiration.md](../../subsystems/respiration.md)): breathing is free and passive in
> breathable air; the breath is a store of usable oxygen; `_lungFill` tracks the gas volume
> apart from its oxygen; `inhale` fills the lungs (a full breath for the next 30 s — dive
> preparation); `exhale` empties them to the residual, so you sink; `blow` exists only as
> Gus's domain-local whistle verb. Nothing says what happens **after** a voluntary breath.
> **Left:** the one-phase rule and what ends a hold · lung contents (the gas, not just its
> volume) · `inhale [from X]` · `exhale`/`blow` as one act aimed at a target, with force and
> shape · breath as a target protocol (the mouth is a bellows) · speech spends a hold · the
> involuntary exhales (cough, laugh, the gut punch) · directed breath on the consent ledger
> · the applications
> **Size:** a build — kernel-led; the first consumer is [smoking](./smoking-slate.md)

## 0. The problem **[DECIDED — the owner]**

*"We want breathing to be passive so you don't have to actively breathe to live, but we
also want to model controlled breath, which does need active verbs. … You can control both
inhalation and exhalation, but just because you actively do one doesn't mean you want to
have to actively do the other. With smoking, 'inhale' is the important act; exhalation
should just be passive. But not always — what if you want to blow smoke rings or blow smoke
in someone's face? … Think about all breathing applications, not just smoking and diving."*

## 1. ⭐⭐⭐ A breath act takes one phase, and the body takes the other back **[DECIDED]**

Breathing is automatic. A voluntary breath act **takes over one phase** — inhale or exhale
— and **the body takes the other back on its own**, unless you claim it too. Smoking is the
clean case: `inhale` from the pipe, do nothing, and the smoke drifts out a few seconds
later. A smoke ring is you claiming the exhale.

**A hold ends at the first of:**

1. **your next breath act** — `exhale`, `blow`, another `inhale`;
2. ⭐ **speaking** — words need breath, so speech spends the hold, and whatever was in the
   lungs comes out with the words (*"she said, smoke curling out with the words"*) —
   prose the model gives for free;
3. **the body** — in open air after a short beat (a dial; a guess of about five real
   seconds, on respiration's real-seconds clock); under water there is nothing to breathe,
   so the hold lasts until the urge, as shipped; the 30-second dive-preparation window
   reads as *still holding*;
4. **force** — a cough, a punch to the gut, laughing, cold shock.

One rule covers smoking (inhale only), diving (inhale, then the water keeps you holding),
smoke rings (inhale, then shape the exhale) and speech (the hold spent as words).

## 2. ⭐⭐ The lungs have contents **[DECIDED]**

Respiration tracks the **volume**; add **what gas it is** — air, smoke, a toxic gas you
breathed, helium. Whatever is in the lungs leaves with the **next exhale, passive or
voluntary**, into the room or at what you aimed it at:

- **smoke** leaves a plume in the room (cleanliness and the air);
- ⭐ **your breath steams in the cold** — a passive exhale is visible below about 7 °C,
  derived from the ambient temperature;
- **breath carries smell** — whisky, garlic, tobacco; ⭐ a clue for the
  [deception-and-detection](./deception-and-detection-slate.md) detective;
- **helium** — your next words come out squeaky: the speed of sound, derived.

## 3. ⭐⭐⭐ The verbs — two phase verbs, and `blow` is `exhale` **[DECIDED — the owner]**

The owner: *"`blow` should definitely be general, but I also don't know if it needs to be a
different thing than exhale."* It does not — **one verb per act, not per word**: `blow` is
an alias of `exhale`, as `grind` rides `mill`, and the collision ladder's first rung (unify)
retires Gus's domain-local `blow` into it.

| verb | the act | targets |
|---|---|---|
| **`inhale [from X]`** | take in — from the room, or from a source | a pipe, a hookah, a balloon, an oxygen mask, smelling salts, a window's fresh air |
| **`exhale` / `blow` [at · into · onto X] [as shape]** | let it out on purpose — aimed, shaped | a candle, embers, soup, a bladder, a whistle, a window, a face |
| **`smell` / `sniff`** | ⭐ already a verb — and it is an inhale | the nose |
| **speech** — `say`, `shout`, `sing` | exhales that carry words | phrase length bounded by breath |

- **The target decides what the breath does** — a candle goes out, embers flare, soup
  cools, a bladder inflates, a whistle sounds, a face gets smoke in it. Nobody exhales
  gently at a candle hoping it stays lit, so the target takes the strong default and the
  player never has to choose the right verb.
- **Force is a manner word** — `blow hard on the embers`, `exhale gently on the glass`
  (fogging a hot pane, not cracking it): the [expressive acts](./expressive-acts-slate.md)
  leading-word rule, with intensity read as force.
- **Shape** is a small closed vocabulary — **plume** (the default) · **rings** · **stream**
  · **puffs** · **through the nose**. ⭐ Rings need **still air**: they shred in a draft or
  outdoors in wind, derived from the room's air. **Free, not skill-gated** — a party
  trick, not a progression gate.
- No `hold breath` — `hold` is a contended item verb, and `inhale` already holds.

## 4. ⭐⭐ The mouth is a bellows **[DECIDED]**

[pump.md](../../subsystems/pump.md) already has a `Pumpable` protocol that the bellows
speaks. Blowing into or onto something is the lungs acting as a small, weak bellows, so
**a target answers a breath through one protocol**: stoking embers (fire's oxygen term),
inflating a float or the underwater lift bags, a whistle or a horn, and ⭐ the
glassblower's blowpipe — [glass.md](../../subsystems/glass.md) has the hot-work steps, and
blowing the gather is the missing one.

## 5. ⭐ Directed breath is a directed act **[DECIDED]**

**Blowing smoke in someone's face is aimed at a person** — an insult, physically delivered —
so it lands on the [expressive acts](./expressive-acts-slate.md) consent ledger. It is the
first non-emote example of that slate's open question (directed acts beyond emotes).
Emotes stay emotes: `sigh`, `gasp`, `huff` and `puff` are expression and change nothing; a
sigh emote does not empty your lungs.

## 6. The applications

| application | phases | notes |
|---|---|---|
| diving, swimming | inhale and hold | as shipped |
| smoking | inhale; passive exhale | ⭐ the first-timer **coughs** — an involuntary exhale that tolerance lowers |
| smoke rings, smoke in a face | inhale; shaped or aimed exhale | still air; consent |
| smelling, tasting the air | a short inhale | secondhand smoke arrives this way |
| a gas cloud, a burning building | ⭐ hold your breath to cross it | the real fire-evacuation lesson — stay low, don't breathe the smoke |
| singing, wind instruments, shouting | controlled exhale with a phrase length | breath control is `wind` plus skill — a singer's or trumpeter's craft |
| whistling | exhale through a shape | calls a dog ([pets](../../subsystems/pets.md)) |
| candles, embers, soup | `blow` | fire and thermal read it |
| inflating | `blow into` | floats, lift bags, bladders, balloons |
| ⭐ rescue breaths | `exhale into` a person not breathing | the medic vertical: your breath holds up their oxygen |
| ⭐ calming, meditation | slow, paced breathing | real physiology — it lowers the stress stock ([trait.md](../../subsystems/trait.md)'s stress follow-on) |
| panic | hyperventilation | modeled for diving; panic is the involuntary version |
| inhaled medicine | `inhale from` | ether, smelling salts, an asthma inhaler ([pharma](./pharma-slate.md)) |

## 7. Depends on

- ⚠ [respiration-slate](../tails/respiration-slate.md)'s **in-place trigger** — a body
  standing still is never re-checked, and passive breathing of a room's smoke needs it.
- [respiration-slate](../tails/respiration-slate.md)'s **air reserve as a breathable read**
  — what a room's air holds.
- [sanitation-and-pollution](./sanitation-and-pollution-slate.md)'s emission model — smoke
  spreading through the air.

## 8. The lens pass

1. **Pedagogy** — tidal and full breaths, the urge that lies, breath as a bellows, steam
   below the dew point, helium and the speed of sound, why you stay low in a fire, paced
   breathing and stress.
2. **Expression** — the smoke ring, the steaming breath, words with smoke in them; any
   author's object can answer a breath.
3. **Immersion** — the plume that drifts out on its own; the cough on the first pipe.
   **Participation** — the glassblower, the singer, the trumpeter, the medic giving breath.
4. **Values** — smoke in a face as an insult on the consent ledger.
5. **Continuity** — bellows, blowpipe, oxygen mask, inhaler: the same `inhale from` and
   `blow into`.
6. **Economy** — the glasshouse's blowing, the wind-instrument maker, the oxygen supply.
7. **Governance** — smoke in a face as an act a polity can rule on.

## 9. Open

1. **The open-air beat** — how long before the body takes the exhale back.
2. **Phrase length** — how speech and song draw on a breath, and whether `wind` or a
   Discipline governs it.
3. **Lung contents across a breath** — how much smoke stays and how it mixes with the next
   tidal breath.
