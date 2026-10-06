import type { Unit } from "./units";

// מדרגה חלה על כמות שמעל aboveQuantity ועד תחילת המדרגה הבאה (או ללא הגבלה).
// appliesToAll: כשהכמות מגיעה למדרגה — המחיר שלה חל על כל הכמות מ־0 ועד סוף הטווח שלה (ומחליף את המדרגות שלפניה);
// אחרת רק על היחידות שבטווח שלה (מדרגות). מדרגות שאחריה מוסיפות את החלק שלהן כרגיל.
export type PriceTier = { aboveQuantity: number; rateNis: number; appliesToAll: boolean };
export type UnitPricing = { rateNis: number; tiers: PriceTier[] };
export type UnitPricingByField = Record<number, Partial<Record<Unit, UnitPricing>>>;

export function parseTiers(json: string | null | undefined): PriceTier[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as PriceTier[]) : [];
  } catch {
    return [];
  }
}

// התעריף הבסיסי חל מ־0 ועד המדרגה הראשונה; המדרגות ממוינות בסדר עולה של aboveQuantity.
export function unitAmount(pricing: UnitPricing, quantity: number): number {
  const bands = [{ start: 0, rateNis: pricing.rateNis, appliesToAll: false }, ...pricing.tiers.map(t => ({ start: t.aboveQuantity, rateNis: t.rateNis, appliesToAll: t.appliesToAll }))];
  let total = 0;
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!;
    if (!(quantity > band.start)) break;
    const reached = Math.min(quantity, bands[i + 1]?.start ?? Infinity);
    total = band.appliesToAll ? reached * band.rateNis : total + (reached - band.start) * band.rateNis;
  }
  return total;
}

export type PriceDrop = { aboveQuantity: number; amountAt: number; amountJustAbove: number; recoversAt: number };

// מדרגה "על כל הכמות" במחיר נמוך מדי גורמת לירידה בסכום: עובד שעשה מעט יותר מהסף מקבל פחות ממי שעצר בסף.
// מחזיר לכל ירידה כזו את הסף, הסכום בסף, הסכום מיד מעליו, ואת הכמות שבה הסכום חוזר לגובה שבסף (Infinity — לעולם לא).
export function priceDrops(pricing: UnitPricing): PriceDrop[] {
  const tiers = [...pricing.tiers].sort((a, b) => a.aboveQuantity - b.aboveQuantity);
  const sorted = { ...pricing, tiers };
  const drops: PriceDrop[] = [];
  tiers.forEach((tier, i) => {
    if (!tier.appliesToAll) return;
    const x = tier.aboveQuantity;
    const amountAt = unitAmount(sorted, x);
    const amountJustAbove = x * tier.rateNis;
    if (!(amountJustAbove < amountAt - 1e-9)) return;
    // הסכום עולה בתוך כל טווח; מחפשים את הטווח הראשון שבסופו הסכום חוזר לגובה שבסף, ובתוכו את נקודת ההתאוששות
    let recoversAt = Infinity;
    for (let j = i; j < tiers.length; j++) {
      const start = tiers[j]!.aboveQuantity;
      const end = tiers[j + 1]?.aboveQuantity ?? Infinity;
      const endAmount = end === Infinity ? Infinity : unitAmount(sorted, end);
      if (endAmount < amountAt) continue;
      let lo = start;
      let hi = end === Infinity ? Math.max(start * 2, 1) : end;
      while (end === Infinity && unitAmount(sorted, hi) < amountAt) hi *= 2;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (unitAmount(sorted, mid) >= amountAt) hi = mid; else lo = mid;
      }
      recoversAt = hi;
      break;
    }
    drops.push({ aboveQuantity: x, amountAt, amountJustAbove, recoversAt });
  });
  return drops;
}

export function buildUnitPricingByField(rows: Array<{ field_id: number; unit: Unit; rate_nis: number; tiers: string | null }>): UnitPricingByField {
  const byField: UnitPricingByField = {};
  for (const r of rows) (byField[r.field_id] ??= {})[r.unit] = { rateNis: r.rate_nis, tiers: parseTiers(r.tiers) };
  return byField;
}
