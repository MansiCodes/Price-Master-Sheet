/**
 * Regression: TJ Sir 12C × 1.5 Signalling WIP (07→08/09).
 * Run: npx tsx scripts/test-quad-signal-wip.ts
 */
import {
  calculateQuadSignalWip,
  calculateSharedSignallingInsulation,
  displayKm,
  drumLabelToLengthFactor,
  isSignallingCableName,
  lengthValueToFactor,
  parseDrumLengthOptions,
  parseManualLengthFactor,
  resolveQuadSignalVariant,
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

const v12 = resolveQuadSignalVariant("12 Core x 1.5 sqmm");
assert(v12?.lengthFactor === 1.01 && v12.coreCount === 12, "12C master");
const v18 = resolveQuadSignalVariant("18 Core x 1.5 sqmm");
assert(v18?.lengthFactor === 0.5 && v18.coreCount === 18, "18C 500m");
const vIndoor = resolveQuadSignalVariant("16/0.2 mm ABC");
assert(vIndoor?.lengthFactor === 0.1, "100m coil");
assert(drumLabelToLengthFactor("1KM").lengthFactor === 1.01, "1KM→1.01");
assert(drumLabelToLengthFactor("500 Mtr").lengthFactor === 0.5, "500→0.5");

const multi = parseDrumLengthOptions("100/200/300 mtr coil");
assert(multi.length === 3, `expected 3 coil options got ${multi.length}`);
assert(multi[0]!.lengthFactor === 0.1, "100 first");
assert(multi[1]!.lengthFactor === 0.2, "200");
assert(multi[2]!.lengthFactor === 0.3, "300");
const both = parseDrumLengthOptions("1KM/500Mtr");
assert(both.length === 2, "1KM/500 options");
assert(both.some((o) => o.lengthFactor === 1.01), "has 1KM");
assert(both.some((o) => o.lengthFactor === 0.5), "has 500");

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

// Signalling: Insulation common across sizes (sum of laying×cores×factor)
const shared = calculateSharedSignallingInsulation({
  opening: 52,
  production: 90,
  sizes: [
    {
      size: "12 Core x 1.5 sqmm",
      layingProduced: 4,
      coreCount: 12,
      lengthFactor: 1.01,
    },
    {
      size: "6 Core x 1.5 sqmm",
      layingProduced: 2,
      coreCount: 6,
      lengthFactor: 1.01,
    },
  ],
});
// 4×12×1.01 + 2×6×1.01 = 48.48 + 12.12 = 60.6
assert(almost(shared.consumed, 60.6), `shared consumed ${shared.consumed}`);
assert(almost(shared.closing, 81.4), `shared close ${shared.closing}`);
assert(shared.contributions.length === 2, "two size contributions");

const multiWip = calculateQuadSignalWip({
  processes,
  opening,
  production,
  salesKm: 4,
  coreCount: 12,
  lengthFactor: 1.01,
  insulationConsumedOverride: shared.consumed,
});
assert(
  almost(multiWip.insulationConsumed, 60.6),
  `override consumed ${multiWip.insulationConsumed}`,
);
assert(
  almost(
    multiWip.stages.find((s) => s.process === "Insulation")!.closing,
    81.4,
  ),
  "insulation closing with shared override",
);
// Laying / later stages unchanged by insulation override
assert(almost(multiWip.stages.find((s) => s.process === "Laying")!.closing, 12), "laying unchanged");

const zeroExtra = calculateSharedSignallingInsulation({
  opening: 10,
  production: 0,
  sizes: [
    {
      size: "12 Core x 1.5 sqmm",
      layingProduced: 0,
      coreCount: 12,
      lengthFactor: 1.01,
    },
  ],
});
assert(almost(zeroExtra.consumed, 0), "zero laying → zero insulation");
assert(almost(zeroExtra.closing, 10), "zero laying close");

assert(isSignallingCableName("Signalling Cable"), "signalling name");
assert(!isSignallingCableName("Quad Cable"), "not quad");

assert(parseManualLengthFactor("1") === 1, "bare 1");
assert(parseManualLengthFactor("1.5") === 1.5, "bare 1.5");
assert(parseManualLengthFactor("1 km") === 1, "1 km");
assert(almost(parseManualLengthFactor("16m")!, 0.016), "16m → km");
assert(almost(parseManualLengthFactor("500 mtr")!, 0.5), "500 mtr");
assert(parseManualLengthFactor("") == null, "empty unit");
assert(lengthValueToFactor("1.4", "km") === 1.4, "1.4 km");
assert(almost(lengthValueToFactor("1.4", "m")!, 0.0014), "1.4 m");
assert(almost(lengthValueToFactor("16", "m")!, 0.016), "16 m");
assert(lengthValueToFactor("1.01", "other") === 1.01, "other as-is");
assert(lengthValueToFactor("", "km") == null, "empty length");

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
console.log(
  "OK — shared Insulation multi-size:",
  `consumed=${shared.consumed} closing=${shared.closing}`,
);
