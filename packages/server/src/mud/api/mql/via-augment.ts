/**
 * MQL via augmentations — per-subsystem fields stamped onto
 * {@link MqlMatchVia} via TypeScript declaration merging.
 *
 * The `detailPath` augmentation lives here so the resolver can attach
 * attribution without depending on subsystem files.
 *
 * ⭐ There is no `exit` augmentation: a direction
 * binds the Exit itself as the match's `stuff`, so a via is only ever
 * plain data.
 *
 * Importing this module ensures the augmentation is loaded even when
 * the resolver hasn't been touched. Pure type code — no runtime exit.
 */

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
     * ⭐ The kept set a match was reached through (naming overhaul D-B6):
     * `me:~friends:iffy` binds Iffy with `relation: { holder: <you>,
     * name: 'friends' }` — so `contacts remove` knows which list without
     * re-reading what was typed. Built-ins carry it too.
     */
    relation?: { holder: import('../../lib/stuff/Stuff').Stuff; name: string; meaning: string };
  }
}

export {};
