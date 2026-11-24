# Template-scan exceptions — what each sanctioned search should be instead

> **Status: UNBUILT — AUDIT CAPTURED 2026-11-23** (stream arrival, after the owner caught the app
> store scanning content). Census: **25 sites in 21 files**, `lint:template-scans` 25/25.
> **Left:** the owner's ruling on the principle (§ 1). Then, for each suspect entry (§ 3–§ 5), the
> mechanism that replaces its scan, and lowering the ceiling one entry at a time.
> **Size:** a sweep. Each entry is small and lands on its own; together they are a build.

Related: [lint-family.md](../../lint-family.md) (§ census then ratchet; ratchet lesson 4);
`packages/server/scripts/check-template-scans.ts` (the allowlist and its reasons);
[document-store.md](../../subsystems/document-store.md) (kinds, `words:`, catalogues);
[content-packs.md](../../subsystems/content-packs.md) (what a pack declares at install);
[stream-arrival plan](../../plans/stream-arrival-plan.md) (the app store, the case that started this).

---

## 0. What happened

The stream-arrival build needed an app store. Its first version found apps by searching the
template table for rows under `…/idea/app/`. A second version searched for rows that said
`published: true`. Both got the lint to pass by adding an allowlist entry under the "keyed
dictionary's lazy warm" heading.

The owner, on both:

> *"if you think you're gonna do it by matching template paths to /app/ thats just stupid.
> template paths arent what make an app an app."*

> *"so you're scanning content? because thats what the lint is there to prevent. if a content pack
> wants to publish an app it should do so with a special document that it publishes, or if it's not
> a document but an actual Stuff we have patterns for Stuff to register itself with singletons that
> track that shit. but none of that is content scans. … if we did need to tie something to content,
> it shouldn't be done with a scan, it should be done by a specifc declaration in content that says
> 'when this get installed, x also needs to happen' so it happens with the publish not a scan after
> it. … I'm wondering if there's other 'exceptions' to the rule that are doing stupid things"*

The store now reads `app-listing` documents a pack publishes (`614fa552f`). Name clashes are
refused at install through the kind's `words:`. It searches nothing. This slate asks the same
question of the other 25 entries.

## 1. The principle (to ratify)

**What content belongs to a list is declared when the content is PUBLISHED, never found afterwards
by searching.** There are three shipped shapes for the declaration. Pick the first that fits:

1. **A document the pack publishes.** A kind in `DocumentKinds` whose files the pack ships under
   `content/<dir>/`. Documents exist to be read by kind or prefix (`DocumentApi.listOfKind`, a
   catalogue's `all()` / `byWord()`). A kind with `words:` settles a name clash at install.
   Precedents: `app-listing`, `formation`, `recipe`, `operation`.
2. **A Stuff that registers itself** with the singleton that tracks its kind, when it stands up.
   The singleton holds what has registered and searches nothing. This fits rows that are
   instanced anyway.
3. **An install-time declaration.** The pack manifest or the row says *when this is installed,
   also do X*, so the work happens at the publish (the installer's reconcile), never as a later
   search. The manifest's `boot:` and `requires:` are the shape.

**A search of the template table is legitimate only for a TOOL**, where finding things is the job:
`ls`, `grep`, the CMS, the sandbox's own circle, and the installer reading its own work.

⚠ The gate's own header names more homes than that, including *"a typed-word dictionary's own lazy
warm"* and *"a water system compiling its own index"*. ⚠ The app store used the first of those to
pass. By the principle above, those headings ARE the exceptions to audit, not homes. Rewrite the
header once the owner rules (ratchet lesson 4: when a gate's prose supplies the justification, fix
the prose).

## 2. Probably sound — tools and the installer (9 sites)

| site | what it searches | why it may stay |
|---|---|---|
| `cmd/shell/LsController.ts` ×2 | descendants of `/` and of the path | `ls` is a tool; listing is its job |
| `cmd/shell/GrepController.ts` | descendants of a path | `grep` is a tool |
| `api/CmsLogic.ts` | descendants of a path | the CMS tree view |
| `api/SandboxLogic.ts` | descendants of the circle's path | a circle reading its own authored rows |
| `api/TemplateLogic.ts` | `_descendantsOf` | the installer's validators and `mv` / `rm` |
| `backend/BootstrapManager.ts` | descendants of a boot prefix | boot expanding its own manifest entry (held by `lint:boot-entries`) |
| `lib/wiki/components/composition.ts` | descendants of `/` | the wiki's composition page, an author tool |
| `LocationGraphRegistry.ts` | ⚠ `findByPathInfix('/')`: the WHOLE table | the world's index of its own shape. ⚠ Still a whole-table read. Is it rebuilt only at install (then it belongs in the install step, shape 3), or at boot or on demand? Check before keeping it. |

## 3. Suspect: the "lazy dictionaries" (8 files, 9 sites)

Each finds content by searching for it. Each is a list the packs could declare instead.

| site | what it searches | proposed instead | first question |
|---|---|---|---|
| `ReadingCatalogue.ts` | rows by infix `Reading.PATH_INFIX` | **1** — a reading is metadata a pack ships; a document kind with `words:` (the channel is the word) | does anything shadow or instance a Reading? If not, it was a document all along ([[document-not-idea-for-metadata]]) |
| `SpellCatalogue.ts` | `findByClass(Spell)` | **1** or **2** | is a spell instanced? |
| `DisciplineCatalogue.ts` | `findByClass(Discipline)` | **1** — the discipline catalogue is a list of named things with words | the advancement transcript cites disciplines by path, so a cite already loads one; is the whole roster ever really needed? |
| `CorpoCatalogue.ts` ×2 | descendants of the corpo and brand roots | **1** or **3** — a corpo is a handful of precious rows ([[corpos-are-a-handful-of-megacorps]]) | who needs ALL corpos, as opposed to the one a brand names? |
| `GovernmentCatalogue.ts` | descendants of each government root | **2** or **3** — a government stands with its locality | a locality already declares its jurisdiction (civics.md); follow that reference instead |
| `AddressRegistry.ts` | descendants of each address root | **3** — an address is a fact the row declares (`_address:`); the installer could file it at reconcile | is the reverse lookup (address → place) the reason for the scan? If so, the index is built at install, not by search |
| `MaterialCatalogue.ts` | infix `/idea/material/` | **1** or **2** — materials already load per row by their doors (CLAUDE.md); only the roster (`MaterialApi.all()`) scans | who calls `all()` / `findByTag()`, and does any of them need EVERY material? (The wiki listing and a pattern's metals, per the file.) |
| `ConditionCatalogue.ts` | infix `CONDITION_INFIX` | **1** or **2** | the roster a body awaits in `onCreate`: does a body need every condition, or only the ones it can have? |

⚠ The app store's own mistake belongs here: it used this heading to pass. These entries were
allowlisted under the same reason, and the reason is the thing in question.

## 4. Look at: "systems compiling their own index" (4 files, 6 sites)

| site | what it searches | note |
|---|---|---|
| `water/…/WatercourseCatalogue.ts` ×2 | descendants of the watercourse root and the locality root | the water system's courses, and the localities draining to them. ⚠ The second reads OTHER content (localities) by search; a locality that drains to a course could declare it (shape 3) |
| `transport/…/LaneCatalogue.ts` ×2 | descendants of the lane and service-route roots | under its own namespace. Shape 1 or 3 would make a lane a published fact |
| `energy/…/GridCatalogue.ts` | descendants of the feeder root | under its own namespace; feeders compiled to reachability |
| `lib/expanse/Expanse.ts` | descendants of the sea's own extent | a sea reading the rows under itself. Closest to sound: the rows ARE its parts, under its own path |

The open question for all four: is a system reading the rows under ITS OWN root a content scan?
Under the principle it still finds things by search after publish. The alternative is the
installer telling the system what was installed under its root (shape 3). That is cheaper at
runtime too.

## 5. Its own question: the residency spawn sweep (1 site)

`api/ResidencyLogic.ts`: `findWhereDataHas('censusKey')`, the unobserved economy's faucet
([unobserved-economy-slate](../society/unobserved-economy-slate.md)). It is a list of every row
that wants a standing population. ⭐ That is a declaration a row makes (`censusKey`), so the
installer could file it at reconcile (shape 3) and the sweep would read the filed list.

## 6. How to land it

- The owner rules on § 1.
- Then one entry per change. Each change replaces the scan with its shape, removes the allowlist
  entry, and lowers the ceiling in the same commit. The gate already fails a file whose count falls
  below its allowance, so a removal cannot be forgotten.
- ⭐ Rewrite the gate's header to the ratified principle FIRST, so the next entry cannot cite a
  heading the owner has rejected.
- Order: § 3 first (the same mistake the app store made), then § 5, then § 4. § 2 only if the
  `LocationGraphRegistry` check finds it is not install-time.

## 7. Open

1. Is "a system reading the rows under its own root" (§ 4) a scan to remove, or a sanctioned home?
2. For each § 3 entry: document (shape 1), self-registration (shape 2), or install-time filing
   (shape 3)? The first question in each row decides it.
3. `LocationGraphRegistry`'s whole-table read: install-time or not?
