# Doctrine slate — frameworks as research programmes

> **Status: sketch / pre-requirements.** The mechanics half of
> [uncertainty.md](../../uncertainty.md) Part 3 — what it actually *is*,
> as objects, to worship one god rather than another, or none. Written
> 2026-08-07 after the codex's first pass was correctly called
> aspirational: it asserted "a framework is a corpus of claims" without
> saying what a claim is, what holds it, or what a player types.
>
> **It rides [inquiry-slate.md](./inquiry-slate.md) and adds almost
> nothing.** If inquiry never ships, this doesn't either.

See also:

- [inquiry-slate.md](./inquiry-slate.md) — **the owner of the machinery.**
  The `Law` catalog, the predict gate, papers, replication, credibility.
  This slate contributes a *reading order* over that catalog and nothing
  to the catalog itself.
- [uncertainty.md](../../uncertainty.md) — the governing codex: the four
  provenances, the abstraction law, why a god may not be the RNG.
- [deduction-slate.md](./deduction-slate.md) — the shared hard line:
  **truth is shown, not argued or voted.**
- [story-bible.md](../../story-bible.md) — the patrons, the Chapel, *"you
  can't farm a god,"* deeds-as-liturgy.
- [advancement.md](../../subsystems/advancement.md) — `Discipline` /
  `DisciplineCatalogue`, the **exact object pattern** this copies.
- [discovery-slate.md](./discovery-slate.md) — the almanac, the
  authored-vs-measured split, the astrology lesson.

---

## ⚠ The error this slate exists to correct

The codex's first pass proposed that a framework is *a corpus of claims,
some true, some false, with nothing marking which* — and that authoring
the false ones as plausibly as the true ones was the central content job.

**The inquiry slate refutes that directly.** Its predict gate checks a
player's number for a novel case against the real evaluator. So:

> **You cannot publish a falsehood that survives verification.**

An authored false claim about the world dies the first time anyone runs
one prediction. Not in week three — in the first ten minutes, by one
player, permanently, for everybody. The "indistinguishable corpora" idea
was already dead on arrival in this engine and nobody had noticed.

What survives is a **split** the old draft collapsed.

---

## The split: Law vs Tenet

| | **Law** — positive | **Tenet** — normative |
|---|---|---|
| says | *what the world does* | *what matters; what is worth doing* |
| adjudicated by | **the sim**, via the predict gate | **nothing, ever** |
| can be false | yes — and it dies on verification | category error |
| owner | [inquiry-slate](./inquiry-slate.md) | this slate |

A doctrine that makes **positive** claims is picking a fight with the
evaluator and will lose — which is precisely the god-of-the-gaps failure
the codex describes, now with a build date attached.

A doctrine that makes **normative** claims makes no prediction, so
nothing can refute it. *"Tend the hurt"* is not wrong. It is not right
either. It is not that kind of sentence.

> ⭐⭐ This is the **positive/normative split the Compact course already
> grades on** ([compact-political-science.md](../../compact-political-science.md)),
> pointed at religion instead of politics. Same distinction, same reason:
> it is the line between what can be settled and what must be chosen.

**So a Doctrine is two things, and neither is a fact table:**

1. a set of **normative tenets** — prose, values, never adjudicated;
2. an **attention order over the `Law` catalog** — which questions this
   account thinks are worth asking first.

---

## ⭐⭐⭐ The mechanic: attention order, and why it is worth money

Every framework points at the **same** `Law` catalog. Laws are true; the
sim computes them. What differs between the devout and the naturalist is
**which laws they get to first.**

```
Doctrine.attends:   Law keys this account says to investigate
Doctrine.dismisses: Law keys this account says aren't worth the effort
```

Nobody is blocked. Nobody is buffed. **Nobody's outcome changes.** You
simply look somewhere else first — and order is worth real money, because
the inquiry loop already makes **the first discoverer the publisher**, and
a paper is a teachable good sold cheaper than cold discovery, carrying
credibility (a renown consumer).

> **Distinctness is not what you receive. It is what you get to first.**

This clears every bar the codex sets: no RNG, no perception bonus, no
capability grant, no outcome modifier. It is a list in a YAML file.

## ⭐⭐ Null laws — the symmetric error model

The catalog marks *"this relationship is worth investigating."* It does
**not** say whether the relationship is real. Some candidates are **null**
— the dependent quantity genuinely does not vary with the independent
one. Investigating a null law is not wasted: the predict gate refutes it,
and **a published refutation is already a first-class artifact** in the
inquiry design.

That yields two characteristic errors, one per stance, both productive:

| Stance | Characteristic error | Shape |
|---|---|---|
| **naturalist** | **false negative** — `dismisses` a law that is real, because no mechanism is available yet | gets there **last** |
| **devout** | **false positive** — `attends` a null law because doctrine says the sign matters | spends the effort, publishes a **refutation** |

Both are honest. The naturalist's failure is the actual history of
science (handwashing, drift, stones from the sky). The devout's is the
actual history of divination. **Neither stance is the right one**, which
is exactly what the propaganda test requires.

### ⭐⭐⭐⭐ And this is why there is no truth table to datamine

The codex flagged datamining as the likeliest killer. The null-law model
removes the target:

> **Nothing in the authored data says true or false. The evaluator is the
> only oracle.**

`Law` carries no `isNull` field. A doctrine's `attends` list is public
and *tells you nothing* — the only way to learn whether a candidate
relationship is real is to measure it, which is the activity. The
abstraction law is satisfied by construction.

⚠ **Honest caveat:** the source is AGPL, so a determined reader can read
the evaluator. That is true of every sim law and the inquiry design
already accepts it — the game is not defended by secrecy, and reading
source is not playing.

---

## The experience, beat by beat

A worked scene. Nothing here is new machinery except where marked ✨.

1. **The declaration.** At the Chapel you name Pan (or *seeking*, or the
   naturalist account — see below). Existing design; no verb. It writes a
   **claim**-kind `ChronicleEntry` — the chronicle's existing authored-
   prologue kind, which is exactly this shape.
2. **The inheritance.** Pan's doctrine surfaces its **tenets** (prose you
   can read back) and its **attends** list — *"the wild keeps a calendar;
   the delve answers to the moon."* You now have somewhere to go that a
   naturalist does not.
3. **The field work.** You go to the bog and `analyze` things. The
   instrument gives **this instance's numbers** — never a model. ✨ A
   `--log` flag writes the reading into your notebook.
4. **The notebook.** ✨ A `StoredDocument`, `kind: 'notebook'`, at
   `/home/<self>/notebook/<law-key>` — the document store's fourth kind
   after script and dorm, no new collection. Its `data` is the
   measurement list: `{independent, dependent, when, where}`.
5. **The gate.** Once enough readings are logged, `notebook predict
   <law>` offers the test (`PromptApi.text`). You submit a number for an
   **untested** case. The engine compares it to the evaluator within
   tolerance. This is the inquiry slate's loop verbatim.
6. **The outcome, either way.**
   - *Confirmed* → a Transcript row → Competence in the relevant
     Discipline. You now hold a law nobody has published.
   - *Refuted* → you have established the correlation is **null**, and
     that is publishable too.
7. **The publication.** `press` a paper (durable — a law does not go
   stale) or an **almanac** as a `Release` edition (perishable — it is
   about stock and timing, which move). Retail sells it; `consign` puts
   it in a shop. Credibility accrues via renown.
8. **The other side.** A naturalist reads your paper and replicates it
   cheaply — one confirming prediction. Their doctrine had `dismissed`
   the moon candidate for want of a mechanism, so **they arrive second,
   and pay you for the shortcut.** No one was punished. Somebody was
   simply first.
9. **The argument.** The wiki carries the dispute over *why* the
   correlation holds — favour or ecology. **The world never rules on
   that**, because the mechanism is exposed nowhere. Forums host the
   aftermath; they never adjudicate.

---

## Objects and interactions

### New

| Piece | Category | Home | Shape |
|---|---|---|---|
| `Doctrine` | Stuff class (leaf `Idea`) | `obj/Doctrine.ts` | **Exact `Discipline` mirror**: pure-data leaf, authored at `/obj/Doctrine/<key>`, read from `template.data`, **never cloned as live Stuff**. `key` is the durable join, not templatePath. Fields: `key`, `label`, `patron` (nullable — the naturalist account has none), `description`, `tenets: string[]`, `attends: string[]`, `dismisses: string[]` |
| `DoctrineCatalogue` | singleton `Idea` | `obj/DoctrineCatalogue.ts` | `extends PostRegistrationMixin(Idea)`, `/obj/DoctrineCatalogue`, warms a `Map<key, DoctrineDescriptor>` in `postRegister` by scanning templates. `TopicCatalogue`/`DisciplineCatalogue` shape exactly |
| seeds | Command/data YAML | `seeds/obj/Doctrine/<key>.yaml` | `class: /obj/Doctrine` + `hydratorClass: /obj/persistence/PersistentHydrator` + `data:` |
| notebook | **not a class** | `documents` collection | `StoredDocument`, `kind: 'notebook'` |
| `notebook` verb | Command YAML + controller | `cmd/perception/notebook.yaml` ⚠ category open | subcommands: bare (list), `<law>` (readings), `predict <law>` |
| `analyze --log` | flag on an existing view | `cmd/perception/analyze.yaml` | writes the reading; no new verb |

### Reused unchanged

`Law` + the predict gate + papers + replication + credibility (inquiry) ·
`StoredDocument` (document store) · `ChronicleEntry` kind `claim`
(chronicle) · `Transcript` + `Discipline` + Competence (advancement) ·
`press` Releases · `buy`/`consign` (retail) · `wiki` + `forum` ·
`PromptApi.text` · the Chapel.

### New collections

**None.**

### New Apis

**None.** `DoctrineCatalogue` follows the `WikiRegistry` precedent — a
gated, state-owning singleton with no `Api` face.

---

---

# Worked examples — the actual classes and the actual values

Everything below is written against the **shipped** `obj/Discipline.ts` /
`obj/DisciplineCatalogue.ts` pattern, read 2026-08-11. Where a value
depends on something unbuilt it is marked ⏳.

## `obj/Doctrine.ts`

```ts
import { Idea } from "../lib/stuff/Idea";
import { TemplatePathPrefixes } from "../lib/paths";
import type { FieldMeta } from "../lib/mixin";

/**
 * The runtime descriptor the catalogue caches — a plain projection of a
 * Doctrine template's `data`, the shape consumers read (never the Stuff
 * instance). Mirrors `DisciplineDescriptor`.
 */
export interface DoctrineDescriptor {
  key: string;
  label: string;
  /** Patron key, or `''` for an account with no patron (the naturalist). */
  patron: string;
  description: string;
  tenets: string[];
  attends: string[];
  dismisses: string[];
}

export default class Doctrine extends Idea {
  /** Per-instance template path prefix: `/obj/Doctrine/<key>`. */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.doctrine;

  /** Durable join key (e.g. `'pan'`). Non-empty. */
  public key: string = "";
  /** Friendly display label (e.g. `'The Wild Calendar'`). Non-empty. */
  public label: string = "";
  /** Patron key; `''` when the account names no patron. */
  public patron: string = "";
  /** Authored prose — what this account says the world is like. */
  public description: string = "";
  /**
   * Normative lines. **Never adjudicated** — these make no prediction, so
   * nothing can refute them. The positive/normative split is the whole
   * design; a tenet that asserts a fact about the world belongs in the
   * `Law` catalog instead, where the sim will settle it.
   */
  public tenets: string[] = [];
  /** `Law` keys this account says are worth investigating. */
  public attends: string[] = [];
  /** `Law` keys this account says are not worth the effort. */
  public dismisses: string[] = [];

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    label: { persistent: true },
    patron: { persistent: true },
    description: { persistent: true },
    tenets: { persistent: true },
    attends: { persistent: true },
    dismisses: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Doctrine.key must be a non-empty string");
    }
    this.key = value;
  }

  public getPatron(): string {
    return this.patron;
  }
  /** `''` is legal — it is what makes the naturalist account a Doctrine. */
  public setPatron(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Doctrine.patron must be a string");
    }
    this.patron = value;
  }

  public getTenets(): string[] {
    return [...this.tenets];
  }
  public getAttends(): string[] {
    return [...this.attends];
  }
  public getDismisses(): string[] {
    return [...this.dismisses];
  }

  // …label / description accessors follow Discipline.ts verbatim.
}
```

**One line in `lib/paths.ts`:**

```ts
  doctrine: "/obj/Doctrine/",
```

`obj/DoctrineCatalogue.ts` is `DisciplineCatalogue` with the nouns
swapped: `private cache: Map<string, DoctrineDescriptor> | null = null`,
warmed in `postRegister` by scanning `/obj/Doctrine/*` templates,
`getDoctrine(key)`, `has(key)`, `allDoctrines()`, `invalidateCache()`,
plus the `canDestruct` / `canEvict` singleton refusals.

## The three `Law` rows the example turns on

⚠ **`Law` is [inquiry](./inquiry-slate.md)'s object, not this slate's** —
shown only so the Doctrine values resolve. Note there is **no `isNull`
field**: the evaluator is the only oracle.

```yaml
# seeds/obj/Law/growth-vs-moon.yaml   ← NULL, and shipped-checkable today
class: /obj/Law
hydratorClass: /obj/persistence/PersistentHydrator
data:
  key: growth-vs-moon
  label: Lunar planting
  question: Does a plant grow faster when sown at a particular moon phase?
  independent: moon-phase        # CelestialApi — real, shipped
  dependent: growth-rate         # GrowingMixin reconcile — real, shipped
  tolerance: 0.05
  evidentialRange: [0, 1]        # full synodic cycle
  realWorldAnalog: null
```

> ⭐ **This one is genuinely flat in our sim, and not by fiat.**
> `lib/husbandry/Growing.ts` computes growth by Liebig's law of the
> minimum over `LimitingFactor = water | light | root | nutrient`. Moon
> phase is not an input, so the relationship really is null — and it is
> null for a *reason a player can eventually articulate*, which is the
> difference between a lesson and a trick.

```yaml
# seeds/obj/Law/deposition-vs-moon.yaml   ← REAL ⏳ (needs discovery-slate's stock model)
data:
  key: deposition-vs-moon
  label: The full-moon leavings
  question: Is more left behind in wild places at the full moon?
  independent: moon-phase
  dependent: deposition-rate     # ⏳ discovery-slate stock inflow
  tolerance: 0.10
  evidentialRange: [0, 1]
  realWorldAnalog: null
```

```yaml
# seeds/obj/Law/cooling-vs-tau.yaml   ← REAL, shipped today
data:
  key: cooling-vs-tau
  label: Newton's cooling
  question: How does a hot thing's temperature fall toward its surroundings?
  independent: elapsed-time
  dependent: temperature
  tolerance: 0.02
  evidentialRange: [0, 3600]     # seconds; supported to one hour
  realWorldAnalog: "PHYS.THERMO.NEWTON_COOLING"
```

> `lib/thermal/Thermal.ts` really computes
> `T = T_ambient + (T₀ − T_ambient)·e^(−t/τ)`. A player who fits an
> exponential to five thermometer readings and predicts minute six has
> discovered a real law by real method.

## Two Doctrines, with real values

```yaml
# seeds/obj/Doctrine/pan.yaml
class: /obj/Doctrine
hydratorClass: /obj/persistence/PersistentHydrator
data:
  key: pan
  label: The Wild Calendar
  patron: pan
  description: >-
    The wild is not disorder; it is an order kept by a clock older than
    any of ours. Watch the sky and you will know the ground.
  tenets:
    - What is wild is owed the same courtesy as what is tame.
    - Take at the season's pace, never at your own.
    - A place you have not visited in every season, you have not seen.
  attends:
    - deposition-vs-moon      # true  ⏳ — Pan gets here first
    - growth-vs-moon          # NULL  — Pan spends a week and publishes a refutation
  dismisses:
    - cooling-vs-tau          # "the hearth is a craftsman's question, not ours"
```

```yaml
# seeds/obj/Doctrine/naturalist.yaml
data:
  key: naturalist
  label: The Naturalist Account
  patron: ""                  # ← the one nullable field that makes atheism a position
  description: >-
    The world keeps no secrets, only unopened ones. What repeats can be
    measured; what cannot be measured has not yet been approached
    correctly.
  tenets:
    - Prefer the evidence to the authority, including this one.
    - A correlation without a mechanism is a coincidence until shown otherwise.
    - Publish the failures; they cost the same to find.
  attends:
    - cooling-vs-tau          # true, shipped — the naturalist gets here first
  dismisses:
    - growth-vs-moon          # ✅ RIGHT — it really is null
    - deposition-vs-moon      # ❌ WRONG — it is real; arrives second and pays for the paper
```

> ⭐⭐⭐ **The whole design is in those last two lines.** The naturalist's
> heuristic — *no mechanism, no law* — is **correct about
> `growth-vs-moon` and wrong about `deposition-vs-moon`**, and from
> outside the two are indistinguishable: same independent quantity, same
> shape of claim, same smell of superstition. One is Liebig's law
> refusing to care about the sky; the other is ecology wearing an omen's
> clothes. **Nobody is punished. One of them is simply later.**

## The notebook, mid-experiment

`StoredDocument`, no new collection:

```json
{
  "path": "/home/kestrel/notebook/growth-vs-moon",
  "owner": "/obj/Avatar/kestrel",
  "kind": "notebook",
  "data": {
    "law": "growth-vs-moon",
    "readings": [
      { "independent": 0.00, "dependent": 1.02,
        "when": 774400, "where": "/domain/hinkley-hills/bed-3" },
      { "independent": 0.25, "dependent": 0.98,
        "when": 861600, "where": "/domain/hinkley-hills/bed-3" },
      { "independent": 0.50, "dependent": 1.01,
        "when": 948800, "where": "/domain/hinkley-hills/bed-3" },
      { "independent": 0.75, "dependent": 0.99,
        "when": 1036000, "where": "/domain/hinkley-hills/bed-3" }
    ],
    "predictions": [
      { "independent": 1.00, "submitted": 1.40,
        "actual": 1.00, "tolerance": 0.05, "outcome": "refuted" }
    ]
  }
}
```

Kestrel expected the full moon to lift growth 40%. It didn't move. **That
row is the entire lesson**, and it is a publishable result.

## What lands in the Transcript

```
{ owner: "/obj/Avatar/kestrel", kind: "deed", when: 1036000,
  discipline: "natural-philosophy", difficulty: "moderate",
  outcome: "success", tags: ["inquiry", "refutation", "growth-vs-moon"] }
```

⭐ **`outcome: "success"`** — the prediction was wrong and the *inquiry*
succeeded. Refuting a null law is competent practice, and grading it as
success is what stops the system teaching players to only test things
they expect to win.

## ⚠ The one genuinely open structural question

**How does a `Law` row point at its evaluator?** A data Idea holds
scalars; the evaluator is code. Two candidates, and per the
`CLAUDE.md` rule against inventing module categories **this needs
sign-off before either is built**:

1. **A path-resolved module**, the `lib/behavior/<verb>.ts` brain
   precedent — `lib/inquiry/laws/<key>.ts`, sole export `law`, statics
   `independentOf` / `dependentOf`. Real existing pattern, but it is a
   *second* instance of a category the taxonomy currently grants once.
2. **An Api-method reference string**, the `FromModule` shape —
   `evaluator: "/api/husbandry#HusbandryApi.growthRateFor"`. Invents no
   module category, but does invent an addressing scheme and a dispatch.

Lean: (1), because a law evaluator genuinely is a stateless
strategy module and the brain precedent already solved HMR for exactly
that shape. **Ask first.**

---

## Atheism as a first-class Doctrine

The naturalist account is **a `Doctrine` row with `patron: null`** — same
object, same fields, same mechanic. It has tenets (*evidence over
authority; a correlation without a mechanism is a coincidence until shown
otherwise*), an `attends` list, and a `dismisses` list that is its
characteristic weakness.

That single design choice is what makes atheism a position rather than
the null option, and it costs one nullable field.

⚠ **The naturalist `dismisses` list must contain real laws.** If the
naturalist is never wrong, the game is a tract and fails its own
propaganda test.

---

## Open questions / where it dies

1. ⚠⚠⚠ **The whole mechanic is worth exactly what being first is worth.**
   Attention order only matters if publication priority carries real
   value — which depends on credibility (renown), the teachable-good
   price gap, and almanac staleness. **All three are designed, none
   built.** If being first is worth little, doctrine is cosmetic and
   players will correctly say so. *This is the load-bearing dependency
   and it is not on this slate.*
2. ⚠⚠ **`Law`-catalog authoring cost**, inherited from inquiry — plus
   this slate adds the null candidates, which must be **plausible enough
   to be worth investigating.** A transparently silly null law teaches
   nothing.
3. ⚠ **Normative tenets do nothing mechanically, by construction.** The
   only thing that reads them is the deeds-as-liturgy tie-in (chronicle →
   the deferred regard/alignment readouts). Until those land, a tenet is
   prose. *Is that enough for v1?* Lean: yes — the attends mechanic
   carries the build, tenets carry the fiction.
4. **Verb category for `notebook`** — `perception` (it records
   observations) vs `shell` (it is a personal document). Unresolved.
5. **Is the notebook a document or an object?** A `StoredDocument` is the
   cheap correct v1. The **second variant** is a physical journal — an
   ordinary Stuff you can lose, sell, inherit, or steal, making field
   data an *asset* and tying into chattel. Cooler, and it makes the
   almanac trade physical. Deferred, not rejected.
6. **Does a player see their own `attends` list as a list?** Showing it
   raw is a quest-marker smell. Better as **NPC and doctrinal prose that
   points somewhere** — the discovery slate's *"the in-world face of a
   deliberate bias is somebody who knows about it."*
7. **Can you hold two doctrines, or change one?** The Chapel already
   supports re-declaring. Whether prior attention persists (you keep what
   you learned — obviously yes) and whether a switch is socially costly
   (chronicle-visible) is undesigned.
