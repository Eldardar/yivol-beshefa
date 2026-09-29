export const UNITS = ["KG", "DOLAV", "CRATE_SMALL", "CRATE_LARGE", "BUCKET", "BAG", "HOURS", "OTHER"] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABEL: Record<Unit, string> = {
  KG: "ק\"ג",
  DOLAV: "דולב(ים)",
  CRATE_SMALL: "ארגז(ים) קטן",
  CRATE_LARGE: "ארגז(ים) גדול",
  BUCKET: "דלי(ים)",
  BAG: "תרמיל(ים)",
  HOURS: "שע(ו)ת שכר",
  OTHER: "אחר"
};

export const REPORT_UNITS = UNITS.filter((u) => u !== "KG");

// Units a shift's end-of-shift report may use: the units the admin set as the shift's goal, in canonical order.
export function shiftReportUnits(goalUnits: Unit[]): readonly Unit[] {
  return goalUnits.length > 0 ? UNITS.filter((u) => goalUnits.includes(u)) : REPORT_UNITS;
}

// Units that appear in any of the given lists, in canonical order — used to lay out one spreadsheet column per unit.
export function unitsPresent(lists: Array<Array<{ unit: Unit }> | undefined>): Unit[] {
  const present = new Set(lists.flatMap(list => (list ?? []).map(entry => entry.unit)));
  return UNITS.filter(unit => present.has(unit));
}
