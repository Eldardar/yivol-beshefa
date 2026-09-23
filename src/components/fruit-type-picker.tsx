"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./modal";
import { SearchIcon, XIcon } from "./icons";

export function FruitTypePicker({
  fruitTypes,
  selected,
  onSelect
}: {
  fruitTypes: string[];
  selected: string | null;
  onSelect: (fruitType: string | null) => void;
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
  const results = q ? fruitTypes.filter(f => f.toLowerCase().includes(q)) : fruitTypes;

  function select(fruitType: string) {
    onSelect(fruitType);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="row worker-picker-row">
      <div className="worker-search" ref={boxRef}>
        {selected ? (
          <div className="worker-search-selected">
            <span className="worker-search-selected-name">{selected}</span>
            <button type="button" className="icon-btn" aria-label="בחירת סוג פרי אחר" onClick={() => { onSelect(null); setOpen(true); }}>
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
                placeholder="חיפוש סוג פרי"
                aria-label="חיפוש סוג פרי"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
              />
            </div>
            {open && (
              <div className="worker-search-results" role="listbox">
                {results.length === 0 && <p className="muted worker-search-empty">לא נמצאו סוגי פרי</p>}
                {results.map(fruitType => (
                  <button type="button" key={fruitType} className="worker-search-result" role="option" aria-selected={false} onClick={() => select(fruitType)}>
                    <span className="worker-search-result-body">
                      <span className="worker-search-result-name">{fruitType}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <button type="button" className="btn secondary" onClick={() => setListOpen(true)}>הצג את כל סוגי הפרי</button>

      {listOpen && (
        <Modal title="כל סוגי הפרי" onClose={() => setListOpen(false)}>
          <div className="worker-list" role="listbox">
            {fruitTypes.length === 0 && <p className="muted">אין סוגי פרי</p>}
            {fruitTypes.map(fruitType => (
              <button
                type="button"
                key={fruitType}
                className="worker-search-result"
                role="option"
                aria-selected={false}
                onClick={() => { select(fruitType); setListOpen(false); }}
              >
                <span className="worker-search-result-body">
                  <span className="worker-search-result-name">{fruitType}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
