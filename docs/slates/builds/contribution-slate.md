# Contribution slate — develop anywhere, land through one door

> **Status: UNBUILT, and it has one load-bearing gap.** ⛔ **The CMS's
> `content` and `document` backends write to Mongo, not files — so work
> authored there cannot be committed, distributed, or moved to another
> instance.** `pack sync` is files → DB; `pack diff` compares; **nothing
> serialises outward**, and `snapshotToTemplate` (the only thing that ever
> did, at a different level) was retired.
> **Left:** ⭐⭐⭐ **the export** (`Template.data` → pack file) · the
> submission door + landing-runs-in-sandbox · the reference resolver that
> doubles as a publish precondition · `author-surface.json` as the agent
> contract · scoped tokens · the published content set as the "mirror"
> **Size:** ⭐ **the export is a tail and unlocks the most**; the door is a
> build.

**Captured 2026-10-04**, from the question of how external contributions
work once a production instance is running.

---

## 1. ⭐⭐⭐ Two databases, and git is the only thing that straddles them

> **User: "coding through the engine means you're selecting an
> environment… it means you're running on prod and not another instance
> of mongo. the whole idea is to let people dev against real prod data
> and the sandbox is what protects them. that's why I was pointing to git
> history as record because its the only thing that straddles two
> databases."**

⚠ **Two earlier misreadings, recorded because both are easy to make:**

1. ⛔ *the sandbox is a staging area you publish into and out of* — **no.
   The sandbox is containment for PLAYING against prod.** Its job is to
   let you act on real data without the world wearing the consequences.
2. ⛔ *"selecting an environment" means choosing a circle* — **no. It means
   which Mongo you are pointed at.** Today each dev session has its own
   database; prod is another. **In-engine development means developing
   against the real one.**

> ⭐⭐⭐ **Which is the competitive answer, and it is not tooling: "build
> against the real world, with the sandbox as containment."** Nobody's
> local Mongo has forty live parcels, a real economy, actual traffic, or a
> populated world to test a shopkeeper against.

## 2. ⛔⛔ The gap: the CMS's on-ramp leads to a room with no door

| backend | writes to | in git? |
|---|---|---|
| **`source`** | ⭐ **files** via `SourceTreeApi`, rooted at `packages/server/src/mud` | ✅ **committable** |
| **`content`** | ⚠ `Template` docs in the **`domain`** collection | ⛔ |
| **`document`** | ⚠ `StoredDocument` in **`documents`** | ⛔ |

> ⭐⭐⭐ **So git straddles two databases for ONE of the three backends.**
> A creator working in the CMS's *content* editor produces work that
> exists only in their Mongo — **uncommittable, undistributable, unable to
> reach another instance.**

⚠ And that is a bigger problem for *"the CMS has to be good enough that
people use it out of curiosity"* than any UX question: **somebody who
builds something good in there cannot take it anywhere.**

## 3. ⭐⭐⭐ The export — `Template.data` → pack file

> **User: "I hadn't thought about sandbox / studio → content pack but
> that's actually right. we probably want machinery for that."**

### Why it is not the retired thing

| | what it took | field |
|---|---|---|
| ⛔ `snapshotToTemplate` (retired) | a **live instance**, with captured drift baked in | the whole object |
| ⭐ **the export** | **a `Template` doc** — authored content at rest | ⭐ **`data`, the same field the CMS writes** |

⭐ Different object, different field, no drift. **And round-tripping is
faithful because `extends:` is "resolved at read, never flattened"** — the
stored row is not a flattened composite, so writing it out and reading it
back is identity.

### ⭐⭐⭐ What is exportable is already decided by doctrine

[ref-shapes.md](../../ref-shapes.md)'s identity/lineage line:

> *"A template ROW is a hydration source for **authored content only** —
> minted identities back onto `holder_snapshots` / a purpose Document /
> nothing."*

> ⭐⭐ **So: template-backed rows export; minted identities never do.** The
> filter is a distinction the codebase already enforces, so the export
> cannot accidentally serialise somebody's avatar or a per-instance mint.

### The reference resolver, which earns its keep twice

⚠ A row may name a path outside the exported set:

| reference | result |
|---|---|
| to a **published pack** | ⭐ fine — declare it in the manifest's `requires:` |
| to something **unpublished** | ⚠ **the export is incomplete and must say so** |

⭐⭐ And that check is *"is this content self-contained enough to
publish"* — **which the publish gate wants anyway.** Not export plumbing;
a gate question the export happens to need first.

### The shape

⭐ Write **into** a pack you already own rather than creating one — a pack
is *a unit of review cut as a trade*, and minting one is a parcel act:

```
pack export <packId> <path...>     # authored rows → the pack's content/ tree
pack export <packId> --dry-run     # ⭐ the change set, and what references dangle
```

⭐⭐ **The inverse reader already exists:** `pack diff` compares disk to
the record, so *"what have I changed live that isn't in my pack?"* is
answerable with shipped machinery — the natural companion, and a cheap way
to prototype the change-set logic before writing a serialiser.

⭐ **And the `document` backend too** — scripts today, dorm customisation
next. `content-packs.md` already lists *"document over `DocumentKinds`"*
as a **contribution kind**, so **packs can already ship documents** and
the target format exists for that half.

⚠ **Divergence after export** — keep editing live rows and the file goes
stale. ⭐ Not new (it is the existing go-live drift) and the export makes
it **visible**, which is an improvement. `pack diff` is the readout.

### ⭐ Studio makes it a group act

`/studio/<group>` is multiparty, so **an export from studio binds a
group** — [committee-slate](./committee-slate.md)'s facade question (b),
*who may bind us?* ⭐⭐ Its first consumer outside the client committee,
and a good one: an export is **irreversible in effect** (it is a publish
application), so it genuinely needs an authorised actor rather than any
member.

## 4. ⭐⭐⭐ Nothing reconstructs from git, and no commit hooks

The production instance **runs from a checkout**. Boot reads the DB and
the checked-out files; **it does not read history.** `GitApi` is
write-mostly — snapshot-and-push, with `status`/`diff`/`log` exposed for
the *author's* benefit at runtime, never as a source of state.

> ⭐⭐ **Git is the audit trail, not the source of truth for
> attribution.** Attribution's source of truth is `authoring_events`,
> written by **acts** — and reconstructing authorship from history would
> be **deriving a claim from evidence**, which is backwards from
> declare-then-check.

**No commit hooks.** Our own in-engine commits already carry the playerId
because `GitApi` synthesises the committer; an external contributor's
hook would run **on their machine**:

> ⭐⭐⭐ **Never depend on a hook you don't run.** A mechanism living in
> somebody else's `.git/hooks` is unenforceable by construction.

⭐ A local hook is still *nice* — lint, the `Co-Authored-By` trailer, a
work-item trailer — but the model must work when they delete it.

## 5. The door: develop anywhere, land through one gate

⭐ **There is no external push today** — one credential, nobody holds
GitLab membership. So the question was never *how do we attribute
external pushes*; it is **what is the door, and what does it demand.**

| step | what happens |
|---|---|
| 1 | the contributor submits a **bundle** + a **declaration** through an authenticated in-game act — ⭐ the only shape the engine can **witness** |
| 2 | it lands as a document — owner-scoped content with a place |
| 3 | ⭐ it is validated and **run against real data under containment** |
| 4 | the run yields the **measurement profile** — `getCircleScope()` partitions every sample |
| 5 | `recordAuthoring` fires, author **context-derived from the submitter's session** |
| 6 | the publish application = declaration + profile + the bundle's log as evidence |

⭐⭐ Step 5 is why the landing must be the recording act rather than
something inferred: `recordAuthoring`'s author **is not a parameter** —
it comes from the execution context, so **the act of landing is what
makes attribution possible at all.**

### Identity needs no mapping

> ⭐⭐ **The submitter is the author of record. The external git history is
> EVIDENCE.**

Same shape as everything else — the declaration is the claim, the log
corroborates. ⚠ A submitter claiming somebody else's work: if that person
is a player, they see the contributor set (the witness rung); ⭐ if they
are not, **they have no standing to hold anyway — standing is for members
of the polity.** A non-member's work is contributed *by* a member who is
accountable for the claim. A firm and a contractor.

### ⭐⭐⭐ And the operational answer for a live production instance

| what landed | goes live by |
|---|---|
| **rows · documents · templates** | ⭐ the **go-live split** — runtime, no restart |
| **`src/`** | ⚠ **a deploy** — process restart; *`deploy-dev` ships what is checked out* |

> ⭐⭐⭐ **External CONTENT contribution can be immediate. External CODE
> contribution lands in a queue a deploy drains.**

⭐ Which is the **same latency rule** the client-governance work landed on
twice — *a row is live; a commit waits on a deploy* — now a third
occurrence, so external contribution needs no new constraint.

⚠ **And it says what the gate must produce for code**: not a go-live, but
**a reviewed, attributed, measured artifact in the tree awaiting the next
deploy**, with the authorship rows **already written** so attribution does
not depend on anybody remembering at deploy time.

## 6. ⭐⭐ Two tiers of provenance quality — a soft pull, not a gate

| | evidence |
|---|---|
| **in-engine** | ⭐ a **witnessed trail** — one `authoring_events` row per act, `at`/`realAt`, every write through `canAtPath` |
| **external, landed as a bundle** | ⚠ **one attested arrival** with a git log attached |

> ⭐⭐⭐ **In-engine development produces better evidence.** Not a
> privilege, not a gate — a fact, and one that legitimately affects how
> far a committee can audit a magnitude claim
> ([labor-standing-slate § 8](./labor-standing-slate.md)).

⭐ Which is the right incentive: *"develop where you like, and know that
in-engine work is easier to vouch for"* rather than *"you must develop in
engine."*

## 7. ⭐⭐⭐ Two audiences, two paths — and the CMS needs an EXIT, not a win

> **User: "it needs to be good enough for claude though. that's the
> bigger problem. also I want the CMS to be good enough that people will
> want to use it just out of curiosity."**

Taking the agent case seriously: what an agentic tool wants is **a shell
and a filesystem** — grep the tree, run the tests, iterate without
round-trips.

> ⭐⭐⭐ **In-engine development will never be good enough for an agent,
> because the gap is not autocomplete — it is the SHAPE OF THE
> WORKSPACE.** A REST tree is not a checkout, and no polish makes it one.

So do not make them compete:

| path | audience | wants |
|---|---|---|
| ⭐ **CMS, in-engine** | **the uninitiated** — ships with the game, zero setup | curiosity, immediacy, **real data**, nothing to install |
| ⭐ **external checkout** | the serious dev **and their agent** | a shell, a filesystem, tests, speed |
| ⭐⭐ **the in-CMS agent** (§ 7a) | **anyone authoring CONTENT** | ⭐ **live reference resolution** — the thing a checkout cannot give |

> ⭐⭐⭐ **The CMS does not need to beat Claude Code. It needs an EXIT.** A
> creator starts there out of curiosity, builds something, and when they
> outgrow it **takes their work with them** — as pack files, in git, in
> their own checkout.
>
> **The on-ramp's success criterion is that LEAVING IS POSSIBLE, not that
> staying is sufficient.** Which is why § 3's export is the load-bearing
> piece in this whole slate.

### What the external path needs — and it is mostly written already

| need | what we have |
|---|---|
| engine-aware completion, validation, navigation **in their editor** | ⭐⭐ the **LSP server** — [authoring-intelligence-slate](./authoring-intelligence-slate.md), whose stated keystone is *"the engine-aware intelligence travels to whatever editor a coder prefers"* |
| ⭐ a machine-readable model of **what an author may call** | ⭐⭐⭐ **`author-surface.json`** — already generated by `pnpm docs:project`, already partitioned consumer / extension / internal, **generated so it cannot drift** |
| access from outside | ⭐ **scoped personal access tokens** (content-vs-source scope) — [cms-connectors-slate](./cms-connectors-slate.md)'s named prerequisite |
| per-parcel conventions for an agent | ⭐ a document in the tree; authors write their own |

⭐⭐ **`author-surface.json` is the one I would point at hardest for the
agent case** — it is exactly what an agent needs to be good at *our*
domain, and we did not build it for this.

## 7a. ⭐⭐⭐ The third path: an agent IN the CMS — because content is JSON

> **User: "claude still wants to write content… thats why I wanted to
> have like an agent in the CMS too. this is all just json no
> javascript."**

### ⭐⭐⭐ The unlock, and it skips three gates

| gate | why content skips it |
|---|---|
| **code trust** | ⭐⭐ `isWizard` gates eval, reload, source writes **and the `class` / `hydratorClass` / `behaviors[].brain` template fields.** ⭐⭐⭐ **Those three fields ARE the code-trust surface inside content.** Everything else in a row is data, gated only by `canAtPath` — parcel title |
| **a deploy** | ⭐ rows go through the template store with the **go-live split** — runtime, no restart |
| **a containment run** | a bad row makes bad content; it cannot make an infinite loop |

> ⭐⭐⭐ **So an agent writing JSON in the CMS is not a privilege
> escalation** — the dangerous fields are *already* separately gated, by a
> distinction that shipped for other reasons.

### ⭐⭐⭐ And it has the one thing no external agent can have

> **Live reference resolution.** An external agent *guesses* whether
> `/stuff/idea/material/oak` exists, whether that `class:` is
> instanceable, what is in the neighbouring room, what the locality's
> voice sounds like. **An in-CMS agent can ask.**

⭐ Which inverts § 7's conclusion in a useful way rather than
contradicting it: in-engine will never beat a checkout **for code** — but
for **content** the advantage runs the other way, because content
correctness is mostly *runtime facts* (resolvable paths, closed
vocabularies, existing neighbours) and those live in the running world,
not in a schema.

⭐⭐ **And its tools largely ship.** `studio.md`: `StudioApi.listMixins` /
`describeMixin` / `describeClass` over `@authorable` TSDoc, plus named
**blueprints**.

> **That catalogue is not documentation — it is a tool surface.**
> `describeClass` is a function an agent calls. The toolset is: describe
> mixins/classes · resolve a path · read neighbouring content · write a
> row (gated) · go-live — **nearly all existing gated Apis.**

### Why the running game needs this path at all

`pack sync` *does* support a live apply — *"the same reconcile, then
re-hydrate"* — but ⚠ it is an **operator** act and it is **pack-wide**.

> **Neither the authority nor the granularity of "I edited one room."**
> ⭐ The template store + go-live is the only **per-row, per-author,
> no-restart** write path that exists. **The pack-file loop is a dev loop
> and always was.**

### Scope: content yes, scripts no

⭐ Documents are *"more records than creative"* — wiki, forum, calendar,
contacts. ⚠ **With one exception: `script` IS code**, and its write
funnels through `ScriptApi.saveScript` — *"the script chokepoint: gate +
provenance + AST go-live."*

> ⭐ **So the agent writes content and never scripts, and the chokepoint
> is already where that line gets drawn.** No new rule — just do not give
> it that tool.

### ⭐⭐ Authorship needs no special case

`recordAuthoring`'s author is **context-derived**, so an agent writing a
room under your session makes **you** the author.

> ⭐ **You are the author of what you directed** — as if you had
> commissioned it from a person — so
> [labor-standing-slate](./labor-standing-slate.md) needs no
> agent-shaped exception.

⭐⭐⭐ And **disclosure stays an option rather than a forced question**,
because the precedent exists: `MediaAsset` already records
`prompt` / `model` / `size` / `quality` for generated images. Extending
that record to content rows is the same shape — which lets the polity
decide later whether it cares.

⚠ **One shape to settle before it is built the other way:**
`llm-content-slate`'s rule is *the LLM rides the bus, never the client.*
For the CMS that means the agent is **a command-bus participant with a
card**, not a chat widget bolted onto Monaco.

## 8. ⭐ The nightly mirror — and it may already exist

> **User: "maybe we also want a nightly mirror developers can point to
> safely from their own environments."**

⚠ A mirror cannot include state: `player_frames` is owner-only, avatars
are people, the bank ledger is money. So a usable mirror is
**content-only and state-stripped** — templates, packs, world rows, no
players.

> ⭐⭐⭐ **Which is approximately "publish the installable content set"** —
> and content packs are *already* the distribution unit with `PackApi`
> reconcile as the installer. So a developer's local instance gets
> real-shaped content by **installing the published packs**, not by copying
> a database: **no privacy surface, no new pipeline, and it versions.**

⚠ What it will not give them is **traffic, economy state, or a populated
world** — ⭐ which is precisely what in-engine offers and a mirror cannot.
**So the two paths stay genuinely different rather than one dominating:
external gets the content, in-engine gets the world.**

## 9. Open questions

1. ⚠⚠ **Can the containment actually run externally-authored `src/`?** A
   *new class* that did not exist at boot is a hot-reload question
   ([hot-reload.md](../../subsystems/hot-reload.md)'s state machine would
   have to accept it). ⭐ If it cannot, step 3 degrades to *validate
   statically, measure nothing* — and the publish application loses its
   profile, which breaks the triple duty.
2. ⚠ **What if the game is not running when somebody submits?** Then
   there is no door. ⭐ Fine for landing (it waits), but **the submission
   queue must be durable and the measurement happens whenever the gate
   next runs** — worth designing as async from the start rather than
   discovering it.
3. ⭐ **Who reviews an external code submission?** Code-trust is
   `isWizard` **and** title, so an external contributor without code trust
   submits and a code-trust holder inside the committee lands it. ⭐⭐
   **External contribution is therefore always sponsored by a member** —
   the firm-and-contractor shape, enforced by the existing conjunction
   rather than a new rule.
4. **Does the export round-trip losslessly for `extends:` chains that
   cross packs?** The parent may be in a pack the exporting dev has
   installed but does not own; § 3's resolver should classify that as a
   `requires:` rather than an incompleteness, but it is the case most
   likely to be got wrong.

## Cross-refs

- [cms.md](../../subsystems/cms.md) — the three backends, and § 2's gap.
- [content-packs.md](../../subsystems/content-packs.md) — `pack sync` /
  `pack diff`, the contribution kinds, the manifest's `requires:`.
- [labor-standing-slate.md](./labor-standing-slate.md) — what the
  declaration carried at landing is *for*, and the audit join.
- [attribution-slate.md](./attribution-slate.md) § 4e — *the sandbox
  profile IS the publishing application*, which § 5 makes true for
  externally-authored work too.
- [committee-slate.md](./committee-slate.md) — facade (b), the authority
  an export binds.
- [authoring-intelligence-slate.md](./authoring-intelligence-slate.md) +
  [cms-connectors-slate.md](./cms-connectors-slate.md) — the external
  path's tooling, already designed.
- [sandbox.md](../../subsystems/sandbox.md) — containment for playing
  against prod, which is what it is *for*.
- [git-workflow.md](../../subsystems/git-workflow.md) — one credential,
  the synthetic committer, and *rollback is additive `revert` only*.
