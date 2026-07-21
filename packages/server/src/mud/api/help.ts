/**
 * HelpApi — the single read chokepoint over the boot-warmed help index.
 *
 * The in-game **rulebook** surface: the `help` verb controller and the
 * REST help routes both read through this facade, never the catalogue
 * directly. Help is transparency-by-default, so the catalogue's reads are
 * ungated (the `RecipeCatalogue`/`TopicCatalogue` precedent); the only
 * gate is the **capability filter**, and it lives once, here.
 *
 * Thin forwarding shell: the warmed index lives in the {@link
 * HelpCatalogue} singleton at `/obj/HelpCatalogue`, resolved synchronously
 * via `StuffApi.findByTemplatePath`. Before the catalogue warms (or in a
 * harness without boot) every read returns an empty result.
 *
 * The capability filter is a **no-op pass at the anonymous floor** this
 * cycle — nothing is withheld — but it runs on every read and is shaped so
 * a real ceiling (the spoiler slate) drops in as a one-place change. The
 * viewer shape stays server-internal; it is not yet a wire DTO.
 */

import type {
  HelpKind,
  HelpTopic,
  HelpIndexEntry,
  HelpIndexResult,
  HelpKindListResult,
  HelpSearchResult,
} from "@saxonberg/types";
import { StuffApi } from "./stuff";
import { TemplatePaths } from "../lib/paths";
import type HelpCatalogue from "../obj/HelpCatalogue";
import { SecurityApi } from './security';

/**
 * The viewer's capability tier. `anonymous` is the floor — sees
 * everything this cycle. The spoiler slate owns the richer shape; the
 * filter logic below is already written against the tier so the ceiling
 * is a one-place flip.
 */
export type HelpViewer = { tier: "anonymous" };

const FLOOR: HelpViewer = { tier: "anonymous" };

/**
 * Whether a viewer may see spoiler-flagged topics. Floor (anonymous) →
 * yes (nothing is a spoiler yet). A future non-floor tier → no.
 */
function viewerCanSeeSpoilers(viewer: HelpViewer): boolean {
  return viewer.tier === "anonymous";
}

/** The warmed HelpCatalogue singleton, or `null` before it warms. */
function catalogue(): HelpCatalogue | null {
  return (
    (StuffApi.findByTemplatePath(
      TemplatePaths.helpCatalogue
    ) as HelpCatalogue | null) ?? null
  );
}

export class HelpApi {
  /** Light index slice + the category descriptors. */
  static index(viewer: HelpViewer = FLOOR): HelpIndexResult {
    const cat = catalogue();
    if (!cat) return { entries: [], categories: [] };
    const entries = HelpApi.applyFilter(
      cat.indexSlice(),
      (e) => cat.getTopic(e.id)?.spoiler ?? false,
      viewer
    );
    return { entries, categories: cat.categories() };
  }

  /** Every topic of one kind (category drill-in). */
  static listKind(
    kind: HelpKind,
    viewer: HelpViewer = FLOOR
  ): HelpKindListResult {
    const cat = catalogue();
    if (!cat) return { kind, topics: [] };
    const topics = HelpApi.applyFilter(
      cat.listByKind(kind),
      (e) => cat.getTopic(e.id)?.spoiler ?? false,
      viewer
    );
    return { kind, topics };
  }

  /** A single full topic by id (body + relations), or `null`. */
  static fullTopic(id: string, viewer: HelpViewer = FLOOR): HelpTopic | null {
    const cat = catalogue();
    if (!cat) return null;
    const topic = cat.getTopic(id);
    return HelpApi.applyFilter(
      topic ? [topic] : [],
      (t) => t.spoiler,
      viewer
    )[0] ?? null;
  }

  /** Search by query, results grouped by kind. */
  static search(q: string, viewer: HelpViewer = FLOOR): HelpSearchResult {
    const cat = catalogue();
    if (!cat) return { query: q, groups: [] };
    const groups = cat.search(q).map((g) => ({
      kind: g.kind,
      hits: HelpApi.applyFilter(
        g.hits,
        (e) => cat.getTopic(e.id)?.spoiler ?? false,
        viewer
      ),
    }));
    return { query: q, groups: groups.filter((g) => g.hits.length > 0) };
  }

  /** Client-local typeahead candidates. */
  static typeahead(q: string, viewer: HelpViewer = FLOOR): HelpIndexEntry[] {
    const cat = catalogue();
    if (!cat) return [];
    return HelpApi.applyFilter(
      cat.typeaheadMatch(q),
      (e) => cat.getTopic(e.id)?.spoiler ?? false,
      viewer
    );
  }

  /** Resolve a command topic by verb (or alias), or `null`. */
  static commandTopic(
    verb: string,
    viewer: HelpViewer = FLOOR
  ): HelpTopic | null {
    const cat = catalogue();
    if (!cat) return null;
    const topic = cat.findCommandTopic(verb);
    return HelpApi.applyFilter(
      topic ? [topic] : [],
      (t) => t.spoiler,
      viewer
    )[0] ?? null;
  }

  /** Resolve an api/mixin/type topic by id / `Type.member` / bare name. */
  static apiTopic(
    target: string,
    viewer: HelpViewer = FLOOR
  ): HelpTopic | null {
    const cat = catalogue();
    if (!cat) return null;
    const topic = cat.findApiTopic(target);
    return HelpApi.applyFilter(
      topic ? [topic] : [],
      (t) => t.spoiler,
      viewer
    )[0] ?? null;
  }

  /**
   * The single capability chokepoint. Every list/single read routes
   * through here. At the anonymous floor it is an **identity pass**
   * (nothing withheld); a real ceiling drops spoiler-flagged items.
   */
  private static applyFilter<T>(
    items: T[],
    spoilerOf: (item: T) => boolean,
    viewer: HelpViewer
  ): T[] {
    if (viewerCanSeeSpoilers(viewer)) return items; // floor: no-op pass
    return items.filter((it) => !spoilerOf(it));
  }
}

SecurityApi.decorateApiClass(HelpApi);
