# Pack boundary slate — creative output vs a realm's own history

> **Status: UNBUILT** — the **mechanism** ships and the **rule does not.**
> Every pack's reconcile is scoped by `stampedQuery` to rows carrying its
> own `sourcePack`, so the content tree already holds two populations and
> already keeps them apart. Nothing states the taxonomy, nothing enforces
> the boundary, and one case is unhandled.
> **Left:** the two populations written down (`content-packs.md`) · ⭐ the
> **realm-local identity lint** as the pack boundary · ⚠ the
> **vanish-with-dependents** problem (a pack retracting ground the realm
> built on) · the `onVanish` conditional, or whatever replaces it.
> **Size:** a tail — three small pieces, but the first two are rules the
> next twenty builds will either follow or violate.

Opened 2026-09-25 out of a design conversation about minting NPC
households ([household-lifecycle-slate](./household-lifecycle-slate.md)),
when the user drew a line that turned out to already exist in the
substrate:

> **User:** *"the content pack isn't meant to be a repository for runtime
> data. it's a package of shared content and code that other people
> running the platform might want to install. if your game is minting
> parents for all your players that's your business but I don't want it in
> my game, I have my own players… it's someone's creative output not
> state."*

---

## ⭐⭐⭐ The content tree already holds two populations

`PackLogic`'s **`stampedQuery`** narrows every reconcile to rows carrying
that pack's own `sourcePack`. A row with **no stamp** is invisible to
every installer: no reconcile, no three-way compare, no vanish-delete, no
conflict.

| | `sourcePack` | what it is | who touches it |
|---|---|---|---|
| **packaged** | present | ⭐ **somebody's creative output** — distributed, versioned, reinstallable | its pack's installer |
| **local** | absent | ⭐ **this realm's own history** — minted by play | nobody's installer, ever |

> **The stamp IS the line**, and it is already load-bearing — the doc
> already flags `stampedQuery` as such, for a different reason (a
> `{sourcePack}`-only query would let each kind reap the others' rows).

⚠ **But nothing says so.** The distinction is real and mechanical; the
**taxonomy is unstated**. That is precisely the shape
[document-store-tiering](../tails/document-store-tiering-slate.md) found
one store over — two populations under one mechanism, the split genuine
and nobody's written rule — which is how `release` sat on the wrong side
for a year and grew a JS full-scan without crossing a stated line.

**The sentence to add to `content-packs.md`:**

> A stamped row is a pack's; an unstamped row is the realm's. **A pack
> ships creative output, never state** — and the reconcile already
> enforces it by scoping on the stamp. Content minted by play (a
> household, a chain of title, a grave) is unstamped by construction and
> no installer will ever touch it.

⭐ **This is what makes generated content safe as ordinary content.** A
minted household is a template row — CMS-editable, MQL-addressable,
`git`-diffable, governed by the parcel's own access rules — and a pack
reinstall does not touch it, because it was never the pack's.

---

## ⭐⭐ The boundary is a LINT, not a policy

The reason not to package generated content is not taste. **It is broken
by construction.**

A minted household carries **realm-local references**: the player it is
a parent to, `regard` rows keyed to an avatar's `getIdentityPath()`, a
chain-of-title entry, a necropolis plot, employment history. Install that
elsewhere and every one of those points at an identity that does not
exist in the receiving database.

> ⭐ **A pack may not ship a row that names a realm-local identity.**

Checkable, because identity paths are a distinct shape
(`/platform/agent/Avatar/<playerId>` and the minted-identity schemes —
see [identity.md](../../subsystems/identity.md) and
[ref-shapes.md](../../ref-shapes.md)). The census-then-ratchet pattern
applies: count today (**expected: zero**), gate the count, and it can
never rise.

### ⭐⭐⭐ And the same test PERMITS the legitimate case

There is a good version of *"move runtime content into a pack"* hiding
inside the bad one, and the user was right to want it separated rather
than banned:

| | the act | the test |
|---|---|---|
| ⛔ **laundering** | bulk-export generated households with their references intact | **fails** — the rows name local identities |
| ⭐ **authoring** | build a neighbourhood in a sandbox, graduate it, polish it, share the *design* | **passes** — an authored household names nobody |

> **One mechanical test does both jobs: it blocks laundering, and it is
> the spec for doing it properly.**

⭐ So **nobody has to adjudicate intent.** The rows either reference this
realm's players or they do not. That is the whole rule, and it makes
*"author a pack"* and *"export my state"* mechanically different acts
rather than the same act with different motives.

---

## ⚠⚠ Vanish-with-dependents — the unhandled case

The find that the conversation actually turned up, and nothing handles it
today.

**A pack ships the plat** — the street, its lots, the dwelling
archetypes. **The realm writes households into those lots**, unstamped.

So: *what happens when that pack is uninstalled, or the plat's file
vanishes from it?*

`onVanish: delete` (the default) reaps the clean stamped row. **The plat
goes. The households do not** — they are unstamped, so they survive their
own street disappearing, sitting at addresses under a `Locality` that no
longer exists. `coverageChainOf` returns empty and a dozen families are
**nowhere**.

⭐ **The general rule, which will recur everywhere packs and realm-local
content meet:**

> **A pack may retract what it shipped. It may not retract the ground
> under what the realm built on it.**

**Lean:** `onVanish` becomes **conditional on dependents** — a plat with
occupied lots does not vanish. There is precedent in the vocabulary
already (`settings` → `keep`, `subjects` → `archive`), so the new idea is
only *the condition*, not a new outcome. And it is diegetically obvious:
**you cannot uninstall a neighbourhood people live in.**

⚠ Alternatives to weigh at requirements, because the lean is not
obviously right:

1. **Refuse the uninstall**, naming the dependents — honest, and it makes
   the operator decide. Risks wedging an operator who wants a pack gone.
2. **Escheat the dependents** — the estate machine already knows how to
   pass an estate up the title tree, and *the ground vanishing* is a
   defensible terminal event. ⚠ But it destroys player-adjacent content
   on an operator action, which is the worst failure mode here.
3. **Adopt the orphans** — the plat row is *copied* into the realm as an
   unstamped local row the moment something local depends on it, and the
   pack's copy vanishing is then irrelevant. ⭐ Possibly the best of the
   three: it converts a retraction problem into an ownership transfer,
   and it is the same move as a human editing a stamped row and taking
   ownership of it.

⚠ **Do not decide this from the neighbourhood case alone** — it is
general. The same shape covers a pack shipping a venue archetype somebody
built a business on, a trade whose Discipline rows somebody's Transcript
cites, and a locality whose rooms hold a player's furniture.

---

## Open

1. **Which vanish answer** — see the three above; requirements' call.
2. **Does an unstamped row need a positive marker**, or is absence
   enough? Absence is cheaper and already true. ⚠ But *"absent"* and
   *"this pack was uninstalled and left it"* are indistinguishable, which
   matters for exactly the case above.
3. **Row volume.** A realm's local population grows without bound (one
   household per player, plus estates, plus graves). Packs already ship
   thousands of rows so the count is probably fine, but ⭐ **the CMS tree
   must stay browsable** — which argues for hanging local content under
   its *place* (`/world/terminus/hinkley-hills/larkspur-row/…`) so it
   navigates by geography rather than being a flat dump.
4. **Does the lint belong to `lint:family`?** Almost certainly — it is
   derived, so it would run in CI, the sweep and locally with no list to
   edit.

---

See also: [content-packs.md](../../subsystems/content-packs.md) ·
[household-lifecycle-slate](./household-lifecycle-slate.md) (the case
that forced it) ·
[document-store-tiering](../tails/document-store-tiering-slate.md) (the
same two-population shape, one store over) ·
[ref-shapes.md](../../ref-shapes.md) (the identity/backing doctrine)
