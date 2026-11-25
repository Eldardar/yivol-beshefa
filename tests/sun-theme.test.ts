import { describe, expect, it } from "vitest";
import { approxLocation, parseThemePreference, sunTimes, THEME_SCRIPT } from "@/lib/sun-theme";

const TLV = { lat: 32.08, lng: 34.78 };
const hhmm = (ms: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" }).format(ms);
const minutes = (s: string) => { const [h, m] = s.split(":").map(Number); return h! * 60 + m!; };

describe("sunTimes", () => {
  it("matches published Tel Aviv times within a few minutes", () => {
    // 2026-06-21: sunrise ≈ 05:32, sunset ≈ 19:50 (IDT)
    const summer = sunTimes(Date.parse("2026-06-21T09:00:00Z"), TLV.lat, TLV.lng);
    if (typeof summer === "string") throw new Error("unexpected polar result");
    expect(Math.abs(minutes(hhmm(summer.sunrise)) - minutes("05:32"))).toBeLessThanOrEqual(4);
    expect(Math.abs(minutes(hhmm(summer.sunset)) - minutes("19:50"))).toBeLessThanOrEqual(4);

    // 2026-12-21: sunrise ≈ 06:36, sunset ≈ 16:40 (IST)
    const winter = sunTimes(Date.parse("2026-12-21T10:00:00Z"), TLV.lat, TLV.lng);
    if (typeof winter === "string") throw new Error("unexpected polar result");
    expect(Math.abs(minutes(hhmm(winter.sunrise)) - minutes("06:36"))).toBeLessThanOrEqual(4);
    expect(Math.abs(minutes(hhmm(winter.sunset)) - minutes("16:40"))).toBeLessThanOrEqual(4);
  });

  it("picks the solar day around the given moment, late night and early morning", () => {
    const late = Date.parse("2026-11-25T21:30:00Z"); // 23:30 local
    const t = sunTimes(late, TLV.lat, TLV.lng);
    if (typeof t === "string") throw new Error("unexpected polar result");
    expect(late).toBeGreaterThan(t.sunset);

    const early = Date.parse("2026-11-26T02:00:00Z"); // 04:00 local
    const e = sunTimes(early, TLV.lat, TLV.lng);
    if (typeof e === "string") throw new Error("unexpected polar result");
    expect(early).toBeLessThan(e.sunrise);
  });

  it("reports polar night and polar day", () => {
    expect(sunTimes(Date.parse("2026-12-21T12:00:00Z"), 80, 15)).toBe("night");
    expect(sunTimes(Date.parse("2026-06-21T12:00:00Z"), 80, 15)).toBe("day");
  });
});

describe("approxLocation", () => {
  it("maps Israeli zones to central Israel and others by UTC offset", () => {
    expect(approxLocation("Asia/Jerusalem", 120)).toEqual({ lat: 31.9, lng: 34.9 });
    expect(approxLocation("Europe/Paris", 60).lng).toBe(15);
  });
});

describe("THEME_SCRIPT", () => {
  it("is a standalone, syntactically valid script", () => {
    expect(() => new Function(THEME_SCRIPT)).not.toThrow();
  });
});

describe("parseThemePreference", () => {
  it("accepts only light/dark and treats anything else as auto", () => {
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference(undefined)).toBe("auto");
    expect(parseThemePreference("<script>")).toBe("auto");
  });
});
