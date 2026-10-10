import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  namedExpenseDescription,
  requiresExpenseName,
} from "./quad-expense-name";

describe("requiresExpenseName", () => {
  it("is true for Quad Miscellaneous and Direct Other only", () => {
    assert.equal(requiresExpenseName("QUAD", "Miscellaneous"), true);
    assert.equal(requiresExpenseName("SIGNALLING", "Other"), true);
    assert.equal(requiresExpenseName("QUAD", "Electricity"), false);
    assert.equal(requiresExpenseName("PVC", "Miscellaneous"), false);
    assert.equal(requiresExpenseName("CAT6", "Other"), false);
  });
});

describe("namedExpenseDescription", () => {
  it("rejects empty name for Quad Other/Misc", () => {
    const miss = namedExpenseDescription("QUAD", "Other", "  ");
    assert.equal(miss.ok, false);
  });
  it("accepts a free-text name and existing blank heads", () => {
    const ok = namedExpenseDescription("QUAD", "Other", "Labour Wages");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.value, "Labour Wages");
    const skip = namedExpenseDescription("QUAD", "Electricity", "");
    assert.equal(skip.ok, true);
  });
});
