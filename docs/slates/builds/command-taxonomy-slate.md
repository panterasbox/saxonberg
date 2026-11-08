# Command taxonomy — fewer verbs, each one doing more

> **Status: PARTIAL** — seeded at the storage-and-ice review (MR !378,
> 2026-10-18); built at controllers-are-io (MR !527, 2026-11): the
> subcommand rule written with its edges (D9), `category:` on every view
> with `help` by category (D24), `lint:command-views` (the schema gate,
> D26), `lint:institution-verbs` (census → ceiling 0), the sweep (`house
> appoint`, `job apply`, `shelf consign`, `rack check`, `bank …`, `title
> transfer`), scope order as the view's list order with a world act
> room-first (D21), one verb per act (`reel` fishing's, silk `unwind`,
> D19) → [command-spec.md § The subcommand rule](../../subsystems/command-spec.md),
> § `category:`, § `scope:`, § When both are bodily acts, § History.
> **Left:** the authoring verbs pivot onto their trees (§ 8 — `content
> ls` · `source rm` · `docs cat`; the shell suite as subcommands of the
> three trees).
> **Size:** a wave — a sweep of the ~12 shell views + the authoring verb.

Seeded at the storage-and-ice review (MR !378, 2026-10-18). The reviewer:
*"we have like hundreds of verbs now … each one of those is a command def
and a usage profile to keep track of in your head. I feel like we'd be
better off with fewer main verbs and rather make each command def just do
more … maybe we just need that framework expressed as metadata."*

## Where it stands

*Superseded by the build: 364 views, every one with `category:`
(`lint:command-views`), the institution transactions under their nouns →
command-spec.md § History — controllers-are-io. Cut 2026-11-07.*

## The rule to decide (proposed at the review)

*Decided and written → command-spec.md § ⭐⭐ The subcommand rule
(controllers-are-io D9): the rule, the shipped nouns table, the edges
(`buy`/`sell`/`order`/`rent`/`charter` acts on a good; `pay`/`tip`/
`collect` acts with a recipient; fee-paying acts are acts; herd verbs
acts on animals), a subcommand binds its own book. Cut 2026-11-07.*

## The work

*Items 1–7 shipped (controllers-are-io W0–W8): the rule (D9, above);
`category:` + `help <category>` (D24 → command-spec.md § `category:`,
help.md); `lint:institution-verbs` census → ceiling 0 (§ The subcommand
rule); the sweep (§ History); `lint:command-views`, the schema gate,
shipped FIRST at W0 (D26 → § `category:`); scope order as the view's
scope-list order, a world act `["here", "peers", "person"]`, no new seed
and no flag (D21 → § `scope:`); one verb per act — fishing's `reel`
restored, silk's `unwind` in `trade-sericulture`, the policy as rung 1's
tell (D19 → § When both are bodily acts). Cut 2026-11-07.*

## The authoring verbs pivot onto their trees (user, the underwater review, 2026-10-20)

8. ⭐ **The tree is the noun, the operation is the subcommand**: `content
   ls ~` · `source rm /File.ts` · `docs cat doc.yaml` — the shell suite
   (`ls` `cat` `cp` `mv` `rm` `mkdir` `find` `grep` `cd` `pwd` and the
   authoring verb) rewritten as subcommands of the three trees, the
   institution rule applied to the trees an author works in. It frees the
   bare words for the world. **Already moved:** the authoring verb became
   `edit` (MR !408) so `write` could be the world's verb for putting words
   on a thing (`write <words> on <thing>`, over `MarkedMixin`); the sweep
   makes it `content edit` / `source edit`.

## Open questions

*All three resolved (controllers-are-io): `category:` MIRRORS the
directory and `lint:command-views` gates that they agree (D24 →
command-spec.md § `category:`) · `buy`/`sell`/`menu`/`order` are acts on
goods, `consign`/`reclaim` are the shelf's book (D9 → § The subcommand
rule) · each subcommand binds its own book, nothing inherited (`args`
XOR `subcommands`; D9, same section). Cut 2026-11-07.*
