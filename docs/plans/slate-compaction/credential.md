# Slate compaction ledger — batch: credential

Slates: `docs/slates/builds/acquisition-slate.md`,
`docs/slates/tails/credential-wallet-slate.md`.
Insert-doc: `docs/subsystems/credential.md`.

Verification method: grepped `packages/server/src/mud/**`,
`packages/content/**` for the mechanisms each slate names, read
`credential.md`, `fasttravel.md`, `banking.md`, `boundary.md`,
`char-gen.md`, `client-shell.md`, and diffed against the slates.

## `docs/slates/tails/credential-wallet-slate.md` — 132 → 0 (DELETED) · Status PARTIAL → ABSORBED

Two status blocks present (canonical `**Left:**`/`**Size:**` block, plus
a long narrative "core SHIPPED 2026-06-27" block). Kept the canonical
one; the narrative's substantive content ("the smell," "the fix in one
line," what shipped vs. the sketch) is already stated in
`credential.md`'s own opening paragraph, so it added nothing new.

### Cut (SHIPPED · DOCUMENTED)
- `## The shape` → `Credential — one value-object, not a mixin` — code:
  `packages/server/src/mud/lib/credential/Credential.ts`; doc:
  `credential.md` § "The records".
- `## The shape` → `CredentialWalletMixin — one holder…` — code:
  `lib/credential/CredentialWallet.ts`; doc: `credential.md` § "The
  holder".
- `## The shape` → `Smart consumers stay in the subsystems…` — code:
  `BankingLogic`, `FastTravel*Controller` resolve-the-holder call sites;
  doc: `credential.md` § "Consumers". (The `AccessApi` /
  deputization-via-MQL-group bullet inside this section describes a
  consumer that was never built — grepped `deputiz` across
  `packages/server/src/mud` and `packages/content`, zero hits — folded
  into the Deferred pointer instead of kept as a live claim.)
- `## Scope` (`In:`/`Out (this pass):`) — superseded by what actually
  shipped (the build did the "Out" list's work — migrating payment/
  travel — and skipped the "In" list's deputization); already stated as
  such in `credential.md`'s Deferred intro. Cut.
- Open dial 1 (born-with or acquired) — code:
  `Avatar.installDefaultLoadout` (`platform/agent/Avatar.ts:1123`)
  injects `CredentialWalletUpdate` unconditionally; doc: `credential.md`
  § "The three holders". Resolved born-with, as leaned. Cut.
- Open dial 2 (thin holder Api) — code: no `CredentialApi` class exists;
  `lib/lock/Lock.ts:15` comment names it "the retired `CredentialApi`".
  Doc already says so in its Deferred list. Resolved (decided against,
  not merely undone). Cut.

### Superseded — cut
- `## The shape` → `One card, polymorphic on its record` — shipped
  differently and deliberately (two thin per-kind `CredentialCard`
  subclasses, not one polymorphic class) — `credential.md` § "The three
  holders" explains why (`self`/`inventory` affordance is static-by-
  class today). Superseded by the code; the still-open remainder ("waits
  on per-instance affordance") is already the doc's own Deferred bullet.
- `## Why it lands thematically (§8)` — the mechanism it explains
  (presentation-not-source-of-truth) shipped; the *why* (identity-blind
  aether, the personhood-as-paperwork theme) was undocumented in
  `credential.md` until this pass — see Graduated below, then cut.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- The §8 "why a credential is a presentation, not a source of truth"
  reasoning — inserted as `credential.md` § "Why a presentation, not a
  source of truth (§8)" (new section, ~9 lines), ahead of "The records".

### Kept (UNBUILT) — then re-graduated
- Open dial 3 (authorization-ledger home: shared vs. per-issuer) — code:
  grepped `authorization_events`, no ledger of any shape exists (v1
  records are their own source of truth, confirmed by `credential.md`'s
  own Deferred bullet). Genuinely still open. First kept verbatim in the
  slate as a trimmed "Open dial" section, then — since nothing else
  survived in the file — folded into `credential.md`'s existing
  "issuer-authorization ledger" Deferred bullet instead, so the slate
  could be fully retired rather than left as a one-bullet stub.

### Doctrine — folded into the doc, not kept as a stub
- The `## Cross-references` "First tenant / driver" line (the EU murder
  arc's proctors-office pathway,
  `eternal-university-narrative-slate.md` §14) — moved verbatim into
  `credential.md`'s deputization Deferred bullet so the pointer survives
  the file's deletion.

### Fixed dangling link (in my insert-doc, per the skill's "code proves
false" allowance extended to a link I broke by deleting this file)
- `credential.md`'s own `## Cross-references` linked to this slate; the
  link is removed now that the file is gone (nothing else in that
  bullet was salvageable — it was a bare "see the deferred portion
  above" pointer).

⚠ Not fixed (outside this batch's file list): `docs/slates/README.md`
and `docs/staging/eternal-university/experiences/registrar.md` both
still link `credential-wallet-slate.md`. The skill reserves index files
for the sweep; `registrar.md` is staging content, outside my assignment
— noted here for the coordinator.

### Status block
- Left: "deputization as a native tenant · the issuer-authorization
  ledger … · a single polymorphic `CredentialCard` … · a thin
  `CredentialApi`" → (empty; deputization + the ledger + the single-card
  question all now live in `credential.md § Deferred` directly, and the
  `CredentialApi` question is resolved-as-retired)
- Size: a tail → (absorbed)

## `docs/slates/builds/acquisition-slate.md` — 169 → 181  · Status PARTIAL → PARTIAL

One status block (no duplicate found). Grew rather than shrank: two
rulings turned out to be SUPERSEDED-by-shipped-code in ways worth
explaining in place (a ruling that got a *broader* result than asked
for is not obvious from a one-line "superseded" note), so the notes
replacing them are longer than the rulings they replaced. Net document
is still smaller in remaining-open-work terms — one whole Left item
dropped.

### Superseded — cut (shipped, in each case differently than ruled)
- Ruling "Dorm access digitizes now" (wallet record only, no physical
  key object) — code:
  `packages/content/eternal-university/src/duncan-hall/idea/cmd/ProvisionController.ts:148`
  calls `new Lock(keyway, tech).issueKeyTo(target)`;
  `packages/server/src/mud/lib/lock/Lock.ts` `issueKeyTo` hands out
  **both** an implant-keychain `KeyCredential` entry **and** a physical
  `Key` Thing (`addToKeychain` + a cloned `Key`). The ruling asked for
  wallet-only; the shipped mechanism is broader (both forms, because the
  physical key is "the durable form" per the code's own doc comment).
  Replaced in place with a struck-through ruling + a note, rather than a
  bare one-liner, because "shipped but broader than asked" is exactly
  the kind of divergence a future reader would otherwise assume was
  simple confirmation.
- Ruling "TravelCard stays physical at intake" — code:
  `packages/content/terminus/src/terminal/agent/TicketClerk.ts` +
  `packages/content/tpa/src/idea/cmd/tpa/ProcureCardController.ts`
  (`procure card` clones a `TravelCard`); doc: `credential.md` § "The
  three holders". Cut with a shipped-pointer inline (kept the
  "digitization is optional" doctrine half, which is still the design
  rule going forward, not a completed/superseded fact).

### Kept (UNBUILT) — verified against code
- Ruling "Forums leaves the free bundle" — code:
  `platform/agent/Avatar.ts:1178-1179` still unconditionally clones
  `ForumsUpdate` in `installDefaultLoadout`. Not shipped; kept, and the
  status block's `Left` still names it.
- Ruling "Hiring requires the payment credential" — code: grepped
  `AppointController.ts` + `EmploymentLogic.ts` for any payment-
  credential gate at hire time; the only payment-credential code near
  employment is `issueHouseCardImpl` (dealing an NPC purchaser a house
  card), unrelated to gating a *player's* hire on already holding one.
  Not shipped; kept.
- Ruling "No physical conferral certificate" — code: grepped
  `conferral` broadly; every hit is the advancement/employment
  "conferral" concept (a standing grant), not a registrar
  certificate-of-graduation object or credential kind. Nothing built
  either way; kept.
- Ruling "No NPC DMs shoved at newcomers" (Limen/Gus doctrine) — code:
  grepped `Limen` (zero hits anywhere) and `Gus` (no NPC by that name;
  only incidental substring hits in unrelated content files). Kept.
- `## The rosters`, `## Hardware`, `## The first-login journey v2` — all
  still design/content surface; the named mechanisms not yet built
  (Limen, Gus's greeter-role sheet, the registrar certificate, the
  proctors' deputization) are confirmed absent from the tree above.
  Kept verbatim, including the doctrine framing paragraphs.

### ⚠ Flagged, not resolved (per the coordinator's instruction)
`## The first-login journey v2` is the section the `char-gen` batch's
ledger flagged a tension with (Dr. Limen's checklist model vs. this
slate's need-fired pivot — "Onboarding dissolves; Limen goes quiet").
Left untouched, per instruction — this ledger only notes where the
slate touches it; requirements reconciles it.

### Uncertain — kept
- `## Open items` → "`presentsKey` wallet-read depth + the dorm-key
  migration" — the dorm-key migration half is now shipped (see
  Superseded above); the "wallet-read depth" half is unclear: the
  shipped resolution is `Lock.opensFor`'s MQL `person`-pool scan
  (base-agnostic, "one scan, either base" per `credential.md`), which
  *may* already satisfy whatever "depth" concern this bullet meant, but
  I could not confirm the original concern's scope from the slate text
  alone. Kept whole rather than guessing which half to cut.

### Handoff (belongs in a doc outside my list)
- None found. Everything either stayed in the slate (unbuilt) or landed
  in `credential.md` (in my list).

### Finding (not fixed — outside my file list)
Two source-code doc comments are stale against the OO sweep's API
retirement: `packages/content/eternal-university/src/duncan-hall/idea/DormDoor.ts:14`
and `packages/content/residence/src/idea/KeyedDoorExit.ts:6` both say
"found by `CredentialApi.presentsKey`", but `CredentialApi` was retired
and the mechanism is now `Lock.opensFor` (confirmed in
`lib/lock/Lock.ts`'s own doc comment: "the retired `CredentialApi`").
Source-code comments are outside this batch's file list (slates +
`credential.md` only) — noted here for whoever owns that sweep.

### Status block
- Left: "forums leaving the default loadout · the `dorm-key` record +
  the `presentsKey` wallet read · the payment credential required at
  hire · the conferral certificate · Dr. Limen · the journey-v2 route"
  → "forums leaving the default loadout · the payment credential
  required at hire · the conferral certificate · Dr. Limen · the
  journey-v2 route" (dropped the dorm-key item — shipped, differently)
- Size: a build → a build (unchanged)


---

## Coordinator (2026-09-20)

- `docs/staging/eternal-university/experiences/registrar.md` l.129 — the
  link to the deleted wallet slate re-pointed at `credential.md § Deferred`
  (a staging doc, not an index; `slates/README.md` is the sweep's).
- Finding for a code session: `DormDoor.ts` and `KeyedDoorExit.ts` doc
  comments still name `CredentialApi.presentsKey`, retired for
  `Lock.opensFor`.
