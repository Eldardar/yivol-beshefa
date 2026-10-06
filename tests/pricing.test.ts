import { describe, expect, it } from "vitest";
import { priceDrops, unitAmount } from "@/lib/pricing";

describe("תמחור מדורג לפי כמות", () => {
  it("ללא מדרגות — תעריף אחיד", () => {
    expect(unitAmount({ rateNis: 2.5, tiers: [] }, 4)).toBe(10);
  });

  it("מדרגות — כל טווח מתומחר במחיר שלו", () => {
    const pricing = { rateNis: 10, tiers: [{ aboveQuantity: 2, rateNis: 8, appliesToAll: false }, { aboveQuantity: 5, rateNis: 6, appliesToAll: false }] };
    expect(unitAmount(pricing, 0)).toBe(0);
    expect(unitAmount(pricing, 2)).toBe(20);
    expect(unitAmount(pricing, 4)).toBe(20 + 16);
    expect(unitAmount(pricing, 7)).toBe(20 + 24 + 12);
  });

  it("מדרגה שחלה על כל הכמות עד סוף הטווח שלה, ומדרגה רגילה אחריה מוסיפה רק את החלק שלה", () => {
    const pricing = { rateNis: 6.9, tiers: [{ aboveQuantity: 2, rateNis: 6.5, appliesToAll: true }, { aboveQuantity: 5, rateNis: 5.9, appliesToAll: false }] };
    expect(unitAmount(pricing, 2)).toBeCloseTo(13.8);
    expect(unitAmount(pricing, 4)).toBeCloseTo(26);
    expect(unitAmount(pricing, 7)).toBeCloseTo(5 * 6.5 + 2 * 5.9);
  });

  it("מדרגה שחלה על כל הכמות", () => {
    const pricing = { rateNis: 10, tiers: [{ aboveQuantity: 2, rateNis: 8, appliesToAll: false }, { aboveQuantity: 5, rateNis: 6, appliesToAll: true }] };
    expect(unitAmount(pricing, 5)).toBe(20 + 24);
    expect(unitAmount(pricing, 7)).toBe(42);
  });

  it("מזהה ירידה בסכום כשמדרגה על כל הכמות זולה מדי", () => {
    const drop = priceDrops({ rateNis: 10, tiers: [{ aboveQuantity: 5, rateNis: 9, appliesToAll: true }, { aboveQuantity: 10, rateNis: 6, appliesToAll: true }] });
    expect(drop).toHaveLength(2);
    expect(drop[1]).toMatchObject({ aboveQuantity: 10, amountAt: 90, amountJustAbove: 60 });
    expect(drop[1]!.recoversAt).toBeCloseTo(15);
    expect(drop[0]!.recoversAt).toBeCloseTo(50 / 9);
  });

  it("אין אזהרה כשהסכום רק עולה", () => {
    expect(priceDrops({ rateNis: 10, tiers: [{ aboveQuantity: 5, rateNis: 8, appliesToAll: false }, { aboveQuantity: 10, rateNis: 10, appliesToAll: true }] })).toEqual([]);
  });
});
