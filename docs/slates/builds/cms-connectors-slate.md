# CMS connectors slate — your own editor, and your own Claude Code, against the live runtime

> **Status: PARTIAL** — the surface it adapts shipped (the unified tree,
> `CmsApi` read/write/stat/listTree, the REST data API, the gating table,
> save go-live) → [cms.md](../../subsystems/cms.md); no connector exists,
> and no non-session auth path exists anywhere in the backend. Captured
> as a design conversation, not requirements.
> ⭐⭐⭐ **PRIORITY RAISED 2026-10-04** (Part 2a): the MCP half is not a
> convenience for editor preferences — it is **the primary path for any
> creator who brings an agent**, who *"wont even use the cms UI."* The
> 2026-09-01 note (*"though it's not a big priority yet"*) is superseded.
> **Left:** scoped personal access tokens (content-vs-source scope) · the
> MCP server (`tree`/`read`/`write`/`diagnostics`/`run`) · WebDAV over
> `source` + `document` · read-only WebDAV over `content` · the
> content-backend `MKCOL`/`DELETE`/`MOVE` semantics
> **Size:** a build

**Captured 2026-09-01.** Two asks that look like one feature and are
not: **(a)** edit source/content/documents from your own editor, and
**(b)** point your own Claude Code account at the runtime and author
*inside it*, rather than through git push/pull.

**Provenance:**

> **User: "how much work would it be to build a connector so people
> could use their favorite editor to edit source/content/documents. we
> have monaco in our client but most editors have like ssh connectors
> … same thing with like letting people use their own claude code
> accounts to develop content and code for the game inside the runtime
> not like based on git pushes and pulls."**

**Sits on:** [cms.md](../../subsystems/cms.md) (**the shipped surface
this adapts — read first**: the unified-tree projection, `CmsApi`, the
REST data API, the gating table, save go-live),
[access.md](../../subsystems/access.md) (`canAtPath`, `isWizard` — the
gates that make or break this),
[document-store.md](../../subsystems/document-store.md),
[shell-workspace.md](../../subsystems/shell-workspace.md)
(`SourceTreeApi`), [hot-reload.md](../../subsystems/hot-reload.md)
(go-live), [deployment.md](../../deployment.md) (the dev box's
**writable git checkout** — Part 3's reframe),
[git-workflow.md](../../subsystems/git-workflow.md) (`GitApi` — the
*other* model, deliberately not this one).

---

## Part 0 — The finding: both are thin adapters, and one prerequisite blocks both

`CmsApi` is already a **filesystem primitive set**:

*(the method ↔ route table → cms.md § `CmsApi` / `CmsLogic`, § REST data API — six routes, `diagnostics` included)*

Gated server-authoritatively on a **context-derived** actor, per-path
for content, `isWizard` for source. **Nothing about the connector work
requires new authoring machinery** — it is protocol adaptation over a
complete, gated surface.

⚠⚠ **But every route is `AuthMiddleware.requireAuthApi` — session cookie
only. There is no bearer / API-key / personal-token path anywhere in the
backend** (verified: zero non-OAuth-provider token auth in
`src/backend/`). So **no external tool can authenticate at all today**,
and that is the single gate on both asks.

---

## Part 1 — The prerequisite: scoped personal access tokens

Issued in-game, stored hashed, checked in middleware beside the session,
revocable, listable by the owner.

⭐ **The scoping is the design, not the plumbing** — because of Part 4's
split. At minimum a token must distinguish:

- **content/document scope** — safe to hand out; the per-path gates hold.
- **source scope** — `isWizard`, i.e. **root** (Part 4).

A token that cannot express that distinction is a token that turns every
author connector into a root connector.

---

## Part 2 — Ask (b): MCP is the right protocol, and the smaller build

⭐ **Claude Code speaks MCP natively, and an agent does not want a
filesystem — it wants tools.** So this is not "mount the tree"; it is a
handful of tools wrapping methods that already exist:

| tool | wraps | note |
|---|---|---|
| `tree` | `CmsApi.listTree` | |
| `read` | `CmsApi.read` | |
| `write` | `CmsApi.write` | **go-live is already in this path** |
| `diagnostics` | `/api/cms/diagnostics` | what an agent needs to see if its edit broke something |
| `run` | a verb through the command bus | optional; the "try it" loop |

**No rename / mkdir / delete semantics required** — which is exactly the
awkward part of Part 3, sidestepped entirely.

Two shipped properties make this unusually good:

1. **The write path already validates → persists → reloads**, so an
   agent's edit goes live exactly as a Monaco save does. This *is* the
   "inside the runtime, not git push/pull" model the user asked for —
   the connector only grants external access to it.
2. **`diagnostics` already exists**, so the agent has a feedback signal
   without new instrumentation.

**Size: small.** The tools are 1:1 with shipped methods; the real work
is MCP scaffolding, Part 1's token, and tool granularity.

---

## Part 2a — ⭐⭐⭐ Revisited 2026-10-04: this is the PRIMARY creator path

**Captured after the authoring-agent conversation.** Part 2 reads as a
convenience for people who prefer their own editor. It is more than that:

> **User: "claude users wont even use the cms UI they'll just use the MCP
> and test drive their own changes via a live browser."**

⭐⭐ Which changes the priority rather than the design — the five tools and
the token are right as written. Four amendments:

### ⭐⭐⭐ 1. `run` is not optional — it is the loop

Part 2 marks `run` *"optional; the 'try it' loop."* Promote it.

> **`run` + reading the envelope IS the live-drive loop with the creator
> as the driver** — and live-drive shipped (MR !281) with the finding
> *the agent is a **participant**, not a feed; the world IS the render.*

⭐⭐ And it splits cleanly from the browser, which matters because the
user named both:

| | verifies |
|---|---|
| ⭐ **`run`** (the agent) | **correctness** — did my edit do what I meant |
| ⭐ **the browser** (the human) | **taste** — is it any good |

> **An agent without `run` needs a human for every check.** The browser is
> for judgment, not for verification.

### ⭐⭐⭐ 2. A token may NEVER carry source scope — and it is a RULE, not prudence

Part 1 offers content-vs-source scoping and warns that a token which
cannot express the distinction *"turns every author connector into a root
connector."* [agency-slate](./agency-slate.md) has the stronger form:

> ⭐⭐⭐ *"**Code-trust NEVER flows through agency** — if Bob is a wizard,
> Alice-as-Bob's-agent is **not**. Same class as *no office may inherit
> code-trust* — **the one axis nothing may launder.**"*

**A PAT is a delegation.** So a source-scoped token is not a dangerous
option to scope carefully — **it is forbidden by a rule we already hold.**

> ⭐⭐ Which makes the design **simpler**: tokens are **content / document
> only**, and the root-connector risk **disappears** rather than being
> managed. ⭐ Source already has a connector and it is called SSH
> (Part 3), reached by a human with code trust — not by a delegation.

### ⭐ 3. A third scope Part 1 does not name: no image generation

Per [illustration-slate § 2a](./illustration-slate.md) — generation stays
central because **BYO would convert private money into commons storage
pressure.** So a creator's own agent must not reach it, and the tool
surface enforces that **by simply not exposing it as a tool.**

### ⚠ 4. The hazard: a token authors in your name, permanently

A token acts as you, so `recordAuthoring`'s context-derived author **is
you** — and `authoring_events` is append-only.

> ⚠ **A leaked token authors in your name and the rows persist.**
> `chronicle`'s **deed vs claim** lets you dispute them and
> [labor-standing-slate](./labor-standing-slate.md)'s renewal lets you
> decline the credit share — **but the authorship rows do not go away.**

⭐ The blast radius is at least bounded by **your own grant lines**
([attribution-slate § 7](./attribution-slate.md)), so a runaway agent
spends your quota and not the commons' — a dividend of having designed
the economy first.

### ⭐⭐ And what it means for the CMS UI

If serious creators live in MCP + browser, the UI's audience narrows to
**the uninitiated** (ships with the game, nothing to install) and to
**inspection** — seeing what is there, which is a different job from
editing.

> ⭐⭐⭐ **So resist building a great EDITOR in the CMS; build a great
> BROWSER-AND-STARTER.** Which is the same conclusion
> [contribution-slate § 7](./contribution-slate.md) reaches from the other
> side: *the on-ramp's success criterion is that **leaving is possible**,
> not that staying is sufficient.*

### ⭐ Why no `eval`, ever — and why that is the better design

The authoring-agent conversation reached for `eval` and rejected it:

| | `eval` | tools |
|---|---|---|
| gate | ⛔ `isWizard` — and *any argument ending in a wizard check is wrong by shape* | ⭐ the per-path gates already hold |
| action space | ⛔ unbounded, unauditable | ⭐ **enforced by the schema** |
| failures | arbitrary traces | ⭐ **typed refusals**, and *the refusal is the progression UI* |

> ⭐⭐ **An agent with `eval` is strictly worse than one with typed
> tools** — same finding as the NPC brain, where *its verb list **is** its
> tool schema.*

⚠ **And the gaps `eval` would have papered over are narrower than they
look:** bulk edit is [scripting.md](../../subsystems/scripting.md)'s
command-native interpreter (`def`/`make`, a game-time Coroutine — a
script in the game's own language, gated by the verbs it may call);
search is MQL plus the per-owner text index; and running tests is
genuinely absent in-engine and arguably should be.

> ⭐⭐⭐ **The real gap list is two items, both already slated:**
> **validation** ([authoring-intelligence-slate](./authoring-intelligence-slate.md))
> and **export** ([contribution-slate § 3](./contribution-slate.md)).

### ⭐⭐ One property worth keeping

An MCP tool must carry a schema and a description. So **every operation
afforded to an agent gets documented by construction** — which is
`callable == visible == cared-about` extending to the agent surface for
free.

---

## Part 3 — Ask (a): a reframe that shrinks it, then WebDAV for the rest

### ⭐ Source already has a connector, and it is called SSH

The dev box runs **natively from a writable git checkout** via `tsx` so
authors can `write`/`reload` live, and it already carries shell users. So
**VS Code Remote-SSH, JetBrains and vim already work against mudlib
source today** — no build required.

> **The gap is not source. The gap is content and documents**, which live
> in Mongo and have no filesystem projection at all.

### WebDAV is the right protocol for the gap

It is HTTP verbs over a tree, mountable natively on macOS/Windows/Linux,
and it maps nearly 1:1 onto the existing routes:

| WebDAV | maps to |
|---|---|
| `PROPFIND` | `listTree` |
| `GET` | `read` |
| `PUT` | `write` |
| `DELETE` | ✗ **missing** |
| `MKCOL` | ✗ **missing** |
| `MOVE` | ✗ **missing** |

⚠ **Those three are design, not plumbing.** In the `content` backend a
folder is a **Zone template**, and *some folders are synthesized* for
intermediate path segments that have no template doc at all (`/obj`,
`/lib` are browsable without existing). So "mkdir" means *create a Zone
template*, and "delete a folder" means something nobody has decided.

⭐ **Which scopes itself:** WebDAV over **`source`** and **`document`** is
straightforward (real files; a real path-addressed store). Over
**`content`** it is semantically awkward and should ship **read-only
first**, if at all.

**Size: medium**, and most of the cost is content-backend semantics
rather than protocol.

---

## Part 4 — ⚠⚠ The split that should drive the whole design

The shipped gating table already draws the line, and it is sharper than
it reads:

| | gate | what a connector grants |
|---|---|---|
| **content / document write** | `canAtPath` / own `/home/<key>` / zone `protection` | an author who **cannot escape their extent** — safe |
| **source write** | `isWizard` | ⚠ **root over the network** |

By the standing resilience posture, **TypeScript access IS root** —
write+reload reaches the whole import graph, and the import boundary is
CI-only, not a runtime perimeter.

> ⭐⭐ **These are two different products wearing one name.** The
> content/document connector is the community feature and is what the
> token scoping exists to protect. The source connector is a personal
> convenience for people already trusted with the box — which is why
> **SSH-to-the-checkout is arguably the *correct* answer for source
> rather than a shortfall.**

Designing them as one "CMS connector" is how the safe one ends up
carrying the unsafe one's blast radius.

---

## Suggested ordering (when it is picked up)

1. **Scoped personal access tokens** — unblocks both; the scoping is what
   makes everything after it safe.
2. **MCP server** — smallest build, largest payoff, and the ask with **no
   workaround today**.
3. **WebDAV over `source` + `document`** — editors, clean semantics.
4. **`content` over WebDAV, read-only** — and only decide mkdir/delete
   against a synthesized tree if someone actually needs them.

---

## Open questions

1. ⭐ **Token scope vocabulary.** Minimum is content-vs-source. Does it
   want per-extent scoping too (a token good only for *my* home /
   *my* parcel), which would make a leaked token near-harmless?
   Expiry? A per-token audit trail through the existing attribution
   bridge?
2. ⚠ **Content-backend filesystem semantics.** What is `MKCOL` (a Zone
   template?), what is `DELETE` on a folder, and what happens to a
   *synthesized* folder that has no doc to delete? The honest default
   may be "content is read-only over WebDAV, forever."
3. **Does the MCP server run in-process or beside?** In-process reuses
   `CmsApi` directly and the gates for free; beside means it speaks the
   REST API like any other client and stays deployable separately.
4. **Attribution.** The CMS has an attribution bridge that stamps the
   acting author. An MCP/WebDAV write must land on the **same** bridge —
   an edit that arrives without provenance is worse than no connector.
5. **Concurrency.** Monaco, an editor mount and an agent can now all
   write the same node. Is last-write-wins acceptable, or does `stat`
   need to carry a version the write must match?
6. **Does `run` belong in the MCP surface?** Executing verbs is a much
   larger authority than editing files, and it is the difference between
   an authoring tool and a remote control.
7. **Is anon/read-only worth exposing?** The CMS deferred anonymous read;
   a read-only public MCP or WebDAV view of shipped content might be a
   nice front door, or an information-leak surface.

---

## What this slate does NOT cover

- **The CMS itself** — [cms.md](../../subsystems/cms.md) owns the tree,
  the editor, go-live; this only adapts it.
- **`GitApi` / the git-workflow model** — the *other* answer to "author
  remotely," deliberately not this one. The user asked specifically for
  live in-runtime editing rather than push/pull.
- **The wizard/code-trust model** — [access.md](../../subsystems/access.md)
  owns it; Part 4 only reports its consequence for connectors.
- **A bespoke VS Code extension** — considered and set aside: most
  control, most work, serves exactly one editor. WebDAV serves all of
  them for less.
- **Remote-SSH provisioning** — if source-over-SSH becomes the sanctioned
  path, who gets shell on the dev box is a deployment/access question,
  not a connector one.
