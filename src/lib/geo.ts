export type Coordinates = { latitude: number; longitude: number };
type StoredLocation = { location: string; latitude: number | null; longitude: number | null };

// דומיינים של גוגל מפות שמותר לשרת לפנות אליהם (קישורים מקוצרים והפניות)
const GOOGLE_MAPS_HOST = /^(?:maps\.app\.goo\.gl|goo\.gl|g\.co|(?:www\.|maps\.|consent\.)?google\.(?:com|co\.il))$/i;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 5000;

function valid(latitude: number, longitude: number): Coordinates | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function parseUrl(text: string): URL | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Extracts coordinates from a full Google Maps URL, preferring the place's own position over the map center. */
export function parseMapsCoordinates(link: string): Coordinates | null {
  let text = link;
  try { text = decodeURIComponent(link); } catch { /* keep raw */ }
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /\/(?:place|search|dir\/[^/]*)\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return valid(Number(match[1]), Number(match[2]));
  }
  return null;
}

/** Follows redirects of a Google Maps link (e.g. maps.app.goo.gl), only while they stay on Google hosts. */
async function expandMapsLink(url: URL): Promise<URL> {
  let current = url;
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (!GOOGLE_MAPS_HOST.test(current.hostname) || parseMapsCoordinates(current.toString())) break;
    // דף ההסכמה של גוגל מחזיק את הכתובת המקורית בפרמטר continue
    const next = current.hostname.startsWith("consent.") ? current.searchParams.get("continue") : null;
    if (next) { current = new URL(next); continue; }
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) break;
    current = new URL(location, current);
  }
  return current;
}

async function geocode(query: string): Promise<Coordinates | null> {
  const key = process.env.ORS_API_KEY;
  if (!key) return null;
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("text", query);
  url.searchParams.set("size", "1");
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) return null;
  const body = await res.json() as { features?: Array<{ geometry?: { coordinates?: [number, number] } }> };
  const point = body.features?.[0]?.geometry?.coordinates;
  return point ? valid(point[1], point[0]) : null;
}

/** Resolves a Google Maps link to coordinates; returns null when the text isn't a link or can't be resolved. */
export async function resolveMapsLink(link: string): Promise<Coordinates | null> {
  const url = parseUrl(link);
  if (!url || !GOOGLE_MAPS_HOST.test(url.hostname)) return null;
  try {
    const full = await expandMapsLink(url);
    const direct = parseMapsCoordinates(full.toString());
    if (direct) return direct;
    const query = full.searchParams.get("q") ?? full.searchParams.get("query")
      ?? full.pathname.match(/\/place\/([^/]+)/)?.[1]?.replace(/\+/g, " ");
    return query ? await geocode(decodeURIComponent(query)) : null;
  } catch {
    return null;
  }
}

export function isMapsLink(text: string): boolean {
  const url = parseUrl(text);
  return Boolean(url && GOOGLE_MAPS_HOST.test(url.hostname));
}

/** Keeps stored coordinates while the location is unchanged, otherwise (or if they're missing) resolves the link. */
export async function locationCoordinates(previous: StoredLocation | undefined, location: string): Promise<Coordinates | null> {
  const trimmed = location.trim();
  if (previous && previous.location === trimmed && previous.latitude !== null && previous.longitude !== null) {
    return { latitude: previous.latitude, longitude: previous.longitude };
  }
  return trimmed ? resolveMapsLink(trimmed) : null;
}
