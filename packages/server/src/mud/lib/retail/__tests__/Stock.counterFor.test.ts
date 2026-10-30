/**
 * ⭐ Which counter sells it — the counter answers, not the controller. A
 * market square holds several stalls, and `buy water filter` went to the
 * first counter the binder found and was told it "isn't for sale here"
 * (the ceramics drive).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import StockBase from "../Stock";
import Place from "../../stuff/Place";
import { StuffApi } from "../../../api/stuff";
import { AppApi } from "../../../api/app";
import { ContainmentApi } from "../../../api/containment";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { Containable } from "../../spatial/Containable";
import { makeStuff } from "../../security/__tests__/test-setup";

class Stock extends StockBase {}

const POT = "/test/stock-counter-for/thing/pot";
const FILTER = "/test/stock-counter-for/thing/filter";

function counter(line: string, where: Place | null): Stock {
  const c = makeStuff(() => new Stock());
  c.stockLines = [{ itemTemplatePath: line, par: 2 }];
  if (where !== null) {
    ContainmentApi.move(c as unknown as Stuff & Containable, where as unknown as Stuff & Container);
  }
  return c;
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(AppApi, "setting").mockImplementation((() => "") as never);
});
afterEach(() => vi.restoreAllMocks());

describe("Stock.counterFor", () => {
  it("is this counter when its own lines carry the word", () => {
    const square = makeStuff(() => new Place());
    const potStall = counter(POT, square);
    counter(FILTER, square);
    expect(potStall.counterFor("pot")).toBe(potStall);
  });

  it("⭐ is the stall beside it that does, when this one does not", () => {
    const square = makeStuff(() => new Place());
    const potStall = counter(POT, square);
    const filterStall = counter(FILTER, square);
    expect(potStall.counterFor("filter")).toBe(filterStall);
  });

  it("is this one when nobody here sells it — its refusal names the good", () => {
    const square = makeStuff(() => new Place());
    const potStall = counter(POT, square);
    counter(FILTER, square);
    expect(potStall.counterFor("anvil")).toBe(potStall);
    expect(counter(POT, null).counterFor("filter")).not.toBeNull();
  });
});
