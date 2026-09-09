/**
 * Regression: TJ Sir 12C × 1.5 Signalling WIP (07→08/09).
 * Run: npx tsx scripts/test-quad-signal-wip.ts
 */
import {
  calculateQuadSignalWip,
  displayKm,
  saleMatchesCableSize,
  sumSalesKmForSize,
} from "../src/lib/quad-signal-wip";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function almost(a: number, b: number, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

const processes = [
  "Insulation",
  "Laying",
  "Inner Sheath",
  "DST",
  "Outer Sheath",
] as const;

const opening = {
  Insulation: 52,
  Laying: 14,
  "Inner Sheath": 25.3,
  DST: 21.7,
  "Outer Sheath": 37,
};

const production = {
  Insulation: 90,
  Laying: 4,
  "Inner Sheath": 6,
  DST: 7.3,
  "Outer Sheath": 20,
};

const result = calculateQuadSignalWip({
  processes,
  opening,
  production,
  salesKm: 4,
  coreCount: 12,
  lengthFactor: 1.01,
});

const by = Object.fromEntries(
  result.stages.map((s) => [s.process, s]),
);

assert(almost(result.insulationConsumed, 48.48), `insul consumed ${result.insulationConsumed}`);
assert(almost(by.Insulation!.closing, 93.52), `insul close ${by.Insulation!.closing}`);
assert(displayKm(by.Insulation!.closing) === 94, "display ~94");
assert(almost(by.Laying!.closing, 12), `laying ${by.Laying!.closing}`);
assert(almost(by["Inner Sheath"]!.closing, 24), `inner ${by["Inner Sheath"]!.closing}`);
assert(almost(by.DST!.closing, 9), `dst ${by.DST!.closing}`);
assert(almost(by["Outer Sheath"]!.closing, 53), `outer ${by["Outer Sheath"]!.closing}`);
assert(result.finishedProcess === "Outer Sheath", "finished Outer Sheath");

assert(
  saleMatchesCableSize(
    "12c x 1.5 sqmm signalling cables",
    "Signalling Cable",
    "12 Core x 1.5 sqmm",
  ),
  "sale should match size",
);
assert(
  !saleMatchesCableSize(
    "Signalling Cable 1.5 sq mm",
    "Signalling Cable",
    "12 Core x 1.5 sqmm",
  ),
  "coarse catalog name must not ambiguous-match",
);

const salesSum = sumSalesKmForSize(
  [
    { itemDescription: "12 Core x 1.5 sqmm signalling", quantity: 1.5 },
    { itemDescription: "12c x 1.5 sqmm", quantity: 2.5 },
  ],
  "Signalling Cable",
  "12 Core x 1.5 sqmm",
);
assert(almost(salesSum, 4), `sales sum ${salesSum}`);

console.log("OK — 12C×1.5 regression:");
console.log(
  "  raw:",
  result.stages.map((s) => `${s.process}=${s.closing}`).join(", "),
);
console.log(
  "  display Insulation:",
  displayKm(by.Insulation!.closing),
  "/ Laying 12 / Inner 24 / DST 9 / Outer 53",
);
