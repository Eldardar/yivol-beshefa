"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./modal";
import { SearchIcon, XIcon } from "./icons";
import { initials } from "./worker-picker";

export type FarmerOption = { id: number; name: string; phone: string };

export function FarmerPicker({
  farmers,
  selected,
  onSelect
}: {
  farmers: FarmerOption[];
  selected: FarmerOption | null;
  onSelect: (farmer: FarmerOption | null) => void;
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
  const results = q ? farmers.filter(f => f.name.toLowerCase().includes(q) || f.phone.includes(q)) : farmers;

  function select(farmer: FarmerOption) {
    onSelect(farmer);
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
            <button type="button" className="icon-btn" aria-label="בחירת חקלאי אחר" onClick={() => { onSelect(null); setOpen(true); }}>
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
                placeholder="חיפוש חקלאי לפי שם או טלפון"
                aria-label="חיפוש חקלאי"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
              />
            </div>
            {open && (
              <div className="worker-search-results" role="listbox">
                {results.length === 0 && <p className="muted worker-search-empty">לא נמצאו חקלאים</p>}
                {results.map(farmer => (
                  <button type="button" key={farmer.id} className="worker-search-result" role="option" aria-selected={false} onClick={() => select(farmer)}>
                    <span className="avatar" aria-hidden="true">{initials(farmer.name)}</span>
                    <span className="worker-search-result-body">
                      <span className="worker-search-result-name">{farmer.name}</span>
                      <span className="muted worker-search-result-phone">{farmer.phone}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <button type="button" className="btn secondary" onClick={() => setListOpen(true)}>הצג את כל החקלאים</button>

      {listOpen && (
        <Modal title="כל החקלאים" onClose={() => setListOpen(false)}>
          <div className="worker-list" role="listbox">
            {farmers.length === 0 && <p className="muted">אין חקלאים פעילים</p>}
            {farmers.map(farmer => (
              <button
                type="button"
                key={farmer.id}
                className="worker-search-result"
                role="option"
                aria-selected={false}
                onClick={() => { select(farmer); setListOpen(false); }}
              >
                <span className="avatar" aria-hidden="true">{initials(farmer.name)}</span>
                <span className="worker-search-result-body">
                  <span className="worker-search-result-name">{farmer.name}</span>
                  <span className="muted worker-search-result-phone">{farmer.phone}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
