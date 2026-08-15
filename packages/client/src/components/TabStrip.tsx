/**
 * TabStrip — horizontal strip of user-creatable named filter tabs
 * sitting above the Terminal. The 'All' tab is uncloseable; every
 * other tab has hover-revealed pencil + × icons.
 *
 * Gestures are pure client-side: inline-edit create (`+` button
 * spawns a tab in edit mode), inline rename (double-click name or
 * click pencil), delete confirm popover anchored to the ×. No
 * right-click handler is bound — per the slate's gesture-reservation
 * rule, the cockpit-wide right-click story stays open.
 */

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { tokens } from './ui';
import { useStore } from '../store/index';
import { FILTER_PRESETS } from '@saxonberg/types';
import type { ConsoleTab } from '@saxonberg/types';
import {
  addTab,
  applyPreset,
  deleteTab,
  renameTab,
  setActiveTab,
} from '../store/consoleActions';

const ALL_TAB = 'All';

const Strip = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${tokens.space.xs};
  background: ${tokens.color.surfaceMuted};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  padding: ${tokens.space.xs} ${tokens.space.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  user-select: none;
`;

const Tab = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} ${tokens.space.md};
  background: ${(p) =>
    p.$active ? tokens.color.surface : tokens.color.surfaceAlt};
  color: ${(p) => (p.$active ? tokens.color.fgEmphasis : tokens.color.fg)};
  border: 1px solid
    ${(p) =>
      p.$active ? tokens.color.borderEmphasis : tokens.color.borderMuted};
  border-bottom: ${(p) => (p.$active ? 'none' : '1px solid transparent')};
  border-radius: ${tokens.radius.sm} ${tokens.radius.sm} 0 0;
  cursor: pointer;
  position: relative;
  &:hover .tab-controls {
    visibility: visible;
  }
`;

const TabName = styled.span`
  white-space: nowrap;
`;

const NameInput = styled.input`
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.sm};
  padding: 0 ${tokens.space.xs};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  width: 8rem;
`;

const Controls = styled.span.attrs({ className: 'tab-controls' })`
  visibility: hidden;
  display: inline-flex;
  gap: ${tokens.space.xs};
  margin-left: ${tokens.space.xs};
`;

const IconButton = styled.button`
  background: transparent;
  color: ${tokens.color.fgMuted};
  border: none;
  padding: 0 ${tokens.space.xs};
  cursor: pointer;
  font-size: ${tokens.font.micro};
  &:hover {
    color: ${tokens.color.fg};
  }
`;

const PlusButton = styled.button`
  background: transparent;
  color: ${tokens.color.fgMuted};
  border: 1px dashed ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.xs} ${tokens.space.md};
  cursor: pointer;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  &:hover {
    color: ${tokens.color.fg};
    border-color: ${tokens.color.fgMuted};
  }
`;

const GearButton = styled.button`
  margin-left: auto;
  background: transparent;
  color: ${tokens.color.fgMuted};
  border: none;
  cursor: pointer;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.title};
  padding: 0 ${tokens.space.sm};
  &:hover {
    color: ${tokens.color.fg};
  }
`;

const ConfirmPopover = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.md};
  display: flex;
  gap: ${tokens.space.sm};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  z-index: 10;
  white-space: nowrap;
`;

const ConfirmButton = styled.button`
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  cursor: pointer;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

interface TabStripProps {
  onToggleDrawer?: () => void;
  /**
   * Show the shipped presets only — no create, no rename, no delete, no
   * filter drawer.
   *
   * ⚠ The custom-tab machinery is still here and still works; it is
   * simply not what belongs on the play surface. Reported from a real
   * login: *"there's a settings thing but what am I setting? … it's not
   * obvious that I have to go back after hitting + to set my filters."*
   * A control whose effect you can only discover by leaving it and
   * coming back is not a control, and a player choosing what to read
   * should not have to build a tab first.
   */
  presetsOnly?: boolean;
}

export function TabStrip({
  onToggleDrawer,
  presetsOnly = false,
}: TabStripProps = {}) {
  const clientState = useStore((s) => s.clientState);
  const tabs = (clientState['console.tabs'] as ConsoleTab[] | undefined) ?? [
    { name: ALL_TAB, muted: [] },
  ];
  const active =
    (clientState['console.activeTab'] as string | undefined) ?? ALL_TAB;

  // Inline-edit state. `editingName` is the original name of the
  // tab currently in edit mode (or `null` when none). `pendingNew`
  // is the in-progress new tab — only present between `+` click
  // and Enter/Escape.
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingNew, setPendingNew] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingName !== null || pendingNew !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingName, pendingNew]);

  // Click-outside dismisses the confirm popover.
  useEffect(() => {
    if (confirmDelete === null) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      setConfirmDelete(null);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [confirmDelete]);

  function startCreate() {
    setPendingNew('');
    setEditValue('');
  }

  function commitNew() {
    if (pendingNew === null) return;
    const name = editValue.trim();
    if (name) {
      addTab(name);
      setActiveTab(name);
    }
    setPendingNew(null);
    setEditValue('');
  }

  function cancelNew() {
    setPendingNew(null);
    setEditValue('');
  }

  function startRename(name: string) {
    setEditingName(name);
    setEditValue(name);
  }

  function commitRename() {
    if (editingName === null) return;
    const value = editValue.trim();
    if (value && value !== editingName) {
      renameTab(editingName, value);
    }
    setEditingName(null);
    setEditValue('');
  }

  function cancelRename() {
    setEditingName(null);
    setEditValue('');
  }

  if (presetsOnly) {
    return (
      <Strip data-testid="tab-strip">
        {FILTER_PRESETS.map((preset) => (
          <Tab
            key={preset.name}
            $active={preset.name === active}
            data-testid={`tab-${preset.name}`}
            /* The note is the only explanation there is room for, and a
               preset the player cannot explain to themselves is a
               preset they will not use. */
            title={preset.note}
            onClick={() => applyPreset(preset.name)}
          >
            {preset.name}
          </Tab>
        ))}
      </Strip>
    );
  }

  return (
    <Strip data-testid="tab-strip">
      {tabs.map((tab) => {
        const isActive = tab.name === active;
        const isEditing = editingName === tab.name;
        const isAll = tab.name === ALL_TAB;
        return (
          <Tab
            key={tab.name}
            $active={isActive}
            data-testid={`tab-${tab.name}`}
            onClick={() => {
              if (isEditing) return;
              setActiveTab(tab.name);
            }}
            onDoubleClick={() => {
              if (!isEditing) startRename(tab.name);
            }}
          >
            {isEditing ? (
              <NameInput
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  else if (e.key === 'Escape') cancelRename();
                }}
                onClick={(e) => e.stopPropagation()}
                data-testid="tab-rename-input"
              />
            ) : (
              <TabName>{tab.name}</TabName>
            )}
            {!isEditing && (
              <Controls>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(tab.name);
                  }}
                  aria-label="Rename"
                  data-testid={`tab-rename-${tab.name}`}
                >
                  ✎
                </IconButton>
                {!isAll && (
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(tab.name);
                    }}
                    aria-label="Delete"
                    data-testid={`tab-delete-${tab.name}`}
                  >
                    ×
                  </IconButton>
                )}
              </Controls>
            )}
            {confirmDelete === tab.name && (
              <ConfirmPopover
                ref={popoverRef}
                data-testid="tab-delete-confirm"
                onClick={(e) => e.stopPropagation()}
              >
                Delete &quot;{tab.name}&quot;?
                <ConfirmButton
                  onClick={() => {
                    deleteTab(tab.name);
                    setConfirmDelete(null);
                  }}
                  data-testid="tab-delete-confirm-yes"
                >
                  Delete
                </ConfirmButton>
                <ConfirmButton
                  onClick={() => setConfirmDelete(null)}
                  data-testid="tab-delete-confirm-no"
                >
                  Cancel
                </ConfirmButton>
              </ConfirmPopover>
            )}
          </Tab>
        );
      })}
      {pendingNew !== null ? (
        <Tab $active={false} data-testid="tab-new-pending">
          <NameInput
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitNew}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNew();
              else if (e.key === 'Escape') cancelNew();
            }}
            placeholder="Tab name"
            data-testid="tab-new-input"
          />
        </Tab>
      ) : (
        <PlusButton
          onClick={startCreate}
          aria-label="Add tab"
          data-testid="tab-add"
        >
          +
        </PlusButton>
      )}
      {onToggleDrawer && (
        <GearButton
          onClick={onToggleDrawer}
          aria-label="Open filter drawer"
          data-testid="tab-gear"
        >
          ⚙
        </GearButton>
      )}
    </Strip>
  );
}
