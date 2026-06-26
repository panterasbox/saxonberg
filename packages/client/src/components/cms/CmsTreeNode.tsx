/**
 * CmsTreeNode — one expandable node in the CMS explorer tree.
 *
 * Folders carry a chevron and lazy-load their children on first expand
 * (`cmsExpand` → REST `listTree`, cached in the store). Leaves are
 * clickable and open in the editor (`cmsOpen` → REST `read`). A node
 * recurses through its cached children when expanded — depth comes from
 * the data, not a fixed level. Themed strictly via `tokens`.
 */

import React from "react";
import styled from "styled-components";
import type { CmsTreeEntry } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { cmsNodeKey } from "../../store/cmsSlice";
import { tokens } from "../ui";

const Row = styled.button<{ $active: boolean; $depth: number }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  width: 100%;
  text-align: left;
  background: ${(p) => (p.$active ? tokens.color.surfaceAlt : "transparent")};
  border: none;
  color: ${tokens.color.fg};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  padding-left: ${(p) => `calc(${tokens.space.sm} + ${p.$depth} * 0.85rem)`};
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  width: 0.8rem;
  color: ${tokens.color.fgMuted};
  transform: rotate(${(p) => (p.$open ? "90deg" : "0deg")});
  transition: transform 0.1s ease;
`;

const Glyph = styled.span`
  width: 0.8rem;
  color: ${tokens.color.fgMuted};
`;

export interface CmsTreeNodeProps {
  entry: CmsTreeEntry;
  depth: number;
}

export const CmsTreeNode: React.FC<CmsTreeNodeProps> = ({ entry, depth }) => {
  const key = cmsNodeKey(entry.backend, entry.path);
  const expanded = useStore((s) => s.cms.expanded[key] ?? false);
  const children = useStore((s) => s.cms.children[key]);
  const openLeaf = useStore((s) => s.cms.open);
  const cmsExpand = useStore((s) => s.cmsExpand);
  const cmsOpen = useStore((s) => s.cmsOpen);

  const isFolder = entry.kind === "folder";
  const isActiveLeaf =
    !isFolder &&
    openLeaf?.backend === entry.backend &&
    openLeaf?.path === entry.path;

  const onClick = () => {
    if (isFolder) {
      void cmsExpand(entry.backend, entry.path);
    } else {
      void cmsOpen(entry.backend, entry.path);
    }
  };

  return (
    <>
      <Row
        $active={isActiveLeaf}
        $depth={depth}
        onClick={onClick}
        title={entry.path}
      >
        {isFolder ? (
          <Chevron $open={expanded} aria-hidden="true">
            ▶
          </Chevron>
        ) : (
          <Glyph aria-hidden="true">·</Glyph>
        )}
        <span>{entry.name}</span>
      </Row>
      {isFolder &&
        expanded &&
        (children ?? []).map((child) => (
          <CmsTreeNode
            key={cmsNodeKey(child.backend, child.path)}
            entry={child}
            depth={depth + 1}
          />
        ))}
    </>
  );
};
