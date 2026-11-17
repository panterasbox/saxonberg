/**
 * A stand-in for the location graph's ATTACHMENTS (the scan sweep) — what
 * is attached to a place, keyed by anchor path, read up the place's
 * ancestry exactly as `LocationGraphRegistry` reads it. Registered at the
 * registry's own path, so `NavigationApi.attachedTo` / `structureAt` and
 * every reader behind them answer from it without a graph build.
 */
import { Idea } from '../../stuff/Idea';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { AttachmentKind, SkylineEntry, SkylineQuery } from '../../../api/navigation';
import type { GeoPosition } from '../../expanse/GeoPosition';
import type { Vantage } from '../../perception/Vantage';
import type { Stuff } from '../../stuff/Stuff';

type Attached = Record<string, Array<[string, AttachmentKind]>>;

/** A structure on the fake skyline: where it stands and how tall (top above the sea). */
export interface FakeMark {
  path: string;
  at: GeoPosition;
  heightM: number;
  topM?: number;
  landmark?: boolean;
  showsLight?: boolean;
}

class FakeAttachmentRegistry extends Idea {
  public table: Attached = {};
  /** The skyline's marks (geography) — read like the real registry's, without the handful cut. */
  public marks: FakeMark[] = [];
  public skylineNow(vantage: Vantage, query: SkylineQuery): SkylineEntry[] {
    const out: SkylineEntry[] = [];
    for (const m of this.marks) {
      if (query.own === m.path) continue;
      const line = vantage.lineTo(m.at, m.topM ?? m.heightM);
      const near = (query.nearM ?? 0) > 0 && line.rangeNm * 1852 <= (query.nearM ?? 0);
      if (!near && line.rangeNm > line.clearNm) continue;
      out.push({
        path: m.path, live: null, at: m.at, ...line, near,
        heightM: m.heightM, landmark: m.landmark === true, showsLight: m.showsLight === true,
      });
    }
    return out.sort((a, b) => Number(b.landmark) - Number(a.landmark));
  }
  public async skylineReady(): Promise<void> {}
  public markPointNow(path: string): GeoPosition | null {
    return this.marks.find((m) => m.path === path)?.at ?? null;
  }
  public live = new Map<string, Stuff>();
  public attachStructure(extent: string, structure: Stuff): void {
    this.live.set(extent, structure);
  }
  public detachStructure(extent: string, structure: Stuff): void {
    if (this.live.get(extent)?.stuffId === structure.stuffId) this.live.delete(extent);
  }
  public liveStructuresAt(path: string): Stuff[] {
    const out: Stuff[] = [];
    let probe = path;
    while (probe.length > 0) {
      const s = this.live.get(probe);
      if (s) out.push(s);
      const cut = probe.lastIndexOf('/');
      if (cut <= 0) break;
      probe = probe.slice(0, cut);
    }
    return out;
  }
  public attachedNow(path: string, kind?: AttachmentKind): string[] {
    const out = new Set<string>();
    let probe = path;
    while (probe.length > 0) {
      for (const [t, k] of this.table[probe] ?? []) if (!kind || k === kind) out.add(t);
      const cut = probe.lastIndexOf('/');
      if (cut <= 0) break;
      probe = probe.slice(0, cut);
    }
    return [...out];
  }
  public async attachedTo(path: string, kind?: AttachmentKind): Promise<string[]> {
    return this.attachedNow(path, kind);
  }
  public attachedWithinNow(extent: string, kind?: AttachmentKind): string[] {
    const out = new Set<string>();
    for (const [anchor, list] of Object.entries(this.table)) {
      if (anchor !== extent && !anchor.startsWith(`${extent}/`)) continue;
      for (const [t, k] of list) if (!kind || k === kind) out.add(t);
    }
    return [...out];
  }
  public async attachedWithin(extent: string, kind?: AttachmentKind): Promise<string[]> {
    return this.attachedWithinNow(extent, kind);
  }
}

/** Stand the fake up with `table` (anchor → [target, kind][]); returns it to mutate. */
export function attachGraph(table: Attached = {}): FakeAttachmentRegistry {
  const reg = makeStuffAtPath(() => new FakeAttachmentRegistry(), '/platform/idea/LocationGraphRegistry');
  reg.table = table;
  return reg;
}
