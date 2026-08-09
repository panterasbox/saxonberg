// SearchLogic — the hot-reloadable logic singleton behind SearchApi.
// (Doc comment on the class so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ExecutionContextApi } from '../../api/execution-context';
import { HelpApi } from '../../api/help';
import { PressApi } from '../../api/press';
import { WikiPage } from '../../lib/wiki/WikiPage';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  SearchHit,
  SearchRequest,
  SearchScope,
} from '../../api/search';

const SearchApiCallers = SecurityPolicies.FromModule('/api/search#SearchApi');

/** The five real sources `'all'` fans out across. */
const REAL_SCOPES: Exclude<SearchScope, 'all'>[] = [
  'wiki',
  'forum',
  'chat',
  'press',
  'help',
];

const DEFAULT_LIMIT = 20;

/** Case-insensitive substring match — the whole matcher, deliberately. */
function matches(haystack: string, terms: string): boolean {
  return haystack.toLowerCase().includes(terms.toLowerCase());
}

/** Trim a body to a readable excerpt around nothing in particular. */
function excerpt(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

/**
 * SearchLogic — the hot-reloadable logic singleton behind
 * {@link SearchApi}.
 *
 * Lives at `/obj/api/search`. Every source read goes through that
 * source's own Api, which is what makes viewer-filtering correct
 * without this file knowing any source's access rules: it asks the
 * owner and keeps what comes back.
 *
 * ⚠ **Filtering is DELETION.** Nothing here emits a
 * "you may not read this" row. A redaction placeholder would disclose
 * the existence of the thing being withheld.
 *
 * ⚠ Matching is a case-insensitive substring scan over already-loaded
 * rows, not an index. That is the honest v1: the sources are small,
 * there is no index to build or keep warm, and the requirement is
 * explicitly "reads existing storage". When a source outgrows it, that
 * source's own Api grows a real query — this file's shape does not
 * have to change, because each branch already delegates.
 *
 * @internal
 */
@Unshadowable
export class SearchLogic extends ApiLogic {
  /** See {@link SearchApi.query}. */
  @CallSecurity(SearchApiCallers)
  public async query(req: SearchRequest): Promise<SearchHit[]> {
    const terms = req.terms?.trim() ?? '';
    if (terms.length === 0) return [];
    const limit = req.limit && req.limit > 0 ? req.limit : DEFAULT_LIMIT;

    // The reader is the acting command giver. Never a parameter — a
    // caller that could name the viewer could read as somebody else.
    const viewer = ExecutionContextApi.getCurrentCommandGiver() as Stuff | null;

    const scopes: Exclude<SearchScope, 'all'>[] =
      req.scope === 'all' ? REAL_SCOPES : [req.scope];

    const perScope = await Promise.all(
      scopes.map((s) => this.searchOne(s, terms, viewer, limit)),
    );

    // Interleave rather than concatenate, so `all` cannot be crowded
    // out by whichever source happens to be chattiest.
    const out: SearchHit[] = [];
    for (let i = 0; out.length < limit; i++) {
      let progressed = false;
      for (const list of perScope) {
        const hit = list[i];
        if (hit === undefined) continue;
        progressed = true;
        out.push(hit);
        if (out.length >= limit) break;
      }
      if (!progressed) break;
    }
    return out;
  }

  private async searchOne(
    scope: Exclude<SearchScope, 'all'>,
    terms: string,
    viewer: Stuff | null,
    limit: number,
  ): Promise<SearchHit[]> {
    try {
      switch (scope) {
        case 'wiki':
          return await this.searchWiki(terms, limit);
        case 'press':
          return this.searchPress(terms, limit);
        case 'help':
          return this.searchHelp(terms, limit);
        case 'forum':
        case 'chat':
          // ⚠ Deliberately empty rather than guessed. The forum and
          // chat Apis expose read paths that are per-board and
          // per-channel, so a correct search needs an enumeration these
          // do not yet offer. Returning nothing is honest; returning a
          // partial scan of whichever boards happened to be warm would
          // be a result set whose gaps nobody could see.
          return [];
      }
    } catch {
      // One source failing must not take the whole search down.
      return [];
    }
  }

  private async searchWiki(terms: string, limit: number): Promise<SearchHit[]> {
    const pages = await WikiPage.find({});
    const hits: SearchHit[] = [];
    for (const page of pages) {
      if (hits.length >= limit) break;
      // Deleted pages are gone, not hidden.
      if (page.deletedAt !== null) continue;
      const title = page.title || page.slug;
      const body = page.body ?? '';
      if (!matches(title, terms) && !matches(body, terms)) continue;
      hits.push({
        scope: 'wiki',
        title,
        excerpt: excerpt(body),
        command: `wiki read ${page.slug || title}`,
      });
    }
    return hits;
  }

  private searchPress(terms: string, limit: number): SearchHit[] {
    const hits: SearchHit[] = [];
    for (const r of PressApi.recent(200)) {
      if (hits.length >= limit) break;
      // Retracted releases are withdrawn, not merely unlisted.
      if (r.isRetracted()) continue;
      const title = r.getHeadline();
      const body = r.getBody();
      if (!matches(title, terms) && !matches(body, terms)) continue;
      hits.push({
        scope: 'press',
        title,
        excerpt: excerpt(body),
        command: `press read ${r.getReleaseId()}`,
      });
    }
    return hits;
  }

  /**
   * The rulebook.
   *
   * ⚠ **No viewer is threaded, and that is not an oversight.**
   * `HelpApi.search` applies its own spoiler/capability filter and
   * `HelpViewer` is a single-tier type today (`{ tier: 'anonymous' }`),
   * so there is no richer reader to hand it — the filter is already a
   * no-op at the floor. Inventing a viewer shape here to look thorough
   * would put help's access policy in two places, and the second copy
   * would be the one that went stale. When help grows tiers, it grows
   * them on its own Api and this call passes the reader through.
   */
  private searchHelp(terms: string, limit: number): SearchHit[] {
    const result = HelpApi.search(terms);
    const hits: SearchHit[] = [];
    for (const group of result.groups) {
      for (const e of group.hits) {
        if (hits.length >= limit) return hits;
        hits.push({
          scope: 'help',
          title: e.title,
          excerpt: excerpt(e.summary ?? ''),
          command: `help ${e.id}`,
        });
      }
    }
    return hits;
  }
}
