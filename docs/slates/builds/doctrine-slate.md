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
