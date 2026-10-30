# Belief's recall forgets whoever is not loaded

> **Status: UNBUILT · opened 2026-10-29 (owner, ceramics review !437, B106).**
> **Left:** decide what the liveness collection is FOR · scope it to that.
> **Size:** a tail (one method, its callers, the doc).

## What it does

`BeliefStoreMixin.recall(realm, referent)` (`lib/belief/BeliefStore.ts`)
runs a lazy liveness collection: if `StuffApi.findByIdentityPath(referent)`
finds nothing loaded, the record is **deleted** and `null` returned.
`DISCOVERY` is exempt; every other realm is not.

Under load-on-use, "not loaded" is the ordinary state of a person who is
offline, an NPC in a zone nobody has visited since boot, or a maker whose
goods are in your hands. So any recall of an absent person's recognition —
`recognizes(subject)`, the naming path, regard — erases what the viewer knew
of them. Nothing reports it; the next meeting is a stranger's.

## Found by

The ceramics review's Marked pass (B106): naming a potter's mark from the
viewer's recognition through `recall` would have made you forget the potter
by looking at her pot while she was away. The mark reads through a new
`knownNameOf(identityPath)` instead, which never collects. That works around
it at one site; the defect is in `recall`.

## The question

The collection's comment says *"if nothing in the world carries this referent
anymore, the memory is dead."* That is true of a DESTROYED referent (a
corpse disposed of, a clone gone) and false of an UNLOADED one. Options:

- collect only on a referent known to be gone for good (a destruct witness,
  or a durable "this identity was retired" record), never on absence;
- or drop the collection and let records be reaped by their own Document's
  lifecycle (belief records are their own Documents already).

## Rides into

The next build that touches belief, or any build where an NPC must remember a
player across a logout (which is most of them). Small enough to ride anything.
