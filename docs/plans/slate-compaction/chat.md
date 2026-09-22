# Slate-compaction pass — chat batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `chat.md` · `comms.md`
(both needed inserts). Line numbers below are the ORIGINAL file's.
Originals saved under the scratch dir `chat/orig/` for diffing. Code was
verified in `packages/server/src/mud/**`, `packages/content/platform/**`,
`packages/client/src/**`.

Three things a reviewer should know first:

1. **One `Left` item was half-false on arrival, and chat.md carried the
   same falsehood.** chat-slate's *"group-projected channels
   (party/guild/zone)"* — **party chat shipped**: `PartyLogic.ts:357-366`
   calls `ChatApi.createBoundChannel(founder, name, party.partyRef())` on
   party formation and `disbandPlayerChannel` on disband (`:497-499`);
   `CompactLogic.ts:313` mints a committee's channel the same way;
   `ChannelCatalogue.createBoundChannel` (`:583-616`) binds the Subject to
   an existing `GroupRef` without minting a managed Group, and a member is
   in the audience by default (`SubjectCatalogue.ts:54` `followed: true`).
   chat.md § Deferred said *"the source systems (guilds, parties, …) do
   not yet [exist], so there is nothing to project from"* — proven false;
   graduated as a new `### Bound channels` subsection and the bullet was
   corrected (below). Guild/zone projection, the **override layer** and the
   **cached derived set** (`GroupApi.onMembershipChange` has no caller
   outside `GroupLogic`/`GroupRegistry`/`api/group.ts`) remain unbuilt.
2. **The senses-batch fact holds and both slates assume the opposite.**
   `AetherImplant` is granted only by `Avatar.ts:813` (the default
   loadout); no content pack YAML gives an NPC one; `lib/npc/NPC.ts` and
   `lib/creature/Character.ts` compose no Aether. comms-slate's *"universal,
   always-on baseline implant"* (Principle 3, § The implant dependency) and
   its *remote NPC via implant DM* scenario are therefore kept-but-
   contradicted → Uncertain, and comms.md gained a ⚠ paragraph stating the
   players-only fact (comms.md already said *"for players"*, but not the
   consequence). `npc-dialogue.md § Deferred seams` confirms the
   `addressed` trigger and the implant `tell` entry are unbuilt.
3. **Speech is not on the acoustic reach walk at all — and comms.md
   implied it was.** `Vocal.ts:161-165` fans every speech verb's peers
   frame through `Scene.toPeers` (the speaker's one room); `Scene.toAudible`
   + `AudienceGather` (`Scene.ts:205-334`) exist but only `Audible.emit`
   (whistles, bells — `Audible.ts:74`) rides them, and no other reader of
   `acousticDb` exists. So a whisper reaches the whole room **with the
   words** (`Vocal.ts:140`: *"X whispers to Y, <the words>"*), and a shout
   does not leave the room. comms.md § Acoustic said *"whisper — short
   reach"* / *"shout — multi-room reach"* as facts: **two bullets amended
   (*as stamped*) and a ⚠ paragraph inserted** saying what the code does.
   `senses.md § Deferred` (*existing comms … ship unchanged*) agrees. The
   comms slate's `Left` gained *speech on the acoustic reach walk at all*
   ahead of *dynamic-reach shout*, because the static cross-room shout the
   slate treats as shipped ("the sound slate already computes who hears a
   loud source across rooms") is only shipped for `Audible`. ⚠ I first
   wrote the insert as *"hidden by 30 dB reach in `toAudible`"* from the
   `Audible.ts` header and caught it against `vocalEmit` before finishing —
   recorded so the coordinator reads the paragraph with that in mind.
---

## docs/slates/tails/chat-slate.md — 437 → 355 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- second status block *"architecture set, a few forks leaned … Graduates the channels half of the comms slate"* (12–16, 5) — history; the canonical block is kept and re-stamped
- *The load-bearing decisions* 2–6 (32–60, inside the 25–60 replacement) — 2 projection over the grouping facade: code `ChannelCatalogue.audienceFor` → `GroupApi.membersOf(subject.getGroupRef())`, `createBoundChannel`; doc `chat.md § Chat consumes the group substrate` + the new `§ Bound channels`. 3 membership ≠ subscription: code `SubjectSubscriberMixin` via `ChannelCatalogue.getSubscription/setSubscription` (`:455-480`); doc `chat.md § Membership ≠ subscription`. 4 chat ≠ Mudlog: doc `chat.md` intro para 3. 5 all-diegetic, no `isIC`: doc `chat.md` intro para 2. 6 no channel-as-verb: code `cmd/social/chat.yaml` (`fallthrough: true`, `channel` + greedy `message`); doc `chat.md § Verb shape and the fallthrough flag`. Decision 1 is Superseded (below). A seven-line pointer paragraph replaces all six
- `## Principle` (95–104, 10) — restates decisions 1–5; same evidence. Heading removed
- `## The generative axes` → *"There is deliberately no feed-channel kind"* (130–131, 2) — doc `chat.md` intro para 3 (*Game-event feeds belong on MudlogApi*)
- `## Membership ≠ subscription` → the *Membership / eligibility* bullet (137–140, 4) — code `audienceFor` (derived for bound channels, roster for managed, universal for standalone); doc `chat.md § Membership ≠ subscription` table. The *Subscription / tuning* bullet is KEPT (notification level unbuilt)
- `## Command surface` (213–224, 12) — code `chat.yaml` (`list/join/leave/mute/unmute/who/make/rename/disband/history/promote/anonymity/on`), `ChannelCatalogue.RESERVED_NAMES` (`:726` `reservedNames()`); doc `chat.md § Verb shape and the fallthrough flag` (reserved words first, fallthrough to `(channel, message)`, the create-side reserved check). Aliases: `shell-alias.md`. Heading removed
- `## Message model` → *Threads / reactions* bullet (262–265, 4) — code `ChannelCatalogue.postToChannel` stamps `meta.commandId` on witness + history frames; doc `chat.md § Posting` step 3 (*a chat post is a reactable act*), `reactions.md`. One-line pointer bullet left
- `## Player-created channels` → *Naming* bullet (278–279, 2) — code `createPlayerChannel` / `createBoundChannel` (`RESERVED_NAMES` + *already exists* check, `:594-601`); doc `chat.md § Verb shape` last two paragraphs
- `## Worked scenarios` → *Party line* (304–305) · *Global band* (306–307) · *Help* (308–309) · *DM* (312) (7) — party: `PartyLogic.ts:357-366` → `chat.md § Bound channels`; global/help: `packages/content/platform/content/subjects/{global,help,chat}.yaml` → `chat.md § Bootstrap and seeding`; DM: `cmd/social/dm.yaml` → `comms.md § Implant — dm / tell`. Two pointer bullets left; *Guild chat* and *Player channel* KEPT (guild source, override layer, succession, GC unbuilt)
- `## Open questions` → Q2 *Anonymity / pseudonyms* (323–324, 2) — code `Channel.anonymity`, `chat.yaml` `anonymity:` subcommand + `--anon` option, `ChannelCatalogue.postToChannel` form selection; doc `chat.md § ⭐⭐ anonymity`, `presentation.md`. *Q2 resolved* pointer left
- `## Build order` → the dependency paragraph + *Wave 1 — the core* (335–342, 8) — comms + grouping exist; Wave 1 shipped as `chat.md` end to end. One-line note left saying which two Wave-1 items (notification levels, projected/overlay roles) did NOT ship and are carried above. Waves 2–3 KEPT verbatim
- `## Once shaped into formal requirements` → *the `chat <channel> <message>` post surface + the reserved-word management subcommands* (387–388, 2) and *The clean Mudlog separation* (396, 1) — same evidence as § Command surface and decision 4
- `## ⭐ Tails from the presentation build` → the *Chat anonymity shipped* paragraph (410–416, 7) — code as Q2; doc `chat.md § anonymity` carries the table, *forbidding never stops anyone talking*, the handle-not-description rule and the omitted `payload.speaker`. Two-line pointer left; both seam bullets KEPT

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- the *group-projected* shape that shipped — party chat + the committee channel as **bound channels** (evidenced by decision 2 / the party scenario / the kinds table's *lifecycle = the group's*) — code `ChannelCatalogue.createBoundChannel` (`:583-616`), `ChatApi.createBoundChannel` (`api/chat.ts:57`), `PartyLogic.ts:357-366, 497-499`, `CompactLogic.ts:305-316`, `SubjectCatalogue.ts:54` (`followed: true` default) → inserted at `chat.md § Chat consumes the group substrate` as a new `### Bound channels — the group-projected shape that shipped` (18 lines: what binds, the two callers, why a member hears it without `chat join`, and the two halves of the slate design that did NOT ship — no override layer, no cached derived set). **Two existing Deferred bullets in chat.md were changed because the code proves them false**: *Group-projected channels … nothing to project from* → names party/committee as shipped bound channels and narrows the deferral to guild/zone + the override layer + the cached set (5 lines); *Anonymity / pseudonymity on channels* → *shipped (§ anonymity); the two seams … are in the slate* (2 lines)

### Superseded — cut
- *The load-bearing decisions* → 1 *Facets, not types* (27–30) — by the code: three fixed kinds (`Channel.kind` is `'player-created' | 'open-join-standalone'` + the `AdHocChannel` class) → `chat.md § Three channel kinds` (*deliberately small*). Named in the replacement pointer paragraph
- `## Projection + override` → *"A projected channel may not even be a heavy object — an affordance on the group + the override layer + the per-player subscription rows"* (166–168, 3) — by the code: a bound channel IS a `Channel` Document on a Subject with the group's `GroupRef`, minted and disbanded with the party → `chat.md § Bound channels`. Three-line note left

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *See also* (verbatim — links are to other slates/docs, none to a cut section)
- `## The generative axes` → the axes table (see Uncertain) · the four-kinds table (guild/zone rows, *GC'd when abandoned*; kept whole — row-level splitting is below paragraph granularity) · the `postPermission` announcement note
- `## Membership ≠ subscription` → the *Subscription / tuning* bullet (notification level `all / mentions-only / ambient / silent` — no such axis: `ChannelSubscription` is `{ tunedIn, muted }`) · the sane-default paragraph
- `## Projection + override` → the live-view + override-layer paragraph, the effective-audience formula, the *99% empty* paragraph, the **Perf** paragraph (no cache; `onMembershipChange` unconsumed)
- `## Roles & permissions` — whole (`GroupRole` is `owner | admin | member` on `Group.ts:27`; only `owner` gates anything — `ChatController.ts:217-229, 375, 433`)
- `## The channel config block` — whole (no `editPolicy`/`postPermission` anywhere; `retention` exists only as the global operator setting `chat.historyCap`, `ChannelCatalogue.ts:64-75`)
- `## History, catch-up, offline` — whole (no backlog on `chat join` — `ChatController` reads the ring only in `history`, `:447`; no inbox)
- `## Discovery & presence` — whole (see Uncertain for bullet 1; no search-by-topic; no join/leave notices found)
- `## Message model` → mentions · pins/announcements · edit/delete (no `@here`/`@channel`, no `(edited)`; `Mml.perceiverMentionResolver` at `ChannelCatalogue.ts:354` links `@name` in the body but drives no notification)
- `## Player-created channels (lifecycle)` → succession · abandonment GC · limits (no cap, no owner-leave handler in `ChannelCatalogue`/`ChatController`)
- `## Hard problems` — whole · `## Worked scenarios` → *Guild chat* · *Player channel*
- `## Open questions` Q1, Q3, Q4, Q5 · `## Build order` Waves 2–3 · `## What this slate does NOT cover` (spine)
- `## Once shaped into formal requirements` — the remaining bullets + the tests bullet + the trailing paragraph (see Uncertain)
- `## ⭐ Tails from the presentation build` → both seam bullets (`permitted` + plain consults the disguise; a seeded subject cannot author `anonymity:` — `PackLogic.ensureSurface` mints only when new)

### Doctrine
- none — the slate's theses (*groups are primary; channels fall out of them*, *chat is conversation; Mudlog is the game narrating*) are shipped decisions and went with their sections

### Uncertain — kept
- `## The generative axes` → the axes table (110–116) — the *facet model* was superseded by three fixed kinds, but the table still names the unbuilt bindings (a place, an activity) and the role/config overlay axes. Kept whole; `Left` names it as unverified against the three-kinds decision so requirements decide whether the axes survive as the generator or the kinds are the model
- `## Discovery & presence` → *Projected channels auto-appear — joining the guild surfaces guild chat* (241–242) — shipped for the party (a member is in the audience by default, `followed: true`), not for a guild (no source). Kept as the guild half
- `## Once shaped` → the trailing *"Reactions/threads, the moderation control plane, anonymity, and channel language gating wait for their own work"* (403–404) — anonymity shipped and reactions shipped; the sentence is half stale. One paragraph, kept
- `## Once shaped` → the *facet model + four-kind taxonomy* bullet (377–378) — contradicted by `chat.md § Three channel kinds`; kept inside the digest list
- Overlaps for the cluster pass: notification levels / the offline inbox ↔ `social-graph-slate` (NotifyPolicy, the notification tray — `social-graph.md § Deferred`); the moderation override layer + spam throttles + edit-trail ↔ the moderation control plane the comms slate also names; channel language gating ↔ comms-slate Q4 / `language-slate`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status line: added *party + committee chat as bound channels, `chat anonymity`*
- Left: *the role overlay · the channel config block · mentions + the offline inbox · group-projected channels (party/guild/zone) · edit/delete · pinned + announcement mode · directory/search · channel succession* → *the role overlay (projected rank + stored overlay; only `owner` gates today) · the channel config block (`editPolicy` · per-channel `retention` · `postPermission` · default notification level · topic) · notification levels + the sane projection default · mentions (`@name`/`@here`/`@channel` + the permission) + the offline inbox · guild/zone projection + the moderation override layer + the cached derived set · edit/delete + the "(edited)" marker · pinned + announcement mode · directory search + presence notices · the bounded backlog on tune-in · succession / abandonment GC / the creation cap · per-channel spam throttles · the two anonymity seams (disguise on a `permitted` channel · an authored `anonymity:` on a seeded subject) · the generative-axes model (a place / an activity binding — unverified against the three-kinds decision)* (the body wins: party dropped from projection; notification levels, the override layer, the backlog, the caps/throttles and the two seams were in the body and unrepresented)
- Size: a wave → a wave (everything left rides the existing `Channel`/`Subject`/`SubjectSubscriberMixin`; nothing needs a new substrate)

---

## docs/slates/tails/comms-slate.md — 379 → 314 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- second status block *"architecture set, internals open …"* (14–19, 6) — history; the canonical block is kept and re-stamped
- *The load-bearing decisions* 1–4 (26–63, 38) — 1 two transports: code `lib/message/Vocal.ts` + `lib/comms/Comms.ts`; doc `comms.md § Two transports` (the table, verbatim in shape). 2 cybernetic/ESP: doc `comms.md § Two transports` (*Diegetically…*). 3 directed speech via `--to`: code `say.yaml`/`shout.yaml` `to` option (`requires: class:Agent`); doc `comms.md § Directed speech — say --to` (incl. the free-prose-tail rule). 4 whisper acoustic: code `whisper.yaml` (`verbs: [whisper]`) vs `dm.yaml` (`verbs: [dm, tell]`); doc `comms.md § The verb surface`. A six-line pointer paragraph replaces all four
- `## Principle` → items 1, 2, 4 (102–106, 110–113, 9) — same evidence; 4 *routing is the work; physics is delegated*: `comms.md § meta.acousticDb stamping` (*Reach is not computed here*). Two-line pointer left; item 3 KEPT (see Uncertain)
- `## Acoustic family` → the *vocalize at volume V* intro + the `say` and `shout` bullets (119–120, 125–126, 4) — code `Vocal.ts:61` `DB = { whisper: 30, say: 60, shout: 90 }`; doc `comms.md § Acoustic`. Two-line pointer left
- `## Acoustic family` → *"Reach is the sound slate; comprehension is the language slate. Comms' only acoustic job…"* (135–138, 4) — doc `comms.md § meta.acousticDb stamping` + `§ Directed speech`; the projection attribute it names lives in the KEPT dynamic-reach paragraph
- `### Directed acoustic speech` (142–146, 5) — code `Vocal.ts:135-160` (three bodies, `toTarget` when a target is present); doc `comms.md § Directed speech` (public but addressed, the three renders, *the seam a future dialogue responder keys on*). Heading + two-line pointer left
- `## Implant family` → *"A DM is an unnamed 2-member conversation; multi-channel chat = tuned into several at once… The current `tell` verb is the degenerate 2-member case (now cleanly implant…)"* (161–164, 4) — code `DmController` cardinality cases, client `ChatSurface.tsx`; doc `comms.md § Implant — dm / tell`, `§ Relation to messaging and chat`. The routing table + the trust-boundary + language paragraphs are KEPT (the primitive is unbuilt)
- `## Provenance & UI` body (207–217, 11) — code `api/mml/tags.ts:61` (`chan`), client `lib/templates/chatTemplate.tsx`, `ChatSurface.tsx`; doc `message-rendering.md` (tag table l.32 `<chan id>` chip, l.320 `speech.channel` → `chatTemplate`, l.306 the resolved channel colour), `chat.md § Posting` (`meta.channelId`, *the cockpit groups and routes by it*), `cockpit.md` (the `chat` mode). Heading + three-line pointer left
- `## Worked scenarios` → *Room chat* (276–277) · *DM a friend* (284–285) (4) — `comms.md § Acoustic`, `§ Implant — dm / tell`. Two pointer bullets left; the other four KEPT (responder trigger, dynamic reach, guild source, remote NPC — all unbuilt)
- `## Open questions` → Q2 *Channel membership/gating* (299–300) — code `ChannelCatalogue.audienceFor` (open · managed roster · bound `GroupRef`); doc `chat.md § Three channel kinds`, `§ Bound channels`. Q6 *Identity / anonymity* (307) — `chat.md § anonymity`. Q9 *the implant-system boundary* (312–313) — code `lib/comms/Comms.ts` + `CommsUpdate.ts` over `AetherHostedMixin`; doc `comms.md § Comms is a hosted update; AetherMixin is the host`, `augmentation.md`. Three *Resolved* pointers left
- `## Build order` → *Wave 1* (321–324, 4) and *Wave 2* (326–329, 4) — Wave 1: `comms.md` end to end (the conversation primitive excepted — named in the note). Wave 2: channels `chat.md`; per-conversation buffers `ChatSurface.tsx` / `cockpit.md`; attribution rendering `message-rendering.md`; the moderation handoff did NOT ship — named in the note. Two one-line notes left; *Wave 3* + *Adjacent* KEPT
- `## Once shaped into formal requirements` → *the two-transport model and the verb→transport assignment* (360–361, 2) and *Provenance-as-tagged-label rendering … client per-conversation buffers* (367–369, 3) — same evidence as decision 1 and § Provenance

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- nothing was cut on this basis. Two facts the slate's kept sections contradict were inserted into `comms.md` so requirements read them beside the design (both are "what the code does", not "what shipped as designed"):
  - **players-only implant** — code `Avatar.ts:813` (default loadout is the only `AetherImplant` grant), no NPC YAML ships one, `lib/npc/NPC.ts` / `lib/creature/Character.ts` compose no Aether → inserted at `comms.md § Two transports` after the *Diegetically…* paragraph (9 lines: *"Universal" means every Avatar, not every character*; the consequence for remote-NPC `tell` and remote emotes; the per-NPC implant as the content the `addressed`/`tell` entry needs). The slate's Principle 3 / § The implant dependency / remote-NPC scenario stay in the slate under Uncertain
  - **speech reach is the room; `acousticDb` is a stamp nothing reads** — code `Vocal.ts:161-165` (`toPeers`), the only `acousticDb` readers being `Scene.ts:322` (the `audible` case) and `Audible.ts:74` → inserted at `comms.md § Acoustic` after the three bullets (10 lines). **Two existing bullets were changed because the code proves them false**: `whisper` *"short reach"* → *"short reach as stamped (see below)"*; `shout` *"multi-room reach"* → *"multi-room reach as stamped (see below)"*
- **One more existing sentence in comms.md was changed** (§ Directed speech): *"with a `mustBeAgent` validator"* → *"with `requires: class:Agent` (+ `onExcess: prompt`)"* — `say.yaml:25-26`; there is no `mustBeAgent` validator in `lib/command/validators/`

### Superseded — cut
- none. (The four load-bearing decisions shipped in the slate's own shape.)

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · *See also* (verbatim)
- `## Principle` → 3 *Frictionless baseline* (see Uncertain)
- `## Acoustic family` → the *whisper* bullet (see Uncertain) · the **Dynamic-reach shout** paragraph (no projection attribute anywhere; `comms.md § Deferred` names it — and see Uncertain)
- `## Implant family` → the routing table (`DM · group · chat channel` as ONE primitive at three sizes — `comms.md § Deferred`: *no unified conversation entity*) · the attribution / spoofing / hardened-baseline paragraph (no `spoof`/`intercept` code outside unrelated subsystems) · the language (ii) lean (no `language` anywhere under `lib/message`, `lib/perception`, `lib/senses`)
- `## The implant dependency` — whole (see Uncertain)
- `## NPC reachability` — whole (the target-frame seam shipped; the `addressed` trigger and the implant `tell` entry are `npc-dialogue.md § Deferred seams`; no per-NPC *has an implant* flag exists)
- `## Moderation` + `### Trust-tiered policy (deferred)` — whole (no `expressionPolicy`/`gag`/`trustTier`/`effectiveTier`; `emotes.md` l.116-122 records the expression-policy gate as deferred with the moderation build)
- `## Worked scenarios` → *Order a drink* (responder unbuilt) · *Shout across the map* · *Guild chat* (no guild source) · *Remote NPC*
- `## Open questions` Q1, Q3, Q4, Q5, Q7, Q8 (see Uncertain for Q1/Q5)
- `## Build order` → the intro line · *Wave 3* · *Adjacent / future* · `## What this slate does NOT cover` (spine; see Uncertain)
- `## Once shaped into formal requirements` — the five remaining bullets + the trailing paragraph (see Uncertain)

### Doctrine
- `## Implant family` → *"Thoughts willed into existence → attribution is the trust boundary"* (166–174) — half thesis (why attribution is the baseline guarantee), half backlog (spoofing gameplay, the hardened baseline). Kept whole under UNBUILT because the backlog half is in `Left`; flagged here so the coordinator can decide whether the thesis half belongs in `comms.md § Two transports` beside *cybernetic in mechanism, ESP in phenomenology*

### Uncertain — kept
- `## Principle` 3 and `## The implant dependency` → *"universal, always-on baseline implant … providing DM + chat + emote perception"* (107–109, 191–193) — contradicted by the code: only Avatars carry one (`Avatar.ts:813`); NPCs neither receive nor send implant comms or remote emotes. Kept verbatim; `comms.md § Two transports` now states the players-only fact; `Left` carries *the implant dependency as written*. *DM as the tutorial on-ramp* (194–195) — I found no char-gen or intake step that introduces `dm`; kept as unbuilt
- `## Acoustic family` → the *whisper* bullet (121–124) — *"overhearers get the redacted form 'X whispers something to Y'"*: not built; and the premise that overhearers are a *reach* set is also not built for speech (the whole room gets the words). Kept whole
- `## Acoustic family` → the **Dynamic-reach shout** paragraph (128–133) — *"the sound slate already computes who hears a loud source across rooms"* is true of `Scene.toAudible` and false of speech, which never calls it. The design (attribute → dB → reach) is intact; its "falls out for free" premise is not. Kept verbatim; `Left` names the missing wiring ahead of the attribute
- `## What this slate does NOT cover` → *"Acoustic physics → sound slate. Comms assigns the verbs; the sound slate computes who hears"* (342–343) — spine, but the second sentence describes a hand-off that has not been made for speech. Kept
- `## Open questions` Q1 *Addressing* (296–298) — shipped shape: `dm.yaml` `scope: online`, any online avatar by name; no contacts/must-have-met gate. Whether that was decided or defaulted is not stated in `comms.md`; kept open, `Left` names it
- `## Open questions` Q5 *Persistence/history* (305–306) — the runtime ring exists (`ChannelCatalogue.history`, cap `chat.historyCap`, lost on restart; `chat.md § ChannelCatalogue`: *persistent history retention … stays deferred*); the *lifetime* / diegetic-storage half is open. Kept
- `## Worked scenarios` → *Guild chat* (286–288) — the mechanism (tuned members, attributed thought, the chip) shipped; the guild source did not. Kept as the source half
- `## Once shaped` → the trailing *"Channels-depth, the implant system, async mail, interception/security, and identity wait"* (378–379) — *identity* (anonymity) shipped; one sentence, kept
- Overlaps for the cluster pass: language gating ↔ chat-slate Q1 / `language-slate`; the moderation control plane + trust tiers ↔ chat-slate § Hard problems / `social-graph.md § Deferred` (*foes* policy) / `emotes.md` l.116-122; regional channels ↔ chat-slate's *a place (zone/room)* binding axis; the conversation primitive ↔ chat-slate's ad-hoc kind (shipped as `AdHocChannel`, no unified entity)

### Handoff (belongs in a doc outside my list)
- → `senses.md § Deferred` (or wherever the acoustic reach walk is described), one factual line, mine not the slate's: *Speech (`say`/`whisper`/`shout`) still rides `Scene.toPeers` — the room — and stamps `acousticDb` that no reach walk reads; only `Audible.emit` rides `toAudible`/`AudienceGather`. The comms doc now says so (`comms.md § Acoustic`); wiring speech onto the walk is the first item on the comms slate's `Left`.* `senses.md` l.697 already says *existing comms ship unchanged*, so this may be a no-op — flagged in case the senses batch documented speech reach as live
- → `npc-dialogue.md § Deferred seams`, one factual clause: the implant `tell` (remote) entry additionally needs a per-NPC `AetherImplant` (no NPC row ships one — `comms.md § Two transports`, the ⚠ paragraph)

### Status block
- Status line: added `shout --to`, `reply`/`broadcast`, *over the `CommsMixin` hosted update*, and the `<chan>` chip → `message-rendering.md`
- Left: *dynamic-reach shout (the voice-projection attribute) · language gating on acoustic + encoded-cognition implant · regional channels · the first-class conversation primitive · implant security (spoofing/interception) · async mail · the moderation control plane* → *speech on the acoustic reach walk at all (today every speech verb reaches the room and only the room — `acousticDb` is a stamp nothing reads for speech; a shout does not leave the room) · dynamic-reach shout (the voice-projection attribute + the vitals tie) · whisper's redacted overhear form · language gating on acoustic + encoded-cognition implant · regional channels · the first-class conversation primitive · implant security (spoofing / interception) + the hardened-baseline guarantee · the implant dependency as written (universal — but only Avatars carry one; the per-NPC implant + remote-NPC `tell` + the `addressed` responder trigger) · DM addressing (Q1) · persistent history lifetime (Q5) · directed-say multi-target (Q8) · the moderation control plane + the trust-tiered policy · async mail* (the body wins: the reach wiring, the whisper form, the NPC side, the trust-tiered policy and three open questions were in the body and unrepresented)
- Size: a wave → a wave (the reach wiring is a call-site change onto an existing walk; the rest are per-item additions; the moderation control plane is its own build and is not sized here)

---

## Counts

- Slates: 2 · lines 816 → 669 (−147) · both PARTIAL → PARTIAL · none ABSORBED
- Sections cut (SHIPPED · DOCUMENTED): chat 13 · comms 12 — one of them mixed-then-partial (the chat *Membership ≠ subscription* bullet)
- Graduated: 1 subsection into `chat.md` (18 lines) · 2 ⚠ paragraphs into `comms.md` (19 lines)
- Superseded: chat 2 · comms 0
- Existing subsystem-doc sentences changed because the code proves them false: `chat.md` 2 bullets · `comms.md` 2 bullets + 1 clause — all listed above
- Uncertain entries: chat 4 · comms 9 (the implant universality and the speech-reach premise account for five of them)
- Handoff: 2 factual lines (`senses.md`, `npc-dialogue.md`)

## Hardest calls

1. **The kinds table in the chat slate** — three of four rows shipped (one as a bound channel), the guild/zone row did not, and *GC'd when abandoned* is unbuilt. Row-level cutting is below paragraph granularity, so the table stays whole, and the *Facets, not types* decision above it was cut as Superseded. The result is a slate whose first section is a generator the code rejected; `Left` says so explicitly rather than pretending the axes are the model.
2. **Whether "party chat shipped" retires the group-projected item.** It retires the *party* word and the *projection* mechanism (derived membership through a `GroupRef`, the group's lifetime) — but the override layer and the cached derived set are the slate's actual design content for that section, and neither exists. So the section is kept, the mechanism paragraph is Superseded with a note, and `Left` names the three unbuilt halves instead of the kind.
3. **Speech reach.** The slate, comms.md and my own first draft of the insert all assumed the senses walk carries speech. Only `Audible.emit` does. Classifying the dynamic-reach paragraph as UNBUILT was easy; deciding to amend comms.md's two bullets (rather than leave a contradiction one paragraph apart) was the judgment — the rule permits it when the code proves the statement false, and `Vocal.ts:161-165` does.
4. **The `mustBeAgent` clause.** Trivial, but it is an edit to an existing sentence in a subsystem doc, which this pass is not supposed to make. Made because it is literally false and sits in a paragraph I was already anchoring an insert beside; logged.
