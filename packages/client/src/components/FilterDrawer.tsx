/**
 * FilterDrawer — slide-out panel for editing the active tab's
 * muted topic set. Hybrid discovery: seeded with the catalogue
 * snapshot, auto-extended with any topic seen in the live frame
 * buffer (so frames on unauthored topics still surface).
 *
 * Per-leaf checkbox toggles a single topic. Per-family checkbox
 * toggles every currently-known leaf under that family at once
 * (no prefix-matching at filter-evaluation time — the persisted
 * mute set is leaf-only per the slate).
 *
 * Per-leaf and per-family badges show the count of frames muted
 * since session start; sourced from the session-scoped
 * `mutedSinceSessionStart` bag in the store.
 */

import { useMemo } from 'react';
import styled from 'styled-components';
import { tokens } from './ui';
import { useStore } from '../store/index';
import {
  addMuteForActiveTab,
  getActiveFacetFilter,
  getActiveTab,
  getTabs,
  removeMuteForActiveTab,
  saveFilterSetAsTab,
  setActiveFacetFilter,
} from '../store/consoleActions';
import { FacetFilterPanel } from './FacetFilterPanel';
import type { TopicDescriptor } from '@saxonberg/types';

const DrawerPanel = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 22rem;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border-left: 1px solid ${tokens.color.borderEmphasis};
  padding: ${tokens.space.lg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  overflow-y: auto;
  z-index: 40;
`;

const Title = styled.div`
  color: ${tokens.color.fgEmphasis};
  font-size: ${tokens.font.title};
  margin-bottom: ${tokens.space.md};
`;

const FamilyHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  margin-top: ${tokens.space.md};
  color: ${tokens.color.sectionLabel};
`;

const LeafRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} 0 ${tokens.space.xs} ${tokens.space.xl};
  cursor: pointer;
`;

const RowName = styled.span`
  flex: 1;
`;

const Badge = styled.span`
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fgMuted};
  border-radius: 999px;
  padding: 0 ${tokens.space.sm};
  font-size: ${tokens.font.micro};
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${tokens.space.md};
  right: ${tokens.space.md};
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.title};
  cursor: pointer;
  &:hover {
    color: ${tokens.color.fg};
  }
`;

interface FilterDrawerProps {
  onClose: () => void;
}

interface FamilyGroup {
  family: string;
  familyLabel: string;
  leaves: TopicDescriptor[];
}

export function FilterDrawer({ onClose }: FilterDrawerProps) {
  const getTopicDescriptor = useStore((s) => s.getTopicDescriptor);
  const catalogue = useStore((s) => s.topicCatalogue);
  const frames = useStore((s) => s.frames);
  const mutedSinceSessionStart = useStore((s) => s.mutedSinceSessionStart);
  // Subscribe to clientState so toggling re-renders.
  useStore((s) => s.clientState);

  const groups: FamilyGroup[] = useMemo(() => {
    // Hybrid discovery: union the catalogue's known topics with the
    // topic of every live frame. Resolve each through the same
    // three-tier accessor so the drawer always renders friendly
    // labels, even for fallback-derived topics.
    const allTopics = new Set<string>();
    for (const t of catalogue.keys()) allTopics.add(t);
    for (const f of frames) allTopics.add(f.topic);
    // Resolve descriptors and bucket leaves by family.
    const byFamily = new Map<string, TopicDescriptor[]>();
    const familyLabels = new Map<string, string>();
    for (const topic of allTopics) {
      const d = getTopicDescriptor(topic);
      // Skip pure family entries (no dot) — they're rendered as
      // headers, not leaves. A topic IS a family iff another
      // topic's `family` field equals its `topic`.
      const family = d.family || '(root)';
      if (!byFamily.has(family)) byFamily.set(family, []);
      // Use the topic itself as the leaf, even if it's actually a
      // family — a top-level family like `world` has no leaf inside
      // its own group, just an entry in the (root) bucket.
      byFamily.get(family)!.push(d);
      // Resolve the family's own descriptor for a friendly label.
      if (!familyLabels.has(family)) {
        const fd = getTopicDescriptor(family === '(root)' ? family : family);
        familyLabels.set(family, family === '(root)' ? 'Root' : fd.label);
      }
    }
    const out: FamilyGroup[] = [];
    for (const [family, leaves] of byFamily) {
      leaves.sort((a, b) => a.label.localeCompare(b.label));
      out.push({
        family,
        familyLabel: familyLabels.get(family) ?? family,
        leaves,
      });
    }
    out.sort((a, b) => a.familyLabel.localeCompare(b.familyLabel));
    return out;
  }, [catalogue, frames, getTopicDescriptor]);

  const activeTab = getActiveTab();
  const tabs = getTabs();
  const muted = new Set(
    tabs.find((t) => t.name === activeTab)?.muted ?? [],
  );

  function toggleLeaf(topic: string, checked: boolean) {
    if (checked) addMuteForActiveTab(topic);
    else removeMuteForActiveTab(topic);
  }

  function toggleFamily(family: string, leaves: TopicDescriptor[], checked: boolean) {
    for (const d of leaves) {
      if (checked) addMuteForActiveTab(d.topic);
      else removeMuteForActiveTab(d.topic);
    }
    void family;
  }

  return (
    <DrawerPanel data-testid="filter-drawer">
      <CloseButton onClick={onClose} aria-label="Close drawer">
        ×
      </CloseButton>
      <Title>Filter — {activeTab}</Title>
      {/*
        ⭐⭐ **The facet predicate comes first, and the topic tree stays
        below it.**

        Filters run on the topic FACETS — "quiet" is one rule rather
        than a list of sixty paths that drifts every time a topic is
        added — and that is what the S2 facet taxonomy was built for.

        ⚠ But the tree is NOT replaced, and dropping it would lose a
        real capability. Facets fix cross-cutting questions; only the
        tree fixes SUBTREE mutes (*everything about the air in here*),
        which is a prefix operation no facet can express. The topics
        doc states both halves are needed; this panel is one of them.
      */}
      <FacetFilterPanel
        frames={frames}
        filter={getActiveFacetFilter()}
        onChange={(f) => setActiveFacetFilter(f)}
        onSaveSet={(f) => {
          const name = window.prompt('Name this filter set');
          if (name) saveFilterSetAsTab(name, f);
        }}
      />
      <FamilyHeader>
        <RowName>Mute individual topics</RowName>
      </FamilyHeader>
      {groups.map((group) => {
        const familyMuteCount = group.leaves.reduce(
          (acc, d) => acc + (mutedSinceSessionStart[d.topic] ?? 0),
          0,
        );
        const allChecked =
          group.leaves.length > 0 &&
          group.leaves.every((d) => muted.has(d.topic));
        return (
          <div key={group.family} data-testid={`family-${group.family}`}>
            <FamilyHeader>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) =>
                  toggleFamily(group.family, group.leaves, e.target.checked)
                }
                data-testid={`family-checkbox-${group.family}`}
              />
              <RowName>{group.familyLabel}</RowName>
              {familyMuteCount > 0 && (
                <Badge data-testid={`family-badge-${group.family}`}>
                  {familyMuteCount}
                </Badge>
              )}
            </FamilyHeader>
            {group.leaves.map((d) => {
              const leafCount = mutedSinceSessionStart[d.topic] ?? 0;
              return (
                <LeafRow
                  key={d.topic}
                  title={d.topic}
                  data-testid={`leaf-${d.topic}`}
                >
                  <input
                    type="checkbox"
                    checked={muted.has(d.topic)}
                    onChange={(e) => toggleLeaf(d.topic, e.target.checked)}
                    data-testid={`leaf-checkbox-${d.topic}`}
                  />
                  <RowName>{d.label}</RowName>
                  {leafCount > 0 && (
                    <Badge data-testid={`leaf-badge-${d.topic}`}>
                      {leafCount}
                    </Badge>
                  )}
                </LeafRow>
              );
            })}
          </div>
        );
      })}
    </DrawerPanel>
  );
}
