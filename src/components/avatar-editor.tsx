"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_SIZE } from "@/lib/avatars";
import { MAX_STORE_IMAGE_BYTES, isStoreImageType } from "@/lib/store";
import { UserAvatar } from "./user-avatar";
import { CameraIcon, TrashIcon } from "./icons";

type Decoded = { source: CanvasImageSource; width: number; height: number; close?: () => void };

// שגיאה שההודעה שלה מוצגת למשתמש כמו שהיא
class AvatarError extends Error {}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function describeFile(file: File): string {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "";
  return [ext || file.type || "סוג לא ידוע", formatBytes(file.size)].join(", ");
}

const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

// onload ולא decode(): בספארי decode() נכשל בחלק מהתמונות הגדולות
function loadImage(url: string): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });
}

async function decodeImage(file: File, url: string): Promise<Decoded> {
  try {
    return await loadImage(url);
  } catch {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
}

// חיתוך ריבועי מהמרכז והקטנה, כך שגם תמונה ישירה ממצלמת הטלפון תעבור את מגבלת הגודל.
// מחזיר את סיבת הכישלון כשהדפדפן לא מצליח לעבד את התמונה
async function squareImage(file: File): Promise<{ blob: Blob } | { failure: string }> {
  const url = URL.createObjectURL(file);
  let image: Decoded;
  try {
    image = await decodeImage(file, url);
  } catch {
    URL.revokeObjectURL(url);
    return { failure: isHeic(file) ? "הדפדפן הזה לא תומך בתמונות HEIC (פורמט ברירת המחדל של אייפון)" : "הדפדפן לא הצליח לפענח את הקובץ — ייתכן שהוא פגום או שאינו תמונה" };
  }
  try {
    const side = Math.min(image.width, image.height);
    if (!side) return { failure: "לתמונה אין מידות תקינות (רוחב או גובה 0)" };
    const size = Math.min(AVATAR_SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { failure: "הדפדפן לא מאפשר עיבוד תמונות (Canvas חסום)" };
    try {
      ctx.drawImage(image.source, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
    } catch {
      return { failure: `לא ניתן לחתוך את התמונה (${image.width}×${image.height})` };
    }
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ? { blob } : { failure: "הדפדפן לא הצליח לשמור את התמונה המעובדת" };
  } finally {
    image.close?.();
    URL.revokeObjectURL(url);
  }
}

// כשהדפדפן לא מצליח לעבד את התמונה, שולחים את המקור אם השרת יקבל אותו
async function prepareImage(file: File): Promise<Blob> {
  if (file.size === 0) throw new AvatarError(`הקובץ "${file.name}" ריק`);
  const result = await squareImage(file);
  if ("blob" in result) return result.blob;
  const details = `${result.failure}. קובץ: "${file.name}" (${describeFile(file)}).`;
  if (isHeic(file)) throw new AvatarError(`${details} יש לבחור תמונה בפורמט JPG או PNG, או לשנות במצלמה של האייפון: הגדרות ← מצלמה ← פורמטים ← "התאמה מרבית".`);
  if (!isStoreImageType(file.type)) throw new AvatarError(`${details} ניתן להעלות רק JPG, PNG, WEBP או GIF.`);
  if (file.size > MAX_STORE_IMAGE_BYTES) throw new AvatarError(`${details} לא ניתן היה להקטין את התמונה, והמקור גדול מ־5MB. יש לבחור תמונה קטנה יותר.`);
  return file;
}

// הודעת שגיאה לפי תשובת השרת, גם כשהתשובה אינה JSON (למשל ממתווך ברשת)
async function serverError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => undefined) as { error?: string } | undefined;
  if (data?.error) return data.error;
  if (res.status === 401 || res.status === 403) return "פג תוקף ההתחברות — יש להתחבר מחדש ולנסות שוב";
  if (res.status === 413) return "השרת דחה את הקובץ כי הוא גדול מדי";
  if (res.status >= 500) return `שגיאת שרת (${res.status}) — נסו שוב בעוד רגע`;
  return `${fallback} (קוד ${res.status})`;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new AvatarError("אין חיבור לשרת — בדקו את החיבור לאינטרנט ונסו שוב");
  }
}

export function AvatarEditor({ csrf, userId, name, avatarVersion }: { csrf: string; userId: number; name: string; avatarVersion: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState(avatarVersion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = `/api/users/${userId}/avatar`;

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const image = await prepareImage(file);
      const form = new FormData();
      form.set("csrf", csrf);
      form.set("image", image, image instanceof File ? image.name : "avatar.jpg");
      const res = await send(url, { method: "POST", body: form });
      if (!res.ok) throw new AvatarError(await serverError(res, "ההעלאה נכשלה"));
      const data = await res.json() as { version?: string };
      setVersion(data.version ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof AvatarError ? err.message : `ההעלאה נכשלה: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await send(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrf }) });
      if (!res.ok) throw new AvatarError(await serverError(res, "המחיקה נכשלה"));
      setVersion(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof AvatarError ? err.message : `המחיקה נכשלה: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avatar-editor">
      <UserAvatar userId={userId} name={name} avatarVersion={version} size="lg" />
      <div className="stack">
        <div className="actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={() => input.current?.click()}>
            <CameraIcon size={18} /> {busy ? "שומר…" : version ? "החלפת תמונה" : "הוספת תמונה"}
          </button>
          {version && (
            <button type="button" className="btn secondary" disabled={busy} onClick={remove}>
              <TrashIcon size={18} /> הסרה
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
        {error && <p className="alert" role="alert">{error}</p>}
      </div>
    </div>
  );
}
