/**
 * Hose — ⭐ **the air hose of a hard-hat suit** (underwater C3, D27): the
 * reinforced rubber pipe from the air pump to a diver's helmet. It is a
 * `Line` — the tender hauls on it and the diver tugs on it, as on a
 * lifeline — but it is NOT a rope (the owner, cordage: *a rope and a hose
 * are different things; if they share a superclass that's fine*). Its free
 * end feeds the helmet; you do not climb it, tie a knot in it or lay it at
 * a ropewalk.
 */

import Line from '@saxonberg/server/mud/lib/spatial/Line';

export default class Hose extends Line {
  /** ⭐ The end of a hose is a hose's end (the underwater browser walk). */
  public override endWords(): { short: string; keywords: string[] } {
    return { short: 'end of an air hose', keywords: ['hose', 'air hose', 'hose end'] };
  }
}
