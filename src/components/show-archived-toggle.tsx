"use client";

export function ShowArchivedToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="switch-row">
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={checked ? "הצגת רשומות בארכיון — לחיצה להסתרה" : "רשומות בארכיון מוסתרות — לחיצה להצגה"} />
        <span className="switch-track" aria-hidden="true" />
      </span>
      <span className="muted switch-status">הצגת ארכיון</span>
    </label>
  );
}
