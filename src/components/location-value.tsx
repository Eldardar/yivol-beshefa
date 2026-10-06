import { MapPinIcon } from "./icons";

const isLink = (text: string) => /^https?:\/\//i.test(text.trim());

function formatCoordinates(latitude: number | null, longitude: number | null): string {
  return latitude !== null && longitude !== null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "";
}

/** Shows a location: a map link opens in a new tab, plain text is shown as is. */
export function LocationValue({ location, latitude, longitude }: { location: string; latitude: number | null; longitude: number | null }) {
  if (!location) return <>—</>;
  const coordinates = formatCoordinates(latitude, longitude);
  if (!isLink(location)) return <>{location}</>;
  return (
    <a href={location} target="_blank" rel="noopener noreferrer" title={coordinates || undefined} className="btn-icon-leading">
      <MapPinIcon size={16} /><span>פתיחה במפה</span>
    </a>
  );
}

/** Read-only display of the coordinates resolved from the location's map link. */
export function CoordinatesField({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const coordinates = formatCoordinates(latitude, longitude);
  return (
    <div className="field"><label>קואורדינטות
      <input className="input" readOnly dir="ltr" value={coordinates} placeholder="יחושבו אוטומטית מקישור גוגל מפות בשמירה" />
    </label></div>
  );
}
