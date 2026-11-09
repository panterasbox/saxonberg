# ForumReplyController — packages/server/src/mud/platform/idea/cmd/social/ForumReplyController.ts (89 lines)
**What the command is:** `forum reply <entry> [--pro|--con|--rebut] [body]`. Adds a plain reply on an open board or a typed claim edge on an ordered board.
**Verdict:** roughly 50% coordination, 25% parsing/routing, 15% game rule, 10% presentation. The controller's real job is choosing between two actor methods. Two record rules hide inside it: the audience gate, and a duplicate of the organizer check.
| lines | class | what it does | why this class | if misplaced: where it belongs, size of move |
|---|---|---|---|---|
| 1–18 | coordination | imports; casts `commandGiver` to `SubjectSubscriber` | plumbing | — |
| 16 | parsing/routing | `refuseUnlessForums` (base) | a capability gate the view should declare (see base) | `requiresForums` validator in `forum.yaml`, small |
| 19–22 | coordination | entry id → `ForumsApi.getEntry`, "No entry" | forum entries are documents, not Stuff, so MQL can't bind them. An id lookup is plumbing | (a binder arg type for forum ids would absorb it; not urgent) |
| 23–26 | **game rule** | `isAudienceMemberOf(view.subject)`, else refuse `not-member` | **Who may post is a fact about the record.** `ForumsLogic.reply`/`attachClaim` (ForumsLogic.ts:187–265) do NOT check audience, so a rewrite that leaves these 4 lines out silently opens every board to posting. The same gate is copied into Post (l.26) and Vote (l.36) | `ForumsLogic.reply`/`attachClaim`/`postThread`/`castVote` refuse a non-member. Small: one check, deleted from 3 controllers |
| 28–29 | coordination | `isOrdered` from `board.getOrganizer()`; derive relation | picks which actor method to call | (a single `actor.contribute(parent, relation\|null, body)` would remove the branch, small) |
| 31–39 | parsing/routing + presentation | "exactly one of --pro/--con/--rebut" | "exactly one" is mutual exclusion of options, which the view can't express today. The wording is presentation | view: one `relation` option with an enumerated value set, or options carrying a constant `value:` into one field. Schema change, medium |
| 40–42, 60–62 | presentation | `resolveBody` with label "Compose your claim/reply", `body-required` | how it asks for the body | — (good use of base) |
| 43–49, 63–68 | coordination | call `attachClaim`/`replyToEntry`; "Attached/Replied (#id)"; catch → `reply-failed` | plumbing + outcome wording | — |
| 52–59 | **unclear** | refuses valence flags on an open board | `ForumsLogic.attachClaim` already refuses an illegal relation, and `reply` already refuses an ordered board, with the error text "Use --pro / --con / **--ask**". That flag doesn't exist (the view says `--rebut`). So the controller pre-flights a rule the logic owns because the logic's own wording is wrong | logic owns the rule. The open question is who owns the words (below) |
| 71–88 | parsing/routing | `valence()`: the flag → `ArgumentRelation` map (`pro→supports`, `con→objects-to`, `rebut→responds-to`) | a word-to-vocabulary map is exactly what a command def is for. A player who wants `--agree` today must rewrite TS | the view, as an enum/constant option (above). Medium: needs a schema feature (`command.schema.json` `$defs/option` has no enum/value) |
**What a player rewriting it would be forced to copy today:** the audience check (l.23–26), or posting silently opens to non-members. The flag→relation table (l.77–88). The `refuseUnlessForums` call.
**Hard cases:** l.52–59. When the logic already refuses, may the controller pre-flight the same rule just to word it better? Or must the logic's refusal carry a *reason code* the controller words? The stale `--ask` text in ForumsLogic.ts:200 shows what happens when the logic writes player-facing words: they rot out of sight of the view.
**Rules this controller suggests:**
1. *A refusal that changes who can affect the record lives where the record is written.* Test: delete the controller's check. Does the logic still refuse? Evidence: l.23–26 versus ForumsLogic.reply.
2. *Logic refuses with a reason, the controller words it.* Test: does any string under `platform/idea/api/` name a CLI flag? Evidence: "--ask" at ForumsLogic.ts:200.
3. *A word→vocabulary map belongs in the view.* Test: could a player rename the flag by editing YAML alone? Evidence: `valence()`.

# ForumControllerBase — .../social/ForumControllerBase.ts (123 lines)
**What it is:** the noun base that controllers-are-io W7/D9 created for 11 `forum` subcommand controllers.
**Verdict:** roughly 35% coordination, 20% presentation, 20% parsing/routing, 10% game rule, 15% header. **It's half a good home and half a new hiding place.** `resolveBody` is the shared asking style and belongs there. The capability gate and the ownership rule are hidden in it.
| lines | class | what it does | why this class | if misplaced: where it belongs, size of move |
|---|---|---|---|---|
| 28–44 | coordination | one `ForumModel` union of every subcommand's fields | plumbing, but a union across 11 subcommands hides which fields each one reads | per-subcommand model, trivial |
| 47–68 | parsing/routing | `refuseUnlessForums`: `commandSource` isForums, else an MQL `person` scan for a Forums host, else refuse `mixin-missing` | an affordance/capability gate. The view already has a `validators:` list (`requiresAlias` is the precedent). All 11 subclasses must *remember* to call it (11/11 do today), and a replacement that forgets it opens the verb | `/lib/command/validators/requiresForums` + one line in `forum.yaml`. Small |
| 70–96 | presentation | `resolveBody`: inline body, else fail closed with `needs-input`, else a `promptCompose` textarea | how the command asks: the swappable part, legitimately shared | — (the right content for a base) |
| 97–103 | coordination | `boardViewFor`: board + subject lookup | plumbing | — |
| 104–113 | coordination | `fail`/`send` | **identical** copies in ChatControllerBase:84–98 and AliasController:187–202 (topic differs) | `CommandController` with a topic parameter, trivial |
| 115–122 | **game rule** | `actorId` (playerId for an Avatar, else stuffId) + `ownsSubject` | **who owns a subject** is a record rule. `actorId` is a verbatim second copy of `authorIdOf` (ForumsLogic.ts:496). Edit/On/Promote/Mature gate on it in the controller, so the ownership gate is controller-side too | `Subject.isOwnedBy(actor)` or `SubjectSubscriber.owns(subject)`, with the refusal inside the logic's mutators. Small–medium (4 callers) |
**What a replacement of any forum subcommand is forced to copy:** the `refuseUnlessForums` call. For edit/on/promote/mature, the `ownsSubject` gate. For post/reply/vote, the audience gate.
**Hard case:** is a noun base a coordination library (fine to share), or the place where the noun's rules quietly accrete? Today it holds both. The test that separates them is the replacement test applied to the *base*: a player replacing every forum controller would rewrite `resolveBody` happily but must re-derive `ownsSubject` exactly.
**Rule suggested:** *A noun base may hold how the noun's commands talk and plumb, never what the noun permits.* Test: if the base vanished, would any subclass lose a refusal rather than a phrasing? Evidence: `ownsSubject`, `refuseUnlessForums`.

# ChatPostController — .../social/ChatPostController.ts (111 lines)
**What the command is:** `chat <channel> <message> [--anon]`, the fallthrough bare post to a persistent channel or an ad-hoc DM-group handle.
**Verdict:** roughly **45% game rule**, 25% coordination, 20% presentation, 10% parsing/routing. The anonymity path is a good example of the target shape. The ad-hoc path is a hand-rolled delivery engine.
| lines | class | what it does | why this class | if misplaced: where it belongs, size of move |
|---|---|---|---|---|
| 1–18, 27 | coordination | imports, casts, reads `anon` | plumbing | — |
| 19–26 | parsing/routing | re-checks `channel`/`message` non-empty | `chat.yaml` marks both `required: true`, so these duplicate the binder | delete (or `notEmpty` validator), trivial |
| 28, 42, 92 | parsing/routing | name → `ChatApi.resolveByName`, else `speaker.resolveChatHandle`, else `no-such-channel` | the namespace precedence (persistent name beats ad-hoc handle) is a resolution rule, re-derived per controller | one `actor.resolveChannel(name)` on SubjectSubscriber/ChannelCatalogue returning `Channel \| AdHocChannel`, or a binder arg type. Small |
| 35–40 | presentation (over a rule) | "A group message shows who is speaking" when `--anon` meets an ad-hoc thread | telling the player is presentation. *That ad-hoc has no anonymity* is a rule that lives only here | the rule goes with the ad-hoc post (below) |
| 41–90 | **game rule** | ad-hoc fan-out: per-member `toTarget` frames with topic/modality/meta/payload, a self frame, then `cat.appendToHistory(...)` with a hand-built `MessageFrame` | this is **delivery and persistence**: who receives, the wire payload shape, and the history ring that `chat history` and `chat promote` (which carries the ring over, ChannelCatalogue ~l.543) read. ChannelCatalogue's own header says `postToChannel` is "the single audience-fanout chokepoint … ad-hoc: byHandle members", but the ad-hoc branch actually lives here. It also drifts from the chokepoint: it self-excludes by object (`m === speaker`) where the catalogue excludes by identity, skips mute/reaction handling, and fetches `cat` before the loop only to use it after. A rewrite would have to copy ~50 lines exactly or break history/promote | `ChannelCatalogue.postToChannel` accepting `AdHocChannel` (or `AdHocChannel.post`). Medium, ~50 lines out, no new concept |
| 94–108 | presentation | `--anon` on a channel that forbids it: "'x' shows every poster's name — posted under yours." | the *rule* (`channel.permitsAnonymity()`, decided again inside `postToChannel` l.350) lives on the model, and the controller only says it out loud. **This is the target shape** | — |
| 109 | coordination | `speaker.postToChannel(channel, body, {anonymous})` | one call | — |
**What a player rewriting it would be forced to copy today:** the whole ad-hoc fan-out and history append (l.41–90), and the name-then-handle precedence. Otherwise DM-group chat stops working or stops being recorded.
**Hard case:** l.103 reads `channel.permitsAnonymity()` to decide whether to *speak*, and the catalogue reads it again to decide the *form*. Is a controller reading a model predicate to choose its feedback "presentation over a rule" (fine), or a duplicated rule? Here it's fine because the model still enforces it. The test is whether deleting the controller's read changes the world (no) or only the words (yes).
**Rules suggested:**
1. *Where an act's chokepoint exists, every variant of the act goes through it.* Test: does the controller construct a frame or write history itself? Evidence: l.41–90 versus ChannelCatalogue's header.
2. *A controller may read a rule to explain it, never to enforce it.* Test: delete the controller's read. Does the world behave the same? Evidence: l.103 (passes) versus Forum l.23 (fails).

# ChatControllerBase — .../social/ChatControllerBase.ts (99 lines)
**Verdict:** roughly 45% presentation, 30% coordination, 15% parsing/routing, 10% header. Mostly benign. It's a **hiding place for presentation**, not for rules: `ChatJoinController` is a 3-line shell calling `this.tune(model, context, true)`, so the words a join/leave/mute/unmute replacement exists to change ("Tuned in to", "Muted") live in the base, which every chat subcommand inherits.
| lines | class | what it does | why | where / size |
|---|---|---|---|---|
| 26–38 | coordination | `ChatModel` union | plumbing | per-subcommand, trivial |
| 46–50, 67–71 | parsing/routing | `isAvatarStuff` else "Only Avatars subscribe in v1" | a giver-type gate. The `requiresAvatar` validator exists | view `validators: [requiresAvatar]` on join/leave/mute/unmute, trivial |
| 51–54, 72–75 | coordination | name → channel → `updateChannelSubscription` | plumbing (the same name-resolution note as ChatPost) | — |
| 55–60, 76–81 | presentation | outcome words | swappable part, but parked in the base | the leaf controllers, trivial |
| 84–98 | coordination | `fail`/`send` duplicate | see ForumControllerBase | `CommandController` |
**Hard case:** sharing `tune` between join and leave saves 20 lines but means a player who wants to reword only `chat join` must override a base method or copy it. Does D9's "one controller per subcommand" mean one *file* or one *swappable unit*?

# AliasController — packages/server/src/mud/platform/idea/cmd/shell/AliasController.ts (203 lines)
**What the command is:** `alias [list|get|set|unset|describe]`, a view onto the per-character `Alias` mixin store.
**Verdict:** roughly **60% presentation**, 25% coordination, 15% parsing/routing, ~0% game rule. This is the clean case: tiers, tombstones and validation all live on `AliasMixin` (`setAlias`/`removeAlias`). The one structural smell is that W7/D9 never reached it. It still self-dispatches five subcommands with a `switch`.
| lines | class | what it does | why | where / size |
|---|---|---|---|---|
| 1–43 | coordination | header, `MixinApi.isAlias` narrow + throw (validator-guaranteed) | plumbing | — |
| 45–60 | parsing/routing | `switch (model.subcommand ?? 'list')` | self-dispatch on a word. `alias.yaml` subcommands carry no `controller:`, so the view can't route them, and "bare = list" is encoded here | per-subcommand `controller:` in `alias.yaml` (the verb-level one = list), as forum/chat did. Small |
| 63–103 | presentation | `list`: sort, column width, `*`/` ` markers, the tombstone section | pure display. Reads tombstones as `persistent[k] === null` from `listOverrides()`, a documented contract (Alias.ts:62–70), so it stays presentation | — |
| 105–118, 160–180 | presentation | `get`/`describe` rendering | display | — |
| 127–129 | parsing/routing | `name`/`body` required re-checks | `alias.yaml` declares both `required: true` | delete, trivial |
| 130–143 | coordination | `setAlias(name, body, {lifetime: session?…})`, catch → `set-failed`, outcome | the flag → lifetime is a direct field mapping. The mixin validates | — |
| 146–158 | coordination | `removeAlias` (the mixin decides tombstone vs drop) | — | (l.154 `fail` omits a reason → `'unspecified'`: a small bug) |
| 182–202 | presentation + coordination | `sourceOf`, the `fail`/`send` copy | — | `fail`/`send` → `CommandController` |
**What a player rewriting it would be forced to copy:** nothing about the game. A rewrite would only have to reproduce the subcommand switch, because the view can't route `alias get` to a different file today.
**Hard case:** none of substance. This controller is the control sample: 203 lines and almost all of them are the swappable part. **Length isn't the metric.**
**Rule suggested:** *If the view can route it, the controller doesn't switch on it.* Test: does `execute` branch on `model.subcommand`? Evidence: l.45–60.
