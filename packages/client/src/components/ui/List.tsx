/**
 * `<List>` — shared semantic list primitive.
 *
 * Renders a real `<ul>` (or `<ol>` when `ordered`) so the screen-
 * reader path matches the visual one and the flatten-disciplined
 * linear-labeled serialization falls out (per message-rendering
 * slate). Bullets are suppressed visually; the list role is what
 * carries meaning to assistive tech.
 *
 * The inspection pane consumes this for the contents list under a
 * single-focus body and for the row list under a multi-focus body.
 * Other surfaces should reuse it; do NOT mint pane-private `<ul>`
 * styling.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "./tokens";

const Ul = styled.ul`
  margin: 0;
  padding-left: ${tokens.space.xl};
  list-style: none;
`;

const Ol = styled.ol`
  margin: 0;
  padding-left: ${tokens.space.xl};
  list-style: none;
`;

export const ListItem = styled.li`
  margin: ${tokens.space.xs} 0;
`;

interface ListProps {
  ordered?: boolean;
  "aria-label"?: string;
  children: React.ReactNode;
}

export function List({
  ordered,
  children,
  ...rest
}: ListProps): React.ReactElement {
  const Element = ordered ? Ol : Ul;
  return <Element {...rest}>{children}</Element>;
}
