/**
 * Custom URI schemes for in-world refs in `<link href="...">`.
 *
 *  - `mudcmd:` — opaque command line (clicker dispatch through the
 *    command bus)
 *  - `mudref:` — stuff-id reference (resolves to `look <kw>` or
 *    `look #id` on click)
 *  - `mudq:`   — MQL query reference (v1 inert — no click handler
 *    runs; click semantics deferred to a follow-up build)
 *
 * All three are opaque-form per RFC 3986 (`scheme:payload`, no `//`).
 * Any other scheme (http, https, javascript, data, …) is stripped at
 * markdown-parse time; bare labels survive as plain text.
 *
 * `Mml.link(href, label)` validates against this set at compose time;
 * the markdown parser checks the same set before producing a
 * `<link>` tag (see `mml/markdown.ts`).
 */

export const KNOWN_LINK_SCHEMES = ['mudcmd:', 'mudref:', 'mudq:'] as const;

export function isKnownLinkScheme(href: string): boolean {
  return KNOWN_LINK_SCHEMES.some((s) => href.startsWith(s));
}
