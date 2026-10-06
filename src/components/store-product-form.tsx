"use client";
import { useState } from "react";
import { MAX_STORE_IMAGE_BYTES, STORE_IMAGE_TYPES, storeImageUrl, type StoreProductRow } from "@/lib/store";

export function StoreProductForm({ csrf, product, onSaved }: { csrf: string; product?: StoreProductRow; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentImage = preview ?? (product?.has_image && !removeImage ? storeImageUrl(product) : null);

  function pickFile(next: File | null) {
    setError("");
    if (next && next.size > MAX_STORE_IMAGE_BYTES) { setError("התמונה גדולה מדי (עד 5MB)"); return; }
    setFile(next);
    setPreview(null);
    if (!next) return;
    setRemoveImage(false);
    // תצוגה מקדימה כ-data URL — מדיניות ה-CSP מתירה תמונות data: אך לא blob:
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(next);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    form.set("csrf", csrf);
    form.delete("image");
    if (file) form.set("image", file);
    if (removeImage) form.set("removeImage", "1");
    try {
      const res = await fetch(product ? `/api/store/products/${product.id}` : "/api/store/products", { method: product ? "PUT" : "POST", body: form });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "השמירה נכשלה");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <span>תמונה</span>
        <div className="store-form-image">
          {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית מאחורי הרשאה או תצוגה מקדימה מקומית */}
          {currentImage ? <img src={currentImage} alt="" /> : <span className="muted">אין תמונה</span>}
        </div>
        <div className="actions">
          <label className="btn secondary btn-sm">
            {currentImage ? "החלפת תמונה" : "בחירת תמונה"}
            <input type="file" name="image" accept={STORE_IMAGE_TYPES.join(",")} hidden onChange={e => pickFile(e.target.files?.[0] ?? null)} />
          </label>
          {currentImage && (
            <button type="button" className="btn secondary btn-sm" onClick={() => { setFile(null); setPreview(null); setRemoveImage(Boolean(product?.has_image)); }}>הסרת תמונה</button>
          )}
        </div>
      </div>
      <div className="field"><label>שם המוצר<input className="input" name="name" required maxLength={150} defaultValue={product?.name} /></label></div>
      <div className="field"><label>מחיר (₪)<input className="input" name="price" type="number" required min="0" step="0.01" inputMode="decimal" defaultValue={product?.price} /></label></div>
      <div className="field"><label>תיאור<textarea className="input" name="description" maxLength={2000} defaultValue={product?.description} /></label></div>
      {error && <p className="alert" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "שומר…" : product ? "שמירת שינויים" : "הוספת מוצר"}</button>
    </form>
  );
}
