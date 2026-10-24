import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formClosingByProcess,
  nextDayFormOpeningFromMeta,
} from "./quad-signal-form-stock";

const POWER = [
  "Conductor",
  "Insulation",
  "Laying",
  "Inner Sheath",
  "Armouring",
  "Outer Sheath",
] as const;

describe("Power Cable Conductor next-day opening", () => {
  it("treats Insulation production as Conductor outbound, not Laying", () => {
    const remaining = formClosingByProcess(
      POWER,
      { Conductor: 40.5 },
      { Conductor: 5.2, Insulation: 36, Laying: 14 },
      0,
    );
    assert.equal(remaining.Conductor, 9.7);
  });

  it("uses submitted Conductor closing, not Laying production (9.7 not 31.7)", () => {
    const next = nextDayFormOpeningFromMeta(POWER, {
      opening: {
        Conductor: 40.5,
        Insulation: 37.8,
        Laying: 4,
        "Inner Sheath": 0,
        Armouring: 3,
        "Outer Sheath": 31,
      },
      production: {
        Conductor: 5.2,
        Insulation: 36,
        Laying: 14,
        "Inner Sheath": 0,
        Armouring: 0,
        "Outer Sheath": 0,
      },
      closing: {
        Conductor: 9.7,
        Insulation: 45.52,
        Laying: 18,
        "Inner Sheath": 0,
        Armouring: 3,
        "Outer Sheath": 31,
      },
    });
    assert.equal(next.Conductor, 9.7);
  });

  it("uses the latest submitted Conductor closing (14.3) not an older 31.7", () => {
    const next = nextDayFormOpeningFromMeta(POWER, {
      opening: { Conductor: 9.7 },
      production: { Conductor: 4.6, Insulation: 0, Laying: 0 },
      closing: { Conductor: 14.3 },
    });
    assert.equal(next.Conductor, 14.3);
  });

  it("does not take Outer Sheath remaining as Conductor opening", () => {
    const next = nextDayFormOpeningFromMeta(POWER, {
      opening: { Conductor: 9.7, "Outer Sheath": 31 },
      production: { Conductor: 3.2, Insulation: 0, Laying: 18 },
      closing: { Conductor: 12.9, "Outer Sheath": 31 },
    });
    assert.equal(next.Conductor, 12.9);
    assert.equal(next["Outer Sheath"], 31);
  });
});
