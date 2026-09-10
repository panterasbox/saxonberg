# End-of-life slate — the body, the rite, and who is remembered

> **Status: UNBUILT** — the dying clock, stabilization, the forensic
> corpse and the shade ship (mortality); `Postmortem.interIn` / `interred`,
> `analyze postmortem`, the `forensics` Discipline and burial as a priced
> `Tariff` service shipped in the consequence build (MR!254).
> **Left:** custody of the body · the **rite as an event people attend** ·
> the monument + the `masonry` Discipline that does not exist · potter's
> field and who pays · the coroner economy · what a death does to the
> people left standing
> **Size:** a build

> **Status: design surface, unbuilt, no phase gate passed.** Spun out of
> the consequence build's MR review (MR!254, 2026-09-10) — *"the
> necropolis is pretty underbuilt … the whole end of life cycle and death
> services need real design."* Correct: what shipped is 122 lines.

---

## The gap

`order burial <body>` settles a real charge and `Postmortem.interIn` sets
a flag. What that flag *does* is the whole of it:

> ⭐ An interred body **stops objecting to eviction** — the grave keeps
> it, so the residency sweep may reclaim it whenever it likes.

**Burial today is a residency fix with a price tag.** It is honest, it
works, and nothing social happens. Nobody attends. Nobody is remembered.
Nobody is left with anything except a smaller bank balance.

⭐ `settlement-model.md § 12` names exactly two realm-wide holes:
**ceremony** and **health**. The consequence build closed health — there
is an infirmary now. **Ceremony is what is left**, and this is it: *"no
burial ground, no chapel, no hall in use, anywhere outside Terminus — for
a game with a mortality subsystem and a corpse-as-forensic-object."*

---

## ⭐⭐⭐ There is no natural death, and it decides the shape

`race.md` is explicit, and it is a **decision, not an omission**:

> `ageCurve` is live … **`lifespanMin` / `lifespanMax` deliberately do NOT
> bite. Nothing dies of old age.**

The reason is succession: under 12× compression a biting lifespan means a
named NPC reliably dies inside the game's ordinary operational life, and
*"does the innkeeper die, and who replaces her?"* is unsolved.

⚠⚠ **This slate must not quietly finish that.** `race.md` says so in as
many words — *"it should not be quietly 'finished' by a later build wiring
`lifespanMax` into mortality"* — and an end-of-life build is exactly the
build that would do it by accident. Ability from age, yes; death from age,
**not here**.

⭐ **And it makes the vertical better, not smaller.** Every death in this
world is **sudden**: violence, accident, illness. Nobody gets their
affairs in order, there is no deathbed and no hospice arc. There is a
person who was here this morning and a body somebody else has to deal
with this afternoon.

> **Which is the design in one line: end-of-life is OTHER PEOPLE'S WORK.**

That is also why it belongs beside the consequence build rather than
inside mortality. Mortality models what happens to **you**. This models
what your death costs **everybody still standing**.

---

## What already exists

Verified against the tree at slate time.

| what | where |
|---|---|
| the rescuable `dying` clock, stabilization, one `die` transition | `mortality.md` |
| the corpse as a **forensic `Creature`** with a decay curve | `mortality.md § The corpse` |
| the shade, `reembody`, the `passage` floor | `mortality.md` |
| `interIn(grave)` + `interred` — burial stops the eviction objection | `lib/mortality/Postmortem.ts` |
| `analyze postmortem` — reads a corpse, banded by competence | `trade-medicine` pack |
| the **`forensics`** Discipline | `content/platform/…/Discipline/forensics.yaml` |
| burial as a priced service (`SERVICE_KINDS = repair · treatment · burial`) | `platform/thing/Tariff.ts` |
| the necropolis — 122 lines, one room, ⚠ inside Terminus | `content/terminus/…/necropolis/` |
| per-instance ownership of movables | `chattel.md` |
| the append-only identity ledger — deeds and claims | `chronicle.md` |
| the quantity half of standing | `participation_events` |
| priced land in numbered plots (⭐ *"Colma is a plat book"*) | `smallholding.md`, `settlement-model.md` |

⭐ **Therefore what is genuinely new here is** everything between *the
body stops* and *somebody is remembered* — three stages, none of which
the tree models at all.

---

## ⭐⭐ Stage 1 — custody: the body is property nobody owns

A corpse is a `Creature` with a decay clock and an eviction opinion.
**Anybody may do anything to it.** There is no answer to *whose body is
this* — and every real funerary practice on earth is downstream of that
question.

`chattel.md` ships per-instance ownership; `mortality-slate` has *"corpse
custody (a titled body)"* in its Left, and it belongs here now — custody
is a **trade** question, not a metaphysics one.

⭐⭐ **And the conflict is free, because both halves already ship.**
Forensics wants the body **unburied** — it is evidence, and
`analyze postmortem` reads a decay curve that degrades with time. The
people who loved them want it **in the ground**. Nobody had to author
that tension; it falls out of two shipped systems pointing opposite ways,
and it is the best thing in this slate.

⚠ Terminal decay produces **remains**, which nothing models. A body
nobody claims is the default case in a game with no natural death.

---

## ⭐⭐⭐ Stage 2 — the rite, and it is the first thing in this game that is ATTENDED

**Nothing in the tree models an event people come to.** Not a wedding,
not a trial, not a festival, not a funeral. `settlement-model.md`'s
ceremony row lists *chapel · hall · burial ground · a festival* against
*"⚠⚠ nothing at all."*

⚠⚠ **So do not build a funeral system.** Build **attendance** — a thing
that happens at a place and a time, that people come to, that knows who
came — and let a funeral be its first consumer. *Name the substrate, not
its first consumer*: the wedding, the trial, the swearing-in and the
harvest festival are all waiting on the same primitive, and a funeral is
merely the one with a body in the room.

⭐ `participation_events` is the obvious substrate to check first — it is
already the quantity half of influence and already answers *who was
there, how much, decaying over time*.

⚠ **The engine measures attendance, never grief.** Same test as the
`parley` cut: it can count who stood in the room and for how long. It
cannot measure whether anybody meant it, and must not pretend to. No
mourning stat, no grief gauge, no eulogy check.

---

## ⭐⭐ Stage 3 — remembrance, and who could pay

`towns-slate.md` has the design and it is good — kept here by reference
rather than restated:

> **It is not a grave. It is a chronicle entry you can stand in front of.**

A monument commemorates **what somebody did**, not where their body is —
so a living person can have one, and *a monument to somebody who came
back is more interesting, not less*. `reembody` never reads the corpse,
so the two never contradict.

⚠ **A monument is BOUGHT.** Otherwise the place is a million identical
stones, which is literally Colma's condition and bad play. Everyone else
goes to **potter's field** — and the lesson is the sharp one: **who is
remembered is a function of who could pay.**

Two hard gaps under that:

- ⚠ **There is no `masonry` Discipline.** 62 ship across every pack and
  masonry is not among them — the consequence build gave the undertaker
  the claim, `lint:dossiers` refused it, and the claim was dropped.
  `vocations.md` lists the **monument mason** as a **GAP**.
- ⚠ **`chronicle.md` has no monument hook of any kind.** The ledger is
  append-only deeds and claims; nothing in it is physical, and *"the
  chronicle made physical"* is a phrase in two design docs with no seam
  behind it.

---

## ⭐ The money — and a burial club is the oldest insurance there is

`Tariff` already prices `burial` and the undertaker already banks it. The
open economics:

- **The coroner economy** — moved here from `mortality-slate`'s Left. Who
  is paid to handle a body nobody claims, and by whom.
- **Potter's field as the floor.** Free, undignified, and always
  available — the `passage`-floor shape applied to the body instead of
  the soul. It is what makes paying for anything else a *choice*.
- ⭐ **The burial club.** Historically the first friendly societies
  existed to bury their members; `insurance-slate` has policy-as-contract
  and the mutual, and this is its most honest first product — you pay a
  little every week against a thing that is certain and unscheduled.
- ⚠ **Not employer coverage** — that is `mortality-slate`'s
  re-embodiment vendor question, and it is about coming back, not about
  the body.

---

## ⚠ What must not happen

- **Wiring `lifespanMax`.** See above. It is the single most likely
  accident in this build.
- **A funeral system instead of an attendance primitive.** The next four
  ceremonies would each get their own, which is how a realm ends up with
  four event systems and no calendar.
- **A grief mechanic.** The engine measures presence, not feeling.
- **Mandatory rites.** `settlement-model.md` is explicit that care is *"a
  service bought, never an obligation levied"* — an unburied body may be
  a nuisance, a scandal or evidence, but it must never be a rule
  violation the engine punishes.
- **Making death sadder rather than more consequential.** The values-lens
  test is *what choice does it force*, and the answer here is clean:
  **whether to spend on the dead.** Everything that does not sharpen that
  choice is decoration.

---

## Open questions

1. ⭐⭐ **Does a shade attend their own funeral?** `requiresEmbodied`
   names *buy* among the acts a shade loses, so they cannot pay for it —
   but standing in a room is not an embodied act. This is either the best
   scene the game can produce or a category error, and it should be
   decided deliberately rather than discovered.
2. **Who has standing to bury?** Kin is the obvious answer and there is
   no kinship model — `lineage-slate` has person + household records,
   unbuilt. The fallbacks are possession, employment (your house buries
   you), or whoever pays.
3. **What happens when nobody does anything?** Terminal decay, remains,
   potter's field, or the corpse simply swept. This is the **default
   case**, not the edge case.
4. **Is the rite religious?** `altar-slate` and `faith-slate` are both
   unbuilt. A secular funeral must be possible or the build hard-depends
   on a pantheon that does not exist.
5. **Do NPC deaths produce funerals?** ⭐ `towns-slate` notes **NPCs stay
   dead**, which means the necropolis's permanent occupants are the
   named cast. Does the town notice? A missing innkeeper is a bigger
   event than a dead adventurer.
6. **Where does the rite happen** — the graveside, a chapel, the
   deceased's own house? The realm has no chapel and no hall in use.
7. **Does forensics get a custody clock?** If the body may be claimed
   immediately, the evidence tension above never bites.

---

## What this slate does NOT cover

- **Coming back** — the shade, `passage`, `reembody`, the temple-vs-clinic
  vendors, employer coverage, what diminishment IS. →
  `mortality-slate.md`. ⭐ The line: mortality is what happens to **you**;
  this is what your death costs **everyone else**.
- **The necropolis as a town** — the LULU mechanism, the sixth locality,
  the plat book, the impunity hole, and the fact that the shipped stub is
  in the wrong place. → `towns-slate.md § The necropolis`.
- **Aging and lifespans** — decided in `race.md`, deliberately inert.
  Not this build's, not any build's until succession is solved.
- **Inheritance and probate** — needs kinship and a court, and has
  neither. → `lineage-slate.md` (households), `legal-code-slate.md`.
- **The underworld** — cut with reasoning, and what it actually needs is
  a traversal gate on incorporeality. → `mortality.md § Deferred`.
- **Murder, blame and prosecution** — `accountability_events` already
  records the harm; adjudicating it is → `legal-code-slate.md`.

---

## Cross-references

- `docs/subsystems/mortality.md` — the dying arc, the corpse, the shade,
  `interIn`, and the Deferred list this slate takes two items from
- `docs/subsystems/chronicle.md` — the ledger a monument would make
  physical, and which currently has no hook for one
- `docs/subsystems/accountability.md` · `docs/subsystems/participation.md`
  — the two ledgers a death and an attendance would write to
- `docs/settlement-model.md` — § 12 ceremony as a realm-wide hole; the
  `care` need; *"Colma is a plat book"*
- `docs/vocations.md` — the **monument mason**, listed as a GAP
- `docs/slates/builds/towns-slate.md` — the necropolis as a locality
- `docs/slates/builds/mortality-slate.md` — the other half of dying
- `docs/slates/builds/insurance-slate.md` — the mutual, for the burial club
- [mortality.md § The grave](../../subsystems/mortality.md) — what
  `interIn`/`interred` actually do (⚠ the consequence plan is retired)
