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

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: ${tokens.color.surfaceMuted};
  border-right: 1px solid ${tokens.color.borderMuted};
`;

const Heading = styled.div`
  padding: ${tokens.space.sm} ${tokens.space.md};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
