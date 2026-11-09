# Sweep shard11 — 86 controllers, 5441 lines

Paths are from `packages/server/src/mud/platform/idea/cmd/` (all `social/` except the last row). % = rough share of non-header lines.

| controller (path from packages/) | lines | rule% | pres% | coord% | parse% | heads | worst misplaced item → where it belongs | other notes |
|---|---|---|---|---|---|---|---|---|
| social/BroadcastController | 120 | 35 | 30 | 25 | 10 | one | `standsUnder` (40-49) + online-filter (87-88): who is under an extent is the audience rule → `MessageApi`/`ParcelApi` audience-of-extent | Default extent = covering parcel (60-66) could be a view `default:`. |
| social/CalendarController | 66 | 0 | 75 | 25 | 0 | one | — | Overdue-first sort is presentation. Clean. |
| social/CallController | 167 | 55 | 25 | 20 | 0 | one | Who answers and how (`answersTo`, status, `wouldComply`, `comeTo` exit walk 133-158, `CALL_DB=85`) → `Bonded.hearCall(caller, word)` returning come/refuse/busy | `preloadAnatomy` warm-before-read dance is copied in Pet, Stay: the species should warm itself. |
| social/ChatAnonymityController | 68 | 30 | 25 | 25 | 20 | one | Owner gate (42-56) → `Channel.canAdminister(actor)`; DEFECT: skipped for non-Avatars and subject-less channels | permit/forbid hand-check → view enum. |
| social/ChatControllerBase | 99 | 10 | 20 | 70 | 0 | n/a (base) | `avatar-required` refusal in `tune`/`mute` is a permission in a noun base (r11) → subscriber mixin | Otherwise talk + plumbing. Fine. |
| social/ChatDisbandController | 41 | 45 | 25 | 30 | 0 | one | `kind !== 'player-created'` + owner check → `ChannelCatalogue.disbandPlayerChannel(by)` | Owner check copied 3× (Anonymity, Disband, On). |
| social/ChatHistoryController | 25 | 10 | 50 | 40 | 0 | one | `channel?._id ?? name` id fallback → `ChatApi.historyFor(channel)` | No audience/membership gate on reading history (check intended). |
| social/ChatJoinController | 12 | 0 | 0 | 100 | 0 | one | — | Clean. |
| social/ChatLeaveController | 12 | 0 | 0 | 100 | 0 | one | — | Clean. |
| social/ChatListController | 30 | 0 | 70 | 30 | 0 | one | — | Clean. |
| social/ChatMakeController | 33 | 25 | 25 | 50 | 0 | one | Reserved-name check → already the catalogue's (it throws on it); delete | Copied 3× (Make, Promote, Rename). |
| social/ChatMuteController | 12 | 0 | 0 | 100 | 0 | one | — | Clean. |
| social/ChatOnController | 45 | 35 | 25 | 30 | 10 | one | Owner check → `Subject.canAttachSurface(actor)`; `--ordered` "not yet" refusal is a dead view option | |
| social/ChatPromoteController | 35 | 25 | 25 | 50 | 0 | one | Reserved-name check duplicated from catalogue | |
| social/ChatRenameController | 32 | 25 | 25 | 50 | 0 | one | Reserved-name check duplicated; DEFECT: no owner/kind check here or in the catalogue | |
| social/ChatUnmuteController | 12 | 0 | 0 | 100 | 0 | one | — | Clean. |
| social/ChatWhoController | 27 | 0 | 60 | 40 | 0 | one | — | Clean. |
| social/ContactsController | 347 | 25 | 35 | 15 | 25 | split: add / remove / show / list / clear / rename | Sibling expansion + NPC-vs-Avatar keying (96-154) → `Contacts.addPerson(target, label, {char})`; name lookup via Template rows (315-346) → presentation/identity seam | Still a self-dispatching switch (56-76): W7 split never applied. remove matches raw ids only though view says names. |
| social/DmController | 128 | 25 | 20 | 35 | 20 | one | Multi-target opens an ad-hoc channel (122-126) → `Comms.tell` owns the cohort | `resolveComms` copied 3× (Dm, Reply, Forum base); `DM_MAX_RECIPIENTS` re-checks view `cardinality.max: 10` (r7). |
| social/EmoteController | 37 | 0 | 20 | 80 | 0 | one | — | Clean. |
| social/FlourishController | 95 | 40 | 50 | 10 | 0 | one | `REQUIRED_BAND`/`mixology` gate (50-60) → a band requirement on the affording `BarStation` / view validator | A pure emote otherwise. |
| social/ForumControllerBase | 123 | 25 | 15 | 50 | 10 | n/a (base) | `ownsSubject`/`actorId` (115-122) is permission in a noun base (r11) → `Subject.isOwnedBy(actor)` | `refuseUnlessForums` = third copy of the comms/forums source-or-MQL probe. |
| social/ForumEditController | 39 | 35 | 25 | 40 | 0 | one | Author-or-owner gate (22-28) → `Entry.canEdit(actor)` | |
| social/ForumFollowController | 29 | 10 | 30 | 60 | 0 | one | — | Avatar-only gate is minor. |
| social/ForumListController | 29 | 0 | 70 | 30 | 0 | one | — | Clean. |
| social/ForumMakeController | 36 | 0 | 40 | 60 | 0 | one | — | Clean. |
| social/ForumMatureController | 47 | 45 | 25 | 30 | 0 | one | ordered-only + owner gate → `actor.matureArgument` should refuse | |
| social/ForumOnController | 40 | 25 | 30 | 45 | 0 | one | Owner gate → `ForumsApi.createBoardOnSubject(subject, by)` | |
| social/ForumPostController | 42 | 35 | 20 | 45 | 0 | one | Audience gate + `deriveTitle` (stored title) → `postThread` | |
| social/ForumPromoteController | 41 | 25 | 25 | 50 | 0 | one | Owner gate → `promoteThread` | |
| social/ForumReadController | 66 | 0 | 60 | 25 | 15 | one | `parseSort` silent fallback → view `oneOf: [new, top, hot, controversial]` | Thread vs board branches are one read at two depths. |
| social/ForumVoteController | 49 | 40 | 15 | 30 | 15 | one | ordered-board + audience refusal → `castVote` | up/down hand-check → view enum. Audience gate skipped when the board view is null (fail-open). |
| social/GroupAddController | 51 | 35 | 15 | 50 | 0 | one | `addMember` + `save` + `fireChange` (37-45) → `Group.addMember` persists and fires | save+fireChange copied 5×. |
| social/GroupControllerBase | 99 | 30 | 30 | 40 | 0 | n/a (base) | `ownerOrAdmin` (53-56) = permission in a noun base (r11) → `Group.canManage(actor)` | `describeOwner` is presentation. |
| social/GroupDeleteController | 29 | 30 | 20 | 50 | 0 | one | owner gate + fireChange → `Group` | |
| social/GroupListController | 32 | 25 | 45 | 30 | 0 | one | Hiding channel-backing groups (19-20) → a `GroupApi.groupsOf(actor)` query | |
| social/GroupMakeController | 28 | 60 | 15 | 25 | 0 | one | Constructs `Group` and writes `name/owner/memberIds/memberRoles` fields directly (20-25), dup-name check → `GroupApi.create(owner, name)` (r8) | |
| social/GroupRemoveController | 35 | 30 | 20 | 50 | 0 | one | DEFECT: matches raw typed string against identity paths | |
| social/GroupRenameController | 32 | 40 | 20 | 40 | 0 | one | Writes `g.name` directly, no uniqueness check (Make has one) → `Group.rename` | |
| social/GroupRoleController | 39 | 35 | 15 | 35 | 15 | one | `ROLES` set re-validates → view `oneOf`; same raw-id defect as remove | |
| social/GroupShowController | 23 | 0 | 70 | 30 | 0 | one | — | Prints raw identity paths as the roster. |
| social/HailController | 97 | 45 | 25 | 25 | 5 | one | `craftOf` (84-91) + hour bucket `floor(now/3600)` (61) → `Place.craftHere`/`Voyaging` and `Expanse.contactsFrom(now)` | Substring contact match is a choice about asking (ok). |
| social/IntroduceController | 154 | 60 | 20 | 20 | 0 | one | Third-party recognition gate + whole-audience learn + regard bump + chronicle (66-152) → `Soul.introduce(subject)` | DEFECT line 75: reads recognition by `getTemplatePath()`, written by `getIdentityPath()`. |
| social/NameController | 197 | 50 | 20 | 25 | 5 | protocol: NamedMixin (`takeName(name, by)`, Bonded overrides with the promotion) | Promotion sequence (148-182: setName, stampChattel, key, place, capture, witnesses) → `Bonded` override | Name-clash check vs connected avatars is rule too. |
| social/NotifyController | 378 | 25 | 25 | 15 | 35 | split: list / show / set / reorder / remove | Self-dispatch on flags (75-101) + `buildPatch` vocab checks → subcommands + view `oneOf`; `normalizeRef` must mirror `SocialLogic.canonicalReservedRef` → one owner | `MAX_RULES` cap → `setNotifyRule` refuses; `pushProjection` after every mutation is r3 (the policy's). |
| social/PartyAcceptController | 20 | 0 | 30 | 70 | 0 | one | — | Exemplar shape. |
| social/PartyAdoptController | 40 | 0 | 50 | 50 | 0 | one | — | `noteReactableAct` is coordination. |
| social/PartyAssignController | 24 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyControllerBase | 87 | 15 | 50 | 35 | 0 | n/a (base) | `refOf` keys a non-Avatar on `getTemplatePath()` → member method takes the Stuff (use `getIdentityPath`) | `reasonText` hardcodes the formation list (69): a vocabulary copy. |
| social/PartyDisbandController | 17 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyEnlistController | 22 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyFormController | 20 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyInviteController | 24 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyKickController | 22 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyLeaveController | 17 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyListController | 25 | 10 | 50 | 40 | 0 | one | — | durable filter is a query choice. |
| social/PartyMusterController | 22 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyShowController | 28 | 0 | 60 | 40 | 0 | one | — | |
| social/PartySideController | 19 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyStanddownController | 17 | 0 | 30 | 70 | 0 | one | — | |
| social/PartyTransferController | 22 | 0 | 30 | 70 | 0 | one | — | |
| social/PetController | 94 | 55 | 30 | 15 | 0 | one | `TOUCH_BOND`, `TOUCH_BAND`, `handle(0.5)`, `PET_REGARD`, `setWaiting(false)` (66-86) → `Bonded.bePetted(by)` returning refusal reason | The one-sentence-for-two-gates choice is presentation, fine. |
| social/ProfileController | 13 | 0 | 0 | 100 | 0 | one | — | |
| social/ProfileControllerBase | 151 | 0 | 80 | 20 | 0 | n/a (base) | — | Pure render over `composeProfileCard`. Silent return when viewer lacks NotifyPolicy. |
| social/ReactController | 158 | 30 | 10 | 25 | 35 | one | Re-implements the emote dispatch (90-132: strip `:`/`;`, `SoulApi.resolve`, `EmoteGrammarRunner`) + `canReach` scope test → `Soul.react(expr, commandId)` / `ReactionApi.canWitness` | `--msg` parseInt → view `type: integer`. |
| social/ReplyController | 90 | 20 | 20 | 40 | 20 | one | Same ad-hoc-cohort open as Dm (62-63) → `Comms.tell` | Third copy of `resolveComms`. |
| social/SayController | 44 | 0 | 20 | 80 | 0 | one | — | Exemplar. |
| social/ScoreController | 13 | 0 | 0 | 100 | 0 | one | — | |
| social/ShoutController | 42 | 0 | 20 | 80 | 0 | one | — | Exemplar. |
| social/SoulControllerBase | 80 | 30 | 25 | 45 | 0 | n/a (base) | `refuseUnlessCommittee` pre-checks the store's title gate (permission in a base) → ok as r1 sentence, but the target-path derivation is `SoulApi`'s | |
| social/SoulDeleteController | 21 | 0 | 30 | 70 | 0 | one | — | |
| social/SoulDisableController | 13 | 0 | 0 | 100 | 0 | one | — | |
| social/SoulEditController | 93 | 30 | 15 | 15 | 40 | split: per-field edits | Field switch + YAML parsing + echo vocabulary (22-80) → `EmoteSpec` validation in `SoulApi.edit`; fields → view `oneOf` | DEFECT: `template` sets `grammar: {slots: {}, …}` and the catalogue replaces grammar wholesale. |
| social/SoulEnableController | 13 | 0 | 0 | 100 | 0 | one | — | |
| social/SoulListController | 26 | 0 | 70 | 30 | 0 | one | — | |
| social/SoulMakeController | 98 | 35 | 10 | 25 | 30 | one | `coerceEmoteSpec` (58-97): what a valid emote is → `SoulApi.mint` validates | |
| social/SoulSearchController | 27 | 0 | 70 | 30 | 0 | one | — | Reuses `verb` arg as the search term. |
| social/SoulShowController | 29 | 0 | 70 | 30 | 0 | one | — | |
| social/StandingController | 87 | 5 | 70 | 25 | 0 | one | — | Regard thresholds are wording. Docstring says templatePath, code correctly uses identity path. |
| social/StatusController | 58 | 0 | 40 | 60 | 0 | one | — | Validation lives in `setStatus` (throws). Clean. |
| social/StayController | 116 | 40 | 35 | 25 | 0 | one | Perceives-you + `wouldComply` + `setWaiting(true)` → `Bonded.bidStay(by)` | Twin of Call/Pet: three controllers carry the animal's obedience protocol. |
| social/SubjectController | 104 | 0 | 40 | 30 | 30 | split: make / list | Self-dispatching subcommand switch (34-45) → W7 per-subcommand controllers | |
| social/TalkController | 129 | 25 | 35 | 25 | 15 | one | Finding the `engage` brain via `resolveExportSync` (60-73) → `Behaved.openDialogue(player)` | The `canVocalize` gate is fine (object owns it). |
| social/WhisperController | 41 | 0 | 20 | 80 | 0 | one | — | Exemplar. |
| social/WhoController | 152 | 5 | 50 | 15 | 30 | one | `--here`/`--friends` hand-filters (53-78) → MQL scopes (`here`, contacts) in the view | Card+prose from one computation is good. |
| stream/StreamController | 145 | 10 | 20 | 25 | 45 | split: away / back | `parseDurationMs` (90-114) → a binder `duration` arg type | Self-dispatch on subcommand (32-43) → W7 split; `Date.now()+ms` is the StreamState's. |

**Defects**
- IntroduceController:75: third-party recognition is read by `introducee.getTemplatePath()`, but `BeliefStore.learnIdentityOf` writes by `getIdentityPath()` (BeliefStore.ts:749). Every player Avatar shares a lineage path, so introducing another player is probably always refused. `knownNameOf(identityPath)` exists for this.
- ChatAnonymityController:46-50: the owner gate is `subject && isAvatarStuff(actor) && …`, so a non-Avatar giver, or any channel with no subject (system channels), passes. `ChannelCatalogue.setAnonymity` has no gate of its own.
- ChatRenameController: no owner or kind check, and `ChannelCatalogue.renamePlayerChannel` (698) checks neither, so anyone can rename any channel, system ones included.
- GroupRemove:24 / GroupRole:28: they compare the raw typed `target` with `memberIds`, but GroupAdd:37 stores `getIdentityPath()`. Typing a name or playerId (the view says "match them by name") never matches.
- GroupRenameController:24: no duplicate-name check (Make has one). `findGroupByName` then returns `matches[0]`, which is ambiguous.
- SoulEditController:26: `soul edit <v> template X` replaces the grammar with `{slots:{}}`. `SoulCatalogue.edit:317` replaces grammar wholesale, so the existing slots are wiped. The comment admits it.
- ContactsController:315-328: names come from per-player Avatar Template rows, but minted characters have no row (CLAUDE.md § auth), so `contacts show` likely prints raw playerIds. `remove` matches ids only, though its comment and the view promise name matching.
- ForumVoteController:36: the audience gate is skipped when `boardViewFor` returns null (fail-open).
- PartyControllerBase:47-50: `refOf` keys NPCs on `getTemplatePath()`, so Extras that share a row collapse into one member.

**Hard cases**
- NameController: is "name a thing" vs "promote an animal" one act or two? The refusal, cost and outcome all differ (the promotion persists, titles and witnesses), but the player believes they did one thing. Rule question: when the object differs and the player's belief doesn't, is that a protocol or a split? I called it a protocol.
- ChatHistory and Who: is showing someone a channel's history, or a roster, a permission (rule) or a display choice? Nothing gates either here.
- Flourish: the docstring argues the refusal is the progression UI and so belongs here. The band itself is a rule, but which surface teaches it is presentation. Can a view-level band validator carry a bespoke refusal sentence?
- Notify `pushProjection`: is refreshing the client card after a write coordination (a controller choice) or a consequence the policy owns (any writer, such as the settings card, needs it)?

**Rules (new)**
- (12) **A probe for a capability the giver reaches** (source-or-`person`-pool for Comms/Forums) belongs to the binder as a declared `via:`/`source:` requirement, not to each controller. Evidence: `resolveComms` in Dm:54, Reply:68 and `refuseUnlessForums` in ForumControllerBase:53 are three copies.
- (13) **A save-and-notify pair after a mutation is the mutator's job.** If every caller must remember `save(); fireChange()`, one will forget. Evidence: Group Add/Delete/Remove/Rename/Role copy it 5×, and Make omits `fireChange`.
- (14) **One identity key per concept, owned where it is written.** A controller that derives a person key (`refOf`, `getTemplatePath` as a recognition referent, typed ids against identity paths) will drift from the store. Pass the Stuff and let the store key it. Evidence: Introduce:75, PartyControllerBase:47, GroupRemove:24.
- (15) **A subcommand switch inside `execute` is unfinished W7.** Evidence: Contacts, Notify, Subject and Stream still self-dispatch, while Chat/Forum/Group/Party/Soul in the same folder were split.
