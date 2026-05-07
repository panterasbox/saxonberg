/**
 * PathPatternApi - generic glob matcher for path-shaped strings.
 *
 * Supports the subset of glob syntax needed for security policy matching
 * and template-path lookups:
 *   - literals match exactly
 *   - `*` matches any run of characters EXCEPT `/`
 *   - `**` matches any run of characters INCLUDING `/`
 *   - `?` matches a single character EXCEPT `/`
 *
 * Not a full glob library — no `[abc]` classes, no `{a,b}`
 * alternatives. The minimum required by FromTemplate / FromModule
 * security policies and MQL path-glob seeds.
 *
 * Two-pass test:
 *   PathPatternApi.matches('mud/api/stuff#StuffApi', 'mud/api/**') === true
 *   PathPatternApi.matches('mud/lib/stuff/Thing#Thing', 'mud/api/**') === false
 *
 * Companion data structure: {@link PathTrie} provides O(segments) exact
 * lookup and glob-walk against an indexed set of paths, sharing
 * {@link PathPatternApi.compile} for the regex backend.
 */

import { SecurityApi } from './security';

export class PathPatternApi {
  private constructor() {}

  /**
   * Return true if `path` matches `pattern`. Both are strings; pattern
   * may contain `*`, `**`, and `?` wildcards.
   */
  public static matches(path: string, pattern: string): boolean {
    const re = PathPatternApi.compile(pattern);
    return re.test(path);
  }

  /**
   * Compile a glob pattern to a RegExp. Cached per-pattern in a small
   * Map; patterns are typically a closed set declared at policy
   * construction time.
   */
  public static compile(pattern: string): RegExp {
    const cached = PathPatternApi.#cache.get(pattern);
    if (cached) return cached;

    // Build the regex piece-by-piece. Escape regex-meta chars in
    // literal segments; replace ** then * with their regex
    // equivalents.
    let body = '';
    let i = 0;
    while (i < pattern.length) {
      if (pattern.startsWith('**', i)) {
        body += '.*';
        i += 2;
      } else if (pattern[i] === '*') {
        body += '[^/]*';
        i += 1;
      } else if (pattern[i] === '?') {
        body += '[^/]';
        i += 1;
      } else {
        body += PathPatternApi.#escapeRegex(pattern[i]!);
        i += 1;
      }
    }
    const re = new RegExp('^' + body + '$');
    PathPatternApi.#cache.set(pattern, re);
    return re;
  }

  static #cache: Map<string, RegExp> = new Map();

  static #escapeRegex(ch: string): string {
    // Restricted to single chars; full string escape would also
    // protect `*` but we already special-case those above.
    return /[.+?^${}()|[\]\\]/.test(ch) ? '\\' + ch : ch;
  }
}

SecurityApi.decorateApiClass(PathPatternApi);

/**
 * Trie node for {@link PathTrie}. Each node owns a map of next-segment
 * children plus an optional bucket of values whose path terminates
 * here. `parent` and `segment` are kept so removals can prune empty
 * branches without a separate parent-pointer pass.
 */
class PathTrieNode<T> {
  public children: Map<string, PathTrieNode<T>> = new Map();
  public values: Set<T> | null = null;

  constructor(
    public readonly parent: PathTrieNode<T> | null,
    public readonly segment: string | null
  ) {}
}

/**
 * Path-keyed trie with exact lookup and glob walk.
 *
 * Paths are split on `/` into segments; each segment becomes a level.
 * Multiple values may share a path (a `Set<T>` lives at each terminal
 * node). On removal the trie prunes any node that becomes empty
 * (no children, no values), so a balanced `insert` / `remove` pair
 * leaves the trie identical to its never-inserted state.
 *
 * Glob walk delegates to {@link PathPatternApi.compile} so syntax
 * stays consistent with the rest of the codebase. The walk is
 * segment-aware where possible — `**` segments enable a full subtree
 * descent, while `*` and `?` segments stay within one level — so the
 * walker doesn't have to enumerate every leaf.
 */
export class PathTrie<T> {
  #root: PathTrieNode<T> = new PathTrieNode<T>(null, null);
  #size: number = 0;

  /**
   * Insert `value` under `path`. Multiple values can share a path.
   * No-op if the (`path`, `value`) pair is already present.
   */
  public insert(path: string, value: T): void {
    const node = this.#walkOrCreate(path);
    if (!node.values) node.values = new Set();
    if (!node.values.has(value)) {
      node.values.add(value);
      this.#size += 1;
    }
  }

  /**
   * Remove `value` from `path`. No-op if not present. Prunes empty
   * branches so a never-inserted state is restored when the last
   * value at a path is removed.
   */
  public remove(path: string, value: T): void {
    const node = this.#walk(path);
    if (!node || !node.values) return;
    if (!node.values.delete(value)) return;
    this.#size -= 1;
    if (node.values.size === 0) node.values = null;
    this.#prune(node);
  }

  /**
   * Return the (possibly empty) bucket of values stored at exactly
   * this path. Returns an array, never null. Order is insertion
   * order (Set iteration order).
   */
  public exact(path: string): T[] {
    const node = this.#walk(path);
    if (!node || !node.values) return [];
    return [...node.values];
  }

  /**
   * Walk the trie and return every value at a path matching `pattern`.
   * Pattern syntax matches {@link PathPatternApi}: `*`, `**`, `?`.
   *
   * The walk avoids materializing the full path set — `**` triggers a
   * subtree descent, plain literal segments do an O(1) child lookup,
   * and only `*` / `?` segments fan out across siblings.
   *
   * Order of results is unspecified across siblings (Map iteration
   * order is insertion order in practice, but callers should not rely
   * on it).
   */
  public glob(pattern: string): T[] {
    const segments = pattern.split('/');
    const out: T[] = [];
    this.#globWalk(this.#root, segments, 0, out);
    return out;
  }

  /**
   * Remove every entry from the trie. Restores a never-used state.
   */
  public clear(): void {
    this.#root = new PathTrieNode<T>(null, null);
    this.#size = 0;
  }

  /**
   * Number of (path, value) pairs currently in the trie. A path with
   * three values contributes three to the size.
   */
  public get size(): number {
    return this.#size;
  }

  /**
   * Test helper. Returns true when the trie has been fully pruned
   * (no children at any depth, no terminal values).
   */
  public isEmpty(): boolean {
    return this.#root.children.size === 0 && this.#root.values === null;
  }

  #walk(path: string): PathTrieNode<T> | null {
    let node: PathTrieNode<T> | null = this.#root;
    for (const seg of path.split('/')) {
      node = node!.children.get(seg) ?? null;
      if (node === null) return null;
    }
    return node;
  }

  #walkOrCreate(path: string): PathTrieNode<T> {
    let node = this.#root;
    for (const seg of path.split('/')) {
      let next = node.children.get(seg);
      if (!next) {
        next = new PathTrieNode<T>(node, seg);
        node.children.set(seg, next);
      }
      node = next;
    }
    return node;
  }

  #prune(start: PathTrieNode<T>): void {
    let node: PathTrieNode<T> | null = start;
    while (
      node &&
      node.parent &&
      node.children.size === 0 &&
      node.values === null
    ) {
      node.parent.children.delete(node.segment!);
      node = node.parent;
    }
  }

  #globWalk(
    node: PathTrieNode<T>,
    segments: string[],
    i: number,
    out: T[]
  ): void {
    if (i === segments.length) {
      if (node.values) {
        for (const v of node.values) out.push(v);
      }
      return;
    }
    const seg = segments[i]!;
    if (seg === '**') {
      // ** matches zero or more remaining segments. Try matching zero
      // here, then descend into every child for >0 matches.
      this.#globWalk(node, segments, i + 1, out);
      const stack: PathTrieNode<T>[] = [...node.children.values()];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        this.#globWalk(cur, segments, i + 1, out);
        for (const child of cur.children.values()) stack.push(child);
      }
      return;
    }
    if (seg.includes('*') || seg.includes('?')) {
      // Single-segment glob: fan out to children whose segment matches.
      const re = PathPatternApi.compile(seg);
      for (const [childSeg, child] of node.children) {
        if (re.test(childSeg)) {
          this.#globWalk(child, segments, i + 1, out);
        }
      }
      return;
    }
    // Literal segment: O(1) child lookup.
    const child = node.children.get(seg);
    if (child) this.#globWalk(child, segments, i + 1, out);
  }
}
