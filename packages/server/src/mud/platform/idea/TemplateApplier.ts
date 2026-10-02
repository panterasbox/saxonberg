/**
 * TemplateApplier — **the content step: what the ROW says, put onto the
 * instance.** The clone pipeline's one authored-data step, three phases
 * deep and aware of which of the three occasions it is running on.
 *
 * ⭐⭐ It was called `TemplateApplier` until 2026-10-01, and the rename
 * is the point of the hydration build rather than a tidy-up. *Hydration*
 * is now reserved for the other thing entirely — filling an instance from
 * what the world REMEMBERED about it (`holder_snapshots`, `beliefs`),
 * keyed on the instance's own identity and with a capture counterpart.
 * This class does the opposite job: it applies what an AUTHOR wrote,
 * keyed on a template path, with no capture side at all. Calling both
 * "hydration" is what made the first cut of this build try to unify five
 * things that were alike with one that was not.
 *
 * ## The three phases
 *
 * Each runs to completion before the next begins, so every property has
 * settled before any instruction reads one, and both have settled before
 * anything is written to a ledger.
 *
 *   1. **property** — every `persistent` field the host's `fieldMeta`
 *      declares. Marshalled values are un-marshalled first, then
 *      `await host.set<Field>(value)` when that method exists, else
 *      bracket-assign (which still fires an accessor pair on the
 *      prototype, so a setter-declared invariant holds either way).
 *   2. **instruction** — every `instruction` field.
 *      `await host.apply<Field>(value)`, and the applier is **required**:
 *      a declared instruction field with no `applyX` is a configuration
 *      bug, surfaced loudly rather than skipped.
 *   3. **seed** — every `seed` field. `await host.seed<Field>(value)`,
 *      also required. This is an authored HISTORY being written into the
 *      ledger that owns it (a prologue into the chronicle, dispositions
 *      into the trait log, claims into renown and the transcript), which
 *      is why it is last and why it is mint-only.
 *
 * ## The three modes
 *
 * | mode | who calls it | phase 1 | phase 2 | phase 3 |
 * |---|---|---|---|---|
 * | `mint` | `StuffApi.clone` | all | all | all |
 * | `go-live` | `TemplateApi.restoreFromTemplate` (a CMS save, `pack sync`) | all but `birthOnly` | all | — |
 * | `restore` | `PersistableApi.materialize` | all, `birthOnly` included | — | — |
 *
 * ⚠⚠ **`go-live` skipping `birthOnly` is a money fix, not a nicety.** A
 * CMS save or a pack reconcile re-applies a row's authored fields to
 * every LIVE instance at that path. `Coin` authors `quantity: 1`, so
 * going live on the coin row reset every coin stack in the world to one
 * — minting and burning outside the conservation chokepoint, invisibly.
 * The field's owner declares the hazard (`Stackable.quantity`), because
 * it is a property of the FIELD wherever it is authored.
 *
 * ⚠ **`restore` is not go-live.** It replays a record of what this
 * instance actually had, so a birth-only field is exactly what it must
 * write. Phases 2 and 3 are skipped by SELECTION, not by special case:
 * an instruction or seed field never appears in a captured field slice.
 *
 * ## Once-ness
 *
 * The applier owns *when* (phase 3 at mint only). The LEDGER owns
 * *whether it has already happened*, and keeps its own guard — because a
 * re-clone after a destruct is a genuinely new mint, and only the ledger
 * knows the history is already written. `Cast.seedPrologue` skips if any
 * `claim` row exists; `RenownApi.seedTo` counts the evidence already on
 * the log and writes only the difference.
 *
 * ## Where a cross-field rule goes
 *
 * On the class, not here. A per-field shape rule belongs on the field's
 * setter (this applier routes through it for free); a cross-field
 * invariant belongs in the host's own `set<Field>`/`apply<Field>`. There
 * is no second applier to subclass — a row cannot name one and the
 * engine resolves exactly this one.
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Idea } from '../../lib/stuff/Idea';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Marshaller } from '../../lib/persistence/Marshaller';
import { TemplatePaths } from '../../lib/paths';

type Indexable = Record<string, unknown>;

/**
 * Which occasion the applier is running on. See the table above — the
 * mode decides which phases run and whether `birthOnly` fields are
 * pushed, and there is deliberately no default: every call site states
 * which of the three it is.
 */
export type ApplyMode = 'mint' | 'go-live' | 'restore';

/**
 * Extends `Idea` so the clone pipeline can produce it the same way it
 * produces every other templated Stuff — `StuffApi.singleton` resolves
 * one instance, reused across every backing it fills (it is stateless by
 * contract). No special-case resolver; HMR comes for free through the
 * standard clone integration.
 */
export default class TemplateApplier extends Idea {
  /**
   * The applier's own row. ⭐ Its `data` is empty, which is what
   * terminates the resolution recursion now that a row no longer names
   * its applier: cloning the applier plans no applier.
   */
  public static readonly templatePath = TemplatePaths.templateApplier;

  /**
   * Put `data` onto `host`, three phases in order, as the occasion
   * named by `mode` allows.
   */
  public async apply(
    host: Stuff,
    data: Record<string, unknown>,
    opts: { mode: ApplyMode }
  ): Promise<void> {
    const constructor = host.constructor as new (...args: unknown[]) => Stuff;
    const meta = MixinApi.getAllFieldMeta(constructor) as Record<
      string,
      { birthOnly?: true } | undefined
    >;
    const persistentFields = MixinApi.getAllPersistentFields(constructor);
    const marshallerPaths = MixinApi.getAllFieldMarshallers(constructor);
    const target = host as unknown as Indexable;
    const mode = opts.mode;

    // ── Phase 1: property fields ────────────────────────────────────
    for (const field of persistentFields) {
      if (!(field in data)) continue;
      // ⚠⚠ The money fix. An authored value-bearing field is right for a
      // newly-minted instance and wrong for a live one.
      if (mode === 'go-live' && meta[field]?.birthOnly) continue;
      const raw = data[field];
      const path = marshallerPaths[field];
      let value: unknown;
      if (path && raw != null) {
        // Lazy resolution: `singleton(path)` returns the cached
        // marshaller if one exists, else clones from the seeded row —
        // the same way the pipeline resolves this applier. Tests bypass
        // Mongo and pre-register marshallers up front (see
        // `__tests__/quantity-marshaller-test-helpers.ts`); in
        // production the seeder put the row in `content` at boot.
        //
        // A null/undefined stored value skips the marshaller (its
        // `fromStored` expects a live value) — the null round-trip
        // mirrors the capture-side guard for an unset optional
        // marshalled field.
        const marshaller = await StuffApi.singleton<
          Marshaller<unknown, unknown>
        >(path);
        value = marshaller.fromStored(raw);
      } else {
        value = raw;
      }
      const setterName = 'set' + MixinApi.pascalCase(field);
      const setter = target[setterName];
      if (typeof setter === 'function') {
        // Async-safe: `await` of a non-Promise resolves to the value, so
        // a synchronous setter behaves exactly as a bracket-assign
        // would, while an asynchronous one that touches other Stuff
        // completes before the next field is processed.
        await (setter as (v: unknown) => unknown | Promise<unknown>).call(
          target,
          value
        );
      } else {
        // Fallback: bracket-assign. An accessor pair on the prototype
        // still fires; a plain public field just receives the value.
        target[field] = value;
      }
    }

    // ── Phase 2: instruction fields ─────────────────────────────────
    // ⚠ Skipped on `restore` by SELECTION: a captured field slice is
    // drift-guarded to declared persistent fields, so an instruction
    // field never appears in one. The explicit mode check below is
    // belt-and-braces and documents the intent.
    if (mode !== 'restore') {
      await this.dispatchPhase(
        host,
        data,
        MixinApi.getAllInstructionFields(constructor),
        'apply',
        'instruction'
      );
    }

    // ── Phase 3: seed fields ────────────────────────────────────────
    // ⚠⚠ MINT ONLY. Going live re-applies a row to objects that are
    // already in the world; re-seeding one would write its authored
    // history into the ledger a second time.
    if (mode === 'mint') {
      await this.dispatchPhase(
        host,
        data,
        MixinApi.getAllSeedFields(constructor),
        'seed',
        'seed'
      );
    }
  }

  /**
   * Phases 2 and 3 are the same dispatch with a different prefix and a
   * different field set: look up `<prefix><Field>`, require it, await it.
   * The method is REQUIRED in both — a declared field with no method is
   * a configuration bug, and the silent skip is the failure class this
   * whole build exists to remove.
   *
   * ⚠ TypeScript `private`, NOT `#`. Every Stuff is wrapped in the
   * call-security proxy and instance dispatch runs `method.apply(proxy,
   * args)`, so inside `apply()` `this` IS the proxy — and a `#` slot
   * lives on the raw target only, so `this.#dispatchPhase(...)` throws
   * `Receiver must be an instance of class TemplateApplier`. This is
   * CLAUDE.md § Member Privacy hard constraint 2, and it fired on the
   * first run of the phase tests.
   */
  private async dispatchPhase(
    host: Stuff,
    data: Record<string, unknown>,
    fields: readonly string[],
    prefix: 'apply' | 'seed',
    label: string
  ): Promise<void> {
    const target = host as unknown as Indexable;
    const constructor = host.constructor as { name: string };
    for (const field of fields) {
      if (!(field in data)) continue;
      const methodName = prefix + MixinApi.pascalCase(field);
      const method = target[methodName];
      if (typeof method !== 'function') {
        throw new Error(
          `TemplateApplier: ${label} field '${field}' on ` +
            `${constructor.name} declares no '${methodName}' method. ` +
            `A ${label} field must provide one; either add ` +
            `'${methodName}' or drop '${label}: true' from its fieldMeta.`
        );
      }
      await (method as (v: unknown) => unknown | Promise<unknown>).call(
        target,
        data[field]
      );
    }
  }
}
