# Stale references in stored state — one bad record never bricks the boot

> **Status: UNBUILT** — captured 2026-11-21 from build-1's report after MR !644.
> **Left:** the census of restore paths that throw on a missing row · skip-and-say at each (the
> record is set aside and reported, boot continues) · what happens to the set-aside record (kept
> for repair or dropped with a log line) · a drive step that boots a world whose stored state
> cites a moved row
> **Size:** a build — small, but a census across every restore door; a go-live blocker for a
> world that stops wiping nightly

## What happened

MR !644 moved the lye row from `/trade/chandlery/idea/material/lye` to
`/trade/fuel/idea/material/lye`. No code cites the old path. build-1's dev
world, whose database predated the merge, then died **at boot**: a stored
snapshot still cited the old path, `StuffApi.ensureConstituent` found no row,
`MaterialCatalogue.need` threw `DocumentNotResidentError`
(`platform/idea/MaterialCatalogue.ts`), nothing caught it, and the process
exited with code 1. Dropping the dev database fixed it.

## Why it matters now

The live demo wipes `holder_snapshots` every night
([record-layer.md § The nightly reset](../../subsystems/record-layer.md)), and that hides this.
⚠ It still bites a mid-day deploy over that day's snapshots. The moment the demo stops wiping
(the go-live housekeeping track), **every content rename or move becomes a possible outage**,
and renames are routine: rows move between packs whenever a trade carves out. And there are no
migrations, by standing rule, so the fix cannot be "migrate the old paths".

## The rule

The same one the pack installer already keeps (*a failed pack never bricks the boot*): **one
record that cannot be restored is set aside and said, and the rest of the world boots.** Never
silently swallowed (refuse / skip / throw): the skip is reported, to the server log and to the
author diagnostics (`errors`), naming the record, the missing path and the reason.

## Open

1. **The census.** Every restore door that resolves a cited path on boot or on first load:
   material constituents, `ensureCitedIn` runtime fields (bulk payload makeup, a face's coats,
   an assembly's parts), class paths in snapshots, template extends, the estate's entries.
   Which throw, and which already skip?
2. **The unit of skipping.** The field, the mixin's slice, or the whole holder's snapshot? A
   body that loses one material citation should not lose its whole inventory, but a half-restored
   object may be worse than an absent one.
3. **The set-aside record.** Kept (marked, so an author or a later boot can repair it once the
   row exists again) or dropped with a log line. Keeping it costs one flag and a sweep; dropping
   is simpler, but one bad deploy can then destroy a player's state.
4. **Detection before deploy.** A check, run against a copy of the live database before a deploy,
   that lists every stored citation that no longer resolves. It turns the outage into a list.

## Cross-references

[persistence.md](../../subsystems/persistence.md) · [record-layer.md](../../subsystems/record-layer.md) ·
[content-packs.md](../../subsystems/content-packs.md) (the boot that a failed pack does not break) ·
[diagnostics.md](../../subsystems/diagnostics.md) · [estate-nesting-slate](../engine/estate-nesting-slate.md)
