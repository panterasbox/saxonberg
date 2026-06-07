/**
 * Shared rendering helpers for per-message-type templates.
 *
 * The templates need to walk MML trees and emit React, sharing the
 * same per-tag treatment logic as `MmlRenderer.tsx`. Rather than
 * pulling a styled-component import from MmlRenderer (which would
 * couple the templates to the component file), this module exposes
 * the small set of helpers templates need: rendering a tree of
 * nodes through the stylesheet engine.
 *
 * The MmlRenderer component itself uses parseMml + a different
 * recursive render path because it doesn't know about templates. The
 * two render paths share the parser + commandFor + the styled
 * primitives; the structural divergence is intentional — templates
 * own layout (columns, hanging indent), MmlRenderer owns inline
 * affordance painting.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { MmlRenderer } from '../../components/MmlRenderer';
import type { MmlNode } from '../mml/parseMml';

/**
 * Render an MML tree by serializing it back to a markup string and
 * piping it through the existing MmlRenderer. This is the v1
 * approach — pragmatic re-use; the renderer already handles every
 * tag's treatment. A future pass can teach the renderer to consume a
 * tree directly without the re-serialize round-trip.
 */
export function renderTree(
  tree: MmlNode[],
  ctx: {
    onCommandClick: (cmd: string) => void;
    onCommandPreview: (cmd: string | null) => void;
    viewerStuffId?: string;
  },
): ReactNode {
  const body = serializeTree(tree);
  return (
    <MmlRenderer
      text={body}
      onCommandClick={ctx.onCommandClick}
      onCommandPreview={ctx.onCommandPreview}
      viewerStuffId={ctx.viewerStuffId}
    />
  );
}

/**
 * Serialize an MML tree back to its markup string. Round-trips
 * cleanly through `parseMml` (which is what produced the tree).
 * Used by templates that need to extract sub-regions of a frame
 * body and render them individually.
 */
export function serializeTree(tree: MmlNode[]): string {
  return tree.map(serializeNode).join('');
}

function serializeNode(n: MmlNode): string {
  if (n.kind === 'text') return escapeText(n.text);
  const children = serializeTree(n.children);
  const attrs = Object.entries(n.attrs)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join('');
  if (n.children.length === 0) {
    return `<${n.tag}${attrs}/>`;
  }
  return `<${n.tag}${attrs}>${children}</${n.tag}>`;
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Find the first tag child matching a name. Templates use this to
 * pluck the structural regions of a chat / say / etc. line (e.g.
 * the `<chan>`, `<player>`, `<msg>` from a chat frame).
 */
export function findFirstTag(
  tree: MmlNode[],
  name: string,
): Extract<MmlNode, { kind: 'tag' }> | null {
  for (const n of tree) {
    if (n.kind === 'tag' && n.tag === name) return n;
  }
  return null;
}

/**
 * Find any of a list of tags, returning the first hit. Used by
 * templates that accept multiple identity-tag variants (`<player>`
 * or `<name>` for the sender slot in chat).
 */
export function findFirstTagAny(
  tree: MmlNode[],
  names: string[],
): Extract<MmlNode, { kind: 'tag' }> | null {
  for (const n of tree) {
    if (n.kind === 'tag' && names.includes(n.tag)) return n;
  }
  return null;
}
