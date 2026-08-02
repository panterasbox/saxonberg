# Branch-policy slate — `writers` on the document tree

**Captured 2026-07-31**, out of the legal-code session. The document
tree cannot currently say one sentence it needs: **"writes below here
must come through process P."** `DocumentApi.save`'s gate answers
*who owns a path* (self-home → covering zone → slice-walk) — never
*how it was written*.

This is **document-store infrastructure**, not law. Law is merely the
first caller with a hard requirement
([legal-code-slate](./legal-code-slate.md)); the same sentence is
wanted by guild charters, CMS go-live records, contract records, and
per-institution recipe books.

Related: [document-store.md](../../subsystems/document-store.md),
[call-security.md](../../subsystems/call-security.md) (the identity
this reuses), [access.md](../../subsystems/access.md),
[parcel.md](../../subsystems/parcel.md).

## The design, in one sentence

> **`writers` is `FromModule` with a data-sourced allowlist** — the
> same unforgeable identity, the same fail-closed behavior, the same
> lint. The only difference is that the allowlist comes from **a
> policy document resolved by path** instead of a decorator
> argument.

Everything it needs is already load-bearing elsewhere:

- Module IDs are **`path#exportName`, stamped at load by the loader
  hook and unforgeable**;
- **`resolveModuleId`** reads the caller's;
- identity-keyed policies **fail closed** — an unstamped class is
  denied (`ModuleApi.lookup` → null);
- and **`pnpm lint:gates`** already CI-validates that every such
  string resolves to a real module + export.

## Where it lives, and how it resolves

A `StoredDocument` of kind **`policy`** at a branch root, resolved by
**longest-prefix walk** — the house pattern already used three times
(the address coverage chain, the parcel `ownerOf` chain,
jurisdiction). Self-describing, in the tree, browsable by the CMS
like anything else.

```yaml
# /law/.policy
kind: policy
writers: ["/obj/api/LawLogic"]
```

**A policy at a high prefix protects everything beneath it**, which
is the useful default: the Compact sets `/law/**` **once** and every
institution's code is chokepointed with no per-institution setup.

## The invariant that makes it safe

> **The policy NARROWS an already-permitted write. It never widens
> one.**

The existing ownership rungs run **first** and must pass; only then
does the writer check apply. If you do not own the branch you were
already denied, so **a `writers` policy can never become an
escalation vector** — it has no power to grant.

That single invariant is what makes this safe to hand to content
authors.

## Nearest-wins — and why that still cannot widen

Effect is **nearest policy wins.** (Intersection-down-the-chain
*sounds* safer but bricks branches: `[LawLogic]` ∩ `[GuildLogic]` =
nothing writable.)

Protection against a deeper branch re-opening itself falls out with
**no special rule**: **the policy document is itself governed by the
policy above it.** Writing `/law/guild/x/.policy` must first satisfy
`/law/**`'s policy. So widening is **possible but governed** — the
right answer, and free.

## Self-amendment

| Branch state | Who may set the policy |
|---|---|
| **unpoliced** | the **owner** (they already own it) |
| **policed** | **only the module the policy names** |

Which means, for law: **changing how law is made requires making a
law** — a `structural` instrument, which the taxonomy already has.
Precisely how constitutions work, and the recursion closes without
inventing anything.

## The escape hatch, stated honestly

**The wizard axis breaks glass, and the override is logged loudly**
as an authoring event. Not because exceptions are pleasant, but
because **anyone who can run arbitrary code can already write
anything** — a gate pretending otherwise is theater, and the sandbox
doctrine already holds code-trust as the one axis nothing opens.
**Better a visible override than an imaginary guarantee.**

## Scope — and what this deliberately is not

- **Writes means create, update, and delete.**
- **`readers` is the obvious sibling** — noted, **not built**,
  because nothing needs it yet.
- **Sealing is a different mechanism.** The
  [press slate](./press-slate.md)'s *seal-don't-hide* is
  **per-document** (existence public, content withheld); this is
  **per-branch**. Do not conflate them.

## Footguns and mitigations

| Footgun | Mitigation |
|---|---|
| a policy naming a **module that does not exist** bricks the branch | validate at set time with the **existing `lint:gates` resolver**; wizard hatch as last resort |
| a policy naming a module with **no write path to that prefix** silently freezes it | warn at set time |
| an **orphaned** policy (its module deleted later) | the gates lint is CI-gating, so a deleted module surfaces there |

## Consumers (the argument for building it now)

| Branch | Writer | Why |
|---|---|---|
| `/law/**` | `LawLogic` | the enactment chokepoint — the hard requirement |
| a guild's charter branch | `GuildLogic` | charters must not be hand-edited |
| CMS go-live records | the go-live path | provenance integrity |
| contract records | `ContractLogic` | terms must move through the escrow path |
| per-guild recipe books | `CraftLogic`/guild | proprietary knowledge worth guarding |

**Law is simply the first caller that cannot proceed without it.**

## Open questions (for requirements)

1. **The policy document's name and placement convention** —
   `.policy` at the branch root, a reserved leaf, or a field on an
   owning record? (Instinct: a reserved leaf, so it is visible in
   the CMS tree rather than hidden.)
2. **Resolution caching** — a longest-prefix walk per save is cheap,
   but a warmed prefix cache is the shipped pattern
   (`AddressApi`-style); decide whether it needs one.
3. **Does `writers` accept anything besides module IDs?** (Instinct:
   **no**, deliberately — a module is a code identity the lint can
   verify. Admitting groups or players would rebuild ACLs, which the
   ownership rungs already do.)
4. **Set-time authorization for the first policy** — an owner
   policing their own branch is fine, but should there be a floor
   preventing an owner from policing a branch they own *inside*
   someone else's tree?
5. **Migration** — retrofitting a policy onto an existing branch
   with live writers; presumably a wizard-gated one-time operation.
