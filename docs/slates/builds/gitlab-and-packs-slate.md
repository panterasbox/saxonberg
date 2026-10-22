# GitLab and packs slate — three front doors, content packs and mods, packs in their own repos

> **Status: UNBUILT** — designed at high level 2026-10-22 with the owner, out of the stream
> overlay conversation ([broadcast-ready](./broadcast-ready-slate.md)). What ships: the
> in-client git facade — authors never touch git; `GitApi` commits the live tree and pushes
> ([git-workflow.md](../../subsystems/git-workflow.md)); authoring by title over a resource,
> never a tier ([access.md](../../subsystems/access.md)); packs with `maintainers`, and the
> rung recorded at install — a pack with `src/` is a *capability pack*
> ([content-packs.md](../../subsystems/content-packs.md)); GitLab issues for limited bug
> tracking; CI on GitLab.
> **Left:** the three front doors · ⭐ the **content pack / mod** split — the name and the
> enforcement · packs in their own repos (the platform pack stays with the engine) · the
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

## 2. ⭐⭐⭐ Content packs and mods **[DECIDED — the owner]**

The owner: *"you're bringing back a concept I had originally that we kind of abandoned — two
different jargon for downloadable content: content packs and mods, mods being things that
actually have TypeScript modules in addition to just Mongo content. We kinda just made
everything one thing, but your split, at least in terms of nomenclature, sounds probably
like a good thing."*

- **A content pack ships data only** — rows, documents, prose, images.
- **A mod ships code** — any TypeScript or JavaScript module, alongside its data.
- Today's ladder is *data pack · capability pack · mod*, where "mod" meant a change that
  needs a kernel MR. The rename: **capability pack → mod**, **data pack → content pack**,
  and the old "mod rung" is simply **a kernel change** (not downloadable at all). A
  deliberate sweep of the docs and the code's words, not a piecemeal rename.

### ⭐⭐⭐ Enforcement — on the artifact, never on the person

The owner: *"how does enforcement work? You're basically checking isWizard for every
contributor and then checking whether they're writing script or data. The src folder check
doesn't really matter, just the file type."*

- **The discriminator is file type.** Any module file (`.ts`, `.tsx`, `.js`, `.mjs`) makes a
  pack a mod, wherever it sits — not a `src/` folder.
- ⭐⭐ **No per-person check.** Code enters the running server at exactly one boundary: the
  **deployment** — the operator lists the packs a server runs. So the gate is there, and it
  is a seat (the operator), never `isWizard` on a contributor:
  - a **content pack** installs as now;
  - a **mod loads only if the deployment admits it as a mod** — an explicit operator act;
  - ⭐ **a content pack that gains a module file stops loading, loudly**, until an operator
    admits it as a mod. Break loudly, never silently run new code.
- **Who may push to a repo** is GitLab's permission on that repo, not ours. A content
  developer may write anything in their repo; if they write code, the result is a mod, and a
  mod does not run until an operator says so.
- So the "interim level between mortal and wizard" needs **no new account level**: a content
  developer is a **maintainer of a content pack** (the manifest's `maintainers`, title over
  a resource), working in real git instead of the facade.
- ⚠ **Data that names code is still data** — a row's `class:` or a behavior's `brain:` names
  code that a deployed mod or the kernel already provides. access.md gates those fields on
  wizard today and records that the justification is wrong for `class`; this split is the
  occasion to settle it.

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

1. **The rename sweep** — capability pack → mod, data pack → content pack, across docs and
   code.
2. **How a deployment admits a mod** — a manifest flag, a list, an operator verb.
3. **The pack audit** — which packs are platform.
4. **The repo split** — order, and how dependent packs version against each other.
5. **Alternatives to GitLab issues** — in-game tracking, or another tracker.
6. **The `class:` / `brain:` gate** — settled by the split, or its own decision.
