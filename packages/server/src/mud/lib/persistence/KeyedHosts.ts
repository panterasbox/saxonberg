/**
 * KeyedHosts — ⭐ **the live keyed persistable hosts, indexed by
 * `(row, key)`** (harbors review 2).
 *
 * A keyed host's identity IS the pair: its row (the template it was
 * cloned from) and the key its record is filed under. "Is it already
 * standing?" used to be answered by a scan of every live instance of the
 * row (`StuffApi.findAllByTemplatePath`) — a search, and one that grew
 * with every smack, every pet and every stall of a kind. A host enters
 * this index the moment it is given its key (`Persistable.setPersistenceKey`)
 * and is read back by the pair.
 *
 * Entries are weak: the index never keeps a host alive. A read checks the
 * host still answers to the pair (not destroyed, still in the registry,
 * same row, same key) and drops the entry when it does not.
 */

import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../stuff/Stuff';
import type { Persistable } from './Persistable';

/**
 * The `(row, key)` index of live keyed hosts.
 *
 * @internal Written by `Persistable.setPersistenceKey`, read only by the
 *   persistence spine (`PersistableLogic`); never author surface.
 */
export class KeyedHosts {
  /** `row \u0000 key` → every host given that key (normally one). */
  private static readonly byPair = new Map<string, Set<WeakRef<Stuff & Persistable>>>();

  /** File a host under the key it has just been given. */
  public static note(host: Stuff & Persistable, key: string): void {
    const row = host.getTemplatePath();
    if (!row) return;
    const id = `${row}\u0000${key}`;
    let refs = KeyedHosts.byPair.get(id);
    if (refs === undefined) {
      refs = new Set();
      KeyedHosts.byPair.set(id, refs);
    }
    for (const ref of refs) if (ref.deref()?.stuffId === host.stuffId) return;
    refs.add(new WeakRef(host));
  }

  /**
   * Every live host keyed `(row, key)` — at most one, unless something has
   * gone wrong (the spine's unique-key assertion reads this to say so).
   */
  public static all(row: string, key: string): (Stuff & Persistable)[] {
    const id = `${row}\u0000${key}`;
    const refs = KeyedHosts.byPair.get(id);
    if (refs === undefined) return [];
    const out: (Stuff & Persistable)[] = [];
    for (const ref of [...refs]) {
      // The REGISTERED instance (the proxy everybody else holds) — and only
      // while it is still registered (a registry reset forgets every host)
      // and still answers to the pair.
      const noted = ref.deref();
      const host = noted ? (StuffApi.findById(noted.stuffId) as (Stuff & Persistable) | undefined) : undefined;
      if (
        host === undefined ||
        host.isDestroyed() ||
        host.getTemplatePath() !== row ||
        host.getPersistenceKey() !== key
      ) {
        refs.delete(ref);
        continue;
      }
      if (!out.some((h) => h.stuffId === host.stuffId)) out.push(host);
    }
    if (refs.size === 0) KeyedHosts.byPair.delete(id);
    return out;
  }

  /** The live host keyed `(row, key)`, or `null`. */
  public static find(row: string, key: string): (Stuff & Persistable) | null {
    return KeyedHosts.all(row, key)[0] ?? null;
  }
}
