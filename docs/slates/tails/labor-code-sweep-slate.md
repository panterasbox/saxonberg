# Labor code sweep — the code says `labor` where the docs already do

> **Status: UNBUILT** — the docs renamed the Compact's creation kind of influence from
> *producer* to **labor** on 2026-10-31 (the owner: *"labor is canonical"*); prose says labor,
> code identifiers still say `producer` → [influence.md](../../subsystems/influence.md),
> [glossary](../../compact/governance/glossary.md)
> **Left:** the influence stock value · the Api, logic singleton, standing and event classes ·
> the two collections and their schema docs · the settings keys and the constitution's
> parameter key · the Speaker's office key and title · the tests · the identifier note in
> influence.md, deleted · the docs' backticked identifiers, renamed to match
> **Size:** a tail — one refactor sweep, any build worktree, no design left

## Why

The manifesto has always said **labor · capital · consumer** and *make · fund · play*; the
draft constitution and the code said *Producer House* and *producer*. The owner ruled labor
canonical, and the docs moved first (MR on `design/2026-10-31-labor`). The code is the
remaining half. ⚠ Not every `producer` in the code is this one — Scene, card, diagnostic,
accountability, energy and pack-boot "producers" are a different word and stay.

## What renames

| what | today | becomes |
|---|---|---|
| the influence stock value | `'producer'` (`InfluenceApi`, `influence.ts`'s roll-up table, `ConsumerLogic`, `ProfileLogic`, `InfluenceStanding`) | `'labor'` |
| the Api | `ProducerApi` (`api/producer.ts`) | `LaborApi` (`api/labor.ts`) |
| the logic singleton | `ProducerLogic` (`/platform/idea/api/producer`) | `LaborLogic` (`/platform/idea/api/labor`) |
| the standing classes | `ProducerStanding`, `ProducerStandings`, `ProducerEvent` | `LaborStanding`, `LaborStandings`, `LaborEvent` |
| the collections | `producer`, `producer_events` (+ `schema/producer.yaml`, `schema/producer_events.yaml`) | `labor`, `labor_events` — `pnpm gen:schema`, `lint:schema` |
| the settings | `producer.*` (`bucketSeconds`, `decayHalfLife`, …) in the platform pack's `settings/producer.yaml` | `labor.*` |
| the constitution's parameter | `merit.producer_bank_cap` | `merit.labor_bank_cap` |
| the Speaker | `speaker-producer-house`, *Speaker of the Producer House* (`Office.ts`) | `speaker-labor-house`, *Speaker of the Labor House* |
| the tests | `ProducerLogic.*.test.ts` and their fixtures | renamed with their subjects |

- ⚠ **The collections rename drops the dev databases** — the standing rule (no migrations;
  a rename is a drop). Nothing live depends on standing yet (it begins at launch).
- **Afterwards:** delete influence.md's note that code still says `producer`; rename the
  docs' backticked identifiers (influence.md, participation.md, renown.md, sandbox.md,
  identity.md, app-settings.md, governance.md, the cooperative, legal-code,
  api-normalization, antecedents and value-object-statics slates); the glossary row's
  *"pending a code sweep"* clause goes.
- **Hot reload and module ids:** the logic singleton's template path changes with its
  file; `lint:instanceable` and `lint:family` say whether anything else named it.

## The drive

1. `instant` · player — `standing` (the social verb) shows the labor line, named *labor*.
2. `instant` · staged — author content another character engages with; the labor standing
   moves, and the event lands in `labor_events`.
3. `instant` · player — `office` lists *Speaker of the Labor House*.

## Cross-references

[influence.md](../../subsystems/influence.md) ·
[draft-constitution.md](../../compact/governance/draft-constitution.md) ·
[glossary](../../compact/governance/glossary.md) ·
[cooperative-slate](../builds/cooperative-slate.md)
