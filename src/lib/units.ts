export const UNITS = ["KG", "DOLAV", "CRATE_SMALL", "CRATE_LARGE", "BUCKET", "OTHER"] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABEL: Record<Unit, string> = {
  KG: "ק\"ג",
  DOLAV: "דולב(ים)",
  CRATE_SMALL: "ארגז(ים) קטן",
  CRATE_LARGE: "ארגז(ים) גדול",
  BUCKET: "דלי(ים)",
  OTHER: "אחר"
};
