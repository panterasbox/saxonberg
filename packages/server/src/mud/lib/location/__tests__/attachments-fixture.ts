/**
 * A stand-in for the location graph's ATTACHMENTS (the scan sweep) — what
 * is attached to a place, keyed by anchor path, read up the place's
 * ancestry exactly as `LocationGraphRegistry` reads it. Registered at the
 * registry's own path, so `NavigationApi.attachedTo` / `structureAt` and
 * every reader behind them answer from it without a graph build.
 */
import { Idea } from '../../stuff/Idea';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { AttachmentKind } from '../../../api/navigation';
import type { Stuff } from '../../stuff/Stuff';

type Attached = Record<string, Array<[string, AttachmentKind]>>;

class FakeAttachmentRegistry extends Idea {
  public table: Attached = {};
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
