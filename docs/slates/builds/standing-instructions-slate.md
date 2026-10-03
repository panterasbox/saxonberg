# Standing instructions — may a player automate labour at all?

**Status:** design question, unopened. **Left:** the whole of it.
**Size:** unknown until the first question is answered, because a *no*
is a legitimate and cheap answer.

⭐⭐⭐ **This slate exists because a build answered a question it had no
business answering.** The taps build (2026-10-01) shipped
`instruct keep <line>` + a `keeps` brain as W4 — offline automation,
decided inside a build about tapping trees for maple syrup — and it was
cut before the MR merged. The code is in the branch history
(`0598b2d42`, `27e25fb49`, `3143fdf96` on `design/2026-09-30-tapping`)
and **should be read as a prototype of one shape, not as a proposal.**

## The question, in order

**1. Should players be able to automate labour at all?** ⛔ Answer this
first and on its own. Everything below is moot if the answer is no, and
*no* is cheap: the cost is that some obligations stay unrelieved, which
is a statement about the game rather than a defect.

**2. If yes — what makes it not an idle game?** The genre smell is
real. Offline progression is the mechanic that converts a game about
doing things into a game about configuring things.

**3. If yes — how does it sit with the lenses?** Each of these is a
genuine open question and none of them was asked:

| lens | the question nobody asked |
|---|---|
| **1 pedagogy** | What Discipline does an absent body exercise? If the answer is *none*, automated labour is time that buys goods and teaches nothing — and the platform's whole claim is that the activity is the lesson. ⚠ This is the strongest argument against. |
| **2 creative expression** | Is the ordinary case codeless? A per-verb opt-in made it an author's chore; see *The mechanism finding* below. |
| **3a immersion** | A body that works with nobody home is a body the fiction has to explain. |
| **3b participation** | ⭐ Does it make the economy's blacksmith-shaped hole *less* player-shaped? An obligation somebody must discharge is exactly the kind of hole another player can fill — and automation fills it with nobody. |
| **4 values** | It forces a choice: *attend, pay somebody, or automate*. Automation that is strictly cheapest deletes the other two limbs. |
| **5 continuity** | Does the capability survive the epoch? A medieval cowhand and an industrial milking parlour are the same affordance at different costs, which is a point in favour. |
| **6 economy** | ⚠ **What does it consume?** W4's version consumed nothing — it was free labour. A relief that costs nothing is a yield multiplier wearing a convenience hat. |
| **7 governance** | None obviously. |

**4. If yes — is automation even the right relief?** The requirements
that led here named **two** reliefs and the build implemented the
easier one: *"standing instructions, or somebody you pay."* ⭐ **Paying
somebody is the better answer on almost every lens above** — it
exercises a Discipline (somebody's), it is a real economic transaction,
it fills the participation hole with a *person*, and it preserves the
values fork. The employment substrate, shifts and wages already exist.
⚠ The reason the build took the automation limb is not recorded, which
is itself the finding.

## ⛔⛔ The doctrine it has to clear first

[[absent-body-doctrine]] is a standing ruling and W4 contradicted it:

> **Automate ONLY the autonomic** (what any body does unattended —
> reflex), **NEVER the strategic** (what a mind chooses — intent).
> Reflex is real, **strategy-by-proxy is faking.** Test: *"would the
> body do this regardless of what the player wanted?"* …the absent body
> holds **LESS than an NPC brain** — reuse combat poise/guard, **not a
> decision agent.**

Milking a named cow into a named pail fails that test outright, and W4
gave a player body an actual NPC brain (`BehavedMixin` on
`lib/character/Avatar`, `cadence:600s`).

⭐ The one real counter-argument, recorded so it is not lost: the
doctrine's primary concern is *never adjudicate intent*, and a standing
instruction does not adjudicate anything — the player declared it
while present. But the doctrine's second clause is about **honesty**,
not adjudication, and a declared order is still strategy-by-proxy. Any
proposal must engage that clause rather than cite the first one.

## ⚠ The mechanism finding, which outlives the policy

Worth keeping whatever is decided about the feature:

W4 took a **greedy free-form command line** and replayed it through
`forceCommand`. That means the brain could issue *any verb in the game*
(`instruct keep sell the fleece`, `… buy an auger`, `… attack the
guard`), so it needed a per-verb allowlist — which became a new
`standing?: boolean` field on `CommandView`, mirrored onto
`CommandDefinition` and `command.schema.json`: a 13th field on a
598-view systemic schema, used by 5 views.

⭐⭐ **That field was a filter invented to re-narrow an input accepted
too wide.** A design that takes a **target** and lets the engine
construct the take from the tap (`TapSpec` on the species already
carries everything needed) requires no allowlist anywhere — a sale is
unreachable by construction rather than by a boolean somebody
remembered to set.

⚠ And the declaration proved exactly as forgettable as the list it was
chosen over: there are **five** `TapActController` subclasses and W4
set the flag on **four**, silently omitting `shear`. The justification
in the commit message — *"a list is a thing somebody forgets to edit"* —
was wrong twice over, since a list fails closed too.

⚠ The constraint that pushed it out of the kernel is real and any
future design has to answer it: three of the five takes are
**pack-owned** (`rob` apiculture, `tap` forestry, `milk`/`gather`
ranching), and [[pack-vs-realm-boundary]] forbids a pack needing a
kernel list edit. The clean shape — a static on `TapActController`,
inherited by all five — is blocked on a verb→controller-class lookup
that does not exist (`ModuleApi.lookup` is class→id with no reverse
index).

## What the cut cost

**Acceptance criterion 7 of the taps requirements is UNMET** and
recorded as unmet in `taps.md § The relief` and in the drive, which now
asserts `instruct` is **absent**. The dairy cow's attendance cost is
unrelieved: the feedback law says milk has nothing to decide at the act,
so what the player trades is attendance against her rate, and nothing
discharges it today.

## Cross-references

- `docs/subsystems/taps.md` § The relief — the cut, and milk's open question
- `docs/subsystems/ranching.md` — the dairy cow's attendance cost
- `docs/subsystems/behavior.md` — brains, cadence, `BehavedMixin`
- `docs/subsystems/employment.md` — ⭐ the *pay somebody* limb, already built
- `docs/slates/tails/absent-body-slate.md` — the doctrine this must clear
- `docs/slates/builds/tapping-slate.md` — names the relief as specified-and-unshipped
