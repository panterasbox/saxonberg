/**
 * SchemaDoc — one collection, described.
 *
 * The one concept this module defines: the parsed, validated shape of an
 * authored `src/schema/<collection>.yaml`. A schema doc is the single
 * place a collection is described — what it is for, what is true of it,
 * what the nightly reset does to it, what a sandboxed write does to it,
 * and why each of its indexes exists.
 *
 * ⚠ **Three readers, one parser.** `PersistenceManager` reads the
 * directory at boot (to build indexes and to fail loudly on a collection
 * nobody described), `scripts/gen-schema.ts` reads it to emit
 * {@link Collections}, `COLLECTION_POLICIES` and `RESET_DISPOSITIONS`,
 * and `HelpCatalogue` reads it to project a help topic per collection.
 * All three parse through {@link SchemaDoc.parse}, so a malformed doc
 * fails the same way everywhere.
 *
 * It is a value object in the `Light` / `Quantity` category — no I/O, no
 * `fs`, no YAML parser. The caller hands it an already-parsed object;
 * where that object came from is the caller's business, which is what
 * keeps this module import-clean under the mudlib import boundary.
 *
 * ⚠ It deliberately does NOT validate that `collection` is a member of
 * {@link Collections}: the enum is GENERATED from these docs, so a
 * membership check here would be the tail wagging the dog. Set
 * equivalence between the directory and the enum is asserted by the
 * loader (at boot) and by `pnpm lint:schema` (at build).
 *
 * See docs/subsystems/persistence.md § Schema docs.
 */

import type { CollectionPolicy } from './CollectionPolicy';

/**
 * A `wipe-except` filter that is DERIVED from another vocabulary rather
 * than written out. The closed set exists for the same reason D4 keeps
 * two index loops computed: writing the filter as a YAML literal would
 * freeze a list that another module owns, and the frozen copy is the one
 * nobody executes.
 */
export type ResetKeepDerivation = 'declared-document-kinds';

/** What the nightly reset does to one collection, as authored. */
export type SchemaReset =
  | { readonly verb: 'wipe' }
  | { readonly verb: 'keep'; readonly because: string }
  | {
      readonly verb: 'wipe-except';
      readonly keep: ResetKeepDerivation;
      readonly because: string;
    };

/** One authored index, with the reason it exists. */
export interface SchemaIndex {
  /** The key spec, exactly as Mongo takes it. */
  readonly keys: Readonly<Record<string, 1 | -1 | 'text'>>;
  readonly unique?: boolean;
  readonly collation?: Readonly<Record<string, unknown>>;
  readonly expireAfterSeconds?: number;
  readonly partialFilterExpression?: Readonly<Record<string, unknown>>;
  /**
   * A TEXT index — routed through `ensureTextIndex`, which drops and
   * recreates on a shape change. The recovery behaviour stays in PM; the
   * doc only declares which index it applies to.
   */
  readonly text?: boolean;
  /** ⚠ Required. An index nobody can justify is an index nobody can drop. */
  readonly why: string;
}

const SANDBOX_VERBS = ['stamp', 'refuse', 'pass', 'shadow'] as const;
const RESET_VERBS = ['wipe', 'keep', 'wipe-except'] as const;
const KEEP_DERIVATIONS: readonly string[] = ['declared-document-kinds'];

/** Thrown when a schema doc is malformed. Names the file and the field. */
export class SchemaDocError extends Error {
  constructor(file: string, message: string) {
    super(`SchemaDoc(${file}): ${message}`);
    this.name = 'SchemaDocError';
  }
}

/**
 * One authored collection description.
 *
 * Constructed only through {@link SchemaDoc.parse} — the fields are
 * populated from validated input, so a `SchemaDoc` in hand is a doc that
 * has already been checked.
 */
export class SchemaDoc {
  /** The Mongo collection name. Matches the filename stem. */
  public readonly collection: string;
  /** The `Document` subclass that writes here, or `null` for `none`. */
  public readonly owner: string | null;
  /** The owning doc under `docs/subsystems/`, e.g. `banking.md`. */
  public readonly subsystem: string;
  /** One line. What this collection is. */
  public readonly summary: string;
  /** The paragraph. What it is FOR, and what it is not. */
  public readonly purpose: string;
  /** What is true of every row, stated so a reader can check it. */
  public readonly invariants: readonly string[];
  public readonly sandbox: CollectionPolicy;
  public readonly reset: SchemaReset;
  public readonly indexes: readonly SchemaIndex[];

  private constructor(init: {
    collection: string;
    owner: string | null;
    subsystem: string;
    summary: string;
    purpose: string;
    invariants: readonly string[];
    sandbox: CollectionPolicy;
    reset: SchemaReset;
    indexes: readonly SchemaIndex[];
  }) {
    this.collection = init.collection;
    this.owner = init.owner;
    this.subsystem = init.subsystem;
    this.summary = init.summary;
    this.purpose = init.purpose;
    this.invariants = init.invariants;
    this.sandbox = init.sandbox;
    this.reset = init.reset;
    this.indexes = init.indexes;
  }

  /**
   * The TS enum member name for a collection: `bank_ledger` →
   * `BankLedger`. Derived rather than authored — all 48 names are plain
   * snake_case, and a second authored field would be a second thing to
   * keep in sync.
   */
  public static enumKey(collection: string): string {
    return collection
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Parse and validate one doc. Throws {@link SchemaDocError} naming the
   * file and the offending field.
   *
   * @param raw the already-parsed YAML object
   * @param file the filename, for error messages
   */
  public static parse(raw: unknown, file: string): SchemaDoc {
    const fail = (message: string): never => {
      throw new SchemaDocError(file, message);
    };
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('not a YAML mapping');
    }
    const doc = raw as Record<string, unknown>;

    const collection = doc.collection;
    if (typeof collection !== 'string' || collection.length === 0) {
      return fail('`collection` is required and must be a non-empty string');
    }

    const ownerRaw = doc.owner;
    if (typeof ownerRaw !== 'string' || ownerRaw.length === 0) {
      return fail('`owner` is required — a Document subclass name, or `none`');
    }
    const owner = ownerRaw === 'none' ? null : ownerRaw;

    const subsystem = doc.subsystem;
    if (typeof subsystem !== 'string' || !subsystem.endsWith('.md')) {
      return fail('`subsystem` is required and must name a `.md` file');
    }

    const summary = doc.summary;
    if (typeof summary !== 'string' || summary.trim().length === 0) {
      return fail('`summary` is required and must be non-empty');
    }

    const purpose = doc.purpose;
    if (typeof purpose !== 'string' || purpose.trim().length === 0) {
      return fail('`purpose` is required and must be non-empty');
    }

    const invariants = SchemaDoc.#parseInvariants(doc.invariants, fail);
    const sandbox = SchemaDoc.#parseSandbox(doc.sandbox, fail);
    const reset = SchemaDoc.#parseReset(doc.reset, fail);
    const indexes = SchemaDoc.#parseIndexes(doc.indexes, fail);

    return new SchemaDoc({
      collection,
      owner,
      subsystem,
      summary: summary.trim(),
      purpose: purpose.trim(),
      invariants,
      sandbox,
      reset,
      indexes,
    });
  }

  static #parseInvariants(
    raw: unknown,
    fail: (m: string) => never
  ): readonly string[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) return fail('`invariants` must be a list');
    return raw.map((entry, i) => {
      if (typeof entry !== 'string' || entry.trim().length === 0) {
        return fail(`\`invariants[${i}]\` must be a non-empty string`);
      }
      return entry.trim();
    });
  }

  static #parseSandbox(
    raw: unknown,
    fail: (m: string) => never
  ): CollectionPolicy {
    // Scalar shorthand for the verbs that carry no options.
    if (typeof raw === 'string') {
      if (raw === 'stamp') return { verb: 'stamp' };
      if (raw === 'refuse') return { verb: 'refuse' };
      if (raw === 'pass') return { verb: 'pass' };
      if (raw === 'shadow') {
        return fail('`sandbox: shadow` needs a `mode:` — write it as a mapping');
      }
      return fail(
        `unknown \`sandbox\` verb '${raw}' — one of ${SANDBOX_VERBS.join(', ')}`
      );
    }
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('`sandbox` is required — a verb string or a mapping');
    }
    const map = raw as Record<string, unknown>;
    const verb = map.verb;
    if (typeof verb !== 'string' || !SANDBOX_VERBS.includes(verb as never)) {
      return fail(
        `unknown \`sandbox\` verb '${String(verb)}' — one of ${SANDBOX_VERBS.join(', ')}`
      );
    }
    if (verb === 'pass') {
      if (map.mark === undefined) return { verb: 'pass' };
      if (typeof map.mark !== 'boolean') {
        return fail('`sandbox.mark` must be a boolean');
      }
      return { verb: 'pass', mark: map.mark };
    }
    if (verb === 'shadow') {
      if (map.mode !== 'skip' && map.mode !== 'overlay') {
        return fail("`sandbox.mode` must be 'skip' or 'overlay'");
      }
      return { verb: 'shadow', mode: map.mode };
    }
    return { verb: verb as 'stamp' | 'refuse' };
  }

  static #parseReset(raw: unknown, fail: (m: string) => never): SchemaReset {
    if (raw === 'wipe') return { verb: 'wipe' };
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('`reset` is required — `wipe`, or a mapping with a `verb`');
    }
    const map = raw as Record<string, unknown>;
    const verb = map.verb;
    if (typeof verb !== 'string' || !RESET_VERBS.includes(verb as never)) {
      return fail(
        `unknown \`reset\` verb '${String(verb)}' — one of ${RESET_VERBS.join(', ')}`
      );
    }
    if (verb === 'wipe') return { verb: 'wipe' };

    const because = map.because;
    if (typeof because !== 'string' || because.trim().length === 0) {
      // ⚠ The survivors list grows one unexplained entry at a time.
      return fail(`\`reset: ${verb}\` requires a \`because\``);
    }
    if (verb === 'keep') return { verb: 'keep', because: because.trim() };

    const keep = map.keep;
    if (typeof keep !== 'string' || !KEEP_DERIVATIONS.includes(keep)) {
      return fail(
        `\`reset.keep\` must name a known derivation — one of ${KEEP_DERIVATIONS.join(', ')}`
      );
    }
    return {
      verb: 'wipe-except',
      keep: keep as ResetKeepDerivation,
      because: because.trim(),
    };
  }

  static #parseIndexes(
    raw: unknown,
    fail: (m: string) => never
  ): readonly SchemaIndex[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) return fail('`indexes` must be a list');
    return raw.map((entry, i) => {
      const at = `indexes[${i}]`;
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        return fail(`\`${at}\` must be a mapping`);
      }
      const map = entry as Record<string, unknown>;
      const keys = map.keys;
      if (keys === null || typeof keys !== 'object' || Array.isArray(keys)) {
        return fail(`\`${at}.keys\` is required and must be a mapping`);
      }
      const keySpec: Record<string, 1 | -1 | 'text'> = {};
      for (const [field, direction] of Object.entries(
        keys as Record<string, unknown>
      )) {
        if (direction !== 1 && direction !== -1 && direction !== 'text') {
          return fail(`\`${at}.keys.${field}\` must be 1, -1 or 'text'`);
        }
        keySpec[field] = direction;
      }
      if (Object.keys(keySpec).length === 0) {
        return fail(`\`${at}.keys\` must name at least one field`);
      }
      const why = map.why;
      if (typeof why !== 'string' || why.trim().length === 0) {
        return fail(`\`${at}.why\` is required — say what the index serves`);
      }
      const index: {
        keys: Record<string, 1 | -1 | 'text'>;
        unique?: boolean;
        collation?: Record<string, unknown>;
        expireAfterSeconds?: number;
        partialFilterExpression?: Record<string, unknown>;
        text?: boolean;
        why: string;
      } = { keys: keySpec, why: why.trim() };

      if (map.unique !== undefined) {
        if (typeof map.unique !== 'boolean') {
          return fail(`\`${at}.unique\` must be a boolean`);
        }
        index.unique = map.unique;
      }
      if (map.text !== undefined) {
        if (typeof map.text !== 'boolean') {
          return fail(`\`${at}.text\` must be a boolean`);
        }
        index.text = map.text;
      }
      if (map.expireAfterSeconds !== undefined) {
        if (typeof map.expireAfterSeconds !== 'number') {
          return fail(`\`${at}.expireAfterSeconds\` must be a number`);
        }
        index.expireAfterSeconds = map.expireAfterSeconds;
      }
      if (map.collation !== undefined) {
        if (
          map.collation === null ||
          typeof map.collation !== 'object' ||
          Array.isArray(map.collation)
        ) {
          return fail(`\`${at}.collation\` must be a mapping`);
        }
        index.collation = map.collation as Record<string, unknown>;
      }
      if (map.partialFilterExpression !== undefined) {
        if (
          map.partialFilterExpression === null ||
          typeof map.partialFilterExpression !== 'object' ||
          Array.isArray(map.partialFilterExpression)
        ) {
          return fail(`\`${at}.partialFilterExpression\` must be a mapping`);
        }
        index.partialFilterExpression = map.partialFilterExpression as Record<
          string,
          unknown
        >;
      }
      return index;
    });
  }
}
