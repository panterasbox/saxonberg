/**
 * ReasonCatalogue — the singleton that serves the `reason` documents (why
 * an act can be refused: `locked`, `no-key`, any pack's `content/reasons/`),
 * reached as `CommandApi.reasons()`. What a reason IS: `lib/command/Reason.ts`.
 *
 * ⭐ **A reason's code is its row's address** (failure-model D1), the
 * `shape:` rule: a bare word is the platform's (`locked` →
 * `/platform/reasons/locked`), anything else is a full path
 * (`/trade/forestry/reasons/wrong-tool`). {@link pathOf} and {@link codeOf}
 * are that rule, both ways.
 *
 * ⭐⭐ Loaded on use, by path — never at boot and never searched: the emit
 * sweep `ensure`s the row a refusal names; a script's `on <reason>` is
 * checked by {@link find} at parse. Only a miss reads the one directory the
 * code names, to fit a suggestion ({@link nearest}).
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import {
  DEFAULT_REASON_TOPIC,
  Reason,
  type ReasonFactKind,
  type ReasonFactSpec,
} from '../../lib/command/Reason';
import { Prose } from '../../lib/prose/Prose';

/** Where the platform's reasons live — a bare code is a leaf here. */
const PLATFORM_REASONS = '/platform/reasons/';

const FACT_KINDS: readonly ReasonFactKind[] = ['thing', 'things', 'text', 'number'];
const ROW_KEYS = new Set(['facts', 'says', 'topic', 'catchable']);

/** Liquid's own words — never a fact name. */
const LIQUID_WORDS = new Set(['true', 'false', 'nil', 'null', 'empty', 'blank', 'forloop', 'and', 'or', 'not', 'contains']);

export default class ReasonCatalogue extends DocumentCatalogue<Reason> {
  /**
   * A reference catalogue everyone reads (the commons): every refused
   * command inside a circle is worded through it, and a parcel-bound
   * script's `try` resolves through it.
   */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'reason';

  /**
   * Validate a reason document at `path` (the installer's validator, and a
   * save's). Refuses an unknown key, an unknown fact kind, a `says` that
   * does not compile, and a `says` that names a fact the row does not
   * declare.
   */
  public parse(data: Record<string, unknown>, path: string): Reason {
    for (const key of Object.keys(data)) {
      if (!ROW_KEYS.has(key)) throw new Error(`reason '${path}': unknown key '${key}'`);
    }
    const facts: Record<string, ReasonFactSpec> = {};
    const rawFacts = data.facts ?? {};
    if (typeof rawFacts !== 'object' || rawFacts === null || Array.isArray(rawFacts)) {
      throw new TypeError(`reason '${path}': facts must be a map of name → kind`);
    }
    for (const [name, rawKind] of Object.entries(rawFacts as Record<string, unknown>)) {
      if (typeof rawKind !== 'string') throw new TypeError(`reason '${path}': fact '${name}' needs a kind`);
      const optional = rawKind.endsWith('?');
      const kind = (optional ? rawKind.slice(0, -1) : rawKind) as ReasonFactKind;
      if (!FACT_KINDS.includes(kind)) {
        throw new TypeError(`reason '${path}': fact '${name}' has kind '${rawKind}' (one of ${FACT_KINDS.join(', ')}, ? for optional)`);
      }
      facts[name] = { kind, optional };
    }
    const says = data.says;
    if (typeof says !== 'string' || says.trim() === '') {
      throw new TypeError(`reason '${path}': says must be the sentence that words it`);
    }
    for (const name of this.namesIn(says)) {
      if (!(name in facts)) throw new Error(`reason '${path}': says names '${name}', which is not a declared fact`);
    }
    let prose: Prose;
    try {
      prose = Prose.parse(says);
    } catch (err) {
      throw new Error(`reason '${path}': says does not compile — ${(err as Error).message}`);
    }
    const topic = data.topic ?? DEFAULT_REASON_TOPIC;
    if (typeof topic !== 'string' || topic === '') throw new TypeError(`reason '${path}': topic must be a topic key`);
    const catchable = data.catchable ?? true;
    if (typeof catchable !== 'boolean') throw new TypeError(`reason '${path}': catchable must be a boolean`);
    return new Reason(path, facts, prose, topic, catchable);
  }

  /** The row a code names: a bare word is the platform's, a path is itself. */
  public pathOf(code: string): string {
    return code.startsWith('/') ? code : `${PLATFORM_REASONS}${code}`;
  }

  /** The canonical code of a row (or of a code): the platform's by its bare word. */
  public codeOf(pathOrCode: string): string {
    const path = this.pathOf(pathOrCode);
    if (path.startsWith(PLATFORM_REASONS)) {
      const leaf = path.slice(PLATFORM_REASONS.length);
      if (leaf !== '' && !leaf.includes('/')) return leaf;
    }
    return path;
  }

  /**
   * ⭐ The reason a code names, or `null` when no row ships it — the read
   * that may honestly miss (an unmigrated code, a misspelled `on`).
   */
  public async find(code: string): Promise<Reason | null> {
    const path = this.pathOf(code);
    const resident = this.peek(path);
    if (resident) return resident;
    const doc = await (await import('../../api/document')).DocumentApi.read(path);
    if (!doc || doc.getKind() !== this.kind) return null;
    return this.ensure(path);
  }

  /**
   * ⭐ The nearest code to a miss, in the one directory it names — the
   * suggestion a parse refusal offers (`on lockd` → `locked`) — or `null`
   * when nothing there is close.
   */
  public async nearest(code: string): Promise<string | null> {
    const path = this.pathOf(code);
    const dir = path.slice(0, path.lastIndexOf('/') + 1);
    const leaf = path.slice(dir.length);
    let best: { code: string; d: number } | null = null;
    for (const reason of await this.under(dir)) {
      const p = reason.getPath();
      const other = p.slice(dir.length);
      if (other.includes('/')) continue;
      const d = this.distance(leaf, other);
      if (best === null || d < best.d) best = { code: this.codeOf(p), d };
    }
    const limit = Math.max(2, Math.floor(leaf.length / 3));
    return best !== null && best.d <= limit ? best.code : null;
  }

  /** The variable names a Liquid sentence reads (outputs and conditions). */
  private namesIn(says: string): string[] {
    const names = new Set<string>();
    const add = (expr: string): void => {
      for (const m of expr.matchAll(/(?:^|[\s(,:])([A-Za-z_][\w]*)(?=[\s.|)}%,]|$)/g)) {
        const word = m[1]!;
        if (!LIQUID_WORDS.has(word)) names.add(word);
      }
    };
    for (const m of says.matchAll(/\{\{-?\s*([^}|]*)/g)) add(` ${m[1]!}`);
    for (const m of says.matchAll(/\{%-?\s*(?:if|elsif|unless)\s+([^%]*)%\}/g)) add(` ${m[1]!}`);
    return [...names];
  }

  /** Levenshtein distance — how far a typed code is from a shipped one. */
  private distance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]!;
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cur = row[j]!;
        row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
    }
    return row[b.length]!;
  }
}
