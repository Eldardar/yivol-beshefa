export const UNITS = ["KG", "DOLAV", "CRATE_SMALL", "CRATE_LARGE", "BUCKET", "BAG", "OTHER"] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABEL: Record<Unit, string> = {
  KG: "ק\"ג",
  DOLAV: "דולב(ים)",
  CRATE_SMALL: "ארגז(ים) קטן",
  CRATE_LARGE: "ארגז(ים) גדול",
  BUCKET: "דלי(ים)",
  BAG: "תרמיל(ים)",
  OTHER: "אחר"
};

// Units that appear in any of the given lists, in canonical order — used to lay out one spreadsheet column per unit.
export function unitsPresent(lists: Array<Array<{ unit: Unit }> | undefined>): Unit[] {
  const present = new Set(lists.flatMap(list => (list ?? []).map(entry => entry.unit)));
  return UNITS.filter(unit => present.has(unit));
}
