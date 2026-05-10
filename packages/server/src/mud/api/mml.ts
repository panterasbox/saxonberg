/**
 * Mml — Mud Markup Language composer.
 *
 * Layer 2 of the messaging composer stack. Tagged-template + vocabulary
 * helpers produce final markup strings with auto-escaping of interpolated
 * raw values. The wrapper class makes trust explicit: `Mml.compose` is
 * always safe (escapes raw strings); `Mml.fromMarkup` is the explicit
 * trust assertion (no escaping). The private constructor forces every
 * untrusted-shape wrap through the named factory so audits can grep
 * `Mml.fromMarkup`.
 *
 * The vocabulary helpers (`name`, `speech`, `location`, `direction`,
 * `object`, `item`, `list`) emit Mml fragments that interpolate verbatim
 * inside `Mml.compose`; raw string arguments to vocabulary helpers are
 * always re-escaped — devs who want nested markup must compose with Mml
 * fragments explicitly.
 *
 * For prose externalized from source (settings, CMS-authored
 * descriptions, prompts), reach for `ProseApi.format` in `prose.ts` —
 * Liquid-syntax templates with conditionals and filter chains, same
 * Mml-aware escape rules as `Mml.compose`.
 *
 * `stripTags(body)` parses out tags using a small state machine and
 * decodes the five built-in entities (&lt;, &gt;, &amp;, &quot;, &apos;).
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import { DescribeApi } from './describe';
import { SecurityApi } from './security';

/**
 * Escape the five reserved characters so a raw string can be embedded
 * inside MML markup without being parsed as tag/attribute structure.
 */
function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render an interpolated value into its escaped, MML-safe string form.
 * Mml fragments emit verbatim; objects with `toMml(viewer?)` get
 * unwrapped (viewer threaded through for per-recipient late binding —
 * Quantity, future pedagogical-seam-aware values); everything else is
 * coerced and escaped.
 */
function renderValue(value: unknown, viewer?: Stuff & Sensor): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Mml) return value.toString(viewer);
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toMml?: unknown }).toMml === 'function'
  ) {
    const fragment = (value as { toMml: (v?: unknown) => unknown }).toMml(viewer);
    if (fragment instanceof Mml) return fragment.toString(viewer);
    return escapeText(String(fragment));
  }
  return escapeText(String(value));
}

/**
 * Internal payload — `Mml` carries one of these. `'eager'` is the
 * existing pre-rendered-string path (used by `fromMarkup` and the
 * vocabulary helpers, both of which already produced markup at
 * construction time). `'lazy'` is the `compose`-time deferred form:
 * holds the template parts and value list, materializes per-call in
 * `toString(viewer?)` so per-value `toMml(viewer)` runs at
 * serialization rather than composition.
 */
type MmlPayload =
  | { kind: 'eager'; raw: string }
  | { kind: 'lazy'; strings: readonly string[]; values: readonly unknown[] };

export class Mml {
  /**
   * Private constructor. Use `Mml.compose` for value-driven composition
   * (escapes raw strings) or `Mml.fromMarkup` for trusted MML input.
   */
  private constructor(private readonly payload: MmlPayload) {}

  /**
   * Compose from values via tagged template. Raw strings are escaped;
   * Mml fragments emit verbatim; objects with `toMml(viewer?)` get
   * unwrapped at `toString(viewer?)` time — composition is lazy so a
   * per-recipient render path threads the viewer through to value-side
   * `toMml`.
   */
  static compose(strings: TemplateStringsArray, ...values: unknown[]): Mml {
    return new Mml({
      kind: 'lazy',
      strings: Array.from(strings),
      values,
    });
  }

  /**
   * Wrap a string already known to be valid MML — does NOT escape. Use
   * for hydration, deserialization, or known-trusted programmatic
   * assembly. Misuse = injection. Grep `Mml.fromMarkup` to audit.
   */
  static fromMarkup(raw: string): Mml {
    return new Mml({ kind: 'eager', raw });
  }

  /**
   * Render an entity reference inside `<name stuff-id="...">` tags.
   * The `stuff-id` attribute carries the runtime identity through to
   * the wire — server-side disambiguation walks bodies for these
   * tokens to pick the minimal-distinguishing form per recipient,
   * and client-side features (right-click → tell, social-graph
   * rendering, identity overlays) read the id directly.
   */
  static name(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'something');
    return Mml.fromMarkup(
      `<name stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</name>`
    );
  }

  /** Wrap text in `<speech>"..."</speech>`, escaping the inner text. */
  static speech(text: string): Mml {
    return Mml.fromMarkup(`<speech>"${escapeText(text)}"</speech>`);
  }

  /**
   * Render a location's display name inside `<location stuff-id="...">`
   * tags. Same identity-tagging rationale as `name`.
   */
  static location(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'somewhere');
    return Mml.fromMarkup(
      `<location stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</location>`
    );
  }

  /** Render a direction (e.g., 'north') inside `<direction>` tags. */
  static direction(d: string): Mml {
    return Mml.fromMarkup(`<direction>${escapeText(d)}</direction>`);
  }

  /**
   * Render a generic object's display name inside
   * `<object stuff-id="...">` tags. Same identity-tagging rationale
   * as `name`.
   */
  static object(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'something');
    return Mml.fromMarkup(
      `<object stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</object>`
    );
  }

  /**
   * Render an item's display name inside `<item stuff-id="...">`
   * tags. Same identity-tagging rationale as `name`.
   */
  static item(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'an item');
    return Mml.fromMarkup(
      `<item stuff-id="${escapeText(stuff.stuffId)}">${escapeText(display)}</item>`
    );
  }

  /**
   * Join a list of Mml fragments with English-style commas and "and".
   * Empty list emits `nothing`. Single item emits as-is.
   */
  static list(items: Mml[]): Mml {
    if (items.length === 0) return Mml.fromMarkup('nothing');
    if (items.length === 1) return Mml.fromMarkup(items[0]!.toString());
    if (items.length === 2) {
      return Mml.fromMarkup(`${items[0]!.toString()} and ${items[1]!.toString()}`);
    }
    const head = items.slice(0, -1).map((i) => i.toString()).join(', ');
    return Mml.fromMarkup(`${head}, and ${items[items.length - 1]!.toString()}`);
  }

  /**
   * Escape the five reserved characters (`<`, `>`, `&`, `"`, `'`) so
   * a raw string can be embedded inside MML markup without being
   * parsed as tag/attribute structure. Same rule `Mml.compose`
   * applies to interpolated raw values; exposed publicly so other
   * markup-producers can reuse it.
   */
  static escape(text: string): string {
    return escapeText(text);
  }

  /**
   * Strip MML tags from a markup body, decoding the five built-in
   * entities. Used by clients/log capture that need a plain-text
   * projection. State-machine parser; tolerates unclosed tags by
   * dropping their characters.
   */
  static stripTags(body: string): string {
    let out = '';
    let i = 0;
    const len = body.length;

    while (i < len) {
      const ch = body[i]!;

      if (ch === '<') {
        // Skip until matching '>' (or end of string).
        i++;
        while (i < len && body[i] !== '>') i++;
        if (i < len) i++; // consume '>'
        continue;
      }

      if (ch === '&') {
        // Try to decode an entity. Only the five we emit are recognised.
        const semi = body.indexOf(';', i + 1);
        if (semi !== -1 && semi - i <= 6) {
          const entity = body.slice(i + 1, semi);
          const decoded = decodeEntity(entity);
          if (decoded !== null) {
            out += decoded;
            i = semi + 1;
            continue;
          }
        }
        out += '&';
        i++;
        continue;
      }

      out += ch;
      i++;
    }

    return out;
  }

  /**
   * Materialize this Mml fragment to a wire string. Eager fragments
   * return their pre-rendered markup; lazy fragments (built via
   * `Mml.compose`) walk the template parts and resolve each value
   * through `renderValue(value, viewer)` so per-recipient `toMml`
   * implementations see the recipient.
   *
   * Viewer is forward-compatible with the deferred pedagogical-seam
   * setting and with any future per-viewer prose differentiation. v1
   * propagates the parameter without consulting it inside the
   * shipped `toMml` implementations.
   */
  toString(viewer?: Stuff & Sensor): string {
    if (this.payload.kind === 'eager') return this.payload.raw;
    let out = '';
    const { strings, values } = this.payload;
    for (let i = 0; i < strings.length; i++) {
      out += strings[i];
      if (i < values.length) {
        out += renderValue(values[i], viewer);
      }
    }
    return out;
  }

  /**
   * `JSON.stringify` hook. Materializes with no viewer (the same
   * viewer-less default a no-arg `toString()` produces). Persistence
   * paths reach `toJSON()` only on already-eager strings; treat as
   * the viewer-agnostic snapshot.
   */
  toJSON(): string {
    return this.toString();
  }
}

function decodeEntity(name: string): string | null {
  switch (name) {
    case 'lt':
      return '<';
    case 'gt':
      return '>';
    case 'amp':
      return '&';
    case 'quot':
      return '"';
    case 'apos':
      return "'";
    default:
      return null;
  }
}

SecurityApi.decorateApiClass(Mml);
