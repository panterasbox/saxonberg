/**
 * MQL via augmentations — per-subsystem fields stamped onto
 * {@link MqlMatchVia} via TypeScript declaration merging.
 *
 * Phase 5 concentrates the `detailPath` and `exit` augmentations here
 * so the resolver can attach attribution without depending on
 * subsystem files. Phase 7 moves these declarations into the owning
 * subsystem modules:
 *
 *   - `detailPath?: string[]` → `lib/description/Detailed.ts`
 *   - `exit?: Exit` → `lib/spatial/Exit.ts`
 *
 * Importing this module ensures the augmentation is loaded even when
 * the resolver hasn't been touched. Pure type code — no runtime exit.
 */

import type Exit from '../../lib/boundary/Exit';

declare module './types' {
  interface MqlMatchVia {
    /**
     * Detail name path for matches that arrived through a host's
     * Detailed-mixin descriptors. Single-element for top-level
     * details, longer for nested navigation (`here:bookcase:book`
     * lands `detailPath: ['bookcase', 'book']` on the room match).
     */
    detailPath?: string[];

    /**
     * Exit reference for matches that arrived through a Location's
     * exits (direction or alias). The matched Stuff is the location;
     * the exit gives access to direction, destination, door, etc.
     */
    exit?: Exit;
  }
}

export {};
