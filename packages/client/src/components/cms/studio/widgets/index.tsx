/**
 * The Studio widget registry — maps a {@link StudioFieldDescriptor} to the
 * form control that edits it. The composer form (`StudioForm`) resolves a
 * widget per field via {@link resolveWidgetKind} and renders it.
 *
 * Registry lookup order (the P2 contract):
 *   1. `refShape`   → {@link ReferencePickerWidget} (stubbed in P2).
 *   2. `enumValues` → {@link EnumWidget}.
 *   3. `typeShape`  → prefix `Quantity<` → {@link QuantityWidget}, then
 *      exact `string`/`number`/`boolean` → the primitive widgets.
 *   4. anything else → {@link RawJsonWidget} (never a crash).
 *
 * Every widget is a projection over the slice overlay: it renders the
 * effective value (or the inherited `defaultValue` as a placeholder hint
 * when the field is unset) and reports edits via `onChange` / resets via
 * `onClear`. No widget owns command or authorization semantics — the
 * server re-validates on save.
 */

import React from "react";
import styled from "styled-components";
import type { CmsTreeEntry, StudioFieldDescriptor } from "@saxonberg/types";
import { tokens } from "../../../ui";
import { cmsClient } from "../../cmsClient";

/** Props every Studio widget receives. */
export interface WidgetProps {
  descriptor: StudioFieldDescriptor;
  /** The effective value: an edit, or `baseData[name]`, else `undefined`. */
  value: unknown;
  /** True when a LOCAL value exists (editable); false when inherited/unset. */
  isSet: boolean;
  /** Report a new value for the field (adds to the edits overlay). */
  onChange: (value: unknown) => void;
}

/** The widget kinds the registry resolves to. */
export type WidgetKind =
  | "reference"
  | "enum"
  | "quantity"
  | "text"
  | "number"
  | "boolean"
  | "raw";

/**
 * Resolve a descriptor to its widget kind following the fixed lookup
 * order. Pure + exported so the selection contract is unit-testable
 * without rendering.
 */
export function resolveWidgetKind(d: StudioFieldDescriptor): WidgetKind {
  if (d.refShape) return "reference";
  if (d.enumValues && d.enumValues.length > 0) return "enum";
  const shape = d.typeShape;
  if (shape.startsWith("Quantity<")) return "quantity";
  if (shape === "string") return "text";
  if (shape === "number") return "number";
  if (shape === "boolean") return "boolean";
  return "raw";
}

// --- shared control styling ------------------------------------------------

const Field = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};

  &:focus {
    outline: none;
    border-color: ${tokens.color.primary};
  }
`;

const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const Area = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 4.5rem;
  resize: vertical;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
`;

const CheckRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

const Note = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  margin-left: ${tokens.space.sm};
`;

/** Placeholder text for an unset field: its inherited default, if any. */
function placeholderOf(d: StudioFieldDescriptor): string {
  if (d.defaultValue === undefined) return "(inherited)";
  if (typeof d.defaultValue === "string") return d.defaultValue;
  return JSON.stringify(d.defaultValue);
}

// --- widgets ---------------------------------------------------------------

export const TextWidget: React.FC<WidgetProps> = ({
  descriptor,
  value,
  isSet,
  onChange,
}) => (
  <Field
    type="text"
    value={isSet && typeof value === "string" ? value : ""}
    placeholder={placeholderOf(descriptor)}
    onChange={(e) => onChange(e.target.value)}
  />
);

export const NumberWidget: React.FC<WidgetProps> = ({
  descriptor,
  value,
  isSet,
  onChange,
}) => (
  <Field
    type="number"
    value={isSet && typeof value === "number" ? String(value) : ""}
    placeholder={placeholderOf(descriptor)}
    onChange={(e) => {
      const text = e.target.value;
      if (text === "") return;
      const n = Number(text);
      if (!Number.isNaN(n)) onChange(n);
    }}
  />
);

export const BooleanWidget: React.FC<WidgetProps> = ({
  value,
  isSet,
  onChange,
}) => (
  <CheckRow>
    <input
      type="checkbox"
      checked={isSet ? value === true : false}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{isSet ? (value === true ? "true" : "false") : "inherited"}</span>
  </CheckRow>
);

export const EnumWidget: React.FC<WidgetProps> = ({
  descriptor,
  value,
  isSet,
  onChange,
}) => (
  <Select
    value={isSet && typeof value === "string" ? value : ""}
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="" disabled>
      {placeholderOf(descriptor)}
    </option>
    {(descriptor.enumValues ?? []).map((opt) => (
      <option key={opt} value={opt}>
        {opt}
      </option>
    ))}
  </Select>
);

export const QuantityWidget: React.FC<WidgetProps> = ({
  descriptor,
  value,
  isSet,
  onChange,
}) => {
  // v1: a free-text control over the serialized quantity. Value in
  // `template.data` may be a string ("5 kg") or a structured object; we
  // render the string form and write back a string.
  const display = !isSet
    ? ""
    : typeof value === "string"
      ? value
      : JSON.stringify(value);
  return (
    <>
      <Field
        type="text"
        value={display}
        placeholder={placeholderOf(descriptor)}
        onChange={(e) => onChange(e.target.value)}
      />
      <Note>{descriptor.typeShape}</Note>
    </>
  );
};

/**
 * Ref types that are catalogue DATA, not content-template classes — a path
 * picker over the content tree wouldn't find them, so the widget degrades to
 * a labelled text input for these (never breaks).
 */
const CATALOGUE_DATA_REF_TYPES = new Set([
  "Material",
  "Biome",
  "Topic",
  "Clade",
  "Species",
  "Corpo",
  "Brand",
  "Discipline",
  "Emote",
  "Recipe",
  "Quantity",
  "Unit",
]);

// --- reference-picker tree browser ----------------------------------------

const BrowseButton = styled.button`
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  padding: 2px ${tokens.space.sm};
  margin-left: ${tokens.space.sm};
  cursor: pointer;
`;

const Browser = styled.div`
  margin-top: ${tokens.space.xs};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  max-height: 12rem;
  overflow: auto;
  background: ${tokens.color.surface};
`;

const Crumb = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

const Entry = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  color: ${tokens.color.fg};
  border: none;
  padding: 2px ${tokens.space.sm};
  cursor: pointer;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};

  &:hover {
    background: ${tokens.color.surfaceSunken};
  }
`;

/**
 * A lazy content-template tree browser: navigates the `content` backend and
 * selects a leaf path. Path-only filtering (`listTree` carries no class), so
 * v1 shows all leaves and hints the target type — pragmatic, never wrong.
 */
const ContentTreeBrowser: React.FC<{
  refType?: string;
  onPick: (path: string) => void;
}> = ({ refType, onPick }) => {
  const [cwd, setCwd] = React.useState("/");
  const [entries, setEntries] = React.useState<CmsTreeEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    setEntries(null);
    setError(null);
    cmsClient
      .listTree("content", cwd)
      .then((listing) => {
        if (live) setEntries(listing.entries);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : "browse failed");
      });
    return () => {
      live = false;
    };
  }, [cwd]);

  const parent =
    cwd === "/" ? null : cwd.replace(/\/[^/]+$/, "") || "/";

  return (
    <Browser>
      <Crumb>
        {refType ? `${refType} · ` : ""}
        {cwd}
      </Crumb>
      {parent !== null && (
        <Entry onClick={() => setCwd(parent)}>../</Entry>
      )}
      {error && <Entry disabled>error: {error}</Entry>}
      {entries === null && !error && <Entry disabled>loading…</Entry>}
      {entries?.map((e) =>
        e.kind === "folder" ? (
          <Entry key={e.path} onClick={() => setCwd(e.path)}>
            {e.name}/
          </Entry>
        ) : (
          <Entry key={e.path} onClick={() => onPick(e.path)}>
            {e.name}
          </Entry>
        ),
      )}
    </Browser>
  );
};

export const ReferencePickerWidget: React.FC<WidgetProps> = ({
  descriptor,
  value,
  isSet,
  onChange,
}) => {
  const [browsing, setBrowsing] = React.useState(false);
  // A catalogue-data ref (Material, Biome, …) isn't a content template — the
  // tree browser can't find it, so degrade to the labelled text input.
  const browsable =
    !descriptor.refType || !CATALOGUE_DATA_REF_TYPES.has(descriptor.refType);
  return (
    <>
      <Field
        type="text"
        value={isSet && typeof value === "string" ? value : ""}
        placeholder={placeholderOf(descriptor)}
        onChange={(e) => onChange(e.target.value)}
      />
      <Note>
        {descriptor.refType ? `→ ${descriptor.refType}` : "→ reference"}
        {browsable ? (
          <BrowseButton
            type="button"
            onClick={() => setBrowsing((b) => !b)}
          >
            {browsing ? "close" : "browse…"}
          </BrowseButton>
        ) : (
          " (path)"
        )}
      </Note>
      {browsing && browsable && (
        <ContentTreeBrowser
          refType={descriptor.refType}
          onPick={(path) => {
            onChange(path);
            setBrowsing(false);
          }}
        />
      )}
    </>
  );
};

export const RawJsonWidget: React.FC<WidgetProps> = ({
  descriptor,
  value,
  isSet,
  onChange,
}) => {
  // Local text buffer so a mid-edit invalid JSON keystroke doesn't get
  // discarded; we only commit through `onChange` when the text parses.
  const initial = isSet ? JSON.stringify(value, null, 2) : "";
  const [text, setText] = React.useState(initial);
  const [invalid, setInvalid] = React.useState(false);
  // Re-sync when the described field / effective value changes underneath.
  React.useEffect(() => {
    setText(initial);
    setInvalid(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptor.name, isSet]);
  return (
    <>
      <Area
        value={text}
        placeholder={placeholderOf(descriptor)}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (next.trim() === "") {
            setInvalid(false);
            return;
          }
          try {
            onChange(JSON.parse(next));
            setInvalid(false);
          } catch {
            setInvalid(true);
          }
        }}
      />
      {invalid && <Note>invalid JSON — not saved</Note>}
    </>
  );
};

/** The registry: widget kind → component. */
export const widgetRegistry: Record<WidgetKind, React.FC<WidgetProps>> = {
  reference: ReferencePickerWidget,
  enum: EnumWidget,
  quantity: QuantityWidget,
  text: TextWidget,
  number: NumberWidget,
  boolean: BooleanWidget,
  raw: RawJsonWidget,
};

/** Resolve the component for a descriptor (kind → registry). */
export function widgetFor(d: StudioFieldDescriptor): React.FC<WidgetProps> {
  return widgetRegistry[resolveWidgetKind(d)];
}
