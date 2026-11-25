// Sunset-driven dark mode.
//
// The theme is applied by an inline <head> script (see THEME_SCRIPT) so the
// right palette is in place before first paint, with no flash of the wrong
// theme. Each function below is serialized with Function.prototype.toString(),
// so it MUST stay self-contained: no imports, no references to other
// module-level values, only its own parameters and browser built-ins.

export type SunTimes = { sunrise: number; sunset: number } | "day" | "night";

/**
 * Sunrise and sunset (epoch ms) for the solar day nearest to `nowMs`
 * at the given latitude/longitude (degrees, east positive).
 * Returns "day"/"night" for polar day/night when the sun never crosses the horizon.
 * Based on the standard sunrise equation (NOAA-style, ~1 minute accuracy).
 */
export function sunTimes(nowMs: number, lat: number, lng: number): SunTimes {
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const days = nowMs / dayMs - 0.5 + J1970 - J2000;
  const n = Math.round(days - 0.0009 + lng / 360);
  const approxTransit = 0.0009 - lng / 360 + n;
  const M = (357.5291 + 0.98560028 * approxTransit) * rad;
  const C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * rad;
  const L = M + C + (102.9372 + 180) * rad;
  const transit = J2000 + approxTransit + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const dec = Math.asin(Math.sin(L) * Math.sin(23.4397 * rad));
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  if (cosH > 1) return "night";
  if (cosH < -1) return "day";
  const half = Math.acos(cosH) / (2 * Math.PI);
  const toMs = (j: number) => (j + 0.5 - J1970) * dayMs;
  return { sunrise: toMs(transit - half), sunset: toMs(transit + half) };
}

/**
 * Approximate observer location from the browser's time zone.
 * Israeli zones map to central Israel; anything else uses the zone's UTC
 * offset for longitude (15° per hour) and a mid-latitude default.
 */
export function approxLocation(timeZone: string, utcOffsetMinutes: number): { lat: number; lng: number } {
  if (/^Asia\/(Jerusalem|Tel_Aviv|Hebron|Gaza)$/.test(timeZone) || timeZone === "Israel") return { lat: 31.9, lng: 34.9 };
  return { lat: 32, lng: utcOffsetMinutes / 4 };
}

/** Runs in the browser: sets <html data-theme> now and re-checks every minute. */
export function themeBootstrap(sun: typeof sunTimes, locate: typeof approxLocation): void {
  const root = document.documentElement;
  const apply = () => {
    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* old browsers */ }
    const now = Date.now();
    const loc = locate(tz, -new Date(now).getTimezoneOffset());
    const t = sun(now, loc.lat, loc.lng);
    const dark = t === "night" || (t !== "day" && (now < t.sunrise || now >= t.sunset));
    root.dataset.theme = dark ? "dark" : "light";
  };
  apply();
  setInterval(apply, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) apply(); });
}

export const THEME_SCRIPT = `(${themeBootstrap.toString()})(${sunTimes.toString()},${approxLocation.toString()});`;
