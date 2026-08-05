# Incapacity slate — obligations you cannot discharge, and impound on a claim

**Captured 2026-08-04**, from the manifesto gap hunt. What looked like
*"death and succession"* — flagged as the largest genuine hole in the
corpus — turned out on inspection to be something narrower and more
tractable.

> **User's call: "impound on a claim, not a clock."**

> **Status: design conversation, captured. Not requirements.** ⚠ **No
> live case identified** — the one this slate first named (escrowed
> contracts) turned out to be already solved; see the retraction below.
> This is doctrine waiting for a consumer.

Related: [mortality.md](../../subsystems/mortality.md) (**`passage` and
the floor — read it first, it decides the shape**),
[contract.md](../../subsystems/contract.md) (escrow, **the custodian
rule** this reuses), [sanitation-slate](./sanitation-slate.md)
(*abandonment is an act; impound not destroy* — the precedent),
[prison-slate](./prison-slate.md) (the confinement case),
[balance-slate](./balance-slate.md) (the standing ladder; the
sweep-proliferation warning), [governance.md](../../subsystems/governance.md)
(offices, already solved),
[amendment-library-slate](./amendment-library-slate.md) (Amdt 25).

---

# ⭐⭐⭐ There is no inheritance problem

`mortality.md` settles it:

> **`passage` — zero arguments, always available, afforded only by being
> incorporeal. It exists so a player can never be stranded** because the
> content that would have brought them back does not exist, is
> unreachable, or was deleted.

**Death is not permanent.** So nothing devolves, nothing is inherited,
and an estate never needs distributing. The question was never *who gets
it* — it is:

> ⭐⭐⭐⭐ **You hold obligations you cannot discharge.**

## One problem in three costumes

| | Absence is | Known end? |
|---|---|---|
| **death** | shade; ⭐ `passage` is always available, so persisting is a *choice* | at will |
| **linkdead** | unexplained | unknown |
| **confinement** | ⚠ **imposed by the state** | **known** |

They differ by **duration and voluntariness**, never by cause — which
makes one doctrine with texture rather than three. And it means
**Amdt 25 (succession & incapacity) is the general clause**, not a
PM-specific patch.

---

# ⭐⭐ Half of it is already solved

Offices, seats and staff positions need **nothing**: the organization
model's *appointing authority appoints, the position acts* means an
absent holder is simply replaced — visibly, on the chart, at the
appointer's discretion. **No claim, no impound, no doctrine required.**

**What remains is what you hold personally**: title, chattel, accounts,
contracts, tenancy, your side of an employment roster.

---

# ⭐⭐⭐⭐ The rule: impound on a CLAIM, never a clock

> **Nothing happens automatically. An absent holder's estate sits
> untouched until somebody is harmed and says so.**

Four reasons this is the right shape:

1. ⭐ **It needs no sweep.** balance-slate's rule is *"a sweep exists only
   where a state change must be STAMPED, not merely OBSERVED"* — and
   absence changes nothing until claimed. **Sweep proliferation is a named
   architectural risk; this avoids it entirely.**
2. ⭐⭐ **The claimant is already defined.** The standing ladder's middle
   rung — **the injured party** — is exactly right here: the unpaid
   employee, the counterparty stuck in escrow, the tenant with a broken
   roof. Not the state, not a bystander.
3. **It is self-limiting.** Most absences never generate a claim, because
   nobody is harmed. Only the ones that matter surface, and they surface
   *because* they matter.
4. ⭐ **The claim is the play.** Somebody has to notice, care, and act. A
   receivership petition is a **story**; a cron job is not.

## ⚠ Guardrail: the remedy is scoped to the harm

The obvious abuse is a rival filing to seize a competitor's business.

> **Impound the thing that is causing the harm, never the estate.** The
> bakery's escrow unlocks; the bakery does not change hands, and the
> house is not touched.

That keeps a claim from being a weapon, and it keeps impound clearly on
the *not-a-taking* side of the tenure floor.

## ⭐ The receiver PRESERVES, never improves

Who holds it: **the custodian**, reusing contract.md's rule rather than
inventing a role.

> **A receiver may keep the ovens lit and the wages paid. They may not
> sell the building.**

Necessary acts stand when the holder returns. The estate is not
diminished beyond the harm that justified the claim, and it is not
*grown* on the holder's behalf either — a custodian making investments
with someone else's property is a different and worse problem.

## Return and reclaim

The holder comes back and takes it back. **Impound is not forfeiture** —
which is the whole point, and it is the same doctrine
[sanitation-slate](./sanitation-slate.md) already settled for abandoned
property: *impound, not destroy; `collect` never `destroy`.*

⭐ Because it is not a taking, **it does not need due process to survive
the tenure floor.** Nothing was expropriated.

---

# ⚠⚠ Confinement is NOT abandonment

The case that would otherwise become **civil death** — the historical
doctrine where convicts lost property and standing along with liberty.

> **The state knows exactly where you are and for how long. That is not
> absence; it is a sentence.**

So a harm claim arising from a prisoner's inability to act should be
answerable **by the authority that caused the absence**, not resolved
against the prisoner's estate. Otherwise the polity punishes twice: once
by confinement, once by letting your holdings be picked over while you
serve.

⭐ This is the sharpest teaching case in the whole area and it belongs in
the due-process video — *may the polity act **against** you for being
unable to act?*

---

# ⭐ The escalation path (still no clock)

The objection to claim-only is that an estate could sit in receivership
forever, a permanently dead asset.

> **Answer: the claim can escalate, and escalation is still claim-driven.**
> A first claim impounds. A **later, harder** claim — that the estate is
> permanently unproductive — is a separate proceeding with a higher bar.

⚠ **And that second proceeding IS a taking**, so it is where compensation
and due process attach. Which is correct: the cheap remedy is cheap
because it takes nothing, and the expensive one is expensive because it
does.

---

# ⚠⚠ RETRACTED — contracts already solve absence, and better

A first draft of this slate named *"an escrowed contract with an absent
counterparty"* as the live case that would bite first, and proposed it as
the cleanest first build. **Wrong — inferred from the shape of escrow
without reading the lifecycle.** `contract.md` § *Expiry is lazy*:

> *"a claim past `claimExpiresAt` → breach + reopen; an open posting past
> `postingExpiresAt` → revert + `expired`. **No sweep, no counter, no
> scheduler** — conservation makes laziness safe: the held stake sits in a
> real account `reconcile` counts while nobody looks; **the refund lands
> on the next touch.**"*

| Absent party | What actually happens |
|---|---|
| **claimant vanishes** | claim expires → breach + reopen → the gig is free again |
| **issuer vanishes** | posting expires → revert → their own money returns to their own account |
| **issuer vanishes mid-settle** | ⭐ **not a thing** — the two-beat turn-in is claimant-driven; the issuer is not in the settle path at all |

**Nobody is stranded**, and it is deliberate — the same observe-first
pattern as withdrawal quotas and residency.

## ⭐⭐⭐ And observe-first is the pattern this slate should COPY

That is the deeper lesson, not a footnote:

> **Expire-on-touch and impound-on-claim are the same instinct, one layer
> apart.** Neither needs a sweep, a scheduler, or a counter. Both let the
> stale state sit harmlessly until somebody who cares next looks at it.

⭐ So *impound on a claim* is not a novel choice — **it is the house
pattern**, already load-bearing in contracts, banking quotas and
residency. That is a much stronger argument for it than novelty.

⚠ **And it argues against building an impound mechanism into contracts
at all.** The subsystem deliberately has **no registry, no `boot()`, no
sweep and no watch index**; adding a claim type, an adjudicator and a
custodian path would be a great deal of machinery pointed at a hole that
is not there.

## What is actually left in contracts: a dial, not a mechanism

**Expiry is optional on both modes.** A posting with no
`postingExpiresAt` whose issuer never returns holds escrow indefinitely.

Interrogated honestly, that is **arguably correct**: it is the issuer's
own money, in the issuer's own escrow account, and the gig stays
claimable by anyone. A standing offer, not a stranding. `reconcile`
counts it and conservation holds.

The only real defect is cosmetic — **a board accumulating permanently
open gigs from departed issuers gets noisy**, which is a display filter,
not a claims system.

> ⭐ **If an escrow-adjacent build is wanted, the honest candidate is the
> optional-expiry DEFAULT — one dial.**

---

# Open questions

1. **Does an absent holder keep earning?** Standing already decays by
   design. *Leans: wages no, rent yes* — you should not be paid for work
   not done, but a tenancy is a contract that runs.
2. ⚠ **Can you designate a deputy in advance?** The humane answer, and it
   creates a trust relationship — a theme now running through disclosure,
   privilege, and this. But *appointing authority appoints* may already
   cover enough, and a new mechanic needs to earn itself.
3. **Who adjudicates a claim before courts exist?** The locality's
   committee is the obvious interim, but that is the same body that might
   benefit — worth naming rather than defaulting.
4. **Is there any state where a body is genuinely gone?** `passage` says
   no for players. **NPCs and corpses are a different question**, and
   businesses staffed by NPCs may need one.
5. ⚠ **Does impound show up in the record?** *Leans yes, on the docket* —
   an estate under receivership is a public fact, and it is the only way a
   returning holder can see what was done in their absence.
