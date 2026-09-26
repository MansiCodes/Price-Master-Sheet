/** Decide Quad/Signal catalog type from an Excel size string. */

const SIGNALLING_CORES = new Set([2, 6, 12, 18, 19, 24, 30]);
const POWER_SQMM = new Set(["10", "25", "35", "70"]);
const MULTI_CORES = new Set([24, 40, 60]);

function coresFrom(s: string): number {
  const m =
    s.match(/(\d+)\s*cores?\b/) ||
    s.match(/(\d+)\s*c\s*[x×]/) ||
    s.match(/(\d+)\s*c(?=\d)/) ||
    s.match(/(\d+)\s*c\b/) ||
    s.match(/^(\d+)\s*[x×]\s*\d+(?:\.\d+)?\s*sq/);
  return m ? Number(m[1]) : 0;
}

export function inferCableFromExcelSize(excelSize: string): string {
  const s = excelSize.toLowerCase().replace(/\s+/g, " ").trim();

  if (/\bfire\b|\bfs\b/.test(s)) return "Fire Survival Cable";
  if (/\bquads?\b|\b\d+\s*q\b/.test(s)) return "Quad Cable";
  if (/\bpairs?\b|\b\d+\s*p(?:air)?s?\b/.test(s)) return "PIJF Cable";
  if (/\bpower\b/.test(s)) return "Power Cable";
  if (/\bindoor\b.*\bmulti|\bmc\b/.test(s)) return "Indoor Multi-Core Cable";
  if (/\bindoor\b|\bsingle[-\s]?core|\bjumper\b|\batc\b|\babc\b|\btwisted\b/.test(s)) {
    return "Indoor Single-Core Cable";
  }

  // 16/0.2, 28/0.3, 3/0.75, 24/0.2 — conductor construction, not core count
  if (/\d+\s*\/\s*\d/.test(s) && !/\bcores?\b/.test(s) && !/\bquad/.test(s)) {
    return "Indoor Single-Core Cable";
  }

  const cores = coresFrom(s);
  const isSq = /\bsq/.test(s);
  const sqArea = (s.match(/(?:^|[^0-9.])(10|25|35|70|1\.5|2\.5)(?![0-9])/) || [])[1] ?? "";

  if (cores === 2 && sqArea === "1.5") return "Fire Survival Cable";
  if (/\b3\.5\s*core/.test(s)) return "Power Cable";
  if ((cores === 3 || cores === 4) && isSq) return "Power Cable";
  if (cores === 2 && POWER_SQMM.has(sqArea)) return "Power Cable";

  // 24/40/60 Core × 0.6mm or 1.0mm (not sqmm — 24 Core × 1.5 is signalling)
  if (
    MULTI_CORES.has(cores) &&
    !isSq &&
    /\b0\.6\d*\b|\b1\.0\b|\b1\s*mm\b/.test(s)
  ) {
    return "Indoor Multi-Core Cable";
  }

  if (SIGNALLING_CORES.has(cores) && (sqArea === "1.5" || sqArea === "2.5")) {
    return "Signalling Cable";
  }
  if (cores >= 2 && cores <= 30 && isSq && (sqArea === "1.5" || sqArea === "2.5")) {
    return "Signalling Cable";
  }
  if (MULTI_CORES.has(cores) && !isSq) return "Indoor Multi-Core Cable";
  if (cores >= 2) return "Signalling Cable";

  return "Indoor Single-Core Cable";
}
