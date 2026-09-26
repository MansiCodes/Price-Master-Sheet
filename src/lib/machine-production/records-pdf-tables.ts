import type { CellDef } from "jspdf-autotable";
import {
  INK,
  MUTED,
  TEAL,
  TEAL_SOFT,
  blackValue,
  num,
  pdfText,
  type MpPdfEntry,
  type MpPdfMachineDayTotal,
} from "./records-pdf-helpers";

export function resolveMachineDays(opts: {
  entries: MpPdfEntry[];
  machineDayWise?: MpPdfMachineDayTotal[];
}): Array<MpPdfMachineDayTotal & { slots: MpPdfEntry[] }> {
  let machineDays = (opts.machineDayWise ?? []).map((m) => ({
    ...m,
    slots: m.slots?.length
      ? m.slots
      : opts.entries.filter(
          (e) =>
            e.entryDate === m.date &&
            e.machineName === m.machineName &&
            e.machineCode === m.machineCode,
        ),
  }));

  if (machineDays.length === 0 && opts.entries.length > 0) {
    const map = new Map<string, MpPdfMachineDayTotal & { slots: MpPdfEntry[] }>();
    for (const e of opts.entries) {
      const key = `${e.entryDate}|${e.machineCode}|${e.machineName}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          date: e.entryDate,
          machineName: e.machineName,
          machineCode: e.machineCode,
          entries: 1,
          plannedProduction: e.plannedProduction,
          actualProduction: e.actualProduction,
          efficiencyPct: e.efficiencyPct,
          slots: [e],
        });
      } else {
        cur.entries += 1;
        cur.plannedProduction += e.plannedProduction;
        cur.actualProduction += e.actualProduction;
        cur.slots.push(e);
      }
    }
    machineDays = [...map.values()].map((m) => ({
      ...m,
      plannedProduction: Math.round(m.plannedProduction * 100) / 100,
      actualProduction: Math.round(m.actualProduction * 100) / 100,
      efficiencyPct:
        m.plannedProduction > 0
          ? Math.round((m.actualProduction / m.plannedProduction) * 10000) / 100
          : 0,
    }));
  }

  return [...machineDays].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.machineName.localeCompare(b.machineName);
  });
}

export function buildMachineSlotBody(
  machineDays: Array<MpPdfMachineDayTotal & { slots?: MpPdfEntry[] }>,
): CellDef[][] {
  const body: CellDef[][] = [];
  for (const m of machineDays) {
    const slots = [...(m.slots ?? [])].sort((a, b) => {
      if (a.shiftLabel !== b.shiftLabel) {
        return a.shiftLabel.localeCompare(b.shiftLabel);
      }
      return a.slotLabel.localeCompare(b.slotLabel);
    });

    body.push([
      {
        content: pdfText(
          `${m.date}  |  ${m.machineName}${
            m.machineCode ? ` (${m.machineCode})` : ""
          }`,
        ),
        colSpan: 5,
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "left",
        },
      },
      {
        content: String(m.entries),
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: num(m.plannedProduction),
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: num(m.actualProduction),
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: `${num(m.efficiencyPct)}%`,
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
    ]);

    for (const e of slots) {
      body.push([
        {
          content: pdfText(e.shiftLabel),
          styles: { textColor: MUTED, fontSize: 7.5 },
        },
        {
          content: pdfText(e.slotLabel),
          styles: { textColor: INK, fontSize: 7.5 },
        },
        {
          content: pdfText(e.operatorName),
          styles: { textColor: INK, fontSize: 7.5 },
        },
        {
          content: pdfText(e.currentProcess),
          styles: { textColor: INK, fontSize: 7.5 },
        },
        {
          content: pdfText(`${e.cableType} / ${e.cableSize}`),
          styles: { textColor: MUTED, fontSize: 7.2 },
        },
        {
          content: pdfText(e.status),
          styles: { textColor: MUTED, fontSize: 7, halign: "center" },
        },
        blackValue(num(e.plannedProduction)),
        blackValue(num(e.actualProduction)),
        blackValue(`${num(e.efficiencyPct)}%`),
      ]);
    }

    body.push([
      {
        content: "Total",
        colSpan: 6,
        styles: {
          fontStyle: "bold",
          textColor: INK,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
      {
        content: num(m.plannedProduction),
        styles: {
          fontStyle: "bold",
          textColor: TEAL,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
      {
        content: num(m.actualProduction),
        styles: {
          fontStyle: "bold",
          textColor: TEAL,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
      {
        content: `${num(m.efficiencyPct)}%`,
        styles: {
          fontStyle: "bold",
          textColor: TEAL,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
    ]);
  }
  return body;
}
