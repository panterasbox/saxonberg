/**
 * CmsExplorer — the dual-root CMS tree.
 *
 * Two fixed top-level roots, listed independently (no merged namespace,
 * per the plan §2.1): "content" (`{backend:'content',path:'/'}`) and
 * "source" (`{backend:'source',path:'/'}`). Each is a synthetic folder
 * {@link CmsTreeEntry} the recursive {@link CmsTreeNode} expands the same
 * way as any other folder, so the lazy-load + cache path is uniform from
 * the roots down. Themed via `tokens`.
 */

import React from "react";
import styled from "styled-components";
import type { CmsTreeEntry } from "@saxonberg/types";
import { CmsTreeNode } from "./CmsTreeNode";
import { tokens } from "../ui";

const ROOTS: CmsTreeEntry[] = [
  { backend: "content", path: "/", name: "content", kind: "folder" },
  { backend: "source", path: "/", name: "source", kind: "folder" },
];

// A plain block scroll container — NOT a flex column. Rows are a flat
// fragment of <button>s, so as flex children they would all flex-shrink to
// fit the panel height and overlap on long listings; as block children they
// keep their natural height and the panel scrolls instead.
const Panel = styled.div`
  height: 100%;
  overflow-y: auto;
  background: ${tokens.color.surfaceMuted};
  border-right: 1px solid ${tokens.color.borderMuted};
`;

const Heading = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: ${tokens.space.sm} ${tokens.space.md};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${tokens.color.surfaceMuted};
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

export const CmsExplorer: React.FC = () => (
  <Panel>
    <Heading>Explorer</Heading>
    {ROOTS.map((root) => (
      <CmsTreeNode
        key={`${root.backend}:${root.path}`}
        entry={root}
        depth={0}
      />
    ))}
  </Panel>
);
