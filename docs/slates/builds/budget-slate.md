# Budget — the game keeps its own books

**Status:** design surface, 2026-09-04. Not scoped to a build yet.

The game should keep its own books. Today it doesn't: the record is a
credit card statement. There is no legal entity yet and no bank account
of its own — both are a ways off — but the bookkeeping practice should
start before the costs get complicated, because the moment they get
complicated is the moment you can no longer reconstruct them.

## The numbers, as of 2026-09

| | monthly | scales with |
|---|---|---|
| AWS — Lightsail + Caddy + Atlas M0 + Route 53 | **~$11** ([deployment.md § Cost](../../deployment.md)) | the world **running** |
| Claude | **$200** | the world being **made** |
| Descript (video) | *not yet recorded* | **promotion** |

Two observations that shape everything below.

**Infrastructure is a rounding error.** Running the realm is ~5% of the
spend; authoring it is ~18× that. A budget that watches the $11 and
ignores the $200 is watching the wrong number.

⭐ **And one of these is about to change category.** When LLM NPCs ship
([llm-content-slate](./llm-content-slate.md)), inference becomes a cost
incurred *because the world is running* — per conversation, per parcel,
scaling with play. That is Claude spend crossing from **productive** to
**metabolic**, and it is the real reason to build this now: a card
statement can tell you the month's total, and nothing else. Only the
runtime knows which NPC spoke, where, and for how long.

## ⚠ Guardrails — decide these first, they constrain the whole design

1. **Not diegetic.** This lives on the **metaresource** plane, with
   compute. No in-fiction treasury, no theming, no costume. (This has
   been a repeated error: compute is machine-level and outside the
   fiction, and so is money that is denominated in dollars.)
2. **USD never touches `bank_ledger`.** Real dollars and in-game
   currency are different substances. The conservation chokepoint
   exists to keep game money honest and must never learn about real
   money — no exchange rate, no bridge, not ever. See
   [banking.md](../../subsystems/banking.md).
3. **No new Mongo collection.** Per the standing rule, parcel-local
   persistence is the document tree under the owning path.
4. ⚠⚠ **Contributions confer nothing.** The moment real money is
   visible and attributable, it is one step from buying standing —
   which Art. I §2 forbids and no amendment can permit. The LLM-NPC
   design already solved the analogous problem and the rule
   generalizes: **a patron funds the world, never their position in
   it.** A budget surface may show that money arrived; it may not let
   it purchase anything.

## The tool — don't write an accounting engine

**Plain-text accounting**: the books are a text file, edited like
source. Each transaction names a date, a description, and the accounts
money moved between; the tool computes the reports. Real double-entry,
so a bookkeeper can pick it up at incorporation.

```
2026-09-01 * "Descript" "Video subscription"
  Expenses:Growth:Video        24.00 USD
  Liabilities:CreditCard
```

Three candidates, all free and mature:

| | **Ledger** | **hledger** | **beancount** |
|---|---|---|---|
| what | the 2003 original, C++ | Haskell reimplementation | Python, separate lineage |
| syntax | permissive | permissive | **strict** — accounts declared before use |
| errors | lets them through | middling | **refuses to load a broken file** |
| query | CLI reports | CLI + JSON | ⭐ **BQL**, SQL-like |
| UI | none | terminal + web | ⭐ **Fava**, a real dashboard |
| CSV import | third-party | ⭐ built-in rules engine | separate importer |
| docs | terse | ⭐ excellent | good, technical |

**Leaning: beancount + Fava.** The query language matters because the
runtime surface *is* a query, the dashboard is worth a lot to someone
who has not kept books before, and the strictness is a feature while
learning — it refuses the exact mistakes a beginner makes. hledger is a
defensible alternative on the strength of its CSV importer, which
matters when the current books are a card export. The formats are close
enough that switching later is a day, not a migration.

*(GnuCash is the GUI alternative. Rejected: the books would not be in
git and the runtime could not read them.)*

## ⭐⭐ The architecture: authored journal → generated export → runtime reads

Both tools are a Python or Haskell binary. The runtime is Node, and the
mudlib may not touch the filesystem or spawn processes (the import
boundary, `lint:imports`). Making the server shell out to `bean-query`
would put a language runtime and a binary dependency on the Lightsail
box to serve a three-line-a-month bookkeeping problem. Bad trade.

The way out is an idiom this codebase already runs everywhere —
**authored source + generated table + a gate that checks they agree**,
exactly how 48 schema YAMLs generate `Collections`,
`COLLECTION_POLICIES` and `RESET_DISPOSITIONS`:

1. **The journal is authored** and committed. It is the source of truth.
2. **You keep books locally** with beancount + Fava — the real tool,
   with the real dashboard, on your machine.
3. **A script exports derived JSON** with a do-not-edit banner,
   committed alongside.
4. **The runtime reads the JSON** through `SourceTreeApi.readJsonResource`.
5. **A lint checks the export is current** with the journal, the way
   `lint:schema` gates its three generated tables.

The deploy box needs nothing: no Python, no vendor API, no OAuth, no
secrets, no network call at boot. And the books get code review, which
is a strange sentence that turns out to be a good idea.

## ⭐⭐ The chart of accounts is the executive

The natural organizing axis is not accounting buckets — it is **who
spent it**. An expense category is an **office**: Descript is the
growth/marketing secretary's line, AWS belongs to whoever holds
infrastructure, inference to whoever holds the world's operation.

This is consistent with the governance model's own rule — authority
lives in **seats**, never in the founder
([civics.md](../../subsystems/civics.md),
[governance.md](../../subsystems/governance.md)) — and it gives the
chart of accounts a shape the polity can read and eventually argue
with, rather than one only a bookkeeper can. It also means the founder
wearing four hats shows up honestly as **four seats one person
currently holds**, which is what it actually is.

⚠ **The consequence, eyes open:** one budget means all of it is the
game's business, including subscriptions that are currently just a
personal card. That is a defensible choice and it is also a door that
is hard to close later.

## The write path — the runtime as a producer of cost data

Today every entry is typed by hand once a month: three recurring
subscriptions and a small variable bill. That is fine and it does not
need automating.

⭐ But inference is different in kind, and the design should anticipate
it rather than be retrofitted: **the runtime is the only thing that
knows what an NPC conversation cost.** A cost event carrying (when,
which parcel, which office's line, how much) is the shape; whether it
posts to the journal directly, accrues and is reconciled monthly
against the real invoice, or merely *reports* usage for a human to
enter — is open, below.

## Lens pass

1. **Pedagogy** — ⭐ better than expected. Real double-entry in a real
   format is a real discipline, and a world whose own books are open
   and honest is a worked example of one. There is a plausible
   Discipline here (accounting/stewardship) and a plausible teaching
   surface later: the polity reading a budget is civics with numbers.
2. **Creative expression** — thin. This is operator infrastructure. The
   one authorial surface is the chart of accounts, which authors
   don't touch.
3. **Immersion** — deliberately **none**. Guardrail 1: the metaresource
   plane has no fiction, and any immersion here would be a bug.
4. **Values** — ⭐⭐ the strongest lens. The Compact claims the state's
   doings are visible, and right now **the state has no books at all**.
   Publishing what it costs to keep the world running, by office, is
   that claim made actual. The choice it forces on the operator is a
   real one: transparency about money is the hardest kind.
5. **Epochs** — n/a. Dollars are dollars.

## Open questions

1. **beancount or hledger** — leaning beancount; hledger's CSV importer
   is the counter-argument.
2. **Where do the books live?** A document tree root — `/compact`
   (the polity's business), `/studio` (the operator's), or a new one.
   The office-based chart argues for `/compact`, which is also the
   most exposed choice.
3. **Who may read it?** Everything, publicly? Aggregates public and
   detail held? Read policy is `canAtPath`, so this is a title
   question, not a new mechanism.
4. **What is the runtime surface?** A `budget` verb, a card, a Fava
   link, or simply a document you can `read`. The cheapest honest
   answer may be the last one.
5. **Does the inference write path ship in v1**, or does v1 read a
   hand-kept journal and the producer arrive with LLM NPCs?
6. **Accrual vs cash** — a subscription is billed monthly; inference is
   incurred continuously. Cash basis is simpler and adequate for now;
   accrual is what makes per-parcel inference cost meaningful. This is
   the one question with a real accounting answer rather than a
   preference.
7. **What happens at incorporation?** The journal should survive it
   unchanged — that is much of why plain text wins — but the entity,
   the bank account and (maybe) a SaaS with a bank feed arrive
   together, and it is worth knowing which of them replaces what.

## Cross-references

- [deployment.md § Cost](../../deployment.md) — the AWS figures
- [banking.md](../../subsystems/banking.md) — the wall this must not cross
- [measurement.md](../../measurement.md) — what may be counted, and who
  says what it is worth; publishing the books is a Tier B editorial
  commitment
- [civics.md](../../subsystems/civics.md) ·
  [governance.md](../../subsystems/governance.md) — seats, and why the
  chart of accounts is shaped like the executive
- [llm-content-slate](./llm-content-slate.md) — the sponsorship rule,
  and where inference-as-metabolic-cost comes from
- [broadcast-patronage-track](../../tracks/broadcast-patronage-track.md)
  — the consumer of this, if contributions ever become visible
- [document-store.md](../../subsystems/document-store.md) — where the
  books would live, and the `canAtPath` read gate
