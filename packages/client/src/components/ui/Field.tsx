/**
 * `<FieldList>` + `<Field>` — shared semantic key/value primitives.
 *
 * Renders a real `<dl>` of `<dt>`/`<dd>` pairs so the rendering
 * flattens linear-labeled (the slate's accessibility floor — no
 * ASCII grids, no visual-only tables). Screen readers announce
 * each label/value as a definition pair; the visual layout is a
 * two-column grid for sighted users without changing semantics.
 *
 * The inspection pane consumes this for the admin extras block
 * (template path, stuff id, mixins, container path). Other surfaces
 * should reuse it for any labeled-fact rendering; do NOT mint
 * private `<div>` rows for key/value pairs.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "./tokens";

const Dl = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: ${tokens.space.md};
  row-gap: ${tokens.space.xs};
`;

const Dt = styled.dt`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Dd = styled.dd`
  margin: 0;
  color: ${tokens.color.fg};
  word-break: break-all;
  font-size: ${tokens.font.micro};
`;

interface FieldListProps {
  "aria-label"?: string;
  children: React.ReactNode;
}

export function FieldList({
  children,
  ...rest
}: FieldListProps): React.ReactElement {
  return <Dl {...rest}>{children}</Dl>;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps): React.ReactElement {
  return (
    <>
      <Dt>{label}</Dt>
      <Dd>{children}</Dd>
    </>
  );
}
