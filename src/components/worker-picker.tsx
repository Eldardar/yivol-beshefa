"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./modal";
import { SearchIcon, XIcon } from "./icons";

export type WorkerOption = { id: number; name: string; phone: string };

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function WorkerPicker({
  workers,
  selected,
  onSelect
}: {
  workers: WorkerOption[];
  selected: WorkerOption | null;
  onSelect: (worker: WorkerOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q ? workers.filter(w => w.name.toLowerCase().includes(q) || w.phone.includes(q)) : workers;

  function select(worker: WorkerOption) {
    onSelect(worker);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="row worker-picker-row">
      <div className="worker-search" ref={boxRef}>
        {selected ? (
          <div className="worker-search-selected">
            <span className="avatar" aria-hidden="true">{initials(selected.name)}</span>
            <span className="worker-search-selected-name">{selected.name}</span>
            <button type="button" className="icon-btn" aria-label="בחירת עובד/ת אחר/ת" onClick={() => { onSelect(null); setOpen(true); }}>
              <XIcon size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="input worker-search-input-wrap">
              <SearchIcon size={18} className="worker-search-icon" />
              <input
                type="search"
                className="worker-search-input"
                placeholder="חיפוש עובד/ת לפי שם או טלפון"
                aria-label="חיפוש עובד/ת"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
              />
            </div>
            {open && (
              <div className="worker-search-results" role="listbox">
                {results.length === 0 && <p className="muted worker-search-empty">לא נמצאו עובדים</p>}
                {results.map(worker => (
                  <button type="button" key={worker.id} className="worker-search-result" role="option" aria-selected={false} onClick={() => select(worker)}>
                    <span className="avatar" aria-hidden="true">{initials(worker.name)}</span>
                    <span className="worker-search-result-body">
                      <span className="worker-search-result-name">{worker.name}</span>
                      <span className="muted worker-search-result-phone">{worker.phone}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <button type="button" className="btn secondary" onClick={() => setListOpen(true)}>הצג את כל העובדים</button>

      {listOpen && (
        <Modal title="כל העובדים" onClose={() => setListOpen(false)}>
          <div className="worker-list" role="listbox">
            {workers.length === 0 && <p className="muted">אין עובדים פעילים</p>}
            {workers.map(worker => (
              <button
                type="button"
                key={worker.id}
                className="worker-search-result"
                role="option"
                aria-selected={false}
                onClick={() => { select(worker); setListOpen(false); }}
              >
                <span className="avatar" aria-hidden="true">{initials(worker.name)}</span>
                <span className="worker-search-result-body">
                  <span className="worker-search-result-name">{worker.name}</span>
                  <span className="muted worker-search-result-phone">{worker.phone}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
