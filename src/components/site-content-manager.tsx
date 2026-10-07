"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_STORE_IMAGE_BYTES, STORE_IMAGE_TYPES } from "@/lib/store";
import { galleryPhotoUrl, quoteDir, type GalleryPhotoRow, type QuoteRow } from "@/lib/site-content";
import { Modal } from "./modal";
import { PlusIcon, TrashIcon } from "./icons";

function ConfirmDeleteButton({ label, title, question, url, csrf }: { label: string; title: string; question: string; url: string; csrf: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrf }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "המחיקה נכשלה");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "המחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="icon-btn danger" title="מחיקה" aria-label={label} onClick={() => setOpen(true)}><TrashIcon size={18} /></button>
      {open && (
        <Modal title={title} onClose={() => (busy ? null : setOpen(false))}>
          <div className="stack">
            <p>{question} הפעולה אינה הפיכה.</p>
            {error && <p className="alert" role="alert">{error}</p>}
            <div className="actions">
              <button type="button" className="btn danger" disabled={busy} onClick={confirmDelete}>{busy ? "מוחק…" : "מחיקה לצמיתות"}</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setOpen(false)}>ביטול</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function GalleryManager({ photos, csrf }: { photos: GalleryPhotoRow[]; csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // כל קובץ נשלח בבקשה נפרדת, כדי שקובץ פגום אחד לא יכשיל את כל ההעלאה
  async function upload(files: File[]) {
    setError("");
    const failures: string[] = [];
    for (const [i, file] of files.entries()) {
      setBusy(`מעלה ${i + 1} מתוך ${files.length}…`);
      try {
        if (file.size > MAX_STORE_IMAGE_BYTES) throw new Error("התמונה גדולה מדי (עד 5MB)");
        const form = new FormData();
        form.set("csrf", csrf);
        form.set("image", file);
        const res = await fetch("/api/admin/gallery", { method: "POST", body: form });
        const data = await res.json() as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "ההעלאה נכשלה");
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : "ההעלאה נכשלה"}`);
      }
    }
    setBusy("");
    if (failures.length) setError(failures.join("\n"));
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="table-toolbar">
        <p className="muted">התמונות מוצגות לעובדים בגלריה בדף הבית, לפי סדר ההעלאה.</p>
        <label className={`btn btn-icon-leading${busy ? " is-disabled" : ""}`} aria-disabled={Boolean(busy)}>
          <PlusIcon size={18} /><span>{busy || "העלאת תמונות"}</span>
          <input
            type="file"
            accept={STORE_IMAGE_TYPES.join(",")}
            multiple
            hidden
            disabled={Boolean(busy)}
            onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) void upload(files); }}
          />
        </label>
      </div>
      {error && <p className="alert content-error" role="alert">{error}</p>}
      {photos.length === 0 && <p className="muted">אין תמונות בגלריה — הגלריה לא תוצג לעובדים</p>}
      <div className="content-photo-grid">
        {photos.map((photo, i) => (
          <figure className="content-photo" key={photo.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- תמונה פרטית מאחורי הרשאה, לא מתאימה לאופטימיזציית next/image */}
            <img src={galleryPhotoUrl(photo)} alt={`תמונה ${i + 1}`} loading="lazy" />
            <figcaption>
              <span className="muted">{`תמונה ${i + 1}`}</span>
              <ConfirmDeleteButton
                csrf={csrf}
                url={`/api/admin/gallery/${photo.id}`}
                label={`מחיקת תמונה ${i + 1}`}
                title="מחיקת תמונה"
                question="האם למחוק את התמונה מגלריית העובדים לצמיתות?"
              />
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function QuotesManager({ quotes, csrf }: { quotes: QuoteRow[]; csrf: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [cite, setCite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrf, text, cite }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "השמירה נכשלה");
      setText("");
      setCite("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <p className="muted">הציטוטים מתחלפים במסך הכניסה לאתר.</p>
      {quotes.length === 0 && <p className="muted">אין ציטוטים</p>}
      <ul className="content-quote-list">
        {quotes.map(quote => (
          <li key={quote.id} className="content-quote">
            <blockquote dir={quoteDir(quote.text)}>
              <p>&ldquo;{quote.text}&rdquo;</p>
              <cite>~ {quote.cite}</cite>
            </blockquote>
            <ConfirmDeleteButton
              csrf={csrf}
              url={`/api/admin/quotes/${quote.id}`}
              label={`מחיקת הציטוט של ${quote.cite}`}
              title="מחיקת ציטוט"
              question={`האם למחוק את הציטוט "${quote.text}" לצמיתות?`}
            />
          </li>
        ))}
      </ul>
      <form className="stack content-quote-form" onSubmit={submit}>
        <h3>הוספת ציטוט</h3>
        <div className="field"><label>ציטוט<textarea className="input" required maxLength={300} value={text} onChange={e => setText(e.target.value)} /></label></div>
        <div className="field"><label>מאת<input className="input" required maxLength={100} value={cite} onChange={e => setCite(e.target.value)} /></label></div>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="btn btn-icon-leading" disabled={busy}><PlusIcon size={18} /><span>{busy ? "שומר…" : "הוספת ציטוט"}</span></button>
      </form>
    </div>
  );
}
