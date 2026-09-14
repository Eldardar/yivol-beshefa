"use client";
import { useState } from "react";
import { ChevronDownIcon, UsersIcon } from "./icons";

export function ShiftCoworkers({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className={`shift-coworkers-toggle${open ? " is-open" : ""}`} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="inline-icon-text"><UsersIcon size={16} /><span>{names.length ? `${names.length} עובדים נוספים במשמרת` : "אין עובדים נוספים במשמרת"}</span></span>
        <ChevronDownIcon size={20} />
      </button>
      {open && names.length > 0 && (
        <div className="record-card-details">
          <ol className="numbered-list">{names.map((name, i) => <li key={`${name}-${i}`}>{name}</li>)}</ol>
        </div>
      )}
    </div>
  );
}
