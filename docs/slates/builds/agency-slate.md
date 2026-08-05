# Agency slate — acting on behalf of another

**Captured 2026-08-04**, out of the gap hunt across law sources. Several
separate designs had each been reaching for the same missing primitive
privately.

> **User: "we can do agency."**

> **Status: design conversation, captured. Not requirements.** Small
> primitive, wide reach — the value is that it unblocks things rather
> than that it does anything itself.

Related: [call-security.md](../../subsystems/call-security.md) (**the
constraint that shapes the whole design — read it first**),
[provenance.md](../../subsystems/provenance.md) (`getActingAuthor`, the
attribution half), [access.md](../../subsystems/access.md) (`can`, the
authorization half), [parcel.md](../../subsystems/parcel.md) (`UseGrant`
— the scoping shape), [incapacity-slate](./incapacity-slate.md) (the
deputy question this answers),
[employment.md](../../subsystems/employment.md) (a possible existing
special case), [legal-code-slate](./legal-code-slate.md) (⚠ delegation,
which is **not** this — see below).

---

# ⭐⭐⭐ The constraint that decides the shape

> **`ExecutionContextApi.getActingAuthor` / `getCurrentCommandGiver` —
> the principal is derived from context, NEVER a parameter.**

That is a hard, enforced rule across the gated surface. So agency
**cannot** be *"pass a different actor to the call."*

> ⭐⭐⭐⭐ **Agency is a property of the EXECUTION CONTEXT, not an argument
> to a function.**

When Alice acts as Bob's agent, the context carries **both** — and every
gated Api resolves against whichever one its question is actually about.

---

# ⭐⭐⭐⭐⭐ The rule: authority flows from the principal, attribution stays with the agent

| Question | Answered by |
|---|---|
| **may this happen?** | **the PRINCIPAL** — Bob's title, Bob's membership, Bob's office |
| **who did it?** | **the AGENT** — Alice made it, Alice signed it, Alice struck the blow |

That is what real agency law does, and — the part that makes it cheap —

> ⭐⭐ **The seam already exists.** `AccessApi.can` (authorization) and
> `getActingAuthor` (attribution/provenance) are **already separate
> calls**. Agency does not introduce the split; it is the first consumer
> that needs the two to resolve to *different people*.

Consequences that fall straight out:

- `authoring_events` records **Alice** — she made it
- `AccessApi.can` passes because **Bob** owns the ground
- ⭐ `accountability_events` sees **both**, so derive-on-read blame can
  attribute the act to Alice *and* the exposure to Bob — which is
  precisely what agency means in law

---

# Scope

Everything else in this system resolves by path, so the natural fit is an
extent:

> **Bob grants Alice agency over `/domain/terminus/bakery`.** Inside it,
> Alice acts with Bob's authority. Outside it, she is Alice.

⭐ That reuses the coverage trie again, and the **`UseGrant` shape**
(scoped · revocable · time-bounded) is already the right object — the
same one [psychology-slate](./psychology-slate.md) reached for
independently.

⚠ **But not everything is path-scoped.** Bank accounts, offices, and
positions are not extents. So scope is probably **a small set of
capability kinds, one of which is a path extent** — and getting that
vocabulary closed rather than open is the design work.

---

# ⚠ Guards

| | |
|---|---|
| ⭐⭐⭐ **Code-trust NEVER flows through agency** | if Bob is a wizard, Alice-as-Bob's-agent is **not**. Same class as *no office may inherit code-trust* ([balance-slate](./balance-slate.md)) — **the one axis nothing may launder** |
| **Always revocable** | an irrevocable agency is bondage, and it collides directly with the *no irrevocable contract* module (13th) |
| ⚠ **Self-dealing is the classic abuse** | Alice-as-agent sells Bob's bakery to Alice. Real law answers this with **fiduciary duty** — which the corporate-governance mining flagged as missing, and which agency makes urgent rather than theoretical |
| **The agent BINDS the principal** | that is the point, and the risk. Which is why scope has to be narrow by default and never all-or-nothing |
| ⭐ **Apparent authority mostly dissolves** | in real law a third party may rely on appearances. Here **the engine checks**, so a shopkeeper never needs to assess whether Alice really speaks for Bob. A genuine simplification the medium gives us free |

---

# ⭐ What it unblocks

- **deputies** — [incapacity-slate](./incapacity-slate.md)'s open question
  had nowhere to land
- **trusts** — property held by one for another's benefit
- **guardianship** — for the genuinely incapacitated
- **brokers** — acting in a market for someone else
- **the custodian / receiver** — currently a bespoke role in
  [contract.md](../../subsystems/contract.md); agency generalizes it

⚠ **Possibly already a special case: employment.** A bartender selling
drinks is acting for the business, and the business gets the money.
Worth checking whether `employment.md`'s on-shift conferral is a
hand-rolled narrow agency — **if it is, generalizing unifies two things
instead of adding one.**

## ⚠⚠ Delegation is NOT agency — do not conflate them

[legal-code-slate](./legal-code-slate.md) names delegation as the real
remaining governance build, and the recorded rule is **"steers, never
transfers; default-not-transfer."**

> **Delegation STEERS. Agency ACTS.** A delegate influences how your
> weight lands; an agent's act *is* your act. Different mechanisms,
> different guards, and merging them would quietly make political
> delegation into a power of attorney.

---

# Open questions

1. ⭐ **Is the scope vocabulary closed?** *Leans yes* — an open-ended
   scope language is a second authorization system, and this project has
   consistently chosen closed vocabularies for exactly that reason.
2. **Does an agent's act appear in the record as one event or two?**
   *Leans one event carrying both identities* — two rows invites them to
   drift apart.
3. ⚠ **Can an agent appoint a sub-agent?** Real law mostly says no
   without express authority. *Leans no* — chains of agency are how scope
   escapes its bounds.
4. **Ratification** — may a principal adopt an unauthorized act after the
   fact? Cheap to add, and it is how real relationships actually work,
   but it means an act can change its authorization retroactively, which
   the record will not love.
5. ⚠ **What happens to live agencies when the principal is absent?**
   [incapacity-slate](./incapacity-slate.md) says impound-on-claim for
   holdings — but an agency is exactly the thing that *prevents* the harm
   a claim would answer. **Agency may be the humane alternative to
   receivership**, which argues for making it easy to grant in advance.
