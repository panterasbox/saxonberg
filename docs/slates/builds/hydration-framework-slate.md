# Hydration framework slate — one framework for filling a thing with its state

> **Status: UNBUILT** — three hydration paths exist and none of them
> knows about the others; the census below is measured at `868c35b46`.
> Re-run 2026-09-19 on `design/slate-compaction`: **67 of 123** (the
> same script, packs' `src/` included); still one `Hydrator` implementer
> (`PersistentHydrator`, 1,339 rows); `Cast.postRegister` still calls
> `hydrateBeliefs()` (`lib/npc/Cast.ts:173`); no gate in `package.json`.
> **Left:** ⭐⭐ the census + ratchet on the `postRegister` implementations
> that load state (63 → 67, ungated) · the finishing-hydration vs
> warming-a-roster ruling the census feeds · ⭐ let a
> `PersistenceContributor` name its own SOURCE (so a layer can restore
> from a collection that is not `holder_snapshots`) · pre- vs
> post-register for a source-naming contributor (Q1) · unreachable-source
> as a declared property (Q2) · the per-clone cost (Q3) · decide whether
> `Hydrator` becomes mixin-composed, which reverses a stated design
> decision (Q4) · the `Cast` belief load as the first consumer
> **Size:** **a build** — it touches the clone pipeline, the persistence
> spine and 60-odd call sites; the narrow version (a contributor naming
> its source) is a wave inside it

**Captured 2026-09-16**, in review of the pets MR (!257), when the user
asked why `CastMixin.postRegister` was calling `hydrateBeliefs()`.

**Provenance:**

> **User: "I'm looking at `Cast.hydrateBeliefs()` and just wondering if
> this isn't a case where we want to write custom hydrators besides the
> `PersistentHydrator` we use everywhere."**
>
> **User: "the idea was that you could have a `BeliefHydrator`, or even
> make Hydrators mixin based where you compose one for all the different
> things you need to hydrate. the `data:{}` block is one source but you
> could be getting data from other mongo collections entirely. the point
> was to use a common framework for all that 'hydration step' logic and
> keep `postRegister` for actual post-hydration stuff not just 'finish
> hydrating'."**

⚠ **The first answer was wrong and is recorded so the slate does not
repeat it.** The initial reading was *"a `Hydrator`'s signature is
`hydrate(backing, data)`, so beliefs do not fit"* — an argument from the
current signature rather than from the design. The signature is the thing
under discussion.

**Sits on:** [templates.md § The Hydrator Contract](../../subsystems/templates.md)
· [persistence.md](../../subsystems/persistence.md) (the spine and its
slices) · [lifecycle.md](../../subsystems/lifecycle.md) (`postRegister`'s
place in the choreography) · `docs/lint-family.md` § *census, then
ratchet*.

---

## The claim

> **`postRegister` is for work that happens AFTER a thing is filled in.
> It is not where filling it in finishes.**

That invariant is clean, it is what the hook's name says, and the tree
currently breaks it in 63 places.

---

## Three frameworks, none aware of the others

| | drives | source | composed per concern? | users |
|---|---|---|---|---|
| **`Hydrator`** | the clone pipeline, pre-register | the template's `data:` block | ⚠ **no** — deliberately: *"one hydrator class serves multiple backing classes"* because it introspects the backing rather than mirroring its chain | 1,221 rows, **0 custom subclasses** |
| **`PersistenceContributor`** | `PersistableLogic` restoring a record | `holder_snapshots` | ⭐ **yes** — `MixinApi.getPersistenceContributors` walks own-`_mixinName` layers | 5 contributors (`Container`, `Adornable`, `Estate`, `Slotted`, `BeliefStore`) |
| **ad-hoc `postRegister`** | the register pass | anything — `beliefs`, a collection, a catalogue warm | no | **63 of 109** `postRegister` implementations |

⭐⭐ **The framework the user described is already half-built.** It is
`PersistenceContributor`: mixin-composed, per-concern, walked by the
framework. And `BeliefStoreMixin` **is already a contributor** — the pets
build gave it `captureSlice`/`restoreSlice` in W0. A `BeliefHydrator` as a
composed layer exists.

---

## ⭐ So the gap is the DRIVER, not the framework

Contributors only run when `PersistableLogic` is restoring a
`holder_snapshots` record. A `Cast` composes no `PersistableMixin`, so it
has no record, so **nothing drives its contributors at all** — its belief
layer is orphaned, and the load fell into `postRegister` by default
rather than by choice.

Which states the design question exactly:

> **What drives a host's per-concern restore when the host has no
> record?**

Three answers, in increasing order of size:

1. ⭐ **A contributor names its own source.** A layer declares *my state
   comes from `beliefs`, keyed by `viewerId`* and the framework runs it
   whether or not a `holder_snapshots` record exists. Narrowest, and it
   alone would let `BeliefStore` stop using `postRegister`.
2. **Make `Hydrator` mixin-composed**, so filling a thing in is one
   framework over many sources — the user's fuller proposal. ⚠ This
   **reverses a stated design decision** (templates.md says hydrators
   deliberately do not mirror the chain), so the reversal wants its
   reasoning written down rather than assumed.
3. **Give every stateful host a record.** Rejected on sight for `Cast`:
   singletons derive their key from their scope precisely so they do not
   need one, and this would mint a `holder_snapshots` row for every named
   NPC in the game.

---

## The census, and why it is the shape of the work

**63 of 109 `postRegister` implementations load state** — catalogues
warming, registries rebuilding indexes, wardens restoring. Measured at
`868c35b46`:

```bash
for f in $(grep -rln "postRegister" --include="*.ts" packages/server/src/mud \
           | grep -v __tests__ | grep -v "PostRegistration.ts"); do
  sed -n '/postRegister/,/^  }/p' "$f" \
    | grep -qE "\.find\(|findByScope|hydrate|rebuildIndex|warm\(|restore|load" \
    && echo "$f"
done | wc -l
```

⚠ **Not all 63 are the same defect.** A catalogue warming its roster from
a collection is arguably *exactly* post-registration work — it needs the
registry populated first. The census is the input to the ruling, not the
ruling: the build has to separate

- **finishing hydration** — this host filling in its own state (the
  `Cast` belief load; anything keyed on the host's own identity), from
- **warming a roster** — a singleton reading a collection that is nobody's
  per-instance state (`MaterialCatalogue`, `RecipeCatalogue`).

The first belongs in the framework. The second may legitimately stay.
⭐ Gate the number at today's count and let it fall — the pattern
`lint:family` documents.

---

## ⚠ Open questions the build must answer

1. **Does a source-naming contributor run pre- or post-register?** The
   `Cast` belief load needs its identity resolved, which argues post; the
   `Hydrator` runs pre. If one framework covers both, it needs both
   phases, and that is most of the design.
2. **What happens to a contributor whose source is unreachable?** The
   belief load no-ops when Mongo is closed (tests, pre-boot). A framework
   has to make that a declared property rather than each layer's own
   early return.
3. **Cost.** A Mongo round-trip per contributor per clone is a very
   different bill from one record read per host. `Cast` clones are rare;
   a per-clone query on something common would not be.
4. **Does `Hydrator` survive at all**, or does `data:` become just another
   source under the composed framework? If the latter, 1,221 rows'
   `hydratorClass:` field is the migration, and CLAUDE.md's rule about
   never dropping it from a row with a `data:` block changes shape.

---

## What is NOT in scope

- **The pets MR's own placement.** `CastMixin.postRegister` calling
  `hydrateBeliefs()` stays as shipped. It is the 63rd instance of a
  tree-wide pattern, not a pets defect, and moving it before the
  framework exists would mean inventing the framework inside a pets MR.
- **The two belief restore paths.** A keyed `Persistable` host carries
  beliefs in its own record (`captureSlice`); a singleton `Cast` reads the
  `beliefs` collection. That is not redundancy — the hosts have genuinely
  different persistence shapes — but it is the seam this slate would
  unify, and it is the concrete first consumer.
