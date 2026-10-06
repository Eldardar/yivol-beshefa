import { afterEach, describe, expect, it, vi } from "vitest";
import { isMapsLink, locationCoordinates, parseMapsCoordinates, resolveMapsLink } from "@/lib/geo";

afterEach(() => vi.unstubAllGlobals());

describe("חילוץ קואורדינטות מקישורי גוגל מפות", () => {
  it("מעדיף את מיקום המקום על פני מרכז המפה", () => {
    expect(parseMapsCoordinates("https://www.google.com/maps/place/X/@32.1,34.7,15z/data=!3m1!4b1!4m6!3m5!3d32.0853!4d34.7818")).toEqual({ latitude: 32.0853, longitude: 34.7818 });
  });

  it("מזהה פרמטר q, נתיב place ומרכז מפה", () => {
    expect(parseMapsCoordinates("https://maps.google.com/?q=31.7683,35.2137")).toEqual({ latitude: 31.7683, longitude: 35.2137 });
    expect(parseMapsCoordinates("https://www.google.com/maps/place/31.5,35.1")).toEqual({ latitude: 31.5, longitude: 35.1 });
    expect(parseMapsCoordinates("https://www.google.com/maps/@32.5,35.0,12z")).toEqual({ latitude: 32.5, longitude: 35 });
  });

  it("דוחה קואורדינטות לא חוקיות וטקסט ללא קואורדינטות", () => {
    expect(parseMapsCoordinates("https://maps.google.com/?q=95,35")).toBeNull();
    expect(parseMapsCoordinates("https://www.google.com/maps/place/Tel+Aviv")).toBeNull();
  });

  it("מזהה רק קישורי גוגל מפות", () => {
    expect(isMapsLink("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isMapsLink("https://google.evil.com/maps")).toBe(false);
    expect(isMapsLink("גליל עליון")).toBe(false);
  });

  it("עוקב אחרי הפניות של קישור מקוצר", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://www.google.com/maps/place/X/data=!3d32.08!4d34.78" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await resolveMapsLink("https://maps.app.goo.gl/abc")).toEqual({ latitude: 32.08, longitude: 34.78 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("לא פונה לשרתים שאינם של גוגל", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await resolveMapsLink("https://example.com/?q=32,34")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("שומר קואורדינטות קיימות כשהמיקום לא השתנה", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const previous = { location: "https://maps.app.goo.gl/abc", latitude: 32, longitude: 34 };
    expect(await locationCoordinates(previous, "https://maps.app.goo.gl/abc")).toEqual({ latitude: 32, longitude: 34 });
    expect(await locationCoordinates(previous, "")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
