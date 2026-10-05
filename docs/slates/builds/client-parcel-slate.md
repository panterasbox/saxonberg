# Client parcel slate — the sixth axis, and the committee that holds it

> **Status: UNBUILT, and the blocker is already named in two places.**
> `lib/connection/SaxonbergClient.ts` and
> [connection.md § What a second client implements](../../subsystems/connection.md):
> *"⚠ **It is kernel, not a pack, and that is a conclusion rather than a
> convenience** … none of the five axes takes a client … **Making it a
> pack needs a sixth axis (how the world is seen)** plus a way for the
> platform's own `cockpit.yaml` and its six controllers to move out of
> the platform pack. **That is a namespace design, not a refactor.**"*
> **Left:** the sixth axis in the five-axis table · `/client` as a
> namespace root + a path→directory row · the `ParcelRecord` + title ·
> the client committee's charter (three sentences, § 6) · the pack move
> (≈3,500 lines along an existing file boundary) · ⚠ multi-repo
> `GitApi` (mechanical) · the committee's published code-trust capacity
> **Size:** **a build**, and most of it is a namespace design. The
> *useful* half is blocked on
> [client-vocabulary-slate](./client-vocabulary-slate.md), which is what
> the title can actually reach.

**Captured 2026-10-02.** Grew out of the iconography and card-surface
conversations: *who decides what the client does?*

> **User: "we probably want the saxonberg client governed by the compact
> even if 3rd party clients may not be. that means it needs to be able to
> be expressed as a parcel so we can give it a committee."**

---

## 1. The sixth axis

The five namespace axes each answer one question (CLAUDE.md): *the engine
itself* · *what things are* · *where* · *who makes / who owns* · *how the
world works* · *what is written down*. A client answers none of them, and
`SaxonbergClient.ts` already applied the `/system/` test and failed it:

> *"It is not a thing, a place, a trade, a firm, or something written
> down; and **`/system/` means *true whether or not anyone is
> participating*, which a client is precisely the opposite of.**"*

⭐ **The axis question is already drafted — *how the world is seen*** —
and `/client` is its first member.

⚠ **One wrinkle worth stating:** `/compact` is the structural precedent
(an out-of-fiction tree the polity governs), but every existing
document-tree root holds **no classes**. `/client` would be **the first
out-of-fiction root that carries code.**

## 2. ⭐⭐⭐ Title ≠ liveness — the parcel's three fields answer the
two-committee question

> **User: "there's two committees, one that picks which client to install
> which isn't the client committee I'm talking about. that's probably
> just the PM executing their authority under mandate of the
> legislature."**

[land-compute](./land-compute-and-license.md) Movement 1 already says a
parcel carries **three independent things**, and they map exactly:

| the parcel's field | who holds it | what it decides |
|---|---|---|
| **title** | ⭐ **the client committee** | who maintains `SaxonbergClient` and governs its vocabulary |
| **publish-state** | ⭐ **the PM, under legislative mandate** | which client is actually served |
| **compute** | the meter ([scarcity-slate](./scarcity-slate.md)) | what it may consume |

> ⭐⭐⭐ **The thing that picks a client is not a committee because it is
> not a title question at all** — it is the publish-state axis, and
> publish-state was always executive. The parcel doctrine already
> separates them: *"you never downsize a parcel… the owner keeps their
> land the whole time."*

⭐ It also agrees with [scarcity-slate § 8](./scarcity-slate.md): **a
committee is a camera, not a wall.** Installing is an *act*; maintaining
is *stewardship*. A committee was never the right shape for the first.

## 3. ⭐⭐⭐ The committee's statute book already exists as one import list

`SaxonbergClient.ts`'s imports:

```
LAYOUT_NAMES · COCKPIT_MODES · COCKPIT_ARRANGEMENTS · DEFAULT_COCKPIT_MODE
SHELF_ROW_IDS · DEFAULT_SHELF · DEFAULT_ROUTING · FEED_DESTINATIONS
CARD_IDS · SHIPPED_ARRANGEMENT_CARDS · MAX_SAVED_ARRANGEMENTS_PER_MODE
```

> **That is the client's constitution, already gathered in one file.** The
> committee's jurisdiction is not something to invent — it is *which
> cards exist, which modes exist, which destinations exist, what the
> default routing is, what ships in each arrangement.*

A body with a defined statute book on day one is a far better starting
position than a body with a mandate. ⚠ And every one of those lists lives
in `@saxonberg/types` today, which is why
[client-vocabulary-slate](./client-vocabulary-slate.md) is the
dependency: **a pack cannot contribute to a build-time TypeScript
package.**

## 4. The precedent: a committee already holds a namespace root

`access.md`, retiring the old state group:

> *"`soul` is now **title over `/expression`, held by the `soul` group the
> platform declares**."*

⭐ **A named group holding title over a namespace root, declared by the
platform, shipped.** The client committee needs a second instance of a
working shape, not a new one.

## 5. ⚠⚠ Git is NOT a competing jurisdiction — the correction that
reorganised this slate

Two wrong framings were tried before this one, and the record is worth
keeping because both are natural:

1. ⛔ *"`/client` in the `source` backend is the system of record."*
   **No — git is.** Runtime edits mean nothing until committed.
2. ⛔ *"Git is outside the Compact, so `src/` is out of jurisdiction."*
   **Also no**, and this one would have produced an author tier.

> **User: "we're probably never going to make them have gitlab
> membership. we provide GitApi to do the operations under common
> credentials and we attribute the commits with git config and comment
> bodies."**

Which is exactly what ships. `git-workflow.md`:

> **"git can never touch a file a direct source write couldn't."** Every
> operation resolves to an *affected-path set*, and each path must pass
> **the same gate `_writeSource` uses** — `isWizard(actor)` **and**
> `can(actor, 'write', resolveSourceFolderZone(path))`.

…under *"The identity model — **one credential, per-avatar
authorship**."*

> ⭐⭐⭐ **Git is a storage backend behind one credential, and `GitApi` is
> the gate in front of it.** Because nobody holds GitLab membership there
> is **no back door around title**, so the Compact already governs
> commits. *"The Compact owns the remotes"* is true in substance — and in
> a better form than per-repo credentials, which would reintroduce the
> second permission system this design exists to avoid.

⭐ A detail confirming it is deliberate: *"non-path-scopable history
rewrites (`reset` / force-push) are **out of scope** — rollback is
additive `revert` only."* **The gate's shape decides the feature set** —
an operation that cannot be scoped to a path a title covers does not
exist.

### ⭐⭐⭐ So the tier difference is LATENCY, not authority

| tier | durable in | takes effect |
|---|---|---|
| rows · documents · templates | Mongo | ⭐ **live** |
| `src/` | git, through `GitApi`'s gate | **after a build and a deploy** |

**Both are governed. Only one is immediate.** Which is the real and
honest argument for row-ification: not *"git is not ours"* but **a
committee that can only change code is a committee whose decisions wait
on the executive to deploy.**

## 6. The charter — three sentences

1. **Title** to `/client` is held by the **client committee**, which
   maintains `SaxonbergClient` and governs its vocabulary.
2. **Publish-state** — which client is served — is the **PM's**, under
   legislative mandate.
3. ⭐ **The mandate is a FLOOR**: the polity owes itself one maintained
   client. If the committee cannot act the duty **reverts to the
   executive**, and the committee's code-trust capacity is **published**
   so that *cannot act* is observable rather than discovered.

### Composition is the committee's own business

> **User: "does everyone in the committee need code trust? that's really
> up to the committee but some members do at least if they're to be
> effective."**

⭐⭐ **That is the recursion rule, not a new decision.**
[land-compute](./land-compute-and-license.md): the holder sub-allocates
*by their own policy*, **"below that seam the commons doesn't reach in,"**
and *"the Ch 7 dial recurses."* Chartering composition would be the
commons reaching into a block that is none of its business.

> ⭐⭐⭐ **So code trust is a committee's CAPACITY, not a membership
> criterion** — the way a quorum is a property of a body rather than a
> qualification for joining.

Two consequences:

- ⚠ **A committee can lose effectiveness without losing title.** Every
  code-trust holder drifts away and you have a memos-only body — a
  *degradation* rather than a design flaw, which is why § 6.3 publishes
  the capacity. A derived figure, never stored.
- ⭐ **No gate is relaxed anywhere.** `isWizard` **and** title stands; the
  committee simply has to contain the conjunction.

⛔ **And do not relax the conjunction for `/client`.** Title without code
trust over a tree that compiles into the app every player runs is the one
place *everyone is an author* must not win — *TS access **is** root*, with
the extra edge that here the root is over **somebody else's session**.

## 7. ⭐⭐ Three independent derivations of one line

*The committee legislates; the executive builds.* It fell out of three
unrelated places during the design, which is why this slate stops looking
for a way around it:

| from | the argument |
|---|---|
| **plugin security** | the browser has no call-security gate, so what a third party ships must be **declarative** |
| **the permissions conjunction** | the write gate is `isWizard` **and** title, so title alone cannot ship code |
| **build latency** | a row is live; a commit waits on a deploy |

## 8. What is already supported (checked 2026-10-02)

| | state |
|---|---|
| **separate package per pack** | ✅ 51 shipped |
| **separate GIT REPO per pack** | ⭐ **designed for, untried.** `content-packs.md § Discovery`: *"**The server never depends on a pack**; installing one is `pnpm add @saxonberg/content-<id>` in the deployment, and **when the packs are their own repos that manifest is the only file that changes**."* Resolution is Node module resolution from the deployment manifest (`SAXONBERG_DEPLOYMENT_ROOT`) |
| **maintainers who are users** | ✅ `manifest.maintainers` + the pack-maintainer diagnostics read |
| **a committee holding a namespace root** | ⭐ the `soul` / `/expression` precedent |
| **multi-repo `GitApi`** | ⚠ **no** — the repo root is `path.dirname(SourceTreeApi.getSandboxRoot())`, one `.git`, repo-relative paths. ⭐ Mechanical: `registerPackSource` is nearly the path→repo map already (the repo is the nearest ancestor of a pack's `src/` with a `.git`) |
| **a client COMPONENT from a pack** | ⛔ **no, and it should stay no** — see § 9 |

### ⚠ What the trade minister can actually do

`install` is `canAtPath(giver, 'install', '/compact/executive')` —
holding the executive. But `pack` **reconciles the discovered set into
the world; it does not fetch code**, and discovery happens at boot off
the deployment manifest.

> **The executive's `install` authority governs GO-LIVE, not
> ACQUISITION.** Code arrives by `pnpm add` and a deploy; content goes
> live by office.

⭐ A defensible two-key system — code-trust for the code, title for the
going-live — but it should be **written down**, because *"a trade
minister for installing content packs"* oversells it.

## 9. ⛔⛔ Why the client is NOT just another pack

| | a trade pack | the client |
|---|---|---|
| its `src/` runs on | **the server** | **a browser** |
| loaded by | Node resolution + `registerPackSource` | **Vite, at build time** |
| gated by | the call-security proxy, `FromModule`, `classFileOf` | ⛔ **nothing — none of it exists in a browser** |

`@saxonberg/content-client` as a pack would be discovered by `PackLogic`
and have its `src/` registered in the **server's** class-source table —
*the wrong machine.* The server would register client code it can never
run, and the client would not see it without also depending on the
package at build time.

> ⭐⭐⭐ **Rows cross the wire. `src/` does not.** A pack can ship a card
> **definition**, because the client reads definitions off the wire. It
> cannot ship a card **component**, because components are compiled.

**So the client is the same pattern for governance and ownership, and a
different pattern for distribution.** Which is why a client plugin is
*"not a content pack, that's something different"* — and why
[client-vocabulary-slate](./client-vocabulary-slate.md) is the hinge
rather than a nicety.

## 10. ⭐ Third-party clients: the wire is the constitutional boundary

If a third-party client is not bound by the Compact, everything the
Compact guarantees must be enforced **server-side on the envelope**,
never by client cooperation. The architecture already assumed a hostile
client — `useCardFeed`:

> *"⭐⭐ **This hook opens nothing.** Every card arrives on a
> `card-opened` envelope because a command caused the server to push it…
> **It cannot open one even by mistake.** `MqlSubscribeMessage` carries no
> field that would name a card. That is acceptance criterion 1 enforced by
> the protocol rather than by a grep."*

> ⭐⭐⭐ **The card surface's strictest rule is precisely what makes client
> pluralism safe.** The single-birth-path decision reads as hygiene and is
> actually the enabling condition for allowing clients we do not control
> — worth stating, because that kind of justification gets lost and then
> argued away.

⭐ And a reassuring consequence of § 9: because rows cross the wire and
components do not, **a third-party client is automatically compatible
with third-party cards.** Any client speaking the protocol gets the
definitions for free.

## 11. Open questions

1. ⭐ **Does `/client` hold only our client, or every client?** A
   third-party client that *wanted* to be governed — for the credibility
   — would want a sibling parcel under the same axis. Costs nothing now,
   awkward to retrofit.
2. **Does the committee's title cover the source tree at `/client`, or
   only the vocabulary rows?** Title over the tree reads stronger and
   buys little, since the conjunction gates the writes anyway; ⭐ title
   over the **rows** is the part actually exercisable.
3. ⚠ **Serving from the parcel, or only recording there?**
   > **User: "whether we actually serve code from the parcel doesnt
   > matter to me but I would want that to be the system of record."**

   `/client` as a parcel path needs nothing from the build. `/client` as
   where assets are *served from* is the build/deploy change — and it is
   what makes publish-state literal (*an unpublished client version is one
   nobody is served*). The first alone already gets the committee.
4. ⚠ **The record/reality gap.** `deploy-dev` ships *whatever is checked
   out*, so **the client must state which version of `/client` it is
   running** or the committee legislates into a file nobody serves. The
   `Figure` discipline — *live · empty · unwired* — applied to the client
   itself.

## Cross-refs

- [client-vocabulary-slate.md](./client-vocabulary-slate.md) — ⭐⭐⭐ the
  build this slate's title needs in order to reach anything.
- [connection.md](../../subsystems/connection.md) § What a second client
  implements — the three-way split, the seam sentence, and the sixth-axis
  blocker.
- [land-compute-and-license.md](./land-compute-and-license.md) — the
  parcel's three fields, subsidiarity, the recursing dial.
- [git-workflow.md](../../subsystems/git-workflow.md) — one credential,
  the same-gate spine, the affected-path set.
- [content-packs.md](../../subsystems/content-packs.md) § Discovery + §
  The capability rung — separate repos, `SAXONBERG_PACKS`, the rung check.
- [access.md](../../subsystems/access.md) — `canAtPath`, the code-trust
  lockdown, `requiresPackInstaller`, the `soul` precedent.
- [scarcity-slate.md](./scarcity-slate.md) § 8 — a committee is a camera,
  not a wall; and the compute field of this parcel.
