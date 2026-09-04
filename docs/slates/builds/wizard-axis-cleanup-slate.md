# The wizard-axis cleanup — one credential, one meaning (slate)

> Written 2026-09-03, out of MR !231 (cooking), where a live drive
> reached for a wizard session to turn a balance dial and dressed it up
> as *"an operator act"*. The user's response — *"how many times do I
> need to repeat this because like 30 isn't enough"* — is the reason this
> slate exists rather than another one-line fix. The axis has been
> leaking for a long time and nothing in the build gates catches it.

## The rule, as stated by the user

> **Wizardness is TypeScript access. That is all it is.**
>
> — writing TypeScript into the source tree (`write`)
> — executing TypeScript (`eval`)
> — file operations on the source tree (`rm` / `mv` / `cp` / `mkdir`)
>
> *"if you add any new check for it anywhere it's almost certainly an
> anti pattern."*

Everything else is authority, and authority comes from the **seat** — a
position held, the proprietor, an office, a title over a parcel
(`AccessApi.can`). See [access.md](../../subsystems/access.md): *"a
missing authority is not a grant"*, the wizard/protowizard split, and
the standing rule that an "author tier" is a category error — capability
is title over a resource, within your extent.

⭐ **The failure mode this slate is really about.** Every leak in the
inventory below was introduced by someone who had a reason. The gate was
in the way, no authority existed for the act, and `isWizard` was the
strongest thing to hand. **The finding, every time, is that the seat is
missing — not that a wizard should do it.** A cleanup that only strips
checks and does not build seats will grow them all back.

## The inventory (complete, 2026-09-03)

### Keeps the axis — TypeScript access

| site | act |
|---|---|
| `cmd/shell/WriteController.ts:253` | `write` — TS into the source tree |
| `platform/cmd/author/eval.yaml` | `eval` — executes TS |
| `cmd/shell/RmController.ts:118` · `MvController.ts:96` · `CpController.ts:101` · `MkdirController.ts:70` | source-tree file operations |

### ⚠ Same substance, different door — DECIDE, do not assume

Each of these reaches TypeScript or the source tree by another route.
They are listed as a question, not a verdict: **does the door fold into
the `write`/`eval`/file-ops gate, or does it take a named authority of
its own?**

| site | what it actually reaches |
|---|---|
| `cmd/author/reload.yaml` | re-executes modules — TS execution, no write |
| `cmd/system/git.yaml` + `api/GitLogic.ts` ×6 | version-controls the source tree; `publish`/`revert` WRITE it |
| `cmd/author/cms.yaml` + `api/CmsLogic.ts` ×2 | writes source files; already `isWizard` **AND** `can(write, path)` |
| `cmd/author/studio.yaml` + `api/StudioLogic.ts` ×2 | same shape as CMS |
| `api/TemplateLogic.ts:153` | `class` / `hydratorClass` / `brain` template fields — content that names CODE |
| `api/DocumentLogic.ts:226` | the command-view code gate |

⚠ The CMS/Studio/Git conjunction (`isWizard` AND `can`) is the shape
worth studying before deciding: the wizard half answers *may you touch
code at all*, the `can` half answers *may you touch THIS*. If the answer
is "fold them in", the fold should keep both halves.

### ✗ Must lose the axis — a wizard is getting authority that isn't theirs

| site | the authority it is really asking about | the seat |
|---|---|---|
| `duncan-hall/cmd/provision.yaml` · `unprovision.yaml` · `mayfield-row/cmd/lease.yaml` · `unlease.yaml` — `ProvisionController.ts:208`, `LeaseController.ts:151` | leasing out a building | **already built** — agent of the owner group (Katie, Walter). `if (await AccessApi.isWizard(actor)) return true;` sits ABOVE the working seat check. Delete the line. |
| `cmd/system/config.yaml` | retuning the world | **split the keyspace** — see below |
| `api/MagicLogic.ts:1670` (`execScript`) | running arbitrary commands through `forceCommand`, as a SPELL | ⚠⚠ its own comment calls it *"the one non-diegetic gate"*. This is a command-injection primitive in a spell costume; the question is whether it should exist, not what gates it. |
| `cmd/author/practice.yaml` | writing fabricated Transcript deeds | a dev harness. Should it ship at all? |

### ? Reads and reveals — decide what they should key on

| site | what it changes |
|---|---|
| `WikiRenderer.ts:282` | `isWizard → reveal level 3` (spoiler tier) |
| `WikiRegistry.ts:782` | wiki edit |
| `cmd/system/ErrorsController.ts:90` · `api/DiagnosticLogic.ts:250,305` | the `errors raw` tier — stack traces, source paths |
| `services/auth/AuthRoutes.ts:184` | populates `response.isWizard` so the client renders differently |

`requiresArchwizard` on `cmd/author/wizard.yaml` is the one place the
axis is the **subject** rather than the gate (conferral). Out of scope
unless the cleanup changes what is conferred.

## ⭐⭐ The settings keyspace — the sharp end

`config` reaches **361 keys** behind one `requiresWizard`, and
[measurement.md](../../measurement.md) already has the model that
resolves it:

| tier | amendable by | example keys |
|---|---|---|
| **B** — editorial commitments | **whoever ships the code** (the AGPL right to fork is the check) | `freshness.muMaxPerHour`, `combat.*`, `response.*` |
| **C** — policy | **the polity, through the Compact** | `banking.salesTaxRate`, `banking.onboardingStipend`, `banking.corpoRoyaltyRate`, `retail.consignment.commissionRate`, `banking.withdrawalDailyCap` |

Tier C names, verbatim: *"monetary policy — the wage rate, the reserve's
mandate"* and *"taxes and levies"*. **So a wizard can currently set the
sales tax rate, unilaterally, with no record anywhere.** The doc's own
warning is that *"a build that hardcodes one of these has made a
political decision by accident"* — this is worse than hardcoding,
because it is settable by the wrong party.

**The shape of the fix, and it is not a new permission axis.** Minting a
settings credential would be the author-tier category error again. Instead:

1. **Tag each key in `AppSettingKeys` with its tier.** It is already the
   single source of truth for the vocabulary, so the tag has an obvious
   home and `gen:schema`-style tooling can enforce totality.
2. **Tier B → `config`, unchanged.**
3. **Tier C → unreachable from `config`.** It belongs to an office
   through the governance surface, and it lands in the record like every
   other polity decision.

⭐ Step 3 is the part worth wanting: it turns the tax rate from a config
key nobody can see into **a thing the polity argues about**, which is the
product thesis rather than a chore. The amendment library is the natural
consumer.

⚠ **The classification of 361 keys is a design conversation**, and the
B/C line will be contested for the interesting ones (is a wage FLOOR
editorial or political?). Budget for that; do not let a build guess.

## What makes it stick

The reason this recurs is that **nothing catches it**. Every gate in the
lint family checks structure; none checks *which axis a gate is on*. Two
candidates, both cheap:

- **`lint:wizard-axis`** — an allowlist of the sites permitted to call
  `isWizard` / carry `requiresWizard`, in the shape of `lint:boundary`'s
  exemption lists: short, readable, and a NEW entry fails CI so adding
  one is a conversation. The list is the four TypeScript doors plus
  whatever the DECIDE section resolves to.
- **A tier-totality check on `AppSettingKeys`** — every key carries a
  tier, no exceptions, same shape as `lint:topics`' totality gate.

The first one is the whole point of the slate. Without it this is a
cleanup that decays, and the next build reintroduces a check with a
reason.

## Sequencing

- **W0** — `lint:wizard-axis` with today's sites allowlisted verbatim.
  Nothing changes behaviour; the list becomes visible and additions get
  caught from here on.
- **W1** — the unambiguous deletions: the four lease/provision bypasses
  (the seat already works), and a decision on `MagicLogic.execScript`.
- **W2** — the DECIDE section: fold the code-doors into the TypeScript
  gate, or name their authorities. Shrink the W0 allowlist accordingly.
- **W3** — the settings tier split: tag the keyspace, route Tier C to an
  office, add the totality check.
- **W4** — the reads/reveals, which are the least urgent and the most
  arguable.

## Open questions

1. Do the code-doors (`reload`, `git`, `cms`, `studio`, `TemplateLogic`,
   `DocumentLogic`) fold into the TypeScript gate, or take named
   authorities?
2. Should `MagicLogic.execScript` exist at all?
3. Should `practice` ship outside dev?
4. Where is the Tier B/C line for the contested settings?
5. Does a wizard see spoilers (`WikiRenderer` level 3) because they can
   read the source anyway — i.e. is that reveal honest, or theatre?
