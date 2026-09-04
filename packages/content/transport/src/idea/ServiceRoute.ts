/**
 * ServiceRoute — **an authored route row**: a service's fixed run over a
 * lane.
 *
 * A data `Idea` in the catalogue, resolve-on-read, never cloned as live
 * Stuff — the `Lane` / `Watercourse` shape.
 *
 * ## ⚠ Why this is not `Route`
 *
 * They are two different things that share a word, and the split is
 * load-bearing:
 *
 * | | |
 * |---|---|
 * | **`ServiceRoute`** (here) | a ROW an author writes — *"the express runs these nodes and stops at these two"* |
 * | **`Route`** (`lib/journey/Route`) | the VALUE a Journey travels, which may equally have been computed per request |
 *
 * A per-request trip must not mint a Stuff — it would be unaddressable
 * and un-editable, the exact anti-pattern `lint:census` exists to catch
 * — so the thing a Journey holds cannot be template-backed. And an
 * authored service run must be a row, or an author cannot write one. So:
 * a row class here, a value object there, and `LaneCatalogue.routeByKey`
 * turns one into the other.
 *
 * ⭐ Which is the point of AC15n from the other side: **the Journey
 * cannot tell whether the `Route` it holds came off a row or out of a
 * breadth-first search.** Two lanes, two stop sets, one shape.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * Template-path prefix every authored service-route ROW lives under —
 * in the **commons**, beside the lanes and the watercourses, and for the
 * same reason: a timetable over somebody's valley is a fact about their
 * realm, and the realm's own pack has to be able to edit it.
 */
export const SERVICE_ROUTE_PATH_PREFIX = '/stuff/idea/ServiceRoute';

export default class ServiceRoute extends Idea {
  /** See {@link SERVICE_ROUTE_PATH_PREFIX}. */
  static readonly TEMPLATE_PATH_PREFIX = SERVICE_ROUTE_PATH_PREFIX;

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    name: { persistent: true, authorable: true },
    laneKey: { persistent: true, authorable: true },
    nodes: { persistent: true, authorable: true },
    stops: { persistent: true, authorable: true },
  };

  protected key = '';
  protected name = '';
  protected laneKey = '';
  protected nodes: string[] = [];
  protected stops: string[] = [];

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    this.key = value;
  }

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  public getLaneKey(): string {
    return this.laneKey;
  }
  public setLaneKey(value: string): void {
    this.laneKey = value;
  }

  /** Every node the run passes, in order — including the ones it does not stop at. */
  public getNodes(): string[] {
    return [...this.nodes];
  }
  public setNodes(value: string[]): void {
    this.nodes = Array.isArray(value) ? [...value] : [];
  }

  /** Where a traveller may board or alight. Empty ⇒ everywhere it passes. */
  public getStops(): string[] {
    return [...this.stops];
  }
  public setStops(value: string[]): void {
    this.stops = Array.isArray(value) ? [...value] : [];
  }
}
