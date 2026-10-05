# Object taxonomy slate — naming the compositions, and what a non-wizard may mint

> **Status: UNBUILT, and three of its pieces already ship.** Shipped:
> `Blueprint.signatureFromParts` (⭐ the collapse rule, already
> order-insensitive), the `blueprints` catalogue + dedup index, the
> Studio's three creation acts, `authorable` field metadata, and
> `commandContributions` as **the one record of verb affordances**.
> **Left:** the signature's verb-awareness · the collapse census ·
> blueprint-as-`gen:`-output · the non-wizard composition mint + its
> namespace lint · the categorical-validator classification + affordance
> suppression · template-level subtraction · the `/stuff` naming committee
> **Size:** ⭐ **a tail** for the signature fix + census; **a build** for
> the mint and the subtraction.

**Captured 2026-10-04**, out of the wizardry-curriculum thread, when the
curriculum question *"what do you actually have to know to make a thing"*
ran into the question of **who gets to name the kinds**.

> **User: "the one thing that is important to me is that these things get
> named and name collisions get sorted out by interested parties. like
> there's many different ways to compose the mixins, more combinations
> than we have names to afford them."**

---

## 1. The problem, stated properly

**178** registry mixins over a handful of bases is a combinatorial space
far larger than the set of English nouns anyone would accept. **467 files**
already carry a composition expression. Left alone, every new kind of
thing is a new class, and the taxonomy grows without bound and without an
owner.

It decomposes into three, and **two of the three dissolve.**

## 2. ⭐⭐ Order-variance: the collapse rule is already the shipped dedup key

> **User: "some things we can collapse like two subclasses with the same
> mixin comp in different priority order. this almost always doesn't
> manifest any functional difference and two classes can be collapsed into
> one."**

Correct, and it is already implemented. `lib/studio/Blueprint.ts`:

```ts
static signatureFromParts(baseClass: string, mixinNames: readonly string[]) {
  const mixins = [...new Set(mixinNames)].sort().join(',');
  return `${baseClass}|${mixins}`;
}
```

⭐ **Set-based, sorted, deduped** — so two classes with the same mixins in
different priority order *already* collide, and `BlueprintCatalogue`
already indexes by it (`findBySignature`, dedup on signature, drift-safe
on id). `signatureOf(ctor)` computes the same thing from a live
constructor via `MixinApi.queryMixins`.

**What does not exist is the census over shipped classes**, and it is one
boot away: `rebuild()` already walks the class-source table to derive its
147 skeletons, so *two distinct backing classes sharing one signature* is
a report, not a research project.

⚠ **The honest residual on order:** it matters only when **two mixins in
the set declare the same member name**, because then the outer shadows the
inner. That is computable from the registry. ⭐ **So: collapse by set, and
flag as genuinely distinct only the sets carrying a member-name
conflict** — census-then-ratchet, per
[lint-family.md](../../lint-family.md).

## 3. ⚠ The defect the probe actually found: the signature is verb-blind

`signatureFromParts` keys on **base + mixin set and nothing else.** But
[command-routing.md](../../subsystems/command-routing.md) is explicit that
`static commandContributions` is **the one record of what an object
affords**, which is the closest thing the engine has to a record of what a
thing *does*.

Measured consequence — `AudibleMixin(Tool)` appears **six times**:
`PrescriptionPad`, `Splint`, `SurgicalKit`, `Syringe`, `SutureKit`,
`Whetstone`. Each is 18–37 lines and structurally identical:

```ts
const SutureKitBase = AudibleMixin(Tool);
export default class SutureKit extends SutureKitBase {
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/medical/suture.yaml'],
  };
  public override capabilities: string[] = ['suture'];
}
```

Six genuinely different kinds share **one signature**, `rebuild()` dedups
them into one blueprint, and the Studio's *"exact match — use it?"* will
tell an author building a whetstone that they have built a suture kit.

> ⭐⭐⭐ **The fix is to the signature, not to the classes: include the
> afforded verb set.** If verb affordance is the one record of what an
> object does, two things that do different things are not structurally
> identical, and the dedup is currently lying.

⚠ Note what this is *not*: the six are **not sprawl**. They are six
distinct workings, correctly expressed (§ 6).

## 4. ⭐ Blueprint as a `gen:` output — tracked vs derived, not static vs dynamic

> **User: "why not just write the class… the only difference really is
> whether it goes into git which I guess it doesn't need to do until
> someone actually wants to make edits outside of the mixin comp."**

Adopted, over an earlier proposal of mine to resolve compositions at
runtime. A composition-only class is **regenerable from `(base, mixin
set)`**, so it is a generated artifact with a do-not-edit banner — exactly
the shipped pattern for `Collections` / `COLLECTION_POLICIES` /
`RESET_DISPOSITIONS`, generated from the schema YAML by `pnpm gen:schema`
and gated by `lint:schema`.

⭐ **And it gives ownership a free signal: the file graduates into git the
moment a human edits it past the composition, and that edit IS the
handoff to a wizard.** No policy; the diff is the policy.

⚠ **The wrinkle: the composition must be tracked even when the class is
not**, or a deploy rebuilding from git loses the class. The blueprint row
is the source of truth and the `.ts` is cache with a file extension —
which is already literally what `blueprints` is (⚠ a persisted cache whose
only reader re-derives it, flagged a deletion candidate for that reason;
see [studio.md](../../subsystems/studio.md)).

## 5. What a non-wizard may mint

The Studio already has **three creation acts**, and act 2 is already
author-tier on the stated reasoning that *a pointer to trusted code is not
untrusted code*:

1. **Instantiate** a template — author-tier.
2. **Publish a composition of approved classes** (`publishBlueprint`) —
   **author-tier already**.
3. **Mint a new backing class** (`scaffoldClass` → `commitClass`) —
   wizard-gated.

⭐⭐⭐ **Act 3's gate is an artifact of the representation, not a trust
decision.** The doc says it: *"There is no runtime dynamic compose — a
backing class is always a static TS module"*, so minting a composition
means writing source. Meanwhile the justification is **already recorded as
wrong** ([access.md](../../subsystems/access.md) § *The justification below
is WRONG for `class`*, reviewer 2026-10-02): the gate refuses a class five
hundred rows already name; `extends:` reaches the identical outcome with
one hop; and `lint:instanceable` already makes the *you may use this*
declaration structurally and author-independently.

⚠ And it has a shipped dead end: **a protowizard — exactly who the Studio
is for — cannot use the Studio at all**, because template-create requires
a `classPath` and the code-field gate refuses `class` on every non-wizard
create.

> **So: a non-wizard may mint a composition class.** `extends <approved
> base>` + a mixin set + `capabilities` + `commandContributions` naming
> **views that already exist and are already published**. It points at
> trusted code twice and adds nothing. Cloning, not naming, is the
> privileged act — and that seam is already designed as **a static veto on
> the class**, the `canDestruct`/`canEvict` pattern, asked of the acting
> author. ⛔ Whatever lands there is a seat, a title or an
> `AccessApi.can` — **never a new `isWizard` check.**

⚠ **One structural guard, lintable rather than trust-based.** The
affordance removal note records a cross-pack property worth keeping:
*each pack's classes name only its own views, so the kernel can never name
a trade's verb.* A class minted in `/stuff` naming
`trade/medicine/cmd/medical/suture.yaml` reopens that leak. So: **a class
may name views only from its own namespace root or the platform's** —
same shape as `lint:imports` and `lint:instanceable`.

## 6. ⛔ Verb affordance stays on the class — this was already decided

An earlier pass here proposed making `commandContributions` authorable
from a row. ⛔ **Wrong: that form shipped and was removed.**
`getInstanceContributions()` existed as an `InstanceContributor` seam and
`ToolMixin` read a tool's verbs off `capabilities[].verbs`. Both are gone,
for five reasons — and one is precisely the failure the proposal would
have reintroduced:

> **It drifted, exactly as a duplicated fact does.** The shaker and the
> mixing glass each carried the identical six-verb list `pour stir strain
> garnish serve mix` — **the BAR's verb set, not the shaker's** — because
> those were the two rows with a `capabilities` block to hang a list on.
> **The stations that host the work afforded nothing.**

Plus: two records of one fact with no rule for choosing; two vocabularies
(`placement: reachable|carried` against `environment`/`peers`/`self`/
`inventory`, unable to express the last two at all); a try/catch-swallowed
hot-path hook, so a throwing host silently afforded nothing; and the
client must reason about how verbs are afforded, which it cannot do for a
set that varies with authored data it cannot see.

⭐ **And the resolution is already written in the user's own terms:**

> *"Where per-instance variation was real, it was a class all along: an
> instrument that performs a distinct working is a distinct kind of thing,
> and a capability pack ships classes."*

⭐⭐ **Also already doctrine: afford statically, decline diegetically.** A
broken anvil keeps affording `hammer` and the controller declines on the
capability; every `Behaved` host affords `talk` and `TalkController`
answers *"<npc> has nothing to say."* *Trying and being told is
discoverable; a verb that is simply absent teaches nothing* — the same
principle as `verb-conferral-retired`'s **the refusal is the progression
UI**. And the feedback surface already ships: a disabled verb renders
dimmed in the radial with **the validator's verbatim reason**, *never a
paraphrase: the reason is the teaching.*

> ⭐ **Worth recording as a signal about teachability:** both of those were
> re-derived from first principles in conversation, against a wrong
> proposal, without reading the doc. That is lens 1's own *is the world
> derivable* test passing on the architecture itself — and the argument
> for a course that teaches the principles and lets the catalogue be
> looked up.

### ⭐ Why verbs are content and not code, since it keeps coming up

**The view is content; the controller is code; and that split is already
right.** `suture.yaml` is pure declaration — verbs, controller path, help
prose, three validators, and args with scopes and an MQL default
`"me:i:[capability.suture]"`. No behaviour. The controller decides, so it
is TypeScript.

**The binding is a third thing and it is neither:** a statement by a kind
about what kind it is. Which is why the one record belongs on the class.
The verb already declares what it **needs** (by capability, in MQL); the
object declares what it **is** (`capabilities`, already
`authorable: true` in `ToolMixin`'s `fieldMeta`).

## 7. ⭐⭐⭐ The subtraction asymmetry

> **User: "maybe specific stuff templates might want to remove verb
> affordances entirely rather than just have validation fail them… but
> never adding new verbs that can only be done by the declaring class."**

**Sound, and for a structural reason rather than a taste one.**
Subtraction reopens **none** of § 6's five reasons: the class's static
stays the complete **upper bound**, so there is still one record and the
client's model stays derivable (*the class's set, minus a declared
subtraction*). Nothing can grow — the shaker could never acquire the bar's
six verbs by subtraction. And it is namespace-safe by construction, since
you can only subtract what the class already names, which **retires § 5's
guard for this case**. Addition is the only direction that can grow a
second record.

⭐ **And the evidence is already in the doc.** The radial caps refusals at
three per quadrant with `+N more refused` because *"uncapped, a common
object produced a scrolling wall of ~40 verbs, which buries the afforded
ones the menu exists to show."* **That cap is treating a symptom.** And
its own examples of dimmed refusals are category errors, not state: *"a
public noticeboard isn't alive"*, *"you can't change posture on a public
noticeboard."* Nobody needed to learn either.

### The line

> ⛔ **Never subtract a verb whose refusal is the progression UI.** The
> discriminator is **what the refusal would teach** — a category error
> teaches nothing; a refusal naming a **state, a competence, a seat or a
> title** *is* the teaching, and the verb must exist so you can be told.

### ⭐⭐⭐ And it is derivable, not a judgment per row

The refusal comes from a **validator**; validators are file-based; there
are **35** of them; and a validator already carries declaration metadata
(`requiresAnimate` is a function with `preload` riding an `Object.assign`
beside it), so a classification has an obvious home and needs no new
machinery.

| validator, against a noticeboard | categorical? |
|---|---|
| `requiresAnimate` | ⭐ **yes** — a noticeboard will not become alive |
| `requiresConscious` | **no** — you wake up |
| `requiresEmbodied` | **no** — `reembody` exists; the shade is a designed state |

> **Then the engine suppresses the affordance automatically when the
> refusing validator is categorical for that host**, and the ~40-verb wall
> collapses with nobody touching a template. The cap stops being
> load-bearing.

⭐ Which leaves **template-level subtraction as a small escape hatch** for
the residue — a kind categorically wrong in a way no validator can see —
rather than the primary mechanism. Better split: the frequent case is
automatic and uniform, and authors reach for the hatch only when they
genuinely know something the engine does not.

### Four guards on the hatch

1. **A property of the kind, not the instance** — template-level. Per-
   instance variance breaks the radial's fixed geometry, which exists for
   muscle memory across objects.
2. ⚠ **Two templates of one class subtracting differently destabilises
   what the class means.** Much milder than the old drift (the upper bound
   is still one record) but it wants a census: *N classes have templates
   that disagree about their own verb set.*
3. ⛔ **A subtraction may not hide.** The radial already deletes verbs the
   viewer is not entitled to know about — *filtering means DELETION,
   because a response that admits a hidden verb exists leaks that it
   exists* — and that is a **perception** decision. An author's
   subtraction must never be able to impersonate one, is never
   viewer-dependent, and cannot reach `look` or the honest-state set.
4. ⭐ **It stays in the record.** The class gives the upper bound, the row
   gives the subtraction, and nothing anywhere else — preserving the thing
   the removal protected (one place to look) rather than restoring two.

⭐ **"Never add" gets cheaper to hold**, because most of what anyone wanted
from adding was *fewer wrong verbs*, which the subtraction half delivers.

## 8. The residue is a category problem, and it has an owner

After order-collapse (§ 2) and after the class-is-not-the-noun rule, what
remains is genuinely lens 4: **no derivable answer, and it must be decided
anyway.**

- ⭐⭐⭐ **Synonymy dissolves.** A flask, a vial and a phial are **one
  composition and three rows**; `NounPhrase` + keywords carry the name.
  ⚠ In EotL one noun was one file — **19,703 room files**, because the
  file *was* the object — and an author bringing that reflex mints a class
  per noun. *Your idea is almost always a row.*
- **The real residual:** a genuinely new capability set needs a name, and
  nothing derives it.

⭐⭐ **And the machinery for "interested parties" exists.** By the
five-axis rule `/stuff` is *the commons — materials, ideas, objects*,
which is exactly the contested namespace. A namespace is a parcel, title
is the only real power, `subdivide` ships, and review rides forums. So
**`/stuff` is the first parcel whose committee's actual job is naming** —
a better proving ground than the client committee, because the disputes
are frequent, low-stakes, and legible to anyone who can read two rows.

> ⭐ **And there is a closing window.** `no-migrations-ever` means a
> rename is a DROP today and a real migration once there are players.
> **Collapse aggressively now** — the cost of this decision is
> monotonically increasing and is currently zero.

⭐ **Reuse is the honest metric for a good category**, and the mint ledger
already tracks who instantiated whose — so *did anybody build on your
kind* is measurable, which is the same reception signal the competence
band wants.

## 9. The lens pass

**⭐⭐ 1 — pedagogy.** Categorisation is a real, teachable, transferable
skill, and here it is graded by whether anyone reused the category.

**⭐⭐⭐ 2 — expression.** The whole point: the ceiling on a non-wizard
rises from *rows* to *rows and kinds*, and the bottleneck on the object
taxonomy stops being a person.

**⚠ 3a — immersion.** Unaffected, with one exception: § 7's guard 3. A
subtraction that could hide is an immersion weapon.

**⭐ 3b — participation.** A naming committee is a polity doing something
we did not script, over stakes small enough to practise on.

**⭐⭐ 4 — values.** Lens 4's own shape — a gauge (the signature) converts
*are these the same kind?* into something calculable, and ⚠ § 3 is the
warning that a gauge measuring the wrong thing is worse than none.

**⭐ 5 — continuity.** A generated class is epoch-proof in the only sense
that matters: regenerate it.

**6 — economy.** Minor. Cheaper kinds, more of them.

**⭐⭐ 7 — governance.** It judges **work**, not a person, so it is the
easy kind — but the appeal still has to exist when a committee refuses
your name.

## 10. Open questions

1. ⭐⭐⭐ **Make the signature verb-aware** (§ 3). Small, and the dedup is
   lying until it is done.
2. **Run the collapse census** (§ 2). ⭐ Lean: make it the course's first
   real assignment — *find two classes that are the same class* needs no
   programming and produces a merge.
3. **Does blueprint-instancing land before the first course, or does the
   course drive the requirement?** ⭐ Lean the second: the students' own
   blocked ideas are the best census of which compositions are missing.
4. ⚠ **Who classifies the 35 validators**, and is `categorical` a property
   of the validator alone or of (validator × host kind)? The noticeboard
   case suggests the pair, which is more expressive and more work.
5. **Does the `/stuff` committee get a conviction budget** rather than a
   vote count? A naming dispute is the archetypal case for scarce,
   reallocatable conviction.
6. ⚠ **What happens to a row when its class is collapsed away?**
   Today: free. After players: a migration we have sworn off.

## Cross-refs

- [wizardry-curriculum-slate.md](./wizardry-curriculum-slate.md) — the
  curriculum half; § 5 there is this slate's § 8 taught.
- [../../subsystems/command-routing.md](../../subsystems/command-routing.md)
  — ⛔ the one record of verb affordances, the five removal reasons, the
  radial's refusal rendering.
- [../../subsystems/studio.md](../../subsystems/studio.md) — the three
  creation acts, the signature, the blueprint cache, and the
  protowizard-cannot-reach-the-form gap.
- [../../subsystems/access.md](../../subsystems/access.md) — the
  code-trust lockdown and the recorded refutation of its `class` arm.
- [../../subsystems/mixins.md](../../subsystems/mixins.md) — composition
  order, `_mixinName`, pack mixin registration.
- [../../lint-family.md](../../lint-family.md) — census-then-ratchet.
- [cms-slate.md](./cms-slate.md) +
  [authoring-intelligence-slate.md](./authoring-intelligence-slate.md) —
  the two catalogues the Studio was the first build of.
