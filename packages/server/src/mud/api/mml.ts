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
 * `stripTags(body)` parses out tags using a small state machine and
 * decodes the five built-in entities (&lt;, &gt;, &amp;, &quot;, &apos;).
 */

import type { Stuff } from '../lib/stuff/Stuff';
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
 * Mml fragments emit verbatim; everything else is coerced and escaped.
 */
function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Mml) return value.toString();
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toMml?: unknown }).toMml === 'function'
  ) {
    const fragment = (value as { toMml: () => unknown }).toMml();
    if (fragment instanceof Mml) return fragment.toString();
    return escapeText(String(fragment));
  }
  return escapeText(String(value));
}

export class Mml {
  /**
   * Private constructor. Use `Mml.compose` for value-driven composition
   * (escapes raw strings) or `Mml.fromMarkup` for trusted MML input.
   */
  private constructor(private readonly raw: string) {}

  /**
   * Compose from values via tagged template. Raw strings are escaped;
   * Mml fragments emit verbatim; objects with `toMml()` get unwrapped.
   */
  static compose(strings: TemplateStringsArray, ...values: unknown[]): Mml {
    let out = '';
    for (let i = 0; i < strings.length; i++) {
      out += strings[i];
      if (i < values.length) {
        out += renderValue(values[i]);
      }
    }
    return new Mml(out);
  }

  /**
   * Wrap a string already known to be valid MML — does NOT escape. Use
   * for hydration, deserialization, or known-trusted programmatic
   * assembly. Misuse = injection. Grep `Mml.fromMarkup` to audit.
   */
  static fromMarkup(raw: string): Mml {
    return new Mml(raw);
  }

  /** Render the human-readable name of a Stuff inside `<name>` tags. */
  static name(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'something');
    return new Mml(`<name>${escapeText(display)}</name>`);
  }

  /** Wrap text in `<speech>"..."</speech>`, escaping the inner text. */
  static speech(text: string): Mml {
    return new Mml(`<speech>"${escapeText(text)}"</speech>`);
  }

  /** Render a location's display name inside `<location>` tags. */
  static location(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'somewhere');
    return new Mml(`<location>${escapeText(display)}</location>`);
  }

  /** Render a direction (e.g., 'north') inside `<direction>` tags. */
  static direction(d: string): Mml {
    return new Mml(`<direction>${escapeText(d)}</direction>`);
  }

  /** Render a generic object's display name inside `<object>` tags. */
  static object(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'something');
    return new Mml(`<object>${escapeText(display)}</object>`);
  }

  /** Render an item's display name inside `<item>` tags. */
  static item(stuff: Stuff): Mml {
    const display = DescribeApi.getDisplayName(stuff, 'an item');
    return new Mml(`<item>${escapeText(display)}</item>`);
  }

  /**
   * Join a list of Mml fragments with English-style commas and "and".
   * Empty list emits `nothing`. Single item emits as-is.
   */
  static list(items: Mml[]): Mml {
    if (items.length === 0) return new Mml('nothing');
    if (items.length === 1) return new Mml(items[0]!.toString());
    if (items.length === 2) {
      return new Mml(`${items[0]!.toString()} and ${items[1]!.toString()}`);
    }
    const head = items.slice(0, -1).map((i) => i.toString()).join(', ');
    return new Mml(`${head}, and ${items[items.length - 1]!.toString()}`);
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

  toString(): string {
    return this.raw;
  }

  toJSON(): string {
    return this.raw;
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
