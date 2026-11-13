/**
 * Fabric fixtures — a fabric is a `fabric` DOCUMENT cited by path
 * (load-on-use W2), so a suite that wants a textile form remembers one in
 * `MaterialApi.fabrics()` and cites it by the path this module names.
 *
 * The kernel's three (`woven`, `knit`, `felted`) live at the platform's
 * `/platform/fabrics/<word>`, the textile pack's two at
 * `/trade/textiles/fabrics/<word>`, and a suite's own invention at
 * `/test/fabrics/<word>` — the same paths content cites.
 */

import { MaterialApi } from '../../../api/material';
import type { FabricSpec } from '../Construction';

const PACK_FABRICS = new Set(['sackcloth', 'fine-woven']);
const KERNEL_FABRICS = new Set(['woven', 'knit', 'felted']);

/** The document path a fabric word is cited by (a path is its own). */
export function fabricPath(word: string): string {
  if (word.startsWith('/')) return word;
  if (KERNEL_FABRICS.has(word)) return `/platform/fabrics/${word}`;
  if (PACK_FABRICS.has(word)) return `/trade/textiles/fabrics/${word}`;
  return `/test/fabrics/${word}`;
}

/** Remember one fabric (validated as the installer would) — `key` a word or a path; returns its path. */
export function rememberFabric(spec: FabricSpec): string {
  const path = fabricPath(spec.key);
  const { key: _key, ...data } = spec;
  void _key;
  MaterialApi.fabrics().remember(path, MaterialApi.fabrics().parse(data as Record<string, unknown>, path));
  return path;
}

/** Forget every fabric — a suite's clean slate. */
export function forgetFabrics(): void {
  MaterialApi.fabrics().forget();
}
