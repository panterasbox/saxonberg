/**
 * Test-only: the slice of Mongo query semantics the document store issues
 * — equality on dotted paths, the inclusive/exclusive ranges a path
 * subtree and a catalogue-card key use, `$exists`, `$in`, `$or` — plus the
 * `sort`/`limit` options `findByKey` passes. An in-memory store fake
 * filters with {@link matchesDocumentQuery} and orders with
 * {@link applyFindOptions}, so a fake answers the store's real queries
 * rather than only bare equality.
 *
 * Lives under `__tests__/`, which the export-discipline lint exempts.
 */

function valueAt(row: Record<string, unknown>, dotted: string): unknown {
  let cur: unknown = row;
  for (const part of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function isOperatorObject(v: unknown): v is Record<string, unknown> {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).length > 0 &&
    Object.keys(v).every((k) => k.startsWith('$'))
  );
}

function cmp(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function matchOne(have: unknown, want: unknown): boolean {
  if (!isOperatorObject(want)) {
    if (Array.isArray(have) && !Array.isArray(want)) return have.includes(want);
    return have === want;
  }
  for (const [op, arg] of Object.entries(want)) {
    switch (op) {
      case '$exists':
        if ((have !== undefined) !== Boolean(arg)) return false;
        break;
      case '$gte':
        if (have === undefined || cmp(have, arg) < 0) return false;
        break;
      case '$gt':
        if (have === undefined || cmp(have, arg) <= 0) return false;
        break;
      case '$lte':
        if (have === undefined || cmp(have, arg) > 0) return false;
        break;
      case '$lt':
        if (have === undefined || cmp(have, arg) >= 0) return false;
        break;
      case '$in':
        if (!(arg as unknown[]).some((x) => matchOne(have, x))) return false;
        break;
      case '$ne':
        if (have === arg) return false;
        break;
      default:
        throw new Error(`document-query: unsupported operator ${op}`);
    }
  }
  return true;
}

/** Whether `row` satisfies `query` (the store's query subset). */
export function matchesDocumentQuery(
  row: Record<string, unknown>,
  query: Record<string, unknown>,
): boolean {
  for (const [k, v] of Object.entries(query)) {
    if (k === '$or') {
      if (!(v as Array<Record<string, unknown>>).some((q) => matchesDocumentQuery(row, q))) {
        return false;
      }
      continue;
    }
    if (!matchOne(valueAt(row, k), v)) return false;
  }
  return true;
}

/** Apply `{sort, limit}` the way the driver would. */
export function applyFindOptions<T extends Record<string, unknown>>(
  rows: T[],
  options?: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number },
): T[] {
  let out = [...rows];
  if (options?.sort) {
    const entries = Object.entries(options.sort);
    out.sort((a, b) => {
      for (const [k, dir] of entries) {
        const c = cmp(valueAt(a, k), valueAt(b, k));
        if (c !== 0) return c * dir;
      }
      return 0;
    });
  }
  if (options?.skip) out = out.slice(options.skip);
  if (options?.limit !== undefined) out = out.slice(0, options.limit);
  return out;
}
