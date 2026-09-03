# Api normalization slate — a measured baseline for the layer

**Captured 2026-09-02**, immediately after the **Api OO sweep** landed
(waves A–G). A preliminary two-axis pass over every `api/*.ts` to find
which Apis are not carrying their weight, ahead of an eventual
normalization refactor.

> **Status: measured baseline + analysis, captured. Not requirements.**
> The numbers are a snapshot at `053c891a2` and **will drift** — the
> measurement script is reproducible (Part 1), so re-run it rather than
> trusting these figures later.

**Provenance:**

> **User: "I wanna identify modules on two axes: how many public members
> they offer and then the complexity per member. something with lots of
> public functions is legit … or something like MQL is legit, only two
> real public offerings but there's a ton of complexity behind them.
> where we want to change things is low surface low complexity … or high
> surface high complexity."**

**Sits on:** [architecture.md § The Api ↔ logic-singleton split](../../architecture.md)
(the tier this measures), [call-security.md](../../subsystems/call-security.md)
(`decorateApiClass` — why the class stays the security unit),
CLAUDE.md § *Go Through the API Layer* + § *Module Categories*.

⚠ **Related work in flight:** `design/api-oo-sweep` (build-1) carries
`oo-calling-conventions-slate` and `api-boot-retirement-slate`. This
slate measures the *result* of that sweep and does not restate it.

---

## Part 0 — ⚠ Measure the implementation, not the facade

**The obvious metric is wrong after the sweep.** An `api/*.ts` file is
now a *thin forwarding shell* by design, so its own LOC measures nothing
but boilerplate. The weight moved to the paired
`platform/idea/api/<X>Logic.ts`.

So the two axes are:

- **Surface** = public `static` members on the `XApi` class (the author
  surface — what `callable == visible == cared-about` admits).
- **Depth** = code LOC of the *implementation*: the paired `*Logic.ts`
  plus any sealed subdirectory (`api/mql/**`, `api/mml/**`), plus the
  facade itself for the unpaired Apis.
- **Density** = Depth ÷ Surface — "complexity per member".

**Validation:** MQL — the user's own example of legitimate
low-surface/high-depth — scores **4 members / 2,602 LOC / 651 per
member**, the highest density in the layer. The metric agrees with the
intuition it was built to formalize.

---

## Part 1 — The measurement

93 Apis · **47,658 LOC** · **1,118 public members** · median **8
members**, **35 LOC/member**.

Reproducible: count `^\s{2}(public\s+)?static\s+(async\s+)?NAME\s*[(<]`
minus `private`/`protected`, against code lines (non-blank,
non-comment-only) of `<X>Logic.ts` + `api/<x>/**` + the facade.

| quadrant | count | meaning |
|---|--:|---|
| ⛔ **MERGE** — low surface, low density | **18** | roll into a sibling |
| ⚠ **SPLIT** — high surface, high density | **17** | ⚠ but see Part 3 |
| ✅ **deep** — low surface, high density | 29 | MQL-shaped; leave alone |
| · **broad** — high surface, low density | 29 | wide but shallow; mostly fine |

---

## Part 2 — ⛔ The merge tail: 19% of the files, 5% of the code

18 Apis totalling **2,425 LOC**.

| api | members | LOC |
|---|--:|--:|
| `identity` | **0** | **2** |
| `path-pattern` | 2 | 38 |
| `array` | 2 | 58 |
| `influence` | 4 | 60 |
| `app` | 6 | 64 |
| `provenance` | 3 | 101 |
| `grammar` | 8 | 104 |
| `accountability` | 4 | 115 |
| `help` | 8 | 129 |
| `proxy` | 4 | 132 |

⭐⭐ **`identity.ts` is dead code, not a merge candidate.** It was a
*discovery namespace* holding `Belief`, `Recognition` and `Chronicle`.
The OO sweep moved all three onto their mixins — and the file's own
comments record each retirement in place. What remains is
`export const Identity = Object.freeze({})` under ~40 lines of
commentary about what used to be there. **It exports nothing. Delete
it.** This is the sweep's one visible loose end and it is free to close.

`array` and `path-pattern` are pure utility with no domain noun — the
clearest fold-ins.

---

## Part 3 — ⚠⚠ The split quadrant is TWO problems, and density cannot tell them apart

**This is the finding that matters most, and it reverses the metric's
verdict on the two largest entries.**

Reading member *names* — not counts — the 17 "split" Apis divide into:

### Cohesive-and-deep — score SPLIT, should NOT be split

| api | members | LOC | /member | why it is fine |
|---|--:|--:|--:|---|
| `combat` | 11 | 3,589 | **326** | `openSession · advance · join · merge · sessionFor · blameFor · bandBetween` — **one concept**, deep implementation. MQL-shaped. The *highest* density in the split set and the **least** deserving of a split. |
| `pack` | 17 | 3,384 | 199 | `install · sync · resolve · pin · dryRun · diff · orphans` — a package manager. Coherent by definition. |

### Actual grab-bags — the real targets

| api | members | LOC | the seams |
|---|--:|--:|---|
| ⭐ `command` | **33** | 2,921 | **four concepts**: definition/cache (`getCommand`, `clearCache`, `reload`, `preloadAll`) · delta plumbing (`applyContainmentDelta`, `applyShadowDelta`, `applyHostedUpdateDelta`) · validation (`resolveValidator`, `runValidators`, `validateAgainstJsonSchema`) · assembly (`assemble`, `overlayBodyFields`). **That is a subsystem wearing an Api's name.** |
| ⭐ `banking` | **38** (widest surface in the layer) | 1,889 | **five concepts**: money supply (`mint`, `drain`, `moneySupply`) · accounts (`openAccount`, `linkAccount`) · escrow (4 methods) · payroll (`payWage`, `payDraw`) · reconciliation + credentials. The docs call banking *"two-tier money"*; the Api carries considerably more than two tiers. |

> ⭐⭐⭐ **The rule this yields: split on COHESION, not on density.**
> Density finds the candidates; only reading the member list separates
> *deep-because-the-problem-is-deep* from *deep-because-it-is-four
> problems*. A normalization pass driven by the metric alone would split
> `combat` (wrong) and might miss that `banking`'s 38 members are five
> subjects.

---

## Part 4 — ✅ The deep quadrant is the layer working as designed

29 Apis, tiny surface and large depth — exactly the shape the Api↔Logic
split was for. Leave them alone.

| api | members | LOC | /member |
|---|--:|--:|--:|
| `social` | 1 | 683 | 683 |
| `mql` | 4 | 2,602 | 651 |
| `magic` | 3 | 1,309 | 436 |
| `crafting` | 6 | 1,376 | 229 |
| `electricity` | 2 | 414 | 207 |
| `fire` | 2 | 312 | 156 |

---

## Part 5 — Suggested order, when the refactor happens

1. **Delete `identity.ts`.** It exports nothing. Free, today, no design
   needed.
2. **Fold the utility tail** — `array`, `path-pattern`, and probably
   `grammar` and `proxy`. ~230 LOC, four fewer files, no domain concept
   lost.
3. **Split `command` and `banking`** along the seams in Part 3. These
   are the only two entries where the split verdict survives a cohesion
   read.
4. **Leave `combat` and `pack` whole** despite their scores — and record
   *why*, so a later metric-driven pass does not re-propose them.
5. Re-run the measurement (Part 1) before acting; these numbers are a
   snapshot and the OO sweep proved the layer moves fast.

---

## Open questions

1. **Is `broad-thin` (29 Apis) a problem at all?** Wide-but-shallow can
   be a clean facade or an unrelated pile; this pass did not read their
   member lists. That is the obvious next measurement.
2. **What is the right home for the utility fold-ins?** `array` and
   `path-pattern` have no domain noun to merge *into* — which may mean
   the answer is a single `Util`-shaped Api, and CLAUDE.md is explicit
   that "pure helper functions" is not a reason to dodge the Api
   pattern. Needs a decision, not a default.
3. **Does the discovery-namespace idea survive?** `identity.ts` was the
   *pilot* for "the broader Api-namespace sweep" and the sweep hollowed
   it out. Is grouping-not-merging still wanted, or did moving methods
   onto objects make it unnecessary?
4. **Should density have a cyclomatic term?** LOC is a proxy. The script
   already computes branch counts; nothing here uses them.
5. **Do the unpaired Apis mean anything?** 15 of 93 have no `*Logic`
   pair. Four are the documented bootstrap-special cases; the rest may
   be genuinely pure, or un-split.

---

## What this slate does NOT cover

- **The OO sweep itself** — `design/api-oo-sweep` (build-1) owns it;
  this measures its result.
- **Api boot retirement** — `api-boot-retirement-slate`, same branch.
- **Whether a given method belongs on an object instead of an Api** —
  that is the OO calling-conventions question, and it is upstream of
  this one.
- **The `broad-thin` quadrant** — open question 1.
- **Any actual refactor.** This is a baseline and a triage, not a plan.

---

## Appendix — the full 93-row baseline (`053c891a2`)

| Api | members | LOC | LOC/member | quadrant |
|---|--:|--:|--:|---|
| `combat` | 11 | 3589 | 326 | ⚠ split |
| `pack` | 17 | 3384 | 199 | ⚠ split |
| `command` | 33 | 2921 | 89 | ⚠ split |
| `mql` | 4 | 2602 | 650 | ✅ deep |
| `banking` | 38 | 1889 | 50 | ⚠ split |
| `crafting` | 6 | 1376 | 229 | ✅ deep |
| `magic` | 3 | 1309 | 436 | ✅ deep |
| `mml` | 41 | 1156 | 28 | · broad |
| `mixin` | 161 | 1039 | 6 | · broad |
| `studio` | 9 | 982 | 109 | ⚠ split |
| `weather` | 18 | 904 | 50 | ⚠ split |
| `employment` | 11 | 890 | 81 | ⚠ split |
| `biome` | 22 | 803 | 36 | ⚠ split |
| `persistable` | 11 | 788 | 72 | ⚠ split |
| `celestial` | 35 | 779 | 22 | · broad |
| `perception` | 21 | 770 | 37 | ⚠ split |
| `security` | 27 | 715 | 26 | · broad |
| `stuff` | 30 | 703 | 23 | · broad |
| `sandbox` | 16 | 690 | 43 | ⚠ split |
| `social` | 1 | 683 | 683 | ✅ deep |
| `forums` | 12 | 650 | 54 | ⚠ split |
| `stream` | 12 | 641 | 53 | ⚠ split |
| `condition` | 4 | 619 | 155 | ✅ deep |
| `contract` | 9 | 610 | 68 | ⚠ split |
| `prompt` | 5 | 590 | 118 | ✅ deep |
| `material` | 13 | 567 | 44 | ⚠ split |
| `cms` | 4 | 550 | 138 | ✅ deep |
| `party` | 7 | 546 | 78 | ✅ deep |
| `locomotion` | 20 | 535 | 27 | · broad |
| `record` | 9 | 501 | 56 | ⚠ split |
| `residency` | 4 | 483 | 121 | ✅ deep |
| `script` | 12 | 440 | 37 | ⚠ split |
| `execution-context` | 25 | 433 | 17 | · broad |
| `event` | 15 | 430 | 29 | · broad |
| `renown` | 5 | 428 | 86 | ✅ deep |
| `press` | 8 | 415 | 52 | ✅ deep |
| `electricity` | 2 | 414 | 207 | ✅ deep |
| `git` | 5 | 358 | 72 | ✅ deep |
| `source-tree` | 21 | 344 | 16 | · broad |
| `shadow` | 16 | 341 | 21 | · broad |
| `command-line` | 3 | 339 | 113 | ✅ deep |
| `compact` | 14 | 336 | 24 | · broad |
| `shell` | 4 | 333 | 83 | ✅ deep |
| `parcel` | 24 | 322 | 13 | · broad |
| `mql-subscription` | 10 | 318 | 32 | · broad |
| `fire` | 2 | 312 | 156 | ✅ deep |
| `producer` | 6 | 296 | 49 | ✅ deep |
| `conviction` | 7 | 293 | 42 | ✅ deep |
| `template` | 8 | 283 | 35 | ⛔ merge |
| `consumer` | 5 | 265 | 53 | ✅ deep |
| `chattel` | 4 | 260 | 65 | ✅ deep |
| `containment` | 7 | 250 | 36 | ✅ deep |
| `document` | 6 | 249 | 42 | ✅ deep |
| `species` | 6 | 245 | 41 | ✅ deep |
| `address` | 11 | 239 | 22 | · broad |
| `card` | 8 | 238 | 30 | ⛔ merge |
| `government` | 9 | 232 | 26 | · broad |
| `chat` | 10 | 220 | 22 | · broad |
| `mudlog` | 7 | 219 | 31 | ⛔ merge |
| `subject` | 11 | 212 | 19 | · broad |
| `scheduler` | 10 | 211 | 21 | · broad |
| `access` | 11 | 206 | 19 | · broad |
| `group` | 10 | 206 | 21 | · broad |
| `message` | 7 | 203 | 29 | ⛔ merge |
| `connection` | 8 | 192 | 24 | ⛔ merge |
| `module` | 10 | 191 | 19 | · broad |
| `hot-reload` | 11 | 190 | 17 | · broad |
| `zone` | 7 | 185 | 26 | ⛔ merge |
| `quantity` | 4 | 182 | 46 | ✅ deep |
| `schedule` | 4 | 174 | 44 | ✅ deep |
| `prose` | 4 | 160 | 40 | ✅ deep |
| `player` | 8 | 152 | 19 | ⛔ merge |
| `navigation` | 5 | 150 | 30 | ⛔ merge |
| `corpo` | 9 | 149 | 17 | · broad |
| `worldclock` | 20 | 138 | 7 | · broad |
| `proxy` | 4 | 132 | 33 | ⛔ merge |
| `help` | 8 | 129 | 16 | ⛔ merge |
| `reaction` | 18 | 128 | 7 | · broad |
| `soul` | 10 | 124 | 12 | · broad |
| `accountability` | 4 | 115 | 29 | ⛔ merge |
| `persist` | 10 | 115 | 12 | · broad |
| `boundary` | 3 | 108 | 36 | ✅ deep |
| `bulk` | 10 | 105 | 10 | · broad |
| `attendant` | 2 | 104 | 52 | ✅ deep |
| `grammar` | 8 | 104 | 13 | ⛔ merge |
| `provenance` | 3 | 101 | 34 | ⛔ merge |
| `glob` | 2 | 78 | 39 | ✅ deep |
| `diagnostics` | 9 | 76 | 8 | · broad |
| `app` | 6 | 64 | 11 | ⛔ merge |
| `influence` | 4 | 60 | 15 | ⛔ merge |
| `array` | 2 | 58 | 29 | ⛔ merge |
| `path-pattern` | 2 | 38 | 19 | ⛔ merge |
| `identity` | 0 | 2 | 2 | ⛔ merge |
