# Game-intro video series

Short (~5 min) videos introducing the game to gamers — each dissects one
concrete subsystem / player experience. The *what / how-it-works*
complement to the long-form manifesto video.

## Approach (settled; **tone still being fine-tuned**)

- **Reference-doc / how-to walkthrough tone** — explanatory, concrete,
  real figures; NOT a sales pitch or trailer. Owns the tradeoffs plainly.
- **Center the concrete thing, not the philosophy.** Each video is a real
  player experience (built *or* fully-designed; not NPC-only, not
  needs-a-crowd-to-work).
- **The design philosophy is the recurring "why"** — why is this possible,
  why don't other games do it — and each video drops only the *relevant
  slice*, bolted to its concrete subject, never lectured. Source:
  `docs/design-philosophy.md` + `docs/interaction-philosophy.md`.
- **Don't overclaim novelty.** The differentiator is depth / honest
  modeling / emergence from shared state (*model the cause; the
  consequences fall out*). Contrast with a universal convention (hit
  points) is fine; name-dropping specific games as the organizing frame
  is not.

## The first 6 (open series — start here)

1. **[drafted] Vitals, not hit points** — the body as a real sim
   (bleeding = blood volume dropping, cold = core temp falling, no HP
   bar). *Slice:* no render/art-budget tax → we can afford deep sim +
   emergence.
2. **The honest world** — `look` gives prose; `analyze` gives the real
   units underneath; the model is perceiver-relative (a dog hears the
   room differently). *Slice:* honest models + layered presentation.
3. **Everything's a command** — click a thing, watch the command it
   typed, type it yourself, then script it. *Slice:* one command every
   surface; the beginner path is the expert on-ramp.
4. **The world you dig** (the mine) — read the rock, chase a seam, the
   workings heal, the loop feeds itself. *Slice:* world authored by play
   + honest geology + real economy. (Fully designed — see
   `staging/ferrow-delving.md`.)
5. **A fight is a chemistry set** (combat) — materials and physics decide
   outcomes, not an HP race. *Slice:* emergence from honest materials.
6. **Your commands become programs** (scripting) — the same strings you
   type can be stored, chained, automated. *Slice:* actions compose
   because they're strings.

Backlog / alternates: natural-language emotes & social; death as a
recovery arc; senses & perception; the AI-as-participant angle (the human
interface *is* the AI interface). Six is the starting batch, not a cap.

---

## Scripts

### 1 — Vitals, not hit points · "Status effects, all the way down"
*(first draft — tone TBD)*

Trading one health bar for specific conditions — bleeding, a broken limb,
cold, hunger — isn't new. Plenty of games do it. What's different here
isn't the idea, it's how far down the model goes. In most games a status
effect is a tag with a timer: "bleeding" sits on you and subtracts a
little health each tick until it wears off. Here it isn't a tag riding on
a health bar — there's no health bar underneath it. The condition *is* the
model.

Take bleeding. There's no "bleed" effect — there's your blood volume,
about five liters, and it's actually dropping:

> A gash across your forearm wells and runs. You are losing blood.

Nothing is scripted to fire at a threshold. A falling blood volume just
delivers less oxygen to your brain, and your consciousness is computed
from that — so as the blood goes, you slide down the same scale of
alertness that losing air would put you on. Around forty percent gone,
two liters, and it bottoms out: you're unconscious — its own real state,
not death; you're down, not gone. Keep bleeding and it's death, and the
cause isn't "HP hit zero," it's exsanguination.

And here's the part other games can't copy cheaply: nobody wrote
"bleeding makes you pass out." Bleeding lowers oxygen; passing out is
what low oxygen does — so drowning, thin air, a hand at your throat all
run the same machine, and they stack, because they're inputs to one
function, not separate scripts. A little blood loss plus bad air drops
you sooner than either alone, and no designer wrote that interaction. It
falls out.

So you don't wait it out or heal through it — you stop the process.
Pressure, a bandage, and the wound clots. Get careless and it reopens,
because it was never a timer; it was a wound. And because it's a wound and
not a debuff on a character sheet, other people are part of it — someone
can kneel down, put pressure on it, dress it, drag you out. A status icon
is yours alone; a bleeding body is something the people around you can act
on.

That same depth runs through the rest. Cold isn't a slow-damage aura —
it's your core temperature falling from 37 °C. At 35 you're shivering;
below 32 the shivering quits and you go confused and clumsy; under about
28 you're dying — the real stages of hypothermia, in real degrees. And
holding that temperature costs energy, so a cold body burns through its
food faster. A fracture, the same way, isn't a debuff that dims your
stats — it's a break in a specific limb, so a broken leg won't take your
weight, and your *movement* is what's wrong.

None of it lives in a number over your head — you feel it in what the game
tells you, the shiver and the limp. But ask, and the body reports its
actual signs:

```
Blood volume:     3.4 L of 5.0 L   (68%)
Core temp:        34.6 °C   (mild hypothermia)
Consciousness:    impaired — blood volume low
Left leg:         fractured — cannot bear weight
```

Real quantities, real units — the same figures a medic would read off you.

Which raises the obvious question: if this is better, why doesn't everyone
do it? Mostly, graphics. In a game you look at, every state you simulate
is a state you have to draw — a broken leg owes a limp animation, bleeding
owes the wounds and the blood and the pale skin — so the depth of the sim
is capped by the art budget, and graphical games abstract down to what
they can afford to show. Text has no such cap: any state the model
produces costs a sentence. We're not being clever; we're just not paying
the rendering bill that forces everyone else to abstract. It costs us
something real in return — a body full of variables is harder to read than
one bar, and emergence is harder to balance than authored effects — but
that's a trade we'll take, because we're after authenticity, not
mass-market polish. The games that already went this deep — Dwarf
Fortress, the hardcore survival sims — all made the same trade. We're in
that lineage; text just lets us go a step further.

So the honest version: conditions instead of a health bar is something
you've seen. The difference is that we model the *cause* and let the
consequences compute themselves, so the conditions interact without anyone
scripting the interactions — cold drives hunger, blood loss and
suffocation share one fadeout, a fracture routes through the same legs
that carry a heavy pack. Depth isn't the numbers. It's that the numbers
are wired to each other the way a real body is.
