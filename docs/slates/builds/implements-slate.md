# Implements slate — items that make a caster better

> **Status: UNBUILT** — opened 2026-08-04 when `Focus` was cut from the
> magic-items build; the seam it folds into (`potencyFactor` in
> `MagicLogic`) exists and nothing else does. Code-verified 2026-09-19:
> no implement / lens class anywhere; `potencyFactor`
> (`MagicLogic.ts:2230`) reads competence only. ⚠ The nearest shipped
> kin is `ConduitMixin` (`arcana`'s `lib/magic/Conduit.ts`) — passive,
> held, nothing to top up, *specialisation by inventory* — but it
> modifies **recharge** coupling, not what happens when you cast.
> **Left:** the implement class itself · choosing what it modifies
> (magnitude / cost / band-reach — and the reach case must not become a
> key) · wear (default none; else `Durable`, as the conduit did) · BUC on
> the effect axis · the stacking rule, before content exists ·
> craftability (the lens-maker vocation)
> **Size:** a build

## The one sentence

> **An implement does not cast. It changes what happens when *you* cast.**

Held or worn, passive, no trigger of its own. You `cast firebolt`; the
lens in your other hand makes it land harder, or cost less, or reach a
cell you could not otherwise touch.

---

## Why the cut happened, because it is the whole design brief

SHIPPED · DOCUMENTED — the `Focus` cut and its three reasons (a second
instance of an existing decision · no verb to fire it · no NetHack
analogue) are stated in `magic-items.md` (the *`Focus` was cut before
merge* box under *§ The three item classes*); the pattern-rot clock went
with the class (*§ `ChargedMixin`'s second consumer*, the canon line).
The constraint it leaves this build is:

> ⭐ **The test this build must pass: does it add a thing the player has
> to top up?** If yes, it has to earn it against everything already
> being tracked. An implement that is passive adds nothing.

---

## What it is for

### The world barely touches mages, and mages barely touch the world

Today the world affects a caster in exactly **one** way: a zone can
`suppressesMagic`. That is the negative half and there is no positive
half. Implements are the other side — the world giving a caster
something rather than only taking it away.

### Specialisation without a guild

The standing doctrine is **no magic guilds**: magic is part of any
professional's toolkit, alongside augments and species. But somebody who
wants to specialise should be able to, on their own terms.

> ⭐⭐ **An implement is specialisation by INVENTORY, not by membership.**
> You do not join anything. You equip toward a specialty, and you can
> change your mind by putting something down.

Anyone may carry one; only a caster benefits, so it self-selects with no
gate to write. A soldier with a firebolt habit buys the fire lens — that
is magic-in-a-toolkit, not a mage class.

### ⭐ The grid is already the specialisation axis

This is what makes the build small. Competence is **two Discipline
leaves** — the verb and the noun — and Tarn's Rule takes the *minimum*
of them. So an implement that lifts your effective band on **one axis**
is precise, legible, and composes with everything shipped:

| implement | touches | what it means |
|---|---|---|
| a burning-glass | `create` | everything you *make* comes easier |
| a stormglass | `lightning` | your limiting axis stops being the noun |
| a censer | `mind` | the specialist's tool, useless to everyone else |

No new vocabulary. The axes already exist, are already taught, already
priced, and already gate what you can cast.

---

## The seam already exists

`potencyFactor(caster, spell)` in `MagicLogic` is the single place a
cast computes magnitude from competence. An implement folds in there.

That is the whole integration point for the magnitude case. The
band-lifting case wants a second, similar read where the competence gate
is checked.

---

## Open questions — the design pass this slate exists to schedule

**What does an implement actually modify?** At least three candidates,
and they are not equally good:

1. **Magnitude** — the cast lands harder. Simplest, folds into
   `potencyFactor`, and the least interesting.
2. **Cost** — the cast is cheaper. Interacts with the coupled
   satiation/hydration recovery, so it has real economic teeth.
3. **Reach** — it lifts your effective *band* on one axis, so you can
   cast something you could not otherwise cast at all. The most
   dramatic, and the one that makes an implement worth hunting for.

(3) is the one that feels like magic. It also needs the most care: an
implement that grants access must not become the only way to reach a
cell, or it stops being gear and becomes a key.

**Does it wear out?** The default answer is **no** — see the resource
test above. If it must, the honest form is not a second clock but the
one already shipped: `Durable.getCondition()`, the same wear every tool
has. An implement is a *tool*, and tools already wear.

**Does BUC apply?** It should: an implement has an effect axis, which is
the only thing BUC is defined against. A cursed lens that lifts the
wrong axis, or lifts nothing while telling you it does, is squarely in
the model. Note this pulls the false-belief machinery in.

**Can they be made?** They should be — crafting, retail and the vocation
register all ship, and "the mage who makes lenses" is a vocation the
moment there is demand. That is the economic payoff and probably the
reason to do this build at all.

**Multiple implements?** A held lens *and* a worn amulet. Composition
needs a rule (cap? diminishing? one per axis?) before content exists,
because retrofitting a cap after authors have shipped stacking gear is
the classic mistake.

---

## Non-goals

- **Not a caster class.** No gate that says "mages only."
- **Not a second mana.** Nothing to top up.
- **Not a replacement for wands.** A wand is stored labour anyone can
  spend; an implement is leverage for someone who already has power. Both
  should exist and they should not converge.

## Cross-references

[magic.md](../../subsystems/magic.md) ·
[magic-items.md](../../subsystems/magic-items.md) ·
[arcane-science.md](../../arcane-science.md) (the grid, Tarn's Rule) ·
[advancement.md](../../subsystems/advancement.md) (Discipline bands) ·
[crafting.md](../../subsystems/crafting.md) ·
[vocations.md](../../vocations.md)
