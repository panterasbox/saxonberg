/**
 * PathTrie — path-keyed trie with exact lookup and glob walk.
 *
 * A `lib/collections/` primitive: paths are split on `/` into segments,
 * each segment a level; multiple values may share a path (a `Set<T>`
 * lives at each terminal node). On removal the trie prunes any node
 * that becomes empty (no children, no values), so a balanced
 * `insert` / `remove` pair leaves the trie identical to its
 * never-inserted state.
 *
 * Backs `StuffApi`'s `byTemplatePath` index and MQL path-glob
 * resolution. Glob walk delegates to {@link PathPatternApi.compile}
 * (its face for glob syntax), so pattern syntax (`*`, `**`, `?`) stays
 * consistent with the rest of the codebase. The walk is segment-aware
 * where possible — `**` segments enable a full subtree descent, while
 * `*` and `?` segments stay within one level — so the walker doesn't
 * have to enumerate every leaf.
 */

import { PathPatternApi } from '../../api/path-pattern';

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
   * Return the values stored at the longest path that is a prefix of
   * `path` (segment-wise) and carries values — the nearest-ancestor
   * (or exact) match. Walks segment-by-segment from the root,
   * remembering the deepest node along the way that owns a value
   * bucket. Returns `[]` when no ancestor-or-exact path has values.
   *
   * Reuses the same `/`-split segment discipline as the other walks —
   * it introduces no parallel path syntax and carries no glob
   * semantics (matching is exact-per-segment). O(depth) literal
   * descent.
   */
  public longestPrefix(path: string): T[] {
    const best = this.#longestPrefixNode(path);
    return best && best.values ? [...best.values] : [];
  }

  /**
   * The path string of the longest value-carrying prefix of `path`, or
   * `null` when none. Companion to {@link longestPrefix} for callers
   * that need the matched prefix itself (e.g. provenance rendering).
   */
  public longestPrefixPath(path: string): string | null {
    const best = this.#longestPrefixNode(path);
    if (!best || !best.values) return null;
    const segs: string[] = [];
    let node: PathTrieNode<T> | null = best;
    while (node && node.parent) {
      segs.push(node.segment!);
      node = node.parent;
    }
    return segs.reverse().join('/');
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

  #longestPrefixNode(path: string): PathTrieNode<T> | null {
    let node: PathTrieNode<T> = this.#root;
    let best: PathTrieNode<T> | null = this.#root.values ? this.#root : null;
    for (const seg of path.split('/')) {
      const next = node.children.get(seg);
      if (!next) break;
      node = next;
      if (node.values) best = node;
    }
    return best;
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
