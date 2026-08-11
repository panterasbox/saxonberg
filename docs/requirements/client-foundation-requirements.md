# Client foundation — requirements

Wave 1 of the client rebuild: the ground every later wave sits on. Three
things at once — the **civic dress** (both grounds, four voices), the
**honesty primitives** that let a surface admit it has no data, and the
**global chrome** (top bar, status bar, shelf) responsive from the start.

Seeded by [client-slate § 7 Wave 1](../slates/builds/client-slate.md),
whose governing decisions (§ 3.1 honesty, § 3.5 the command line is never
silent, § 3.6 mobile, § 3.7 registers) are the rules this build has to
realize. The design surface is `docs/design_handoff/` —
`DESIGN-SYSTEM.md`, `CONVENTIONS.md`, `Art Direction - Civic.dc.html`,
`Unbuilt States.dc.html`, `Global Chrome.dc.html`,
`Global Chrome - Mobile.dc.html`. The handoff is **reference art**: it is
not diffable and will drift, so decisions live here and pixels stay
there.

It is **in-place, not greenfield** (slate § 5): 131 files, ~28k LOC, and
the CMS/Monaco/studio cluster is almost orthogonal to the restyle.

⚠ **This is not a client-only build.** The theme vocabulary is
server-owned (`StyleController.KNOWN_THEMES`), pinning must be a real
command or § 3.5's axiom lapses on the chrome itself, and the shelf needs
one pane-catalogue entry. Planned, not discovered.

## Goals

- **Every colour in the client resolves from the active theme at render
  time.** No component holds a static palette; the two parallel colour
  systems that exist today (switchable `Theme.palette` for the
  transcript, static `components/ui/tokens.ts` for all 52 chrome-reading
  files) become one.
- **Both grounds ship as selectable themes** — Ink (dark, default) and
  Marble (light), at the exact values `DESIGN-SYSTEM.md` publishes.
- **`high-contrast` survives, re-based on civic**, still legible with the
  colour channel removed.
- **Four voices, self-hosted**: Spectral (engraved display) · Public Sans
  (chrome) · Newsreader (world prose) · IBM Plex Mono (command). One
  face-stack source; `FontRole` carries a fourth `display` role.
- **The three honest states are renderable primitives** — live (plain) ·
  empty (`—` plus a reason) · not-wired (hatched ground, dashed border,
  `╌╌`) — and every figure the Wave-1 chrome shows is classified as one
  of them.
- **The global chrome ships responsive**: desktop top bar + status bar;
  mobile bar + pull-down shelf + command sheet. These are different
  components, not media queries.
- **Hover or tap previews the command a clickable would send** — desktop
  in the status bar, mobile in the command sheet — and
  `GhostCommandLine` leaves the command bar for the status bar.
- **A player can pin figures to a shelf by command**, persisted
  server-side and surviving reconnect.
- **The shelf reads real figures over S1's wire.** It is the first client
  consumer of `subscribableFields`; today `packages/client` has two
  subscription call sites, both `InspectionPane` panes, and nothing reads
  a standing field at all.

## Non-goals

Each cites where it lands instead.

- **The mode switcher, and migrating the frame off `cockpit.layout`.**
  Wave 4. The compatibility projection S3 shipped keeps working; only
  the read-only mode *indicator* is filled here (see Surface decisions).
- **The pane feed, the hold policy, the N-pane subscription set.** Wave 4
  (slate § 3.4, § 4.4). `InspectionPane` keeps its single slot.
- **The arrangement-recall decision** (slate § 4.4 ⚠⚠ — nothing opens or
  closes a pane on `recall`, on either side). Wave 4 owns it, and it must
  be decided before the pane feed is built.
- **The facet-based filter surface.** `FilterDrawer` keeps toggling topic
  paths and `TabStrip` keeps its user-named client-side filters. The
  facets are already resolved in the store (slate § 5 item 1), so this is
  a UI change waiting in Wave 4 (filters + routing), not plumbing.
- **The notification tray.** Deferred, and **not shipped as a stub** —
  `NotifyPolicy` / `NotifyRule` want reading before that surface is
  designed, because what belongs in it is whatever the receiver *said*
  they wanted, not everything that happened.
- **The `traits` shelf widget — never.** `Global Chrome.dc.html` lists it;
  it must not be built. The psychology vocation rests on self-other
  asymmetry (*you cannot read yourself*), and a pinned always-on readout
  of your own personality is the stat sheet that makes the therapist
  unnecessary. S1's guard test forbidding subscribable field names
  matching `trait|disposition|personality` stands unmodified.
- **The plate component.** § 3.7's paper-mount illustration is a feed
  element and lands with the feed in Wave 4. The plate **register's
  tokens** (`paper`, `paper-ink`, `paper-line`) ship here, since they are
  part of both grounds.
- **Arrival screens** — front door, intake, lounge, character select.
  Wave 2. (Including the account/character split, whose server half MR C
  shipped and whose client half Wave 2 owns.)
- **Forums, wiki, livestream restyle.** Wave 6. **CMS, help, git panel.**
  Wave 7.
- **A tree-wide unbuilt-state audit.** Each wave applies the convention
  to its own surfaces; auditing now would decorate screens Waves 2 and 4
  are about to rewrite.
- **Per-player frame store, durable clips, attestation.** Deferred
  (slate § 4.3); the first is a product decision, not a UI one.
- **`prompt.format` rendering.** Net-new in Wave 4 (slate § 5 item 3).

## Surface decisions

### Both grounds ship, and `tokens` becomes theme-aware

The slate calls civic tokens "mechanical, touches everything." That is
true only for a single ground. In fact the palette is centralized harder
than assumed — 111 hex literals client-wide, 65 of them inside
`components/ui/tokens.ts` and the two theme modules, with the only real
scatter in `MmlRenderer.tsx` (17). But `tokens` is a flat `as const`
consumed by 52 files and **is not switchable**, while `Theme.palette`
(switchable, driven by the persisted `style.overlay.theme`) covers only
the transcript.

Ink-only would be a values edit. It would also mean paying the
theme-awareness cost later *plus* rewriting the palette a second time —
the waste the S2 topic build avoided by folding the label rewrite into the
corpus replacement rather than doing it twice. Both grounds ship now.

Mechanism is the planner's call; the requirement is that chrome resolves
colour from the active theme at render time and no component names a
literal.

### Theme vocabulary: `ink` / `marble` / `high-contrast`

`default` is retired and **not aliased**. It stops naming anything the
moment there are two grounds — the doc calls it Ink and so should the
verb. The S2 precedent governs: no playerbase to protect, the demo wipes
nightly, and an alias keeps a dead vocabulary alive for nobody.

Three flat names, **not** a ground × contrast matrix. A 2×2 is more
correct in principle and is four palettes to author and test for one
accessibility consumer; if high-contrast Marble is ever wanted it is a
fourth name, not a re-architecture.

The rename moves together across `Theme['name']`,
`StyleController.KNOWN_THEMES`, its failure copy, and the
`cmd/shell/cockpit.yaml` examples — the vocabulary is server-owned, so a
client-only rename would leave the verb refusing a theme the client has.

### The fourth font role is `display`, and it is client-only

`FontRole` goes from three members to four. This stays off the wire:
`StyleTreatment` is a shared wire type with a fixed key set and **no
`font` key**, so the font indirection lives entirely in the client
`Theme.registers` / `Theme.fontRoles` pair. The server never names a
register.

Like `chrome` today, `display` maps to **no transcript topic** — it is
chrome-only (section labels, headings, wordmark, binomials). Unmapped
topics keep defaulting to `command` (mono), the conservative default that
keeps an unclassified future topic from silently acquiring a voice.

### Fonts stay self-hosted; the handoff's `<link>` is declined

`DESIGN-SYSTEM.md` ships a Google Fonts `<link>`. Adopting it would be a
**regression**: `GlobalFonts.ts` already self-hosts subset OFL woff2 from
`public/fonts/`, and `globalFonts.test.ts` asserts the `src` URLs are
relative — no third-party CDN request at runtime. For a product whose
claim is that it is auditable, the existing arrangement is the answer, so
slate open question 5 is closed by precedent. This build generates four
new subsets and swaps the stacks.

Newsreader is requested **without** the `opsz` axis — with it the face
silently fails to load and falls back to Times.

### Shelf figures ride the pane catalogue — one entry, not one per figure

Minting a widget vocabulary beside the pane catalogue would be a second
taxonomy describing what a first taxonomy already knows — the argument
that killed `static affords` in slate § 4.2, and the one `Panes.ts` makes
about itself.

Every shelf figure is a field on the viewer's **own Avatar**, so the whole
shelf is fed by a single entry: `self`, query `me`, cardinality `one`,
with an explicit field list. Two precise server changes follow:

- `self` joins `PaneId` / `PANE_IDS`.
- `PaneDefinition.fields` widens from `'ref' | 'detail'` to
  `FieldSet | FieldAlias`. Neither alias carries standing —
  `REF_FIELDS` and `DETAIL_FIELDS` are object-description fields — while
  the subscribe path already accepts an explicit name list, so this
  widening only lets the catalogue say what the wire can already do.

⚠ Adding a catalogue row for a pane nobody opens is the antipattern
`Panes.ts` warns about. One row, one opener.

### Three standing figures are live; the rest of the catalogue hatches

`Avatar.subscribableFields` ships exactly `playStanding`, `makeStanding`
and `renown`. There is **no** `fundStanding` and no competence digest.
`Global Chrome.dc.html`'s shelf catalogue is therefore mostly not-wired,
which is precisely what the hatch is for — and why the shelf is the right
first consumer of the convention rather than a surface built after it.

Default pins come from the three that exist. No figure is hardcoded,
including "just for now."

### `makeStanding` is labelled per-character, not account-level

Convention #4 says *Make* and *Fund* are account-level because they are
things the person does. `makeStanding`'s own comment records that the
account arithmetic is **deliberately unbuilt**, so it reads per-character
today.

A shelf that labels it account-level renders a claim the server cannot
back — the honesty rule applied to a *level* rather than a value. It ships
labelled for what it actually measures. The account rollup is the
influence subsystem's work, not this build's.

### The mode indicator seam is filled read-only; the switcher is not built

`client-shell.md` names three reserved frame seams held empty "until their
own cycles, never faked", one of them a mode indicator blocked on there
being ≥2 modes. S3 shipped `COCKPIT_MODES`, and `cockpit.mode` is a real
clientState key pushed to the client — so that precondition is now
satisfied and the seam is one read.

Filling it cannot disagree with the frame, because S3 built
`cockpit.layout` as a projection painted *from* (mode, arrangement). The
**switcher**, and the frame's migration off the compat key, stay in
Wave 4.

### Pinning is a command, not client-local state

§ 3.5 and the shipped axiom — *the client owns zero command semantics*,
*every clickable previews the command it sends* — bind hardest on the
chrome that advertises them. So the shelf is a `cockpit` subcommand
writing a `cockpit.shelf` clientState key, following the established
write → save → push commit triple, and the pin control previews its
command like everything else.

A subcommand of the existing `cockpit` verb, never a new verb: standalone
verbs are for diegetic acts, and interface control is not one.

### Mobile chrome is different components, not a narrower column

`Global Chrome - Mobile.dc.html` inverts rather than narrows, and § 3.6's
rule decides each case (*interleave what is causally related, switch what
is independent*):

- **No status bar at all** — there is no hover to preview, so the command
  sheet does that job.
- **The shelf leaves the bar entirely** for a pull-down. The bar keeps the
  two fixed facts plus a single "glance-line" slot of the player's
  choosing — the only real choice on the screen. Same catalogue, same
  order, different disclosure.
- **In the pull-down the figures go two-up and large.** A phone affords
  height, never width.
- **A dropped connection takes the whole first row**, names what is held
  rather than discarding it silently, and the feed dims to say it is
  stale. A phone drops constantly and you are usually not looking.
- **Connection and identity are never removable** — the two things that
  must be true at a glance whatever else was unpinned.

### The unbuilt convention applies to this wave's surfaces only

Build the primitives; classify every figure the Wave-1 chrome renders.
Later waves apply the convention to their own surfaces as they build them.

Both carve-outs hold: **prose never hedges** (a room description carries
no engineering stamp — if a thing cannot be described yet it is not in the
room yet), and **commands refuse honestly** in the machine voice.

## Constraints

- **`GlobalFonts` mounts outside `React.StrictMode`.** A
  `createGlobalStyle` under StrictMode is injected then removed by the
  simulated mount→unmount→remount and never re-added
  (styled-components #3601), so its `@font-face` block silently never
  lands. Do not move it.
- **The cascade order survives**: theme → user overlay → plain-mode
  override. Plain mode collapses treatments to identity but **never
  strips the register** — font is structural legibility, not decoration.
- **`high-contrast`'s acceptance gate**: every coloured treatment paired
  with a non-colour cue (weight / prefix / chip / position). Legibility
  without the colour channel is the gate against colour-alone semantics.
- **Contrast is computed against `--surface`**, the tighter of each
  theme's two grounds — not against `--ground`.
- **Red never touches blue.** Every red element carries white separation;
  if it cannot, it is not brand red. Red is reserved for the seal, the
  flag rule, the single committing action per screen, and live/alert
  states. Old Glory Blue is a canton, not the whole cloth.
- **Scale**: radius 3px everywhere; spacing 4/6/9/12/16/22px; the
  `DESIGN-SYSTEM.md` type scale. Two voices on screen at once, never
  more.
- **Mobile**: tap targets never below 44px, via `min-height` with weight
  controlled by *padding* — never by shrinking the box. Safe areas 62px
  top / 34px bottom; sticky footers bleed `margin-bottom:-34px` with
  `padding-bottom:42px` so the surface reaches the edge while content
  clears the home indicator.
- **No raw CSS reaches the stylesheet engine**, and a `Treatment` keeps
  its small fixed key set. Unknown keys and unknown selector prefixes
  no-op silently.
- **Registers are mode-scoped, not frame-scoped.** Do not alternate
  grounds down a feed; the terminal is the one constant across every mode
  and never carries a mode's dress.
- **Derive every figure from the data that produces it**, and **controls
  branch on the state their copy describes** (CONVENTIONS #2, #3). Both
  were violated repeatedly in the design sessions and every instance was
  invisible until checked.
- **Never hardcode a figure**, including "just for now". Order of
  preference when an endpoint is missing: ship the surface and hatch the
  value; cut the widget if it says nothing without data; seed the world so
  the real endpoint answers.
- **Server-side module categories** hold: a new controller in
  `obj/command/shell/` with its YAML view in `cmd/shell/`; no new
  free-floating helper modules; any new Api ends with
  `SecurityApi.decorateApiClass`. See CLAUDE.md § Module Categories.
- **Worktree discipline**: stage by name, never `git add -A`; push every
  turn. Merge only through the GitLab MR.
- **Test cadence**: `pnpm test:near` for the mid-build loop, `pnpm test`
  **once** before opening the MR.

## Acceptance criteria

**Theme + tokens**

- Both grounds are selectable end-to-end: `cockpit style theme marble`
  and `cockpit style theme ink` round-trip and repaint chrome *and*
  transcript with no reconnect.
- `cockpit style theme default` refuses in the machine voice, naming the
  three known themes. No alias resolves it.
- A test asserts no hex literal appears outside the theme modules — the
  standing "component code must NEVER hardcode hex literals" rule,
  enforced rather than commented.
- A test asserts both grounds' foreground/background pairs meet their
  contrast floor **computed against `--surface`**.
- `high-contrast` still passes its non-colour-cue gate.

**Type**

- Four faces self-hosted under `public/fonts/`; `globalFonts.test.ts`
  still asserts every `src` URL is relative — no runtime CDN request.
- Newsreader loads (not Times), asserting the `opsz`-free request.
- `FontRole` has four members; both grounds and `high-contrast` supply
  all four `fontRoles` entries from the single face-stack source.
- The register mapping is unchanged in behaviour: `world.*` → narrative,
  `system.*` / `shell.diagnostic.*` → command, unmapped → command.
  `display` maps to no topic.

**Honesty**

- The three states are primitives, visually distinct, each covered by a
  test — including that the not-wired state renders `╌╌` and *no* number.
- Every figure in the Wave-1 chrome resolves to exactly one of the three;
  a test enumerates them so a new unclassified figure fails.
- The S1 guard test forbidding subscribable field names matching
  `trait|disposition|personality` passes unmodified, and no `traits`
  widget exists.
- `makeStanding` is not labelled account-level anywhere in the chrome.

**Chrome + shelf**

- `self` resolves as a pane; `PaneDefinition.fields` accepts an explicit
  field list; the shelf's subscription is opened **by name** with no
  client-supplied query.
- `playStanding`, `makeStanding` and `renown` render live values from the
  wire — the first client consumer of S1's `subscribableFields`.
- `cockpit shelf` pins and unpins, persists through a reconnect, and
  every pin control previews the exact command it sends.
- Connection and identity cannot be unpinned, on either form factor.
- The mode indicator reads `cockpit.mode`; no mode switcher exists and
  the frame still swaps off `cockpit.layout`.
- `GhostCommandLine` no longer lives in the command bar; hover preview
  appears in the desktop status bar and the command bar shows only what
  is being composed.
- Mobile: no status bar; the shelf is a pull-down with one glance-line
  slot; a dropped connection claims the first row and names what is held;
  tap targets ≥44px.

**Driven, not just green**

- ⚠ The whole chrome is **verified by driving a browser** — desktop and a
  phone viewport — not by the suite alone. Controller tests skip the
  binder, so `cockpit shelf` and `cockpit style theme` are exercised as
  typed commands against a running server.

**Docs**

- `docs/subsystems/message-rendering.md` updated: four roles, three
  themes, the `ink`/`marble` vocabulary, the theme-aware token layer.
- `docs/subsystems/client-shell.md` updated: the status bar, the shelf,
  the responsive chrome, and the mode-indicator seam now filled.
- `docs/subsystems/cockpit.md` updated: the `shelf` subcommand and the
  `cockpit.shelf` key.
- `docs/subsystems/inspection-pane.md` updated: the `self` pane and the
  widened `fields`.
- Slate § 7 marks Wave 1 shipped; slate open question 5 marked closed by
  precedent.

## Cross-references

**Seeding slate** — [client-slate](../slates/builds/client-slate.md)
(§ 3.1, § 3.5, § 3.6, § 3.7, § 5, § 7 Wave 1; open question 5)

**Design surface** — `docs/design_handoff/`: `DESIGN-SYSTEM.md`,
`CONVENTIONS.md`, `Art Direction - Civic.dc.html`,
`Unbuilt States.dc.html`, `Global Chrome.dc.html`,
`Global Chrome - Mobile.dc.html`

**Subsystem docs** —
[message-rendering](../subsystems/message-rendering.md) (stylesheet
engine, themes, font-by-register, the user overlay + `cockpit style`),
[client-shell](../subsystems/client-shell.md) (the frame, its reserved
seams, connection loss),
[cockpit](../subsystems/cockpit.md) (the one verb, mode × arrangement,
the input-mode exemption),
[inspection-pane](../subsystems/inspection-pane.md) (server-named panes),
[mql-subscription](../subsystems/mql-subscription.md)
(`subscribableFields`, the `durableKey` witness),
[topics](../subsystems/topics.md) (the five facets already in the store)

**Tails that stay tails** —
[client-shell-slate](../slates/tails/client-shell-slate.md),
[client-cockpit-slate](../slates/tails/client-cockpit-slate.md),
[message-rendering-slate](../slates/tails/message-rendering-slate.md),
[console-filtering-slate](../slates/tails/console-filtering-slate.md)

**Downstream waves** — Wave 2 Arrival (front door, intake, character
select, the account/character split); Wave 4 Play surface (the pane feed
and hold policy, the arrangement-recall decision, filters + routing, the
mode switcher, `prompt.format`); Wave 6 Social; Wave 7 Authoring
