# Stream arrival — implementation plan

Executes [stream-arrival-requirements](../requirements/stream-arrival-requirements.md): a viewer
who clicks our link from Twitch, YouTube or Kick sees the show playing on the front page, signs in,
keeps the video docked through character select and creation, and enters the lounge in watch mode
with the same video still playing. Along the way: the front page's client rebuild, sign-in's return,
and aspiration removed from character creation. **Kind: client. Leads from: the client**, over a
thin kernel slice (show settings and one anonymous read, the origin vocabulary, a session-only
cockpit mode, aspiration's removal).

## ⚠ Requirements conflicts and notes — read first

Nothing here changes scope. Each is a place where planning found the requirements cannot be met
exactly as written, or where the plan had to choose; the owner should see all of them before `/build`.

1. **`from=stream` cannot be retired.** The requirements say the tag *gains the carrier*
   (`from=twitch|youtube|kick`). Rodney's on-screen card and its QR
   (`packages/rodney/src/scenes/live/panels.tsx:24`, `JOIN_LINK = …/?from=stream`) are drawn into
   ONE picture that goes out to all three carriers, so that link cannot name a carrier. **The plan
   keeps `stream` as a fourth legal value meaning *from the show, carrier unknown*** (D7): the
   ticker line still fires; no video starts (the requirements start the video *on that carrier*);
   the provider order is neutral. The owner may prefer a default carrier for it — that is a product
   call, listed under Opens. Rodney is not touched (a sibling worktree holds `build/rodney`).
2. **The reuse ledger's sign-in row is stale.** watch-slate § 7b says *"new — the window flow and a
   return to the asking page"*. The requirements rejected the window. The plan follows the
   requirements (D2); the ledger row should be corrected at the sweep.
3. **"On their phone" is the personal `watch` embed.** Nothing ships that makes the phone a screen
   (`aether-devices.md` lists *the phone as a held, watchable screen* as unbuilt —
   display-manifestation-slate). The arrival writes the same `cockpit.watch` the `watch` verb writes;
   the drive's own check is only that the phone is in the pocket. No conflict, but the sentence
   promises more than the fiction can yet show.
4. **Our unmute reloads the embed once** (D3). The player is a sandboxed cross-origin iframe with no
   carrier SDK on our page, so the only carrier-neutral way to turn sound on from our own control is
   to rebuild the embed address without the mute flag — a one-to-two-second rebuffer of a live
   stream. Each carrier's own in-player unmute also works and reloads nothing. *The video did not
   restart* is held for **entering**, which is where the requirements put it.
5. **After the sign-in trip the video resumes muted**, always. A fresh document has no user gesture
   and browsers refuse sound without one. The requirements' *"the first click anywhere on the page
   may carry sound"* is NOT implemented as an automatic unmute on any click (D3): the first click
   after returning is often *Enter*, and an unmute-reload at that instant would break *the video
   did not restart*.
6. **Step 8 forces a mode that is not remembered.** *"The returning character enters in its usual
   mode, not watch"* — for a character whose only session was the watch arrival — means entering
   while watching must not become the character's stored mode. The plan adds a visit-only form of
   the existing command, `cockpit mode watch --session` (D4). No scope change; a new option on a
   shipped verb.
7. **Twitch's embed rules** (minimum player size, the player must be visible) may not hold for the
   docked corner on a phone-width screen. The dock is sized ≥ 400 px wide on a desktop; on a phone
   it is as wide as the screen allows. Re-check Twitch's embed requirements before the walk; if the
   phone dock cannot play, say so and stop (Risks).
8. **The wiki's one use of the word** is a history note in
   `packages/content/wiki-starter/content/wiki/main/employed.md:31` (*"a field for its
   aspirations"*). The acceptance criterion says the word appears nowhere in the wiki, so W0 rewords
   that sentence.

## Grounding

Verified by opening the files, 2026-11-23, on `reqs/stream-to-game` (master `bb43d6cd0` + the
requirements).

**Client — phases and screens**

- `packages/client/src/App.tsx:682–835` — the `screen` switch on `connectionPhase`
  (`unauthenticated → StartScreen`, `connecting → Splash`, `character-select → CharacterSelect`,
  `char-gen → CharGenStage`, `in-world → the cockpit`). The component returns
  `<>{screen}<TooltipLayer/></>` (`:836`), so a sibling mounted there survives every phase.
- `App.tsx:361–378` — on mount: `checkAuthStatus()`, and `?auth=success|failure` is read and
  stripped with `history.replaceState`. `:472–510` — `checkAuthStatus` fetches `/auth/status` and
  writes providers, `online`, `resetPolicy`, auth.
- `packages/client/src/config.ts:32–60` — `arrivalDoor()` accepts only `from=stream`, keeps it in
  `sessionStorage['saxonberg.arrivedFrom']`, and `WS_URL` appends `from=`. Computed once at module
  load.
- `components/StartScreen.tsx` (763 lines) — bands as local styled-components (`Band`, `HeroBand`,
  `ChambersBand`, `BandInner`, `Panel`, `Action`, `Facts` at `:74–360`); the provider list is data
  (`:433–451`, hrefs `/auth/google|twitch|kick`), rendered as `<Action as="a" href=…>` (`:689`);
  guest button `data-testid="guest-button"` + `guest-warning` (`:709–714`); `DevLogin` posts
  `/auth/test-login` (`:498–520`); `presence-line`, `reset-notice` test ids.
- `components/PressRoom.tsx` — fetches `${SERVER_URL}/api/press/releases` itself (`:263`), never
  awaited by sign-in.
- `components/CharacterSelect.tsx` (950 lines) — `roster-play-<id>` sends `play <id>`,
  `roster-sends-as` previews it (`:682–689`). `components/CharGenStage.tsx` (1097 lines) — renders
  whatever fields the server sends; `chargen-confirm` sends `embody confirm` (`:1016–1022`).
- Tokens: `components/ui/tokens.ts` maps the `SX` ground roles (`surface`, `ground`, `sunken`,
  `line`, `fg-dim`, …). The prototype `docs/design/front-page/front-page.dc.html` is written in the
  SAME variables (`var(--ground)`, `var(--surface)`, `var(--sunken)`, `var(--line)`,
  `var(--fg-dim)`, `var(--accent)`) and the same three faces (Public Sans, Spectral, IBM Plex Mono
  — all in `styles/GlobalFonts.ts`). The design language already has a token home; nothing needs
  forking.

**Client — the player**

- `components/embed/StreamEmbed.tsx` — `iframeFor(target)` builds one sandboxed iframe
  (`IFRAME_SANDBOX`, `:98`); Twitch `player.twitch.tv/?channel=…&parent=<hostname>`; Kick
  `player.kick.com/<slug>?autoplay=true&muted=true`; YouTube `/embed/<videoId>` or
  `/embed/live_stream?channel=<channelId>`. Twitch and YouTube carry no mute or autoplay flag today.
- It is mounted in exactly two places, both in-world: `layouts/ModeStage.tsx:626` (`Focal`,
  `kind === "video"`, target from `clientState["cockpit.watch"]`) and
  `components/phone/PhoneShell.tsx:297–300` (`mode === "watch"`). Leaving watch mode unmounts it.
  ⚠ **Moving an iframe in the DOM, or portaling it to a new container, reloads it** — the reason
  the plan never reparents (D3).
- `PhoneShell.tsx:149` — `mode = storedMode ?? "chat"`, `storedMode` from
  `clientState["cockpit.mode"]` (`App.tsx:750`).

**Server — watch, mode, entry**

- `mud/platform/idea/cmd/stream/WatchControllerBase.ts` — `watch <target>` parses through
  `StreamerTarget.parse`, `embedFor()` builds the `WatchTarget` (`{platform:'twitch'|'kick',
  channel}`, `{platform:'youtube', videoId|channelId}`), `setWatch()` writes and pushes
  `cockpit.watch` (`:215–216`) and prints *Watching …*; it then best-effort `StreamApi.tune`s. A
  Twitch handle, a Kick slug and a YouTube `UC…` channel id resolve with **no external call**
  (`StreamerTarget.classifyYoutubeRef`, `lib/streaming/StreamerTarget.ts:135`). Views:
  `packages/content/platform/content/platform/cmd/stream/watch.yaml`, `watch-stream.yaml`.
  `watch` needs no device — it never asks for a tuner.
- `lib/connection/SaxonbergClient.ts:556–563` — `cockpit.watch` is a **transient** client-state
  key. `:789–794` — `getCockpitMode()`: explicit `cockpit.mode` → legacy layout → `explore`.
  `:994–1010` — `snapshotClientState()` writes the RESOLVED mode into the welcome snapshot.
- `lib/connection/ClientState.ts:47–60, 221–247` — a schema entry may be `transient`; transient
  values live in `_transientClientState` on the live body and are never persisted.
- `mud/platform/idea/cmd/shell/CockpitModeController.ts` — `commit()` writes `cockpit.mode`,
  `cockpit.arrangements`, `cockpit.layout`, saves the Avatar, pushes all three, then
  `interactive.applyCardArrangement(…)`. View: `…/cmd/shell/cockpit.yaml` (the `cli` subcommand
  already carries `options:`). `COCKPIT_ARRANGEMENTS.watch = ["viewer", "streamer"]`
  (`packages/types/src/index.ts:4078`).
- `lib/character/Avatar.ts:954–984` — `enter()`: `armSession` → first-arrival deed → welcome
  payload → auto-look → `openArrangementGuarded` → `announceFirstArrival`. ⚠ `enter` also serves a
  **reconnect** (`:1275`, `PlayerReconnected`). `:990–1003` — `announceFirstArrival` emits
  `PlayerFirstArrival` with `interactive.getArrivedFrom()`.

**Server — origin, sign-in, the anonymous reads**

- `services/websocket/WebSocketService.ts:194–200` and `platform/idea/Interactive.ts:206–215` —
  only the literal `'stream'` survives; anything else becomes `null`.
  `backend/BroadcastFeed.ts:216–223` sends `fromStream: arrivedFrom === 'stream'`
  (`StreamEventEnvelope`, `types/src/index.ts:3256`). The wire harness types the door as
  `{ from?: 'stream' }` (`packages/wire/src/harness/session.ts:462`).
- `services/auth/AuthRoutes.ts:63–119` — the three login callbacks each redirect to
  `${CLIENT_URL}/?auth=success`. `:140–191` — `/auth/status` (providers, `online`, `resetPolicy`,
  the wizard hint). No show state.
- `services/auth/TestAuthRoutes.ts` — every test seam is a `POST` the page `fetch`es; **none
  navigates**. `test-login`'s answer is `{ isAuthenticated, user: { id } }` — no `playerId`.
- `backend/PressRoutes.ts` — the anonymous-REST precedent (`GET /api/press/releases`: reads no
  session, sets no cookie); mounted in `services/Server.ts:261`.
- e2e boots the server with `AUTH_MODE=test FOUNDER_GOOGLE_EMAIL=founder@e2e.local`
  (`e2e/playwright.config.ts:63`); `openWorldAsFounder` (`e2e/tests/helpers.ts:344`) is a real
  founder holding the founder-default seats. Twitch and Kick are **not configured** there, so their
  buttons render disabled.

**Server — the show**

- The stream's state is on the streamer's body: `lib/livestream/Broadcast.ts` —
  `getStreamPhase()`, `isOnAir()` (`starting | live | ending`), `nameTopic()`, `show()`,
  `getStreamChannels()`; all persistent on the Avatar's snapshot. A streamer whose body is not
  resident has no readable phase (livestream.md: *"nothing until they load — never a synthesized
  phase"*).
- `platform/idea/api/StreamLogic.ts:686–722` — `founderPlayerId()` is the first id in
  `STREAMER_PLAYER_IDS`; `channelsOf(playerId)` is the body's own `stream channel` values, else for
  that founder the `OVERLAY_TWITCH_LOGIN` / `OVERLAY_YOUTUBE_CHANNEL` / `OVERLAY_KICK_CHANNEL` env.
  The YouTube overlay read accepts a channel id as well as a handle
  (`backend/YoutubeClient.ts:245`). The env trio is documented in
  `packages/server/.env.example:16–25` and `docs/deployment.md:524`.
- Settings: `lib/config/AppSettings.ts` (`AppSettingKeys` + the total `AppSettingTiers` record — a
  key with no tier is a type error); values ship in
  `packages/content/platform/content/settings/<section>.yaml` (merge-missing); read with
  `AppApi.setting(key)`; set with the Prime Minister's `config` verb (Tier B).

**Server — aspiration, every consumer** (`grep -i aspiration`, the respiration condition excluded)

- Config: `mud/config/char-gen.yaml:76+` (`aspirations:` — six rows with `bioSeed`, `outfit`,
  `claimSeeds`); `startingKit:` sits at `:26` as the precedent for a config list every newcomer gets.
- `platform/idea/cmd/charactergen/EmbodyController.ts` — `CharGenField` (`:63`), roster types
  (`:112–126`), `FIELDS.aspiration` (`:401–420`), `FIELD_ORDER` (`:437`), `commit()` (`:669`
  lookup, `:691–692` overlay `aspiration` + `bio`, `:765` `wearGarments(aspiration.outfit)`, `:776`
  `seedChronicleClaims`, `:778–781` the founding deed *"Embodied as {{ name }},
  {{ aspirationLabel }}."*), config loader (`:840`).
- `platform/idea/Login.ts` — `CharacterDraft.aspiration` (`:95–96`); the guest mint (`:281`,
  `:307–308`, `:344`).
- `lib/character/Persona.ts` — the `aspiration` field, `fieldMeta`, `getAspiration` /
  `setAspiration` (`:63–64, 144, 264–282`). ⚠ `seedChronicleClaims` (`:390`) has a second caller,
  `lib/npc/Cast.ts:220` — it stays.
- Profile: `api/social.ts:85` (`ProfileCard.aspiration`), `platform/idea/api/ProfileLogic.ts:219–220`,
  `platform/idea/cmd/social/ProfileControllerBase.ts:76` (*Aspires:*).
- Views: `…/cmd/charactergen/embody.yaml:8, 18`; `…/cmd/social/score.yaml:7`.
- Harness: `backend/TestHooks.ts:773` (`aspirations[0].outfit`),
  `packages/wire/src/harness/session.ts:451–495` (`embody aspiration …`).
- Tests and fixtures: `EmbodyController{,.commit,.chronicle}.test.ts`, `ProfileLogic.test.ts`,
  `TestHooks.test.ts`, `mud/__tests__/__snapshots__/wiki-spoiler-fields.snapshot.test.ts.snap`,
  `scripts/__fixtures__/field-{tags,meta}-golden.json` (`_aspiration`, `aspiration`),
  client `components/__tests__/charGenFields.test.tsx`, e2e `chargen.spec.ts:165`,
  `arrival.spec.ts:170–175`.
- Prose only: `lib/chronicle/ChronicleEntry.ts:66`, `platform/agent/Beast.ts:19`,
  `e2e/tests/commands.spec.ts:49`, `content/trade-tanning/…/rucksack.yaml:3`,
  `content/wiki-starter/…/employed.md:31`, and docs (`char-gen.md`, `client-shell.md`,
  `chronicle.md`, `connection.md`, `testing.md`).
- The plain clothes already exist: `packages/content/generic-objects/content/stuff/thing/clothes/`
  `student-shirt.yaml` (*"An unassuming everyday shirt"*), `student-trousers.yaml` (two side
  pockets — where the starting kit's phone goes), `canvas-shoes.yaml`. They are today's
  *something-better* outfit.

**Gates that exist and bite here:** `lint:wire-content` (ceiling 113, and a wire file may not carry
its own restart — `restartWorld()` is the one path), `lint:drive-scripts` (a drive is born a wire
file), `lint:view-keys`, `lint:field-meta` (golden record), `lint:test-seams`, `lint:command-views`,
`lint:silent-catch`, `lint:schema`, the client's `noNativeTitle` test.

## ⭐⭐ New substrate

No new mixin, Api class, logic singleton, hook, registry, document kind, Mongo collection, module
category or exported server helper. Every item, against watch-slate § 7b:

| # | item | ledger row | P9 · P10 · P11 · P12 · P13 · P14 |
|---|---|---|---|
| S1 | settings `show.streamer`, `show.twitch`, `show.youtube`, `show.kick`, `show.title`, `show.host`, `show.schedule` (`AppSettingKeys`, Tier B, `settings/show.yaml`) | *the show's channel per carrier — **generalize*** | P9 listed by `config`, each with its comment in the yaml. P10 they are rows in the existing settings Document — no Idea. P11 n/a. P12 they REPLACE the three `OVERLAY_*` channel env vars, which are deleted in the same wave (P1's *is the specific one gone*). P13 `AppSettings` is *"application-wide, operator-managed configuration"* — one show per instance is that. P14 an unset value is absent, never defaulted. |
| S2 | `StreamApi.showListing()` → `StreamLogic.showListing()`; wire type `ShowListing` in `@saxonberg/types` | *the show's on-air state — **reuse*** (`BroadcastMixin.isOnAir`, `streamTopic`) | P9 n/a (no command). P10 a wire shape, not stored. P11 none. P12 not a synonym: `channelsFor(playerId)` answers a streamer's chat reads; this answers *what is billed and is it on*. P13 `StreamApi`'s header covers *"per-streamer channel reads"* and the show's rows. P14 reads only; a non-resident streamer is `live: false` and says so in its doc. |
| S3 | `FrontRoutes` (`backend/FrontRoutes.ts`, `GET /api/front`), wire type `FrontResponse` | *genuinely new* — the slice of front-page-slate § 6 item 8 that carries only the show. Searched: `PressRoutes`, `HelpRoutes`, `/auth/status`. | P9 n/a. P10 n/a. P11 none. P12 `/auth/status` was considered and refused (D1): it is awaited by sign-in. P13 `backend/` holds the REST route classes. P14 reads no session, writes nothing. |
| S4 | `ARRIVAL_DOORS` (`twitch · youtube · kick · stream`) + type `ArrivalDoor` in `@saxonberg/types` | *where the visitor came from — **generalize*** | P9 n/a. P10 a four-word closed list in code, read by two validators — not metadata anyone browses. P11 none. P12 it replaces the literal `'stream'` at three sites. P13 n/a. P14 an unknown value is `null`, as today. |
| S5 | `via=<provider>` on the success redirect; one private `AuthRoutes.finishSignIn` | *sign-in — a return to the asking page* | P9 n/a. P10 n/a. P11 removes three copies of one redirect. P12 no. P13 n/a. P14 data the client reads, never a command (deep-links § 1). |
| S6 | test seam `GET /auth/test-return` (TestAuthRoutes), and `playerId` on `test-login`'s answer | *genuinely new* — every existing seam is a `fetch`ed POST; none leaves the page. | Test-only, mounted under `AUTH_MODE=test`; enrolled with `lint:test-seams`. |
| S7 | transient client-state key `cockpit.sessionMode`; `SaxonbergClient.setSessionMode()`; the `--session` option on `cockpit mode` | *the mode a character enters in — **reuse*** (`getCockpitMode`), plus the one new piece: a mode that is not remembered. Searched: `cockpit.watch` and `cockpit.inputModes` are the transient precedents; nothing offers a visit-only mode. | P9 the option and its sentence are in `cockpit.yaml`'s `mode` stanza and its help. P10 a client-state key. P11 none. P12 not a new verb — an option whose only difference is *not remembered*. P13 `SaxonbergClient` is *our client's keyspace and its resolution*. P14 the mode changes only when a command says so; the transcript prints it. |
| S8 | `startingOutfit:` in `mud/config/char-gen.yaml` | *a new character's clothes · the guest's look — **replace*** | P9 n/a. P10 a config list beside `startingKit:` (same file, same reader). P11 none — `Character.wearGarments` for players, guests and test characters alike. P12 no. P13 n/a. P14 a garment that will not go on is skipped with the diagnostic `wearGarments` already gives. |
| C1 | `StreamPlayer` (the one player, mounted above the phase switch) | *playing a carrier's video — **reuse*** | The iframe builder MOVES here from `StreamEmbed`; there is one place that builds a carrier iframe after this build, not two. |
| C2 | `PlayerSlot` (a place the player sits) — `StreamEmbed` becomes one | same row | `StreamEmbed` keeps its stage, placeholder and shared-display caption and loses its iframe. |
| C3 | `store/playerSlice.ts` (target · muted · closed · slot · handoff) | same row | A slice beside the eleven that exist. |
| C4 | `services/arrival.ts` (the origin, the remembered provider) | *where the visitor came from — **generalize*** | `config.ts`'s `arrivalDoor` / `withArrivalDoor` are deleted; `WS_URL` reads the service. |
| C5 | `components/front/` — the band grammar and the bands (`HostBar`, `IdentityBand`, `Chambers`, `SignInPanel`, `ShowTile`, `Latest`, `ComingUp`, `FrontFooter`) | *the front page — **rebuild*** | `StartScreen` is rebuilt over them; `PressRoom` is replaced by `Latest` (its fetch moves, its file goes). Character select and creation import the same primitives. |
| C6 | `front` facts in the store (the `/api/front` answer) | same row | Beside `serverFacts`. |

## Plan-level decisions

**D1 — The anonymous show read is `GET /api/front`, and the show's channels are settings.**
A new route class `FrontRoutes` beside `PressRoutes`, answering `{ show?: ShowListing }`, where
`ShowListing = { live: boolean; title?: string; host?: string; channels: { twitch?, youtube?,
kick? }; nextShow?: string }`. Why not `/auth/status`: sign-in awaits that fetch, and the
requirements keep *"each band renders from its own slice or not at all"*; a separate fetch fails
alone. Why `/api/front` (the slate says `/front`): REST lives under `/api/` ahead of the SPA
catch-all, and the front-page build grows this same answer with its other slices.

- **Settings** (S1), all Tier B, shipped EMPTY in `settings/show.yaml` (the platform pack must not
  carry one community's channel names; the operator sets them with `config set`):
  `show.streamer` — the playerId whose stream is the show; `show.twitch` — a Twitch login,
  lower-cased; `show.youtube` — a **channel id** (`UC…`, the one form that embeds and resolves with
  no external call); `show.kick` — a Kick slug, lower-cased; `show.title`; `show.host` (the name
  under the tile — *Bobalu Smallberries*); `show.schedule` (the next-show line, with its time zone,
  free text).
- **`live`** = `show.streamer` names a resident body that `isOnAir()`. Not resident → `false` (the
  phase lives on the body and only the streamer's own commands move it). `title` = that body's
  `streamTopic` while on air, else `show.title`. An empty setting is an absent field.
- ⭐ **The three `OVERLAY_*` channel env vars are retired in the same wave** (P1: a generalization
  that leaves the old one standing is two of the thing). `StreamLogic.channelsOf`'s fallback becomes
  *the show's streamer → the `show.*` settings*; `overlayTwitchLogin` / `overlayYoutubeChannel` /
  `overlayKickChannel` are deleted; if any of the three env names is still set, the first read
  logs one loud warning naming the setting that replaced it. `STREAMER_PLAYER_IDS` is untouched (it
  seeds the `streamers` group and the token changeover — neither is a channel). The streamer
  registry later replaces `show.*` with a record.
- `show.host` rather than the slate's `compact.founderName`: that key names the founder default's
  public name for the **office line**, which is the front-page build's (item 2). Who presents the
  show is a different fact that happens to have the same value today.

**D2 — The return after sign-in is the client's, carried in `sessionStorage`; the server adds one
word.** What must survive the provider trip is: the origin's carrier, whether the visitor closed
the video, and the sound choice. All three already live in the tab's `sessionStorage` continuously
(the shipped `saxonberg.arrivedFrom` pattern), and same-tab storage survives a cross-origin trip
and back. So no OAuth `state` or server-side return-to: it would add an open-redirect surface and a
second copy of what the tab already holds. There is one asking page (the front page), so *"returns
to what they were doing"* is: `?auth=success` → the phase machine goes to character select or
creation, and the player — whose state the tab kept — is already playing, docked. The server's one
change: the three login callbacks share a private `AuthRoutes.finishSignIn(res, provider)` that
redirects to `/?auth=success&via=<provider>`; the client stores `via` as the remembered sign-in
method (`localStorage['saxonberg.lastProvider']`) — recorded on a sign-in that **succeeded**, never
on a click. `via` is one of three words; the client ignores anything else.

**D3 — One player, mounted above the phase switch, that never changes parent.**
`<StreamPlayer/>` is rendered in `App`'s final fragment, a sibling of `{screen}`. It holds the only
carrier iframe in the client inside a `position: fixed` box. The box takes its rectangle from the
**slot** currently registered in the store — a `PlayerSlot` measures itself
(`getBoundingClientRect`, a `ResizeObserver`, window `resize` and capture-phase `scroll`, coalesced
to one animation frame) — or, with no slot, the **dock**: bottom-right, 16:9, 400 px wide on a
desktop, the width the screen allows on a phone. Because the iframe's parent never changes and its
`src` string never changes, no phase change, layout change or slot change reloads it.

- **Slots:** the front page's show tile (`unauthenticated`, playing); `StreamEmbed` in
  `ModeStage`'s focal and in `PhoneShell`'s video box (in-world, watch). Character select and
  creation register none — that is the dock.
- **What it plays** (`playerSlice.target`): before the world, the *arrival target* — the origin's
  carrier (D7) × the show's channel for it (`/api/front`), only while `live` and not `closed`;
  in-world, `clientState['cockpit.watch']` (server-authoritative, as today).
- **In-world the dock does not exist.** With no slot in-world the player unmounts — exactly today's
  behavior (the video lives only in watch mode). The one exception is the **handoff** (D4): from
  entering the world until the watch slot registers, the player stays docked so the iframe
  survives. A video in a corner while exploring is watch-slate § 8's open question, not this build.
- **`src` is one function** of `(target, muted)` — the moved `iframeFor`, now adding the mute and
  autoplay flags for Twitch (`&autoplay=true&muted=true`) and YouTube (`&autoplay=1&mute=1`); Kick
  already carries them. The iframe is keyed by that string, never by object identity.
- **Sound:** `muted` starts `true` on every document load. Our control (*Unmute* / *Mute*, on the
  player's own strip) flips it, which changes `src` — one reload (conflict note 4). A `cockpit.watch`
  that arrives in-world and is NOT the target already playing (a `watch` the player typed) sets
  `muted` false: they just acted, and sound is allowed. The handoff keeps whatever `muted` is, so
  its `src` is unchanged.
- **Closed:** the dock's ✕ (and the tile's, on the front page) sets `closed`, stored in
  `sessionStorage['saxonberg.player.closed']` — the tab's lifetime is *the visit*. In-world, the
  server clearing a personal `cockpit.watch` the player was on (`watch off`; never a shared
  display's marker leaving) sets the same flag, so signing out does not restart a video the viewer
  switched off.
- Layering: above the page, below the tooltip layer, the command sheet and any summoned panel.

**D4 — Entering while watching is two ordinary commands the client sends on arrival, the second
with a new option.** When `connectionPhase` becomes `in-world` and the player is playing an
arrival target, the client sends, in order: `watch <channel> --twitch|--kick` (or
`watch <UC…> --youtube`), and — once `cockpit.watch` comes back equal to the target —
`cockpit mode watch --session`. Both are echoed and answered in the transcript like anything typed
(*Watching Twitch #…*, *mode set to watch*). Why not a parameter on `play` / `embody confirm`: that
is two verbs plus the guest path (a guest runs neither), and it hides the act inside entry; the
arrival effect is one place and covers a new character, a returning one and a guest alike.

- ⭐ **The channel in the command comes from the server's own show read, never from the URL.** The
  link contributes one of three carrier words; deep-links § 1 (*a URL never holds a command*) holds.
- **The controls say so before they send** (the axiom *a tap names its command before it sends*):
  while the video plays, `roster-sends-as` and the confirm control carry a second line naming both
  follow-up commands.
- **`--session`** (S7): `cockpit mode <name> --session` sets the transient `cockpit.sessionMode`
  and leaves the stored `cockpit.mode` alone; `getCockpitMode()` resolves *session → stored →
  legacy → explore*; the pushes carry the resolved values, nothing is saved. A plain
  `cockpit mode <name>` clears the session mode. `Avatar.enter` clears it before the welcome
  snapshot is built, so every entry — a login or a reconnect — starts from the remembered mode and
  the client re-asserts if (and only if) the video is still playing. That is what makes step 8 and
  step 11 true.
- **No restart:** the server's `cockpit.watch` must equal the arrival target field for field, so
  the `src` string is identical. D1 ships the channels already in the form `watch` produces
  (lower-case login and slug; the channel id verbatim). A unit test on each side pins the equality.
- **Refused or silent:** if `cockpit.watch` has not matched within 5 s the handoff ends — the
  second command is not sent, the player unmounts (in-world, no slot), and the transcript holds
  whatever `watch` answered. Not playing at entry → nothing is sent; the usual mode.
- A brief paint of the remembered mode's layout precedes the switch (one round trip). The docked
  player rides through it, so the video does not blink.

**D5 — The plain outfit is the three rows that exist.** `startingOutfit:` in `char-gen.yaml`
(beside `startingKit:`) lists `/stuff/thing/clothes/student-shirt`, `student-trousers`,
`canvas-shoes` — plain linen, already described as everyday, and the trousers' pockets are where
the kit's phone goes. Worn through `Character.wearGarments` by `EmbodyController.commit` (players),
`Login.mintRandomGuestAvatar` (guests) and `TestHooks.#dress` (test characters) — one list, three
callers that already exist. The five other aspiration outfits' rows stay in `generic-objects`
(NPC costumes and shops use them). No new content.

**D6 — The restyle shares the front page's parts; it does not copy its styles.** The band grammar
moves out of `StartScreen` into `components/front/` (`Band`, `BandInner`, `Eyebrow`, `Panel`,
`PanelHeading`, `PanelNote`, `Action`, plus `HostBar` and `IdentityBand`), built on `tokens` — the
prototype's own variables. Character select and character creation are re-skinned by replacing
their local screen, header and card chrome with those parts: the same host bar and identity band
on top, full-bleed bands with width-capped contents, Spectral for headings, Public Sans for
chrome, Plex Mono for the command previews. **Behavior and test ids do not change** — the two-card
/ two-screen split, the three hatches, *sends as*, the field renderer, the dossier card all stay.

**D7 — The origin.** `services/arrival.ts` decides once per tab and stores the answer in
`sessionStorage['saxonberg.arrival']` (the old `saxonberg.arrivedFrom` key is dropped):

1. `?from=` ∈ `twitch · youtube · kick · stream` — exact, ours;
2. else the referrer's host (`twitch.tv`, `youtube.com` / `youtu.be`, `kick.com`, and subdomains);
3. else none.

⚠ The decision is made **only on a load that carries no `?auth=`**, and never re-made once stored
— otherwise a visitor with no origin who signs in with Twitch comes back with `id.twitch.tv` as
the referrer and would be read as having come from Twitch. The carrier (the first three words)
starts the video and orders the buttons; `stream` and *none* do neither. The remembered sign-in
method (D2) is the third signal: it only orders the buttons, with no *You came from* line. Order:
the origin's provider first (YouTube → Google), else the remembered one, else Google · Twitch ·
Kick. Every button keeps the same look. The server accepts the four words on the socket
(`ARRIVAL_DOORS`), and the feed's `fromStream` becomes *any door* — the ticker line is unchanged
and Rodney needs no change.

**D8 — The walk exercises the return honestly.** Twitch is not configured under e2e, and no test
may reach a real provider. The walk (a) answers `/auth/status` through `page.route` so Twitch
reads as configured, (b) clicks the real Twitch button, (c) routes the navigation to
`**/auth/twitch` with a 302 to the new test seam `GET /auth/test-return?handle=…&provider=twitch`,
which signs the handle in exactly as `test-login` does and then calls the SAME
`AuthRoutes.finishSignIn`. So the page really leaves, really comes back to
`/?auth=success&via=twitch` as a fresh document, and everything the client does on return is the
shipped path. The carriers' players are stubbed the same way (`page.route` on
`player.twitch.tv`, `www.youtube.com/embed`, `player.kick.com`) with a page that records a boot id
and counts ticks — which is what lets *still advancing* and *did not restart* be read, and lets
them fail.

**D9 — The founding deed stays, without the label.** *"Embodied as {{ name }}."* is a deed, not a
prologue claim; the requirements remove the prologue (`claimSeeds`), and the drive's *no prologue*
check reads claims.

## ⭐⭐ Host placement

| what | host | what composing it claims about the rest |
|---|---|---|
| `cockpit.sessionMode` + `setSessionMode` | `SaxonbergClientMixin` (`lib/connection/SaxonbergClient.ts`) | Everything that composes it has a cockpit mode, so everything on it can have a visit-only one. No guard, and no host that answers *never*: any played body may be told `cockpit mode <x> --session`. |
| the `show.*` values | the `AppSettings` bag | One show per instance. It is a fact about the instance, so it is stamped on nothing — not on every streamer's body, not on the lounge. A second show is the registry's record, not a second key. |
| `showListing` | `StreamLogic` behind `StreamApi` | Forwarding shell + logic singleton, the mandatory split. It reads one body through `MixinApi.isBroadcastHost`; it adds nothing to `BroadcastMixin`. |
| `startingOutfit` | the char-gen config; worn by `Character.wearGarments` | Nothing is added to `Persona`, `Character` or `PrimaryAvatar`. The list claims only that every newcomer body is a biped the rows' `slotClaims` name; a body the rows do not fit skips that garment with the existing diagnostic. |
| `Persona.aspiration` | removed | The field leaves every host that composed `Persona` (the tell in `Beast.ts:19` — a pit pony had one). |
| the player's state | a store slice; the component under `App` | Client only. Phases do not own the player; the player outlives them. |
| the origin | `services/arrival.ts`, the tab's storage | Per tab. Nothing about the origin is stored on the account or the character beyond the shipped `Interactive.arrivedFrom`. |

No new field lands on a base class; no mixin is added to any host.

## Convention conformance

- **`props:` / `cast:`, locations-not-rooms, the five roots:** no content rows, no place, no class
  path is added. The lounge is unchanged.
- **Module scope declares:** `StreamLogic`'s deleted env readers were file-private functions; their
  replacement reads `AppApi.setting` at use. `FrontRoutes` is a class with a static `setup`.
- **Module categories:** nothing new under `src/mud/`. `backend/FrontRoutes.ts` joins the existing
  route classes (`PressRoutes`, `HelpRoutes`); `services/auth/*` are edited in place. No exported
  free helper is added on the server.
- **Api ↔ Logic:** `StreamApi.showListing` forwards to `StreamLogic.showListing`
  (`FromModule('/api/stream#StreamApi')`), as its neighbors do.
- **Import boundary:** `backend/` and `services/` may import the Apis; the mudlib imports nothing
  new from outside `src/mud/`.
- **Verbs on objects / the controller is dumb (P5):** `CockpitModeController` parses `--session`
  and calls `host.setSessionMode(mode)`; resolution stays in `getCockpitMode`. The plain path's
  three writes are not moved in this build.
- **P3 refuse · skip · throw:** an unset show setting → the field is absent (skip); `/api/front`
  with the world not up → `{}` with a logged reason, never a defaulted `live: false`; a refused
  `watch` on arrival → the handoff ends and the refusal is in the transcript; a `from` or `via`
  outside its list → ignored (unknown, not wrong); `--session` on an unknown mode → the shipped
  `unknown-mode` refusal.
- **P4 no duck typing:** narrowing is `MixinApi.isBroadcastHost` / `isSaxonbergClient`; no pack is
  involved.
- **P6 persistence:** `cockpit.sessionMode` is transient by declaration (the `cockpit.watch`
  precedent); the settings ride the existing settings Document; nothing else persists. No
  migration: a stored `aspiration` on an old snapshot is ignored (Risks).
- **P7 load on use:** `showListing` follows one authored reference (`show.streamer` →
  `PlayerApi.findAvatarByPlayerId`) — no scan of who is online, no boot entry.
- **P8 names:** `showListing` (not `show()`, which is the streamer's state on `BroadcastMixin`);
  `StreamPlayer` for the one player, `PlayerSlot` for where it sits; `--session`, the client-state
  doc's own word for a transient key's lifetime. American English throughout.
- **Gates this build must pass:** `lint:family` entire, and by name the ones it moves —
  `lint:view-keys` + `lint:command-views` (the `--session` option; `options` on a subcommand is
  already a pinned key), `lint:field-meta` (re-snapshot the golden after `aspiration` leaves:
  `tsx scripts/check-field-meta.ts --snapshot`, then `--lint`), `lint:test-seams` (the new seam),
  `lint:wire-content` (the wire file names no `/world/<x>`), `lint:drive-scripts`,
  `lint:silent-catch`, `lint:controller-mutations` / `lint:controller-decisions` (must not rise —
  if either does, the session write is not in the mixin), `lint:schema` (no collection);
  client `tsc`, ESLint, and `noNativeTitle`.

## Waves

Each wave ends at one commit and leaves the tree green on `pnpm test:near`, the touched suites and
the gates it moved. W0–W3 are independent of each other; W4 needs nothing before it; W5 needs W1,
W2, W4; W6 needs W3, W4, W5; W7 needs all.

### W0 — Aspiration out; the plain outfit in (D5, D9)

Goal: character creation asks four things; every newcomer, guest and test character wears the one
outfit; the word is gone.

- `mud/config/char-gen.yaml` — delete `aspirations:` and the `aspirations[].image` header note; add
  `startingOutfit:` (three paths) above `startingKit:` with its comment (*the same for everyone
  until lineage chooses*).
- `EmbodyController.ts` — drop `aspiration` from `CharGenField`, the roster types, `FIELDS`,
  `FIELD_ORDER`, the config loader; `commit()`: no aspiration lookup, `bio: ""`, no `aspiration`
  overlay key, `await avatar.wearGarments(cfg.startingOutfit ?? [])`, no `seedChronicleClaims`
  call, deed template *"Embodied as {{ name }}."*. Header comments follow.
- `Login.ts` — `CharacterDraft.aspiration` gone; the guest mint drops the random aspiration, sets
  `bio: ""`, wears `cfg.startingOutfit`.
- `Persona.ts` — the field, its `fieldMeta` row, getter, setter, interface members, header prose.
  `seedChronicleClaims` stays (Cast uses it); `ChronicleEntry.ts:66`'s comment is reworded.
- `api/social.ts`, `ProfileLogic.ts`, `ProfileControllerBase.ts` — the card field and the
  *Aspires:* line.
- Views: `embody.yaml` (description + help), `score.yaml` help.
- `backend/TestHooks.ts:755–773` — `loadConfig().startingOutfit`.
  `packages/wire/src/harness/session.ts` — the `aspiration` pick and the `embody aspiration` line
  go; grep `packages/wire/tests` for callers passing the pick.
- Tests and fixtures: the three `EmbodyController*.test.ts` (the chronicle test keeps its deed
  assertion and asserts **zero claims**), `ProfileLogic.test.ts`, `TestHooks.test.ts`, the
  `wiki-spoiler-fields` snapshot, the field golden (re-snapshot), client `charGenFields.test.tsx`,
  e2e `chargen.spec.ts` and `arrival.spec.ts` (their aspiration steps).
- Prose: `Beast.ts:19`, `commands.spec.ts:49`, `rucksack.yaml:3`, `employed.md:31` (reworded —
  conflict note 8). B4: grep `packages/content` for `aspiration` (the respiration condition and
  `paths.ts`'s `respirationAspiration` are the only survivors).
- ⚠ Do not touch `Condition/respiration/aspiration.yaml`.

Acceptance: `grep -ri aspiration packages/` returns only the respiration condition, its path
constant, and the unrelated adjective *aspirational*; a unit test embodies and reads back the three
garments worn, an empty bio, no claim entries, the phone pocketed; a guest mint wears the same
three. Commit: `feat(char-gen): aspiration removed; one plain outfit for players and guests`.

### W1 — The show's settings and the anonymous read (D1)

- `lib/config/AppSettings.ts` — seven keys + tiers (B). `packages/content/platform/content/
  settings/show.yaml` — the seven keys, empty values, a comment each (the form `show.youtube`
  wants; that `show.streamer` is a playerId).
- `packages/types/src/index.ts` — `ShowListing`, `FrontResponse`.
- `api/stream.ts` + `StreamLogic.ts` — `showListing()`; `channelsOf`'s founder fallback reads the
  settings for `show.streamer`; the three env readers deleted; the one loud warning.
- `backend/FrontRoutes.ts` + mount in `services/Server.ts` beside `PressRoutes`. Anonymous: reads
  no session, sets no cookie, `GET` only, no query.
- `.env.example`, `docs/deployment.md` — the three env names removed, the `config set show.*`
  step written in their place (a go-live step: without it the overlay's chat read stops).
- Tests: `StreamLogic` (listing: unset → `{ live:false, channels:{} }`; streamer not resident →
  `live:false`; resident on air → `live:true` with the topic as title; channels pass through in
  stored form; `channelsFor(show streamer)` returns the settings), `FrontRoutes.test.ts` (the
  `PressRoutes.test.ts` shape: anonymous 200, no `set-cookie`, world-down → `{}`).

Acceptance: `curl /api/front` on a dev world answers the staged listing with no cookie. Commit:
`feat(stream): the show's settings and the anonymous /api/front read; OVERLAY_* channel env retired`.

### W2 — The origin's words and sign-in's return (D2, D7, the server half of D8)

- `packages/types` — `ARRIVAL_DOORS`, `ArrivalDoor`.
- `WebSocketService.ts:194–200`, `Interactive.setArrivedFrom`, `Application.ts` doc comment —
  validate against the list. `BroadcastFeed.ts:223` — `fromStream: arrivedFrom !== null`.
- `AuthRoutes.ts` — `finishSignIn(res, provider)`; the three callbacks call it.
- `TestAuthRoutes.ts` — `GET /auth/test-return` (same token check, same `TestHooks.authenticate`,
  `req.login`, then `AuthRoutes.finishSignIn`); `test-login` answers `playerId` when a character
  exists. The mount warning lists the new seam.
- Client `services/arrival.ts` — `origin()` (decide once, the `?auth=` guard, storage blocked →
  none), `carrier()`, `door()` for the socket, `rememberProvider(via)` / `lastProvider()`,
  `providerOrder()`. `config.ts` — the two door functions deleted; `WS_URL` uses `door()`.
  `App.tsx:367–378` — read `via` before stripping the query.
- `packages/wire/src/harness/session.ts:462` — the door type widens to `ArrivalDoor`.
- Tests: `arrival.test.ts` (each `from`; each referrer host; a spoofed `from=evil` → none; the
  OAuth-return referrer is never read; decided once; `via` outside the three ignored; order for
  every signal combination), `TestAuthRoutes.test.ts` (the redirect), the `Interactive` door test,
  the feed's `fromStream` for a carrier word.

Acceptance: a socket opened with `?from=kick` stamps `kick`; `?from=evil` stamps `null`. Commit:
`feat(arrival): the origin names a carrier; sign-in returns with via=`.

### W3 — A cockpit mode for this visit only (D4's server half)

- `SaxonbergClient.ts` — schema entry `cockpit.sessionMode` (transient, default `null`, validated
  against `COCKPIT_MODES`); `setSessionMode(mode | null)` (set + push the resolved `cockpit.mode`,
  `cockpit.arrangements`, `cockpit.layout`; no save); `getCockpitMode()` consults it first.
- `Avatar.enter` — clear it (guarded by `isSaxonbergClient`, as `openArrangementGuarded` is)
  before `buildWelcomePayload`.
- `CockpitModeController.ts` — `--session` → `setSessionMode(mode)` then the same
  `applyCardArrangement` and a line that says *for this visit*; the plain path calls
  `setSessionMode(null)` first. `cockpit.yaml` — the option under `mode`, its help paragraph, an
  example.
- Tests: resolution order; `--session` leaves the stored `cockpit.mode` byte-identical; plain
  clears; `enter` clears; the snapshot carries the resolved mode; the existing source scan (*nothing
  outside the cockpit's own files reads `cockpit.mode`*) still passes.

Acceptance: `cockpit mode watch --session`, then a relog, lands in the remembered mode. Commit:
`feat(cockpit): cockpit mode <name> --session — a mode for this visit, not remembered`.

### W4 — The one player (D3)

- `store/playerSlice.ts`; `components/embed/StreamPlayer.tsx` (the host: the moved `iframeFor`
  with mute/autoplay flags, the fixed box, the strip with *Unmute* and — docked or on the tile —
  ✕, test ids `stream-player`, `stream-player-unmute`, `stream-player-close`,
  `data-player-place="slot|dock"`); `components/embed/PlayerSlot.tsx`.
- `StreamEmbed.tsx` — keeps `Wrap`/`Stage`/`Screen`, the placeholder and the display caption;
  renders a `PlayerSlot` where the iframe was. `ModeStage.tsx:626` and `PhoneShell.tsx:297` are
  unchanged call sites.
- `App.tsx` — `<StreamPlayer/>` in the final fragment; an effect mirrors
  `clientState['cockpit.watch']` into the slice while in-world.
- Tests: `StreamPlayer.test.tsx` — the `src` for each carrier and each `muted`; the iframe element
  is the SAME node across slot → dock → slot and across a re-render with an equal target object;
  in-world with no slot and no handoff renders nothing; a new in-world target unmutes; the
  shared-display caption still shows. Existing watch-mode tests (`client-surface-layout.spec.ts`,
  `cockpit.spec.ts`) keep passing.

Acceptance: in a dev world, `watch <x> --twitch` + `cockpit mode watch` shows the video exactly as
before; switching arrangements does not reload it. Commit:
`feat(client): one stream player above the phase switch; watch mode's embed becomes its slot`.

### W5 — The front page (D6's parts, D7's use, the page)

- `components/front/` — the band grammar and the bands (C5). `StartScreen.tsx` rebuilt over them,
  top to bottom per front-page-slate § 4 with **only the bands that have a source**:
  host bar · identity · the three chambers' sentences (no *WANTED / FUNDING NOW / NEEDS* lines) ·
  sign-in (ordered by `arrival.providerOrder()`; *You came from Twitch.* / *You came from Kick.* /
  *You came from YouTube — sign in with the Google account you watch on.*; the guest as a plain
  small link *Look around as a guest* and *A guest keeps nothing, and nobody can find them.*; the
  live count; the dev login) · the show (`ShowTile`: a `PlayerSlot` when the arrival target plays;
  otherwise the thumbnail tile with *Sign in to watch it inside Saxonberg.*; offline → the glowing
  `@` and `nextShow`, or *Offline* alone; the founder's avatar with a red ring when live;
  `title`; `host`) · Latest (the press room's headlines, each with its publisher) beside Coming
  up (`nextShow`; the band's right half is absent when unset) · the footer (links whose
  destinations are real: panterasbox.com, the show on each carrier that has a channel set, and
  whatever of Source / Discord / the public record / Privacy has a URL in the tree today — the rest
  are absent, and listed for the owner).
- The whole show band is absent when `/api/front` did not answer or carries no `show`. No
  *Acting Prime Minister* line (its source is the front-page build's).
- Assets: `docs/design/brand/bobalu/at-avatar.svg` + `at-avatar-glow.svg` and the two seals copied
  into the client's assets.
- `App.tsx` / store — fetch `/api/front` on mount and every 60 s while `unauthenticated`; never
  awaited by anything. `PressRoom.tsx` → `front/Latest.tsx` (its fetch and its never-awaited rule
  move with it); `PressRoom.test.tsx` becomes `Latest.test.tsx`.
- Phone: plain CSS reflow, order sign-in · the show · the chambers · Latest (+ Coming up).
- Kept test ids: `start-screen`, `guest-button`, `guest-warning`, `presence-line`, `reset-notice`.
  New: `show-tile`, `show-offline`, `came-from`, `provider-<key>` (in DOM order), `latest`,
  `coming-up`.
- The slates the requirements say to mark: front-page-slate § 3 and § 8 (*a playable stream on the
  page* — superseded 2026-11-23, with the reason).
- Tests: `StartScreen` (each origin × live/offline × `/api/front` absent; provider order; no band
  renders *coming soon* or a fallback string; the guest link is not inside the show tile);
  `StartScreen.persistence-copy.test.tsx` and `App.test.tsx` keep guarding the reset notice; e2e
  `arrival.spec.ts`, `guest.spec.ts`, `auth.spec.ts`, `mobile-chrome.spec.ts` updated for copy.

Acceptance: `/?from=twitch` on a dev world with the show staged live plays it muted in the tile;
bare `/` shows the thumbnail tile and the neutral order. Commit:
`feat(client): the front page rebuilt — real bands, the show playing for a visitor from a carrier`.

### W6 — The funnel: docked through select and creation, restyled, and entering in watch (D4, D6)

- `CharacterSelect.tsx`, `CharGenStage.tsx` — re-skinned over `components/front/` (D6); on a
  phone-width screen each reserves the dock's height at the bottom while the player is playing, so
  the confirm and Enter controls are never under it.
- The follow-up preview lines: `roster-then-watch` under `roster-sends-as`; `chargen-then-watch`
  beside `chargen-confirm`.
- The arrival effect in `App.tsx` (or a hook beside the slice): on entering `in-world` with a
  playing arrival target → `handoff: true`, send `watch …`; on `cockpit.watch` equal → send
  `cockpit mode watch --session`; on the watch slot registering → `handoff: false`; 5 s without a
  match → `handoff: false`.
- `closed` from an in-world `watch off` (D3).
- Tests: the effect (playing → both commands in order with the exact strings; not playing →
  nothing; closed → nothing; a guest → the same; refusal/timeout → the second is not sent; a
  reconnect re-asserts); `CharacterSelect.test.tsx` and `charGenFields.test.tsx` keep their
  behavior assertions; e2e `chargen.spec.ts`, `avatar-family.spec.ts`, `mobile-chrome.spec.ts`
  keep passing on the kept test ids.

Acceptance: by hand on a dev world — `/?from=twitch`, dev-login, create a character, land in the
lounge in watch mode with the docked video gliding into the stage. Commit:
`feat(client): the video docks through select and creation; entering while watching enters in watch`.

### W7 — The drive, the walk, the record

- `packages/wire/tests/stream-arrival.wire.test.ts` — the server slice (below). Names no
  `/world/<x>`; restarts through the harness's `restartWorld()` only.
- `e2e/tests/stream-arrival-walk.spec.ts` — the blocking drive (below), 1440×900, plus one
  390×844 context for step 12.
- B2: each checkpoint is made to fail once (listed below) before its green is trusted.
- The drive record appended to this file. Then code-complete: the one full `pnpm test`, the MR.

Commit: `test(stream-arrival): the wire drive and the browser walk`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| a visit-only mode | `cockpit mode <name> --session` — the shipped view, one new option | `cockpit` is afforded to every client host already (`requiresHasInteractive`) | `cockpit.sessionMode` declared in `SaxonbergClient`'s `clientStateSchema` — an undeclared key THROWS on write, so a missed declaration fails loudly | none — in-memory on the live body | `name` is checked against `COCKPIT_MODES` before the option is read |
| entering in watch | `watch <channel> --<carrier>` then the above — both shipped views | every played body, guests included (`requiresAnimate`) | the channel from `/api/front`; the carrier from the tab | `watch` resolves with no external call for all three forms D1 stores | `show.youtube` must be a `UC…` id or `watch` falls to the handle path (the reader) — validated where the setting is read, and unit-tested |
| the show read | none (REST) | `FrontRoutes.setup` mounted in `Server` — ⚠ an unmounted route is a silent 404 that the client renders as *no show band*; `FrontRoutes.test.ts` and wire step 1 both hit the mounted app | the seven settings; `show.yaml` must ship the keys or `AppApi.setting` has nothing to read | `show.streamer` → `findAvatarByPlayerId`; no boot entry | n/a |
| the plain outfit | none (worn at mint) | n/a | `startingOutfit` in `char-gen.yaml`; the three rows in `generic-objects` | rows load when `wearGarments` clones them | a path that does not resolve is skipped with a diagnostic — the W0 test asserts all three are WORN, so a typo cannot pass |
| the origin | none | n/a | `?from=` / referrer → the tab → the socket's `from=` | n/a | `ARRIVAL_DOORS` on both ends |

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| From a carrier: the show plays on that carrier while live; its offline tile when not | W1, W2, W4, W5 |
| No origin: no playing video, the neutral order | W2, W5 |
| After sign-in: back where they were, the same stream playing, no click | W2 (D2), W4, W5, W6 |
| The video plays in a corner through select and creation | W4, W6 |
| Entered while playing → watch mode, same stream and carrier, not restarted; otherwise the usual mode | W3, W4, W6 |
| Select and creation look like the front page | W5 (parts), W6 |
| *Aspiration* nowhere; everyone in the plain outfit | W0 |
| Only bands with real content; none says *coming soon* | W5 |
| After a restart: the outfit kept, no aspiration | W0, W7 (wire) |

Nothing is unmapped.

## Test & gate strategy

**Units** carry everything arithmetic or structural: the origin rules, the provider order, the
`src` strings, same-node-across-places, the mode resolution order, the listing, the route's
anonymity, creation without aspiration. **The drive** proves the path.

Every step is `instant` except the restart, which is `staged`. There is no span step and no soak
drive. Staging tools: the show is staged by playing — a founder session (PM seat, `streamer: true`)
runs `config set show.streamer <its playerId>` (the id from `test-login`'s widened answer — S6, the
one tool this build owed), `config set show.twitch|youtube|kick …`, then `stream start` /
`stream live` / `stream off`.

**The wire file** (`stream-arrival.wire.test.ts`) — the server's half of steps 1, 4, 7, 8, 10, 11:

1. `/api/front` anonymous: unset → no channels; after the founder's `config set` and `stream live`
   → `live: true` and the three channels verbatim; after `stream off` → `live: false`.
2. `Session.embody(handle, {}, { from: 'twitch' })` — the commands sent contain no aspiration; the
   feed's new-player event says `fromStream: true`; the newcomer wears the three garments, the
   phone is in a pocket, `profile` has no *Aspires*, the chronicle has the founding deed and no
   claim, the bio is empty.
3. `watch <show channel> --twitch` then `cockpit mode watch --session` → the client-state deltas
   read `cockpit.watch` = the listing's channel and `cockpit.mode` = `watch`.
4. Sign out and `play` again → `cockpit.mode` is `explore` (step 8's server half).
5. A guest session → the three garments, no *Aspires*.
6. `restartWorld()` → `play` the newcomer → the garments still worn, the bio empty, the mode
   `explore` (step 11).

**The walk** (`stream-arrival-walk.spec.ts`) — the blocking drive, step for step:

| step | pace | the check, and how it is made to fail once (B2) |
|---|---|---|
| 1 tagged, live | instant · staged show | the player frame's URL is the Twitch stub with the staged channel and the mute flag; `came-from` reads *You came from Twitch.*; the first `provider-*` is Twitch. Fail: drop `from`. |
| 2 unmute | instant | the frame's URL loses the mute flag. Fail: click nothing. |
| 3 untagged | instant | no player frame; `show-tile` is the thumbnail; order Google · Twitch · Kick; the guest control is a link outside the tile. Fail: add `from`. |
| 4 offline | instant · staged | `stream off` → `show-offline`, no frame. Fail: leave it live. |
| 5 sign in | instant · staged (D8) | a real navigation away and back; a NEW frame on the same URL appears with no click, `data-player-place="dock"`. Fail: clear `sessionStorage` before returning. |
| 6 creation | instant | no element or text matching /aspir/i anywhere on the page; the frame's boot id is unchanged and its tick count rose since step 5; confirm. Fail: force a remount with a changed key. |
| 7 the lounge | instant | `cockpit.mode` renders watch; the frame's boot id is STILL the one from step 5 and `data-player-place="slot"`; `inventory` shows the phone in a pocket and the three garments worn; `profile` has no *Aspires*; `chronicle` has no prologue line; `look` reads the lounge by its own light. Fail: send plain `watch` with a different-case channel. |
| 8 closed | instant | `watch off`; sign out; no frame on the front page; sign in again; *Enter* → the mode is explore. Fail: skip `watch off`. |
| 9 returning, YouTube | instant | `from=youtube`; the YouTube stub plays; the YouTube line; Google first; character select shows the dock; *Enter* → watch, the same boot id. |
| 10 guest | instant | the small link → the lounge; three garments; no *Aspires*. |
| 11 restart | staged | the wire file's step 6 (a browser cannot restart the world it is attached to); the walk's step 8 is its client half. |
| 12 phone width | instant | 390×844: the DOM order is sign-in, the show, the chambers, Latest; through creation the dock is inside the viewport and does not overlap `chargen-confirm`. |

**Cadence:** `pnpm test:near`, the touched suites and the moved gates per wave; `pnpm test` once at
code-complete and once at `/finalize`; the walk once at code-complete.

## Risks & opens

**Risks**

- **The handoff's equality.** If the server's `WatchTarget` differs from the arrival target by one
  character, the video reloads at the moment the build exists to protect. Pinned by two unit tests
  and walk step 7; if `StreamerTarget.parse` normalizes differently than D1 stores, store what it
  produces.
- **Twitch's embed rules** (conflict note 7) and each carrier's autoplay behavior can only be
  confirmed against the real players. The walk uses stubs. **Before the MR, check all three real
  embeds by hand on a dev world with a live channel** (docked on a desktop, docked at phone width,
  in the tile, in the stage) and record it in the drive record. If the phone dock cannot play
  Twitch, stop and ask.
- **YouTube's `live_stream?channel=`** shows an error card when the channel is not live or forbids
  embedding. The page only mounts it while `live`, but our `live` is the streamer's phase, not
  YouTube's.
- **The fixed box following a slot** can lag a fast scroll on the front page by a frame. If it
  shows, pin the show band's tile out of the scrolling flow rather than chasing the scroll.
- **Storage blocked** (a private window): the origin is unknown, so no video and no resume. Honest,
  and already the shipped posture (*the door is unknown, not wrong*).
- **`OVERLAY_*` on the live box.** After W1 the overlay's chat read needs `config set show.*` and
  `show.streamer`. It is a go-live step in `deployment.md`; missing it is loud in the log but
  silent on the overlay.
- **A stored `aspiration` on an old snapshot.** The restore must ignore an unknown key. Verify once
  in W0 against a snapshot written before the wave; if restore throws, the dev databases are
  dropped (no migration, by standing rule) — do not write a shim.
- **`enter` on a second connection to the same body** clears the session mode for the first tab
  too. Accepted: the client re-asserts on its own next entry; two tabs on one body is not this
  build's path.
- **React StrictMode** double-mounts in dev; the player mounts once per document either way, but a
  dev-only double `watch` send must be guarded by the `handoff` flag, not by a ref.

**Opens — the owner's calls; the plan's lean is what gets built unless told otherwise**

1. `from=stream` (conflict note 1): carrier-less, no video (lean) — or a default carrier.
2. The unmute reload, and resuming muted after sign-in (notes 4, 5).
3. Retiring the `OVERLAY_*` channel env vars now (D1) rather than leaving two sources until the
   registry.
4. `show.host` as its own key rather than `compact.founderName`; the names `showListing` and
   `--session`.
5. The plain outfit is the existing *student* rows — their prose says *student* and *campus*.
   Rewording them is a content call the build does not make.
6. An in-world `watch off` counts as *closed for the visit* (D3).
7. Footer links with no URL in the tree (Discord, Privacy, the public record) are absent until
   given.
8. The founding deed's line, *"Embodied as {{ name }}."* (D9).

**Stop and ask** if: a real carrier embed cannot play docked; the snapshot restore throws on the
old field; `lint:controller-mutations` or any ceiling would have to rise; or a wave needs a new
file that is not on the substrate list.

## Deferred seams

- **Any streamer's link** → [streamer-registry-slate](../slates/platform/streamer-registry-slate.md):
  the record replaces the seven `show.*` settings; `showListing()` and `/api/front`'s `show` keep
  their shape.
- **The rest of `/api/front`** (the office line, openings, the demand digest, the fund proposal,
  the calendar) → the front-page build (front-page-slate § 6); the route and `FrontResponse` are
  where they attach.
- **The intent route, the confirm card, link previews** → deep-links-slate; `services/arrival.ts`
  is where an intent would be read.
- **The phone as the screen** → display-manifestation-slate; the arrival writes `cockpit.watch`,
  which is what a held display would also write.
- **The video in a corner while exploring, and getting out of watch** → watch-slate § 8; the dock
  exists and is simply not used in-world.
- **Sound without a reload** (the carriers' player messages) → watch-slate § 7; `muted` is one
  field with one writer.
- **Origins, a real outfit, a prologue** → lineage-slate; `startingOutfit` is the one list it
  replaces.
- **Linking the other carriers** → the watch build.

## Critical files

Read first, in this order:

1. `docs/requirements/stream-arrival-requirements.md` — the drive is the exit criterion.
2. `packages/client/src/App.tsx` (`:361–378`, `:472–510`, `:682–840`).
3. `packages/client/src/components/embed/StreamEmbed.tsx`, `layouts/ModeStage.tsx` (`:596–640`),
   `components/phone/PhoneShell.tsx` (`:140–300`).
4. `packages/client/src/components/StartScreen.tsx`, `CharacterSelect.tsx`, `CharGenStage.tsx`,
   `components/ui/tokens.ts`, `config.ts`; `docs/design/front-page/front-page.dc.html`,
   `docs/design/brand/README.md`.
5. `packages/server/src/mud/lib/connection/SaxonbergClient.ts` (`:540–570`, `:769–800`,
   `:985–1030`), `lib/connection/ClientState.ts`,
   `platform/idea/cmd/shell/CockpitModeController.ts`, `lib/character/Avatar.ts` (`:940–1010`).
6. `packages/server/src/mud/platform/idea/cmd/stream/WatchControllerBase.ts`,
   `lib/streaming/StreamerTarget.ts`.
7. `packages/server/src/mud/platform/idea/api/StreamLogic.ts` (`:680–725`), `api/stream.ts`,
   `lib/livestream/Broadcast.ts`, `lib/config/AppSettings.ts`, `backend/PressRoutes.ts`.
8. `packages/server/src/services/auth/AuthRoutes.ts`, `TestAuthRoutes.ts`;
   `services/websocket/WebSocketService.ts` (`:185–205`), `platform/idea/Interactive.ts`
   (`:200–216`), `backend/BroadcastFeed.ts` (`:210–225`).
9. `packages/server/src/mud/platform/idea/cmd/charactergen/EmbodyController.ts`,
   `platform/idea/Login.ts`, `lib/character/Persona.ts`, `mud/config/char-gen.yaml`,
   `backend/TestHooks.ts` (`:748–790`).
10. `packages/wire/src/harness/session.ts`, `packages/wire/src/harness/scaffold.ts`,
    `e2e/tests/helpers.ts`, `e2e/tests/broadcast-ready-walk.spec.ts` (staging a stream by
    playing), `docs/testing.md` (the two tiers; `restartWorld`).
11. Subsystem docs: `client-shell.md` (§ The front door, § Character select, § Anonymous guest),
    `char-gen.md`, `cockpit.md` (§ The two axes, § A mode switch opens its arrangement),
    `streaming.md` (§ The `watch` embed), `livestream.md`, `app-settings.md`.

## Drive record

*(appended at build time)* — the blocking drive's run (the wire file's result and the walk's
twelve steps, each with the failure it was shown to catch), the hand check of the three real
carrier embeds, and what the drive found. There is no soak drive.
