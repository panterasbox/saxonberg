# GitLab and packs slate — three front doors, content packs and mods, packs in their own repos

> **Status: UNBUILT** — designed at high level 2026-10-22 with the owner, out of the stream
> overlay conversation ([broadcast-ready](./broadcast-ready-slate.md)). What ships: the
> in-client git facade — authors never touch git; `GitApi` commits the live tree and pushes
> ([git-workflow.md](../../subsystems/git-workflow.md)); authoring by title over a resource,
> never a tier ([access.md](../../subsystems/access.md)); packs with `maintainers`, and the
> rung recorded at install — a pack with `src/` is a *capability pack*
> ([content-packs.md](../../subsystems/content-packs.md)); GitLab issues for limited bug
> tracking; CI on GitLab.
> **Left:** the three front doors · the names (pack · mod · DLC) · ⭐ enforcement in three
> layers with the game as the authority · ⭐ the inert clone per pack and the invariant that
> nothing is pulled into a running tree · the optional pack guard · packs in their own repos (the platform pack stays with the engine) · the
> pack audit — which packs are really platform · GitLab issues with an in-game front door ·
> GitLab account linking · GitLab as an optional integration a realm turns on · the overlay's
> project feed
> **Size:** a build

## 0. The problem **[DECIDED — the owner]**

*"I wanna get people into the app for either playing or creating content, but that might
mean giving them git access — definitely for wizards. We might need an interim level
between mortal and wizard for content developers that want to work on packs in their repos.
They still can't write TypeScript modules but they can commit content to the git repo. …
We have a model right now where we always commit within the client itself so you never have
to deal with git yourself — it's all hidden behind a facade. But I'm gonna wanna give real
GitLab access to some people, maybe a lot of people."*

## 1. ⭐⭐ Git is the substrate; three front doors for three audiences **[DECIDED]**

| audience | front door | sees GitLab? |
|---|---|---|
| players | the game — they report bugs in game and never need an account | no |
| authors | the game — the in-client facade commits for them, as now | no, unless they want to |
| content developers, wizards | GitLab directly — repos, merge requests, review | yes |

[contribution-slate](../tails/contribution-slate.md) § 7 (*two audiences, two paths*) is the
in-game half; this slate is the GitLab half.

## 2. ⭐⭐ Packs and mods — the names **[LEAN — the owner's]**

The owner: *"you're bringing back a concept I had originally that we kind of abandoned — two
different jargon for downloadable content: content packs and mods, mods being things that
actually have TypeScript modules in addition to just Mongo content."* And: *"what about 'DLC'
vs 'mod'? … I dunno what's the most used."*

How games use the words:

- **DLC** almost always means **official content from the developer**, often paid
  (Paradox's expansions, Bethesda's add-ons, Steam DLC) — it says *who made it*, not what is
  in it.
- **Mod** usually means **made by the community** — and most mods in the big modding scenes
  are data (a Skyrim plugin is mostly records); in Factorio everything is a mod, in Lua.
- ⭐ **Minecraft splits on code against data** — the owner's split: built-in, code-free
  **data packs** and **resource packs**, and **mods** in Java that need a loader.

The lean: **pack** for data, **mod** for code (Minecraft's convention); **DLC** only for
official storefront content, if the [distribution](./distribution-and-hosting-slate.md)
storefront ever sells any. Today's ladder (*data pack · capability pack · mod*, where "mod"
meant a kernel MR) becomes **pack · mod**, and the old mod rung is simply **a kernel change**.
The final words are the owner's; the rename is a deliberate sweep, not piecemeal.

- **The discriminator is file type** — any module file (`.ts`, `.tsx`, `.js`, `.mjs`) makes it a
  mod, wherever it sits; not a `src/` folder.

## 2a. ⭐⭐⭐ Enforcement — the game is the authority, in three layers **[DECIDED — the owner]**

The owner: *"troubleshooting issues happens on a live install, and you just work directly on
the live compilation units on disk or data in Mongo. That's all gonna check wizardness on a
live running game, even if your own pack's git repo doesn't care. I would think the repo
maintainer would want to respect the game's permissions then, even if it doesn't have to.
But they have no way to do that under your model."* The first draft enforced only at the
deployment and left the repo blind; corrected:

| layer | owner | required? |
|---|---|---|
| **the in-game path** — export, the inert clone, commit (§ 2b) | the game's permissions | always, for anyone working through the game |
| **the pack guard** in CI (§ 2c) | the repo's maintainers | ⭐ optional — their choice |
| **admitting a mod** at deployment | the operator | always |

- **The game decides who is who** — who is a wizard, and who maintains which pack (the
  manifest's `maintainers`, title over a resource). That is the existing code-trust axis and
  the existing title axis — no new account level. A content developer is a maintainer of a
  pack.
- **The deployment is the backstop** — a pack containing a module runs only once an operator
  admits it as a mod, whatever its repo allowed; ⭐ a pack that gains a module file stops
  loading, loudly, until admitted.

## 2b. ⭐⭐⭐ The inert clone — how a live instance contributes **[DECIDED — the owner]**

The owner: *"the alternative is letting someone do a git clone inside saxonberg … only wizards
get directories in the source tree, though, because only they can write source … unless you
do git clones to some other space outside the source tree in the game, and it's not managed
as source, it's just managed as an inert git clone just for git operations."*

- **One working copy per pack, outside the source tree** — never loaded, never executed; the
  server runs only what is deployed. It exists for git and nothing else.
- **It is the export's target** — edit live (content in Mongo by title, source by code trust),
  export Mongo to pack files ([contribution-slate](../tails/contribution-slate.md) § 3, the
  export), and the files land in the pack's clone.
- **Its permissions are the game's** — content files need title over the pack; ⭐ module
  files need code trust to commit, the same check the source tree uses. A text file in an
  inert clone is not code until merged and deployed, but the commit respects who may author
  code.
- **Checked out by the pack's maintainers**, by linking the pack to its repo on this instance.
- **Per pack, not per person** — content is shared world state; contributors work on branches.

```
edit live (Mongo by title · source by code trust)
  → export into the pack's inert clone
  → commit (module files need code trust)
  → push a branch → merge request (the pack guard, if the repo uses it)
  → merge → the operator deploys → the install reconciles
```

### ⛔ Invariant — nothing is ever pulled into a running tree

The owner: *"that works as long as we assume the clones are all inert. If we ever do this
with the live git clone we're in for trouble."* A pack's clone is **inert**: never loaded, and
**nothing is ever pulled or merged into a running tree.** Code reaches a running game one way
only — deployment, then the install's reconcile. The only live tree is the engine's own
checkout, which `GitApi` commits from and only **pushes out**
([git-workflow.md](../../subsystems/git-workflow.md) records why it can never switch or pull
under a running server). Pack clones never gain that power.

## 2c. ⭐⭐ The pack guard — optional, and the maintainer's **[DECIDED — the owner]**

The owner: *"someone cloning the repo and trying to contribute should be rejected if the game
doesn't know about them. And all this should be optional too — it's still up to a repo
maintainer how they wanna run their repo. It's just to their benefit to restrict code
changes to wizards."*

- Anyone can fork a public repo and open a merge request; the check happens at **merging**,
  where a repo can say no.
- **The guard is a CI component a maintainer chooses to include** (one `include:` line). On
  every merge request it asks the pack's **home instance** two questions:
  1. **Does the game know this person?** — is the merge request's GitLab author linked to a
     game identity? If not: *"the game doesn't know you — link your GitLab account in
     Saxonberg to contribute."*
  2. **May they do this?** — content files need the pack's maintainers; module files need a
     wizard.
- ⚠ **It checks the merge request's author, never a commit's** — a commit's name and email are
  text anyone can type.
- **It binds only when required** — GitLab's *pipelines must succeed*, and never behind a
  manual start.
- **The home instance** — a pack may run in several realms, so it names its authority in its CI
  settings.
- **Why a maintainer would** — a pack whose history holds only changes the game would have
  allowed is one operators can admit easily; an unguarded pack is reviewed the hard way.

## 3. ⭐⭐ Packs in their own repos **[LEAN — the owner]**

The owner: *"probably in their own repos. At some point I need to audit our content packs
and figure out which ones aren't really optional and should be platform. At the very least
the platform pack will want to be in the same repo as the rest of the game, but most of the
other packs probably should move to their own repos."*

- **The platform pack stays with the engine.**
- **The audit comes first** — which shipped packs are not really optional and belong in
  platform (a pack every world needs is platform by another name).
- **Then most packs move to their own repos** — content developers stay out of the engine,
  and the deployment manifest (already `pnpm add @saxonberg/content-<id>`) is the only file
  that changes per pack, as content-packs.md already anticipates.
- Separate repos sidestep per-folder ownership in the monorepo (GitLab's code owners may be
  a paid-tier feature).

## 4. Issues — GitLab for now, with an in-game front door **[DECIDED for now — the owner]**

The owner: *"issues in GitLab is fine for now. I'm not wild about it, I'd kinda like to
explore alternatives, but it works for what we need it to do right now."*

- **GitLab is the system of record** for tracking.
- ⭐ **An in-game front door** — a report verb or card files an issue through the API;
  players never need an account, and the reporter sees its status back in game.
- **Discussion and ideas stay in-game**, in the forums ([forums.md](../../subsystems/forums.md)):
  talk is diegetic and open to everyone; tracking is GitLab's. That split avoids the main
  cost of GitLab — two homes for discussion.
- **Alternatives** stay open (§ 8).

## 5. Identity and access **[LEAN]**

- **GitLab account linking** works as Twitch linking does; GitLab is also an OAuth provider,
  so it can be a login.
- **Review and merge** are GitLab's merge requests; its approval rules **enforce** who may
  merge into a shared world — the Compact's meta committee **decides** it.
- ⚠ **Seats** — GitLab.com's free tier limits private groups to a few users; as an AGPL public
  project the platform likely qualifies for GitLab's open-source program. Check before
  planning on *a lot of people*.

## 6. ⭐⭐ GitLab is an optional integration **[DECIDED]**

Git is portable; GitLab's API is not. Self-hosted realms ([managed
hosting](./distribution-and-hosting-slate.md)) may not use GitLab, so **the core depends only
on git**, and issues, merge requests and the overlay's project feed are **an integration a
realm turns on**.

## 7. The overlay's project feed

The stream's passive build content reads real project state instead of guessing what an
agent is doing (*"which may be nothing at all, depending on the stream schedule"*): the
current milestone and its progress, open merge requests and their pipelines, just merged
(the changelog), issues closed this week, and ⭐ *"your bug report got fixed"* — a player's
in-game report closing on stream. See [broadcast-ready](./broadcast-ready-slate.md) § the
lower third.

## 8. Open

1. **The words** — pack · mod · DLC, the owner's to settle; then the rename sweep.
2. **How a deployment admits a mod** — a manifest flag, a list, an operator verb.
3. **The pack audit** — which packs are platform.
4. **The repo split** — order, and how dependent packs version against each other.
5. **Alternatives to GitLab issues** — in-game tracking, or another tracker.
6. **The `class:` / `brain:` gate** — data that names code; settled by the split, or its own
   decision.
7. **The inert clone's home** — where on disk, and how a pack is linked to its repo.
