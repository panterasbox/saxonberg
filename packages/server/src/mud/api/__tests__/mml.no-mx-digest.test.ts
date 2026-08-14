/**
 * ⚠⚠ **The `mx` composition digest is CUT, and this is the scan that
 * keeps it cut.**
 *
 * The affordance reference art shows three layers and the first is
 * `<thing mx="Tangible,Thermal,Furnace,…">` — a mixin digest riding the
 * MML so a client menu could read composition off scrollback. It does
 * not exist and must not be built. Three reasons, none of which has
 * expired:
 *
 * - **Composition is not stable.** `getActiveMixins` unions augments,
 *   implants, species innates and on-shift conferral, so a digest
 *   printed into a frame goes stale exactly as a verb list would — and
 *   a stale menu is worse than no menu, because it is confident.
 * - **It is redundant.** Every identity tag already carries a
 *   `stuff-id`, which is the handle a fresh resolve needs.
 * - **It is unreconcilable with hand-authored MML.** An author writing
 *   `<thing>` by hand cannot be made to keep a digest current, so half
 *   the frames in the game would carry a truthful digest and half
 *   would carry none, with nothing on the wire to tell them apart.
 *
 * ⭐ What ships instead is `CommandApi.resolveAffordances`, which
 * returns `composition` beside `verbs` for exactly this purpose — one
 * round trip, answered at the moment the menu opens.
 *
 * This is a **source scan** rather than a policy assertion because the
 * failure it guards against is somebody adding the attribute back at an
 * emitter, which no runtime check over the tag registry would see: the
 * registry does not know what attributes an emitter writes.
 */

import { describe, it, expect } from 'vitest';
import { KNOWN_TAGS } from '../mml/tags';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/** `packages/server/src/mud` — the whole mudlib. */
const MUD_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      yield* sourceFiles(full);
    } else if (entry.name.endsWith('.ts')) {
      yield full;
    }
  }
}

/**
 * An `mx="…"` attribute on any tag, in markup or in an attribute
 * object. Both spellings, because a digest could be added either way:
 * `<thing mx="…">` written into a template literal, or `{ mx: … }`
 * passed as an attrs bag.
 */
const MX_IN_MARKUP = /<[a-z-]+[^>]*\bmx\s*=/i;
const MX_AS_ATTR = /\bmx\s*:\s*(?!\/\/)/;

describe('the `mx` composition digest', () => {
  it('is not emitted anywhere in the mudlib', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(MUD_ROOT)) {
      const src = readFileSync(file, 'utf-8');
      if (MX_IN_MARKUP.test(src) || MX_AS_ATTR.test(src)) {
        offenders.push(file.slice(MUD_ROOT.length + 1));
      }
    }
    expect(
      offenders,
      'the `mx` digest was CUT (client-slate § "Why the `mx` digest was ' +
        'cut"). Composition rides `CommandApi.resolveAffordances`, which ' +
        'answers fresh; a digest in scrollback goes stale and reads as ' +
        'authoritative. These files emit one:',
    ).toEqual([]);
  });

  it('⭐ the scan actually catches one — it is not vacuously green', () => {
    // ⚠⚠ A source scan that matches nothing looks identical whether the
    // rule holds or the regex is broken. Both spellings are exercised
    // against a synthetic sample, because a scan is only evidence if it
    // has been shown to fail.
    expect(MX_IN_MARKUP.test('Mml.fromMarkup(`<thing mx="Tangible">x</thing>`)'))
      .toBe(true);
    expect(MX_AS_ATTR.test('const attrs = { mx: composition.join(",") };')).toBe(
      true,
    );
    // …and does not fire on the things it must not: a variable called
    // `mx`, or a CSS-ish `max-width` fragment.
    expect(MX_IN_MARKUP.test('<thing stuff-id="abc">x</thing>')).toBe(false);
    expect(MX_AS_ATTR.test('const mxRegex = /x/;')).toBe(false);
  });

  it('`mx` is not a tag in the MML vocabulary either', () => {
    // The scan catches an emitter writing the ATTRIBUTE. This catches
    // the other shape somebody might reach for — a `<mx>` element.
    expect(KNOWN_TAGS.has('mx')).toBe(false);
  });
});
