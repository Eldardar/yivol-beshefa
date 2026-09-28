"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { ExpenseForm } from "./expense-form";
import { DeleteExpenseButton } from "./expense-actions";
import { AlertTriangleIcon, ArrowRightIcon, DownloadIcon, EyeIcon } from "./icons";
import { formatHebrewDate } from "@/lib/dates";
import { EXPENSE_SOURCE_LABEL, type ExpenseRow } from "@/lib/expenses";

const fileUrl = (row: ExpenseRow) => `/api/admin/expenses/${row.id}/file`;
const fileName = (row: ExpenseRow) => (typeof row.new_file_name === "string" ? row.new_file_name : `הוצאה ${row.id}`);

function FilePreview({ row }: { row: ExpenseRow }) {
  if (!row.has_file) return <p className="muted">אין קובץ מצורף</p>;
  if (row.file_mime === "application/pdf") return <iframe className="expense-preview" src={fileUrl(row)} title={`תצוגת ${fileName(row)}`} />;
  // eslint-disable-next-line @next/next/no-img-element -- קובץ פרטי מאחורי הרשאה, לא מתאים לאופטימיזציית next/image
  return <img className="expense-preview" src={fileUrl(row)} alt={`תצוגת ${fileName(row)}`} />;
}

function FailedExpense({ csrf, row, onBack, onDone }: { csrf: string; row: ExpenseRow; onBack?: () => void; onDone: () => void }) {
  return (
    <div className="stack">
      {onBack && (
        <div>
          <button type="button" className="btn secondary btn-sm btn-icon-leading" onClick={onBack}><ArrowRightIcon size={16} /><span>חזרה לרשימה</span></button>
        </div>
      )}
      {typeof row.review_notes === "string" && row.review_notes && <p className="alert expense-failed-notes">{row.review_notes}</p>}
      <div className="expense-failed-layout">
        <div className="stack">
          <FilePreview row={row} />
          <div className="expenses-actions">
            {Boolean(row.has_file) && (
              <>
                <a className="btn secondary btn-sm btn-icon-leading" href={fileUrl(row)} target="_blank" rel="noopener"><EyeIcon size={18} /><span>צפייה</span></a>
                <a className="btn secondary btn-sm btn-icon-leading" href={`${fileUrl(row)}?download=1`} download={fileName(row)}><DownloadIcon size={18} /><span>הורדה</span></a>
              </>
            )}
            <DeleteExpenseButton csrf={csrf} row={row} small={false} onDeleted={onDone} />
          </div>
        </div>
        {/* key — כדי שמעבר בין קבצים יאפס את הטופס לערכים של הקובץ הנבחר */}
        <ExpenseForm key={row.id} csrf={csrf} expense={row} onSaved={onDone} />
      </div>
    </div>
  );
}

export function FailedExtractionsButton({ csrf, rows }: { csrf: string; rows: ExpenseRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // הוצאה שנשמרה נעלמת מיד מהרשימה, גם לפני שהדף מתרענן מהשרת
  const pending = rows.filter(row => !savedIds.has(row.id));
  if (pending.length === 0 && !open) return null;
  const selected = pending.length === 1 ? pending[0] : pending.find(row => row.id === selectedId);

  // נשמרה או נמחקה — בכל מקרה יוצאת מהרשימה
  function onDone(id: number) {
    setSavedIds(ids => new Set(ids).add(id));
    setSelectedId(null);
    router.refresh();
    if (pending.length <= 1) setOpen(false);
  }

  return (
    <>
      <button type="button" className="btn secondary btn-icon-leading expense-failed-btn" onClick={() => setOpen(true)}>
        <AlertTriangleIcon size={18} />
        <span>נכשלו בחילוץ</span>
        <span className="count-badge" aria-label={`${pending.length} קבצים`}>{pending.length}</span>
      </button>

      {open && (
        <Modal title={selected ? `השלמת הוצאה · ${fileName(selected)}` : `נכשלו בחילוץ (${pending.length})`} onClose={() => { setOpen(false); setSelectedId(null); }} wide>
          {selected ? (
            <FailedExpense csrf={csrf} row={selected} onBack={pending.length > 1 ? () => setSelectedId(null) : undefined} onDone={() => onDone(selected.id)} />
          ) : (
            <div className="stack">
              <p className="muted">קבצים שלא ניתן היה לחלץ מהם את כל הפרטים. פתחו קובץ כדי לצפות בו, להוריד אותו או להשלים את הפרטים ידנית — ערכים שכבר זוהו ממולאים מראש.</p>
              <ul className="expense-failed-list">
                {pending.map(row => (
                  <li key={row.id} className="expense-failed-item">
                    <button type="button" className="expense-add-option" onClick={() => setSelectedId(row.id)}>
                      <AlertTriangleIcon size={22} />
                      <span>
                        <strong>{fileName(row)}</strong>
                        <span>{EXPENSE_SOURCE_LABEL[row.source]} · נוסף {formatHebrewDate(row.created_at.slice(0, 10))}{typeof row.supplier_name === "string" && row.supplier_name ? ` · ${row.supplier_name}` : ""}</span>
                        {typeof row.review_notes === "string" && row.review_notes && <span className="expense-notes">{row.review_notes}</span>}
                      </span>
                    </button>
                    <DeleteExpenseButton csrf={csrf} row={row} onDeleted={() => onDone(row.id)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
