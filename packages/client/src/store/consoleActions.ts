/**
 * consoleActions — composed actions for the cockpit's tabbed
 * terminal. Each action mutates local `clientState` optimistically
 * and emits one `client-state-write` over the wire so the change
 * persists across reconnect.
 *
 * The store layer stays pure state; the IO boundary lives here.
 * Tests can swap `websocketClient` for a stub via the spy pattern
 * documented in `services/__tests__/websocket.test.ts`.
 *
 * Session-scoped state (`unreadCounts`, `scrollPositions`,
 * `mutedSinceSessionStart`) lives in the store directly and is
 * cleared on disconnect; the actions here only touch the
 * server-persisted `console.tabs` / `console.activeTab` keys.
 */

import type { ConsoleTab, FacetFilter } from '@saxonberg/types';
import { useStore } from './index';
import { websocketClient } from '../services/websocket';

const KEY_TABS = 'console.tabs';
const KEY_ACTIVE = 'console.activeTab';
const DEFAULT_TABS: ConsoleTab[] = [{ name: 'All', muted: [] }];
const ALL_TAB = 'All';

/** Read the current tabs list with the default fallback. */
export function getTabs(): ConsoleTab[] {
  const raw = useStore.getState().clientState[KEY_TABS];
  if (Array.isArray(raw)) return raw as ConsoleTab[];
  return DEFAULT_TABS;
}

/** Read the active tab name with the `'All'` fallback. */
export function getActiveTab(): string {
  const raw = useStore.getState().clientState[KEY_ACTIVE];
  return typeof raw === 'string' ? raw : ALL_TAB;
}

function writeTabs(tabs: ConsoleTab[]): void {
  useStore.getState().setLocalClientState(KEY_TABS, tabs);
  websocketClient.sendClientStateWrite(KEY_TABS, tabs);
}

function writeActive(name: string): void {
  useStore.getState().setLocalClientState(KEY_ACTIVE, name);
  websocketClient.sendClientStateWrite(KEY_ACTIVE, name);
}

/**
 * Create a new tab. Rejects empty / whitespace-only names and
 * duplicates (returns the unchanged list). Returns the new list
 * so callers can chain.
 */
export function addTab(name: string): ConsoleTab[] {
  const trimmed = name.trim();
  if (!trimmed) return getTabs();
  const tabs = getTabs();
  if (tabs.some((t) => t.name === trimmed)) return tabs;
  const next = [...tabs, { name: trimmed, muted: [] }];
  writeTabs(next);
  return next;
}

/**
 * Rename an existing tab in place. The `'All'` tab is uncloseable
 * but renameable in v1 — the slate doesn't specify, but the
 * inline-edit gesture treats every tab the same. Rejects when the
 * new name collides with another tab.
 */
export function renameTab(oldName: string, newName: string): ConsoleTab[] {
  const trimmed = newName.trim();
  if (!trimmed) return getTabs();
  const tabs = getTabs();
  if (tabs.some((t) => t.name === trimmed && t.name !== oldName)) {
    return tabs;
  }
  const next = tabs.map((t) =>
    t.name === oldName ? { ...t, name: trimmed } : t,
  );
  writeTabs(next);
  // If the renamed tab was active, mirror the active selector.
  if (getActiveTab() === oldName) writeActive(trimmed);
  return next;
}

/**
 * Delete a tab. The `'All'` tab is uncloseable per the slate and
 * silently rejected. If the deleted tab was active, falls back to
 * `'All'`.
 */
export function deleteTab(name: string): ConsoleTab[] {
  if (name === ALL_TAB) return getTabs();
  const tabs = getTabs();
  const next = tabs.filter((t) => t.name !== name);
  if (next.length === tabs.length) return tabs;
  writeTabs(next);
  if (getActiveTab() === name) writeActive(ALL_TAB);
  return next;
}

/**
 * Switch the active tab. Unknown names are silent no-ops (so a
 * stale UI click after a delete doesn't strand the state).
 * Clears the activated tab's unread counter — the UX contract from
 * the slate: activating a tab is the user acknowledging its catch-up
 * volume.
 */
export function setActiveTab(name: string): void {
  const tabs = getTabs();
  if (!tabs.some((t) => t.name === name)) return;
  if (getActiveTab() === name) return;
  writeActive(name);
  useStore.getState().clearUnreadFor(name);
}

/** Mute a topic on the active tab. Idempotent on duplicate adds. */
export function addMuteForActiveTab(topic: string): ConsoleTab[] {
  const active = getActiveTab();
  const tabs = getTabs();
  let mutated = false;
  const next = tabs.map((t) => {
    if (t.name !== active) return t;
    if (t.muted.includes(topic)) return t;
    mutated = true;
    return { ...t, muted: [...t.muted, topic] };
  });
  if (!mutated) return tabs;
  writeTabs(next);
  return next;
}

/** Unmute a topic on the active tab. Idempotent on missing removals. */
export function removeMuteForActiveTab(topic: string): ConsoleTab[] {
  const active = getActiveTab();
  const tabs = getTabs();
  let mutated = false;
  const next = tabs.map((t) => {
    if (t.name !== active) return t;
    if (!t.muted.includes(topic)) return t;
    mutated = true;
    return { ...t, muted: t.muted.filter((m) => m !== topic) };
  });
  if (!mutated) return tabs;
  writeTabs(next);
  return next;
}

/**
 * ⭐ The active tab's standing FACET predicate.
 *
 * A tab IS a saved filter set — which is why this upgraded the existing
 * primitive rather than adding a third mechanism beside tabs and mutes.
 * `undefined` means "no facet filter", which passes everything.
 */
export function getActiveFacetFilter(): FacetFilter {
  const name = getActiveTab();
  return getTabs().find((t) => t.name === name)?.facets ?? {};
}

/**
 * Replace the active tab's facet filter.
 *
 * ⚠ Persisted like every other tab edit, because a filter you have to
 * re-apply every session is a filter nobody uses. It rides the same
 * `console.tabs` key, so a saved set survives a reconnect and follows
 * you to a second device.
 */
export function setActiveFacetFilter(facets: FacetFilter): ConsoleTab[] {
  const name = getActiveTab();
  const next = getTabs().map((t) =>
    t.name === name ? { ...t, facets } : t,
  );
  writeTabs(next);
  return next;
}

/**
 * Save the current filter set as a NEW tab and switch to it — the
 * panel's *"open as its own terminal"*.
 *
 * ⭐ There is no separate "saved filter set" object. A filter set that
 * you can open is a terminal, and a terminal you can name is a tab, so
 * the three collapse into one primitive rather than three that have to
 * be kept in step.
 */
export function saveFilterSetAsTab(
  name: string,
  facets: FacetFilter,
): ConsoleTab[] {
  const trimmed = name.trim();
  if (!trimmed) return getTabs();
  const tabs = getTabs();
  const next = tabs.some((t) => t.name === trimmed)
    ? tabs.map((t) => (t.name === trimmed ? { ...t, facets } : t))
    : [...tabs, { name: trimmed, muted: [], facets }];
  writeTabs(next);
  writeActive(trimmed);
  return next;
}
