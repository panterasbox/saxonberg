# The wizard-axis cleanup — one credential, one meaning (slate)

> **Status: PARTIAL** — W0–W3 shipped in the wizard-axis cleanup build
> (MR !525, 2026-11-05): `lint:wizard-axis` holds the list (20 files,
> shrinking only); the axis is asked in two places —
> `AccessApi.sourceWriteRefusal` (a code-file write) and `eval`; reading
> is open; `reload` is title; the code-naming gates and the founder
> committee backstop are gone; every settings key carries a tier and Tier C
> belongs to a seat. See [access.md](../../subsystems/access.md) § The two
> account axes · § The code-trust lockdown and
> [app-settings.md § The tiers](../../subsystems/app-settings.md).
> **Left:** W4 ⭐ **spoilers in code**
> **Size:** a build

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

## What shipped

The inventory, the DECIDE section, the settings keyspace, *what makes it
stick* and W0–W3 are absorbed — see the status block's pointers. Open
questions 1–4 were answered by the build (1: the code doors fold into the
one write predicate, `reload`/reads take title or nothing; 2: the
command-running spell is deleted; 3: `practice` is a test-world verb; 4:
the Tier B/C line is `AppSettingTiers`). Question 5 is answered too: the
wiki's level 3 is the `/wiki` root's owner role, never the wizard axis
(wiki.md § The capability ladder).

## What remains

- **W4** — ~~the reads/reveals~~ the reads open in the build (owner,
  2026-11-05); what remains is **spoilers in code**: source that would
  spoil the game — a puzzle's answer in a controller, a secret in a row —
  hidden from a reader the way the wiki's spoiler tags hide a page. The
  wiki's two-axis reveal model (capability deletes, appetite tags) is the
  natural substrate.


## Open questions

1. Spoilers in code: does the reveal model **delete** a spoiler from a
   source read (capability) or **tag** it (appetite), and who holds the
   capability — the content's own committee, as with a wiki namespace?
2. What marks a span of source as a spoiler — a comment convention, a
   field declaration (`spoiler:` in `fieldMeta`, which a row already
   carries for the wiki), or a path?
