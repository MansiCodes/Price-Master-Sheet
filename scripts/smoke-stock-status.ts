/**
 * Smoke-test stock status builders for deploy-safe null handling.
 * Run: npx tsx scripts/smoke-stock-status.ts
 */
import {
  buildCableStockStatus,
  formatCallPutupLine,
  formatDispatchLine,
} from "../src/lib/stock-production-status";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const notes = (meta: object, extra = "") =>
  `QSSTOCK:${JSON.stringify(meta)}${extra ? `\n${extra}` : ""}`;

const rows = [
  {
    id: "1",
    date: new Date("2026-09-14T00:00:00.000Z"),
    itemName: "Signalling Cable · 12 Core x 1.5 sqmm",
    notes: notes({
      v: 2,
      kind: "cable",
      cable: "Signalling Cable",
      size: "12 Core x 1.5 sqmm",
      production: { Laying: 1, "Outer Sheath": 2 },
      opening: { Laying: 10, "Outer Sheath": 20 },
      closing: { Laying: 11, Inner: 5, DST: 3, "Outer Sheath": 22 },
      callPutup: "5",
      putupDate: "2026-09-12",
      partyName: "DCC Infra",
      dispatchPending: 2,
      salesKm: 0,
    }),
  },
  {
    id: "2",
    date: new Date("2026-09-13T00:00:00.000Z"),
    itemName: "Signalling Cable · 6 Core x 1.5 sqmm",
    notes: notes({
      v: 2,
      kind: "cable",
      cable: "Signalling Cable",
      size: "6 Core x 1.5 sqmm",
      production: {},
      closing: { Laying: 1, "Outer Sheath": 1 },
      // missing callPutup / party on purpose
    }),
  },
];

const { blocks } = buildCableStockStatus(rows);
assert(blocks.length >= 1, "expected blocks");

const withPutup = blocks.find((b) => b.size.includes("12 Core"));
assert(withPutup, "12 core block missing");
assert(withPutup!.putupKm === 5, `putupKm expected 5 got ${withPutup!.putupKm}`);
assert(
  withPutup!.processes.some(
    (p) => p.shortName === "Outer" && p.closing === 17,
  ),
  "Outer should be 22 - 5 = 17",
);

const putupLine = formatCallPutupLine({
  putupKm: withPutup!.putupKm,
  callPutup: withPutup!.callPutup,
  putupDate: withPutup!.putupDate,
  partyName: withPutup!.partyName,
});
assert(putupLine?.includes("5km"), `putup line: ${putupLine}`);
assert(putupLine?.includes("DCC Infra"), `putup party: ${putupLine}`);

const dispatchLine = formatDispatchLine(withPutup!);
assert(dispatchLine?.includes("2km"), `dispatch: ${dispatchLine}`);

// Must not throw on empty/partial props (this crashed prod before).
assert(formatCallPutupLine({} as never) === null, "empty putup should be null");
assert(
  formatDispatchLine({} as never) === null,
  "empty dispatch should be null",
);
assert(
  formatCallPutupLine({
    putupKm: 0,
    callPutup: undefined as unknown as string,
    putupDate: undefined as unknown as string,
    partyName: undefined as unknown as string,
  }) === null,
  "undefined strings must not throw",
);

console.log("smoke-stock-status: OK");
