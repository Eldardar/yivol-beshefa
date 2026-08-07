export const UNITS = ["KG", "TON", "DOLAV", "CRATE_SMALL", "CRATE_LARGE", "BUCKET", "OTHER"] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABEL: Record<Unit, string> = {
  KG: "ק\"ג",
  TON: "טון",
  DOLAV: "דולב(ים)",
  CRATE_SMALL: "ארגז(ים) קטן",
  CRATE_LARGE: "ארגז(ים) גדול",
  BUCKET: "דלי(ים)",
  OTHER: "אחר"
};
