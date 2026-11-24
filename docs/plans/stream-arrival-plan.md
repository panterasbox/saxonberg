# Stream arrival — implementation plan

Executes [stream-arrival-requirements](../requirements/stream-arrival-requirements.md) as rewritten
2026-11-23 (`e365cad4c`): **nobody is *the* streamer; the unit is the program; the broadcaster's
verbs come from instruments.** **Kind: feature, three stages.** **Stage A leads from the kernel** — the program as a record (owned by a person or an
organization, its video feeds optional and proven when attached), the stream verb — renamed `rodney` — running a
program, one setting naming the program the front page features, and the retirement of every
environment variable that hardwired one streamer. **Stage B leads from the client** — a visitor
from Twitch, YouTube or Kick sees the program their link names (else the featured one) playing on
the front page, signs in, keeps the video docked through character select and creation, and
arrives in the lounge already in watch mode with the same video still playing; plus the front
page's client rebuild and aspiration's removal. **Stage C leads from the kernel** — an installed
app confers its verbs on whoever bears its device (first consumer: the broadcast app), the body
stops carrying `rodney` and `program`, and Hallett's front-window booth exists as one place with
a broadcast desk and an on-air sign. This is the minimum to start the founder's
livestream; broadcasting's economics and lens pass are their own build and are not planned here.

## ⚠ Requirements conflicts and notes — read first

Nothing here changes scope. Each is a place where planning found the requirements cannot be met
exactly as written, or where the plan had to choose.

1. **A fifth environment variable goes with the four.** `BROADCAST_TOKEN` (the overlay's
   changeover door, `services/websocket/WebSocketService.ts:92–260`) resolves to *the first id in
   `STREAMER_PLAYER_IDS`*. With that list retired the door names nobody, so it is deleted too; the
   overlay uses the per-player token `rodney token` already mints. It is a go-live step (the
   founder's Rodney browser source needs the minted token).
2. **The program's agenda stays with the run.** The requirements list the agenda among the
   record's fields, *"the segments the stream verb already runs"*. Those live on the body that is
   running the stream (`streamAgenda`, `streamAgendaIndex`, persisted with it) and the overlay
   reads them there. The plan does NOT copy the agenda onto the record (two copies of one list):
   the program's agenda is the agenda of the body running it (A2). A standing agenda that outlives
   a run — craft measured by agendas kept — is the broadcasting build's.
3. **The record has no avatar and no owner's display name.** The page's show band wants *the
   program's owner and avatar*. The record's owner is a path (whose pen); the plan stores a
   caption beside it (`ownerName`, written when the owner writes the record — A1) and draws the
   brand's `@` glyph as the tile's art for every program. A per-program image has no source and is
   absent.
4. **The registry slate argued for a collection; the plan uses the document tree.** Its argument
   was the reverse lookup (*given this Twitch login, find the record*). The requirements removed
   the need: a feed is proven at attach by reading the ATTACHER's own linked account, and a link
   names the program by its short name. A program is found by a path built from that name; nothing
   is ever found by channel. No new collection (D10). If the build finds a read that needs one,
   that is a stop-and-ask.
5. **The reuse ledger predates the program.** watch-slate § 7b's rows *the show's channel per
   carrier → settings* and *sign-in → the window flow* are both superseded (the program's feeds;
   the window rejected). Correct the ledger at the sweep.
6. **`from=stream` cannot be retired, and it means Twitch** *(the owner, 2026-11-23)*. Rodney's
   on-screen card and QR (`packages/rodney/src/scenes/live/panels.tsx:24`) are one picture sent to
   every carrier. `stream` stays a legal word: the featured program on Twitch, Twitch sign-in
   first, the ticker line as today; a referrer naming another carrier wins (D7). Rodney's code is
   not touched.
7. **"On their phone" is the personal `watch` embed.** The phone as a watchable screen is unbuilt
   (`aether-devices.md`); `watch` asks for no device. The drive checks only that the phone is in
   the pocket.
8. **Our unmute reloads the embed once; after the sign-in trip the video resumes muted** — both
   *accepted by the owner, 2026-11-23* (D3). *The video did not restart* is held for entering.
9. **Drive step 8 forces a mode that is not remembered** — kept in a transient key that dies with
   the visit (D4). No new command.
10. **Twitch's embed rules** (minimum size, visibility) may not hold for the docked corner at phone
    width. The walk uses stubbed players; the three real embeds are checked by hand before the MR.
11. **The wiki uses the word once**, in a history note (`wiki-starter/…/employed.md:31`); W0
    rewords it.

12. **Terminus is the `terminus` pack, not `world-seed`.** The booth's rows go in
    `packages/content/terminus/content/world/terminus/` beside the Gazette's office and the tailor's
    shop; `world-seed` holds other localities.
13. **"The program run from the desk" is read as *its broadcaster is in the booth*.** The sign is
    lit exactly while a body in the booth is on air; a broadcaster who walks out with the phone
    keeps broadcasting and the window goes dark behind them (halletts-slate § 2: *"lit and
    occupied"*). Nothing records where a program was started — that would be a second state
    (D19). If the owner wants the window to stay lit for a stream started there and carried away,
    that is a stored fact and a different design.
14. **There is one app store, not a list on each device** *(the owner, 2026-11-23: "phones need to
    just install apps from an app store at runtime like a real phone would")*. The persisted
    per-device `offersApps` is retired (D21), so every phone that exists can install the broadcast
    app and a newly published app reaches everyone. The store's economics and who may publish are
    not designed here.
15. **A guest may not create a program.** With one store a guest's implant can install the
    broadcast app; a guest's identity is thrown away at disconnect, so a program they created
    would squat a short name forever under an owner nobody is. `program create` refuses a guest
    (A1); a guest can still read `program show`.

16. **`stream` becomes `rodney`** *(the owner, 2026-11-23)* — and two things the requirements'
    list does not settle (D22):
    - **`off` is missing from the list** (`start · live · away · back · end · segment · agenda ·
      next · token · rotation`). `stream off` is the only way off the air at once — `end` holds the
      outro first — and the controls card has a button for it. The plan keeps it as `rodney off`.
    - **The rotation goes flat** *(the owner, 2026-11-23)*. `rodney rotation pin <panel>` would be
      three deep, against `verb subcommand target` (controller-liquidity W16) — the reason
      `stream-rotation` was its own verb. So the lower third's controls are three ordinary
      subcommands: **`rodney pin <panel>` · `rodney skip` · `rodney unpin`**; the word *rotation*
      leaves the grammar.
17. **The Stream Deck's buttons are configured outside this repo.** The control door accepts one
    verb; after the rename it accepts `rodney` and refuses `stream`. Every game-command button the
    deck sends through pblive must be retyped at go-live. `packages/rodney` itself sends no
    command text (checked — only its README, `docs/obs-setup.md`, `docs/phase-1-server-spec.md`
    and three code comments NAME the verb); those are prose, and a sibling worktree holds
    `build/rodney`, so they are a coordination item, not edited here.

## Grounding

Verified by opening the files, 2026-11-23, on `reqs/stream-to-game` at `26d312b54`.

**The broadcaster side today**

- `lib/livestream/Broadcast.ts` — `BroadcastMixin`, composed on every Avatar. Persistent:
  `streamPhase`, `streamReason`, the three timers, `streamTopic`, `streamAgenda` +
  `streamAgendaIndex`, `streamChannels` (`{ twitch?, youtube?, kick? }`), `streamTokenHashes`.
  Methods: `getStreamPhase`, `isOnAir` (`starting · live · ending`), the transitions,
  `nameChannel` / `getStreamChannels`, `show()` (the wire `StreamShowCore`, built synchronously),
  `rearmBroadcast`. `stream` is afforded to every played body (`:147`).
- The `stream` verb — `packages/content/platform/content/platform/cmd/stream/stream.yaml`:
  `start · live · away · back · end · off · segment · agenda · next · channel · token`, one
  controller each under `platform/idea/cmd/stream/`; `validators: [requiresStreamer]` (also on
  `stream-rotation.yaml`). `channel <service> [<handle>]` (`StreamChannelController`) writes
  `streamChannels` — **any string, proven by nothing**.
- The streamer axis — `lib/command/validators/requiresStreamer.ts` → `AccessApi.isStreamer`
  (`api/access.ts:247`) → `AccessLogic` → `AccessRegistry.isStreamer` (`:286`, a member cache of
  the `streamers` managed group, seeded from `STREAMER_PLAYER_IDS` at `:708–728`). Callers of the
  predicate: the validator only. The test harness option `streamer: true` joins that group
  (`backend/TestHooks.ts:222`); it is used by `packages/wire/src/harness/session.ts`,
  `packages/wire/tests/broadcast-ready.wire.test.ts`, `e2e/tests/helpers.ts`,
  `e2e/tests/broadcast-ready-walk.spec.ts`.
- `platform/idea/api/StreamLogic.ts:686–722` — `founderPlayerId()` = the first
  `STREAMER_PLAYER_IDS` entry; `channelsOf(playerId)` (synchronous; `StreamApi.channelsFor`) = an
  open overlay read's channels, else the body's `streamChannels`, else for that founder the
  `OVERLAY_TWITCH_LOGIN` / `OVERLAY_YOUTUBE_CHANNEL` / `OVERLAY_KICK_CHANNEL` env.
  `openOverlayFor` / `openOverlayYoutube` (`:802–828`) read the channels under a per-streamer
  sentinel; the YouTube read accepts a channel id (`backend/YoutubeClient.ts:245`).
- Tokens — `stream token` stores a sha256 at `/platform/stream-tokens/<hex>` (`{ playerId, scope,
  issuedAt }`) through `DocumentApi.saveStreamToken`, a narrow transport gated to `StreamLogic`
  (`platform/idea/api/DocumentLogic.ts:438–457`: path pinned, kind pinned, fields taken typed).
  `BroadcastFeed` (`backend/BroadcastFeed.ts`) routes each streamer's show to the sockets opened
  with THEIR token — keyed by playerId. `BROADCAST_TOKEN` (env) is the changeover door.
- The env names are documented in `packages/server/.env.example:10–25`, `docs/deployment.md:524`,
  `packages/rodney/README.md:51`.

- **Who types the verb's text today** (the rename's census): the views `stream.yaml` and
  `stream-rotation.yaml` (own verb, three controllers `StreamRotation{Pin,Skip,Clear}Controller`,
  the mixin's `steerRotation`, `Broadcast.ts:302`); fourteen `Stream*Controller.ts` and their
  controller rows; `backend/inbound/command.ts:120–175` (`handleControlCommand`: the verb must be
  literally `stream`, `stream token` refused, an alias named `stream` refused, refusal codes
  `stream-only` …) and `backend/__tests__/ControlCommand.test.ts`; `lib/connection/Cards.ts:409–419`
  (the `stream` card: `command: 'stream'`, label *the stream controls*); the client's
  `components/cards/StreamControls.tsx` (every button is a typed `stream …` /
  `stream-rotation …` string, `:157–273`) and `CardBodies.tsx:1155`; content prose in
  `standby-reasons/generic.yaml` and `settings/stream.yaml`; `packages/wire/tests/
  broadcast-ready.wire.test.ts`, `e2e/tests/broadcast-ready-walk.spec.ts`,
  `BroadcastFeed.test.ts`, `Broadcast.test.ts`, `Avatar.test.ts`; docs `livestream.md`,
  `streaming.md`, `cockpit.md`, `card-surface.md`, `client-shell.md`, `command-spec.md`,
  `access.md`, `connection.md`, `display.md`, and `CLAUDE.md`'s category list. `pblive` is not in
  this repo. `packages/rodney` sends no command text.

**What proves a channel is yours** (`mud/lib/identity/`)

- `TwitchProfile.login` (`:63`, lower-cased), `KickProfile.slug` (`:64`, lower-cased, empty when
  the account has no channel), `GoogleProfile.youtubeChannelId` (`:86`) with `hasYoutube()`
  (`:90`) — written by the shipped `/auth/google/youtube` step-up
  (`services/auth/AuthRoutes.ts:285–330`, `Backend.handleYoutubeStepUp`). A `User` holds
  `twitchProfileId` / `googleProfileId` (and Kick's); `avatar.getUser()` reaches it. All three
  proofs are stored fields — reading them calls no carrier.

**The document tree** (`docs/subsystems/document-store.md`)

- `lib/document/DocumentKinds.ts` — the kind vocabulary; `stream-token` (`:335`) is the precedent
  for a runtime-written kind (`onVanish: 'keep'`, no pack ships one). A document's PATH is its only
  identity (unique index); the old unique `naturalKey` is retired, so **only a path makes a name
  first-come**.
- `DocumentCatalogue` (`lib/document/DocumentCatalogue.ts`) — *a cited document is resident
  whenever the thing that cites it is resident*: `ensure(path)` async, `need(path)` sync,
  `forget(paths)` on an edit; a family is served by a catalogue singleton reached through its
  domain Api (`CraftingApi.joints()` → `platform/idea/JointCatalogue.ts`), named in the kind's
  `catalogue:`.
- The ordinary `DocumentApi.save` gate is parcel title (`AccessApi.canAtPath(actor,
  'write-document', path)`; a player holds their own `/home/<self>` branch through
  `ParcelApi.selfHomeOwnerOf`, `api/parcel.ts:461`; an institution holds `/compact/…`,
  `/corpo/<key>`, `/studio/<group>`). Named transports exist for writes the title gate cannot
  express (`saveStreamToken`, `saveToRegister`, `saveBerth`).
- Settings: `lib/config/AppSettings.ts` (`AppSettingKeys` + the total `AppSettingTiers`), values in
  `packages/content/platform/content/settings/<section>.yaml` (`stream.yaml` exists), read by
  `AppApi.setting`, set by the Prime Minister's `config` (Tier B).

**Watching, modes, the ways in**

- `platform/idea/cmd/stream/WatchControllerBase.ts` — `watch <target>` builds the `WatchTarget`
  (`{platform:'twitch'|'kick', channel}`, `{platform:'youtube', videoId|channelId}`) and
  `setWatch()` writes + pushes the transient `cockpit.watch` (`:215–216`), then best-effort
  `StreamApi.tune`. Views `watch.yaml` / `watch-stream.yaml` carry boolean options `--twitch`,
  `--youtube`, `--kick`. A Twitch login, a Kick slug and a YouTube `UC…` id resolve with no
  external call (`lib/streaming/StreamerTarget.ts:135`).
- `lib/connection/SaxonbergClient.ts:556–563` (`cockpit.watch`, transient), `:789–794`
  (`getCockpitMode`: stored → legacy → `explore`), `:994–1010` (the snapshot carries the RESOLVED
  mode). `lib/connection/ClientState.ts:47–60` (a key may be `transient`).
  `platform/idea/cmd/shell/CockpitModeController.ts` (`commit()` writes, saves, pushes).
- `lib/character/Avatar.ts:954–984` — `enter()`: arm → first-arrival deed → welcome payload →
  auto-look → `openArrangementGuarded`. It also serves a reconnect (`:1275`).
- `play <playerId>` — `…/cmd/charactergen/play.yaml` (one `greedy` arg, no options),
  `PlayController` → `Login.playCharacter` (`platform/idea/Login.ts:376–405`) → `enter`.
  `embody confirm` — its own stanza in `embody.yaml`, `EmbodyConfirmController` →
  `EmbodyController.commit` → `enter`. **The guest runs no command**: `POST /auth/guest`, the
  socket opens, `Application.handleUserConnect` (`backend/Application.ts:225–285`) stamps the
  `Interactive`, `Login.enterAsGuest` (`Login.ts:217–224`) mints the body and calls `enter`.

**Origin, sign-in, the anonymous reads**

- `packages/client/src/config.ts:32–60` (`arrivalDoor` accepts only `from=stream`, stored in
  `sessionStorage`, appended to `WS_URL`, a module constant);
  `services/websocket/WebSocketService.ts:194–200` and `platform/idea/Interactive.ts:206–215`
  (only `'stream'` survives); `backend/BroadcastFeed.ts:216–223` (`fromStream`).
- `services/auth/AuthRoutes.ts:63–119` — three callbacks, each `→ /?auth=success`; `:140–191`
  `/auth/status`. `services/auth/TestAuthRoutes.ts` — every seam is a `fetch`ed POST; none
  navigates; `test-login` answers no `playerId` and links no provider.
- `backend/PressRoutes.ts` — the anonymous-REST precedent; mounted in `services/Server.ts:261`.
- e2e: `AUTH_MODE=test FOUNDER_GOOGLE_EMAIL=founder@e2e.local`
  (`e2e/playwright.config.ts:63`); `openWorldAsFounder` (`e2e/tests/helpers.ts:344`) holds the
  founder-default seats (so it may `config set`). Twitch and Kick are not configured there.

**The client**

- `packages/client/src/App.tsx:682–840` — the `screen` switch on `connectionPhase`; the component
  returns `<>{screen}<TooltipLayer/></>`, so a sibling there survives every phase. `:361–378`
  reads and strips `?auth=`; `:472–510` `checkAuthStatus`.
- `components/embed/StreamEmbed.tsx` — `iframeFor(target)`, one sandboxed iframe; mounted only at
  `layouts/ModeStage.tsx:626` and `components/phone/PhoneShell.tsx:297`. ⚠ Reparenting or
  portaling an iframe reloads it.
- `components/StartScreen.tsx` (bands as local styled-components `:74–360`; provider list
  `:433–451`; test ids `start-screen`, `guest-button`, `guest-warning`, `presence-line`,
  `reset-notice`), `PressRoom.tsx` (its own never-awaited fetch), `CharacterSelect.tsx`
  (`roster-play-<id>`, `roster-sends-as`), `CharGenStage.tsx` (`chargen-confirm`).
- `components/ui/tokens.ts` — the prototype `docs/design/front-page/front-page.dc.html` is written
  in the same variables and the same three faces (`styles/GlobalFonts.ts`).

**Apps, and how a verb reaches a person** (Stage C)

- `platform/idea/App.ts` — an app is an incorporeal `Idea` bound to its host; rows under
  `packages/content/platform/content/platform/idea/app/` (`messages`, `forums`, `wallet`,
  `calendar`). `ForumsApp` / `WalletApp` / `CalendarApp` are `App` subclasses with a capability
  mixin, installed on the PERSON.
- `lib/augmentation/AetherHost.ts:130–200` — `hostApp` / `unhostApp` call
  `CommandApi.applyHostedAppDelta(host, app, 'host' | 'unhost')`; `installedApps` persists and
  `setInstalledApps` re-clones the apps at birth and at restore; `offersApps` is authored and
  persisted — a COPY on every device, read by `availableApps()` and `installByKey(key)`
  (`AetherHost.ts:237–254`) and by `AppsListController` / `AppsInstallController`. Every device
  row ships `offersApps: [/platform/idea/app/messages]` (`generic-objects/…/gear/hollis-pal.yaml:27`,
  `aevex-meridian.yaml:23`, `headset.yaml:21`, `AetherImplant.yaml:13`). The wallet, calendar and
  forums rows are in the same branch but are installed on the person and never listed by `apps`.
- `platform/idea/api/CommandLogic.ts:4676–4692` — `applyHostedAppDeltaImpl` **returns at once for
  a host that is not a command giver**; for one that is, it pushes
  `collectBucketDefs(app.constructor, 'self')` onto the host's own stack with the APP as the
  source. So an app on a phone contributes nothing to anyone today (aether-devices.md § Deferred
  seams). ⚠ The record of what an app affords is its CLASS's `static commandContributions` — a row
  field would be read by nothing.
- `docs/subsystems/command-routing.md` § *CommandContributions*: `self` is read off three kinds of
  host only — a command giver, a shadow, a hosted app — and `lint:self-contributions` gates it; a
  carried thing grants outward through `environment` (its container chain, at any depth), a thing
  you stand beside through `peers` (siblings, and one PASSABLE exit away).
  `ContainmentApi.move` → `CommandApi.applyContainmentDelta` keeps both exact on every move
  (`CommandLogic.ts:~4600–4672`). § *Affordance attribution*: every binding records its source
  Stuff, threaded to `CommandContext.commandSource`. § *③ The other offer*: a verb two sources
  afford.
- `aether-devices.md` § Tuners — a device answers `conferralRefusal()`: `not-borne`, `off`,
  `packed`, `dead`, `not-yours`; § *Held, never silent* — a refusal names the fix.
- `lib/livestream/Broadcast.ts:151–155` — `BroadcastMixin` declares `self: [stream.yaml,
  stream-rotation.yaml]`: every played body affords both. `backend/inbound/command.ts:131` — the
  control socket runs `stream` as the streamer through the ordinary dispatcher.
- A fixture that affords a verb to the people in its room: the `JobBoard` (*"`job` is afforded by
  a `JobBoard` IN THE ROOM — `peers`, and only `peers`"*, the tailor's shop row).

**Terminus, for the booth**

- The arrival gate opens onto `/world/terminus/university-avenue/location/crossing`
  (`terminal/location/arrival-gate.yaml:48`).
- One-room houses off a street: the Gazette's office (`gazette/office.yaml` — `class:
  /platform/location/Hall`, `_address`, `enclosure:` brick, `roof:` slate, `coords`, `props:`,
  one named way back to the street) and the tailor's (`mayfield-row/tailor/location/shop.yaml` —
  *"no ambient of its own: lit by spill through a doorway that stands open — bright by day and
  DARK at night"*). Each is its own zone with a named cross-zone pair, both sides explicit.
- `scripts/check-light-sources.ts` — a room's light has a named source: the sky, something lit in
  the room, or spill through an open boundary; an enclosed room with none is dark, correctly.

**Aspiration — every consumer** (the respiration condition excluded)

- `mud/config/char-gen.yaml:76+` (`aspirations:`; `startingKit:` at `:26` is the precedent list).
- `platform/idea/cmd/charactergen/EmbodyController.ts` (`:63`, `:112–126`, `:401–420`, `:437`,
  `commit()` `:669–781`, loader `:840`); `platform/idea/Login.ts` (`:95–96`, guest mint `:281`,
  `:307–308`, `:344`); `lib/character/Persona.ts` (`:63–64, 144, 264–282`; ⚠
  `seedChronicleClaims` has a second caller, `lib/npc/Cast.ts:220`, and stays).
- `api/social.ts:85`, `platform/idea/api/ProfileLogic.ts:219–220`,
  `platform/idea/cmd/social/ProfileControllerBase.ts:76`; views `embody.yaml:8, 18`,
  `score.yaml:7`; `backend/TestHooks.ts:773`; `packages/wire/src/harness/session.ts:451–495`.
- Tests and fixtures: the three `EmbodyController*.test.ts`, `ProfileLogic.test.ts`,
  `TestHooks.test.ts`, the `wiki-spoiler-fields` snapshot, `scripts/__fixtures__/field-{tags,
  meta}-golden.json`, client `charGenFields.test.tsx`, e2e `chargen.spec.ts:165`,
  `arrival.spec.ts:170–175`. Prose: `ChronicleEntry.ts:66`, `Beast.ts:19`, `commands.spec.ts:49`,
  `rucksack.yaml:3`, `employed.md:31`.
- The plain clothes exist: `packages/content/generic-objects/content/stuff/thing/clothes/`
  `student-shirt.yaml`, `student-trousers.yaml` (two side pockets), `canvas-shoes.yaml`.

**Gates that bite here:** `lint:wire-content` (ceiling 113; `restartWorld()` is the one restart),
`lint:drive-scripts`, `lint:view-keys`, `lint:command-views`, `lint:one-word`,
`lint:verb-collisions` (`program` is unused as a verb today), `lint:reason-rows`,
`lint:field-meta` (golden), `lint:test-seams`, `lint:data-ideas`, `lint:schema`,
`lint:wizard-axis`, the client's `noNativeTitle` test.

## ⭐⭐ New substrate

No new Mongo collection, Api class, mixin, hook, module category or exported server helper.
Against watch-slate § 7b (superseded where conflict note 5 says) and the registry slate:

**Stage A**

| # | item | ledger | P9 · P10 · P11 · P12 · P13 · P14 |
|---|---|---|---|
| A-1 | document kind `program` (`DocumentKinds`, runtime-written, `onVanish: 'keep'`), at `/platform/programs/<short-name>` | registry slate, *the record* — **genuinely new**. Searched: nothing persists anything about a streamer; `stream-token` is the shape. | P9 n/a. P10 a document, with a value class — not an Idea (D10 says why, and when that flips). P11 n/a. P12 it REPLACES `streamChannels`, the three `OVERLAY_*` vars and the `streamers` group. P13 n/a. P14 the short name is the path's leaf, so *first come* is the store's own unique index, not a check-then-write. |
| A-2 | value class `Program` (`lib/livestream/Program.ts`) | same | A named value object over the document (the `Placement` precedent): what a program IS, `feedOn(carrier)`, no statics. |
| A-3 | `ProgramCatalogue` (`platform/idea/ProgramCatalogue.ts`, a `DocumentCatalogue`), reached as `StreamApi.programs()` | same; the house pattern for a kind something cites | P13 the catalogue is where a family's documents are looked up; the body cites its program, so the program is resident whenever the body is and the overlay's synchronous reads stand. P14 *a memory, never a roster*. |
| A-4 | `DocumentApi.saveProgram(name, data)` — a narrow transport gated to `StreamLogic` | the `saveStreamToken` precedent | P12 not a second `save`: the title gate cannot express *the owner edits the title but nobody edits a feed except by proof*. Path pinned under the branch, name pattern checked, kind pinned, fields taken typed. |
| A-5 | `StreamApi` statics → `StreamLogic`: `createProgram`, `amendProgram`, `attachFeed`, `detachFeed`, `runProgram`, `programListing` | *the show's on-air state — reuse*; the rest genuinely new | P11 no caller branches on owner kind — one pen test (D11). P12 `attachFeed` replaces `stream channel`. P13 `StreamApi`'s header already covers per-streamer channel reads. P14 every write names its actor from context, never a parameter. |
| A-6 | the `program` verb: `create · title · schedule · feed · run · show` (`…/cmd/stream/program*.yaml`, controllers under `platform/idea/cmd/stream/`) | **genuinely new** verb. The stream verb was checked first: every one of its subcommands drives Rodney and OBS (it is renamed `rodney` for that reason — D22), and a record any broadcaster has, edited off air, with or without Rodney, is a different noun (*an institution transaction is a subcommand of its noun*). | P9 each subcommand's def and help say exactly what it writes; `feed` says whose account proves it. P12 one word, no synonym; `stream channel` is deleted, not kept beside it. |
| A-7 | reason rows `program-name-taken`, `program-bad-name`, `no-such-program`, `not-your-program`, `no-linked-account`, `not-your-channel`, `program-in-use`, `no-program` | the failure model's rows | Refusals are rows, never controller strings. |
| A-8 | `BroadcastMixin.streamProgram` (persistent; setter returns the catalogue's `ensure`) | *the show's channel per carrier* — replaces `streamChannels`, which is deleted | Host table below. |
| A-9 | validator `requiresProgram` | replaces `requiresStreamer`, which is deleted with `AccessApi.isStreamer`, the registry's cache and the group seeding | P12 a replacement, not an addition: the gate stops being a role and becomes the pen. |
| A-10 | setting `stream.featuredProgram` (Tier B) | *the featured program* — genuinely new, one key | P10 a row in the settings Document. P14 unset → the page has no show band; nothing is featured by default. |
| A-11 | `backend/FrontRoutes.ts` (`GET /api/front`), wire types `FrontResponse`, `ProgramListing` | front-page-slate § 6 item 8, the show slice | Anonymous: reads no session, sets no cookie. `/auth/status` refused (sign-in awaits it). |
| A-12 | test seams: `linked` on `test-login` (a synthetic Twitch / Kick / YouTube identity on the test user) and `playerId` in its answer; the harness's `streamer: true` re-pointed at a staged program | the tools this build owes (a state nothing could stage) | Test-only; `lint:test-seams`. |

**Stage C**

| # | item | ledger | P9 · P10 · P11 · P12 · P13 · P14 |
|---|---|---|---|
| C-1 | **the seam**: a hosted app's `self` verbs reach the bearers of a host that is not itself a command giver, kept exact on every move; a matched verb whose source is an app on a device that refuses to run falls to the verb's other offer, else is refused with the device's reason | **genuinely new**. Searched: `applyHostedAppDeltaImpl` (returns early), `applyContainmentDelta` (pushes a carried thing's `environment` only), `lint:self-contributions`, aether-devices § Deferred seams (which names exactly this). | P9 the verb's def is unchanged; `affordances` shows the app as the source, and the refusal names the device's state and the fix. P10 n/a. P11 no caller asks *is the host a person or a phone* — the delta decides the receiver. P12 not a new bucket: the app's `self` still means *whoever this app serves*. P13 `CommandLogic` owns every push and pop of the recency stack. P14 nothing moves; a device that is off, dead, packed or not yours SAYS so. |
| C-2 | `BroadcastApp` (`platform/idea/BroadcastApp.ts`, an `App`) + row `/platform/idea/app/broadcast` | aether-devices *apps* — reuse; the app itself new | P9 `apps` lists it in the store; `look phone` lists it installed. P12 it REPLACES `BroadcastMixin`'s `self` contribution, which is deleted. P13 an app class is where an app's verbs are declared. |
| C-7 | **the app store**: the published app rows, read by their branch when `apps` is typed; `published: true` on an `App` row; `offersApps` deleted from `AetherHostMixin` and from the four device rows | aether-devices `offersApps` — **generalize**, and the specific one is gone | P9 `apps` prints the store and what is installed; `apps install <app>` installs any published app — its help says so. P10 the store IS the rows; no document, no roster, no Idea of its own. P11 no caller asks what kind of device it is. P12 `apps install` is the shipped verb. P13 the read sits behind the Api that already fronts aether hosts. P14 an unpublished row (the person's wallet, calendar, forums) is never listed and never installable on a device. |
| C-3 | `BroadcastDesk` (`platform/thing/BroadcastDesk.ts`) — a fixed thing affording `rodney` and `program` through `peers` | the `JobBoard` precedent — reuse | P12 the same three views as the app; it grants nothing the app does not. P14 standing at a desk decides nothing about whose program you may run — the pen does. |
| C-4 | `OnAirSign` (`platform/thing/OnAirSign.ts`) — a light whose lit-ness is derived on read: someone in its place is on air | the light subsystem's source — reuse; the derivation new | P10 no state. P14 it reads; nothing pokes it. |
| C-5 | the booth: rows in the `terminus` pack — the place, its zone / address / title rows as its neighbors have, the way pair with the avenue crossing, a lamp, the desk row, the sign row | halletts-slate § 2 — content | Rows only; a second studio is rows. |
| C-6 | the test-fixtures testbed gains a desk and a sign as props of one existing place | the scaffold — reuse | So the wire drive can stand at a desk without naming a locality. |

**Stage B**

| # | item | ledger | P9 · P10 · P11 · P12 · P13 · P14 |
|---|---|---|---|
| B-1 | `ARRIVAL_DOORS` (`twitch · youtube · kick · stream`) + `ArrivalDoor` in `@saxonberg/types` | *where the visitor came from — generalize* | Replaces the literal `'stream'` at three sites. |
| B-2 | `via=<provider>` on the success redirect; one private `AuthRoutes.finishSignIn` | *sign-in — a return* | Data the client reads, never a command. |
| B-3 | test seam `GET /auth/test-return` | genuinely new — no existing seam navigates | Test-only. |
| B-4 | **arrive watching**: `--watch <program>` with `--twitch` / `--youtube` / `--kick` on `play` and on `embody confirm`; the guest's `watch=` + `carrier=` words on the socket; `enter(…, { watching })`; `SaxonbergClient.arriveWatching(target)` + `showPersonalStream(target)`; the transient key `cockpit.sessionMode` | *what is being watched — reuse* (`cockpit.watch`); *the mode a character enters in — reuse* (`getCockpitMode`), plus the one new piece, a mode that is not remembered | P9 the options and what they do are in `play.yaml` and `embody.yaml`'s `confirm` stanza; the carrier flags are the ones `watch` already uses; Enter and confirm show the exact command. P11 every way in ends in the one `enter`. P12 not a synonym for `watch`: the same key through the same mixin method, differing only in WHEN. P13 `SaxonbergClient` is our client's keyspace and its resolution. P14 the server resolves the channel from the program's proven feed and says so; off air it says that and enters the usual mode. |
| B-5 | `startingOutfit:` in `mud/config/char-gen.yaml` | *a new character's clothes · the guest's look — replace* | A list beside `startingKit:`. |
| B-6 | client: `StreamPlayer`, `PlayerSlot` (`StreamEmbed` becomes one), `store/playerSlice.ts` | *playing a carrier's video — reuse* | The iframe builder MOVES; one place builds a carrier iframe. |
| B-7 | client: `services/arrival.ts` | *where the visitor came from — generalize* | `config.ts`'s two door functions are deleted. |
| B-8 | client: `components/front/` (the band grammar and the bands), the `/api/front` facts in the store | *the front page — rebuild* | `PressRoom` becomes `Latest`; select and creation import the same parts. |

## Plan-level decisions

**D10 — A program is one document at `/platform/programs/<short-name>`, written only through a
transport; no collection.**

- **The record:** `{ title, owner, ownerName, schedule, feeds: { twitch?, youtube?, kick? },
  runner }`. `feeds.<carrier>` = `{ channel, provenBy, provenAt }` — `channel` in exactly the form
  the embed uses (a lower-case Twitch login, a lower-case Kick slug, a YouTube `UC…` id);
  `provenBy` the attaching player's identity path. `schedule` is one free line (*the next show,
  with its time zone*). `runner` is the playerId in the chair, or null (D12). The short name is
  the path's leaf: lower-case letters, digits and hyphens, 2–32 long.
- **Why the path:** the short name is what a link names, so the read is `DocumentApi.read(path)` —
  never a search — and the store's unique path index makes names first-come with no race. **Why
  `/platform/programs`:** a flat register of names needs one keeper; the platform already keeps
  `stream-tokens` the same way. The owner is a field, not the branch, because a program's name
  must not change when its owner does.
- **Why a transport and not the title gate:** the owner may edit the title and schedule, but a
  feed may be written only by proof and the `runner` only by taking the chair. Letting the owner
  hold the pen on the row would let them write any channel into `feeds` — *you file; you do not
  hold the pen.* `DocumentApi.saveProgram` is gated to `StreamLogic`, pins the path and kind and
  takes its fields typed; `StreamLogic` is the one writer and tells the catalogue to forget the
  path after each write.
- **Why a document and not an Idea** (the store's own test): nothing shadows it, no behavior
  varies by class, and no MQL chain reaches through it today — commands name it by a word. It IS
  written at runtime, as `stream-token`, `map` and the registers are. ⚠ When programs enter the
  fiction as things a query reaches (`here:screen:program:owner`), that is limb 3 and it becomes an
  Idea — the broadcasting build's call, flagged for the owner.
- **Why no collection:** the five-part rubric holds — read by path; grows with things, not
  actions; no revision log; no secondary key (nothing finds a program by channel or by owner); a
  kept branch. Persisted across the nightly reset like every declared kind.
- Out of scope and not planned: retiring or renaming a program, transferring it, listing other
  people's channels, a directory, a public REST read.

**D11 — The owner is a titled path, and one test answers *whose pen*.** `owner` is the creator's
own home branch by default, or — `program create <name> --owner <path>` — an institution's branch
(`/compact/…`, `/corpo/<key>`, `/studio/<group>`) the creator already holds the pen of. *May this
person edit, attach to, or run this program* is `AccessApi.canAtPath(actor, 'write-document',
program.owner)` — the shipped title gate, which already answers a player's own home and a
committee's branch alike. So an organization's program is edited and run by its members with no
new access code, and no caller ever asks *is the owner a player or an organization*. `ownerName`
(the creating character's name, or the institution's name) is a caption re-captured on every
owner write, for the page (conflict note 3).

**D12 — The body runs a program; the program names who is running it; the run's state stays on
the body.** `program run <name>` (the pen test) sets the body's `streamProgram` to the program's
path and the program's `runner` to that player. Everything `rodney` does — phases, timers, the
segment, the agenda, the rotation, the tokens — stays on the body, where it already survives a
restart and where the overlay reads it; the program holds the standing facts. Nothing is in both
places except the pointer pair, and both ends are needed: the body cites the program (so it is
resident with the body, and `channelsFor(playerId)` reads the program's feeds synchronously), and
the program names its runner (so *is this program on air* follows a reference — never a scan of
who is online).

- One chair at a time: `program run` is refused (`program-in-use`) while the named runner's body
  is resident and on air; otherwise it replaces them. Running a different program replaces yours
  and is refused while you are on air.
- **On air** = the program's `runner` is a resident body whose `streamProgram` is this program and
  `isOnAir()`. Not resident → off air.
- `rodney` is gated by `requiresProgram`: the body runs a program and the
  giver still holds its pen. A body with none is refused (`no-program`), with the row naming
  `program create` and `program run`. `rodney token` stays per player — the overlay shows a run,
  and a run is a body's.
- `stream channel`, `streamChannels`, `nameChannel`, `getStreamChannels` and
  `StreamChannelController` are deleted. The overlay's chat read opens on the program's feeds;
  `program run` and `program feed` call the shipped `StreamApi.refreshOverlayReading`.

**D13 — A feed is the attacher's own channel, read from their linked account.**
`program feed <name> <carrier> [<channel>]` requires the pen (D11) AND reads the giver's own
account: Twitch → `TwitchProfile.login`; Kick → `KickProfile.slug`; YouTube →
`GoogleProfile.youtubeChannelId` when `hasYoutube()`. No such account, or an empty channel →
refused `no-linked-account`, the row saying how to link (sign in or link Twitch / Kick; *Link
YouTube* in settings). The optional `<channel>` is a statement to check, never an input to trust:
given, it must equal the proven one or the verb refuses `not-your-channel`; omitted, the proven
one is attached. `--clear` removes the feed (pen only). No queue, no pending state, no admin, no
call to a carrier. A guest has no account and is refused by the same row.

**D14 — The featured program is one setting; `/api/front` answers one listing.**
`stream.featuredProgram` holds a short name (Tier B, shipped empty). `GET /api/front` answers
`{ show?: ProgramListing }` with `ProgramListing = { name, title, ownerName?, live, feeds:
{ twitch?, youtube?, kick? }, nextShow? }` (`feeds` are bare channel strings). With
`?watch=<name>&carrier=<carrier>` it answers THAT program if it exists and has a feed on that
carrier, else the featured one — so a link can only ever select among programs' proven feeds, and
the answer carries the name the client must use from then on. No featured program and no valid
name → no `show`; the page has no show band. `live` per D12; while on air `title` stays the
program's title (the segment is the overlay's). `/api/front` is a new route beside `PressRoutes`
because `/auth/status` is awaited by sign-in.

**D15 — Five environment variables are deleted, not defaulted.** `OVERLAY_TWITCH_LOGIN`,
`OVERLAY_YOUTUBE_CHANNEL`, `OVERLAY_KICK_CHANNEL`, `STREAMER_PLAYER_IDS`, `BROADCAST_TOKEN`
(conflict note 1). With them go `founderPlayerId()` in both files, the three `overlay*` readers,
the `streamers` group seeding, `AccessApi.isStreamer` and its logic and cache, and the env token
door. If any of the five is still set, boot logs one loud line naming what replaced it. The
`streamers` managed group itself is left in the store (no migration, nothing reads it).

**D16 — An app's verbs reach whoever bears its device, through the one stack.** The app's class
declares its verbs in `self` (as `ForumsApp` does); *who is served* is decided by the delta, not
by the app:

- host is a command giver (a person's own apps) → as today;
- host is not (a phone, a headset) → the defs are pushed onto every command-giver in the host's
  container chain, with the APP as the source and the `environment` bucket as the hint — the same
  receivers, at the same moments, as the device's own `environment` verbs (`apps`). One private
  routine in `CommandLogic` is used at every site that pushes or pops a carried thing's
  `environment` defs (`applyContainmentDelta`'s attach and detach, the giver's own `self-moved`
  re-push) and by `applyHostedAppDeltaImpl` for an install or uninstall on a device already borne.
  A phone handed over, dropped, pocketed or stolen moves its apps' verbs with it.
- **Held, never silent; ownership is the lock** *(kept by the owner, 2026-11-23: a device must
  keep its verbs so it can SAY it is powered down — an epoch covenant may require devices off in
  an old-time district)*. The verb stays afforded while the device is borne. At the match, a source that is an app whose host answers `conferralRefusal()` (off ·
  dead · packed · not yours) is passed over for the verb's other offer (the desk, an app on a
  second device); with no other offer the command is refused with a row naming that state and its
  fix (*switch it on*, *charge it*, *ready it*, *that phone runs only for its owner*) — the rows
  `sendOrHold` already words, reused. This sits in the dispatcher's match, not in each view,
  because an app author must not be able to forget it and because a verb with two sources needs
  the working one chosen. ⚠ It is not an implicit ACT: it moves nothing and chooses nothing the
  player cannot see with `affordances` (flagged for the owner all the same).
- `lint:self-contributions` already admits an app's `self`; its wording is updated to say a
  device's app serves the bearer.

**D17 — The broadcast app carries the verbs; the body carries none.** `BroadcastApp` declares
`self: [rodney.yaml, program.yaml]`. `BroadcastMixin.commandContributions`
loses its `self` entries (and the `program` entry A1 put beside them). The run's state stays on
the body — it is state, not affordance: a broadcaster whose phone dies mid-stream is still on air
and cannot steer until they charge it or reach a desk. The row is `/platform/idea/app/broadcast`
(`appName: Broadcast`, `published: true`). The control socket (D22) runs `rodney` as
the streamer through the ordinary dispatcher, so it works exactly when the streamer has an
instrument.

**D21 — One app store: the published app rows** *(the owner, 2026-11-23)*.

- **What it is.** The store is every `App` row that says `published: true`, under any root's
  `…/idea/app/` branch — the platform's and any pack's. `messages` and `broadcast` are published;
  `wallet`, `calendar` and `forums` are not (they are the person's own, installed at login, and
  have never been listed).
- **What changes.** `offersApps` is deleted — the field, its `fieldMeta` row, and the line on all
  four device rows. `availableApps()` and `installByKey(key)` read the store instead: `apps`
  lists what is installed and what the store holds; `apps install <app>` installs any published
  app on the device you name or bear. `installedApps` is untouched — per device, persisted, yours.
- **Any app-hosting device installs any published app.** No `runsOn` on a row: nothing today
  needs a device-kind rule, and a field no reader consults is a declaration to delete. The one
  case that mattered — a guest — is closed where it belongs, at `program create` (conflict
  note 15), not by hiding an app from an implant.
- **Load on use.** The store is read when `apps` or `apps install` is typed: one read of template
  rows by the branch infix, keeping rows whose class extends `App` — the read the material roster
  already makes (`MaterialApi.all()`), behind the Api that fronts aether hosts. No boot entry, no
  resident roster, nothing warmed. ⚠ `lint:template-scans` and `lint:world-scan` are ratchets:
  use the sanctioned read; if either would rise, stop and ask.
- **A key is a row's leaf**, as today. Two packs publishing the same leaf is an install-time
  collision the store read reports by naming both paths — never a silent first-wins.
- **Not here:** paid apps, who may publish, removal from the store, device compatibility — the
  aether-devices slate's (Deferred seams).

**D18 — The desk is a fixture that affords through `peers`.** `BroadcastDesk` is a fixed thing
whose static `peers` names the same three views — the `JobBoard` pattern, so *at the desk* is *in
its place*. ⚠ `peers` also reaches one PASSABLE exit away, as it does for every station in the
game; the booth's way to the street is a door, and a shut door stops it. The desk grants nothing
else: `requiresProgram` and the pen test (D11, D12) decide whose program you may run, wherever you
stand.

**D19 — The on-air sign derives its light; nothing stores it** *(lit by presence — decided by
the owner, 2026-11-23)*. `OnAirSign` is a light source
whose *lit* is computed when read: some body in the sign's own place is a broadcast host that
`isOnAir()`. It follows one reference (the sign → its place → that place's contents) — no world
scan, no event from `rodney`, no flag to drift after a restart. Lit, it adds its light to the
booth and says so on `look`; dark, it says that. ⚠ If the light subsystem's source cannot answer
*lit* from a derivation without a stored flag, the sign is a described state on `look` and the
booth's lamp is the room's only light — never a flag the kernel's `rodney` pokes on a content
fixture (stop and say which it was).

**D20 — The booth is one place off the avenue crossing.** `/world/terminus/halletts/location/booth`
(names provisional, halletts-slate § 5), a `Hall`, opening by a named way pair onto
`/world/terminus/university-avenue/location/crossing` — the street the arrival gate itself opens
on, so a newcomer passes the window. Brick under slate like its neighbors; a DOOR on the way (not
an open doorway, D18); its own zone, address and title rows exactly as the Gazette's office and
the tailor's shop have them, the cell chosen adjacent to the crossing on the city's 3 m grid.
**Its light has two named sources:** spill through the door by day, and a lamp fixture lit in the
room (the row the general store's shop floor uses) so it reads at night; the sign is a third when
lit. Props: the lamp, the desk, the sign. `longDescription` and `details` carry the lettered
glass, the dust and the sheeted piano as prose only — the piano, the photographs, the record
library and the screen in the glass are the Hallett's content build's.

**D22 — `stream` is renamed `rodney`; nothing else is.** A renamed view is not new substrate.

- **The view:** `…/cmd/stream/rodney.yaml`, `verbs: [rodney]`, `category: stream` — the directory
  and category stay `stream` (a view's category equals its directory; `rodney` and `program` sit
  with `watch` and `tune`, and no new category is invented). Subcommands `start · live · away ·
  back · end · off · segment · agenda · next · token · pin · skip · unpin`; `channel` is deleted
  (D12). Bare
  `rodney` prints the phase and the program and opens the controls card. No alias, no
  compatibility view: `stream` is not a verb after this (one view, one word; breaking is fine).
- **The lower third** *(owner: flat)*: `rodney pin <panel>` (a required panel argument), `rodney
  skip`, `rodney unpin` — three subcommands of the one view, each with its controller (the three
  `StreamRotation{Pin,Skip,Clear}Controller` renamed `Rodney{Pin,Skip,Unpin}Controller`), each
  passing to the mixin's existing rotation methods; the controllers do not branch.
  `stream-rotation.yaml` is deleted.
- **Controllers** are renamed with the verb (`Stream*Controller` → `Rodney*Controller`, and their
  rows): a controller's name is its verb's, and a class named for a verb that does not exist
  sends the next reader looking for it. Mechanical; done in the same commit as the view.
- **Kept, deliberately:** `BroadcastMixin`, `StreamApi` / `StreamLogic`, `StreamRelay`,
  `BroadcastFeed`, the `stream.state` client-state key, the settings keys `stream.*`, the
  document kinds `stream-token` / `standby-reason`, the card's id `stream` and the client's test
  ids (`stream-start` …). They name the broadcast and its state, which any driver would have —
  not the verb — and renaming them buys nothing a player sees. The card's `command` becomes
  `rodney` and its label *Rodney's controls*.
- **The control door:** `handleControlCommand` accepts the verb `rodney` only; `rodney token` is
  refused; an alias named `rodney` is refused; the refusal code `stream-only` becomes
  `rodney-only` (pblive shows these — conflict note 17).
- **The client:** `StreamControls.tsx` builds every string from the new verb (`rodney start in
  5m`, `rodney pin agenda` …) in the same commit as the view, or the card's buttons send
  a verb nobody has.
- **Prose:** the standby-reason and settings comments, `help` text, and the subsystem docs are
  the sweep's; `CLAUDE.md`'s category list is an index file and is left to the sweep.

**D2 — The return after sign-in is the client's, carried in `sessionStorage`; the server adds one
word.** The carrier, the program name, whether the visitor closed the video and the sound choice
all live in the tab already, and same-tab storage survives the provider trip. No OAuth `state` or
server-side return-to (an open-redirect surface and a second copy). The three login callbacks
share a private `AuthRoutes.finishSignIn(res, provider)` → `/?auth=success&via=<provider>`; the
client stores `via` as the remembered method (`localStorage['saxonberg.lastProvider']`) — on a
sign-in that succeeded, never on a click.

**D3 — One player, mounted above the phase switch, that never changes parent.** `<StreamPlayer/>`
is a sibling of `{screen}` in `App`'s final fragment, holding the only carrier iframe in a
`position: fixed` box. The box takes its rectangle from the **slot** registered in the store (a
`PlayerSlot` measures itself: `getBoundingClientRect`, a `ResizeObserver`, window `resize` and
capture-phase `scroll`, one animation frame) or, with none, the **dock** (bottom-right, 16:9,
400 px wide on a desktop, what the screen allows on a phone). The parent never changes and the
`src` string never changes, so no phase, layout or slot change reloads it.

- **Slots:** the front page's show tile; `StreamEmbed` in `ModeStage`'s focal and `PhoneShell`'s
  video box. Select and creation register none — the dock.
- **What it plays:** before the world, the *arrival target* — the carrier (D7) × the listing's
  feed for it, only while `live` and not `closed`; in-world, `clientState['cockpit.watch']`.
- **In-world the dock does not exist** (today's behavior; a video in a corner while exploring is
  watch-slate § 8's open question) — except that in watch mode with a target the player stays
  mounted, docked, for the frames before the stage's slot registers.
- **`src`** is one function of `(target, muted)` — the moved `iframeFor`, adding mute and autoplay
  flags for Twitch and YouTube. Keyed by that string.
- **Sound** *(owner-accepted)*: `muted` starts `true` on every document load; our control flips
  it, which reloads once. An in-world `cockpit.watch` that is not the one playing (a `watch` the
  player typed) unmutes. The arrival's target equals the one playing, so nothing changes.
- **Closed:** the ✕ sets `closed` in `sessionStorage['saxonberg.player.closed']`; in-world, the
  server clearing a personal `cockpit.watch` the player was on (`watch off`, never a shared
  display's marker) sets it too.

**D4 — The character ARRIVES watching** *(the owner rejected entering in the remembered mode and
switching; no intermediate mode may be painted)*.

- **The verbs.** `play <playerId> --watch <program> --twitch|--youtube|--kick` and `embody confirm
  --watch <program> --twitch|--youtube|--kick`. `--watch` takes a program's short name; the
  carrier flags are the three `watch` already has. Both documented in their views.
- ⭐ **The client sends a name and a carrier; the server owns the channel.** The server reads the
  program, requires a proven feed on that carrier and that it is on air, and builds the target
  from the feed. Nothing raw crosses from the client, and nothing a link supplies can name a
  channel (deep-links § 1).
- **The guest** runs no command, so the same two words ride the only request a guest makes, the
  socket URL (`watch=<program>&carrier=<carrier>` beside `from=`), stamped on the `Interactive` as
  the door is and read ONLY by `Login.enterAsGuest`. Not a field on `POST /auth/guest` (a second
  hop and a second store for two words); not follow-up commands (the flash).
- **One implementation.** The three ways in pass `{ watching: { program, carrier } | null }` to
  `avatar.enter`. Before the welcome payload, `enter` resolves it through `StreamApi.programListing`
  and calls `SaxonbergClient.arriveWatching(target)`: it writes `cockpit.watch` through
  `showPersonalStream` (the personal write lifted out of `WatchControllerBase.setWatch`, which now
  calls it — one writer) and sets the transient `cockpit.sessionMode` to `watch`.
  `getCockpitMode()` resolves *session → stored → legacy → explore*, so the snapshot, the
  arrangement and every later read agree. After `enter`: the best-effort `StreamApi.tune` `watch`
  makes, and one line (*Watching <title> on Twitch — for this visit*).
- **Not remembered:** the session mode is never saved. `enter` with `watching: null` clears it;
  `enter` with no `watching` key (a reconnect) leaves it; a plain `cockpit mode <name>` clears it.
- **Refuse · skip:** an unknown program or no carrier flag with `--watch` → the verb refuses
  (`no-such-program` / a usage row) and the player stays put — the client never sends that. A
  valid program that is off air or has no feed there → the usual mode, and one line saying why.
- **The controls say what they send:** `roster-sends-as` and the confirm control show the exact
  string; the guest's note gains *You will arrive watching the show.*
- **No restart:** the snapshot's target and the client's are both the listing's feed, field for
  field. A unit test on each side pins it.

**D5 — The plain outfit is the three rows that exist, untouched** *(the owner)*:
`startingOutfit:` in `char-gen.yaml` lists `student-shirt`, `student-trousers`, `canvas-shoes`,
worn through `Character.wearGarments` by `EmbodyController.commit`, `Login.mintRandomGuestAvatar`
and `TestHooks.#dress`.

**D6 — The restyle shares the front page's parts.** The band grammar moves out of `StartScreen`
into `components/front/` on `tokens`; select and creation are re-skinned over it. Behavior and
test ids do not change.

**D7 — The origin: a door, a carrier, and a program name.** `services/arrival.ts` decides once per
tab (`sessionStorage['saxonberg.arrival']`):

| the load | door | carrier |
|---|---|---|
| `?from=twitch` · `youtube` · `kick` | that word | that carrier |
| `?from=stream`, the referrer names a carrier | `stream` | the referrer's |
| `?from=stream`, no such referrer | `stream` | **Twitch** *(the owner)* |
| no `from`; the referrer's host is `twitch.tv`, `youtube.com` / `youtu.be`, `kick.com` (or a subdomain) | that carrier's word | that carrier |
| anything else | none | none |

`?watch=<name>` is kept only if it matches the short-name pattern, and only as a QUESTION to
`/api/front` (D14): the name the client uses afterward is the one in the answer. ⚠ Decided only on
a load with no `?auth=`, and never re-made (a Twitch OAuth return would otherwise read as *came
from Twitch*). A carrier starts the video and orders the buttons; the remembered sign-in method
only orders the buttons. Order: the carrier's provider (YouTube → Google), else the remembered
one, else Google · Twitch · Kick. `from=stream` with no referrer reads *You came from the
stream.* The server accepts the four door words; the feed's `fromStream` becomes *any door*.

**D8 — The walk exercises the return honestly.** It answers `/auth/status` through `page.route`
so Twitch reads as configured, clicks the real button, and routes `**/auth/twitch` with a 302 to
`GET /auth/test-return?handle=…&provider=twitch`, which signs in as `test-login` does and calls
the SAME `finishSignIn`. The carriers' players are stubbed by `page.route` with a page exposing a
boot id and a tick count.

**D9 — The founding deed stays, without the label:** *"Embodied as {{ name }}."*

## ⭐⭐ Host placement

| what | host | what composing it claims about the rest |
|---|---|---|
| the program | a document under `/platform/programs/`; `Program` its value class | It is on nothing. Not a field on the Avatar, the User or an organization — a program outlives a change of owner and of runner. |
| `streamProgram` | `BroadcastMixin` (every Avatar) | ⚠ The quiet form of the host test applies: most bodies will never run a program and answer `null`. That is the SHIPPED placement of the whole stream state (broadcast-ready put the run on the body), and this build narrows what it holds — `streamChannels` out, one pointer in. Moving the run off every body is not this build's; noted for the broadcasting build. |
| `runner` | the program | A fact about the program (who has the chair), needed to answer *is it on air* by reference. |
| `stream.featuredProgram` | the settings bag | One per instance, by the requirements; it is the Compact's choice, not a fact about any program. |
| `cockpit.sessionMode`, `arriveWatching`, `showPersonalStream` | `SaxonbergClientMixin` | Every host on it has a cockpit mode and `cockpit.watch` already. No guard; a player, a guest and a returning character all can. |
| the guest's `watch` / `carrier` words | `Interactive`, beside `arrivedFrom` | A fact about one connection, read once at the guest mint. |
| an app's verbs on its bearer | the bearer's recency stack, pushed by `CommandLogic` | ⚠ P2 for a cross-cutting seam: every hosted app on every device now reaches its bearer. Today that changes NOTHING for the four shipped apps — `messages` declares no verbs, and the other three are installed on the person. Any future device app with a `self` verb gets it by this rule, which is the requirement. No host is asked a question it answers *no* to. |
| `rodney` · `program` | `BroadcastApp` (`self`) and `BroadcastDesk` (`peers`) | Off `BroadcastMixin`, so off every Avatar. The two classes that carry them are the two things that should. |
| *lit* | `OnAirSign`, derived | A fact about the sign's place at this moment; not stored on the sign, the desk, the program or the body. |
| the booth | rows in the `terminus` pack | Content. No kernel class knows Hallett's; a second studio props the same two kernel things. |
| `startingOutfit` | the char-gen config | Nothing added to `Persona`, `Character` or `PrimaryAvatar`. |
| `Persona.aspiration` | removed | It leaves every host that composed `Persona`. |
| the player's state, the origin | a store slice; the tab's storage | Client only. |

## Convention conformance

- **`props:` / `cast:`, Locations not rooms, the five roots:** Stages A and B add no place.
  Stage C adds ONE Location (`class: /platform/location/Hall`) whose fixtures are `props:` — no
  `container:` on any row (`lint:instanceable` refuses it), no `populates:`. The desk and the sign
  are instanceable kernel classes in `platform/thing/` with rows that name them; the app class is
  in `platform/idea/` beside its three siblings. `/platform/programs` sits beside
  `/platform/stream-tokens`.
- **The booth's gates:** `lint:light-sources` (two named sources; no authored ambient number),
  `lint:locations`, `lint:location-graph` (the way pair, both sides explicit), `lint:untitled`
  (its path is titled as its neighbors' are), `lint:ground`, `lint:biome-sky`,
  `lint:reachability` (every view is named by the app's and the desk's statics; the desk and sign
  rows are reached through the booth's `props:`), `lint:self-contributions`,
  `lint:content-refs`, `lint:authored-prose`.
- **Module categories:** `Program` is a named value object in `lib/livestream/`; `ProgramCatalogue`
  is a Stuff singleton in `platform/idea/`; controllers in `platform/idea/cmd/stream/`; the
  validator beside its siblings in `lib/command/validators/`; `backend/FrontRoutes.ts` beside
  `PressRoutes`. No new category, no free helper.
- **Api ↔ Logic:** every new `StreamApi` static forwards to `StreamLogic`; `DocumentApi.saveProgram`
  forwards to `DocumentLogic` with its rails.
- **Verbs:** one view per shape, one word (`program`), `verb subcommand target`; every view states
  `category: stream`. No alias. `lint:verb-collisions` is run before the name is settled.
- **P3:** every refusal is a reason row (A-7); a missing featured program or an off-air one is a
  skip (an absent band; the usual mode with a line); `saveProgram` with a bad name or a foreign
  path throws.
- **P4:** narrowing is `MixinApi.isBroadcastHost` / `isSaxonbergClient`; no pack involved.
- **P5:** the controllers parse and render; the pen test, the proof and the chair are decided in
  `StreamLogic`; arriving watching is decided in `Avatar.enter` → the mixin.
- **P6:** a program persists because it is a kept document kind; `streamProgram` rides the body's
  snapshot as the fields beside it do; `cockpit.sessionMode` is transient by declaration.
- **P7:** program → runner and body → program are both followed references; the page follows one
  setting to one path. No scan of bodies, no boot entry, no `listOfKind` in a read path.
- **P8:** `program` (the slate's word; American spelling); `Program`, `ProgramCatalogue`;
  `requiresProgram`; `--watch`; `arriveWatching`.
- **`lint:wizard-axis`:** nothing here asks `isWizard`.
- **Gates by name:** `lint:family` entire; moved by this build — `lint:view-keys`,
  `lint:command-views`, `lint:one-word`, `lint:verb-collisions`, `lint:subcommand-words`,
  `lint:reason-rows`, `lint:controller-decisions` / `-mutations` / `-gates` (must not rise),
  `lint:data-ideas` (no data-only Idea is added), `lint:field-meta` (re-snapshot after
  `aspiration` and `streamChannels` leave and `streamProgram` arrives), `lint:test-seams`,
  `lint:schema` (no collection), `lint:wire-content`, `lint:drive-scripts`, `lint:silent-catch`;
  client `tsc`, ESLint, `noNativeTitle`.

## Waves

Each wave ends at one commit and leaves the tree green on `pnpm test:near`, the touched suites and
the gates it moved. **W0 is independent of everything and may land first.** Stage A is A1 → A2 →
A3. Stage C (C1 → C2 → C3) needs Stage A and nothing of Stage B; C1 alone needs nothing. Stage B: W2 and W4 need nothing; W3 needs A3; W5 needs A3, W2, W4; W6 needs W3, W4, W5; W7
needs all. (The first plan's W1 — the show settings — is replaced by Stage A.)

### W0 — Aspiration out; the plain outfit in (D5, D9)

- `mud/config/char-gen.yaml` — delete `aspirations:`; add `startingOutfit:` above `startingKit:`.
- `EmbodyController.ts` — the field leaves `CharGenField`, the roster types, `FIELDS`,
  `FIELD_ORDER`, the loader; `commit()`: `bio: ""`, no `aspiration` overlay key,
  `wearGarments(cfg.startingOutfit ?? [])`, no `seedChronicleClaims` call, the deed *"Embodied as
  {{ name }}."*
- `Login.ts` — `CharacterDraft.aspiration` gone; the guest mint wears `cfg.startingOutfit`,
  `bio: ""`. `Persona.ts` — the field, its `fieldMeta` row, getter, setter, interface members.
- `api/social.ts`, `ProfileLogic.ts`, `ProfileControllerBase.ts`; views `embody.yaml`, `score.yaml`.
- `backend/TestHooks.ts:755–773`; `packages/wire/src/harness/session.ts` (and any drive passing
  the pick).
- Tests and fixtures as listed in Grounding (the chronicle test asserts the deed and **zero
  claims**; re-snapshot the field golden); prose sites; `employed.md:31` reworded.
- ⚠ Do not touch `Condition/respiration/aspiration.yaml`.

Acceptance: `grep -ri aspiration packages/` returns only the respiration condition, its path
constant and the adjective *aspirational*; a unit test embodies and reads back three garments
worn, an empty bio, no claims, the phone pocketed; a guest wears the same three. Commit:
`feat(char-gen): aspiration removed; one plain outfit for players and guests`.

### A1 — The program: the record, its verb, the proof (D10, D11, D13)

- `lib/document/DocumentKinds.ts` — `program` (`contentDir: 'programs'`, `onVanish: 'keep'`,
  `catalogue: '/platform/idea/ProgramCatalogue'`), with the header comment stating the write rule.
- `lib/livestream/Program.ts` — the value class (name, title, owner, ownerName, schedule, feeds,
  runner; `feedOn(carrier)`); `platform/idea/ProgramCatalogue.ts` (`parse` validates);
  `StreamApi.programs()`.
- `api/document.ts` + `DocumentLogic.ts` — `saveProgram(name, data)` with its rails (the
  `saveStreamTokenImpl` shape).
- `api/stream.ts` + `StreamLogic.ts` — `createProgram(name, { title?, owner? })` (the name
  pattern; refuse if the path exists; the pen test on `owner`; a guest is refused —
  conflict note 15), `amendProgram(name, { title?,
  schedule? })`, `attachFeed(name, carrier, stated?)`, `detachFeed(name, carrier)`. The actor is
  read from the execution context. Each write ends with `programs().forget([path])`.
- Views + controllers (`category: stream`): `program` (bare → the program your body runs, or how
  to make one), `program create <name>` (`--owner <path>`, `--title`), `program title <name>
  <title…>`, `program schedule <name> <line…>`, `program feed <name> <carrier> [<channel>]`
  (`--clear`), `program show <name>` (title, owner caption, schedule, which carriers have a feed,
  on air or not — public facts only). Afforded beside the stream verb on `BroadcastMixin`'s `self` for
  now (the shipped placement); **C2 moves both onto the instruments**.
- Reason rows (A-7) in the platform pack's `reasons/`.
- `services/auth/TestAuthRoutes.ts` + `backend/TestHooks.ts` — `test-login` accepts `linked:
  { twitch?, kick?, youtube? }` (synthetic profiles on the test user, exactly the fields the
  proof reads) and answers `playerId`.
- Tests: the name pattern and first-come (a second `create` of a name is refused and the first is
  unchanged); owner defaults to the creator's home, `--owner` requires the pen there; a stranger's
  `title` / `schedule` / `feed` are refused; `feed` with no linked account → `no-linked-account`
  for each carrier; with one → the profile's channel, lower-cased, `provenBy` set; a stated channel
  that differs → `not-your-channel`; YouTube without the step-up is refused, with it attaches the
  id; a member of an owning committee attaches their own channel to its program; a guest is
  refused; `saveProgram` refuses a path outside the branch; a program with no feed reads back
  whole; the catalogue forgets on write.

Acceptance: on a dev world, `program create demo`, `program title demo My Show`, `program feed
demo twitch` (signed in with Twitch) and `program show demo` read back; a second player's
`program feed demo twitch` is refused. Commit:
`feat(program): the program record — a short name, an owner's pen, feeds proven at attach`.

### A2 — `rodney` runs a program; nothing names a streamer (D12, D15, D22)

- `lib/livestream/Broadcast.ts` — `streamProgram` (persistent, `fieldMeta`; `setStreamProgram`
  returns the catalogue's `ensure` so restore awaits it; `getStreamProgram`); delete
  `streamChannels`, `nameChannel`, `getStreamChannels`.
- `StreamLogic.ts` — `runProgram(name)` (pen; the chair rule; writes `runner`; sets the body;
  `refreshOverlayReading`); `channelsOf(playerId)` = the feeds of the program the body runs (a
  synchronous `need`); delete `founderPlayerId`, the three `overlay*` readers and the env
  fallback. View + controller `program run <name>`.
- **The rename (D22):** `stream.yaml` → `rodney.yaml` (`verbs: [rodney]`, every help line and
  example retyped); `stream-rotation.yaml` deleted, `pin · skip · unpin` added as subcommands with
  their three controllers renamed; the `Stream*Controller` files and their
  controller rows renamed; `BroadcastMixin`'s `self` names `rodney.yaml` (until C2 moves it);
  `Cards.ts` (`command: 'rodney'`, the label); `backend/inbound/command.ts` (the verb, the token
  refusal, the alias check, the code); client `StreamControls.tsx` and `CardBodies.tsx`'s comment;
  `standby-reasons/generic.yaml`, `settings/stream.yaml` prose. B4: grep `packages/content`,
  `packages/client`, `packages/wire`, `e2e` for `stream ` + each subcommand and for
  `stream-rotation` — zero left outside `packages/rodney` and history notes.
- `lib/command/validators/requiresProgram.ts`; `rodney.yaml` names it;
  the `channel` stanza and `StreamChannelController` are deleted; `rodney.yaml`'s help loses
  *restricted to streamers* and gains *your stream runs a program — `program run <name>`*. Bare
  `rodney` prints the program beside the phase.
- Delete `requiresStreamer.ts`, `AccessApi.isStreamer`, `AccessLogic.isStreamer`,
  `AccessRegistry.isStreamer` + its cache + the group seeding (`:708–728`); update the comments
  that cite them (`Broadcast.ts:38, 147`, `Author.ts:128`, `api/mixin.ts:1383`,
  `backend/inbound/command.ts:131`, `StreamControllerBase.ts:12`).
- `services/websocket/WebSocketService.ts` — the `BROADCAST_TOKEN` door and its
  `founderPlayerId` deleted; the one loud boot line for any of the five env names.
- The harness: `streamer: true` now stages a program named for the handle, owned and run by that
  character (`TestHooks`, through `StreamApi` as that player); `broadcast-ready.wire.test.ts` and
  `broadcast-ready-walk.spec.ts` keep passing unchanged, or change only where they typed
  `stream channel`.
- `.env.example`, `docs/deployment.md`, `packages/rodney/README.md:51` (prose only) — the five
  names removed; the go-live steps in their place.
- Tests: `stream` is not a verb for anyone (the dispatcher's *not a verb you have*), and no
  alias reaches it; every `rodney` subcommand dispatches through its real view, `pin` /
  `skip` / `unpin` included, and `pin` with no panel is refused at the binder; the control
  door runs `rodney away 15m`, refuses `stream away 15m` (`rodney-only`) and `rodney token`;
  `StreamControls` sends only `rodney …` strings (a unit test over every control);
  `ControlCommand.test.ts`, `broadcast-ready.wire.test.ts` and the broadcast walk retyped.
  `rodney start` with no program → `no-program`; after `program run` → as today; the pen
  lost → refused; `program-in-use` while the other runner is on air, replaced when they are not;
  `channelsFor` returns the program's feeds; a restart restores `streamProgram` with the program
  resident (a synchronous `show()` and `channelsFor` right after materialize); a body whose
  program document is gone → `streamProgram` cleared with a logged reason, never a throw at login;
  no source file reads any of the five env names (a source scan).

Acceptance: on a dev world with no stream env set, a player creates a program, attaches a feed,
runs it, `rodney start` / `rodney live` work (and `stream` is refused as no verb), and the overlay opened with their `rodney token`
shows their chat. Commit:
`feat(rodney): stream is renamed rodney and runs a program; the streamer group and five env vars retired`.

### A3 — The featured program and the anonymous read (D14)

- `lib/config/AppSettings.ts` (`streamFeaturedProgram`, Tier B); `settings/stream.yaml` (the key,
  empty, with its comment).
- `packages/types` — `ProgramListing`, `FrontResponse`.
- `StreamLogic.programListing(name?, carrier?)` — the named-else-featured rule and `live`.
- `backend/FrontRoutes.ts` + mount in `services/Server.ts`. Query: only `watch` (the name
  pattern) and `carrier` (the three words); anything else is a 400, as `PressRoutes` does.
- Tests: unset → `{}`; featured, off air → `live: false` with `nextShow`; on air → `live: true`;
  `?watch=other&carrier=kick` with a Kick feed → `other`; with no Kick feed, or no such program,
  or a malformed name → the featured one; changing the setting changes the answer;
  `FrontRoutes.test.ts` (anonymous 200, no `set-cookie`, world down → `{}` and a logged reason).

Acceptance: `curl /api/front` answers the featured program with no cookie. Commit:
`feat(stream): the featured program and the anonymous /api/front read`.

### C1 — The seam: an app's verbs reach its bearer (D16)

- `platform/idea/api/CommandLogic.ts` — the one routine (push / pop a borne host's hosted-app
  defs on its command-giver ancestors), called from `applyHostedAppDeltaImpl`'s non-giver branch
  and from every site that pushes or pops a carried thing's `environment` defs; the match's
  pass-over for an app whose host refuses, and the refusal with the device's reason row.
- `scripts/check-self-contributions.ts` + `docs` wording (the gate's own prose says *the
  implant's host*).
- Tests, with a fixture app class declaring one verb: installed on a phone in a pocket → the
  bearer has the verb, source = the app; in a bag in a pack → still (any depth); dropped → gone
  from them and not conferred on the room; picked up by another → theirs; handed over by `move` →
  follows; uninstalled → gone; the bearer walks to another place → kept; a restart → kept (the
  apps are re-cloned from `installedApps` and the stack rebuilt); the phone off / dead / packed /
  not yours → refused with that row, and with a second source for the same verb in reach → that
  source runs; an app on the PERSON behaves exactly as before (`ForumsApp`'s tests unchanged).

Acceptance: a test app's verb appears in `affordances` attributed to the app on the phone in the
character's pocket, and leaves when the phone does. Commit:
`feat(apps): an installed app confers its verbs on whoever bears its device`.

### C2 — The broadcast app; the verbs come off the body (D17)

- `platform/idea/BroadcastApp.ts`; `lib/paths.ts` (its template path, as its siblings);
  `packages/content/platform/content/platform/idea/app/broadcast.yaml` (`published: true`).
- **The store (D21):** `platform/idea/App.ts` — the authored `published` field (declared, so the
  applier writes it); `messages.yaml` gains `published: true`; `lib/augmentation/AetherHost.ts` —
  `offersApps` and its `fieldMeta` row deleted, `availableApps()` / `installByKey()` read the
  store (async); the store read as one static on the existing Api that fronts aether hosts →
  its logic singleton; `AppsListController`, `AppsInstallController` and `apps.yaml`'s help
  follow; the `offersApps:` line removed from `hollis-pal.yaml`, `aevex-meridian.yaml`,
  `headset.yaml`, `AetherImplant.yaml` (B4: grep `packages/content` for the key).
- `lib/livestream/Broadcast.ts` — the `self` entries deleted; the header prose (*afforded to every
  played body*) rewritten; `api/mixin.ts:1383`, `lib/shell/Author.ts:128` comments follow.
- `rodney.yaml`, `program.yaml` help — one line each: *you get this verb from the Broadcast app
  on a phone you carry, or at a broadcast desk*.
- The harness: `streamer: true` also installs the app on the test character's phone
  (`TestHooks`); grep every test that types `rodney` or `program` as a plain character
  (`StreamLogic` and controller units are handed a model and do not care; the wire and e2e ones
  do) — `broadcast-ready.wire.test.ts`, `broadcast-ready-walk.spec.ts`, Stage A's own wire steps.
- Tests: a fresh character has neither verb (the dispatcher's *not a verb you have*); `apps`
  lists Broadcast and Messages in the store and not the wallet, calendar or forums; a phone
  restored from a snapshot written BEFORE this wave (it carries a stale `offersApps`) installs
  Broadcast; `apps install wallet` on a phone is refused, naming the store; a published row in a
  second root is listed; two published rows with one leaf are reported, neither installed; after
  `apps install broadcast` both verbs work, in another place too; `apps uninstall broadcast` while on air leaves the stream on air and the verbs gone; the
  control socket runs `rodney` only while the streamer has an instrument; a guest installs the app
  on the implant and `program create` refuses them.

Acceptance: drive step 13 and 14 by hand on a dev world. Commit:
`feat(broadcast): the Broadcast app and the app store; the body carries neither stream nor program`.

### C3 — Hallett's booth: the desk and the sign (D18, D19, D20)

- `platform/thing/BroadcastDesk.ts`, `platform/thing/OnAirSign.ts` (+ their unit tests: the
  desk's `peers` reach; the sign lit with an on-air body present, dark with none, dark when that
  body leaves, right after a restart with no stored field).
- `packages/content/terminus/content/world/terminus/halletts/…` — the place, the lamp, the desk
  and sign rows, whatever zone / address / parcel rows the Gazette's office has; the crossing's
  row gains the named way out (`university-avenue/location/crossing.yaml`), the booth declares the
  way back; a door on the pair.
- `packages/content/test-fixtures/` — a desk and a sign as props of one existing testbed place;
  `packages/wire/src/harness/scaffold.ts` names them.
- B4: grep the pack for the new paths; run the booth's gates (Convention conformance).

Acceptance: walk from the arrival gate to the crossing and through the door; `look` by day and
after dark reads the room; at the desk a character with no app has `rodney` and `program`; the
sign reads lit only while someone in the booth is on air. Commit:
`feat(terminus): Hallett's front-window booth — the broadcast desk and the on-air sign`.

### W2 — The origin's words and sign-in's return (D2, D7, the server half of D8)

- `packages/types` — `ARRIVAL_DOORS`, `ArrivalDoor`. `WebSocketService.ts:194–200`,
  `Interactive.setArrivedFrom`; `BroadcastFeed.ts:223` → `fromStream: arrivedFrom !== null`.
- `AuthRoutes.finishSignIn`; `TestAuthRoutes` — `GET /auth/test-return`.
- Client `services/arrival.ts` (door, carrier, the program name as asked, `rememberProvider`,
  `providerOrder`); `config.ts` — the two door functions deleted, `WS_URL` built from the service;
  `App.tsx:367–378` reads `via` before stripping.
- The wire harness's door type widens.
- Tests: `arrival.test.ts` (every row of D7's table; a spoofed `from`; a malformed `watch`
  dropped; the OAuth-return referrer never read; decided once; the order for every signal
  combination), the redirect, the `Interactive` door, the feed's `fromStream`.

Commit: `feat(arrival): the origin names a carrier and a program; sign-in returns with via=`.

### W3 — Arrive watching: the server's half (D4)

- `SaxonbergClient.ts` — `cockpit.sessionMode` (transient, validated); `getCockpitMode()`
  consults it first; `arriveWatching(target)`; `showPersonalStream(target)` (and
  `WatchControllerBase.setWatch` calls it).
- `Avatar.enter(interactive, opts)` — `watching?: { program, carrier } | null`: resolve through
  `programListing`; on air with that feed → `arriveWatching`, else clear and print the reason
  after the welcome; `null` → clear; absent → leave. After the arrangement: the arrival line and
  the best-effort tune.
- `CockpitModeController` — the plain commit clears the session mode. No new option there.
- `play.yaml` + `PlayController` → `Login.playCharacter(playerId, { watching })`; `embody.yaml`
  (`subcommands.confirm.options`) + `EmbodyConfirmController` → `commit(…, { watching })`. ⚠
  `playerId` is `greedy`: confirm the binder takes the options out in either order; if not, make
  the arg non-greedy (an id has no spaces) rather than parse in the controller.
- The guest: `WebSocketService` reads `watch` and `carrier` (validated) → `ConnectOptions` →
  `Interactive` → `Login.enterAsGuest`.
- The wire harness — `Session.embody`, the play path and the guest opener take the words.
- Tests: resolution order; arriving watching leaves the stored `cockpit.mode` byte-identical and
  the snapshot says `watch` with the target; `watching: null` clears, a reconnect-shaped `enter`
  does not; off air → the usual mode + the line; an unknown program → refused, still at the
  roster; a guest socket arrives watching; the target equals what `watch <channel> --<carrier>`
  writes for all three carriers; the cockpit source scan still passes.

Commit: `feat(entry): play / embody confirm --watch <program> and the guest's words — arrive watching`.

### W4 — The one player (D3)

- `store/playerSlice.ts`; `components/embed/StreamPlayer.tsx` (test ids `stream-player`,
  `stream-player-unmute`, `stream-player-close`, `data-player-place="slot|dock"`);
  `components/embed/PlayerSlot.tsx`; `StreamEmbed.tsx` keeps its stage, placeholder and caption
  and renders a slot; `App.tsx` mounts the player and mirrors `cockpit.watch` in-world.
- Tests: the `src` per carrier and per `muted`; the SAME iframe node across slot → dock → slot and
  across an equal re-render; in-world, not watch, no slot → nothing; in watch with a target and no
  slot yet → mounted, docked; a new in-world target unmutes; the display caption still shows.

Commit: `feat(client): one stream player above the phase switch; watch mode's embed is its slot`.

### W5 — The front page (D6's parts, D7's use)

- `components/front/` — the grammar and the bands. `StartScreen.tsx` rebuilt, **only bands with a
  source**: host bar · identity · the three chambers' sentences · sign-in (ordered; *You came from
  Twitch.* / *Kick.* / *the stream.* / *YouTube — sign in with the Google account you watch on.*;
  the guest as a small link with *A guest keeps nothing, and nobody can find them.*; the live
  count; the dev login) · the show (`ShowTile` over the listing: a `PlayerSlot` when the arrival
  target plays; else the thumbnail tile with *Sign in to watch it inside Saxonberg.*; off air →
  the glowing `@` and `nextShow`, or *Offline* alone; `title`; `ownerName`) · Latest (the press
  room's headlines with their publishers) beside Coming up (the featured program's `nextShow`) ·
  the footer (links with real destinations only; *the show on <carrier>* for each feed the
  featured program has).
- The show band is absent when `/api/front` carries no `show`. No *Acting Prime Minister* line.
- The store fetches `/api/front` (with the asked name and carrier) on mount and every 60 s while
  `unauthenticated`; never awaited. `PressRoom.tsx` → `front/Latest.tsx`.
- Assets copied from `docs/design/brand/`. Phone: CSS reflow — sign-in, the show, the chambers,
  Latest.
- Kept test ids; new: `show-tile`, `show-offline`, `came-from`, `provider-<key>`, `latest`,
  `coming-up`.
- front-page-slate § 3 and § 8 marked superseded (the requirements say to record it).
- Tests: each origin × live / off air × no `show`; a named program vs the fallback; the order; no
  fallback string; the guest link outside the tile; the kept guards on the reset notice; e2e
  `arrival.spec.ts`, `guest.spec.ts`, `auth.spec.ts`, `mobile-chrome.spec.ts` updated for copy.

Commit: `feat(client): the front page rebuilt — real bands, the program playing for a visitor from a carrier`.

### W6 — The funnel: docked, restyled, arriving in watch (D4, D6)

- `CharacterSelect.tsx`, `CharGenStage.tsx` re-skinned; at phone width each reserves the dock's
  height while playing.
- While playing an arrival target: Enter sends and shows `play <id> --watch <program> --<carrier>`;
  confirm sends and shows `embody confirm --watch <program> --<carrier>`; the guest link opens its
  socket with the two words and `guest-warning` gains its line. One function builds the string for
  the preview and the send. The guest's socket URL is built at connect time.
- `closed` from an in-world `watch off`. **Nothing is sent after entry**; no effect, no timer.
- Tests: each control sends the option only while playing, with the string the preview shows; the
  first in-world render is the watch stage; the kept behavior tests.

Commit: `feat(client): the video docks through select and creation; the character arrives watching`.

### W7 — The drive, the walk, the record

- `packages/wire/tests/stream-arrival.wire.test.ts`; `e2e/tests/stream-arrival-walk.spec.ts`
  (1440×900, plus a 390×844 context); each checkpoint made to fail once; the drive record; then
  the one full `pnpm test` and the MR, **whose description carries the go-live checklist**.

Commit: `test(stream-arrival): the wire drive and the browser walk`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| make and edit a program | `program create · title · schedule · show` | `BroadcastMixin`'s `self` in A1, then the app and the desk (C2) — ⚠ a view nothing affords is a dead verb; each wave's test dispatches the verb through the real affordance, never a hand-built model | the `program` kind in `DocumentKinds` (a kind not listed there has no catalogue and no go-live) | `DocumentApi.read` by path; the catalogue on reach | the name pattern; the pen on `--owner`; the pen for `title` / `schedule` — refusals are rows |
| attach a feed | `program feed <name> <carrier> [<channel>]` | the same | the giver's own `TwitchProfile.login` / `KickProfile.slug` / `GoogleProfile.youtubeChannelId` | the profile by the user's own id — no carrier call | `carrier` is an `enum` arg; the pen; the linked account; a stated channel must match. ⚠ a guest and a player with an empty Kick slug must refuse, not attach an empty string — tested |
| run a program | `program run <name>`; then `rodney …` — the renamed view; ⚠ a rename is three silent failures waiting: the client's buttons, the control door's literal, and a `self` static still naming `stream.yaml` (a path that no longer resolves). A2's tests dispatch each through the real view, and `lint:reachability` must find `rodney.yaml` named by a static | after C2: the Broadcast app on a borne phone, or a desk in the place (below); gated by `requiresProgram` | `streamProgram` on the body; `runner` on the program | the body's setter ensures the program at restore — ⚠ a cold catalogue would make the overlay's sync read THROW at login; A2 tests materialize-then-`show()` | the pen; the chair |
| the overlay's chat | none | the token socket, as shipped | the program's feeds through `channelsFor` | resident with the body | n/a — ⚠ a program run with no feed shows no chat and says nothing; correct, and stated in `program run`'s reply |
| the featured program on the page | none (REST) | `FrontRoutes.setup` mounted in `Server` — an unmounted route is a silent 404 the client renders as *no show band*; the route test and wire step 0 hit the mounted app | `stream.featuredProgram` → `/platform/programs/<name>` → `runner` → the body | three followed references | `watch` by pattern, `carrier` by list; anything else 400 |
| arriving watching — a player | `play <id> --watch <program> --<carrier>` · `embody confirm --watch …` | both afforded only to a `Login`; Enter and confirm send them | the name and carrier from the tab (as answered by `/api/front`); the channel from the program's feed | `programListing` at `enter` | the program exists, has that feed, is on air — a no is the usual mode with a line. ⚠ the greedy `playerId` swallowing the options would be a silent plain entry — tested in both orders |
| arriving watching — a guest | none; two words on the socket URL | the guest link | the same | the same, from `Login.enterAsGuest` | the same lists in `WebSocketService`; ⚠ words dropped between the socket and the mint → a silent explore — the wire file reads the guest's first snapshot |
| an app's verbs (the seam) | whatever the app's class declares in `self` | the app, on a device in the bearer's container chain — ⚠ the three silent failures: a row-level `commandContributions:` (read by nothing — the class static is the record); the early return for a non-giver host (the shipped behavior); a push at install that no MOVE keeps exact. C1 tests install, move, drop, hand-over and restart | `installedApps` on the device (persisted); the app re-cloned at restore | the app's row loads when installed | the device must run: `conferralRefusal()` → the other offer, else a refusal naming the fix |
| the app store | `apps` · `apps install <app>` (shipped verbs) | `apps` is afforded by any borne device, as today | every `App` row with `published: true` — ⚠ `published` must be a DECLARED field or the applier drops it silently and the store is empty (the trap aether-devices already hit with `offersApps`); a test reads the real rows | the branch read when the verb is typed; no boot entry | the key must name a published row; an unpublished or unknown one is refused, listing the store |
| the broadcast app | `apps install broadcast` → `rodney`, `program` | the app, through the seam above | `/platform/idea/app/broadcast`, `class: /platform/idea/BroadcastApp`, `published: true` | on install | as the store's |
| the desk | the same three views | `BroadcastDesk.peers` — whoever is in its place (and one passable exit away) | the desk row, in a place's `props:` — ⚠ a desk row no place props is unreachable (`lint:reachability`) | minted with its place | the pen, as everywhere |
| the sign | none (`look`) | n/a | derived from the bodies in its place | none | n/a |
| the plain outfit | none | n/a | `startingOutfit`; the three rows | rows load when worn | W0 asserts all three are WORN |

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| A player can run a program and attach a feed only for a channel they own, nobody approving; a program with no feed is still a program | A1, A2 |
| No environment variable names a streamer; the overlay reads the program being run | A2 |
| The page features the program its setting names; changing the setting changes the page without code | A3, W5 |
| From a carrier: the program the link names — else the featured — plays on that carrier on air; its offline tile when not | A3, W2, W4, W5 |
| A link never plays a channel that is not a program's feed | A3 (the answer is always a program's feed), W2 (the name is only a question), W3 (the entry resolves server-side) |
| No origin: no playing video, the neutral order | W2, W5 |
| After sign-in: back where they were, the same stream, no click | W2, W4, W5, W6 |
| The video plays in a corner through select and creation | W4, W6 |
| Entered while playing → watch mode, same stream and carrier, not restarted; otherwise the usual mode | A3, W3, W4, W6 |
| Select and creation look like the front page | W5, W6 |
| No app and not at the desk → no `rodney` or `program`; the app gives both anywhere; the desk gives both while at it | C1, C2, C3 |
| The booth's sign is lit exactly while the program run from its desk is live | C3 (D19; conflict note 13) |
| *Aspiration* nowhere; everyone in the plain outfit | W0 |
| Only bands with real content | W5 |
| After a restart: the outfit kept, no aspiration | W0, W7 |

Nothing is unmapped.

## Test & gate strategy

Units carry the rules (the name, the pen, the proof, the chair, the listing, the origin table, the
`src` strings, same-node, the mode resolution, creation without aspiration). The drive proves the
path. Every step is `instant` except the restarts (`staged`) and step 15's night look (`short`:
the clock is moved to after dusk through the harness's clock seam, and the walkers are fed
through its nourish seam afterward — a jumped clock starves a body). No span step, no soak drive.

**Staging:** provider sign-ins are staged by `test-login`'s `linked` (A-12). A broadcaster is
staged by PLAYING: `program create`, `program feed`, `program run`, `rodney start` / `stream
live` / `rodney off`. The featured setting is set by the e2e founder (`config set
stream.featuredProgram <name>`).

**The wire file** — step 0, and the server's half of 1, 4, 4a, 7, 8, 10, 11:

0. A player with linked Twitch + Kick + a YouTube id: `program create`, `title`, `schedule`, three
   `program feed`s → `program show` and `/api/front?watch=` read them back. A second player:
   `program feed <the first's> twitch` → refused; `program feed … twitch <the first's channel>` on
   their OWN program → `not-your-channel`. A second program with no feed exists; `/api/front`
   never answers it for a carrier. The founder sets the featured setting to the first. `program
   run` + `rodney live` → `live: true`; `rodney off` → `false`. `restartWorld()` → the program,
   its three feeds, the runner's `streamProgram` and the setting are intact, and `rodney live`
   works without re-running.
1. `/api/front?watch=<second program with a Kick feed>&carrier=kick` → that program;
   `…&carrier=twitch` where it has none, a name that does not exist, a malformed name → the
   featured one.
2. `Session.embody(…, { from: 'twitch' })` — no aspiration command; `fromStream: true` on the
   feed; three garments, the phone pocketed, no *Aspires*, the founding deed and no claim, an
   empty bio.
3. That newcomer is confirmed with `embody confirm --watch <featured> --twitch` → the FIRST
   snapshot reads `cockpit.mode` = `watch` and `cockpit.watch` = the program's Twitch feed; nothing
   earlier carries another mode.
4. Sign out, plain `play <id>` → `explore`; `play <id> --watch <featured> --youtube` → watch on
   the id; `--watch nonsense --twitch` → refused at the roster; off air → `explore` and the line.
5. A guest → three garments, no *Aspires*; a guest socket with the two words → the first snapshot
   is watch.
6. `restartWorld()` → the newcomer's garments, empty bio, mode `explore`.
7. *(steps 13, 14, 16)* A fresh character: `rodney` and `program` are not verbs they have (nor is `stream`, for anyone).
   `apps` lists Broadcast in the store; `apps install broadcast` → `program create`, `program feed`, `program run`, `rodney live` work;
   they walk to another testbed place and `rodney away` works; they switch the phone off →
   `rodney back` is refused with the phone's row, and at the testbed desk it runs. A second
   character with no app, at the testbed desk: has both verbs; `program run <the first's>` →
   `not-your-program`. The testbed sign reads lit while the first is on air in that place, dark
   after `rodney end`, dark when they walk out on air. `restartWorld()` → the app is still
   installed, the program intact, the sign agrees with who is on air there.

**The walk** — the blocking drive:

| step | pace | the check, and how it is made to fail once |
|---|---|---|
| 0 a program | staged | (the wire file owns the proofs.) In the browser: the broadcaster context creates, feeds and runs its program by typing; `program show` prints it; the founder context sets the featured setting. Fail: skip `program run` → `rodney start` is refused. |
| 1 tagged, on air | instant · staged | the player frame's URL is the Twitch stub with the program's channel and the mute flag; *You came from Twitch.*; Twitch first. Fail: drop `from`. |
| 2 unmute | instant | the frame's URL loses the mute flag. |
| 3 untagged | instant | no frame; the thumbnail tile; Google · Twitch · Kick; the guest link outside the tile. |
| 4 off air | instant · staged | `rodney off` → `show-offline` with the program's next show, no frame. Fail: leave it live. |
| 4a a named program | instant | `from=kick&watch=<second program, Kick feed>` (its runner live) → the Kick stub with ITS channel; `watch=<a program with no Kick feed>` and `watch=<nothing>` → the featured program's Kick feed (or its tile). Fail: point the link at a channel string instead of a name → still the featured program. |
| 4b Rodney's link | instant | `from=stream`, no referrer → the featured program on the Twitch stub; Twitch first; *You came from the stream.* |
| 5 sign in | instant · staged (D8) | a real navigation away and back; a NEW frame on the same URL with no click, `data-player-place="dock"`. Fail: clear `sessionStorage` first. |
| 6 creation | instant | nothing on the page matches /aspir/i; the frame's boot id is unchanged and its ticks rose; confirm. Fail: force a remount. |
| 7 the lounge | instant | `chargen-confirm` shows and sends `embody confirm --watch <name> --twitch`; a recorder installed before the click logs every stage mounted — the watch stage and **no other**; the boot id is still step 5's, `data-player-place="slot"`; the phone pocketed, three garments, no *Aspires*, no prologue; `look` by the lounge's own light. Fail (restart): attach the feed in a case the client would not hold. Fail (flash): plain confirm then `cockpit mode watch`. |
| 8 closed | instant | `watch off`; sign out; no frame; sign in; *Enter* → explore. Fail: skip `watch off`. |
| 9 returning, YouTube | instant | `from=youtube`; the YouTube stub; the Google line and order; the dock on character select; `roster-sends-as` reads `play <id> --watch <name> --youtube`; *Enter* → watch, no other stage, the same boot id. |
| 10 guest | instant | untagged: the small link → explore, three garments, no *Aspires*. Tagged and playing: the note says so; the link → watch, the same boot id. |
| 11 restart | staged | the wire file's steps 0 and 6 (a browser cannot restart the world it is attached to). |
| 13 no instruments | instant | a fresh character types `rodney` and `program`: neither is a verb they have. Fail: use the staged `streamer` character. |
| 14 the app | instant | `apps install broadcast` on the phone; `program create` / `feed` / `run`, `rodney live`; walk out of the place; `rodney away` still answers. Fail: uninstall first. |
| 15 the desk | short · staged | a character with no app walks arrival gate → crossing → the booth's door; `look` by day reads the room, the desk and the dark sign; the clock is moved past dusk, `look` again still reads them (the lamp) and never *something*; at the desk they have both verbs; `program run <founder's>` is refused (`not-your-program`); the founder's character, in the booth, `rodney live` → the sign reads lit (in the room's `look` and `look sign`); `rodney end` → dark. Fail (light): remove the lamp from the row → the night look is dark. Fail (sign): the founder goes live standing in the street. |
| 16 restart | staged | the wire file's step 7; and in the browser after it: the booth is there and the sign agrees with the program's state. |
| 12 phone width | instant | 390×844: sign-in, the show, the chambers, Latest; the dock stays inside the viewport and off `chargen-confirm`. |

**Cadence:** `pnpm test:near`, the touched suites and the moved gates per wave; `pnpm test` once
at code-complete and once at `/finalize`; the walk once at code-complete.

## Risks & opens

**Risks**

- **The seam touches the hottest bookkeeping in the game** — the recency stack on every move.
  One routine, called beside every `environment` push and pop, or a phone's verbs will drift from
  its bearer the way the conferral leg once did. C1's move matrix is the guard; the four shipped
  apps must behave exactly as before.
- **The dispatcher's pass-over** (D16) is new behavior at the match. Read
  command-routing.md § *③ The other offer* and § *Affordance resolution* before writing it; if it
  cannot be done without the dispatcher learning about aether hosts by name, stop and ask (a
  kernel protocol on the source — *will you run?* — is the shape, not an `isAetherHost` branch).
- **Every shipped test that types the stream verb** breaks at A2 (the rename) and again at C2 until the harness
  installs the app. Find them before the wave, not after.
- **The sign as a light.** D19 has a fallback; say which was built.
- **A drive's clock jump** (step 15) starves and chills bodies; feed them after it, and re-run the
  step alone before trusting it.
- **A mutable document behind a catalogue.** `DocumentCatalogue` families are mostly authored and
  rarely change; a program changes whenever its owner types. Every `StreamLogic` write must
  forget the path and the running body must re-ensure it, or the overlay reads a stale feed. A2
  tests attach-while-running.
- **A body citing a program that is gone or no longer theirs.** Restore must clear the pointer
  with a logged reason, never throw at login; `requiresProgram` re-tests the pen on every `rodney`.
- **The shipped broadcast tests** (`broadcast-ready.wire.test.ts`, the walk, `StreamLogic`'s
  units) assume the streamer group and `stream channel`. A2 re-points the harness option so most
  pass unchanged; budget for the rest.
- **The live overlay.** After A2 the founder's Rodney source needs a minted token and the
  founder's program needs its feeds and a `program run`. Loud in the log, silent on the overlay —
  the go-live checklist is the only guard.
- **The arrival's equality.** The server's target and the client's must match to the character or
  the video reloads at the one moment this build protects. Both come from the listing's feed;
  pinned by two unit tests and walk step 7.
- **Which `enter` calls are reconnects.** D4 needs a reconnect to call `enter` with no `watching`
  key. `Login.playCharacter` may itself be the reconnect path for a lingering body; read
  `Login.ts:376–405` before W3.
- **The greedy `playerId`** (W3).
- **Twitch's embed rules**, each carrier's autoplay, and **YouTube's `live_stream?channel=`** (an
  error card when the channel is not live or forbids embedding; our `live` is the runner's phase,
  not YouTube's). **Before the MR, check all three real embeds by hand** — docked on a desktop,
  docked at phone width, in the tile, in the stage — and record it.
- **The fixed box following a slot** may lag a fast scroll by a frame; if it shows, pin the tile
  out of the scrolling flow.
- **Storage blocked** → no origin, no video, no resume (the shipped posture).
- **A stored `aspiration` or `streamChannels` on an old snapshot** must be ignored on restore;
  if restore throws, the dev databases are dropped — no shim.

**Decided by the owner, 2026-11-23** (not re-opened by the build): nobody is the streamer — the
program is the unit; a feed is proven at attach, no queue; one setting features one program;
links name a program; one app store, not per-device lists; the on-air sign lit by presence;
the dispatcher's pass-over kept (a device keeps its verbs so it can say why it will not run);
`stream` is renamed `rodney`, `program` stays Rodney-free;
`from=stream` is the featured program on Twitch; the unmute reload and
resuming muted; the env vars retired in this build; the outfit is the three rows untouched; the
character arrives in watch with no other mode painted.

**Opens — the owner's calls; the plan's lean is what gets built unless told otherwise**

*The rename:*

- **`rodney off` is kept** though the requirements' list omits it (conflict note 16).
- **`rodney pin <panel>` · `rodney skip` · `rodney unpin`** — flat, by the owner (note 16).
- **The Stream Deck's configured buttons** must be retyped (`stream …` → `rodney …`), and pblive
  will see the refusal code `rodney-only`; **`packages/rodney`'s README and OBS docs** still name
  the old verb until that worktree picks it up (note 17).
- **Controllers renamed, everything else kept** (`BroadcastMixin`, `StreamApi`, `stream.state`,
  `stream-token`, the card id): D22 lists them.

*Stage C:*

- **The desk's reach is `peers`**: its place, and through an open door (D18).
- **The desk and the sign are kernel classes** (`platform/thing/`), the booth is rows — so a second
  studio is rows.
- **The booth opens off the University Avenue crossing**, by the arrival gate; the Dial is not
  built. Its path is `/world/terminus/halletts/…`.
- **`published: true` on an app row** is what puts it in the store; the person's wallet, calendar
  and forums stay out of it (D21).
- **Any app-hosting device installs any published app**, a guest's implant included; a guest is
  stopped at `program create` instead (conflict note 15).
- **The Stream Deck's control socket works only while the streamer has an instrument.**

*Stages A and B:*

1. **A new verb, `program`**, rather than more subcommands on `rodney` (A-6) — and now the split is the point: `rodney` drives
   Rodney, `program` is Rodney-free.
2. **A document, not an Idea** (D10) — and one flat branch `/platform/programs/` for the names.
3. **The agenda stays with the run** (conflict note 2).
4. **`BROADCAST_TOKEN` goes too** (conflict note 1) — one more step at go-live.
5. **`ownerName` as a stored caption, and the brand `@` as every program's tile art** (note 3).
6. **One chair at a time** (D12), and tokens staying per player: two members of an organization
   running its program use two overlays, not one.
7. **`program feed` takes an optional channel only to check it** (D13).
8. **No way to retire, rename or transfer a program** in this build.
9. **The `streamers` group is left in the store**, unread.
10. `stream.featuredProgram` as the key's name; *You came from the stream.* for `from=stream`.
11. An in-world `watch off` counts as *closed for the visit*; footer links with no URL are absent;
    the founding deed's line; the guest's words on the socket URL.

**Stop and ask** if: anything in `packages/rodney` must change for the build to work (prose there
is a coordination item; code would be a blocker); the seam cannot be one routine beside the `environment` pushes; the
pass-over needs the dispatcher to know aether hosts by name; any read turns out to need a program found by channel or by owner (that is
the collection the plan refused); the catalogue cannot serve a document that changes at runtime;
a real carrier embed cannot play docked; `play`'s options cannot be bound without controller
parsing; a lint ceiling would have to rise; or a wave needs a file not on the substrate list.

## ⭐ Go-live checklist — copy into the MR description

This build deletes `OVERLAY_TWITCH_LOGIN`, `OVERLAY_YOUTUBE_CHANNEL`, `OVERLAY_KICK_CHANNEL`,
`STREAMER_PLAYER_IDS` and `BROADCAST_TOKEN`. **At the deploy that carries it, on the live server:**

1. The founder's account is signed in with (or linked to) the Twitch and Kick accounts whose
   channels carry the show, and has done *Link YouTube* in settings.
2. As the founder's character — first get an instrument: `apps install broadcast` on the phone
   already in the pocket (the store serves every existing phone; no new phone is needed). The
   desk in Hallett's booth works too.
   ```
   program create <short-name>
   program retitle <short-name> <the show's title>
   program schedule <short-name> <the next show, with its time zone>
   program channel <short-name> twitch
   program channel <short-name> kick
   program channel <short-name> youtube
   program run <short-name>
   rodney token            # paste into Rodney's browser source — the env token is gone
   rodney token --control  # if the Stream Deck used the env door
   ```
3. As the Prime Minister: `config stream.featuredProgram <short-name>`.
4. Remove the five names from SSM / `.env`.
5. Check: `curl https://<host>/api/front` names the program and its three feeds; `rodney live`
   turns `"live": true`; the overlay shows chat.

6. Retype the Stream Deck's game-command buttons: `stream …` → `rodney …` (`rodney away bathroom`,
   `rodney back`, `rodney next`); the control door refuses the old verb.

⛔ No test and no deploy script performs these. Until step 2 the founder has no `rodney` verb at
all, the overlay is silent and the front page has no show band.

## Deferred seams

- **Broadcasting** — economics, the lens pass, feedless broadcasts, a standing agenda, the run
  off the body, the program as an Idea → [broadcasting-slate](../slates/trades/broadcasting-slate.md)
  (its own build); the record and `StreamApi`'s program statics are where it attaches.
- **The rest of Hallett's** — the Dial, the lease, the piano and the window as a stage, the screen
  in the glass, the photographs, the record library, the show as a business, the founder's home →
  [halletts-slate](../slates/world/halletts-slate.md); the booth's rows are where it grows.
- **Other apps bringing verbs** (a map, a camera), and the wallet / calendar / forums as apps on a
  device → aether-devices § Deferred seams; C1's routine is the attach point.
- **The app store's economics and publishing** — paid apps, who may publish, withdrawal, device
  compatibility → [aether-devices-slate](../slates/engine/aether-devices-slate.md); `published`
  and the store read are where they attach.
- **An app that withdraws its verbs when its device cannot work** (the owner: maybe for some apps,
  not now) → the same slate; today every app keeps lending its verbs and the device says why not.
- **Listing someone else's channel, persisted tunes, platform preference, the directory, the
  third-party REST read, `watch <short-name>`** →
  [streamer-registry-slate](../slates/platform/streamer-registry-slate.md) wave 3.
- **The rest of `/api/front`** → the front-page build; `FrontResponse` is where it attaches.
- **The intent route, the confirm card, link previews** → deep-links-slate; `services/arrival.ts`.
- **The phone as the screen** → display-manifestation-slate. **The video in a corner while
  exploring** → watch-slate § 8. **Sound without a reload** → watch-slate § 7.
- **Origins, a real outfit, a prologue** → lineage-slate. **Linking the other carriers** → the
  watch build.

## Critical files

1. `docs/requirements/stream-arrival-requirements.md`;
   `docs/slates/trades/broadcasting-slate.md` § 7;
   `docs/slates/platform/streamer-registry-slate.md`.
2. `docs/subsystems/document-store.md` (§ The closed kind vocabulary, § Resident by construction,
   § The register transport, § The gate); `lib/document/DocumentKinds.ts`,
   `lib/document/DocumentCatalogue.ts`, `platform/idea/JointCatalogue.ts`,
   `platform/idea/api/DocumentLogic.ts` (`:438–467`), `api/document.ts`.
3. `docs/subsystems/livestream.md`; `lib/livestream/Broadcast.ts`;
   `platform/idea/api/StreamLogic.ts` (`:680–900`), `api/stream.ts`;
   `packages/content/platform/content/platform/cmd/stream/stream.yaml`, `stream-rotation.yaml` and
   `platform/idea/cmd/stream/` (`StreamControllerBase`, `StreamChannelController`,
   `WatchControllerBase`); `lib/command/validators/requiresStreamer.ts`;
   `platform/idea/AccessRegistry.ts` (`:280–295`, `:700–730`).
4. `mud/lib/identity/` (`TwitchProfile`, `KickProfile`, `GoogleProfile`, `User`);
   `services/auth/AuthRoutes.ts`, `TestAuthRoutes.ts`; `backend/TestHooks.ts` (`:120–230`,
   `:748–790`); `services/websocket/WebSocketService.ts` (`:85–260`).
5. `lib/config/AppSettings.ts`; `backend/PressRoutes.ts`; `services/Server.ts`.
6. `lib/connection/SaxonbergClient.ts` (`:540–570`, `:769–800`, `:985–1030`),
   `lib/connection/ClientState.ts`, `platform/idea/cmd/shell/CockpitModeController.ts`,
   `lib/character/Avatar.ts` (`:940–1010`); the three ways in —
   `platform/idea/cmd/charactergen/PlayController.ts`, `EmbodyConfirmController.ts`,
   `EmbodyController.ts`, `platform/idea/Login.ts`, `backend/Application.ts` (`:225–290`),
   `play.yaml`, `embody.yaml`; `lib/character/Persona.ts`, `mud/config/char-gen.yaml`.
7. `packages/client/src/App.tsx`, `config.ts`, `components/embed/StreamEmbed.tsx`,
   `layouts/ModeStage.tsx` (`:596–640`), `components/phone/PhoneShell.tsx` (`:140–300`),
   `components/StartScreen.tsx`, `CharacterSelect.tsx`, `CharGenStage.tsx`,
   `components/ui/tokens.ts`; `docs/design/front-page/front-page.dc.html`,
   `docs/design/brand/README.md`.
8. `packages/wire/src/harness/session.ts`, `scaffold.ts`; `e2e/tests/helpers.ts`,
   `e2e/tests/broadcast-ready-walk.spec.ts`; `docs/testing.md`.
9. Stage C: `docs/subsystems/aether-devices.md`; `docs/subsystems/command-routing.md`
   (§ CommandContributions, § Affordance attribution, § ③ The other offer, § Affordance
   resolution); `platform/idea/api/CommandLogic.ts` (`:4590–4710`),
   `lib/augmentation/AetherHost.ts`, `platform/idea/App.ts`, `platform/idea/ForumsApp.ts`;
   `docs/slates/world/halletts-slate.md`; `docs/subsystems/light.md`, `location.md`, `zone.md`,
   `boundary.md`; `packages/content/terminus/content/world/terminus/gazette/office.yaml`,
   `mayfield-row/tailor/location/shop.yaml`, `university-avenue/location/crossing.yaml`,
   `terminal/location/arrival-gate.yaml`; `scripts/check-light-sources.ts`.
10. Subsystem docs: `client-shell.md`, `char-gen.md`, `cockpit.md`, `streaming.md`, `access.md`,
   `app-settings.md`.

## Build log — decisions the build made (newest last)

- **W0 ✅ `5417695d4`.** Aspiration out, `startingOutfit:` in. The field-meta
  `--snapshot` refuses on 11 pre-existing unparsed forms, so the two goldens
  were edited by hand; `lint:field-meta` is clean. No guest-mint unit test
  exists — the wire drive's guest step covers the three garments.
- **A1 ✅ `0905b857b`.** ⚠ **Subcommand words changed**: `program title` →
  **`retitle`**, `program feed` → **`channel`** (it replaces the deleted
  `stream channel`), `program show` → **`about`** — each collided with a flat
  verb (`title`, `feed`, `show`) and `lint:subcommand-words` is a ratchet.
  The go-live checklist below reads with the new words. `streamProgram` was
  pulled forward from A2 (the listing's on-air test needs it). The catalogue
  `remember`s the record after each write instead of `forget`ting it, so a
  running body's synchronous reads never miss. `saveProgram` takes a
  `create | update` mode; create inserts and answers `taken` (D10's
  first-come, the index as the backstop).
- **A2 + A3 ✅ `40e0308b9`** (one commit). `rodney skip <panel>` keeps its
  panel argument — the mixin's skip needs a key; the overlay owns which panel
  is showing. `ProgramCatalogue.parse` reads feeds as written rather than
  filtering against `BROADCAST_SERVICES` (`lint:closed-vocabularies`).
  `lint:duck-typing` fell 467 → 464 and was re-pinned. `streamer: true` in the
  harness types `program create` / `program run` as the character.
- **C1 ✅ `ab712d94f`.** One routine, `lendHostedApps`, beside every
  `environment` push and pop. The pass-over asks the source by mixin
  (`isAetherHosted` → its host `isAugment` → `conferralRefusal()`), never by
  device kind; refusals reuse the `aether-*` rows.
- **C2 ✅ `5237b8eee`.** The store is `AppStore` (platform/idea), reached as
  `TemplateApi.appStore()` — no Api fronts aether hosts, and the store reads
  template rows. ⚠ **Its one `Template.findByPathInfix` needs a
  `lint:template-scans` allowlist entry** (the sanctioned "keyed dictionary's
  lazy warm" home; 25 → 26, landing census 43). The edit was refused by the
  session's permission classifier as a ceiling rise, so it is the owner's
  call — the gate fails until then. `App.published` is declared; the store
  reads it off the ROW. `messages` and `broadcast` are published.
- **C3 ✅ `21bac6d7b`.** D19 built as designed (no fallback): `OnAirSign`
  overrides `getEmittedFlux` the way `SconceLamp` does for its switch, and
  derives *lit* from its place's contents. The booth is a `Hall` in its own
  zone with a parcel, a door both sides name, a lamp; the crossing gains a
  named `halletts` way (its east stays Gus's soft wall). The testbed hut
  props a desk and hangs a sign.
- **W2 ✅ `0d48c6ea2`.** `finishSignIn` is public so `test-return` calls the
  same method. The arrival is decided once per tab and never on a load that
  carries `auth=`.
- **W3 ✅ `44ceef5d1`.** `play`'s id is no longer greedy. `Login.readWatching`
  is the one parse for both entries (row `watch-needs-carrier`). The
  arrival's chat follow is best effort, as `watch`'s is. ⚠ Its full server
  typecheck waited on a sibling build's memory window.
- **W4 ✅ `2350fab6d`.** `StreamPlayer` in `App`'s fragment; `PlayerSlot`
  re-measures every frame while mounted (the fixed box follows a fast
  scroll). ⚠ In-world `watch` now starts muted on every load like the
  arrival (D3's rule applies to both); a NEW in-world target unmutes.
- **W5 ✅ `945b25270`.** `components/front/` holds `Bands`, `ShowTile`,
  `Latest`. The guest note keeps *nothing you make is kept* (three tests
  hold it as load-bearing copy) inside the plan's new line.
- **W6 ✅ `3045d3c33`.** ⚠ **Not done: the re-skin of select and creation
  onto `components/front/` (D6).** Their behavior (the `--watch` sends, the
  dock's reserve) is in; their look is today's. Recorded for review.

## Drive record

*(appended at build time)* — the blocking drive's run (the wire file's result and the walk's
steps, each with the failure it was shown to catch), the hand check of the three real carrier
embeds, and what the drive found. There is no soak drive.
