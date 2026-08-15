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
import { DEFAULT_VIEWS } from '@saxonberg/types';
import { useStore } from './index';
import { websocketClient } from '../services/websocket';

const KEY_TABS = 'console.tabs';
const KEY_ACTIVE = 'console.activeTab';
const KEY_SEEDED = 'console.seededViews';
/**
 * ⭐ The shipped presets ARE the default tabs.
 *
 * Two, not five. The play surface used to offer four facet presets
 * *plus* an `All` tab that was a different kind of thing, sitting in a
 * different control, and nothing said which was which — reported from a
 * real login as *"it's weird to have 4 presets + all and they're not
 * all treated the same."* One list, one kind of thing.
 */
const DEFAULT_TABS: ConsoleTab[] = DEFAULT_VIEWS.map((preset) => ({
  name: preset.name,
  muted: [],
  facets: preset.filter,
}));
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

function writeSeeded(names: string[]): void {
  useStore.getState().setLocalClientState(KEY_SEEDED, names);
  websocketClient.sendClientStateWrite(KEY_SEEDED, names);
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
/**
 * ⚠ The floor: a player must always have somewhere to look.
 *
 * Every view is deletable, `All` included — a shipped view you cannot
 * remove is the un-editable special case coming back in another form.
 * What is guaranteed is that the LIST is never empty, so deleting the
 * last one re-seeds the defaults rather than leaving a strip with
 * nothing in it and no way to make one.
 */
export function deleteTab(name: string): ConsoleTab[] {
  const tabs = getTabs();
  const remaining = tabs.filter((t) => t.name !== name);
  if (remaining.length === tabs.length) return tabs;
  const next = remaining.length > 0 ? remaining : DEFAULT_TABS;
  writeTabs(next);
  if (getActiveTab() === name) writeActive(next[0]!.name);
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
/**
 * Offer any shipped view the player has never been offered before.
 *
 * ⚠⚠ **Additive, once, and it never overwrites.** The previous version
 * re-applied the shipped filter every time you SELECTED the view, which
 * made `Aether` and `Diag` silently un-editable: tune one, click away,
 * click back, and your change was gone. That is the behaviour that made
 * them feel like a different kind of thing from a view you made
 * yourself. They are not, and now nothing treats them as such.
 *
 * ⚠ `console.seeded` records what has been OFFERED, not what exists —
 * so deleting a shipped view makes it stay deleted instead of coming
 * back on the next login. Without it, "delete" would mean "hide until
 * you reconnect", which is not what the word means.
 */
export function ensureSeededViews(): ConsoleTab[] {
  const raw = useStore.getState().clientState[KEY_TABS];
  const seededRaw = useStore.getState().clientState[KEY_SEEDED];
  const seeded = Array.isArray(seededRaw) ? (seededRaw as string[]) : [];
  // First run: no stored tabs at all. Take the defaults wholesale.
  if (!Array.isArray(raw)) {
    writeTabs(DEFAULT_TABS);
    writeSeeded(DEFAULT_VIEWS.map((v) => v.name));
    return DEFAULT_TABS;
  }
  const tabs = raw as ConsoleTab[];
  const missing = DEFAULT_VIEWS.filter((v) => !seeded.includes(v.name));
  if (missing.length === 0) return tabs;
  const next = [
    ...tabs,
    ...missing
      .filter((v) => !tabs.some((t) => t.name === v.name))
      .map((v) => ({ name: v.name, muted: [], facets: v.filter })),
  ];
  writeTabs(next);
  writeSeeded([...seeded, ...missing.map((v) => v.name)]);
  return next;
}

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
