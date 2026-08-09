/**
 * SearchApi — one search surface over the world's durable writing.
 *
 * The wiki, the forums, the chat archive, the press releases and the
 * rulebook all keep durable history already, so search is **projection
 * work over existing storage**: no new collection, no index build. That
 * is the only reason it fits inside a client cycle at all.
 *
 * ⚠ **Its verb is `recall`, not `search`.** `search` is the in-world
 * perception verb — going over a room for something concealed — and it
 * keeps that meaning. An Api with no verb would break the axiom on the
 * one panel that advertises it: every click sends a command, so a
 * search UI with no command behind it is the single panel that cannot
 * show you what it just ran.
 *
 * ⚠ **Viewer-filtering DELETES.** A source the reader may not read is
 * *absent* from the results, never present-and-redacted. A redaction
 * placeholder tells you a thing exists, which is the fact being
 * withheld — the honest-fog rule the affordance resolver already
 * follows.
 *
 * ⚠ **The call shape must survive gaining a `'mine'` scope.** The
 * decision not to keep a per-player frame store is deliberate but
 * reversible (requirements § 2), so scope is a *value on the request*
 * rather than a method name. `recallMine()` would have made the
 * reversal a reshape.
 *
 * The acting reader comes from the execution context, never a
 * parameter — a caller that could name the viewer could read as
 * somebody else.
 */

import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { fileURLToPath } from 'url';
import { SearchLogic } from '../obj/api/SearchLogic';

/** The durable sources `recall` reads. `all` fans out across the five. */
export type SearchScope =
  | 'wiki'
  | 'forum'
  | 'chat'
  | 'press'
  | 'help'
  | 'all';

/** Every {@link SearchScope}, in menu order. */
export const SEARCH_SCOPES: readonly SearchScope[] = [
  'wiki',
  'forum',
  'chat',
  'press',
  'help',
  'all',
];

/**
 * One result. Deliberately thin: a hit is a pointer *into* a source,
 * not a copy of it — the reader follows the `command` to read the real
 * thing, which re-checks their access at that moment.
 */
export interface SearchHit {
  /** Which source it came from. Never `'all'`. */
  scope: Exclude<SearchScope, 'all'>;
  /** The thing's own title / handle. */
  title: string;
  /** A short excerpt, already viewer-safe. */
  excerpt: string;
  /**
   * The command that opens it — so a result row obeys the same rule
   * every other clickable does: it previews exactly what it sends.
   */
  command: string;
}

export interface SearchRequest {
  scope: SearchScope;
  terms: string;
  limit?: number;
}

const LOGIC_PATH = '/obj/api/search';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/SearchLogic', import.meta.url)
);

function logic(): SearchLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SearchLogic'
      ) as typeof SearchLogic | null) ?? SearchLogic)()
  );
}

export class SearchApi {
  private constructor() {}

  /**
   * Search the durable sources. Results are viewer-filtered by
   * deletion: what the reader may not read is absent.
   *
   * `scope: 'all'` fans out across the five real sources and
   * interleaves, capped by `limit` overall rather than per source — a
   * per-source cap would let one chatty source crowd the others out of
   * a short list.
   */
  public static query(req: SearchRequest): Promise<SearchHit[]> {
    return logic().query(req);
  }
}

SecurityApi.decorateApiClass(SearchApi);
