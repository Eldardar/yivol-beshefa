"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { ExpenseForm } from "./expense-form";
import { CameraIcon, DownloadIcon, PencilIcon, PlusIcon } from "./icons";
import { EXPENSE_FILE_TYPES, MAX_EXPENSE_FILE_BYTES } from "@/lib/expenses";

type Step = "closed" | "choose" | "manual" | "processing" | "result";
type FileSource = "CAMERA" | "UPLOAD";

const ACCEPT = EXPENSE_FILE_TYPES.join(",");
const isAllowed = (file: File) => (EXPENSE_FILE_TYPES as readonly string[]).includes(file.type);

// תמונות מוקטנות לפני ההעלאה: חוסך זמן העלאה ואחסון, ונשאר קריא ל-Claude
const MAX_IMAGE_EDGE = 2000;
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

function ExpenseDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`expense-dropzone${dragging ? " is-dragging" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="העלאת קבצי הוצאות: גררו לכאן או לחצו לבחירה"
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      onDragEnter={e => { e.preventDefault(); setDragging(true); }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={e => { e.preventDefault(); setDragging(false); onFiles(Array.from(e.dataTransfer.files)); }}
    >
      <DownloadIcon size={32} />
      <strong>גררו לכאן קבצי חשבוניות או קבלות</strong>
      <span>או <span className="expense-dropzone-link">לחצו לבחירת קבצים</span></span>
      <span className="expense-dropzone-hint">תמונה (JPG, PNG, WEBP, GIF) או PDF · עד 20MB לקובץ · אפשר כמה קבצים יחד</span>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={e => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </div>
  );
}

export function AddExpenseButton({ csrf }: { csrf: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<{ count: number; invoiceDate: string | null; extractionFailed: number }>({ count: 0, invoiceDate: null, extractionFailed: 0 });
  const cameraRef = useRef<HTMLInputElement>(null);

  const close = () => { setStep("closed"); setErrors([]); };

  // מעבר לחודש של ההוצאה שנשמרה (אם ידוע), כדי שהיא תופיע מיד בטבלה
  function finish(invoiceDate: string | null, count: number, failedCount = 0) {
    close();
    const params = new URLSearchParams(window.location.search);
    if (invoiceDate) { params.set("y", String(Number(invoiceDate.slice(0, 4)))); params.set("m", String(Number(invoiceDate.slice(5, 7)))); }
    params.set("saved", String(count));
    if (failedCount) params.set("failed", String(failedCount)); else params.delete("failed");
    router.push(`/admin/expenses?${params.toString()}`);
    router.refresh();
  }

  async function uploadOne(file: File, source: FileSource): Promise<{ invoiceDate: string | null; extractionFailed: boolean }> {
    const blob = await shrinkImage(file);
    if (blob.size > MAX_EXPENSE_FILE_BYTES) throw new Error("הקובץ גדול מדי");
    const form = new FormData();
    form.set("csrf", csrf);
    form.set("source", source);
    form.set("file", blob, file.name);
    const res = await fetch("/api/admin/expenses/upload", { method: "POST", body: form });
    const data = await res.json() as { error?: string; invoiceDate?: string | null; extractionFailed?: boolean };
    if (!res.ok) throw new Error(data.error ?? "ההעלאה נכשלה");
    return { invoiceDate: data.invoiceDate ?? null, extractionFailed: Boolean(data.extractionFailed) };
  }

  // קבצים מעובדים אחד אחרי השני; קובץ שנכשל לא עוצר את השאר
  async function processFiles(files: File[], source: FileSource) {
    if (files.length === 0) return;
    const failures = files.filter(file => !isAllowed(file)).map(file => `${file.name}: ניתן להעלות רק תמונה (JPG, PNG, WEBP, GIF) או PDF`);
    const valid = files.filter(isAllowed);
    let count = 0;
    let extractionFailed = 0;
    let invoiceDate: string | null = null;
    setStep("processing");
    for (const [i, file] of valid.entries()) {
      setProgress(valid.length > 1 ? `מעבד קובץ ${i + 1} מתוך ${valid.length}: ${file.name}` : "מעלה את הקובץ ומחלץ את פרטי ההוצאה…");
      try {
        const result = await uploadOne(file, source);
        // קובץ שהחילוץ שלו נכשל נשמר ומחכה ב"נכשלו בחילוץ", ולכן לא קובע לאיזה חודש לעבור
        if (result.extractionFailed) extractionFailed++;
        else { count++; invoiceDate ??= result.invoiceDate; }
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : "ההעלאה נכשלה"}`);
      }
    }
    if (failures.length === 0) return finish(invoiceDate, count, extractionFailed);
    setSaved({ count, invoiceDate, extractionFailed });
    setErrors(failures);
    setStep("result");
  }

  const closeResult = () => (saved.count || saved.extractionFailed ? finish(saved.invoiceDate, saved.count, saved.extractionFailed) : close());

  return (
    <>
      <button type="button" className="btn btn-icon-leading" onClick={() => setStep("choose")}><PlusIcon size={18} /><span>הוספת הוצאה</span></button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { processFiles(Array.from(e.target.files ?? []), "CAMERA"); e.target.value = ""; }} />

      {step === "choose" && (
        <Modal title="הוספת הוצאה" onClose={close}>
          <ExpenseDropzone onFiles={files => processFiles(files, "UPLOAD")} />
          <div className="expense-add-options">
            <button type="button" className="expense-add-option" onClick={() => cameraRef.current?.click()}>
              <CameraIcon size={26} /><span><strong>צילום הוצאה</strong><span>צלמו חשבונית או קבלה והפרטים יחולצו אוטומטית</span></span>
            </button>
            <button type="button" className="expense-add-option" onClick={() => setStep("manual")}>
              <PencilIcon size={26} /><span><strong>הזנה ידנית</strong><span>מילוי פרטי ההוצאה בטופס</span></span>
            </button>
          </div>
        </Modal>
      )}

      {step === "manual" && (
        <Modal title="הזנת הוצאה ידנית" onClose={close} wide>
          <ExpenseForm csrf={csrf} onSaved={date => finish(date, 1)} />
        </Modal>
      )}

      {step === "processing" && (
        <Modal title="מעבד הוצאות" onClose={() => undefined}>
          <p role="status">{progress}</p>
          <p className="muted">כל קובץ עשוי לקחת עד דקה. אין לסגור את הדף.</p>
        </Modal>
      )}

      {step === "result" && (
        <Modal title={saved.count ? `נשמרו ${saved.count} הוצאות, חלק מהקבצים נכשלו` : "ההוספה נכשלה"} onClose={closeResult}>
          <div className="alert" role="alert">
            {errors.map((message, i) => <p key={i}>{message}</p>)}
          </div>
          <button type="button" className="btn" onClick={closeResult}>סגירה</button>
        </Modal>
      )}
    </>
  );
}
